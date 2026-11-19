import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { SameDaySheet } from '@/components/payments/app-settlement-preferences';
import { OnDemandSheet } from '@/components/payments/on-demand-sheet';
import { BankLogo } from '@/components/shared/bank-logo';
import { DetailScreen } from '@/components/shared/detail-screen';
import { initialsOf, ListCard, ListRow, ListRowLine, RowMark } from '@/components/shared/listing';
import { TicketCard } from '@/components/support/support-landing';
import { HelpCard } from '@/components/shared/help-card';
import { PanelSheet } from '@/components/shared/panel-sheet';
import { OptionCard, SheetBlock, SheetButton, SheetField, SheetHeading, SheetRow, SheetSuccess } from '@/components/shared/sheet-parts';
import { DotStatusBadge, type DotTone } from '@/components/shared/status';
import { PAGE_PADDING } from '@/components/tab-screen';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { INITIAL_ROSTER } from '@/data/user-roster';
import { CURRENT_USER, ORGANISATIONS } from '@/data/businesses';
import { STORE_RECORDS, type StoreRecord } from '@/data/stores';
import {
  ACCEPTANCE_MODELS,
  ACTIVE_BRAND_EMIS,
  BRAND_EMI_BRANDS,
  type CustomFlow,
  INTERNATIONAL_VOLUMES,
  isEligible,
  MERCHANT_MODEL,
  MERCHANT_PREFILL,
  SERVICE_INFO,
  type ServiceKey,
  type ServiceTicket,
  terminalsForStore,
  type ValueAddedService,
  VALUE_ADDED_SERVICES,
  type VasDocument,
  type VasStatus,
  type VasSubState,
} from '@/data/value-added-services';
import { useToast } from '@/hooks/use-toast';

const USER_EMAIL = INITIAL_ROSTER.find((entry) => entry.name === CURRENT_USER.name)?.email ?? '';
const REGISTERED_MOBILE = '9876543210';

const requestId = () => `VAS-${50000000 + Math.floor(Math.random() * 9999999)}`;
const nowLabel = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Merchant-facing status → badge tone. */
const STATUS_TONE: Record<VasStatus, DotTone> = { Enabled: 'success', 'In processing': 'warning', 'Not enabled': 'neutral' };
/** Documents the merchant still has to upload. */
const needsUpload = (doc: VasDocument) => doc.state === 'Missing' || doc.state === 'Expired' || doc.state === 'Rejected';

/**
 * Value Added Services (profile → Manage): every service with its status —
 * Enabled, In processing or Not enabled — opening its details: what it needs
 * (eligibility, who it applies to, pricing, documents on file vs needed,
 * approvals and turnaround) and, once asked for, a tracker. Requests pre-fill
 * what Pine Labs already knows, reuse documents on file and ask only for
 * what's missing; there's no request button when the service is on, already
 * in processing, or the merchant isn't eligible. Same-Day / On-Demand
 * settlement, EMI brands and Payment QR keep their own sheets.
 */
