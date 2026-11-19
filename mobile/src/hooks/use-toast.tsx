import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Snackbar, Text, useTheme } from 'react-native-paper';

import { DOT_COLORS } from '@/components/shared/status';
import { Shape } from '@/constants/shape';

type ShowToast = (message: string, options?: { /** A green check ahead of the message. */ success?: boolean }) => void;

const ToastContext = createContext<ShowToast | null>(null);

/**
 * App-wide confirmation messages (web: sonner's toast / toast.success). Wraps
 * the shell's content; `bottomOffset` lifts the Snackbar above the navigation
 * bar on tab pages.
 */
export function ToastProvider({ bottomOffset = 0, children }: { bottomOffset?: number; children: ReactNode }) {
  const theme = useTheme();
  const [toast, setToast] = useState<{ message: string; success: boolean; key: number } | null>(null);
  const show = useCallback<ShowToast>((message, options) => setToast({ message, success: !!options?.success, key: Date.now() }), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        key={toast?.key}
        visible={toast !== null}
        onDismiss={() => setToast(null)}
        duration={4000}
        // Above the shell's page layer and the profile (app-tabs.tsx), which sit at zIndex 1 and 2.
        wrapperStyle={{ bottom: bottomOffset, zIndex: 3 }}
        style={styles.snackbar}>
        {toast?.success ? (
          <View style={styles.success}>
            <Icon source="check-circle-fill" size={20} color={DOT_COLORS.success} />
            <Text style={{ color: theme.colors.inverseOnSurface }}>{toast.message}</Text>
          </View>
        ) : (
          (toast?.message ?? '')
        )}
      </Snackbar>
    </ToastContext.Provider>
  );
}

/** Returns show(message). Outside a ToastProvider (e.g. in Storybook) it's a no-op. */
export function useToast(): ShowToast {
  return useContext(ToastContext) ?? noop;
}

function noop() {}

const styles = StyleSheet.create({
  // Standalone floating container.
  snackbar: { borderRadius: Shape.small },
  success: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
