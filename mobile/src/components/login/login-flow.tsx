import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LimeGlow } from '@/components/shared/lime-glow';
import { Fonts } from '@/constants/theme';
import { ORGANISATIONS } from '@/data/businesses';
import { useBusiness } from '@/hooks/use-business';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { useToast } from '@/hooks/use-toast';

/** Figma 7509:29139: the Pine Labs ONE wordmark, top left on the first step. */
const PINE_ONE = require('../../../assets/images/login/pine-labs-one.svg');

/** Wrong tries allowed before the web's "limit exhausted" lock-out. */
const MAX_TRIES = 3;
const RESEND_SECONDS = 30;
const LANGUAGES = ['English', 'हिन्दी', 'ಕನ್ನಡ', 'தமிழ்', 'తెలుగు', 'मराठी', 'ગુજરાતી', 'বাংলা', 'മലയാളം'];
/** What each organisation takes, under its name on the picker (Figma 7509:40591). */
const PAYMENTS_ENABLED: Record<string, string> = { 'vijay-sales': 'In-store payments enabled' };
const DEFAULT_PAYMENTS = 'Online & In-store payments enabled';
const CARD_PADDING = 16;
/** Figma 7509:29182 (SupportIssueCard): the same 18dp card as Support's. */
const CARD_RADIUS = 18;
const FIELD_RADIUS = 8;

const STEPS = ['identify', 'password', 'otp', 'reset-otp', 'new-password', 'reset-done', 'organisation'] as const;
type Step = (typeof STEPS)[number];
type Kind = 'email' | 'mobile' | 'user';


