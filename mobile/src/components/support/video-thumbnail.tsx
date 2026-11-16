import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useSvgId } from '@/components/shared/hatch';
import { Shape } from '@/constants/shape';

/** 16:9 video placeholder with a play button (web: bg-gradient-to-br from-muted to-muted/60 + PlayCircle). */
export function VideoThumbnail({
  radius = Shape.max,
  image,
  aspectRatio = 16 / 9,
  scrim = false,
}: {
  radius?: number;
  /** The video's cover; a soft play button sits on it (Figma 7228:190803). */
  image?: number;
  aspectRatio?: number;
  /** Figma 7228:190802: a 12% black wash over the cover. */
  scrim?: boolean;
}) {
  const theme = useTheme();
  const id = useSvgId('video-thumb');
  if (image) {
    return (
      <View style={[styles.thumb, styles.cover, { borderRadius: radius, aspectRatio }]}>
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
        {scrim ? <View style={[StyleSheet.absoluteFill, styles.scrim]} /> : null}
        <View style={styles.play}>
          <Icon source="play-fill" size={20} color="#ffffff" />
        </View>
      </View>
    );
  }
  const color = theme.colors.surfaceVariant;
  return (
    <View style={[styles.thumb, { borderRadius: radius, aspectRatio }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <Icon source="play-circle-fill" size={40} color={theme.colors.onSurface} />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cover: { backgroundColor: '#dce8c6' },
  scrim: { backgroundColor: 'rgba(0, 0, 0, 0.12)' },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 0, 0, 0.3)', alignItems: 'center', justifyContent: 'center' },
});
