import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { HeaderControl } from '@/components/page-header';
import { BankLogo } from '@/components/shared/bank-logo';
import { CopyableValue } from '@/components/shared/copyable-value';
import { OrganisationLogo, OrganisationSwitcher } from '@/components/account/organisation-switcher';
import { DetailRow, SECTION_CARD_INNER_RADIUS, SectionCard } from '@/components/shared/detail-rows';
import { CollapsingDetailScreen, DETAIL_FOOTER_BUTTON_RADIUS, DetailScreen } from '@/components/shared/detail-screen';
import { PAGE_PADDING } from '@/components/tab-screen';
import { NotFound } from '@/components/shared/not-found';
import { PanelSheet } from '@/components/shared/panel-sheet';
import { OptionCard, SheetBlock, SheetButton, SheetField, SheetHeading, SheetRow } from '@/components/shared/sheet-parts';
import { DotStatusBadge, OutlineTag } from '@/components/shared/status';
import { Fonts } from '@/constants/theme';
import {
  addModeRequest,
  type BankAccount,
  type BankChangeRequest,
  bankFromIfsc,
  BUSINESS_DETAILS,
  BUSINESS_DOCUMENTS,
  type BusinessDocument,
  BUSINESS_PROFILE_ROLES,
  maskAccount,
  maskEmail,
  maskPhone,
  mdrRange,
  type ModeRequest,
  PAY_MODES,
  type PayMode,
  replaceBankAccount,
  REQUEST_TONE,
  useBusinessRequests,
} from '@/data/business-profile';
import { CURRENT_USER, ORGANISATIONS } from '@/data/businesses';
import { useBusiness } from '@/hooks/use-business';
import { useToast } from '@/hooks/use-toast';

/** Bank-account request helpers shared by the hub and the Bank accounts page. */
function useBankRequests() {
  const { bank: requests, accounts } = useBusinessRequests();
  return {
    requests,
    accounts,
    pendingFor: (accountId: string) => requests.find((request) => request.fromAccountId === accountId && (request.status === 'Pending' || request.status === 'Approved')),
    // The latest request not yet live against an account (pending, approved or rejected).
    openFor: (accountId: string) => requests.find((request) => request.fromAccountId === accountId && request.status !== 'Completed'),
    // The completed request that brought an account in, so its row can show how it got there.
    origin: (account: BankAccount) => requests.find((request) => request.status === 'Completed' && request.accountNumber === account.accountNumber),
  };
}

/** Rows a hub card shows before its View all. */
const PREVIEW = 3;

/** Owner / Admin only; everyone else gets Not found on every Business profile page. */
const allowed = () => BUSINESS_PROFILE_ROLES.includes(CURRENT_USER.roleLabel);
const denied = <NotFound title="Business profile" message="Only Owners and Admins can view the business profile." fallbackHref="/" />;

/**
 * Business profile (profile → org card; Owner and Admin only), Figma 7961:21505:
 * the business as a hero, then a card each — business details, KYC details &
 * documents (Download all), bank accounts (each with a pencil to change it,
 * View all accounts), paymodes (each opening Request a change / to enable)
 * and the registered contact.
 */
