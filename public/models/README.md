# REALCITY protagonist GLB asset

Place the exported, rigged protagonist at:

`public/models/realcity-protagonist.glb`

Vite serves this file at `/models/realcity-protagonist.glb`. The game requests only this project-local asset. If it is missing or fails validation, the in-game procedural animated character remains active. No third-party model URL is used as an implicit fallback.

## Runtime acceptance checks

The loader intentionally rejects assets that cannot replace the working character safely:

- At least one **skinned mesh** with a position attribute containing 300 or more vertices and at least one material.
- A valid, non-zero model height; the runtime scales the character to about 1.78 world units.
- A usable humanoid rig: at least 20 bones and 20 recognizable finger joints. Bone names should clearly identify left/right and thumb/index/middle/ring/pinky (or little) joints.
- At least four recognized body joints or one named locomotion animation clip.
- Name animation clips with common labels such as `Idle`, `Walk`, `Run` and `Jump` so the state-based animation selector can find them. Missing clips can use the procedural joint fallback where the rig naming is recognized.

## Export checklist

1. Export as **glTF Binary (.glb)** with the mesh, armature, materials, and animation actions included.
2. Apply object transforms before export; keep the character upright with feet near the ground origin.
3. Export animations as separate clips where possible and use looping idle/walk/run clips. Jump should be a one-shot clip.
4. Verify the exported file in a glTF viewer before committing it. Check skin deformation at shoulders, elbows, hips, knees, ankles, wrists, and fingers.
5. Keep texture sizes and mesh complexity appropriate for mobile; avoid embedding unused cameras, lights, and duplicate meshes.

**Important:** This file documents the asset contract; it is not itself a 3D model. Do not commit a placeholder or rename an unverified asset to this path. The procedural in-game character is the safe fallback until a real GLB is exported and validated.
