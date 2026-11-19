import { useSyncExternalStore } from 'react';

import type { DotTone } from '@/components/shared/status';

/**
 * Business profile (profile → Manage → Business profile): the merchant's
 * business details, bank accounts and payment configuration in one place.
 * Mock data, as the rest of src/data; the real page reads Merchant Master,
 * KYC, Settlement, Payment configuration and MDR. Owner and Admin only.
 */

/** Roles that may open the page (the API enforces the same). */
export const BUSINESS_PROFILE_ROLES = ['Owner', 'Admin'];

export const BUSINESS_DETAILS = {
  legalName: 'Health & Glow Retailing Pvt. Ltd.',
  category: 'Retail · Health & beauty',
  address: 'No. 7, 80 Feet Rd, Koramangala 4th Block, Bengaluru, Karnataka 560034',
  pan: 'AABCH1234K',
  gstin: '29AABCH1234K1Z5',
  udyam: 'UDYAM-KR-03-0012345',
  cin: 'U52590KA1997PTC022211',
  email: 'accounts@healthandglow.com',
  phone: '+91 98450 43210',
};

export type BankAccountStatus = 'Active' | 'Inactive';
export type BankAccount = {
  id: string;
  bank: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  holder: string;
  status: BankAccountStatus;
  primary: boolean;
};

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-1',
    bank: 'HDFC',
    bankName: 'HDFC Bank',
    accountNumber: '50201234123456',
    ifsc: 'HDFC0000523',
    holder: 'Health & Glow Retailing Pvt. Ltd.',
    status: 'Active',
    primary: true,
  },
  {
    id: 'acc-2',
    bank: 'ICICI',
    bankName: 'ICICI Bank',
    accountNumber: '078805009043',
    ifsc: 'ICIC0000788',
    holder: 'Health & Glow Retailing Pvt. Ltd.',
    status: 'Active',
    primary: false,
  },
  {
    id: 'acc-3',
    bank: 'AXIS',
    bankName: 'Axis Bank',
    accountNumber: '917020045671180',
    ifsc: 'UTIB0000114',
    holder: 'Health & Glow Retailing Pvt. Ltd.',
    status: 'Active',
    primary: false,
  },
];

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';
export const REQUEST_TONE: Record<RequestStatus, DotTone> = { Pending: 'warning', Approved: 'info', Rejected: 'danger', Completed: 'success' };

/** One step of a change request's audit trail. */
export type RequestEvent = { title: string; detail: string; at: string };
export type BankChangeRequest = {
  id: string;
  /** The account being replaced. */
  fromAccountId: string;
  fromLabel: string;
  bankName: string;
  bank: string;
  accountNumber: string;
  ifsc: string;
  holder: string;
  status: RequestStatus;
  raisedOn: string;
  note?: string;
  events: RequestEvent[];
};

export const BANK_CHANGE_REQUESTS: BankChangeRequest[] = [
  {
    id: 'BCR-20418',
    fromAccountId: 'acc-2',
    fromLabel: 'ICICI ••••9043',
    bank: 'SBI',
    bankName: 'State Bank of India',
    accountNumber: '38291045566',
    ifsc: 'SBIN0001234',
    holder: 'Health & Glow Retail',
    status: 'Rejected',
    raisedOn: '02 Nov 2026',
    note: 'Account holder name doesn’t match the business name',
    events: [
      { title: 'Request raised', detail: 'Tirth Trivedi · Admin', at: '02 Nov 2026, 11:20 AM' },
      { title: 'Account verified', detail: 'Penny drop successful', at: '02 Nov 2026, 11:21 AM' },
      { title: 'Rejected', detail: 'Account holder name doesn’t match the business name', at: '03 Nov 2026, 4:05 PM' },
    ],
  },
  {
    id: 'BCR-19870',
    fromAccountId: 'acc-1',
    fromLabel: 'Axis ••••1180',
    bank: 'HDFC',
    bankName: 'HDFC Bank',
    accountNumber: '50201234123456',
    ifsc: 'HDFC0000523',
    holder: 'Health & Glow Retailing Pvt. Ltd.',
    status: 'Completed',
    raisedOn: '14 Aug 2026',
    events: [
      { title: 'Request raised', detail: 'Ravi Menon · Owner', at: '14 Aug 2026, 10:02 AM' },
      { title: 'Account verified', detail: 'Penny drop successful', at: '14 Aug 2026, 10:03 AM' },
      { title: 'Approved', detail: 'Pine Labs operations', at: '15 Aug 2026, 2:40 PM' },
      { title: 'Completed', detail: 'Settlements now go to this account', at: '16 Aug 2026, 9:00 AM' },
    ],
  },
];

