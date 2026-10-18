# REALCITY Part 7 — Forensic Realism Audit

Audit date: 2026-10-18  
Repository: `spyeditz394-dotcom/Realcity-`  
Branch inspected: `part-7-open-world-systems`  
Known prior report commit: `a9ce225fb4a9e83a72c05c7fc122b441861ab3ce`  
Audit scope: repository source and deployment metadata; not a physical-device or interactive-browser QA pass.

## Evidence and confidence rules

- **Confirmed defect** means directly visible in source or repository metadata.
- **Confirmed limitation** means the implementation is present but narrower than the requested behavior.
- **Suspected / runtime gate** means source inspection suggests a risk, but the running scene has not been observed.
- **Working in source** means a code path exists; it does not mean the behavior has passed runtime QA.
- **Blocked / not tested** means no interactive browser, console, network panel, or OPPO A5 Pro session was available for that check.

## Repository baseline

- `package.json` declares Vite, TypeScript, Three.js 0.160.0 and `@dimforge/rapier3d-compat` 0.17.3. Scripts are `dev`, `build`, and `preview`; there is no test script.
- The game remains primarily in one large `src/main.ts` module, with UI in `index.html`; Vite uses `target: 'esnext'`, `outDir: 'dist'`, and no source maps.
- Scene content is procedurally generated: 20-unit street grid, 12×12 block loop, district palettes, instanced window batches and road markings, locally generated detail maps, street props, 22 procedural pedestrians, procedural cars, traffic, one remote GLB player attempt and a procedural player fallback.
- The source has a rig-installation validation path that checks bounds, total bones and recognized finger bones, then selects clips by names. This is a useful guard, but it cannot prove skin weights, correct local finger axes, animation retargeting, foot contact or visual quality without inspecting the rendered model.
- The character is requested from an external GitHub raw URL at runtime. The upstream repository's `ASSETS.md` identifies it as Quaternius Universal Base Characters — Standard pack, under CC0 1.0, and records the source file and a source ZIP SHA-256: https://github.com/programasweights/avatar/blob/main/ASSETS.md. This verifies the stated license provenance from the upstream asset record, but REALCITY still does not version the GLB locally; network availability, pinning and runtime fallback remain risks.
- The existing renderer sets sRGB output, ACES filmic tone mapping, exposure 1.15, hemisphere and directional lighting, and quality-dependent pixel ratio / shadow maps. The existence of these settings does not demonstrate convincing material response or mobile performance.
- The source includes collision checks, saving, car entry/exit, vehicle service, day/night, pause/recovery, touch controls, minimap and four quality presets. Each needs regression testing after changes.
- A prior READY Vercel deployment exists for commit `a9ce225fb4a9e83a72c05c7fc122b441861ab3ce`, but deployment metadata alone does not prove the newer source code currently on the branch is deployed or that WebGL initialized correctly.
- Pre-change local build/tests were **not run in this audit session**. The repository exposes no automated test script. Do not infer a PASS from a previous deployment's successful build.

## Prioritized defect and verification list

