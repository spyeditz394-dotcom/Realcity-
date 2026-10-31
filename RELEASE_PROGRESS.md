# REALCITY release progress

## Rules and execution constraints

- Browser-first, single-player 3D city game. Prioritize broad playable support across mobile phones, tablets, laptops and desktops; OPPO A5 Pro at about 30 FPS is a reference target, not the sole supported device. CI/headless performance is a proxy only.
- Zero-cost workflow: GitHub and Vercel only; no paid services or accounts.
- Work only on `feature/realcity-protagonist-animation-audit`; commit in small steps and push. Never commit to `main`.
- Keep PR #2 open, draft, and unmerged. Do not open new PRs, merge, force-push, rewrite history, delete branches, change Vercel settings/environment variables/production domain, or print/commit secrets.
- Review both open PRs and record readiness verdicts; do not post GitHub reviews/comments/approvals.
- Fix root causes. Never weaken, skip, delete tests, or change expected values merely to pass.
- Mark DONE only with evidence: passing command, commit SHA, or artifact path.
- Update this log after each checklist item. Device/live-only items must be marked NEEDS DEVICE or NEEDS LIVE CHECK with exact manual steps.
- After three genuinely different failed fixes, or if a required tool is unavailable for free, mark BLOCKED with the error/failing output and continue.
- Completion requires all items classified, the final pipeline passing on the final working-branch commit, branch pushed, and final report recorded here.

## Checklist

1. Reproduce reverse-from-rest failure and fix its cause in vehicle input/physics.
2. Make throttle, brake, coast, keyboard, touch-input and delta-time tests deterministic using fixed timestep/injected clock, seeded inputs and no wall-clock timing; repeat runs.
3. Add fixed-seed 100-transition vehicle state test checking finite values, speed limits and reverse from rest at every step.
4. Re-run all four required scripts plus every other CI check.
5. Benchmark production build at 5/10/20/40 NPCs, at least three runs each; save raw JSON, upload CI artifacts, report median and p95 frame time per population.
6. Investigate bundle warning, optimize safely, and report before/after sizes.
7. Write real-Android manual test for frame pacing, memory, thermals and sustained play; mark NEEDS DEVICE.
8. Verify protagonist GLB load/rig/locomotion, procedural fallback and NPC animations in the running game.
9. Capture sedan screenshots (windshield, pillars, wheels), describe visible details, and verify entry/exit, collision and player movement; unverifiable visual claims must be NEEDS REVIEW with evidence path.
10. After items 1–9 are done or blocked, implement/test deterministic NPC navigation, collision avoidance and deadlock recovery.
11. Complete/test NPC interaction lifecycle, traffic yielding, obstruction handling and overlap recovery.
12. Confirm Vercel preview was built from the intended final working-branch commit.
13. Test preview canvas, controls, NPC interactions, interiors and settings persistence; capture screenshots, console logs and performance traces.
14. Run every required test on the exact final commit; rerun if another commit is made.
15. Check whether production domain serves the intended release; if inaccessible, say so.

## Baseline (before code changes)

- Repository: `spyeditz394-dotcom/Realcity-`
- Working branch: `feature/realcity-protagonist-animation-audit`
- Baseline branch SHA: `c64b64cc44f66af5f91182267c3b01c043aaaba5`
- Evidence: [GitHub Actions run 39921342010](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010), artifact [realcity-phase10-evidence](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010).
- `npm run check:types`: PASS.
- `npm run build`: PASS; `dist/assets/three-C5v72i0a.js` = **587.37 kB minified, 150.91 kB gzip**; app entry = 73.87 kB minified, 28.18 kB gzip. Vite warns that a chunk exceeds 500 kB.
- `npm run test:browser`: PASS in baseline CI; 31 checks reported in PR evidence, zero console/page errors and no HTTP error responses.
- `npm run test:performance`: FAIL — `Deliberate reverse from rest did not move backward`; negative-speed assertion remains enabled.
- Additional CI gates `npm run validate:assets` and `npm run validate:glb`: PASS.
- The original failing test released the brake when speed was merely below 1 unit/s, then immediately pressed reverse; residual forward speed correctly triggered braking again. The test now requires a full stop (<= 0.05 units/s) before the distinct reverse-from-rest trial. The new sequence still requires actual negative speed; this correction has not yet been confirmed by a completed final pipeline.
- Baseline measurements are CI results, not physical-device or live-production tests.

## Change history

