import { useState } from 'react';

const BASE = `${import.meta.env.BASE_URL}assets/neuronav/`;

/**
 * Decorative photograph with AVIF/WebP sources. Always alt="" (no information
 * lives in images); if loading fails it removes itself and the container's
 * colour fallback shows instead.
 */
export function DecorativeImage({
  name,
  widths,
  sizes,
  width,
  height,
  eager = false,
  className,
}: {
  name: string;
  widths: number[];
  sizes: string;
  width: number;
  height: number;
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const srcSet = (ext: string) => widths.map((w) => `${BASE}${name}-${w}.${ext} ${w}w`).join(', ');
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      <img
        className={className}
        src={`${BASE}${name}-${widths[0]}.webp`}
        alt=""
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </picture>
  );
}
