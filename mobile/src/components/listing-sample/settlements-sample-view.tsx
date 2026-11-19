import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { DateButton, type RangeScope, type RangeValue, rangePhrase, resolveRange } from '@/components/listing-hero/time-scope';
import { collectionLabel, MORE_FILTER_CATEGORIES, rupees, settlementStatusTone, STATUS_OPTIONS } from '@/components/payments/settlements-view';
import { BankLogo } from '@/components/shared/bank-logo';
import { DayGroupedList, dayTotals, displayTimestamp, groupByDay, sortNewestFirst } from '@/components/shared/day-groups';
import { LazyListFooter, useLazyList } from '@/components/shared/lazy-list';
import { ListRow, ListRowLine, selectFilter } from '@/components/shared/listing';
import type { MoreFilterSelection } from '@/components/shared/more-filters';
import { DotStatusBadge } from '@/components/shared/status';
import { Fonts } from '@/constants/theme';
import { formatCount } from '@/data/common';
import { getSettlementSummary, type SettlementRow, type SettlementStatus, settlementRows } from '@/data/settlements';
import { parseDisplayDate } from '@/data/transactions';
import { useBusiness } from '@/hooks/use-business';
import { useToast } from '@/hooks/use-toast';

import { HeroActions, HeroFigures, HeroGroup, HeroNumber, HeroSwitch, HeroTopRow, LiveTag, SampleHero, SampleSheet, shortInr } from './sample-layout';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Settled totals are available for this many days at most. */
const SETTLED_MAX_DAYS = 7;

