export const DEFAULT_THEME_ID = 'sky';
export const DEFAULT_CUSTOM_THEME_COLOR = '#0ea5e9';

export const THEME_OPTIONS = [
  { id: 'sky', label: 'Sky', color: 'oklch(60% 0.18 210)' },
  { id: 'violet', label: 'Violet', color: 'oklch(55% 0.25 280)' },
  { id: 'rose', label: 'Rose', color: 'oklch(55% 0.23 355)' },
  { id: 'amber', label: 'Amber', color: 'oklch(68% 0.18 75)' },
  { id: 'teal', label: 'Teal', color: 'oklch(55% 0.17 188)' },
];

export const THEME_IDS = THEME_OPTIONS.map((theme) => theme.id);
export const ALL_THEME_IDS = [...THEME_IDS, 'custom'];

export function isKnownTheme(themeId) {
  return ALL_THEME_IDS.includes(String(themeId || '').trim());
}

export function isPresetTheme(themeId) {
  return THEME_IDS.includes(String(themeId || '').trim());
}

export function normalizeThemeId(themeId) {
  const raw = String(themeId || '').trim();
  return isKnownTheme(raw) ? raw : DEFAULT_THEME_ID;
}

export function normalizeCustomThemeColor(color) {
  const raw = String(color || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : DEFAULT_CUSTOM_THEME_COLOR;
}

export function getThemeMeta(themeId) {
  const normalized = normalizeThemeId(themeId);
  if (normalized === 'custom') {
    return { id: 'custom', label: 'Custom', color: DEFAULT_CUSTOM_THEME_COLOR };
  }
  return THEME_OPTIONS.find((theme) => theme.id === normalized) || THEME_OPTIONS[0];
}
