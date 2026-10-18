# REALCITY Part 6 — Audit, Reference Research, and Verification Log

Date: 2026-10-18  
Working branch: `part6/audit-performance-hud`  
Scope: initial audit, reference matrix, rig validation, and honest performance HUD labels.

## Repository audit

- Existing project: https://github.com/spyeditz394-dotcom/Realcity-
- Default branch at audit: `main`; working changes are isolated on `part6/audit-performance-hud`.
- Entry point: `src/main.ts` (Three.js 0.160.0, TypeScript 5.8.3, Vite 6.4.4, Rapier3D compat 0.17.3).
- HTML/UI: `index.html`; four quality presets, day/night control, touch movement, interaction controls, radar and performance HUD are already present.
- Existing systems found in source: generated road grid and districts, facade/window instancing, street props and lights, collision query helpers, player/vehicle movement, traffic, 22 procedural pedestrian fallbacks, building/kiosk/interior interactions, persistence, quality presets, and external GLB player loading.
- The project uses custom kinematic player/vehicle movement and static overlap/collision logic; the presence of Rapier does not by itself mean all gameplay bodies use full rigid-body dynamics.
- No source files in ANICORE were accessed or changed.

## Character asset provenance and limitations

The current loader references `https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/character.glb`.

The source repository's `ASSETS.md` identifies this asset as Quaternius **Superhero Male** from **Universal Base Characters — Standard**, released under **CC0 1.0 Universal**. Its included license is at https://github.com/programasweights/avatar/blob/main/public/assets/QUATERNIUS-LICENSE.txt. The asset preparation notes say the GLB is approximately 741 KB, uses a matte jade material, omits image payloads, and has no bundled animation clips. It is therefore a legitimate free rigged base, but it is not a photorealistic character and has no included animation set. The source README reports 65 bones and three articulated segments plus terminal tip bones per finger; REALCITY must validate what actually loads at runtime rather than trusting those upstream claims.

## Reference-to-REALCITY matrix

| Reference and public source | Observable strength / source-backed context | Principle to adapt | Specific REALCITY implementation | Risk | Test |
|---|---|---|---|---|---|
| Gangstar Vegas — official Gameloft trailer: https://www.youtube.com/watch?v=K6EeioN9k4w and https://www.gameloft.com/gangstar-vegas/ | Official footage and game page present mobile open-world roaming and vehicle-focused city activity. This is footage/page-based research; the game was not launched here. | Keep the core free-roam loop readable on a phone; player, traffic, and vehicles need consistent scale and clear silhouettes. | Prioritize the street-level camera view, distinctive vehicle silhouettes, and readable touch actions before adding costly effects. | Medium | Check at phone aspect ratio, inspect camera/controls overlays, test vehicle approach and entry. |
| Cyberpunk 2077 — official 48-minute gameplay reveal: https://www.cyberpunk.net/en/news/22523/gameplay-reveal-48-minute-walkthrough and CD PROJEKT RED context: https://www.cdprojekt.com/en/media/news/cyberpunk-2077-gameplay-reveal-and-message-from-game-director/ | Official footage showcases a city with layered districts, varied silhouettes, storefronts, signage, and street-level detail. It is a high-end reference, not a mobile performance target. | Distinct district identity and layered facade detail are more effective than repeating a single box/window pattern. | Evolve the existing Downtown/Market/Residential/Civic/Industrial palettes into different rooflines, ground-floor treatments, facade modules, and signage. | Medium–high | Compare screenshots from the same camera positions; check draw calls and visual repetition. |
| Grand Theft Auto V — official Rockstar pages: https://www.rockstargames.com/gta-v and https://www.rockstargames.com/newswire/article/25o2411812a31k/grand-theft-auto-v-is-now-available-for-pc | Rockstar documents configurable graphics settings and a population-density control on PC; official material also highlights denser traffic, foliage, weather and world-detail improvements across versions. | Population and visual quality are tunable budgets; traffic/pedestrian density should not be increased without profiling. | Keep ULTRA as the first benchmark; later expose explicit density controls only after measuring pedestrian and traffic costs. | High if population is increased blindly | Benchmark empty view, traffic, NPCs, and sustained movement separately. |
| Three.js official SkinnedMesh and animation docs: https://threejs.org/docs/pages/SkinnedMesh.html and https://threejs.org/manual/pages/animation-system.html | Documentation explains that a valid skinned mesh requires a skeleton plus skin-index and skin-weight attributes; animation clips can be blended with an AnimationMixer. | Bone count alone is not proof of a functioning character. Validate skinning attributes and both-hand finger groups; inspect clips and visible movement. | Added runtime validation for weighted SkinnedMesh presence and recognized thumb/index/middle/ring/pinky joints on both sides. Removed the unsupported implication that an estimated texture memory value was measured. | Low runtime overhead; strict naming checks may reject differently named rigs | Load asset, check diagnostics, test open/relaxed/grip finger poses, inspect joints and mesh deformation. |
| Quaternius Universal Base Characters — official free pack: https://quaternius.com/packs/universalbasecharacters.html and https://quaternius.itch.io/universal-base-characters | The upstream project records the included base asset as CC0 1.0; source license is preserved in the avatar repository. | Prefer self-contained, licensed assets and record provenance; a low-cost rigged base still needs custom materials, face/clothing detail, and animation work. | Keep source/license documented; do not describe the current matte base as photorealistic or animated when it is not. | Low license risk if attribution/provenance is retained; medium visual gap | Confirm actual GLB loaded, verify visible mesh and materials, then assess in-world at normal camera distance. |

