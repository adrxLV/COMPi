# Implementation status

Project: `/home/adrxlv/Projects/computation-i-path`.

## Source and scope
- Supplied preparation PDF read: 90 minutes, four groups (3 MC, 2 find/fix, 1 five-blank completion, one three-part continuing program). Group marks are literal X/Y placeholders; actual live test details are not established.
- Course Guide: first coding test is Week 7; final exam is later and covers the whole discipline. `docs/curriculum-matrix.md` and `docs/exam-blueprint.md` provide page-level source references.

## Working implementation
- COMPi React/TypeScript/Vite app using the supplied brand symbol, cream/navy/blue design tokens and self-hosted Outfit, Inter and JetBrains Mono. Desktop/sidebar and mobile bottom navigation, seven lessons, 52 validated exercises in all 12 data types (35 core + 17 source-aligned traps), filtered arena, Python traps, Mistake Lab, real progress and estimate, practice simulation, playground, trace viewer and settings.
- Fixed-answer grading; code execution/grading/tracing via pinned Pyodide 0.27.7 in a dedicated module worker with ordered input, limits and hard cancel/timeout. Versioned IndexedDB progress, JSON export/import, self-hosted offline PWA and repository-subpath production build.
- The 17 source-aligned traps are integrated into Weeks 4–7 and passed content validation, CPython expected-output checks and coding reference cases.

## Verified commands and browser evidence
- `npm run build` passed with subpath `/COMPi/` and 36 precached files in latest build (including locally hosted font files, brand icons and Pyodide).
- `npm test`: 31 Vitest tests and 9 Node content tests passed, including the 17 integrated traps.
- `npm run validate:content`: 7 lessons, 52 exercises. CPython verified 22 deterministic snippet answers and all reference coding cases.
- Chromium production preview: completed first lesson, earned 10 XP, refreshed twice and retained it; edited Python, ran multiple `input()` calls with prompts and saw `A? B? 78`; ran Python offline after service-worker cache completed; 390 px emulated phone showed no horizontal overflow; exam displayed 9 grouped questions, saved an answer across reload, and submitted with post-exam feedback. Following branding, a fresh production browser showed the COMPi logo, Outfit heading, light canvas, 52 activities, 390 px mobile without overflow, 36/36 offline assets cached, and a fresh offline Python run printing `[1, 2, 3, 4]`.
- Repository-path regression: `npm run build && npm run verify:pages` passed (36 precached assets); generated HTML resolves JS/CSS under `/COMPi/assets/` and `dist/CNAME` is absent. Chromium preview at `http://127.0.0.1:4173/COMPi/` rendered the app and executed Python (`[1, 2, 3, 4]`). These fixes are local until the owner pushes them.
- No actual iOS Safari/iPad hardware, Android hardware, Lighthouse or screen-reader test has occurred. The currently published Pages URL was observed blank before this local correction; the corrected remote deployment has not been verified.

## Remaining acceptance gaps
- 200+ high-quality exercises not met (52 currently). Nested shallow-copy and object-graph pedagogy remains limited; the newly integrated alias/copy item is explicitly labelled enrichment, not confirmed first-test scope.
- Exam group 4 is three independent tasks, not one continuing scenario. No official weighting; deterministic paper; multipart alternate wording can fail exact grading.
- Visualiser exposes real traced bindings and identity snapshots but no sophisticated object graph animation or full Python debugger. Deep alias diagrams are not yet independently QA-tested.
- Revision scheduling is simple; the mastery estimate does not establish later retention. Achievements/streaks are derived from recorded work.
- End-to-end automated UI suite, import/export real-browser round trip, true iPad test and live deployment verification remain outstanding.

## Owners
- Primary integrator: cross-feature integration and QA. Delegated curriculum docs, 35-item core bank, Pyodide runtime, CSS and 17-item traps extension have been reviewed/integrated.
