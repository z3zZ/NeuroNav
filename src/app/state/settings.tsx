import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LEGACY_KEYS, STORAGE_KEYS, asBoolean, asNumber, isObject, oneOf, readJSON, writeJSON } from '../lib/storage';

export interface Settings {
  version: 2;
  fontSize: 'normal' | 'large' | 'xlarge';
  spacing: 'normal' | 'relaxed' | 'loose';
  font: 'default' | 'dyslexia' | 'mono';
  contrast: 'system' | 'standard' | 'more' | 'high';
  motion: 'system' | 'reduced' | 'full';
  theme: 'system' | 'light' | 'dark' | 'ocean' | 'ink-light' | 'ink-dark';
  background: 'auto' | 'daylight' | 'nightfall' | 'original';
  simplified: boolean;
  imagery: boolean;
  sound: boolean;
  notifications: boolean;
  timerDisplay: 'calm' | 'clock' | 'minutes';
  breakMin: number;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 2,
  fontSize: 'normal',
  spacing: 'normal',
  font: 'default',
  contrast: 'system',
  motion: 'system',
  theme: 'system',
  background: 'auto',
  simplified: false,
  imagery: true,
  // Silence by default; the learner opts in.
  sound: false,
  notifications: false,
  timerDisplay: 'calm',
  breakMin: 5,
};

export function normaliseSettings(raw: unknown): Settings | null {
  if (!isObject(raw)) return null;
  const d = DEFAULT_SETTINGS;
  return {
    version: 2,
    fontSize: oneOf(raw.fontSize, ['normal', 'large', 'xlarge'] as const, d.fontSize),
    spacing: oneOf(raw.spacing, ['normal', 'relaxed', 'loose'] as const, d.spacing),
    font: oneOf(raw.font, ['default', 'dyslexia', 'mono'] as const, d.font),
    contrast: oneOf(raw.contrast, ['system', 'standard', 'more', 'high'] as const, d.contrast),
    motion: oneOf(raw.motion, ['system', 'reduced', 'full'] as const, d.motion),
    theme: oneOf(raw.theme, ['system', 'light', 'dark', 'ocean', 'ink-light', 'ink-dark'] as const, d.theme),
    background: oneOf(raw.background, ['auto', 'daylight', 'nightfall', 'original'] as const, d.background),
    simplified: asBoolean(raw.simplified, d.simplified),
    imagery: asBoolean(raw.imagery, d.imagery),
    sound: asBoolean(raw.sound, d.sound),
    notifications: asBoolean(raw.notifications, d.notifications),
    timerDisplay: oneOf(raw.timerDisplay, ['calm', 'clock', 'minutes'] as const, d.timerDisplay),
    breakMin: Math.round(asNumber(raw.breakMin, d.breakMin, 1, 60)),
  };
}

/** Maps the original accessibility panel's settings onto the new shape. */
function migrateLegacySettings(): Settings | null {
  const legacy = readJSON(LEGACY_KEYS.accessibility, (raw) => (isObject(raw) ? raw : null));
  if (legacy.status !== 'ok') return null;
  const l = legacy.value;
  return normaliseSettings({
    ...DEFAULT_SETTINGS,
    fontSize: l.fontSize,
    spacing: l.spacing,
    font: l.font,
    contrast: l.contrast === 'high' ? 'high' : 'system',
    motion: l.reducedMotion === true ? 'reduced' : 'system',
  });
}

export function loadSettings(): Settings {
  const current = readJSON(STORAGE_KEYS.settings, normaliseSettings);
  if (current.status === 'ok') return current.value;
  return migrateLegacySettings() ?? { ...DEFAULT_SETTINGS };
}

function useMediaQuery(query: string): boolean {
  const get = () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export interface EffectiveSettings {
  highContrast: boolean;
  reducedMotion: boolean;
  dark: boolean;
  showImagery: boolean;
}

interface SettingsContextValue {
  settings: Settings;
  effective: EffectiveSettings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setAppearance: (theme: Settings['theme'], contrast: Settings['contrast']) => void;
  resetSettings: () => void;
  saved: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [saved, setSaved] = useState(true);
  const prefersContrast = useMediaQuery('(prefers-contrast: more)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const effective = useMemo<EffectiveSettings>(() => {
    const highContrast =
      settings.theme.startsWith('ink-') || settings.contrast === 'high' || (settings.contrast === 'system' && prefersContrast);
    return {
      highContrast,
      reducedMotion: settings.motion === 'reduced' || (settings.motion === 'system' && prefersReducedMotion),
      dark: settings.theme === 'dark' || settings.theme === 'ink-dark' || (settings.theme === 'system' && prefersDark),
      showImagery: settings.imagery && !settings.simplified && !highContrast,
    };
  }, [settings, prefersContrast, prefersReducedMotion, prefersDark]);

  useEffect(() => {
    setSaved(writeJSON(STORAGE_KEYS.settings, settings));
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement.dataset;
    root.theme = effective.dark ? 'dark' : 'light';
    root.contrast = effective.highContrast ? 'high' : settings.contrast === 'more' ? 'more' : 'standard';
    root.palette = settings.theme.startsWith('ink-') ? 'mono' : settings.theme === 'ocean' ? 'ocean' : 'forest';
    root.motion = effective.reducedMotion ? 'reduced' : 'full';
    root.imagery = effective.showImagery ? 'on' : 'off';
    root.simplified = settings.simplified ? 'on' : 'off';
    root.font = settings.font;
    root.size = settings.fontSize;
    root.spacing = settings.spacing;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon)
      icon.href = `${import.meta.env.BASE_URL}${
        settings.theme.startsWith('ink-') ? `assets/brand/neuronav-mark-${effective.dark ? 'white' : 'black'}.svg` : 'favicon.svg'
      }`;
  }, [effective, settings]);

  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setAppearance = useCallback((theme: Settings['theme'], contrast: Settings['contrast']) => {
    setSettings((prev) => ({ ...prev, theme, contrast }));
  }, []);

  const value = useMemo(
    () => ({ settings, effective, setSetting, setAppearance, resetSettings: () => setSettings({ ...DEFAULT_SETTINGS }), saved }),
    [settings, effective, setSetting, setAppearance, saved],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
