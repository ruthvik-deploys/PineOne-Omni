import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';

import { Tabs } from '@/components/material3/tabs';
import { HeaderControl } from '@/components/page-header';
import { BankLogo } from '@/components/shared/bank-logo';
import { CopyableValue } from '@/components/shared/copyable-value';
import { OrganisationLogo, OrganisationSwitcher } from '@/components/account/organisation-switcher';
import { DetailRow } from '@/components/shared/detail-rows';
import { CollapsingDetailScreen, DETAIL_FOOTER_BUTTON_RADIUS } from '@/components/shared/detail-screen';
import { ListCard, ListRow, ListRowLine, StatusStack } from '@/components/shared/listing';
import { NotFound } from '@/components/shared/not-found';
import { PanelSheet, SheetSection, SheetRow as ChoiceRow } from '@/components/shared/panel-sheet';
import { SheetBlock, SheetButton, SheetField, SheetHeading, SheetRow, SheetSuccess } from '@/components/shared/sheet-parts';
import { DotStatusBadge, OutlineTag } from '@/components/shared/status';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import {
  BANK_ACCOUNTS,
  BANK_CHANGE_REQUESTS,
  type BankAccount,
  type BankChangeRequest,
  bankFromIfsc,
  BUSINESS_DETAILS,
  BUSINESS_PROFILE_ROLES,
  maskAccount,
  maskEmail,
  maskPan,
  maskPhone,
  mdrRange,
  PAY_MODES,
  type PayMode,
  REQUEST_TONE,
  SETTLEMENT_CONFIG,
} from '@/data/business-profile';
import { CURRENT_USER, ORGANISATIONS } from '@/data/businesses';
import { useBusiness } from '@/hooks/use-business';

type Tab = 'business' | 'bank' | 'payments';

/**
 * Business profile (profile → Manage): one place for the merchant's business
 * details, bank accounts and payment configuration. Everything is read-only
 * except bank accounts, which change through a request (verified, then
 * approved by Pine Labs) whose status and history stay on the page.
 * Owner and Admin only; other roles never see the entry and get no access here.
 */
export function BusinessProfile() {
  const theme = useTheme();
  const { organisation, switchOrganisation } = useBusiness();
  const [switching, setSwitching] = useState(false);
  // ?tab=bank / payments opens a section directly (e.g. from a notification).
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'bank' || params.tab === 'payments' ? params.tab : 'business');
  const [requests, setRequests] = useState<BankChangeRequest[]>(BANK_CHANGE_REQUESTS);
  const [changing, setChanging] = useState(false);
  const [openRequest, setOpenRequest] = useState<BankChangeRequest | null>(null);
  const muted = { color: theme.colors.onSurfaceVariant };

  if (!BUSINESS_PROFILE_ROLES.includes(CURRENT_USER.roleLabel)) {
    return <NotFound title="Business profile" message="Only Owners and Admins can view the business profile." fallbackHref="/" />;
  }

  const pendingFor = (accountId: string) => requests.find((request) => request.fromAccountId === accountId && (request.status === 'Pending' || request.status === 'Approved'));

  // As Store details: the business as a centred hero (logo, name, what it does, KYC and MID) that collapses into the header.
  const hero = (
    <View style={styles.hero}>
      <OrganisationLogo organisation={organisation} size={56} />
      <Text style={[styles.heroName, { color: theme.colors.onSurface }]}>{organisation.name}</Text>
      <Text variant="bodyMedium" style={[styles.heroMeta, muted]}>
        {BUSINESS_DETAILS.category}
      </Text>
      <View style={styles.heroPills}>
        <DotStatusBadge label="KYC verified" tone="success" />
        <CopyableValue variant="pill" value={organisation.merchantId} label={`MID: ${organisation.merchantId}`} />
      </View>
    </View>
  );

  // Business / Bank / Payments head the details card, as Devices / Users head a store's listing.
  const tabs = (
    <Tabs
      variant="card"
      tabs={[
        { key: 'business', label: 'Business' },
        { key: 'bank', label: 'Bank' },
        { key: 'payments', label: 'Payments' },
      ]}
      activeKey={tab}
      onChange={(key) => setTab(key as Tab)}
    />
  );

  return (
    <CollapsingDetailScreen
      fallbackHref="/"
      hero={hero}
      compactTitle={organisation.name}
      compactSubtitle={`MID ${organisation.merchantId}`}
      // Switching business lives with the business, top right (moved here from the profile's organisation card).
      actions={
        ORGANISATIONS.length > 1 ? (
          <HeaderControl icon="caret-up-down" label="Switch" onPress={() => setSwitching(true)} accessibilityLabel={`Switch business from ${organisation.name}`} />
        ) : undefined
      }
      footer={
        <Button mode="contained" icon="arrows-left-right" onPress={() => setChanging(true)} style={styles.footerButton} contentStyle={styles.footerContent}>
          Change bank account
        </Button>
      }>
      <View style={styles.stack}>
        {tab === 'business' ? <BusinessTab header={tabs} /> : null}
        {tab === 'bank' ? <BankTab header={tabs} requests={requests} pendingFor={pendingFor} onOpenRequest={setOpenRequest} /> : null}
        {tab === 'payments' ? <PaymentsTab header={tabs} /> : null}
      </View>

      <ChangeAccountSheet
        visible={changing}
        pendingFor={pendingFor}
        onDismiss={() => setChanging(false)}
        onSubmit={(request) => {
          setRequests((current) => [request, ...current]);
          setTab('bank');
        }}
      />
      <RequestSheet request={openRequest} onDismiss={() => setOpenRequest(null)} />
      <OrganisationSwitcher visible={switching} onDismiss={() => setSwitching(false)} organisations={ORGANISATIONS} currentId={organisation.id} onApply={switchOrganisation} />
    </CollapsingDetailScreen>
  );
}

