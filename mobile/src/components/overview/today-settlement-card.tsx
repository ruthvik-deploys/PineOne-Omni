import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { DimmedDecimalAmount } from '@/components/shared/amount';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Fonts } from '@/constants/theme';
import { formatInr, SETTLEMENT_TODAY, SETTLEMENT_YESTERDAY } from '@/data/overview';

import {
  OVERVIEW_CARD_PADDING,
  OVERVIEW_SUMMARY_PADDING_BOTTOM,
  OverviewCard,
  OverviewCardDivider,
  OverviewCardFooter,
  OverviewCardHeader,
  type OverviewDay,
  OverviewDaySwitch,
  OverviewTotal,
} from './overview-card';

const SETTLEMENT_ART = require('../../../assets/images/overview/today-settlement.png');

type TodaySettlementCardProps = {
  /** Store × channel share in scope (web: combinedScale); 1 = all stores, all channels. */
  scale?: number;
  /** Counts the partner bank's settlements in with Pine Labs'. */
  hasPartnerBank?: boolean;
  onPressHistory?: () => void;
  /** The Home's Today / Yesterday switch (APP_PAGE_LAYOUT). */
  day?: OverviewDay;
  onDayChange?: (day: OverviewDay) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * "Today's settlement" (Figma 6470:737): the amount settled today and when,
 * across Pine Labs and any partner bank, what's still to settle and when the
 * next run is, and a link to the history.
 */
export function TodaySettlementCard({ scale = 1, hasPartnerBank = false, onPressHistory, day = 'today', onDayChange, style }: TodaySettlementCardProps) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const { pinelabs, 'partner-bank': partner } = SETTLEMENT_TODAY;
  const yesterday = day === 'yesterday';
  const settled = yesterday
    ? SETTLEMENT_YESTERDAY.pinelabs.netAmount + (hasPartnerBank ? SETTLEMENT_YESTERDAY['partner-bank'].netAmount : 0)
    : pinelabs.netAmount + (hasPartnerBank ? partner.netAmount : 0);
  // Yesterday's money is all in: nothing of it is left to settle.
  const pending = yesterday ? 0 : pinelabs.pendingAmount + (hasPartnerBank ? partner.pendingAmount : 0);
  const lastSettled = yesterday ? SETTLEMENT_YESTERDAY.pinelabs.lastSettledLabel : pinelabs.lastSettledLabel;

  return (
    <OverviewCard style={style}>
      {APP_PAGE_LAYOUT ? (
        // Figma 7800:99052: SETTLEMENT with Today / Yesterday, the total beside the coins.
        <>
          <OverviewCardHeader title="Settlement" trailing={onDayChange ? <OverviewDaySwitch value={day} onChange={onDayChange} label="Settlement for" /> : undefined} />
          <OverviewTotal amount={settled * scale} line={lastSettled} image={SETTLEMENT_ART} />
        </>
      ) : (
        <>
          <OverviewCardHeader title="Today's settlement" />
          <View style={styles.summary}>
            <DimmedDecimalAmount value={formatInr(settled * scale)} size="medium" />
            <Text style={[styles.body, muted]}>{lastSettled}</Text>
          </View>
        </>
      )}

      <OverviewCardDivider />
      <View style={styles.detailRow}>
        <Text style={[styles.body, muted]}>Yet to settle</Text>
        <Text style={styles.strong}>{formatInr(pending * scale)}</Text>
      </View>
      <OverviewCardDivider />
      <View style={styles.detailRow}>
        <Text style={[styles.body, muted]}>Next settlement</Text>
        <Text style={styles.strong}>{pinelabs.nextSettlementLabel}</Text>
      </View>

      <OverviewCardFooter label="View settlement history" onPress={onPressHistory} />
    </OverviewCard>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 4, padding: OVERVIEW_CARD_PADDING, paddingBottom: OVERVIEW_SUMMARY_PADDING_BOTTOM },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums', 'stylistic-one'] },
  strong: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums', 'stylistic-one'] },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: OVERVIEW_CARD_PADDING },
});
