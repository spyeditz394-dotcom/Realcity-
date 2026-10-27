# REALCITY release progress

## Rules and execution constraints

- Browser-first, single-player 3D city game; prioritize broad browser compatibility and playable controls across mobile and desktop devices, not a single target handset. Target approximately 30 FPS on the OPPO A5 Pro, while treating CI/headless performance as a proxy only.
- Zero-cost workflow: GitHub and Vercel only; no paid services or accounts.
- Work only on `feature/realcity-protagonist-animation-audit`; commit in small steps and push. Never commit to `main`.
- Keep PR #2 open, draft, and unmerged. Do not open new PRs, merge, force-push, rewrite history, delete branches, change Vercel settings/environment variables/production domain, or print/commit secrets.
- Review both open PRs and record readiness verdicts; do not post GitHub reviews/comments/approvals.
- Fix root causes. Never weaken, skip, delete tests, or change expected values merely to pass.
- Mark DONE only with evidence: passing command, commit SHA, or artifact path.
- Update this log after each checklist item. Items requiring a physical device or live domain must be marked NEEDS DEVICE or NEEDS LIVE CHECK with exact manual steps.
- If a task still fails after three genuinely different fixes, or a required tool is unavailable free of charge, mark BLOCKED with the error/failing output and move on.
- Completion requires every item classified, final full pipeline passing on the exact final commit, branch pushed, and final report recorded here.

## Checklist

1. Reproduce reverse-from-rest failure and fix its cause in vehicle input/physics.
2. Make throttle, brake, coast, keyboard, touch-input, and delta-time tests deterministic using fixed timestep/injected clock, seeded inputs, no wall-clock timing; repeat runs.
3. Add a fixed-seed 100-transition vehicle state test with invariants at every step (finite values, speed limits, reverse from rest).
4. Re-run all four required scripts plus every other CI check.
5. Benchmark production build at 5/10/20/40 NPCs, at least three runs each; save raw JSON, upload CI artifacts, report median and p95 frame time per population.
6. Investigate bundle warning, optimize safely, and report before/after sizes.
7. Write real-Android manual test for frame pacing, memory, thermals, and sustained play; mark NEEDS DEVICE.
8. Verify protagonist GLB load/rig/locomotion, procedural fallback, and NPC animations in the running game.
9. Capture sedan screenshots (windshield, pillars, wheels), describe visible details, and verify entry/exit, collision, player movement; unverifiable visual claims must be NEEDS REVIEW with evidence path.
10. After items 1–9 are done or blocked, implement/test deterministic NPC navigation, collision avoidance, and deadlock recovery.
11. Complete/test NPC interaction lifecycle, traffic yielding, obstruction handling, and overlap recovery.
12. Confirm Vercel preview was built from the intended final working-branch commit.
13. Test preview canvas, controls, NPC interactions, interiors, settings persistence; capture screenshots, console logs, and performance traces.
14. Run every required test on the exact final commit; rerun if another commit is made.
15. Check whether production domain serves intended release; if inaccessible, record that explicitly.

## Baseline (before code changes)

- Repository: `spyeditz394-dotcom/Realcity-`
- Working branch: `feature/realcity-protagonist-animation-audit`
- Baseline branch SHA: `c64b64cc44f66af5f91182267c3b01c043aaaba5`
- Evidence: [GitHub Actions run 39921342010](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010), artifact [realcity-phase10-evidence](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010).
- `npm run check:types`: PASS.
- `npm run build`: PASS; `dist/assets/three-C5v72i0a.js` = **587.37 kB minified, 150.91 kB gzip**; app entry = 73.87 kB minified, 28.18 kB gzip. Vite warns that a chunk exceeds 500 kB.
- `npm run test:browser`: PASS in CI; 31 checks reported in the linked PR evidence, zero console/page errors and no HTTP error responses.
- `npm run test:performance`: FAIL — `Deliberate reverse from rest did not move backward`; negative-speed assertion remains enabled.
- Additional CI gates `npm run validate:assets` and `npm run validate:glb`: PASS.
- These are CI results, not a physical-device or live-production test. The performance script stops before its later benchmark matrix because the reverse regression fails.

