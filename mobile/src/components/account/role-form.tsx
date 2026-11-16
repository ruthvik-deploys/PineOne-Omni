import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { DETAIL_FOOTER_BUTTON_RADIUS, DetailScreen } from '@/components/shared/detail-screen';
import { SheetLabel } from '@/components/shared/panel-sheet';
import { SelectionMark } from '@/components/shared/selection-mark';
import { SheetField } from '@/components/shared/sheet-parts';
import { PAGE_PADDING } from '@/components/tab-screen';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { ALL_PERMISSIONS, type Permission, PERMISSION_GROUPS, type PermissionChannel } from '@/data/roles';
import { getUserManagement, permissionSetsEqual, saveRole, useUserManagement } from '@/data/user-management';
import { useToast } from '@/hooks/use-toast';

import { GROUP_ICON } from './account-ui';

/** A permission (or Select all): its name, and the app's checkbox at the end; the whole row toggles it. */
function CheckRow({ label, checked, onPress, strong = false }: { label: string; checked: boolean; onPress: () => void; strong?: boolean }) {
  const theme = useTheme();
  return (
    <TouchableRipple onPress={onPress} accessibilityRole="checkbox" aria-checked={checked} accessibilityState={{ checked }} accessibilityLabel={label} borderless style={styles.checkRow}>
      <View style={styles.checkContent}>
        <Text style={[styles.flex, strong ? styles.medium : styles.body, { color: theme.colors.onSurface }]}>{label}</Text>
        <SelectionMark type="checkbox" checked={checked} />
      </View>
    </TouchableRipple>
  );
}

/**
 * Create / edit role (web: CreateRolePage): role name and description (both
 * checked for duplicates), then In-store and Online permissions — each with
 * search, Select all, and the permissions grouped by area. `roleId` edits a
 * custom role; `cloneId` starts from an existing role's permissions.
 */
