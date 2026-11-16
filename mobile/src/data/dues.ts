/**
 * Pending dues: what the merchant owes Pine Labs (device rentals and service
 * fees), billed as invoices with a due date, and their past payment attempts.
 * Amounts and dates follow the current app's Pending dues screens.
 */
import { useSyncExternalStore } from 'react';

import { parseDisplayDate } from './transactions';

export type Due = {
  id: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  /** When the invoice PDF was last regenerated. */
  invoiceUpdated: string;
  /** The line-item annexure isn't issued for every invoice. */
  hasAnnexure: boolean;
};

export type DuePaymentStatus = 'Paid' | 'Failed';

/**
 * A payment towards the outstanding balance. Payments are made in bulk and
 * aren't matched to invoices, so a payment carries no invoice number.
 */
export type DuePayment = {
  id: string;
  amount: number;
  date: string;
  /** "10:30 am", as the Figma row shows it. */
  time: string;
  method: 'UPI' | 'Net banking' | 'Card';
  status: DuePaymentStatus;
};

/** An invoice the balance has cleared; which payment cleared it isn't known. */
export type PaidInvoice = Due;

/** The demo's "today", so due dates read as they did in the recording. */
export const DUES_TODAY = new Date(2026, 9, 23);

export const DUES: Due[] = [
  { id: 'due-1', invoiceNumber: 'PLINV-2609-0114', amount: 114, dueDate: '20 Oct 2026', invoiceUpdated: '15 Aug 2026', hasAnnexure: false },
  { id: 'due-2', invoiceNumber: 'PLINV-2609-1849', amount: 184979, dueDate: '24 Oct 2026', invoiceUpdated: '15 Sep 2026', hasAnnexure: true },
  { id: 'due-3', invoiceNumber: 'PLINV-2609-0931', amount: 931, dueDate: '28 Oct 2026', invoiceUpdated: '15 Sep 2026', hasAnnexure: false },
  { id: 'due-4', invoiceNumber: 'PLINV-2609-3905', amount: 3905, dueDate: '28 Oct 2026', invoiceUpdated: '15 Sep 2026', hasAnnexure: false },
  { id: 'due-5', invoiceNumber: 'PLINV-2610-7817', amount: 78175, dueDate: '28 Oct 2026', invoiceUpdated: '15 Oct 2026', hasAnnexure: true },
  { id: 'due-6', invoiceNumber: 'PLINV-2610-8212', amount: 82127, dueDate: '28 Oct 2026', invoiceUpdated: '15 Oct 2026', hasAnnexure: true },
  { id: 'due-7', invoiceNumber: 'PLINV-2610-7234', amount: 72341, dueDate: '28 Oct 2026', invoiceUpdated: '15 Oct 2026', hasAnnexure: false },
];

export const DUE_PAYMENTS: DuePayment[] = [
  { id: 'pay-1', amount: 75500, date: '25 Sep 2026', time: '10:30 am', method: 'UPI', status: 'Failed' },
  { id: 'pay-2', amount: 31160, date: '27 Aug 2026', time: '4:12 pm', method: 'Net banking', status: 'Paid' },
  { id: 'pay-3', amount: 31160, date: '27 Aug 2026', time: '4:05 pm', method: 'Card', status: 'Failed' },
  { id: 'pay-4', amount: 3388, date: '28 Jul 2026', time: '9:15 am', method: 'UPI', status: 'Paid' },
];

/** Invoices the balance has already cleared, newest first. */
export const PAID_INVOICES: PaidInvoice[] = [
  { id: 'inv-4410', invoiceNumber: 'PLINV-2608-4410', amount: 4410, dueDate: '28 Aug 2026', invoiceUpdated: '15 Aug 2026', hasAnnexure: true },
  { id: 'inv-2675', invoiceNumber: 'PLINV-2608-2675', amount: 26750, dueDate: '28 Aug 2026', invoiceUpdated: '15 Aug 2026', hasAnnexure: false },
  { id: 'inv-3388', invoiceNumber: 'PLINV-2607-3388', amount: 3388, dueDate: '28 Jul 2026', invoiceUpdated: '15 Jul 2026', hasAnnexure: true },
];

export const dueDateOf = (due: Due) => parseDisplayDate(due.dueDate, '11:59 PM') ?? DUES_TODAY;

/**
 * What's still owed and what's been paid, shared by Pending dues and its
 * Invoices page, so paying on one shows on the other.
 */
type DuesState = { dues: Due[]; payments: DuePayment[]; paid: PaidInvoice[] };

let state: DuesState = { dues: DUES, payments: DUE_PAYMENTS, paid: PAID_INVOICES };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDues() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/**
 * Pays the whole outstanding balance in one payment, today: every unpaid
 * invoice is cleared and one payment for the total joins the history.
 */
export function payAllDues() {
  if (!state.dues.length) return;
  const amount = state.dues.reduce((sum, due) => sum + due.amount, 0);
  const date = DUES_TODAY.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  state = {
    dues: [],
    payments: [{ id: `pay-${Date.now()}`, amount, date, time, method: 'UPI', status: 'Paid' }, ...state.payments],
    paid: [...state.dues, ...state.paid],
  };
  listeners.forEach((listener) => listener());
}
