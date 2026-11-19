import { Image } from 'expo-image';
import { Fragment, useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { DimmedDecimalAmount } from '@/components/shared/amount';
import { DOT_COLORS, DotStatusBadge, STATUS_DOT_TONE } from '@/components/shared/status';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Fonts } from '@/constants/theme';
import { formatInr, type RecentPayment, type SettlementSource } from '@/data/overview';

import {
  OVERVIEW_CARD_PADDING,
  OVERVIEW_SUMMARY_PADDING_BOTTOM,
  OverviewAccordion,
  OverviewCard,
  OverviewCardDivider,
  OverviewCardFooter,
  OverviewCardHeader,
  type OverviewDay,
  OverviewDaySwitch,
  OverviewTotal,
} from './overview-card';

const PAYMENTS_ART = require('../../../assets/images/overview/today-payments.png');
const QR_ICON = require('../../../assets/images/overview/payment-qr.svg');
const PINE_LABS_MARK = require('../../../assets/images/overview/pine-labs-mark.svg');

const wholeRupees = (amount: number) => formatInr(amount).replace(/\.\d\d$/, '');

export type ChannelSummary = {
  label: string;
  count: number;
  amount: number;
  /** In-store shows the QR mark; online a globe. */
  kind: 'in-store' | 'online';
};

export type PaymentSourceSummary = { value: SettlementSource; label: string; count: number; amount: number };

type TodayPaymentsCardProps = {
  totalAmount: number;
  count: number;
  /** Who processed today's payments. With only one, there's nothing to split, so the channels or payments sit straight on the card. */
  sources: PaymentSourceSummary[];
  /** Today split by channel (all channels on show). When given, these rows replace the latest payments. */
  channels?: ChannelSummary[];
  /** The latest payments (a single channel on show). */
  recent?: RecentPayment[];
  /** Which channel the latest payments are from, for their mark. */
  recentKind?: ChannelSummary['kind'];
  onPressChannel?: (kind: ChannelSummary['kind']) => void;
  onPressPayment?: (transactionId: string) => void;
  onPressHistory?: () => void;
  /** The Home's Today / Yesterday switch (APP_PAGE_LAYOUT); the totals passed in are for this day. */
  day?: OverviewDay;
  onDayChange?: (day: OverviewDay) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * "Today's payments": today's total and payment count, who processed it (Pine
 * Labs and the partner bank), then one accordion, closed until opened: Channel
 * breakdown (all channels on show) or the recent transactions (one channel).
 * Without a partner bank those rows go, and the channels or transactions sit
 * straight on the card. A link closes the card with the history.
 */
export function TodayPaymentsCard(props: TodayPaymentsCardProps) {
  return APP_PAGE_LAYOUT ? <HomePaymentsCard {...props} /> : <StackedPaymentsCard {...props} />;
}

/**
 * The app pages' Home (Figma 7800:99426): PAYMENTS with Today / Yesterday,
 * the day's total and count beside the money illustration, then the channels
 * (all channels on show) or the latest payments (one channel), each opening
 * Payments, and the history link.
 */
function HomePaymentsCard({ totalAmount, count, channels, recent = [], recentKind = 'in-store', onPressChannel, onPressPayment, onPressHistory, day = 'today', onDayChange, style }: TodayPaymentsCardProps) {
  return (
    <OverviewCard style={style}>
      <OverviewCardHeader title="Payments" trailing={onDayChange ? <OverviewDaySwitch value={day} onChange={onDayChange} label="Payments for" /> : undefined} />
      <OverviewTotal amount={totalAmount} line={`${count} ${count === 1 ? 'payment' : 'payments'}`} image={PAYMENTS_ART} />
      {channels?.map((channel) => (
        <Fragment key={channel.kind}>
          <OverviewCardDivider />
          <ChannelLine channel={channel} onPress={onPressChannel} padded />
        </Fragment>
      ))}
      {/* One channel on show: its latest payments are today's, so they stay off Yesterday. */}
      {(channels || day === 'yesterday' ? [] : recent).map((payment) => (
        <Fragment key={payment.transactionId}>
          <OverviewCardDivider />
          <PaymentLine payment={payment} kind={recentKind} onPress={onPressPayment} padded />
        </Fragment>
      ))}
      <OverviewCardFooter label="View payment history" onPress={onPressHistory} />
    </OverviewCard>
  );
}

