# NeuroNav identity and appearance

The app now uses an N-shaped route mark: a clear starting stroke, a diagonal path and a destination point. The same vector geometry appears in the desktop sidebar, mobile header, setup screen and favicon. Colour follows the selected theme; the monochrome variants also replace the favicon when selected.

## Assets

- `public/assets/brand/neuronav-mark.svg`: forest green symbol.
- `public/assets/brand/neuronav-mark-black.svg`: black symbol with a white route.
- `public/assets/brand/neuronav-mark-white.svg`: white symbol with a black route.
- `public/assets/brand/neuronav-wordmark.svg`: horizontal mark and name.
- `public/favicon.svg`: small-size, device-aware symbol.
- `assets-src/neuronav/study-daylight-v2.png`: original generated daylight master.
- `assets-src/neuronav/study-nightfall-v2.png`: original generated evening master.
- `public/assets/neuronav/study-*-{640,1024,1536}.{avif,webp}`: responsive production derivatives.

The background photographs were created with the built-in image-generation tool, then copied into this repository. SVG branding was drawn as native vector artwork so it stays sharp and can inherit theme colours. Existing source images remain available through the Original study photographs setting. Regenerate just the new responsive images with `node scripts/build-images.mjs study-`; all derivatives are smaller than their source master and the largest AVIF is approximately 73 KB.

Scenes appear on the welcome screen, Work hero and focus view. Reading surfaces remain opaque. Photos stay decorative and disappear in high-contrast and simplified modes, or when Show photographs is off. A saved background override survives theme changes.

## Theme choices

| Choice | Appearance |
| --- | --- |
| Match device | Follows the device's colour and contrast preferences |
| Warm paper | Existing warm canvas and forest accents |
| Forest clarity | Darker text, stronger green outlines and fewer shadows |
| Ocean clarity | Cool white with strong blue accents |
| Night study | Deep charcoal with brighter text and stronger outlines |
| Black on white | Pure black main text on white; 21:1 main text contrast; bold borders; no photos |
| White on black | Pure white main text on black; 21:1 main text contrast; bold borders; no photos |

Themes apply immediately across routes and survive reload. They update colour/contrast together without changing fonts, spacing, sound, imagery preferences or study data. Existing v2 settings normalise with a default automatic background; no storage-key change or data migration is required. Advanced contrast settings and the Work quick switch remain usable, including a way to leave monochrome mode.

## Final generation prompts

### Daylight desk

Use case: photorealistic-natural. Asset type: original wide website background photograph for NeuroNav, a calm study and revision app. Generate one landscape image, 1536 by 1024 or wider. Scene: a thoughtfully composed quiet study desk of pale oak next to a softly lit window, a closed unbranded linen notebook and a single pencil, a small fern at the far edge, warm ivory plaster and muted forest green details. Realistic editorial photography, natural morning daylight, subtle tactile grain, restrained premium educational aesthetic. Spacious uncluttered composition, broad quiet wall and tabletop areas; details remain useful when cropped to a narrow hero column or a wide background. No people, text, letters, logos, screens, UI, watermarks, neon, or busy decoration. All interface text will be on separate opaque surfaces. Save the generated image so it can be copied into the project.

### Evening desk

Use case: photorealistic-natural. Asset type: original wide background photograph for NeuroNav dark-mode study dashboard and focus screen. Generate one landscape image, 1536 by 1024. A quiet uncluttered evening study space: walnut desktop along the bottom, a closed charcoal linen notebook with one pencil, a small matte desk lamp casting a soft warm pool of light from the far edge, deep blue slate plaster wall with subtle natural texture filling most of the frame. A small muted plant at the edge. Realistic premium editorial interior photography, atmospheric but gentle, understated navy/charcoal palette with restrained amber light, readable quiet negative space, composition still works cropped to a narrow hero column. No people, text, letters, logos, screens, UI, watermark, neon or busy decorative effects. Interface text sits on separate solid panels. Create a finished photograph, not a website mockup.

## Validation

`npm run build` and all 26 Playwright checks passed at desktop and mobile sizes. Coverage includes all seven themes, reload persistence, keyboard selection, background overrides, existing settings preservation, and the full study/revision regression suite. Theme checks measure text contrast and run axe on Settings and Work for every preset; both monochrome themes achieve 21:1 main text contrast. Extra-large OpenDyslexic text was checked for horizontal overflow at 320px. Welcome, Work, focus and theme screens were also visually inspected. These checks are not a claim of complete WCAG conformance.

## Focus and navigation refinements

The focus route now uses the full content width and available viewport height below the header, including wide desktops and mobile. Photographs cover this area; the reading panel stays opaque. A lightweight native SVG contour texture (`public/assets/brand/nav-contours.svg`) adds detail to the desktop sidebar and disappears with imagery disabled, high contrast, simplified mode or forced colours. Settings uses the same simple sliders icon in navigation and the header, without the circular avatar treatment.

Elapsed and countdown displays show minutes, seconds and three-digit milliseconds with timestamp-based updates every 50ms. Progress uses the unrounded elapsed fraction. Timer storage, pause/resume, breaks and review behaviour are unchanged. Settings also offers Minutes only; reduced motion hides milliseconds and uses one-second updates. The clock is not a live announcement region, so screen readers are not interrupted on every tick.

Refinement validation: production build and all 28 desktop/mobile checks passed, including viewport coverage at 1920px, timer pause/reload/resume, reduced motion, display choices, 320px reflow and the existing revision suite.