/** What the identifier looks like: a 10-digit mobile number, an email ID, or a user ID. */
function kindOf(value: string): Kind {
  const trimmed = value.trim();
  if (/^\d{10}$/.test(trimmed)) return 'mobile';
  if (trimmed.includes('@')) return 'email';
  return 'user';
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: '1 Upper-case letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: '1 Lower-case letter', test: (value: string) => /[a-z]/.test(value) },
  { label: '1 Number', test: (value: string) => /\d/.test(value) },
  { label: '1 Special character (e.g !@#$%^&)', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

/**
 * Logging in, from the web flow (Figma "Login - July 31") in the app's own
 * system: one decision per screen, each in the app's section card (title
 * header, hairline, body) on the grey page with Support's lime glow behind,
 * Back at the top left with the language switch opposite, and the main
 * action pinned in the footer. Email IDs have two-factor sign-in (web "Login
 * 2FA enabled"): password, then an OTP, marked 1 of 2 / 2 of 2. A user ID goes to the
 * password with OTP one tap away; a mobile number goes straight to the OTP.
 * Three wrong tries lock it (as the web). Forgot password runs OTP → new
 * password → done. An email used by more than one organisation picks the
 * organisation last. Demo rules: passwords of 8+ characters are accepted;
 * any OTP except 000000.
 */
export function LoginFlow() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { mode, setMode, systemScheme } = useThemeMode();
  const scheme = mode === 'system' ? systemScheme : mode;
  const toast = useToast();
  const business = useBusiness();
  const { expired, ...preview } = useLocalSearchParams<{ expired?: string; step?: string; id?: string; show?: string }>();
  // Development only: open a step directly for design review, e.g. /login?step=otp&id=tirth@setu.co&show=error.
  const previewStep = __DEV__ && preview.step && STEPS.includes(preview.step as Step) ? (preview.step as Step) : null;

  const [step, setStep] = useState<Step>(previewStep ?? 'identify');
  const [history, setHistory] = useState<Step[]>(previewStep && previewStep !== 'identify' ? ['identify'] : []);
  const [identifier, setIdentifier] = useState(__DEV__ && preview.id ? preview.id : '');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(__DEV__ && preview.show === 'error' ? (previewStep === 'otp' ? 'Please enter correct OTP' : 'Please enter correct password') : null);
  const [tries, setTries] = useState(0);
  const [resends, setResends] = useState(MAX_TRIES);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [locked, setLocked] = useState<'password' | 'otp' | null>(null);
  const [language, setLanguage] = useState('English');
  const [languageOpen, setLanguageOpen] = useState(false);
  // The preview's sheets open a moment after launch (iOS can't present a modal on the first frame).
  const previewSheet = __DEV__ ? preview.show : undefined;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (previewSheet === 'language') setLanguageOpen(true);
      if (previewSheet === 'locked') setLocked('password');
      if (previewSheet === 'otp-locked') setLocked('otp');
    }, 600);
    return () => clearTimeout(timer);
  }, [previewSheet]);
  const [pendingLanguage, setPendingLanguage] = useState('English');

  const kind = kindOf(identifier);
  const shownIdentifier = kind === 'mobile' ? `+91 ${identifier.trim()}` : identifier.trim();
  // An email ID can belong to several organisations (web: "Email ID is associated with multiple MID").
  const multipleOrganisations = kind === 'email' && ORGANISATIONS.length > 1;
  // Two-factor sign-in for email IDs: the password, then an OTP — neither alone gets in.
  const twoFactor = kind === 'email';
  const via = multipleOrganisations ? `Logging in via ${shownIdentifier}` : `Logging in to ${ORGANISATIONS[0].name} via ${shownIdentifier}`;

  // Once, when the app sent the merchant here because the session ran out.
  const expiredShown = useRef(false);
  useEffect(() => {
    if (expired && !expiredShown.current) {
      expiredShown.current = true;
      toast('Your session expired. Please log in again.');
    }
  }, [expired, toast]);

  // The resend countdown on the OTP steps.
  const onOtpStep = step === 'otp' || step === 'reset-otp';
  useEffect(() => {
    if (!onOtpStep || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [onOtpStep, seconds]);

  const go = (next: Step) => {
    setHistory((current) => [...current, step]);
    setStep(next);
    setError(null);
    setTries(0);
    if (next === 'otp' || next === 'reset-otp') {
      setOtp('');
      setSeconds(RESEND_SECONDS);
      setResends(MAX_TRIES);
    }
    if (next === 'password') setPassword('');
  };
  const back = () => {
    const previous = history[history.length - 1];
    if (!previous) return false;
    setHistory((current) => current.slice(0, -1));
    setStep(previous);
    setError(null);
    return true;
  };
  // Android Back walks back through the steps before leaving the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    return () => subscription.remove();
  });

  const enterApp = () => router.replace('/');
  const signedIn = () => (multipleOrganisations ? go('organisation') : enterApp());
  const wrongTry = (message: string, lock: 'password' | 'otp') => {
    const next = tries + 1;
    setTries(next);
    if (next >= MAX_TRIES) {
      setLocked(lock);
      setError(null);
      return;
    }
    setError(message);
  };
  // Okay on the limit sheet: back to the start (Figma 7509:33772 shows the first step behind it).
  const unlock = () => {
    setLocked(null);
    setHistory([]);
    setStep('identify');
  };
  const openLanguage = () => {
    setPendingLanguage(language);
    setLanguageOpen(true);
  };

  const resend = () => {
    if (seconds > 0 || resends === 0) return;
    setResends((value) => value - 1);
    setSeconds(RESEND_SECONDS);
    setOtp('');
    setError(null);
    toast(`OTP sent to ${shownIdentifier}`);
  };

  const rulesMet = PASSWORD_RULES.every((rule) => rule.test(newPassword));
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  // What each step shows: its title and line, the form, and the footer's one action (none on cards that act themselves).
  let title = '';
  let subtitle = '';
  let body: ReactNode = null;
  let action: { label: string; disabled: boolean; onPress: () => void } | null = { label: 'Continue', disabled: false, onPress: () => {} };
  let below: ReactNode = null;

  switch (step) {
    case 'identify':
      title = 'Login to your account';
      subtitle = 'You can login via email ID, user ID or mobile number';
      body = (
        <Field
          value={identifier}
          onChangeText={(value) => {
            setIdentifier(value);
            setError(null);
          }}
          placeholder="Enter email ID, user name, mobile number..."
          prefix={kind === 'mobile' ? '+91' : undefined}
          keyboardType="email-address"
          error={error}
          height={36}
          autoFocus
        />
      );
      action = {
        label: 'Continue',
        disabled: identifier.trim().length < 3,
        onPress: () => {
          if (/^\d+$/.test(identifier.trim()) && kind !== 'mobile') {
            setError('Enter a valid 10-digit mobile number');
            return;
          }
          go(kind === 'mobile' ? 'otp' : 'password');
        },
      };
      below = (
        <Text style={[styles.terms, { color: theme.colors.onSurfaceVariant }]}>
          By signing in, you agree to the <Text style={[styles.termsLink, { color: theme.colors.primary }]}>Privacy policy</Text> and{' '}
          <Text style={[styles.termsLink, { color: theme.colors.primary }]}>T&C PineLabs grievance policy</Text> for reference.
        </Text>
      );
      break;
    case 'password':
      title = 'Enter Password';
      subtitle = via;
      body = (
        <>
          <Field
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            placeholder="Enter password"
            secure
            error={error}
            autoFocus
          />
          <OutlineButton label="Forgot your password?" onPress={() => go('reset-otp')} />
          {twoFactor ? null : <OutlineButton label="Verify via OTP" onPress={() => go('otp')} />}
        </>
      );
      action = {
        label: 'Continue',
        disabled: password.length === 0,
        onPress: () => {
          if (password.length < 8) {
            wrongTry('Please enter correct password', 'password');
            return;
          }
          if (twoFactor) go('otp');
          else signedIn();
        },
      };
      break;
    case 'otp':
    case 'reset-otp':
      title = `Enter OTP sent on ${shownIdentifier}`;
      subtitle = step === 'reset-otp' ? `To reset the password for ${shownIdentifier}` : via;
      body = (
        <>
          <LoginOtp
            value={otp}
            error={error}
            onChange={(value) => {
              setOtp(value);
              setError(null);
            }}
          />
          <OutlineButton
            label={seconds > 0 ? `Resend OTP in 0:${String(seconds).padStart(2, '0')} • ${resends} ${resends === 1 ? 'try' : 'tries'} left` : `Resend OTP • ${resends} ${resends === 1 ? 'try' : 'tries'} left`}
            onPress={resend}
            disabled={seconds > 0 || resends === 0}
          />
          {step === 'otp' && kind === 'user' ? <OutlineButton label="Verify via password" onPress={() => go('password')} /> : null}
        </>
      );
      action = {
        label: 'Continue',
        disabled: otp.length < 6,
        onPress: () => {
          if (otp === '000000') {
            wrongTry('Please enter correct OTP', 'otp');
            return;
          }
          if (step === 'reset-otp') {
            setNewPassword('');
            setConfirmPassword('');
            go('new-password');
          } else signedIn();
        },
      };
      break;
    case 'new-password':
      title = 'Create new password';
      subtitle = `This password will be used for ${shownIdentifier} ${kind === 'email' ? 'email ID' : kind === 'mobile' ? 'mobile number' : 'user ID'}`;
      body = (
        <>
          <Field label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password" secure autoFocus />
          <Field
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Enter new password again"
            secure
            error={mismatch ? "Passwords don't match" : null}
          />
          <View style={[styles.rules, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.rulesTitle, { color: theme.colors.onSurface }]}>Password must contain</Text>
            <View style={styles.ruleList}>
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(newPassword);
                return (
                  <View key={rule.label} style={styles.rule}>
                    <Icon source="check" size={16} color={met ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                    <Text style={[styles.ruleLabel, { color: met ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>{rule.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      );
      action = { label: 'Confirm & reset', disabled: !rulesMet || confirmPassword !== newPassword, onPress: () => go('reset-done') };
      break;
    case 'reset-done':
      action = null;
      break;
    case 'organisation':
      title = 'Select organisation to login';
      subtitle = `Logging in via ${shownIdentifier}`;
      body = (
        <View style={styles.options}>
          {ORGANISATIONS.map((org) => (
            <TouchableRipple
              key={org.id}
              onPress={() => {
                business.selectOrganisation(org.id);
                enterApp();
              }}
              borderless
              accessibilityRole="button"
              accessibilityLabel={`${org.name}, ${PAYMENTS_ENABLED[org.id] ?? DEFAULT_PAYMENTS}`}
              style={[styles.option, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
              <View style={styles.optionContent}>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>{org.name}</Text>
                  <Text style={[styles.optionLine, { color: theme.colors.onSurfaceVariant }]}>{PAYMENTS_ENABLED[org.id] ?? DEFAULT_PAYMENTS}</Text>
                </View>
                <Icon source="caret-right" size={16} color={theme.colors.onSurface} />
              </View>
            </TouchableRipple>
          ))}
        </View>
      );
      action = null;
      break;
  }

  const canGoBack = history.length > 0 && step !== 'reset-done';
  const loginAgain = () => {
    setHistory([]);
    setStep('password');
    setPassword('');
    setError(null);
    setTries(0);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <LimeGlow />
      {/* Figma 7509:29024: the status bar sits on white, above the glow. */}
      <View style={[styles.statusBar, { height: insets.top, backgroundColor: theme.colors.surface }]} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Figma 7509:29137: the wordmark, then theme and language at the end. */}
        <View style={[styles.bar, { paddingTop: insets.top + 16 }]}>
          <View style={styles.wordmarkBox}>
            <Image source={PINE_ONE} style={styles.wordmark} contentFit="contain" tintColor={theme.dark ? theme.colors.onSurface : undefined} accessibilityLabel="Pine Labs ONE" />
          </View>
          <View style={styles.barEnd}>
            <TouchableRipple
              onPress={() => setMode(scheme === 'dark' ? 'light' : 'dark')}
              borderless
              accessibilityRole="button"
              accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={styles.themeButton}>
              <Icon source={scheme === 'dark' ? 'moon' : 'sun'} size={16} color={theme.colors.onSurface} />
            </TouchableRipple>
            <TouchableRipple
              onPress={openLanguage}
              borderless
              accessibilityRole="button"
              accessibilityLabel={`Language: ${language}. Change`}
              style={[styles.language, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
              <View style={styles.languageContent}>
                <Text style={[styles.languageLabel, { color: theme.colors.onSurface }]}>{language}</Text>
                <Icon source="caret-down" size={14} color={theme.colors.onSurface} />
              </View>
            </TouchableRipple>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'reset-done' ? (
            /* Figma 7509:38679: the tick, the headline and line, centred, with Login on the card. */
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.done}>
                <View style={[styles.doneTile, { backgroundColor: theme.colors.primary }]}>
                  <Icon source="check" size={24} color={theme.colors.onPrimary} />
                </View>
                <View style={styles.heading}>
                  <Text style={[styles.doneTitle, { color: theme.colors.onSurface }]}>Password changed successfully</Text>
                  <Text style={[styles.doneLine, { color: theme.colors.onSurfaceVariant }]}>Please login to your account using new password</Text>
                </View>
                <PrimaryButton label="Login" onPress={loginAgain} height={32} />
              </View>
            </View>
          ) : (
            /* Figma 7509:29182 / 7509:31671: Back (from the second step on), the title and line, then the form. */
            <View style={[styles.card, canGoBack && styles.cardWithBack, { backgroundColor: theme.colors.surface }]}>
              {canGoBack ? (
                <TouchableRipple onPress={back} borderless accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
                  <View style={styles.backContent}>
                    <Icon source="caret-left" size={16} color={theme.colors.onSurface} />
                    <Text style={[styles.backLabel, { color: theme.colors.onSurface }]}>Back</Text>
                  </View>
                </TouchableRipple>
              ) : null}
              <View style={canGoBack ? styles.stepBody : styles.firstBody}>
                <View style={styles.heading}>
                  <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
                  <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
                </View>
                {body}
              </View>
            </View>
          )}
          {below}
        </ScrollView>

        {/* Figma 7509:29222: the step's one action on a white bar pinned to the bottom edge. */}
        {action ? (
          <View style={[styles.footer, { backgroundColor: theme.colors.surface, paddingBottom: 16 + insets.bottom }]}>
            <PrimaryButton label={action.label} onPress={action.onPress} disabled={action.disabled} height={36} />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {/* Figma 7509:33079: Change language. */}
      <Flyout visible={languageOpen} title="Change language" onDismiss={() => setLanguageOpen(false)}>
        <ScrollView style={styles.languageList} contentContainerStyle={styles.flyoutList}>
          {LANGUAGES.map((option) => {
            const selected = pendingLanguage === option;
            return (
              <TouchableRipple
                key={option}
                onPress={() => setPendingLanguage(option)}
                borderless
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[styles.option, { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
                <View style={[styles.optionContent, styles.languageOption]}>
                  <Text style={[styles.optionTitle, styles.flex, { color: theme.colors.onSurface }]}>{option}</Text>
                  <Radio selected={selected} />
                </View>
              </TouchableRipple>
            );
          })}
        </ScrollView>
        <View style={[styles.flyoutFooter, { borderTopColor: theme.colors.background }]}>
          <PrimaryButton
            label="Done"
            height={32}
            onPress={() => {
              setLanguage(pendingLanguage);
              setLanguageOpen(false);
            }}
          />
        </View>
      </Flyout>

      {/* Figma 7509:33772 / 7509:37581: three wrong tries. */}
      <Flyout visible={locked !== null} title="Limit exhausted" onDismiss={unlock}>
        <View style={styles.limitBody}>
          <View style={[styles.limitTile, { backgroundColor: theme.dark ? 'rgba(220, 38, 38, 0.16)' : '#fef2f2' }]}>
            <Icon source="warning" size={24} color={theme.colors.error} />
          </View>
          <View style={styles.limitText}>
            <Text style={[styles.title, styles.center, { color: theme.colors.onSurface }]}>{locked === 'otp' ? 'OTP limit exhausted' : 'Password limit exhausted'}</Text>
            <Text style={[styles.doneLine, styles.center, { color: theme.colors.onSurfaceVariant }]}>
              You entered {locked === 'otp' ? 'OTP' : 'password'} for {MAX_TRIES} times, please try after sometime to login
            </Text>
          </View>
        </View>
        <View style={[styles.flyoutFooter, styles.limitFooter, { borderTopColor: theme.colors.background }]}>
          <PrimaryButton label="Okay" onPress={unlock} height={32} hug />
        </View>
      </Flyout>
    </View>
  );
}

/** Figma 1252:113476 / 113463: the brand-green button, 36dp in the footer, 32dp on cards and sheets. */
function PrimaryButton({ label, onPress, disabled = false, height, hug = false }: { label: string; onPress: () => void; disabled?: boolean; height: number; hug?: boolean }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      borderless
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.primary, hug && styles.primaryHug, { height, backgroundColor: theme.colors.primary, opacity: disabled ? 0.5 : 1 }]}>
      <Text style={[styles.primaryLabel, { color: theme.colors.onPrimary }]}>{label}</Text>
    </TouchableRipple>
  );
}

/** Figma 7509:31848: a full-width outlined 28dp button for the step's second choice. */
function OutlineButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      borderless
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.outline, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.outlineLabel, { color: disabled ? theme.colors.onSurfaceVariant : theme.colors.onSurface }]}>{label}</Text>
    </TouchableRipple>
  );
}

/** Figma RadioButton: 16dp, brand green with a white dot when picked. */
function Radio({ selected }: { selected: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.radio, selected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.outlineVariant }]}>
      {selected ? <View style={[styles.radioDot, { backgroundColor: theme.colors.onPrimary }]} /> : null}
    </View>
  );
}