### Evidence classification

- **Direct source inspection:** REALCITY repository files and upstream avatar repository metadata/docs were inspected.
- **Official footage/page-based observation:** Gangstar Vegas, Cyberpunk 2077, and GTA V references were reviewed through official public pages/footage listings. No claim is made that these games were installed or played.
- **Technical hypothesis:** LOD, culling, instancing, lower simulation frequency, and controlled density are candidates for mobile optimization; the reference footage alone does not prove a specific engine or internal optimization implementation.

## Changes in this branch

### `src/main.ts`

1. GLB acceptance now checks for at least one `SkinnedMesh` with both `skinIndex` and `skinWeight` attributes.
2. Rig acceptance checks for recognized thumb, index, middle, ring, and pinky groups on both left and right sides, in addition to minimum bone/joint counts.
3. Runtime asset status reports bone count, recognized finger-joint count, weighted/skinned mesh counts, and animation-clip count.
4. Removed automatic playback of the first animation clip. The current upstream character has no bundled clips, and blindly playing clip zero is not a valid locomotion state machine.
5. Performance HUD now labels the measured callback duration as `MAIN`, removes the unsupported `MAP≈1MB*` estimate, and exposes a tooltip explaining that this is main-thread callback duration (update plus render submission), not GPU time. GEO/TEX remain resource counts, not byte-accurate memory usage.

## Verification status

| Check | Status | Evidence / limitation |
|---|---|---|
| Repository/entry-point audit | PASS | GitHub tree and source inspected. |
| Safe working branch | PASS | Changes isolated on `part6/audit-performance-hud`; `main` untouched. |
| Reference research | PASS | Public official pages/footage links recorded above. |
| Weighted skinning validation added | PASS (code change) | Runtime test still required. |
| Both-hand finger group validation added | PASS (code change) | Runtime visible-pose test still required. |
| Player looks photorealistic | BLOCKED / NOT MET | Current Quaternius base is matte/stylized and has no bundled animation clips. |
| Natural idle/walk/run transitions | NOT TESTED | A clip-driven state machine and compatible locomotion assets are not yet integrated. |
| NPC variety and navigation | PARTIAL | Existing source has 22 procedural fallback people and basic wandering; this is not a verified realistic NPC pipeline. |
| City/vehicle visual overhaul | NOT TESTED | No visual changes to these systems in this initial branch. |
| Build | NOT TESTED | No local Node/npm runtime was available through the GitHub file connector; a deployment/build check is still required. |
| Actual browser runtime | NOT TESTED | No live browser session or screenshot capture was available in this step. |
| OPPO A5 Pro ULTRA benchmark | NOT TESTED | Must be measured on the physical phone; no phone performance is inferred. |
| Deployment | NOT TESTED | Branch changes are not represented as a production deployment. |

## Next implementation gates

1. Run a build and inspect preview logs for this branch.
2. Capture a real runtime screenshot and verify the external GLB actually loads.
3. Use a license-documented detailed character asset; validate skeleton, weights, both-hand finger poses, and visible deformation in the real game.
4. Integrate compatible idle/walk/run clips with cross-fades and keep gameplay movement independent of animation.
5. Replace procedural pedestrian fallback visuals only after the player asset and animation pipeline are proven.
6. Make district and vehicle upgrades in small reversible changes, preserving current interactions and routes.
7. Benchmark ULTRA on desktop and the actual OPPO A5 Pro separately; never treat desktop numbers as phone results.
