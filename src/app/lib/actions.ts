/**
 * Pure state transitions for AppData. Each returns a new object and never
 * mutates its input, so the provider can persist and undo safely.
 */
import { addDaysISO, nowISO, todayISO, uid } from './dates';
import { SUBJECT_COLOURS } from './types';
import type {
  AppData,
  Flashcard,
  JourneyStage,
  Note,
  PracticeRecord,
  ReflectionData,
  SessionRecord,
  Subject,
  Task,
  TaskStep,
  TopicRef,
} from './types';

type D = AppData;

// Subjects & topics ----------------------------------------------------------

export type SubjectInput = Pick<Subject, 'name' | 'examDate' | 'difficulty' | 'energyDrain' | 'image'> & {
  colour?: Subject['colour'];
  id?: string;
};

export function addSubject(d: D, input: SubjectInput): [D, Subject] {
  const subject: Subject = {
    id: input.id ?? uid(),
    name: input.name.trim(),
    examDate: input.examDate,
    difficulty: input.difficulty,
    energyDrain: input.energyDrain,
    image: input.image,
    colour: input.colour ?? SUBJECT_COLOURS[d.subjects.length % SUBJECT_COLOURS.length],
    topics: [],
    markedStages: [],
    createdAt: nowISO(),
  };
  return [{ ...d, subjects: [...d.subjects, subject] }, subject];
}

export function updateSubject(d: D, id: string, patch: Partial<Subject>): D {
  return { ...d, subjects: d.subjects.map((s) => (s.id === id ? { ...s, ...patch, id } : s)) };
}

/** Removes a subject but keeps the learner's tasks, notes and cards, unassigned. */
export function deleteSubject(d: D, id: string): D {
  const detach = <T extends { subjectId: string | null; topicId: string | null }>(x: T): T =>
    x.subjectId === id ? { ...x, subjectId: null, topicId: null } : x;
  return {
    ...d,
    subjects: d.subjects.filter((s) => s.id !== id),
    tasks: d.tasks.map(detach),
    notes: d.notes.map(detach),
    flashcards: d.flashcards.map(detach),
    focusTopic: d.focusTopic?.subjectId === id ? null : d.focusTopic,
    lastActive: d.lastActive?.subjectId === id ? null : d.lastActive,
  };
}

/** What a deletion detached, so Undo can put it back without touching later edits. */
export interface Detached {
  tasks: { id: string; subjectId: string | null; topicId: string | null }[];
  notes: { id: string; subjectId: string | null; topicId: string | null }[];
  flashcards: { id: string; subjectId: string | null; topicId: string | null }[];
}

export function captureLinks(d: D, match: (x: { subjectId: string | null; topicId: string | null }) => boolean): Detached {
  const pick = (x: { id: string; subjectId: string | null; topicId: string | null }) => ({ id: x.id, subjectId: x.subjectId, topicId: x.topicId });
  return {
    tasks: d.tasks.filter(match).map(pick),
    notes: d.notes.filter(match).map(pick),
    flashcards: d.flashcards.filter(match).map(pick),
  };
}

function relink(d: D, links: Detached): D {
  const apply = <T extends { id: string; subjectId: string | null; topicId: string | null }>(list: T[], saved: Detached['tasks']) =>
    list.map((x) => {
      const link = saved.find((l) => l.id === x.id);
      return link ? { ...x, subjectId: link.subjectId, topicId: link.topicId } : x;
    });
  return { ...d, tasks: apply(d.tasks, links.tasks), notes: apply(d.notes, links.notes), flashcards: apply(d.flashcards, links.flashcards) };
}

export function restoreSubject(d: D, subject: Subject, index: number, links: Detached): D {
  if (d.subjects.some((s) => s.id === subject.id)) return d;
  const subjects = [...d.subjects];
  subjects.splice(Math.min(index, subjects.length), 0, subject);
  return relink({ ...d, subjects }, links);
}

export function restoreTopic(d: D, subjectId: string, topic: Subject['topics'][number], index: number, links: Detached): D {
  const next = {
    ...d,
    subjects: d.subjects.map((s) => {
      if (s.id !== subjectId || s.topics.some((t) => t.id === topic.id)) return s;
      const topics = [...s.topics];
      topics.splice(Math.min(index, topics.length), 0, topic);
      return { ...s, topics };
    }),
  };
  return relink(next, links);
}

export function addTopic(d: D, subjectId: string, name: string): D {
  const topic = { id: uid(), name: name.trim(), markedStages: [], createdAt: nowISO() };
  return {
    ...d,
    subjects: d.subjects.map((s) => (s.id === subjectId ? { ...s, topics: [...s.topics, topic] } : s)),
  };
}

