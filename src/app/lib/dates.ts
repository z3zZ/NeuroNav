const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toISODate(parseISODate(value)) === value;
}

/** Parses YYYY-MM-DD as a local date (new Date('YYYY-MM-DD') would be UTC). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysUntil(iso: string): number | null {
  if (!isISODate(iso)) return null;
  const ms = parseISODate(iso).getTime() - parseISODate(todayISO()).getTime();
  return Math.round(ms / 86_400_000);
}

const shortFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const longFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const compactFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export function formatShortDate(iso: string): string {
  return isISODate(iso) ? shortFormat.format(parseISODate(iso)) : '';
}

export function formatCompactDate(iso: string): string {
  return isISODate(iso) ? compactFormat.format(parseISODate(iso)) : '';
}

export function formatLongDate(d: Date): string {
  return longFormat.format(d);
}

export function relativeDay(iso: string): string {
  const diff = daysUntil(iso);
  if (diff === null) return '';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatShortDate(iso);
}

/** Neutral description of an exam date. Never phrased as a warning. */
export function describeExam(iso: string): string {
  const diff = daysUntil(iso);
  if (diff === null) return 'No exam date set';
  if (diff < 0) return `Exam was ${formatCompactDate(iso)}`;
  if (diff === 0) return 'Exam today';
  if (diff === 1) return 'Exam tomorrow';
  return `Exam ${formatCompactDate(iso)} · ${diff} days`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
