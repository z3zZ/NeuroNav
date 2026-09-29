import { contextLabel, refValue, search } from '../lib/selectors';
import { relativeDay } from '../lib/dates';
import { useData } from '../state/data';
import type { Route } from '../state/router';
import { EmptyState, PageHeader } from '../components/primitives';

export function SearchScreen({ route }: { route: Route }) {
  const { data } = useData();
  const query = route.query.get('q') ?? '';
  const results = search(data, query);
  const total = results ? results.subjects.length + results.tasks.length + results.notes.length + results.cards.length : 0;

  return (
    <>
      <PageHeader title="Search" intro={query.trim() ? `Results for “${query.trim()}”` : 'Search your subjects, tasks, notes and flashcards.'} />
      <p className="visually-hidden" role="status">
        {results ? `${total} ${total === 1 ? 'result' : 'results'}` : ''}
      </p>
      {!results ? (
        <EmptyState title="Type in the search box to begin.">It looks through everything saved in this browser.</EmptyState>
      ) : total === 0 ? (
        <EmptyState title={`Nothing matches “${query.trim()}”.`}>
          Try a shorter or different word, or browse <a href="#/subjects">Subjects</a> and <a href="#/notes">Notes</a>.
        </EmptyState>
      ) : (
        <div className="stack">
          {results.subjects.length > 0 && (
            <section className="card" aria-labelledby="r-subjects">
              <h2 id="r-subjects" className="card__title search-group__title">
                Subjects ({results.subjects.length})
              </h2>
              <ul className="search-results">
                {results.subjects.map((s) => (
                  <li key={s.id}>
                    <a href={`#/subjects/${s.id}`}>{s.name}</a>
                    {s.topics.length > 0 && <p className="small muted">Topics: {s.topics.map((t) => t.name).join(', ')}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.tasks.length > 0 && (
            <section className="card" aria-labelledby="r-tasks">
              <h2 id="r-tasks" className="card__title search-group__title">
                Tasks ({results.tasks.length})
              </h2>
              <ul className="search-results">
                {results.tasks.map((t) => (
                  <li key={t.id}>
                    <a href={t.subjectId ? `#/subjects/${t.subjectId}` : '#/tasks'}>{t.title}</a>
                    <p className="small muted">
                      {[t.done ? 'Done' : relativeDay(t.dueDate), contextLabel(data, t.subjectId, t.topicId)].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.notes.length > 0 && (
            <section className="card" aria-labelledby="r-notes">
              <h2 id="r-notes" className="card__title search-group__title">
                Notes ({results.notes.length})
              </h2>
              <ul className="search-results">
                {results.notes.map((n) => (
                  <li key={n.id}>
                    <a href={`#/notes/${n.id}`}>{n.title.trim() || 'Untitled note'}</a>
                    <p className="small muted">{contextLabel(data, n.subjectId, n.topicId)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.cards.length > 0 && (
            <section className="card" aria-labelledby="r-cards">
              <h2 id="r-cards" className="card__title search-group__title">
                Flashcards ({results.cards.length})
              </h2>
              <ul className="search-results">
                {results.cards.map((c) => (
                  <li key={c.id}>
                    <a href={`#/flashcards${c.subjectId ? `?deck=${encodeURIComponent(refValue({ subjectId: c.subjectId, topicId: c.topicId }))}` : ''}`}>{c.front}</a>
                    <p className="small muted">{c.back}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
