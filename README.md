# REALCITY — Modern Open-World City Upgrade

This branch continues the existing REALCITY project in `spyeditz394-dotcom/Realcity-` and keeps the established Three.js/Vite/Rapier foundation. It is a feature branch intended for preview review; it does not replace the production/main branch automatically.

## Included systems in this build

- Procedurally generated city districts with road surfaces, curbs, road markings, façade variation, window instances, street furniture, trees, and rooftop details.
- Modern-city art pass: contemporary mid-rise architecture, window bays, muted concrete and glass, rooftop HVAC/water tanks, low-rise shopfronts, balconies, warm street lighting, road paint, planters and trees.
- Locally generated asphalt/concrete/facade detail maps plus PBR materials; shared geometry and repeated objects limit asset memory and draw-call overhead.
- Day/night switching, shadow and texture quality presets, FPS/render diagnostics, and world-object culling.
- A procedural articulated human fallback with visible facial/clothing detail and animated arms/legs, plus a gated GLB rig loader that refuses skeleton-only assets.
- State-based idle/walk/run/jump animation selection when the loaded character asset provides compatible named clips.
- Walking/running controls, touch controls, third-person camera, stamina, pedestrian roaming, vehicle traffic and driving, building-interior interaction, kiosks, minimap, and local settings persistence.

## Mobile/performance behavior

The first-run graphics preset is **Balanced** instead of forcing Ultra. Players can change presets in-game. Device-specific frame rate and visual quality still need to be tested on target phones; a READY deployment does not prove gameplay QA.

## Run locally

```sh
npm install
npm run build
npm run dev
```

Stack: Three.js, Vite, and TypeScript, with lightweight local AABB collision checks to avoid a heavyweight physics runtime. Player/vehicle movement uses custom kinematic integration rather than full rigid-body vehicle dynamics.

## QA status

The Vercel preview build has reported READY for this branch. Interactive QA on Android—including player locomotion, GLB asset appearance, vehicle entry/exit, interiors, save/load, touch input, and sustained FPS—must be performed before treating Part 9 as fully verified or merging it into `main`.


## Visual asset budget (target: approximately 100 MB)

The 100 MB figure is the **planned total game asset budget**, not the current downloaded build size. Do not pad the project with dummy files to hit a number. Add genuine, optimized assets in stages and measure their actual encoded sizes.

| Asset group | Target budget |
| --- | ---: |
| Protagonist + 3–5 NPC GLB models and animation clips | 18 MB |
| Vehicle GLB models and LODs | 22 MB |
| Building/prop models and futuristic landmark kits | 18 MB |
| PBR textures (base color, normal, roughness/metalness; mostly 1K, selected 2K) | 25 MB |
| Environment props, vegetation, decals, signs and UI/audio | 9 MB |
| Reserved headroom for compression/asset revisions | 8 MB |
| **Total target** | **100 MB** |

Use glTF/GLB with mesh compression where compatible, KTX2/Basis texture compression when the runtime transcoder is included, shared materials, texture atlases, mipmaps, and LODs. Keep a lightweight first-load path and lazy-load optional high-detail assets. The 100 MB target should be treated as an asset package/source budget; actual first-load transfer should be much smaller and measured separately.

## Asset status

The modern-city layer combines procedural Three.js geometry/materials with nine checksum-verified, low-poly Kenney City Kit Commercial building variants used for selected low-rise replacements; these are **not** photorealistic scans. The game also bundles distinct pedestrian models and a multi-vehicle CC0 fleet. Character loading now only checks the bundled path `public/models/realcity-protagonist.glb`; if that file is absent or fails rig validation, the animated procedural fallback remains active. The unverified third-party remote character URL has been removed. No unverified third-party asset has been copied into the repository. Runtime visual QA and Android performance testing remain required.
