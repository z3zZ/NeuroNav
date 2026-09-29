import { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { emptyData, normaliseData } from '../lib/model';
import { STORAGE_KEYS, safeRemove } from '../lib/storage';
import { useData } from '../state/data';
import { useFeedback } from '../state/feedback';
import type { Route } from '../state/router';
import { useSettings, type Settings } from '../state/settings';
import { useTimer } from '../state/timer';
import { FocusSettings } from '../components/FocusSettings';
import { ChoiceGroup, ConfirmDialog, PageHeader, Switch } from '../components/primitives';

export function SettingsScreen({ route }: { route: Route }) {
  const { settings, setSetting, resetSettings } = useSettings();
  const { data, update, replace, saveStatus } = useData();
  const { notify, announce } = useFeedback();
  const { timer, discard, clearReview } = useTimer();
  const [confirmReset, setConfirmReset] = useState(false);
  const [importError, setImportError] = useState('');
  const [notificationNote, setNotificationNote] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const section = route.query.get('section');
    if (section) document.getElementById(section)?.scrollIntoView();
  }, [route]);

  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => setSetting(key, value);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data, settings }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuronav-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    announce('Backup downloaded.');
  };

  const importData = async (file: File) => {
    setImportError('');
    try {
      const parsed = JSON.parse(await file.text());
      const candidate = normaliseData(parsed?.data ?? parsed);
      if (!candidate) throw new Error('shape');
      const previous = data;
      replace(candidate);
      notify('Backup restored.', { label: 'Undo', run: () => replace(previous) });
    } catch {
      setImportError('That file isn’t a NeuroNav backup, so nothing was changed.');
    }
  };

  const toggleNotifications = async (on: boolean) => {
    setNotificationNote('');
    if (!on) return setSetting('notifications', false);
    if (!('Notification' in window)) {
      setNotificationNote('This browser doesn’t support notifications.');
      return;
    }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'granted') {
      setSetting('notifications', true);
    } else {
      setNotificationNote('Notifications are blocked in your browser settings, so NeuroNav can’t show them.');
    }
  };

  return (
    <>
      <PageHeader title="Settings" intro="Changes apply straight away and are saved in this browser." />
      <div className="settings-grid">
        <section className="card settings-section" aria-labelledby="a11y-heading">
          <h2 id="a11y-heading" className="card__title">
            Accessibility &amp; focus
          </h2>
          <p className="hint">Quick switches, also on your Work dashboard.</p>
          <div style={{ marginTop: '0.75rem' }}>
            <FocusSettings />
          </div>
          <div className="stack" style={{ marginTop: '1.25rem' }}>
            <ChoiceGroup
              legend="Font"
              name="font"
              value={settings.font}
              onChange={set('font')}
              options={[
                { value: 'default', label: 'Cabin', hint: 'Default' },
                { value: 'dyslexia', label: 'OpenDyslexic' },
                { value: 'mono', label: 'Monospace', hint: 'Fixed width' },
              ]}
            />
            <ChoiceGroup
              legend="Text size"
              name="size"
              value={settings.fontSize}
              onChange={set('fontSize')}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'large', label: 'Large' },
                { value: 'xlarge', label: 'Extra large' },
              ]}
            />
            <ChoiceGroup
              legend="Line spacing"
              name="spacing"
              value={settings.spacing}
              onChange={set('spacing')}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'relaxed', label: 'Relaxed' },
                { value: 'loose', label: 'Loose' },
              ]}
            />
            <ChoiceGroup
              legend="Contrast"
              name="contrast"
              value={settings.contrast}
              onChange={set('contrast')}
              options={[
                { value: 'system', label: 'Match device' },
                { value: 'standard', label: 'Standard' },
                { value: 'high', label: 'High' },
              ]}
            />
            <ChoiceGroup
              legend="Motion"
              name="motion"
              value={settings.motion}
              onChange={set('motion')}
              options={[
                { value: 'system', label: 'Match device' },
                { value: 'reduced', label: 'Reduced' },
                { value: 'full', label: 'Subtle' },
              ]}
            />
            <ChoiceGroup
              legend="Colour theme"
              name="theme"
              value={settings.theme}
              onChange={set('theme')}
              options={[
                { value: 'system', label: 'Match device' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
            <Switch
              label="Show photographs"
              description="Decorative images on the dashboard and subject cards."
              checked={settings.imagery}
              onChange={set('imagery')}
            />
          </div>
          <div className="preview-box" aria-label="Preview">
            <p className="eyebrow">Preview</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 600 }}>Continue Databases &amp; SQL</p>
            <p>Read one short section, then write three key points from memory.</p>
          </div>
        </section>

        <div className="stack">
          <section className="card settings-section" aria-labelledby="timer-settings-heading">
            <h2 id="timer-settings-heading" className="card__title">
              Focus sessions
            </h2>
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              <ChoiceGroup
                legend="Timer display"
                name="timer-display"
                value={settings.timerDisplay}
                onChange={set('timerDisplay')}
                options={[
                  { value: 'calm', label: 'Calm', hint: 'Minutes done, no seconds' },
                  { value: 'clock', label: 'Countdown', hint: 'Minutes and seconds left' },
                ]}
              />
              <div className="field">
                <label className="label" htmlFor="break-length">
                  Default break length (minutes)
                </label>
                <input
                  id="break-length"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  value={settings.breakMin}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (n >= 1 && n <= 60) setSetting('breakMin', Math.round(n));
                  }}
                  style={{ maxWidth: '8rem' }}
                />
              </div>
              <div>
                <Switch
                  label="Sound at the end of a block"
                  description="A soft chime. Off unless you turn it on."
                  checked={settings.sound}
                  onChange={set('sound')}
                />
                <Switch
                  label="Notifications"
                  description="Tells you when a block ends while this tab is in the background."
                  checked={settings.notifications}
                  onChange={toggleNotifications}
                />
                {notificationNote && (
                  <p className="error-text" role="alert">
                    {notificationNote}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="card settings-section" aria-labelledby="profile-heading">
            <h2 id="profile-heading" className="card__title">
              Study preferences
            </h2>
            <p className="hint">Used to suggest tasks and default session lengths.</p>
            <div className="stack" style={{ marginTop: '1rem' }}>
              <div className="field">
                <label className="label" htmlFor="profile-name">
                  Your name <span className="muted">(optional)</span>
                </label>
                <input
                  id="profile-name"
                  className="input"
                  autoComplete="given-name"
                  value={data.profile.name}
                  maxLength={60}
                  onChange={(e) => update((d) => ({ ...d, profile: { ...d.profile, name: e.target.value } }))}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="profile-energy">
                  Usual energy for focused work: {data.profile.dailyEnergy}%
                </label>
                <input
                  id="profile-energy"
                  className="range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={data.profile.dailyEnergy}
                  aria-valuetext={`${data.profile.dailyEnergy} percent`}
                  onChange={(e) => update((d) => ({ ...d, profile: { ...d.profile, dailyEnergy: Number(e.target.value) } }))}
                />
                <p className="hint">Lower energy spreads suggested tasks over more days.</p>
              </div>
              <ChoiceGroup
                legend="Usual session length"
                name="session-length"
                value={data.profile.sessionLength}
                onChange={(v) => update((d) => ({ ...d, profile: { ...d.profile, sessionLength: v } }))}
                options={[
                  { value: 'short', label: '25 minutes' },
                  { value: 'medium', label: '45 minutes' },
                  { value: 'long', label: '90 minutes' },
                ]}
              />
              <ChoiceGroup
                legend="When you usually work best"
                name="preferred-time"
                value={data.profile.preferredTime}
                onChange={(v) => update((d) => ({ ...d, profile: { ...d.profile, preferredTime: v } }))}
                options={[
                  { value: 'morning', label: 'Morning' },
                  { value: 'afternoon', label: 'Afternoon' },
                  { value: 'evening', label: 'Evening' },
                  { value: 'flexible', label: 'It varies' },
                ]}
              />
            </div>
          </section>

          <section id="data" className="card settings-section" aria-labelledby="data-heading">
            <h2 id="data-heading" className="card__title">
              Your data
            </h2>
            <p className="hint">
              Everything stays in this browser.{' '}
              {saveStatus === 'error'
                ? 'This browser is refusing to save right now, so download a backup to keep your work.'
                : 'Download a backup before clearing browser data or switching devices.'}
            </p>
            <div className="button-row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn--secondary" onClick={exportData}>
                <Download size={18} aria-hidden="true" />
                Download backup
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => fileInput.current?.click()}>
                <Upload size={18} aria-hidden="true" />
                Restore from backup
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importData(file);
                  e.target.value = '';
                }}
              />
            </div>
            {importError && (
              <p className="error-text" role="alert" style={{ marginTop: '0.75rem' }}>
                {importError}
              </p>
            )}
            <div className="card__footer">
              <button type="button" className="btn btn--danger" onClick={() => setConfirmReset(true)}>
                Delete all my data
              </button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Delete all your data?"
        body={<p>This removes your subjects, tasks, notes, flashcards and sessions from this browser. Download a backup first if you might want them later.</p>}
        confirmLabel="Delete everything"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          if (timer.status !== 'idle') discard();
          if (timer.pendingReview) clearReview();
          safeRemove(STORAGE_KEYS.timer);
          safeRemove(STORAGE_KEYS.drafts);
          replace(emptyData());
          resetSettings();
          window.location.hash = '#/setup';
        }}
      />
    </>
  );
}
