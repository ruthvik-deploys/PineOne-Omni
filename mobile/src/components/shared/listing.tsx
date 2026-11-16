import { Fragment, type ReactNode } from 'react';
import { PAGE_PADDING } from '@/components/tab-screen';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { Divider } from '@/components/shared/divider';
import { SearchField } from '@/components/search-field';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { concentric, Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';

import { OutlinedActionButton } from './controls';
import { FiltersButton, type ListingFilter } from './filters-sheet';

export { type ListingFilter, selectFilter } from './filters-sheet';

/** A page-level action on a listing (e.g. View analytics, Email filtered, Download filtered). */
export type ListingAction = { label: string; icon: string; onPress?: () => void };

type ListingToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Every filter the listing has, combined under one Filters button beside the search. */
  filters?: ListingFilter[];
  /** Page-level actions, in a row under the search that scrolls sideways. */
  actions?: ListingAction[];
  /** Focuses the search whenever it changes (see SearchField). */
  focusSearch?: string;
};

/** Search, Filters and the action buttons share one height, so the toolbar reads as one set of controls. */
export const TOOLBAR_CONTROL_HEIGHT = 36;

/**
 * The listing's part of the page header (see page-header.tsx), right under
 * the large title: search with every filter combined under one Filters button
 * in the same row, then the page-level actions (analytics, email and
 * download…) in a row that scrolls sideways (user decision).
 */
