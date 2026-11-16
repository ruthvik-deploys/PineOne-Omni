import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, FAB, IconButton, Text, useTheme } from 'react-native-paper';

import { Divider } from '@/components/shared/divider';
import { SearchField } from '@/components/search-field';
import { DimmedDecimalAmount } from '@/components/shared/amount';
import { BankLogo } from '@/components/shared/bank-logo';
import { CopyableValue } from '@/components/shared/copyable-value';
import { DetailRow, SECTION_CARD_INNER_RADIUS, SectionCard } from '@/components/shared/detail-rows';
import { HelpCard } from '@/components/shared/help-card';
import { CollapsingDetailScreen, DETAIL_FOOTER_BUTTON_RADIUS, type StatusGradientTone } from '@/components/shared/detail-screen';
import { DayGroupedList, dayTotals, displayTimestamp, groupByDay, sortNewestFirst } from '@/components/shared/day-groups';
import { DotStatusBadge } from '@/components/shared/status';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { concentric, Shape } from '@/constants/shape';
import { formatCount, formatInr } from '@/data/common';
import { Fonts } from '@/constants/theme';
import { type SettlementRow, type SettlementStatus, settlementDetailRows } from '@/data/settlements';
import { useToast } from '@/hooks/use-toast';

import { ActivityTimeline, type TimelineEvent } from './activity-timeline';
import { PaymentRow } from './payment-row';
import { rupees, settlementStatusTone } from './settlements-view';


function gradientFor(status: SettlementStatus): StatusGradientTone {
  if (status === 'Settled') return 'success';
  if (status === 'Failed') return 'failed';
  if (status === 'Processing' || status === 'Initiated') return 'processing';
  return 'neutral';
}

/**
 * Settlement batch detail (web: V3SettlementsContent detail mode), laid out
 * like Transaction details: a collapsing header over a centred hero (bank,
 * net amount, status, settled / initiated, UTR), then cards — Amount
 * breakdown (View all adds GST), the transactions included (searchable,
 * lazily loaded 10 at a time, grouped by day, same rows as Payments) and Help.
 */
