import { useId, useRef, useState } from 'react';
import { addCards, deleteCard, recordPractice, restoreCard, reviewCard, updateCard } from '../lib/actions';
import { relativeDay, todayISO } from '../lib/dates';
import { contextLabel, parseRefValue, topicOptions } from '../lib/selectors';
import type { Flashcard, TopicRef } from '../lib/types';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import type { Route } from '../state/router';
import { EmptyState, PageHeader } from '../components/primitives';

const inDeck = (ref: TopicRef | null) => (c: Flashcard) =>
  !ref || (c.subjectId === ref.subjectId && (!ref.topicId || c.topicId === ref.topicId));

/** Shared self-check runner for flashcards and quick-action quizzes. */
export function PracticeRunner({
  items,
  onAnswer,
  onFinish,
  title,
}: {
  items: { id: string; question: string; answer: string }[];
  onAnswer?: (id: string, gotIt: boolean) => void;
  onFinish: (correct: number, total: number) => void;
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const item = items[index];

  const answer = (gotIt: boolean) => {
    onAnswer?.(item.id, gotIt);
    const nextCorrect = correct + (gotIt ? 1 : 0);
    setCorrect(nextCorrect);
    if (index + 1 >= items.length) {
      setFinished(true);
      onFinish(nextCorrect, items.length);
      window.setTimeout(() => heading.current?.focus(), 0);
    } else {
      setIndex(index + 1);
      setRevealed(false);
      window.setTimeout(() => heading.current?.focus(), 0);
    }
  };

  if (finished) {
    return (
      <div className="practice" role="group" aria-labelledby="practice-heading">
        <h3 id="practice-heading" ref={heading} tabIndex={-1} className="practice__count">
          Round finished
        </h3>
        <p className="practice__question">
          You knew {correct} of {items.length}. {correct < items.length ? 'The ones marked “Not yet” come back sooner.' : 'Nice steady work.'}
        </p>
      </div>
    );
  }

  return (
    <div className="practice" role="group" aria-labelledby="practice-heading">
      <h3 id="practice-heading" ref={heading} tabIndex={-1} className="practice__count">
        {title}: {index + 1} of {items.length}
      </h3>
      <p className="practice__question">{item.question}</p>
      {revealed ? (
        <>
          <div className="practice__answer" ref={answerRef} tabIndex={-1}>
            <p className="eyebrow">Answer</p>
            <p>{item.answer || 'No answer written for this card.'}</p>
          </div>
          <div className="button-row">
            <button type="button" className="btn btn--secondary" onClick={() => answer(false)}>
              Not yet
            </button>
            <button type="button" className="btn btn--primary" onClick={() => answer(true)}>
              Got it
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setRevealed(true);
            window.setTimeout(() => answerRef.current?.focus(), 0);
          }}
        >
          Show answer
        </button>
      )}
    </div>
  );
}

function CardRow({ card }: { card: Flashcard }) {
  const { data, update } = useData();
  const { notify, announce } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const id = useId();

  if (editing) {
    return (
      <li className="card-row">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!front.trim()) return;
            update((d) => updateCard(d, card.id, { front: front.trim(), back: back.trim() }));
            setEditing(false);
            announce('Card saved.');
          }}
        >
          <div className="field">
            <label className="label" htmlFor={`${id}-front`}>
              Front
            </label>
            <input id={`${id}-front`} className="input" value={front} onChange={(e) => setFront(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor={`${id}-back`}>
              Back
            </label>
            <textarea id={`${id}-back`} className="textarea" style={{ minHeight: '5rem' }} value={back} onChange={(e) => setBack(e.target.value)} />
          </div>
          <div className="button-row">
            <button type="submit" className="btn btn--primary btn--small">
              Save card
            </button>
            <button type="button" className="btn btn--secondary btn--small" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="card-row">
      <div className="card-row__text">
        <p className="card-row__front">{card.front}</p>
        <p className="card-row__back">{card.back}</p>
        <p className="small muted">
          {[contextLabel(data, card.subjectId, card.topicId), card.dueDate <= todayISO() ? 'Due now' : `Next ${relativeDay(card.dueDate).toLowerCase()}`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="button-row" style={{ gap: '0.25rem' }}>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing(true)}>
          Edit<span className="visually-hidden"> card: {card.front}</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => {
            update((d) => deleteCard(d, card.id));
            notify('Card deleted.', { label: 'Undo', run: () => update((d) => restoreCard(d, card)) });
          }}
        >
          Delete<span className="visually-hidden"> card: {card.front}</span>
        </button>
      </div>
    </li>
  );
}

