import { useId, useRef, useState } from 'react';
import { BookOpen, HelpCircle, Layers, ListTree, Plus, X } from 'lucide-react';
import { addCards, addNote, addTask, recordPractice, setSteps } from '../lib/actions';
import { todayISO } from '../lib/dates';
import { sessionMinutes } from '../lib/plan';
import { contextLabel, openTasksForToday, parseRefValue, topicOptions } from '../lib/selectors';
import { localProvider, ToolInputError, type ToolId, type ToolResult } from '../lib/tools';
import { useData } from '../state/data';
import { useDraft } from '../state/drafts';
import { useFeedback } from '../state/feedback';
import { PracticeRunner } from '../screens/FlashcardsScreen';

const TOOLS: { id: ToolId; label: string; icon: typeof ListTree; needs: string }[] = [
  { id: 'breakdown', label: 'Break this down', icon: ListTree, needs: 'a task, topic or text' },
  { id: 'quiz', label: 'Quiz me', icon: HelpCircle, needs: 'a topic with flashcards, or text' },
  { id: 'explain', label: 'Explain differently', icon: BookOpen, needs: 'some text' },
  { id: 'flashcards', label: 'Turn into flashcards', icon: Layers, needs: 'some text' },
];

type Status = { state: 'idle' } | { state: 'loading'; tool: ToolId } | { state: 'error'; tool: ToolId; message: string } | { state: 'result'; result: ToolResult };

function EditableList({ items, onChange, label }: { items: string[]; onChange: (items: string[]) => void; label: string }) {
  return (
    <ol className="editable-list">
      {items.map((item, i) => (
        <li key={i}>
          <label className="visually-hidden" htmlFor={`edit-${label}-${i}`}>
            {label} {i + 1}
          </label>
          <input id={`edit-${label}-${i}`} className="input" value={item} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X size={18} aria-hidden="true" />
            <span className="visually-hidden">
              Remove {label.toLowerCase()} {i + 1}
            </span>
          </button>
        </li>
      ))}
      <li>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => onChange([...items, ''])}>
          <Plus size={16} aria-hidden="true" />
          Add {label.toLowerCase()}
        </button>
      </li>
    </ol>
  );
}

