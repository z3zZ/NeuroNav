import { useEffect, useId, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  addSubject,
  addTask,
  addTopic,
  captureLinks,
  deleteSubject,
  deleteTopic,
  renameTopic,
  restoreSubject,
  restoreTopic,
  updateSubject,
} from '../lib/actions';
import { daysUntil, describeExam, isISODate, uid } from '../lib/dates';
import { journeyFor, STAGE_LABELS } from '../lib/selectors';
import { SUBJECT_COLOURS, type Subject, type SubjectColour, type SubjectImageChoice } from '../lib/types';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import { navigate, type Route } from '../state/router';
import { useStartSession } from '../components/FocusTimer';
import { ChoiceGroup, ConfirmDialog, EmptyState, PageHeader } from '../components/primitives';
import { SubjectCard } from '../components/SubjectCard';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { SubjectPicker } from '../components/SubjectPicker';
import { UKDateInput } from '../components/UKDateInput';

const COLOUR_NAMES: Record<SubjectColour, string> = {
  forest: 'Forest green',
  sage: 'Sage',
  cream: 'Cream',
  taupe: 'Taupe',
  slate: 'Slate',
  clay: 'Clay',
};

type SubjectDraft = Pick<Subject, 'name' | 'examDate' | 'difficulty' | 'energyDrain' | 'image' | 'colour'>;

function SubjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: SubjectDraft;
  submitLabel: string;
  onSubmit: (s: SubjectDraft) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<SubjectDraft>(
    initial ?? { name: '', examDate: '', difficulty: 'moderate', energyDrain: 'medium', image: 'auto', colour: 'forest' },
  );
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  const set =
    <K extends keyof SubjectDraft>(key: K) =>
    (value: SubjectDraft[K]) =>
      setDraft((d) => ({ ...d, [key]: value }));

  return (
    <form
      className="stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.name.trim()) {
          setError('Choose a subject or enter a custom name.');
          (document.getElementById(`${id}-name-custom`) ?? document.getElementById(`${id}-name`))?.focus();
          return;
        }
        if (draft.examDate && !isISODate(draft.examDate)) {
          setDateError('Enter a real date as DD/MM/YYYY, or leave it blank.');
          window.setTimeout(() => document.getElementById(`${id}-exam`)?.focus(), 0);
          return;
        }
        setDateError('');
        setError('');
        onSubmit({ ...draft, name: draft.name.trim() });
      }}
    >
      <SubjectPicker
        id={`${id}-name`}
        value={draft.name}
        onChange={(name) => setDraft((d) => ({ ...d, name, image: 'auto' }))}
        error={error}
      />
      <p className="hint">The subject picture is chosen automatically. Other subjects use a colour and pattern.</p>
      <details className="optional-details" open={dateError ? true : undefined}>
        <summary>Exam date and preferences (optional)</summary>
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor={`${id}-exam`}>
              Exam date (DD/MM/YYYY) <span className="muted">(optional)</span>
            </label>
            <UKDateInput
              id={`${id}-exam`}
              className="input"
              value={draft.examDate}
              onChange={set('examDate')}
              aria-invalid={!!dateError}
              aria-describedby={dateError ? `${id}-date-error` : undefined}
            />
            {dateError && (
              <p id={`${id}-date-error`} className="error-text" role="alert">
                {dateError}
              </p>
            )}
          </div>
          <ChoiceGroup
            legend="How challenging is it for you?"
            name="difficulty"
            value={draft.difficulty}
            onChange={set('difficulty')}
            options={[
              { value: 'easy', label: 'Easier' },
              { value: 'moderate', label: 'Medium' },
              { value: 'challenging', label: 'Harder' },
            ]}
          />
          <ChoiceGroup
            legend="How much energy does it take?"
            name="energy"
            value={draft.energyDrain}
            onChange={set('energyDrain')}
            options={[
              { value: 'low', label: 'Light' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'Draining' },
            ]}
          />
          <div className="task-form__row">
            <div className="field">
              <label className="label" htmlFor={`${id}-image`}>
                Card picture
              </label>
              <select
                id={`${id}-image`}
                className="select"
                value={draft.image}
                onChange={(e) => set('image')(e.target.value as SubjectImageChoice)}
              >
                <option value="auto">Choose from the name</option>
                <option value="computing">Computing: keyboard and circuit</option>
                <option value="biology">Biology: fern</option>
                <option value="maths">Maths: geometry tools</option>
                <option value="history">History: archive papers</option>
                <option value="none">No photo, colour only</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor={`${id}-colour`}>
                Card colour
              </label>
              <select
                id={`${id}-colour`}
                className="select"
                value={draft.colour}
                onChange={(e) => set('colour')(e.target.value as SubjectColour)}
              >
                {SUBJECT_COLOURS.map((c) => (
                  <option key={c} value={c}>
                    {COLOUR_NAMES[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>
      <div className="button-row">
        <button type="submit" className="btn btn--primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function SubjectsScreen({ route }: { route: Route }) {
  const { data, update } = useData();
  const { announce } = useFeedback();
  const [adding, setAdding] = useState(route.query.get('new') === '1');
  useEffect(() => {
    if (route.query.get('new') === '1') setAdding(true);
  }, [route]);

  const subjects = [...data.subjects].sort((a, b) => (daysUntil(a.examDate) ?? 9999) - (daysUntil(b.examDate) ?? 9999));

  return (
    <>
      <PageHeader title="Subjects" intro="Open a subject to add topics, tasks and notes.">
        {!adding && (
          <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" />
            Add subject
          </button>
        )}
      </PageHeader>
      {adding && (
        <section className="card" aria-labelledby="add-subject-heading" style={{ marginBottom: '1.5rem', maxWidth: '44rem' }}>
          <h2 id="add-subject-heading" className="card__title" style={{ marginBottom: '1rem' }}>
            Add a subject
          </h2>
          <SubjectForm
            submitLabel="Add subject"
            onCancel={() => setAdding(false)}
            onSubmit={(draft) => {
              const newId = uid();
              update((d) => addSubject(d, { ...draft, id: newId })[0]);
              setAdding(false);
              announce(`${draft.name} added.`);
              navigate(`/subjects/${newId}`);
            }}
          />
        </section>
      )}
      {subjects.length ? (
        <ul className="subject-grid subject-grid--page" role="list">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} headingLevel={2} />
          ))}
        </ul>
      ) : (
        !adding && <EmptyState title="No subjects yet.">Add the first thing you’re revising. You can add topics inside it.</EmptyState>
      )}
    </>
  );
}