export function RoleForm({ roleId, cloneId }: { roleId?: string; cloneId?: string }) {
  const theme = useTheme();
  const toast = useToast();
  const { roleCatalog } = useUserManagement();
  const editing = roleId ? roleCatalog.find((role) => role.id === roleId) : undefined;
  const [initial] = useState(() => {
    const catalog = getUserManagement().roleCatalog;
    const edit = roleId ? catalog.find((role) => role.id === roleId) : undefined;
    if (edit) return { name: edit.name, description: edit.description, permissionKeys: edit.permissionKeys };
    const clone = cloneId ? catalog.find((role) => role.id === cloneId) : undefined;
    if (clone) return { name: `${clone.name} (Custom)`, description: clone.description, permissionKeys: clone.permissionKeys };
    return { name: '', description: '', permissionKeys: [] as string[] };
  });
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [selected, setSelected] = useState<string[]>(initial.permissionKeys);
  const [searches, setSearches] = useState<Record<PermissionChannel, string>>({ offline: '', online: '' });
  const [collapsed, setCollapsed] = useState<PermissionChannel[]>([]);
  const muted = { color: theme.colors.onSurfaceVariant };

  const trimmed = name.trim();
  const duplicateName = trimmed ? roleCatalog.find((role) => role.id !== editing?.id && role.name.trim().toLowerCase() === trimmed.toLowerCase()) : undefined;
  const duplicatePermissions =
    selected.length > 0 ? roleCatalog.find((role) => role.id !== editing?.id && permissionSetsEqual(role.permissionKeys, selected)) : undefined;
  const canSave = Boolean(trimmed) && selected.length > 0 && !duplicateName && !duplicatePermissions;

  const toggle = (key: string) => setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  const toggleMany = (permissions: Permission[], checked: boolean) => {
    const keys = permissions.map((permission) => permission.key);
    setSelected((current) => (checked ? Array.from(new Set([...current, ...keys])) : current.filter((key) => !keys.includes(key))));
  };

  const save = () => {
    if (!canSave) return;
    const result = saveRole({ name: trimmed, description: description.trim(), permissionKeys: selected }, editing?.id);
    toast('error' in result ? result.error : result.message);
    if (!('error' in result)) {
      if (router.canGoBack()) router.back();
      else router.replace('/users');
    }
  };

  const channelSection = (channel: PermissionChannel, label: string, icon: string) => {
    const all = ALL_PERMISSIONS.filter((permission) => permission.channel === channel);
    const selectedCount = all.filter((permission) => selected.includes(permission.key)).length;
    const allSelected = all.length > 0 && selectedCount === all.length;
    const query = searches[channel].trim().toLowerCase();
    const filtered = query ? all.filter((permission) => `${permission.label} ${permission.group}`.toLowerCase().includes(query)) : all;
    const groups = PERMISSION_GROUPS.map((group) => ({ group, permissions: filtered.filter((permission) => permission.group === group) })).filter(
      (section) => section.permissions.length > 0
    );
    const open = !collapsed.includes(channel);
    const rule = { backgroundColor: theme.colors.background };

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Pressable
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
            setCollapsed((current) => (open ? [...current, channel] : current.filter((key) => key !== channel)));
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${label}, ${selectedCount} of ${all.length} selected`}
          style={styles.cardHeader}>
          <Icon source={icon} size={24} color={theme.colors.onSurface} />
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{label}</Text>
            <Text style={[styles.small, muted]}>
              {selectedCount} of {all.length} selected
            </Text>
          </View>
          <Icon source={open ? 'caret-up' : 'caret-down'} size={20} color={theme.colors.onSurface} />
        </Pressable>
        {open ? (
          <View style={[styles.cardBody, { borderTopColor: theme.colors.background }]}>
            <SheetField
              value={searches[channel]}
              onChangeText={(value) => setSearches((current) => ({ ...current, [channel]: value }))}
              placeholder="Search permission"
              prefix="magnifying-glass"
            />
            <CheckRow label="Select all" strong checked={allSelected} onPress={() => toggleMany(all, !allSelected)} />
            {groups.length === 0 ? (
              <Text style={[styles.body, muted]}>No permissions match this search.</Text>
            ) : (
              groups.map(({ group, permissions }) => (
                <View key={group} style={styles.group}>
                  <View style={styles.groupHead}>
                    <Icon source={GROUP_ICON[group] ?? 'hard-drives'} size={14} color={theme.colors.onSurfaceVariant} />
                    <SheetLabel label={group} />
                  </View>
                  {permissions.map((permission, index) => (
                    <Fragment key={permission.key}>
                      {index > 0 ? <View style={[styles.hairline, rule]} /> : null}
                      <CheckRow label={permission.label} checked={selected.includes(permission.key)} onPress={() => toggle(permission.key)} />
                    </Fragment>
                  ))}
                </View>
              ))
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <DetailScreen
      title={editing ? 'Edit custom role' : 'Create new role'}
      fallbackHref="/users"
      footer={
        <Button mode="contained" disabled={!canSave} onPress={save} style={styles.footerButton} contentStyle={styles.footerContent} labelStyle={styles.footerLabel}>
          {editing ? 'Save changes' : 'Save role and permissions'}
        </Button>
      }>
      <View style={styles.stack}>
        <View style={[styles.card, styles.details, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Role details</Text>
          <SheetField
            label="Role name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Store supervisor"
            error={duplicateName ? `A role named "${duplicateName.name}" already exists` : undefined}
          />
          <SheetField label="Description" value={description} onChangeText={setDescription} placeholder="What this role is for" />
        </View>
        {duplicatePermissions ? (
          <View style={[styles.note, { backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.16)' : '#fef2f2' }]}>
            <Icon source="warning-circle" size={18} color={theme.colors.error} />
            <Text style={[styles.small, styles.flex, { color: theme.colors.error }]}>
              &quot;{duplicatePermissions.name}&quot; already has these permissions. Change at least one to save a new role.
            </Text>
          </View>
        ) : null}
        {channelSection('offline', 'In-store permissions', 'storefront')}
        {channelSection('online', 'Online permissions', 'globe')}
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // As Settlement preferences: white cards 8dp apart, 8dp under the bar.
  stack: { gap: 8, marginTop: PAGE_PADDING },
  card: { borderRadius: Shape.max, overflow: 'hidden' },
  details: { padding: 12, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  cardBody: { borderTopWidth: 1, padding: 12, gap: 12 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  medium: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  group: { gap: 4 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 8 },
  checkRow: { borderRadius: Shape.small },
  checkContent: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 4 },
  hairline: { height: 1, marginLeft: 4 },
  note: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Shape.small },
  footerButton: { flex: 1, borderRadius: DETAIL_FOOTER_BUTTON_RADIUS },
  footerContent: { height: 32 },
  footerLabel: { marginHorizontal: 8, marginVertical: 0, fontSize: 14, lineHeight: 20 },
});
