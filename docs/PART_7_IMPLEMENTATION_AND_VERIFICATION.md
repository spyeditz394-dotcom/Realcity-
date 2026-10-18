# REALCITY Part 7 — Implementation and Verification Record

Date: 2026-10-18  
Branch: `part-7-open-world-systems`  
Latest code change in this slice: `763a139e7b74e2031decf81314c479aa33ef08b5`  
Documentation commits: `962baa4a473c4aaf98395d91039d79aeb479f218`, `eaa4fab67d62798897b821faefe7eec3b1231481`

## Existing implementation inspected

This remains the existing Vite / Three.js / Rapier browser game, not a replacement demo. The package declares Three.js 0.160.0, `@dimforge/rapier3d-compat` 0.17.3, Vite 6.4.4 and TypeScript 5.8.3. The game is still concentrated in `src/main.ts` with interface markup in `index.html`.

Source contains a procedural city, grid-based road and sidewalk geometry, district palettes, local detail textures, instanced window/road-marking batches, street props, a procedural NPC crowd, procedural cars/traffic, Rapier collision setup, a remote GLB player-loading attempt with validation/fallback, controls, vehicle interactions, day/night, settings persistence, and one interior. Presence in source is not equivalent to runtime verification.

## Changes implemented in this Part 7 slice

- Pedestrian candidate waypoints moved from `±5.8` to `±4.72` units so the nodes sit within the generated sidewalk strip centered around `±4.76`, rather than outside its outer edge.
- The fallback pedestrian waypoint changed from `(5.8, 25.8)` to `(4.72, 24.72)` to follow the same coordinate convention.
- Removed the unsupported `characterUltraBenchmarkDone: true` property from saved settings. A real ULTRA benchmark has not yet been run, so the game must not persist a claim that it has.
- Changed the HUD's unsupported `MAP≈1MB*` text to `MEM: n/a`. The HUD still exposes renderer counters and CPU-side callback timing, but no actual memory-byte measurement.
- Added `docs/PART_7_REALISM_AUDIT.md` with evidence categories, prioritized defects, acceptance tests and release gates.
- Added `docs/PART_7_REFERENCE_GAME_STUDY.md` with public-source boundaries and a reference comparison matrix.

## Verification record

| Check | Status | Evidence / limitation |
|---|---|---|
| Branch / repository | PASS | Changes committed to the dedicated `part-7-open-world-systems` branch. |
| Source patch integrity | PASS | Follow-up source read confirms the sidewalk offset/fallback and honest HUD text; unsupported benchmark-complete field is absent. |
| Vercel production build | PASS for code commit `763a139e7b74e2031decf81314c479aa33ef08b5` | Vercel deployment `dpl_7Ch42v4f17JX7ptDVEugAKXFjAAY` is READY; log reports Vite `✓ built in 2.89s` and `Build Completed`. |
| Bundle size | WARNING | Build reports `index-CeCjUOH5.js` at 3,034.15 kB before gzip / 1,059.19 kB gzip; Vite warns that chunks exceed 500 kB. |
| Preview HTTP response | PASS for deployment `763a139...` | Vercel deployment state is READY. A READY state alone does not prove WebGL initialization or runtime gameplay. |
| New documentation deployment | PENDING at last status check | Documentation commit `eaa4fab...` had a Vercel deployment in BUILDING state at the time of inspection. |
| Browser console / network errors | NOT TESTED | No interactive browser DevTools session available. |
| Rendered player appearance and skin deformation | NOT TESTED | The code validates bounds, bone count and finger-bone naming, but the actual mesh, skin weights, bone axes and visible deformation have not been visually inspected in a running browser. |
| External GLB licensing/provenance | PARTIALLY VERIFIED | Upstream `ASSETS.md` identifies the model as Quaternius Universal Base Characters — Standard under CC0 1.0 and records the source pack/checksum: https://github.com/programasweights/avatar/blob/main/ASSETS.md. REALCITY still loads it remotely rather than versioning it locally. |
| Animation transitions | NOT TESTED | Source has name-based idle/walk/run/jump action buckets and mixer update; no rendered locomotion capture was collected. |
| Pedestrian sidewalk traversal | NOT TESTED | Waypoint coordinates were corrected in source, but path segments, corners, obstacles, spacing and sustained movement must be observed in-game. |
| Driving / traffic / collisions / service | NOT TESTED | No interactive regression session was performed. |
| Touch controls / save-load / day-night / interiors | NOT TESTED | No interactive regression session was performed. |
| ULTRA performance on OPPO A5 Pro | NOT TESTED | No physical device session or measured FPS/frame-time run was available. |
| Production merge/release | NOT ATTEMPTED | No merge to the production branch was performed. |
| ANICORE | PRESERVED | No ANICORE repository or files were edited. |

## Known limitations and next gates

1. The procedural person is a fallback made from separate meshes. It is not equivalent to a fully skinned, production-quality human character.
2. The upstream GLB's CC0 provenance is documented in its `ASSETS.md`; remaining work is to pin the exact asset/revision or vendor a local copy when the binary asset workflow is available, then verify file size, skinning, clip compatibility and reliable delivery.
3. The pedestrian waypoint implementation remains a small grid-based selector, not a complete pedestrian navigation/crowd system. The offset correction must be tested in a running scene.
4. The city remains procedural and box-heavy. District differentiation is currently mainly palette, height range and frontage variation. Build a few coherent authored architectural kits and landmarks only after baseline captures.
5. The one interior is a single reusable room placed at remote world coordinates and toggled visible/invisible. Test entry/exit, collision, camera, save/reload and recovery before adding more.
6. The current build is large. Profile before introducing code splitting or lowering quality; do not treat bundle size alone as measured frame-rate evidence.
7. No runtime, browser-console, real-device or visual acceptance test is claimed PASS until it has actually been performed.

## Immediate acceptance sequence

- [ ] Open the newest READY preview in an interactive browser and inspect console/network failures.
- [ ] Verify remote GLB success and fallback by testing with and without network access.
- [ ] Capture the player idle/walk/run/jump and inspect skinning/finger deformation.
- [ ] Observe pedestrians on straight sidewalks, at corners, near buildings, near other pedestrians and over a sustained session.
- [ ] Repeat driving, collision, service, enter/exit, pause/resume, recovery, save/reload, day/night and quality-preset tests.
- [ ] Record a fixed-route ULTRA benchmark on OPPO A5 Pro with browser version, scene route, duration, median/low FPS and CPU-side timing. Do not invent GPU time or memory metrics.
- [ ] Only after these gates pass, consider broader visual changes or a production merge.
