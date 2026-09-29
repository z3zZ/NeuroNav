import { addDaysISO, isISODate, nowISO, todayISO, uid } from './dates';
import { defaultSteps, suggestTasks } from './plan';
import {
  LEGACY_KEYS,
  STORAGE_KEYS,
  asArray,
  asBoolean,
  asNumber,
  asString,
  isObject,
  oneOf,
  readJSON,
} from './storage';
import {
  JOURNEY_STAGES,
  SUBJECT_COLOURS,
  SUBJECT_IMAGE_KEYS,
  type AppData,
  type Flashcard,
  type JourneyStage,
  type Note,
  type PracticeRecord,
  type Profile,
  type ReflectionData,
  type SessionRecord,
  type Subject,
  type Task,
  type TaskStep,
  type Topic,
  type TopicRef,
} from './types';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  dailyEnergy: 50,
  sessionLength: 'medium',
  preferredTime: 'flexible',
  onboarded: false,
};

export function emptyData(): AppData {
  return {
    version: 2,
    profile: { ...DEFAULT_PROFILE },
    subjects: [],
    tasks: [],
    notes: [],
    flashcards: [],
    sessions: [],
    practice: [],
    legacyReflections: [],
    focusTopic: null,
    nextActionTaskId: null,
    lastActive: null,
    notices: { planReady: false, migrated: false },
  };
}

// ---------------------------------------------------------------------------
// Normalisers: accept anything, return well-formed data or null.
// ---------------------------------------------------------------------------

const stages = (v: unknown): JourneyStage[] =>
  asArray(v).filter((s): s is JourneyStage => (JOURNEY_STAGES as readonly unknown[]).includes(s));

const idOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);
const isoOr = (v: unknown, fallback: string) => (typeof v === 'string' && v ? v : fallback);

function normTopic(v: unknown): Topic | null {
  if (!isObject(v) || typeof v.id !== 'string' || !asString(v.name).trim()) return null;
  return { id: v.id, name: asString(v.name).trim(), markedStages: stages(v.markedStages), createdAt: isoOr(v.createdAt, nowISO()) };
}

export function normSubject(v: unknown, index = 0): Subject | null {
  if (!isObject(v) || typeof v.id !== 'string' || !asString(v.name).trim()) return null;
  return {
    id: v.id,
    name: asString(v.name).trim(),
    examDate: isISODate(v.examDate) ? v.examDate : '',
    difficulty: oneOf(v.difficulty, ['easy', 'moderate', 'challenging'] as const, 'moderate'),
    energyDrain: oneOf(v.energyDrain, ['low', 'medium', 'high'] as const, 'medium'),
    image: oneOf(v.image, [...SUBJECT_IMAGE_KEYS, 'auto', 'none'] as const, 'auto'),
    colour: oneOf(v.colour, SUBJECT_COLOURS, SUBJECT_COLOURS[index % SUBJECT_COLOURS.length]),
    topics: asArray(v.topics).map(normTopic).filter((t): t is Topic => t !== null),
    markedStages: stages(v.markedStages),
    createdAt: isoOr(v.createdAt, nowISO()),
  };
}

function normStep(v: unknown): TaskStep | null {
  if (!isObject(v) || !asString(v.text).trim()) return null;
  return { id: asString(v.id) || uid(), text: asString(v.text), done: asBoolean(v.done, false) };
}

function normTask(v: unknown, index: number): Task | null {
  if (!isObject(v) || typeof v.id !== 'string' || !asString(v.title).trim()) return null;
  return {
    id: v.id,
    title: asString(v.title),
    subjectId: idOrNull(v.subjectId),
    topicId: idOrNull(v.topicId),
    durationMin: Math.round(asNumber(v.durationMin, 25, 1, 600)),
    dueDate: isISODate(v.dueDate) ? v.dueDate : todayISO(),
    done: asBoolean(v.done, false),
    completedAt: typeof v.completedAt === 'string' ? v.completedAt : null,
    order: asNumber(v.order, index),
    steps: asArray(v.steps).map(normStep).filter((s): s is TaskStep => s !== null),
    createdAt: isoOr(v.createdAt, nowISO()),
  };
}

