import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { TabChrome, useTabNavBar, useTabScroll } from '@/components/app-tabs';
import { ExploreProducts } from '@/components/overview/explore-products';
import { OnDemandSheet } from '@/components/payments/on-demand-sheet';
import { OnDemandBanner } from '@/components/overview/on-demand-banner';
import type { OverviewDay } from '@/components/overview/overview-card';
import { QuickActions } from '@/components/overview/quick-actions';
import { type ChannelSummary, type PaymentSourceSummary, TodayPaymentsCard } from '@/components/overview/today-payments-card';
import { TodaySettlementCard } from '@/components/overview/today-settlement-card';
import { usePullToRefresh } from '@/components/pull-to-refresh';
import { PAGE_GAP, PAGE_PADDING } from '@/components/tab-screen';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { CHANNEL_MULTIPLIER, PINE_LABS_PAYMENT_SHARE, SETTLEMENT_SOURCES, TODAY_PAYMENTS, YESTERDAY_PAYMENTS } from '@/data/overview';
import { useBusiness } from '@/hooks/use-business';

/**
 * Overview (Figma 6470:676, "PineOne - Omni-channel"), top to bottom:
 * 1. Payments, then settlement, stacked. On the app pages (Figma 7154:141243)
 *    each has its own Today / Yesterday switch, its total beside an
 *    illustration, and the payments card lists In-store and Online (or the
 *    last 3 transactions on one channel). Otherwise the payments card lists
 *    Pine Labs and the partner bank, then a closed Channel breakdown accordion.
 * 2. A nudge towards On-Demand settlement.
 * 3. Quick actions, then Explore products.
 * Sections are 32dp apart (8dp, without Quick actions, on the app pages: APP_PAGE_LAYOUT). Every number follows the stores and channel chosen
 * in the header switcher; the page has no scope filters of its own.
 */
export default function OverviewScreen() {
  return (
    <TabChrome tab="index">
      <OverviewContent />
    </TabChrome>
  );
}

/** Inside TabChrome, so scrolling slides the navigation bar away. */
function OverviewContent() {
  const { storeScale, channelScale, channel, organisation } = useBusiness();
  const scale = storeScale * channelScale;
  const navBar = useTabNavBar();
  const [onDemandOpen, setOnDemandOpen] = useState(false);
  // Each Home card switches between today and yesterday on its own (Figma 7154:141243).
  const [paymentsDay, setPaymentsDay] = useState<OverviewDay>('today');
  const [settlementDay, setSettlementDay] = useState<OverviewDay>('today');
  const tabScroll = useTabScroll();
  const { attach: attachPull, refreshControl, indicator: pullIndicator } = usePullToRefresh(tabScroll.contentTop);
  const dayPayments = paymentsDay === 'yesterday' ? YESTERDAY_PAYMENTS : TODAY_PAYMENTS;
  const count = Math.max(0, Math.round(dayPayments.count * scale));
  const totalAmount = Math.round(dayPayments.totalAmount * scale);
  // The partner bank and online take the remainder, so each pair of rows adds up to the total.
  const pineLabsCount = Math.round(count * PINE_LABS_PAYMENT_SHARE);
  const pineLabsAmount = Math.round(totalAmount * PINE_LABS_PAYMENT_SHARE);
  // Only the sources this organisation has: no partner bank means no split to show.
  const activeSources = SETTLEMENT_SOURCES.filter(({ value }) => value === 'pinelabs' || organisation.hasPartnerBank);
  const sources: PaymentSourceSummary[] = activeSources.map(({ value, label }) => ({
    value,
    label,
    count: value === 'pinelabs' ? pineLabsCount : count - pineLabsCount,
    amount: value === 'pinelabs' ? pineLabsAmount : totalAmount - pineLabsAmount,
  }));
  const inStoreCount = Math.round(count * CHANNEL_MULTIPLIER['in-store']);
  const inStoreAmount = Math.round(totalAmount * CHANNEL_MULTIPLIER['in-store']);
  const channels: ChannelSummary[] | undefined =
    channel === 'all'
      ? [
          { kind: 'in-store', label: APP_PAGE_LAYOUT ? 'In-store' : 'In-store payments', count: inStoreCount, amount: inStoreAmount },
          { kind: 'online', label: APP_PAGE_LAYOUT ? 'Online' : 'Online payments', count: count - inStoreCount, amount: totalAmount - inStoreAmount },
        ]
      : undefined;

  return (
    <View style={styles.area}>
      <Animated.ScrollView
        ref={attachPull}
        refreshControl={refreshControl}
        {...tabScroll.scrollProps}
        contentContainerStyle={[styles.content, { paddingTop: tabScroll.contentTop + PAGE_GAP, paddingBottom: 32 + navBar.height }]}>
        {/* Today's two cards, one under the other. */}
        <View style={styles.cards}>
          <TodayPaymentsCard
            totalAmount={totalAmount}
            count={count}
            sources={sources}
            channels={channels}
            recent={(channel === 'online' ? TODAY_PAYMENTS.recentOnline : TODAY_PAYMENTS.recent).slice(0, 3)}
            recentKind={channel === 'online' ? 'online' : 'in-store'}
            onPressChannel={() => router.navigate('/payments')}
            onPressPayment={(transactionId) => router.push(`/payments/transactions/${transactionId}`)}
            onPressHistory={() => router.navigate('/payments')}
            day={paymentsDay}
            onDayChange={setPaymentsDay}
          />
          <TodaySettlementCard
            scale={scale}
            hasPartnerBank={organisation.hasPartnerBank}
            onPressHistory={() => router.navigate('/settlements')}
            day={settlementDay}
            onDayChange={setSettlementDay}
          />
        </View>

        {/* Settle now opens On-Demand settlement in place (Figma 7161:96423). */}
        <OnDemandBanner onPress={() => (APP_PAGE_LAYOUT ? setOnDemandOpen(true) : router.navigate('/settlements'))} />

        {/* The app pages' Home (Figma 7154:141243) goes straight from the banner to Explore products. */}
        {APP_PAGE_LAYOUT ? null : <QuickActions />}

        <ExploreProducts onPressViewAll={navBar.openModules} onPressBanner={navBar.openModules} />
      </Animated.ScrollView>
      {pullIndicator}
      <OnDemandSheet visible={onDemandOpen} onDismiss={() => setOnDemandOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The app pages stack every card 8dp apart and 8dp from the screen's edges.
  content: { paddingHorizontal: PAGE_PADDING, gap: APP_PAGE_LAYOUT ? PAGE_GAP : 32 },
  area: { flex: 1 },
  cards: { gap: APP_PAGE_LAYOUT ? PAGE_GAP : 16 },
});
