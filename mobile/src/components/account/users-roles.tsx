import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';

import { useShellTabs } from '@/components/shell-tabs';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { OutlinedActionButton } from '@/components/shared/controls';
import { DetailScreen } from '@/components/shared/detail-screen';
import { FormField, FormTextInput } from '@/components/shared/form-fields';
import { ListingCard, ListingRows } from '@/components/listing-hero/listing-card';
import { useListDates } from '@/components/listing-hero/time-scope';
import { initialsOf, LIST_ROW_INNER_RADIUS, ListCard, ListRow, ListRowLine, ListingToolbar, RowMark, selectFilter } from '@/components/shared/listing';
import { LazyListFooter, useLazyList } from '@/components/shared/lazy-list';
import { PANEL_INNER_RADIUS, PanelSection, PanelSheet, SHEET_BUTTON } from '@/components/shared/panel-sheet';
import { SheetBlock, SheetButton } from '@/components/shared/sheet-parts';
import { PAGE_PADDING, TabScreen } from '@/components/tab-screen';
import { LISTING_HERO_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { computeAccessScope } from '@/data/roles';
import {
  assignedUserCount,
  deleteRole,
  inviteUser,
  type ManagedRole,
  permissionsForRole,
  reassignAndDeleteRole,
  removeRosterEntry,
  roleNeedsStoreAccess,
  setUserStatus,
  updateUser,
  useUserManagement,
} from '@/data/user-management';
import { parseDisplayDate } from '@/data/transactions';
import type { RosterEntry } from '@/data/user-roster';
import { useToast } from '@/hooks/use-toast';

import { AccessScopeBadge, PermissionAccordions, RoleBadge, RoleSelectField, RoleTypeChip, StoreAccessField, UserStatusBadge } from './account-ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'Active', label: 'Active' },
  { value: 'Invited', label: 'Invited' },
  { value: 'Deactivated', label: 'Deactivated' },
];

type UserForm = { name: string; firstName: string; lastName: string; email: string; phone: string; role: string; storeIds: string[] };

/**
 * Invite user / Edit user details (Figma 7699:4396 / 7693:109191): first and
 * last name, email (checked against the roster), phone, role (grouped
 * picker), store access for in-store roles, then what the role grants as
 * In-store and Online permission accordions; one full-width button.
 */
