import { type Href } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Appbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BackButton, HeaderControl, PageTitle, PageTopBar, useCollapsingHeader } from '@/components/page-header';
import { useOpenScopeSwitcher } from '@/components/scope-switcher';
import { useBusiness } from '@/hooks/use-business';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { concentric, Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';

import { useSvgId } from './hatch';
import { EndReachedProvider, useEndReached } from './lazy-list';

/** Web status gradients (from-success/25 via-success/10 to-background, etc.). */
export const STATUS_GRADIENT = {
  success: '#10b981',
  failed: '#ef4444',
  processing: '#f59e0b',
  neutral: '#8b5cf6',
  info: '#0ea5e9',
} as const;
export type StatusGradientTone = keyof typeof STATUS_GRADIENT;

const GRADIENT_HEIGHT = 300;

/** The web detail pages' 300px status-coloured wash behind the header. */
function StatusGradient({ tone }: { tone: StatusGradientTone }) {
  const id = useSvgId('status-gradient');
  const color = STATUS_GRADIENT[tone];
  return (
    // Pinned to both edges of the padded content: a percentage width on the Svg itself resolves
    // against the content box, which left the wash short of the right edge.
    <View pointerEvents="none" style={styles.gradient}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.25} />
            <Stop offset="0.5" stopColor={color} stopOpacity={0.1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

type DetailScreenProps = {
  title: string;
  /** A muted line under the large title, e.g. what the page is for. */
  subtitle?: string;
  /** Where Back goes when there's no history (e.g. the page was opened directly). */
  fallbackHref: Href;
  gradient?: StatusGradientTone;
  /** The page's call to action in the header's trailing slot (e.g. "New"), filled in the brand colour. */
  action?: { label: string; icon: string; onPress?: () => void };
  /** Other header controls before it, e.g. icon buttons (HeaderControl) for chat history or customise. */
  actions?: ReactNode;
  /** Set false when the screen lays out its own scrolling, e.g. a chat with a pinned composer: the title then stays small in the header. */
  scroll?: boolean;
  /**
   * The screen's main call(s) to action, pinned to the bottom (e.g. Refund
   * transaction). Buttons should use DETAIL_FOOTER_BUTTON_RADIUS; lay out two
   * side by side with `flex: 1`, primary last.
   */
  footer?: ReactNode;
  /**
   * The page's data follows the global store / channel scope: it's shown
   * under the title as "<channel> · <stores> ▾", opening the switcher.
   */
  scoped?: boolean;
  children: ReactNode;
};

// The app pages (APP_PAGE_LAYOUT, Figma 7132:120434) pad the footer 8dp.
const FOOTER_PADDING = APP_PAGE_LAYOUT ? 8 : 16;
/** Space after the last card; without a footer, the home indicator's inset is added to it. */
const CONTENT_END = 32;
/** Radius for buttons in the pinned footer (16dp inside its rounded top corners). */
export const DETAIL_FOOTER_BUTTON_RADIUS = concentric(Shape.max, FOOTER_PADDING);

/**
 * Frame for a pushed inner page, with the shared page header (see
 * page-header.tsx): Back leading the top bar and the page's call to action
 * trailing it, then the large left-aligned title opening the scrolling
 * content (over the web's status gradient), which hands off to a small title
 * in the bar as it scrolls away. An optional pinned footer holds the main call
 * to action. Replaces the tab header (and the nav bar) while the page is open.
 */
export function DetailScreen({ title, subtitle, fallbackHref, gradient, action, actions, scroll = true, footer, scoped = false, children }: DetailScreenProps) {
  const theme = useTheme();
  const bottom = useSafeAreaInsets().bottom;
  const endReached = useEndReached();
  const header = useCollapsingHeader();
  const [shown] = useState(() => new Animated.Value(1));
  const { scopeText } = useBusiness();
  const openScopeSwitcher = useOpenScopeSwitcher();
  // Scoped inner pages are channel-split, so never "All channels".
  const scope = scoped ? scopeText(false) : undefined;
  const trailing =
    actions || action ? (
      <>
        {actions}
        {action ? <HeaderControl icon={action.icon} label={action.label} primary onPress={action.onPress} accessibilityLabel={action.label} /> : null}
      </>
    ) : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        <Animated.ScrollView
          {...endReached.scrollProps}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: header.scrollY } } }], {
            useNativeDriver: true,
            listener: endReached.scrollProps.onScroll,
          })}
          contentContainerStyle={[styles.content, { paddingTop: header.barHeight }, !footer && { paddingBottom: CONTENT_END + bottom }]}
          keyboardShouldPersistTaps="handled">
          {gradient ? <StatusGradient tone={gradient} /> : null}
          {/* The app pages (Figma 7249:191734) keep the title in the white bar: no large title. */}
          {APP_PAGE_LAYOUT ? null : <PageTitle
            title={title}
            subtitle={scope ?? subtitle}
            onPressSubtitle={scope ? openScopeSwitcher : undefined}
            subtitleAccessibilityLabel={scope ? `${scope}. Switch store or channel` : undefined}
            style={header.titleStyle}
            onLayout={header.onTitleLayout}
          />}
          {/* Lazy lists on the page load their next rows as the end comes into view. */}
          <EndReachedProvider value={endReached.value}>{children}</EndReachedProvider>
        </Animated.ScrollView>
      ) : (
        // Without its own scrolling the page lays out its own bottom edge (e.g. Support chat's composer pads for the home indicator).
        <View style={[styles.screen, { paddingTop: header.barHeight }]}>{children}</View>
      )}
      <PageTopBar
        onLayout={header.onBarLayout}
        leading={<BackButton fallbackHref={fallbackHref} />}
        title={title}
        subtitle={scope ?? (APP_PAGE_LAYOUT ? subtitle : undefined)}
        onPressTitle={scope ? openScopeSwitcher : undefined}
        titleAccessibilityLabel={scope ? `${title}. ${scope}. Switch store or channel` : undefined}
        trailing={trailing}
        // Without its own scrolling the page has no large title: the small one shows from the start.
        collapsed={scroll && !APP_PAGE_LAYOUT ? header.collapsed : shown}
        surfaceOpacity={scroll && !APP_PAGE_LAYOUT ? header.surfaceOpacity : shown}
      />
      {/* Pinned to the screen's bottom edge; its padding keeps the buttons above the home indicator. */}
      {footer ? <View style={[styles.footer, { backgroundColor: theme.colors.surface, paddingBottom: FOOTER_PADDING + bottom }]}>{footer}</View> : null}
    </View>
  );
}

