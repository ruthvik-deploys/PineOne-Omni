import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { Tabs } from '@/components/material3/tabs';
import { SearchField } from '@/components/search-field';
import { DetailScreen } from '@/components/shared/detail-screen';
import { ListCard, LIST_ROW_PADDING, LIST_ROW_RADIUS } from '@/components/shared/listing';
import { PanelSheet } from '@/components/shared/panel-sheet';
import { PAGE_PADDING } from '@/components/tab-screen';
import { useAppColors } from '@/constants/app-colors';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { type KnowledgeFaq, topicLabel, SUPPORT_TOPICS, type SupportTopicSlug, TOPIC_FAQS } from '@/data/support';

const TOPIC_TABS = SUPPORT_TOPICS.map((topic) => ({ key: topic.slug, label: topic.label }));

/**
 * All FAQs (web: SupportFaqsContent): search, one tab per support topic, and
 * the topic's questions as a single-open accordion. `?topic=` picks the tab.
 */
export function SupportFaqs(props: { initialTopic?: string }) {
  return APP_PAGE_LAYOUT ? <AppSupportFaqs {...props} /> : <ClassicSupportFaqs {...props} />;
}

/**
 * All FAQs as the app pages set them (APP_PAGE_LAYOUT, Figma 7249:193583 /
 * 7249:194959): the topics as a scrolling row of chips (the picked one lime,
 * green-edged), each question its own white row, and a question opening as
 * a sheet — what to do, what can come of it, and Chat with us / Raise a ticket.
 */
