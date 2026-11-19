import { router } from 'expo-router';

import { SettlementsSampleView } from '@/components/listing-sample/settlements-sample-view';
import { SettlementsHeroView } from '@/components/payments/settlements-hero-view';
import { SettlementsView } from '@/components/payments/settlements-view';
import { TabScreen } from '@/components/tab-screen';
import { APP_PAGE_LAYOUT, LISTING_HERO_LAYOUT, LISTING_SAMPLE_LAYOUT } from '@/constants/experiments';

/** Settlements tab (web: /settlements). The app pages put Preferences in the header (Figma 7161:93454). */
export default function SettlementsScreen() {
  return (
    <TabScreen tab="settlements" actions={APP_PAGE_LAYOUT ? [{ label: 'Preferences', icon: '', onPress: () => router.push('/settlements/preferences') }] : undefined}>
      {LISTING_SAMPLE_LAYOUT ? <SettlementsSampleView /> : LISTING_HERO_LAYOUT ? <SettlementsHeroView /> : <SettlementsView />}
    </TabScreen>
  );
}
