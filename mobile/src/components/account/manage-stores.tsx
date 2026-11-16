import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { Tabs } from '@/components/material3/tabs';
import { DeviceSheet } from '@/components/products/terminal-devices';
import { TerminalImage } from '@/components/products/terminal-image';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CopyableValue } from '@/components/shared/copyable-value';
import { getDefaultDateRangePresets, makeDateRangeValue } from '@/components/shared/date-range-filter';
import { CollapsingDetailScreen, DETAIL_FOOTER_BUTTON_RADIUS } from '@/components/shared/detail-screen';
import { ListingCard, ListingRows } from '@/components/listing-hero/listing-card';
import { useListDates } from '@/components/listing-hero/time-scope';
import { LazyListFooter, useLazyList } from '@/components/shared/lazy-list';
import { initialsOf, ListCard, ListRow, ListRowLine, ListingToolbar, RowMark, selectFilter } from '@/components/shared/listing';
import { PANEL_INNER_RADIUS, PanelSection, PanelSheet } from '@/components/shared/panel-sheet';
import { QR_BACKGROUND_SWATCHES, QrPreview } from '@/components/shared/qr-preview';
import { DotStatusBadge } from '@/components/shared/status';
import { TabScreen } from '@/components/tab-screen';
import { Fonts } from '@/constants/theme';
import { LISTING_HERO_LAYOUT } from '@/constants/experiments';
import { CURRENT_USER } from '@/data/businesses';
import { STORE_RECORDS, type StoreRecord } from '@/data/stores';
import {
  type DeviceMode,
  getDeviceRows,
  recordModeChange,
  type TerminalDeviceRow,
  toggleDeviceStatus,
} from '@/data/terminal-devices';
import { setUserStatus, useUserManagement } from '@/data/user-management';
import { parseDisplayDate } from '@/data/transactions';
import { type RosterEntry, usersForStore } from '@/data/user-roster';
import { useToast } from '@/hooks/use-toast';

import { UserStatusBadge } from './account-ui';
import { UserFormSheet, UserSheet } from './users-roles';

/** Mock VPA shared with every other merchant-details surface (web: STORE_UPI_ID). */
const STORE_UPI_ID = '6352699747@ptyes';
const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function ActiveBadge({ active }: { active: boolean }) {
  return <DotStatusBadge label={active ? 'Active' : 'Inactive'} tone={active ? 'success' : 'neutral'} />;
}

/**
 * What tells one store from the next. Every store shares the brand prefix
 * ("PineLabs - Sector 35"), so the mark is the part after it: the sector or
 * outlet number, else the initials ("Noida Kiosk" -> NK).
 */
