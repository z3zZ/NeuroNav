import { useState } from 'react';
import { Play } from 'lucide-react';
import { greeting, relativeDay } from '../lib/dates';
import { byOrder, contextLabel, nextAction } from '../lib/selectors';
import { useData } from '../state/data';
import { navigate } from '../state/router';
import { useSettings } from '../state/settings';
import { useTimer } from '../state/timer';
import { DecorativeImage } from './DecorativeImage';
import { useStartSession } from './FocusTimer';

/** Hero: a short welcome and one concrete next step with one primary button. */
export function NextActionCard() {
  const { data, update } = useData();
  const { effective } = useSettings();
  const { timer } = useTimer();
  const startSession = useStartSession();
  const [choosing, setChoosing] = useState(false);
  const action = nextAction(data);
  const name = data.profile.name.trim();
  const alternatives = data.tasks
    .filter((t) => !t.done && (action.kind !== 'task' || t.id !== action.task.id))
    .sort(byOrder)
    .slice(0, 6);

  const sessionActive = timer.status !== 'idle';

  return (
    <section className="card hero area-hero" aria-labelledby="next-action-title">
      <div className="hero__content">
        <p className="hero__greeting">
          {greeting()}
          {name ? `, ${name}` : ''}
        </p>
        {sessionActive ? (
          <>
            <p className="eyebrow">Session in progress</p>
            <h2 id="next-action-title" className="hero__title" tabIndex={-1}>
              {timer.context?.label || 'Focus session'}
            </h2>
            <div className="button-row">
              <a className="btn btn--primary btn--large" href="#/focus">
                Return to your session
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">Suggested next</p>
            <h2 id="next-action-title" className="hero__title" tabIndex={-1}>
              {action.title}
            </h2>
            <p className="hero__meta">
              {action.meta.join(' · ')}
              <span className="hero__reason"> — {action.reason}</span>
            </p>
            <div className="button-row">
              {action.kind === 'setup' ? (
                <a className="btn btn--primary btn--large" href="#/subjects?new=1">
                  Add a subject
                </a>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary btn--large"
                  onClick={() =>
                    action.kind === 'task'
                      ? startSession({ task: action.task })
                      : startSession({ ref: action.ref, minutes: action.minutes, title: action.title.replace(/^(Continue|Start) /, '') })
                  }
                >
                  <Play size={18} aria-hidden="true" />
                  Start studying
                </button>
              )}
              {alternatives.length > 0 && (
                <button type="button" className="btn btn--secondary" aria-expanded={choosing} aria-controls="next-choices" onClick={() => setChoosing((c) => !c)}>
                  Choose something else
                </button>
              )}
            </div>
            {action.kind === 'task' && action.task.steps[0] && (
              <p className="hero__first-step">
                <span className="label">First step: </span>
                {action.task.steps.find((s) => !s.done)?.text ?? action.task.steps[0].text}
              </p>
            )}
            <div id="next-choices" hidden={!choosing}>
              {choosing && (
                <ul className="choice-list" aria-label="Other tasks">
                  {alternatives.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="choice-list__item"
                        onClick={() => {
                          update((d) => ({ ...d, nextActionTaskId: t.id }));
                          setChoosing(false);
                          document.getElementById('next-action-title')?.focus();
                        }}
                      >
                        <span className="choice-list__title">{t.title}</span>
                        <span className="choice-list__meta">
                          {[`${t.durationMin} min`, contextLabel(data, t.subjectId, t.topicId), relativeDay(t.dueDate)].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                  {data.nextActionTaskId && (
                    <li>
                      <button
                        type="button"
                        className="choice-list__item"
                        onClick={() => {
                          update((d) => ({ ...d, nextActionTaskId: null }));
                          setChoosing(false);
                        }}
                      >
                        <span className="choice-list__title">Go back to the suggestion</span>
                      </button>
                    </li>
                  )}
                  <li>
                    <button type="button" className="choice-list__item" onClick={() => navigate('/tasks')}>
                      <span className="choice-list__title">See all tasks</span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </>
        )}
      </div>
      {effective.showImagery && (
        <div className="hero__media">
          <DecorativeImage
            name="dashboard-hero-study-desk"
            widths={[640, 1024, 1600]}
            sizes="(max-width: 767px) 100vw, (max-width: 1199px) 45vw, 30vw"
            width={1600}
            height={900}
            eager
          />
        </div>
      )}
    </section>
  );
}