function EditablePairs({ pairs, onChange, labels }: { pairs: { a: string; b: string }[]; onChange: (p: { a: string; b: string }[]) => void; labels: [string, string] }) {
  return (
    <ol className="pair-list">
      {pairs.map((p, i) => (
        <li key={i} className="pair-list__item">
          <div className="field">
            <label className="label small" htmlFor={`pair-a-${i}`}>
              {labels[0]} {i + 1}
            </label>
            <input id={`pair-a-${i}`} className="input" value={p.a} onChange={(e) => onChange(pairs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
          </div>
          <div className="field">
            <label className="label small" htmlFor={`pair-b-${i}`}>
              {labels[1]} {i + 1}
            </label>
            <input id={`pair-b-${i}`} className="input" value={p.b} onChange={(e) => onChange(pairs.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))} />
          </div>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => onChange(pairs.filter((_, j) => j !== i))}>
            Remove<span className="visually-hidden"> item {i + 1}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function QuickActions() {
  const { data, update } = useData();
  const { notify, announce } = useFeedback();
  const id = useId();
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [target, setTarget] = useDraft('quick-target', '');
  const [noteId, setNoteId] = useDraft('quick-note', '');
  const [text, setText] = useDraft('quick-text', '');
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [steps, setStepsDraft] = useState<string[]>([]);
  const [pairs, setPairs] = useState<{ a: string; b: string }[]>([]);
  const [practising, setPractising] = useState(false);
  const [confirmSteps, setConfirmSteps] = useState(false);

  const task = target.startsWith('task:') ? data.tasks.find((t) => t.id === target.slice(5)) : undefined;
  const ref = task ? (task.subjectId ? { subjectId: task.subjectId, topicId: task.topicId } : null) : target.startsWith('ref:') ? parseRefValue(target.slice(4)) : null;
  const note = data.notes.find((n) => n.id === noteId);
  const sourceText = [note?.body ?? '', text].filter((t) => t.trim()).join('\n\n');
  const title = task?.title ?? (ref ? contextLabel(data, ref.subjectId, ref.topicId) : '');
  const cards = ref ? data.flashcards.filter((c) => c.subjectId === ref.subjectId && (!ref.topicId || c.topicId === ref.topicId)) : [];

  const run = async (tool: ToolId) => {
    setStatus({ state: 'loading', tool });
    setPractising(false);
    setConfirmSteps(false);
    try {
      const result = await localProvider.run(tool, {
        title,
        minutes: task?.durationMin ?? sessionMinutes(data.profile.sessionLength),
        text: sourceText,
        cards: cards.map((c) => ({ front: c.front, back: c.back })),
      });
      if (result.tool === 'breakdown') setStepsDraft(result.steps);
      if (result.tool === 'flashcards') setPairs(result.cards.map((c) => ({ a: c.front, b: c.back })));
      if (result.tool === 'quiz') setPairs(result.questions.map((q) => ({ a: q.question, b: q.answer })));
      setStatus({ state: 'result', result });
      announce(`${TOOLS.find((t) => t.id === tool)?.label}: result ready to review.`);
      window.setTimeout(() => resultHeading.current?.focus(), 0);
    } catch (e) {
      const message = e instanceof ToolInputError ? e.message : 'Something went wrong while preparing this. Your text is unchanged; try again.';
      setStatus({ state: 'error', tool, message });
      announce(message, 'assertive');
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify('Copied to clipboard.');
    } catch {
      notify('Couldn’t copy. Select the text and copy it instead.');
    }
  };

  const saveSteps = (mode: 'replace' | 'append') => {
    const clean = steps.filter((s) => s.trim());
    if (task) {
      update((d) => setSteps(d, task.id, clean, mode));
      notify(`Steps ${mode === 'replace' ? 'replaced' : 'added'} on “${task.title}”.`);
    } else {
      update((d) =>
        addTask(d, {
          title: title ? `Work through ${title}` : 'Work through my notes',
          subjectId: ref?.subjectId ?? null,
          topicId: ref?.topicId ?? null,
          durationMin: sessionMinutes(data.profile.sessionLength),
          dueDate: todayISO(),
          steps: clean,
        })[0],
      );
      notify('Saved as a new task for today.');
    }
    setConfirmSteps(false);
    setStatus({ state: 'idle' });
  };

  const result = status.state === 'result' ? status.result : null;
  const toolLabel = result ? TOOLS.find((t) => t.id === result.tool)?.label : '';
  const deckName = ref ? contextLabel(data, ref.subjectId, ref.topicId) : 'no subject';

  return (
    <section className="card area-tools" aria-labelledby="tools-heading">
      <div className="card__header">
        <h2 id="tools-heading" className="card__title">
          Quick actions
        </h2>
      </div>

      <div className="tools-context">
        <div className="field">
          <label className="label" htmlFor={`${id}-target`}>
            Task or topic
          </label>
          <select id={`${id}-target`} className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">None selected</option>
            {openTasksForToday(data).length > 0 && (
              <optgroup label="Today’s tasks">
                {openTasksForToday(data).map((t) => (
                  <option key={t.id} value={`task:${t.id}`}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            )}
            {data.subjects.length > 0 && (
              <optgroup label="Subjects and topics">
                {topicOptions(data).map((o) => (
                  <option key={o.value} value={`ref:${o.value}`}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {data.notes.length > 0 && (
          <div className="field">
            <label className="label" htmlFor={`${id}-note`}>
              Use a saved note
            </label>
            <select id={`${id}-note`} className="select" value={noteId} onChange={(e) => setNoteId(e.target.value)}>
              <option value="">No note</option>
              {data.notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title.trim() || 'Untitled note'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="field" style={{ marginTop: '1rem' }}>
        <label className="label" htmlFor={`${id}-text`}>
          Or paste text <span className="muted">(kept if you refresh)</span>
        </label>
        <textarea id={`${id}-text`} className="textarea" style={{ minHeight: '6rem' }} value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <div className="tool-buttons" role="group" aria-label="Quick actions">
        {TOOLS.map(({ id: toolId, label, icon: Icon, needs }) => (
          <button
            key={toolId}
            type="button"
            className="tool-button"
            aria-describedby={`${id}-${toolId}-needs`}
            onClick={() => run(toolId)}
            disabled={status.state === 'loading'}
          >
            <Icon size={20} aria-hidden="true" />
            <span className="tool-button__label">{label}</span>
            <span id={`${id}-${toolId}-needs`} className="tool-button__needs">
              Needs {needs}
            </span>
          </button>
        ))}
      </div>

      {status.state === 'loading' && (
        <p className="muted" role="status" style={{ marginTop: '1rem' }}>
          Working on it…
        </p>
      )}

      {status.state === 'error' && (
        <div className="notice notice--error" style={{ marginTop: '1rem' }}>
          <div className="notice__body">
            <p className="notice__title">{TOOLS.find((t) => t.id === status.tool)?.label} needs a little more.</p>
            <p>{status.message}</p>
          </div>
          <button type="button" className="btn btn--secondary btn--small" onClick={() => run(status.tool)}>
            Try again
          </button>
        </div>
      )}

      {result && (
        <div className="tool-result">
          <div className="card__header" style={{ marginBottom: '0.5rem' }}>
            <h3 ref={resultHeading} tabIndex={-1} className="tool-result__title">
              {toolLabel}
            </h3>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setStatus({ state: 'idle' })}>
              Close<span className="visually-hidden"> result</span>
            </button>
          </div>
          <p className="hint" style={{ marginBottom: '1rem' }}>
            {localProvider.disclosure} Edit anything before saving.
          </p>

          {result.tool === 'breakdown' && (
            <>
              <EditableList items={steps} onChange={setStepsDraft} label="Step" />
              <div className="button-row" style={{ marginTop: '1rem' }}>
                {task && task.steps.length > 0 && !confirmSteps ? (
                  <button type="button" className="btn btn--primary" onClick={() => setConfirmSteps(true)}>
                    Save to “{task.title}”
                  </button>
                ) : (
                  !confirmSteps && (
                    <button type="button" className="btn btn--primary" onClick={() => saveSteps('replace')}>
                      {task ? `Save to “${task.title}”` : 'Save as a new task'}
                    </button>
                  )
                )}
                <button type="button" className="btn btn--secondary" onClick={() => copy(steps.join('\n'))}>
                  Copy
                </button>
              </div>
              {confirmSteps && task && (
                <div className="notice" style={{ marginTop: '1rem' }}>
                  <div className="notice__body">
                    <p className="notice__title">“{task.title}” already has {task.steps.length} steps.</p>
                    <div className="button-row" style={{ marginTop: '0.5rem' }}>
                      <button type="button" className="btn btn--primary btn--small" onClick={() => saveSteps('append')}>
                        Add to existing steps
                      </button>
                      <button type="button" className="btn btn--secondary btn--small" onClick={() => saveSteps('replace')}>
                        Replace them
                      </button>
                      <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirmSteps(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {result.tool === 'flashcards' && (
            <>
              <EditablePairs pairs={pairs} onChange={setPairs} labels={['Front', 'Back']} />
              <div className="button-row" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!pairs.some((p) => p.a.trim())}
                  onClick={() => {
                    const list = pairs.filter((p) => p.a.trim()).map((p) => ({ front: p.a, back: p.b }));
                    update((d) => addCards(d, list, { subjectId: ref?.subjectId ?? null, topicId: ref?.topicId ?? null }));
                    notify(`${list.length} ${list.length === 1 ? 'card' : 'cards'} added to ${deckName}.`);
                    setStatus({ state: 'idle' });
                  }}
                >
                  Save {pairs.filter((p) => p.a.trim()).length} cards to {deckName}
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => copy(pairs.map((p) => `${p.a}: ${p.b}`).join('\n'))}>
                  Copy
                </button>
              </div>
            </>
          )}

          {result.tool === 'quiz' &&
            (practising ? (
              <PracticeRunner
                title="Question"
                items={pairs.filter((p) => p.a.trim()).map((p, i) => ({ id: String(i), question: p.a, answer: p.b }))}
                onFinish={(correct, total) => {
                  update((d) => recordPractice(d, { subjectId: ref?.subjectId ?? null, topicId: ref?.topicId ?? null, kind: 'quiz', correct, total }));
                  announce(`Quiz finished. You knew ${correct} of ${total}.`);
                }}
              />
            ) : (
              <>
                <EditablePairs pairs={pairs} onChange={setPairs} labels={['Question', 'Answer']} />
                <div className="button-row" style={{ marginTop: '1rem' }}>
                  <button type="button" className="btn btn--primary" disabled={!pairs.length} onClick={() => setPractising(true)}>
                    Start quiz
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => {
                      const list = pairs.filter((p) => p.a.trim()).map((p) => ({ front: p.a, back: p.b }));
                      update((d) => addCards(d, list, { subjectId: ref?.subjectId ?? null, topicId: ref?.topicId ?? null }));
                      notify(`${list.length} questions saved as flashcards.`);
                    }}
                  >
                    Save as flashcards
                  </button>
                </div>
              </>
            ))}

          {result.tool === 'explain' && (
            <>
              <p className="label">In short</p>
              <p style={{ marginBottom: '0.75rem' }}>{result.summary}</p>
              <p className="label">One idea per line</p>
              <ul className="explain-points">
                {result.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              {result.terms.length > 0 && (
                <p style={{ marginTop: '0.75rem' }}>
                  <span className="label">Words that come up most: </span>
                  {result.terms.join(', ')}
                </p>
              )}
              <div className="button-row" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    update(
                      (d) =>
                        addNote(d, {
                          title: `${title || note?.title || 'Notes'}: one idea per line`,
                          body: [`In short: ${result.summary}`, '', ...result.points.map((p) => `- ${p}`)].join('\n'),
                          subjectId: ref?.subjectId ?? note?.subjectId ?? null,
                          topicId: ref?.topicId ?? note?.topicId ?? null,
                        })[0],
                    );
                    notify('Saved as a new note.');
                  }}
                >
                  Save as a note
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => copy(result.points.join('\n'))}>
                  Copy
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
