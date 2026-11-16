import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';

import { OutlinedActionButton } from './controls';
import { SECTION_CARD_INNER_RADIUS, SectionCard } from './detail-rows';

/**
 * "Need help with this …?" footer on detail pages (web: the support row at the
 * end of the settlement and dispute details): headset icon, copy, and Contact
 * us, which opens Support.
 */
export function HelpCard({ subject, carded = false }: { subject: string; /** As a SectionCard (card-based detail pages). */ carded?: boolean }) {
  const theme = useTheme();
  // The app pages (APP_PAGE_LAYOUT, Figma 7132:120426): a plain white card — the headset tile, the copy under it, then Contact us.
  if (carded && APP_PAGE_LAYOUT) {
    return (
      <View style={[styles.appCard, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.appIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="headphones" size={16} color={theme.colors.onSurface} />
        </View>
        <View style={styles.appText}>
          <Text style={[styles.appTitle, { color: theme.colors.onSurface }]}>Need help with this {subject}?</Text>
          <Text style={[styles.appBody, { color: theme.colors.onSurfaceVariant }]}>Our support team is available 24x7 to assist you with any questions</Text>
        </View>
        <View style={styles.row}>
          <OutlinedActionButton label="Contact us" onPress={() => router.navigate('/support')} radius={Shape.small} />
        </View>
      </View>
    );
  }
  if (carded) {
    return (
      <SectionCard title="Help" icon="headphones" collapsible={false}>
        <View>
          <Text variant="bodyMedium" style={styles.medium}>
            Need help with this {subject}?
          </Text>
          <Text variant="bodyMedium" style={[styles.regular, { color: theme.colors.onSurfaceVariant }]}>
            Our support team is available 24x7 to assist you with any questions
          </Text>
        </View>
        <View style={styles.row}>
          <OutlinedActionButton label="Contact us" onPress={() => router.navigate('/support')} radius={SECTION_CARD_INNER_RADIUS} />
        </View>
      </SectionCard>
    );
  }
  return (
    <View style={styles.block}>
      <View style={styles.help}>
        <View style={[styles.helpIcon, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="headphones" size={16} color={theme.colors.onSurface} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyMedium" style={styles.medium}>
            Need help with this {subject}?
          </Text>
          <Text variant="bodyMedium" style={[styles.regular, { color: theme.colors.onSurfaceVariant }]}>
            Our support team is available 24x7 to assist you with any questions
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <OutlinedActionButton label="Contact us" onPress={() => router.navigate('/support')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appCard: { borderRadius: Shape.max, padding: 12, gap: 12 },
  appIcon: { width: 32, height: 32, borderRadius: Shape.small, alignItems: 'center', justifyContent: 'center' },
  appText: { gap: 4 },
  appTitle: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 16 },
  appBody: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  block: { gap: 12 },
  help: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helpIcon: { width: 32, height: 32, borderRadius: Shape.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row' },
  regular: { fontFamily: Fonts.regular },
  medium: { fontFamily: Fonts.medium },
});
