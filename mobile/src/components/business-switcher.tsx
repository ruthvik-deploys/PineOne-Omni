import { Fragment, type ReactNode, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { SearchField } from '@/components/search-field';
import { PANEL_INNER_RADIUS, PANEL_PADDING, PanelSheet } from '@/components/shared/panel-sheet';
import { SelectionMark } from '@/components/shared/selection-mark';
import { useAppColors } from '@/constants/app-colors';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import type { Shop } from '@/data/businesses';
import { CHANNEL_OPTIONS, type ChannelFilter } from '@/data/overview';

/** The channel and stores the app is scoped to, within the current organisation. */
export type BusinessScope = { shopIds: string[]; channel: ChannelFilter };

type BusinessSwitcherProps = {
  visible: boolean;
  onDismiss: () => void;
  /** The current organisation's stores (the organisation itself is switched from Account settings). */
  shops: Shop[];
  /** The scope currently applied; the sheet edits a draft of it until Apply. */
  scope: BusinessScope;
  onApply: (scope: BusinessScope) => void;
  /** Only Overview offers "All channels"; channel-split pages pick In-store or Online. */
  allowAllChannels?: boolean;
};

const CHANNEL_DESCRIPTIONS: Record<ChannelFilter, string> = {
  all: 'In-store and online payments together',
  'in-store': 'POS terminals and store QR payments',
  online: 'Payment gateway, payment links and checkout',
};

const CHANNEL_ICONS: Record<ChannelFilter, string> = {
  all: 'squares-four',
  'in-store': 'storefront',
  online: 'globe',
};

/**
 * The app's only scope control, opened from the header: channel (All
 * channels on Overview only; otherwise In-store or Online), and which stores
 * (all by default, or any combination), shown as one row that opens the
 * store picker on top. Online has no stores, so that row becomes a line
 * saying so. The
 * button names the scope it'll show ("Show In-store · 2 stores"). Laid out like
 * the app's pages: white cards of rows on the grey page, uppercase section
 * labels as on the Overview cards, and the chosen row's icon on the nav bar's
 * lime. Pages don't filter by store or channel themselves.
 */
export function BusinessSwitcher(props: BusinessSwitcherProps) {
  return APP_PAGE_LAYOUT ? <AppBusinessSwitcher {...props} /> : <ClassicBusinessSwitcher {...props} />;
}

/** The app pages' channel names and lines (Figma 7154:141837). */
const APP_CHANNELS: Record<ChannelFilter, { title: string; description: string; icon: string }> = {
  all: { title: 'All channels payments', description: 'Payments from both channels', icon: 'globe' },
  'in-store': { title: 'In-store payments', description: 'Terminals & store QR payments', icon: 'storefront' },
  online: { title: 'Online payments', description: 'Payment gateway, links & checkout', icon: 'globe' },
};

/**
 * "Channel & store selection" as the app pages set it (APP_PAGE_LAYOUT,
 * Figma 7154:141549 / 141837 / 142229): the channels as bordered cards with
 * a radio (the picked one edged in green), then — unless Online — the stores:
 * Select all, a search, and each store a bordered card with a checkbox. No
 * store ticked means every store. Apply fills the foot.
 */
function AppBusinessSwitcher({ visible, onDismiss, shops, scope, onApply, allowAllChannels = true }: BusinessSwitcherProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [draft, setDraft] = useState<BusinessScope>(scope);
  const [query, setQuery] = useState('');
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft(scope);
      setQuery('');
    }
  }
  const channels = CHANNEL_OPTIONS.filter((option) => allowAllChannels || option.value !== 'all');
  const storesApply = draft.channel !== 'online';
  const shown = shops.filter((shop) => !query.trim() || `${shop.name} ${shop.address}`.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (id: string) =>
    setDraft((current) => ({ ...current, shopIds: current.shopIds.includes(id) ? current.shopIds.filter((shopId) => shopId !== id) : [...current.shopIds, id] }));
  const height = Math.round(windowHeight * (storesApply ? 0.86 : 0.48));

  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Channel & store selection"
      height={height}
      footer={
        <View>
          <Button
            mode="contained"
            onPress={() => {
              // Every store ticked is the same as all of them.
              const shopIds = draft.shopIds.length === shops.length ? [] : draft.shopIds;
              onApply({ ...draft, shopIds });
              onDismiss();
            }}
            contentStyle={appStyles.applyContent}
            labelStyle={appStyles.applyLabel}
            style={appStyles.apply}>
            Apply
          </Button>
        </View>
      }>
      <View style={appStyles.block}>
        <Text accessibilityRole="header" style={[appStyles.heading, { color: theme.colors.onSurface }]}>
          Select channel
        </Text>
        {channels.map((option) => {
          const channel = APP_CHANNELS[option.value];
          const selected = draft.channel === option.value;
          return (
            <TouchableRipple
              key={option.value}
              onPress={() => setDraft((current) => ({ ...current, channel: option.value }))}
              borderless
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              style={[appStyles.option, { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant }]}>
              <View style={appStyles.optionContent}>
                <View style={[appStyles.tile, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Icon source={channel.icon} size={20} color={theme.colors.onSurface} />
                </View>
                <View style={appStyles.optionText}>
                  <Text numberOfLines={1} style={[appStyles.optionTitle, { color: theme.colors.onSurface }]}>
                    {channel.title}
                  </Text>
                  <Text numberOfLines={1} style={[appStyles.optionDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {channel.description}
                  </Text>
                </View>
                <SelectionMark type="radio" checked={selected} />
              </View>
            </TouchableRipple>
          );
        })}
      </View>
      {storesApply ? (
        <View style={[appStyles.block, appStyles.rule, { borderTopColor: theme.colors.background }]}>
          <View style={appStyles.storesHeader}>
            <Text accessibilityRole="header" style={[appStyles.heading, { color: theme.colors.onSurface }]}>
              Stores
            </Text>
            <Text
              onPress={() => setDraft((current) => ({ ...current, shopIds: current.shopIds.length === shops.length ? [] : shops.map((shop) => shop.id) }))}
              accessibilityRole="button"
              style={[appStyles.selectAll, { color: theme.colors.primary }]}>
              {draft.shopIds.length === shops.length ? 'Clear all' : 'Select all'}
            </Text>
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search store" radius={Shape.small} height={36} />
          {shown.map((shop) => {
            const checked = draft.shopIds.includes(shop.id);
            return (
              <TouchableRipple
                key={shop.id}
                onPress={() => toggle(shop.id)}
                borderless
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                aria-checked={checked}
                style={[appStyles.option, { borderColor: theme.colors.outlineVariant }]}>
                <View style={appStyles.optionContent}>
                  <View style={appStyles.optionText}>
                    <Text numberOfLines={1} style={[appStyles.optionTitle, { color: theme.colors.onSurface }]}>
                      {shop.name}
                    </Text>
                    <Text numberOfLines={1} style={[appStyles.optionDescription, { color: theme.colors.onSurfaceVariant }]}>
                      {shop.address}
                    </Text>
                  </View>
                  <SelectionMark type="checkbox" checked={checked} />
                </View>
              </TouchableRipple>
            );
          })}
        </View>
      ) : null}
    </PanelSheet>
  );
}

const appStyles = StyleSheet.create({
  block: { padding: PANEL_PADDING, gap: 8 },
  rule: { borderTopWidth: 1 },
  heading: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  storesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectAll: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  option: { borderWidth: 1, borderRadius: Shape.max },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 10, paddingVertical: 8 },
  tile: { width: 36, height: 36, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  optionDescription: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  apply: { borderRadius: Shape.small },
  applyContent: { height: 40 },
  applyLabel: { fontFamily: Fonts.medium, fontSize: 14 },
});

function ClassicBusinessSwitcher({ visible, onDismiss, shops, scope, onApply, allowAllChannels = true }: BusinessSwitcherProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [draft, setDraft] = useState<BusinessScope>(scope);
  // Start from the applied scope each time the sheet opens (adjusting state during render).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(scope);
  }
  const channels = CHANNEL_OPTIONS.filter((option) => allowAllChannels || option.value !== 'all');
  const storesApply = draft.channel !== 'online';
  const unchanged = draft.channel === scope.channel && sameIds(draft.shopIds, scope.shopIds);
  const [pickingStores, setPickingStores] = useState(false);

  // Sized to its content: the channel rows and the one stores row (or the online note), up to the panel's usual 86%.
  const rows = channels.length + 1;
  const contentHeight =
    SHEET_CHROME +
    PANEL_PADDING * 2 +
    2 * SECTION_LABEL +
    SECTION_GAP +
    rows * ROW_HEIGHT +
    NOTE_EXTRA +
    FOOTER_HEIGHT +
    PANEL_PADDING;

  return (
    <>
      <PanelSheet
        visible={visible}
        onDismiss={onDismiss}
        title="Channel and stores"
        grouped
        height={Math.min(contentHeight, Math.round(windowHeight * 0.86))}
        footer={
          <View>
            <Button
              mode="contained"
              onPress={() => {
                if (!unchanged) onApply(draft);
                onDismiss();
              }}
              contentStyle={styles.applyContent}
              labelStyle={styles.applyLabel}
              style={styles.apply}>
              {unchanged ? 'Done' : `Show ${draftLabel(draft, shops)}`}
            </Button>
          </View>
        }>
        <View style={styles.body}>
          <Section label="Channel">
            {channels.map((option, index) => (
              <Row
                key={option.value}
                first={index === 0}
                icon={CHANNEL_ICONS[option.value]}
                title={option.label}
                description={CHANNEL_DESCRIPTIONS[option.value]}
                role="radio"
                selected={draft.channel === option.value}
                onPress={() => setDraft((current) => ({ ...current, channel: option.value }))}
              />
            ))}
          </Section>

          <Section label="Stores">
            {storesApply ? (
              // One banner row; the stores are picked in their own sheet on top of this one.
              <Row
                first
                icon={draft.shopIds.length === 1 ? 'storefront' : 'buildings'}
                title={storesTitle(draft.shopIds, shops)}
                description={storesDescription(draft.shopIds, shops)}
                role="button"
                selected={false}
                onPress={() => setPickingStores(true)}
              />
            ) : (
              // Online isn't tied to a store: one line saying so, in place of the stores row.
              <View style={styles.note}>
                <Icon source="info" size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.noteText, { color: theme.colors.onSurfaceVariant }]}>
                  Online payments aren’t tied to a store, so you’ll see the whole business online.
                </Text>
              </View>
            )}
          </Section>
        </View>
      </PanelSheet>
      <StorePicker
        visible={visible && pickingStores}
        onDismiss={() => setPickingStores(false)}
        shops={shops}
        shopIds={draft.shopIds}
        onDone={(shopIds) => setDraft((current) => ({ ...current, shopIds }))}
      />
    </>
  );
}