export function ValueAddedServices() {
  const toast = useToast();
  const [services, setServices] = useState(VALUE_ADDED_SERVICES);
  // ?service=<key> opens that service (e.g. from a notification).
  const params = useLocalSearchParams<{ service?: string }>();
  const [open, setOpen] = useState<ServiceKey | null>(
    () => VALUE_ADDED_SERVICES.find((service) => service.key === params.service && (!service.flow || service.flow === 'brand-emi'))?.key ?? null,
  );
  const [custom, setCustom] = useState<CustomFlow | null>(null);
  const [extraRequests, setExtraRequests] = useState<{ id: string; service: ServiceKey; label: string }[]>([]);
  const sameDay = services.find((service) => service.key === 'same-day');
  const update = (key: ServiceKey, patch: Partial<ValueAddedService>) =>
    setServices((current) => current.map((service) => (service.key === key ? { ...service, ...patch } : service)));
  const openService = (service: ValueAddedService) =>
    service.flow === 'same-day' || service.flow === 'on-demand' || service.flow === 'payment-qr' ? setCustom(service.flow) : setOpen(service.key);
  // An open request rides on its service's card as a coloured banner: the tracked request while in processing, else the latest one-off order (EMI brands, Payment QR).
  const requestFor = (service: ValueAddedService): CardRequest | null => {
    if (service.requestId && service.status === 'In processing') {
      const action = service.documents.some(needsUpload);
      return { id: service.requestId, label: action ? `${service.subState} · upload needed` : (service.subState ?? 'In processing'), tone: action ? 'danger' : 'warning' };
    }
    const extra = extraRequests.find((request) => request.service === service.key);
    return extra ? { id: extra.id, label: extra.label, tone: 'info' } : null;
  };

  return (
    <DetailScreen title="Value Added Services" fallbackHref="/">
      <View style={[styles.stack, styles.first]}>
        {services.map((service) => (
          <ServiceCard key={service.key} service={service} request={requestFor(service)} onPress={() => openService(service)} />
        ))}
      </View>

      <HelpCard subject="service" carded />

      <ServiceSheet
        service={services.find((service) => service.key === open) ?? null}
        onDismiss={() => setOpen(null)}
        onUpdate={update}
        orders={extraRequests.filter((request) => request.service === open)}
        onBrands={() => {
          setOpen(null);
          setCustom('brand-emi');
        }}
        toast={toast}
      />
      <SameDaySheet
        mode={custom === 'same-day' ? (sameDay?.status === 'Enabled' ? 'disable' : 'enable') : null}
        onDismiss={() => setCustom(null)}
        onConfirm={() => {
          const enabling = sameDay?.status !== 'Enabled';
          update('same-day', { status: enabling ? 'Enabled' : 'Not enabled', subState: enabling ? 'Active' : 'Deactivated' });
          setCustom(null);
          toast(enabling ? 'Same-Day settlement enabled' : 'Same-Day settlement disabled');
        }}
      />
      <OnDemandSheet visible={custom === 'on-demand'} onDismiss={() => setCustom(null)} />
      <BrandEmiSheet
        visible={custom === 'brand-emi'}
        onDismiss={() => setCustom(null)}
        onSubmit={(brands) => {
          const id = requestId();
          setExtraRequests((current) => [{ id, service: 'emi', label: `Requested ${brands.join(', ')}` }, ...current]);
          return id;
        }}
      />
      <PaymentQrSheet
        visible={custom === 'payment-qr'}
        onDismiss={() => setCustom(null)}
        onSubmit={(store) => {
          const id = requestId();
          setExtraRequests((current) => [{ id, service: 'payment-qr', label: `QR requested · ${store.name}` }, ...current]);
          return id;
        }}
      />
    </DetailScreen>
  );
}

/**
 * A service as Settlement preferences draws its options (Figma 7161:111000):
 * a white card, the icon with the state at the other end, then the name and
 * what it does. Not enabled shows the caret; the others their status.
 */
type CardRequest = { id: string; label: string; tone: 'warning' | 'danger' | 'info' };

/** Banner tints: Tailwind 50 / 800 on light, the 400 tone at low alpha on dark. */
const BANNER_TINT: Record<CardRequest['tone'], { light: [string, string]; dark: [string, string] }> = {
  warning: { light: ['#fef9c3', '#854d0e'], dark: ['rgba(250,204,21,0.14)', '#facc15'] },
  danger: { light: ['#fee2e2', '#991b1b'], dark: ['rgba(248,113,113,0.14)', '#f87171'] },
  info: { light: ['#dbeafe', '#1e40af'], dark: ['rgba(96,165,250,0.14)', '#60a5fa'] },
};
const BANNER_ICON: Record<CardRequest['tone'], string> = { warning: 'clock', danger: 'warning-circle', info: 'paper-plane-right' };

function ServiceCard({ service, request, onPress }: { service: ValueAddedService; request: CardRequest | null; onPress: () => void }) {
  const theme = useTheme();
  const on = service.status === 'Enabled';
  const [tint, ink] = request ? BANNER_TINT[request.tone][theme.dark ? 'dark' : 'light'] : ['', ''];
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      accessibilityRole="button"
      accessibilityLabel={`${service.title}, ${service.summary}, ${service.status}${request ? `, request ${request.id}: ${request.label}` : ''}`}
      style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View>
        <View style={styles.cardInner}>
          <View style={styles.cardTop}>
            <Icon source={service.icon} size={24} color={on ? theme.colors.primary : theme.colors.onSurface} />
            {/* Every service opens; Enabled / In processing keep their badge before the arrow. */}
            <View style={styles.cardEnd}>
              {service.status !== 'Not enabled' ? <DotStatusBadge label={service.status} tone={STATUS_TONE[service.status]} /> : null}
              <Icon source="caret-right" size={20} color={theme.colors.onSurface} />
            </View>
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{service.title}</Text>
            <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{service.summary}</Text>
          </View>
        </View>
        {request ? (
          <View style={[styles.banner, { backgroundColor: tint }]}>
            <Icon source={BANNER_ICON[request.tone]} size={16} color={ink} />
            <Text numberOfLines={1} style={[styles.bannerText, { color: ink }]}>
              {request.label}
            </Text>
            <Text style={[styles.bannerId, { color: ink }]}>{request.id}</Text>
          </View>
        ) : null}
      </View>
    </TouchableRipple>
  );
}

