# REALCITY asset variety gate

This catalog is an integration contract, not a claim that the listed files already exist.

## Current verified source state

- `realcity-protagonist.glb`: loaded by the character pipeline when present; runtime rig/clip acceptance is exercised by the browser smoke test.
- `realcity-sedan.glb`: the only imported vehicle currently referenced by `src/main.ts`; the sedan must expose at least four named wheel meshes.
- Pedestrian population currently clones the protagonist GLB and tints materials. Tinting does **not** count as distinct character models.
- SUV and van are procedural vehicle silhouettes. They do **not** count as imported vehicle models.

## Required licensed model set

Add model binaries to `public/models/` only after checking the original source page and the license file. Keep a copy of the license/attribution in this directory. Do not rely on a filename or a search snippet as proof of licensing.

| File | Role | Required runtime checks |
|---|---|---|
| `realcity-protagonist.glb` | playable protagonist | skinned mesh, >=20 bones, idle/walk/run clips |
| `realcity-pedestrian-casual.glb` | casual pedestrian | skinned mesh, idle + walk clips |
| `realcity-pedestrian-worker.glb` | worker pedestrian | skinned mesh, idle + walk clips |
| `realcity-pedestrian-formal.glb` | formal pedestrian | skinned mesh, idle + walk clips |
| `realcity-sedan.glb` | sedan | >=4 wheel meshes; collision footprint preserved |
| `realcity-hatchback.glb` | hatchback | valid bounds + >=4 wheel meshes |
| `realcity-pickup.glb` | pickup | valid bounds + >=4 wheel meshes |
| `realcity-taxi.glb` | taxi | valid bounds + >=4 wheel meshes |

## Acceptance gates

1. Character variety means at least three **different model files**, not differently tinted clones. Every character must retain a valid skeleton and idle/walk action; protagonist idle/walk/run/jump checks remain mandatory.
2. Vehicle variety means at least three **different imported vehicle files**, each with validated bounds and four wheel meshes. Keep the existing procedural sedan/SUV/van fallback if an asset fails.
3. Imported vehicle visual dimensions must be normalized to a known footprint and use the existing vehicle root, movement, collision, service, save, and enter/exit code. Never replace the physics root with a raw GLTF scene.
4. Re-run `npm run check:types`, `npm run build`, `npm run test:browser`, and `npm run test:performance` after integration. Compare before/after frame time, draw calls, triangles, geometry and texture counts under identical emulated profiles.
5. Report Playwright/SwiftShader values as **emulated only**. A real OPPO A5 Pro browser run, including sustained driving and touch input, is a separate outstanding acceptance test.

## Current status

The requested variety is **not yet complete**: the repository state inspected for this change contains a single imported sedan reference and one shared character GLB for pedestrian clones. Do not mark this task complete until the missing licensed binaries are actually committed and the acceptance gates pass.