export function BusinessProfile() {
  const theme = useTheme();
  const { organisation, switchOrganisation } = useBusiness();
  const [switching, setSwitching] = useState(false);
  const { modes: modeRequests } = useBusinessRequests();
  const { accounts: liveAccounts, pendingFor, openFor, origin } = useBankRequests();
  const [changing, setChanging] = useState<BankAccount | true | null>(null);
  const [openRequest, setOpenRequest] = useState<BankChangeRequest | null>(null);
  const [openMode, setOpenMode] = useState<PayMode | null>(null);
  const toast = useToast();
  const muted = { color: theme.colors.onSurfaceVariant };
  if (!allowed()) return denied;
  const d = BUSINESS_DETAILS;
  // Accounts with an open request lead, so what needs attention is seen first.
  const accounts = [...liveAccounts].sort((a, b) => Number(Boolean(openFor(b.id))) - Number(Boolean(openFor(a.id))));

  const hero = (
    <View style={styles.hero}>
      <OrganisationLogo organisation={organisation} size={36} />
      <View style={styles.heroText}>
        <Text style={[styles.heroName, { color: theme.colors.onSurface }]}>{organisation.name}</Text>
        <Text style={[styles.medium, styles.heroMeta, muted]}>{d.category.replace(' · ', '  •  ')}</Text>
      </View>
      <View style={styles.heroPills}>
        <DotStatusBadge label="KYC verified" tone="success" />
        <CopyableValue variant="pill" value={organisation.merchantId} label={`MID: ${organisation.merchantId}`} />
      </View>
    </View>
  );

  return (
    <CollapsingDetailScreen
      fallbackHref="/"
      hero={hero}
      compactTitle={organisation.name}
      compactSubtitle={`MID ${organisation.merchantId}`}
      actions={
        ORGANISATIONS.length > 1 ? (
          <HeaderControl label="Switch org" onPress={() => setSwitching(true)} accessibilityLabel={`Switch business from ${organisation.name}`} />
        ) : undefined
      }>
      <View style={styles.stack}>
        <SectionCard title="Business details" collapsible={false}>
          <DetailRow label="Legal name">
            <Text style={[styles.medium, styles.longValue, { color: theme.colors.onSurface }]}>{d.legalName}</Text>
          </DetailRow>
          <DetailRow label="Business category" value={d.category.split(' · ')[0]} />
          <DetailRow label="Address">
            <Text style={[styles.medium, styles.longValue, { color: theme.colors.onSurface }]}>{d.address}</Text>
          </DetailRow>
        </SectionCard>

        <SectionCard title="KYC details & documents" collapsible={false}>
          <DetailRow label="PAN" value={d.pan} />
          <DetailRow label="GSTIN" value={d.gstin} />
          <DetailRow label="Udyam aadhaar" value={d.udyam} />
          <OutlineButton icon="download-simple" label="Download all documents" onPress={() => toast(`${BUSINESS_DOCUMENTS.length} documents downloaded as a ZIP`)} />
        </SectionCard>

        <SectionCard title={`Bank accounts (${accounts.length})`} collapsible={false}>
          <View style={styles.edge}>
            {accounts.slice(0, PREVIEW).map((account, index) => (
              <BankAccountRow
                key={account.id}
                account={account}
                first={index === 0}
                request={openFor(account.id)}
                history={origin(account)}
                canChange={!pendingFor(account.id)}
                onChange={() => setChanging(account)}
                onOpenRequest={setOpenRequest}
              />
            ))}
            <View style={[styles.edgeRow, styles.cardEnd, styles.rule, { borderTopColor: theme.colors.background }]}>
              <OutlineButton label="View all accounts" onPress={() => router.push('/business-profile/bank-accounts')} />
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Paymodes" collapsible={false}>
          <View style={styles.edge}>
            {PAY_MODES.map((mode, index) => (
              <PayModeRow key={mode.key} mode={mode} first={index === 0} request={modeRequests.find((item) => item.modeKey === mode.key)} onPress={() => setOpenMode(mode)} />
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Registered details" collapsible={false}>
          <DetailRow label="Email" value={maskEmail(d.email)} />
          <DetailRow label="Phone" value={maskPhone(d.phone)} />
        </SectionCard>
      </View>
      <ChangeAccountSheet
        visible={changing !== null}
        initial={changing === true ? undefined : (changing ?? undefined)}
        pendingFor={pendingFor}
        onDismiss={() => setChanging(null)}
      />
      <RequestSheet request={openRequest} onDismiss={() => setOpenRequest(null)} />
      <PayModeSheet mode={openMode} pending={modeRequests.find((item) => item.modeKey === openMode?.key)} onDismiss={() => setOpenMode(null)} onSubmit={addModeRequest} />
      <OrganisationSwitcher visible={switching} onDismiss={() => setSwitching(false)} organisations={ORGANISATIONS} currentId={organisation.id} onApply={switchOrganisation} />
    </CollapsingDetailScreen>
  );
}

/** Documents: everything the business has uploaded, each downloadable, or all at once. */
export function DocumentsPage() {
  const theme = useTheme();
  const toast = useToast();
  if (!allowed()) return denied;
  return (
    <DetailScreen
      title="Documents"
      fallbackHref="/business-profile"
      footer={
        <Button
          mode="contained"
          icon="download-simple"
          onPress={() => toast(`${BUSINESS_DOCUMENTS.length} documents downloaded as a ZIP`)}
          style={styles.footerButton}
          contentStyle={styles.footerContent}>
          Download all
        </Button>
      }>
      <View style={[styles.stack, styles.first]}>
        <SectionCard title="Uploaded documents" trailing={`${BUSINESS_DOCUMENTS.length}`} collapsible={false}>
          <View style={styles.edge}>
            {BUSINESS_DOCUMENTS.map((doc, index) => (
              <DocumentRow key={doc.id} doc={doc} first={index === 0} onDownload={() => toast(`${doc.name} downloaded`)} />
            ))}
          </View>
        </SectionCard>
        <Text style={[styles.small, styles.footnote, { color: theme.colors.onSurfaceVariant }]}>
          The documents you shared with Pine Labs at onboarding and since. To replace one, raise a request with Support.
        </Text>
      </View>
    </DetailScreen>
  );
}

/** Bank accounts: every account, each with Change; open requests ride on the account they'd replace. */
export function BankAccountsPage() {
  const theme = useTheme();
  const { accounts: liveAccounts, pendingFor, openFor, origin } = useBankRequests();
  const [changing, setChanging] = useState<BankAccount | true | null>(null);
  const [openRequest, setOpenRequest] = useState<BankChangeRequest | null>(null);
  if (!allowed()) return denied;
  const muted = { color: theme.colors.onSurfaceVariant };
  // Accounts with an open request first, so what needs attention leads.
  const accounts = [...liveAccounts].sort((a, b) => Number(Boolean(openFor(b.id))) - Number(Boolean(openFor(a.id))));
  return (
    <DetailScreen
      title="Bank accounts"
      fallbackHref="/business-profile"
      footer={
        <Button mode="contained" icon="arrows-left-right" onPress={() => setChanging(true)} style={styles.footerButton} contentStyle={styles.footerContent}>
          Change bank account
        </Button>
      }>
      <View style={[styles.stack, styles.first]}>
        <SectionCard title="Your accounts" trailing={`${accounts.length}`} collapsible={false}>
          <View style={styles.edge}>
            {accounts.map((account, index) => (
              <BankAccountRow
                key={account.id}
                account={account}
                first={index === 0}
                request={openFor(account.id)}
                history={origin(account)}
                canChange={!pendingFor(account.id)}
                onChange={() => setChanging(account)}
                onOpenRequest={setOpenRequest}
              />
            ))}
          </View>
        </SectionCard>
        <Text style={[styles.small, styles.footnote, muted]}>
          Settlements keep going to the current account until a change is completed. Pine Labs reviews each change within 2 working days.
        </Text>
      </View>
      <ChangeAccountSheet
        visible={changing !== null}
        initial={changing === true ? undefined : (changing ?? undefined)}
        pendingFor={pendingFor}
        onDismiss={() => setChanging(null)}
      />
      <RequestSheet request={openRequest} onDismiss={() => setOpenRequest(null)} />
    </DetailScreen>
  );
}

/** Payment methods: active and not active, each opening its limits and MDR with Request a change / Request to enable. */
export function PaymentMethodsPage() {
  const theme = useTheme();
  const { modes: modeRequests } = useBusinessRequests();
  const [openMode, setOpenMode] = useState<PayMode | null>(null);
  if (!allowed()) return denied;
  const muted = { color: theme.colors.onSurfaceVariant };
  const modeRow = (mode: PayMode, index: number) => (
    <PayModeRow key={mode.key} mode={mode} first={index === 0} request={modeRequests.find((item) => item.modeKey === mode.key)} onPress={() => setOpenMode(mode)} />
  );
  const activeModes = PAY_MODES.filter((mode) => mode.enabled);
  const offModes = PAY_MODES.filter((mode) => !mode.enabled);
  return (
    <DetailScreen title="Payment methods" fallbackHref="/business-profile">
      <View style={[styles.stack, styles.first]}>
        <SectionCard title="Active" trailing={`${activeModes.length}`} collapsible={false}>
          <View style={styles.edge}>{activeModes.map(modeRow)}</View>
        </SectionCard>
        {offModes.length ? (
          <SectionCard title="Not active" trailing={`${offModes.length}`} collapsible={false}>
            <View style={styles.edge}>{offModes.map(modeRow)}</View>
          </SectionCard>
        ) : null}
        <Text style={[styles.small, styles.footnote, muted]}>Tap a method to see its limits and MDR, request a change or ask to enable it. MDR rates exclude GST.</Text>
      </View>
      <PayModeSheet mode={openMode} pending={modeRequests.find((item) => item.modeKey === openMode?.key)} onDismiss={() => setOpenMode(null)} onSubmit={addModeRequest} />
    </DetailScreen>
  );
}

/** Banner tints: Tailwind 100 / 800 on light, the 400 tone at low alpha on dark. */
const STRIP_TINT = {
  warning: { light: ['#fef9c3', '#854d0e'], dark: ['rgba(250,204,21,0.14)', '#facc15'] },
  danger: { light: ['#fee2e2', '#991b1b'], dark: ['rgba(248,113,113,0.14)', '#f87171'] },
  info: { light: ['#dbeafe', '#1e40af'], dark: ['rgba(96,165,250,0.14)', '#60a5fa'] },
} as const;

/** One bank account as a row (Figma 7961:21580): logo, holder, bank and number, IFSC, Primary account; a pencil to change it; an open request as a strip under it. */
function BankAccountRow({
  account,
  first,
  request,
  history,
  canChange,
  onChange,
  onOpenRequest,
}: {
  account: BankAccount;
  first: boolean;
  request?: BankChangeRequest;
  history?: BankChangeRequest;
  canChange: boolean;
  onChange: () => void;
  onOpenRequest: (request: BankChangeRequest) => void;
}) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  return (
    <View style={[styles.edgeRow, !first && [styles.rule, { borderTopColor: theme.colors.background }]]}>
      <TouchableRipple
        onPress={history ? () => onOpenRequest(history) : undefined}
        disabled={!history}
        accessibilityLabel={`${account.bankName} ${maskAccount(account.accountNumber)}, ${account.holder}${account.primary ? ', primary account' : ''}`}>
        <View style={styles.item}>
          <View style={styles.logoTile}>
            <BankLogo bank={account.bank} size={20} />
          </View>
          <View style={[styles.flex, styles.rowText]}>
            <Text numberOfLines={1} style={[styles.rowName, { color: theme.colors.onSurface }]}>
              {account.holder}
            </Text>
            <Text numberOfLines={1} style={[styles.small, muted]}>
              {account.bank}
              {'  •  '}
              {maskAccount(account.accountNumber)}
            </Text>
            <Text numberOfLines={1} style={[styles.small, muted]}>
              {account.ifsc}
            </Text>
            {account.primary ? (
              <View style={styles.tagRow}>
                <OutlineTag label="Primary account" radius={999} />
              </View>
            ) : null}
          </View>
          {canChange ? (
            <IconButton
              icon="pencil-simple"
              size={16}
              mode="outlined"
              onPress={onChange}
              accessibilityLabel={`Change ${account.bankName} ${maskAccount(account.accountNumber)}`}
              style={[styles.iconButton, { borderColor: theme.colors.outlineVariant }]}
            />
          ) : null}
        </View>
      </TouchableRipple>
      {request ? <RequestStrip request={request} onPress={() => onOpenRequest(request)} /> : null}
    </View>
  );
}

/** One paymode as a row (Figma 7961:21636): icon, name, MDR (or Request to enable), status, arrow; a pending request as a strip. */
function PayModeRow({ mode, first, request, onPress }: { mode: PayMode; first: boolean; request?: ModeRequest; onPress: () => void }) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  return (
    <View style={[styles.edgeRow, !first && [styles.rule, { borderTopColor: theme.colors.background }]]}>
      <TouchableRipple
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${mode.label}, ${mode.enabled ? 'active' : 'not active'}. Open to view or request a change`}>
        <View style={styles.item}>
          <View style={styles.iconSlot}>
            <Icon source={mode.icon} size={18} color={theme.colors.onSurface} />
          </View>
          <View style={[styles.flex, styles.rowText]}>
            <Text numberOfLines={1} style={[styles.rowName, { color: theme.colors.onSurface }]}>
              {mode.label}
            </Text>
            <Text numberOfLines={1} style={[styles.small, muted]}>
              {mode.enabled ? `${mdrRange(mode.mdr)} MDR` : 'Request to enable'}
            </Text>
          </View>
          <DotStatusBadge label={mode.enabled ? 'Active' : 'Not active'} tone={mode.enabled ? 'success' : 'neutral'} />
          <Icon source="caret-right" size={20} color={theme.colors.onSurface} />
        </View>
      </TouchableRipple>
      {request ? (
        <View style={styles.rowStrip}>
          <ReviewStrip label={request.label} />
        </View>
      ) : null}
    </View>
  );
}

/** An uploaded document: file icon, name, what it is and file details, and Download. */
function DocumentRow({ doc, first, onDownload }: { doc: BusinessDocument; first: boolean; onDownload: () => void }) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  return (
    <View style={[styles.edgeRow, !first && [styles.rule, { borderTopColor: theme.colors.background }]]}>
      <View style={[styles.item, styles.itemCentred]}>
        <Icon source={doc.file === 'PDF' ? 'file-pdf' : 'file-text'} size={24} color={theme.colors.onSurface} />
        <View style={[styles.flex, styles.rowText]}>
          <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
            {doc.name}
          </Text>
          <Text numberOfLines={1} style={[styles.small, muted]}>
            {doc.detail}
          </Text>
          <Text numberOfLines={1} style={[styles.small, muted]}>
            {doc.file} · {doc.size} · Uploaded {doc.uploadedOn}
          </Text>
        </View>
        <IconButton icon="download-simple" size={20} onPress={onDownload} accessibilityLabel={`Download ${doc.name}`} style={styles.download} />
      </View>
    </View>
  );
}

/** Figma's full-width outline button (32dp, 8dp radius): Download all documents, View all accounts. */
function OutlineButton({ label, icon, onPress }: { label: string; icon?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Button
      mode="outlined"
      icon={icon}
      compact
      onPress={onPress}
      textColor={theme.colors.onSurface}
      style={[styles.outlineButton, { borderColor: theme.colors.outlineVariant }]}
      contentStyle={styles.outlineButtonContent}
      labelStyle={styles.outlineButtonLabel}>
      {label}
    </Button>
  );
}

/** A change request on the account it replaces: a coloured strip with where it stands; opens its history. */
function RequestStrip({ request, onPress }: { request: BankChangeRequest; onPress: () => void }) {
  const tone = request.status === 'Rejected' ? 'danger' : request.status === 'Approved' ? 'info' : 'warning';
  return <Strip tone={tone} label={`Change to ${request.bank} ${maskAccount(request.accountNumber)} ${request.status.toLowerCase()}`} onPress={onPress} />;
}

/** A request attached to the row it's about: a coloured strip with where it stands. */
function Strip({ tone, label, onPress }: { tone: keyof typeof STRIP_TINT; label: string; onPress: () => void }) {
  const theme = useTheme();
  const [tint, ink] = STRIP_TINT[tone][theme.dark ? 'dark' : 'light'];
  return (
    <TouchableRipple onPress={onPress} borderless accessibilityRole="button" accessibilityLabel={`${label}. Open details`} style={[styles.strip, { backgroundColor: tint }]}>
      <View style={styles.stripInner}>
        <Icon source={tone === 'danger' ? 'warning-circle' : 'clock'} size={16} color={ink} />
        <Text numberOfLines={1} style={[styles.stripText, { color: ink }]}>
          {label}
        </Text>
        <Icon source="caret-right" size={16} color={ink} />
      </View>
    </TouchableRipple>
  );
}

/** What a change request can be about (Figma 7961:23498). */
const MODE_CHANGES = ['Transaction limit', 'MDR charges'] as const;

/** "TIC-" and ten digits: the support ticket a request is tracked on. */
const newTicket = () => `TIC-${Math.floor(1e9 + Math.random() * 9e9)}`;

/**
 * One paymode (Figma 7961:22564, 7961:24349): its icon and status, name and
 * what it covers, an open request as an amber strip, then its transaction
 * limits and MDR charges; Request change → what to change (7961:23498) →
 * Request submitted with the ticket to track it (7961:23936). A mode that's
 * off asks to be enabled instead.
 */
function PayModeSheet({ mode, pending, onDismiss, onSubmit }: { mode: PayMode | null; pending?: ModeRequest; onDismiss: () => void; onSubmit: (request: ModeRequest) => void }) {
  const theme = useTheme();
  const [shown, setShown] = useState<PayMode | null>(mode);
  if (mode && mode !== shown) setShown(mode);
  const [step, setStep] = useState<'details' | 'change' | 'done'>('details');
  const [change, setChange] = useState<(typeof MODE_CHANGES)[number] | null>(null);
  const [ticket, setTicket] = useState('');
  const [wasOpen, setWasOpen] = useState<string | null>(null);
  if ((mode?.key ?? null) !== wasOpen) {
    setWasOpen(mode?.key ?? null);
    if (mode) {
      setStep('details');
      setChange(null);
    }
  }
  if (!shown) return null;
  const m = shown;
  const muted = { color: theme.colors.onSurfaceVariant };
  const enabling = !m.enabled;
  const submit = (label: string) => {
    const id = newTicket();
    setTicket(id);
    onSubmit({ id, ticket: id, modeKey: m.key, label, raisedOn: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) });
    setStep('done');
  };
  const openTicket = () => {
    onDismiss();
    router.push('/support/tickets');
  };

  const footer =
    step === 'done' ? (
      <SheetButton label="Okay" onPress={onDismiss} />
    ) : step === 'change' ? (
      <SheetButton label="Submit request" disabled={!change} onPress={() => submit(`${change} change request`)} />
    ) : enabling ? (
      pending ? undefined : (
        <SheetButton label="Request to enable" onPress={() => submit('Enable request')} />
      )
    ) : (
      <SheetButton label="Request change" onPress={() => setStep('change')} />
    );

  return (
    <PanelSheet
      visible={mode !== null}
      onDismiss={onDismiss}
      title={step === 'details' ? `${m.label} mode` : `Request to ${enabling ? 'enable' : 'change'} ${m.label} mode`}
      fit
      footer={footer}>
      {step === 'details' ? (
        <>
          <SheetBlock gap={16} last={enabling}>
            <View style={styles.sheetHeadTop}>
              <View style={[styles.modeTile, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Icon source={m.icon} size={18} color={theme.colors.onSurface} />
              </View>
              <DotStatusBadge label={m.enabled ? 'Active' : 'Not active'} tone={m.enabled ? 'success' : 'neutral'} />
            </View>
            <View style={styles.sheetHeadText}>
              <Text style={[styles.sheetName, { color: theme.colors.onSurface }]}>{m.label}</Text>
              <Text style={[styles.medium, muted]}>{m.summary}</Text>
            </View>
            {pending ? <ReviewStrip label={pending.label} onPress={openTicket} /> : null}
          </SheetBlock>
          {enabling ? null : (
            <>
              <SheetBlock gap={12}>
                <SheetHeading size="large">Transaction limits</SheetHeading>
                <DetailRow label="Minimum per transaction" value={m.min} />
                <DetailRow label="Maximum per transaction" value={m.max} />
              </SheetBlock>
              <SheetBlock gap={12} last>
                <SheetHeading size="large">MDR charges</SheetHeading>
                {m.mdr.map((rate) => (
                  <DetailRow key={rate.category} label={rate.category} value={rate.rate} />
                ))}
              </SheetBlock>
            </>
          )}
        </>
      ) : null}
      {step === 'change' ? (
        <SheetBlock gap={12} last>
          <SheetHeading size="large">What would you like to change?</SheetHeading>
          <View style={styles.options}>
            {MODE_CHANGES.map((option) => (
              <OptionCard key={option} title={option} selected={change === option} onPress={() => setChange(option)} />
            ))}
          </View>
        </SheetBlock>
      ) : null}
      {step === 'done' ? (
        <SheetBlock last>
          <View style={styles.centre}>
            <View style={[styles.doneTile, { backgroundColor: theme.colors.primary }]}>
              <Icon source="check" size={24} color={theme.colors.onPrimary} />
            </View>
            <Text style={[styles.doneTitle, { color: theme.colors.onSurface }]}>Request submitted</Text>
            <Text style={[styles.medium, styles.centreText, muted]}>
              We will review your request and come back to you, we have raised a support ticket you can track here{' '}
              <Text onPress={openTicket} accessibilityRole="link" style={[styles.link, { color: theme.colors.primary }]}>
                {ticket}
              </Text>
            </Text>
          </View>
        </SheetBlock>
      ) : null}
    </PanelSheet>
  );
}

/** An open paymode request (Figma 7961:24772): amber, a countdown clock, what it is, "Reviewing"; with a caret where it opens its ticket. */
function ReviewStrip({ label, onPress }: { label: string; onPress?: () => void }) {
  const theme = useTheme();
  const [tint, ink] = theme.dark ? ['rgba(251,191,36,0.14)', '#fbbf24'] : ['#fffbeb', '#d97706'];
  const content = (
    <View style={styles.reviewInner}>
      <Icon source="clock-countdown" size={16} color={ink} />
      <Text numberOfLines={1} style={[styles.reviewText, styles.flex, { color: theme.colors.onSurface }]}>
        {label}
      </Text>
      <Text style={[styles.reviewText, { color: theme.colors.onSurface }]}>Reviewing</Text>
      {onPress ? <Icon source="caret-right" size={16} color={theme.colors.onSurface} /> : null}
    </View>
  );
  return onPress ? (
    <TouchableRipple
      onPress={onPress}
      borderless
      accessibilityRole="button"
      accessibilityLabel={`${label}, reviewing. Open the ticket`}
      style={[styles.review, { backgroundColor: tint }]}>
      {content}
    </TouchableRipple>
  ) : (
    <View style={[styles.review, { backgroundColor: tint }]}>{content}</View>
  );
}

/** "50201234123456" → "5020 1234 1234 56": in fours, as on a passbook. */
const groupDigits = (number: string) => number.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

/**
 * Edit bank account details (Figma 7961:25194 → 25715 → 26191): the account
 * being changed, the new number twice and its IFSC (with the branch it
 * resolves to), a warning about a wrong IFSC; then ₹1 is sent to verify the
 * account, and the change shows old → new.
 */
function ChangeAccountSheet({
  visible,
  initial,
  pendingFor,
  onDismiss,
}: {
  visible: boolean;
  /** The account picked from its row; otherwise the first one without a pending change. */
  initial?: BankAccount;
  pendingFor: (accountId: string) => BankChangeRequest | undefined;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const { accounts } = useBusinessRequests();
  const firstFree = accounts.find((account) => !pendingFor(account.id));
  const [step, setStep] = useState<'form' | 'verifying' | 'done'>('form');
  const [from, setFrom] = useState<BankAccount | undefined>(firstFree);
  const [next, setNext] = useState<BankAccount | null>(null);
  const [number, setNumber] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStep('form');
      setFrom(initial ?? firstFree);
      setNext(null);
      setNumber('');
      setConfirm('');
      setIfsc('');
    }
  }
  useEffect(() => {
    if (step !== 'verifying' || !from) return;
    const timer = setTimeout(() => {
      const bank = bankFromIfsc(ifsc);
      const now = new Date();
      const at = now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      // The name the bank returned for the ₹1 transfer.
      const holder = BUSINESS_DETAILS.legalName;
      const account: BankAccount = { ...from, id: `acc-${Date.now()}`, ...bank, accountNumber: number.replace(/\D/g, ''), ifsc: ifsc.trim().toUpperCase(), holder };
      replaceBankAccount(from.id, account, {
        id: `BCR-${20419 + Math.floor(Math.random() * 500)}`,
        fromAccountId: account.id,
        fromLabel: `${from.bank} ${maskAccount(from.accountNumber)}`,
        ...bank,
        accountNumber: account.accountNumber,
        ifsc: account.ifsc,
        holder,
        status: 'Completed',
        raisedOn: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        events: [
          { title: 'Change made', detail: `${CURRENT_USER.name} · ${CURRENT_USER.roleLabel}`, at },
          { title: 'Account verified', detail: '₹1 sent to the account', at },
          { title: 'Completed', detail: 'Settlements now go to this account', at },
        ],
      });
      setNext(account);
      setStep('done');
    }, 1600);
    return () => clearTimeout(timer);
    // Runs once per verification; the form is frozen while it does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const digits = number.replace(/\D/g, '');
  const mismatch = confirm.length > 0 && confirm.replace(/\D/g, '') !== digits;
  const ifscValid = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc.trim());
  const valid = !!from && digits.length >= 9 && !mismatch && confirm.length > 0 && ifscValid;
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    <PanelSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Edit bank account details"
      fit
      footer={
        step === 'form' ? (
          <View style={styles.footerEnd}>
            <SheetButton label="Submit request" disabled={!valid} onPress={() => setStep('verifying')} />
          </View>
        ) : undefined
      }>
      {step === 'form' && from ? (
        <>
          <SheetBlock>
            <View style={[styles.accountCard, { borderColor: theme.colors.outlineVariant }]}>
              <View style={[styles.accountCardTop, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.flex, styles.accountCardText]}>
                  <Text style={[styles.medium, { color: theme.colors.onSurface }]}>{from.bank}</Text>
                  <Text style={[styles.accountNumber, { color: theme.colors.onSurface }]}>{groupDigits(from.accountNumber)}</Text>
                </View>
                <BankLogo bank={from.bank} size={16} />
              </View>
              <View style={styles.accountCardBottom}>
                <Text numberOfLines={1} style={[styles.medium, styles.flex, { color: theme.colors.onSurface }]}>
                  {from.holder}
                </Text>
                <Text style={[styles.body, muted]}>A/c holder</Text>
              </View>
            </View>
          </SheetBlock>
          <SheetBlock gap={16} last>
            <SheetField label="New account number" value={number} onChangeText={setNumber} placeholder="Enter account number" keyboardType="number-pad" />
            <SheetField
              label="Re-enter account number"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Enter it again"
              keyboardType="number-pad"
              secure
              error={mismatch ? 'Account numbers don’t match' : undefined}
            />
            <SheetField
              label="IFSC code"
              value={ifsc}
              onChangeText={(value) => setIfsc(value.toUpperCase())}
              placeholder="e.g. HDFC0001234"
              hint={ifscValid ? `${bankFromIfsc(ifsc).bankName}, Koramangala 5th Block, Bengaluru` : undefined}
            />
            <View style={[styles.note, { backgroundColor: theme.colors.background }]}>
              <Icon source="warning-circle" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.noteText, styles.flex, muted]}>
                Make sure that you have selected the correct branch IFSC. In case the IFSC is incorrect your settlements would fail.
              </Text>
            </View>
          </SheetBlock>
        </>
      ) : null}
      {step === 'verifying' ? (
        <SheetBlock last>
          <View style={styles.centre}>
            <View style={[styles.verifyTile, { backgroundColor: theme.colors.background }]}>
              <ActivityIndicator color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={[styles.sheetName, { color: theme.colors.onSurface }]}>Verifying your account</Text>
            <Text style={[styles.medium, styles.centreText, muted]}>We have sent ₹1 to your account to verify if your bank account is active</Text>
          </View>
        </SheetBlock>
      ) : null}
      {step === 'done' && from && next ? (
        <SheetBlock gap={16} last>
          <View style={styles.centre}>
            <Icon source="seal-check-fill" size={40} color="#16a34a" />
            <Text style={[styles.sheetName, { color: theme.colors.onSurface }]}>Account updated successfully</Text>
          </View>
          <View style={[styles.changeCard, { backgroundColor: theme.colors.background }]}>
            <AccountLine account={from} />
            <View style={styles.changeRail}>
              <View style={[styles.changeLine, { borderColor: theme.colors.outline }]} />
              <Icon source="caret-down" size={12} color={theme.colors.outline} />
            </View>
            <AccountLine account={next} />
          </View>
        </SheetBlock>
      ) : null}
    </PanelSheet>
  );
}

/** One side of a change (Figma 7961:26586): logo, bank, the number in fours, the holder. */
function AccountLine({ account }: { account: BankAccount }) {
  const theme = useTheme();
  return (
    <View style={styles.accountLine}>
      <BankLogo bank={account.bank} size={16} />
      <View style={[styles.flex, styles.accountLineText]}>
        <Text style={[styles.medium, { color: theme.colors.onSurfaceVariant }]}>{account.bankName}</Text>
        <View style={styles.accountCardText}>
          <Text style={[styles.accountNumber, { color: theme.colors.onSurface }]}>{groupDigits(account.accountNumber)}</Text>
          <Text style={[styles.medium, { color: theme.colors.onSurface }]}>{account.holder}</Text>
        </View>
      </View>
    </View>
  );
}

/** A change request: the new account, what it replaces, and its history (the audit trail). */
function RequestSheet({ request, onDismiss }: { request: BankChangeRequest | null; onDismiss: () => void }) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  return (
    <PanelSheet visible={request !== null} onDismiss={onDismiss} title="Change request" fit>
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
  // Paymode sheet head (Figma 7961:24745): 40dp round tile and the badge, then name and what it covers.
  sheetHeadTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modeTile: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetHeadText: { gap: 4 },
  sheetName: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  options: { gap: 8 },
  review: { borderRadius: 8 },
  reviewInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  reviewText: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  rowStrip: { paddingBottom: 16 },
  doneTile: { padding: 6, borderRadius: 8 },
  doneTitle: { fontFamily: Fonts.semiBold, fontSize: 18, lineHeight: 28 },
  link: { fontFamily: Fonts.medium, textDecorationLine: 'underline' },
  footerEnd: { alignItems: 'flex-end' },
  // The account being edited (Figma 7961:25628): grey top with bank and number, holder under a bordered edge.
  accountCard: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  accountCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16 },
  accountCardText: { gap: 4 },
  accountCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  accountNumber: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24, fontVariant: ['tabular-nums'] },
  noteText: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  verifyTile: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  // Old → new (Figma 7961:26584): a muted card, a dashed rail with an arrowhead between the two accounts.
  changeCard: { borderRadius: 10, paddingVertical: 24, paddingLeft: 24, paddingRight: 16 },
  changeRail: { width: 16, alignItems: 'center', marginVertical: 4 },
  changeLine: { height: 40, borderLeftWidth: 1, borderStyle: 'dashed' },
  accountLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  accountLineText: { gap: 12 },
  // Same hero as Store details: logo, name, what it does, then its badges.
  // Figma 7961:21528: logo, name and category, then the badges, 16dp apart.
  hero: { gap: 16, alignItems: 'center', paddingBottom: 8 },
  heroText: { gap: 4, alignItems: 'center' },
  heroName: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  heroMeta: { textAlign: 'center' },
  heroPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stack: { gap: 8 },
  first: { marginTop: PAGE_PADDING },
  download: { margin: 0 },
  outlineButton: { borderRadius: 8 },
  outlineButtonContent: { height: 32 },
  outlineButtonLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20, marginVertical: 0 },
  cardEnd: { paddingVertical: 16 },
  iconButton: { margin: 0, width: 32, height: 32, borderRadius: 8 },
  logoTile: { padding: 4 },
  iconSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  // Long values (legal name, address) wrap in a right-aligned column, as in the design.
  longValue: { maxWidth: 160, textAlign: 'right' },
  rowName: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20 },
  footnote: { paddingHorizontal: 4, paddingTop: 4 },
  // The card body's 16dp padding, undone so separators reach both edges, then given back to each row.
  edge: { marginHorizontal: -16, marginVertical: -16 },
  edgeRow: { paddingHorizontal: 16 },
  rowEnd: { alignItems: 'flex-end', gap: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 16 },
  itemCentred: { alignItems: 'center' },
  rule: { borderTopWidth: 1 },
  strip: { borderRadius: SECTION_CARD_INNER_RADIUS, marginBottom: 16 },
  stripInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  stripText: { flex: 1, fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  // Capped so the label keeps its width beside a long address.
  address: { maxWidth: 220, textAlign: 'right', fontFamily: Fonts.medium },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  rowText: { gap: 4 },
  tagRow: { flexDirection: 'row' },
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
  footerButton: { flex: 1, borderRadius: DETAIL_FOOTER_BUTTON_RADIUS },
  footerContent: { height: 48 },
  // Figma 7961:25643: 8dp in, 6dp gap, 10dp corners.
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 8, borderRadius: 10 },
  centre: { alignItems: 'center', gap: 8 },
  centreText: { textAlign: 'center' },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 16, paddingTop: 2 },
  stepLine: { width: 1, flex: 1, marginTop: 4, minHeight: 16 },
  stepText: { flex: 1, gap: 2, paddingBottom: 16 },
});