type Step = 'details' | 'request' | 'upload' | 'disable' | 'done';

/**
 * One service, in a sheet: its details, then (as it allows) the request, the
 * re-upload of documents asked for again, or turning it off.
 */
function ServiceSheet({
  service,
  onDismiss,
  onUpdate,
  orders,
  onBrands,
  toast,
}: {
  service: ValueAddedService | null;
  onDismiss: () => void;
  onUpdate: (key: ServiceKey, patch: Partial<ValueAddedService>) => void;
  /** One-off orders raised from the page (EMI brands), listed with the service's tickets. */
  orders: { id: string; label: string }[];
  onBrands: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [shown, setShown] = useState<ValueAddedService | null>(service);
  const [step, setStep] = useState<Step>('details');
  const [sentId, setSentId] = useState<string | null>(null);
  // Request inputs.
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [posId, setPosId] = useState<string | null>(null);
  const [volume, setVolume] = useState<string | null>(null);
  const [acceptance, setAcceptance] = useState<string | null>(null);
  const [email, setEmail] = useState(USER_EMAIL);
  const [mobile, setMobile] = useState(REGISTERED_MOBILE);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [pricingOk, setPricingOk] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  // Keep the last service while the sheet animates out; start fresh each time it opens.
  if (service && service !== shown) setShown(service);
  const [wasOpen, setWasOpen] = useState<ServiceKey | null>(null);
  if ((service?.key ?? null) !== wasOpen) {
    setWasOpen(service?.key ?? null);
    if (service) {
      setStep('details');
      setSentId(null);
      setStore(null);
      setPosId(null);
      setVolume(null);
      setAcceptance(null);
      setEmail(USER_EMAIL);
      setMobile(REGISTERED_MOBILE);
      setUploaded([]);
      setPricingOk(false);
      setReason(null);
    }
  }
  if (!shown) return null;
  const s = shown;
  const eligible = isEligible(s);
  const available = s.documents.filter((doc) => doc.state === 'Available');
  const toUpload = s.documents.filter(needsUpload);
  const allUploaded = toUpload.every((doc) => uploaded.includes(doc.name));
  const needsPricing = s.approvals.includes('Commercial') && Boolean(s.commercials);
  const inputsOk =
    (!s.inputs.includes('device') || Boolean(store && posId)) &&
    (!s.inputs.includes('volume') || Boolean(volume)) &&
    (!s.inputs.includes('acceptance') || Boolean(acceptance)) &&
    (!s.inputs.includes('contact') || (/^\S+@\S+\.\S+$/.test(email.trim()) && mobile.length === 10));
  const ready = inputsOk && allUploaded && (!needsPricing || pricingOk);

  const upload = async (doc: VasDocument) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (!result.canceled) setUploaded((current) => [...current.filter((name) => name !== doc.name), doc.name]);
  };
  // Rejected or missing documents sent again: the request moves on to approval.
  const resubmit = () => {
    onUpdate(s.key, {
      subState: 'Approval pending',
      documents: s.documents.map((doc) => (needsUpload(doc) ? { name: doc.name, state: 'Available' } : doc)),
      events: [...(s.events ?? []), { title: 'Documents re-submitted', detail: toUpload.map((doc) => doc.name).join(', '), at: nowLabel() }],
      nextAction: `${s.approvals.includes('Risk') ? 'Risk' : 'Pine Labs'} review · ${s.tat}`,
    });
    toast('Documents submitted');
    setUploaded([]);
    setStep('details');
  };
  const submit = () => {
    const id = requestId();
    const at = nowLabel();
    const next: VasSubState = s.approvals.includes('Risk') ? 'Risk review' : s.approvals.includes('Bank / Acquirer') ? 'Bank/Network review' : 'Provisioning in progress';
    onUpdate(s.key, {
      status: 'In processing',
      subState: next,
      requestId: id,
      submitted: [
        ...(store ? [{ label: 'Store', value: store.name }] : []),
        ...(posId ? [{ label: 'Device', value: posId }] : []),
        ...(volume ? [{ label: 'Expected volume', value: volume }] : []),
        ...(acceptance ? [{ label: 'Accept on', value: acceptance }] : []),
        ...(s.inputs.includes('contact') ? [{ label: 'Contact', value: `${email.trim()} · ${mobile}` }] : []),
        ...(needsPricing ? [{ label: 'Pricing', value: 'Accepted' }] : []),
      ],
      documents: s.documents.map((doc) => (needsUpload(doc) ? { name: doc.name, state: 'Available' } : doc)),
      events: [
        { title: 'Request received', detail: `${CURRENT_USER.name} · ${CURRENT_USER.roleLabel}`, at },
        ...(available.length ? [{ title: 'Documents reused from onboarding', detail: available.map((doc) => doc.name).join(', '), at }] : []),
        ...(toUpload.length ? [{ title: 'Documents uploaded', detail: toUpload.map((doc) => doc.name).join(', '), at }] : []),
        ...(needsPricing ? [{ title: 'Pricing accepted', at }] : []),
      ],
      nextAction: `${next} · usually ${s.tat}`,
    });
    setSentId(id);
    setStep('done');
  };

  const footer = (() => {
    if (step === 'done') return <SheetButton label="Done" onPress={onDismiss} />;
    if (step === 'request') return <SheetButton label="Submit request" disabled={!ready} onPress={submit} />;
    if (step === 'upload') return <SheetButton label="Submit documents" disabled={!allUploaded} onPress={resubmit} />;
    if (step === 'disable')
      return (
        <SheetButton
          label={`Disable ${s.title}`}
          destructive
          disabled={!reason}
          onPress={() => {
            onUpdate(s.key, { status: 'Not enabled', subState: 'Deactivated', events: [...(s.events ?? []), { title: 'Disabled', detail: reason ?? undefined, at: nowLabel() }] });
            toast(`${s.title} disabled`);
            onDismiss();
          }}
        />
      );
    // Details: the one action the state allows — never a request when it's on, in processing, or ineligible.
    if (s.status === 'Enabled') {
      if (s.flow === 'brand-emi') return <SheetButton label="Request more brands" onPress={onBrands} />;
      if (s.disableable) return <SheetButton label="Disable" mode="outline" onPress={() => setStep('disable')} />;
      return undefined;
    }
    if (s.status === 'In processing') return toUpload.length ? <SheetButton label="Upload documents" onPress={() => setStep('upload')} /> : undefined;
    return eligible ? <SheetButton label="Request" onPress={() => setStep('request')} /> : <SheetButton label="Not eligible yet" disabled onPress={() => undefined} />;
  })();

  return (
    <PanelSheet visible={service !== null} onDismiss={onDismiss} title={s.title} fit footer={footer}>
      {step === 'details' ? <ServiceDetails service={s} eligible={eligible} orders={orders} /> : null}
      {step === 'request' ? (
        <>
          <ServiceIntro icon={s.icon} title={`Request ${s.title}`} body="We’ve filled in what we already know. Add only what’s missing." />
          <SheetBlock>
            <SheetHeading>Your details</SheetHeading>
            <SheetRow label="Merchant ID" value={MERCHANT_ID} />
            <SheetRow label="Merchant model" value={MERCHANT_MODEL} />
            <SheetRow label="Category" value={MERCHANT_PREFILL.category} />
            <SheetRow label="MCC" value={MERCHANT_PREFILL.mcc} />
          </SheetBlock>
          {s.inputs.includes('device') ? (
            <>
              <StorePicker
                label="Store"
                value={store}
                onChange={(next) => {
                  setStore(next);
                  setPosId(null);
                }}
              />
              {store ? <DevicePicker storeId={store.storeId} value={posId} onChange={setPosId} /> : null}
            </>
          ) : null}
          {s.inputs.includes('volume') ? (
            <SheetBlock gap={12}>
              <SheetHeading>Expected international volume</SheetHeading>
              {INTERNATIONAL_VOLUMES.map((option) => (
                <OptionCard key={option} title={option} selected={volume === option} onPress={() => setVolume(option)} />
              ))}
            </SheetBlock>
          ) : null}
          {s.inputs.includes('acceptance') ? (
            <SheetBlock gap={12}>
              <SheetHeading>Where you’ll accept them</SheetHeading>
              {ACCEPTANCE_MODELS.map((option) => (
                <OptionCard key={option} title={option} selected={acceptance === option} onPress={() => setAcceptance(option)} />
              ))}
            </SheetBlock>
          ) : null}
          {s.inputs.includes('contact') ? (
            <SheetBlock gap={12}>
              <SheetHeading>Who should we contact?</SheetHeading>
              <SheetField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="name@business.com" />
              <SheetField
                label="Mobile number"
                value={mobile}
                onChangeText={(value) => setMobile(value.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                placeholder="10-digit mobile"
              />
            </SheetBlock>
          ) : null}
          {toUpload.length ? (
            <SheetBlock gap={12}>
              <SheetHeading>Documents needed</SheetHeading>
              {toUpload.map((doc) => (
                <UploadRow key={doc.name} doc={doc} done={uploaded.includes(doc.name)} onUpload={() => upload(doc)} />
              ))}
            </SheetBlock>
          ) : null}
          {needsPricing ? (
            <SheetBlock gap={12} last>
              <SheetHeading>Pricing</SheetHeading>
              <OptionCard type="checkbox" title="I accept the pricing" description={s.commercials} selected={pricingOk} onPress={() => setPricingOk((current) => !current)} />
            </SheetBlock>
          ) : null}
        </>
      ) : null}
      {step === 'upload' ? (
        <>
          <ServiceIntro icon="upload-simple" title="Upload documents" body={`Your ${s.title} request needs these again. Everything else stays as submitted.`} />
          <SheetBlock gap={12} last>
            {toUpload.map((doc) => (
              <UploadRow key={doc.name} doc={doc} done={uploaded.includes(doc.name)} onUpload={() => upload(doc)} />
            ))}
          </SheetBlock>
        </>
      ) : null}
      {step === 'disable' ? (
        <>
          <ServiceIntro icon={s.icon} title={`Disable ${s.title}?`} body="Customers can’t use it once it’s off. You can request it again later." />
          <SheetBlock gap={12} last>
            <SheetHeading>Why are you turning it off?</SheetHeading>
            {DISABLE_REASONS.map((option) => (
              <OptionCard key={option} title={option} selected={reason === option} onPress={() => setReason(option)} />
            ))}
          </SheetBlock>
        </>
      ) : null}
      {step === 'done' && sentId ? (
        <RequestSent
          id={sentId}
          body={`It’s now in processing. ${s.approvals.length ? `It needs ${s.approvals.map((approval) => approval.toLowerCase()).join(', ')} approval, ` : ''}usually ${s.tat}. We’ll update you by email, SMS and in the app.`}
        />
      ) : null}
    </PanelSheet>
  );
}

const DISABLE_REASONS = ['Pricing doesn’t work for us', 'We don’t need it any more', 'Customers aren’t using it', 'Something else'];
const MERCHANT_ID = ORGANISATIONS[0]!.merchantId;

/**
 * A service's details, as a user's details sheet on the store page: the
 * icon with its status badge across from it, the name and a line under it
 * where there's something to say (next step, what's missing, since when).
 * Below, on the grey, only the listings the service needs, in the app's
 * listing rows: its partners (brands / bank offers, the live ones badged),
 * its tickets as the support page lists them (until it's enabled), and what
 * was entered for an open one.
 */
function ServiceDetails({ service: s, eligible, orders }: { service: ValueAddedService; eligible: boolean; orders: { id: string; label: string }[] }) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const info = SERVICE_INFO[s.key];
  const enabled = s.status === 'Enabled';
  const unmet = s.eligibility.find((criterion) => !criterion.met);
  const note =
    s.status === 'In processing'
      ? s.nextAction
      : enabled
        ? info?.since
          ? `Enabled on ${info.since}`
          : undefined
        : s.subState === 'Deactivated'
          ? 'You turned this off. You can request it again.'
          : !eligible && unmet
            ? `Available once ${unmet.label.charAt(0).toLowerCase()}${unmet.label.slice(1)}`
            : undefined;
  // Tickets only until the service is on; once enabled they're history the merchant doesn't need here.
  const tickets: ServiceTicket[] = enabled
    ? []
    : [
        ...orders.map((order) => ({ id: order.id, title: `${s.title} · ${order.label}`, status: 'Open' as const, date: 'Today' })),
        ...(s.requestId && s.status === 'In processing'
          ? [{ id: s.requestId, title: `${s.title} · ${s.subState}`, status: 'In progress' as const, date: s.events?.[0]?.at.split(',')[0] ?? 'Today' }]
          : []),
      ];
  const partners = info?.partners;
  const live = partners?.items.filter((item) => item.live).length ?? 0;
  const entered = s.status === 'In processing' ? s.submitted : undefined;

  return (
    <>
      <SheetBlock gap={16} last={!partners && !tickets.length && !entered?.length}>
        <View style={styles.headTop}>
          <View style={[styles.tile, { backgroundColor: theme.dark ? 'rgba(190, 242, 100, 0.18)' : '#ecfccb' }]}>
            <Icon source={s.icon} size={24} color={theme.colors.primary} />
          </View>
          <DotStatusBadge label={s.status} tone={STATUS_TONE[s.status]} />
        </View>
        <View style={styles.headText}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{s.title}</Text>
          <Text style={[styles.body, muted]}>{s.summary}</Text>
          {note ? <Text style={[styles.small, muted]}>{note}</Text> : null}
        </View>
      </SheetBlock>

      {partners || tickets.length || entered?.length ? (
        <View style={[styles.lists, { backgroundColor: theme.colors.background }]}>
          {partners ? (
            <View style={styles.list}>
              <ListLabel label={partners.heading} trailing={enabled ? `${live} of ${partners.items.length} live` : `${partners.items.length}`} />
              <ListCard>
                {partners.items.map((partner) => (
                  <ListRow
                    key={partner.name}
                    icon={partner.bank ? <BankLogo bank={partner.bank} size={24} /> : <RowMark label={initialsOf(partner.name)} />}
                    accessibilityLabel={`${partner.name}, ${partner.detail}${enabled && partner.live ? ', live' : ''}`}>
                    <ListRowLine
                      left={
                        <>
                          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>
                            {partner.name}
                          </Text>
                          <Text numberOfLines={1} style={[styles.small, muted]}>
                            {partner.detail}
                          </Text>
                        </>
                      }
                      right={enabled && partner.live ? <DotStatusBadge label="Live" tone="success" /> : undefined}
                      centered
                    />
                  </ListRow>
                ))}
              </ListCard>
            </View>
          ) : null}
          {tickets.length ? (
            <View style={styles.list}>
              <ListLabel label="Your tickets" />
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} status={ticket.status} title={ticket.title} line={`Ticket no. ${ticket.id} · ${ticket.date}`} />
              ))}
            </View>
          ) : null}
          {entered?.length ? (
            <View style={styles.list}>
              <ListLabel label="What you entered" />
              <View style={[styles.entered, { backgroundColor: theme.colors.surface }]}>
                {entered.map((item) => (
                  <SheetRow key={item.label} label={item.label} value={item.value} />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

/** A listing's uppercase label on the sheet's grey, with a count at its end. */
function ListLabel({ label, trailing }: { label: string; trailing?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.listLabel}>
      <Text style={[styles.listLabelText, { color: theme.colors.onSurfaceVariant }]} accessibilityRole="header">
        {label.toUpperCase()}
      </Text>
      {trailing ? <Text style={[styles.listLabelText, { color: theme.colors.onSurfaceVariant }]}>{trailing}</Text> : null}
    </View>
  );
}

const GREEN = (dark: boolean) => (dark ? '#4ade80' : '#16a34a');
const RED = (dark: boolean) => (dark ? '#f87171' : '#dc2626');

/** A document to upload: its name, why (expired / rejected reason), and Upload — or Uploaded once picked. */
function UploadRow({ doc, done, onUpload }: { doc: VasDocument; done: boolean; onUpload: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.brand, { borderColor: theme.colors.outlineVariant }]}>
      <Icon source="file-text" size={20} color={theme.colors.onSurfaceVariant} />
      <View style={styles.flex}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{doc.name}</Text>
        <Text style={[styles.small, { color: doc.state === 'Missing' || done ? theme.colors.onSurfaceVariant : RED(theme.dark) }]}>
          {done ? 'Uploaded' : (doc.note ?? (doc.state === 'Missing' ? 'Needed for this request' : doc.state))}
        </Text>
      </View>
      {done ? (
        <Icon source="check-circle" size={20} color={GREEN(theme.dark)} />
      ) : (
        <Text onPress={onUpload} accessibilityRole="button" accessibilityLabel={`Upload ${doc.name}`} style={[styles.link, { color: theme.colors.primary }]}>
          Upload
        </Text>
      )}
    </View>
  );
}

/** A store's devices (each with its terminal ID) to pick one from. */
function DevicePicker({ storeId, value, onChange }: { storeId: string; value: string | null; onChange: (posId: string) => void }) {
  const theme = useTheme();
  const terminals = terminalsForStore(storeId);
  return (
    <SheetBlock gap={12}>
      <SheetHeading>Device</SheetHeading>
      {terminals.length ? (
        terminals.map((terminal) => (
          <OptionCard
            key={terminal.posId}
            title={terminal.posId}
            description={`${terminal.tid} · ${terminal.model}`}
            icon="cash-register"
            selected={value === terminal.posId}
            onPress={() => onChange(terminal.posId)}
          />
        ))
      ) : (
        <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>No devices are installed at this store yet.</Text>
      )}
    </SheetBlock>
  );
}

/** A sheet's opening block, as the Same-Day sheet's: the lime tile, the name and what it does. */
function ServiceIntro({ icon, title, body }: { icon: string; title: string; body: string }) {
  const theme = useTheme();
  return (
    <SheetBlock gap={12}>
      <View style={[styles.tile, { backgroundColor: theme.dark ? 'rgba(190, 242, 100, 0.18)' : '#ecfccb' }]}>
        <Icon source={icon} size={24} color={theme.colors.primary} />
      </View>
      <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{body}</Text>
    </SheetBlock>
  );
}

/** Pick one of the merchant's stores: search, then the matches; once picked, just that one with Change. */
function StorePicker({ value, onChange, label }: { value: StoreRecord | null; onChange: (store: StoreRecord | null) => void; label: string }) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = STORE_RECORDS.filter((store) => !q || `${store.name} ${store.address} ${store.storeId}`.toLowerCase().includes(q));
  return (
    <SheetBlock gap={12}>
      <SheetHeading
        trailing={
          value ? (
            <Text onPress={() => onChange(null)} accessibilityRole="button" style={[styles.link, { color: theme.colors.primary }]}>
              Change
            </Text>
          ) : undefined
        }>
        {label}
      </SheetHeading>
      {value ? (
        <OptionCard title={value.name} description={value.address} icon="storefront" selected onPress={() => onChange(null)} />
      ) : (
        <>
          <SheetField value={query} onChangeText={setQuery} placeholder="Search your stores" prefix="magnifying-glass" />
          {matches.map((store) => (
            <OptionCard key={store.storeId} title={store.name} description={store.address} icon="storefront" selected={false} onPress={() => onChange(store)} />
          ))}
          {matches.length ? null : <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>No stores match “{query.trim()}”.</Text>}
        </>
      )}
    </SheetBlock>
  );
}

/** The done state shared by the request sheets. */
function RequestSent({ id, body }: { id: string; body: string }) {
  return <SheetSuccess title="Request submitted" body={`Request ${id}. ${body}`} />;
}

/** EMI: the brands already live, more to ask for, and the FAQs. */
function BrandEmiSheet({ visible, onDismiss, onSubmit }: { visible: boolean; onDismiss: () => void; onSubmit: (brands: string[]) => string }) {
  const theme = useTheme();
  const [picked, setPicked] = useState<string[]>([]);
  const [sent, setSent] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (visible !== wasOpen) {
    setWasOpen(visible);
    if (visible) {
      setPicked([]);
      setSent(null);
    }
  }
  const live = new Set(ACTIVE_BRAND_EMIS.map((entry) => entry.brand));
  const muted = { color: theme.colors.onSurfaceVariant };
  const toggle = (brand: string) => setPicked((current) => (current.includes(brand) ? current.filter((entry) => entry !== brand) : [...current, brand]));

  return (
    <PanelSheet
      fit
      visible={visible}
      onDismiss={onDismiss}
      title="EMI brands"
      footer={
        sent ? (
          <SheetButton label="Done" onPress={onDismiss} />
        ) : (
          <SheetButton
            label={picked.length ? `Activate ${picked.length} ${picked.length === 1 ? 'brand' : 'brands'}` : 'Activate brand EMI'}
            disabled={!picked.length}
            onPress={() => setSent(onSubmit(picked))}
          />
        )
      }>
      {sent ? (
        <RequestSent id={sent} body={`We'll set up EMI for ${picked.join(', ')} on your devices and let you know once customers can use it.`} />
      ) : (
        <>
          <SheetBlock gap={12}>
            <SheetHeading>Active on your stores</SheetHeading>
            {ACTIVE_BRAND_EMIS.map((entry) => (
              <View key={entry.brand} style={[styles.brand, { borderColor: theme.colors.outlineVariant }]}>
                <View style={styles.flex}>
                  <Text style={[styles.title, { color: theme.colors.onSurface }]}>{entry.brand}</Text>
                  <Text style={[styles.small, muted]}>
                    {entry.products} · {entry.tenures}
                  </Text>
                </View>
                <DotStatusBadge label="Active" tone="success" />
              </View>
            ))}
          </SheetBlock>
          <SheetBlock gap={12}>
            <SheetHeading>Activate more brands</SheetHeading>
            {BRAND_EMI_BRANDS.filter((brand) => !live.has(brand)).map((brand) => (
              <OptionCard key={brand} title={brand} type="checkbox" selected={picked.includes(brand)} onPress={() => toggle(brand)} />
            ))}
          </SheetBlock>
          <SheetBlock last>
            <Text
              onPress={() => {
                onDismiss();
                router.push('/support/faqs');
              }}
              accessibilityRole="link"
              style={[styles.link, { color: theme.colors.primary }]}>
              Read Brand EMI FAQs
            </Text>
          </SheetBlock>
        </>
      )}
    </PanelSheet>
  );
}

/** Payment QR: a QR standee for the counter, delivered to the store picked, with the number to call on delivery. */
function PaymentQrSheet({ visible, onDismiss, onSubmit }: { visible: boolean; onDismiss: () => void; onSubmit: (store: StoreRecord) => string }) {
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [mobile, setMobile] = useState(REGISTERED_MOBILE);
  const [sent, setSent] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (visible !== wasOpen) {
    setWasOpen(visible);
    if (visible) {
      setStore(null);
      setMobile(REGISTERED_MOBILE);
      setSent(null);
    }
  }
  const ready = Boolean(store) && mobile.length === 10;

  return (
    <PanelSheet
      fit
      visible={visible}
      onDismiss={onDismiss}
      title="Payment QR"
      footer={sent ? <SheetButton label="Done" onPress={onDismiss} /> : <SheetButton label="Submit request" disabled={!ready} onPress={() => store && setSent(onSubmit(store))} />}>
      {sent ? (
        <RequestSent id={sent} body={`Your Payment QR will be delivered to ${store?.name}. We'll call ${mobile} before we come.`} />
      ) : (
        <>
          <ServiceIntro icon="qr-code" title="Request a Payment QR" body="A QR standee for your counter. Customers scan it to pay you with any UPI app." />
          <SheetBlock gap={12}>
            <SheetField
              label="Mobile number"
              value={mobile}
              onChangeText={(value) => setMobile(value.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              hint="We'll call this number to deliver it"
            />
          </SheetBlock>
          <StorePicker label="Deliver to" value={store} onChange={setStore} />
        </>
      )}
    </PanelSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  link: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20, textDecorationLine: 'underline' },
  stack: { gap: 8 },
  headTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headText: { gap: 4 },
  lists: { gap: 16, padding: 16, paddingBottom: 24 },
  list: { gap: 8 },
  listLabel: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  listLabelText: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  entered: { borderRadius: Shape.max, padding: 16, gap: 12 },
  // The app pages' detail screens start their content at the bar; cards keep the page's 8dp gap under it.
  first: { marginTop: PAGE_PADDING },
  card: { borderRadius: Shape.max, overflow: 'hidden' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  bannerText: { flex: 1, fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  bannerId: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  cardInner: { padding: 12, gap: 12 },
  cardEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  cardText: { gap: 4 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  tile: { width: 40, height: 40, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1, borderRadius: Shape.small },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 16, paddingTop: 2 },
  stepLine: { width: 1, flex: 1, marginTop: 4, minHeight: 16 },
  stepText: { flex: 1, gap: 2, paddingBottom: 16 },
});
