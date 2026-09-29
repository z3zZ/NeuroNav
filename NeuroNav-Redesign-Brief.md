# NeuroNav redesign brief

**Direction:** the approved calm study dashboard, with **Work** as the main area label.

**Purpose:** help learners with ADHD begin, sustain and finish useful revision sessions while retaining NeuroNav's existing revision features.

**Implementation target:** existing React, TypeScript and Vite app. Preserve the current data model and localStorage resilience while replacing the presentation in stages.

## 1. Product principles

1. Show one useful next action before showing a catalogue of choices.
2. Make the interface calm, legible and credible. A warm editorial study setting supports the work; it never competes with the content.
3. Keep planning, learning, practice and review connected. The dashboard is a starting point, not a static mock-up.
4. Make every important action available without generated imagery, animation or AI. AI assistance remains an optional tool under the learner's control.
5. Save progress continuously and make resuming effortless, including after refresh or interrupted sessions.

## 2. Visual direction

Use a warm off-white canvas, deep charcoal sidebar, muted olive/forest accents, subtle rules and restrained shadows. The approved image language is realistic editorial photography of study materials and natural light. There is no Japan theme. Avoid neon gradients, glass-heavy UI, busy illustrations, floating particles and motivational gamification. Images are decorative context; all labels and data are live HTML.

Suggested tokens to refine against real rendered screens:

| Token | Starting value | Use |
| --- | --- | --- |
| Canvas | `#F5F3ED` | Page background |
| Surface | `#FFFFFF` | Cards and forms |
| Ink | `#202824` | Primary text |
| Muted | `#58635C` | Secondary text |
| Sidebar | `#202A25` | Navigation |
| Accent | `#345E47` | Primary controls and progress |
| Accent pale | `#E4EDE5` | Selected and success surfaces |
| Border | `#D7DDD5` | Dividers and input outlines |
| Focus ring | `#184F88` | Keyboard focus, distinct from status green |

Use a clear humanist sans for UI (Cabin is appropriate) and a restrained serif only for a few large editorial headings, if it remains easy to read. Provide an OpenDyslexic option without implying it improves reading for every person. Body text starts at 16px, line height around 1.5. Avoid low contrast grey captions and text over uncovered photography. Radius roughly 12–18px for cards, 8–12px for controls; spacing based on an 8px scale.

## 3. Information architecture and layout

The desktop shell has a persistent dark sidebar, a top bar, a flexible main column and a narrower supporting column. The sidebar includes **Work**, Subjects, Tasks, Flashcards, Notes, Study Journey and Settings, using only features that already exist or are implemented as part of this redesign. Navigation names may adapt to the existing app's real routes; do not create dead ends. The top bar has search, a compact current date, and account/settings access.

**Work dashboard, top to bottom:**

1. **Hero and next action:** a short welcome, a concrete suggestion such as “Continue Databases & SQL”, estimated time, and one primary “Start studying” button. Keep the hero image behind a solid/opaque text surface or outside the text area. No streak pressure.
2. **Focus session:** timer presets (for example 25 minutes), custom duration, pause/resume, finish and an optional break. Show task and subject context. Never start sound automatically.
3. **Today's plan:** a manageable list of tasks with completion, duration, subject, reorder/edit and a clear “Add task”. Show completed tasks collapsed when the list grows. Empty state suggests one small task.
4. **Your subjects:** four visual cards in the approved example (Computing, Biology, Maths, History), with the user's real subjects replacing examples. Each card shows title, topics/tasks and a clear link. Subjects without an image use a colour and pattern fallback.
5. **Study journey:** Plan → Learn → Practice → Review → Apply, with current stage and progress for a chosen topic. This is a navigational/progress aid, not a rigid forced sequence.
6. **Quick actions:** Break this down, Quiz me, Explain differently and Turn into flashcards. Require a selected topic or source text; show editable results and transparent loading/error states. Do not represent generated answers as guaranteed correct.
7. **Accessibility & Focus:** quick access to reduced motion, high contrast, OpenDyslexic and simplified mode. The full settings page contains the same controls and persists them.

The side column can hold Today's plan, Study journey and settings at wide widths. Preserve meaningful reading order in the DOM: primary action, plan, session, subjects, journey, tools, settings. CSS grid can rearrange visually, but keyboard and screen reader sequence should still make sense.

## 4. Core components and behaviour

| Component | Behaviour and state |
| --- | --- |
| `AppShell` | Landmark navigation and main content; active route, skip link, compact mobile navigation. |
| `NextActionCard` | Select unfinished task or recently active topic; let user change it. Never fabricate progress. |
| `FocusTimer` | Idle/running/paused/break/finished; timestamp-based elapsed time so background tabs and refreshes do not drift; explicit restart and notification permission. |
| `TaskList` | Add, edit, complete, undo, defer; clear due dates and validation; persist immediately. |
| `SubjectCard` | Live name/counts; decorative image; entire card may be linked only if nested buttons are avoided. |
| `JourneyProgress` | Text labels and state names alongside visual nodes; current stage selected from real progress. |
| `QuickAction` | Input context, loading, result, edit/copy/save, retry and error; no silent overwrites. |
| `FocusSettings` | Persistent switches with accessible names and an immediate preview. |

Keep existing notes, flashcards, quizzes and revision content available through consistent routes. Map old screens and persisted fields before refactoring; write a migration if storage keys or shapes change. Version stored data and guard against malformed localStorage. Maintain offline-friendly local work where already supported. Treat AI availability as a capability, not a prerequisite for viewing or editing the learner's own material.

## 5. ADHD-focused UX

