# Decisions

- Product: **COMPi**, using the user-supplied COMPi Complete Brand Kit. This remains an original offline-first Computation I practice app, not an official university tool. The supplied vectors are reconstructions of the approved raster symbol, not exact vector extractions. Canonical colours are navy `#17233F`, blue `#4D7CFE`, mint `#C8F169`, gold `#FFC857`, cream `#FFF8EE`, slate `#667085`; accessible blue variants are used for small text and button fills. Self-hosted Outfit/Inter/JetBrains Mono fonts retain their OFL licences in `public/licenses/`.
- Scope: Weeks 1–7 for the first coding test, not the whole course final exam. The Course Guide says the final exam covers the full discipline; a supplied preparation test has 90 minutes and four groups with placeholder marks. No official scoring weights are inferred.
- Architecture: React + TypeScript + Vite at `/COMPi/`, hash navigation for GitHub Pages, IndexedDB for progress, versioned JSON portability, a lazy Web Worker for real Python. Fixed questions use Python-verified keys graded in TypeScript. Code is never translated to JavaScript.
- Privacy: no account or server, no telemetry. User-authored code executes locally. Client-side fixtures are inspectable and not secret.
- Offline: self-hosted pinned Pyodide and a precache service worker. The service worker is separate from the Python execution worker.
- Assessment: first unaided correct answer grants one-time XP; XP is not mastery. Review queue is simple and explainable, not a validated retention model.
- Exam simulator: modelled after supplied preparation paper, marked explicitly as original practice. The PDF shows `X`/`Y` placeholders, so no official point weighting.
