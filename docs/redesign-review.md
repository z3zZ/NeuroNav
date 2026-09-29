# NeuroNav journey review — 29 September 2026

Reviewed against [the supplied redesign brief](../NeuroNav-Redesign-Brief.md), originally supplied in Downloads and now included with this review.
Baseline: repository and https://neuro-nav.vercel.app, isolated Edge browser contexts at 1440 × 1000 and 375 × 812. Screenshots are in `artifacts/before-*`. The deployed first-run and empty Work views match local behaviour. No live user data was changed.

## Priorities before implementation

| Priority | Finding and evidence | User consequence | Intended fix |
| --- | --- | --- | --- |
| P1 | Setup has five screens: name, subjects, energy, length, preferred time. Completion inserts generated tasks without a preview. | Planning precedes useful revision; the learner inherits an unchosen plan. | One subject-first screen; optional details; no automatic task bulk creation. Preserve old setup drafts and preferences. |
| P1 | Work's next action starts an entire subject when no task exists. Timer, journey and tools each choose their own context. | The learner must work out the missing topic and concrete task; progress can be attached to different contexts. | Guided subject → topic → small task → focus → review, using existing records and durable state. |
| P1 | Setup/add/edit use free-text subject names. Add/edit expose image, colour, difficulty and energy controls together. | Unnecessary typing and decisions; imagery appears to need manual curation. | Shared subject dropdown, Other custom entry, automatic imagery, optional advanced fields. Preserve custom names and explicit existing image choices. |
| P1 | Pending reflection is separate from the Work suggestion; starting again can replace it. | An interrupted review becomes hard to resume. | Surface pending review as the next action; retain it until saved or explicitly skipped. |
| P2 | Empty Work repeats empty states across hero, plan, subjects and journey. Desktop plan stretches across two rows. Generic timer defaults to 45 minutes. | Little guidance despite a long dashboard; substantial mobile scrolling and competing actions. | Keep primary guidance first, compact secondary timer setup, natural-height plan, shorter new-user defaults. |
| P2 | Printed dates already use en-GB, but native date inputs are browser-locale dependent. Calendar validation accepts rollover dates in the helper. | Ambiguous entry and potential invalid dates. | Explicit DD/MM/YYYY entry with real-calendar validation; retain ISO storage. |
| P2 | Accessibility foundations are present (landmarks, labels, focus, reduced motion, contrast, decorative images), but new flows need rendered validation. | A visual restyle alone would not verify usable forms and reflow. | Keyboard, invalid forms, 320–1440px reflow, OpenDyslexic/large text, contrast and axe checks. |
| P3 | Responsive AVIF/WebP, eager hero, lazy subject images and pattern fallbacks are already implemented. The hero consumes close to half a narrow desktop card. | Sound asset integration, but content space is scarce. | Preserve assets and fallback behaviour; give the action more room. No replacement asset generation needed. |

## Preservation boundaries

Keep v2 storage keys and record shapes, legacy migration/recovery, subject/topic IDs and links, task editing/undo/defer, timestamp timer/breaks, notes, flashcard review, local quiz/tool outputs, journey evidence and display settings. The user subsequently requested that the changes be committed to GitHub.

## Implemented result

- One-screen, subject-first setup. The same dropdown plus Other is used for adding and editing subjects. Name, exam date, difficulty/energy and visual overrides are optional; existing custom names and saved records remain intact.
- The four supplied subject photos resolve automatically from the subject name, including existing name aliases. Other subjects retain decorative pattern/colour fallbacks. Hero text has more room; the planning form uses a solid surface without downloading an unseen hero photo.
- Work helps choose an existing or new topic and an editable small task, with a 10-minute default and 5/15/25-minute alternatives. It saves real topic/task records before starting the existing focus timer. Existing tasks retain one-click start and task selection.
- Subject/topic and journey links lead back to the same guided task form. Session context carries into journey progress and the initial quick-tool selection. A pending review takes precedence over starting another session; reflections remain skippable. Review offers a note or existing flashcard deck for that topic.
- Idle timer configuration is a labelled disclosure; running sessions remain visible. Empty-state repetition and stretched plan-card space are reduced. All navigation and revision tools remain available.
- Date fields explicitly use DD/MM/YYYY independently of browser locale. Stored dates remain ISO; impossible calendar dates are rejected. Existing UK display formatting is retained.
- Setup and guided-task drafts save immediately. This also fixes the shared draft hook's loss of recent input when navigating before its old debounce completed. Legacy setup subjects/preferences are resumed without generating a new bulk plan.
- Sub-minute sessions no longer round up to a full minute, matching the existing message and journey evidence threshold.

## Validation

`npm run build` passes TypeScript and creates the production bundle. `npm run test:e2e` passed 18 browser tests (nine scenarios each at desktop 1440 × 1000 and mobile 375 × 812) against that bundle in Edge, deliberately using an en-US browser locale to check UK date entry.

Coverage: full subject/topic/task/focus/review flow; draft refresh; pause/interruption/resume; breaks and timer completion; pending-review protection; reflection/task completion; automatic images for all four asset subjects; Other/custom subject edit; valid/invalid UK dates; review notes; flashcard practice; task edit and undo; topic links overriding unrelated drafts; legacy setup and revision migration; corrupt-data backup; image failure; offline work after the app has loaded; local-tool error and retry.

Two additional selector regression checks pass: past-exam subjects remain usable, while an upcoming exam takes priority over a past one. The test command now includes these alongside the 18 flow tests.

Reflow checks passed at 320, 375, 768, 1024 and 1440px. Axe reported no violations in the tested Work variants (light, dark, high contrast, and OpenDyslexic + extra-large + loose spacing + reduced motion) and on Subjects, Tasks, Flashcards, Notes, Journey and Settings in their tested populated state. A separate keyboard-only run completed setup, topic/task creation, focus, pause and finish, checking focus after navigation and control changes. Before/after desktop and mobile screenshots were inspected locally; evidence is in the ignored `artifacts/` directory.

Limits: mobile is browser emulation, not a physical iPhone/Android check; no screen-reader speech session was available. 320px checks exercise narrow reflow, not every browser's native 400% zoom implementation. Offline checks cover continued local work after loading; this does not add an offline-first service worker. These results are not a claim of complete WCAG conformance.
