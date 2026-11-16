import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { PanelSheet } from '@/components/shared/panel-sheet';
import {
  OptionCard,
  OtpField,
  PaymentSummary,
  SheetBlock,
  SheetButton,
  SheetField,
  SheetHeading,
  SheetRow,
  SheetSuccess,
  SwitchCard,
} from '@/components/shared/sheet-parts';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { formatInr } from '@/data/common';
import { CHARGE_SLIPS, type DetailChannel, ONLINE_PRODUCTS, PRODUCT_DETAIL_FIELDS } from '@/data/transaction-detail';
import type { TransactionRecord } from '@/data/transactions';

/**
 * The payment detail's sheets as the app pages draw them (APP_PAGE_LAYOUT;
 * Figma "Home & Payments": Refund flow 7160:74328, Refund transaction
 * 7160:75083, Refund for IMEI blocked transaction 7160:75723, Map IMEI
 * 7161:76043, Product details 7160:75403, Charge slip 7132:120519).
 */

const CHARGE_SLIP_PREVIEW = require('../../../assets/images/payments/charge-slip.png');

/** The payment's mode tile and its card details, as every refund sheet opens. */
function summaryOf(transaction: TransactionRecord) {
  const card = transaction.paymentMode === 'card';
  return {
    icon: card ? 'credit-card' : 'qr-code',
    meta: card ? ['HDFC credit card', transaction.provider, 'VISA network'] : [transaction.paymentLabel, transaction.provider],
  };
}

type RefundKind = 'payment' | 'order' | 'imei';

/**
 * Refund payment (Figma 7132:120734 → 120953 → 121409). The amount, then a
 * one-time password, then done. Online orders add which transaction and
 * custom fields (7138:127684); EMI orders refund with the IMEI kept blocked
 * or the products picked to unblock (7138:129582 / 129953).
 */
