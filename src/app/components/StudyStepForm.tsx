import { useId, useState } from 'react';
import { addTask, addTopic } from '../lib/actions';
import { todayISO } from '../lib/dates';
import type { TopicRef } from '../lib/types';
import { useData } from '../state/data';
import { useDraft } from '../state/drafts';
import { useFeedback } from '../state/feedback';
import { useStartSession } from './FocusTimer';

/** One concrete, editable task. Reuses saved topics and never inserts a whole plan. */
export function StudyStepForm({
  initialRef,
  explicitRef = false,
  onCancel,
}: {
  initialRef: TopicRef;
  explicitRef?: boolean;
  onCancel?: () => void;
}) {
  const { data, update } = useData();
  const { announce } = useFeedback();
  const startSession = useStartSession();
  const id = useId();
  const [saved, setSaved] = useDraft('work-step');
  const [draft, setDraft] = useState(() => {
    let previous: Record<string, string> = {};
    try {
      const raw = JSON.parse(saved);
      if (raw && typeof raw === 'object') previous = raw;
    } catch {
      /* New draft. */
    }
    if (explicitRef && (previous.subjectId !== initialRef.subjectId || previous.topicId !== initialRef.topicId)) previous = {};
    const subject =
      data.subjects.find((s) => s.id === previous.subjectId) ??
      data.subjects.find((s) => s.id === initialRef.subjectId) ??
      data.subjects[0];
    const topicId =
      previous.topicId === 'new'
        ? 'new'
        : (subject?.topics.find((t) => t.id === previous.topicId)?.id ??
          subject?.topics.find((t) => t.id === initialRef.topicId)?.id ??
          subject?.topics[0]?.id ??
          'new');
    return {
      subjectId: subject?.id ?? '',
      topicId,
      topicName: typeof previous.topicName === 'string' ? previous.topicName : '',
      title: typeof previous.title === 'string' ? previous.title : null,
      minutes: ['5', '10', '15', '25'].includes(previous.minutes) ? previous.minutes : '10',
    };
  });
  const [error, setError] = useState('');
  const change = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setSaved(JSON.stringify(next));
    setError('');
  };
  const subject = data.subjects.find((s) => s.id === draft.subjectId);
  const topic = subject?.topics.find((t) => t.id === draft.topicId);
  const topicName = draft.topicId === 'new' ? draft.topicName.trim() : (topic?.name ?? '');
  const suggestion = topicName ? `Recall three facts about ${topicName}` : '';
  const existing = data.tasks.filter((t) => !t.done && t.subjectId === subject?.id && t.topicId === topic?.id);

  return (
    <form
      className="stack study-step"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!subject || !topicName) {
          setError('Name one topic to work on, such as SQL joins or cell division.');
          document.getElementById(`${id}-new-topic`)?.focus();
          return;
        }
        if (draft.title !== null && !draft.title.trim()) {
          setError('Write one small task, or use the suggested task.');
          document.getElementById(`${id}-task`)?.focus();
          return;
        }
        let next = data;
        let topicId = topic?.id;
        if (!topicId) {
          const duplicate = subject.topics.find((t) => t.name.toLowerCase() === topicName.toLowerCase());
          if (duplicate) topicId = duplicate.id;
          else {
            next = addTopic(next, subject.id, topicName);
            topicId = next.subjects.find((s) => s.id === subject.id)!.topics.at(-1)!.id;
          }
        }
        const [withTask, task] = addTask(next, {
          title: draft.title?.trim() ?? suggestion,
          subjectId: subject.id,
          topicId,
          durationMin: Number(draft.minutes),
          dueDate: todayISO(),
          steps: ['Open your notes or a practice question.', 'Try the task, then check what you remember.'],
        });
        update(() => ({ ...withTask, nextActionTaskId: task.id, focusTopic: { subjectId: subject.id, topicId } }));
        setSaved('');
        announce('Your task is saved for today.');
        startSession({ task });
      }}
    >
      <div className="field">
        <label className="label" htmlFor={`${id}-subject`}>
          Subject to study
        </label>
        <select
          id={`${id}-subject`}
          className="select"
          value={draft.subjectId}
          onChange={(e) => {
            const s = data.subjects.find((s) => s.id === e.target.value)!;
            change({ subjectId: s.id, topicId: s.topics[0]?.id ?? 'new', topicName: '', title: null });
            update((d) => ({ ...d, focusTopic: { subjectId: s.id, topicId: s.topics[0]?.id ?? null } }));
          }}
        >
          {data.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {!!subject?.topics.length && (
        <div className="field">
          <label className="label" htmlFor={`${id}-topic`}>
            Topic to study
          </label>
          <select
            id={`${id}-topic`}
            className="select"
            value={draft.topicId}
            onChange={(e) => {
              change({ topicId: e.target.value, title: null });
              update((d) => ({
                ...d,
                focusTopic: { subjectId: draft.subjectId, topicId: e.target.value === 'new' ? null : e.target.value },
              }));
            }}
          >
            {subject.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="new">Add a new topic</option>
          </select>
        </div>
      )}
      {draft.topicId === 'new' && (
        <div className="field">
          <label className="label" htmlFor={`${id}-new-topic`}>
            One topic
          </label>
          <input
            id={`${id}-new-topic`}
            className="input"
            placeholder="For example: Cell division"
            value={draft.topicName}
            onChange={(e) => change({ topicName: e.target.value })}
            aria-invalid={!!error && !topicName}
            aria-describedby={error && !topicName ? `${id}-error` : undefined}
          />
          {error && !topicName && (
            <p className="error-text" id={`${id}-error`} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      {topicName && (
        <>
          {!!existing.length && (
            <div className="stack">
              <p className="hint">You already have work for this topic:</p>
              {existing.slice(0, 2).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setSaved('');
                    startSession({ task: t });
                  }}
                >
                  Continue: {t.title} · {t.durationMin} min
                </button>
              ))}
            </div>
          )}
          <div className="field">
            <label className="label" htmlFor={`${id}-task`}>
              One small task
            </label>
            <input
              id={`${id}-task`}
              className="input"
              value={draft.title ?? suggestion}
              onChange={(e) => change({ title: e.target.value })}
              aria-invalid={!!error && !!topicName}
              aria-describedby={`${id}-hint${error && topicName ? ` ${id}-task-error` : ''}`}
            />
            <p className="hint" id={`${id}-hint`}>
              An editable starting point. Stop when your time is up, even if it isn’t finished.
            </p>
            {error && topicName && (
              <p id={`${id}-task-error`} className="error-text" role="alert">
                {error}
              </p>
            )}
            {draft.title !== null && (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => change({ title: null })}>
                Use suggested task
              </button>
            )}
          </div>
        </>
      )}
      <div className="field">
        <label className="label" htmlFor={`${id}-minutes`}>
          Focus for
        </label>
        <select id={`${id}-minutes`} className="select" value={draft.minutes} onChange={(e) => change({ minutes: e.target.value })}>
          {[5, 10, 15, 25].map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </div>
      <div className="button-row">
        <button type="submit" className="btn btn--primary">
          Save task &amp; start
        </button>
        {onCancel && (
          <button className="btn btn--ghost" type="button" onClick={onCancel}>
            Back to suggestion
          </button>
        )}
      </div>
      <p className="hint">Next: focus on this task, then review what you did.</p>
    </form>
  );
}
