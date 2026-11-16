import { Image } from 'expo-image';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, Icon, IconButton, TouchableRipple, useTheme } from 'react-native-paper';

import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { concentric, Shape } from '@/constants/shape';
import { Fonts, OPEN_DIGITS } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';

const PADDING = 12;
const INNER_RADIUS = concentric(Shape.max, PADDING);

/** The web's Figma-exported support mark, rasterised from its SVG (blur filters don't render in react-native-svg). */
export function SupportHeroIcon({ size }: { size: number }) {
  return (
    <Image
      source={require('@/assets/images/support/support-hero-icon.png')}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

/**
 * Support chat composer (web: SupportChatComposer), shared by the Support
 * landing and the chat screen: the input, an attach button, and Ask.
 */
export function SupportChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Describe your issue or ask anything...',
  inline = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  /** One line, as the chat's pinned composer (Figma 7249:196955): +, the input, the mic and send in a bordered pill. */
  inline?: boolean;
}) {
  const theme = useTheme();
  const toast = useToast();
  if (APP_PAGE_LAYOUT && inline) {
    const empty = !value.trim();
    return (
      <View style={[styles.inline, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <TouchableRipple
          onPress={() => toast("Attachments aren't available in this demo")}
          borderless
          accessibilityRole="button"
          accessibilityLabel="Attach file"
          style={[styles.inlineAttach, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="plus" size={18} color={theme.colors.onSurface} />
        </TouchableRipple>
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          returnKeyType="send"
          accessibilityLabel={placeholder}
          style={[styles.inlineInput, { color: theme.colors.onSurface }]}
        />
        <IconButton icon="microphone" size={20} onPress={() => toast("Voice input isn't available in this demo")} accessibilityLabel="Speak" style={styles.appMic} />
        <TouchableRipple
          onPress={onSubmit}
          disabled={empty}
          borderless
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={[styles.inlineSend, { backgroundColor: theme.colors.primary, opacity: empty ? 0.5 : 1 }]}>
          <Icon source="arrow-up" size={18} color={theme.colors.onPrimary} />
        </TouchableRipple>
      </View>
    );
  }
  // The app pages (APP_PAGE_LAYOUT, Figma 7228:157054): borderless white, the input, then + on the left and the mic and send on the right.
  if (APP_PAGE_LAYOUT) {
    return (
      <View style={[styles.appComposer, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          returnKeyType="send"
          accessibilityLabel={placeholder}
          style={[styles.appInput, { color: theme.colors.onSurface }]}
        />
        <View style={styles.actions}>
          <TouchableRipple
            onPress={() => toast("Attachments aren't available in this demo")}
            borderless
            accessibilityRole="button"
            accessibilityLabel="Attach file"
            style={[styles.appPill, styles.appAttach, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon source="plus" size={16} color={theme.colors.onSurface} />
          </TouchableRipple>
          <View style={styles.appTrailing}>
            <IconButton icon="microphone" size={16} onPress={() => toast("Voice input isn't available in this demo")} accessibilityLabel="Speak" style={styles.appMic} />
            <TouchableRipple
              onPress={onSubmit}
              borderless
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[styles.appPill, styles.appSend, { backgroundColor: theme.colors.primary }]}>
              <Icon source="arrow-up" size={16} color={theme.colors.onPrimary} />
            </TouchableRipple>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.composer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        returnKeyType="send"
        accessibilityLabel={placeholder}
        style={[styles.input, { color: theme.colors.onSurface }]}
      />
      <View style={styles.actions}>
        <IconButton
          icon="plus"
          mode="outlined"
          size={16}
          onPress={() => toast("Attachments aren't available in this demo")}
          accessibilityLabel="Attach file"
          iconColor={theme.colors.onSurfaceVariant}
          style={[styles.attach, { borderColor: theme.colors.outlineVariant }]}
        />
        <Button
          mode="contained"
          icon="arrow-up"
          onPress={onSubmit}
          accessibilityLabel="Send message"
          contentStyle={styles.askContent}
          style={styles.ask}>
          Ask
        </Button>
      </View>
    </View>
  );
}

const APP_PADDING = 8;
// Figma 7228:157054: a 24dp card with full pills inside.
const APP_RADIUS = 24;
const APP_PILL_RADIUS = 18;

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 52, paddingHorizontal: 8, borderWidth: 1, borderRadius: 26 },
  inlineAttach: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  inlineInput: { fontVariant: OPEN_DIGITS, flex: 1, height: 36, paddingHorizontal: 8, fontFamily: Fonts.regular, fontSize: 14 },
  inlineSend: { width: 56, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  appComposer: {
    borderRadius: APP_RADIUS,
    padding: APP_PADDING,
    gap: 16,
    // shadow/xs
    shadowColor: 'rgb(29, 29, 22)',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
    elevation: 1,
  },
  appInput: { fontVariant: OPEN_DIGITS, fontFamily: Fonts.regular, fontSize: 14, height: 36, paddingHorizontal: 8 },
  appPill: { height: 36, borderRadius: APP_PILL_RADIUS, alignItems: 'center', justifyContent: 'center' },
  appAttach: { width: 56 },
  appTrailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appMic: { margin: 0, width: 36, height: 36 },
  appSend: { width: 56 },
  composer: { borderWidth: 1, borderRadius: Shape.max, padding: PADDING, gap: 12 },
  input: { fontVariant: OPEN_DIGITS, fontFamily: Fonts.regular, fontSize: 16, minHeight: 24 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  attach: { margin: 0, width: 36, height: 36, borderRadius: INNER_RADIUS },
  ask: { borderRadius: INNER_RADIUS },
  askContent: { flexDirection: 'row-reverse', height: 36 },
});
