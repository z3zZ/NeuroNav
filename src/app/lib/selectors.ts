import { daysUntil, todayISO } from './dates';
import { sessionMinutes } from './plan';
import { JOURNEY_STAGES } from './types';
import type { AppData, JourneyStage, Subject, SubjectImageKey, Task, Topic, TopicRef } from './types';

export const byOrder = (a: Task, b: Task) => a.dueDate.localeCompare(b.dueDate) || a.order - b.order;

export function subjectById(d: AppData, id: string | null): Subject | undefined {
  return id ? d.subjects.find((s) => s.id === id) : undefined;
}

export function topicById(d: AppData, subjectId: string | null, topicId: string | null): Topic | undefined {
  return topicId ? subjectById(d, subjectId)?.topics.find((t) => t.id === topicId) : undefined;
}

/** "Topic · Subject" or just the subject name. */
export function contextLabel(d: AppData, subjectId: string | null, topicId: string | null): string {
  const subject = subjectById(d, subjectId);
  const topic = topicById(d, subjectId, topicId);
  if (topic && subject) return `${topic.name} · ${subject.name}`;
  return subject?.name ?? '';
}

export function todaysTasks(d: AppData): Task[] {
  const today = todayISO();
  const completedToday = (t: Task) => t.done && !!t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString();
  return d.tasks
    .filter((t) => t.dueDate === today || (t.dueDate < today && (!t.done || completedToday(t))))
    .sort(byOrder);
}

export function openTasksForToday(d: AppData): Task[] {
  const today = todayISO();
  return d.tasks.filter((t) => !t.done && t.dueDate <= today).sort(byOrder);
}

export function upcomingTasks(d: AppData): Task[] {
  const today = todayISO();
  return d.tasks.filter((t) => !t.done && t.dueDate > today).sort(byOrder);
}

// Next action ------------------------------------------------------------------

export type NextAction =
  | { kind: 'task'; task: Task; title: string; meta: string[]; minutes: number; reason: string }
  | { kind: 'topic'; ref: TopicRef; title: string; meta: string[]; minutes: number; reason: string }
  | { kind: 'setup'; title: string; meta: string[]; reason: string };

/**
 * Picks one concrete next step from real data only: the learner's chosen task,
 * then the first open task due today or earlier, then the most recently
 * studied topic, then the subject with the nearest exam.
 */
export function nextAction(d: AppData): NextAction {
  const open = openTasksForToday(d);
  const chosen = d.nextActionTaskId ? d.tasks.find((t) => t.id === d.nextActionTaskId && !t.done) : undefined;
  const task = chosen ?? open[0];
  if (task) {
    const label = contextLabel(d, task.subjectId, task.topicId);
    const overdue = task.dueDate < todayISO();
    return {
      kind: 'task',
      task,
      title: task.title,
      meta: [`${task.durationMin} minutes`, label, overdue ? 'Carried over' : 'Planned for today'].filter(Boolean),
      minutes: task.durationMin,
      reason: chosen ? 'You chose this' : 'First task in today’s plan',
    };
  }

  const minutes = sessionMinutes(d.profile.sessionLength);
  const focusedSubject = d.focusTopic && subjectById(d, d.focusTopic.subjectId);
  if (focusedSubject && d.focusTopic) {
    const topic = topicById(d, focusedSubject.id, d.focusTopic.topicId);
    return { kind: 'topic', ref: { subjectId: focusedSubject.id, topicId: topic?.id ?? null }, title: `Continue ${topic?.name ?? focusedSubject.name}`, meta: [focusedSubject.name], minutes, reason: 'Your selected topic' };
  }
  const last = d.lastActive && subjectById(d, d.lastActive.subjectId);
  if (last && d.lastActive) {
    const topic = topicById(d, d.lastActive.subjectId, d.lastActive.topicId);
    return {
      kind: 'topic',
      ref: { subjectId: last.id, topicId: topic?.id ?? null },
      title: `Continue ${topic?.name ?? last.name}`,
      meta: [`${minutes} minutes`, topic ? last.name : ''].filter(Boolean),
      minutes,
      reason: 'Where you were working most recently',
    };
  }

  const upcomingSubjects = d.subjects.filter((s) => (daysUntil(s.examDate) ?? 0) >= 0);
  const nearest = [...(upcomingSubjects.length ? upcomingSubjects : d.subjects)]
    .sort((a, b) => (daysUntil(a.examDate) ?? 9999) - (daysUntil(b.examDate) ?? 9999))[0];
  if (nearest) {
    return {
      kind: 'topic',
      ref: { subjectId: nearest.id, topicId: nearest.topics[0]?.id ?? null },
      title: `Start ${nearest.topics[0]?.name ?? nearest.name}`,
      meta: [`${minutes} minutes`, nearest.topics[0] ? nearest.name : ''].filter(Boolean),
      minutes,
      reason: nearest.examDate && (daysUntil(nearest.examDate) ?? -1) >= 0 ? 'Your nearest exam' : 'One of your subjects',
    };
  }

  return {
    kind: 'setup',
    title: 'Add your first subject',
    meta: ['About 2 minutes'],
    reason: 'Subjects let NeuroNav suggest what to do next',
  };
}

