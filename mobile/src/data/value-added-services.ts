/**
 * Value Added Services (VAS): the extras a merchant can see, request and
 * track in the app. Mock data shaped as the VAS PRD asks Onboarding to expose
 * for each service: whether it's enabled, whether the merchant can request it
 * (eligibility, merchant model), which documents are already on file and what
 * else is pending (documents, approvals, manual steps).
 */
import { BUSINESS_DETAILS } from './business-profile';
import { getDeviceRows } from './terminal-devices';

export type ServiceKey = 'same-day' | 'on-demand' | 'upi' | 'international-cards' | 'dcc' | 'emi' | 'instant-cashback' | 'pbl-sms' | 'pbl-emi' | 'rupay-cc' | 'payment-qr';

/** The three states merchants see; the backend keeps the richer sub-state. */
export type VasStatus = 'Enabled' | 'Not enabled' | 'In processing';
export type VasSubState =
  | 'Not requested'
  | 'Requested'
  | 'Docs pending'
  | 'Eligibility check pending'
  | 'Approval pending'
  | 'Risk review'
  | 'Bank/Network review'
  | 'Provisioning in progress'
  | 'Active'
  | 'Rejected'
  | 'Failed'
  | 'Deactivated';

export type MerchantModel = 'Aggregator' | 'Non-aggregator';
export type DocState = 'Available' | 'Missing' | 'Expired' | 'Rejected' | 'Not required';
export type VasDocument = { name: string; state: DocState; /** Why it's expired or rejected. */ note?: string };
export type ApprovalType = 'Risk' | 'Commercial' | 'Bank / Acquirer' | 'Ops / Onboarding';
export type Criterion = { label: string; met: boolean };
export type VasEvent = { title: string; detail?: string; at: string };
/** What the request form asks for beyond what's pre-filled. */
export type InputKind = 'device' | 'volume' | 'acceptance' | 'contact';
/** Services that keep their own flow instead of the standard request. */
export type CustomFlow = 'same-day' | 'on-demand' | 'brand-emi' | 'payment-qr';

export type ValueAddedService = {
  key: ServiceKey;
  title: string;
  /** One line on what it does for the merchant. */
  summary: string;
  icon: string;
  status: VasStatus;
  subState: VasSubState;
  applicability: MerchantModel[];
  /** What changes for this merchant's model (aggregator / non-aggregator notes). */
  modelNote: string;
  eligibility: Criterion[];
  /** Pricing shown before requesting; commercial approval means accepting it. */
  commercials?: string;
  documents: VasDocument[];
  approvals: ApprovalType[];
  /** Expected turnaround once requested. */
  tat: string;
  inputs: InputKind[];
  /** Can be switched off from the app once enabled. */
  disableable?: boolean;
  flow?: CustomFlow;
  requestId?: string;
  /** What the merchant gave with the request (store, device, volume, contact…), as label/value pairs. */
  submitted?: { label: string; value: string }[];
  events?: VasEvent[];
  /** What happens next, while in processing. */
  nextAction?: string;
};

/** The signed-in merchant, as Onboarding knows it: pre-fills every request. */
export const MERCHANT_MODEL: MerchantModel = 'Aggregator';
export const MERCHANT_PREFILL = {
  category: BUSINESS_DETAILS.category,
  mcc: '5912 · Drug stores & pharmacies',
};

/** KYC on file from onboarding, reused instead of asked again. */
const KYC: VasDocument[] = [
  { name: 'PAN card', state: 'Available' },
  { name: 'GST certificate', state: 'Available' },
];

export const APPROVAL_COPY: Record<ApprovalType, string> = {
  Risk: 'Pine Labs’ risk team reviews the request manually',
  Commercial: 'You accept the pricing before it’s set up',
  'Bank / Acquirer': 'Your acquiring bank turns it on, which can take longer',
  'Ops / Onboarding': 'Pine Labs configures it on your devices',
};

