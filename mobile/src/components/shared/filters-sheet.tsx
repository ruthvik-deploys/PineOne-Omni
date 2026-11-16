import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Icon, Portal, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchField } from '@/components/search-field';

import { useAppColors } from '@/constants/app-colors';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';

import { DateRangeFields, type DateRangePreset, type DateRangeValue, makeDateRangeValue } from './date-range-filter';
import { countSelection, type MoreFilterCategory, type MoreFilterSelection } from './more-filters';
import { PANEL_INNER_RADIUS, PANEL_PADDING, PanelSheet, SHEET_BUTTON, SheetRow, SheetSection } from './panel-sheet';
import { OptionCard, SheetBlock, SheetButton } from './sheet-parts';

/**
 * One of a listing's filters, all of which sit behind its single Filters
 * button (user decision). The page keeps owning each value; the sheet edits
 * drafts of them and applies them together.
 */
export type ListingFilter =
  | {
      type: 'date';
      /** Section title; defaults to "Date range". */
      label?: string;
      presets: DateRangePreset[];
      value: DateRangeValue;
      onApply(value: DateRangeValue): void;
      /** Restored by "Clear all". */
      initialPresetId: string;
    }
  | {
      type: 'select';
      label: string;
      options: readonly { value: string; label: string }[];
      value: string;
      onApply(value: string): void;
      /** Restored by "Clear all"; defaults to the first option. */
      defaultValue?: string;
    }
  | {
      /** A group of categories (web: More filters), each shown as its own section. */
      type: 'more';
      categories: MoreFilterCategory[];
      applied: MoreFilterSelection;
      onApply(selection: MoreFilterSelection): void;
    };

type Draft = DateRangeValue | string | MoreFilterSelection;

/**
 * A select filter (e.g. Status), typed by its own options: the page's setter
 * receives only values from them.
 */
export function selectFilter<T extends string>(filter: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onApply: (value: T) => void;
  defaultValue?: T;
}): ListingFilter {
  return { type: 'select', ...filter, onApply: (value) => filter.onApply(value as T) };
}

const valueOf = (filter: ListingFilter): Draft => (filter.type === 'date' ? filter.value : filter.type === 'select' ? filter.value : filter.applied);

const defaultOf = (filter: ListingFilter): Draft =>
  filter.type === 'date'
    ? makeDateRangeValue(filter.presets, filter.initialPresetId)
    : filter.type === 'select'
      ? (filter.defaultValue ?? filter.options[0]?.value ?? '')
      : {};

/** How many filters differ from their defaults: shown on the Filters button. */
function activeCount(filters: ListingFilter[]) {
  return filters.reduce((sum, filter) => {
    if (filter.type === 'date') return sum + (filter.value.presetId === filter.initialPresetId ? 0 : 1);
    if (filter.type === 'select') return sum + (filter.value === defaultOf(filter) ? 0 : 1);
    return sum + countSelection(filter.applied);
  }, 0);
}

const toggleInList = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

/**
 * One thing to filter by, as a row of the Filters sheet: a date range, a
 * select, or one of More filters' categories (each its own row).
 */
type Facet = {
  key: string;
  label: string;
  /** Which filter's draft it edits. */
  index: number;
  options: { id: string; label: string }[];
  /** The option meaning "no filter" (single-choice facets); multi-choice facets clear to none. */
  allId?: string;
  multi: boolean;
  /** The ids chosen in a draft. */
  read(draft: Draft): string[];
  /** The draft with these ids chosen. */
  write(draft: Draft, ids: string[]): Draft;
  /** Date ranges: the custom range's fields under the presets. */
  custom?: (draft: Draft, onChange: (draft: Draft) => void) => ReactNode;
};

