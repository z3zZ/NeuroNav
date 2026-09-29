import { useState } from 'react';
import { ChevronDown, ChevronRight, Play } from 'lucide-react';
import { deferTask, deleteTask, moveTask, restoreTask, setTaskDone, toggleStep, updateTask } from '../lib/actions';
import { relativeDay, todayISO } from '../lib/dates';
import { contextLabel } from '../lib/selectors';
import type { Task } from '../lib/types';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import { ActionMenu, MenuItem } from './primitives';
import { TaskForm } from './TaskForm';

function TaskRow({
  task,
  siblings,
  onStart,
  showDate,
}: {
  task: Task;
  siblings: string[];
  onStart?: (task: Task) => void;
  showDate: boolean;
}) {
  const { data, update } = useData();
  const { notify, announce } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const label = contextLabel(data, task.subjectId, task.topicId);
  const stepsDone = task.steps.filter((s) => s.done).length;
  const index = siblings.indexOf(task.id);
  const checkboxId = `task-${task.id}`;

  if (editing) {
    return (
      <li className="task-row task-row--editing">
        <TaskForm
          initial={task}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={(values) => {
            update((d) => updateTask(d, task.id, values));
            setEditing(false);
            announce('Task saved.');
          }}
        />
      </li>
    );
  }

  const toggleDone = () => {
    const next = !task.done;
    update((d) => setTaskDone(d, task.id, next));
    if (next) notify(`Done: ${task.title}`, { label: 'Undo', run: () => update((d) => setTaskDone(d, task.id, false)) });
  };

  return (
    <li className={`task-row${task.done ? ' task-row--done' : ''}`}>
      <div className="task-row__main">
        <input id={checkboxId} type="checkbox" className="check-input task-row__check" checked={task.done} onChange={toggleDone} />
        <div className="task-row__text">
          <label htmlFor={checkboxId} className="task-row__title">
            {task.title}
          </label>
          <p className="task-row__meta">
            <span>{task.durationMin} min</span>
            {label && <span>{label}</span>}
            {showDate && <span>{task.dueDate < todayISO() && !task.done ? `From ${relativeDay(task.dueDate)}` : relativeDay(task.dueDate)}</span>}
            {task.steps.length > 0 && (
              <span>
                {stepsDone} of {task.steps.length} steps
              </span>
            )}
          </p>
        </div>
        <div className="task-row__actions">
          {onStart && !task.done && (
            <button type="button" className="btn btn--secondary btn--small" onClick={() => onStart(task)}>
              <Play size={16} aria-hidden="true" />
              Start<span className="visually-hidden">: {task.title}</span>
            </button>
          )}
          <ActionMenu label="Options">
            {(close) => (
              <>
                <MenuItem
                  onSelect={() => {
                    close();
                    setEditing(true);
                  }}
                >
                  Edit
                </MenuItem>
                {index > 0 && (
                  <MenuItem
                    onSelect={() => {
                      update((d) => moveTask(d, siblings, task.id, -1));
                      announce('Moved up.');
                      close();
                    }}
                  >
                    Move up
                  </MenuItem>
                )}
                {index >= 0 && index < siblings.length - 1 && (
                  <MenuItem
                    onSelect={() => {
                      update((d) => moveTask(d, siblings, task.id, 1));
                      announce('Moved down.');
                      close();
                    }}
                  >
                    Move down
                  </MenuItem>
                )}
                {!task.done && (
                  <MenuItem
                    onSelect={() => {
                      const previous = task.dueDate;
                      update((d) => deferTask(d, task.id, 1));
                      notify(`Moved to tomorrow: ${task.title}`, {
                        label: 'Undo',
                        run: () => update((d) => updateTask(d, task.id, { dueDate: previous })),
                      });
                      close();
                    }}
                  >
                    Move to tomorrow
                  </MenuItem>
                )}
                <MenuItem
                  danger
                  onSelect={() => {
                    update((d) => deleteTask(d, task.id));
                    notify(`Deleted: ${task.title}`, { label: 'Undo', run: () => update((d) => restoreTask(d, task)) });
                    close();
                  }}
                >
                  Delete
                </MenuItem>
              </>
            )}
          </ActionMenu>
        </div>
      </div>
      {task.steps.length > 0 && (
        <div className="task-row__steps">
          <button type="button" className="disclosure" aria-expanded={stepsOpen} onClick={() => setStepsOpen((o) => !o)}>
            {stepsOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
            {stepsOpen ? 'Hide steps' : 'Show steps'}
            <span className="visually-hidden"> for {task.title}</span>
          </button>
          {stepsOpen && (
            <ul className="step-list">
              {task.steps.map((s) => (
                <li key={s.id}>
                  <label className="checkbox">
                    <input type="checkbox" checked={s.done} onChange={() => update((d) => toggleStep(d, task.id, s.id))} />
                    <span className={s.done ? 'step--done' : undefined}>{s.text}</span>
                  </label>
                </li>
              ))}
              <li className="hint">You don’t have to do every step. Pick what feels manageable.</li>
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * A list of tasks with completed ones collapsed below. Ordering actions
 * apply within the open tasks shown.
 */
export function TaskList({
  tasks,
  onStart,
  showDate = false,
  collapseDoneAfter = 0,
  label,
}: {
  tasks: Task[];
  onStart?: (task: Task) => void;
  showDate?: boolean;
  collapseDoneAfter?: number;
  label: string;
}) {
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const openIds = open.map((t) => t.id);
  const collapse = done.length > collapseDoneAfter;

  return (
    <div className="task-list">
      {open.length > 0 && (
        <ul className="task-rows" aria-label={label}>
          {open.map((t) => (
            <TaskRow key={t.id} task={t} siblings={openIds} onStart={onStart} showDate={showDate} />
          ))}
        </ul>
      )}
      {done.length > 0 &&
        (collapse ? (
          <div className="task-list__done">
            <button type="button" className="disclosure" aria-expanded={showDone} onClick={() => setShowDone((s) => !s)}>
              {showDone ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
              Completed ({done.length})
            </button>
            {showDone && (
              <ul className="task-rows" aria-label={`Completed: ${label}`}>
                {done.map((t) => (
                  <TaskRow key={t.id} task={t} siblings={[]} showDate={showDate} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <ul className="task-rows" aria-label={`Completed: ${label}`}>
            {done.map((t) => (
              <TaskRow key={t.id} task={t} siblings={[]} showDate={showDate} />
            ))}
          </ul>
        ))}
    </div>
  );
}
