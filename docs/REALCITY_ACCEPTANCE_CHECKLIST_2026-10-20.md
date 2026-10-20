# REALCITY acceptance checklist — 2026-10-20

This is a live engineering checklist. A box is checked only when the named evidence was observed. "Not run", "pending", and "unavailable" are not passes.

## Repository safety
- [x] Feature branch is `feature/realcity-protagonist-animation-audit`; no `main` edits were made.
- [x] PR #2 is open, draft, and unmerged; base/main SHA remains `3772a0279978d8a23f6f05593530431c485ced4a`.
- [ ] Verify final PR and deployment state after the latest documentation commits.

## City and world
- [x] Generator loops through 32 × 32 = 1,024 city cells.
- [x] Road/curb/marking network extended across full 640-unit extent with 33 grid lines per axis.
- [x] Seeded procedural RNG is deterministic with fixed seed 17031.
- [x] Browser QA asserts all eight districts and all seven landmark sign labels are generated.
- [x] Browser QA passed collision probe, movement, jump, pedestrian, vehicle and settings lifecycle on source candidate `891f68ec8095b5712dab0b0b7c7539b75b3a9071`.
- [ ] Manual in-game exploration and live-deployed URL session remain unverified.

## Gameplay and assets
- [x] TypeScript check, production build, and local bundled GLB asset validation passed in GitHub Actions for candidate `891f68ec8095b5712dab0b0b7c7539b75b3a9071`.
- [x] Browser smoke test passed on that candidate: protagonist movement/animation/jump, touch controls, pedestrian motion, vehicle entry/driving/braking/exit, settings persistence, collision probe, browser console and HTTP error checks.
- [x] Tree trunks, crowns and flower heads are instanced by 80-unit spatial chunk on candidate `891f68ec8095b5712dab0b0b7c7539b75b3a9071`.
- [ ] Visual before/after screenshot comparison not complete; CI screenshots exist but no verified baseline comparison has been completed.
- [ ] High-fidelity photorealistic art is not achieved; current models/materials remain stylized/low-to-mid fidelity.
- [ ] Full emergency service gameplay, missions, story/progression and combat are not implemented in this phase.
- [ ] World is still generated up front; district streaming is not implemented.

## Build, deployment, performance
- [x] Vercel preview READY for source candidate `891f68ec8095b5712dab0b0b7c7539b75b3a9071`: https://realcity-fbruapswz-spyeditz394-4635s-projects.vercel.app/
- [x] GitHub Actions TypeScript, production build, asset validation and browser smoke test passed on candidate `891f68ec8095b5712dab0b0b7c7539b75b3a9071`.
- [ ] Final-candidate performance test was still running when the audit was updated; it must be checked for completion.
- [ ] Latest documentation commit must receive its own final build/browser/performance checks and matching READY preview.
- [ ] Live deployed URL gameplay could not be exercised directly because the browser access path was unavailable in this session.
- [ ] Physical OPPO A5 Pro verification remains unresolved; no real-device session is available to the agent.

## Performance evidence
Completed emulated run on candidate `891f68ec8095b5712dab0b0b7c7539b75b3a9071` used headless Chromium 156 + SwiftShader:
- Mobile-low 360 × 800: 13.3 FPS, median 66.8 ms, p95 83.4 ms, approximate JS heap 76.6 MB.
- Mobile-medium 390 × 844: 12.5 FPS, median 83.3 ms, p95 83.4 ms, approximate JS heap 68.0 MB.
- Desktop 1280 × 720: 5.8 FPS, median 166.7 ms, p95 200.0 ms, approximate JS heap 103 MB.
- Tracked static meshes decreased from 11,578 to 9,233 (about 20.2%) after foliage instancing; no browser errors or failed HTTP responses in these profiles.
- These are software-rendered emulation results, not physical-device measurements. Performance remains far below the 30 FPS target.

## Current decision
**Not complete.** Automated gameplay tests pass on the source candidate, but the final-candidate performance run, latest documentation-commit CI, live deployed-URL interaction, screenshot comparison, and physical OPPO A5 Pro acceptance remain unresolved. Do not merge PR #2 or modify `main`.