function facetsOf(filters: ListingFilter[]): Facet[] {
  return filters.flatMap((filter, index): Facet[] => {
    if (filter.type === 'date') {
      const initial = filter.initialPresetId;
      return [
        {
          key: `date-${index}`,
          label: filter.label ?? 'Date range',
          index,
          options: filter.presets.map((preset) => ({ id: preset.id, label: preset.label })),
          allId: initial,
          multi: false,
          read: (draft) => [(draft as DateRangeValue).presetId],
          write: (draft, [id = initial]) => {
            const value = draft as DateRangeValue;
            const preset = filter.presets.find((item) => item.id === id);
            return { ...value, presetId: id, range: preset?.getRange?.() ?? value.range };
          },
          custom: (draft, onChange) =>
            (draft as DateRangeValue).presetId === 'custom' ? <DateRangeFields value={draft as DateRangeValue} onChange={onChange} /> : null,
        },
      ];
    }
    if (filter.type === 'select') {
      const fallback = defaultOf(filter) as string;
      return [
        {
          key: `select-${index}`,
          label: filter.label,
          index,
          // The default option is labelled for the old dropdown (e.g. "Status", "All modes"); here it's just "All".
          options: filter.options.map((option) => ({ id: option.value, label: option.value === fallback ? 'All' : option.label })),
          allId: fallback,
          multi: false,
          read: (draft) => [draft as string],
          write: (_draft, [id = fallback]) => id,
        },
      ];
    }
    return filter.categories.map((category) => ({
      key: `more-${index}-${category.id}`,
      label: category.label,
      index,
      options: category.options.map((option) => ({ id: option.id, label: option.label })),
      multi: (category.selectionMode ?? 'multi') === 'multi',
      read: (draft) => (draft as MoreFilterSelection)[category.id] ?? [],
      write: (draft, ids) => ({ ...(draft as MoreFilterSelection), [category.id]: ids }),
    }));
  });
}

const isSet = (facet: Facet, draft: Draft) => {
  const ids = facet.read(draft);
  return facet.allId ? ids[0] !== facet.allId : ids.length > 0;
};

/** The facet's value as its row shows it: "All", "Success", "UPI, Card" or "UPI +2". */
function summaryOf(facet: Facet, draft: Draft) {
  if (!isSet(facet, draft)) return 'All';
  const labels = facet.read(draft).map((id) => facet.options.find((option) => option.id === id)?.label ?? id);
  return labels.length > 2 ? `${labels[0]} +${labels.length - 1}` : labels.join(', ');
}

const sameDrafts = (a: Draft[], b: Draft[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The listing's Filters button and sheet. The sheet lists what you can filter
 * by, one row each with its current value on the right ("Status · Success ›");
 * a row opens that filter's options in a sheet on top (as the channel
 * switcher opens its stores). Single choices return as soon as you pick;
 * multiple choices return on Done. Nothing applies until Apply, and Reset only
 * resets the drafts. The button counts the filters that are set.
 */
export function FiltersButton({ filters, height }: { filters: ListingFilter[]; height?: number }) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() => filters.map(valueOf));
  const [openFacet, setOpenFacet] = useState<string | null>(null);
  const count = activeCount(filters);
  const facets = facetsOf(filters);
  // The page's filters can change while the sheet is closed (e.g. Payments switching channel).
  const draftOf = (index: number) => drafts[index] ?? valueOf(filters[index]);
  const setDraft = (index: number, draft: Draft) => setDrafts((current) => filters.map((filter, i) => (i === index ? draft : (current[i] ?? valueOf(filter)))));

  const applied = filters.map(valueOf);
  const current = filters.map((_, index) => draftOf(index));
  const unchanged = sameDrafts(current, applied);
  const atDefaults = sameDrafts(current, filters.map(defaultOf));
  const setCount = facets.filter((facet) => isSet(facet, draftOf(facet.index))).length;

  const apply = () => {
    filters.forEach((filter, index) => {
      const draft = draftOf(index);
      if (filter.type === 'date') filter.onApply(draft as DateRangeValue);
      else if (filter.type === 'select') filter.onApply(draft as string);
      else filter.onApply(draft as MoreFilterSelection);
    });
    setOpen(false);
  };

  const picking = facets.find((facet) => facet.key === openFacet);
  const contentHeight = SHEET_CHROME + PANEL_PADDING * 2 + SECTION_LABEL + facets.length * ROW_HEIGHT + FOOTER_HEIGHT + PANEL_PADDING;

  return (
    <>
      <FiltersTrigger
        count={count}
        height={height}
        // The app pages (Figma 7249:191734): a list with one choice names it, as a dropdown ("Status ▾").
        single={APP_PAGE_LAYOUT && filters.length === 1 && filters[0].type === 'select' ? filters[0].label : undefined}
        onPress={() => {
          setDrafts(filters.map(valueOf));
          setOpenFacet(null);
          setOpen(true);
        }}
      />
      {APP_PAGE_LAYOUT ? (
        <FiltersPage
          visible={open}
          onDismiss={() => setOpen(false)}
          facets={facets}
          draftOf={draftOf}
          onOpenFacet={setOpenFacet}
          onClear={() => setDrafts(filters.map(defaultOf))}
          onApply={apply}
        />
      ) : null}
      <PanelSheet
        visible={open && !APP_PAGE_LAYOUT}
        onDismiss={() => setOpen(false)}
        title="Filters"
        height={Math.min(contentHeight, Math.round(windowHeight * 0.86))}
        footer={
          <View style={styles.footer}>
            <Button mode="text" disabled={atDefaults} onPress={() => setDrafts(filters.map(defaultOf))} style={styles.footerButton}>
              Reset
            </Button>
            <Button mode="contained" onPress={unchanged ? () => setOpen(false) : apply} {...SHEET_BUTTON} style={[SHEET_BUTTON.style, styles.apply]}>
              {unchanged ? 'Done' : 'Apply'}
            </Button>
          </View>
        }>
        <View style={styles.body}>
          <SheetSection label="Filter by" trailing={setCount ? `${setCount} set` : undefined}>
            {facets.map((facet, index) => {
              const active = isSet(facet, draftOf(facet.index));
              return (
                <SheetRow
                  key={facet.key}
                  first={index === 0}
                  title={facet.label}
                  onPress={() => setOpenFacet(facet.key)}
                  trailing={
                    <View style={styles.value}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.valueLabel,
                          { color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontFamily: active ? Fonts.semiBold : Fonts.regular },
                        ]}>
                        {summaryOf(facet, draftOf(facet.index))}
                      </Text>
                      <Icon source="caret-right" size={16} color={theme.colors.onSurfaceVariant} />
                    </View>
                  }
                />
              );
            })}
          </SheetSection>
        </View>
      </PanelSheet>
      {/* Mounted only while open, so it stacks over the Filters page (portals layer in mount order). */}
      {open && picking ? (
      <FacetPicker
        facet={picking}
        visible={open && !!picking}
        draft={picking ? draftOf(picking.index) : ''}
        onDismiss={() => setOpenFacet(null)}
        onDone={(draft) => picking && setDraft(picking.index, draft)}
      />
      ) : null}
    </>
  );
}