export const VALUE_ADDED_SERVICES: ValueAddedService[] = [
  {
    key: 'same-day',
    title: 'Same-Day settlement',
    summary: 'Receive your payments the same day',
    icon: 'clock',
    status: 'Not enabled',
    subState: 'Not requested',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'Turns on instantly for your account.',
    eligibility: [{ label: 'KYC verified', met: true }],
    documents: [],
    approvals: [],
    tat: 'Instant',
    inputs: [],
    flow: 'same-day',
  },
  {
    key: 'on-demand',
    title: 'On-Demand settlement',
    summary: 'Instant settlement, when you need it',
    icon: 'lightning',
    status: 'Enabled',
    subState: 'Active',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'Settle any time from the Settlements tab.',
    eligibility: [{ label: 'KYC verified', met: true }],
    documents: [],
    approvals: [],
    tat: 'Instant',
    inputs: [],
    flow: 'on-demand',
  },
  {
    key: 'upi',
    title: 'UPI',
    summary: 'Accept payments from any UPI app',
    icon: 'qr-code',
    status: 'Enabled',
    subState: 'Active',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'As an aggregator merchant, UPI was turned on by Pine Labs at onboarding.',
    eligibility: [
      { label: 'Onboarding complete', met: true },
      { label: 'Settlement account verified', met: true },
    ],
    documents: KYC,
    approvals: ['Ops / Onboarding'],
    tat: '1–2 working days',
    inputs: ['device'],
  },
  {
    key: 'international-cards',
    title: 'International card acceptance',
    summary: 'Accept cards issued outside India',
    icon: 'globe',
    status: 'Not enabled',
    subState: 'Not requested',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'As an aggregator merchant, Pine Labs checks acquirer and routing eligibility for your devices.',
    eligibility: [
      { label: 'Your business category (MCC) allows international cards', met: true },
      { label: 'No risk restrictions on your business', met: true },
      { label: 'Your acquirer supports international acceptance', met: true },
    ],
    commercials: 'MDR of 2.9% + GST on each international card payment',
    documents: [
      ...KYC,
      { name: 'Shop & establishment certificate', state: 'Expired', note: 'Expired on 30 Sep 2026' },
      { name: 'International acceptance form', state: 'Missing' },
    ],
    approvals: ['Risk', 'Commercial', 'Bank / Acquirer'],
    tat: '5–7 working days',
    inputs: ['device', 'volume', 'acceptance'],
  },
  {
    key: 'dcc',
    title: 'Dynamic currency conversion',
    summary: 'Foreign customers pay in their own currency',
    icon: 'currency-circle-dollar',
    status: 'Not enabled',
    subState: 'Not requested',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'Depends on Pine Labs’ DCC routing for your acquirer.',
    eligibility: [
      { label: 'International card acceptance is enabled', met: false },
      { label: 'Your business category (MCC) allows DCC', met: true },
    ],
    documents: [...KYC, { name: 'DCC consent form', state: 'Missing' }],
    approvals: ['Risk', 'Bank / Acquirer'],
    tat: '7–10 working days',
    inputs: ['device', 'contact'],
  },
  {
    key: 'emi',
    title: 'EMI',
    summary: 'Offer brand and bank EMI on your products',
    icon: 'percent',
    status: 'Enabled',
    subState: 'Active',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'As an aggregator merchant, EMI programs use Pine Labs’ standard configuration.',
    eligibility: [
      { label: 'Your business category supports EMI', met: true },
      { label: 'Your devices support EMI', met: true },
    ],
    documents: KYC,
    approvals: ['Ops / Onboarding'],
    tat: '3–5 working days',
    inputs: [],
    flow: 'brand-emi',
  },
  {
    key: 'instant-cashback',
    title: 'Instant cashback',
    summary: 'Run bank and brand cashback offers at checkout',
    icon: 'money-wavy',
    status: 'In processing',
    subState: 'Docs pending',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'As an aggregator merchant, standard issuer schemes are available to you.',
    eligibility: [
      { label: 'Your business category supports cashback schemes', met: true },
      { label: 'Pricing set up for your account', met: true },
    ],
    commercials: 'Scheme subvention as per the issuer program; no extra MDR',
    documents: [...KYC, { name: 'Scheme acceptance form', state: 'Rejected', note: 'Signature missing on page 2' }],
    approvals: ['Commercial', 'Ops / Onboarding'],
    tat: '3–5 working days',
    inputs: ['device'],
    requestId: 'VAS-50417822',
    submitted: [
      { label: 'Store', value: 'Koramangala' },
      { label: 'Device', value: 'POS 10023456' },
      { label: 'Pricing', value: 'Accepted' },
    ],
    events: [
      { title: 'Request received', detail: 'Tirth Trivedi · Admin', at: '10 Nov 2026, 11:42 AM' },
      { title: 'Pricing accepted', at: '10 Nov 2026, 11:42 AM' },
      { title: 'More documents needed', detail: 'Scheme acceptance form: signature missing on page 2', at: '12 Nov 2026, 3:15 PM' },
    ],
    nextAction: 'Re-upload the scheme acceptance form',
  },
  {
    key: 'pbl-sms',
    title: 'Pay by Link SMS',
    summary: 'Send payment links to customers by SMS',
    icon: 'link-simple',
    status: 'In processing',
    subState: 'Risk review',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'Set up on a virtual POS routed centrally by Pine Labs.',
    eligibility: [
      { label: 'Virtual POS set up', met: true },
      { label: 'No risk or AML restrictions', met: true },
    ],
    documents: KYC,
    approvals: ['Risk', 'Ops / Onboarding'],
    tat: '3–5 working days',
    inputs: ['device'],
    requestId: 'VAS-50398104',
    submitted: [
      { label: 'Store', value: 'Indiranagar' },
      { label: 'Device', value: 'Virtual POS 20087731' },
    ],
    events: [
      { title: 'Request received', detail: 'Tirth Trivedi · Admin', at: '13 Nov 2026, 10:05 AM' },
      { title: 'Documents verified', detail: 'Reused from onboarding', at: '13 Nov 2026, 10:05 AM' },
      { title: 'Sent for risk review', detail: 'Manual review by Pine Labs', at: '14 Nov 2026, 9:30 AM' },
    ],
    nextAction: 'Risk review · usually 2–3 working days',
  },
  {
    key: 'pbl-emi',
    title: 'Pay by Link EMI',
    summary: 'Let customers pay by EMI from a payment link',
    icon: 'calendar-blank',
    status: 'Not enabled',
    subState: 'Not requested',
    applicability: ['Aggregator'],
    modelNote: 'Relies on your active VAS flags and acquirer/TID mapping.',
    eligibility: [
      { label: 'Pay by Link SMS is enabled', met: false },
      { label: 'EMI is enabled', met: true },
    ],
    documents: KYC,
    approvals: ['Ops / Onboarding'],
    tat: '3–5 working days',
    inputs: ['device'],
  },
  {
    key: 'rupay-cc',
    title: 'RuPay credit card on UPI',
    summary: 'Accept RuPay credit cards linked to UPI',
    icon: 'credit-card',
    status: 'Enabled',
    subState: 'Active',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'MDR applies as disclosed below for aggregator merchants.',
    eligibility: [
      { label: 'UPI is enabled', met: true },
      { label: 'Pricing accepted', met: true },
    ],
    commercials: 'MDR of 1.10% + GST on payments above ₹2,000',
    documents: KYC,
    approvals: ['Commercial'],
    tat: '1–2 working days',
    inputs: [],
    disableable: true,
  },
  {
    key: 'payment-qr',
    title: 'Payment QR',
    summary: 'Order a QR standee for your counter',
    icon: 'qr-code',
    status: 'Not enabled',
    subState: 'Not requested',
    applicability: ['Aggregator', 'Non-aggregator'],
    modelNote: 'Delivered to the store you pick.',
    eligibility: [{ label: 'UPI is enabled', met: true }],
    documents: [],
    approvals: [],
    tat: '5–7 working days',
    inputs: [],
    flow: 'payment-qr',
  },
];

