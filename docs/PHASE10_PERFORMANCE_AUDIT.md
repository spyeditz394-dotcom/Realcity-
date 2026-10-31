# REALCITY Phase 10 — Continuation Audit

Date: 2026-10-21
Branch: `feature/realcity-protagonist-animation-audit`
Remote baseline: `82296c1ae1ac6df084fe9a876dd2ace1c7f80ca1`

## Findings and changes

- Confirmed remote branch head `82296c1`, successful GitHub Actions run #257, and READY Vercel preview for that commit.
- Added an npm-generated `package-lock.json` from the actual project manifest. `npm ci --no-audit --no-fund` passed. The lockfile is npm v1 format; npm reports an old-lockfile metadata refresh, so a modern lockfile refresh should be committed with a newer npm environment.
- Changed CI installation from `npm install` to `npm ci --no-audit --no-fund`.
- Added idempotent build-time GLB alignment repair for five vehicle assets. It adds only required padding bytes and updates chunk/total lengths; geometry, materials, and embedded data are otherwise preserved. GLB validation now fails on unaligned chunk lengths instead of merely warning.
- Stabilized the performance harness with a per-run preview port, failed-request URL telemetry, event-based vehicle movement observation, brake-to-low-speed before exit, and a 12-second frame sample window. These fix reproduced harness flakiness under throttled SwiftShader RAF; they do not fake FPS.

## Comparable software-rendered measurements

Latest retained successful GitHub Actions artifact from run #257 (commit `82296c1`):
- Mobile-low emulation: 10.6 FPS; median 99.9 ms; p95 100.1 ms.
- Mobile-medium emulation: 9.4 FPS; median 100.1 ms; p95 116.7 ms.
- Desktop reference: 1.5 FPS; median 666.6 ms; p95 716.6 ms.

Continuation run under the same viewport/quality profiles:
- Mobile-low emulation: 8.6 FPS; median 116.7 ms; p95 116.8 ms; 71 draw calls; 94,304 triangles; pixel ratio 0.85.
- Mobile-medium emulation: 7.5 FPS; median 133.3 ms; p95 133.4 ms; 84 draw calls; 108,786 triangles; pixel ratio 0.85.
- Desktop reference: 1.4 FPS; median 700 ms; p95 783.3 ms; 161 draw calls; 107,307 triangles; pixel ratio 1.0.

This continuation run is slower than the prior artifact; no FPS improvement is claimed. The game rendering/simulation source was not changed in this continuation. SwiftShader host variability means these results do not establish a physical-device regression or improvement. Synchronous renderer-call CPU timings (about 2.64–5.60 ms average) are not GPU execution timings. JS update averages were about 0.54–0.70 ms. Software rendering dominates these emulated frame intervals; actual Android GPU behavior remains unknown.

## Verification in the sandbox

- `npm ci --no-audit --no-fund`: PASS.
- `npm run check:types`: PASS.
- `npm run validate:glb`: PASS, 25 structural checks; three optional protagonist clips remain warnings.
- `npm run validate:assets`: PASS, all 12 local assets validated with zero GLB alignment warnings/failures after repair.
- `npm run build`: PASS; Vite still warns about a chunk over 500 kB minified. Three.js is already isolated as a vendor chunk; no further split was made because it is statically required at startup and no startup-time benefit was demonstrated.
- `npm run test:browser`: PASS; 31 checks, zero browser/page console errors and zero failed HTTP responses.
- `npm run test:performance`: PASS after harness stabilization. All three profiles produced measurements and expected low-FPS SwiftShader warnings; zero browser errors and zero failed HTTP responses.
- `git diff --check`: PASS before local commit.

## Asset warning disposition

The protagonist includes compatible idle, walk, run, and jump clips. Optional `land`, `turnleft`, and `turnright` clips are absent; runtime fallback remains in place and browser checks exercise idle/walk/run/jump. Both pedestrian GLBs lack embedded clips and use the tested procedural bone-animation fallback; browser tests verify pedestrians move over time. Warnings remain visible rather than suppressed.

## Unverified / remaining

- Physical OPPO A5 Pro FPS, thermals, GPU memory, and sustained-play stability are UNVERIFIED; no physical phone was attached.
- The approximately 30 FPS target is not demonstrated.
- Vite's large-chunk warning remains; no unmeasured bundle-splitting change was made.
- The new branch deployment must be observed after CI; free deployment quota may block a fresh preview.
- PR #2 must remain open/draft/unmerged; `main` remains unchanged.
