# COMPi

An original, local-first Python practice app for **Computation I, Weeks 1–7**, chiefly the first coding test. It uses the user-supplied COMPi brand kit; it is not an official NOVA IMS product or past paper. The supplied preparation test is 90 minutes with four groups; its point values are placeholders. The **final course exam** covers later weeks too, so this app is not a complete final-exam syllabus.

## Brand and offline assets

COMPi's navy/blue/mint/gold/cream visual system and symbol follow the supplied `COMPi_Complete_Brand_Kit.zip`. Its SVG is a clean reconstructed interpretation of the approved raster, not an exact vector extraction. Outfit, Inter and JetBrains Mono are bundled locally via Fontsource; their SIL Open Font Licences are retained in `public/licenses/`. A darker interactive blue is used on small text and button fills to maintain contrast. The app defaults to the kit's light design. No remote font service is required.

## Run locally

```bash
npm ci
npm run validate:content
npm test
npm run build
npm run preview -- --port 4173
```

Open `http://localhost:4173/COMPi/`. Development: `npm run dev` and open the URL printed by Vite under `/COMPi/`. Python runs entirely in a dedicated browser worker via pinned Pyodide 0.27.7; no account, backend, external runner, or AI API is required. The initial full PWA cache includes approximately 14 MB of self-hosted Python assets. Settings reports exact offline cache readiness. Wait for completion before going offline.

## Deploy to GitHub Pages

The repository is configured with Vite `base: '/COMPi/'` and hash navigation. Publish the contents of `dist/` at a repository named `COMPi`, or set `VITE_BASE=/your-repository/ npm run build` for another name. GitHub Pages serves only static files. The manifest scope, service worker and worker asset paths use the repository subpath. **No remote Pages deployment has been performed or verified.** Changing the base requires a new build and first online visit to precache the new origin/path.

## What works

- Seven source-aligned lessons, a connected progression path, 12 interaction renderers, filtered practice, Python traps and a mistake review queue.
- Fixed-answer grading in TypeScript and real Python execution for code submissions with independent input/output cases. The interpreter accepts ordered `input()` values, captures prompts/stdout/errors, and can be cancelled or timed out by terminating the worker.
- Python trace snapshots for a supported subset: executed Python lines, visible bindings and their object identities, values and accumulated stdout. Previous steps replay stored snapshots rather than executing Python backwards. Built-in C-level calls are not traced. Complex objects are truncated; the trace is not a debugger for arbitrary libraries.
- A 90-minute or untimed *practice simulation* with grouped modes, navigation, flags, answer autosave, wall-clock timer recovery, and post-submission checks. It models response types, **not** the actual paper's marking scheme or integrated continuing open task.
- IndexedDB progress, one-time first-try XP, a simple revision schedule, derived concept-evidence estimate, streak and achievements, and versioned JSON export/import. Import replaces rather than merges and requires confirmation. Browser data is device/profile/origin-specific and may be evicted.
- Offline assets after complete precaching, including Python execution. The execution worker and caching service worker have separate duties.

## Educational sources and rights

See `docs/curriculum-matrix.md` and `docs/exam-blueprint.md`. The app contains **original and adapted questions with source references**, not embedded lecture PDFs or a redistribution of the supplied Moodle ZIP. The example assessment is a preparation paper; live-paper timing, marks and exact question mix are unconfirmed. `docs/source-inspection.txt` is a local working extraction of supplied copyrighted course PDFs; **do not publish it**. Exclude it from any public repository or distribution.

## Known limitations

- The target of **200 validated distinct exercises is not met**. Run `npm run validate:content` for the exact current count. Breadth across all source-derived subtopics, especially extended reference semantics, remains incomplete.
- Several formats share fixed-answer controls; the memory question is not yet a full object-diagram puzzle, and fixed traces are not a per-step assessment. Exam multipart answers are exact-key comparisons; valid alternative wording may be marked wrong.
- Coding tests compare output for supplied cases. A requirement such as *use `for`* is explained but **not enforced semantically**; client-side cases cannot be secret from users.
- The revision scheduler is deliberately simple, not FSRS; mastery is labelled an estimate based on unaided first-try answers and does not prove retention. The practice paper is deterministic and its open tasks do not form a single continuing scenario.
- No iOS Safari/iPad hardware, Android hardware, Lighthouse, screen-reader or remote GitHub Pages deployment tests have been performed. Chromium desktop, emulated mobile viewport and offline browser reload were exercised locally. Browser workers isolate responsiveness but are not a perfect security sandbox.

## Checks

`npm test` runs Vitest and the Node content-validation suite. `npm run validate:content` checks source references, schemas, links, answer shapes and IDs. `python src/content/verify_snippets.py` checks deterministic reference answers in CPython; `python src/content/solutions_test.py` exercises reference coding solutions. `npm run build` type-checks and produces a subpath build with a generated precaching service worker. Actual browser runs and remaining limitations are documented in `docs/IMPLEMENTATION_STATUS.md`.