function StackedPaymentsCard({ totalAmount, count, sources, channels, recent = [], recentKind = 'in-store', onPressChannel, onPressPayment, onPressHistory, style }: TodayPaymentsCardProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const muted = { color: theme.colors.onSurfaceVariant };
  const accordionTitle = channels ? 'Channel breakdown' : 'Recent transactions';
  const successCount = recent.filter((payment) => payment.status.tone === 'success').length;
  const failedCount = recent.filter((payment) => payment.status.tone === 'failed').length;

  return (
    <OverviewCard style={style}>
      <OverviewCardHeader title="Today's payments" />

      <View style={styles.summary}>
        <DimmedDecimalAmount value={formatInr(totalAmount)} size="medium" />
        <Text style={[styles.body, muted]}>{count} payments</Text>
      </View>

      {sources.length > 1 ? (
        <>
          <OverviewCardDivider />
          <View style={styles.sources}>
            {sources.map((source) => (
              <View key={source.value} accessible accessibilityLabel={`${source.label}, ${source.count} payments, ${formatInr(source.amount)}`} style={styles.line}>
                <View style={styles.sourceName}>
                  {source.value === 'pinelabs' ? <Image source={PINE_LABS_MARK} style={styles.icon} /> : <Icon source="bank" size={20} color={theme.colors.onSurface} />}
                  <Text style={[styles.body, muted]}>{source.label}</Text>
                </View>
                <Text style={styles.strong}>{wholeRupees(source.amount)}</Text>
              </View>
            ))}
          </View>

          <OverviewCardDivider />
          <OverviewAccordion
            open={open}
            onToggle={() => setOpen((current) => !current)}
            accessibilityLabel={channels ? accordionTitle : `${accordionTitle}, ${successCount} successful, ${failedCount} failed`}
            main={
              <View style={styles.accordionTitleRow}>
                <Text style={styles.accordionTitle}>{accordionTitle}</Text>
                {channels ? null : (
                  <>
                    <CountPill count={successCount} color={DOT_COLORS.success} />
                    <CountPill count={failedCount} color={DOT_COLORS.danger} />
                  </>
                )}
              </View>
            }>
            {channels?.map((channel) => <ChannelLine key={channel.kind} channel={channel} onPress={onPressChannel} />)}
            {channels ? null : recent.map((payment) => <PaymentLine key={payment.transactionId} payment={payment} kind={recentKind} onPress={onPressPayment} />)}
          </OverviewAccordion>
        </>
      ) : (
        <>
          {channels?.map((channel) => (
            <Fragment key={channel.kind}>
              <OverviewCardDivider />
              <ChannelLine channel={channel} onPress={onPressChannel} padded />
            </Fragment>
          ))}
          {(channels ? [] : recent).map((payment) => (
            <Fragment key={payment.transactionId}>
              <OverviewCardDivider />
              <PaymentLine payment={payment} kind={recentKind} onPress={onPressPayment} padded />
            </Fragment>
          ))}
        </>
      )}

      <OverviewCardFooter label="View payment history" onPress={onPressHistory} />
    </OverviewCard>
  );
}

/** A channel's share of today: opens the payments. */
function ChannelLine({ channel, onPress, padded = false }: { channel: ChannelSummary; onPress?: (kind: ChannelSummary['kind']) => void; padded?: boolean }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress ? () => onPress(channel.kind) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${channel.label}, ${channel.count} payments, ${formatInr(channel.amount)}`}>
      {/* The app pages (Figma 7800:99442) set the amount level with the channel's name. */}
      <View style={[styles.line, padded && styles.paddedLine, APP_PAGE_LAYOUT && styles.lineTop]}>
        <View style={styles.lineMain}>
          <ChannelMark kind={channel.kind} />
          <View style={styles.lineText}>
            <Text style={styles.strong}>{channel.label}</Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              {channel.count} {channel.count === 1 ? 'payment' : 'payments'}
            </Text>
          </View>
        </View>
        <View style={styles.lineEnd}>
          <DimmedDecimalAmount value={formatInr(channel.amount)} size="inline" />
          <Icon source="caret-right" size={16} color={theme.colors.onSurface} />
        </View>
      </View>
    </TouchableRipple>
  );
}

/** One of the channel's latest payments: opens the payment. */
function PaymentLine({ payment, kind, onPress, padded = false }: { payment: RecentPayment; kind: ChannelSummary['kind']; onPress?: (transactionId: string) => void; padded?: boolean }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress ? () => onPress(payment.transactionId) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${formatInr(payment.amount)}, ${payment.time}, ${payment.status.label}`}>
      <View style={[styles.line, padded && styles.paddedLine]}>
        <View style={styles.lineMain}>
          <ChannelMark kind={kind} />
          <View style={styles.lineText}>
            <Text style={styles.strong}>{formatInr(payment.amount)}</Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{payment.time}</Text>
          </View>
        </View>
        <View style={styles.lineEnd}>
          <View>
            <DotStatusBadge label={payment.status.label} tone={STATUS_DOT_TONE[payment.status.tone]} />
          </View>
          <Icon source="caret-right" size={16} color={theme.colors.onSurface} />
        </View>
      </View>
    </TouchableRipple>
  );
}

/** How many recent payments share a status: a coloured dot and the count, hidden at zero (Figma Settlements 999:3406). */
function CountPill({ count, color }: { count: number; color: string }) {
  const theme = useTheme();
  if (!count) return null;
  return (
    <View style={[styles.countPill, { borderColor: theme.colors.surfaceVariant }]}>
      <View style={[styles.countDot, { backgroundColor: color }]} />
      <Text style={styles.countLabel}>{count}</Text>
    </View>
  );
}

function ChannelMark({ kind }: { kind: ChannelSummary['kind'] }) {
  const theme = useTheme();
  return kind === 'in-store' ? <Image source={QR_ICON} style={styles.icon} /> : <Icon source="globe" size={20} color={theme.colors.onSurface} />;
}

const styles = StyleSheet.create({
  summary: { gap: 4, padding: OVERVIEW_CARD_PADDING, paddingBottom: OVERVIEW_SUMMARY_PADDING_BOTTOM },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums', 'stylistic-one'] },
  strong: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums', 'stylistic-one'] },
  paddedLine: { padding: OVERVIEW_CARD_PADDING },
  // Figma Settlements 999:3264: one block of single-line rows, no rules between them.
  sources: { gap: 16, paddingHorizontal: OVERVIEW_CARD_PADDING, paddingVertical: 16 },
  sourceName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  accordionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accordionTitle: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 20, paddingLeft: 7, paddingRight: 9, borderRadius: 10, borderWidth: 1 },
  countDot: { width: 5, height: 5, borderRadius: 2.5 },
  countLabel: { fontFamily: Fonts.medium, fontSize: 10, lineHeight: 14, fontVariant: ['tabular-nums', 'stylistic-one'] },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lineTop: { alignItems: 'flex-start' },
  lineMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexShrink: 1 },
  lineText: { gap: 2, flexShrink: 1 },
  lineEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 20, height: 20 },
});