export function RefundSheet({ transaction, channel, visible, onDismiss }: { transaction: TransactionRecord; channel: DetailChannel; visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const kind: RefundKind = channel === 'online' ? (transaction.paymentMode === 'card' ? 'imei' : 'order') : 'payment';
  const refundable = transaction.amount;
  const [step, setStep] = useState<'amount' | 'otp' | 'done'>('amount');
  const [input, setInput] = useState(String(refundable));
  const [otp, setOtp] = useState('');
  const [retries, setRetries] = useState(3);
  const [fields, setFields] = useState<string[]>(['']);
  const [keepBlocked, setKeepBlocked] = useState(false);
  const [unblock, setUnblock] = useState<string[]>(['vivo']);
  // Start over each time the sheet opens (adjusting state during render).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStep('amount');
      setInput(String(refundable));
      setOtp('');
      setRetries(3);
      setFields(['']);
      setKeepBlocked(false);
      setUnblock(['vivo']);
    }
  }
  const amount = Number(input.replace(/[^\d]/g, '') || '0');
  const valid = amount > 0 && amount <= refundable;
  const partial = valid && amount < refundable;
  const { icon, meta } = summaryOf(transaction);
  const title = kind === 'imei' ? 'Refund & unblock IMEI' : 'Refund payment';

  if (step === 'done') {
    return (
      <PanelSheet visible={visible} onDismiss={onDismiss} title={title} height={340} footer={<SheetButton label="Okay" onPress={onDismiss} />}>
        <SheetSuccess
          title="Refund initiated successfully"
          body={
            kind === 'imei' && !keepBlocked
              ? 'We generally take 1-2 hours to process refunds, Once refunds will be processed then IMEI number will be unblocked'
              : 'We generally take 1-2 hours to process refunds, we will notify you over the mail once it is processed'
          }
        />
      </PanelSheet>
    );
  }

  const otpStep = step === 'otp';
  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      height={kind === 'payment' ? (otpStep ? 520 : 420) : 640}
      footer={
        otpStep ? (
          <SheetButton label="Confirm refund" disabled={otp.length < 6} onPress={() => setStep('done')} />
        ) : (
          <SheetButton label={partial ? 'Initiate partial refund' : 'Initiate full refund'} disabled={!valid} onPress={() => setStep('otp')} />
        )
      }>
      <PaymentSummary icon={icon} amount={transaction.amount} meta={meta} />
      <SheetBlock gap={kind === 'order' ? 16 : 8} last={!otpStep && kind === 'payment'}>
        {kind === 'order' ? (
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>Select transactions</Text>
            <View style={[styles.select, { borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.body, styles.flex, { color: theme.colors.onSurface }]}>{formatInr(refundable).replace(/\.00$/, '')} • Full order value</Text>
              <Icon source="caret-down" size={16} color={theme.colors.onSurface} />
            </View>
          </View>
        ) : null}
        <SheetField
          label="Refund amount"
          prefix="₹"
          value={input}
          onChangeText={(value) => setInput(value.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          hint="Change amount to initiate partial refunds"
          error={valid ? undefined : `Enter an amount between ₹1 and ${formatInr(refundable).replace(/\.00$/, '')}`}
        />
        {kind === 'imei' ? <SwitchCard label="Initiate refund and keep IMEI blocked" value={keepBlocked} onValueChange={setKeepBlocked} /> : null}
      </SheetBlock>

      {kind === 'order' && !otpStep ? (
        <SheetBlock gap={12} last>
          <SheetHeading
            size="large"
            trailing={
              <TouchableRipple onPress={() => setFields((current) => [...current, ''])} borderless accessibilityRole="button" style={styles.linkButton}>
                <View style={styles.linkContent}>
                  <Icon source="plus" size={20} color={theme.colors.primary} />
                  <Text style={[styles.body, { color: theme.colors.primary }]}>Add field</Text>
                </View>
              </TouchableRipple>
            }>
            Add custom fields
          </SheetHeading>
          {fields.map((value, index) => (
            <View key={index} style={styles.field}>
              <View style={styles.udfRow}>
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>UDF {index + 1}</Text>
                <Text onPress={() => setFields((current) => current.filter((_, i) => i !== index))} accessibilityRole="button" style={[styles.body, { color: theme.colors.error }]}>
                  Delete
                </Text>
              </View>
              <SheetField value={value} placeholder="Enter details" onChangeText={(next) => setFields((current) => current.map((item, i) => (i === index ? next : item)))} />
            </View>
          ))}
        </SheetBlock>
      ) : null}

      {kind === 'imei' && !keepBlocked && !otpStep ? (
        <SheetBlock gap={12} last>
          <SheetHeading size="large">Select product to unblock IMEI</SheetHeading>
          {[
            { id: 'vivo', title: 'Vivo Y11', lines: ['IMEI: 87382387HJSHF878374', 'Model: Y11 S 3 + (64 GB)'] },
            { id: 'iphone', title: 'iPhone 15 pro', lines: ['IMEI: 87382387HJSHF878374', 'Model: iphone 15 pro, blue, 256 GB'] },
          ].map((product) => (
            <OptionCard
              key={product.id}
              type="checkbox"
              title={product.title}
              lines={product.lines}
              selected={unblock.includes(product.id)}
              onPress={() => setUnblock((current) => (current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]))}
            />
          ))}
        </SheetBlock>
      ) : null}

      {otpStep ? (
        <SheetBlock last>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>Confirm with OTP sent on your email</Text>
          <OtpField value={otp} onChange={setOtp} />
          <View style={styles.udfRow}>
            <Text
              onPress={retries > 0 ? () => setRetries((count) => count - 1) : undefined}
              accessibilityRole="button"
              style={[styles.resend, { color: retries > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
              Resend OTP
            </Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              {retries} {retries === 1 ? 'retry' : 'retries'} left
            </Text>
          </View>
        </SheetBlock>
      ) : null}
    </PanelSheet>
  );
}

const SLIP_OPTIONS = [
  { value: 'customer', label: 'Customer copy' },
  { value: 'merchant', label: 'Merchant copy' },
] as const;

/** Charge slip / Receipt (Figma 7132:120720): which copy, its preview on a grey card, and Download chargeslip. */
export function ChargeSlipSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const [type, setType] = useState<'customer' | 'merchant'>('customer');
  const download = async () => {
    const asset = Asset.fromModule(CHARGE_SLIPS[type]);
    await asset.downloadAsync();
    await WebBrowser.openBrowserAsync(asset.localUri ?? asset.uri);
  };
  return (
    <PanelSheet visible={visible} onDismiss={onDismiss} title="Charge slip / Receipt" height={500} footer={<SheetButton label="Download chargeslip" icon="download-simple" onPress={download} />}>
      <SheetBlock last>
        <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: theme.colors.surfaceVariant }]}>
          {SLIP_OPTIONS.map((option) => {
            const active = option.value === type;
            return (
              <Pressable
                key={option.value}
                onPress={() => setType(option.value)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.tab, active && [styles.tabActive, { backgroundColor: theme.colors.surface }]]}>
                <Text style={[styles.label, { color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={download} accessibilityRole="button" accessibilityLabel={`Open the ${type} copy`} style={[styles.preview, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Image source={CHARGE_SLIP_PREVIEW} style={styles.slip} contentFit="cover" accessibilityIgnoresInvertColors />
        </Pressable>
      </SheetBlock>
    </PanelSheet>
  );
}

/** Product details (Figma 7138:128185): the product's facts, label and value. */
export function ProductSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  return (
    <PanelSheet visible={visible} onDismiss={onDismiss} title="Product details" height={380}>
      <SheetBlock gap={16} last>
        {PRODUCT_DETAIL_FIELDS.map((field) => (
          <SheetRow
            key={field.label}
            label={field.label}
            value={
              <View style={styles.inline}>
                {field.icon ? <Icon source={field.icon} size={16} color={theme.colors.onSurface} /> : null}
                <Text style={[styles.body, { color: theme.colors.onSurface }]}>{field.value}</Text>
                {field.info ? <Icon source="info" size={16} color={theme.colors.onSurfaceVariant} /> : null}
              </View>
            }
          />
        ))}
      </SheetBlock>
    </PanelSheet>
  );
}

const IMEI_FIELDS = [
  { key: 'imei', label: 'IMEI serial details', placeholder: 'Enter IMEI details' },
  { key: 'model', label: 'Model number', placeholder: 'Enter model number' },
  { key: 'dealer', label: 'Dealer code', placeholder: 'Enter dealer code' },
  { key: 'state', label: 'State code', placeholder: 'Enter state code' },
];

/** Map IMEI details (Figma 7138:130691): a collapsible block per product, four fields each, and Map IMEI details. */
export function MapImeiSheet({ visible, onDismiss, onMapped }: { visible: boolean; onDismiss: () => void; onMapped: () => void }) {
  const theme = useTheme();
  const products = ONLINE_PRODUCTS.map((code, index) => ({ id: `${code}-${index}`, code: `100JKD9832${index + 3}` }));
  const [open, setOpen] = useState<string[]>(products.map((product) => product.id));
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Map IMEI details"
      height={620}
      footer={
        <SheetButton
          label="Map IMEI details"
          onPress={() => {
            onDismiss();
            onMapped();
          }}
        />
      }>
      {products.map((product, index) => {
        const expanded = open.includes(product.id);
        return (
          <SheetBlock key={product.id} last={index === products.length - 1} gap={12}>
            <Pressable
              onPress={() => setOpen((current) => (expanded ? current.filter((id) => id !== product.id) : [...current, product.id]))}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              style={styles.udfRow}>
              <Text style={[styles.productTitle, { color: theme.colors.onSurface }]}>Product code: {product.code}</Text>
              <Icon source={expanded ? 'caret-up' : 'caret-down'} size={20} color={theme.colors.onSurface} />
            </Pressable>
            {expanded
              ? IMEI_FIELDS.map((field) => (
                  <SheetField
                    key={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={values[`${product.id}-${field.key}`] ?? ''}
                    onChangeText={(next) => setValues((current) => ({ ...current, [`${product.id}-${field.key}`]: next }))}
                  />
                ))
              : null}
          </SheetBlock>
        );
      })}
    </PanelSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: 8 },
  label: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, paddingHorizontal: 8, borderWidth: 1, borderRadius: 10 },
  linkButton: { borderRadius: Shape.small },
  linkContent: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  udfRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  resend: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20 },
  tabs: { flexDirection: 'row', height: 32, padding: 3, borderRadius: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Shape.small },
  tabActive: { shadowColor: '#1d1d16', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  preview: { height: 262, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slip: { width: 185, height: 239 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
});