export function storeMark(name: string) {
  const own = name.split(' - ').pop()?.trim() ?? name;
  const number = own.match(/\d+[A-Za-z]?$/);
  if (number) return number[0];
  return own
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StoreMark({ name }: { name: string }) {
  return <RowMark label={storeMark(name)} />;
}

/**
 * Manage stores (web: ManageStoresSection list): search, date and status
 * filters, and each store with its address, created date, store ID,
 * terminals linked and users invited. Rows open the store.
 */
export function ManageStores() {
  const theme = useTheme();
  const presets = useMemo(() => getDefaultDateRangePresets(), []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState(() => makeDateRangeValue(presets, 'today'));
  const lazy = useLazyList();
  const created = useListDates(STORE_RECORDS, (store) => parseDisplayDate(store.createdOnDate, store.createdOnTime), {
    subject: 'stores added',
    presets: ['all', '30d', '90d'],
    initial: 'all',
    onChange: lazy.reset,
  });
  const muted = { color: theme.colors.onSurfaceVariant };

  const query = search.trim().toLowerCase();
  const stores = STORE_RECORDS.filter((store) => {
    if (status !== 'all' && store.status.toLowerCase() !== status) return false;
    return !query || `${store.name} ${store.storeId} ${store.merchantId}`.toLowerCase().includes(query);
  });

  const renderStore = (store: StoreRecord) => (
    <ListRow
      key={store.id}
      icon={<StoreMark name={store.name} />}
      onPress={() => router.push({ pathname: '/stores/[storeId]', params: { storeId: store.storeId } })}
      accessibilityLabel={`${store.name}, ${store.status}`}>
      {/* Key details only: address, Store ID, merchant ID, devices and users are on the store's page. */}
      <ListRowLine
        left={
          <>
            <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
              {store.name}
            </Text>
            <Text style={[styles.rowSub, muted]} numberOfLines={1}>
              {store.address}
            </Text>
          </>
        }
        right={<ActiveBadge active={store.status === 'Active'} />}
        centered
      />
    </ListRow>
  );

  if (LISTING_HERO_LAYOUT) {
    // The listing format (constants/experiments.ts): search, filters and the store's own dates in one card, stores A–Z (not grouped).
    const shown = created.inRange.filter((store) => {
      if (status !== 'all' && store.status.toLowerCase() !== status) return false;
      return !query || `${store.name} ${store.storeId} ${store.merchantId}`.toLowerCase().includes(query);
    });
    const loaded = [...shown].sort((a, b) => a.name.localeCompare(b.name)).slice(0, lazy.count);
    const noun = { one: 'store', other: 'stores' };
    return (
      <TabScreen tab="stores">
        <ListingCard
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            lazy.reset();
          }}
          searchPlaceholder="Search store"
          time={created.scope}
          filters={[
            selectFilter({
              label: 'Status',
              options: STATUS_OPTIONS,
              value: status,
              onApply: (value) => {
                setStatus(value);
                lazy.reset();
              },
            }),
          ]}
          totals={{ all: created.inRange.length, shown: shown.length }}
          noun={noun}>
          {/* Not grouped: the stores share a city and a status, so no grouping would tell them apart. */}
          <ListingRows empty={created.inRange.length ? 'No stores match. Try clearing the search or filters.' : 'No stores added in these dates.'}>
            {loaded.map(renderStore)}
          </ListingRows>
          <LazyListFooter lazy={lazy} total={shown.length} noun="stores" />
        </ListingCard>
      </TabScreen>
    );
  }

  return (
    <TabScreen tab="stores">
      <ListingToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          lazy.reset();
        }}
        searchPlaceholder="Search store"
        filters={[
          { type: 'date', presets, value: dateRange, onApply: setDateRange, initialPresetId: 'today' },
          selectFilter({
            label: 'Status',
            options: STATUS_OPTIONS,
            value: status,
            onApply: (value) => {
              setStatus(value);
              lazy.reset();
            },
          }),
        ]}
      />
      <ListCard empty="No stores found for current filters.">
        {stores.slice(0, lazy.count).map(renderStore)}
      </ListCard>
      <LazyListFooter lazy={lazy} total={stores.length} noun="stores" />
    </TabScreen>
  );
}

/** View & edit store QR (web: StoreQrPanel): store, colour theme, the branded QR, Order and Download. */
function StoreQrSheet({ visible, onDismiss, store }: { visible: boolean; onDismiss: () => void; store: StoreRecord }) {
  const theme = useTheme();
  const toast = useToast();
  const [background, setBackground] = useState<string>(QR_BACKGROUND_SWATCHES[0]);
  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title="View & edit store QR"
      footer={
        <View style={styles.sheetFooter}>
          <Button
            mode="outlined"
            onPress={() => toast('Store QR stickers are coming to the app soon')}
            textColor={theme.colors.onSurface}
            style={[styles.flexButton, { borderColor: theme.colors.outlineVariant }]}>
            Order store QR
          </Button>
          <Button mode="contained" icon="download-simple" onPress={() => toast('Downloading store QR...')} style={styles.flexButton}>
            Download QR
          </Button>
        </View>
      }>
      <PanelSection>
        <Text style={styles.storeName}>{store.name}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {store.address}
        </Text>
        <TouchableRipple
          onPress={() => {
            onDismiss();
            router.navigate('/payments');
          }}
          accessibilityRole="link"
          borderless
          style={styles.link}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            View transactions on this QR
          </Text>
        </TouchableRipple>
      </PanelSection>
      <PanelSection last>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Select preferred theme
        </Text>
        <View style={styles.swatches}>
          {QR_BACKGROUND_SWATCHES.map((swatch) => {
            const selected = background === swatch;
            return (
              <TouchableRipple
                key={swatch}
                onPress={() => setBackground(swatch)}
                accessibilityRole="radio"
                aria-checked={selected}
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`Use ${swatch} background`}
                borderless
                style={[styles.swatchRing, { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant }]}>
                <View style={[styles.swatch, { backgroundColor: swatch }]} />
              </TouchableRipple>
            );
          })}
        </View>
        <QrPreview seed={`${store.storeId}-${STORE_UPI_ID}-${background}`} backgroundColor={background} upiId={STORE_UPI_ID} radius={PANEL_INNER_RADIUS} />
      </PanelSection>
    </PanelSheet>
  );
}

