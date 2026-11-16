import * as Device from 'expo-device';
import { Dimensions, Platform } from 'react-native';

import { MIN_RADIUS } from '@/constants/shape';

/**
 * Display corner radii (pt) by iPhone model identifier. iOS doesn't expose the
 * screen's corner radius publicly, so these are the measured values per
 * chassis. On the simulator expo-device reports the simulated model's id.
 */
const IPHONE_CORNERS: Record<string, number> = {
  // X, XS, XS Max, 11 Pro, 11 Pro Max
  'iPhone10,3': 39, 'iPhone10,6': 39, 'iPhone11,2': 39, 'iPhone11,4': 39, 'iPhone11,6': 39, 'iPhone12,3': 39, 'iPhone12,5': 39,
  // XR, 11
  'iPhone11,8': 41.5, 'iPhone12,1': 41.5,
  // 12 mini, 13 mini
  'iPhone13,1': 44, 'iPhone14,4': 44,
  // 12, 12 Pro, 13, 13 Pro, 14, 16e
  'iPhone13,2': 47.33, 'iPhone13,3': 47.33, 'iPhone14,5': 47.33, 'iPhone14,2': 47.33, 'iPhone14,7': 47.33, 'iPhone17,5': 47.33,
  // 12 Pro Max, 13 Pro Max, 14 Plus
  'iPhone13,4': 53.33, 'iPhone14,3': 53.33, 'iPhone14,8': 53.33,
  // 14 Pro, 14 Pro Max, 15 family, 16, 16 Plus
  'iPhone15,2': 55, 'iPhone15,3': 55, 'iPhone15,4': 55, 'iPhone15,5': 55, 'iPhone16,1': 55, 'iPhone16,2': 55, 'iPhone17,3': 55, 'iPhone17,4': 55,
  // 16 Pro, 16 Pro Max, 17 family
  'iPhone17,1': 62, 'iPhone17,2': 62, 'iPhone18,1': 62, 'iPhone18,2': 62, 'iPhone18,3': 62, 'iPhone18,4': 62,
};

/**
 * By screen size (pt, portrait) for when the model id isn't known — the
 * simulator reports only "arm64". Each size maps to one corner family.
 */
const CORNERS_BY_SIZE: Record<string, number> = {
  '375x812': 39, // X, XS, 11 Pro (12/13 mini share the size at 44)
  '414x896': 41.5, // XR, 11, XS Max, 11 Pro Max
  '390x844': 47.33, // 12, 13, 14, 16e
  '428x926': 53.33, // 12/13 Pro Max, 14 Plus
  '393x852': 55, // 14 Pro, 15, 15 Pro, 16
  '430x932': 55, // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  '402x874': 62, // 16 Pro, 17, 17 Pro
  '440x956': 62, // 16 Pro Max, 17 Pro Max
  '420x912': 62, // Air
};

/** Unknown newer iPhones (and Android, which has no API for it) get a typical modern value. */
const FALLBACK_CORNER = 55;

/** The screen's corner radius, or null where corners are square or unknown (web, home-button iPhones). */
export const DEVICE_CORNER_RADIUS: number | null = (() => {
  if (Platform.OS === 'web') return null;
  if (Platform.OS === 'ios') {
    const id = Device.modelId as string | null;
    if (id && id in IPHONE_CORNERS) return IPHONE_CORNERS[id];
    // iPhone SE / 8 and older (home button): square screen corners.
    if (id && /^iPhone(\d+),/.test(id) && Number(id.match(/^iPhone(\d+),/)![1]) < 10) return null;
    if (id === 'iPhone12,8' || id === 'iPhone14,6') return null;
    const { width, height } = Dimensions.get('screen');
    return CORNERS_BY_SIZE[`${Math.min(width, height)}x${Math.max(width, height)}`] ?? FALLBACK_CORNER;
  }
  return FALLBACK_CORNER;
})();

/**
 * Radius for a surface inset `gap` from the screen's rounded corners, so its
 * corners are concentric with the display's: device radius − gap. Unlike
 * `concentric()` this isn't capped at Shape.max — it follows the hardware.
 */
export function deviceConcentric(gap: number, fallback: number) {
  if (DEVICE_CORNER_RADIUS === null) return fallback;
  return Math.max(DEVICE_CORNER_RADIUS - gap, MIN_RADIUS);
}
