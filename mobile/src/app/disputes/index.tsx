import { useLocalSearchParams } from 'expo-router';

import { DisputesHeroView } from '@/components/disputes/disputes-hero-view';
import { DisputesList } from '@/components/disputes/disputes-list';
import { LISTING_HERO_LAYOUT } from '@/constants/experiments';
import { DISPUTE_STATUSES, type DisputeStatus } from '@/data/disputes';

/** /disputes. `?status=Action pending` opens on that status. */
export default function DisputesScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const initialStatus = DISPUTE_STATUSES.find((entry) => entry === status) as DisputeStatus | undefined;
  return LISTING_HERO_LAYOUT ? <DisputesHeroView initialStatus={initialStatus} /> : <DisputesList />;
}
