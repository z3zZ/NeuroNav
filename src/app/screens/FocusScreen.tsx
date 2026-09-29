import { useState } from 'react';
import { attachReflection, setTaskDone, toggleStep } from '../lib/actions';
import { contextLabel, nextAction } from '../lib/selectors';
import type { ReflectionData } from '../lib/types';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import { navigate } from '../state/router';
import { useSettings } from '../state/settings';
import { useTimer, type PendingReview } from '../state/timer';
import { StudyImage } from '../components/StudyImage';
import { InterruptedNotice, TimerControls, TimerReadout, timerStatusText, useStartSession } from '../components/FocusTimer';
import { ChoiceGroup, PageHeader } from '../components/primitives';

/** The original reflection questions, optional and skippable. */
function Reflection({ review }: { review: PendingReview }) {
  const { data, update } = useData();
  const { clearReview } = useTimer();
  const { announce } = useFeedback();
  const task = review.taskId ? data.tasks.find((t) => t.id === review.taskId) : undefined;
  const session = data.sessions.find((s) => s.id === review.sessionId);
  const subjectId = task?.subjectId ?? session?.subjectId;
  const topicId = task?.topicId ?? session?.topicId;
  const topicRef = subjectId ? encodeURIComponent(`${subjectId}|${topicId ?? ''}`) : '';
  const cards = data.flashcards.filter((c) => c.subjectId === subjectId && (!topicId || c.topicId === topicId));
  const [markDone, setMarkDone] = useState(false);
  const [workload, setWorkload] = useState<ReflectionData['workload'] | ''>('');
  const [energy, setEnergy] = useState(50);
  const [wouldContinue, setWouldContinue] = useState<'' | 'yes' | 'no'>('');

  const close = (save: boolean, destination = '/work') => {
    update((d) => {
      let next = d;
      if (markDone && task) next = setTaskDone(next, task.id, true);
      if (save && review.sessionId && workload && wouldContinue) {
        next = attachReflection(next, review.sessionId, { workload, energyAfter: energy, wouldContinue: wouldContinue === 'yes' });
      }
      return next;
    });
    clearReview();
    announce(save ? 'Reflection saved.' : 'Review closed.');
    navigate(destination);
  };

  const canSave = !!workload && !!wouldContinue;

  return (
    <section className="card focus-panel" aria-labelledby="reflection-heading">
      <PageHeader title="Session finished" hideTitle />
      <h2 id="reflection-heading" className="page-title" style={{ marginBottom: '0.5rem' }}>
        {review.focusedMin >= 1 ? `${review.focusedMin} ${review.focusedMin === 1 ? 'minute' : 'minutes'} of focus saved` : 'Session ended'}
      </h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        {review.label ? `${review.label}. ` : ''}
        {review.focusedMin >= 1 ? 'That counts, however it felt.' : 'Under a minute, so nothing was recorded.'}
      </p>

      {task && !task.done && (
        <label className="checkbox" style={{ marginBottom: '1rem' }}>
          <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
          <span>Mark “{task.title}” as done</span>
        </label>
      )}

      {review.sessionId && (
        <div className="stack">
          <p className="label">How did that go? Optional, and it stays on this device.</p>
          <ChoiceGroup
            legend="Was that…"
            name="workload"
            value={workload as ReflectionData['workload']}
            onChange={setWorkload}
            options={[
              { value: 'too-little', label: 'Too little' },
              { value: 'just-right', label: 'About right' },
              { value: 'too-much', label: 'Too much' },
            ]}
          />
          <div className="field">
            <label className="label" htmlFor="energy-after">
              Energy now: {energy}%
            </label>
            <input
              id="energy-after"
              className="range"
              type="range"
              min={0}
              max={100}
              step={5}
              value={energy}
              aria-valuetext={`${energy} percent`}
              onChange={(e) => setEnergy(Number(e.target.value))}
            />
          </div>
          <ChoiceGroup
            legend="Could you keep going?"
            name="continue"
            value={wouldContinue as 'yes' | 'no'}
            onChange={setWouldContinue}
            options={[
              { value: 'yes', label: 'Yes, I could' },
              { value: 'no', label: 'No, I need a break' },
            ]}
          />
        </div>
      )}

      <div className="button-row" style={{ marginTop: '1.5rem' }}>
        {review.sessionId && (
          <button type="button" className="btn btn--primary" disabled={!canSave} onClick={() => close(true)}>
            Save reflection
          </button>
        )}
        <button type="button" className={review.sessionId ? 'btn btn--secondary' : 'btn btn--primary'} onClick={() => close(false)}>
          {review.sessionId ? 'Skip' : 'Back to Work'}
        </button>
      </div>
      {review.sessionId && !canSave && (
        <p className="hint" style={{ marginTop: '0.5rem' }}>
          Answer both questions to save, or skip.
        </p>
      )}
      {topicRef && (
        <div className="card__footer stack">
          <h3 className="label">Review what you learned</h3>
          <p className="hint">Optional: recall one thing without looking, then check your notes.</p>
          <div className="button-row">
            <button type="button" className="btn btn--secondary" onClick={() => close(canSave, `/notes?new=1&ref=${topicRef}`)}>
              Write a review note
            </button>
            {cards.length > 0 && (
              <button type="button" className="btn btn--secondary" onClick={() => close(canSave, `/flashcards?deck=${topicRef}`)}>
                Review topic flashcards
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function FocusScreen() {
  const { data, update } = useData();
  const { timer } = useTimer();
  const { effective } = useSettings();
  const startSession = useStartSession();

  const background = effective.showImagery && (
    <div className="focus-bg" aria-hidden="true">
      <StudyImage placement="focus" />
    </div>
  );

  if (timer.status === 'idle' && timer.pendingReview) {
    return (
      <div className="focus-screen">
        {background}
        <Reflection review={timer.pendingReview} />
      </div>
    );
  }

  if (timer.status === 'idle') {
    const action = nextAction(data);
    return (
      <div className="focus-screen">
        {background}
        <section className="card focus-panel">
          <PageHeader title="Focus" />
          <p style={{ marginBottom: '1rem' }}>No session is running.</p>
          <div className="button-row">
            {action.kind === 'task' && (
              <button type="button" className="btn btn--primary" onClick={() => startSession({ task: action.task })}>
                Start: {action.title}
              </button>
            )}
            <a className="btn btn--secondary" href="#/work">
              Back to Work
            </a>
          </div>
        </section>
      </div>
    );
  }

  const task = timer.context?.taskId ? data.tasks.find((t) => t.id === timer.context?.taskId) : undefined;
  const context = timer.context ? contextLabel(data, timer.context.subjectId, timer.context.topicId) : '';

  return (
    <div className="focus-screen">
      {background}
      <section className="card focus-panel" aria-labelledby="focus-task">
        <PageHeader title="Focus" hideTitle />
        <div className="card__header">
          <p className="eyebrow">{timer.phase === 'break' ? 'Break' : 'Focusing on'}</p>
          <span className="pill pill--neutral">{timerStatusText(timer)}</span>
        </div>
        <h2 id="focus-task" className="focus-title">
          {timer.context?.label || 'Focus session'}
        </h2>
        {context && context !== timer.context?.label && <p className="muted">{context}</p>}
        <div className="stack" style={{ marginTop: '1.5rem' }}>
          <InterruptedNotice />
          <TimerReadout timer={timer} large />
          <TimerControls />
        </div>

        {task && task.steps.length > 0 && (
          <div className="focus-steps">
            <h3 className="label">Steps</h3>
            <ul className="step-list">
              {task.steps.map((s) => (
                <li key={s.id}>
                  <label className="checkbox">
                    <input type="checkbox" checked={s.done} onChange={() => update((d) => toggleStep(d, task.id, s.id))} />
                    <span className={s.done ? 'step--done' : undefined}>{s.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="hint" style={{ marginTop: '1.5rem' }}>
          You can stop at any time. Your progress is saved as you go.
        </p>
      </section>
    </div>
  );
}