/** One titled group of rows inside the details card; groups are cut apart by the card's dividers. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: theme.colors.onSurfaceVariant }]} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function BusinessTab({ header }: { header: ReactNode }) {
  const theme = useTheme();
  const { organisation } = useBusiness();
  const d = BUSINESS_DETAILS;
  return (
    <>
      <ListCard header={header}>
        <Group title="Business details">
          <DetailRow label="Business name" value={organisation.name} />
          <DetailRow label="Legal name" value={d.legalName} />
          <DetailRow label="Category" value={d.category} />
          <DetailRow label="Address">
            <Text variant="bodyMedium" style={[styles.address, { color: theme.colors.onSurface }]}>
              {d.address}
            </Text>
          </DetailRow>
        </Group>
        <Group title="KYC details">
          <DetailRow label="PAN" value={maskPan(d.pan)} />
          <DetailRow label="GSTIN">
            <CopyableValue value={d.gstin} />
          </DetailRow>
          <DetailRow label="Udyam number">
            <CopyableValue value={d.udyam} />
          </DetailRow>
          <DetailRow label="CIN">
            <CopyableValue value={d.cin} />
          </DetailRow>
        </Group>
        <Group title="Registered contact">
          <DetailRow label="Email" value={maskEmail(d.email)} />
          <DetailRow label="Phone" value={maskPhone(d.phone)} />
        </Group>
      </ListCard>
      <Text style={[styles.small, styles.footnote, { color: theme.colors.onSurfaceVariant }]}>
        These details come from your KYC. To correct them, raise a request with Support.
      </Text>
    </>
  );
}

/**
 * Every bank account in one list: the live accounts first (primary on top),
 * then the changes not yet live — pending, approved or rejected — each with
 * its status. A row with history (a request, or an account that came from
 * one) opens it.
 */