| Priority | Finding | Classification | Evidence / system | Proposed fix | Acceptance test |
|---|---|---|---|---|---|
| P0 | ULTRA benchmark was represented as completed in saved settings without benchmark evidence. | Confirmed defect | `saveSettings()` wrote `characterUltraBenchmarkDone: true`; no benchmark harness/result record was found in the inspected source. Removed in the audit fix. | Only write a benchmark-complete flag after a real, repeatable measurement run with recorded conditions and results. | Fresh storage, run the benchmark, verify a result is recorded only after all required samples; ordinary play must not set it. |
| P0 | HUD showed `MAP≈1MB*` even though no measured memory calculation backs that number. | Confirmed defect | Performance HUD string in `src/main.ts`. Changed to `MEM: n/a` so the UI does not imply a measured byte count. | If memory is later exposed, use a documented supported browser metric and label its scope accurately. | Inspect HUD; it must not present a fabricated memory quantity. |
| P0 | Pedestrian waypoint coordinates used ±5.8 units while the generated sidewalk strip is centered at ±4.76 units and curb near ±4.98. | Confirmed coordinate mismatch; runtime effect requires observation | Road/sidewalk geometry and `pickPedestrianWaypoint()` in `src/main.ts`. Changed waypoint offset and fallback to ±4.72, within the generated sidewalk band. | Keep graph nodes and path segments on sidewalk geometry; add designated crossing edges rather than arbitrary cross-block paths. | In a running scene, follow pedestrians for several minutes: feet stay on sidewalk, turns align to corners, no building penetration, no oscillation or indefinite stuck state. |
| P0 | No reproducible automated test suite exists. | Confirmed limitation | `package.json` has no test script or browser harness. | Add unit tests for pure waypoint/asset-validation logic and a repeatable browser smoke/regression harness where supported. | CI runs type/build checks and deterministic tests; failures block promotion. |
| P0 | The GLB is remote and not checked into the REALCITY repository. | Confirmed limitation; provenance now externally verified, local pinning still recommended | `loadRiggedPlayer()` uses a raw GitHub URL. Upstream `ASSETS.md` identifies the model as Quaternius Universal Base Characters — Standard under CC0 1.0 and records the source pack/checksum: https://github.com/programasweights/avatar/blob/main/ASSETS.md. | Add a local asset when the binary upload workflow is available, or pin the exact upstream revision and checksum; keep a license/attribution record and fallback behavior. | Fresh browser with network disabled still loads a valid fallback; normal network loads the approved asset; asset provenance and checksum are committed. |
| P1 | The procedural player/NPC is composed of separate primitive meshes; it is not equivalent to a production skinned character. | Confirmed implementation limitation | `person()` builds separate torso/head/limb/hand meshes; remote GLB may replace only the player after successful validation. | Keep fallback robust, but make the approved rig the default and test visible skin deformation, proportions, clip compatibility and hand posing. | Capture same-angle gameplay screenshots for idle/walk/run/jump/vehicle states; no placeholder remains when the approved asset loads. |
| P1 | Animation selection is name-based and limited to idle/walk/run/jump. | Confirmed implementation limitation | `animateRiggedPlayer()` and `installRiggedPlayer()`; only four action buckets are represented. | Do not map unrelated clips to states. Add explicit locomotion/turn/stop/land transitions only when compatible clips or tested procedural solutions exist. | Log selected clip/state, test transitions at speed changes and direction changes; no abrupt reset, stretch or uncontrolled root motion. |
| P1 | The pedestrian system is a bounded adjacent-waypoint picker, not a full navigation graph or crowd-avoidance system. | Confirmed implementation limitation | `nextPedestrianWaypoint()` tests four adjacent candidates and falls back to a nearby random candidate. | Add explicit sidewalk graph/corner/crossing nodes, progress timeout, deterministic reroute and bounded separation behavior. | Long-session test: no repeated unreachable goals, building cut-through, crowd freeze, teleporting or unbounded population. |
| P1 | Districts currently differ mostly through palette, building-height range and random block selection; storefront modules and landmarks are still limited. | Confirmed implementation limitation | `districtPalettes`, `districtFor()`, and procedural block generation. | Add a small number of authored, repeatable architectural kits and landmark silhouettes per district; preserve shared material/instancing efficiency. | Screenshot route through each implemented district; observers can identify different district character without relying on HUD labels. |
| P1 | Road markings/crosswalks and sidewalk details are placed by loops and grid offsets; geometric alignment has not been visually checked. | Suspected issue / runtime gate | Road marking, crosswalk and curb generation in `src/main.ts`. | Inspect each junction and align marking meshes to the same road/lane coordinate definitions used by traffic. | Screenshot all junction types; no floating, clipped, rotated incorrectly or contradictory lane markings. |
| P1 | Vehicle visuals are procedural and vehicle movement is custom code around Rapier colliders, rather than a verified wheel/suspension simulation. | Confirmed implementation limitation | `car()`, traffic update loop, Rapier world/collider setup. | Preserve current controls; validate braking/steering/collisions first, then improve wheel steering/body response without adding a competing physics engine. | Repeatable drive course: acceleration, reverse, turn, stop, impact, service, enter/exit and recovery tests with no stuck or overlapping traffic. |
| P1 | The frame HUD's JS timing is CPU-side callback time; draw calls/triangles are Three.js renderer counters, not GPU time or memory bytes. | Confirmed measurement limitation | HUD reads `performance.now()` around update/render and `renderer.info`. | Label these metrics clearly; record device, browser, quality, route and sample duration for any comparison. | Benchmark report includes median/low FPS, JS callback timing, draw calls, triangles, device/browser and route; no claims of GPU timing without GPU tooling. |
| P1 | Current city construction creates many standalone boxes and materials; bundle is monolithic and may be costly on mobile. | Suspected performance bottleneck supported by architecture, runtime measurement pending | Single large `src/main.ts`, repeated `box()` calls/material creation, no test script; earlier Vercel log warned about a ~3 MB JS bundle before gzip. | Profile before merging broad changes; reuse materials/geometries, batch static props, split loading only where it measurably helps. | Compare same route and quality before/after on OPPO A5 Pro; no silent quality downgrade; publish measured results. |
| P2 | The page title/UI still uses “OPEN CITY” prominently while the project identity is REALCITY. | Confirmed presentation inconsistency | `index.html` title/loading/HUD labels. | Align product naming once gameplay acceptance criteria pass; do not count branding as visual-overhaul progress. | Browser title and in-game product name consistently say REALCITY. |
| P2 | Interior system uses a single remote-coordinate room at `(500, 500)` and visibility toggles. | Confirmed implementation limitation | `roomX`, `roomZ`, `interiorBox()` and door logic. | Make the first interior an explicit, collision-safe interior scene with reliable door mapping and exit return; add more only after it passes. | Enter/exit 20 times, refresh inside/outside, check save/restore, camera, collision and no fall-through. |

## Changes made during this audit

1. Moved pedestrian waypoint nodes from ±5.8 to ±4.72 units to align with the generated sidewalk strip rather than its outer edge.
2. Changed the fallback waypoint to `(4.72, 24.72)` for the same coordinate convention.
3. Removed the unsupported `characterUltraBenchmarkDone: true` save field.
4. Replaced the unsupported `MAP≈1MB*` HUD claim with `MEM: n/a`.

These are source edits, not proof of visual/runtime success. The changes need a fresh production build and interactive smoke tests.

## Required release gates

- [ ] Latest branch commit has a READY preview deployment.
- [ ] Build output and browser console reviewed.
- [ ] Fresh-load character asset success and network-failure fallback both verified.
- [ ] Player idle/walk/run/jump visibly checked; hand deformation verified or documented as unsupported.
- [ ] Pedestrian route, corner, obstacle, spacing and long-session checks passed.
- [ ] Vehicle drive/impact/service/enter-exit/save-reload regressions passed.
- [ ] Day/night, all graphics presets, touch controls, pause/resume, recovery and persistence regressions passed.
- [ ] Same-route ULTRA benchmark on OPPO A5 Pro recorded with actual conditions and values.
- [ ] No production merge/deployment until all required gates are complete.
