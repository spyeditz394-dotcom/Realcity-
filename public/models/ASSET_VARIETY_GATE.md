# REALCITY asset integration and verification gate

This document reflects the asset files and loader paths currently present on the feature branch. Structural validation does not certify photorealism, deformation quality, or physical-device performance.

## Locally bundled character assets

- `public/models/realcity-protagonist.glb` — CC0 Quaternius-derived humanoid, documented as a 41-joint skinned mesh with eight clips. Loaded by the protagonist pipeline; runtime rig and animation checks are in the browser smoke test.
- `public/models/realcity-pedestrian-casual.glb` — distinct locally bundled pedestrian model, loaded by `installPedestrianAssets`.
- `public/models/realcity-pedestrian-worker.glb` — distinct locally bundled pedestrian model, loaded by `installPedestrianAssets`.
- Pedestrian variation must be counted by distinct source model names, not material tint alone. The browser smoke test requires at least three distinct pedestrian model sources, including the protagonist-derived source, before passing.

## Locally bundled vehicle assets

- `realcity-sedan.glb` — loaded for a player-drivable vehicle while retaining the existing vehicle root and collision envelope.
- `realcity-hatchback-sports.glb`, `realcity-taxi.glb`, `realcity-suv.glb`, `realcity-van.glb`, and `realcity-truck.glb` — loaded into traffic slots through the existing traffic-asset loader.
- Vehicle integration validates finite bounds and at least four named wheel meshes before replacing the procedural visual. Existing driving, collision, service, and save/exit logic remains on the vehicle root.
- The browser smoke test waits for at least four imported traffic models and checks that the sedan model is installed.

## Source and licensing records

- Protagonist and pedestrian source/license notes: `README.md`, `CC0-1.0.txt`, and `QUATERNIUS_PEDESTRIAN_ASSETS.md`.
- Vehicle source/license notes: `README.md`, `KENNEY-CC0-1.0.txt`, and `KENNEY_CAR_KIT_ASSETS.md`.
- These are existing provenance records; do not infer that every visual is photorealistic from licensing or file presence.

## Automated acceptance gates

1. `npm run validate:assets` parses every required local GLB and checks structural metadata, bounds, skinning/animation where relevant, and named vehicle wheels.
2. `npm run check:types` and `npm run build` must pass.
3. `npm run test:browser` checks protagonist animation states, three pedestrian source variants, visible pedestrian rendering near spawn, imported traffic variety, and existing gameplay controls.
4. `npm run test:performance` records frame-time, renderer statistics, and emulated performance. SwiftShader numbers are **not** physical Android benchmarks.
5. A real OPPO A5 Pro session remains a separate acceptance gate.

## Environment art status

The city currently uses procedural Three.js geometry/materials for buildings, roads, windows, street furniture, and vegetation. This is locally generated and does not depend on remote assets, but it is **not yet a verified imported environment-asset library** and does not establish photorealistic quality. Building/prop GLBs and PBR texture sets should only be added after their exact source/license, binary integrity, texture dimensions, triangle counts, and visual fit are recorded.

## Performance status

The latest recorded SwiftShader profiles were below the 15 FPS warning threshold. Treat these as a performance investigation signal only. Do not report the game as optimized or smooth until matched browser tests and a sustained real-device run support that conclusion.
