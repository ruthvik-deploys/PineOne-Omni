import { type ReactNode, useState } from 'react';
import { LayoutAnimation, StyleSheet, View } from 'react-native';
import { Card, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { Divider } from '@/components/shared/divider';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { concentric, Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';

import { CopyableValue } from './copyable-value';

const SECTION_CARD_PADDING = 16;
/** Radius for containers inside a SectionCard (16dp from its edge). */
export const SECTION_CARD_INNER_RADIUS = concentric(Shape.max, SECTION_CARD_PADDING);

/** Icons for detail sections by title (card headers); anything else gets `info`. */
const SECTION_ICONS: Record<string, string> = {
  Activity: 'clock-counter-clockwise',
  'Transaction details': 'receipt',
  'Merchant details': 'storefront',
  'Customer details': 'user-circle',
  'EMI details': 'calendar-blank',
  'Product details': 'shopping-cart',
  'Dispute details': 'gavel',
};

/**
 * A card holding one segment of a detail page (details, activity, products…),
 * headed like the Overview summary cards: icon and uppercase muted title,
 * then a full-width divider above the content. Collapsible and closed by
 * default (user decision): the header toggles it, with a caret at its end.
 */
export function SectionCard({
  title,
  icon,
  collapsible = true,
  // Closed until tapped, as the design opens on (Figma 7132:120440, 7161:115877).
  defaultOpen = false,
  trailing,
  children,
}: {
  title: string;
  icon?: string;
  /** A figure at the header's end, before the caret (app pages: Deductions "₹2,400", Transactions included "100"). */
  trailing?: string;
  /** Set false for a card that should always show its content (e.g. Help). */
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  // The app pages (APP_PAGE_LAYOUT, Figma 7132:120268): a 48dp header, the title in sentence case, no icon, open by default.
  const header = APP_PAGE_LAYOUT ? (
    <View style={styles.appHeader}>
      <Text style={[styles.appTitle, { color: theme.colors.onSurface }]} accessibilityRole="header">
        {title}
      </Text>
      {trailing ? <Text style={[styles.appTrailing, { color: theme.colors.onSurfaceVariant }]}>{trailing}</Text> : null}
      {collapsible ? <Icon source={open ? 'caret-up' : 'caret-down'} size={20} color={theme.colors.onSurface} /> : null}
    </View>
  ) : (
    <View style={styles.cardHeader}>
      <Icon source={icon ?? SECTION_ICONS[title] ?? 'info'} size={16} color={theme.colors.onSurfaceVariant} />
      <Text variant="labelLarge" style={[styles.cardTitle, { color: theme.colors.onSurfaceVariant }]} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {collapsible ? <Icon source={open ? 'caret-up' : 'caret-down'} size={16} color={theme.colors.onSurfaceVariant} /> : null}
    </View>
  );
  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {collapsible ? (
        <TouchableRipple
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
            setOpen((current) => !current);
          }}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ expanded: open }}
          style={styles.cardTrigger}>
          {header}
        </TouchableRipple>
      ) : (
        header
      )}
      {/* A View, not a Fragment: Paper's Card passes an `index` prop to each child, which Fragments reject. */}
      {open ? (
        <View>
          {APP_PAGE_LAYOUT ? <View style={[styles.hairline, { backgroundColor: theme.colors.background }]} /> : <Divider />}
          <View style={styles.cardBody}>{children}</View>
        </View>
      ) : null}
    </Card>
  );
}

export type DetailRowData = { label: string; value: string; copyable?: boolean };

/**
 * A label/value pair (web: DetailField). The web stacks label over value in a
 * 1–3 column grid; on a phone each pair is one row, label left and value right,
 * which keeps long detail lists compact.
 */
export function DetailRow({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <View style={styles.value}>
        {children ?? (
          <Text variant="bodyMedium" style={[styles.valueText, APP_PAGE_LAYOUT && styles.valueStrong]}>
            {value}
          </Text>
        )}
      </View>
    </View>
  );
}

/** A titled group of label/value rows (web: DetailSection). */
export function DetailSection({ title, rows }: { title: string; rows: DetailRowData[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <DetailRowList rows={rows} />
    </View>
  );
}

function DetailRowList({ rows }: { rows: DetailRowData[] }) {
  return (
    <View style={styles.rows}>
      {rows.map((row, index) => (
        <DetailRow key={`${row.label}-${index}`} label={row.label}>
          {row.copyable ? (
            <CopyableValue value={row.value} />
          ) : (
            <Text variant="bodyMedium" style={[styles.valueText, APP_PAGE_LAYOUT && styles.valueStrong]}>
              {row.value}
            </Text>
          )}
        </DetailRow>
      ))}
    </View>
  );
}

/** Sections separated by dividers, as the web separates them with h-px rules — or, with `carded`, each in its own card. */
export function DetailSections({ sections, carded = false }: { sections: { title: string; rows: DetailRowData[] }[]; carded?: boolean }) {
  // Cards are returned bare so they share the parent's gap with sibling cards.
  if (carded) {
    return (
      <>
        {sections.map((section) => (
          <SectionCard key={section.title} title={section.title}>
            <DetailRowList rows={section.rows} />
          </SectionCard>
        ))}
      </>
    );
  }
  return (
    <View style={styles.sections}>
      {sections.map((section, index) => (
        <View key={section.title} style={styles.sections}>
          {index > 0 ? <Divider /> : null}
          <DetailSection title={section.title} rows={section.rows} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: 20 },
  card: { borderRadius: Shape.max },
  // Same header as the Overview summary cards (OverviewCardHeader).
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SECTION_CARD_PADDING },
  cardTrigger: { borderRadius: Shape.max },
  cardTitle: { flex: 1, letterSpacing: 0.6 },
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: SECTION_CARD_PADDING },
  appTitle: { flex: 1, fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24 },
  appTrailing: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24, fontVariant: ['tabular-nums', 'stylistic-one'] },
  hairline: { height: 1 },
  valueStrong: { fontFamily: Fonts.medium },
  cardBody: { padding: SECTION_CARD_PADDING, gap: 12 },
  section: { gap: 12 },
  // Web: text-xl font-medium.
  title: { fontFamily: Fonts.medium, fontSize: 20, lineHeight: 24 },
  rows: { gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  label: { fontFamily: Fonts.regular, flexShrink: 1 },
  value: { flexShrink: 1, alignItems: 'flex-end' },
  valueText: { fontFamily: Fonts.regular, textAlign: 'right' },
});