- Offer a **one-click start** from the next action and a **small first step** for a large task. Make breaking down optional and editable.
- Let users set their own session length; give a gentle end-of-session prompt with “Continue”, “Take a break” and “Finish”. No countdown anxiety by default, flashing, or forced interruptions.
- Keep active task context visible in focus mode; hide unrelated cards in simplified mode without hiding navigation to saved work.
- Preserve input drafts and timer state on refresh; clearly show when work is saved. Resume interrupted sessions with a choice rather than auto-running.
- Use short, specific labels and neutral feedback. Avoid shame language, streak loss and confetti. Show progress as completed work and next steps.
- Limit initial choices. Secondary actions can sit behind a labelled menu, never an unexplained icon alone. Search and filtering should return a helpful empty state.
- Give users control of sound, notifications, imagery and motion. Default to silence and subtle transitions.

## 6. Accessibility acceptance criteria

Target WCAG 2.2 AA for the implemented screens. Use semantic headings, `nav`, `main`, lists, buttons and labelled fields. Provide a visible skip link and strong focus states. All interactions must work by keyboard with logical focus order and no trap. Minimum touch target 44×44px where practical. Meet at least 4.5:1 text contrast and 3:1 for large text and component boundaries. Verify actual rendered combinations, including high contrast mode.

Do not put essential text in generated images. Mark purely decorative images with empty alt text or CSS backgrounds; subject card links obtain accessible names from live headings. Announce timer state changes and task save/error outcomes sparingly with an appropriate live region; do not announce every second. Pause or remove nonessential animation under `prefers-reduced-motion` and the app toggle. Support browser zoom to 200% and text reflow at 400% without horizontal page scrolling. Respect system colour/contrast preferences where possible while allowing override. Test OpenDyslexic with wrapping and component sizes, not only at default zoom.

## 7. Asset pack and usage

The accompanying ZIP contains six generated PNGs, with no embedded UI or text. Place them under `public/assets/neuronav/` or import them from the project's asset folder. Convert to WebP/AVIF for production and keep these PNGs as source masters. Generate responsive sizes from the sources, not CSS-stretched upscales. Use lazy loading for below-the-fold subject cards and an appropriate eager/priority load for the hero. Specify width and height or aspect ratio to prevent layout shift.

| Filename | Placement | Crop and fallback |
| --- | --- | --- |
| `dashboard-hero-study-desk.png` | Work hero | Wide, `object-position: center`; on small screens hide or crop to a shallow band. Use solid canvas fallback. |
| `subject-computing-circuits.png` | Computing subject card | Square, centre crop; dark green fallback. |
| `subject-biology-fern.png` | Biology subject card | Square, centre crop; sage fallback. |
| `subject-maths-geometry.png` | Maths subject card | Square, centre crop; cream fallback. |
| `subject-history-archive.png` | History subject card | Square, centre crop; taupe fallback. The fictional collage is decorative, not historical evidence. |
| `focus-calm-wall.png` | Optional focus mode background | Wide; apply a solid reading surface behind timer and controls; plain canvas in simplified/high contrast mode. |

Example subject mapping: `{ computing: 'subject-computing-circuits.png', biology: 'subject-biology-fern.png', maths: 'subject-maths-geometry.png', history: 'subject-history-archive.png' }`. Treat that as a default mapping, not a requirement that users have these four subjects. Use SVG/icon components for controls and progress; do not extract controls from the concept image.

## 8. Responsive behaviour

| Width | Layout |
| --- | --- |
| ≥1200px | Sidebar + main two-column dashboard; plan and journey in the supporting column. Subject cards in a 4-column row if space permits. |
| 768–1199px | Narrower sidebar or labelled collapsible navigation; single main column with a 2-column subject grid. Plan follows next action. |
| <768px | Single column, compact top bar and explicit menu; next action and plan first, timer close behind. Subject cards 2 columns only if content remains legible. |
| <480px | Single subject column or horizontal card layout; full-width controls, no side-scrolling dashboard. Hero image reduced/hidden. |

Use content-based breakpoints and test at 320px, 375px, 768px, 1024px and wide desktop. Sticky navigation must never cover headings or controls. Timer and dialog controls must fit a small viewport and virtual keyboard.

## 9. Implementation sequence

1. Inventory existing routes, features, persisted data and user flows; capture current behaviour for tasks, sessions, notes, flashcards and AI tools.
2. Add design tokens, typography, shell and accessible navigation; keep old feature routes functional.
3. Build Work dashboard with real task/subject data and the next action. Integrate the asset pack with semantic fallbacks.
4. Refactor timer and plan interactions with durable state; then connect journey and quick actions to existing tools.
5. Add simplified/high contrast/OpenDyslexic/reduced motion preferences and mobile layouts.
6. Validate real task creation, interruption/resume, refresh, keyboard use, screen reader labels, zoom/reflow, image failure, offline/localStorage recovery and AI errors. Fix contrast after rendering with actual fonts and imagery.

**Done means:** no dead dashboard controls; the revision workflows still work; a learner can start a useful session quickly; work survives refresh; images can fail without loss of information; and the desktop and mobile interfaces meet the accessibility checks above.

## 10. Asset generation notes

These six assets were generated with the built-in image tool as a cohesive photorealistic editorial set. Prompt themes: a calm study desk by greenery; Computing keyboard and circuitry; Biology fern specimen; Maths geometry tools; History archival map collage; and an intentionally sparse wall for focus mode. Every prompt excluded legible text, logos, interface and Japanese motifs. Do not use the concept screenshot as a finished UI asset.
