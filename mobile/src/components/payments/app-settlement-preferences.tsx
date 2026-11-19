import { useEffect, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Switch, Text, useTheme } from 'react-native-paper';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Tabs } from '@/components/material3/tabs';
import { BankLogo } from '@/components/shared/bank-logo';
import { DetailScreen } from '@/components/shared/detail-screen';
import { useSvgId } from '@/components/shared/hatch';
import { PanelSheet } from '@/components/shared/panel-sheet';
import { SheetBlock, SheetButton, SheetField, SheetHeading } from '@/components/shared/sheet-parts';
import { OutlineTag } from '@/components/shared/status';
import { PAGE_PADDING } from '@/components/tab-screen';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { APP_SETTLEMENT_ACCOUNTS } from '@/data/settlements';
import { SAME_DAY_FEE, SAME_DAY_WINDOWS } from '@/data/value-added-services';
import { useToast } from '@/hooks/use-toast';

type Marker = 'pending' | 'done' | 'skipped';
const MARKER: Record<Marker, { icon: string; color: string }> = {
  pending: { icon: 'circle', color: '#3b82f6' },
  done: { icon: 'check-circle-fill', color: '#10b981' },
  skipped: { icon: 'circle-dashed', color: '#737373' },
};

const EXAMPLES: { title: string; steps: { marker: Marker; title: string; subtitle: string }[] }[] = [
  {
    title: 'Settlement cycle example',
    steps: [
      { marker: 'pending', title: 'Transaction captured (T+0)', subtitle: 'Captured before 6:00 PM' },
      { marker: 'done', title: 'Settled on next working day (T+1)', subtitle: 'By 8:00 PM' },
    ],
  },
  {
    title: 'Bank holiday example',
    steps: [
      { marker: 'pending', title: 'Transaction captured (T+0)', subtitle: 'Captured before 6:00 PM' },
      { marker: 'skipped', title: 'Bank holiday on next day', subtitle: 'Day will be skipped' },
      { marker: 'done', title: 'Settled on next working day (T+1)', subtitle: 'By 8:00 PM' },
    ],
  },
];

/**
 * Settlement preferences as the app pages set them (APP_PAGE_LAYOUT; Figma
 * Settlement page: Settlement cycle 7161:111000 / 112214, Same-Day
 * settlement 7161:112760 → 112834, its disabling 7161:112921 → 113204, and
 * Settlement account 7161:112071 → 114415).
 *
 * Settlement cycle: Same-Day settlement as a card with its switch (turning it
 * on or off confirms in a sheet), the T+1 default, and the two worked
 * examples, each folded into a card. Settlement account: the accounts as
 * cards; editing one asks for the new details, verifies them, and shows the
 * account it replaced.
 */
