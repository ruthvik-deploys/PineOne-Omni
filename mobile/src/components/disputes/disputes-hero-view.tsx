import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { AnswerHero, type AnswerView, HERO_OVERLAP } from '@/components/listing-hero/answer-hero';
import { RowAmount } from '@/components/payments/payment-row';
import { ListingCard } from '@/components/listing-hero/listing-card';
import { type RangeScope, type RangeValue, resolveRange } from '@/components/listing-hero/time-scope';
import { DayGroupedList, dayTotals, displayTimestamp, groupByDay, sortNewestFirst } from '@/components/shared/day-groups';
import { LazyListFooter, useLazyList } from '@/components/shared/lazy-list';
import { ListRow, ListRowLine, selectFilter, StatusStack } from '@/components/shared/listing';
import { DotStatusBadge, type DotTone, StatusPill } from '@/components/shared/status';
import { TabScreen } from '@/components/tab-screen';
import { APP_PAGE_LAYOUT, LISTING_SAMPLE_LAYOUT } from '@/constants/experiments';
import { Fonts } from '@/constants/theme';
import { dueIn, formatInr } from '@/data/common';
import { DISPUTE_STATUSES, type DisputeRecord, disputeRecords, type DisputeStatus, disputeStatusLabel, disputeStatusTone, parseInr } from '@/data/disputes';
import { parseDisplayDate } from '@/data/transactions';
import { useBusiness } from '@/hooks/use-business';

/** The app pages call a dispute awaiting the merchant "Response pending" (Figma 7385:84454). */
const statusName = (status: string) => (APP_PAGE_LAYOUT && status === 'Action pending' ? 'Response pending' : status);
const STATUS_OPTIONS = [{ value: 'all', label: 'All statuses' }, ...DISPUTE_STATUSES.map((status) => ({ value: status, label: statusName(status) }))] as const;

const DISPUTE_DOT: Record<ReturnType<typeof disputeStatusTone>, DotTone> = { initiated: 'warning', processing: 'info', success: 'success', failed: 'danger' };

const raisedOn = (row: DisputeRecord) => parseDisplayDate(row.createdOn, row.time);
const total = (rows: DisputeRecord[]) => rows.reduce((sum, row) => sum + parseInr(row.amount), 0);

/**
 * Disputes, "the answer, then the records" (experiment, see
 * constants/experiments.ts). The answer is a balance right now — what's at
 * risk in open disputes, and when the first response is due — so it's live,
 * and the page's date sits in the records card. Disputes that need a
 * response are a one-tap filter there.
 */