export function renameTopic(d: D, subjectId: string, topicId: string, name: string): D {
  return {
    ...d,
    subjects: d.subjects.map((s) =>
      s.id === subjectId ? { ...s, topics: s.topics.map((t) => (t.id === topicId ? { ...t, name: name.trim() } : t)) } : s,
    ),
  };
}

export function deleteTopic(d: D, subjectId: string, topicId: string): D {
  const detach = <T extends { topicId: string | null }>(x: T): T => (x.topicId === topicId ? { ...x, topicId: null } : x);
  return {
    ...d,
    subjects: d.subjects.map((s) => (s.id === subjectId ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) } : s)),
    tasks: d.tasks.map(detach),
    notes: d.notes.map(detach),
    flashcards: d.flashcards.map(detach),
    focusTopic: d.focusTopic?.topicId === topicId ? { subjectId, topicId: null } : d.focusTopic,
  };
}

export function toggleStageMark(d: D, ref: TopicRef, stage: JourneyStage): D {
  const flip = (list: JourneyStage[]) => (list.includes(stage) ? list.filter((s) => s !== stage) : [...list, stage]);
  return {
    ...d,
    subjects: d.subjects.map((s) => {
      if (s.id !== ref.subjectId) return s;
      if (!ref.topicId) return { ...s, markedStages: flip(s.markedStages) };
      return { ...s, topics: s.topics.map((t) => (t.id === ref.topicId ? { ...t, markedStages: flip(t.markedStages) } : t)) };
    }),
  };
}

// Tasks ----------------------------------------------------------------------

export type TaskInput = Pick<Task, 'title' | 'subjectId' | 'topicId' | 'durationMin' | 'dueDate'> & { steps?: string[] };

const nextOrder = (d: D) => d.tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;

export function addTask(d: D, input: TaskInput): [D, Task] {
  const task: Task = {
    id: uid(),
    title: input.title.trim(),
    subjectId: input.subjectId,
    topicId: input.topicId,
    durationMin: input.durationMin,
    dueDate: input.dueDate,
    done: false,
    completedAt: null,
    order: nextOrder(d),
    steps: (input.steps ?? []).map((text) => ({ id: uid(), text, done: false })),
    createdAt: nowISO(),
  };
  return [{ ...d, tasks: [...d.tasks, task] }, task];
}

export function addTasks(d: D, tasks: Task[]): D {
  return { ...d, tasks: [...d.tasks, ...tasks] };
}

export function updateTask(d: D, id: string, patch: Partial<Task>): D {
  return { ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch, id } : t)) };
}

export function setTaskDone(d: D, id: string, done: boolean): D {
  return {
    ...updateTask(d, id, { done, completedAt: done ? nowISO() : null }),
    nextActionTaskId: done && d.nextActionTaskId === id ? null : d.nextActionTaskId,
  };
}

export function deleteTask(d: D, id: string): D {
  return {
    ...d,
    tasks: d.tasks.filter((t) => t.id !== id),
    nextActionTaskId: d.nextActionTaskId === id ? null : d.nextActionTaskId,
  };
}

export function restoreTask(d: D, task: Task): D {
  return d.tasks.some((t) => t.id === task.id) ? d : { ...d, tasks: [...d.tasks, task] };
}

export function deferTask(d: D, id: string, days = 1): D {
  const base = todayISO();
  return updateTask(d, id, { dueDate: addDaysISO(base, days), order: nextOrder(d) });
}

/** Swaps a task with its neighbour among the given visible list. */
export function moveTask(d: D, visibleIds: string[], id: string, direction: -1 | 1): D {
  const index = visibleIds.indexOf(id);
  const otherId = visibleIds[index + direction];
  if (index < 0 || !otherId) return d;
  const a = d.tasks.find((t) => t.id === id);
  const b = d.tasks.find((t) => t.id === otherId);
  if (!a || !b) return d;
  // Keep the swap stable even if orders collided in older data.
  const aOrder = a.order === b.order ? b.order + direction : b.order;
  return {
    ...d,
    tasks: d.tasks.map((t) => (t.id === a.id ? { ...t, order: aOrder } : t.id === b.id ? { ...t, order: a.order } : t)),
  };
}

export function setSteps(d: D, taskId: string, texts: string[], mode: 'replace' | 'append'): D {
  const fresh: TaskStep[] = texts.filter((t) => t.trim()).map((text) => ({ id: uid(), text: text.trim(), done: false }));
  return {
    ...d,
    tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, steps: mode === 'replace' ? fresh : [...t.steps, ...fresh] } : t)),
  };
}

