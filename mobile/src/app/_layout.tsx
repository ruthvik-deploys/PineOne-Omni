import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, PaperProvider, Text, useTheme } from 'react-native-paper';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { paperIconSettings } from '@/components/icons';
import { paperDarkTheme, paperTheme } from '@/constants/paper-theme';
import { FONT_ASSETS } from '@/constants/theme';
import { BusinessProvider, useBusiness } from '@/hooks/use-business';
import { ThemeModeProvider, useThemeMode } from '@/hooks/use-theme-mode';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeModeProvider>
      <Themed>
        <BusinessProvider>
          <AnimatedSplashOverlay />
          <App />
        </BusinessProvider>
      </Themed>
    </ThemeModeProvider>
  );
}

/** The app, rebuilt from scratch on an organisation switch, with a reload screen over it meanwhile. */
function App() {
  const { appKey, switchingTo } = useBusiness();
  const theme = useTheme();
  return (
    <>
      <AppTabs key={appKey} />
      {switchingTo ? (
        <View accessibilityLiveRegion="polite" style={[styles.reload, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Switching to {switchingTo}
          </Text>
        </View>
      ) : null}
    </>
  );
}

/**
 * The Paper / Material 3 theme for the user's Light, Dark or System pick (see
 * use-theme-mode), with react-navigation's own chrome (headers, the screen
 * background during transitions) kept in sync with it rather than two
 * competing colour systems, and the status bar's text to match.
 */
function Themed({ children }: { children: ReactNode }) {
  const { scheme } = useThemeMode();
  const theme = scheme === 'dark' ? paperDarkTheme : paperTheme;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };
  return (
    <PaperProvider theme={theme} settings={paperIconSettings}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </ThemeProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  // Above everything in the shell (app-tabs.tsx), whose page layer and overlays run up to zIndex 3.
  reload: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 4, alignItems: 'center', justifyContent: 'center', gap: 16 },
});