export function UserFormSheet({
  visible,
  onDismiss,
  entry,
  initialStoreIds = [],
  onDone,
}: {
  visible: boolean;
  onDismiss: () => void;
  /** Editing this user; null = inviting a new one. */
  entry: RosterEntry | null;
  /** Store access to start an invite with, e.g. the store it was opened from. */
  initialStoreIds?: string[];
  onDone: (message: string, isError?: boolean) => void;
}) {
  const theme = useTheme();
  const { roster, roleCatalog } = useUserManagement();
  const empty: UserForm = { name: '', firstName: '', lastName: '', email: '', phone: '', role: roleCatalog[0]?.name ?? '', storeIds: [] };
  const [form, setForm] = useState<UserForm>(empty);
  // Re-seed each time the panel opens (adjusting state during render).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const [firstName = '', ...rest] = entry?.name.trim().split(/\s+/) ?? [];
      setForm(
        entry
          ? { ...empty, name: entry.name, firstName, lastName: rest.join(' '), email: entry.email, phone: entry.phone ?? '', role: entry.role, storeIds: entry.storeIds ?? [] }
          : { ...empty, storeIds: initialStoreIds }
      );
    }
  }
  const set = <K extends keyof UserForm>(key: K, value: UserForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const editing = entry !== null;
  const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
  // A last name is optional when editing: some people on the roster have one name.
  const nameValid = form.firstName.trim().length > 0 && (editing || form.lastName.trim().length > 0);
  const normalizedEmail = form.email.trim().toLowerCase();
  const emailValid = EMAIL_PATTERN.test(normalizedEmail);
  const selectedRole = roleCatalog.find((role) => role.name === form.role);
  const needsStores = roleNeedsStoreAccess(selectedRole);
  const existing = emailValid ? roster.find((row) => row.id !== entry?.id && row.email.trim().toLowerCase() === normalizedEmail) : undefined;
  const emailError = !existing
    ? null
    : editing
      ? `This email already belongs to ${existing.name}.`
      : existing.status === 'Active'
        ? 'This email already belongs to an active user.'
        : existing.status === 'Invited'
          ? 'An invite is already pending for this email.'
          : existing.status === 'Pending'
            ? 'This person already has a pending access request.'
            : 'This user was previously deactivated — reactivate them from the Users list instead of inviting again.';
  const canSave = nameValid && emailValid && Boolean(form.role) && !emailError;

  const save = () => {
    if (!canSave) return;
    const storeIds = needsStores ? form.storeIds : [];
    if (entry) {
      updateUser(entry.id, {
        name: fullName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        scope: selectedRole ? computeAccessScope(selectedRole.permissionKeys) : entry.scope,
        storeIds,
      });
      onDone('User updated');
    } else {
      const result = inviteUser({
        name: fullName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        storeIds,
      });
      if ('error' in result) onDone(result.error, true);
      else onDone(result.message);
    }
    onDismiss();
  };

  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title={editing ? 'Edit user details' : 'Invite user'}
      footer={<SheetButton label={editing ? 'Save details' : 'Invite user'} disabled={!canSave} onPress={save} />}>
      <SheetBlock gap={16}>
        <View style={styles.grid}>
          <View style={styles.half}>
            <FormField label="First name">
              <FormTextInput value={form.firstName} onChangeText={(value) => set('firstName', value)} placeholder="Priya" accessibilityLabel="First name" />
            </FormField>
          </View>
          <View style={styles.half}>
            <FormField label="Last name">
              <FormTextInput value={form.lastName} onChangeText={(value) => set('lastName', value)} placeholder="Singh" accessibilityLabel="Last name" />
            </FormField>
          </View>
        </View>
        <FormField label="User email">
          <FormTextInput
            value={form.email}
            onChangeText={(value) => set('email', value)}
            placeholder="Enter user email"
            keyboardType="email-address"
            accessibilityLabel="User email"
          />
          {emailError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {emailError}
            </Text>
          ) : null}
        </FormField>
        <FormField label="Phone number">
          <FormTextInput
            value={form.phone}
            onChangeText={(value) => set('phone', value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            accessibilityLabel="Phone number"
          />
        </FormField>
        <FormField label="User role">
          <RoleSelectField roleName={form.role} onChange={(role) => set('role', role)} roleCatalog={roleCatalog} />
        </FormField>
        {needsStores ? (
          <FormField label="Store access">
            <StoreAccessField storeIds={form.storeIds} onChange={(ids) => set('storeIds', ids)} />
          </FormField>
        ) : null}
      </SheetBlock>
      <PermissionAccordions permissionKeys={selectedRole?.permissionKeys ?? []} last />
    </PanelSheet>
  );
}