type CollapsingDetailScreenProps = {
  fallbackHref: Href;
  gradient?: StatusGradientTone;
  /** Large summary at the top of the page (e.g. mode tile, amount, status, meta). */
  hero: ReactNode;
  /** What the hero collapses into in the header, e.g. the amount… */
  compactTitle: string;
  /** …and the pay mode under it. */
  compactSubtitle?: string;
  footer?: ReactNode;
  /** Header controls at the top right (HeaderControl), e.g. Switch on Business profile. */
  actions?: ReactNode;
  /** Floats just above the footer (e.g. a search button); the caller animates it. */
  floating?: ReactNode;
  /** Scroll offset and visible height, e.g. to show `floating` only over a section. */
  onScroll?: (offsetY: number, viewportHeight: number) => void;
  children: ReactNode;
};

/**
 * Detail screen whose header starts as just a back button over the status
 * gradient. As the page scrolls, the hero shrinks and fades while a compact
 * version of it (compactTitle / compactSubtitle) slides into the header and
 * the header's surface fades in behind it — all driven continuously by the
 * scroll position, so the hand-off is seamless.
 */
export function CollapsingDetailScreen({
  fallbackHref,
  gradient,
  hero,
  compactTitle,
  compactSubtitle,
  footer,
  actions,
  floating,
  onScroll,
  children,
}: CollapsingDetailScreenProps) {
  const theme = useTheme();
  const [scrollY] = useState(() => new Animated.Value(0));
  const [headerHeight, setHeaderHeight] = useState(64);
  const [heroHeight, setHeroHeight] = useState(180);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const bottom = useSafeAreaInsets().bottom;
  // Scroll distance over which the hero hands off to the header.
  const collapse = Math.max(heroHeight - 24, 1);
  const range = (input: number[], output: number[]) => scrollY.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });

  const surfaceOpacity = range([collapse * 0.5, collapse], [0, 1]);
  const heroOpacity = range([0, collapse * 0.75], [1, 0]);
  const heroScale = range([0, collapse], [1, 0.8]);
  // Drifts down a little as it scrolls up, so it appears to sink into the header.
  const heroShift = range([0, collapse], [0, collapse * 0.3]);
  const compactOpacity = range([collapse * 0.6, collapse], [0, 1]);
  const compactShift = range([collapse * 0.6, collapse], [10, 0]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: onScroll
            ? (event: { nativeEvent: { contentOffset: { y: number } } }) => onScroll(event.nativeEvent.contentOffset.y, viewportHeight)
            : undefined,
        })}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: headerHeight }, !footer && { paddingBottom: CONTENT_END + bottom }]}>
        {gradient ? <StatusGradient tone={gradient} /> : null}
        <Animated.View
          onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}
          style={{ opacity: heroOpacity, transform: [{ translateY: heroShift }, { scale: heroScale }] }}>
          {hero}
        </Animated.View>
        {children}
      </Animated.ScrollView>

      {/* Floats over the content so the gradient runs up behind it until the surface fades in. */}
      <View style={styles.floatingHeader} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <Animated.View pointerEvents="none" style={[styles.headerSurface, { backgroundColor: theme.colors.surface, opacity: surfaceOpacity }]} />
        <Appbar.Header mode="small" elevated={false} style={styles.appbar}>
          <BackButton fallbackHref={fallbackHref} boxed />
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.compact, { opacity: compactOpacity, transform: [{ translateY: compactShift }] }]}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.compactTitle}>
              {compactTitle}
            </Text>
            {compactSubtitle ? (
              <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                {compactSubtitle}
              </Text>
            ) : null}
          </Animated.View>
          {actions}
        </Appbar.Header>
      </View>

      {floating ? (
        <View pointerEvents="box-none" style={[styles.floating, { bottom: footerHeight + 16 }]}>
          {floating}
        </View>
      ) : null}

      {footer ? (
        <View
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          style={[styles.footer, { backgroundColor: theme.colors.surface, paddingBottom: FOOTER_PADDING + bottom }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Back lines up with the page's 16dp content edge, as on the other pages' header.
  // App pages: Back 8dp from the edge, cards 8dp from the edges and each other (Figma 7132:120234).
  appbar: { backgroundColor: 'transparent', paddingHorizontal: APP_PAGE_LAYOUT ? 8 : 16, gap: 8 },
  content: { padding: APP_PAGE_LAYOUT ? 8 : 16, paddingBottom: CONTENT_END, gap: APP_PAGE_LAYOUT ? 8 : 24 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: GRADIENT_HEIGHT },
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
  floating: { position: 'absolute', left: 16, right: 16 },
  // Same shape as the shell's top bar: attached to the top edge, bottom corners rounded.
  headerSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: Shape.max,
    borderBottomRightRadius: Shape.max,
  },
  compact: { flex: 1, paddingHorizontal: 8 },
  compactTitle: { fontFamily: Fonts.semiBold },
  // Attached to the bottom edge, so only the content-facing (top) corners are rounded.
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: FOOTER_PADDING,
    borderTopLeftRadius: Shape.max,
    borderTopRightRadius: Shape.max,
  },
});
