# REALCITY — Part 9: Living City Systems

This branch continues the existing REALCITY project in `spyeditz394-dotcom/Realcity-` and keeps the established Three.js/Vite/Rapier foundation. It is a feature branch intended for preview review; it does not replace the production/main branch automatically.

## Included systems in this build

- Procedurally generated city districts with road surfaces, curbs, road markings, façade variation, window instances, street furniture, trees, and rooftop details.
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