function BankTab({
  header,
  requests,
  pendingFor,
  onOpenRequest,
}: {
  header: ReactNode;
  requests: BankChangeRequest[];
  pendingFor: (accountId: string) => BankChangeRequest | undefined;
  onOpenRequest: (request: BankChangeRequest) => void;
}) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const open = requests.filter((request) => request.status !== 'Completed');
  // The completed request that brought an account in, so its row can show how it got there.
  const origin = (account: BankAccount) => requests.find((request) => request.status === 'Completed' && request.accountNumber === account.accountNumber);
  return (
    <>
      <ListCard header={header}>
        {[
          ...BANK_ACCOUNTS.map((account) => {
            const pending = pendingFor(account.id);
            const history = origin(account);
            return (
              <ListRow
                key={account.id}
                icon={<BankLogo bank={account.bank} size={24} />}
                onPress={history ? () => onOpenRequest(history) : undefined}
                accessibilityLabel={`${account.bankName} ${maskAccount(account.accountNumber)}, ${account.status}${account.primary ? ', primary settlement account' : ''}${history ? '. Open history' : ''}`}>
                <ListRowLine
                  left={
                    <View style={styles.rowText}>
                      <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                        {account.bankName} {maskAccount(account.accountNumber)}
                      </Text>
                      <Text numberOfLines={1} style={[styles.small, muted]}>
                        IFSC {account.ifsc}
                      </Text>
                      <Text numberOfLines={1} style={[styles.small, muted]}>
                        {account.holder}
                      </Text>
                      {account.primary ? (
                        <View style={styles.tagRow}>
                          <OutlineTag label="Primary settlement" muted />
                        </View>
                      ) : null}
                    </View>
                  }
                  right={
                    <StatusStack
                      status={<DotStatusBadge label={account.status} tone={account.status === 'Active' ? 'success' : 'neutral'} />}
                      note={pending ? 'Change pending' : undefined}
                    />
                  }
                />
              </ListRow>
            );
          }),
          ...open.map((request) => (
            <ListRow
              key={request.id}
              icon={<BankLogo bank={request.bank} size={24} />}
              onPress={() => onOpenRequest(request)}
              accessibilityLabel={`${request.bankName} ${maskAccount(request.accountNumber)}, change request ${request.status}. Open details`}>
              <ListRowLine
                left={
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                      {request.bankName} {maskAccount(request.accountNumber)}
                    </Text>
                    <Text numberOfLines={1} style={[styles.small, muted]}>
                      IFSC {request.ifsc}
                    </Text>
                    <Text numberOfLines={1} style={[styles.small, muted]}>
                      To replace {request.fromLabel}
                    </Text>
                  </View>
                }
                right={<StatusStack status={<DotStatusBadge label={request.status} tone={REQUEST_TONE[request.status]} />} note={request.raisedOn} />}
              />
            </ListRow>
          )),
        ]}
      </ListCard>
      <Text style={[styles.small, styles.footnote, { color: theme.colors.onSurfaceVariant }]}>Settlements keep going to the current account until a change is completed.</Text>
    </>
  );
}

function PaymentsTab({ header }: { header: ReactNode }) {
  const theme = useTheme();
  const [open, setOpen] = useState<PayMode | null>(null);
  const muted = { color: theme.colors.onSurfaceVariant };
  const onOff = (on: boolean) => <DotStatusBadge label={on ? 'Enabled' : 'Off'} tone={on ? 'success' : 'neutral'} />;
  return (
    <>
      <ListCard header={header}>
        {[
          <Group key="settlement" title="Settlement">
            <DetailRow label="Settlement cycle" value={SETTLEMENT_CONFIG.cycle} />
            <DetailRow label="Same-Day settlement">{onOff(SETTLEMENT_CONFIG.sameDay)}</DetailRow>
            <DetailRow label="On-Demand settlement">{onOff(SETTLEMENT_CONFIG.onDemand)}</DetailRow>
            <Text style={[styles.small, muted]}>{SETTLEMENT_CONFIG.cycleDetail}</Text>
            <LinkButton label="Manage settlement preferences" onPress={() => router.push('/settlements/preferences')} />
          </Group>,
        ]}
      </ListCard>

      {/* Each method on its own row; an active one opens everything set for it (limits, MDR) in one sheet. */}
      <ListCard header={<CardHeader title="Payment methods" />}>
        {PAY_MODES.map((mode) => (
          <ListRow
            key={mode.key}
            icon={mode.icon}
            onPress={mode.enabled ? () => setOpen(mode) : undefined}
            accessibilityLabel={`${mode.label}, ${mode.enabled ? 'active. Open details' : 'not active'}`}>
            <ListRowLine
              left={
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                    {mode.label}
                  </Text>
                  <Text numberOfLines={1} style={[styles.small, muted]}>
                    {mode.enabled ? `MDR ${mdrRange(mode.mdr)} · up to ${mode.max}` : 'Contact Support to enable'}
                  </Text>
                </View>
              }
              right={<DotStatusBadge label={mode.enabled ? 'Active' : 'Not active'} tone={mode.enabled ? 'success' : 'neutral'} />}
              centered
            />
          </ListRow>
        ))}
      </ListCard>
      <Text style={[styles.small, styles.footnote, muted]}>Payment configuration is set by Pine Labs. To change it, raise a request with Support. MDR rates exclude GST.</Text>
      <PayModeSheet mode={open} onDismiss={() => setOpen(null)} />
    </>
  );
}