export function AppSettlementPreferences() {
  const theme = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<'cycle' | 'account'>('cycle');
  const [sds, setSds] = useState(false);
  const [sdsSheet, setSdsSheet] = useState<'enable' | 'disable' | null>(null);
  const [openExample, setOpenExample] = useState<string[]>([]);
  const [editing, setEditing] = useState<(typeof APP_SETTLEMENT_ACCOUNTS)[number] | null>(null);
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    <DetailScreen title="Settlement preferences" fallbackHref="/settlements" scoped>
      <View style={styles.tabs}>
        <Tabs
          variant="secondary"
          tabs={[
            { key: 'cycle', label: 'Settlement cycle' },
            { key: 'account', label: 'Settlement account' },
          ]}
          activeKey={tab}
          onChange={(key) => setTab(key as typeof tab)}
        />
      </View>

      {tab === 'cycle' ? (
        <View style={styles.stack}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <SdsGlow />
            <View style={styles.cardTop}>
              <Icon source="lightning" size={24} color={theme.colors.primary} />
              <Switch value={sds} onValueChange={(value) => setSdsSheet(value ? 'enable' : 'disable')} color={theme.colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Enable Same-Day settlement</Text>
              <Text style={[styles.body, muted]}>Amount will be settled everyday automatically by 6:00 PM</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardTop}>
              <Icon source="arrows-counter-clockwise" size={24} color={theme.colors.onSurface} />
              {sds ? null : <OutlineTag label="Default cycle" muted radius={Shape.small} />}
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>T+1 settlement</Text>
              <Text style={[styles.body, muted]}>Captured transaction are picked up for the settlement on the next working day</Text>
            </View>
          </View>

          {EXAMPLES.map((example) => {
            const open = openExample.includes(example.title);
            return (
              <View key={example.title} style={[styles.exampleCard, { backgroundColor: theme.colors.surface }]}>
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
                    setOpenExample((current) => (open ? current.filter((title) => title !== example.title) : [...current, example.title]));
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  style={styles.exampleHeader}>
                  <Text style={[styles.cardTitle, styles.flex, { color: theme.colors.onSurface }]}>{example.title}</Text>
                  <Icon source={open ? 'caret-up' : 'caret-down'} size={20} color={theme.colors.onSurface} />
                </Pressable>
                {open ? (
                  <View style={[styles.exampleBody, { borderTopColor: theme.colors.background }]}>
                    {example.steps.map((step, index) => (
                      <View key={step.title} style={styles.step}>
                        <View style={styles.stepRail}>
                          <Icon source={MARKER[step.marker].icon} size={16} color={MARKER[step.marker].color} />
                          {index < example.steps.length - 1 ? <View style={[styles.stepLine, { backgroundColor: theme.colors.outlineVariant }]} /> : null}
                        </View>
                        <View style={styles.stepText}>
                          <Text style={[styles.medium, { color: theme.colors.onSurface }]}>{step.title}</Text>
                          <Text style={[styles.small, muted]}>{step.subtitle}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.stack}>
          {APP_SETTLEMENT_ACCOUNTS.map((account, index) => (
            <Pressable
              key={account.id}
              onPress={() => setEditing(account)}
              accessibilityRole="button"
              accessibilityLabel={`${account.bankName}, ${account.accountNumber}. Edit bank account details`}
              style={[styles.account, { backgroundColor: theme.colors.surface }]}>
              <BankLogo bank={account.bank} size={24} />
              <View style={styles.flex}>
                <View style={styles.accountTitle}>
                  <Text style={[styles.medium, { color: theme.colors.onSurface }]}>{account.bankName}</Text>
                  {index === 0 ? <OutlineTag label="Primary" muted radius={Shape.small} /> : null}
                </View>
                <Text style={[styles.small, muted]}>{account.accountNumber}</Text>
              </View>
              <Icon source="pencil-simple" size={20} color={theme.colors.onSurface} />
            </Pressable>
          ))}
        </View>
      )}

      <SameDaySheet
        mode={sdsSheet}
        onDismiss={() => setSdsSheet(null)}
        onConfirm={() => {
          const enabling = sdsSheet === 'enable';
          setSds(enabling);
          setSdsSheet(null);
          toast(enabling ? 'Same-Day settlement enabled' : 'Same-Day settlement disabled');
        }}
      />
      <EditAccountSheet account={editing} onDismiss={() => setEditing(null)} />
    </DetailScreen>
  );
}

/** The soft lime glow in the Same-Day card's corner (Figma 7161:111996, a large blurred ellipse off its left edge). */
function SdsGlow() {
  const theme = useTheme();
  const id = useSvgId('sds-glow');
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 1 1" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={id} cx="0" cy="0" rx="0.9" ry="1.2">
          <Stop offset="0" stopColor={theme.dark ? '#365314' : '#d9f99d'} stopOpacity={theme.dark ? 0.5 : 0.8} />
          <Stop offset="1" stopColor={theme.colors.surface} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={1} height={1} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Same-Day settlement, on (Figma 7161:112519) or off (7161:113043): what changes, then confirm. */
export function SameDaySheet({ mode, onDismiss, onConfirm }: { mode: 'enable' | 'disable' | null; onDismiss: () => void; onConfirm: () => void }) {
  const theme = useTheme();
  const enabling = mode === 'enable';
  const muted = { color: theme.colors.onSurfaceVariant };
  return (
    <PanelSheet
      visible={mode !== null}
      onDismiss={onDismiss}
      title="Same-Day settlement"
      fit
      footer={
        enabling ? (
          <SheetButton label="Enable Same-Day settlement" onPress={onConfirm} />
        ) : (
          <View style={styles.footerRow}>
            <View style={styles.flex}>
              <SheetButton label="Cancel" mode="outline" onPress={onDismiss} />
            </View>
            <View style={styles.flex}>
              <SheetButton label="Disable" onPress={onConfirm} />
            </View>
          </View>
        )
      }>
      <SheetBlock gap={12} last>
        <View style={[styles.tile, { backgroundColor: theme.dark ? 'rgba(190, 242, 100, 0.18)' : '#ecfccb' }]}>
          <Icon source="lightning" size={24} color={theme.colors.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{enabling ? 'Enable Same-Day settlement' : 'Disable Same-Day settlement?'}</Text>
        <Text style={[styles.body, muted]}>
          {enabling
            ? 'Payments reach your bank the same day, depending on when they were taken.'
            : 'Your settlements go back to the T+1 cycle: payments settle on the next working day by 8:00 PM.'}
        </Text>
        {enabling ? (
          <View style={[styles.box, { borderColor: theme.colors.outlineVariant }]}>
            {SAME_DAY_WINDOWS.map((window) => (
              <View key={window.captured} style={styles.boxRow}>
                <Text style={[styles.small, muted]}>Taken {window.captured.toLowerCase()}</Text>
                <Text style={[styles.small, styles.strong, { color: theme.colors.onSurface }]}>{window.settles}</Text>
              </View>
            ))}
            <View style={styles.boxRow}>
              <Text style={[styles.small, muted]}>Fee</Text>
              <Text style={[styles.small, styles.strong, { color: theme.colors.onSurface }]}>{SAME_DAY_FEE} of the settlement amount</Text>
            </View>
          </View>
        ) : null}
      </SheetBlock>
    </PanelSheet>
  );
}

/**
 * Edit bank account details (Figma 7161:113287 → 114120 → 114415): the
 * account it replaces, the new details and a note on the IFSC, then a
 * moment verifying, then the change, old above new.
 */
function EditAccountSheet({ account, onDismiss }: { account: (typeof APP_SETTLEMENT_ACCOUNTS)[number] | null; onDismiss: () => void }) {
  const theme = useTheme();
  const [step, setStep] = useState<'form' | 'verifying' | 'done'>('form');
  const [number, setNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [holder, setHolder] = useState('');
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if ((account?.id ?? null) !== openedFor) {
    setOpenedFor(account?.id ?? null);
    setStep('form');
    setNumber('');
    setIfsc('');
    setHolder(account?.holder ?? '');
  }
  useEffect(() => {
    if (step !== 'verifying') return;
    const timer = setTimeout(() => setStep('done'), 1600);
    return () => clearTimeout(timer);
  }, [step]);
  const valid = number.replace(/\D/g, '').length >= 9 && /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc.trim());
  const muted = { color: theme.colors.onSurfaceVariant };
  const newBank = ifsc.trim().toUpperCase().startsWith('SBIN') ? 'State Bank of India' : ifsc.trim().toUpperCase().startsWith('ICIC') ? 'ICICI Bank' : 'HDFC Bank';

  return (
    <PanelSheet
      visible={account !== null}
      onDismiss={onDismiss}
      title="Edit bank account details"
      height={step === 'form' ? 600 : step === 'verifying' ? 280 : 460}
      footer={
        step === 'form' ? (
          <SheetButton label="Verify & update" disabled={!valid} onPress={() => setStep('verifying')} />
        ) : step === 'done' ? (
          <SheetButton label="Done" onPress={onDismiss} />
        ) : undefined
      }>
      {account && step === 'form' ? (
        <>
          <SheetBlock>
            <SheetHeading>Current account</SheetHeading>
            <View style={[styles.box, { borderColor: theme.colors.outlineVariant }]}>
              <View style={styles.accountTitle}>
                <BankLogo bank={account.bank} size={20} />
                <Text style={[styles.medium, { color: theme.colors.onSurface }]}>{account.bank}</Text>
              </View>
              <Text style={[styles.body, { color: theme.colors.onSurface }]}>{account.accountNumber}</Text>
              <View style={styles.boxRow}>
                <Text style={[styles.small, { color: theme.colors.onSurface }]}>{account.holder}</Text>
                <Text style={[styles.small, muted]}>A/c holder</Text>
              </View>
            </View>
          </SheetBlock>
          <SheetBlock gap={16} last>
            <SheetHeading>New account</SheetHeading>
            <SheetField label="Account number" value={number} onChangeText={setNumber} placeholder="Enter account number" keyboardType="number-pad" />
            <SheetField label="IFSC code" value={ifsc} onChangeText={(value) => setIfsc(value.toUpperCase())} placeholder="e.g. HDFC0001234" />
            <SheetField label="Account holder name" value={holder} onChangeText={setHolder} placeholder="As per bank records" />
            <View style={[styles.note, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="info" size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.small, styles.flex, muted]}>
                Make sure that you have selected the correct branch IFSC. In case the IFSC is incorrect your settlements would fail.
              </Text>
            </View>
          </SheetBlock>
        </>
      ) : null}
      {step === 'verifying' ? (
        <SheetBlock last gap={12}>
          <View style={styles.centre}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Verifying your account</Text>
            <Text style={[styles.body, styles.centreText, muted]}>We’re checking the account with your bank. This takes a few seconds.</Text>
          </View>
        </SheetBlock>
      ) : null}
      {account && step === 'done' ? (
        <SheetBlock last gap={12}>
          <View style={styles.centre}>
            <View style={[styles.tile, { backgroundColor: theme.colors.primary }]}>
              <Icon source="check" size={24} color={theme.colors.onPrimary} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Account updated successfully</Text>
          </View>
          <View style={[styles.box, { borderColor: theme.colors.outlineVariant }]}>
            <Text style={[styles.small, muted]}>Old account</Text>
            <Text style={[styles.medium, styles.strike, muted]}>
              {account.bankName} · {account.accountNumber}
            </Text>
            <Text style={[styles.small, muted]}>{account.holder}</Text>
          </View>
          <View style={[styles.box, { borderColor: theme.colors.primary }]}>
            <Text style={[styles.small, muted]}>New account</Text>
            <Text style={[styles.medium, { color: theme.colors.onSurface }]}>
              {newBank} · {number}
            </Text>
            <Text style={[styles.small, { color: theme.colors.onSurface }]}>{holder}</Text>
          </View>
        </SheetBlock>
      ) : null}
    </PanelSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { marginHorizontal: -PAGE_PADDING, marginTop: -PAGE_PADDING },
  stack: { gap: 8 },
  card: { borderRadius: Shape.max, padding: 12, gap: 12, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  cardText: { gap: 4 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  medium: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  strong: { fontFamily: Fonts.medium },
  strike: { textDecorationLine: 'line-through' },
  exampleCard: { borderRadius: Shape.max, overflow: 'hidden' },
  exampleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 16 },
  exampleBody: { borderTopWidth: 1, padding: 16, gap: 4 },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 16, paddingTop: 2 },
  stepLine: { width: 1, flex: 1, marginTop: 4, minHeight: 16 },
  stepText: { flex: 1, gap: 2, paddingBottom: 16 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Shape.max, padding: 12 },
  accountTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tile: { width: 40, height: 40, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  box: { borderWidth: 1, borderRadius: Shape.max, padding: 12, gap: 6 },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  note: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Shape.small },
  footerRow: { flexDirection: 'row', gap: 8 },
  centre: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  centreText: { textAlign: 'center' },
});
