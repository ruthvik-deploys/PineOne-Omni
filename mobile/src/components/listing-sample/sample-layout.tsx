import color from 'color';
import { Children, type ReactNode, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Icon, IconButton, Menu, Text, TouchableRipple, useTheme } from 'react-native-paper';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTabLayout, useTabNavBar } from '@/components/app-tabs';
import { appliedChips, clearAll } from '@/components/listing-hero/applied-filters';
import { SearchField } from '@/components/search-field';
import { FiltersButton, type ListingFilter } from '@/components/shared/filters-sheet';
import { useSvgId } from '@/components/shared/hatch';
import { LazyMenu } from '@/components/shared/lazy-menu';
import type { ListingAction } from '@/components/shared/listing';
import { useAppColors } from '@/constants/app-colors';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { formatCount, formatInr } from '@/data/common';

/**
 * The listing sample's frame (see LISTING_SAMPLE_LAYOUT in
 * constants/experiments.ts), after the Starling references in Figma (App
 * references): the information on a coloured hero, then the records on a
 * white sheet riding up over its foot. The hero reads top to bottom, left
 * aligned under the page title: what and when (small), the number (the one
 * large thing), one line of context, then figures, the main action and
 * shortcuts — grouped, and spread down two thirds of the screen. Shared by Payments and Settlements so
 * both read the same.
 */

/** The tab page's side padding and its gap under the header (tab-screen.tsx), which the hero and sheet bleed through. */
const PAGE_PADDING = 16;
const PAGE_TOP_GAP = 24;
/** How far the sheet rides up over the hero's foot. */
const SHEET_OVERLAP = 20;
/** The tab page's bottom padding above the navigation bar (tab-screen.tsx), which the sheet runs through. */
const PAGE_BOTTOM_GAP = 32;
const CONTROL_HEIGHT = 36;

/** "₹4,12,500" — paise only when there are some. */
export const shortInr = (value: number) => formatInr(Math.round(value * 100) / 100).replace(/\.00$/, '');

/**
 * The hero: a wash from the header's white into the brand lime, so the page
 * opens in colour without a seam under the header. It takes two thirds of the
 * screen under the header (user decision), the listing the last third: its
 * groups (HeroGroup) spread evenly down that space.
 */
export function SampleHero({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const id = useSvgId('sample-hero');
  const { headerHeight } = useTabLayout();
  const navBar = useTabNavBar();
  const { height: windowHeight } = useWindowDimensions();
  // Two thirds of what's visible between the header and the navigation bar; the sheet starts at that line.
  const viewport = windowHeight - headerHeight - navBar.height;
  const minHeight = Math.round((viewport * 2) / 3) + SHEET_OVERLAP;
  const [first, ...rest] = Children.toArray(children);
  return (
    <View style={[styles.hero, { minHeight }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.surface} />
              <Stop offset="0.45" stopColor={theme.colors.secondaryContainer} stopOpacity={0.55} />
              <Stop offset="1" stopColor={theme.colors.secondaryContainer} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {/* The what-and-when row stays at the top; the rest spreads evenly down the space left (a lone number sits in the middle). */}
      {first}
      <View style={styles.heroBody}>{rest}</View>
    </View>
  );
}

/** A group of hero content that belongs together (e.g. the number and its line); the hero spreads its groups apart. */
export function HeroGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

/**
 * The hero's first line: what the number is (a label, or the switch between
 * two answers) on the left, and when it covers (the period) on the right.
 */
export function HeroTopRow({ label, children, period }: { label?: string; children?: ReactNode; period?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.topRow}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onSurface }]} accessibilityRole="header">
          {label}
        </Text>
      ) : (
        children
      )}
      {period}
    </View>
  );
}

/**
 * The number, the one large thing on the page — set like a figure on a
 * statement: the ₹ and paise smaller and muted. Then one line of context.
 * Or a count, for answers that aren't money.
 */
