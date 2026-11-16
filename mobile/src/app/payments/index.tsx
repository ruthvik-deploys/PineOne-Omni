import { PaymentsSampleView } from '@/components/listing-sample/payments-sample-view';
import { TransactionsHeroView } from '@/components/payments/transactions-hero-view';
import { TransactionsView } from '@/components/payments/transactions-view';
import { TabScreen } from '@/components/tab-screen';
import { LISTING_HERO_LAYOUT, LISTING_SAMPLE_LAYOUT } from '@/constants/experiments';

/** Payments tab: the transactions listing (web: /transactions). */
export default function PaymentsScreen() {
  return <TabScreen tab="payments">{LISTING_SAMPLE_LAYOUT ? <PaymentsSampleView /> : LISTING_HERO_LAYOUT ? <TransactionsHeroView /> : <TransactionsView />}</TabScreen>;
}
