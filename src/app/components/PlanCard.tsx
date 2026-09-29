import { useState } from 'react';
import { Plus } from 'lucide-react';
import { addTask, lightenToday, restoreDueDates } from '../lib/actions';
import { openTasksForToday, todaysTasks } from '../lib/selectors';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import { useStartSession } from './FocusTimer';
import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';

/** Today's plan: a short list, add task, and the "today feels hard" option. */
export function PlanCard() {
  const { data, update } = useData();
  const { notify, announce } = useFeedback();
  const startSession = useStartSession();
  const [adding, setAdding] = useState(false);
  const tasks = todaysTasks(data);
  const open = openTasksForToday(data);
  const done = tasks.filter((t) => t.done).length;

  const lighten = () => {
    const previous = Object.fromEntries(open.map((t) => [t.id, t.dueDate]));
    const { data: next, moved } = lightenToday(data, open.map((t) => t.id));
    update(() => next);
    notify(
      moved.length ? `Moved ${moved.length} ${moved.length === 1 ? 'task' : 'tasks'} to tomorrow. Just one thing left for today.` : 'Only one task today already.',
      moved.length ? { label: 'Undo', run: () => update((d) => restoreDueDates(d, previous)) } : undefined,
    );
  };

  return (
    <section className="card area-plan" aria-labelledby="plan-heading">
      <div className="card__header">
        <h2 id="plan-heading" className="card__title">
          Today’s plan
        </h2>
        {tasks.length > 0 && (
          <span className="muted small">
            {done} of {tasks.length} done
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">Nothing planned for today.</p>
          <p className="muted">Choose a topic above to make your first small task, or add your own below.</p>

        </div>
      ) : (
        <TaskList tasks={tasks} onStart={(task) => startSession({ task })} collapseDoneAfter={0} label="Today’s tasks" />
      )}

      <div className="plan-card__add">
        {adding ? (
          <TaskForm
            compact
            submitLabel="Add task"
            onCancel={() => setAdding(false)}
            onSubmit={(values) => {
              update((d) => addTask(d, values)[0]);
              announce(`Task added: ${values.title}`);
            }}
          />
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" />
            Add task
          </button>
        )}
      </div>

      <div className="card__footer button-row" style={{ justifyContent: 'space-between' }}>
        <a href="#/tasks">All tasks</a>
        {open.length > 1 && (
          <button type="button" className="btn btn--ghost btn--small" onClick={lighten}>
            Today feels hard
          </button>
        )}
      </div>
    </section>
  );
}
