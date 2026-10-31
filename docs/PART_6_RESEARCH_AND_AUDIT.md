# REALCITY Part 6 — Reference Research & Source Audit

Date: 2026-10-18
Branch: part-6-animation-and-research-fixes
Scope: source inspection and public-source/official-footage research. No proprietary assets were copied.

## 1. Source audit (repository evidence)

Repository: https://github.com/spyeditz394-dotcom/Realcity-
Observed default branch: main; working branch: part-6-animation-and-research-fixes
Project: Vite + TypeScript entry point, Three.js 0.160.0, Rapier3D compatibility package 0.17.3. Main runtime source is src/main.ts; browser UI and controls are in index.html. This is an existing playable project, not a blank repository. ANICORE was not accessed or modified.

Systems located in src/main.ts:
- Three.js renderer, tone mapping, directional sun, hemisphere light, day/night switching and four graphics presets.
- Procedural road grid, district palette selection, building/window generation, street furniture and one interior.
- Procedural fallback human model, external GLB loader, basic finger-bone name recognition, 22 fallback pedestrians, simple pedestrian goals, vehicle models, traffic routes and custom movement/collision checks.
- Touch/keyboard controls, third-person camera, car entry/exit, service, save/load, recovery, pause, minimap and a runtime HUD.
- No actual runtime/device test was performed as part of this source audit.

### HUD field interpretation from source
- FPS: counted animation-frame callbacks over a rolling ~0.5-second interval. It is not a GPU-only frame-rate measurement.
- JS avg / peak ms: performance.now() duration around the frame callback's update/render work, averaged and peak-tracked over that same short interval. It is CPU-side elapsed time around JavaScript and the renderer submission; it does not directly measure GPU execution time.
- DC: renderer.info.render.calls, Three.js render calls for the most recently rendered frame.
- TRI: renderer.info.render.triangles, Three.js-reported triangles for the most recently rendered frame.
- GEO / TEX: renderer.info.memory.geometries and .textures, counts tracked by Three.js, not bytes of RAM/VRAM.
- MAP≈1MB*: a literal HUD label in the HTML; it is not calculated from actual map or texture memory and must not be treated as a measurement.
- Rig label: the GLB loader's recognized bone and finger-bone counts. Counts alone do not validate skin weights, anatomy, joint axes, or animation quality.

## 2. Reference-to-REALCITY matrix

The sources below were inspected as public official pages and/or official gameplay-video pages. These are footage/page-based observations; the games were not launched or played directly in this task. Visual observations are design guidance, not claims about their internal engine implementation.

