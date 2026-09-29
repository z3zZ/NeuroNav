import { useSettings } from '../state/settings';
import { Switch } from './primitives';

/** The four quick switches. Changes apply immediately and are saved. */
export function FocusSettings() {
  const { settings, effective, setSetting, setAppearance } = useSettings();
  return (
    <div>
      <Switch
        label="Reduced motion"
        description="Removes animation and transitions."
        checked={effective.reducedMotion}
        onChange={(on) => setSetting('motion', on ? 'reduced' : 'full')}
      />
      <Switch
        label="High contrast"
        description="Stronger outlines and no photos. More themes in Settings."
        checked={effective.highContrast}
        onChange={(on) =>
          settings.theme.startsWith('ink-') && !on
            ? setAppearance(effective.dark ? 'dark' : 'light', 'standard')
            : setSetting('contrast', on ? 'high' : 'standard')
        }
      />
      <Switch
        label="OpenDyslexic font"
        description="Some people find it easier to read; others don’t."
        checked={settings.font === 'dyslexia'}
        onChange={(on) => setSetting('font', on ? 'dyslexia' : 'default')}
      />
      <Switch
        label="Simplified mode"
        description="Shows only your next action, plan and timer."
        checked={settings.simplified}
        onChange={(on) => setSetting('simplified', on)}
      />
    </div>
  );
}