/**
 * One filter's options, in a sheet over the Filters sheet: "All" first for a
 * single choice (or a checkbox list for several), a search field once the list
 * is long. A single choice returns straight away; Done returns the rest; ✕
 * discards.
 */
function FacetPicker({
  facet,
  visible,
  draft,
  onDismiss,
  onDone,
}: {
  facet?: Facet;
  visible: boolean;
  draft: Draft;
  onDismiss: () => void;
  onDone: (draft: Draft) => void;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const [picked, setPicked] = useState<Draft>(draft);
  const [query, setQuery] = useState('');
  // Start from the Filters sheet's draft each time it opens (adjusting state during render).
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = visible && facet ? facet.key : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (key) {
      setPicked(draft);
      setQuery('');
    }
  }
  if (!facet) return null;

  const ids = facet.read(picked);
  const searchable = facet.options.length > SEARCH_FROM;
  const shown = facet.options.filter((option) => !query.trim() || option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const choose = (id: string) => {
    if (facet.multi) return setPicked(facet.write(picked, toggleInList(ids, id)));
    const next = facet.write(picked, [id]);
    // The custom date range needs its dates first; any other single choice is done.
    if (facet.custom?.(next, () => {})) return setPicked(next);
    onDone(next);
    onDismiss();
  };
  const rows = shown.length + (facet.multi ? 1 : 0);
  const custom = facet.custom?.(picked, setPicked);
  // The app pages (Figma 7155:143706): every option a bordered card, "All …" first, and Apply at the foot.
  if (APP_PAGE_LAYOUT) {
    const allLabel = `All ${facet.label.toLowerCase()}`;
    return (
      <PanelSheet
        visible={visible}
        onDismiss={onDismiss}
        title={facet.label}
        height={Math.min(130 + (rows + (facet.multi ? 0 : 0)) * 44 + (searchable ? 48 : 0) + 64 + (custom ? 220 : 0), Math.round(windowHeight * 0.86))}
        footer={
          <SheetButton
            label="Apply"
            onPress={() => {
              onDone(picked);
              onDismiss();
            }}
          />
        }>
        <SheetBlock last={!custom}>
          {searchable ? (
            <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${facet.label.toLowerCase()}`} radius={Shape.small} height={32} />
          ) : null}
          {facet.multi ? <OptionCard title={allLabel} selected={ids.length === 0} onPress={() => setPicked(facet.write(picked, []))} /> : null}
          {shown.map((option) => (
            <OptionCard
              key={option.id}
              title={option.id === facet.allId && /^all$/i.test(option.label) ? allLabel : option.label}
              type={facet.multi ? 'checkbox' : 'radio'}
              selected={ids.includes(option.id)}
              onPress={() => (facet.multi ? setPicked(facet.write(picked, toggleInList(ids, option.id))) : setPicked(facet.write(picked, [option.id])))}
            />
          ))}
        </SheetBlock>
        {custom ? <SheetBlock last>{custom}</SheetBlock> : null}
      </PanelSheet>
    );
  }
  const contentHeight =
    SHEET_CHROME +
    PANEL_PADDING * 2 +
    (searchable ? SEARCH_HEIGHT + 12 : 0) +
    rows * ROW_HEIGHT +
    (facet.multi ? FOOTER_HEIGHT + PANEL_PADDING : 0);

  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title={facet.label}
      height={searchable || custom ? Math.round(windowHeight * 0.86) : Math.min(contentHeight, Math.round(windowHeight * 0.86))}
      // A single choice returns on tap, so only several choices or a custom range need Done.
      footer={
        facet.multi || custom ? (
          <View>
            <Button
              mode="contained"
              onPress={() => {
                onDone(picked);
                onDismiss();
              }}
              {...SHEET_BUTTON}>
              Done
            </Button>
          </View>
        ) : undefined
      }>
      <View style={styles.body}>
        {searchable ? (
          <View style={styles.search}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${facet.label.toLowerCase()}`}
              radius={PANEL_INNER_RADIUS}
              height={SEARCH_HEIGHT}
            />
          </View>
        ) : null}
        <SheetSection trailing={facet.multi && ids.length ? `${ids.length} selected` : undefined}>
          {facet.multi ? <SheetRow first title="All" role="radio" selected={ids.length === 0} onPress={() => setPicked(facet.write(picked, []))} /> : null}
          {shown.map((option, index) => (
            <SheetRow
              key={option.id}
              first={!facet.multi && index === 0}
              title={option.label}
              role={facet.multi ? 'checkbox' : 'radio'}
              selected={ids.includes(option.id)}
              onPress={() => choose(option.id)}
            />
          ))}
          {shown.length === 0 ? <SheetRow first title={`No ${facet.label.toLowerCase()} matches “${query.trim()}”`} /> : null}
        </SheetSection>
        {custom ? <View style={styles.custom}>{custom}</View> : null}
      </View>
    </PanelSheet>
  );
}

/**
 * The Filters button, styled like the toolbar's other controls (white, hairline
 * border, 12dp label). With filters applied it turns the nav bar's lime and
 * a badge counts them, so a filtered list is obvious at a
 * glance.
 */
function FiltersTrigger({ count, height = 36, single, onPress }: { count: number; height?: number; single?: string; onPress: () => void }) {
  const theme = useTheme();
  const active = count > 0;
  const appColors = useAppColors();
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      accessibilityRole="button"
      accessibilityLabel={active ? `Filters, ${count} applied` : 'Filters'}
      style={[
        styles.trigger,
        {
          height,
          backgroundColor: active ? appColors.highlight : theme.colors.surface,
          borderColor: active ? appColors.highlightBorder : theme.colors.outlineVariant,
        },
      ]}>
      <View style={styles.triggerContent}>
        {single ? null : <Icon source={APP_PAGE_LAYOUT ? 'funnel' : 'funnel-simple'} size={16} color={theme.colors.onSurface} />}
        <Text style={[styles.triggerLabel, { color: theme.colors.onSurface }]}>{single ?? 'Filters'}</Text>
        {active ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.onSurface }]}>
            <Text style={[styles.badgeLabel, { color: theme.colors.surface }]}>{count}</Text>
          </View>
        ) : null}
        {single ? <Icon source="caret-down" size={16} color={theme.colors.onSurface} /> : null}
      </View>
    </TouchableRipple>
  );
}