type StorePickerProps = {
  visible: boolean;
  onDismiss: () => void;
  shops: Shop[];
  /** The switcher's draft selection; [] = all stores. */
  shopIds: string[];
  /** Hands the pick back to the switcher (it applies with the channel). */
  onDone: (shopIds: string[]) => void;
};

/**
 * The stores, in a sheet of their own over the switcher: All stores, or any
 * combination. From All stores, tapping a store narrows to just that store
 * (the usual intent), then taps add or remove. Done returns to the switcher;
 * closing discards the change.
 */
function StorePicker({ visible, onDismiss, shops, shopIds, onDone }: StorePickerProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [picked, setPicked] = useState<string[]>(shopIds);
  // Start from the switcher's draft each time it opens (adjusting state during render).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setPicked(shopIds);
  }
  const allStores = picked.length === 0;

  const toggleShop = (id: string) =>
    setPicked((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      // Every store ticked means "All stores"; unticking the last store falls back to all too.
      return next.length === shops.length ? [] : next;
    });

  const contentHeight =
    SHEET_CHROME + PANEL_PADDING * 2 + SECTION_LABEL + (shops.length + 1) * ROW_HEIGHT + FOOTER_HEIGHT + PANEL_PADDING;

  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Stores"
      grouped
      height={Math.min(contentHeight, Math.round(windowHeight * 0.86))}
      footer={
        <View>
          <Button
            mode="contained"
            onPress={() => {
              onDone(picked);
              onDismiss();
            }}
            contentStyle={styles.applyContent}
            labelStyle={styles.applyLabel}
            style={styles.apply}>
            Done
          </Button>
        </View>
      }>
      <View style={styles.body}>
        <Section label="Stores" trailing={allStores ? 'All stores' : `${picked.length} of ${shops.length} selected`}>
          <Row
            first
            icon="buildings"
            title="All stores"
            description={`Every store, ${shops.length} in total`}
            role="radio"
            selected={allStores}
            onPress={() => setPicked([])}
          />
          {shops.map((shop) => (
            <Row
              key={shop.id}
              icon="storefront"
              title={shop.name}
              description={shop.address}
              role="checkbox"
              selected={picked.includes(shop.id)}
              onPress={() => toggleShop(shop.id)}
            />
          ))}
        </Section>
      </View>
    </PanelSheet>
  );
}

