import Stack from 'expo-router/js-stack';
import { useTheme } from 'react-native-paper';

/**
 * A tab's stack (Payments, Settlements, More): its root screen with inner
 * pages pushed on top. Inner pages slide in from the right when opened and
 * back out to the right on Back (user decision), with the tab page — header
 * and navigation bar included — easing left underneath, on every platform.
 * The JS stack is used because the native stack doesn't animate on web.
 * Screens draw their own chrome, so the stack's header is off. Inner pages
 * keep clear of the home indicator themselves (detail-screen.tsx), so a
 * pinned footer can run to the screen's bottom edge.
 */
export function InnerPageStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={() => ({
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        cardStyle: {
          // On web the stack otherwise lets a full-page card grow with its content and scroll the
          // document, which pushed the navigation bar below the content and stopped screens'
          // own ScrollViews from scrolling. Fill the screen exactly instead, as on native.
          flex: 1,
          overflow: 'hidden',
          backgroundColor: theme.colors.background,
        },
      })}
    />
  );
}
