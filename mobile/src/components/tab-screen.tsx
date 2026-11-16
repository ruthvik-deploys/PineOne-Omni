import type { ComponentProps, ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { TabChrome, useTabNavBar, useTabScroll } from '@/components/app-tabs';
import { type HeaderAction, type HeaderActionsMenu, useHeaderActions } from '@/components/header-actions';
import { usePullToRefresh } from '@/components/pull-to-refresh';
import { EndReachedProvider, useEndReached } from '@/components/shared/lazy-list';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';

type TabScreenProps = {
  tab: ComponentProps<typeof TabChrome>['tab'];
  /**
   * The page's own actions in the header (see useHeaderActions), for pages
   * that draw their TabScreen themselves and so can't call the hook inside it.
   */
  actions?: HeaderAction[];
  actionsMenu?: HeaderActionsMenu;
  children: ReactNode;
};

/**
 * A tab's root screen (Payments, Settlements, and every module: Refunds,
 * Disputes, Reports…): the tab chrome (header and navigation bar) around
 * scrolling content, where lazy lists load their next rows as the end of the
 * page comes into view. `actions` is the header's trailing call to action.
 */
export function TabScreen({ tab, actions, actionsMenu, children }: TabScreenProps) {
  return (
    <TabChrome tab={tab}>
      {actions ? <PageHeaderActions actions={actions} menu={actionsMenu} /> : null}
      <TabScrollContent>{children}</TabScrollContent>
    </TabChrome>
  );
}

function PageHeaderActions({ actions, menu }: { actions: HeaderAction[]; menu?: HeaderActionsMenu }) {
  useHeaderActions(actions, menu);
  return null;
}

/** Inside TabChrome, so its scrolling can collapse the large title and hide the navigation bar while scrolling down. */
function TabScrollContent({ children }: { children: ReactNode }) {
  const endReached = useEndReached();
  const navBar = useTabNavBar();
  const tabScroll = useTabScroll(endReached.scrollProps.onScroll);
  const { attach: attachPull, refreshControl, indicator: pullIndicator } = usePullToRefresh(tabScroll.contentTop);
  return (
    <View style={styles.area}>
      <Animated.ScrollView
        ref={attachPull}
        refreshControl={refreshControl}
        {...endReached.scrollProps}
        {...tabScroll.scrollProps}
        // Clear of the header (or its sub-tabs) by the page's gap, as on Overview.
        contentContainerStyle={[styles.content, { paddingTop: tabScroll.contentTop + PAGE_GAP, paddingBottom: 32 + navBar.height }]}
        keyboardShouldPersistTaps="handled">
        <EndReachedProvider value={endReached.value}>
          <View style={styles.stack}>{children}</View>
        </EndReachedProvider>
      </Animated.ScrollView>
      {pullIndicator}
    </View>
  );
}

/** The app pages (APP_PAGE_LAYOUT): cards 8dp from the screen's edges, the header, and each other. */
export const PAGE_PADDING = APP_PAGE_LAYOUT ? 8 : 16;
export const PAGE_GAP = APP_PAGE_LAYOUT ? 8 : 24;

const styles = StyleSheet.create({
  area: { flex: 1 },
  content: { padding: PAGE_PADDING },
  // Sections of a page (e.g. summary cards, toolbar, listing).
  stack: { gap: PAGE_GAP },
});