export function ListingToolbar({ search, onSearchChange, searchPlaceholder, filters = [], actions = [], focusSearch }: ListingToolbarProps) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <SearchField
            value={search}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            radius={Shape.small}
            height={TOOLBAR_CONTROL_HEIGHT}
            focusRequest={focusSearch}
          />
        </View>
        {filters.length ? <FiltersButton filters={filters} height={TOOLBAR_CONTROL_HEIGHT} /> : null}
      </View>
      {actions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionScroller} contentContainerStyle={styles.actions}>
          {actions.map((action) => (
            <OutlinedActionButton key={action.label} label={action.label} icon={action.icon} onPress={action.onPress} height={TOOLBAR_CONTROL_HEIGHT} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

/** Card holding a listing's rows (web: the bordered table wrapper). Rows are separated by dividers. */
export function ListCard({
  children,
  empty,
  header,
}: {
  children: ReactNode[];
  empty?: string;
  /** Sits above the rows, divided from them (e.g. a store's Devices / Users tabs). */
  header?: ReactNode;
}) {
  const theme = useTheme();
  const rows = children.filter(Boolean);
  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {header ? (
        <View>
          {header}
          <Divider />
        </View>
      ) : null}
      {rows.length === 0 ? (
        <Text variant="bodyMedium" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          {empty ?? 'No results found.'}
        </Text>
      ) : (
        // Wrapped: Paper's Card passes an `index` prop to each direct child, which Fragments reject.
        <View>
          {rows.map((row, index) => (
            <Fragment key={index}>
              {index > 0 ? <ListDivider /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      )}
    </Card>
  );
}

// Rows span the card's full width (gap 0), so they share its radius.
export const LIST_ROW_RADIUS = concentric(Shape.max, 0);
/** The app pages (APP_PAGE_LAYOUT, Figma 7153:139377) inset rows 12dp: a 76dp row, icon at 12, caret 12 from the end. */
export const LIST_ROW_PADDING = APP_PAGE_LAYOUT ? 12 : 16;
/** Radius for pills/badges sitting inside a list row (12dp from its edge). */
export const LIST_ROW_INNER_RADIUS = concentric(LIST_ROW_RADIUS, 12, 24);

/** The leading tile's size: the row's one icon, ahead of its heading. */
export const LIST_ROW_ICON_SIZE = 40;

/**
 * One listing record (web: a table row). The web spreads a record over 6–8
 * columns; on a phone the same values stack into an icon, a heading, its sub
 * text and the badge at the end (user decision), with a chevron when the row
 * opens a detail.
 */
export function ListRow({
  icon,
  onPress,
  accessibilityLabel,
  children,
}: {
  /** The record's icon, in a round tile ahead of the heading: an icon name, or a node (e.g. a bank logo). */
  icon?: string | ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      borderless
      style={styles.row}>
      <View style={styles.rowContent}>
        {icon ? (
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
            {typeof icon === 'string' ? <Icon source={icon} size={APP_PAGE_LAYOUT ? 18 : 20} color={APP_PAGE_LAYOUT ? theme.colors.onSurface : theme.colors.onSurfaceVariant} /> : icon}
          </View>
        ) : null}
        <View style={styles.rowBody}>{children}</View>
        {onPress ? <Icon source="caret-right" size={APP_PAGE_LAYOUT ? 20 : 16} color={APP_PAGE_LAYOUT ? theme.colors.onSurface : theme.colors.onSurfaceVariant} /> : null}
      </View>
    </TouchableRipple>
  );
}

/** The line between listing rows: the page's own background colour, so rows read as cut apart rather than outlined. */
export function ListDivider() {
  const theme = useTheme();
  return <View style={[styles.listDivider, { backgroundColor: theme.colors.background }]} />;
}

/** Up to two initials from a name: "Rahul Sharma" -> RS, "Priya" -> P. */
export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Short text in place of a row's icon, so look-alike records tell apart at a
 * glance: a person's initials, a store's sector number. Pass it as ListRow's icon.
 */
export function RowMark({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.rowMark, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
      {label}
    </Text>
  );
}

/**
 * A row's right column when the record has more than its status to say
 * (Figma 7385:90223): the status badge, and under it the one fact that needs
 * attention — "Due in 1 day" in red, "Expires 19 Aug" — right-aligned, 8dp apart.
 * Urgent notes take the design's base/destructive (#dc2626), not the seed's error.
 */
export function StatusStack({ status, note, urgent = false }: { status: ReactNode; note?: string; urgent?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.statusStack}>
      {status}
      {note ? (
        <Text numberOfLines={1} style={[styles.statusNote, { color: urgent ? (theme.dark ? '#f87171' : '#dc2626') : theme.colors.onSurfaceVariant }]}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** Two-column line inside a ListRow: left content grows, right content hugs the end. */
export function ListRowLine({ left, right, centered = false }: { left: ReactNode; right?: ReactNode; /** Vertically centre both sides (single-line rows). */ centered?: boolean }) {
  return (
    <View style={[styles.line, centered && styles.lineCentered]}>
      <View style={styles.lineLeft}>{left}</View>
      {right ? <View style={styles.lineRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listDivider: { height: 1 },
  // Open digits, as the app's other numbers (ss01).
  // Figma 7690:83035: 12dp medium, muted, in the row's grey circle.
  rowMark: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums', 'stylistic-one'] },
  toolbar: { gap: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  // Runs edge to edge, starting in line with the page's content.
  actionScroller: { marginHorizontal: -PAGE_PADDING, flexGrow: 0 },
  actions: { gap: 8, paddingHorizontal: PAGE_PADDING },
  card: { borderRadius: Shape.max, overflow: 'hidden' },
  empty: { padding: 16 },
  row: { borderRadius: LIST_ROW_RADIUS },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: LIST_ROW_PADDING, paddingVertical: APP_PAGE_LAYOUT ? 16 : 12 },
  rowIcon: {
    width: LIST_ROW_ICON_SIZE,
    height: LIST_ROW_ICON_SIZE,
    borderRadius: LIST_ROW_ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: APP_PAGE_LAYOUT ? 0 : 4,
    overflow: 'hidden',
  },
  rowBody: { flex: 1, gap: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  lineCentered: { alignItems: 'center' },
  lineLeft: { flex: 1, gap: 2 },
  lineRight: { alignItems: 'flex-end', gap: 2 },
  statusStack: { alignItems: 'flex-end', gap: 8 },
  statusNote: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
});