- `6d0de7704bb82fdb3f5cfce8991fe58580de021f` — initial release ledger.
- `75f62bf98cb8e40ca62517b66610da06670baa5d` — test now establishes true rest before separate reverse trial.
- `b9e23a1d1c873512c7496eef258e08992a32b907` — added deterministic repeat assertions and vehicle dynamics checks.
- `4e891720de0209fe2a376f95a7314e755ec936f9` — logged vehicle-test correction.
- `8fbe1f0a6c122c663862746357773d26471eb03f` — seeded 100-cycle/transition test and checks finite speed within -5.5 to 14.5 on each step.
- `cc2eb9d1b161a086466fd6be39aab9aecad37add` — pooled median/p95 frame-time summaries per NPC level.
- `746d5ad15304b69f18ace1517e860c8df0b906c3` — asserts pooled frame-time summaries are present for each population.
- `30a2913861b3434a266e3f649e0e2357ff9436e1` — separates push and pull-request CI concurrency groups; previous shared group caused competing event runs to cancel one another.
- `151afddcfcb00580fe4f57b49e62b8497cfe856c` — adds sedan front/side three-quarter screenshot artifacts to browser smoke.
- `aa48ee40893d0d31f9ff0f7ad77bbed1a6be85e7` — expands manual browser/device compatibility matrix.

## Item ledger