/**
 * Filters as a page of its own (APP_PAGE_LAYOUT, Figma 7155:143192 /
 * 7155:144720): "Filters" with ✕ at the top, each thing to filter by a white
 * row with what it's set to ("UPI +2"), and Clear all / Apply filters at the
 * foot. A row opens its options as a sheet over the page.
 */
function FiltersPage({
  visible,
  onDismiss,
  facets,
  draftOf,
  onOpenFacet,
  onClear,
  onApply,
}: {
  visible: boolean;
  onDismiss: () => void;
  facets: Facet[];
  draftOf: (index: number) => Draft;
  onOpenFacet: (key: string) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Portal>
      <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
        <View style={[pageStyles.header, { paddingTop: insets.top + 12, backgroundColor: theme.colors.surface }]}>
          <Text accessibilityRole="header" style={[pageStyles.title, { color: theme.colors.onSurface }]}>
            Filters
          </Text>
          <TouchableRipple
            onPress={onDismiss}
            borderless
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            style={[pageStyles.close, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
            <Icon source="x" size={16} color={theme.colors.onSurface} />
          </TouchableRipple>
        </View>
        <ScrollView contentContainerStyle={pageStyles.list}>
          {facets.map((facet) => {
            const draft = draftOf(facet.index);
            const summary = summaryOf(facet, draft);
            return (
              <TouchableRipple
                key={facet.key}
                onPress={() => onOpenFacet(facet.key)}
                borderless
                accessibilityRole="button"
                accessibilityLabel={`${facet.label}, ${summary}`}
                style={[pageStyles.row, { backgroundColor: theme.colors.surface }]}>
                <View style={pageStyles.rowContent}>
                  <Text style={[pageStyles.rowLabel, { color: theme.colors.onSurface }]}>{facet.label}</Text>
                  <Text numberOfLines={1} style={[pageStyles.rowValue, { color: theme.colors.onSurfaceVariant }]}>
                    {summary === 'All' && facet.allId ? `All ${facet.label.toLowerCase()}` : summary}
                  </Text>
                  <Icon source="caret-right" size={20} color={theme.colors.onSurface} />
                </View>
              </TouchableRipple>
            );
          })}
        </ScrollView>
        <View style={[pageStyles.footer, { paddingBottom: Math.max(8, insets.bottom), backgroundColor: theme.colors.surface }]}>
          <View style={pageStyles.flex}>
            <SheetButton label="Clear all" mode="outline" onPress={onClear} />
          </View>
          <View style={pageStyles.flex}>
            <SheetButton label="Apply filters" onPress={onApply} />
          </View>
        </View>
      </View>
    </Portal>
  );
}

const pageStyles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingRight: 8, paddingBottom: 12 },
  title: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24 },
  close: { width: 28, height: 28, borderRadius: Shape.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 8, gap: 8 },
  row: { borderRadius: Shape.max },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingLeft: 16, paddingRight: 12 },
  rowLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  rowValue: { maxWidth: '50%', fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  footer: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingTop: 8 },
});

// For sizing the sheets to their content.
/** Drag handle, header row and its divider (PanelSheet). */
const SHEET_CHROME = 36 + 52 + 1;
const SECTION_LABEL = 16 + 8;
const ROW_HEIGHT = 56;
/** Divider, padding and the footer button; the bottom padding is added separately. */
const FOOTER_HEIGHT = 1 + PANEL_PADDING + 48;
/** Longer option lists get a search field. */
const SEARCH_FROM = 8;
const SEARCH_HEIGHT = 44;

const BADGE_SIZE = 18;

const styles = StyleSheet.create({
  // Page-level control, like the toolbar's action buttons.
  trigger: { borderRadius: Shape.small, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 12 },
  triggerContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  triggerLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  badge: { minWidth: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeLabel: { fontFamily: Fonts.semiBold, fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums', 'stylistic-one'] },
  body: { padding: PANEL_PADDING, gap: 12 },
  search: { marginBottom: 0 },
  custom: { marginTop: 4 },
  value: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '55%', paddingRight: 8 },
  valueLabel: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerButton: { borderRadius: PANEL_INNER_RADIUS },
  apply: { flex: 1, marginLeft: 12 },
});
