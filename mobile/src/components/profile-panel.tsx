import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SETTINGS_GROUPS } from '@/components/account/account-settings';
import { OrganisationLogo, OrganisationSwitcher } from '@/components/account/organisation-switcher';
import { CopyableValue } from '@/components/shared/copyable-value';
import { PANEL_INNER_RADIUS, PANEL_PADDING, PanelSheet } from '@/components/shared/panel-sheet';
import { OutlineTag, PILL_HEIGHT } from '@/components/shared/status';
import { useAppColors } from '@/constants/app-colors';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { concentric, Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { BUSINESS_PROFILE_ROLES } from '@/data/business-profile';
import { CURRENT_USER, ORGANISATIONS } from '@/data/businesses';
import { markAllNotificationsRead, markNotificationRead, useNotifications } from '@/data/notifications';
import { INITIAL_ROSTER } from '@/data/user-roster';
import { useBusiness } from '@/hooks/use-business';
import { type ThemeMode, useThemeMode } from '@/hooks/use-theme-mode';
import { useToast } from '@/hooks/use-toast';

import { useProfileNav } from './profile-return';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'device-mobile' },
];
const SWITCHER_PADDING = 4;
/** Long enough to see the pick land before the app fades to the new look. */
const APPLY_DELAY_MS = 160;

const PADDING = 16;
// M3 emphasized easings, as the app's sheets.
const EMPHASIZED_DECELERATE = Easing.bezier(0.05, 0.7, 0.1, 1);
const EMPHASIZED_ACCELERATE = Easing.bezier(0.3, 0, 0.8, 0.15);
/** Web's Tirth Trivedi roster entry — the signed-in mobile user. */
const USER_EMAIL = INITIAL_ROSTER.find((entry) => entry.name === CURRENT_USER.name)?.email ?? '';

/**
 * The profile page (Figma 6622:916), opened from the initials avatar at the
 * end of Overview's header: a full page that comes in from the right, where
 * the avatar is, with Back to close. Centred at the top, who's signed in and
 * then the organisation as a card whose Switch opens the organisation
 * sheet; then one list
 * — Notifications (unread counted; a sheet whose items open their pages) and
 * the settings pages — then appearance and Log out. Not the app's modules
 * (those are in the navigation bar and More). Previously: the organisation, with Switch opening the organisation sheet to
 * pick and confirm another (it starts on all its stores); the settings
 * sections in their groups, each opening its page; Light, Dark or System appearance; and Log out. Tap outside or Android Back closes it.
 */
