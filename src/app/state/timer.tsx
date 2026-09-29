import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { recordSession, setLastActive } from '../lib/actions';
import { uid } from '../lib/dates';
import { STORAGE_KEYS, asBoolean, asNumber, asString, isObject, oneOf, readJSON, writeJSON } from '../lib/storage';
import { useData } from './data';
import { useFeedback } from './feedback';
import { useSettings } from './settings';

/**
 * Focus timer. Elapsed time is always derived from timestamps, never from
 * counting ticks, so background tabs and refreshes do not drift.
 */

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';
export type TimerPhase = 'focus' | 'break';

export interface TimerContextInfo {
  taskId: string | null;
  subjectId: string | null;
  topicId: string | null;
  label: string;
}

export interface PendingReview {
  sessionId: string | null;
  taskId: string | null;
  label: string;
  focusedMin: number;
}

export interface TimerData {
  version: 2;
  status: TimerStatus;
  phase: TimerPhase;
  context: TimerContextInfo | null;
  plannedMs: number;
  /** Elapsed in the current phase before the current run started. */
  accumulatedMs: number;
  runStartedAt: number | null;
  /** Focus time from earlier blocks in this session. */
  focusBankMs: number;
  focusBlockMs: number;
  sessionStartedAt: number | null;
  lastSeenAt: number;
  interrupted: boolean;
  pendingReview: PendingReview | null;
}

const IDLE: TimerData = {
  version: 2,
  status: 'idle',
  phase: 'focus',
  context: null,
  plannedMs: 25 * 60_000,
  accumulatedMs: 0,
  runStartedAt: null,
  focusBankMs: 0,
  focusBlockMs: 25 * 60_000,
  sessionStartedAt: null,
  lastSeenAt: Date.now(),
  interrupted: false,
  pendingReview: null,
};

const idOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);

function normaliseTimer(raw: unknown): TimerData | null {
  if (!isObject(raw) || raw.version !== 2) return null;
  const ctx = isObject(raw.context) ? raw.context : null;
  const review = isObject(raw.pendingReview) ? raw.pendingReview : null;
  return {
    version: 2,
    status: oneOf(raw.status, ['idle', 'running', 'paused', 'finished'] as const, 'idle'),
    phase: oneOf(raw.phase, ['focus', 'break'] as const, 'focus'),
    context: ctx
      ? { taskId: idOrNull(ctx.taskId), subjectId: idOrNull(ctx.subjectId), topicId: idOrNull(ctx.topicId), label: asString(ctx.label, 'Focus session') }
      : null,
    plannedMs: asNumber(raw.plannedMs, IDLE.plannedMs, 60_000, 600 * 60_000),
    accumulatedMs: asNumber(raw.accumulatedMs, 0, 0),
    runStartedAt: typeof raw.runStartedAt === 'number' ? raw.runStartedAt : null,
    focusBankMs: asNumber(raw.focusBankMs, 0, 0),
    focusBlockMs: asNumber(raw.focusBlockMs, IDLE.focusBlockMs, 60_000),
    sessionStartedAt: typeof raw.sessionStartedAt === 'number' ? raw.sessionStartedAt : null,
    lastSeenAt: asNumber(raw.lastSeenAt, Date.now()),
    interrupted: asBoolean(raw.interrupted, false),
    pendingReview: review
      ? {
          sessionId: idOrNull(review.sessionId),
          taskId: idOrNull(review.taskId),
          label: asString(review.label),
          focusedMin: asNumber(review.focusedMin, 0, 0),
        }
      : null,
  };
}

/** A session that was running when the page closed comes back paused, with a choice. */
function loadTimer(): TimerData {
  const result = readJSON(STORAGE_KEYS.timer, normaliseTimer);
  if (result.status !== 'ok') return { ...IDLE, lastSeenAt: Date.now() };
  const t = result.value;
  if (t.status === 'running' && t.runStartedAt !== null) {
    const stoppedAt = Math.min(Date.now(), Math.max(t.lastSeenAt, t.runStartedAt));
    return {
      ...t,
      status: 'paused',
      accumulatedMs: Math.min(t.plannedMs, t.accumulatedMs + (stoppedAt - t.runStartedAt)),
      runStartedAt: null,
      interrupted: true,
    };
  }
  return t;
}

export function elapsedMs(t: TimerData, now = Date.now()): number {
  const running = t.status === 'running' && t.runStartedAt !== null ? now - t.runStartedAt : 0;
  return Math.min(t.plannedMs, t.accumulatedMs + running);
}

export function focusedMs(t: TimerData, now = Date.now()): number {
  return t.focusBankMs + (t.phase === 'focus' ? elapsedMs(t, now) : 0);
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.3);
    });
    window.setTimeout(() => ctx.close(), 2500);
  } catch {
    // Sound is optional.
  }
}

interface TimerActions {
  timer: TimerData;
  start: (context: TimerContextInfo, minutes: number) => void;
  pause: () => void;
  resume: () => void;
  extend: (minutes: number) => void;
  startBreak: (minutes: number) => void;
  startAnotherBlock: () => void;
  finish: () => PendingReview | null;
  discard: () => void;
  clearReview: () => void;
}

