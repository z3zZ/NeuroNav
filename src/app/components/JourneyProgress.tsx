import { Check } from 'lucide-react';
import { toggleStageMark } from '../lib/actions';
import { journeyFor, refValue, STAGE_HINTS, STAGE_LABELS } from '../lib/selectors';
import type { JourneyStage, TopicRef } from '../lib/types';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';

function stageLink(stage: JourneyStage, ref: TopicRef): { href: string; label: string } | null {
  const value = encodeURIComponent(refValue(ref));
  switch (stage) {
    case 'plan':
      return { href: '#/tasks', label: 'Plan a task' };
    case 'learn':
      return { href: `#/notes?new=1&ref=${value}`, label: 'Write a note' };
    case 'practice':
    case 'review':
      return { href: `#/flashcards?deck=${value}`, label: 'Open flashcards' };
    default:
      return null;
  }
}

/**
 * Plan → Learn → Practice → Review → Apply for one topic. Every node has a
 * text label and state; stages are a guide, not a forced order.
 */
export function JourneyProgress({ topicRef, showMarks = false }: { topicRef: TopicRef; showMarks?: boolean }) {
  const { data, update } = useData();
  const { announce } = useFeedback();
  const journey = journeyFor(data, topicRef);
  const current = journey.current;
  const link = current ? stageLink(current, topicRef) : null;

  const toggle = (stage: JourneyStage, marked: boolean) => {
    update((d) => toggleStageMark(d, topicRef, stage));
    announce(`${STAGE_LABELS[stage]} ${marked ? 'unmarked' : 'marked as done'}.`);
  };

  return (
    <div className="journey">
      <p className="small muted">
        {journey.completed} of 5 stages done{current ? ` · Current stage: ${STAGE_LABELS[current]}` : ' · Every stage done'}
      </p>
      <ol className="journey__track">
        {journey.stages.map((s) => {
          const state = s.done ? 'done' : s.stage === current ? 'current' : 'todo';
          return (
            <li key={s.stage} className="journey__stage" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="journey__node" aria-hidden="true">
                {s.done ? <Check size={16} strokeWidth={3} /> : null}
              </span>
              <span className="journey__label">{STAGE_LABELS[s.stage]}</span>
              <span className="journey__state">{state === 'done' ? 'Done' : state === 'current' ? 'Current' : 'Not yet'}</span>
            </li>
          );
        })}
      </ol>
      {current && (
        <div className="journey__next">
          <p>
            <span className="label">Next: </span>
            {STAGE_HINTS[current]}
          </p>
          <div className="button-row">
            {link && (
              <a className="btn btn--secondary btn--small" href={link.href}>
                {link.label}
              </a>
            )}
            {(current === 'apply' || current === 'review') && (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => toggle(current, false)}>
                Mark {STAGE_LABELS[current]} as done
              </button>
            )}
          </div>
        </div>
      )}
      {showMarks && (
        <details className="journey__marks">
          <summary>Mark stages yourself</summary>
          <p className="hint">Stages also complete from your activity. Marks are for work done outside NeuroNav.</p>
          <ul>
            {journey.stages.map((s) => (
              <li key={s.stage}>
                <label className="checkbox">
                  <input type="checkbox" checked={s.marked} onChange={() => toggle(s.stage, s.marked)} />
                  <span>
                    {STAGE_LABELS[s.stage]} <span className="muted small">· {s.evidence}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
