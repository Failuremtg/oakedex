const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

/** Main CTA color – primary buttons, links, key actions */
export const primary = '#6a449b';
/** Secondary – use when primary isn't used (accents, highlights) */
export const secondary = '#ffcf1c';
/** Tertiary – supporting UI when needed */
export const tertiary = '#114c5c';

/** @deprecated Use primary instead */
export const brandRed = primary;

/** Dark charcoal background */
export const charcoal = '#2d2d2d';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: primary,
    tabIconDefault: '#ccc',
    tabIconSelected: primary,
  },
  dark: {
    text: '#fff',
    background: charcoal,
    tint: primary,
    tabIconDefault: '#888',
    tabIconSelected: primary,
  },
};
