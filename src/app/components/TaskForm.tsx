import { useId, useState } from 'react';
import { todayISO } from '../lib/dates';
import { parseRefValue, refValue, topicOptions } from '../lib/selectors';
import type { Task } from '../lib/types';
import { useData } from '../state/data';

export interface TaskFormValues {
  title: string;
  subjectId: string | null;
  topicId: string | null;
  durationMin: number;
  dueDate: string;
}

/** Add or edit a task. Validates inline; never submits an empty title. */
export function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  compact = false,
  defaultRef,
}: {
  initial?: Partial<Task>;
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => void;
  onCancel?: () => void;
  compact?: boolean;
  defaultRef?: { subjectId: string; topicId: string | null } | null;
}) {
  const { data } = useData();
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [ref, setRef] = useState(
    refValue(initial?.subjectId ? { subjectId: initial.subjectId, topicId: initial.topicId ?? null } : defaultRef ?? null),
  );
  const [duration, setDuration] = useState(String(initial?.durationMin ?? 25));
  const [due, setDue] = useState(initial?.dueDate ?? todayISO());
  const [errors, setErrors] = useState<{ title?: string; duration?: string; due?: string }>({});
  const options = topicOptions(data);

  const submit = () => {
    const next: typeof errors = {};
    const minutes = Number(duration);
    if (!title.trim()) next.title = 'Enter what you want to do.';
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) next.duration = 'Use a number of minutes between 1 and 600.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) next.due = 'Choose a date.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`${id}-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    const parsed = parseRefValue(ref);
    onSubmit({ title: title.trim(), subjectId: parsed?.subjectId ?? null, topicId: parsed?.topicId ?? null, durationMin: Math.round(minutes), dueDate: due });
    if (!initial) {
      setTitle('');
      setErrors({});
    }
  };

  const err = (key: keyof typeof errors) =>
    errors[key] ? (
      <p id={`${id}-${key}-error`} className="error-text">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form
      className={`task-form${compact ? ' task-form--compact' : ''}`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="field task-form__title">
        <label className="label" htmlFor={`${id}-title`}>
          Task
        </label>
        <input
          id={`${id}-title`}
          className="input"
          value={title}
          placeholder="For example: Revise SQL joins"
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
        />
        {err('title')}
      </div>
      <div className="task-form__row">
        <div className="field">
          <label className="label" htmlFor={`${id}-ref`}>
            Subject or topic
          </label>
          <select id={`${id}-ref`} className="select" value={ref} onChange={(e) => setRef(e.target.value)}>
            <option value="">No subject</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor={`${id}-duration`}>
            Minutes
          </label>
          <input
            id={`${id}-duration`}
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            aria-invalid={errors.duration ? true : undefined}
            aria-describedby={errors.duration ? `${id}-duration-error` : undefined}
          />
          {err('duration')}
        </div>
        <div className="field">
          <label className="label" htmlFor={`${id}-due`}>
            Date
          </label>
          <input
            id={`${id}-due`}
            className="input"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-invalid={errors.due ? true : undefined}
            aria-describedby={errors.due ? `${id}-due-error` : undefined}
          />
          {err('due')}
        </div>
      </div>
      <div className="button-row">
        <button type="submit" className="btn btn--primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
