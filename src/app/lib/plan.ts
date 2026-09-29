import { daysUntil } from './dates';
import type { Profile, SessionLength, Subject } from './types';

export function sessionMinutes(length: SessionLength): number {
  return length === 'short' ? 25 : length === 'medium' ? 45 : 90;
}

export function breakMinutes(length: SessionLength): number {
  return length === 'short' ? 5 : length === 'medium' ? 10 : 15;
}

export interface SuggestedTask {
  key: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  durationMin: number;
  dayOffset: number;
  steps: string[];
}

/** The original "break it down" steps shown for every study block. */
export function defaultSteps(subjectName: string): string[] {
  return [
    `Read or review notes for ${subjectName}`,
    'Watch a short video or tutorial',
    'Try 3–5 practice questions',
    'Make a quick summary of key points',
  ];
}

/**
 * Port of the original plan generator: sooner exams get more sessions, and
 * lower daily energy spreads sessions over more days. Returns suggestions only;
 * callers decide what to add.
 */
export function suggestTasks(subjects: Subject[], profile: Pick<Profile, 'dailyEnergy' | 'sessionLength'>): SuggestedTask[] {
  const duration = sessionMinutes(profile.sessionLength);
  const sessionsPerDay = Math.max(2, Math.floor(4 * (profile.dailyEnergy / 100)));

  const sorted = [...subjects].sort((a, b) => {
    const da = daysUntil(a.examDate);
    const db = daysUntil(b.examDate);
    return (da ?? Number.MAX_SAFE_INTEGER) - (db ?? Number.MAX_SAFE_INTEGER);
  });

  const out: SuggestedTask[] = [];
  let day = 0;
  let today = 0;

  for (const subject of sorted) {
    const until = daysUntil(subject.examDate);
    if (until !== null && until < 0) continue;
    const total = until === null ? 2 : until <= 3 ? 4 : until <= 7 ? 3 : 2;

    for (let i = 0; i < total; i++) {
      if (today >= sessionsPerDay) {
        day++;
        today = 0;
      }
      const topic = subject.topics.length ? subject.topics[i % subject.topics.length] : null;
      const name = topic ? topic.name : subject.name;
      out.push({
        key: `${subject.id}-${i}`,
        subjectId: subject.id,
        topicId: topic?.id ?? null,
        title: `Revise ${name}`,
        durationMin: duration,
        dayOffset: day,
        steps: defaultSteps(name),
      });
      today++;
    }
  }
  return out;
}
