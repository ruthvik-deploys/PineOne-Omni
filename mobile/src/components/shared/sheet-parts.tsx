import { Fragment, type ReactNode, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Icon, Switch, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { SelectionMark } from '@/components/shared/selection-mark';
import { Shape } from '@/constants/shape';
import { Fonts, OPEN_DIGITS } from '@/constants/theme';
import { formatInr } from '@/data/common';

/**
 * Building blocks for the app pages' sheets (APP_PAGE_LAYOUT; Figma
 * "PineOne - Omni-channel", e.g. Refund payment 7132:121154, Choose date &
 * time 7153:138901, Deductions 7161:95796): white blocks 16dp in with a rule
 * under each, 32dp fields and buttons, bordered option cards.
 */

/** One block of a sheet: 16dp in, 8dp between its lines, a rule under it unless it's the last. */
export function SheetBlock({ children, last = false, gap = 8 }: { children: ReactNode; last?: boolean; gap?: number }) {
  const theme = useTheme();
  return <View style={[styles.block, { gap }, !last && [styles.rule, { borderBottomColor: theme.colors.background }]]}>{children}</View>;
}

/** A block's title (14 medium, e.g. "Refund amount") or a section heading (16 semibold, e.g. "Select product to unblock IMEI"). */
export function SheetHeading({ children, size = 'small', trailing }: { children: ReactNode; size?: 'small' | 'large'; trailing?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.headingRow}>
      <Text accessibilityRole="header" style={[size === 'large' ? styles.headingLarge : styles.heading, { color: theme.colors.onSurface }]}>
        {children}
      </Text>
      {trailing}
    </View>
  );
}

/** The payment a sheet acts on (Figma 7132:121158): the mode tile, the amount, and its card details split by thin rules. */
export function PaymentSummary({ icon = 'qr-code', amount, meta }: { icon?: string; amount: number; meta: string[] }) {
  const theme = useTheme();
  const [rupees, paise] = formatInr(amount).split('.');
  return (
    <SheetBlock>
      <View style={[styles.tile, { backgroundColor: theme.colors.primary }]}>
        <Icon source={icon} size={20} color={theme.colors.onPrimary} />
      </View>
      <Text style={[styles.amount, { color: theme.colors.onSurface }]}>
        {rupees}.<Text style={styles.paise}>{paise ?? '00'}</Text>
      </Text>
      <View style={styles.meta}>
        {meta.map((part, index) => (
          <Fragment key={part}>
            {index > 0 ? <View style={[styles.metaRule, { backgroundColor: theme.colors.outlineVariant }]} /> : null}
            <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>{part}</Text>
          </Fragment>
        ))}
      </View>
    </SheetBlock>
  );
}