/** Settlement setup, read-only here (changed in Settlement preferences). */
export const SETTLEMENT_CONFIG = {
  cycle: 'T+1',
  cycleDetail: 'Settled on the next working day by 8:00 PM',
  sameDay: false,
  onDemand: true,
};

/** A payment method with everything configured for it: whether it's live, its per-transaction limits and the MDR charged by category. */
export type MdrRate = { category: string; rate: string };
export type PayMode = { key: string; label: string; icon: string; summary: string; enabled: boolean; min: string; max: string; mdr: MdrRate[] };
export const PAY_MODES: PayMode[] = [
  {
    key: 'upi',
    label: 'UPI',
    icon: 'qr-code',
    summary: 'UPI payments on terminals',
    enabled: true,
    min: '₹1',
    max: '₹1,00,000',
    mdr: [
      { category: 'Person to merchant (P2M)', rate: '1%' },
      { category: 'Person to person (P2P)', rate: '0%' },
    ],
  },
  {
    key: 'cards',
    label: 'Cards',
    icon: 'credit-card',
    summary: 'Card payments on terminals',
    enabled: true,
    min: '₹1',
    max: '₹5,00,000',
    mdr: [
      { category: 'Debit card · up to ₹2,000', rate: '0.40%' },
      { category: 'Debit card · above ₹2,000', rate: '0.90%' },
      { category: 'Credit card', rate: '1.80%' },
      { category: 'Corporate & international', rate: '2.90%' },
    ],
  },
  {
    key: 'netbanking',
    label: 'Net banking',
    icon: 'bank',
    summary: 'Net banking payments online',
    enabled: true,
    min: '₹10',
    max: '₹10,00,000',
    mdr: [{ category: 'All banks', rate: '1.50%' }],
  },
  {
    key: 'wallets',
    label: 'Wallets',
    icon: 'wallet',
    summary: 'Wallet payments online and on terminals',
    enabled: true,
    min: '₹1',
    max: '₹20,000',
    mdr: [{ category: 'All wallets', rate: '1.90%' }],
  },
  { key: 'emi', label: 'EMI', icon: 'calendar-blank', summary: 'Card and brand EMI on terminals', enabled: false, min: '₹2,500', max: '₹5,00,000', mdr: [] },
];

/** "0% – 1.10%", or the one rate. */
export function mdrRange(rates: MdrRate[]) {
  const values = rates.map((rate) => parseFloat(rate.rate));
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high ? `${low}%` : `${low}% – ${high}%`;
}

/** ••••3456: the last four digits only. */
export function maskAccount(number: string) {
  return `••••${number.replace(/\D/g, '').slice(-4)}`;
}

/** a•••••••@healthandglow.com */
export function maskEmail(email: string) {
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

/** +91 •••••43210 */
export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `+91 •••••${digits.slice(-5)}`;
}

/** AABCH1234K → •••••1234K: the PAN's last five characters. */
export function maskPan(pan: string) {
  return `•••••${pan.slice(-5)}`;
}