export function ProfilePanel({
  visible,
  onDismiss,
  covered = false,
}: {
  visible: boolean;
  onDismiss: () => void;
  /** A page opened from here is on top: Android Back belongs to that page. */
  covered?: boolean;
}) {
  const profileNav = useProfileNav();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const business = useBusiness();
  const toast = useToast();
  const appColors = useAppColors();
  const [switching, setSwitching] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications();
  const organisation = business.organisation;
  const [progress] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(visible);
  // Mount immediately on open; unmount only once the exit animation finishes.
  if (visible && !mounted) setMounted(true);
  const initials = CURRENT_USER.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 380 : 220,
      easing: visible ? EMPHASIZED_DECELERATE : EMPHASIZED_ACCELERATE,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, progress]);

  // Android Back closes the panel before leaving the page.
  useEffect(() => {
    if (!visible || covered) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => subscription.remove();
  }, [visible, covered, onDismiss]);

  // One list, as the reference: what needs a look first, then the settings pages.
  const rows: { key: string; icon: string; title: string; badge?: number; onPress: () => void }[] = [
    { key: 'notifications', icon: 'bell', title: 'Notifications', badge: notifications.unread, onPress: () => setNotificationsOpen(true) },
    ...SETTINGS_GROUPS.flatMap((group) =>
      group.sections.map((section) => ({
        key: section.key,
        icon: section.icon,
        title: section.title,
        onPress: () => {
          // Slides in over the profile; its Back returns here (see profile-return).
          profileNav.openPage(`/account-settings/${section.key}`);
        },
      }))
    ),
  ];
  // Checkout configuration lives here too (not in More), after the payment settings.
  rows.splice(rows.findIndex((row) => row.key === 'online-payments') + 1, 0, {
    key: 'checkout',
    icon: 'palette',
    title: 'Checkout',
    onPress: () => {
      profileNav.openPage('/checkout');
    },
  });

  return (
    <>
      {mounted ? (
        <>
          <Animated.View
            accessibilityViewIsModal
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.background,
                transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [windowWidth, 0] }) }],
              },
            ]}>
            {APP_PAGE_LAYOUT ? (
              <AppProfileContent
                organisation={organisation}
                toast={toast}
                initials={initials}
                onDismiss={onDismiss}
                onSwitch={() => setSwitching(true)}
                onNotifications={() => setNotificationsOpen(true)}
                unread={notifications.unread}
                // Slides in over the profile; its Back returns here (see profile-return).
                openPage={profileNav.openPage}
              />
            ) : (
              <>
            {/* Back, as on every inner page; the page came in from the right, where the avatar is. */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <TouchableRipple
                onPress={onDismiss}
                borderless
                accessibilityRole="button"
                accessibilityLabel="Close profile"
                style={[styles.back, { backgroundColor: theme.colors.surface }]}>
                <Icon source="arrow-left" size={20} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(PADDING, insets.bottom) + 16 }]} showsVerticalScrollIndicator={false}>
              {/* Who's signed in and for which organisation, centred (Figma 6622:916). */}
              <View style={styles.identity}>
                <View style={[styles.avatar, { backgroundColor: appColors.highlight }]}>
                  <Text style={[styles.initials, { color: appColors.brand }]}>{initials}</Text>
                </View>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={[styles.name, { color: theme.colors.onSurface }]}>
                    {CURRENT_USER.name}
                  </Text>
                  <OutlineTag label={CURRENT_USER.roleLabel} radius={Shape.max} />
                </View>
                <Text numberOfLines={1} style={[styles.small, { color: theme.colors.onSurfaceVariant }]}>
                  {USER_EMAIL}
                </Text>
              </View>

              {/* The organisation everything shows, as a card; Switch opens the sheet to pick and confirm another. */}
              <View style={[styles.card, styles.orgCard, { backgroundColor: theme.colors.surface }]}>
                <OrganisationLogo organisation={organisation} />
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                    {organisation.name}
                  </Text>
                  <Text style={[styles.small, { color: theme.colors.onSurfaceVariant }]}>{organisation.shops.length} stores</Text>
                </View>
                {ORGANISATIONS.length > 1 ? (
                  <Button
                    mode="outlined"
                    compact
                    icon="arrows-left-right"
                    onPress={() => setSwitching(true)}
                    textColor={theme.colors.onSurface}
                    accessibilityLabel={`Switch organisation from ${organisation.name}`}
                    labelStyle={styles.switchLabel}
                    style={[styles.switchButton, { borderColor: theme.colors.outlineVariant }]}>
                    Switch
                  </Button>
                ) : null}
              </View>

              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                {rows.map((row, index) => (
                  <View key={row.key}>
                    {index > 0 ? <View style={[styles.rowDivider, { backgroundColor: theme.colors.background }]} /> : null}
                    <TouchableRipple
                      onPress={row.onPress}
                      accessibilityRole="button"
                      accessibilityLabel={row.badge ? `${row.title}, ${row.badge} unread` : row.title}>
                      <View style={styles.row}>
                        <View>
                          <Icon source={row.icon} size={22} color={theme.colors.onSurface} />
                          {row.badge ? (
                            <View style={[styles.badge, { backgroundColor: theme.colors.error, borderColor: theme.colors.surface }]}>
                              <Text style={[styles.badgeLabel, { color: theme.colors.onError }]}>{row.badge}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text numberOfLines={1} style={[styles.flex, styles.rowTitle, { color: theme.colors.onSurface }]}>
                          {row.title}
                        </Text>
                        <Icon source="caret-right" size={16} color={theme.colors.onSurfaceVariant} />
                      </View>
                    </TouchableRipple>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text accessibilityRole="header" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                  APPEARANCE
                </Text>
                <AppearanceSwitcher />
              </View>

              <TouchableRipple
                onPress={() => {
            // Out to the login flow; nothing to go back to.
            onDismiss();
            router.replace('/login');
          }}
                borderless
                accessibilityRole="button"
                style={[styles.logout, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.logoutContent}>
                  <Icon source="sign-out" size={20} color={theme.colors.error} />
                  <Text style={[styles.rowTitle, { color: theme.colors.error }]}>Log out</Text>
                </View>
              </TouchableRipple>
            </ScrollView>
              </>
            )}
          </Animated.View>
        </>
      ) : null}
      {/* Mounted after the page, so these sheets stack above it (Paper portals layer in mount order). */}
      {mounted ? (
        <>
          <PanelSheet
            visible={notificationsOpen}
            onDismiss={() => setNotificationsOpen(false)}
            title="Notifications"
            grouped
            height={520}
            footer={
              notifications.unread ? (
                <Button
                  mode="outlined"
                  onPress={markAllNotificationsRead}
                  textColor={theme.colors.onSurface}
                  style={[styles.markAll, { borderColor: theme.colors.outlineVariant }]}>
                  Mark all as read
                </Button>
              ) : undefined
            }>
            <View style={styles.sheetBody}>
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                {notifications.items.map((item, index) => {
                  const unread = !notifications.isRead(item.id);
                  return (
                    <View key={item.id}>
                      {index > 0 ? <View style={[styles.rowDivider, { backgroundColor: theme.colors.background }]} /> : null}
                      <TouchableRipple
                        onPress={() => {
                          markNotificationRead(item.id);
                          setNotificationsOpen(false);
                          onDismiss();
                          router.navigate(item.href);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}. ${item.detail}. ${item.time}`}>
                        <View style={[styles.notification, unread && { backgroundColor: appColors.highlight }]}>
                          <Icon source={item.icon} size={20} color={theme.colors.onSurface} />
                          <View style={styles.flex}>
                            <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                              {item.title}
                            </Text>
                            <Text numberOfLines={2} style={[styles.small, { color: theme.colors.onSurfaceVariant }]}>
                              {item.detail}
                            </Text>
                            <Text style={[styles.small, styles.time, { color: theme.colors.onSurfaceVariant }]}>{item.time}</Text>
                          </View>
                          {unread ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.error }]} /> : null}
                        </View>
                      </TouchableRipple>
                    </View>
                  );
                })}
              </View>
            </View>
          </PanelSheet>
          <OrganisationSwitcher
            visible={switching}
            onDismiss={() => setSwitching(false)}
            organisations={ORGANISATIONS}
            currentId={organisation.id}
            onApply={business.switchOrganisation}
          />
        </>
      ) : null}
    </>
  );
}

const CARD_RADIUS = Shape.max;

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: PADDING, paddingBottom: 8 },
  back: { width: 40, height: 40, borderRadius: Shape.max, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: PADDING, gap: 24 },
  flex: { flex: 1, minWidth: 0 },
  identity: { alignItems: 'center', gap: 10, paddingTop: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  initials: { fontFamily: Fonts.semiBold, fontSize: 24, lineHeight: 30 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  name: { fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 26, flexShrink: 1 },
  orgCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingRight: 8, paddingVertical: 12 },
  switchButton: { borderRadius: Shape.small, margin: 0 },
  switchLabel: { fontSize: 12, marginVertical: 6 },
  small: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  section: { gap: 8 },
  sectionLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, paddingHorizontal: 4 },
  card: { borderRadius: CARD_RADIUS, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 60, paddingHorizontal: 16 },
  rowDivider: { height: 1, marginLeft: 16 },
  rowTitle: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 20 },
  // The unread count, on the bell's top-left as in the reference.
  badge: {
    position: 'absolute',
    left: -8,
    top: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { fontFamily: Fonts.semiBold, fontSize: 10, lineHeight: 12 },
  switcher: { flexDirection: 'row', padding: SWITCHER_PADDING },
  switcherThumb: {
    position: 'absolute',
    top: SWITCHER_PADDING,
    bottom: SWITCHER_PADDING,
    left: SWITCHER_PADDING,
    borderRadius: concentric(Shape.max, SWITCHER_PADDING),
  },
  switcherOption: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, height: 64 },
  switcherLabel: { fontSize: 12, lineHeight: 16 },
  switcherHint: { paddingHorizontal: 4 },
  sheetBody: { padding: PANEL_PADDING },
  notification: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  time: { marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  markAll: { borderRadius: PANEL_INNER_RADIUS },
  logout: { borderRadius: CARD_RADIUS },
  logoutContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 },
});

/**
 * Light, Dark or System as three equal tiles on a card, the pick marked by a
 * lime thumb that slides to it (as the listing heroes' view switch). The pick
 * lands first, then the app fades to the new look; under System, a line says
 * what the phone is set to.
 */
function AppearanceSwitcher() {
  const theme = useTheme();
  const appColors = useAppColors();
  const { mode, setMode, systemScheme } = useThemeMode();
  const [picked, setPicked] = useState<ThemeMode>(mode);
  const [trackWidth, setTrackWidth] = useState(0);
  const [thumb] = useState(() => new Animated.Value(THEME_OPTIONS.findIndex((option) => option.value === mode)));
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Follow a pick made elsewhere (or restored from storage after launch).
  const [lastMode, setLastMode] = useState(mode);
  if (mode !== lastMode) {
    setLastMode(mode);
    setPicked(mode);
  }
  const pickedIndex = THEME_OPTIONS.findIndex((option) => option.value === picked);
  useEffect(() => {
    Animated.timing(thumb, { toValue: pickedIndex, duration: 220, easing: EMPHASIZED_DECELERATE, useNativeDriver: true }).start();
  }, [pickedIndex, thumb]);
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    []
  );

  const segment = trackWidth ? (trackWidth - SWITCHER_PADDING * 2) / THEME_OPTIONS.length : 0;
  const choose = (next: ThemeMode) => {
    setPicked(next);
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => setMode(next), APPLY_DELAY_MS);
  };

  return (
    <View style={styles.section}>
      <View
        accessibilityRole="radiogroup"
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={[styles.card, styles.switcher, { backgroundColor: theme.colors.surface }]}>
        {segment ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.switcherThumb,
              {
                width: segment,
                backgroundColor: appColors.highlight,
                transform: [
                  { translateX: thumb.interpolate({ inputRange: [0, THEME_OPTIONS.length - 1], outputRange: [0, segment * (THEME_OPTIONS.length - 1)] }) },
                ],
              },
            ]}
          />
        ) : null}
        {THEME_OPTIONS.map((option) => {
          const active = option.value === picked;
          const color = active ? theme.colors.onSurface : theme.colors.onSurfaceVariant;
          return (
            <Pressable
              key={option.value}
              onPress={() => choose(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              aria-checked={active}
              accessibilityLabel={`${option.label} appearance`}
              style={styles.switcherOption}>
              <Icon source={option.icon} size={20} color={color} />
              <Text style={[styles.switcherLabel, { color, fontFamily: active ? Fonts.semiBold : Fonts.medium }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.small, styles.switcherHint, { color: theme.colors.onSurfaceVariant }]}>
        {picked === 'system' ? `Follows your phone · ${systemScheme === 'dark' ? 'Dark' : 'Light'} right now` : 'Stays this way until you change it'}
      </Text>
    </View>
  );
}

/** A profile row (Figma 7161:76915): icon, title with an optional tag, an optional muted line, and the caret. */
type ProfileRow = { key: string; icon: string; title: string; subtitle?: string; tag?: { label: string; tone: 'new' | 'neutral' }; badge?: number; onPress: () => void };

/**
 * The profile as the app pages set it (APP_PAGE_LAYOUT, Figma 7161:76339):
 * Back and a red Log out in the bar; centred, the initials tile, the name and
 * role, the email; the organisation with Switch; then Rewards, Manage,
 * Preferences (with Appearance as a Light / Dark switch) and App support,
 * each row its own white card; Privacy Policy and Terms at the foot.
 */
function AppProfileContent({
  organisation,
  toast,
  initials,
  onDismiss,
  onSwitch,
  onNotifications,
  unread,
  openPage,
}: {
  /** Passed in: the page renders in a portal, outside the business and toast providers. */
  organisation: ReturnType<typeof useBusiness>['organisation'];
  toast: ReturnType<typeof useToast>;
  initials: string;
  onDismiss: () => void;
  onSwitch: () => void;
  onNotifications: () => void;
  unread: number;
  openPage: (href: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const soon = (what: string) => () => toast(`${what} isn't in the prototype yet`);
  const canOpenBusiness = BUSINESS_PROFILE_ROLES.includes(CURRENT_USER.roleLabel);
  const groups: { title: string; rows: ProfileRow[] }[] = [
    {
      title: 'Rewards',
      rows: [
        { key: 'prime', icon: 'crown', title: 'Prime membership', onPress: soon('Prime membership') },
        { key: 'accept', icon: 'money', title: 'Accept payments', onPress: () => openPage('/payment-links') },
        { key: 'marketplace', icon: 'crown', title: 'Marketplace', onPress: soon('Marketplace') },
      ],
    },
    {
      title: 'Manage',
      rows: [
        { key: 'devices', icon: 'device-mobile', title: 'My devices', subtitle: '13,905 installed', onPress: () => openPage('/terminal-devices') },
        { key: 'stores', icon: 'storefront', title: 'My stores', subtitle: `${organisation.shops.length.toLocaleString('en-IN')} registered`, onPress: () => openPage('/stores') },
        { key: 'users', icon: 'user-gear', title: 'Manage user roles & permissions', subtitle: '1,761 registered', onPress: () => openPage('/users') },
        { key: 'vas', icon: 'diamond', title: 'Value Added Services', subtitle: '6 services', tag: { label: 'NEW', tone: 'new' }, onPress: () => openPage('/value-added-services') },
        { key: 'dues', icon: 'receipt', title: 'Pending dues', subtitle: 'Check your recent dues and pay', tag: { label: 'Check now', tone: 'neutral' }, onPress: () => openPage('/pending-dues') },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        { key: 'security', icon: 'shield', title: 'Security & privacy', subtitle: 'Change password', onPress: () => openPage('/account-settings/credentials') },
        { key: 'notifications', icon: 'bell', title: 'Notifications', subtitle: 'Manage communication channels', badge: unread, onPress: onNotifications },
        { key: 'language', icon: 'translate', title: 'Language', subtitle: 'English', onPress: soon('Language') },
      ],
    },
  ];
  // The business settings pages have no row in the design; they stay reachable, after Preferences.
  const settingsRows: ProfileRow[] = [
    ...SETTINGS_GROUPS.flatMap((group) => group.sections)
      .filter((section) => section.key !== 'credentials')
      .map((section) => ({ key: section.key, icon: section.icon, title: section.title, onPress: () => openPage(`/account-settings/${section.key}`) })),
    { key: 'checkout', icon: 'palette', title: 'Checkout', onPress: () => openPage('/checkout') },
  ];
  const support: ProfileRow[] = [
    { key: 'suggest', icon: 'question', title: 'Suggest & Report', subtitle: 'Report bugs, request a feature', onPress: () => openPage('/support') },
    { key: 'version', icon: 'seal-check', title: 'App is up to date', subtitle: 'v 4.5.0 (78)', onPress: () => toast('You have the latest version') },
  ];
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    <>
      <View style={[appStyles.bar, { paddingTop: insets.top + 12 }]}>
        <TouchableRipple onPress={onDismiss} borderless accessibilityRole="button" accessibilityLabel="Close profile" style={[appStyles.back, { backgroundColor: theme.colors.surface }]}>
          <Icon source="arrow-left" size={20} color={theme.colors.onSurface} />
        </TouchableRipple>
        <TouchableRipple
          onPress={() => {
            // Out to the login flow; nothing to go back to.
            onDismiss();
            router.replace('/login');
          }}
          borderless
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={[appStyles.logout, { backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca' }]}>
          <Text style={[appStyles.logoutLabel, { color: theme.dark ? '#fca5a5' : '#b91c1c' }]}>Logout</Text>
        </TouchableRipple>
      </View>
      <ScrollView contentContainerStyle={[appStyles.content, { paddingBottom: Math.max(16, insets.bottom) + 16 }]} showsVerticalScrollIndicator={false}>
        <View style={appStyles.identity}>
          <View style={[appStyles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={[appStyles.initials, { color: theme.colors.onPrimary }]}>{initials}</Text>
          </View>
          <View style={appStyles.nameRow}>
            <Text numberOfLines={1} style={[appStyles.name, { color: theme.colors.onSurface }]}>
              {CURRENT_USER.name}
            </Text>
            <OutlineTag label={CURRENT_USER.roleLabel} radius={Shape.max} />
          </View>
          <Text numberOfLines={1} style={[appStyles.body, muted]}>
            {USER_EMAIL}
          </Text>
        </View>

        {/* The business: Owners and Admins open its Business profile (where Switch now lives); other roles switch from here. */}
        {canOpenBusiness ? (
          <TouchableRipple
            onPress={() => openPage('/business-profile')}
            borderless
            accessibilityRole="button"
            accessibilityLabel={`${organisation.name}. Open business profile`}
            style={[appStyles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={appStyles.org}>
              <Icon source="storefront" size={24} color={theme.colors.primary} />
              <View style={appStyles.flex}>
                <Text numberOfLines={1} style={[appStyles.rowTitle, { color: theme.colors.onSurface }]}>
                  {organisation.name}
                </Text>
                <CopyableValue variant="pill" value={organisation.merchantId} label={`MID: ${organisation.merchantId}`} />
              </View>
              <Icon source="caret-right" size={20} color={theme.colors.onSurface} />
            </View>
          </TouchableRipple>
        ) : (
          <View style={[appStyles.card, appStyles.org, { backgroundColor: theme.colors.surface }]}>
            <Icon source="storefront" size={24} color={theme.colors.primary} />
            <View style={appStyles.flex}>
              <Text numberOfLines={1} style={[appStyles.rowTitle, { color: theme.colors.onSurface }]}>
                {organisation.name}
              </Text>
              {/* The merchant ID belongs to the organisation (not to a store): copy it from here. */}
              <CopyableValue variant="pill" value={organisation.merchantId} label={`MID: ${organisation.merchantId}`} />
            </View>
            {ORGANISATIONS.length > 1 ? (
              <TouchableRipple
                onPress={onSwitch}
                borderless
                accessibilityRole="button"
                accessibilityLabel={`Switch organisation from ${organisation.name}`}
                style={[appStyles.switch, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
                <Text style={[appStyles.switchLabel, { color: theme.colors.onSurface }]}>Switch</Text>
              </TouchableRipple>
            ) : null}
          </View>
        )}

        {groups.map((group) => (
          <View key={group.title} style={appStyles.group}>
            <Text accessibilityRole="header" style={[appStyles.groupTitle, { color: theme.colors.onSurface }]}>
              {group.title}
            </Text>
            {group.rows.map((row) => (
              <ProfileRowCard key={row.key} row={row} />
            ))}
            {group.title === 'Preferences' ? (
              <>
                <AppAppearanceCard />
                {settingsRows.map((row) => (
                  <ProfileRowCard key={row.key} row={row} />
                ))}
              </>
            ) : null}
          </View>
        ))}

        <View style={appStyles.group}>
          <Text accessibilityRole="header" style={[appStyles.groupTitle, { color: theme.colors.onSurface }]}>
            App support
          </Text>
          {support.map((row) => (
            <ProfileRowCard key={row.key} row={row} />
          ))}
        </View>

        <View style={appStyles.legal}>
          <Text onPress={() => toast("The privacy policy isn't in the prototype yet")} style={[appStyles.legalLink, { color: theme.colors.primary }]}>
            Privacy Policy
          </Text>
          <View style={[appStyles.legalDot, { backgroundColor: theme.colors.primary }]} />
          <Text onPress={() => toast("The terms aren't in the prototype yet")} style={[appStyles.legalLink, { color: theme.colors.primary }]}>
            Terms and Conditions
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

function ProfileRowCard({ row }: { row: ProfileRow }) {
  const theme = useTheme();
  const appColors = useAppColors();
  return (
    <TouchableRipple
      onPress={row.onPress}
      borderless
      accessibilityRole="button"
      accessibilityLabel={[row.title, row.subtitle, row.badge ? `${row.badge} unread` : undefined].filter(Boolean).join(', ')}
      style={[appStyles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={[appStyles.row, row.subtitle ? appStyles.rowTall : null]}>
        <View>
          {/* Figma 7161:76915: the row icons are the brand's olive. */}
          <Icon source={row.icon} size={24} color={theme.colors.primary} />
          {row.badge ? (
            <View style={[appStyles.badge, { backgroundColor: theme.colors.error, borderColor: theme.colors.surface }]}>
              <Text style={[appStyles.badgeLabel, { color: theme.colors.onError }]}>{row.badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={appStyles.flex}>
          <View style={appStyles.titleRow}>
            <Text numberOfLines={1} style={[appStyles.rowTitle, appStyles.shrink, { color: theme.colors.onSurface }]}>
              {row.title}
            </Text>
            {row.tag ? (
              <View style={[appStyles.tag, { backgroundColor: row.tag.tone === 'new' ? appColors.highlight : theme.colors.surfaceVariant }]}>
                <Text style={[appStyles.tagLabel, { color: theme.colors.onSurface }]}>{row.tag.label}</Text>
              </View>
            ) : null}
          </View>
          {row.subtitle ? <Text style={[appStyles.small, { color: theme.colors.onSurfaceVariant }]}>{row.subtitle}</Text> : null}
        </View>
        <Icon source="caret-right" size={20} color={theme.colors.onSurface} />
      </View>
    </TouchableRipple>
  );
}

/** Appearance (Figma 7161:77303): the title, then Light / Dark as a grey track with the pick on white. */
function AppAppearanceCard() {
  const theme = useTheme();
  const { mode, setMode, systemScheme } = useThemeMode();
  const current = mode === 'system' ? systemScheme ?? 'light' : mode;
  return (
    <View style={[appStyles.card, appStyles.appearance, { backgroundColor: theme.colors.surface }]}>
      <View style={appStyles.appearanceTitle}>
        <Icon source="swatches" size={24} color={theme.colors.primary} />
        <Text style={[appStyles.rowTitle, { color: theme.colors.onSurface }]}>Appearance</Text>
      </View>
      <View accessibilityRole="radiogroup" style={[appStyles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
        {(['light', 'dark'] as const).map((value) => {
          const active = current === value;
          return (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[appStyles.segment, active && { backgroundColor: theme.colors.surface }]}>
              <Icon source={value === 'light' ? 'sun' : 'moon'} size={16} color={active ? theme.colors.onSurface : theme.colors.onSurfaceVariant} />
              <Text style={[appStyles.segmentLabel, { color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>{value === 'light' ? 'Light' : 'Dark'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const appStyles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 12 },
  back: { width: 36, height: 36, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  logout: { height: 32, paddingHorizontal: 12, borderRadius: Shape.small, justifyContent: 'center' },
  logoutLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  content: { paddingHorizontal: 8, gap: 8 },
  identity: { alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 24 },
  avatar: { width: 36, height: 36, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  initials: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  name: { fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 24, flexShrink: 1 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  card: { borderRadius: Shape.max },
  org: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  switch: { height: 32, paddingHorizontal: 12, borderRadius: Shape.small, borderWidth: 1, justifyContent: 'center' },
  switchLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  group: { gap: 8, marginTop: 16 },
  groupTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12 },
  rowTall: { minHeight: 62 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  shrink: { flexShrink: 1 },
  flex: { flex: 1, minWidth: 0 },
  tag: { height: PILL_HEIGHT, paddingHorizontal: 8, borderRadius: PILL_HEIGHT / 2, justifyContent: 'center' },
  tagLabel: { fontFamily: Fonts.medium, fontSize: 11, lineHeight: 14 },
  badge: { position: 'absolute', left: -8, top: -8, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeLabel: { fontFamily: Fonts.semiBold, fontSize: 10, lineHeight: 12 },
  appearance: { padding: 12, gap: 12 },
  appearanceTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flexDirection: 'row', padding: 3, borderRadius: Shape.small },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 30, borderRadius: Shape.small - 3 },
  segmentLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  legal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24 },
  legalLink: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  legalDot: { width: 3, height: 3, borderRadius: 1.5 },
});
