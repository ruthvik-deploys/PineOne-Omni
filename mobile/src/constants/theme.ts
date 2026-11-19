/**
 * Inter Display — the same family the web app uses (public/fonts/inter-display,
 * wired in app/layout.tsx as --font-inter-display). The .ttf files in
 * assets/fonts are lossless conversions of the web app's .woff2 files, since
 * native (Android/Expo Go) font loading doesn't support woff2. Loaded via
 * expo-font in src/app/_layout.tsx (and the Storybook root), and wired into the
 * Material 3 typescale in paper-theme.ts.
 */
/**
 * Inter Display's open digits (OpenType ss01: open 4, 6, 9). Every number in
 * the app uses them; NUMERIC adds tabular figures for amounts that line up.
 */
export const OPEN_DIGITS: ('stylistic-one')[] = ['stylistic-one'];
export const NUMERIC: ('tabular-nums' | 'stylistic-one')[] = ['tabular-nums', 'stylistic-one'];

export const Fonts = {
  regular: 'InterDisplay-Regular',
  medium: 'InterDisplay-Medium',
  semiBold: 'InterDisplay-SemiBold',
  bold: 'InterDisplay-Bold',
  mono: 'monospace',
} as const;

/** Pass to expo-font's `useFonts` — keys are the fontFamily names used above. */
export const FONT_ASSETS = {
  [Fonts.regular]: require('../../assets/fonts/InterDisplay-Regular.ttf'),
  [Fonts.medium]: require('../../assets/fonts/InterDisplay-Medium.ttf'),
  [Fonts.semiBold]: require('../../assets/fonts/InterDisplay-SemiBold.ttf'),
  [Fonts.bold]: require('../../assets/fonts/InterDisplay-Bold.ttf'),
};
