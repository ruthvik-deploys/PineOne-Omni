import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { SameDaySheet } from '@/components/payments/app-settlement-preferences';
import { OnDemandSheet } from '@/components/payments/on-demand-sheet';
import { DetailScreen } from '@/components/shared/detail-screen';
import { HelpCard } from '@/components/shared/help-card';
import { AppSectionHeader, TicketCard } from '@/components/support/support-landing';
import { PanelSheet } from '@/components/shared/panel-sheet';
import { OptionCard, SheetBlock, SheetButton, SheetField, SheetHeading, SheetSuccess } from '@/components/shared/sheet-parts';
import { DotStatusBadge } from '@/components/shared/status';
import { PAGE_PADDING } from '@/components/tab-screen';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { INITIAL_ROSTER } from '@/data/user-roster';
import { CURRENT_USER } from '@/data/businesses';
import { STORE_RECORDS, type StoreRecord } from '@/data/stores';
import {
  ACTIVE_BRAND_EMIS,
  BRAND_EMI_BRANDS,
  type ServiceKey,
  terminalsForStore,
  type ValueAddedService,
  VALUE_ADDED_SERVICES,
} from '@/data/value-added-services';
import { useToast } from '@/hooks/use-toast';

const USER_EMAIL = INITIAL_ROSTER.find((entry) => entry.name === CURRENT_USER.name)?.email ?? '';
const REGISTERED_MOBILE = '9876543210';

/** A request sent from a service's sheet, listed on the page until it's handled. */
type ServiceRequest = { id: string; service: string; detail: string };

const requestId = () => `CS${50000000 + Math.floor(Math.random() * 9999999)}`;

/** What each request form asks for and says (International card acceptance, DCC). */
const TERMINAL_SERVICES = {
  'international-cards': {
    title: 'International card acceptance',
    icon: 'globe',
    body: 'Accept Visa, Mastercard and other cards issued outside India on the device you choose.',
    contact: false,
  },
  dcc: {
    title: 'Dynamic currency conversion',
    icon: 'currency-circle-dollar',
    body: 'Customers with a foreign card can pay in their own currency. You still get settled in rupees.',
    contact: true,
  },
} as const;
type TerminalServiceKey = keyof typeof TERMINAL_SERVICES;

/**
 * Value Added Services (profile → Manage): the extras the merchant can switch
 * on, each with whether it's on, opening its own sheet: Same-Day and
 * On-Demand settlement, International card acceptance and DCC (per device),
 * Brand EMI and a Payment QR standee. What's been asked for is listed under
 * them until it's handled.
 */
export function ValueAddedServices() {
  const toast = useToast();
  const [services, setServices] = useState(VALUE_ADDED_SERVICES);
  const [open, setOpen] = useState<ServiceKey | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const sameDay = services.find((service) => service.key === 'same-day');
  const addRequest = (request: Omit<ServiceRequest, 'id'>) => {
    const id = requestId();
    setRequests((current) => [{ id, ...request }, ...current]);
    return id;
  };

  return (
    <DetailScreen title="Value Added Services" fallbackHref="/">
      <View style={[styles.stack, styles.first]}>
        {services.map((service) => (
          <ServiceCard key={service.key} service={service} onPress={() => setOpen(service.key)} />
        ))}
      </View>

      {requests.length ? (
        <View style={styles.stack}>
          <AppSectionHeader title="Your requests" onViewAll={() => router.push('/support/tickets')} />
          {requests.map((request) => (
            <TicketCard key={request.id} status="Open" title={`${request.service} · ${request.detail}`} line={`Request no. ${request.id}`} />
          ))}
        </View>
      ) : null}
      <HelpCard subject="service" carded />

      <SameDaySheet
        mode={open === 'same-day' ? (sameDay?.active ? 'disable' : 'enable') : null}
        onDismiss={() => setOpen(null)}
        onConfirm={() => {
          const enabling = !sameDay?.active;
          setServices((current) => current.map((service) => (service.key === 'same-day' ? { ...service, active: enabling } : service)));
          setOpen(null);
          toast(enabling ? 'Same-Day settlement enabled' : 'Same-Day settlement disabled');
        }}
      />
      <OnDemandSheet visible={open === 'on-demand'} onDismiss={() => setOpen(null)} />
      <TerminalServiceSheet
        service={open === 'international-cards' || open === 'dcc' ? open : null}
        onDismiss={() => setOpen(null)}
        onSubmit={(service, posId) => addRequest({ service: TERMINAL_SERVICES[service].title, detail: posId })}
      />
      <BrandEmiSheet visible={open === 'brand-emi'} onDismiss={() => setOpen(null)} onSubmit={(brands) => addRequest({ service: 'Brand EMI', detail: brands.join(', ') })} />
      <PaymentQrSheet visible={open === 'payment-qr'} onDismiss={() => setOpen(null)} onSubmit={(store) => addRequest({ service: 'Payment QR', detail: store.name })} />
    </DetailScreen>
  );
}

/**
 * A service as Settlement preferences draws its options (Figma 7161:111000):
 * a white card, the icon with the state at the other end, then the name and
 * what it does.
 */
