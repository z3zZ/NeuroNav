import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { greeting, relativeDay } from '../lib/dates';
import { byOrder, contextLabel, nextAction, parseRefValue } from '../lib/selectors';
import { useData } from '../state/data';
import { useSettings } from '../state/settings';
import { useTimer } from '../state/timer';
import { useRoute } from '../state/router';
import { StudyImage } from './StudyImage';
import { useStartSession } from './FocusTimer';
import { StudyStepForm } from './StudyStepForm';

export function NextActionCard() {
  const { data, update } = useData();
  const { effective } = useSettings();
  const { timer } = useTimer();
  const startSession = useStartSession();
  const [choosing, setChoosing] = useState(false);
  const route = useRoute();
  const [planning, setPlanning] = useState(route.query.get('plan') === '1');
  useEffect(() => {
    if (route.query.get('plan') === '1') setPlanning(true);
  }, [route.query]);
  const action = nextAction(data);
  const active = timer.status !== 'idle';
  const review = !active && timer.pendingReview;
  const guided = !active && !review && data.subjects.length > 0 && (planning || action.kind === 'topic');
  const ref =
    parseRefValue(route.query.get('ref') ?? '') ??
    (action.kind === 'topic' ? action.ref : (data.focusTopic ?? { subjectId: data.subjects[0]?.id ?? '', topicId: null }));
  const alternatives = data.tasks
    .filter((t) => !t.done && (action.kind !== 'task' || t.id !== action.task.id))
    .sort(byOrder)
    .slice(0, 6);
  const stage = review ? 4 : active ? 3 : action.kind === 'setup' ? 0 : guided ? 1 : 2;

  return (
    <section className={`card hero area-hero${guided ? ' hero--guided' : ''}`} aria-labelledby="next-action-title">
      <div className="hero__content">
        <p className="hero__greeting">
          {greeting()}
          {data.profile.name.trim() ? `, ${data.profile.name.trim()}` : ''}
        </p>
        <ol className="study-path" aria-label="Your study session">
          {['Subject', 'Topic', 'Small task', 'Focus', 'Review'].map((label, i) => (
            <li key={label} aria-current={i === stage ? 'step' : undefined}>
              {label}
            </li>
          ))}
        </ol>
        {active ? (
          <>
            <p className="eyebrow">Session in progress</p>
            <h2 id="next-action-title" className="hero__title">
              {timer.context?.label || 'Focus session'}
            </h2>
            <a className="btn btn--primary" href="#/focus">
              Return to your session
            </a>
          </>
        ) : review ? (
          <>
            <p className="eyebrow">Before your next session</p>
            <h2 id="next-action-title" className="hero__title">
              Review your session
            </h2>
            <p className="hero__meta">{review.label}. Mark your task done and reflect, or skip when you’re ready.</p>
            <a className="btn btn--primary" href="#/focus">
              Review session
            </a>
          </>
        ) : guided ? (
          <>
            <h2 id="next-action-title" className="hero__title">
              Make the next step small
            </h2>
            <StudyStepForm
              key={route.query.get('ref') ?? 'work'}
              initialRef={ref}
              explicitRef={route.query.has('ref')}
              onCancel={planning && action.kind === 'task' ? () => setPlanning(false) : undefined}
            />
          </>
        ) : action.kind === 'setup' ? (
          <>
            <h2 id="next-action-title" className="hero__title">
              Choose one subject to begin
            </h2>
            <p className="hero__meta">Then choose a topic and one small task. A few minutes is enough to start.</p>
            <a className="btn btn--primary" href="#/subjects?new=1">
              Add a subject
            </a>
          </>
        ) : action.kind === 'task' ? (
          <>
            <p className="eyebrow">Your next small task</p>
            <h2 id="next-action-title" className="hero__title">
              {action.title}
            </h2>
            <p className="hero__meta">{action.meta.join(' · ')}</p>
            <div className="button-row">
              <button type="button" className="btn btn--primary btn--large" onClick={() => startSession({ task: action.task })}>
                <Play size={18} aria-hidden="true" />
                Start studying
              </button>
              {alternatives.length > 0 && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  aria-expanded={choosing}
                  aria-controls="next-choices"
                  onClick={() => setChoosing(!choosing)}
                >
                  Choose another task
                </button>
              )}
            </div>
            {action.task.steps.some((s) => !s.done) && (
              <p className="hero__first-step">
                <span className="label">First step: </span>
                {action.task.steps.find((s) => !s.done)?.text}
              </p>
            )}
            {data.subjects.length > 0 && (
              <button type="button" className="btn btn--ghost" onClick={() => setPlanning(true)}>
                Choose a subject or topic
              </button>
            )}
            <div id="next-choices" hidden={!choosing}>
              <ul className="choice-list" aria-label="Other tasks">
                {alternatives.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="choice-list__item"
                      onClick={() => {
                        update((d) => ({
                          ...d,
                          nextActionTaskId: t.id,
                          focusTopic: t.subjectId ? { subjectId: t.subjectId, topicId: t.topicId } : d.focusTopic,
                        }));
                        setChoosing(false);
                      }}
                    >
                      <span className="choice-list__title">{t.title}</span>
                      <span className="choice-list__meta">
                        {t.durationMin} min · {contextLabel(data, t.subjectId, t.topicId)} · {relativeDay(t.dueDate)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
      {effective.showImagery && !guided && (
        <div className="hero__media">
          <StudyImage placement="hero" />
        </div>
      )}
    </section>
  );
}