export function FlashcardsScreen({ route }: { route: Route }) {
  const { data, update } = useData();
  const { announce } = useFeedback();
  const id = useId();
  const [deck, setDeck] = useState(route.query.get('deck') ?? '');
  const [reviewing, setReviewing] = useState<Flashcard[] | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [error, setError] = useState('');
  const ref = parseRefValue(deck);
  const cards = data.flashcards.filter(inDeck(ref));
  const due = cards.filter((c) => c.dueDate <= todayISO());

  return (
    <>
      <PageHeader title="Flashcards" intro="Short questions you answer from memory. Cards you know come back less often." />
      <div className="tasks-layout">
        <div className="stack">
          <section className="card" aria-labelledby="deck-heading">
            <div className="card__header">
              <h2 id="deck-heading" className="card__title">
                {ref ? contextLabel(data, ref.subjectId, ref.topicId) || 'Deck' : 'All cards'}
              </h2>
              <span className="muted small">
                {cards.length} {cards.length === 1 ? 'card' : 'cards'} · {due.length} due now
              </span>
            </div>
            <div className="field" style={{ maxWidth: '24rem' }}>
              <label className="label" htmlFor={`${id}-deck`}>
                Deck
              </label>
              <select
                id={`${id}-deck`}
                className="select"
                value={deck}
                disabled={!!reviewing}
                onChange={(e) => {
                  setDeck(e.target.value);
                  window.history.replaceState(null, '', `#/flashcards${e.target.value ? `?deck=${encodeURIComponent(e.target.value)}` : ''}`);
                }}
              >
                <option value="">All cards</option>
                {topicOptions(data).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              {reviewing ? (
                <>
                  <PracticeRunner
                    title="Card"
                    items={reviewing.map((c) => ({ id: c.id, question: c.front, answer: c.back }))}
                    onAnswer={(cardId, gotIt) => update((d) => reviewCard(d, cardId, gotIt))}
                    onFinish={(correct, total) => {
                      update((d) => recordPractice(d, { subjectId: ref?.subjectId ?? null, topicId: ref?.topicId ?? null, kind: 'flashcards', correct, total }));
                      announce(`Round finished. You knew ${correct} of ${total}.`);
                    }}
                  />
                  <button type="button" className="btn btn--secondary" style={{ marginTop: '1rem' }} onClick={() => setReviewing(null)}>
                    Back to cards
                  </button>
                </>
              ) : (
                <div className="button-row">
                  <button type="button" className="btn btn--primary" disabled={!due.length} onClick={() => setReviewing(due.slice(0, 20))}>
                    Review {Math.min(due.length, 20)} due {due.length === 1 ? 'card' : 'cards'}
                  </button>
                  {!due.length && cards.length > 0 && (
                    <button type="button" className="btn btn--secondary" onClick={() => setReviewing([...cards].sort(() => Math.random() - 0.5).slice(0, 10))}>
                      Practise anyway
                    </button>
                  )}
                  {!due.length && cards.length > 0 && <span className="hint">Nothing due. Cards come back when it helps most.</span>}
                </div>
              )}
            </div>
          </section>

          {!reviewing && (
            <section className="card" aria-labelledby="cards-heading">
              <h2 id="cards-heading" className="card__title" style={{ marginBottom: '1rem' }}>
                Cards
              </h2>
              {cards.length ? (
                <ul className="card-rows">
                  {cards.map((c) => (
                    <CardRow key={c.id} card={c} />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No cards in this deck yet.">Add one here, or turn your notes into cards from the Work dashboard.</EmptyState>
              )}
            </section>
          )}
        </div>

        <section className="card" aria-labelledby="add-card-heading">
          <h2 id="add-card-heading" className="card__title" style={{ marginBottom: '1rem' }}>
            Add a card
          </h2>
          <form
            className="stack"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!front.trim()) {
                setError('Write a question or term for the front.');
                document.getElementById(`${id}-front`)?.focus();
                return;
              }
              setError('');
              update((d) => addCards(d, [{ front, back }], { subjectId: ref?.subjectId ?? null, topicId: ref?.topicId ?? null }));
              announce('Card added.');
              setFront('');
              setBack('');
              document.getElementById(`${id}-front`)?.focus();
            }}
          >
            <p className="hint">Adds to: {ref ? contextLabel(data, ref.subjectId, ref.topicId) : 'no subject'}. Change the deck above to file it elsewhere.</p>
            <div className="field">
              <label className="label" htmlFor={`${id}-front`}>
                Front: question or term
              </label>
              <input
                id={`${id}-front`}
                className="input"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-front-error` : undefined}
              />
              {error && (
                <p id={`${id}-front-error`} className="error-text">
                  {error}
                </p>
              )}
            </div>
            <div className="field">
              <label className="label" htmlFor={`${id}-back`}>
                Back: answer
              </label>
              <textarea id={`${id}-back`} className="textarea" style={{ minHeight: '5rem' }} value={back} onChange={(e) => setBack(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary">
              Add card
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
