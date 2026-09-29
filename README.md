# NeuroNav

A calm study dashboard that helps learners with ADHD start, keep going with and finish revision sessions. Everything is stored in the browser; there is no account or server.

## Run it

```bash
npm install
npm run dev        # development server
npm run build      # type-check, then build to dist/
npm run preview    # serve the production build
```

The build uses a relative base and hash routes (`#/work`, `#/tasks`, …), so `dist/` can be hosted from any static host or subfolder, including GitHub Pages.

## What's in it

| Area | What it does |
| --- | --- |
| **Work** | One suggested next action with a single “Start studying” button, today's plan, focus session, subjects, study journey, quick actions and accessibility switches. |
| **Tasks** | Add, edit, complete (with undo), reorder, move to tomorrow, delete (with undo), optional steps. “Today feels hard” keeps one task and moves the rest to tomorrow. “Suggest tasks” builds a plan from exam dates and energy; nothing is added until you choose. Print. |
| **Subjects** | Subject dropdown with Other custom entry, automatic photos with colour/pattern fallbacks, optional exam/preferences, topics and per-topic next stage. |
| **Focus** | Timestamp-based timer (no drift in background tabs), presets or custom length, gentle end-of-block prompt, optional breaks and a skippable reflection. A session interrupted by closing the page comes back paused, with a choice. Silent by default. |
| **Notes** | Save as you type. |
| **Flashcards** | Decks per subject/topic with Leitner-style review. |
| **Study Journey** | Plan → Learn → Practice → Review → Apply per topic, derived from real activity, plus a last-7-days summary. No streaks. |
| **Quick actions** | Break this down, Quiz me, Explain differently, Turn into flashcards. They run on the device and only rearrange the learner's own text; results are editable and say so. `src/app/lib/tools.ts` has a `ToolProvider` interface if an AI service is added later. |
| **Settings** | Font (Cabin, OpenDyslexic, monospace), text size, spacing, contrast, motion, theme, photos, simplified mode, timer display, sound, notifications, study preferences, backup/restore. |

## Data and migration

Data lives in versioned localStorage keys: `neuronav_data_v2`, `neuronav_settings_v2`, `neuronav_timer_v2` and `neuronav_drafts_v2`. Every read goes through a normaliser (`src/app/lib/model.ts`), so malformed data can't crash the app. Unreadable data is copied to a `…_unreadable_<timestamp>` key rather than discarded.

On first load, data from the original version (`neuronav_plan`, `neuronav_accessibility` and `neuronav_reflections`) is migrated automatically. The original keys are left untouched.

## Project layout

```
src/app/
  lib/         pure logic: types, model/migration, actions, selectors, plan, tools, dates, storage
  state/       React providers: data, settings, timer, feedback (live region + toasts), router, drafts
  components/  shell, task list, timer, cards, journey, quick actions, primitives
  screens/     one file per route
src/styles/    tokens + base (neuronav.css), screens.css, tools.css
assets-src/    PNG masters for the photographs (not served)
public/assets/ generated responsive WebP/AVIF
```

To regenerate images after changing a master in `assets-src/neuronav/`, run `npm run images`.

## Accessibility

Targets WCAG 2.2 AA. Checked in Edge with axe-core on every route in light, dark, high-contrast and OpenDyslexic + extra-large + loose-spacing modes. Also checked:

- reflow at 320px (400% zoom) and 720px (200% zoom) with no horizontal scrolling
- visible focus on every tab stop, and no keyboard traps
- focus moves to the page heading on navigation
- images are decorative (`alt=""`) and can fail without losing information
- `prefers-reduced-motion`, `prefers-contrast` and `prefers-color-scheme` are respected, and each can be overridden in Settings

The unused `src/app/components/ui/` kit from the original Figma export is excluded from type-checking.

## Journey review and browser tests

See [the prioritised review](docs/redesign-review.md) and [the supplied brief](NeuroNav-Redesign-Brief.md). First run asks for one subject; name, exam date and preferences can wait. It does not automatically add suggested tasks. Dates are entered as DD/MM/YYYY and remain ISO dates in storage.

`npm run build` checks TypeScript and creates the production build. With Microsoft Edge installed, run `npm run test:e2e` to test that build; Playwright starts the preview server on port 4173. On another test host, install the browser with `npx playwright install msedge` first.

The suite runs real flows at 1440px and 375px, plus reflow checks at 320/375/768/1024/1440px, axe scans, display preferences, interruption/resume, notes/cards, legacy migration, image failures and offline work after loading. It uses isolated browser storage. Screenshots, failure traces and the HTML report stay local under `artifacts/`, `test-results/` and `playwright-report/`. Automated checks do not replace screen-reader or real-device testing.