/** Requestable: not enabled, nothing in processing, and every criterion met. */
export function isEligible(service: ValueAddedService) {
  return service.applicability.includes(MERCHANT_MODEL) && service.eligibility.every((criterion) => criterion.met);
}

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

/** EMI: the brands whose EMI is live at the merchant's stores. */
export const ACTIVE_BRAND_EMIS = [
  { brand: 'Samsung', products: 'Mobiles, TVs', tenures: '3, 6, 9 months' },
  { brand: 'Apple', products: 'iPhone, iPad, Mac', tenures: '3, 6 months' },
  { brand: 'LG', products: 'Appliances', tenures: '6, 9, 12 months' },
];

export const BRAND_EMI_BRANDS = ['Samsung', 'Apple', 'LG', 'Sony', 'OnePlus', 'Whirlpool', 'Dell', 'HP'];

export const INTERNATIONAL_VOLUMES = ['Up to ₹1 lakh a month', '₹1–10 lakh a month', 'Over ₹10 lakh a month'];
export const ACCEPTANCE_MODELS = ['In-store', 'Online', 'Both'];

/** A ticket raised for a service, as the support page lists them. */
export type ServiceTicket = { id: string; title: string; status: 'Open' | 'In progress' | 'Resolved'; date: string };
/** A partner brand or bank; `bank` draws the bank's logo instead of initials. */
export type Partner = { name: string; detail: string; live?: boolean; bank?: string };