/** A role's granted permissions by channel, with Clone and (custom roles) Edit (web: ViewRolePermissionsSheet). */
function ViewRoleSheet({ role, onDismiss, onDelete }: { role: ManagedRole | null; onDismiss: () => void; onDelete: (role: ManagedRole) => void }) {
  const theme = useTheme();
  const permissions = role ? permissionsForRole(role) : [];
  const sections = [
    { label: 'In-store', icon: 'storefront', items: permissions.filter((permission) => permission.channel === 'offline') },
    { label: 'Online', icon: 'globe', items: permissions.filter((permission) => permission.channel === 'online') },
  ].filter((section) => section.items.length > 0);
  const openForm = (params: { roleId?: string; cloneId?: string }) => {
    onDismiss();
    router.push({ pathname: '/users/role', params });
  };

  return (
    <PanelSheet
      visible={role !== null}
      onDismiss={onDismiss}
      title={role?.name ?? ''}
      footer={
        role ? (
          <View style={styles.sheetActions}>
            {role.roleType === 'custom' ? (
              <Button mode="contained" icon="pencil-simple" onPress={() => openForm({ roleId: role.id })} {...SHEET_BUTTON}>
                Edit this role
              </Button>
            ) : null}
            <Button
              mode={role.roleType === 'custom' ? 'outlined' : 'contained'}
              icon="copy"
              onPress={() => openForm({ cloneId: role.id })}
              textColor={role.roleType === 'custom' ? theme.colors.onSurface : undefined}
              {...SHEET_BUTTON}
              style={[SHEET_BUTTON.style, role.roleType === 'custom' && { borderColor: theme.colors.outlineVariant }]}>
              Create new role from this
            </Button>
            {role.roleType === 'custom' ? (
              <Button
                mode="outlined"
                icon="trash"
                onPress={() => {
                  onDismiss();
                  setTimeout(() => onDelete(role), 250);
                }}
                textColor={theme.colors.error}
                {...SHEET_BUTTON}
                style={[SHEET_BUTTON.style, { borderColor: theme.colors.outlineVariant }]}>
                Delete role
              </Button>
            ) : null}
          </View>
        ) : undefined
      }>
      {role ? (
        <PanelSection label="About">
          <Text variant="bodyMedium">{role.description}</Text>
          <View style={styles.badges}>
            <RoleTypeChip roleType={role.roleType} />
            <AccessScopeBadge scope={computeAccessScope(role.permissionKeys)} />
          </View>
        </PanelSection>
      ) : null}
      {sections.length === 0 ? (
        <PanelSection last>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            No permissions.
          </Text>
        </PanelSection>
      ) : (
        sections.map((section, index) => (
          <PanelSection key={section.label} last={index === sections.length - 1}>
            <View style={styles.inline}>
              <Icon source={section.icon} size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelMedium" style={[styles.overline, { color: theme.colors.onSurfaceVariant }]}>
                {section.label.toUpperCase()}
              </Text>
            </View>
            {section.items.map((permission) => (
              <View key={permission.key} style={styles.inline}>
                <Icon source="check" size={14} color="#10b981" />
                <Text variant="bodyMedium">{permission.label}</Text>
              </View>
            ))}
          </PanelSection>
        ))
      )}
    </PanelSheet>
  );
}