| Reference / source | Observable strength / lesson | Specific REALCITY application | Cost / risk | Verification |
|---|---|---|---|---|
| Gangstar Vegas — Gameloft official page and official trailer: https://www.gameloft.com/gangstar-vegas/ ; https://www.youtube.com/watch?v=K6EeioN9k4w | Third-person open-world activity combines walking, driving, vehicles and city exploration. | Preserve one continuous free-roam loop; prioritize readable human silhouette, city scale, traffic and immediate vehicle interaction over disconnected showcase scenes. | Medium; feature density can increase CPU and draw calls. | Regression pass on touch movement, car entry/exit, driving, traffic and save/load. |
| Cyberpunk 2077 — official site and official gameplay reveal: https://en.bandainamcoent.eu/cyberpunk/cyberpunk-2077 ; https://www.cdprojekt.com/en/media/news/cyberpunk-2077-gameplay-reveal-and-message-from-game-director/ | Strong district identity, layered signage/lighting, distinct building silhouettes and characters. | Give each existing district a restrained palette and silhouette vocabulary; add selective facade depth, roofline variation, signage and nighttime light accents. | Medium-high if every prop casts shadows or uses a unique material. | Compare screenshots from the same camera position by district; track calls/triangles and keep ULTRA preset unchanged. |
| Grand Theft Auto V — Rockstar official gameplay video: https://www.rockstargames.com/newswire/article/k49a58878oo552/grand-theft-auto-v-official-gameplay-video.html | A city reads as a connected system of streets, pedestrians, vehicles and environmental activity rather than isolated assets. | Maintain road continuity and consistent scale; test pedestrian routes and traffic around intersections before increasing population. | High for robust AI and dense traffic. | Long-run traffic/pedestrian test, collision checks and regression of existing road paths. |
| CarX Street — official game page: https://carx-store.com/en/str ; Google Play listing: https://play.google.com/store/apps/details?id=com.carxtech.sr | Mobile open-world street driving emphasizes vehicle identity, roads, traffic, and day/night changes. | Prioritize varied vehicle silhouettes, tire/wheel alignment, glass/body material separation and consistent road contact before costly reflections. | Medium-high; detailed vehicle meshes and transparent materials can increase draw cost. | Drive, steer, brake, collide, exit, service and check wheel rotation at several camera angles. |
| Epic Games mobile performance documentation (general technical reference, not evidence about any reference game's engine): https://dev.epicgames.com/documentation/en-us/unreal-engine/performance-guidelines-for-mobile-devices | Mobile rendering has finite budgets; effects, lighting, textures and visibility must be evaluated on target hardware. | Measure draw calls, JS time, triangles and visible objects; avoid enabling expensive effects without a before/after test. Apply the principle without importing Unreal-specific systems into Three.js. | Low to medium for profiling; high for expensive effects. | Desktop/browser measurements plus a separate real-device run; never infer GPU time from the current JS HUD. |

### Cross-reference design principles

1. People first: visible anatomy, face/hair/clothing materials and animation quality matter more than skeleton count.
2. Composition before density: distinct silhouettes and ground-floor detail create better city readability than adding hundreds of small props.
3. Vehicles need form and contact: proportions, wheel geometry, cabin glass, lighting and ground alignment are more valuable than simply recoloring one shape.
4. Life must be coherent: pedestrian goals should favor walkable sidewalks; obstacle response and spacing should be checked before raising counts.
5. Mobile performance is measured: maintain a fixed camera/test route and compare the same HUD fields; GPU timings require separate supported profiling, not guesswork.

## 3. Implementation notes committed in this branch

### Rig animation behavior
The prior integration selected and played only the first GLB animation clip, and animateRiggedPlayer() returned immediately after mixer.update(). That meant procedural finger posing was skipped whenever an animation mixer existed, so the finger-pose code could be overwritten by animation playback. The implementation now classifies available clips by names (idle/walk/run/jump), cross-fades when a suitable action changes, falls back to available clips, and reapplies the recognized finger-bone pose after the mixer update. This is source-level implementation, not visual proof that the current external GLB's joint axes or hand skinning are correct.

### Initial ULTRA baseline
The settings schema was raised to version 5. A user with older version-4 settings starts the next run at ULTRA once, so the requested first Part 6 benchmark is not silently inherited from an older lower preset. After that migration, the chosen quality setting is saved normally.

### External character asset provenance
Current loader URL in source: https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/character.glb
The source does not document a license, author attribution, texture provenance, animation provenance, or version pin for this asset. License/provenance is unverified; do not treat it as cleared for distribution. Before release, replace it with a verified, appropriately licensed asset or obtain and record explicit permission. Network availability/CORS and the asset's real visual quality still require runtime testing.

## 4. Verification status and remaining blockers

- Repository/source inspection: PASS (source and configuration were read).
- Source patch committed to the feature branch: PASS (commit is recorded by GitHub).
- TypeScript/Vite build: NOT TESTED in this environment; no local checkout/runtime build was executed.
- Browser runtime and actual GLB visual inspection: NOT TESTED.
- Finger skinning and per-finger pose visual verification: NOT TESTED; source logic is improved, but the real model must be inspected in a running browser.
- NPC obstacle avoidance and walkable-sidewalk navigation: NOT TESTED / INCOMPLETE; current code uses random city-wide goals and a simple blocked check, not a sidewalk navigation graph.
- Architecture/road/vehicle visuals: SOURCE AUDIT ONLY; no visual comparison or edits to these systems in this commit.
- ULTRA benchmark: NOT TESTED; screenshot metrics supplied by the user remain observations, not a new measurement.
- OPPO A5 Pro: NOT TESTED.
- Vercel: project metadata shows a latest deployment exists, but no deployment of this branch was triggered or verified. Do not claim this branch is live.

## 5. Required next tests

1. Build from this branch with npm ci && npm run build; fix TypeScript/build errors before further changes.
2. Run the Vite preview and verify the GLB loads without console/CORS errors. Inspect its actual mesh, materials, skin weights, hierarchy, clip names and finger-joint mapping.
3. Confirm idle/walk/run/jump clip selection on the real model; test each finger pose visibly on both hands.
4. Run the first browser benchmark with ULTRA: initial load, stationary view, movement/camera rotation, traffic + pedestrians, shadows, day/night, driving and sustained session. Capture raw samples and browser/device details.
5. Test the same scenarios on the OPPO A5 Pro before marking mobile acceptance as PASS.
6. Build a sidewalk waypoint graph and bounded pedestrian avoidance before claiming realistic pedestrian navigation.
7. Replace or clear the external character asset license status before release.