export function HeroNumber({ amount, line, count, lineTone, note }: { amount?: number; /** Shown instead of an amount when the answer isn't money (e.g. 12 of 14 devices). */ count?: { value: number; of?: number }; line: string; /** A limit worth seeing, under the line. */ note?: string; /** A plain-language status in the brand colour (e.g. when the next settlement is). */ lineTone?: 'accent' }) {
  const theme = useTheme();
  const rupees = Math.floor(Math.abs(amount ?? 0));
  const paise = String(Math.round((Math.abs(amount ?? 0) - rupees) * 100)).padStart(2, '0');
  return (
    <View style={styles.answer}>
      {count !== undefined ? (
        <View accessible accessibilityLabel={count.of !== undefined ? `${count.value} of ${count.of}` : String(count.value)} style={styles.amountRow}>
          <Text style={[styles.rupees, { color: theme.colors.onSurface }]}>{formatCount(count.value)}</Text>
          {count.of !== undefined ? <Text style={[styles.countOf, { color: theme.colors.onSurfaceVariant }]}> of {formatCount(count.of)}</Text> : null}
        </View>
      ) : (
        <View accessible accessibilityLabel={`₹${formatCount(rupees)}.${paise}`} style={styles.amountRow}>
          <Text style={[styles.currency, { color: theme.colors.onSurfaceVariant }]}>₹</Text>
          <Text numberOfLines={1} style={[styles.rupees, { color: theme.colors.onSurface }, rupeesSize(formatCount(rupees))]}>
            {formatCount(rupees)}
          </Text>
          <Text style={[styles.paise, { color: theme.colors.onSurfaceVariant }]}>.{paise}</Text>
        </View>
      )}
      <Text style={[styles.line, lineTone === 'accent' ? { color: theme.colors.primary, fontFamily: Fonts.medium } : { color: theme.colors.onSurfaceVariant }]}>{line}</Text>
      {note ? (
        <View style={styles.noteRow}>
          <Icon source="info" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>{note}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Where the period would be, for a number that's right now (a balance, devices working). */
export function LiveTag() {
  const theme = useTheme();
  return (
    <View style={styles.live} accessible accessibilityLabel="Live, as of now">
      <View style={[styles.liveDot, { backgroundColor: theme.colors.primary }]} />
      <Text style={[styles.liveLabel, { color: theme.colors.onSurfaceVariant }]}>Live</Text>
    </View>
  );
}

/**
 * Steps the number down for crores so it stays on one line (iOS's
 * adjustsFontSizeToFit misfires in a baseline-aligned row, shrinking short
 * numbers to nothing).
 */
function rupeesSize(text: string) {
  if (text.length > 12) return { fontSize: 28, lineHeight: 34 };
  if (text.length > 9) return { fontSize: 32, lineHeight: 38 };
  return null;
}

/** Two supporting figures in a row under the number: quieter than it, a hairline between them. */
export function HeroFigures({ figures }: { figures: { label: string; value: string; tone?: 'negative' }[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.figures, { borderTopColor: theme.colors.outlineVariant }]}>
      {figures.map((figure, index) => (
        <View key={figure.label} style={styles.figureCell}>
          {index > 0 ? <View style={[styles.figureDivider, { backgroundColor: theme.colors.outlineVariant }]} /> : null}
          <View style={[styles.figure, index > 0 && styles.figureAfterDivider]} accessible accessibilityLabel={`${figure.label}: ${figure.value}`}>
            <Text style={[styles.figureLabel, { color: theme.colors.onSurfaceVariant }]}>{figure.label}</Text>
            <Text numberOfLines={1} style={[styles.figureValue, { color: figure.tone === 'negative' ? theme.colors.error : theme.colors.onSurface }]}>
              {figure.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Two answers as a switch on the wash: a frosted track with the chosen one in white. */
export function HeroSwitch<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (key: K) => void }) {
  const theme = useTheme();
  const track = color(theme.colors.surface).alpha(theme.dark ? 0.08 : 0.55).string();
  return (
    <View accessibilityRole="tablist" style={[styles.switch, { backgroundColor: track }]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableRipple
            key={option.key}
            onPress={() => {
              if (active) return;
              LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
              onChange(option.key);
            }}
            borderless
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.segmentLabel, { color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontFamily: active ? Fonts.semiBold : Fonts.medium }]}>
              {option.label}
            </Text>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

/**
 * The page's main action under the number, filled in the brand colour, with
 * the rest behind ⋯ (e.g. Analytics, Email, Download) — no primary when the
 * page has none.
 */
export function HeroActions({ primary, menu = [] }: { primary?: { label: string; icon: string; onPress?: () => void }; menu?: ListingAction[] }) {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View style={styles.actions}>
      {primary ? (
        <TouchableRipple onPress={primary.onPress} borderless accessibilityRole="button" style={[styles.primary, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.primaryContent}>
            <Icon source={primary.icon} size={18} color={theme.colors.onPrimary} />
            <Text style={[styles.primaryLabel, { color: theme.colors.onPrimary }]}>{primary.label}</Text>
          </View>
        </TouchableRipple>
      ) : null}
      {menu.length ? (
        <LazyMenu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchorPosition="bottom"
          contentStyle={{ borderRadius: Shape.small, backgroundColor: theme.colors.surface }}
          anchor={
            <IconButton
              icon="dots-three"
              size={18}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel={`More: ${menu.map((action) => action.label).join(', ')}`}
              style={[styles.more, { backgroundColor: theme.colors.surface }]}
            />
          }>
          {menu.map((action) => (
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
  );
}

export type HeroShortcut = { key: string; icon: string; title: string; /** Where it stands, e.g. "2 in progress" or "None open". */ status: string; onPress: () => void };

/** Related places as white cards in a row that scrolls sideways, each with where it stands. */
export function HeroShortcuts({ items }: { items: HeroShortcut[] }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shortcutScroller} contentContainerStyle={styles.shortcuts}>
      {items.map((item) => (
        <TouchableRipple
          key={item.key}
          onPress={item.onPress}
          borderless
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${item.status}`}
          style={[styles.shortcut, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.shortcutContent}>
            <Icon source={item.icon} size={22} color={theme.colors.onSurface} />
            <View style={styles.shortcutText}>
              <Text numberOfLines={1} style={[styles.shortcutTitle, { color: theme.colors.onSurface }]}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={[styles.shortcutStatus, { color: theme.colors.onSurfaceVariant }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </TouchableRipple>
      ))}
    </ScrollView>
  );
}

type SampleSheetProps = {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Opens the search and focuses it whenever it changes (e.g. "Find a payment" from Overview). */
  openSearch?: string;
  filters: ListingFilter[];
  /** Records in the period, and what the search and filters leave of them. */
  totals: { all: number; shown: number; amount?: number };
  noun: { one: string; other: string };
  /** Above the list, e.g. the list's own dates when the hero is live. */
  accessory?: ReactNode;
  /** The list's actions (download, email…), behind ⋯ beside Search & filter. */
  actions?: ListingAction[];
  /** A note about the list, under the search (e.g. "Pick the payment to refund"). */
  notice?: ReactNode;
  children: ReactNode;
};

/**
 * The records on a white sheet: the title with Search & filter as one button
 * (opening the search and Filters), the applied filters as chips to remove,
 * what's left once narrowed, then the list. Runs to the bottom of the page.
 */
export function SampleSheet({ title, search, onSearchChange, searchPlaceholder, openSearch, filters, totals, noun, accessory, actions = [], notice, children }: SampleSheetProps) {
  const theme = useTheme();
  const appColors = useAppColors();
  const navBar = useTabNavBar();
  const { height: windowHeight } = useWindowDimensions();
  const [searchOpen, setSearchOpen] = useState(!!openSearch);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(openSearch);
  const [lastOpenSearch, setLastOpenSearch] = useState(openSearch);
  if (openSearch !== lastOpenSearch) {
    setLastOpenSearch(openSearch);
    if (openSearch) {
      setSearchOpen(true);
      setFocusRequest(openSearch);
    }
  }
  const chips = appliedChips(filters);
  const narrowed = chips.length > 0 || search.trim().length > 0;
  const bottomGap = PAGE_BOTTOM_GAP + navBar.height;
  // On an inner page (no tab header or navigation bar) nothing sits above it in colour: it fills the screen.
  const { headerHeight } = useTabLayout();
  const minHeight = headerHeight > 0 ? windowHeight * 0.6 : windowHeight;

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    if (searchOpen) {
      // Closing clears the search; the filters stay, shown as chips.
      onSearchChange('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
      setFocusRequest(String(Date.now()));
    }
  };

  return (
    <View style={[styles.sheet, { backgroundColor: theme.colors.surface, minHeight, marginBottom: -bottomGap, paddingBottom: bottomGap }]}>
      <View style={styles.toolbar}>
        <View style={styles.sheetHeader}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.sheetTitle} accessibilityRole="header">
            {title}
          </Text>
          <TouchableRipple
            onPress={toggleSearch}
            borderless
            accessibilityRole="button"
            accessibilityState={{ expanded: searchOpen }}
            accessibilityLabel={searchOpen ? 'Close search' : `Search and filter ${noun.other}`}
            style={styles.textButton}>
            <View style={styles.textButtonContent}>
              {searchOpen ? null : <Icon source="magnifying-glass" size={18} color={theme.colors.primary} />}
              <Text style={[styles.textButtonLabel, { color: theme.colors.primary }]}>
                {searchOpen ? 'Done' : chips.length ? `Search & filter · ${chips.length}` : 'Search & filter'}
              </Text>
            </View>
          </TouchableRipple>
          {actions.length ? (
            <LazyMenu
              visible={menuOpen}
              onDismiss={() => setMenuOpen(false)}
              anchorPosition="bottom"
              contentStyle={{ borderRadius: Shape.small, backgroundColor: theme.colors.surface }}
              anchor={
                <IconButton
                  icon="dots-three-vertical"
                  size={18}
                  onPress={() => setMenuOpen(true)}
                  accessibilityLabel={`More: ${actions.map((action) => action.label).join(', ')}`}
                  style={styles.sheetMore}
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

        {searchOpen ? (
          <View style={styles.searchRow}>
            <View style={styles.flex}>
              <SearchField value={search} onChangeText={onSearchChange} placeholder={searchPlaceholder} radius={Shape.small} height={CONTROL_HEIGHT} focusRequest={focusRequest} />
            </View>
            {filters.length ? <FiltersButton filters={filters} height={CONTROL_HEIGHT} /> : null}
          </View>
        ) : null}

        {notice}

        {accessory}

        {/* The filters that are set, one tap each to remove — shown whether or not the search is open. */}
        {chips.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>
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
            <TouchableRipple onPress={() => clearAll(filters)} borderless accessibilityRole="button" style={styles.chip}>
              <View style={styles.chipContent}>
                <Text style={[styles.chipLabel, { color: theme.colors.primary }]}>Clear all</Text>
              </View>
            </TouchableRipple>
          </ScrollView>
        ) : null}

        {narrowed ? (
          <Text accessibilityLiveRegion="polite" style={[styles.narrowed, { color: theme.colors.onSurfaceVariant }]}>
            Showing {totals.shown} of {totals.all} {totals.all === 1 ? noun.one : noun.other}
            {totals.amount === undefined ? '' : ` · ${shortInr(totals.amount)}`}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: -PAGE_PADDING,
    marginTop: -PAGE_TOP_GAP,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 24,
    paddingBottom: 32 + SHEET_OVERLAP,
    gap: 24,
  },
  // Groups spread evenly down the hero's two thirds, never closer than 24.
  heroBody: { flexGrow: 1, justifyContent: 'space-evenly', gap: 24 },
  group: { gap: 16 },
  // What (left) and when (right), one control height.
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32 },
  label: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  answer: { gap: 6 },
  // Baseline-aligned: the ₹ and paise sit on the rupees' baseline.
  amountRow: { flexDirection: 'row', alignItems: 'baseline' },
  currency: { fontFamily: Fonts.medium, fontSize: 20, lineHeight: 26, marginRight: 2 },
  rupees: { flexShrink: 1, fontFamily: Fonts.semiBold, fontSize: 36, lineHeight: 44, letterSpacing: -0.6, fontVariant: ['tabular-nums', 'lining-nums', 'stylistic-one'] },
  paise: { fontFamily: Fonts.medium, fontSize: 18, lineHeight: 24, marginLeft: 1 },
  countOf: { fontFamily: Fonts.medium, fontSize: 18, lineHeight: 24 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  note: { flexShrink: 1, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveLabel: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 16 },
  line: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  figures: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  figureCell: { flex: 1, flexDirection: 'row' },
  figure: { flex: 1, gap: 2 },
  figureAfterDivider: { paddingLeft: 16 },
  figureDivider: { width: StyleSheet.hairlineWidth },
  figureLabel: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  figureValue: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums', 'stylistic-one'] },
  switch: { flexDirection: 'row', borderRadius: Shape.small, padding: 2, height: 32 },
  segment: { justifyContent: 'center', paddingHorizontal: 12, borderRadius: Shape.small - 2 },
  segmentLabel: { fontSize: 13, lineHeight: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { borderRadius: Shape.max },
  primaryContent: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16 },
  primaryLabel: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20 },
  more: { margin: 0, width: 40, height: 40, borderRadius: Shape.max },
  // Runs edge to edge, starting in line with the page's content.
  shortcutScroller: { marginHorizontal: -PAGE_PADDING, flexGrow: 0 },
  shortcuts: { gap: 8, paddingHorizontal: PAGE_PADDING },
  shortcut: { width: 148, borderRadius: Shape.max },
  shortcutContent: { padding: 14, gap: 14 },
  shortcutText: { gap: 2 },
  shortcutTitle: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20 },
  shortcutStatus: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  sheet: {
    marginHorizontal: -PAGE_PADDING,
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: Shape.max,
    borderTopRightRadius: Shape.max,
    // A soft lift, so its top edge shows where it rides over the wash.
    shadowColor: '#1d1d16',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 2,
  },
  toolbar: { paddingHorizontal: PAGE_PADDING, paddingTop: 16, gap: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  sheetTitle: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 18, lineHeight: 24 },
  sheetMore: { margin: 0, marginRight: -8, width: 40, height: 40 },
  textButton: { borderRadius: Shape.small },
  textButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 8 },
  textButtonLabel: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20 },
  flex: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Runs edge to edge, starting in line with the page's content.
  chipScroller: { marginHorizontal: -PAGE_PADDING, flexGrow: 0 },
  chips: { gap: 6, paddingHorizontal: PAGE_PADDING },
  chip: { borderRadius: Shape.small },
  chipContent: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10 },
  chipLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  narrowed: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums', 'stylistic-one'] },
});
