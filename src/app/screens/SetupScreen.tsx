import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addSubject } from '../lib/actions';
import { describeExam, todayISO, uid } from '../lib/dates';
import { tasksFromSuggestions } from '../lib/model';
import { suggestTasks } from '../lib/plan';
import { LEGACY_KEYS, asArray, isObject, safeGet, safeRemove, safeSet } from '../lib/storage';
import type { Difficulty, EnergyDrain, PreferredTime, SessionLength } from '../lib/types';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import { navigate } from '../state/router';
import { BrandMark } from '../components/AppShell';
import { ChoiceGroup } from '../components/primitives';

interface DraftSubject {
  id: string;
  name: string;
  examDate: string;
  difficulty: Difficulty;
  energyDrain: EnergyDrain;
}

const TOTAL_STEPS = 5;

// Drafts use the original onboarding keys so a half-finished setup from the
// previous version resumes where it stopped.
function readDraftSubjects(): DraftSubject[] {
  try {
    return asArray(JSON.parse(safeGet(LEGACY_KEYS.onboardingSubjects) ?? '[]'))
      .filter(isObject)
      .filter((s) => typeof s.name === 'string' && s.name.trim())
      .map((s) => ({
        id: typeof s.id === 'string' ? s.id : uid(),
        name: String(s.name),
        examDate: typeof s.examDate === 'string' ? s.examDate : '',
        difficulty: (['easy', 'moderate', 'challenging'].includes(s.difficulty as string) ? s.difficulty : 'moderate') as Difficulty,
        energyDrain: (['low', 'medium', 'high'].includes(s.energyDrain as string) ? s.energyDrain : 'medium') as EnergyDrain,
      }));
  } catch {
    return [];
  }
}