// Journey ----------------------------------------------------------------------

export const STAGE_LABELS: Record<JourneyStage, string> = {
  plan: 'Plan',
  learn: 'Learn',
  practice: 'Practice',
  review: 'Review',
  apply: 'Apply',
};

export const STAGE_HINTS: Record<JourneyStage, string> = {
  plan: 'Add a task for this topic.',
  learn: 'Write a note or finish a focus session on it.',
  practice: 'Review flashcards or try a quick quiz.',
  review: 'Practise again on a different day.',
  apply: 'Use it on a past paper or real question, then mark this stage.',
};

export interface StageState {
  stage: JourneyStage;
  done: boolean;
  marked: boolean;
  evidence: string;
}

export interface JourneyState {
  stages: StageState[];
  current: JourneyStage | null;
  completed: number;
}

export function journeyFor(d: AppData, ref: TopicRef): JourneyState {
  const subject = subjectById(d, ref.subjectId);
  const topic = topicById(d, ref.subjectId, ref.topicId);
  const matches = (x: { subjectId: string | null; topicId: string | null }) =>
    x.subjectId === ref.subjectId && (!ref.topicId || x.topicId === ref.topicId);

  const tasks = d.tasks.filter(matches);
  const notes = d.notes.filter(matches);
  const sessions = d.sessions.filter((s) => matches(s) && s.focusedMin >= 1);
  const cards = d.flashcards.filter(matches);
  const practice = d.practice.filter(matches);
  const practiceDays = new Set(practice.map((p) => p.at.slice(0, 10)));
  const marked = topic?.markedStages ?? subject?.markedStages ?? [];

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const derived: Record<JourneyStage, [boolean, string]> = {
    plan: [tasks.length > 0, tasks.length ? `${plural(tasks.length, 'task')} planned` : 'No tasks yet'],
    learn: [
      notes.length > 0 || sessions.length > 0,
      notes.length || sessions.length ? `${plural(notes.length, 'note')} · ${plural(sessions.length, 'session')}` : 'Nothing recorded yet',
    ],
    practice: [
      practice.length > 0,
      practice.length ? `${plural(practice.length, 'practice round')}` : cards.length ? `${plural(cards.length, 'card')} ready` : 'No practice yet',
    ],
    review: [practiceDays.size >= 2, practiceDays.size ? `Practised on ${plural(practiceDays.size, 'day')}` : 'Not reviewed yet'],
    apply: [false, 'Marked by you when ready'],
  };

  const stages = JOURNEY_STAGES.map((stage) => {
    const isMarked = marked.includes(stage);
    const [auto, evidence] = derived[stage];
    return { stage, done: auto || isMarked, marked: isMarked, evidence: isMarked && !auto ? 'Marked done by you' : evidence };
  });
  const current = stages.find((s) => !s.done)?.stage ?? null;
  return { stages, current, completed: stages.filter((s) => s.done).length };
}