function AppSupportFaqs({ initialTopic }: { initialTopic?: string }) {
  const theme = useTheme();
  const appColors = useAppColors();
  const [topic, setTopic] = useState<SupportTopicSlug>(
    SUPPORT_TOPICS.find((item) => item.slug === initialTopic)?.slug ?? SUPPORT_TOPICS[0].slug
  );
  const [open, setOpen] = useState<KnowledgeFaq | null>(null);
  const faqs = TOPIC_FAQS[topic] ?? [];

  return (
    <DetailScreen title="All FAQs" fallbackHref="/support">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>
        {SUPPORT_TOPICS.map((item) => {
          const active = item.slug === topic;
          return (
            <TouchableRipple
              key={item.slug}
              onPress={() => setTopic(item.slug)}
              borderless
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                { backgroundColor: active ? appColors.highlight : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.outlineVariant },
              ]}>
              <Text style={[styles.chipLabel, { color: active ? theme.colors.primary : theme.colors.onSurface }]}>{topicLabel(item.label)}</Text>
            </TouchableRipple>
          );
        })}
      </ScrollView>
      <View style={styles.rows}>
        {faqs.map((faq) => (
          <TouchableRipple
            key={faq.question}
            onPress={() => setOpen(faq)}
            borderless
            accessibilityRole="button"
            style={[styles.rowCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{faq.question}</Text>
              <Icon source="caret-right" size={20} color={theme.colors.onSurface} />
            </View>
          </TouchableRipple>
        ))}
      </View>

      <PanelSheet visible={open !== null} onDismiss={() => setOpen(null)} title="FAQ details" grouped={false} height={560}>
        {open ? (
          <View style={styles.sheetBody}>
            <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>{open.question}</Text>
            <View style={[styles.block, { borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.blockTitle, { color: theme.colors.onSurface }]}>Actions</Text>
              <Text style={[styles.blockBody, { color: theme.colors.onSurfaceVariant }]}>{open.question}</Text>
            </View>
            <View style={[styles.block, { borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.blockTitle, { color: theme.colors.onSurface }]}>Possible outcomes</Text>
              <Text style={[styles.blockBody, { color: theme.colors.onSurfaceVariant }]}>{open.answer}</Text>
            </View>
            <View style={[styles.block, { borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.blockTitle, { color: theme.colors.onSurface }]}>Still need help?</Text>
              <Text style={[styles.blockBody, { color: theme.colors.onSurfaceVariant }]}>Chat with our agent or raise a ticket.</Text>
              <View style={styles.blockActions}>
                <Button
                  mode="contained"
                  compact
                  onPress={() => {
                    setOpen(null);
                    router.push({ pathname: '/support/chat', params: { topic } });
                  }}
                  style={styles.blockButton}
                  labelStyle={styles.blockButtonLabel}>
                  Chat with us
                </Button>
                <Button
                  mode="outlined"
                  compact
                  textColor={theme.colors.onSurface}
                  onPress={() => {
                    setOpen(null);
                    router.push('/support/tickets');
                  }}
                  style={[styles.blockButton, { borderColor: theme.colors.outlineVariant }]}
                  labelStyle={styles.blockButtonLabel}>
                  Raise a ticket
                </Button>
              </View>
            </View>
          </View>
        ) : null}
      </PanelSheet>
    </DetailScreen>
  );
}


function ClassicSupportFaqs({ initialTopic }: { initialTopic?: string }) {
  const theme = useTheme();
  const [topic, setTopic] = useState<SupportTopicSlug>(
    SUPPORT_TOPICS.find((item) => item.slug === initialTopic)?.slug ?? SUPPORT_TOPICS[0].slug
  );
  const [search, setSearch] = useState('');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const query = search.trim().toLowerCase();
  const faqs = (TOPIC_FAQS[topic] ?? []).filter((faq) => !query || faq.question.toLowerCase().includes(query));

  return (
    <DetailScreen title="All FAQs" fallbackHref="/support">
      <SearchField value={search} onChangeText={setSearch} placeholder="Search FAQs" radius={Shape.small} />
      <View style={styles.tabs}>
        <Tabs
          tabs={TOPIC_TABS}
          activeKey={topic}
          onChange={(key) => {
            setTopic(key as SupportTopicSlug);
            setOpenQuestion(null);
          }}
          variant="secondary"
          scrollable
        />
      </View>
      {faqs.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No FAQs match your search.
        </Text>
      ) : (
        <ListCard>
          {faqs.map((faq) => {
            const open = openQuestion === faq.question;
            return (
              <View key={faq.question}>
                <TouchableRipple
                  onPress={() => setOpenQuestion(open ? null : faq.question)}
                  borderless
                  accessibilityRole="button"
                  aria-expanded={open}
                  accessibilityState={{ expanded: open }}
                  style={styles.trigger}>
                  <View style={styles.triggerContent}>
                    <Text variant="bodyMedium" style={[styles.flex, styles.medium]}>
                      {faq.question}
                    </Text>
                    <Icon source={open ? 'caret-up' : 'caret-down'} size={16} color={theme.colors.onSurfaceVariant} />
                  </View>
                </TouchableRipple>
                {open ? (
                  <Text variant="bodyMedium" style={[styles.answer, { color: theme.colors.onSurfaceVariant }]}>
                    {faq.answer}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ListCard>
      )}
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  chipScroller: { marginHorizontal: -PAGE_PADDING },
  chips: { gap: 8, paddingHorizontal: PAGE_PADDING },
  chip: { height: 32, justifyContent: 'center', paddingHorizontal: 12, borderRadius: Shape.small, borderWidth: 1 },
  chipLabel: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  rows: { gap: 8 },
  rowCard: { borderRadius: Shape.max },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12 },
  rowLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  sheetBody: { padding: 16, gap: 16 },
  sheetTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  block: { borderWidth: 1, borderRadius: Shape.max, padding: 12, gap: 8 },
  blockTitle: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20 },
  blockBody: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 22 },
  blockActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  blockButton: { borderRadius: Shape.small },
  blockButtonLabel: { marginVertical: 6, fontFamily: Fonts.medium, fontSize: 14 },
  flex: { flex: 1 },
  medium: { fontFamily: Fonts.medium },
  tabs: { marginHorizontal: -PAGE_PADDING, marginVertical: -8 },
  trigger: { borderRadius: LIST_ROW_RADIUS },
  triggerContent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: LIST_ROW_PADDING },
  answer: { fontFamily: Fonts.regular, lineHeight: 22, paddingHorizontal: LIST_ROW_PADDING, paddingBottom: LIST_ROW_PADDING, marginTop: -4 },
});
