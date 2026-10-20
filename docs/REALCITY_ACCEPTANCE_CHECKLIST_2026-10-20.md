# REALCITY acceptance checklist — 2026-10-20

This is a live engineering checklist, not a declaration of completion. A box is checked only when the named evidence exists for the candidate commit. "Not run" and "unavailable" are not passes.

## Repository safety
- [x] Confirmed PR #2 is open, draft, and unmerged; base SHA `3772a0279978d8a23f6f05593530431c485ced4a`.
- [x] Confirmed candidate branch is `feature/realcity-protagonist-animation-audit`; do not modify `main`, merge PR, or change production traffic.
- [ ] Verify final candidate commit and PR state again after all fixes.

## City and world
- [x] Source loops through a 32 × 32 (1,024-cell) block grid; seeded deterministic RNG currently uses fixed seed 17031.
- [ ] Road surfaces, curbs, and markings span the full expanded world; regression CI must pass after the full-span road fix.
- [ ] Verify all eight district categories and seven landmark placements through runtime/browser evidence.
- [ ] Verify collision and spawn checks, including edge clearance and vehicle obstruction.
- [ ] Verify city loading, memory, and startup stability under browser test.
- [ ] Verify district/world traversal does not expose gaps or inaccessible blocks.

## Gameplay and assets
- [ ] Browser regression: startup, protagonist movement/animation/jump, camera, touch controls, NPC motion, driving/braking/exit, settings, pause/recovery/reload.
- [ ] Browser console and HTTP request checks pass.
- [ ] All locally bundled GLB validation passes and provenance/licensing remains documented.
- [ ] Compare current in-game screenshots against a baseline; no screenshot comparison yet qualifies as completed.
- [ ] Confirm asset fallbacks work when an optional character asset is missing/invalid.

## Build, deployment, performance
- [ ] Dependency install and lockfile consistency.
- [ ] TypeScript check and asset validation.
- [ ] Production build.
- [ ] Browser smoke test and emulated performance test pass against the final commit.
- [ ] Latest Vercel preview maps to the final candidate SHA, is READY, and is browser-tested.
- [ ] OPPO A5 Pro physical-device gate: not yet available to this agent; requires a real-device session and cannot be inferred from emulation.

## Known defect found during this pass
- The source had a 32 × 32 block generator but the main road/curb/marking loop still covered only k = -6…6 and road segments of 340 units. This contradicted the expanded city extent. Fixed on the feature branch by extending the network to CITY_HALF and CITY_EXTENT + 40; CI must confirm no regressions.
- Candidate SHA after this fix: `fe88ac6160247a595eacef117d2444b30aa3d8ba`.
- CI at last inspection: validation workflow in progress. The prior candidate's browser test failed the collision-clearance assertion; that failure is not waived and needs diagnosis/retest.