/** One payment method, everything about it together: status, per-transaction limits, and the MDR charged by category. */
function PayModeSheet({ mode, onDismiss }: { mode: PayMode | null; onDismiss: () => void }) {
  return (
    <PanelSheet
      visible={mode !== null}
      onDismiss={onDismiss}
      title={mode?.label ?? ''}
      height={mode ? 360 + mode.mdr.length * 36 : 400}
      footer={
        <SheetButton
          label="View MDR reports"
          mode="outline"
          onPress={() => {
            onDismiss();
            router.push('/reports');
          }}
        />
      }>
      {mode ? (
        <>
          <SheetBlock>
            <SheetHeading trailing={<DotStatusBadge label="Active" tone="success" />}>Transaction limits</SheetHeading>
            <SheetRow label="Minimum per transaction" value={mode.min} />
            <SheetRow label="Maximum per transaction" value={mode.max} />
          </SheetBlock>
          <SheetBlock last>
            <SheetHeading>MDR charged</SheetHeading>
            {mode.mdr.map((rate) => (
              <SheetRow key={rate.category} label={rate.category} value={rate.rate} />
            ))}
          </SheetBlock>
        </>
      ) : null}
    </PanelSheet>
  );
}

function CardHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.cardHeader}>
      <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Button mode="outlined" onPress={onPress} textColor={theme.colors.onSurface} style={[styles.linkButton, { borderColor: theme.colors.outlineVariant }]}>
      {label}
    </Button>
  );
}

/**
 * Change bank account: which account to replace, the new details, a moment
 * verifying the account with the bank, then the request as submitted. It
 * stays Pending until Pine Labs approves it; settlements don't move until then.
 */
function ChangeAccountSheet({
  visible,
  pendingFor,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  pendingFor: (accountId: string) => BankChangeRequest | undefined;
  onDismiss: () => void;
  onSubmit: (request: BankChangeRequest) => void;
}) {
  const theme = useTheme();
  const firstFree = BANK_ACCOUNTS.find((account) => !pendingFor(account.id));
  const [step, setStep] = useState<'form' | 'verifying' | 'done'>('form');
  const [from, setFrom] = useState<BankAccount | undefined>(firstFree);
  const [number, setNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [holder, setHolder] = useState('');
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStep('form');
      setFrom(firstFree);
      setNumber('');
      setIfsc('');
      setHolder(BUSINESS_DETAILS.legalName);
    }
  }
  useEffect(() => {
    if (step !== 'verifying' || !from) return;
    const timer = setTimeout(() => {
      const bank = bankFromIfsc(ifsc);
      const now = new Date();
      const at = now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      onSubmit({
        id: `BCR-${20419 + Math.floor(Math.random() * 500)}`,
        fromAccountId: from.id,
        fromLabel: `${from.bank} ${maskAccount(from.accountNumber)}`,
        ...bank,
        accountNumber: number.replace(/\D/g, ''),
        ifsc: ifsc.trim().toUpperCase(),
        holder: holder.trim(),
        status: 'Pending',
        raisedOn: now.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        events: [
          {
            title: 'Request raised',
            detail: `${CURRENT_USER.name} · ${CURRENT_USER.roleLabel}`,
            at,
          },
          { title: 'Account verified', detail: 'Penny drop successful', at },
        ],
      });
      setStep('done');
    }, 1600);
    return () => clearTimeout(timer);
    // Runs once per verification; the form is frozen while it does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const valid = !!from && number.replace(/\D/g, '').length >= 9 && /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc.trim()) && holder.trim().length > 2;
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Change bank account"
      height={step === 'form' ? 680 : step === 'verifying' ? 280 : 400}
      footer={
        step === 'form' ? (
          <SheetButton label="Verify & submit request" disabled={!valid} onPress={() => setStep('verifying')} />
        ) : step === 'done' ? (
          <SheetButton label="Done" onPress={onDismiss} />
        ) : undefined
      }>
      {step === 'form' ? (
        <>
          <SheetSection label="Account to change">
            {BANK_ACCOUNTS.map((account, index) => {
              const pending = !!pendingFor(account.id);
              return (
                <ChoiceRow
                  key={account.id}
                  first={index === 0}
                  role="radio"
                  title={`${account.bankName} ${maskAccount(account.accountNumber)}`}
                  description={pending ? 'A change is already pending' : account.primary ? 'Primary settlement account' : account.ifsc}
                  selected={from?.id === account.id}
                  disabled={pending}
                  onPress={() => setFrom(account)}
                />
              );
            })}
          </SheetSection>
          <SheetBlock gap={16} last>
            <SheetHeading>New account</SheetHeading>
            <SheetField label="Account number" value={number} onChangeText={setNumber} placeholder="Enter account number" keyboardType="number-pad" />
            <SheetField label="IFSC code" value={ifsc} onChangeText={(value) => setIfsc(value.toUpperCase())} placeholder="e.g. HDFC0001234" />
            <SheetField label="Account holder name" value={holder} onChangeText={setHolder} placeholder="As per bank records" />
            <View style={[styles.note, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="info" size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.small, styles.flex, muted]}>
                The account must be in the business’s name. We verify it with your bank, then Pine Labs reviews the request within 2 working days.
              </Text>
            </View>
          </SheetBlock>
        </>
      ) : null}
      {step === 'verifying' ? (
        <SheetBlock last gap={12}>
          <View style={styles.centre}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Verifying your account</Text>
            <Text style={[styles.body, styles.centreText, muted]}>We’re checking the account with your bank. This takes a few seconds.</Text>
          </View>
        </SheetBlock>
      ) : null}
      {step === 'done' && from ? (
        <SheetBlock last gap={12}>
          <SheetSuccess
            title="Request submitted"
            body={`We’ll review it within 2 working days. Settlements keep going to ${from.bankName} ${maskAccount(from.accountNumber)} until the change is completed.`}
          />
        </SheetBlock>
      ) : null}
    </PanelSheet>
  );
}

