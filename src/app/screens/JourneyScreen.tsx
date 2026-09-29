import { useId } from 'react';
import { formatShortDate, minutesLabel, toISODate } from '../lib/dates';
import { journeyTopic, parseRefValue, refValue, subjectById, topicOptions, weekSummary } from '../lib/selectors';
import { useData } from '../state/data';
import { JourneyProgress } from '../components/JourneyProgress';
import { EmptyState, PageHeader } from '../components/primitives';

const WORKLOAD: Record<string, string> = { 'too-little': 'Too little', 'just-right': 'About right', 'too-much': 'Too much' };

/** Dashboard card: the journey for one chosen topic. */
export function JourneyCard() {
  const { data, update } = useData();
  const id = useId();
  const ref = journeyTopic(data);
  return (
    <section className="card area-journey" aria-labelledby="journey-heading">
      <div className="card__header">
        <h2 id="journey-heading" className="card__title">
          Study journey
        </h2>
        <a href="#/journey">All topics</a>
      </div>
      {ref ? (
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor={`${id}-topic`}>
              Topic
            </label>
            <select
              id={`${id}-topic`}
              className="select"
              value={refValue(ref)}
              onChange={(e) => update((d) => ({ ...d, focusTopic: parseRefValue(e.target.value) }))}
            >
              {topicOptions(data).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <JourneyProgress topicRef={ref} />
        </div>
      ) : (
        <EmptyState title="No topics yet.">Add a subject to follow Plan, Learn, Practice, Review and Apply.</EmptyState>
      )}
    </section>
  );
}

export function JourneyScreen() {
  const { data } = useData();
  const week = weekSummary(data);
  const sessions = [...data.sessions].reverse().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Study journey"
        intro="Each topic moves through Plan, Learn, Practice, Review and Apply. It’s a guide: go back and forth as you need."
      />

      <section className="card" aria-labelledby="week-heading" style={{ marginBottom: '1.5rem' }}>
        <h2 id="week-heading" className="card__title" style={{ marginBottom: '1rem' }}>
          Last 7 days
        </h2>
        <dl className="stats">
          <div>
            <dt>Focus sessions</dt>
            <dd>{week.sessions}</dd>
          </div>
          <div>
            <dt>Time focused</dt>
            <dd>{minutesLabel(week.minutes)}</dd>
          </div>
          <div>
            <dt>Tasks completed</dt>
            <dd>{week.tasksDone}</dd>
          </div>
          <div>
            <dt>Practice rounds</dt>
            <dd>{week.practice}</dd>
          </div>
        </dl>
      </section>

      {data.subjects.length === 0 ? (
        <EmptyState title="No subjects yet.">
          <a href="#/subjects?new=1">Add a subject</a> to start a journey.
        </EmptyState>
      ) : (
        <div className="stack">
          {data.subjects.map((s) => (
            <section key={s.id} className="card" aria-labelledby={`journey-${s.id}`}>
              <div className="card__header">
                <h2 id={`journey-${s.id}`} className="card__title">
                  {s.name}
                </h2>
                <a href={`#/subjects/${s.id}`}>
                  Open subject<span className="visually-hidden"> {s.name}</span>
                </a>
              </div>
              <div className="journey-list">
                {(s.topics.length ? s.topics : [null]).map((t) => (
                  <div key={t?.id ?? 'whole'} className="journey-list__item">
                    <h3 className="journey-list__title">{t ? t.name : 'Whole subject'}</h3>
                    <JourneyProgress topicRef={{ subjectId: s.id, topicId: t?.id ?? null }} showMarks />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="card" aria-labelledby="sessions-heading" style={{ marginTop: '1.5rem' }}>
        <h2 id="sessions-heading" className="card__title" style={{ marginBottom: '1rem' }}>
          Recent sessions
        </h2>
        {sessions.length ? (
          <ul className="session-list">
            {sessions.map((s) => (
              <li key={s.id}>
                <p className="label">{s.label}</p>
                <p className="small muted">
                  {formatShortDate(toISODate(new Date(s.endedAt)))} · {minutesLabel(s.focusedMin)}
                  {subjectById(data, s.subjectId) ? ` · ${subjectById(data, s.subjectId)?.name}` : ''}
                  {s.reflection ? ` · Felt ${WORKLOAD[s.reflection.workload].toLowerCase()}, energy ${s.reflection.energyAfter}%` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No sessions yet.">Finished focus sessions appear here.</EmptyState>
        )}
        {data.legacyReflections.length > 0 && (
          <p className="hint" style={{ marginTop: '1rem' }}>
            Plus {data.legacyReflections.length} {data.legacyReflections.length === 1 ? 'reflection' : 'reflections'} saved in the previous version of NeuroNav.
          </p>
        )}
      </section>
    </>
  );
}
