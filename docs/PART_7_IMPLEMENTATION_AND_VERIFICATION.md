# REALCITY Part 7 — Implementation and Verification Record

Date: 2026-10-18  
Branch: `part-7-open-world-systems`  
Base: `part-6-animation-and-research-fixes` at `cf17ae7b797cea77632e7998d41ad7310d47131e`

## Scope of this implementation slice

This is an incremental change to the existing Vite/Three.js/Rapier project. It does not replace the game with a separate demo, and it does not touch ANICORE.

### Implemented in source

- Replaced city-wide random pedestrian spawn points and arbitrary world-coordinate goals with candidate sidewalk-grid waypoints aligned to the existing 20-unit street grid.
- Added candidate validation against the existing static/vehicle collision query and nearby pedestrian spacing before selecting a waypoint.
- Added adjacent waypoint selection, bounded rerouting when a pedestrian is blocked, and a nearby safe-waypoint fallback rather than repeatedly choosing random coordinates across buildings.
- Kept the existing 22 pedestrians, procedural person appearance, locomotion pose, and distance-based update skipping. This is a navigation foundation, not a claim of production-quality human animation or a full pedestrian crossing system.
- Bumped saved settings schema to version 6 so the first run after this Part 7 migration starts at ULTRA. Later quality choices continue to persist. This is intended to preserve an honest initial baseline rather than silently lower quality.
- Updated the browser title, loading label, and ready toast from the stale Part 4.5 label to Part 7.

## Verification status

| Area | Status | Evidence / limitation |
|---|---|---|
| Branch checkpoint | PASS | Dedicated branch created from the verified Part 6 branch head. |
| Source changes | PASS | GitHub commits exist on `part-7-open-world-systems`. |
| Waypoint design | IMPLEMENTED / NOT RUNTIME-TESTED | Code uses safe candidate nodes and local rerouting; visual navigation must still be observed in a running WebGL session. |
| TypeScript / Vite production build | PASS | Vercel build log for the latest source commit reports `✓ built in 3.45s` and `Build Completed`; this is a production build check, not a runtime test. |
| Preview HTTP / version marker | PASS | Vercel preview returned HTTP 200 and the HTML title `REALCITY — Part 7 Living City Systems` for commit `e5dc5b23e90a9177ce4cd02c4ac6cb0b516ce83c`. |\n| Browser runtime / console / WebGL | NOT TESTED | The page response was fetched, but no interactive browser session, rendered-scene inspection, console inspection, or gameplay recording was available. |
| Character mesh, skeleton, skin weights, fingers | NOT TESTED | The external GLB remains unverified; the procedural fallback is not equivalent to a high-quality skinned human. |
| Traffic / driving / collisions | NOT TESTED | No behavior regression run was performed. |
| Save/load / touch controls | NOT TESTED | No interactive regression pass was performed. |
| ULTRA benchmark | NOT TESTED | Schema migration sets the initial preset to ULTRA; it does not constitute a benchmark. |
| OPPO A5 Pro | NOT TESTED | The physical target device was not used. |
| Production deployment | NOT ATTEMPTED | No merge to `main` and no production release was performed. |
| ANICORE | PRESERVED | No ANICORE files or repositories were accessed for editing. |

## Build note\n\nVite reports a large-bundle warning: `dist/assets/index-BR0qWvoa.js` is about 3,034.18 kB before gzip and 1,059.22 kB gzip. This is an optimization follow-up, not a build failure. No code splitting or visual-quality reduction was introduced in this slice.\n\n## Known risks and next gates

1. The production build and Part 7 preview title are verified for commit `e5dc5b23e90a9177ce4cd02c4ac6cb0b516ce83c`. Continue with interactive browser inspection; an HTTP 200/title check alone does not prove the WebGL scene runs correctly.
2. Observe pedestrian spawn points and route traversal in the running scene. Check that the lane offset is clear of building colliders in all generated blocks; inspect stuck/re-route behavior over several minutes.
3. Inspect the external character asset's author, license, file size, mesh materials, skeleton hierarchy, skin weights, animation clips, and finger axes before distribution. Its source URL remains undocumented for licensing purposes.
4. Add automated tests or a repeatable browser test harness before extending the AI system. The current package has only `dev`, `build`, and `preview` scripts.
5. Only after the waypoint system passes visual testing, continue to the next milestone: reuse a verified character pipeline for NPCs, then test vehicle traffic, city visuals, interactions, and mobile controls in focused slices.
6. Capture ULTRA baseline metrics on a fixed route before optimizing. Current HUD counters are renderer/CPU-side indicators, not complete GPU timing or memory-byte measurements.