/**
 * Figma "Flyout" (7509:33079, 7509:33772): a white card floating 8dp off the
 * screen's edges and bottom over a dim — the title (muted) with an outlined
 * close, a hairline, then the content.
 */
function Flyout({ visible, title, onDismiss, children }: { visible: boolean; title: string; onDismiss: () => void; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close" />
      <View style={[styles.flyoutWrap, { paddingBottom: Math.max(insets.bottom, 8), paddingTop: insets.top + 16 }]} pointerEvents="box-none">
        <View style={[styles.flyout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.background }]}>
          <View style={[styles.flyoutHeader, { borderBottomColor: theme.colors.background }]}>
            <Text style={[styles.flyoutTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
            <TouchableRipple onPress={onDismiss} borderless accessibilityRole="button" accessibilityLabel="Close" style={[styles.close, { borderColor: theme.colors.outlineVariant }]}>
              <Icon source="x" size={16} color={theme.colors.onSurface} />
            </TouchableRipple>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** Figma InputOTP (7509:30619): six joined 36dp slots across the card; red edges on a wrong OTP, the message under them. */
function LoginOtp({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string | null }) {
  const theme = useTheme();
  const input = useRef<TextInput>(null);
  const edge = error ? theme.colors.error : theme.colors.outlineVariant;
  return (
    <View style={styles.field}>
      <Pressable onPress={() => input.current?.focus()} accessibilityRole="none" style={styles.otp}>
        {Array.from({ length: 6 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.otpSlot,
              { borderColor: edge, backgroundColor: theme.colors.surface },
              index > 0 && styles.otpJoined,
              index === 0 && styles.otpFirst,
              index === 5 && styles.otpLast,
            ]}>
            <Text style={[styles.otpDigit, { color: theme.colors.onSurface }]}>{value[index] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          ref={input}
          value={value}
          onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          accessibilityLabel="One-time password"
          style={styles.otpInput}
        />
      </Pressable>
      {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
    </View>
  );
}

/** Figma Field (1256:94630): an optional 14dp label, the 32dp input (36dp on the first step), +91, show / hide, and the red state with its message. */
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  secure = false,
  keyboardType,
  error,
  autoFocus,
  height = 32,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  prefix?: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
  error?: string | null;
  autoFocus?: boolean;
  height?: number;
}) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>{label}</Text> : null}
      <View style={[styles.input, { height, backgroundColor: theme.colors.surface, borderColor: error ? theme.colors.error : theme.colors.outlineVariant }, error && styles.inputInvalid]}>
        {prefix ? <Text style={[styles.inputText, { color: theme.colors.onSurfaceVariant }]}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          secureTextEntry={secure && hidden}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          accessibilityLabel={label ?? placeholder}
          style={[styles.inputText, styles.flex, { color: theme.colors.onSurface }]}
        />
        {secure ? (
          <TouchableRipple onPress={() => setHidden((current) => !current)} borderless accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} style={styles.eye}>
            <Icon source={hidden ? 'eye' : 'eye-slash'} size={12} color={theme.colors.onSurface} />
          </TouchableRipple>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 16 },
  wordmarkBox: { padding: 2.67 },
  wordmark: { width: 76, height: 26.67 },
  barEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeButton: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  language: { borderRadius: 8, borderWidth: 1 },
  languageContent: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10 },
  languageLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  content: { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 16, gap: 16 },
  card: { borderRadius: CARD_RADIUS, padding: CARD_PADDING, gap: 16 },
  cardWithBack: { gap: 24 },
  back: { alignSelf: 'flex-start', borderRadius: 8 },
  backContent: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32 },
  backLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  firstBody: { gap: 16 },
  stepBody: { gap: 24 },
  heading: { gap: 4 },
  title: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  subtitle: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  field: { gap: 8 },
  fieldLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: 4, borderWidth: 1, borderRadius: FIELD_RADIUS },
  inputInvalid: { borderRadius: 10, boxShadow: '0px 0px 0px 3px rgba(220, 38, 38, 0.2)' },
  inputText: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, paddingVertical: 0 },
  eye: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  otp: { flexDirection: 'row', height: 36 },
  otpSlot: { flex: 1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  otpJoined: { borderLeftWidth: 0 },
  otpFirst: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  otpLast: { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  otpDigit: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  otpInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
  outline: { height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  outlineLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  rules: { borderRadius: 8, padding: 12, gap: 12 },
  rulesTitle: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  ruleList: { gap: 8 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleLabel: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  options: { gap: 8 },
  option: { borderRadius: 8, borderWidth: 1 },
  optionContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10 },
  optionText: { flex: 1, gap: 4 },
  optionTitle: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  optionLine: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  languageOption: { alignItems: 'center' },
  done: { gap: 32, alignItems: 'center' },
  doneTile: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  doneTitle: { fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 28, textAlign: 'center' },
  doneLine: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  terms: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  termsLink: { fontFamily: Fonts.medium, textDecorationLine: 'underline' },
  footer: { paddingTop: 16, paddingHorizontal: 16, boxShadow: '0px -1px 16px 2px rgba(0, 0, 0, 0.1)' },
  primary: { alignSelf: 'stretch', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  primaryHug: { alignSelf: 'flex-end', paddingHorizontal: 12 },
  primaryLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.2)' },
  flyoutWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 8 },
  flyout: { borderRadius: CARD_RADIUS, borderWidth: 1, overflow: 'hidden', maxHeight: '100%' },
  flyoutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  flyoutTitle: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 14 },
  close: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  languageList: { flexGrow: 0 },
  flyoutList: { padding: 16, gap: 8 },
  flyoutFooter: { padding: 16, borderTopWidth: 1 },
  limitBody: { padding: 16, gap: 16, alignItems: 'center' },
  limitTile: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  limitText: { gap: 8, alignSelf: 'stretch' },
  limitFooter: { alignItems: 'flex-end' },
});
