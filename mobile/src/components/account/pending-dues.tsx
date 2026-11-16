import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Icon, IconButton, Text, useTheme } from 'react-native-paper';

import { ListingCard } from '@/components/listing-hero/listing-card';
import { useListDates } from '@/components/listing-hero/time-scope';
import { Tabs } from '@/components/material3/tabs';
import { DotSeparated, RowAmount } from '@/components/payments/payment-row';
import { DimmedDecimalAmount } from '@/components/shared/amount';
import { DayGroupedList, dayTotals, displayTimestamp, groupByDay, sortNewestFirst } from '@/components/shared/day-groups';
import { DetailScreen } from '@/components/shared/detail-screen';
import { ListDivider, ListRow, ListRowLine, selectFilter, StatusStack } from '@/components/shared/listing';
import { PanelSheet } from '@/components/shared/panel-sheet';
import { PaymentSummary, SheetBlock, SheetButton, SheetSuccess } from '@/components/shared/sheet-parts';
import { DotStatusBadge } from '@/components/shared/status';
import { PAGE_PADDING } from '@/components/tab-screen';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { daysBetween, dueIn, formatInr } from '@/data/common';
import { type Due, dueDateOf, type DuePayment, DUES_TODAY, type PaidInvoice, payAllDues, useDues } from '@/data/dues';
import { parseDisplayDate } from '@/data/transactions';
import { useToast } from '@/hooks/use-toast';

const byDueDate = (a: Due, b: Due) => dueDateOf(a).getTime() - dueDateOf(b).getTime();
const daysLeft = (due: Due) => daysBetween(DUES_TODAY, dueDateOf(due));
const shortDate = (date: string) => date.replace(/ \d{4}$/, '');

/** Unpaid, or past its date; the note under it says how soon, red from a day out. */
function dueStatus(due: Due) {
  const days = daysLeft(due);
  return {
    badge: <DotStatusBadge label={days < 0 ? 'Overdue' : 'Unpaid'} tone={days < 0 ? 'danger' : 'warning'} />,
    note: dueIn(dueDateOf(due), DUES_TODAY),
    urgent: days <= 1,
  };
}

/**
 * Invoices (profile → Manage → Pending dues), as Figma 7804:118368: Back and
 * the title in the bar, then Pending / All Invoices tabs. Pending is the
 * amount owed (View invoices opens the unpaid ones in a sheet; Pay dues now
 * pays them all) over the payments made so far, by day. All Invoices lists
 * every invoice with its status and a download. Payments go towards the
 * balance in bulk and aren't matched to invoices, so neither side links to
 * the other and there's no paying one invoice on its own.
 */
export function PendingDues() {
  const { dues, payments, paid } = useDues();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [paying, setPaying] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  return (
    <DetailScreen title="Invoices" fallbackHref="/">
      <View style={styles.tabs}>
        <Tabs
          variant="secondary"
          tabs={[
            { key: 'pending', label: 'Pending' },
            { key: 'all', label: 'All Invoices' },
          ]}
          activeKey={tab}
          onChange={(key) => setTab(key as typeof tab)}
        />
      </View>

      {tab === 'pending' ? (
        <View style={styles.stack}>
          <PendingAmountCard dues={dues} onViewInvoices={() => setListOpen(true)} onPay={() => setPaying(true)} />
          <PastPayments payments={payments} />
        </View>
      ) : (
        <AllInvoices dues={dues} paid={paid} />
      )}

      <PendingInvoicesSheet visible={listOpen} dues={dues} onDismiss={() => setListOpen(false)} />
      <PayAllSheet visible={paying} dues={dues} onDismiss={() => setPaying(false)} />
    </DetailScreen>
  );
}

/**
 * Figma 7804:118701: PENDING AMOUNT with the hourglass, a hairline, the total
 * (20/28, faint paise) over "7 Pending invoices  View invoices", a hairline,
 * then Pay dues now at the end.
 */
