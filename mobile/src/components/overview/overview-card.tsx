import { Image, type ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import { LayoutAnimation, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { formatInr } from '@/data/overview';

import { concentric, Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';

/**
 * Building blocks for the Overview's Today cards (Figma 6470:685 / 6470:737,
 * "PineOne - Omni-channel"): a left-aligned uppercase title and summary,
 * divided rows and accordions, and a centred footer link.
 */

const CARD_PADDING = 12;
/** Figma's base/accent: the hairlines between a card's sections. */
const HAIRLINE = 1;

/**
 * The card surface: borderless white on the grey page, like the app's other
 * cards (user decision). A plain View rather than Paper's Card: on iOS a
 * Card's content doesn't stretch with it (so a section can't grow to fill a
 * card that matches its neighbour's height), and Card passes an `index` prop
 * to its children, which Fragments reject.
 */
export function OverviewCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>{children}</View>;
}

/** The card's uppercase muted title, and an optional control at the end (Home: the Today / Yesterday switch). */
export function OverviewCardHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.header, trailing ? styles.headerWithControl : null, { borderBottomColor: theme.colors.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.onSurfaceVariant }]}>
        {title.toUpperCase()}
      </Text>
      {trailing}
    </View>
  );
}

export type OverviewDay = 'today' | 'yesterday';

/**
 * Today / Yesterday (Figma 7800:99433): a 32dp muted track, 4dp in, the
 * picked day a white 6dp-round tab with a small shadow, labels 14dp medium.
 */
export function OverviewDaySwitch({ value, onChange, label }: { value: OverviewDay; onChange: (day: OverviewDay) => void; /** What the days are of, for screen readers. */ label: string }) {
  const theme = useTheme();
  const options: { key: OverviewDay; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
  ];
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={[styles.switch, { backgroundColor: theme.colors.surfaceVariant }]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableRipple
            key={option.key}
            onPress={() => {
              if (active) return;
              LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
              onChange(option.key);
            }}
            borderless
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.switchTab, active && [styles.switchTabActive, { backgroundColor: theme.colors.surface }]]}>
            <Text style={[styles.switchLabel, { color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>{option.label}</Text>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

/**
 * The card's total (Figma 7800:99434): 24/32 semibold with its paise at 14dp,
 * muted, the line under it, and the card's illustration at the end — a 116dp
 * block.
 */
export function OverviewTotal({ amount, line, image }: { amount: number; line: string; image: ImageSource | number }) {
  const theme = useTheme();
  const value = formatInr(amount);
  const dot = value.lastIndexOf('.');
  return (
    <View style={styles.total}>
      <View style={styles.totalText}>
        <Text style={[styles.totalAmount, { color: theme.colors.onSurface }]}>
          {dot === -1 ? value : value.slice(0, dot)}
          {dot === -1 ? null : <Text style={[styles.totalPaise, { color: theme.colors.onSurfaceVariant }]}>{value.slice(dot)}</Text>}
        </Text>
        <Text style={[styles.totalLine, { color: theme.colors.onSurfaceVariant }]}>{line}</Text>
      </View>
      <Image source={image} style={styles.totalImage} contentFit="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** A section of the card's body, with the hairline above it. */
export function OverviewCardDivider() {
  const theme = useTheme();
  return <View style={{ height: HAIRLINE, backgroundColor: theme.colors.background }} />;
}

/**
 * A row that unfolds its details in place: `main` on the left, `end` before
 * the caret, and the details underneath.
 */
export function OverviewAccordion({
  open,
  onToggle,
  accessibilityLabel,
  main,
  end,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
  main: ReactNode;
  end?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View>
      <TouchableRipple
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={accessibilityLabel}>
        <View style={styles.accordionRow}>
          <View style={styles.accordionMain}>{main}</View>
          {end ? <View>{end}</View> : null}
          <Icon source={open ? 'caret-up' : 'caret-down'} size={16} color={theme.colors.onSurface} />
        </View>
      </TouchableRipple>
      {open ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

/** Centred text link, e.g. "View payment history". */
export function OverviewCardFooter({ label, onPress }: { label: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.footer, { borderTopColor: theme.colors.background }]}>
      <TouchableRipple onPress={onPress} borderless accessibilityRole="button" style={styles.footerButton}>
        <View style={styles.footerButtonContent}>
          <Text style={[styles.footerLabel, { color: theme.colors.primary }]}>{label}</Text>
        </View>
      </TouchableRipple>
    </View>
  );
}

// Figma rounds the card at 18dp; the app caps every radius at Shape.max.
const CARD_RADIUS = Shape.max;
const FOOTER_PADDING_Y = 8;
const FOOTER_BUTTON_RADIUS = concentric(CARD_RADIUS, FOOTER_PADDING_Y, 32);

const styles = StyleSheet.create({
  card: { borderRadius: CARD_RADIUS, overflow: 'hidden' },
  header: { alignItems: 'flex-start', paddingHorizontal: CARD_PADDING, paddingVertical: 16, borderBottomWidth: HAIRLINE },
  title: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 12, letterSpacing: 0.6 },
  // Figma 7800:99428: 12dp all round once the day switch sits at the end.
  headerWithControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  switch: { flexDirection: 'row', gap: 4, height: 32, padding: 4, borderRadius: Shape.small },
  switchTab: { justifyContent: 'center', paddingHorizontal: 8, borderRadius: 6 },
  switchTabActive: { shadowColor: '#1d1d16', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  switchLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  total: { height: 116, justifyContent: 'center', paddingHorizontal: CARD_PADDING, paddingVertical: 16, overflow: 'hidden' },
  totalText: { gap: 4, paddingRight: 96 },
  totalAmount: { fontFamily: Fonts.semiBold, fontSize: 24, lineHeight: 32, fontVariant: ['tabular-nums', 'stylistic-one'] },
  totalPaise: { fontFamily: Fonts.semiBold, fontSize: 14 },
  totalLine: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums', 'stylistic-one'] },
  // Figma: 81 × 78, 18dp from the end, 19dp from the top.
  totalImage: { position: 'absolute', right: 18, top: 19, width: 81, height: 78 },
  accordionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: CARD_PADDING },
  accordionMain: { flex: 1 },
  accordionBody: { gap: 12, paddingHorizontal: CARD_PADDING, paddingBottom: CARD_PADDING },
  footer: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: FOOTER_PADDING_Y, borderTopWidth: HAIRLINE },
  footerButton: { borderRadius: FOOTER_BUTTON_RADIUS },
  footerButtonContent: { flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 10 },
  footerLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
});

export const OVERVIEW_CARD_PADDING = CARD_PADDING;
/** The room under a card's main number. */
export const OVERVIEW_SUMMARY_PADDING_BOTTOM = 24;