export function SubjectDetailScreen({ id }: { id: string }) {
  const { data, update } = useData();
  const { notify, announce } = useFeedback();
  const startSession = useStartSession();
  const subject = data.subjects.find((s) => s.id === id);
  const [editing, setEditing] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [topicError, setTopicError] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  if (!subject) {
    return (
      <>
        <PageHeader title="Subject not found" intro="It may have been deleted." />
        <a className="btn btn--primary" href="#/subjects">
          Back to subjects
        </a>
      </>
    );
  }

  const tasks = data.tasks
    .filter((t) => t.subjectId === subject.id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.order - b.order);

  return (
    <>
      <p className="breadcrumb">
        <a href="#/subjects">Subjects</a>
      </p>
      <PageHeader title={subject.name} intro={describeExam(subject.examDate)}>
        <div className="button-row">
          <a className="btn btn--primary" href={`#/work?plan=1&ref=${encodeURIComponent(`${subject.id}|`)}`}>
            Plan a small task
          </a>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => startSession({ ref: { subjectId: subject.id, topicId: null } })}
          >
            Start studying
          </button>
          <button type="button" className="btn btn--secondary" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
            Edit subject
          </button>
        </div>
      </PageHeader>

      {editing && (
        <section className="card" aria-labelledby="edit-subject-heading" style={{ marginBottom: '1.5rem', maxWidth: '44rem' }}>
          <h2 id="edit-subject-heading" className="card__title" style={{ marginBottom: '1rem' }}>
            Edit {subject.name}
          </h2>
          <SubjectForm
            initial={subject}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={(draft) => {
              update((d) => updateSubject(d, subject.id, draft));
              setEditing(false);
              announce('Subject saved.');
            }}
          />
          <div className="card__footer">
            <button type="button" className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
              Delete subject
            </button>
          </div>
        </section>
      )}

      <div className="detail-grid">
        <section className="card" aria-labelledby="topics-heading">
          <h2 id="topics-heading" className="card__title" style={{ marginBottom: '0.25rem' }}>
            Topics
          </h2>
          <p className="hint" style={{ marginBottom: '1rem' }}>
            Smaller parts of the subject, like “SQL joins”. Each has its own study journey.
          </p>
          {subject.topics.length ? (
            <ul className="topic-list">
              {subject.topics.map((t) => {
                const journey = journeyFor(data, { subjectId: subject.id, topicId: t.id });
                return (
                  <li key={t.id} className="topic-row">
                    {renaming?.id === t.id ? (
                      <form
                        className="topic-row__rename"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!renaming.name.trim()) return;
                          update((d) => renameTopic(d, subject.id, t.id, renaming.name));
                          setRenaming(null);
                          announce('Topic renamed.');
                        }}
                      >
                        <label className="visually-hidden" htmlFor={`rename-${t.id}`}>
                          New name for {t.name}
                        </label>
                        <input
                          id={`rename-${t.id}`}
                          className="input"
                          value={renaming.name}
                          onChange={(e) => setRenaming({ id: t.id, name: e.target.value })}
                          autoFocus
                        />
                        <button type="submit" className="btn btn--primary btn--small">
                          Save
                        </button>
                        <button type="button" className="btn btn--secondary btn--small" onClick={() => setRenaming(null)}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <div>
                          <p className="topic-row__name">{t.name}</p>
                          <p className="small muted">
                            {journey.current ? `Next stage: ${STAGE_LABELS[journey.current]}` : 'All stages done'} · {journey.completed} of
                            5 stages
                          </p>
                        </div>
                        <div className="button-row" style={{ gap: '0.25rem' }}>
                          <a
                            className="btn btn--secondary btn--small"
                            href={`#/work?plan=1&ref=${encodeURIComponent(`${subject.id}|${t.id}`)}`}
                          >
                            Plan task<span className="visually-hidden"> for {t.name}</span>
                          </a>
                          <button
                            type="button"
                            className="btn btn--secondary btn--small"
                            onClick={() => startSession({ ref: { subjectId: subject.id, topicId: t.id } })}
                          >
                            Start<span className="visually-hidden"> {t.name}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => setRenaming({ id: t.id, name: t.name })}
                          >
                            Rename<span className="visually-hidden"> {t.name}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => {
                              const links = captureLinks(data, (x) => x.topicId === t.id);
                              const index = subject.topics.indexOf(t);
                              update((d) => deleteTopic(d, subject.id, t.id));
                              notify(`Deleted topic: ${t.name}`, {
                                label: 'Undo',
                                run: () => update((d) => restoreTopic(d, subject.id, t, index, links)),
                              });
                            }}
                          >
                            Delete<span className="visually-hidden"> {t.name}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No topics yet.">Add one to break this subject into manageable parts.</EmptyState>
          )}
          <form
            className="inline-add"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!topicName.trim()) {
                setTopicError('Enter a topic name.');
                return;
              }
              update((d) => addTopic(d, subject.id, topicName));
              announce(`Topic added: ${topicName.trim()}`);
              setTopicName('');
              setTopicError('');
            }}
          >
            <div className="field">
              <label className="label" htmlFor="new-topic">
                New topic
              </label>
              <div className="inline-add__row">
                <input
                  id="new-topic"
                  className="input"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  aria-invalid={topicError ? true : undefined}
                  aria-describedby={topicError ? 'new-topic-error' : undefined}
                />
                <button type="submit" className="btn btn--secondary">
                  Add topic
                </button>
              </div>
              {topicError && (
                <p id="new-topic-error" className="error-text">
                  {topicError}
                </p>
              )}
            </div>
          </form>
        </section>

        <section className="card" aria-labelledby="subject-tasks-heading">
          <div className="card__header">
            <h2 id="subject-tasks-heading" className="card__title">
              Tasks
            </h2>
            {!addingTask && (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setAddingTask(true)}>
                <Plus size={16} aria-hidden="true" />
                Add task
              </button>
            )}
          </div>
          {addingTask && (
            <div style={{ marginBottom: '1rem' }}>
              <TaskForm
                compact
                submitLabel="Add task"
                defaultRef={{ subjectId: subject.id, topicId: null }}
                onCancel={() => setAddingTask(false)}
                onSubmit={(values) => {
                  update((d) => addTask(d, values)[0]);
                  announce(`Task added: ${values.title}`);
                }}
              />
            </div>
          )}
          {tasks.length ? (
            <TaskList
              tasks={tasks}
              onStart={(task) => startSession({ task })}
              showDate
              collapseDoneAfter={2}
              label={`${subject.name} tasks`}
            />
          ) : (
            !addingTask && <EmptyState title="No tasks for this subject yet." />
          )}
        </section>

        <section className="card" aria-labelledby="materials-heading">
          <h2 id="materials-heading" className="card__title" style={{ marginBottom: '1rem' }}>
            Notes and flashcards
          </h2>
          <ul className="materials-list">
            <li>
              <a href={`#/notes?new=1&ref=${encodeURIComponent(`${subject.id}|`)}`}>Write a note</a>
              <span className="muted small"> · {data.notes.filter((n) => n.subjectId === subject.id).length} saved</span>
            </li>
            <li>
              <a href={`#/flashcards?deck=${encodeURIComponent(`${subject.id}|`)}`}>Open flashcards</a>
              <span className="muted small"> · {data.flashcards.filter((c) => c.subjectId === subject.id).length} cards</span>
            </li>
            <li>
              <a href="#/journey">See the study journey</a>
            </li>
          </ul>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${subject.name}?`}
        body={<p>Its tasks, notes and flashcards will be kept, but they won’t belong to a subject any more.</p>}
        confirmLabel="Delete subject"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          const links = captureLinks(data, (x) => x.subjectId === subject.id);
          const index = data.subjects.indexOf(subject);
          setConfirmDelete(false);
          update((d) => deleteSubject(d, subject.id));
          navigate('/subjects');
          notify(`Deleted subject: ${subject.name}`, {
            label: 'Undo',
            run: () => update((d) => restoreSubject(d, subject, index, links)),
          });
        }}
      />
    </>
  );
}
