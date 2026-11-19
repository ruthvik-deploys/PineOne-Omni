import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { useTabLayout } from '@/components/app-tabs';
import { StatusPill } from '@/components/shared/status';
import { PAGE_PADDING } from '@/components/tab-screen';
import { GLOW_HEIGHT, LimeGlow } from '@/components/shared/lime-glow';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { applyTicketDraft, SUPPORT_TICKETS, SUPPORT_TOPICS, SUPPORT_VIDEOS, type SupportTicket, ticketStatusTone } from '@/data/support';
import { useToast } from '@/hooks/use-toast';

import { SupportChatComposer, SupportHeroIcon } from './support-chat-composer';
import { TicketDetailSheet, TicketEditSheet } from './ticket-sheets';
import { Reicon, type ReiconName } from './reicons';
import { VideoThumbnail } from './video-thumbnail';

const HERO_TOPIC_LIMIT = 4;
const CARD_PADDING = 16;

function SectionHeader({ title, onViewAll }: { title: string; onViewAll: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="titleMedium" style={styles.semiBold} accessibilityRole="header">
        {title}
      </Text>
      <Button mode="text" compact onPress={onViewAll} style={styles.textButton}>
        View all
      </Button>
    </View>
  );
}

/**
 * Support landing (web: SupportLandingContent): the "How can we help you
 * today?" hero with the chat composer and topic chips, then the three latest
 * support tickets and tutorial videos. Asking or picking a topic opens the
 * chat; tickets open the detail panel. The web's composer slide-down
 * animation into the chat page is replaced by the stack's push transition.
 */
export function SupportLanding() {
  return APP_PAGE_LAYOUT ? <AppSupportLanding /> : <ClassicSupportLanding />;
}

/** Shortcuts under the composer (Figma 7228:157062): each starts the chat with its words. */
const SUGGESTIONS = ['Get payout report', 'Request Paper roll', 'VAS Activation'];

/** The design's six topics (Figma 7228:190532), with its labels and Reicon marks. */
const LANDING_TOPICS: { slug: string; label: string; icon: ReiconName }[] = [
  { slug: 'device-hardware', label: 'Device & hardware', icon: 'device-hardware' },
  { slug: 'payments', label: 'Payments', icon: 'payments' },
  { slug: 'upi', label: 'UPI', icon: 'upi' },
  { slug: 'settlements', label: 'Settlement', icon: 'settlements' },
  { slug: 'reports', label: 'Reports', icon: 'reports' },
  { slug: 'account-access', label: 'Account & access', icon: 'account-access' },
];

/** Figma's rounded-2xl: cards on this page use the design's 18dp, not the app's 12dp cap. */
const CARD_RADIUS = 18;

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

/**
 * Support as the app pages set it (APP_PAGE_LAYOUT, Figma 7228:156447, rechecked against 7249:196955): a
 * lime glow behind the mark and "Good morning, how can we help?", the
 * composer, a row of suggestions, then the latest tickets, all topics and
 * tutorial videos — each list a stack of white cards 8dp apart under its
 * title and View all.
 */