function ServiceCard({ service, onPress }: { service: ValueAddedService; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      accessibilityRole="button"
      accessibilityLabel={`${service.title}, ${service.summary}${service.active ? ', active' : ''}`}
      style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <Icon source={service.icon} size={24} color={service.active ? theme.colors.primary : theme.colors.onSurface} />
          {service.active ? <DotStatusBadge label="Active" tone="success" /> : <Icon source="caret-right" size={20} color={theme.colors.onSurface} />}
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{service.title}</Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{service.summary}</Text>
        </View>
      </View>
    </TouchableRipple>
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

/**
 * International card acceptance or DCC, asked for on one device: the store,
 * then its device (each with its terminal ID), and for DCC who to contact.
 */
function TerminalServiceSheet({
  service,
  onDismiss,
  onSubmit,
}: {
  service: TerminalServiceKey | null;
  onDismiss: () => void;
  onSubmit: (service: TerminalServiceKey, posId: string) => string;
}) {
  const theme = useTheme();
  const [shown, setShown] = useState<TerminalServiceKey | null>(service);
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [posId, setPosId] = useState<string | null>(null);
  const [email, setEmail] = useState(USER_EMAIL);
  const [mobile, setMobile] = useState(REGISTERED_MOBILE);
  const [sent, setSent] = useState<string | null>(null);
  if (service && service !== shown) setShown(service);
  // Fresh each time it opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (Boolean(service) !== wasOpen) {
    setWasOpen(Boolean(service));
    if (service) {
      setStore(null);
      setPosId(null);
      setEmail(USER_EMAIL);
      setMobile(REGISTERED_MOBILE);
      setSent(null);
    }
  }
  if (!shown) return null;
  const copy = TERMINAL_SERVICES[shown];
  const terminals = store ? terminalsForStore(store.storeId) : [];
  const contactOk = !copy.contact || (/^\S+@\S+\.\S+$/.test(email.trim()) && mobile.replace(/\D/g, '').length === 10);
  const ready = Boolean(store && posId && contactOk);

  return (
    <PanelSheet
      visible={service !== null}
      onDismiss={onDismiss}
      title={copy.title}
      height={sent ? 380 : undefined}
      footer={
        sent ? (
          <SheetButton label="Done" onPress={onDismiss} />
        ) : (
          <SheetButton label="Submit request" disabled={!ready} onPress={() => posId && setSent(onSubmit(shown, posId))} />
        )
      }>
      {sent ? (
        <RequestSent id={sent} body={`We'll turn on ${copy.title.toLowerCase()} for ${posId} and let you know by email and SMS.`} />
      ) : (
        <>
          <ServiceIntro icon={copy.icon} title={`Turn on ${copy.title.toLowerCase()}`} body={copy.body} />
          <StorePicker
            label="Store"
            value={store}
            onChange={(next) => {
              setStore(next);
              setPosId(null);
            }}
          />
          {store ? (
            <SheetBlock gap={12} last={!copy.contact}>
              <SheetHeading>Device</SheetHeading>
              {terminals.length ? (
                terminals.map((terminal) => (
                  <OptionCard
                    key={terminal.posId}
                    title={terminal.posId}
                    description={`${terminal.tid} · ${terminal.model}`}
                    icon="cash-register"
                    selected={posId === terminal.posId}
                    onPress={() => setPosId(terminal.posId)}
                  />
                ))
              ) : (
                <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>No devices are installed at this store yet.</Text>
              )}
            </SheetBlock>
          ) : null}
          {copy.contact && store ? (
            <SheetBlock gap={12} last>
              <SheetHeading>Who should we contact?</SheetHeading>
              <SheetField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="name@business.com" />
              <SheetField label="Mobile number" value={mobile} onChangeText={(value) => setMobile(value.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" placeholder="10-digit mobile" />
            </SheetBlock>
          ) : null}
        </>
      )}
    </PanelSheet>
  );
}

/** Brand EMI: the brands already live, more to ask for, and the FAQs. */
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
      visible={visible}
      onDismiss={onDismiss}
      title="Brand EMI"
      height={sent ? 380 : undefined}
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
      visible={visible}
      onDismiss={onDismiss}
      title="Payment QR"
      height={sent ? 380 : undefined}
      footer={
        sent ? (
          <SheetButton label="Done" onPress={onDismiss} />
        ) : (
          <SheetButton label="Submit request" disabled={!ready} onPress={() => store && setSent(onSubmit(store))} />
        )
      }>
      {sent ? (
        <RequestSent id={sent} body={`Your Payment QR will be delivered to ${store?.name}. We'll call ${mobile} before we come.`} />
      ) : (
        <>
          <ServiceIntro icon="qr-code" title="Request a Payment QR" body="A QR standee for your counter. Customers scan it to pay you with any UPI app." />
          <SheetBlock gap={12}>
            <SheetField label="Mobile number" value={mobile} onChangeText={(value) => setMobile(value.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" hint="We'll call this number to deliver it" />
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
  // The app pages' detail screens start their content at the bar; cards keep the page's 8dp gap under it.
  first: { marginTop: PAGE_PADDING },
  card: { borderRadius: Shape.max },
  cardInner: { padding: 12, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  cardText: { gap: 4 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  tile: { width: 40, height: 40, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1, borderRadius: Shape.small },
});
