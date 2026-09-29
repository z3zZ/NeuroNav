import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { daysUntil } from '../lib/dates';
import { useData } from '../state/data';
import { useSettings } from '../state/settings';
import { useTimer } from '../state/timer';
import { FocusSettings } from '../components/FocusSettings';
import { FocusTimerCard } from '../components/FocusTimer';
import { NextActionCard } from '../components/NextActionCard';
import { PlanCard } from '../components/PlanCard';
import { QuickActions } from '../components/QuickActions';
import { JourneyCard } from './JourneyScreen';
import { EmptyState, PageHeader } from '../components/primitives';
import { SubjectCard } from '../components/SubjectCard';

function Notice({ tone, title, children, onDismiss }: { tone?: 'success' | 'error'; title: string; children: ReactNode; onDismiss: () => void }) {
  return (
    <div className={`notice${tone ? ` notice--${tone}` : ''}`}>
      <div className="notice__body">
        <p className="notice__title">{title}</p>
        <div>{children}</div>
      </div>
      <button type="button" className="icon-btn" onClick={onDismiss}>
        <X size={18} aria-hidden="true" />
        <span className="visually-hidden">Dismiss: {title}</span>
      </button>
    </div>
  );
}

function SubjectsCard() {
  const { data } = useData();
  const subjects = [...data.subjects]
    .sort((a, b) => (daysUntil(a.examDate) ?? 9999) - (daysUntil(b.examDate) ?? 9999))
    .slice(0, 4);
  return (
    <section className="card area-subjects" aria-labelledby="subjects-heading">
      <div className="card__header">
        <h2 id="subjects-heading" className="card__title">
          Your subjects
        </h2>
        {data.subjects.length > 0 && <a href="#/subjects">All subjects ({data.subjects.length})</a>}
      </div>
      {subjects.length ? (
        <ul className="subject-grid" role="list">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </ul>
      ) : (
        <EmptyState title="No subjects yet.">
          <a href="#/subjects?new=1">Add your first subject</a> so NeuroNav can suggest what to do next.
        </EmptyState>
      )}
    </section>
  );
}

export function WorkScreen() {
  const { data, update, loadProblem, backupKey, dismissLoadProblem } = useData();
  const { settings, setSetting } = useSettings();
  const simplified = settings.simplified;
  const { timer } = useTimer();

  return (
    <>
      <PageHeader title="Work" hideTitle />
      <div className="stack notices">
        {loadProblem === 'corrupt' && (
          <Notice tone="error" title="Some saved data couldn’t be read." onDismiss={dismissLoadProblem}>
            <p>
              NeuroNav started fresh so you can keep working. The unreadable copy was kept in this browser
              {backupKey ? ` under “${backupKey}”` : ''}.
            </p>
          </Notice>
        )}
        {data.notices.migrated && (
          <Notice
            title="Welcome to the new NeuroNav."
            onDismiss={() => update((d) => ({ ...d, notices: { ...d.notices, migrated: false } }))}
          >
            <p>Your subjects, plan and settings came across. Your plan is now a list of tasks you can edit.</p>
          </Notice>
        )}
        {data.notices.planReady && (
          <Notice
            tone="success"
            title="Your plan is ready."
            onDismiss={() => update((d) => ({ ...d, notices: { ...d.notices, planReady: false } }))}
          >
            <p>It’s a guide, not a rulebook. Change, move or delete anything.</p>
          </Notice>
        )}
      </div>

      <div className={`work-grid${simplified ? ' work-grid--simplified' : ''}`}>
        <NextActionCard />
        <PlanCard />
        {timer.status !== 'idle' ? <FocusTimerCard /> : !timer.pendingReview && (
          <details className="card area-timer timer-options">
            <summary>Adjust focus time or focus without a task</summary>
            <FocusTimerCard />
          </details>
        )}
        {!simplified && (
          <>
            {data.subjects.length > 0 && <SubjectsCard />}
            {data.subjects.length > 0 && <JourneyCard />}
            <QuickActions />
            <section className="card area-settings" aria-labelledby="quick-settings-heading">
              <div className="card__header">
                <h2 id="quick-settings-heading" className="card__title">
                  Accessibility &amp; focus
                </h2>
                <a href="#/settings">All settings</a>
              </div>
              <FocusSettings />
            </section>
          </>
        )}
      </div>

      {simplified && (
        <div className="simplified-note">
          <p className="muted">Simplified mode is on. Everything else is still in the menu.</p>
          <button type="button" className="btn btn--secondary btn--small" onClick={() => setSetting('simplified', false)}>
            Show everything
          </button>
        </div>
      )}
    </>
  );
}