function PendingAmountCard({ dues, onViewInvoices, onPay }: { dues: Due[]; onViewInvoices: () => void; onPay: () => void }) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const rule = { borderColor: theme.colors.background };
  const total = dues.reduce((sum, due) => sum + due.amount, 0);
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.cardHeader, styles.ruleBelow, rule]}>
        <Icon source="hourglass-low" size={20} color={theme.colors.onSurfaceVariant} />
        <Text accessibilityRole="header" style={[styles.medium, muted]}>
          PENDING AMOUNT
        </Text>
      </View>
      <View style={styles.amountBlock}>
        <DimmedDecimalAmount value={formatInr(total)} size="medium" />
        {dues.length ? (
          <View style={styles.countRow}>
            <Text style={[styles.medium, muted]}>
              {dues.length} Pending {dues.length === 1 ? 'invoice' : 'invoices'}
            </Text>
            <Text onPress={onViewInvoices} accessibilityRole="button" style={[styles.medium, styles.link, { color: theme.colors.primary }]}>
              View invoices
            </Text>
          </View>
        ) : (
          <Text style={[styles.medium, muted]}>You have no dues right now</Text>
        )}
      </View>
      {dues.length ? (
        <View style={[styles.cardFooter, styles.ruleAbove, rule]}>
          <Button mode="contained" onPress={onPay} style={styles.smallButton} contentStyle={styles.smallButtonContent} labelStyle={styles.smallButtonLabel}>
            Pay dues now
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const PAY_METHOD_ICON: Record<DuePayment['method'], string> = { UPI: 'bank', 'Net banking': 'bank', Card: 'credit-card' };

/**
 * Figma 7804:119252: "Past payments" heading the card, then a grey band per
 * day and its payments — the amount, "10:30 am · UPI", and Success or Failed.
 * Payments cover the balance in bulk, so a row names no invoice.
 */
function PastPayments({ payments }: { payments: DuePayment[] }) {
  const theme = useTheme();
  const sorted = sortNewestFirst(payments, (payment) => displayTimestamp(payment.date, payment.time.toUpperCase()));
  const renderPayment = (payment: DuePayment) => {
    const label = payment.status === 'Paid' ? 'Success' : 'Failed';
    return (
      <ListRow key={payment.id} icon={PAY_METHOD_ICON[payment.method]} accessibilityLabel={`${formatInr(payment.amount)} at ${payment.time} by ${payment.method}, ${label}`}>
        <ListRowLine
          centered
          left={
            <>
              <RowAmount value={formatInr(payment.amount)} />
              <DotSeparated parts={[payment.time, payment.method]} />
            </>
          }
          right={<DotStatusBadge label={label} tone={payment.status === 'Paid' ? 'success' : 'danger'} />}
        />
      </ListRow>
    );
  };
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
        Past payments
      </Text>
      <DayGroupedList
        flat
        groups={groupByDay(sorted, (payment) => payment.date)}
        totals={paidTotals(sorted)}
        renderRow={renderPayment}
        empty="No payments made yet."
        noun={{ one: 'payment', other: 'payments' }}
      />
    </View>
  );
}

/** Each day's band: what was paid that day, or its count when every attempt failed (never "₹0.00"). */
function paidTotals(payments: DuePayment[]) {
  const totals = dayTotals(payments, (payment) => payment.date, (payment) => (payment.status === 'Paid' ? payment.amount : 0));
  totals.forEach((total) => {
    if (!total.amount) total.amount = undefined;
  });
  return totals;
}

type InvoiceEntry = { due: Due; paid: boolean };

type InvoiceStatus = 'Unpaid' | 'Overdue' | 'Paid';
const invoiceStatus = (entry: InvoiceEntry): InvoiceStatus => (entry.paid ? 'Paid' : daysLeft(entry.due) < 0 ? 'Overdue' : 'Unpaid');
const INVOICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Unpaid', label: 'Unpaid' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Paid', label: 'Paid' },
] as const;
const issuedOn = (entry: InvoiceEntry) => parseDisplayDate(entry.due.invoiceUpdated, '12:00 PM');

