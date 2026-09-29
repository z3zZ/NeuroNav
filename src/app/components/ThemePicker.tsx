import { useId } from 'react';
import { useSettings, type Settings } from '../state/settings';
import { StudyImage } from './StudyImage';

export const APPEARANCES: {
  id: string;
  name: string;
  theme: Settings['theme'];
  contrast: Settings['contrast'];
  description: string;
  swatches: string[];
}[] = [
  {
    id: 'device',
    name: 'Match device',
    theme: 'system',
    contrast: 'system',
    description: 'Follow your device’s light, dark and contrast preferences.',
    swatches: ['#f5f3ed', '#202824', '#8fc3a2'],
  },
  {
    id: 'warm',
    name: 'Warm paper',
    theme: 'light',
    contrast: 'standard',
    description: 'Warm white surfaces and calm forest green accents.',
    swatches: ['#f5f3ed', '#202824', '#345e47'],
  },
  {
    id: 'forest',
    name: 'Forest clarity',
    theme: 'light',
    contrast: 'more',
    description: 'Higher contrast. Darker text and stronger green outlines.',
    swatches: ['#f5f3ed', '#101a14', '#18462c'],
  },
  {
    id: 'ocean',
    name: 'Ocean clarity',
    theme: 'ocean',
    contrast: 'more',
    description: 'Higher contrast. Crisp blue accents on cool white.',
    swatches: ['#eef4f8', '#101d2b', '#17456b'],
  },
  {
    id: 'night',
    name: 'Night study',
    theme: 'dark',
    contrast: 'more',
    description: 'Higher contrast. Bright text on deep charcoal.',
    swatches: ['#151a17', '#ffffff', '#a9dbbb'],
  },
  {
    id: 'black-white',
    name: 'Black on white',
    theme: 'ink-light',
    contrast: 'high',
    description: 'Maximum contrast. Black text on white, bold borders, no photos.',
    swatches: ['#ffffff', '#000000', '#ffffff'],
  },
  {
    id: 'white-black',
    name: 'White on black',
    theme: 'ink-dark',
    contrast: 'high',
    description: 'Maximum contrast. White text on black, bold borders, no photos.',
    swatches: ['#000000', '#ffffff', '#000000'],
  },
];

export function ThemePicker() {
  const { settings, effective, setAppearance, setSetting } = useSettings();
  const id = useId();
  const selected = APPEARANCES.find(
    (p) => p.theme === settings.theme && (settings.theme.startsWith('ink-') || p.contrast === settings.contrast),
  );
  return (
    <section className="card settings-appearance" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className="card__title">
        Themes &amp; backgrounds
      </h2>
      <p className="muted">Choose the colours that feel easiest to use. Every theme keeps the same tools and your saved work.</p>
      <fieldset className="fieldset">
        <legend>Choose a theme</legend>
        <div className="theme-options">
          {APPEARANCES.map((p) => (
            <label className="theme-option" key={p.id}>
              <input
                type="radio"
                name={`${id}-theme`}
                checked={selected?.id === p.id}
                onChange={() => setAppearance(p.theme, p.contrast)}
                value={p.id}
              />
              <span className="theme-option__swatches" aria-hidden="true">
                {p.swatches.map((colour, i) => (
                  <span key={i} style={{ backgroundColor: colour }} />
                ))}
              </span>
              <span className="theme-option__name">{p.name}</span>
              <span className="hint">{p.description}</span>
            </label>
          ))}
        </div>
        {!selected && (
          <p className="hint">
            Your custom theme and contrast settings are active. Choose a theme to apply its colours and contrast together.
          </p>
        )}
      </fieldset>
      <div className="appearance-preview" aria-label="Live theme preview">
        <div className="appearance-preview__content">
          <p className="eyebrow">Live preview</p>
          <h3>One small step, clearly in view.</h3>
          <p>Read one short section, then recall three key points.</p>
          <a className="btn btn--primary" href="#/work">
            Return to Work
          </a>
          <p className="hint">Your current colours apply throughout NeuroNav.</p>
        </div>
        {effective.showImagery && (
          <div className="appearance-preview__image">
            <StudyImage placement="hero" />
          </div>
        )}
      </div>
      <div className="field">
        <label className="label" htmlFor={`${id}-background`}>
          Study background
        </label>
        <select
          id={`${id}-background`}
          className="select"
          value={settings.background}
          onChange={(e) => setSetting('background', e.target.value as Settings['background'])}
          aria-describedby={`${id}-background-hint`}
        >
          <option value="auto">Match theme — daylight or evening</option>
          <option value="daylight">Daylight desk</option>
          <option value="nightfall">Evening desk</option>
          <option value="original">Original study photographs</option>
        </select>
        <p id={`${id}-background-hint`} className="hint">
          {effective.showImagery
            ? 'Used on the welcome screen, Work hero and focus view. Subject pictures stay matched to their subjects.'
            : 'Photos are currently hidden by high contrast, simplified mode or your photograph setting. Your background choice is kept.'}
        </p>
      </div>
    </section>
  );
}