export function DisputesHeroView({ initialStatus }: { initialStatus?: DisputeStatus }) {
  const theme = useTheme();
  // Follows the header's channel (In-store or Online; this page has no All channels).
  const { specificChannel: channel } = useBusiness();
  const [range, setRange] = useState<RangeValue>({ preset: '30d' });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | DisputeStatus>(initialStatus ?? 'all');
  const lazy = useLazyList();
  // Opened again with a status: start from it.
  const [seenStatus, setSeenStatus] = useState(initialStatus);
  if (initialStatus !== seenStatus) {
    setSeenStatus(initialStatus);
    if (initialStatus) setStatus(initialStatus);
  }
  const resetList = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    lazy.reset();
  };

  const forChannel = useMemo(() => disputeRecords.filter((row) => row.channel === channel), [channel]);
  const latest = useMemo(() => new Date(Math.max(0, ...forChannel.map((row) => raisedOn(row)?.getTime() ?? 0))), [forChannel]);
  const inRange = useMemo(() => {
    const [from, to] = resolveRange(range, latest);
    return forChannel.filter((row) => {
      const date = raisedOn(row);
      return !!date && date >= from && date < to;
    });
  }, [forChannel, latest, range]);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inRange.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      return !query || `${row.id} ${row.transactionId} ${row.amount}`.toLowerCase().includes(query);
    });
  }, [inRange, search, status]);
  const loaded = sortNewestFirst(rows, (row) => displayTimestamp(row.createdOn, row.time)).slice(0, lazy.count);

  // At risk is a balance right now, whatever the dates.
  const open = forChannel.filter((row) => row.status !== 'Closed');
  const needResponse = forChannel.filter((row) => row.status === 'Action pending');
  const firstDue = needResponse
    .map((row) => ({ label: row.dueDate.replace(/ \d{4}$/, ''), at: parseDisplayDate(row.dueDate, '12:00 PM')?.getTime() ?? Infinity }))
    .sort((a, b) => a.at - b.at)[0];
  const noun = { one: 'dispute', other: 'disputes' };
  const muted = { color: theme.colors.onSurfaceVariant };
  const count = (n: number, verb: string) => `${n} ${n === 1 ? 'dispute' : 'disputes'} ${verb}`;
  // Figma 7385:84405: the dates first, then what's disputed and what came back to you in them.
  const released = inRange.filter((row) => row.status === 'Closed' && row.outcome === 'Won');
  const dates: RangeScope = {
    kind: 'range',
    subject: 'disputes',
    presets: ['7d', '30d', '90d'],
    value: range,
    onChange: resetList(setRange),
    allowCustom: true,
    maxDays: 90,
  };
  const appViews: [AnswerView, AnswerView] = [
    {
      key: 'disputed',
      label: 'Disputed amount',
      icon: 'gavel',
      amount: total(inRange),
      line: count(inRange.length, 'raised'),
      time: dates,
      // What's still held in open disputes, whatever the dates (the current app's "Amount at risk").
      details: open.length ? [{ key: 'at-risk', label: 'At risk in open disputes', value: formatInr(total(open)), tone: 'negative' }] : undefined,
    },
    { key: 'released', label: 'Amount released', icon: 'money-wavy', amount: total(released), line: count(released.length, 'won'), time: dates },
  ];

  return (
    <TabScreen tab="disputes">
      <View style={styles.container}>
        <AnswerHero
          views={APP_PAGE_LAYOUT ? appViews : [
            {
              key: 'at-risk',
              label: 'At risk',
              icon: 'warning',
              amount: total(open),
              line: open.length
                ? `${open.length} open ${open.length === 1 ? 'dispute' : 'disputes'}${firstDue ? ` · first response due ${firstDue.label}` : ''}`
                : 'No open disputes',
              time: { kind: 'live' },
            },
          ]}
        />

        <ListingCard
          belowHero
          style={styles.overHero}
          search={search}
          onSearchChange={resetList(setSearch)}
          searchPlaceholder={APP_PAGE_LAYOUT ? 'Search ID' : 'Search by any ID'}
          // The app pages put the dates above the summary cards instead.
          time={APP_PAGE_LAYOUT ? undefined : dates}
          filters={[selectFilter({ label: 'Status', options: STATUS_OPTIONS, value: status, onApply: resetList(setStatus) })]}
          // Figma 7385:84439: just search and Status on the app pages.
          actions={APP_PAGE_LAYOUT ? undefined : [{ label: 'Download filtered', icon: 'download-simple' }]}
          totals={{ all: inRange.length, shown: rows.length, amount: total(rows) }}
          noun={noun}>
          <DayGroupedList
            flat
            groups={groupByDay(loaded, (row) => row.createdOn)}
            totals={dayTotals(rows, (row) => row.createdOn, (row) => parseInr(row.amount))}
            noun={noun}
            empty={
              status === 'Action pending' && !search.trim()
                ? 'No disputes need your response. Your dispute rate is healthy.'
                : inRange.length
                  ? 'No disputes match. Try clearing the search or filters.'
                  : 'No disputes raised in these dates.'
            }
            renderRow={(row) => APP_PAGE_LAYOUT ? (
              <AppDisputeRow key={row.id} row={row} today={latest} />
            ) : (
              <ListRow
                key={row.id}
                icon="gavel"
                onPress={() => router.push({ pathname: '/disputes/[disputeId]', params: { disputeId: row.id } })}
                accessibilityLabel={`${row.amount}, dispute ${row.id}, ${disputeStatusLabel(row)}`}>
                <ListRowLine
                  left={
                    <>
                      <RowAmount value={row.amount} />
                      <Text variant="bodySmall" numberOfLines={1} style={muted}>
                        Dispute ID {row.id}
                      </Text>
                    </>
                  }
                  right={<StatusPill label={disputeStatusLabel(row)} tone={disputeStatusTone(row)} />}
                  centered
                />
              </ListRow>
            )}
          />
          <LazyListFooter lazy={lazy} total={rows.length} noun="disputes" />
        </ListingCard>
      </View>
    </TabScreen>
  );
}

/**
 * A dispute on the app pages (Figma 7385:84445): no icon; the amount over its
 * ID, then the status with when a response is due under it, in red.
 */
function AppDisputeRow({ row, today }: { row: DisputeRecord; today: Date }) {
  const theme = useTheme();
  const label = statusName(disputeStatusLabel(row));
  const awaitingYou = row.status === 'Action pending';
  const due = awaitingYou ? parseDisplayDate(row.dueDate, '11:59 PM') : null;
  const note = due ? dueIn(due, today) : undefined;
  return (
    <ListRow
      onPress={() => router.push({ pathname: '/disputes/[disputeId]', params: { disputeId: row.id } })}
      accessibilityLabel={`${row.amount}, dispute ${row.id}, ${label}${note ? `, ${note}` : ''}`}>
      <ListRowLine
        left={
          <>
            <RowAmount value={row.amount} />
            <Text numberOfLines={1} style={[styles.id, { color: theme.colors.onSurfaceVariant }]}>
              {row.id}
            </Text>
          </>
        }
        right={<StatusStack status={<DotStatusBadge label={label} tone={DISPUTE_DOT[disputeStatusTone(row)]} />} note={note} urgent />}
        centered
      />
    </ListRow>
  );
}

const styles = StyleSheet.create({
  id: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, marginTop: 2 },
  // The listing sample's sheet rides up over the hero itself.
  container: { gap: LISTING_SAMPLE_LAYOUT ? 0 : 16 },
  // The container's gap plus the hero's open foot.
  overHero: { marginTop: -(16 + HERO_OVERLAP) },
  amount: { fontFamily: Fonts.semiBold, fontVariant: ['tabular-nums', 'stylistic-one'] },
});