/**
 * A service's listings in its details: who it works with (partner brands,
 * bank offers) and when it was enabled.
 */
export type ServiceInfo = {
  partners?: { heading: string; items: Partner[] };
  /** When it was enabled, shown under the name. */
  since?: string;
};

const ACTIVE_BRANDS = ['Samsung', 'Apple', 'LG'];
const EMI_PARTNERS: Partner[] = [
  { name: 'Samsung', detail: 'Mobiles, TVs · 3, 6, 9 months' },
  { name: 'Apple', detail: 'iPhone, iPad, Mac · 3, 6 months' },
  { name: 'LG', detail: 'Appliances · 6, 9, 12 months' },
  { name: 'Sony', detail: 'TVs, audio · 3, 6, 9 months' },
  { name: 'OnePlus', detail: 'Mobiles · 3, 6 months' },
  { name: 'Whirlpool', detail: 'Appliances · 6, 9, 12 months' },
  { name: 'Dell', detail: 'Laptops · 3, 6, 9, 12 months' },
  { name: 'HP', detail: 'Laptops, printers · 3, 6, 9 months' },
].map((partner) => ({ ...partner, live: ACTIVE_BRANDS.includes(partner.name) }));

export const SERVICE_INFO: Partial<Record<ServiceKey, ServiceInfo>> = {
  upi: {
    since: '14 Feb 2025',
  },
  emi: {
    partners: { heading: 'Partner brands', items: EMI_PARTNERS },
    since: '03 Mar 2025',
  },
  'instant-cashback': {
    partners: {
      heading: 'Partner offers',
      items: [
        { name: 'HDFC Bank', bank: 'HDFC', detail: '10% up to ₹1,500 on credit cards' },
        { name: 'ICICI Bank', bank: 'ICICI', detail: '7.5% up to ₹1,000 on credit cards' },
        { name: 'Axis Bank', bank: 'AXIS', detail: '5% up to ₹750 on debit and credit cards' },
        { name: 'SBI Card', bank: 'SBI', detail: '10% up to ₹2,000 on EMI' },
      ],
    },
  },
  'rupay-cc': {
    since: '22 Jun 2026',
  },
};