export function SetupScreen() {
  const { data, update } = useData();
  const { announce } = useFeedback();
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(() => Math.min(TOTAL_STEPS - 1, Math.max(0, Number(safeGet(LEGACY_KEYS.onboardingStep)) || 0)));
  const [subjects, setSubjects] = useState<DraftSubject[]>(readDraftSubjects);
  const [energy, setEnergy] = useState(() => Number(safeGet(LEGACY_KEYS.onboardingEnergy) ?? data.profile.dailyEnergy) || 50);
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    () => (safeGet(LEGACY_KEYS.onboardingSession) as SessionLength) || data.profile.sessionLength,
  );
  const [preferredTime, setPreferredTime] = useState<PreferredTime>(
    () => (safeGet(LEGACY_KEYS.onboardingTime) as PreferredTime) || data.profile.preferredTime,
  );
  const [name, setName] = useState(() => safeGet(LEGACY_KEYS.onboardingName) ?? data.profile.name);

  const [subjectName, setSubjectName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [energyDrain, setEnergyDrain] = useState<EnergyDrain>('medium');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    safeSet(LEGACY_KEYS.onboardingStep, String(step));
    safeSet(LEGACY_KEYS.onboardingSubjects, JSON.stringify(subjects));
    safeSet(LEGACY_KEYS.onboardingEnergy, String(energy));
    safeSet(LEGACY_KEYS.onboardingSession, sessionLength);
    safeSet(LEGACY_KEYS.onboardingTime, preferredTime);
  }, [step, subjects, energy, sessionLength, preferredTime]);

  useEffect(() => {
    safeSet(LEGACY_KEYS.onboardingName, name);
  }, [name]);

  useEffect(() => {
    document.title = 'Set up · NeuroNav';
  }, []);

  const goTo = (next: number) => {
    setStep(next);
    window.setTimeout(() => heading.current?.focus(), 0);
  };

  const addDraftSubject = () => {
    if (!subjectName.trim()) {
      setNameError('Enter a subject name.');
      return;
    }
    setNameError('');
    setSubjects((list) => [...list, { id: uid(), name: subjectName.trim(), examDate, difficulty, energyDrain }]);
    announce(`${subjectName.trim()} added.`);
    setSubjectName('');
    setExamDate('');
    setDifficulty('moderate');
    setEnergyDrain('medium');
  };

  const clearDrafts = () => {
    Object.values(LEGACY_KEYS)
      .filter((k) => k.startsWith('neuronav_onboarding_'))
      .forEach(safeRemove);
  };

  const finish = () => {
    update((d) => {
      let next = { ...d, profile: { ...d.profile, name: name.trim(), dailyEnergy: energy, sessionLength, preferredTime, onboarded: true } };
      for (const s of subjects) {
        [next] = addSubject(next, { ...s, image: 'auto' });
      }
      const added = next.subjects.slice(d.subjects.length);
      next = { ...next, tasks: [...next.tasks, ...tasksFromSuggestions(next, suggestTasks(added, next.profile))] };
      return { ...next, notices: { ...next.notices, planReady: added.length > 0 } };
    });
    clearDrafts();
    navigate('/work');
  };

  const skip = () => {
    update((d) => ({ ...d, profile: { ...d.profile, name: name.trim() || d.profile.name, onboarded: true } }));
    clearDrafts();
    navigate('/work');
  };

  const titles = ['Welcome to NeuroNav', 'Your subjects', 'Your usual energy', 'Session length', 'When you work best'];

  return (
    <div className="setup">
      <main className="setup__inner" id="main-content">
        <div className="setup__top">
          <span className="brand">
            <BrandMark />
            NeuroNav
          </span>
          <button type="button" className="btn btn--ghost" onClick={skip}>
            Skip setup for now
          </button>
        </div>

        <p className="muted">
          Step {step + 1} of {TOTAL_STEPS} · Saved as you go
        </p>
        <div className="progress-steps" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} data-state={i < step ? 'done' : i === step ? 'current' : 'todo'} />
          ))}
        </div>

        <section className="card" aria-labelledby="setup-heading">
          <h1 id="setup-heading" ref={heading} tabIndex={-1} className="page-title" style={{ marginBottom: '0.75rem' }}>
            {titles[step]}
          </h1>

          {step === 0 && (
            <div className="stack">
              <p>NeuroNav helps you start, keep going with and finish revision sessions. It suggests one next step at a time, and you can change anything.</p>
              <div className="notice">
                <p className="notice__body">
                  NeuroNav doesn’t diagnose anything or replace professional support. Your information stays in this browser.
                </p>
              </div>
              <div className="field">
                <label className="label" htmlFor="setup-name">
                  What should we call you? <span className="muted">(optional)</span>
                </label>
                <input id="setup-name" className="input" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="stack">
              <p className="muted">Add what you’re revising. You can add topics and change these later.</p>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  addDraftSubject();
                }}
                noValidate
              >
                <div className="field">
                  <label className="label" htmlFor="setup-subject">
                    Subject name
                  </label>
                  <input
                    id="setup-subject"
                    className="input"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={nameError ? 'setup-subject-error' : undefined}
                  />
                  {nameError && (
                    <p id="setup-subject-error" className="error-text">
                      {nameError}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label className="label" htmlFor="setup-exam">
                    Exam date <span className="muted">(optional)</span>
                  </label>
                  <input id="setup-exam" className="input" type="date" min={todayISO()} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                </div>
                <ChoiceGroup
                  legend="How challenging is it for you?"
                  name="difficulty"
                  value={difficulty}
                  onChange={setDifficulty}
                  options={[
                    { value: 'easy', label: 'Easier' },
                    { value: 'moderate', label: 'Medium' },
                    { value: 'challenging', label: 'Harder' },
                  ]}
                />
                <ChoiceGroup
                  legend="How much energy does it take?"
                  name="energy-drain"
                  value={energyDrain}
                  onChange={setEnergyDrain}
                  options={[
                    { value: 'low', label: 'Light' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'Draining' },
                  ]}
                />
                <button type="submit" className="btn btn--secondary">
                  Add subject
                </button>
              </form>
              {subjects.length > 0 ? (
                <ul className="subject-draft-list" aria-label="Subjects added">
                  {subjects.map((s) => (
                    <li key={s.id}>
                      <div>
                        <p style={{ fontWeight: 700 }}>{s.name}</p>
                        <p className="small muted">{describeExam(s.examDate)}</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setSubjects((list) => list.filter((x) => x.id !== s.id));
                          announce(`${s.name} removed.`);
                        }}
                      >
                        Remove<span className="visually-hidden"> {s.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hint">No subjects yet. You can also add them later.</p>
              )}
              {subjects.length > 5 && (
                <div className="notice">
                  <p className="notice__body">That’s quite a few. It’s fine; NeuroNav will still suggest one thing at a time.</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <p className="muted">Roughly how much energy do you have for focused work on a typical day? It changes day to day, and that’s normal.</p>
              <div className="field">
                <label className="label" htmlFor="setup-energy">
                  Usual energy: {energy}%
                </label>
                <input
                  id="setup-energy"
                  className="range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={energy}
                  aria-valuetext={`${energy} percent`}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                />
                <div className="button-row small muted" style={{ justifyContent: 'space-between' }} aria-hidden="true">
                  <span>Lower</span>
                  <span>Higher</span>
                </div>
              </div>
              <p className="hint">
                {energy < 30
                  ? 'Suggestions will stay light and spread out.'
                  : energy < 70
                    ? 'Suggestions will be steady and spread across the week.'
                    : 'Suggestions will include more sessions per day, with breaks.'}
              </p>
            </div>
          )}

          {step === 3 && (
            <ChoiceGroup
              legend="How long can you usually focus before a break?"
              hint="There’s no best length. You can change it for any session."
              name="setup-length"
              value={sessionLength}
              onChange={setSessionLength}
              options={[
                { value: 'short', label: '25 minutes', hint: '5 minute breaks' },
                { value: 'medium', label: '45 minutes', hint: '10 minute breaks' },
                { value: 'long', label: '90 minutes', hint: '15 minute breaks' },
              ]}
            />
          )}

          {step === 4 && (
            <ChoiceGroup
              legend="When do you usually find it easiest to focus?"
              name="setup-time"
              value={preferredTime}
              onChange={setPreferredTime}
              options={[
                { value: 'morning', label: 'Morning' },
                { value: 'afternoon', label: 'Afternoon' },
                { value: 'evening', label: 'Evening' },
                { value: 'flexible', label: 'It varies' },
              ]}
            />
          )}
        </section>

        <div className="setup__nav">
          <button type="button" className="btn btn--secondary" onClick={() => goTo(step - 1)} disabled={step === 0}>
            <ChevronLeft size={18} aria-hidden="true" />
            Back
          </button>
          {step < TOTAL_STEPS - 1 ? (
            <button type="button" className="btn btn--primary" onClick={() => goTo(step + 1)}>
              Continue
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={finish}>
              {subjects.length ? 'Create my plan' : 'Go to my dashboard'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