/** The stores banner's title: "All stores", "Koramangala" or "2 stores". */
function storesTitle(shopIds: string[], shops: Shop[]) {
  if (shopIds.length === 0) return 'All stores';
  if (shopIds.length === 1) return shops.find((shop) => shop.id === shopIds[0])?.name ?? '1 store';
  return `${shopIds.length} stores`;
}

/** Under it: how many stores, or which ones. */
function storesDescription(shopIds: string[], shops: Shop[]) {
  if (shopIds.length === 0) return `Every store, ${shops.length} in total`;
  if (shopIds.length === 1) return shops.find((shop) => shop.id === shopIds[0])?.address ?? '';
  return shops
    .filter((shop) => shopIds.includes(shop.id))
    .map((shop) => shop.name)
    .join(', ');
}

/** An uppercase label (as on the Overview cards) over a white card of rows. */
function Section({ label, trailing, children }: { label: string; trailing?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        <Text accessibilityRole="header" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
          {label.toUpperCase()}
        </Text>
        {trailing ? <Text style={[styles.sectionTrailing, { color: theme.colors.onSurfaceVariant }]}>{trailing}</Text> : null}
      </View>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>{children}</View>
    </View>
  );
}

type RowProps = {
  icon: string;
  title: string;
  description: string;
  /** A button row (the stores banner) ends in a caret instead of a radio or checkbox. */
  role: 'radio' | 'checkbox' | 'button';
  selected: boolean;
  /** The icon tile on lime; defaults to `selected`. */
  highlighted?: boolean;
  disabled?: boolean;
  first?: boolean;
  onPress: () => void;
};

