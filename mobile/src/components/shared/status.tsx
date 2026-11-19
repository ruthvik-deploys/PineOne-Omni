import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import type { StatusTone } from '@/data/common';

// Every badge in the app (status pills, tags, timeline and checkout pills) is 24dp tall.
export const PILL_HEIGHT = 24;

// Same tone colors as the web's StatusPill (Tailwind amber/emerald/sky/red 600, 400 in dark mode).
const STATUS_TONE: Record<StatusTone, { icon: string; light: string; dark: string }> = {
  processing: { icon: 'clock', light: '#d97706', dark: '#fbbf24' },
  success: { icon: 'check-circle', light: '#059669', dark: '#34d399' },
  initiated: { icon: 'record', light: '#0284c7', dark: '#38bdf8' },
  failed: { icon: 'x-circle', light: '#dc2626', dark: '#f87171' },
};

/** Tone colors for dot badges (web: bg-success / bg-warning / bg-destructive / bg-status-info / muted). */
export const DOT_COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  neutral: '#737373',
} as const;
export type DotTone = keyof typeof DOT_COLORS;

/** The app pages' badge dots (Figma 7385:84454: Tailwind 600s, a ~10dp filled circle); 400s on dark. */
const APP_DOT_COLORS: Record<DotTone, { light: string; dark: string }> = {
  success: { light: '#16a34a', dark: '#4ade80' },
  warning: { light: '#ca8a04', dark: '#facc15' },
  danger: { light: '#dc2626', dark: '#f87171' },
  info: { light: '#2563eb', dark: '#60a5fa' },
  neutral: { light: '#737373', dark: '#a3a3a3' },
};

/** A payment status as a dot badge (user decision: payments use the dot, as most of the web does). */
export const STATUS_DOT_TONE: Record<StatusTone, DotTone> = { success: 'success', processing: 'warning', initiated: 'info', failed: 'danger' };

/**
 * Outlined status label with a tone icon, exactly as the web's StatusPill
 * (user decision): fully rounded, 1px border, 12px regular text.
 */
export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  const theme = useTheme();
  const { icon, light, dark } = STATUS_TONE[tone];
  return (
    <View style={[styles.pill, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
      <Icon source={icon} size={12} color={theme.dark ? dark : light} />
      <Text style={[styles.pillLabel, { fontFamily: Fonts.regular, color: theme.colors.onSurface }]}>{label}</Text>
    </View>
  );
}

/** Outlined status label with a coloured dot, exactly as the web's RefundStatusBadge / settlement StatusBadge. */
export function DotStatusBadge({ label, tone }: { label: string; tone: DotTone }) {
  const theme = useTheme();
  if (APP_PAGE_LAYOUT) {
    // Figma 7385:84454: a filled dot in a 12dp slot, 4dp gap, regular 12dp label, 6 / 10dp sides.
    const dot = APP_DOT_COLORS[tone];
    return (
      <View style={[styles.pill, styles.appDotPill, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
        <View style={styles.appDotSlot}>
          <View style={[styles.appDot, { backgroundColor: theme.dark ? dot.dark : dot.light }]} />
        </View>
        <Text style={[styles.pillLabel, { fontFamily: Fonts.regular, color: theme.colors.onSurface }]}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, styles.dotPill, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
      <View style={[styles.dot, { backgroundColor: DOT_COLORS[tone] }]} />
      <Text style={[styles.pillLabel, { fontFamily: Fonts.medium, color: theme.colors.onSurface }]}>{label}</Text>
    </View>
  );
}

/** Outlined label without a status icon, e.g. the greeting's role badge (web: Badge variant="outline"). */
export function OutlineTag({ label, radius = Shape.small, muted = false }: { label: string; radius?: number; muted?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.pill,
        styles.tag,
        {
          borderRadius: Math.min(radius, PILL_HEIGHT / 2),
          borderColor: muted ? 'transparent' : theme.colors.outlineVariant,
          backgroundColor: muted ? theme.colors.surfaceVariant : 'transparent',
        },
      ]}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 12,
    // web: h-6 rounded-full border px-2 pr-3
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 1,
  },
  // web: text-xs leading-none
  pillLabel: { fontSize: 12, lineHeight: 14 },
  dotPill: { gap: 6, paddingHorizontal: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  appDotPill: { gap: 4, paddingLeft: 6, paddingRight: 10 },
  appDotSlot: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  appDot: { width: 10, height: 10, borderRadius: 5 },
  tag: { paddingRight: 8 },
});