export function bankFromIfsc(ifsc: string) {
  const code = ifsc.trim().toUpperCase().slice(0, 4);
  if (code === 'SBIN') return { bank: 'SBI', bankName: 'State Bank of India' };
  if (code === 'ICIC') return { bank: 'ICICI', bankName: 'ICICI Bank' };
  if (code === 'UTIB') return { bank: 'AXIS', bankName: 'Axis Bank' };
  return { bank: 'HDFC', bankName: 'HDFC Bank' };
}

/** A request to change or enable a payment method. */
export type ModeRequest = { id: string; modeKey: string; label: string; raisedOn: string; /** The support ticket that tracks it. */ ticket: string };

/**
 * Open requests, shared by the Business profile hub and its pages (bank
 * accounts, payment methods) so a request raised on one shows on the others.
 */
type RequestState = { bank: BankChangeRequest[]; modes: ModeRequest[]; accounts: BankAccount[] };
let requestState: RequestState = { bank: BANK_CHANGE_REQUESTS, modes: [], accounts: BANK_ACCOUNTS };
const requestListeners = new Set<() => void>();
const subscribeRequests = (listener: () => void) => {
  requestListeners.add(listener);
  return () => requestListeners.delete(listener);
};
export function useBusinessRequests() {
  return useSyncExternalStore(
    subscribeRequests,
    () => requestState,
    () => requestState,
  );
}
export function addBankRequest(request: BankChangeRequest) {
  requestState = { ...requestState, bank: [request, ...requestState.bank] };
  requestListeners.forEach((listener) => listener());
}
/** A verified account change (Figma 7961:26191, "Account updated successfully"): the new account takes the old one's place, and the change is kept as its history. */
export function replaceBankAccount(fromId: string, next: BankAccount, record: BankChangeRequest) {
  requestState = {
    ...requestState,
    accounts: requestState.accounts.map((account) => (account.id === fromId ? next : account)),
    bank: [record, ...requestState.bank.filter((request) => request.fromAccountId !== fromId)],
  };
  requestListeners.forEach((listener) => listener());
}
export function addModeRequest(request: ModeRequest) {
  requestState = { ...requestState, modes: [request, ...requestState.modes.filter((item) => item.modeKey !== request.modeKey)] };
  requestListeners.forEach((listener) => listener());
}

/** Documents the business uploaded at onboarding (and since), downloadable from Business profile. */
export type BusinessDocument = { id: string; name: string; detail: string; file: 'PDF' | 'JPG'; size: string; uploadedOn: string };
export const BUSINESS_DOCUMENTS: BusinessDocument[] = [
  { id: 'doc-pan', name: 'PAN card', detail: 'Business PAN', file: 'PDF', size: '312 KB', uploadedOn: '12 Jan 2025' },
  { id: 'doc-gst', name: 'GST certificate', detail: 'GSTIN 29AABCH1234K1Z5', file: 'PDF', size: '486 KB', uploadedOn: '12 Jan 2025' },
  { id: 'doc-coi', name: 'Certificate of incorporation', detail: 'CIN U52590KA1997PTC022211', file: 'PDF', size: '1.2 MB', uploadedOn: '12 Jan 2025' },
  { id: 'doc-udyam', name: 'Udyam certificate', detail: 'UDYAM-KR-03-0012345', file: 'PDF', size: '274 KB', uploadedOn: '14 Jan 2025' },
  { id: 'doc-cheque', name: 'Cancelled cheque', detail: 'HDFC Bank ••••3456', file: 'JPG', size: '820 KB', uploadedOn: '14 Jan 2025' },
  { id: 'doc-shop', name: 'Shop & establishment certificate', detail: 'Koramangala store', file: 'PDF', size: '640 KB', uploadedOn: '18 Jan 2025' },
  { id: 'doc-board', name: 'Board resolution', detail: 'Authorised signatory', file: 'PDF', size: '398 KB', uploadedOn: '18 Jan 2025' },
  { id: 'doc-address', name: 'Address proof', detail: 'Electricity bill, Dec 2024', file: 'PDF', size: '512 KB', uploadedOn: '20 Jan 2025' },
];
