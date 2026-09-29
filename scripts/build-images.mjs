// Generates responsive WebP/AVIF derivatives from the PNG source masters.
// Masters live in assets-src/neuronav and are never served directly.
// Run with: npm run images
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets-src/neuronav';
const OUT = 'public/assets/neuronav';

// Widths are chosen from where each image is placed, never above the master's size.
const WIDTHS = {
  'dashboard-hero-study-desk': [640, 1024, 1600],
  'focus-calm-wall': [1024, 1600],
  'study-daylight-v2': [640, 1024, 1536],
  'study-nightfall-v2': [640, 1024, 1536],
  subject: [320, 640],
};

function widthsFor(name) {
  if (name.startsWith('subject-')) return WIDTHS.subject;
  return WIDTHS[name] ?? [800];
}

await mkdir(OUT, { recursive: true });

for (const file of await readdir(SRC)) {
  if (!file.endsWith('.png')) continue;
  if (process.argv[2] && !file.startsWith(process.argv[2])) continue;
  const name = path.basename(file, '.png');
  const input = sharp(path.join(SRC, file));
  const { width: masterWidth } = await input.metadata();

  for (const width of widthsFor(name)) {
    if (width > masterWidth) continue;
    const resized = input.clone().resize({ width, withoutEnlargement: true });
    await resized.clone().webp({ quality: 78 }).toFile(path.join(OUT, `${name}-${width}.webp`));
    await resized.clone().avif({ quality: 55 }).toFile(path.join(OUT, `${name}-${width}.avif`));
    console.log(`${name}-${width}`);
  }
}
