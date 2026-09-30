import { useSettings, type Settings } from '../state/settings';
import { ChoiceGroup } from './primitives';

const textures: { value: Settings['cardTexture']; label: string; hint: string }[] = [
  { value: 'mixed', label: 'Varied cards', hint: 'A mix of textures across your cards' },
  { value: 'contours', label: 'Contours', hint: 'Soft flowing lines' },
  { value: 'dots', label: 'Dot paper', hint: 'Small, evenly spaced dots' },
  { value: 'linen', label: 'Linen', hint: 'A fine woven surface' },
  { value: 'grid', label: 'Graph paper', hint: 'A light square grid' },
  { value: 'off', label: 'None', hint: 'Plain card surfaces' },
];

export function TexturePicker() {
  const { settings, effective, setSetting } = useSettings();
  const hidden = effective.highContrast || settings.simplified;
  return (
    <section className="card settings-textures" aria-labelledby="texture-heading">
      <h2 id="texture-heading" className="card__title">
        Card textures
      </h2>
      <p className="muted">
        Add a little detail to cards throughout NeuroNav. These are separate from photographs and the navigation texture.
      </p>
      <ChoiceGroup
        legend="Texture style"
        name="card-texture"
        value={settings.cardTexture}
        onChange={(value) => setSetting('cardTexture', value)}
        options={textures}
      />
      <ChoiceGroup
        legend="Texture strength"
        name="texture-strength"
        value={settings.textureStrength}
        onChange={(value) => setSetting('textureStrength', value)}
        options={[
          { value: 'subtle', label: 'Subtle' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'defined', label: 'Defined' },
        ]}
      />
      <p className="hint" role="status">
        {hidden
          ? 'Textures are hidden in high-contrast and simplified modes. Your choices are kept.'
          : settings.cardTexture === 'off'
            ? 'Card textures are off. Your strength preference is kept.'
            : 'Changes apply immediately. Textures stay still, and controls keep their plain surfaces.'}
      </p>
      <div className="texture-previews" aria-label="Live card texture previews">
        {['Choose a topic', 'Take one small step', 'Review what you learned'].map((title, i) => (
          <div className={`card texture-preview texture-preview--${i}`} key={title}>
            <h3 className="label">{title}</h3>
            <p className="hint">Your current texture and strength.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