/** The topic to show on the dashboard journey: chosen, recent, or first. */
export function journeyTopic(d: AppData): TopicRef | null {
  const valid = (r: TopicRef | null | undefined) =>
    r && subjectById(d, r.subjectId) && (!r.topicId || topicById(d, r.subjectId, r.topicId)) ? r : null;
  const chosen = valid(d.focusTopic);
  if (chosen) return chosen;
  const recent = d.lastActive ? valid({ subjectId: d.lastActive.subjectId, topicId: d.lastActive.topicId }) : null;
  if (recent) return recent;
  const first = d.subjects[0];
  return first ? { subjectId: first.id, topicId: first.topics[0]?.id ?? null } : null;
}

export function topicOptions(d: AppData): { value: string; label: string; ref: TopicRef }[] {
  return d.subjects.flatMap((s) => [
    { value: `${s.id}|`, label: `${s.name} (whole subject)`, ref: { subjectId: s.id, topicId: null } },
    ...s.topics.map((t) => ({ value: `${s.id}|${t.id}`, label: `${s.name} — ${t.name}`, ref: { subjectId: s.id, topicId: t.id } })),
  ]);
}

export const refValue = (r: TopicRef | null) => (r ? `${r.subjectId}|${r.topicId ?? ''}` : '');
export const parseRefValue = (v: string): TopicRef | null => {
  const [subjectId, topicId] = v.split('|');
  return subjectId ? { subjectId, topicId: topicId || null } : null;
};

// Subject imagery --------------------------------------------------------------

const NAME_PATTERNS: [SubjectImageKey, RegExp][] = [
  ['computing', /comput|\bcs\b|programming|coding|software|database|\bsql\b|\bict\b|\bit\b|algorithm|network/i],
  ['biology', /biolog|\bbio\b|life science|ecology|anatomy|genetic|botany|zoology/i],
  ['maths', /math|statistic|algebra|calculus|geometry|further maths|numeracy/i],
  ['history', /histor|classics|archaeolog|politic|heritage/i],
];

export function subjectImageKey(subject: Subject): SubjectImageKey | null {
  if (subject.image === 'none') return null;
  if (subject.image !== 'auto') return subject.image;
  return NAME_PATTERNS.find(([, re]) => re.test(subject.name))?.[0] ?? null;
}

export const SUBJECT_IMAGE_FILES: Record<SubjectImageKey, string> = {
  computing: 'subject-computing-circuits',
  biology: 'subject-biology-fern',
  maths: 'subject-maths-geometry',
  history: 'subject-history-archive',
};

// Progress summary -------------------------------------------------------------

/** Completed work for the last 7 days. Progress only; no streaks. */
export function weekSummary(d: AppData) {
  const since = Date.now() - 7 * 86_400_000;
  const sessions = d.sessions.filter((s) => Date.parse(s.endedAt) >= since);
  return {
    sessions: sessions.length,
    minutes: sessions.reduce((m, s) => m + s.focusedMin, 0),
    tasksDone: d.tasks.filter((t) => t.done && t.completedAt && Date.parse(t.completedAt) >= since).length,
    practice: d.practice.filter((p) => Date.parse(p.at) >= since).length,
  };
}

// Search -------------------------------------------------------------------------

export function search(d: AppData, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const has = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(q));
  return {
    subjects: d.subjects.filter((s) => has(s.name, ...s.topics.map((t) => t.name))),
    tasks: d.tasks.filter((t) => has(t.title, ...t.steps.map((s) => s.text))),
    notes: d.notes.filter((n) => has(n.title, n.body)),
    cards: d.flashcards.filter((c) => has(c.front, c.back)),
  };
}
