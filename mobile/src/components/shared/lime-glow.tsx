import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useSvgId } from './hatch';

/** Figma 7228:157072: a 412dp-tall wash from the top of the screen, centred 63dp down, 283 × 324 radii. */
export const GLOW_HEIGHT = 412;

/**
 * The lime wash behind Support's greeting (and the login screens): lime-200
 * fading out from just under the top edge, darker and fainter on dark. Place
 * it absolutely; it never takes touches.
 */
export function LimeGlow({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const id = useSvgId('lime-glow');
  const color = theme.dark ? '#365314' : '#d9f99d';
  return (
    <View pointerEvents="none" style={[styles.glow, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy={`${(63 / GLOW_HEIGHT) * 100}%`} rx={`${(283 / 360) * 100}%`} ry={`${(324 / GLOW_HEIGHT) * 100}%`}>
            <Stop offset="0" stopColor={color} stopOpacity={theme.dark ? 0.6 : 1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: GLOW_HEIGHT },
});
