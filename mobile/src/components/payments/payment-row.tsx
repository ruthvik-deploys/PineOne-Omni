import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { DimmedDecimalAmount } from '@/components/shared/amount';
import { ListRow, ListRowLine } from '@/components/shared/listing';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Fonts } from '@/constants/theme';
import type { PaymentMode } from '@/data/common';

/** Pay-mode glyphs, as on the transaction detail's mode tile. */
export const PAY_MODE_ICON: Record<PaymentMode, string> = { upi: 'qr-code', card: 'credit-card', netbanking: 'bank' };

/**
 * One payment in a listing (user decision): the pay mode's icon, the amount
 * with the pay mode below it, the status on the right — nothing else; the
 * rest is on the transaction detail. Shared by Payments → Transactions and
 * Settlement details → Transactions included, which list the same things.
 */
export function PaymentRow({
  amount,
  paymentMode,
  paymentLabel,
  status,
  onPress,
  accessibilityLabel,
}: {
  amount: string;
  paymentMode: PaymentMode;
  paymentLabel: string;
  status: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <ListRow icon={PAY_MODE_ICON[paymentMode]} onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <ListRowLine
        left={
          <>
            {APP_PAGE_LAYOUT ? (
              <>
                <DimmedDecimalAmount value={amount} size="row" />
                <DotSeparated parts={paymentLabel.split(' · ')} />
              </>
            ) : (
              <>
                <Text variant="titleMedium" style={styles.amount}>
                  {amount}
                </Text>
                <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                  {paymentLabel}
                </Text>
              </>
            )}
          </>
        }
        right={status}
        centered
      />
    </ListRow>
  );
}

/**
 * A listing row's amount. The app pages (APP_PAGE_LAYOUT, Figma 7153:139381)
 * set it at 16dp medium with its paise, faint ("₹75,500.00"); otherwise the
 * row's own semibold title.
 */
export function RowAmount({ value }: { value: string }) {
  if (!APP_PAGE_LAYOUT) {
    return (
      <Text variant="titleMedium" style={styles.amount}>
        {value}
      </Text>
    );
  }
  const compact = value.replace(/^(−|-)?\s*₹\s*/, (_, sign = '') => `${sign}₹`);
  return <DimmedDecimalAmount value={/\.\d{2}$/.test(compact) ? compact : `${compact}.00`} size="row" />;
}

/** "10:00 AM • Net banking" (Figma 7153:139382): muted 12/16 parts with a 4dp dot between them. */
export function DotSeparated({ parts }: { parts: string[] }) {
  const theme = useTheme();
  return (
    <View style={styles.parts}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={[styles.dot, { backgroundColor: theme.colors.onSurfaceVariant }]} /> : null}
          <Text numberOfLines={1} style={[styles.part, { color: theme.colors.onSurfaceVariant }]}>
            {part}
          </Text>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontFamily: Fonts.semiBold, fontVariant: ['tabular-nums', 'stylistic-one'] },
  parts: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, opacity: 0.6 },
  part: { flexShrink: 1, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums', 'stylistic-one'] },
});