function normNote(v: unknown): Note | null {
  if (!isObject(v) || typeof v.id !== 'string') return null;
  const created = isoOr(v.createdAt, nowISO());
  return {
    id: v.id,
    title: asString(v.title),
    body: asString(v.body),
    subjectId: idOrNull(v.subjectId),
    topicId: idOrNull(v.topicId),
    createdAt: created,
    updatedAt: isoOr(v.updatedAt, created),
  };
}

function normCard(v: unknown): Flashcard | null {
  if (!isObject(v) || typeof v.id !== 'string' || !asString(v.front).trim()) return null;
  return {
    id: v.id,
    front: asString(v.front),
    back: asString(v.back),
    subjectId: idOrNull(v.subjectId),
    topicId: idOrNull(v.topicId),
    box: Math.round(asNumber(v.box, 1, 1, 5)),
    dueDate: isISODate(v.dueDate) ? v.dueDate : todayISO(),
    lastReviewedAt: typeof v.lastReviewedAt === 'string' ? v.lastReviewedAt : null,
    createdAt: isoOr(v.createdAt, nowISO()),
  };
}

export function normReflection(v: unknown): ReflectionData | null {
  if (!isObject(v)) return null;
  const workload = oneOf(v.workload, ['too-little', 'just-right', 'too-much'] as const, 'just-right');
  if (typeof v.workload !== 'string') return null;
  return { workload, energyAfter: asNumber(v.energyAfter, 50, 0, 100), wouldContinue: asBoolean(v.wouldContinue, false) };
}

function normSession(v: unknown): SessionRecord | null {
  if (!isObject(v) || typeof v.id !== 'string') return null;
  return {
    id: v.id,
    taskId: idOrNull(v.taskId),
    subjectId: idOrNull(v.subjectId),
    topicId: idOrNull(v.topicId),
    label: asString(v.label, 'Focus session'),
    startedAt: isoOr(v.startedAt, nowISO()),
    endedAt: isoOr(v.endedAt, nowISO()),
    focusedMin: Math.round(asNumber(v.focusedMin, 0, 0, 1440)),
    reflection: v.reflection ? normReflection(v.reflection) : null,
  };
}

function normPractice(v: unknown): PracticeRecord | null {
  if (!isObject(v) || typeof v.id !== 'string') return null;
  return {
    id: v.id,
    subjectId: idOrNull(v.subjectId),
    topicId: idOrNull(v.topicId),
    kind: oneOf(v.kind, ['flashcards', 'quiz'] as const, 'flashcards'),
    at: isoOr(v.at, nowISO()),
    correct: Math.round(asNumber(v.correct, 0, 0)),
    total: Math.round(asNumber(v.total, 0, 0)),
  };
}

function normTopicRef(v: unknown): TopicRef | null {
  if (!isObject(v) || typeof v.subjectId !== 'string') return null;
  return { subjectId: v.subjectId, topicId: idOrNull(v.topicId) };
}

function normProfile(v: unknown): Profile {
  const p = isObject(v) ? v : {};
  return {
    name: asString(p.name).slice(0, 60),
    dailyEnergy: Math.round(asNumber(p.dailyEnergy, 50, 0, 100)),
    sessionLength: oneOf(p.sessionLength, ['short', 'medium', 'long'] as const, 'medium'),
    preferredTime: oneOf(p.preferredTime, ['morning', 'afternoon', 'evening', 'flexible'] as const, 'flexible'),
    onboarded: asBoolean(p.onboarded, false),
  };
}

const keep = <T,>(items: (T | null)[]): T[] => items.filter((x): x is T => x !== null);