export function SettlementDetail({ settlement }: { settlement: SettlementRow }) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  // Lazy loading (user decision): 10 rows at first, 10 more each time the list's end scrolls into view.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const muted = { color: theme.colors.onSurfaceVariant };

  // The app pages (Figma 7161:116068) show four lines, all at once: Refunds, MSF / MDR, GST and Others.
  const deductions = APP_PAGE_LAYOUT
    ? [
        { label: 'Refunds', value: settlement.refundAmount },
        { label: 'MSF / MDR', value: settlement.mdrAmount },
        { label: 'GST', value: settlement.gstAmount },
        { label: 'Others', value: settlement.platformFees + settlement.recoveryAmount + settlement.chargebackAmount },
      ]
    : [
    { label: 'Refunds', value: settlement.refundAmount },
    { label: 'Chargeback', value: settlement.chargebackAmount },
    { label: 'Loan recovery', value: settlement.recoveryAmount },
    { label: 'MSF / MDR', value: settlement.mdrAmount },
    { label: 'MCF', value: settlement.platformFees },
    ...(showAll ? [{ label: 'GST', value: settlement.gstAmount }] : []),
      ];
  const activity: TimelineEvent[] = [
    { id: 'initiated', title: 'Settlement initiated', timestamp: `${settlement.initiationDatePrimary}, ${settlement.initiationDateSecondary}`, tone: 'processing', details: [] },
    ...(settlement.status === 'Settled'
      ? [{ id: 'settled', title: 'Settled in account', timestamp: `${settlement.settlementDatePrimary}, ${settlement.settlementDateSecondary}`, tone: 'success' as const, details: [] }]
      : []),
  ];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return settlementDetailRows;
    return settlementDetailRows.filter((row) =>
      `${row.id} ${row.merchantOrderId} ${row.arn} ${row.rrn} ${row.storeName} ${row.storeAddress} ${row.tid} ${row.paymentMethodLabel} ${row.paymentMethodSubLabel}`
        .toLowerCase()
        .includes(query)
    );
  }, [search]);
  // Newest first so each day forms one group.
  const shown = sortNewestFirst(filtered, (row) => displayTimestamp(row.paymentDate, row.paymentTime)).slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const last4 = settlement.accountLabel.slice(-4);

  // Floating search: appears (fade + rise) while the transactions section is on screen, or while a search is open.
  const toast = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [cardsTop, setCardsTop] = useState(0);
  const [section, setSection] = useState({ top: 0, height: 0 });
  const [overSection, setOverSection] = useState(false);
  const [searchAnim] = useState(() => new Animated.Value(0));
  const searchShown = overSection || searchOpen;
  useEffect(() => {
    Animated.timing(searchAnim, { toValue: searchShown ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [searchShown, searchAnim]);
  const handleScroll = (offsetY: number, viewportHeight: number) => {
    const top = cardsTop + section.top;
    const bottom = top + section.height;
    // Search shows once the section fills a good part of the screen, until it has mostly scrolled past.
    const next = section.height > 0 && offsetY + viewportHeight > top + 200 && offsetY < bottom - 160;
    if (next !== overSection) setOverSection(next);
    // Near the end of the loaded rows: fetch the next 10 (a short delay stands in for the network).
    if (hasMore && !loadingMore && section.height > 0 && offsetY + viewportHeight > bottom - 120) {
      setLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((count) => count + PAGE_SIZE);
        setLoadingMore(false);
      }, 500);
    }
  };
  const updateSearch = (value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  };

  // Centred summary; it collapses into the header (settled amount + bank) on scroll.
  // The app pages (Figma 7161:116068): the bank, the amount at 20dp, the status beside the UTR, then where it went.
  const hero = APP_PAGE_LAYOUT ? (
    <View style={styles.hero}>
      <View style={[styles.bankTile, { backgroundColor: theme.colors.surface }]}>
        <BankLogo bank={settlement.bankName} size={20} />
      </View>
      <DimmedDecimalAmount value={formatInr(settlement.netAmount)} size="medium" />
      <View style={styles.heroPills}>
        <DotStatusBadge label={settlement.status} tone={settlementStatusTone(settlement.status)} />
        <CopyableValue variant="pill" value={settlement.utr} label={`UTR: ${settlement.utr}`} />
      </View>
      <Text variant="bodyMedium" style={[styles.meta, muted]}>
        Settled to: {settlement.bankName} bank, {settlement.accountLabel}
      </Text>
    </View>
  ) : (
    <View style={styles.hero}>
      <BankLogo bank={settlement.bankName} size={48} />
      <DimmedDecimalAmount value={rupees(settlement.netAmount)} size="hero" />
      {/* Wrapped so the badge (which aligns itself to the start) centres in the hero. */}
      <View>
        <DotStatusBadge label={settlement.status} tone={settlementStatusTone(settlement.status)} />
      </View>
      <Text variant="bodyMedium" style={[styles.meta, muted]}>
        Settled to: {settlement.bankName} bank, {settlement.accountLabel} on {settlement.settlementDatePrimary}, {settlement.settlementDateSecondary}
        {'\n'}
        Initiated on: {settlement.initiationDatePrimary}, {settlement.initiationDateSecondary}
      </Text>
      <View>
        <CopyableValue variant="pill" value={settlement.utr} label={`UTR: ${settlement.utr}`} />
      </View>
    </View>
  );

  return (
    <CollapsingDetailScreen
      fallbackHref="/settlements"
      gradient={gradientFor(settlement.status)}
      hero={hero}
      compactTitle={rupees(settlement.netAmount)}
      compactSubtitle={`${settlement.bankName} Bank •••• ${last4}`}
      onScroll={handleScroll}
      floating={APP_PAGE_LAYOUT ? undefined : (
        <Animated.View
          pointerEvents={searchShown ? 'box-none' : 'none'}
          style={[styles.floatingSearch, { opacity: searchAnim, transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
          {searchOpen ? (
            <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.flex}>
                <SearchField
                  value={search}
                  onChangeText={updateSearch}
                  placeholder="Search by Trxn ID"
                  radius={SEARCH_INNER_RADIUS}
                  autoFocus
                />
              </View>
              <IconButton
                icon="x"
                size={18}
                onPress={() => {
                  setSearchOpen(false);
                  updateSearch('');
                }}
                accessibilityLabel="Close search"
                style={styles.searchClose}
              />
            </View>
          ) : (
            <FAB
              icon="magnifying-glass"
              size="small"
              onPress={() => setSearchOpen(true)}
              accessibilityLabel="Search transactions"
              style={styles.fab}
            />
          )}
        </Animated.View>
      )}
      footer={
        <Button
          mode="contained"
          icon={APP_PAGE_LAYOUT ? undefined : 'download-simple'}
          onPress={() => toast('Downloading MPR...')}
          accessibilityLabel="Download MPR (merchant payment report)"
          style={styles.footerButton}
          contentStyle={APP_PAGE_LAYOUT ? styles.appFooterContent : undefined}
          labelStyle={APP_PAGE_LAYOUT ? styles.appFooterLabel : undefined}>
          {APP_PAGE_LAYOUT ? 'Download MPR report' : 'Download MPR'}
        </Button>
      }>
      {/* One card per segment, evenly spaced (same layout as Transaction details). */}
      <View style={styles.cards} onLayout={(event) => setCardsTop(event.nativeEvent.layout.y)}>
        {APP_PAGE_LAYOUT ? <ActivityTimeline events={activity} carded /> : null}
        <SectionCard
          title={APP_PAGE_LAYOUT ? 'Deductions' : 'Amount breakdown'}
          icon="wallet"
          trailing={APP_PAGE_LAYOUT ? rupees(settlement.deductionsTotal) : undefined}>
          <DetailRow label="Gross amount">
            <Text variant="bodyMedium" style={styles.medium}>
              {rupees(settlement.grossAmount)}
            </Text>
          </DetailRow>
          {deductions.map((item) => (
            <DetailRow key={item.label} label={item.label}>
              <Text variant="bodyMedium" style={[styles.medium, { color: theme.colors.error }]}>
                - {rupees(item.value)}
              </Text>
            </DetailRow>
          ))}
          {APP_PAGE_LAYOUT ? null : <Button
            mode="text"
            compact
            icon={showAll ? 'caret-up' : 'caret-down'}
            onPress={() => setShowAll((current) => !current)}
            contentStyle={styles.trailingIcon}
            style={styles.viewAll}>
            {showAll ? 'View less' : 'View all'}
          </Button>}
          <Divider />
          <DetailRow label="Net settled amount">
            <Text variant="bodyMedium" style={styles.semiBold}>
              {rupees(settlement.netAmount)}
            </Text>
          </DetailRow>
        </SectionCard>

        <View onLayout={(event) => setSection({ top: event.nativeEvent.layout.y, height: event.nativeEvent.layout.height })}>
        <SectionCard
          title={APP_PAGE_LAYOUT ? 'Transactions included' : `${settlement.transactionCount} Transactions included`}
          icon="arrows-left-right"
          trailing={APP_PAGE_LAYOUT ? formatCount(settlement.transactionCount) : undefined}>
          {/* The app pages search inline, at the top of the list (Figma 7161:116068). */}
          {APP_PAGE_LAYOUT ? <SearchField value={search} onChangeText={updateSearch} placeholder="Search trxns" radius={Shape.small} height={28} /> : null}
          {/* Same rows as Payments → Transactions, grouped by day; no inner box — the section card frames them. */}
          <View style={styles.bleed}>
            <DayGroupedList
              flat
              groups={groupByDay(shown, (row) => row.paymentDate)}
              totals={dayTotals(filtered, (row) => row.paymentDate, (row) => row.transactionAmount)}
              noun={{ one: 'payment', other: 'payments' }}
              empty="No transactions match your search."
              renderRow={(row) => (
                <PaymentRow
                  amount={APP_PAGE_LAYOUT ? formatInr(row.transactionAmount) : rupees(row.transactionAmount)}
                  paymentMode={row.paymentMethod}
                  paymentLabel={APP_PAGE_LAYOUT ? `${row.paymentTime} · ${row.paymentMethodLabel}` : row.paymentMethodLabel}
                  status={<DotStatusBadge label={row.payoutStatus} tone={settlementStatusTone(row.payoutStatus)} />}
                  onPress={() => router.push(`/payments/transactions/${row.id}`)}
                  accessibilityLabel={`${rupees(row.transactionAmount)}, ${row.paymentMethodLabel}, ${row.payoutStatus}`}
                />
              )}
            />
          </View>
          {hasMore ? (
            <View style={styles.loadMore}>
              {loadingMore ? <ActivityIndicator size={18} /> : null}
              <Text variant="bodySmall" style={muted}>
                {loadingMore ? 'Loading more transactions…' : `Showing ${shown.length} of ${filtered.length} · scroll for more`}
              </Text>
            </View>
          ) : filtered.length > 0 ? (
            <Text variant="bodySmall" style={[styles.endOfList, muted]}>
              All {filtered.length} transactions shown
            </Text>
          ) : null}
        </SectionCard>
        </View>

        <HelpCard subject="settlement" carded />
      </View>
    </CollapsingDetailScreen>
  );
}

const PAGE_SIZE = 10;
const SEARCH_PADDING = 8;
const SEARCH_INNER_RADIUS = concentric(Shape.max, SEARCH_PADDING);

const styles = StyleSheet.create({
  hero: { gap: 10, alignItems: 'center', paddingBottom: 8 },
  bankTile: { width: 36, height: 36, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  heroPills: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appFooterContent: { height: 32 },
  appFooterLabel: { marginVertical: 0, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: Fonts.regular, lineHeight: 22, textAlign: 'center' },
  cards: { gap: APP_PAGE_LAYOUT ? 8 : 12 },
  medium: { fontFamily: Fonts.medium },
  semiBold: { fontFamily: Fonts.semiBold },
  viewAll: { alignSelf: 'center', borderRadius: SECTION_CARD_INNER_RADIUS },
  trailingIcon: { flexDirection: 'row-reverse' },
  loadMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 4 },
  endOfList: { textAlign: 'center', paddingTop: 4 },
  // Rows span the card edge to edge, flush under the header divider (cancels the card body's padding).
  // The app pages' search sits above the list, so the bands start under it.
  bleed: { marginHorizontal: -16, marginTop: APP_PAGE_LAYOUT ? 0 : -16 },
  footerButton: { flex: 1, borderRadius: DETAIL_FOOTER_BUTTON_RADIUS },
  flex: { flex: 1 },
  floatingSearch: { alignItems: 'flex-end' },
  // Floating containers: capped at the 12dp maximum (Paper's FAB is 16).
  fab: { borderRadius: Shape.max },
  searchBar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: SEARCH_PADDING,
    borderRadius: Shape.max,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
  },
  searchClose: { margin: 0, borderRadius: SEARCH_INNER_RADIUS },
});
