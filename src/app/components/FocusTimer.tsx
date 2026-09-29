import { useId, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { sessionMinutes } from '../lib/plan';
import { contextLabel, openTasksForToday, parseRefValue, topicOptions } from '../lib/selectors';
import type { Task, TopicRef } from '../lib/types';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import { navigate } from '../state/router';
import { useSettings } from '../state/settings';
import { elapsedMs, useNow, useTimer, type TimerData } from '../state/timer';
import { ChoiceGroup } from './primitives';

/** Starts a session from a task or topic. One session at a time. */
export function useStartSession() {
  const { data } = useData();
  const { timer, start } = useTimer();
  const { notify } = useFeedback();
  return (target: { task?: Task; ref?: TopicRef | null; minutes?: number; title?: string }) => {
    if (timer.pendingReview) {
      notify('Review or skip your last session before starting another.');
      navigate('/focus');
      return;
    }
    if (timer.status !== 'idle') {
      notify('A session is already in progress. Finish or discard it first.');
      navigate('/focus');
      return;
    }
    const { task, ref } = target;
    const subjectId = task?.subjectId ?? ref?.subjectId ?? null;
    const topicId = task?.topicId ?? ref?.topicId ?? null;
    const label = task?.title ?? target.title ?? (contextLabel(data, subjectId, topicId) || 'Focus session');
    start({ taskId: task?.id ?? null, subjectId, topicId, label }, target.minutes ?? task?.durationMin ?? sessionMinutes(data.profile.sessionLength));
    navigate('/focus');
  };
}

export function timerStatusText(t: TimerData): string {
  if (t.status === 'idle') return 'Ready';
  if (t.status === 'finished') return t.phase === 'break' ? 'Break finished' : 'Time reached';
  if (t.phase === 'break') return t.status === 'paused' ? 'Break paused' : 'On a break';
  return t.status === 'paused' ? 'Paused' : 'In progress';
}

export function TimerReadout({ timer, large = false }: { timer: TimerData; large?: boolean }) {
  const { settings } = useSettings();
  const clock = settings.timerDisplay === 'clock';
  const now = useNow(timer.status === 'running', clock ? 1000 : 15_000);
  const elapsed = elapsedMs(timer, now);
  const planned = timer.plannedMs;
  const pct = Math.min(100, Math.round((elapsed / planned) * 100));
  const doneMin = Math.floor(elapsed / 60_000);
  const plannedMin = Math.round(planned / 60_000);
  const left = Math.max(0, planned - elapsed);
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  const phaseWord = timer.phase === 'break' ? 'break' : 'focus';

  return (
    <div className={`timer-readout${large ? ' timer-readout--large' : ''}`}>
      {clock ? (
        <p className="timer-readout__time">
          <span aria-hidden="true">
            {mm}:{ss}
          </span>
          <span className="visually-hidden">
            {Math.ceil(left / 60_000)} minutes of {phaseWord} left
          </span>
          <span className="timer-readout__unit" aria-hidden="true">
            left
          </span>
        </p>
      ) : (
        <p className="timer-readout__time">
          {doneMin}
          <span className="timer-readout__unit">
            {' '}
            of {plannedMin} min {timer.phase === 'break' ? 'break' : ''}
          </span>
        </p>
      )}
      <div className="progress" aria-hidden="true">
        <span className="progress__bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Controls shared by the dashboard card and the focus view. */
export function TimerControls({ onFinished }: { onFinished?: () => void }) {
  const { timer, pause, resume, extend, startBreak, startAnotherBlock, finish, discard } = useTimer();
  const { settings } = useSettings();
  const finishSession = () => {
    finish();
    onFinished?.();
    navigate('/focus');
  };

  if (timer.status === 'finished') {
    return (
      <div className="end-prompt" role="group" aria-label="What next?">
        <p className="end-prompt__title">{timer.phase === 'focus' ? 'That block is done. What next?' : 'Break over. Ready when you are.'}</p>
        <div className="button-row">
          {timer.phase === 'focus' ? (
            <>
              <button type="button" className="btn btn--primary" onClick={() => extend(10)}>
                Continue for 10 minutes
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => startBreak(settings.breakMin)}>
                Take a {settings.breakMin}-minute break
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary" onClick={startAnotherBlock}>
              Start another block
            </button>
          )}
          <button type="button" className="btn btn--secondary" onClick={finishSession}>
            Finish session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="button-row">
      {timer.status === 'running' ? (
        <button type="button" className="btn btn--secondary" onClick={pause}>
          <Pause size={18} aria-hidden="true" />
          Pause
        </button>
      ) : (
        <button type="button" className="btn btn--primary" onClick={resume}>
          <Play size={18} aria-hidden="true" />
          Resume
        </button>
      )}
      {timer.phase === 'focus' && timer.status === 'running' && (
        <button type="button" className="btn btn--secondary" onClick={() => startBreak(settings.breakMin)}>
          Take a break
        </button>
      )}
      <button type="button" className="btn btn--secondary" onClick={finishSession}>
        <Square size={16} aria-hidden="true" />
        Finish
      </button>
      {timer.interrupted && (
        <button type="button" className="btn btn--ghost" onClick={discard}>
          Discard session
        </button>
      )}
    </div>
  );
}

export function InterruptedNotice() {
  const { timer } = useTimer();
  if (!timer.interrupted || timer.status !== 'paused') return null;
  const minutes = Math.floor(elapsedMs(timer) / 60_000);
  return (
    <div className="notice">
      <div className="notice__body">
        <p className="notice__title">Your session paused when the page closed.</p>
        <p>
          {timer.context?.label ? `${timer.context.label}: ` : ''}
          {minutes} {minutes === 1 ? 'minute' : 'minutes'} done so far. Resume, finish or discard it.
        </p>
      </div>
    </div>
  );
}

const PRESETS = ['15', '25', '45'] as const;

/** Dashboard card: choose what and how long, then start. */
export function FocusTimerCard() {
  const { data } = useData();
  const { timer } = useTimer();
  const startSession = useStartSession();
  const id = useId();
  const tasks = openTasksForToday(data);
  const [target, setTarget] = useState(() => (tasks[0] ? `task:${tasks[0].id}` : ''));
  const defaultMin = String(sessionMinutes(data.profile.sessionLength));
  const [preset, setPreset] = useState<string>((PRESETS as readonly string[]).includes(defaultMin) ? defaultMin : 'custom');
  const [custom, setCustom] = useState(defaultMin);
  const [error, setError] = useState('');

  const start = () => {
    const minutes = preset === 'custom' ? Number(custom) : Number(preset);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      setError('Choose between 1 and 240 minutes.');
      document.getElementById(`${id}-custom`)?.focus();
      return;
    }
    setError('');
    if (target.startsWith('task:')) {
      const task = data.tasks.find((t) => t.id === target.slice(5));
      return startSession({ task, minutes });
    }
    startSession({ ref: parseRefValue(target.replace(/^ref:/, '')), minutes });
  };

  return (
    <section className="card area-timer" aria-labelledby="focus-heading" id="focus-session">
      <div className="card__header">
        <h2 id="focus-heading" className="card__title">
          Focus session
        </h2>
        <span className="pill pill--neutral">{timerStatusText(timer)}</span>
      </div>

      {timer.status === 'idle' ? (
        <form
          className="stack"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <div className="field">
            <label className="label" htmlFor={`${id}-target`}>
              Working on
            </label>
            <select id={`${id}-target`} className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Just focus, no task</option>
              {tasks.length > 0 && (
                <optgroup label="Today’s tasks">
                  {tasks.map((t) => (
                    <option key={t.id} value={`task:${t.id}`}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {data.subjects.length > 0 && (
                <optgroup label="Subjects and topics">
                  {topicOptions(data).map((o) => (
                    <option key={o.value} value={`ref:${o.value}`}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <ChoiceGroup
            legend="Length"
            name="preset"
            value={preset}
            onChange={setPreset}
            options={[...PRESETS.map((p) => ({ value: p, label: `${p} min` })), { value: 'custom', label: 'Custom' }]}
          />
          {preset === 'custom' && (
            <div className="field">
              <label className="label" htmlFor={`${id}-custom`}>
                Custom length (minutes)
              </label>
              <input
                id={`${id}-custom`}
                className="input"
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-custom-error` : undefined}
                style={{ maxWidth: '8rem' }}
              />
              {error && (
                <p id={`${id}-custom-error`} className="error-text">
                  {error}
                </p>
              )}
            </div>
          )}
          <div className="button-row">
            <button type="submit" className="btn btn--primary">
              <Play size={18} aria-hidden="true" />
              Start focus
            </button>
            <span className="hint">Sound is off unless you turn it on in Settings.</span>
          </div>
        </form>
      ) : (
        <div className="stack">
          <InterruptedNotice />
          <p className="timer-context">{timer.context?.label || 'Focus session'}</p>
          <TimerReadout timer={timer} />
          <TimerControls />
          <a className="btn btn--ghost" href="#/focus">
            Open focus view
          </a>
        </div>
      )}
    </section>
  );
}