export function normaliseData(raw: unknown): AppData | null {
  if (!isObject(raw) || raw.version !== 2) return null;
  const last = isObject(raw.lastActive) ? raw.lastActive : null;
  const notices = isObject(raw.notices) ? raw.notices : {};
  return {
    version: 2,
    profile: normProfile(raw.profile),
    subjects: keep(asArray(raw.subjects).map(normSubject)),
    tasks: keep(asArray(raw.tasks).map(normTask)),
    notes: keep(asArray(raw.notes).map(normNote)),
    flashcards: keep(asArray(raw.flashcards).map(normCard)),
    sessions: keep(asArray(raw.sessions).map(normSession)),
    practice: keep(asArray(raw.practice).map(normPractice)),
    legacyReflections: keep(
      asArray(raw.legacyReflections).map((r) => {
        const base = normReflection(r);
        return base ? { ...base, at: isObject(r) && typeof r.at === 'string' ? r.at : null } : null;
      }),
    ),
    focusTopic: normTopicRef(raw.focusTopic),
    nextActionTaskId: idOrNull(raw.nextActionTaskId),
    lastActive:
      last && typeof last.subjectId === 'string'
        ? { subjectId: last.subjectId, topicId: idOrNull(last.topicId), taskId: idOrNull(last.taskId), at: isoOr(last.at, nowISO()) }
        : null,
    notices: { planReady: asBoolean(notices.planReady, false), migrated: asBoolean(notices.migrated, false) },
  };
}

// ---------------------------------------------------------------------------
// Migration from the original single-screen app.
// ---------------------------------------------------------------------------

export function tasksFromSuggestions(data: AppData, suggestions: ReturnType<typeof suggestTasks>): Task[] {
  const today = todayISO();
  const base = data.tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;
  return suggestions.map((s, i) => ({
    id: uid(),
    title: s.title,
    subjectId: s.subjectId,
    topicId: s.topicId,
    durationMin: s.durationMin,
    dueDate: addDaysISO(today, s.dayOffset),
    done: false,
    completedAt: null,
    order: base + i,
    steps: s.steps.map((text) => ({ id: uid(), text, done: false })),
    createdAt: nowISO(),
  }));
}

/** Builds v2 data from the original keys. Returns null when there is nothing to migrate. */
export function migrateLegacy(): AppData | null {
  const plan = readJSON(LEGACY_KEYS.plan, (raw) => (isObject(raw) ? raw : null));
  const reflections = readJSON(LEGACY_KEYS.reflections, (raw) => (Array.isArray(raw) ? raw : null));
  if (plan.status !== 'ok' && reflections.status !== 'ok') return null;

  const data = emptyData();
  if (plan.status === 'ok') {
    const p = plan.value;
    data.profile = normProfile({ ...p, onboarded: true });
    data.subjects = keep(
      asArray(p.subjects).map((s, i) => normSubject(isObject(s) ? { ...s, id: asString(s.id) || uid() } : s, i)),
    );
    // The original plan screen showed generated blocks for the coming days;
    // keep them as real, editable tasks.
    data.tasks = tasksFromSuggestions(data, suggestTasks(data.subjects, data.profile));
  }
  if (reflections.status === 'ok') {
    data.legacyReflections = keep(reflections.value.map((r) => {
      const base = normReflection(r);
      return base ? { ...base, at: null } : null;
    }));
  }
  data.notices.migrated = true;
  return data;
}

export type LoadOutcome = { data: AppData; problem: 'corrupt' | null; backupKey: string | null };

export function loadData(): LoadOutcome {
  const current = readJSON(STORAGE_KEYS.data, normaliseData);
  if (current.status === 'ok') return { data: current.value, problem: null, backupKey: null };
  const migrated = migrateLegacy();
  if (current.status === 'corrupt') {
    return { data: migrated ?? emptyData(), problem: 'corrupt', backupKey: current.backupKey };
  }
  return { data: migrated ?? emptyData(), problem: null, backupKey: null };
}

export { defaultSteps };
