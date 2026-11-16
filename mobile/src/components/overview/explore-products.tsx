import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { PRODUCT_BANNERS } from '@/data/overview';

const BANNER_WIDTH = 306;
const BANNER_HEIGHT = 136;
const CARD_GAP = 8;

/**
 * "Explore products" (Figma 6470:811; web: OverviewExploreProducts): a title
 * with its own View all link (titles aren't links, user decision), then the
 * four product promo banners in a horizontal scroll. Banners are the web
 * app's own images (public/images/overview-products), the same as the design's.
 */
export function ExploreProducts(props: { onPressViewAll?: () => void; onPressBanner?: (id: string) => void }) {
  return APP_PAGE_LAYOUT ? <ExploreProductsCard {...props} /> : <ExploreProductsRow {...props} />;
}

/**
 * The app pages' version (APP_PAGE_LAYOUT, Figma 7154:141243): a white card
 * with the title and View all, one banner at a time across the card's width,
 * paged, and dots under it saying which.
 */
function ExploreProductsCard({ onPressViewAll, onPressBanner }: { onPressViewAll?: () => void; onPressBanner?: (id: string) => void }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const step = width + CARD_GAP;
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]} accessibilityRole="header">
          Explore products
        </Text>
        <TouchableRipple onPress={onPressViewAll} borderless accessibilityRole="button" accessibilityLabel="View all products" style={styles.viewAll}>
          <View style={styles.viewAllContent}>
            <Text style={[styles.viewAllLabel, { color: theme.colors.primary }]}>View all</Text>
            <Icon source="caret-right" size={16} color={theme.colors.primary} />
          </View>
        </TouchableRipple>
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.pager}>
        {width ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={step}
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEventThrottle={16}
            onScroll={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / step))}
            contentContainerStyle={{ gap: CARD_GAP }}>
            {PRODUCT_BANNERS.map((banner) => (
              <TouchableRipple
                key={banner.id}
                onPress={onPressBanner ? () => onPressBanner(banner.id) : undefined}
                accessibilityRole="button"
                accessibilityLabel={banner.alt}
                borderless
                style={[styles.cardBanner, { width, height: Math.round((width * BANNER_HEIGHT) / BANNER_WIDTH) }]}>
                <Image source={banner.image} style={styles.image} contentFit="cover" accessibilityIgnoresInvertColors />
              </TouchableRipple>
            ))}
          </ScrollView>
        ) : null}
      </View>
      <View style={styles.dots} accessibilityLabel={`Product ${page + 1} of ${PRODUCT_BANNERS.length}`}>
        {PRODUCT_BANNERS.map((banner, index) => (
          <View
            key={banner.id}
            style={[styles.dot, index === page && styles.dotActive, { backgroundColor: index === page ? theme.colors.onSurface : theme.colors.outlineVariant }]}
          />
        ))}
      </View>
    </View>
  );
}

function ExploreProductsRow({ onPressViewAll, onPressBanner }: { onPressViewAll?: () => void; onPressBanner?: (id: string) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]} accessibilityRole="header">
          Explore products
        </Text>
        <TouchableRipple onPress={onPressViewAll} borderless accessibilityRole="button" accessibilityLabel="View all products" style={styles.viewAll}>
          <View style={styles.viewAllContent}>
            <Text style={[styles.viewAllLabel, { color: theme.colors.primary }]}>View all</Text>
            <Icon source="caret-right" size={16} color={theme.colors.primary} />
          </View>
        </TouchableRipple>
      </View>
      {/* Bleeds to the screen edges so the next banner peeks in, as the web's fade hints. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.row}>
        {PRODUCT_BANNERS.map((banner) => (
          <TouchableRipple
            key={banner.id}
            onPress={onPressBanner ? () => onPressBanner(banner.id) : undefined}
            accessibilityRole="button"
            accessibilityLabel={banner.alt}
            borderless
            style={styles.banner}>
            <Image source={banner.image} style={styles.image} contentFit="cover" accessibilityIgnoresInvertColors />
          </TouchableRipple>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Shape.max, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginRight: -10 },
  pager: { minHeight: 1 },
  cardBanner: { borderRadius: Shape.small, overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 4, paddingTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 16 },
  section: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24 },
  viewAll: { borderRadius: Shape.small },
  viewAllContent: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10 },
  viewAllLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  scroller: { marginHorizontal: -16 },
  row: { gap: 12, paddingHorizontal: 16 },
  banner: { width: BANNER_WIDTH, height: BANNER_HEIGHT, borderRadius: Shape.max, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
