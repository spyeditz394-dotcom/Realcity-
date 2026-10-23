# REALCITY Phase 10 verification

Status: **INCOMPLETE**

This report distinguishes observed CI results from work that is not yet implemented or verified. All performance measurements in GitHub Actions are **CI environment** measurements, using headless Chromium/SwiftShader, not OPPO A5 Pro performance.

## Current branch and evidence

- Repository: `spyeditz394-dotcom/Realcity-`
- Branch: `feature/realcity-protagonist-animation-audit`
- Starting point supplied: `0afef24bff3e1182edf1e47415df60ce0b778512`
- Latest reviewed run before the current correction: [GitHub Actions run 39740528321](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39740528321) on `b46a7a2d930fe04724c6a2aab8035cb0b49f3b8e` (FAILED browser smoke). Earlier baseline: [run 39574338255](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39574338255).
- Exact run artifact: [realcity-browser-smoke.zip](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39574338255/artifacts/12334240656)
- PR: [#2](https://github.com/spyeditz394-dotcom/Realcity-/pull/2), must remain open, draft, and unmerged.
- Vercel preview list has previously shown a READY deployment for `0afef24bff3e1182edf1e47415df60ce0b778512`; READY alone is not gameplay verification.

## Baseline run findings

Run 39574338255 completed with **failure**. The job steps and downloaded logs show:
- `npm ci --no-audit --no-fund`: PASS
- `npm run check:types`: PASS
- `npm run build`: PASS
- `npm run validate:assets`: PASS
- `npm run validate:glb`: PASS
- `npm run test:browser`: PASS — 31 checks, zero browser errors, no HTTP error responses
- `npm run test:performance`: **FAIL** — `Deliberate reverse from rest did not move backward`, thrown from `scripts/realcity-mobile-performance.mjs:158`. The failure state showed the player in a vehicle with speed exactly 0 after the 5-second reverse wait. The existing negative-speed assertion was not removed or weakened.
- Artifact upload: PASS; uploaded browser smoke artifact SHA-256 digest `c3c9003c3f89a52b6cfc77ef64678f79b649c66ab2dcce25f95742cd8b004bfe`.

The existing CI run exercises vehicle entry, throttle, sustained braking, and a reverse assertion, but does not yet cover the requested 100-transition test, keyboard/touch parity matrix, fixed-vs-jittered timestep comparison, 5/10/20/40 NPC benchmark matrix, complete NPC navigation suite, interaction lifecycle suite, or traffic obstruction suite.

## Latest traffic regression diagnosis

Run [39740528321](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39740528321) on `b46a7a2d930fe04724c6a2aab8035cb0b49f3b8e` failed in `scripts/realcity-browser-smoke.mjs:233`. The reported state was `startZ=-100`, `stoppedZ=-99.22541951465952`, `minPedGap=2.4254195146595237`, `pedestrianCount=3`, `resumed=true`, but `stopped=false`. Inspection of `src/main.ts` shows the vehicle had moved a short distance while decelerating and was then maintaining safe separation. The test incorrectly defined “stopped” as no displacement from the *initial* position, which rejects a valid braking approach.

Correction committed after that run: the regression now measures stability across four additional 50 ms updates while the pedestrians remain in place, checks the existing minimum pedestrian gap, then checks automatic resume after clearing the obstruction. The safety assertion and 2.39-unit gap threshold are retained. This is a test-probe correction, not proof of a production pass. A workflow run for the correction SHA is still required.

## Items 1–9

| # | Area | Status | Evidence / remaining work |
|---|---|---|---|
| 1 | Baseline and failure log | PASS for baseline log only | [Run and complete logs](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39574338255); reverse failure recorded above. Final-SHA full logs still required. |
| 2 | Vehicle regression | FAIL | Reverse assertion failed on run 39574338255. The brake/reverse input release changes are present, but the production root cause and full deterministic test matrix are not yet verified. |
| 3 | 5/10/20/40 NPC benchmark | UNVERIFIED | Existing harness measures one production population (currently reports 12 pedestrians) across viewport profiles, not four populations × three runs. No honest four-population measurements are available yet. |
| 4 | NPC navigation | UNVERIFIED | No complete deterministic route connectivity, crowded separation, narrow passage, deadlock, and unreachable-target suite verified. |
| 5 | Interaction lifecycle | UNVERIFIED | Full selection/prompt/dialogue/cancel/despawn/listener-count regression matrix not yet implemented and verified. |
| 6 | Traffic | UNVERIFIED | Existing browser smoke confirms general city/vehicle behavior; no verified full yielding, obstruction, overlap, and automatic recovery suite. |
| 7 | Deployed build identity and gameplay | UNVERIFIED | Build SHA exposure is being added. Must verify `window.__BUILD_SHA__`, `/version.json`, preview metadata, and actual deployed gameplay after final commit. |
| 8 | Device preparation | PASS when this document is committed; device test UNVERIFIED | [Device session plan](device-test.md). No physical-device measurements have been collected. |
| 9 | Final validation and PR summary | UNVERIFIED | Must run every script against the final SHA, inspect logs/artifacts, and update this table and PR body from actual results. |

## Benchmark summary

**No four-population benchmark summary is reported.** The currently inspected performance harness has a 12-second frame-time sampling window for each of three viewport/quality profiles and reports frame median, p95, and average FPS. It does not provide raw samples in per-scenario JSON, p99/max/over-budget counts, repeated seeded populations, or run-to-run spread. Reporting 5/10/20/40 NPC figures without executing those scenarios would be fabrication.

## Changes made in this recovery

- The workflow was updated to include `npm run validate:glb`.
- The browser smoke run produced 31 passing checks on the inspected SHA.
- Build identity and a `?debug=perf` measurement overlay are being added. The overlay must be verified by the final build; no performance benefit is claimed.
- The OPPO A5 Pro scripted test and results template are documented in `docs/device-test.md`.

## Open items

1. Diagnose and fix the production cause of the reverse regression; preserve the negative-speed assertion.
2. Add deterministic vehicle input/timestep tests, including 100 transitions.
3. Implement real production-gameplay NPC population scenarios at 5, 10, 20, and 40, with three runs each and raw frame-time JSON artifacts.
4. Add and pass NPC navigation, interaction lifecycle, and traffic regression suites.
5. Verify build identity and deployed preview gameplay with Playwright, screenshots, logs, and traces.
6. Run all validation scripts again on the exact final SHA and inspect every log and artifact.
7. Keep PR #2 open/draft/unmerged and never modify `main`.
8. Real OPPO A5 Pro test remains UNVERIFIED until actual device evidence is submitted.

Do not change this status to COMPLETE unless the acceptance criteria are evidenced on the final SHA.

## Preview identity check — 2026-10-23

A live Vercel deployment lookup confirmed a **READY** preview built from correction commit `1ac57680e751eae463529800083b4d5f535b90d7` (deployment ID `dpl_5HA84WNtQ1XcCRqQmUBKYRgjEjko`). The deployment metadata reports the expected repository, feature branch, and commit message. This confirms deployment source identity and build readiness only; it does **not** establish that the browser smoke suite, performance suite, or gameplay acceptance checks pass.

- Preview: https://realcity-git-feature-realcity-67200a-spyeditz394-4635s-projects.vercel.app
- Deployment details: https://vercel.com/spyeditz394-4635s-projects/realcity/5HA84WNtQ1XcCRqQmUBKYRgjEjko
- CI status for `1ac57680e751eae463529800083b4d5f535b90d7`: no associated workflow run was returned by the available GitHub Actions lookup.
- The subsequent branch tip `37a9fbcaf9ca25bfc06e4b95a924dbe4d40806a4` has no reported status checks. The PR metadata lookup still does not expose the same head SHA, so the PR/branch synchronization issue remains unresolved.

## Latest CI run — 2026-10-23

A new GitHub Actions validation run is now available: [run 39920315378](https://github.com/spyeditz394-dotcom/Realcity-/actions/runs/39920315378). It checked out PR merge commit `3b09c9685c7d8eae1914b2fcc8ea7ef72c0f745a`, which merges the documentation commit `a9a69e01695cedf014014c6a0fa2932f4e7c8d90` into base commit `3772a0279978d8a23f6f05593530431c485ced4a`.

Observed results from the job log:
- `npm ci --no-audit --no-fund`: PASS
- `npm run check:types`: PASS
- `npm run build`: PASS
- `npm run validate:assets`: PASS (asset-validator summaries report zero failures)
- `npm run validate:glb`: PASS (GLB-validator summaries report zero failures)
- `npm run test:browser`: PASS; step completed successfully and reported no failed HTTP responses.
- `npm run test:performance`: FAIL at the on-screen forward movement check. Exact error: `On-screen forward control moves player: {"start":{"x":0,"y":0,"z":23},"moved":{"x":0,"y":0,"z":23.172}}`.

This is new actionable evidence: the corrected traffic browser regression passed in this run, but the performance harness still fails on its on-screen forward-control movement assertion. The failing assertion must be investigated and fixed without weakening the movement requirement. The run is a PR merge-ref test, not physical OPPO device evidence. Phase 10 remains **INCOMPLETE**.

## Follow-up on the forward-control failure

Two test-only changes were committed after run 39920315378:
- `3ad6399795ced8ccff50de3072fdbe100ff61eef` adds a QA-only helper that searches for a collision-free forward corridor before testing touch movement.
- `370c6c4b304f594985a869e55b6dfbfe41557dab` makes the performance test use that helper before measuring the on-screen forward control.

The movement assertion remains `distance(start,moved) > 0.25`; it has not been weakened. These commits are a targeted attempt to avoid measuring input against a nearby obstacle, not a verified fix. At the time of this note, no GitHub Actions run was returned for `370c6c4b304f594985a869e55b6dfbfe41557dab`; Vercel had reported a pending status for its preview. The next gate is to inspect the fresh run and logs, then fix any remaining production or harness defect based on evidence.