const TimerContext = createContext<TimerActions | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<TimerData>(loadTimer);
  const timerRef = useRef(timer);
  const { update } = useData();
  const { announce } = useFeedback();
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const commit = useCallback((next: TimerData) => {
    timerRef.current = next;
    setTimer(next);
    writeJSON(STORAGE_KEYS.timer, next);
  }, []);

  const change = useCallback(
    (recipe: (t: TimerData) => TimerData) => commit({ ...recipe(timerRef.current), lastSeenAt: Date.now() }),
    [commit],
  );

  // Persist a recovered (interrupted) session straight away so a second
  // refresh doesn't recompute it from stale timestamps.
  useEffect(() => {
    if (timerRef.current.interrupted) writeJSON(STORAGE_KEYS.timer, timerRef.current);
  }, []);

  // Heartbeat while running so an interrupted session knows when it stopped.
  useEffect(() => {
    if (timer.status !== 'running') return;
    const beat = () => writeJSON(STORAGE_KEYS.timer, { ...timerRef.current, lastSeenAt: Date.now() });
    const id = window.setInterval(beat, 10_000);
    window.addEventListener('pagehide', beat);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', beat);
    };
  }, [timer.status]);

  const reachEnd = useCallback(() => {
    const t = timerRef.current;
    if (t.status !== 'running') return;
    commit({ ...t, status: 'finished', accumulatedMs: t.plannedMs, runStartedAt: null, lastSeenAt: Date.now() });
    const message =
      t.phase === 'focus'
        ? 'Focus time reached. You can continue, take a break or finish.'
        : 'Break finished. Start another block when you are ready.';
    announce(message);
    const s = settingsRef.current;
    if (s.sound) playChime();
    if (s.notifications && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        new Notification('NeuroNav', { body: message, silent: !s.sound });
      } catch {
        // Some browsers only allow notifications from a service worker.
      }
    }
  }, [announce, commit]);

  // Schedule the end of the current phase from timestamps.
  useEffect(() => {
    if (timer.status !== 'running') return;
    const remaining = timer.plannedMs - elapsedMs(timer);
    const id = window.setTimeout(reachEnd, Math.max(0, remaining));
    const onVisible = () => {
      if (!document.hidden && elapsedMs(timerRef.current) >= timerRef.current.plannedMs) reachEnd();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timer, reachEnd]);

  const start = useCallback(
    (context: TimerContextInfo, minutes: number) => {
      const ms = Math.round(minutes) * 60_000;
      const now = Date.now();
      commit({
        ...IDLE,
        status: 'running',
        context,
        plannedMs: ms,
        focusBlockMs: ms,
        runStartedAt: now,
        sessionStartedAt: now,
        lastSeenAt: now,
      });
      update((d) => setLastActive(d, context.subjectId, context.topicId, context.taskId));
      announce(`Focus session started: ${Math.round(minutes)} minutes${context.label ? ` on ${context.label}` : ''}.`);
    },
    [announce, commit, update],
  );

  const pause = useCallback(() => {
    change((t) => (t.status === 'running' ? { ...t, status: 'paused', accumulatedMs: elapsedMs(t), runStartedAt: null } : t));
    announce('Paused.');
  }, [announce, change]);

  const resume = useCallback(() => {
    change((t) => (t.status === 'paused' ? { ...t, status: 'running', runStartedAt: Date.now(), interrupted: false } : t));
    announce('Resumed.');
  }, [announce, change]);

  const extend = useCallback(
    (minutes: number) => {
      change((t) => ({
        ...t,
        status: 'running',
        plannedMs: t.plannedMs + minutes * 60_000,
        accumulatedMs: elapsedMs(t),
        runStartedAt: Date.now(),
        interrupted: false,
      }));
      announce(`Continuing for ${minutes} more minutes.`);
    },
    [announce, change],
  );

  const startBreak = useCallback(
    (minutes: number) => {
      change((t) => ({
        ...t,
        status: 'running',
        phase: 'break',
        focusBankMs: focusedMs(t),
        plannedMs: minutes * 60_000,
        accumulatedMs: 0,
        runStartedAt: Date.now(),
        interrupted: false,
      }));
      announce(`Break started: ${minutes} minutes.`);
    },
    [announce, change],
  );

  const startAnotherBlock = useCallback(() => {
    change((t) => ({
      ...t,
      status: 'running',
      phase: 'focus',
      plannedMs: t.focusBlockMs,
      accumulatedMs: 0,
      runStartedAt: Date.now(),
      interrupted: false,
    }));
    announce('Focus block started.');
  }, [announce, change]);

  const finish = useCallback((): PendingReview | null => {
    const t = timerRef.current;
    if (t.status === 'idle') return null;
    const minutes = Math.floor(focusedMs(t) / 60_000);
    let sessionId: string | null = null;
    if (minutes >= 1 && t.context) {
      const ctx = t.context;
      const id = uid();
      sessionId = id;
      update((d) =>
        recordSession(d, {
          id,
          taskId: ctx.taskId,
          subjectId: ctx.subjectId,
          topicId: ctx.topicId,
          label: ctx.label,
          startedAt: new Date(t.sessionStartedAt ?? Date.now()).toISOString(),
          endedAt: new Date().toISOString(),
          focusedMin: minutes,
        }),
      );
    }
    const review: PendingReview = { sessionId, taskId: t.context?.taskId ?? null, label: t.context?.label ?? '', focusedMin: minutes };
    commit({ ...IDLE, lastSeenAt: Date.now(), pendingReview: review });
    announce(minutes >= 1 ? `Session saved: ${minutes} minutes of focus.` : 'Session ended. Under a minute, so nothing was recorded.');
    return review;
  }, [announce, commit, update]);

  const discard = useCallback(() => {
    commit({ ...IDLE, lastSeenAt: Date.now() });
    announce('Session discarded.');
  }, [announce, commit]);

  const clearReview = useCallback(() => change((t) => ({ ...t, pendingReview: null })), [change]);

  const value = useMemo(
    () => ({ timer, start, pause, resume, extend, startBreak, startAnotherBlock, finish, discard, clearReview }),
    [timer, start, pause, resume, extend, startBreak, startAnotherBlock, finish, discard, clearReview],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside TimerProvider');
  return ctx;
}

/** Re-renders on an interval while the timer runs. */
export function useNow(active: boolean, intervalMs: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
