import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { SearchField } from '@/components/search-field';
import { DetailScreen } from '@/components/shared/detail-screen';
import { OutlineTag } from '@/components/shared/status';
import { APP_PAGE_LAYOUT } from '@/constants/experiments';
import { concentric, Shape } from '@/constants/shape';
import { Fonts } from '@/constants/theme';
import { SUPPORT_VIDEOS } from '@/data/support';

import { VideoThumbnail } from './video-thumbnail';

/**
 * All videos (web: SupportVideosContent): search by title, then every
 * tutorial with its thumbnail, title, summary, level and duration. As on web,
 * the videos don't play.
 */
export function SupportVideos() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const videos = SUPPORT_VIDEOS.filter((video) => !query || video.title.toLowerCase().includes(query));
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    <DetailScreen title="All videos" fallbackHref="/support">
      <SearchField value={search} onChangeText={setSearch} placeholder={APP_PAGE_LAYOUT ? 'Search topic' : 'Search videos'} radius={Shape.small} />
      {videos.length === 0 ? (
        <Text variant="bodyMedium" style={muted}>
          No videos match your search.
        </Text>
      ) : APP_PAGE_LAYOUT ? (
        // Figma 7249:196365: each video a white card, the thumbnail inset 8dp, the title under it.
        videos.map((video) => (
          <View key={video.title} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <VideoThumbnail radius={concentric(Shape.max, 8)} image={video.image} />
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{video.title}</Text>
          </View>
        ))
      ) : (
        videos.map((video) => (
          <View key={video.title} style={styles.video}>
            <VideoThumbnail />
            <Text variant="bodyMedium" style={styles.medium}>
              {video.title}
            </Text>
            <Text variant="bodySmall" numberOfLines={2} style={muted}>
              {video.summary}
            </Text>
            <View style={styles.meta}>
              <OutlineTag label={video.level} />
              <View style={styles.duration}>
                <Icon source="clock" size={14} color={theme.colors.onSurfaceVariant} />
                <Text variant="labelSmall" style={muted}>
                  {video.duration}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Shape.max, padding: 8, gap: 12 },
  cardTitle: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24, paddingHorizontal: 4, paddingBottom: 4 },
  medium: { fontFamily: Fonts.medium },
  video: { gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
