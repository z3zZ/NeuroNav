/**
 * Defensive localStorage access. Storage can be unavailable (private windows,
 * blocked site data) or full, so every call is guarded and reports failure
 * instead of throwing.
 */

export const STORAGE_KEYS = {
  data: 'neuronav_data_v2',
  settings: 'neuronav_settings_v2',
  timer: 'neuronav_timer_v2',
  drafts: 'neuronav_drafts_v2',
} as const;

/** Keys written by the original app. Read for migration; never deleted automatically. */
export const LEGACY_KEYS = {
  state: 'neuronav_state',
  plan: 'neuronav_plan',
  accessibility: 'neuronav_accessibility',
  reflections: 'neuronav_reflections',
  onboardingStep: 'neuronav_onboarding_step',
  onboardingSubjects: 'neuronav_onboarding_subjects',
  onboardingEnergy: 'neuronav_onboarding_energy',
  onboardingSession: 'neuronav_onboarding_session',
  onboardingTime: 'neuronav_onboarding_time',
  // Added in v2 so a name typed during setup also survives a refresh.
  onboardingName: 'neuronav_onboarding_name',
} as const;

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to recover; the key simply stays.
  }
}

export type ReadResult<T> =
  | { status: 'missing' }
  | { status: 'ok'; value: T }
  | { status: 'corrupt'; backupKey: string | null };

/**
 * Reads and validates JSON. Malformed data is copied to a timestamped backup
 * key before the caller falls back, so nothing is silently lost.
 */
export function readJSON<T>(key: string, parse: (raw: unknown) => T | null): ReadResult<T> {
  const raw = safeGet(key);
  if (raw === null) return { status: 'missing' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const value = parsed === undefined ? null : parse(parsed);
  if (value !== null) return { status: 'ok', value };
  const backupKey = `${key}_unreadable_${Date.now()}`;
  return { status: 'corrupt', backupKey: safeSet(backupKey, raw) ? backupKey : null };
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    return safeSet(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

// Small coercion helpers shared by the normalisers.
export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const asString = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

export const asNumber = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export const asBoolean = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

export function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

export const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