## Item ledger

| Item | Status | Commit SHA | Evidence | Notes |
|---:|---|---|---|---|
| 1 | DONE | c64b64cc44f66af5f91182267c3b01c043aaaba5 | [CI run 39921342010](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010); build size above | Baseline captured before edits; performance script failed. |
| 2 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `scripts/realcity-mobile-performance.mjs`; baseline CI failure | Full deterministic matrix and repeated-run evidence still required. |
| 3 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `scripts/realcity-mobile-performance.mjs` | 100-transition seeded invariant test not yet verified. |
| 4 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | [CI run 39921342010](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010) | Baseline commands ran; final pipeline must pass on final SHA. |
| 5 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `scripts/realcity-mobile-performance.mjs`; intended artifact `test-results/realcity-npc-benchmarks.json` | Harness contains 5/10/20/40 × 3-run matrix, but failure prevents reaching/saving it. |
| 6 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | Build log in CI run 39921342010 | Baseline Three.js chunk 587.37 kB minified / 150.91 kB gzip; optimize and measure after. |
| 7 | NEEDS DEVICE | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `docs/device-test.md` | Physical-device session required; manual steps are in the device guide. |
| 8 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | Browser smoke CI and `ASSET_MANIFEST.json` | Automated asset gates passed; live visual/animation verification remains. |
| 9 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | Browser smoke artifact in CI run 39921342010 | Fresh sedan screenshots and gameplay confirmation still required. |
| 10 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `src/ai/npc-brain.ts` | Existing navigation code exists; required deterministic behavior tests not verified. |
| 11 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `src/main.ts`, `src/ai/npc-brain.ts` | Full interaction/traffic lifecycle suite not verified. |
| 12 | NEEDS LIVE CHECK | c64b64cc44f66af5f91182267c3b01c043aaaba5 | Vercel deployment metadata required | Must match the final branch SHA; current final SHA does not exist yet. |
| 13 | NEEDS LIVE CHECK | c64b64cc44f66af5f91182267c3b01c043aaaba5 | Preview browser evidence required | Canvas, controls, NPCs, interiors, settings, screenshots/logs/traces. |
| 14 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | [CI run 39921342010](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010) | Must rerun on exact final SHA. |
| 15 | NEEDS LIVE CHECK | c64b64cc44f66af5f91182267c3b01c043aaaba5 | Production URL check required | Do not change production domain/settings. |

## PR review (initial)

- [PR #1](https://github.com/spyeditz394-dotcom/Realcity-/pull/1): OPEN, non-draft, unmerged; head `rebuild/stability-graphics-foundation`, base `part-9-visual-realism-overhaul`. Not ready to merge into this release as-is: it targets a different branch/base, and its own description leaves visual/device verification outstanding. No review/comment/approval posted.
- [PR #2](https://github.com/spyeditz394-dotcom/Realcity-/pull/2): OPEN, DRAFT, unmerged; head `feature/realcity-protagonist-animation-audit`, base `main`. NOT READY: baseline performance regression fails and required final-SHA/device/live verification remains. Keep draft and unmerged.

## Cross-device compatibility policy

Treat “playable on every device” as the engineering goal of broad compatibility, responsive controls/layout, graceful WebGL/graphics fallbacks, and adaptive quality across supported mobile/desktop browsers. It cannot be honestly guaranteed for every device/browser/GPU combination; document unsupported WebGL/browser cases and use a compatibility matrix. CI emulation does not certify physical hardware.

## Final report

IN PROGRESS. The final report must replace this section with the final pipeline result, final commit SHA, PR readiness, item ledger, and exact manual procedures/evidence for NEEDS DEVICE, NEEDS LIVE CHECK, and NEEDS REVIEW items.
