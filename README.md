# REALCITY — Part 16 vehicle silhouette & character locomotion

This branch continues the existing REALCITY Vite/Three.js game. Part 13 builds on the earlier stability and facade-material passes with a batched distant skyline, instanced rooftop utility details, and shared procedural character geometry. The playable city boundary and collision layout are unchanged. Part 11 also adds a procedural day/night sky gradient, quality-tier exposure and fog, and directional shadows that follow the active player or vehicle.

## Run

```sh
npm install
npm run build
npm run dev
```

## Runtime architecture

- Three.js renders the city, protagonist, pedestrians, vehicles, lighting, and HUD.
- Static building collisions use lightweight footprint overlap tests against the procedural building bounds.
- Player and vehicle movement remain custom kinematic integration; this project does not use full rigid-body dynamics.
- Repeated box dimensions share cached `BoxGeometry` instances.
- Day/night use locally generated sky gradients, avoiding external texture dependencies.
- Building facades use a generated panel/plaster texture with floor joints, vertical seams, faint weathering, and subtle bump mapping; this is generated locally and adds no network asset dependency.
- Quality presets adjust exposure and fog as well as resolution, anisotropy, and shadow quality.
- Directional shadows follow the player or driven vehicle instead of staying centered at the world origin.
- New and pre-v7 local settings start on BALANCED graphics to avoid forcing ULTRA on mobile. Users can still choose LOW, BALANCED, HIGH, or ULTRA.
- The original recovery reference remains available at https://open-world-city-prototype.vercel.app/.

The Vercel preview build is the first validation gate. Actual gameplay controls, visual quality, collision edge cases, and performance on a physical Android device still require hands-on testing.


## Part 13 — city depth & character performance

- Expanded the ground plane and added a distant, fog-softened skyline ring outside the playable boundary. Skyline towers are instanced in three material batches and do not participate in collisions.
- Added instanced rooftop HVAC housings and occasional antenna silhouettes using existing architectural batches.
- Cached repeated procedural human geometry across the player fallback and pedestrian crowd to avoid creating near-identical geometry resources for every character.
- Kept cached character geometry alive when the optional rigged model replaces the fallback, because pedestrians still reference the shared geometry.
- This is a procedural visual/performance pass; real-device appearance, FPS, memory, and gameplay still require browser QA.


## Part 14 — facade depth & protagonist quality

- Added instanced window lintels, sills, and jambs on front and side elevations to make glass read as recessed architectural openings rather than flat decals.
- Added a dark street-level plinth to ground buildings visually and improve the street/building scale.
- Reused existing architecture instancing and materials, keeping these added facade elements in a small number of draw-call batches.
- Preserved the existing detailed procedural player fallback and current rig qualification checks. This pass prioritizes measurable environment depth without swapping in an unverified external character.
- Build, in-game WebGL appearance, and Android performance must be verified on the new preview before this is considered complete.


## Part 15 — character locomotion repair

- Added separate knee pivots and elbow pivots to the procedural human fallback, so walk cycles bend the legs and swing the forearms instead of rotating long rigid limb groups.
- Updated protagonist and pedestrian animation to drive knee flexion and elbow swing from the current gait.
- Fixed run selection: the previous rigged-player controller inferred run versus walk from a sinusoidal gait value, which could switch animation clips repeatedly during a single stride. It now selects run from the sprint input/stamina state.
- Tightened the optional external character asset gate: only a skinned, textured/vertex-colored model with separate named idle, walk, and run clips can replace the animated fallback. An incomplete rig should no longer silently replace the playable character with a static mannequin.
- Replaced the old untextured matte-jade mannequin URL with a textured Quaternius Universal Base Characters model (CC0; asset provenance recorded in ASSET_CREDITS.md). It is loaded asynchronously so it does not block city initialization. This is a stylized game-ready base character, not a photoreal civilian hero; higher-quality civilian outfit variants and local asset bundling remain follow-up work.
- The remote preview/build must pass after deployment; actual browser animation and Android visual verification remain required.


## Part 16 — vehicle silhouette and material detail

- Replaced the car's single sharp rectangular lower body with a shared tapered, softly beveled sedan shell to create a more believable silhouette and highlight roll-off.
- Added separate angled front/rear windshield panels and slim cabin pillars.
- Added five-spoke alloy wheel details and central caps while reusing the shared vehicle body geometry across traffic and parked cars.
- Vehicle collision footprint, driving physics, traffic lanes, and vehicle spawn layout are unchanged.
- The car models are still procedurally built rather than imported photoreal assets; actual in-game appearance, wheel rotation, glass layering, and Android performance need visual testing.
