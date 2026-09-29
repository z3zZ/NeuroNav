export type Difficulty = 'easy' | 'moderate' | 'challenging';
export type EnergyDrain = 'low' | 'medium' | 'high';
export type SessionLength = 'short' | 'medium' | 'long';
export type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'flexible';

export const SUBJECT_IMAGE_KEYS = ['computing', 'biology', 'maths', 'history'] as const;
export type SubjectImageKey = (typeof SUBJECT_IMAGE_KEYS)[number];
export type SubjectImageChoice = SubjectImageKey | 'auto' | 'none';

export const SUBJECT_COLOURS = ['forest', 'sage', 'cream', 'taupe', 'slate', 'clay'] as const;
export type SubjectColour = (typeof SUBJECT_COLOURS)[number];

export const JOURNEY_STAGES = ['plan', 'learn', 'practice', 'review', 'apply'] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export interface Topic {
  id: string;
  name: string;
  markedStages: JourneyStage[];
  createdAt: string;
}

/** Extends the original onboarding Subject shape; the first five fields are unchanged. */
export interface Subject {
  id: string;
  name: string;
  examDate: string;
  difficulty: Difficulty;
  energyDrain: EnergyDrain;
  image: SubjectImageChoice;
  colour: SubjectColour;
  topics: Topic[];
  markedStages: JourneyStage[];
  createdAt: string;
}

export interface TaskStep {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  subjectId: string | null;
  topicId: string | null;
  durationMin: number;
  /** Local calendar date, YYYY-MM-DD. */
  dueDate: string;
  done: boolean;
  completedAt: string | null;
  order: number;
  steps: TaskStep[];
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  subjectId: string | null;
  topicId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subjectId: string | null;
  topicId: string | null;
  /** Leitner box, 1–5. Higher boxes are reviewed less often. */
  box: number;
  dueDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
}

/** Unchanged from the original reflection screen. */
export interface ReflectionData {
  workload: 'too-little' | 'just-right' | 'too-much';
  energyAfter: number;
  wouldContinue: boolean;
}

export interface SessionRecord {
  id: string;
  taskId: string | null;
  subjectId: string | null;
  topicId: string | null;
  label: string;
  startedAt: string;
  endedAt: string;
  focusedMin: number;
  reflection: ReflectionData | null;
}

export interface PracticeRecord {
  id: string;
  subjectId: string | null;
  topicId: string | null;
  kind: 'flashcards' | 'quiz';
  at: string;
  correct: number;
  total: number;
}

export interface Profile {
  name: string;
  dailyEnergy: number;
  sessionLength: SessionLength;
  preferredTime: PreferredTime;
  onboarded: boolean;
}

export interface TopicRef {
  subjectId: string;
  topicId: string | null;
}

export interface AppData {
  version: 2;
  profile: Profile;
  subjects: Subject[];
  tasks: Task[];
  notes: Note[];
  flashcards: Flashcard[];
  sessions: SessionRecord[];
  practice: PracticeRecord[];
  /** Reflections saved by the original app before sessions were recorded. */
  legacyReflections: (ReflectionData & { at: string | null })[];
  /** Topic the learner chose to follow on the dashboard journey. */
  focusTopic: TopicRef | null;
  /** Task the learner picked as their next action, overriding the suggestion. */
  nextActionTaskId: string | null;
  lastActive: (TopicRef & { taskId: string | null; at: string }) | null;
  notices: { planReady: boolean; migrated: boolean };
}
