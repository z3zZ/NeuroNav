import { useState } from 'react';
import { addSubject } from '../lib/actions';
import { isISODate, uid } from '../lib/dates';
import { LEGACY_KEYS, asArray, isObject, safeGet, safeRemove } from '../lib/storage';
import type { Difficulty, EnergyDrain, SessionLength, PreferredTime } from '../lib/types';
import { useData } from '../state/data';
import { useDraft } from '../state/drafts';
import { navigate } from '../state/router';
import { BrandMark } from '../components/AppShell';
import { StudyImage } from '../components/StudyImage';
import { SubjectPicker } from '../components/SubjectPicker';
import { UKDateInput } from '../components/UKDateInput';
import { PageHeader } from '../components/primitives';

// Resume subjects already entered in the old five-screen setup, without adding a plan.
function oldSubjects() {
  try {
    return asArray(JSON.parse(safeGet(LEGACY_KEYS.onboardingSubjects) ?? '[]'))
      .filter(isObject)
      .filter((s) => typeof s.name === 'string' && s.name.trim())
      .map((s) => ({
        id: typeof s.id === 'string' ? s.id : uid(),
        name: String(s.name),
        examDate: isISODate(s.examDate) ? s.examDate : '',
        difficulty: (['easy', 'moderate', 'challenging'].includes(s.difficulty as string) ? s.difficulty : 'moderate') as Difficulty,
        energyDrain: (['low', 'medium', 'high'].includes(s.energyDrain as string) ? s.energyDrain : 'medium') as EnergyDrain,
        image: 'auto' as const,
      }));
  } catch {
    return [];
  }
}

export function SetupScreen() {
  const { data, update } = useData();
  const [subjects] = useState(oldSubjects);
  const [subjectName, setSubjectName] = useDraft('setup-subject');
  const [name, setName] = useDraft('setup-name', safeGet(LEGACY_KEYS.onboardingName) ?? data.profile.name);
  const [examDate, setExamDate] = useDraft('setup-exam');
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  const finish = (explore = false) => {
    if (!explore && !subjectName.trim() && !subjects.length) {
      setError('Choose a subject or enter a custom name.');
      (document.getElementById('setup-subject-custom') ?? document.getElementById('setup-subject'))?.focus();
      return;
    }
    if (!explore && examDate && !isISODate(examDate)) {
      setDateError('Enter a real date as DD/MM/YYYY, or leave it blank.');
      window.setTimeout(() => document.getElementById('setup-exam')?.focus(), 0);
      return;
    }
    const oldLength = safeGet(LEGACY_KEYS.onboardingSession);
    const oldTime = safeGet(LEGACY_KEYS.onboardingTime);
    const oldEnergy = safeGet(LEGACY_KEYS.onboardingEnergy);
    update((d) => {
      let next = {
        ...d,
        profile: {
          ...d.profile,
          name: name.trim(),
          onboarded: true,
          sessionLength: (['short', 'medium', 'long'].includes(oldLength ?? '')
            ? oldLength
            : d.profile.onboarded
              ? d.profile.sessionLength
              : 'short') as SessionLength,
          preferredTime: (['morning', 'afternoon', 'evening', 'flexible'].includes(oldTime ?? '')
            ? oldTime
            : d.profile.preferredTime) as PreferredTime,
          dailyEnergy:
            oldEnergy !== null && Number.isFinite(Number(oldEnergy))
              ? Math.max(0, Math.min(100, Number(oldEnergy)))
              : d.profile.dailyEnergy,
        },
      };
      for (const s of subjects) if (!next.subjects.some((x) => x.id === s.id)) [next] = addSubject(next, s);
      if (!explore && subjectName.trim())
        [next] = addSubject(next, { name: subjectName, examDate, difficulty: 'moderate', energyDrain: 'medium', image: 'auto' });
      return next;
    });
    if (!explore) {
      setSubjectName('');
      setExamDate('');
    }
    setName('');
    Object.values(LEGACY_KEYS)
      .filter((k) => k.startsWith('neuronav_onboarding_'))
      .forEach(safeRemove);
    navigate('/work');
  };

  return (
    <div className="setup">
      <div className="setup__background" aria-hidden="true">
        <StudyImage placement="setup" />
      </div>
      <main className="setup__inner" id="main-content">
        <div className="setup__top">
          <span className="brand">
            <BrandMark />
            NeuroNav
          </span>
        </div>
        <section className="card">
          <PageHeader title="Start with one subject" intro="Choose what you’re revising. We’ll help you find one small thing to do next." />
          <form
            className="stack"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              finish();
            }}
          >
            <SubjectPicker id="setup-subject" value={subjectName} onChange={setSubjectName} error={error} />
            <p className="hint">Pictures are chosen automatically. You can add more subjects later.</p>
            {subjects.length > 0 && (
              <p className="notice">
                Your earlier setup has been kept: {subjects.map((s) => s.name).join(', ')}. Continue with these or choose another subject.
              </p>
            )}
            <details className="optional-details" open={dateError ? true : undefined}>
              <summary>Name and exam date (optional)</summary>
              <div className="stack">
                <div className="field">
                  <label className="label" htmlFor="setup-name">
                    Your name (optional)
                  </label>
                  <input
                    id="setup-name"
                    className="input"
                    autoComplete="given-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="setup-exam">
                    Exam date (DD/MM/YYYY, optional)
                  </label>
                  <UKDateInput
                    id="setup-exam"
                    className="input"
                    value={examDate}
                    onChange={setExamDate}
                    aria-invalid={!!dateError}
                    aria-describedby={dateError ? 'setup-date-error' : undefined}
                  />
                  {dateError && (
                    <p id="setup-date-error" className="error-text" role="alert">
                      {dateError}
                    </p>
                  )}
                </div>
              </div>
            </details>
            <button className="btn btn--primary" type="submit">
              Continue to Work
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => finish(true)}>
              Explore first
            </button>
            <p className="hint">Your work stays in this browser. Study preferences can wait — change them any time in Settings.</p>
          </form>
        </section>
      </main>
    </div>
  );
}
