/**
 * Value Added Services: the extras a merchant can switch on from the app,
 * with what each needs, as in the current app's Value Added Services flows.
 */
import { getDeviceRows } from './terminal-devices';

export type ServiceKey = 'same-day' | 'on-demand' | 'international-cards' | 'dcc' | 'brand-emi' | 'payment-qr';

export type ValueAddedService = {
  key: ServiceKey;
  title: string;
  /** One line on what it does for the merchant. */
  summary: string;
  icon: string;
  /** Already on for this merchant. */
  active: boolean;
};

export const VALUE_ADDED_SERVICES: ValueAddedService[] = [
  { key: 'same-day', title: 'Same-Day settlement', summary: 'Receive your payments the same day', icon: 'clock', active: false },
  { key: 'on-demand', title: 'On-Demand settlement', summary: 'Instant settlement, when you need it', icon: 'lightning', active: true },
  { key: 'international-cards', title: 'International card acceptance', summary: 'Accept cards issued outside India', icon: 'globe', active: false },
  { key: 'dcc', title: 'Dynamic currency conversion', summary: 'Foreign customers pay in their own currency', icon: 'currency-circle-dollar', active: false },
  { key: 'brand-emi', title: 'Brand EMI', summary: 'Offer brand-funded EMI on your products', icon: 'percent', active: true },
  { key: 'payment-qr', title: 'Payment QR', summary: 'Order a QR standee for your counter', icon: 'qr-code', active: false },
];

/** Same-Day settlement: the fee and when payments reach the bank. */
export const SAME_DAY_FEE = '0.10%';
export const SAME_DAY_WINDOWS = [
  { captured: 'Before 5 PM', settles: 'By 6 PM the same day' },
  { captured: '5 PM to 8 PM', settles: 'By 9 PM the same day' },
  { captured: 'After 8 PM', settles: 'Next working day' },
];

/** On-Demand settlement's fee as the service is enabled. */
export const ON_DEMAND_FEE = '0.10%';

/** A store's devices, with the terminal ID each is registered under, for the service request forms. */
export function terminalsForStore(storeId: string) {
  return getDeviceRows()
    .filter((device) => device.storeId === storeId)
    .map((device) => ({ posId: device.posId, tid: `TID${device.posId.replace(/\D/g, '').slice(-8)}`, model: device.model }));
}

/** Brand EMI: the brands whose EMI is live at the merchant's stores. */
export const ACTIVE_BRAND_EMIS = [
  { brand: 'Samsung', products: 'Mobiles, TVs', tenures: '3, 6, 9 months' },
  { brand: 'Apple', products: 'iPhone, iPad, Mac', tenures: '3, 6 months' },
  { brand: 'LG', products: 'Appliances', tenures: '6, 9, 12 months' },
];

export const BRAND_EMI_BRANDS = ['Samsung', 'Apple', 'LG', 'Sony', 'OnePlus', 'Whirlpool', 'Dell', 'HP'];
