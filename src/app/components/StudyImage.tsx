import { useSettings } from '../state/settings';
import { DecorativeImage } from './DecorativeImage';

/** Every scene is decorative; text and controls stay on solid reading surfaces. */
export function StudyImage({ placement }: { placement: 'hero' | 'focus' | 'setup' }) {
  const { settings, effective } = useSettings();
  if (!effective.showImagery) return null;
  const original = settings.background === 'original';
  const night = settings.background === 'nightfall' || (settings.background === 'auto' && effective.dark);
  const name = original
    ? placement === 'focus'
      ? 'focus-calm-wall'
      : 'dashboard-hero-study-desk'
    : night
      ? 'study-nightfall-v2'
      : 'study-daylight-v2';
  return (
    <DecorativeImage
      key={name}
      name={name}
      widths={original ? (placement === 'focus' ? [1024, 1600] : [640, 1024, 1600]) : [640, 1024, 1536]}
      sizes={placement === 'hero' ? '(max-width: 767px) 100vw, 30vw' : '100vw'}
      width={original ? 1600 : 1536}
      height={original ? 900 : 1024}
      eager
    />
  );
}