const settledOn = (row: SettlementRow) => {
  const date = parseDisplayDate(row.settlementDatePrimary, '12:00 PM');
  date?.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Settlements as "information, then the listing" (sample for review, see
 * LISTING_SAMPLE_LAYOUT in constants/experiments.ts). The coloured hero has
 * two answers behind a switch: Settled (what reached the bank in the period,
 * with what was collected and taken off) and To settle (the balance right
 * now, what's waiting and when it's next paid). Settle now (On-Demand,
 * in-store) is the page's main action, the rest behind ⋯. The
 * settlements follow on the white sheet, by day; while the hero is live, the
 * list's dates move into the sheet.
 */
export function SettlementsSampleView() {
  const theme = useTheme();
  const toast = useToast();
  const { specificChannel: channel } = useBusiness();
  const [heroView, setHeroView] = useState<'settled' | 'to-settle'>('settled');
  // The page's one date: the list's, and Settled's (up to its last 7 days). Opens on the week: early in the day "today" is usually still empty.
  const [range, setRange] = useState<RangeValue>({ preset: '7d' });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | SettlementStatus>('all');
  const [moreFilters, setMoreFilters] = useState<MoreFilterSelection>({});
  const lazy = useLazyList();
  const resetList = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    lazy.reset();
  };

  const channelRows = useMemo(() => settlementRows.filter((row) => row.channel === channel), [channel]);
  const latest = useMemo(() => new Date(Math.max(0, ...channelRows.map((row) => settledOn(row)?.getTime() ?? 0))), [channelRows]);
  const [rangeFrom, rangeTo] = resolveRange(range, latest);

  // Settled: what reached the bank in the period, over its latest 7 days at most.
  const settledCapped = rangeTo.getTime() - rangeFrom.getTime() > SETTLED_MAX_DAYS * DAY_MS;
  const settledFrom = settledCapped ? new Date(rangeTo.getTime() - SETTLED_MAX_DAYS * DAY_MS) : rangeFrom;
  const settledRows = channelRows.filter((row) => {
    const date = settledOn(row);
    return row.status === 'Settled' && !!date && date >= settledFrom && date < rangeTo;
  });
  const sum = (rows: SettlementRow[], pick: (row: SettlementRow) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const settledAmount = sum(settledRows, (row) => row.netAmount);
  const settledPhrase = settledCapped ? 'in the latest 7 days' : rangePhrase(range);
  // To settle: the balance right now, whatever the dates.
  const summary = useMemo(() => getSettlementSummary(channel), [channel]);
  const nextRun = /on demand/i.test(summary.nextSettlementAt) ? 'On demand' : summary.nextSettlementAt;

  const inListRange = useMemo(
    () =>
      channelRows.filter((row) => {
        const date = settledOn(row);
        return !!date && date >= rangeFrom && date < rangeTo;
      }),
    [channelRows, rangeFrom, rangeTo]
  );
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const pick = (id: string) => moreFilters[id]?.[0];
    return inListRange.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (pick('bank') && row.acquiringBank.toLowerCase() !== pick('bank')) return false;
      if (pick('type') && row.settlementType !== pick('type')) return false;
      if (pick('payment') && row.paymentMethod !== pick('payment')) return false;
      if (pick('tid') && row.tid !== pick('tid')) return false;
      if (!query) return true;
      return `${row.batchId} ${row.utr} ${row.bankName} ${row.acquiringBank} ${row.tid} ${row.store}`.toLowerCase().includes(query);
    });
  }, [inListRange, moreFilters, search, status]);
  const loadedRows = sortNewestFirst(filteredRows, (row) => displayTimestamp(row.settlementDatePrimary, row.settlementDateSecondary)).slice(0, lazy.count);

  const dates: RangeScope = {
    kind: 'range',
    subject: 'settlements',
    presets: ['today', 'yesterday', '7d', '30d', '90d'],
    value: range,
    onChange: resetList(setRange),
    allowCustom: true,
    maxDays: 90,
    note: 'Settled totals go back 7 days. Over a longer range, the total shows its latest 7 days and the list shows every settlement.',
  };
  const muted = { color: theme.colors.onSurfaceVariant };
  const noun = { one: 'settlement', other: 'settlements' };

  return (
    <View>
      <SampleHero>
        <HeroTopRow period={heroView === 'settled' ? <DateButton scope={dates} compact /> : <LiveTag />}>
          <HeroSwitch
            options={[
              { key: 'settled', label: 'Settled' },
              { key: 'to-settle', label: 'To settle' },
            ]}
            value={heroView}
            onChange={setHeroView}
          />
        </HeroTopRow>
        {heroView === 'settled' ? (
          <HeroNumber
            amount={settledAmount}
            line={settledRows.length ? `${settledRows.length} ${settledRows.length === 1 ? 'batch' : 'batches'} reached your bank ${settledPhrase}` : `Nothing settled ${settledPhrase} yet`}
          />
        ) : (
          <HeroNumber
            amount={summary.unsettledAmount}
            line={nextRun === 'On demand' ? 'Settles when you ask for it' : `Next settlement ${nextRun.toLowerCase()}`}
            lineTone="accent"
          />
        )}
        {/* The figures behind the number, with the page's actions under them. */}
        <HeroGroup>
          <HeroFigures
            figures={
              heroView === 'settled'
                ? [
                    { label: 'Collected', value: shortInr(sum(settledRows, (row) => row.grossAmount)) },
                    { label: 'Deductions', value: `−${shortInr(sum(settledRows, (row) => row.deductionsTotal))}`, tone: 'negative' },
                  ]
                : [
                    { label: 'Payments waiting', value: formatCount(summary.remainingCount) },
                    { label: 'On hold', value: formatCount(summary.onHoldCount) },
                  ]
            }
          />
          <HeroActions
            // In-store only: On-Demand settlement pays some of the balance today.
            primary={channel === 'in-store' ? { label: 'Settle now', icon: 'lightning', onPress: () => toast("On-Demand settlement isn't in the prototype yet") } : undefined}
            menu={[
              { label: 'Settlement preferences', icon: 'sliders', onPress: () => router.push('/settlements/preferences') },
              { label: 'Email filtered', icon: 'envelope-simple' },
              { label: 'Download filtered', icon: 'download-simple' },
            ]}
          />
        </HeroGroup>
      </SampleHero>

      <SampleSheet
        title="Settlement history"
        search={search}
        onSearchChange={resetList(setSearch)}
        searchPlaceholder="Search by UTR or Trxn ID"
        filters={[
          selectFilter({ label: 'Status', options: STATUS_OPTIONS, value: status, onApply: resetList(setStatus) }),
          { type: 'more', categories: MORE_FILTER_CATEGORIES, applied: moreFilters, onApply: resetList(setMoreFilters) },
        ]}
        // While the hero is live, the list's own dates sit with the list, so they're never a guess.
        accessory={heroView === 'to-settle' ? <View style={styles.dates}><DateButton scope={dates} compact /></View> : undefined}
        totals={{ all: inListRange.length, shown: filteredRows.length, amount: sum(filteredRows, (row) => row.netAmount) }}
        noun={noun}>
        <DayGroupedList
          plain
          groups={groupByDay(loadedRows, (row) => row.settlementDatePrimary)}
          totals={dayTotals(filteredRows, (row) => row.settlementDatePrimary, (row) => row.netAmount)}
          noun={noun}
          empty={inListRange.length ? 'No settlements match. Try clearing the search or filters.' : 'No settlements in these dates.'}
          renderRow={(row) => (
            <ListRow
              key={row.id}
              icon={<BankLogo bank={row.bankName} size={24} />}
              onPress={() => router.push(`/settlements/${row.batchId}`)}
              accessibilityLabel={`${rupees(row.netAmount)} to ${row.bankName} bank ending ${row.accountLabel.slice(-4)}, ${collectionLabel(row)}, ${row.status}`}>
              <ListRowLine
                left={
                  <>
                    <Text variant="titleMedium" style={styles.amount}>
                      {rupees(row.netAmount)}
                    </Text>
                    <Text variant="bodySmall" numberOfLines={1} style={muted}>
                      {row.bankName} Bank •••• {row.accountLabel.slice(-4)}
                    </Text>
                  </>
                }
                right={<DotStatusBadge label={row.status} tone={settlementStatusTone(row.status)} />}
                centered
              />
            </ListRow>
          )}
        />
        <LazyListFooter lazy={lazy} total={filteredRows.length} noun="settlements" />
      </SampleSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontFamily: Fonts.semiBold, fontVariant: ['tabular-nums', 'stylistic-one'] },
  dates: { flexDirection: 'row' },
});
