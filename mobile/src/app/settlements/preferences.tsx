import { AppSettlementPreferences } from '@/components/payments/app-settlement-preferences';
import { SettlementPreferences } from '@/components/payments/settlement-preferences';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';

/** /settlements/preferences (web: /settlements/preferences). */
export default function SettlementPreferencesScreen() {
  return APP_PAGE_LAYOUT ? <AppSettlementPreferences /> : <SettlementPreferences />;
}