function UsersTab({ onEdit, onConfirm }: { onEdit: (entry: RosterEntry) => void; onConfirm: (target: ConfirmTarget) => void }) {
  const theme = useTheme();
  const toast = useToast();
  const { roster, roleCatalog } = useUserManagement();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const lazy = useLazyList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const muted = { color: theme.colors.onSurfaceVariant };

  const listed = roster.filter((entry) => entry.status !== 'Pending');
  const pendingCount = roster.length - listed.length;
  const roleOptions = [{ value: 'all', label: 'All roles' }, ...Array.from(new Set(listed.map((row) => row.role))).sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }))];
  const query = search.trim().toLowerCase();
  const rows = listed.filter((row) => {
    if (status !== 'all' && row.status !== status) return false;
    if (role !== 'all' && row.role !== role) return false;
    return !query || `${row.name} ${row.email}`.toLowerCase().includes(query);
  });
  const loaded = rows.slice(0, lazy.count);
  const invited = useListDates(listed, (row) => parseDisplayDate(row.addedOnDate, row.addedOnTime), {
    subject: 'users invited',
    presets: ['all', '30d', '90d'],
    initial: 'all',
    onChange: lazy.reset,
  });
  const resetList = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    lazy.reset();
  };

  // Four things per person — who, how to reach them, their role, whether they're in; the rest is in their sheet.
  const renderUser = (row: RosterEntry) => {
    const dim = row.status === 'Deactivated' ? styles.dim : null;
    return (
      <ListRow key={row.id} icon={<RowMark label={initialsOf(row.name)} />} onPress={() => setSelectedId(row.id)} accessibilityLabel={`${row.name}, ${row.role}, ${row.status}. Open details`}>
        <View style={dim}>
          <ListRowLine
            left={
              <>
                <Text variant="bodyMedium" numberOfLines={1} style={styles.medium}>
                  {row.name}
                </Text>
                <Text variant="bodySmall" numberOfLines={1} style={muted}>
                  {row.role} • {row.email}
                </Text>
              </>
            }
            right={<UserStatusBadge status={row.status} />}
            centered
          />
        </View>
      </ListRow>
    );
  };
  const selectedUser = roster.find((entry) => entry.id === selectedId) ?? null;
  const userSheet = (
    <UserSheet
      entry={selectedUser}
      permissionKeys={roleCatalog.find((entry) => entry.name === selectedUser?.role)?.permissionKeys ?? []}
      onEdit={onEdit}
      onDeactivate={(entry) => onConfirm({ type: entry.status === 'Invited' ? 'cancelInvite' : 'removeUser', entry })}
      onReactivate={(entry) => {
        setUserStatus(entry.id, 'Active');
        toast(`${entry.name} reactivated`);
      }}
      onRemind={(entry) => toast(`Reminder sent to ${entry.email}`)}
      onDismiss={() => setSelectedId(null)}
    />
  );

  if (LISTING_HERO_LAYOUT) {
    // The listing format (constants/experiments.ts): one card for search, filters and dates; people A–Z, not grouped.
    const shown = invited.inRange.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (role !== 'all' && row.role !== role) return false;
      return !query || `${row.name} ${row.email}`.toLowerCase().includes(query);
    });
    // Not grouped (user decision): everyone once, A–Z; the stores someone works in are in their sheet.
    const shownLoaded = [...shown].sort((x, y) => x.name.localeCompare(y.name)).slice(0, lazy.count);
    const noun = { one: 'user', other: 'users' };
    return (
      <ListingCard
        search={search}
        onSearchChange={resetList(setSearch)}
        searchPlaceholder="Search by name or email ID"
        time={invited.scope}
        filters={[
          selectFilter({ label: 'Status', options: STATUS_OPTIONS, value: status, onApply: resetList(setStatus) }),
          selectFilter({ label: 'Role', options: roleOptions, value: role, onApply: resetList(setRole) }),
        ]}
        totals={{ all: invited.inRange.length, shown: shown.length }}
        noun={noun}>
        <ListingRows empty={invited.inRange.length ? 'No users match. Try clearing the search or filters.' : 'No users invited in these dates.'}>
          {shownLoaded.map(renderUser)}
        </ListingRows>
        <LazyListFooter lazy={lazy} total={shown.length} noun="users" />
        {userSheet}
      </ListingCard>
    );
  }

  return (
    <>
      {pendingCount > 0 ? (
        <View style={[styles.banner, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="warning" size={16} color="#d97706" />
          <Text variant="bodyMedium" style={styles.flex}>
            <Text style={styles.medium}>{pendingCount}</Text> Users are asking for approval to access the platform
          </Text>
          <OutlinedActionButton label="View users" onPress={() => router.push('/users/pending')} />
        </View>
      ) : null}
      <ListingToolbar
        search={search}
        onSearchChange={resetList(setSearch)}
        searchPlaceholder="Search by name or email ID"
        filters={[
          selectFilter({ label: 'Status', options: STATUS_OPTIONS, value: status, onApply: resetList(setStatus) }),
          selectFilter({ label: 'Role', options: roleOptions, value: role, onApply: resetList(setRole) }),
        ]}
      />
      <ListCard empty="No users match your search or filters.">
        {loaded.map(renderUser)}
      </ListCard>
      <LazyListFooter lazy={lazy} total={rows.length} noun="users" />
      {userSheet}
    </>
  );
}

/**
 * User details (Figma 7693:105784 / 7693:106999 / 7693:108316): who they are —
 * initials, role and status, name and email — a Send reminder for a pending
 * invite, then In-store and Online permissions as closed accordions, with
 * Deactivate user and Edit details pinned at the bottom.
 */
export function UserSheet({
  entry,
  permissionKeys,
  onEdit,
  onDeactivate,
  onReactivate,
  onRemind,
  onDismiss,
}: {
  entry: RosterEntry | null;
  permissionKeys: string[];
  onEdit?: (entry: RosterEntry) => void;
  onDeactivate?: (entry: RosterEntry) => void;
  onReactivate?: (entry: RosterEntry) => void;
  onRemind?: (entry: RosterEntry) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  // Keeps the last person while the sheet slides away, so it doesn't blank mid-animation.
  const [shown, setShown] = useState<RosterEntry | null>(entry);
  if (entry && entry !== shown) setShown(entry);
  const current = entry ?? shown;
  if (!current) return null;
  const muted = { color: theme.colors.onSurfaceVariant };
  const run = (action?: (entry: RosterEntry) => void) => () => {
    if (!action) return;
    // The sheet steps aside first: the action may open its own sheet or dialog.
    onDismiss();
    setTimeout(() => action(current), 250);
  };
  const deactivated = current.status === 'Deactivated';
  const leftAction = deactivated ? onReactivate : onDeactivate;

  return (
    <PanelSheet
      visible={entry !== null}
      onDismiss={onDismiss}
      title="User details"
      height={600}
      footer={
        leftAction || onEdit ? (
          <View style={styles.userActions}>
            {leftAction ? (
              <View style={styles.flex}>
                {deactivated ? (
                  <SheetButton mode="outline" icon="arrow-counter-clockwise" label="Reactivate user" onPress={run(onReactivate)} />
                ) : (
                  <SheetButton mode="outline" destructive icon="minus-circle" label="Deactivate user" onPress={run(onDeactivate)} />
                )}
              </View>
            ) : null}
            {onEdit ? (
              <View style={styles.flex}>
                <SheetButton label="Edit details" onPress={run(onEdit)} />
              </View>
            ) : null}
          </View>
        ) : undefined
      }>
      <SheetBlock gap={16}>
        <View style={styles.userTop}>
          <View style={[styles.userAvatar, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.userInitials, muted]}>{initialsOf(current.name)}</Text>
          </View>
          <View style={styles.userBadges}>
            <View style={[styles.roleTag, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
              <Icon source="link-simple-horizontal" size={12} color={theme.colors.onSurface} />
              <Text style={[styles.roleTagLabel, { color: theme.colors.onSurface }]}>{current.role}</Text>
            </View>
            <UserStatusBadge status={current.status} />
          </View>
        </View>
        <View style={styles.userName}>
          <Text style={[styles.userNameText, { color: theme.colors.onSurface }]}>{current.name}</Text>
          <Text style={[styles.userEmail, muted]}>{current.email}</Text>
        </View>
        {current.status === 'Invited' && onRemind ? <SheetButton mode="outline" icon="bell" label="Send reminder" onPress={() => onRemind(current)} /> : null}
      </SheetBlock>
      <PermissionAccordions permissionKeys={permissionKeys} last />
    </PanelSheet>
  );
}

/**
 * Each built-in role's mark, hinting at what it's for, so the list isn't one
 * repeated shield. Roles the merchant creates fall back to the shield.
 */
const ROLE_ICONS: Record<string, string> = {
  Owner: 'crown',
  Admin: 'user-gear',
  'Store Manager': 'storefront',
  'User Admin': 'users',
  'Store Cashier': 'cash-register',
  Accountant: 'receipt',
  'EMI World User': 'credit-card',
  'Online Owner': 'globe',
  Operations: 'sliders-horizontal',
  Finance: 'chart-bar',
  Support: 'headphones',
  Viewer: 'eye',
};

function RolesTab({ onView, onDelete }: { onView: (role: ManagedRole) => void; onDelete: (role: ManagedRole) => void }) {
  const theme = useTheme();
  const { roster, roleCatalog } = useUserManagement();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const roles = roleCatalog.filter((role) => !query || `${role.name} ${role.description}`.toLowerCase().includes(query));

  // What the role is, what it's for, and who has it; its permissions and actions are in its sheet.
  const renderRole = (role: ManagedRole) => (
    <ListRow key={role.id} icon={ROLE_ICONS[role.name] ?? 'shield-check'} onPress={() => onView(role)} accessibilityLabel={`${role.name} role. Open details`}>
      <ListRowLine
        left={
          <>
            <Text variant="bodyMedium" numberOfLines={1} style={styles.medium}>
              {role.name}
            </Text>
            <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
              {assignedUserCount(role.name, roster)} {assignedUserCount(role.name, roster) === 1 ? 'user' : 'users'} · {role.description}
            </Text>
          </>
        }
        right={<RoleTypeChip roleType={role.roleType} />}
        centered
      />
    </ListRow>
  );

  if (LISTING_HERO_LAYOUT) {
    // Roles have no dates or filters: the same card, search only, rows ungrouped.
    return (
      <ListingCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by role name or description"
        filters={[]}
        totals={{ all: roleCatalog.length, shown: roles.length }}
        noun={{ one: 'role', other: 'roles' }}>
        <ListingRows empty="No roles match your search.">{roles.map(renderRole)}</ListingRows>
      </ListingCard>
    );
  }

  return (
    <>
      <ListingToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search by role name or description" />
      <ListCard empty="No roles match your search.">
        {roles.map(renderRole)}
      </ListCard>
    </>
  );
}

type ConfirmTarget = { type: 'role'; role: ManagedRole } | { type: 'removeUser'; entry: RosterEntry } | { type: 'cancelInvite'; entry: RosterEntry };

/**
 * Manage users & roles (web: ManageUsersSection): Users (pending-approval
 * banner, search, status and role filters, users with status-dependent
 * actions) and Roles (default and custom roles; tap to view permissions).
 * Invite new users and Add new role are in the header's Add menu.
 */
export function UsersRoles({ openInvite = false }: { openInvite?: boolean }) {
  const toast = useToast();
  const { roleCatalog } = useUserManagement();
  const [tab, setTab] = useState('users');
  // Docked under the header (as Reports' tabs), so no gap above them.
  useShellTabs({ tabs: TABS, activeKey: tab, onChange: setTab });
  const [formTarget, setFormTarget] = useState<{ entry: RosterEntry | null } | null>(openInvite ? { entry: null } : null);
  const [viewRole, setViewRole] = useState<ManagedRole | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [reassign, setReassign] = useState<{ role: ManagedRole; assignedCount: number; replacement: string } | null>(null);

  const requestDeleteRole = (role: ManagedRole) => {
    const assignedCount = assignedUserCount(role.name);
    if (assignedCount > 0) {
      const options = roleCatalog.filter((option) => option.id !== role.id);
      const replacement = options.find((option) => option.name === 'Viewer') ?? options[0];
      setReassign({ role, assignedCount, replacement: replacement?.name ?? '' });
    } else {
      setConfirm({ type: 'role', role });
    }
  };

  const confirmCopy =
    confirm?.type === 'role'
      ? {
          title: `Delete "${confirm.role.name}" role?`,
          description: 'This role definition will be removed. No users are currently assigned to it.',
          label: 'Delete',
        }
      : confirm?.type === 'removeUser'
        ? {
            title: `Deactivate ${confirm.entry.name}?`,
            description: "This user's access will be deactivated immediately. You can reactivate them later from the Users list.",
            label: 'Deactivate user',
          }
        : confirm?.type === 'cancelInvite'
          ? { title: `Cancel invite to ${confirm.entry.name}?`, description: 'The pending invite will be cancelled and removed from the list.', label: 'Cancel invite' }
          : { title: '', description: '', label: '' };

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.type === 'role') {
      deleteRole(confirm.role.id);
      toast(`Role "${confirm.role.name}" deleted`);
    } else if (confirm.type === 'removeUser') {
      setUserStatus(confirm.entry.id, 'Deactivated');
      toast(`${confirm.entry.name} deactivated — access revoked`);
    } else {
      removeRosterEntry(confirm.entry.id);
      toast(`Invite to ${confirm.entry.email} cancelled`);
    }
  };

  return (
    <TabScreen
      tab="users"
      actions={[
        { label: 'Invite new users', icon: 'user-plus', onPress: () => setFormTarget({ entry: null }) },
        { label: 'Add new role', icon: 'shield', onPress: () => router.push('/users/role') },
      ]}
      actionsMenu={{ label: 'Add', icon: 'plus' }}>
      {tab === 'users' ? (
        <UsersTab onEdit={(entry) => setFormTarget({ entry })} onConfirm={setConfirm} />
      ) : (
        <RolesTab onView={setViewRole} onDelete={requestDeleteRole} />
      )}

      <UserFormSheet
        visible={formTarget !== null}
        onDismiss={() => setFormTarget(null)}
        entry={formTarget?.entry ?? null}
        onDone={(message) => toast(message)}
      />
      <ViewRoleSheet role={viewRole} onDismiss={() => setViewRole(null)} onDelete={requestDeleteRole} />
      <ConfirmDialog
        visible={confirm !== null}
        onDismiss={() => setConfirm(null)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.label}
        onConfirm={runConfirm}
        destructive
      />
      <ConfirmDialog
        visible={reassign !== null}
        onDismiss={() => setReassign(null)}
        title={`Reassign ${reassign?.assignedCount ?? 0} user(s) before deleting "${reassign?.role.name ?? ''}"?`}
        description={`This role is still assigned to ${reassign?.assignedCount ?? 0} user(s). Choose a role to move them to — "${reassign?.role.name ?? ''}" is deleted immediately after.`}
        confirmLabel="Reassign & delete"
        confirmDisabled={!reassign?.replacement}
        onConfirm={() => {
          if (!reassign) return;
          const result = reassignAndDeleteRole(reassign.role, reassign.replacement);
          toast('error' in result ? result.error : result.message);
        }}>
        {reassign ? (
          <FormField label="Move affected users to">
            <RoleSelectField
              roleName={reassign.replacement}
              onChange={(replacement) => setReassign((current) => (current ? { ...current, replacement } : current))}
              roleCatalog={roleCatalog.filter((option) => option.id !== reassign.role.id)}
            />
          </FormField>
        ) : null}
      </ConfirmDialog>
    </TabScreen>
  );
}

/**
 * Pending access requests (web: PendingApprovalsPage): people who asked for
 * access during onboarding. Approve keeps their requested role and stores and
 * makes them Active; Reject removes the request.
 */
export function PendingApprovals() {
  const theme = useTheme();
  const toast = useToast();
  const { roster, roleCatalog } = useUserManagement();
  const rows = roster.filter((entry) => entry.status === 'Pending');
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    <DetailScreen title="Pending access requests" fallbackHref="/users">
      <ListCard empty="No pending access requests.">
        {rows.map((row) => {
          const permissionKeys = roleCatalog.find((role) => role.name === row.role)?.permissionKeys ?? [];
          return (
            <ListRow key={row.id} icon={<RowMark label={initialsOf(row.name)} />} accessibilityLabel={`${row.name} requested ${row.role}`}>
              <ListRowLine
                left={
                  <>
                    <Text variant="bodyMedium" style={styles.medium}>
                      {row.name}
                    </Text>
                    <Text variant="bodySmall" style={muted}>
                      {row.email}
                    </Text>
                  </>
                }
              />
              <View style={styles.badges}>
                <RoleBadge role={row.role} />
                <AccessScopeBadge scope={computeAccessScope(permissionKeys)} />
              </View>
              <Text variant="bodySmall" style={muted}>
                Requested on {row.addedOnDate}, {row.addedOnTime}
              </Text>
              <View style={styles.approvalActions}>
                <Button
                  mode="outlined"
                  icon="x"
                  textColor={theme.colors.error}
                  onPress={() => {
                    removeRosterEntry(row.id);
                    toast(`${row.name}'s access request rejected`);
                  }}
                  style={[styles.approvalButton, { borderColor: theme.colors.outlineVariant }]}>
                  Reject
                </Button>
                <Button
                  mode="contained"
                  icon="check"
                  onPress={() => {
                    setUserStatus(row.id, 'Active');
                    toast(`${row.name} approved — access granted`);
                  }}
                  style={styles.approvalButton}>
                  Approve
                </Button>
              </View>
            </ListRow>
          );
        })}
      </ListCard>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  medium: { fontFamily: Fonts.medium },
  overline: { letterSpacing: 0.8 },
  dim: { opacity: 0.6 },
  tabs: { marginHorizontal: -PAGE_PADDING, marginVertical: -8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sheetBody: { padding: 16, gap: 16 },
  sheetActions: { gap: 8 },
  // User details (Figma 7693:106999): 40dp initials, badges at the end; 16 semibold name over a 14 medium email.
  userActions: { flexDirection: 'row', gap: 12 },
  userTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  userInitials: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  userBadges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, flexShrink: 1 },
  roleTag: { height: 24, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 12, borderWidth: 1, borderRadius: 12 },
  roleTagLabel: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  userName: { gap: 4 },
  userNameText: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  userEmail: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  roleMeta: { alignItems: 'center', marginTop: 4 },
  banner: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 12, borderRadius: Shape.max },
  grid: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  sheetFooter: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  panelButton: { borderRadius: PANEL_INNER_RADIUS },
  approvalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  approvalButton: { flex: 1, borderRadius: LIST_ROW_INNER_RADIUS },
});
