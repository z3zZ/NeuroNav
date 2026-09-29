import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { addTask, addTasks, lightenToday, restoreDueDates } from '../lib/actions';
import { addDaysISO, relativeDay, todayISO } from '../lib/dates';
import { tasksFromSuggestions } from '../lib/model';
import { suggestTasks } from '../lib/plan';
import { byOrder, openTasksForToday, subjectById, todaysTasks, upcomingTasks } from '../lib/selectors';
import type { Task } from '../lib/types';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import { useStartSession } from '../components/FocusTimer';
import { EmptyState, PageHeader } from '../components/primitives';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';

function SuggestTasks() {
  const { data, update } = useData();
  const { announce } = useFeedback();
  const [open, setOpen] = useState(false);
  const [energy, setEnergy] = useState(data.profile.dailyEnergy);
  const suggestions = useMemo(() => suggestTasks(data.subjects, { ...data.profile, dailyEnergy: energy }), [data.subjects, data.profile, energy]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const chosen = suggestions.filter((s) => !excluded.has(s.key));

  if (!data.subjects.length) return null;

  return (
    <section className="card no-print" aria-labelledby="suggest-heading">
      <div className="card__header">
        <h2 id="suggest-heading" className="card__title">
          Suggest tasks from my subjects
        </h2>
        <button type="button" className="btn btn--secondary btn--small" aria-expanded={open} aria-controls="suggest-body" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide suggestions' : 'Show suggestions'}
        </button>
      </div>
      <div id="suggest-body" hidden={!open}>
        {open && (
          <div className="stack">
            <p className="muted">Sooner exams get more sessions. Nothing is added until you choose.</p>
            <div className="field">
              <label className="label" htmlFor="suggest-energy">
                How are you feeling today? {energy}%
              </label>
              <input
                id="suggest-energy"
                className="range"
                type="range"
                min={0}
                max={100}
                step={5}
                value={energy}
                aria-valuetext={`${energy} percent`}
                onChange={(e) => setEnergy(Number(e.target.value))}
              />
              <p className="hint">Lower energy spreads the same work over more days.</p>
            </div>
            {suggestions.length ? (
              <fieldset className="fieldset">
                <legend>Suggested tasks</legend>
                <ul className="suggest-list">
                  {suggestions.map((s) => (
                    <li key={s.key}>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={!excluded.has(s.key)}
                          onChange={() =>
                            setExcluded((prev) => {
                              const next = new Set(prev);
                              if (next.has(s.key)) next.delete(s.key);
                              else next.add(s.key);
                              return next;
                            })
                          }
                        />
                        <span>
                          {s.title} <span className="muted">· {subjectById(data, s.subjectId)?.name} · {s.durationMin} min · {relativeDay(addDaysISO(todayISO(), s.dayOffset))}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ) : (
              <p className="muted">All your exam dates have passed, so there’s nothing to suggest.</p>
            )}
            <button
              type="button"
              className="btn btn--primary"
              disabled={!chosen.length}
              onClick={() => {
                update((d) => addTasks(d, tasksFromSuggestions(d, chosen)));
                announce(`${chosen.length} tasks added.`);
                setOpen(false);
              }}
            >
              Add {chosen.length} {chosen.length === 1 ? 'task' : 'tasks'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function groupByDate(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) groups.set(t.dueDate, [...(groups.get(t.dueDate) ?? []), t]);
  return [...groups.entries()];
}

export function TasksScreen() {
  const { data, update } = useData();
  const { notify, announce } = useFeedback();
  const startSession = useStartSession();
  const today = todaysTasks(data);
  const openToday = openTasksForToday(data);
  const upcoming = upcomingTasks(data);
  const todayIds = new Set(today.map((t) => t.id));
  const earlierDone = data.tasks.filter((t) => t.done && !todayIds.has(t.id)).sort(byOrder).reverse();

  return (
    <>
      <PageHeader title="Tasks" intro="Everything you’ve planned. Move things around whenever you need to.">
        <button type="button" className="btn btn--secondary no-print" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" />
          Print
        </button>
      </PageHeader>

      <div className="tasks-layout">
        <div className="stack">
          <section className="card" aria-labelledby="today-heading">
            <div className="card__header">
              <h2 id="today-heading" className="card__title">
                Today
              </h2>
              {openToday.length > 1 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--small no-print"
                  onClick={() => {
                    const previous = Object.fromEntries(openToday.map((t) => [t.id, t.dueDate]));
                    const { data: next, moved } = lightenToday(data, openToday.map((t) => t.id));
                    update(() => next);
                    notify(`Moved ${moved.length} ${moved.length === 1 ? 'task' : 'tasks'} to tomorrow.`, {
                      label: 'Undo',
                      run: () => update((d) => restoreDueDates(d, previous)),
                    });
                  }}
                >
                  Today feels hard
                </button>
              )}
            </div>
            {today.length ? (
              <TaskList tasks={today} onStart={(task) => startSession({ task })} showDate label="Today’s tasks" />
            ) : (
              <EmptyState title="Nothing planned for today.">Add one small task below, or pick something from what’s coming up.</EmptyState>
            )}
          </section>

          <section className="card" aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="card__title" style={{ marginBottom: '1rem' }}>
              Coming up
            </h2>
            {upcoming.length ? (
              <div className="stack">
                {groupByDate(upcoming).map(([date, tasks]) => (
                  <div key={date}>
                    <h3 className="task-group__heading">{relativeDay(date)}</h3>
                    <TaskList tasks={tasks} onStart={(task) => startSession({ task })} label={`Tasks for ${relativeDay(date)}`} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing planned after today." />
            )}
          </section>

          {earlierDone.length > 0 && (
            <section className="card" aria-labelledby="done-heading">
              <h2 id="done-heading" className="card__title" style={{ marginBottom: '1rem' }}>
                Completed earlier
              </h2>
              <TaskList tasks={earlierDone} showDate collapseDoneAfter={3} label="Completed earlier" />
            </section>
          )}
        </div>

        <div className="stack no-print">
          <section className="card" aria-labelledby="add-task-heading">
            <h2 id="add-task-heading" className="card__title" style={{ marginBottom: '1rem' }}>
              Add a task
            </h2>
            <TaskForm
              submitLabel="Add task"
              onSubmit={(values) => {
                update((d) => addTask(d, values)[0]);
                announce(`Task added for ${relativeDay(values.dueDate).toLowerCase()}: ${values.title}`);
              }}
            />
          </section>
          <SuggestTasks />
        </div>
      </div>
    </>
  );
}
