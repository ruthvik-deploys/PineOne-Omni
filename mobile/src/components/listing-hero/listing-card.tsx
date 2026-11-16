import { type ReactNode, useState } from 'react';
import { ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon, IconButton, Menu, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { useTabLayout } from '@/components/app-tabs';
import { HeroNumber, HeroTopRow, SampleHero, SampleSheet } from '@/components/listing-sample/sample-layout';
import { LazyMenu } from '@/components/shared/lazy-menu';
import { SearchField } from '@/components/search-field';
import { FiltersButton, type ListingFilter } from '@/components/shared/filters-sheet';
import { ListDivider, type ListingAction } from '@/components/shared/listing';
import { useAppColors } from '@/constants/app-colors';
import { APP_PAGE_LAYOUT, LISTING_SAMPLE_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { formatInr } from '@/data/common';

import { appliedChips, clearAll } from './applied-filters';
import { DateButton, type RangeScope, rangePhrase } from './time-scope';

/** The app pages (APP_PAGE_LAYOUT, Figma 7153:139371) set search and Filters at 28dp. */
const CONTROL_HEIGHT = APP_PAGE_LAYOUT ? 28 : 36;
const PADDING = 12;

type ListingCardProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Focuses the search whenever it changes (see SearchField). */
  focusSearch?: string;
  /** Which records: status, mode… (the period is the hero's). */
  filters: ListingFilter[];
  /** Page actions on the list (analytics, email, download…), in the ⋯ menu. */
  actions?: ListingAction[];
  /** Records and amount in the hero's period, and what the search and filters leave of them. */
  totals: { all: number; shown: number; /** Omitted when the records aren't money (devices). */ amount?: number };
  noun: { one: string; other: string };
  /**
   * The list's own date range, when it doesn't follow the hero (e.g.
   * Settlements: the Settled number stops at 7 days, the list goes further).
   * Shown as the date button first in the control row, so the list's dates are never a guess.
   */
  time?: RangeScope;
  /** Ends the narrowed summary's count when the list follows the hero's period, e.g. "today". */
  periodPhrase?: string;
  /** A note about the list, under the search (e.g. "Pick the payment to refund"). */
  notice?: ReactNode;
  /** e.g. pulling the card up over the hero's foot. */
  style?: StyleProp<ViewStyle>;
  /** The page shows an AnswerHero above (listing sample: no count hero is added). */
  belowHero?: boolean;
  /** The list's title on the listing sample's sheet; defaults to "All {noun}". */
  title?: string;
  children: ReactNode;
};

/**
 * The records under a page's hero (experiment, see constants/experiments.ts),
 * all in one card: search with Filters, the filters that are set as chips to
 * remove one by one, a line saying what's listed ("Showing 8 of 110 ·
 * ₹1,12,000" while filtered) with the list's actions behind ⋯, then the
 * day-grouped rows.
 */
export function ListingCard(props: ListingCardProps) {
  return LISTING_SAMPLE_LAYOUT ? <SampleListingCard {...props} /> : <ClassicListingCard {...props} />;
}

/**
 * The records in the listing sample's style (LISTING_SAMPLE_LAYOUT): the
 * white sheet with Search & filter, ⋯ and the list. On a tab page without
 * an AnswerHero it adds one of its own — how many records, over the list's
 * dates — so every listing opens the same way. Inner pages (no navigation
 * bar, their own large title) get the sheet alone.
 */
function SampleListingCard({ search, onSearchChange, searchPlaceholder, focusSearch, filters, actions, totals, noun, time, notice, belowHero = false, title, children }: ListingCardProps) {
  const { headerHeight } = useTabLayout();
  const countHero = !belowHero && headerHeight > 0;
  const phrase = time ? rangePhrase(time.value) : '';
  const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  return (
    <View>
      {countHero ? (
        <SampleHero>
          <HeroTopRow label={capitalised(time?.subject ?? noun.other)} period={time ? <DateButton scope={time} compact /> : undefined} />
          <HeroNumber count={{ value: totals.all }} line={`${totals.all === 1 ? noun.one : noun.other} ${phrase || 'in total'}`} />
        </SampleHero>
      ) : null}
      <SampleSheet
        title={title ?? `All ${noun.other}`}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        openSearch={focusSearch}
        filters={filters}
        actions={actions}
        notice={notice}
        // The list's own dates sit with it when the hero above doesn't show them.
        accessory={time && !countHero ? <View style={styles.sheetDates}><DateButton scope={time} compact /></View> : undefined}
        totals={totals}
        noun={noun}>
        {children}
      </SampleSheet>
    </View>
  );
}

function ClassicListingCard({
  search,
  onSearchChange,
  searchPlaceholder,
  focusSearch,
  filters,
  actions = [],
  totals,
  noun,
  periodPhrase,
  time,
  notice,
  style,
  children,
}: ListingCardProps) {
  const theme = useTheme();
  const appColors = useAppColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const chips = appliedChips(filters);
  const narrowed = chips.length > 0 || search.trim().length > 0;
  // Shown only once the list is narrowed: unfiltered, the hero (or the dates and day headers) already say it.
  const summary = `Showing ${totals.shown} of ${totals.all} ${totals.all === 1 ? noun.one : noun.other}${periodPhrase ? ` ${periodPhrase}` : ''}${totals.amount === undefined ? '' : ` · ${formatInr(totals.amount).replace(/\.00$/, '')}`}`;

  return (
    // The shadow sits on a wrapper: iOS drops shadows on a view that clips its content.
    <View style={[!APP_PAGE_LAYOUT && styles.lift, APP_PAGE_LAYOUT && styles.appStack, style]}>
      {/* The app pages (Figma 7249:191734) put the list's dates above it, as the full-width pill. */}
      {APP_PAGE_LAYOUT && time ? <DateButton scope={time} wide /> : null}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.toolbar}>
          <View style={styles.searchRow}>
            <View style={styles.flex}>
              <SearchField
                value={search}
                onChangeText={onSearchChange}
                placeholder={searchPlaceholder}
                radius={Shape.small}
                height={CONTROL_HEIGHT}
                focusRequest={focusSearch}
              />
            </View>
            {filters.length ? <FiltersButton filters={filters} height={CONTROL_HEIGHT} /> : null}
            {actions.length ? (
              <LazyMenu
                visible={menuOpen}
                onDismiss={() => setMenuOpen(false)}
                anchorPosition="bottom"
                contentStyle={{ borderRadius: Shape.small, backgroundColor: theme.colors.surface }}
                anchor={
                  <IconButton
                    icon="dots-three-vertical"
                    size={16}
                    onPress={() => setMenuOpen(true)}
                    accessibilityLabel={`More: ${actions.map((action) => action.label).join(', ')}`}
                    style={[styles.more, { borderColor: theme.colors.outlineVariant }]}
                  />
                }>
                {actions.map((action) => (
                  <Menu.Item
                    key={action.label}
                    title={action.label}
                    leadingIcon={action.icon}
                    onPress={() => {
                      setMenuOpen(false);
                      action.onPress?.();
                    }}
                  />
                ))}
              </LazyMenu>
            ) : null}
          </View>

          {notice}

          {/* One row of everything that shapes the list: its dates and the filters that are set. */}
          {(time && !APP_PAGE_LAYOUT) || chips.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {time && !APP_PAGE_LAYOUT ? <DateButton scope={time} compact /> : null}
              {chips.map((chip) => (
                <TouchableRipple
                  key={chip.key}
                  onPress={chip.onRemove}
                  borderless
                  accessibilityRole="button"
                  accessibilityLabel={`Remove filter ${chip.label}`}
                  style={[styles.chip, { backgroundColor: appColors.highlight }]}>
                  <View style={styles.chipContent}>
                    <Text style={[styles.chipLabel, { color: theme.colors.onSurface }]}>{chip.label}</Text>
                    <Icon source="x" size={12} color={theme.colors.onSurface} />
                  </View>
                </TouchableRipple>
              ))}
              {chips.length ? (
                <TouchableRipple onPress={() => clearAll(filters)} borderless accessibilityRole="button" style={styles.chip}>
                  <View style={styles.chipContent}>
                    <Text style={[styles.chipLabel, { color: theme.colors.primary }]}>Clear all</Text>
                  </View>
                </TouchableRipple>
              ) : null}
            </ScrollView>
          ) : null}

          {/* Only once the list is narrowed: unfiltered, the hero (or the dates and day headers) already say it. */}
          {narrowed ? (
            <Text accessibilityLiveRegion="polite" style={[styles.summary, { color: theme.colors.onSurfaceVariant }]}>
              {summary}
            </Text>
          ) : null}
        </View>
        {/* The app pages' day bands start straight under the toolbar; their grey is the edge. */}
        {APP_PAGE_LAYOUT ? null : <View style={[styles.divider, { backgroundColor: theme.colors.background }]} />}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetDates: { flexDirection: 'row' },
  appStack: { gap: 8 },
  // A soft lift, so its top edge shows where it rides over the hero's white.
  lift: {
    borderRadius: Shape.max,
    shadowColor: '#1d1d16',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 3,
  },
  card: { borderRadius: Shape.max, overflow: 'hidden' },
  toolbar: { padding: PADDING, gap: 10 },
  flex: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { gap: 6 },
  chip: { borderRadius: Shape.small },
  chipContent: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10 },
  chipLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  summary: { paddingBottom: 6, fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums', 'stylistic-one'] },
  // Same height and edge as Filters beside it.
  more: { margin: 0, width: CONTROL_HEIGHT, height: CONTROL_HEIGHT, borderRadius: Shape.small, borderWidth: 1 },
  divider: { height: 1 },
  emptyRows: { padding: 16, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
});

/**
 * Rows inside a ListingCard for lists that aren't grouped by day (e.g.
 * payment links, devices): hairlines between rows, a quiet line when empty.
 */
export function ListingRows({ children, empty }: { children: ReactNode[]; empty: string }) {
  const theme = useTheme();
  const rows = children.filter(Boolean);
  if (rows.length === 0) {
    return <Text style={[styles.emptyRows, { color: theme.colors.onSurfaceVariant }]}>{empty}</Text>;
  }
  return (
    <View>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 || APP_PAGE_LAYOUT ? <ListDivider /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}