/** A change request: the new account, what it replaces, and its history (the audit trail). */
function RequestSheet({ request, onDismiss }: { request: BankChangeRequest | null; onDismiss: () => void }) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  return (
    <PanelSheet visible={request !== null} onDismiss={onDismiss} title="Change request" height={620}>
      {request ? (
        <>
          <SheetBlock>
            <SheetHeading trailing={<DotStatusBadge label={request.status} tone={REQUEST_TONE[request.status]} />}>{request.id}</SheetHeading>
            <SheetRow label="New account" value={`${request.bankName} ${maskAccount(request.accountNumber)}`} />
            <SheetRow label="IFSC" value={request.ifsc} />
            <SheetRow label="Account holder" value={request.holder} />
            <SheetRow label="Replaces" value={request.fromLabel} />
            <SheetRow label="Raised on" value={request.raisedOn} />
          </SheetBlock>
          <SheetBlock last>
            <SheetHeading>History</SheetHeading>
            {request.events.map((event, index) => {
              const last = index === request.events.length - 1;
              const rejected = event.title === 'Rejected';
              return (
                <View key={`${event.title}-${index}`} style={styles.step}>
                  <View style={styles.stepRail}>
                    <Icon source={rejected ? 'x-circle' : 'check-circle'} size={16} color={rejected ? '#dc2626' : '#16a34a'} />
                    {!last ? <View style={[styles.stepLine, { backgroundColor: theme.colors.outlineVariant }]} /> : null}
                  </View>
                  <View style={styles.stepText}>
                    <Text style={[styles.medium, { color: theme.colors.onSurface }]}>{event.title}</Text>
                    <Text style={[styles.small, muted]}>{event.detail}</Text>
                    <Text style={[styles.small, muted]}>{event.at}</Text>
                  </View>
                </View>
              );
            })}
            {request.status === 'Pending' ? (
              <View style={styles.step}>
                <View style={styles.stepRail}>
                  <Icon source="circle-dashed" size={16} color={theme.colors.onSurfaceVariant} />
                </View>
                <View style={styles.stepText}>
                  <Text style={[styles.medium, muted]}>Review by Pine Labs</Text>
                  <Text style={[styles.small, muted]}>Usually within 2 working days</Text>
                </View>
              </View>
            ) : null}
          </SheetBlock>
        </>
      ) : null}
    </PanelSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Same hero as Store details: logo, name, what it does, then its badges.
  hero: { gap: 10, alignItems: 'center', paddingBottom: 8 },
  heroName: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  heroMeta: { fontFamily: Fonts.regular, lineHeight: 22, textAlign: 'center' },
  heroPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  group: { gap: 12, padding: 16 },
  stack: { gap: 8 },
  // Capped so the label keeps its width beside a long address.
  address: { maxWidth: 220, textAlign: 'right', fontFamily: Fonts.medium },
  footnote: { paddingHorizontal: 4, paddingTop: 4 },
  cardHeader: { height: 48, justifyContent: 'center', paddingHorizontal: 16 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  rowText: { gap: 2 },
  tagRow: { flexDirection: 'row', marginTop: 6 },
  rowTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
    fontVariant: ['tabular-nums', 'stylistic-one'],
  },
  groupLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  medium: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  linkButton: { borderRadius: Shape.medium, marginTop: 4 },
  footerButton: { flex: 1, borderRadius: DETAIL_FOOTER_BUTTON_RADIUS },
  footerContent: { height: 48 },
  note: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: Shape.small,
  },
  centre: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  centreText: { textAlign: 'center' },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 16, paddingTop: 2 },
  stepLine: { width: 1, flex: 1, marginTop: 4, minHeight: 16 },
  stepText: { flex: 1, gap: 2, paddingBottom: 16 },
});