/** A labelled 32dp field (Figma "Field"): label, the input with an optional ₹ or icon in front, a hint or error under it. */
export function SheetField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  prefix,
  keyboardType,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** "₹" for amounts, or an icon name. */
  prefix?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.heading, { color: theme.colors.onSurface }]}>{label}</Text> : null}
      <View style={[styles.input, { borderColor: error ? theme.colors.error : theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
        {prefix === '₹' ? (
          <Text style={[styles.inputText, { color: theme.colors.onSurfaceVariant }]}>₹</Text>
        ) : prefix ? (
          <Icon source={prefix} size={16} color={theme.colors.onSurfaceVariant} />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : undefined}
          accessibilityLabel={label ?? placeholder}
          style={[styles.inputText, styles.flex, { color: theme.colors.onSurface }]}
        />
      </View>
      {error || hint ? <Text style={[styles.hint, { color: error ? theme.colors.error : theme.colors.onSurfaceVariant }]}>{error ?? hint}</Text> : null}
    </View>
  );
}

/** Six joined 32dp digit cells (Figma InputOTP, digits only), typed into one hidden input. */
export function OtpField({ value, onChange, length = 6 }: { value: string; onChange: (value: string) => void; length?: number }) {
  const theme = useTheme();
  const input = useRef<TextInput>(null);
  return (
    <TouchableRipple onPress={() => input.current?.focus()} borderless accessibilityRole="none">
      <View style={styles.otp}>
        {Array.from({ length }, (_, index) => (
          <View
            key={index}
            style={[
              styles.otpCell,
              { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
              index > 0 && styles.otpCellJoined,
              index === 0 && styles.otpFirst,
              index === length - 1 && styles.otpLast,
            ]}>
            <Text style={[styles.inputText, { color: theme.colors.onSurface }]}>{value[index] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          ref={input}
          value={value}
          onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          accessibilityLabel="One-time password"
          style={styles.otpInput}
        />
      </View>
    </TouchableRipple>
  );
}

/**
 * A bordered choice (Figma 7153:138901, 7154:141837): an optional icon tile,
 * the label and a line under it, a radio or checkbox at the end; the picked
 * one is edged in the brand green.
 */
export function OptionCard({
  title,
  description,
  lines,
  icon,
  selected,
  type = 'radio',
  onPress,
}: {
  title: string;
  description?: string;
  /** More lines under the title (e.g. an IMEI and model). */
  lines?: string[];
  icon?: string;
  selected: boolean;
  type?: 'radio' | 'checkbox';
  onPress: () => void;
}) {
  const theme = useTheme();
  const compact = !description && !lines && !icon;
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      accessibilityRole={type}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      style={[styles.option, { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
      <View style={[styles.optionContent, compact && styles.optionCompact, lines && styles.optionTop]}>
        {icon ? (
          <View style={[styles.optionTile, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon source={icon} size={20} color={theme.colors.onSurface} />
          </View>
        ) : null}
        <View style={styles.optionText}>
          <Text numberOfLines={1} style={[compact ? styles.optionCompactTitle : styles.heading, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
          {description ? <Text style={[styles.small, { color: theme.colors.onSurfaceVariant }]}>{description}</Text> : null}
          {lines?.map((line) => (
            <Text key={line} numberOfLines={1} style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              {line}
            </Text>
          ))}
        </View>
        <SelectionMark type={type} checked={selected} />
      </View>
    </TouchableRipple>
  );
}

/** A bordered row with a switch (Figma 7138:129953: "Initiate refund and keep IMEI blocked"). */
export function SwitchCard({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.option, styles.switchCard, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={[styles.heading, styles.flex, { color: theme.colors.onSurface }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} color={theme.colors.primary} />
    </View>
  );
}

/** Label and value at either end (Deductions, Transaction details): 14dp, the label muted. */
export function SheetRow({ label, value, tone, strong = false, info = false }: { label: string; value: ReactNode; tone?: 'negative'; strong?: boolean; info?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text style={[styles.body, { color: strong ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>{label}</Text>
        {info ? <Icon source="info" size={18} color={theme.colors.onSurfaceVariant} /> : null}
      </View>
      {typeof value === 'string' ? (
        <Text style={[styles.body, styles.rowValue, { color: tone === 'negative' ? theme.colors.error : theme.colors.onSurface }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

/** The sheet's one action, full width at its foot (Figma: 32dp, brand green). */
export function SheetButton({ label, onPress, disabled = false, mode = 'primary', icon, destructive = false }: { label: string; onPress: () => void; disabled?: boolean; mode?: 'primary' | 'outline'; icon?: string; /** An outline button's icon and label in red. */ destructive?: boolean }) {
  const theme = useTheme();
  const primary = mode === 'primary';
  const foreground = primary ? theme.colors.onPrimary : destructive ? theme.colors.error : theme.colors.onSurface;
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      borderless
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        primary ? { backgroundColor: theme.colors.primary, opacity: disabled ? 0.5 : 1 } : { borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
      ]}>
      <View style={styles.buttonContent}>
        {icon ? <Icon source={icon} size={16} color={foreground} /> : null}
        <Text style={[styles.buttonLabel, { color: foreground }]}>{label}</Text>
      </View>
    </TouchableRipple>
  );
}

/** The done state (Figma 7132:121409): a check on the brand tile, the headline, and what happens next. */
export function SheetSuccess({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <SheetBlock last gap={12}>
      <View style={styles.success}>
        <View style={[styles.successTile, { backgroundColor: theme.colors.primary }]}>
          <Icon source="check" size={24} color={theme.colors.onPrimary} />
        </View>
        <Text style={[styles.successTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text style={[styles.body, styles.center, { color: theme.colors.onSurfaceVariant }]}>{body}</Text>
      </View>
    </SheetBlock>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  block: { padding: 16 },
  rule: { borderBottomWidth: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  headingLarge: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  hint: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  tile: { width: 36, height: 36, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  amount: { fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 28, fontVariant: ['tabular-nums', 'stylistic-one'] },
  paise: { fontSize: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  metaRule: { width: 1, height: 20 },
  metaText: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  field: { gap: 8 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 8, borderWidth: 1, borderRadius: 10 },
  inputText: { fontVariant: OPEN_DIGITS, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, paddingVertical: 0 },
  otp: { fontVariant: OPEN_DIGITS, flexDirection: 'row', justifyContent: 'center' },
  otpCell: { flex: 1, height: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  otpCellJoined: { borderLeftWidth: 0 },
  otpFirst: { borderTopLeftRadius: Shape.small, borderBottomLeftRadius: Shape.small },
  otpLast: { borderTopRightRadius: Shape.small, borderBottomRightRadius: Shape.small },
  // Typed into, never seen: the cells show what's entered.
  otpInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  option: { borderWidth: 1, borderRadius: Shape.small },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10 },
  optionCompact: { paddingVertical: 0, height: 36 },
  optionTop: { alignItems: 'flex-start' },
  optionCompactTitle: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  optionTile: { width: 36, height: 36, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingRight: 4, minHeight: 40 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  rowValue: { textAlign: 'right', flexShrink: 1, fontVariant: ['tabular-nums', 'stylistic-one'] },
  button: { borderRadius: Shape.small },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, paddingHorizontal: 10 },
  buttonLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  success: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  successTile: { width: 36, height: 36, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 28, textAlign: 'center' },
});