/**
 * All Invoices, as the app's other listings: the date pill over the list,
 * then one card with search (invoice number or amount) and a Status filter,
 * and the invoices in grey bands by the day they were issued, newest first.
 */
function AllInvoices({ dues, paid }: { dues: Due[]; paid: PaidInvoice[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all');
  const entries: InvoiceEntry[] = sortNewestFirst(
    [...[...dues].sort(byDueDate).map((due) => ({ due, paid: false })), ...paid.map((invoice) => ({ due: invoice, paid: true }))],
    (entry) => displayTimestamp(entry.due.invoiceUpdated, '12:00 PM'),
  );
  const issued = useListDates(entries, issuedOn, { subject: 'invoices issued', presets: ['30d', '90d', 'all'], initial: 'all' });
  const query = search.trim().toLowerCase().replace(/[₹,\s]/g, '');
  const shown = issued.inRange.filter((entry) => {
    if (status !== 'all' && invoiceStatus(entry) !== status) return false;
    return !query || `${entry.due.invoiceNumber} ${entry.due.amount}`.toLowerCase().includes(query);
  });
  const noun = { one: 'invoice', other: 'invoices' };
  return (
    <ListingCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search invoices"
      time={issued.scope}
      filters={[selectFilter({ label: 'Status', options: INVOICE_STATUS_OPTIONS, value: status, onApply: setStatus })]}
      totals={{ all: issued.inRange.length, shown: shown.length, amount: shown.reduce((sum, entry) => sum + entry.due.amount, 0) }}
      noun={noun}>
      <DayGroupedList
        flat
        groups={groupByDay(shown, (entry) => entry.due.invoiceUpdated)}
        totals={dayTotals(shown, (entry) => entry.due.invoiceUpdated, (entry) => entry.due.amount)}
        noun={noun}
        renderRow={(entry) => <InvoiceRow key={entry.due.id} due={entry.due} paid={entry.paid} />}
        empty={issued.inRange.length ? 'No invoices match. Try clearing the search or filters.' : 'No invoices issued in these dates.'}
      />
    </ListingCard>
  );
}

/**
 * An invoice's row, no icon (here and in the View invoices sheet): the amount over its number; at the end its status with
 * its due date (or how late, in red), then a download. A paid invoice shows
 * no paid date: payments clear the balance in bulk, not a given invoice.
 */
function InvoiceRow({ due, paid = false }: { due: Due; paid?: boolean }) {
  const toast = useToast();
  const status = paid ? null : dueStatus(due);
  const statusLabel = paid ? 'Paid' : daysLeft(due) < 0 ? 'Overdue' : 'Unpaid';
  const note = status?.urgent ? status.note : `Due ${shortDate(due.dueDate)}`;
  return (
    <ListRow accessibilityLabel={`${formatInr(due.amount)}, invoice ${due.invoiceNumber}, ${statusLabel}, ${note}`}>
      <ListRowLine
        centered
        left={
          <>
            <RowAmount value={formatInr(due.amount)} />
            <DotSeparated parts={[due.invoiceNumber]} />
          </>
        }
        right={
          <View style={styles.rowEnd}>
            <StatusStack status={status ? status.badge : <DotStatusBadge label="Paid" tone="success" />} note={note} urgent={status?.urgent} />
            <IconButton
              icon="download-simple"
              size={20}
              onPress={() => toast(`Invoice ${due.invoiceNumber} downloaded`)}
              accessibilityLabel={`Download invoice ${due.invoiceNumber}`}
              style={styles.iconButton}
            />
          </View>
        }
      />
    </ListRow>
  );
}

/** View invoices: the unpaid invoices, soonest due first — amount, number, status, due date and a download — with Pay under them. */
function PendingInvoicesSheet({ visible, dues, onDismiss }: { visible: boolean; dues: Due[]; onDismiss: () => void }) {
  const { height: windowHeight } = useWindowDimensions();
  const [paying, setPaying] = useState(false);
  const sorted = [...dues].sort(byDueDate);
  const total = dues.reduce((sum, due) => sum + due.amount, 0);
  // Header 61, each row 76 with a 1dp rule, footer 81; no taller than the default sheet.
  const height = Math.min(61 + Math.max(sorted.length, 1) * 77 + 81, Math.round(windowHeight * 0.86));
  return (
    <>
      <PanelSheet
        visible={visible && !paying}
        onDismiss={onDismiss}
        title={`Pending invoices (${dues.length})`}
        height={height}
        footer={dues.length ? <SheetButton label={`Pay ${formatInr(total)}`} onPress={() => setPaying(true)} /> : undefined}>
        {sorted.length ? (
          sorted.map((due, index) => (
            <View key={due.id}>
              {index > 0 ? <ListDivider /> : null}
              <InvoiceRow due={due} />
            </View>
          ))
        ) : (
          <SheetBlock last>
            <Text style={styles.body}>No unpaid invoices. You&apos;re all caught up.</Text>
          </SheetBlock>
        )}
      </PanelSheet>
      <PayAllSheet
        visible={paying}
        dues={dues}
        onDismiss={() => {
          setPaying(false);
          onDismiss();
        }}
      />
    </>
  );
}

/** Pay the whole balance at once (the only way to pay): the total and how many invoices it clears, then done. */
function PayAllSheet({ visible, dues, onDismiss }: { visible: boolean; dues: Due[]; onDismiss: () => void }) {
  const theme = useTheme();
  const [step, setStep] = useState<'review' | 'paying' | 'paid'>('review');
  // What's being paid, held so the done state still shows it once the dues clear.
  const [paid, setPaid] = useState({ amount: 0, count: 0 });
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setStep('review');
  }
  const total = dues.reduce((sum, due) => sum + due.amount, 0);
  const overdue = dues.filter((due) => daysLeft(due) < 0).length;
  const pay = () => {
    setStep('paying');
    setTimeout(() => {
      setPaid({ amount: total, count: dues.length });
      payAllDues();
      setStep('paid');
    }, 900);
  };

  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Pay pending dues"
      height={step === 'paid' ? 360 : 340}
      footer={
        step === 'paid' ? (
          <SheetButton label="Done" onPress={onDismiss} />
        ) : (
          <SheetButton label={step === 'paying' ? 'Processing payment…' : `Pay ${formatInr(total)}`} disabled={step === 'paying' || !dues.length} onPress={pay} />
        )
      }>
      {step === 'paid' ? (
        <SheetSuccess
          title="Payment received"
          body={`${formatInr(paid.amount)} for ${paid.count} ${paid.count === 1 ? 'invoice' : 'invoices'} is paid. The receipts are on their way to your email.`}
        />
      ) : (
        <>
          <PaymentSummary icon="receipt" amount={total} meta={[`${dues.length} ${dues.length === 1 ? 'invoice' : 'invoices'}`, ...(overdue ? [`${overdue} overdue`] : [])]} />
          <SheetBlock last>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
              This pays your whole outstanding balance and clears every unpaid invoice. Each invoice’s PDF stays under All Invoices.
            </Text>
          </SheetBlock>
        </>
      )}
    </PanelSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { marginHorizontal: -PAGE_PADDING, marginTop: -PAGE_PADDING },
  stack: { gap: 8 },
  card: { borderRadius: Shape.max, overflow: 'hidden' },
  // Figma 7804:118703: 16dp in, the 20dp icon 8dp from the label.
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  ruleBelow: { borderBottomWidth: 1 },
  ruleAbove: { borderTopWidth: 1 },
  amountBlock: { gap: 4, padding: 16 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medium: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  link: { textDecorationLine: 'underline' },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12 },
  // Figma 7804:118713: 32dp, 16dp sides, 8dp corners.
  smallButton: { borderRadius: Shape.small },
  smallButtonContent: { height: 32, paddingHorizontal: 4 },
  smallButtonLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20, marginVertical: 0 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20, padding: 12 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  iconButton: { margin: 0 },
});
