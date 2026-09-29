import { useEffect, useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { addNote, deleteNote, restoreNote, updateNote } from '../lib/actions';
import { formatShortDate, toISODate, uid } from '../lib/dates';
import { contextLabel, parseRefValue, refValue, topicOptions } from '../lib/selectors';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import { navigate, type Route } from '../state/router';
import { EmptyState, PageHeader } from '../components/primitives';

function excerpt(body: string) {
  const text = body.replace(/\s+/g, ' ').trim();
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

export function NotesScreen({ route }: { route: Route }) {
  const { data, update } = useData();
  const id = useId();
  const [filter, setFilter] = useState('');

  // "Write a note" links arrive as #/notes?new=1&ref=subject|topic.
  useEffect(() => {
    if (route.query.get('new') !== '1') return;
    const ref = parseRefValue(route.query.get('ref') ?? '');
    const noteId = uid();
    update((d) => addNote(d, { id: noteId, subjectId: ref?.subjectId ?? null, topicId: ref?.topicId ?? null })[0]);
    window.history.replaceState(null, '', `#/notes/${noteId}`);
    navigate(`/notes/${noteId}`);
  }, [route, update]);

  const notes = [...data.notes]
    .filter((n) => {
      const ref = parseRefValue(filter);
      if (!ref) return true;
      return n.subjectId === ref.subjectId && (!ref.topicId || n.topicId === ref.topicId);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <PageHeader title="Notes" intro="Write in your own words. Notes save as you type.">
        <a className="btn btn--primary" href={`#/notes?new=1&ref=${encodeURIComponent(filter)}`}>
          <Plus size={18} aria-hidden="true" />
          New note
        </a>
      </PageHeader>
      {data.notes.length > 0 && (
        <div className="field" style={{ maxWidth: '24rem', marginBottom: '1.5rem' }}>
          <label className="label" htmlFor={`${id}-filter`}>
            Show notes for
          </label>
          <select id={`${id}-filter`} className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All subjects</option>
            {topicOptions(data).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {notes.length ? (
        <ul className="note-grid" role="list">
          {notes.map((n) => (
            <li key={n.id} className="note-card">
              <h2 className="note-card__title">
                <a href={`#/notes/${n.id}`}>{n.title.trim() || 'Untitled note'}</a>
              </h2>
              <p className="small muted">
                {[contextLabel(data, n.subjectId, n.topicId), `Edited ${formatShortDate(toISODate(new Date(n.updatedAt)))}`].filter(Boolean).join(' · ')}
              </p>
              {n.body.trim() && <p className="note-card__excerpt">{excerpt(n.body)}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={data.notes.length ? 'No notes for this subject yet.' : 'No notes yet.'}>
          Start with a few lines about one idea. Short is fine.
        </EmptyState>
      )}
    </>
  );
}

export function NoteEditorScreen({ id }: { id: string }) {
  const { data, update, saveStatus } = useData();
  const { notify } = useFeedback();
  const note = data.notes.find((n) => n.id === id);

  if (!note) {
    return (
      <>
        <PageHeader title="Note not found" intro="It may have been deleted." />
        <a className="btn btn--primary" href="#/notes">
          Back to notes
        </a>
      </>
    );
  }

  return (
    <>
      <p className="breadcrumb">
        <a href="#/notes">Notes</a>
      </p>
      <PageHeader title={note.title.trim() || 'Untitled note'}>
        <p className="save-status" aria-live="polite">
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Couldn’t save' : 'Saved'}
        </p>
      </PageHeader>
      <section className="card note-editor" aria-label="Edit note">
        <div className="field">
          <label className="label" htmlFor="note-title">
            Title
          </label>
          <input id="note-title" className="input" value={note.title} onChange={(e) => update((d) => updateNote(d, note.id, { title: e.target.value }))} />
        </div>
        <div className="field">
          <label className="label" htmlFor="note-ref">
            Subject or topic
          </label>
          <select
            id="note-ref"
            className="select"
            value={refValue(note.subjectId ? { subjectId: note.subjectId, topicId: note.topicId } : null)}
            onChange={(e) => {
              const ref = parseRefValue(e.target.value);
              update((d) => updateNote(d, note.id, { subjectId: ref?.subjectId ?? null, topicId: ref?.topicId ?? null }));
            }}
          >
            <option value="">No subject</option>
            {topicOptions(data).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="note-body">
            Note
          </label>
          <textarea
            id="note-body"
            className="textarea note-editor__body"
            value={note.body}
            aria-describedby="note-body-hint"
            onChange={(e) => update((d) => updateNote(d, note.id, { body: e.target.value }))}
          />
          <p id="note-body-hint" className="hint">
            Tip: lines like “Term: meaning” can be turned into flashcards from the Work dashboard.
          </p>
        </div>
        <div className="card__footer button-row" style={{ justifyContent: 'space-between' }}>
          <a href="#/notes">Done</a>
          <button
            type="button"
            className="btn btn--danger btn--small"
            onClick={() => {
              update((d) => deleteNote(d, note.id));
              navigate('/notes');
              notify(`Deleted note: ${note.title.trim() || 'Untitled note'}`, { label: 'Undo', run: () => update((d) => restoreNote(d, note)) });
            }}
          >
            Delete note
          </button>
        </div>
      </section>
    </>
  );
}