function Row({ icon, title, description, role, selected, highlighted = selected, disabled = false, first = false, onPress }: RowProps) {
  const theme = useTheme();
  // The navigation bar's active indicator.
  const lime = useAppColors().highlight;
  return (
    <Fragment>
      {first ? null : <View style={[styles.hairline, { backgroundColor: theme.colors.background }]} />}
      <TouchableRipple
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={role}
        aria-checked={role === 'button' ? undefined : selected}
        accessibilityState={role === 'button' ? { disabled } : { checked: selected, disabled }}>
        <View style={styles.row}>
          <View
            style={[
              styles.tile,
              {
                backgroundColor: highlighted ? lime : theme.colors.surfaceVariant,
              },
            ]}>
            <Icon source={highlighted ? `${icon}-fill` : icon} size={18} color={highlighted ? theme.colors.onSurface : theme.colors.onSurfaceVariant} />
          </View>
          <View style={styles.rowText}>
            <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
              {title}
            </Text>
            <Text numberOfLines={1} style={[styles.rowDescription, { color: theme.colors.onSurfaceVariant }]}>
              {description}
            </Text>
          </View>
          {role === 'button' ? (
            <View style={styles.caret}>
              <Icon source="caret-right" size={18} color={theme.colors.onSurfaceVariant} />
            </View>
          ) : (
            <SelectionMark type={role} checked={selected} />
          )}
        </View>
      </TouchableRipple>
    </Fragment>
  );
}

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/** What Apply will show, e.g. "In-store · Koramangala", "In-store · 2 stores", "Online". */
function draftLabel({ channel, shopIds }: BusinessScope, shops: Shop[]) {
  const channelLabel = CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ?? 'All channels';
  if (channel === 'online') return channelLabel;
  const stores =
    shopIds.length === 0 ? 'All stores' : shopIds.length === 1 ? (shops.find((shop) => shop.id === shopIds[0])?.name ?? '1 store') : `${shopIds.length} stores`;
  return `${channelLabel} · ${stores}`;
}

// For sizing the sheet to its content.
/** Drag handle, header row and its divider (PanelSheet). */
const SHEET_CHROME = 36 + 52 + 1;
const SECTION_LABEL = 16 + 8;
const SECTION_GAP = 24;
const ROW_HEIGHT = 60;
/** The online note is two lines, a little taller than a row. */
const NOTE_EXTRA = 12;
/** Divider, padding and the Apply button; the bottom padding is added separately. */
const FOOTER_HEIGHT = 1 + PANEL_PADDING + 48;

const styles = StyleSheet.create({
  body: { padding: PANEL_PADDING, gap: SECTION_GAP },
  section: { gap: 8 },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  sectionTrailing: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  card: { borderRadius: Shape.max, overflow: 'hidden' },
  caret: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  noteText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  // Inset to start under the row's text, so the icon tiles read as one column.
  hairline: { height: 1, marginLeft: 12 + 32 + 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: ROW_HEIGHT,
    paddingLeft: 12,
    paddingRight: 4,
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: Shape.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  rowDescription: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  apply: { borderRadius: PANEL_INNER_RADIUS },
  applyContent: { height: 48 },
  applyLabel: { fontFamily: Fonts.medium, fontSize: 16 },
});
