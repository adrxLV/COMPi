# Implementation status

Project: `/home/adrxlv/Projects/computation-i-path`.

## Learning experience overhaul — implemented locally, not published

The baseline Pages app was audited in Chromium: weekly lessons mixed teaching with questions and allowed advancement after an incorrect answer. `docs/UX_AUDIT.md` records observed journeys, priorities, and limits; `docs/DUOLINGO_PRINCIPLES.md` distinguishes official product references from COMPi design decisions.

The local redesign has 22 source-aligned concept units across Weeks 1–7, assigning each of the existing 52 exercise IDs exactly once. The guided journey now separates teaching, one question per screen, and completion. Incorrect answers prompt a retry and conceptual explanation rather than advancement. Teaching can be revisited from any question without losing its place. The path recommends the next unit and offers review of due mistakes. Optional reference and loop demonstrations illustrate cause and effect; they are authored/verified illustrations, not claims of live tracing. Completion and first-try XP are based on recorded results, not invented rewards.

The existing Practice Arena, Python Playground, Exam Simulator, Mistake Lab, traps, and visualiser remain distinct modes. All are reachable on mobile through the bottom navigation and its More menu. Guided lessons hide navigation clutter. Lessons animate only when motion is permitted; the Reduce motion setting and OS preference disable it. The OS dark colour scheme now works; `index.html` no longer forces light mode.

## Source and scope

- Supplied preparation PDF read earlier: 90 minutes, four groups (3 multiple choice, 2 find/fix, 1 five-blank completion, one three-part continuing program). Group marks are literal X/Y placeholders; actual live test details are not established.
- Course Guide: first coding test is Week 7; final exam is later and covers the whole discipline. `docs/curriculum-matrix.md` and `docs/exam-blueprint.md` provide page-level source references.
- Shared-reference and list-copy detail is marked as enrichment where the source does not confirm it as assessed.

## Implementation and verification

- React/TypeScript/Vite, self-hosted fonts and brand assets; Pyodide 0.27.7 in a module worker for real Python execution and grading; IndexedDB v2 with migration from v1 preserving XP, completed answers, attempts and drafts; JSON export/import; static PWA assets under `/COMPi/`.
- `npm run build` passed, with Vite's non-fatal warnings about Node modules in Pyodide's browser build.
- `npm test` passed: 62 Vitest tests across 12 files and 9 Node content tests in the last recorded run.
- `npm run validate:content` and `npm run verify:pages` passed during integration. The generated Pages HTML resolves JS/CSS under `/COMPi/assets/` and does not include a CNAME.
- `node scripts/lesson-e2e.mjs` passed against the production preview in Chromium: wrong-answer retry/review and no retry XP, mid-lesson reload, completion and unlock, real Python grading, exam no-live-feedback, mobile navigation and layout at 390 px, touch-size tablet layout at 820 px with OS dark/reduced-motion emulation, and migration from a v1 IndexedDB profile.
- The preview and tests are **local**. There has been no commit, push or verified release of this redesign, and a local pass does not establish the state of `https://adrxlv.github.io/COMPi/`.

## Remaining acceptance gaps / limits

- The 52-item bank falls short of the larger 200+ exercise ambition. Some concept units have only one or two questions; they cannot offer a full graduated recognition → independent application → mastery sequence. Expanding and source-checking that bank is a separate content task.
- There is no measured learning-outcome study. The reference/loop teaching steps are lightweight interactive illustrations, not a full Python Tutor-style execution debugger. The existing trace viewer remains separate.
- Exam group 4 is modelled as three independent tasks rather than one continuing program, and exact-output grading has known alternative-answer limits. Official weighting is unknown.
- No physical iPad, iOS Safari, Android hardware, screen reader, Lighthouse or remote post-release test has been performed. Browser emulation is not equivalent to device testing. A fresh offline pass after this redesign and an import/export round trip in a real browser remain useful verification work.
- Publication remains the owner's responsibility under the standing instruction not to run GitHub commands. The owner must review local changes, publish them and verify the Pages workflow and remote site before treating the redesign as released.