/**
 * Store details (Figma 7693:84172 / 7693:85370): the store's mark, name,
 * address, status and Store ID, then Devices (n) / Users (n) tabs in one card.
 * A device opens its details sheet; a user opens User details (Deactivate,
 * Edit details). The footer is always Store QR code + Add user, which opens
 * Invite user with this store's access already picked. No Add device — as on
 * Manage devices, terminals come from Pine Labs.
 */
export function StoreDetail({ store }: { store: StoreRecord }) {
  const theme = useTheme();
  const toast = useToast();
  const { roster, roleCatalog } = useUserManagement();
  const [tab, setTab] = useState('devices');
  const [devices, setDevices] = useState<TerminalDeviceRow[]>(() => getDeviceRows().filter((row) => row.storeId === store.storeId));
  const [sheet, setSheet] = useState<'qr' | 'invite' | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RosterEntry | null>(null);
  const [deactivating, setDeactivating] = useState<RosterEntry | null>(null);
  const users = usersForStore(store.storeId, roster);
  const muted = { color: theme.colors.onSurfaceVariant };
  const active = store.status === 'Active';

  const changeMode = (device: TerminalDeviceRow) => {
    const next: DeviceMode = device.mode === 'Standalone' ? 'Integrated' : 'Standalone';
    const result = recordModeChange(device.id, next, CURRENT_USER.name, CURRENT_USER.roleLabel);
    if (!result) return;
    setDevices((current) => current.map((row) => (row.id === device.id ? result.device : row)));
    toast(`${device.model} switched to ${next}`);
  };
  const toggleStatus = (device: TerminalDeviceRow) => {
    const updated = toggleDeviceStatus(device.id);
    if (!updated) return;
    setDevices((current) => current.map((row) => (row.id === device.id ? updated : row)));
    toast(updated.status === 'Active' ? 'Device reactivated successfully' : 'Device deactivated successfully', { success: true });
  };
  const selectedDevice = devices.find((row) => row.id === selectedDeviceId) ?? null;
  const selectedUser = users.find((row) => row.id === selectedUserId) ?? null;

  // Laid out like Payment and Settlement details: a centred hero that collapses into the header.
  const hero = (
    <View style={styles.hero}>
      <View style={[styles.markTile, { backgroundColor: theme.colors.surface }]}>
        <StoreMark name={store.name} />
      </View>
      <Text style={[styles.storeName, { color: theme.colors.onSurface }]}>{store.name}</Text>
      {/* Where it is, then its badges. The merchant ID lives with the organisation, in the profile. */}
      <Text variant="bodyMedium" style={[styles.meta, muted]}>
        {store.address}
      </Text>
      <View style={styles.heroPills}>
        <ActiveBadge active={active} />
        <CopyableValue variant="pill" value={store.storeId} label={`Store ID: ${store.storeId}`} />
      </View>
    </View>
  );

  // Devices / Users tabs head the listing, as Transactions included heads Settlement details' list.
  const tabs = (
    <Tabs
      tabs={[
        { key: 'devices', label: `Devices (${devices.length})` },
        { key: 'users', label: `Users (${users.length})` },
      ]}
      activeKey={tab}
      onChange={setTab}
      variant="card"
    />
  );

  return (
    <CollapsingDetailScreen
      fallbackHref="/stores"
      hero={hero}
      compactTitle={store.name}
      compactSubtitle={`Store ID ${store.storeId}`}
      footer={
        <>
          <Button
            mode="outlined"
            onPress={() => setSheet('qr')}
            textColor={theme.colors.onSurface}
            style={[styles.footerButton, { borderColor: theme.colors.outlineVariant }]}>
            Store QR code
          </Button>
          <Button mode="contained" icon="plus" onPress={() => setSheet('invite')} style={styles.footerButton}>
            Add user
          </Button>
        </>
      }>
      <View style={styles.cards}>
        {tab === 'devices' ? (
          <ListCard header={tabs} empty="No devices linked to this store.">
            {devices.map((row) => (
              <ListRow
                key={row.id}
                icon={<TerminalImage size={40} inactive={row.status === 'Inactive'} />}
                onPress={() => setSelectedDeviceId(row.id)}
                accessibilityLabel={`${row.model}, ${row.mode}, ${row.status}. Open details`}>
                <ListRowLine
                  left={
                    <>
                      <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                        {row.model}
                      </Text>
                      <Text numberOfLines={1} style={[styles.rowSub, muted]}>
                        {row.mode} • {row.posId}
                      </Text>
                    </>
                  }
                  right={<ActiveBadge active={row.status === 'Active'} />}
                  centered
                />
              </ListRow>
            ))}
          </ListCard>
        ) : (
          <ListCard header={tabs} empty="No users assigned to this store.">
            {users.map((row) => (
              <ListRow
                key={row.id}
                icon={<RowMark label={initialsOf(row.name)} />}
                onPress={() => setSelectedUserId(row.id)}
                accessibilityLabel={`${row.name}, ${row.role}, ${row.status}. Open details`}>
                <ListRowLine
                  left={
                    <>
                      <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                        {row.name}
                      </Text>
                      <Text numberOfLines={1} style={[styles.rowSub, muted]}>
                        {row.role} • {row.email}
                      </Text>
                    </>
                  }
                  right={<UserStatusBadge status={row.status} />}
                  centered
                />
              </ListRow>
            ))}
          </ListCard>
        )}
      </View>

      <DeviceSheet device={selectedDevice} onDismiss={() => setSelectedDeviceId(null)} onChangeMode={changeMode} onToggleStatus={toggleStatus} />
      <UserSheet
        entry={selectedUser}
        permissionKeys={roleCatalog.find((entry) => entry.name === selectedUser?.role)?.permissionKeys ?? []}
        onEdit={setEditing}
        onDeactivate={setDeactivating}
        onReactivate={(entry) => {
          setUserStatus(entry.id, 'Active');
          toast(`${entry.name} reactivated`);
        }}
        onRemind={(entry) => toast(`Reminder sent to ${entry.email}`)}
        onDismiss={() => setSelectedUserId(null)}
      />
      <StoreQrSheet visible={sheet === 'qr'} onDismiss={() => setSheet(null)} store={store} />
      <UserFormSheet
        visible={sheet === 'invite' || editing !== null}
        onDismiss={() => {
          setSheet(null);
          setEditing(null);
        }}
        entry={editing}
        initialStoreIds={[store.storeId]}
        onDone={(message) => toast(message)}
      />
      <ConfirmDialog
        visible={deactivating !== null}
        onDismiss={() => setDeactivating(null)}
        title={`Deactivate ${deactivating?.name ?? ''}?`}
        description="This user's access will be deactivated immediately. You can reactivate them later from their details."
        confirmLabel="Deactivate user"
        onConfirm={() => {
          if (!deactivating) return;
          setUserStatus(deactivating.id, 'Deactivated');
          toast(`${deactivating.name} deactivated — access revoked`);
        }}
        destructive
      />
    </CollapsingDetailScreen>
  );
}

const styles = StyleSheet.create({
  medium: { fontFamily: Fonts.medium },
  // Same hero as Settlement details: tile, name, status beside the ID, then where it is.
  hero: { gap: 10, alignItems: 'center', paddingBottom: 8 },
  // Figma 7693:85393: a 40dp white circle with the 12dp mark.
  markTile: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  rowSub: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  storeName: { fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 28, textAlign: 'center' },
  heroPills: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontFamily: Fonts.regular, lineHeight: 22, textAlign: 'center' },
  cards: { gap: 8 },
  link: { alignSelf: 'flex-start', borderRadius: PANEL_INNER_RADIUS, paddingVertical: 4 },
  swatches: { flexDirection: 'row', gap: 8 },
  swatchRing: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 8 },
  sheetFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  flexButton: { flex: 1, borderRadius: PANEL_INNER_RADIUS },
  panelButton: { borderRadius: PANEL_INNER_RADIUS },
  footerButton: { flex: 1, borderRadius: DETAIL_FOOTER_BUTTON_RADIUS },
});
