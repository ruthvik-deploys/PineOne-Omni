import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { PanelSheet } from '@/components/shared/panel-sheet';
import { OptionCard, SheetBlock, SheetButton, SheetHeading } from '@/components/shared/sheet-parts';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { formatInr } from '@/data/common';
import { getSettlementSummary } from '@/data/settlements';
import { useToast } from '@/hooks/use-toast';

/** Today's remaining On-Demand slots (Figma 7161:97247: three radio rows). */
const SLOTS = ['12:00 PM', '3:00 PM', '6:00 PM'];
/** On-Demand settlement's fee: 0.15% of the amount, plus 18% GST on it. */
const FEE_RATE = 0.0015;
const GST_RATE = 0.18;

/**
 * "On-demand settlement" (Figma 7161:96423 → 7161:97311): what Settle now
 * opens, from Home's banner and from Settlements. The lightning tile and
 * "Confirm On-Demand settlement" with what will reach the bank, the amount
 * and the fee in a bordered box; the next slot to pick; the note that it
 * can't be undone; then Confirm, which closes the sheet with a toast.
 */
export function OnDemandSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  const [slot, setSlot] = useState(SLOTS[0]);
  const summary = getSettlementSummary('in-store');
  const amount = summary.unsettledAmount;
  const fee = Math.round(amount * FEE_RATE * (1 + GST_RATE));
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title="On-demand settlement"
      height={640}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <SheetButton
              label="Confirm settlement"
              onPress={() => {
                onDismiss();
                toast(`On-Demand settlement of ${formatInr(amount - fee)} initiated for ${slot}`);
              }}
            />
          </View>
        </View>
      }>
      <SheetBlock gap={16}>
        <View style={[styles.tile, { backgroundColor: theme.dark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff' }]}>
          <Icon source="lightning" size={24} color="#4f46e5" />
        </View>
        <View style={styles.intro}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Confirm On-Demand settlement</Text>
          <Text style={[styles.body, muted]}>
            Get your unsettled amount in your HDFC bank account xx7676 today, ahead of the next scheduled settlement.
          </Text>
        </View>
        <View style={[styles.box, { borderColor: theme.colors.outlineVariant }]}>
          <View style={styles.boxRow}>
            <Text style={[styles.small, muted]}>Amount to settle</Text>
            <Text style={[styles.small, styles.strong, { color: theme.colors.onSurface }]}>{formatInr(amount)}</Text>
          </View>
          <View style={styles.boxRow}>
            <Text style={[styles.small, muted]}>Fee (0.15% + GST)</Text>
            <Text style={[styles.small, styles.strong, { color: theme.colors.error }]}>- {formatInr(fee)}</Text>
          </View>
        </View>
      </SheetBlock>
      <SheetBlock gap={12} last>
        <SheetHeading size="large">Next available slot</SheetHeading>
        {SLOTS.map((option) => (
          <OptionCard key={option} title={`Today, ${option}`} selected={slot === option} onPress={() => setSlot(option)} />
        ))}
        <View style={[styles.note, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="info" size={20} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.small, styles.flex, muted]}>
            This process can’t be reversed once initiated. The amount is expected to be settled by {slot}, due to processing time.
          </Text>
        </View>
      </SheetBlock>
    </PanelSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tile: { width: 40, height: 40, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 8 },
  title: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  strong: { fontFamily: Fonts.medium },
  box: { borderWidth: 1, borderRadius: Shape.max, padding: 12, gap: 12 },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  note: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Shape.small },
  // Figma 7161:97255: the action sits at the right of the foot.
  footer: { flexDirection: 'row', justifyContent: 'flex-end' },
  footerButton: { minWidth: 160 },
});