export function toggleStep(d: D, taskId: string, stepId: string): D {
  return {
    ...d,
    tasks: d.tasks.map((t) =>
      t.id === taskId ? { ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) } : t,
    ),
  };
}

/**
 * The original "Today was hard" action, made concrete: keeps the first
 * unfinished task for today and moves the rest to tomorrow.
 */
export function lightenToday(d: D, todayIds: string[]): { data: D; moved: string[] } {
  const [, ...rest] = todayIds;
  const tomorrow = addDaysISO(todayISO(), 1);
  return {
    data: { ...d, tasks: d.tasks.map((t) => (rest.includes(t.id) ? { ...t, dueDate: tomorrow } : t)) },
    moved: rest,
  };
}

export function restoreDueDates(d: D, previous: Record<string, string>): D {
  return { ...d, tasks: d.tasks.map((t) => (previous[t.id] ? { ...t, dueDate: previous[t.id] } : t)) };
}

// Notes ----------------------------------------------------------------------

export function addNote(d: D, input: Partial<Pick<Note, 'id' | 'title' | 'body' | 'subjectId' | 'topicId'>>): [D, Note] {
  const now = nowISO();
  const note: Note = {
    id: input.id ?? uid(),
    title: input.title ?? '',
    body: input.body ?? '',
    subjectId: input.subjectId ?? null,
    topicId: input.topicId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  return [{ ...d, notes: [note, ...d.notes] }, note];
}

export function updateNote(d: D, id: string, patch: Partial<Note>): D {
  return { ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, ...patch, id, updatedAt: nowISO() } : n)) };
}

export function deleteNote(d: D, id: string): D {
  return { ...d, notes: d.notes.filter((n) => n.id !== id) };
}

export function restoreNote(d: D, note: Note): D {
  return d.notes.some((n) => n.id === note.id) ? d : { ...d, notes: [note, ...d.notes] };
}

// Flashcards -----------------------------------------------------------------

export function addCards(
  d: D,
  cards: { front: string; back: string }[],
  ref: { subjectId: string | null; topicId: string | null },
): D {
  const today = todayISO();
  const created: Flashcard[] = cards
    .filter((c) => c.front.trim())
    .map((c) => ({
      id: uid(),
      front: c.front.trim(),
      back: c.back.trim(),
      subjectId: ref.subjectId,
      topicId: ref.topicId,
      box: 1,
      dueDate: today,
      lastReviewedAt: null,
      createdAt: nowISO(),
    }));
  return { ...d, flashcards: [...d.flashcards, ...created] };
}

export function updateCard(d: D, id: string, patch: Partial<Flashcard>): D {
  return { ...d, flashcards: d.flashcards.map((c) => (c.id === id ? { ...c, ...patch, id } : c)) };
}

export function deleteCard(d: D, id: string): D {
  return { ...d, flashcards: d.flashcards.filter((c) => c.id !== id) };
}

export function restoreCard(d: D, card: Flashcard): D {
  return d.flashcards.some((c) => c.id === card.id) ? d : { ...d, flashcards: [...d.flashcards, card] };
}

const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 7, 14];

/** Leitner scheduling: "Got it" moves a card up a box, "Not yet" back to box 1. */
export function reviewCard(d: D, id: string, gotIt: boolean): D {
  return {
    ...d,
    flashcards: d.flashcards.map((c) => {
      if (c.id !== id) return c;
      const box = gotIt ? Math.min(5, c.box + 1) : 1;
      return { ...c, box, dueDate: addDaysISO(todayISO(), BOX_INTERVAL_DAYS[box]), lastReviewedAt: nowISO() };
    }),
  };
}

// Sessions, practice & context ----------------------------------------------

export function recordSession(d: D, session: Omit<SessionRecord, 'reflection'>): D {
  if (d.sessions.some((s) => s.id === session.id)) return d;
  return { ...d, sessions: [...d.sessions, { ...session, reflection: null }] };
}

export function attachReflection(d: D, sessionId: string, reflection: ReflectionData): D {
  return { ...d, sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, reflection } : s)) };
}

export function recordPractice(d: D, record: Omit<PracticeRecord, 'id' | 'at'>): D {
  return { ...d, practice: [...d.practice, { ...record, id: uid(), at: nowISO() }] };
}

export function setLastActive(d: D, subjectId: string | null, topicId: string | null, taskId: string | null): D {
  if (!subjectId) return d;
  return { ...d, focusTopic: { subjectId, topicId }, lastActive: { subjectId, topicId, taskId, at: nowISO() } };
}