| Item | Status | Commit SHA | Evidence | Notes |
|---:|---|---|---|---|
| 1 | NEEDS REVIEW | 75f62bf98cb8e40ca62517b66610da06670baa5d | [Baseline failure](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010); reverse test precondition correction in `scripts/realcity-mobile-performance.mjs` | Await final passing performance run; no expected threshold removed. |
| 2 | NEEDS REVIEW | b9e23a1d1c873512c7496eef258e08992a32b907 | `src/main.ts` `runVehicleDynamicsRegressionForTest`; `scripts/realcity-mobile-performance.mjs` | Fixed/jittered timestep, deterministic repeated invocation, throttle/brake/coast sequence; CI still required. |
| 3 | NEEDS REVIEW | 8fbe1f0a6c122c663862746357773d26471eb03f | Seed `20261021`, 100 cycles, `transitionSteps`, `invalidStates`, min/max speed checks in `src/main.ts` | Test implemented; passing run still required. |
| 4 | NEEDS REVIEW | 30a2913861b3434a266e3f649e0e2357ff9436e1 | [Validation workflow](.github/workflows/realcity-validation.yml); [latest workflow runs](https://github.com/spyeditz394-dotcom/Realcity-/actions) | Four scripts are included in CI; final-commit run pending. |
| 5 | NEEDS REVIEW | 746d5ad15304b69f18ace1517e860c8df0b906c3 | `scripts/realcity-mobile-performance.mjs`; artifact path `test-results/realcity-npc-benchmarks.json` | 5/10/20/40 × 3-run seeded matrix and pooled median/p95 added; benchmark only writes JSON after preceding checks pass. |
| 6 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | Baseline build log in [run 39921342010](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39921342010) | Three.js is already isolated as a vendor chunk. 587.37 kB minified / 150.91 kB gzip; no safe further split demonstrated, so warning remains rather than hiding it by raising the threshold. |
| 7 | NEEDS DEVICE | aa48ee40893d0d31f9ff0f7ad77bbed1a6be85e7 | [Manual device and browser matrix](docs/device-test.md) | Run the 15-minute Android session plus matrix; CI cannot measure thermals or physical GPU/memory. |
| 8 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `ASSET_MANIFEST.json`, `scripts/validate-realcity-glb.mjs`, browser smoke | Asset gates and automated rig checks exist; live visual confirmation of protagonist, procedural fallback and NPC animation remains. |
| 9 | NEEDS REVIEW | 151afddcfcb00580fe4f57b49e62b8497cfe856c | Expected CI artifacts: `test-results/realcity-sedan-rear-three-quarter.png`, `test-results/realcity-sedan-side-three-quarter.png` | Screenshot code added; files and visible windshield/pillars/wheels must be inspected after successful browser run. |
| 10 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `src/ai/npc-brain.ts` | Deterministic navigation code exists; comprehensive navigation/collision/deadlock suite remains unverified. |
| 11 | NEEDS REVIEW | c64b64cc44f66af5f91182267c3b01c043aaaba5 | `src/main.ts`, `src/ai/npc-brain.ts`, browser smoke | Full NPC interaction/traffic yielding/obstruction/overlap lifecycle suite not yet verified. |
| 12 | NEEDS LIVE CHECK | aa48ee40893d0d31f9ff0f7ad77bbed1a6be85e7 | Vercel deployment metadata showed READY preview for this SHA: `realcity-igelsf17a-spyeditz394-4635s-projects.vercel.app` | Must re-check after final report commit so deployment SHA equals final branch head. |
| 13 | NEEDS LIVE CHECK | 151afddcfcb00580fe4f57b49e62b8497cfe856c | Browser smoke/trace artifact paths under `test-results/`; direct preview URL inaccessible to web viewer | Live canvas, controls, NPCs, interiors and settings need an interactive browser session; visual screenshot inspection remains. |
| 14 | NEEDS REVIEW | aa48ee40893d0d31f9ff0f7ad77bbed1a6be85e7 | [CI runs](https://github.com/spyeditz394-dotcom/Realcity-/actions) | Final commit pipeline has not completed yet; any later commit requires another run. |
| 15 | NEEDS LIVE CHECK | 3772a0279978d8a23f6f05593530431c485ced4a | Vercel production deployment metadata for alias `realcity-nu.vercel.app` | Production currently maps to `main` SHA `3772a0279978d8a23f6f05593530431c485ced4a`, not the feature branch. Direct HTTP access via the available web viewer failed; no production settings/domain changed. |

## PR review

- [PR #1](https://github.com/spyeditz394-dotcom/Realcity-/pull/1): **OPEN, non-draft, unmerged; NOT READY for this release.** It targets `rebuild/stability-graphics-foundation` into `part-9-visual-realism-overhaul`, not this release branch/main. Its own description reports visual/device verification outstanding and the build still has a >500 kB chunk warning. No GitHub review/comment/approval was posted.
- [PR #2](https://github.com/spyeditz394-dotcom/Realcity-/pull/2): **OPEN, DRAFT, unmerged; NOT READY.** It remains based on `main`; vehicle regression, final pipeline, benchmark artifacts, NPC lifecycle suite and live/device checks are not yet proven. Draft state preserved; no merge or review/comment/approval posted.

## Manual steps for unresolved checks

### NEEDS DEVICE — Android and broad browser matrix
Follow [docs/device-test.md](docs/device-test.md). On the OPPO A5 Pro, open the final preview in Chrome, verify `window.__BUILD_SHA__`/overlay equals `/version.json`, record Android/Chrome versions, and run the documented 15-minute session. Record FPS and p95 at 0/1/3/5/7/9/11/13/15 minutes; test walking, driving, full stop, reverse from rest, five forward/brake/reverse cycles, three NPC interactions, traffic, graphics switching and sustained play. Note memory readings, thermal warnings, hitches, control delay and evidence. Repeat the shorter compatibility steps for Android Chrome/alternate browser, iOS Safari, tablet, desktop Chrome/Edge/Firefox/Safari and a low-memory/narrow viewport where hardware is available. Unsupported WebGL must show a clear message; 3D gameplay cannot run without WebGL.

### NEEDS LIVE CHECK — preview
Open the READY Vercel preview for the final commit. Check the displayed build SHA against `/version.json` and deployment metadata. In an interactive browser: verify canvas fills viewport, controls respond, NPC interactions open/close, enter/exit interiors, change settings and reload to verify persistence. Save console/network logs, a performance trace, and screenshots for initial load, HUD/layout, sedan front/side three-quarter, NPC interaction and interior. The web viewer in this session could not open the preview URL, so these checks remain outstanding.

### NEEDS REVIEW — screenshots and animation
After a passing CI browser run, download artifact `realcity-phase10-evidence` from that run and inspect `test-results/realcity-sedan-rear-three-quarter.png` and `test-results/realcity-sedan-side-three-quarter.png`. Explicitly confirm windshield panels, cabin pillars and wheels are visible; report anything not visible as NEEDS REVIEW. Inspect character and NPC animation frames/trace and confirm GLB rig mapping and procedural fallback are visibly animated. Do not claim visual success from the existence of screenshot files alone.

### NEEDS LIVE CHECK — production domain
Check `https://realcity-nu.vercel.app` and `/version.json` in an interactive browser, record HTTP/network result and deployed SHA, and compare with the intended release commit. Do not change aliases, production settings or environment variables. Current Vercel metadata says production is on main SHA `3772a0279978d8a23f6f05593530431c485ced4a`; if direct access remains unavailable, retain NEEDS LIVE CHECK.

## Final report

IN PROGRESS. The final required scripts and CI checks must complete successfully on the exact final commit. The next report update must record the final pipeline result and artifacts, the final branch SHA, the READY preview SHA, and any items that remain NEEDS DEVICE, NEEDS LIVE CHECK, NEEDS REVIEW or BLOCKED. This release is not ready to merge or claim universal device compatibility.