function AppSupportLanding() {
  const theme = useTheme();
  const toast = useToast();
  const { headerHeight } = useTabLayout();
  const [prompt, setPrompt] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>(SUPPORT_TICKETS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const openChat = (text: string) => router.push(text ? { pathname: '/support/chat', params: { prompt: text } } : '/support/chat');

  return (
    <View style={styles.appContainer}>
      <View style={styles.appHero}>
        {/* The lime wash runs to the screen's edges and up under the header. */}
        {/* Figma 7228:157072: a 412dp-tall wash from the top of the screen, centred 63dp down, 283 × 324 radii. */}
        <LimeGlow style={[styles.glow, { top: -(headerHeight + PAGE_PADDING) }]} />
        <View style={styles.appGreeting}>
          <SupportHeroIcon size={40} />
          <Text style={[styles.appGreetingText, { color: theme.colors.onSurface }]} accessibilityRole="header">
            {greeting()}, how can we help?
          </Text>
        </View>
        <SupportChatComposer
          value={prompt}
          onChange={setPrompt}
          placeholder="Enter your issues here"
          onSubmit={() => {
            const text = prompt.trim();
            setPrompt('');
            openChat(text);
          }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroller} contentContainerStyle={styles.suggestions}>
          {SUGGESTIONS.map((suggestion) => (
            <TouchableRipple
              key={suggestion}
              onPress={() => openChat(suggestion)}
              borderless
              accessibilityRole="button"
              style={[
                styles.suggestion,
                theme.dark
                  ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }
                  : { backgroundColor: 'rgba(255, 255, 255, 0.72)', borderColor: '#f4f4f0' },
              ]}>
              <Text style={[styles.suggestionLabel, { color: theme.colors.onSurface }]}>{suggestion}</Text>
            </TouchableRipple>
          ))}
        </ScrollView>
      </View>

      <View style={styles.appSection}>
        <AppSectionHeader title="Support tickets" onViewAll={() => router.push('/support/tickets')} />
        {tickets.slice(0, 3).map((ticket) => (
          <TicketCard
            key={ticket.id}
            status={ticket.status}
            title={ticket.issue}
            // Figma 7249:196999: "29 Apr, 8:42 pm", the day and time without the year.
            line={ticket.createdAt.replace(/ \d{2,4},/, ',')}
            onPress={() => {
              setSelectedId(ticket.id);
              setDetailOpen(true);
            }}
          />
        ))}
      </View>

      <View style={[styles.appSection, styles.topicsSection]}>
        <AppSectionHeader title="All topics" onViewAll={() => router.push('/support/faqs')} />
        {LANDING_TOPICS.map((topic) => (
          <TouchableRipple
            key={topic.slug}
            onPress={() => router.push({ pathname: '/support/chat', params: { topic: topic.slug } })}
            borderless
            accessibilityRole="button"
            style={[styles.appCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.topic}>
              <View style={styles.topicIcon}>
                <Reicon name={topic.icon} color={theme.colors.primary} />
              </View>
              <Text style={[styles.appMedium, styles.flex, { color: theme.colors.onSurface }]}>{topic.label}</Text>
              <Reicon name="chevron" color={theme.colors.onSurface} />
            </View>
          </TouchableRipple>
        ))}
      </View>

      <View style={styles.appSection}>
        <AppSectionHeader title="Tutorial video" onViewAll={() => router.push('/support/videos')} />
        {SUPPORT_VIDEOS.filter((video) => video.image).slice(0, 3).map((video) => (
          <TouchableRipple
            key={video.title}
            onPress={() => router.push('/support/videos')}
            borderless
            accessibilityRole="link"
            accessibilityLabel={video.title}
            style={[styles.appCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.videoCard}>
              <VideoThumbnail radius={8} image={video.image} aspectRatio={320 / 187} scrim />
              <Text numberOfLines={2} style={[styles.videoTitle, { color: theme.colors.onSurface }]}>
                {video.title}
              </Text>
            </View>
          </TouchableRipple>
        ))}
      </View>

      <TicketDetailSheet
        visible={detailOpen}
        onDismiss={() => setDetailOpen(false)}
        ticket={selected}
        onEdit={() => {
          setDetailOpen(false);
          setEditOpen(true);
        }}
      />
      <TicketEditSheet
        visible={editOpen}
        onDismiss={() => setEditOpen(false)}
        ticket={selected}
        onSave={(draft) => {
          setTickets((current) => current.map((ticket) => (ticket.id === selectedId ? applyTicketDraft(ticket, draft) : ticket)));
          toast('Ticket details updated');
        }}
      />
    </View>
  );
}


/** A ticket's status as the design's filled tag (Figma 7228:190639): amber while open, blue in progress, green resolved. */
function TicketTag({ status }: { status: SupportTicket['status'] }) {
  const theme = useTheme();
  const tone = status === 'Resolved' ? TAG_TONES.success : status === 'In progress' ? TAG_TONES.info : TAG_TONES.warning;
  const [background, foreground] = theme.dark ? tone.dark : tone.light;
  return (
    <View style={[styles.tag, { backgroundColor: background }]}>
      <Text style={[styles.tagLabel, { color: foreground }]}>{status}</Text>
    </View>
  );
}

const TAG_TONES = {
  warning: { light: ['#fee685', '#973c00'], dark: ['rgba(245, 158, 11, 0.25)', '#fcd34d'] },
  info: { light: ['#dbeafe', '#1e3a8a'], dark: ['rgba(59, 130, 246, 0.25)', '#93c5fd'] },
  success: { light: ['#d1fae5', '#065f46'], dark: ['rgba(16, 185, 129, 0.25)', '#6ee7b7'] },
} as const;

/** A support ticket as the landing lists it (Figma 7228:156447): its status tag and caret, the issue, then one muted line. */
export function TicketCard({ status, title, line, onPress }: { status: SupportTicket['status']; title: string; line: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={!onPress}
      borderless
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}, ${status}`}
      style={[styles.appCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.ticket}>
        <View style={styles.ticketTop}>
          <TicketTag status={status} />
          {onPress ? <Reicon name="chevron" color={theme.colors.onSurface} /> : null}
        </View>
        <View style={styles.ticketText}>
          <Text numberOfLines={1} style={[styles.appMedium, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
          <Text style={[styles.appSmall, { color: theme.colors.onSurfaceVariant }]}>{line}</Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

/** A list's title with View all at its end (Figma 7228:190244). */
/** A section's heading on an app page, with View all when the section has more than it shows. */
export function AppSectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.appSectionHeader}>
      <Text style={[styles.appSectionTitle, { color: theme.colors.onSurface }]} accessibilityRole="header">
        {title}
      </Text>
      {onViewAll ? (
        <TouchableRipple onPress={onViewAll} borderless accessibilityRole="button" accessibilityLabel={`View all ${title.toLowerCase()}`} style={styles.viewAll}>
          <View style={styles.viewAllContent}>
            <Text style={[styles.viewAllLabel, { color: theme.colors.primary }]}>View all</Text>
            <Icon source="caret-right" size={12} color={theme.colors.primary} />
          </View>
        </TouchableRipple>
      ) : null}
    </View>
  );
}

function ClassicSupportLanding() {
  const theme = useTheme();
  const toast = useToast();
  const [prompt, setPrompt] = useState('');
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>(SUPPORT_TICKETS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const topics = showAllTopics ? SUPPORT_TOPICS : SUPPORT_TOPICS.slice(0, HERO_TOPIC_LIMIT);
  const muted = { color: theme.colors.onSurfaceVariant };

  const ask = () => {
    const text = prompt.trim();
    setPrompt('');
    router.push(text ? { pathname: '/support/chat', params: { prompt: text } } : '/support/chat');
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SupportHeroIcon size={56} />
        <Text variant="headlineSmall" style={[styles.semiBold, styles.center]}>
          How can we help you today?
        </Text>
        <Text variant="bodyMedium" style={[styles.center, muted]}>
          Ask a question or describe your issue — our assistant will take it from there.
        </Text>
        <View style={styles.composer}>
          <SupportChatComposer value={prompt} onChange={setPrompt} onSubmit={ask} />
        </View>
        <View style={styles.chips}>
          {topics.map((topic) => (
            <Chip
              key={topic.slug}
              mode="outlined"
              icon={topic.icon}
              compact
              onPress={() => router.push({ pathname: '/support/chat', params: { topic: topic.slug } })}
              style={[styles.chip, { backgroundColor: theme.colors.surface }]}
              textStyle={styles.chipText}>
              {topic.label}
            </Chip>
          ))}
          {!showAllTopics && SUPPORT_TOPICS.length > HERO_TOPIC_LIMIT ? (
            <Chip mode="outlined" compact onPress={() => setShowAllTopics(true)} style={[styles.chip, { backgroundColor: theme.colors.surface }]} textStyle={styles.chipText}>
              +{SUPPORT_TOPICS.length - HERO_TOPIC_LIMIT} more
            </Chip>
          ) : null}
          <Button mode="text" compact onPress={() => router.push('/support/faqs')} labelStyle={styles.chipText} style={styles.textButton}>
            View all FAQs
          </Button>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Support tickets" onViewAll={() => router.push('/support/tickets')} />
        {tickets.slice(0, 3).map((ticket) => (
          <Card
            key={ticket.id}
            mode="contained"
            onPress={() => {
              setSelectedId(ticket.id);
              setDetailOpen(true);
            }}
            accessibilityLabel={`${ticket.issue}, ${ticket.status}`}
            style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardBody}>
              <StatusPill label={ticket.status} tone={ticketStatusTone(ticket.status)} />
              <Text variant="bodyMedium" numberOfLines={2} style={styles.medium}>
                {ticket.issue}
              </Text>
              <Text variant="bodySmall" style={muted}>
                {ticket.createdAt}
              </Text>
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Tutorial videos" onViewAll={() => router.push('/support/videos')} />
        {SUPPORT_VIDEOS.slice(0, 3).map((video) => (
          <TouchableRipple
            key={video.title}
            onPress={() => router.push('/support/videos')}
            borderless
            accessibilityRole="link"
            accessibilityLabel={video.title}
            style={styles.video}>
            <View style={styles.videoContent}>
              <VideoThumbnail />
              <Text variant="bodyMedium" numberOfLines={2} style={styles.medium}>
                {video.title}
              </Text>
            </View>
          </TouchableRipple>
        ))}
      </View>

      <TicketDetailSheet
        visible={detailOpen}
        onDismiss={() => setDetailOpen(false)}
        ticket={selected}
        onEdit={() => {
          setDetailOpen(false);
          setEditOpen(true);
        }}
      />
      <TicketEditSheet
        visible={editOpen}
        onDismiss={() => setEditOpen(false)}
        ticket={selected}
        onSave={(draft) => {
          setTickets((current) => current.map((ticket) => (ticket.id === selectedId ? applyTicketDraft(ticket, draft) : ticket)));
          toast('Ticket details updated');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { gap: 24 },
  // Figma 7228:157050: the suggestions sit well clear of the lists below.
  appHero: { gap: 16, paddingTop: 76, paddingBottom: 40 },
  tag: { alignSelf: 'flex-start', height: 20, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 10, overflow: 'hidden' },
  tagLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  // Bleeds past the page's 8dp padding and up under the header.
  glow: { position: 'absolute', left: -PAGE_PADDING, right: -PAGE_PADDING, height: GLOW_HEIGHT },
  appGreeting: { alignItems: 'center', gap: 16, paddingVertical: 8 },
  appGreetingText: { width: 208, textAlign: 'center', fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 20 },
  suggestionScroller: { marginHorizontal: -8 },
  suggestions: { gap: 8, paddingHorizontal: 8 },
  suggestion: { height: 32, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 16, borderWidth: 1 },
  suggestionLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  appSection: { gap: 8 },
  appSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 24 },
  appSectionTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 24 },
  viewAll: { borderRadius: Shape.small, paddingHorizontal: 8 },
  viewAllContent: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24 },
  viewAllLabel: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  appCard: { borderRadius: CARD_RADIUS },
  // Figma: 20dp from the last ticket to All topics, 24dp elsewhere.
  topicsSection: { marginTop: -4 },
  ticket: { padding: 12, gap: 12 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketText: { gap: 8 },
  appMedium: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  appSmall: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingHorizontal: 12 },
  topicIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  videoCard: { padding: 12, gap: 12 },
  videoTitle: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24 },
  container: { gap: 32 },
  semiBold: { fontFamily: Fonts.semiBold },
  medium: { fontFamily: Fonts.medium },
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: 8, paddingTop: 24 },
  composer: { alignSelf: 'stretch', marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 },
  // Standalone page-level chips and links.
  chip: { borderRadius: Shape.small },
  chipText: { fontSize: 12, fontFamily: Fonts.medium },
  textButton: { borderRadius: Shape.small },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  card: { borderRadius: Shape.max },
  cardBody: { padding: CARD_PADDING, gap: 8 },
  video: { borderRadius: Shape.max },
  videoContent: { gap: 8 },
});
