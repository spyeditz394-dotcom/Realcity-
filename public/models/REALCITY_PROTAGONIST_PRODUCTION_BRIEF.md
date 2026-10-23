# REALCITY Protagonist — Production Brief

Status: **art direction approved; production model not yet delivered**.

This document is a production contract. It is not proof that a model, rig, textures, or animation clips exist.

## Goal

Create an original, contemporary, realistic-but-mobile-friendly playable protagonist for REALCITY. Do not copy a recognizable commercial-game character or rip assets from commercial games. Use original modeling or assets whose individual license and attribution have been verified.

## Visual direction

- Modern everyday urban outfit: dark lightweight jacket, neutral shirt, olive/charcoal cargo trousers, practical boots, restrained accessories.
- Believable adult human proportions, recognizable face, modeled ears/nose/lips, natural hair silhouette, defined hands and fingers, articulated elbows/knees, anatomically plausible feet.
- Physically based materials with restrained roughness variation; no shiny plastic skin, exaggerated proportions, cyberpunk details, or low-effort mannequin appearance.
- Character must read clearly in daylight and shade at typical third-person camera distance.

## Deliverables

1. `realcity-protagonist-v2.glb` — binary glTF 2.0, self-contained textures or documented external texture files.
2. Source project file (prefer Blender `.blend`) and export notes.
3. `REALCITY_PROTAGONIST_LICENSES.md` — original-work declaration and/or exact source URLs, license versions, attribution, and modifications for every incorporated asset.
4. A preview sheet showing front/side/back views, close-up face/hands/boots, and neutral daylight in-game scale.
5. A validation report recording file size, dimensions, triangle count, material/texture count, skeleton joint count, animation names/durations, and test results.

## Rig and animation contract

- Humanoid skeleton with stable hips/root and foot orientation; skin weights must deform shoulders, elbows, hips, knees, ankles, hands, and neck without obvious collapsing.
- Required clips: `Idle`, `Walk`, `Run`, `Jump`, `Land`, `TurnLeft`, `TurnRight`. Prefer `Crouch`, `Fall`, and `GetUp` as follow-up clips.
- Walk/run must show alternating leg cycles, opposing arm swing, torso response, foot lift, and plausible foot contact. Idle must not visibly jitter. Jump and land must have clear anticipation/airborne/recovery phases.
- Clip names and playback assumptions must be documented. Root-motion behavior must be explicit; default expectation is in-place locomotion compatible with REALCITY's existing movement controller.

## Mobile performance budget (initial targets, subject to measured profiling)

- GLB target: <= 12 MB including embedded textures; prefer <= 8 MB.
- Character mesh target: 25k–55k triangles; provide a lower-cost LOD if feasible.
- Texture target: 1K–2K for the main character, using compressed textures at runtime where supported; avoid unnecessary 4K maps on mobile.
- Keep material count low (aim for 1–4 materials), remove hidden/internal geometry, and avoid expensive transparency.
- Do not claim the target budget is met until measured from the exported binary.

## Validation gate before game integration

- Parse the actual GLB as glTF 2.0 and confirm all referenced buffers/images resolve.
- Confirm non-empty scene, finite vertex data, valid bounds, upright orientation, sensible height, and feet near ground plane.
- Confirm at least one skinned mesh, a valid skin/joint hierarchy, non-degenerate weights, and the expected animation clips.
- Play every required clip in a viewer or automated harness; inspect foot sliding, pose popping, joint deformation, and animation transitions.
- Test clone/instancing behavior before considering this asset for pedestrian reuse.
- Run existing REALCITY type/build/browser/performance checks after integration, not before and not as a substitute for asset validation.
- Report emulator/browser performance separately from a physical OPPO A5 Pro test. Physical-device validation remains outstanding until actually run.

## Integration rules

- Keep this file and new asset work on `feature/realcity-protagonist-animation-audit` (or a specifically authorized development branch).
- Do not commit to `main`, merge PR #1, change production deployment settings, or promote a preview.
- Keep the current protagonist as a fallback until the new asset passes every gate.
- Integration must use the existing character root/controller and preserve movement, collision, camera, jump, touch controls, save/load, and interaction behavior.

## Current checklist

- [x] Existing asset inventory and integration gate inspected.
- [x] Visual direction captured from the REALCITY protagonist concept reference.
- [ ] Original high-quality model created.
- [ ] Rig and required animation clips created and exported.
- [ ] Actual GLB integrity and performance validated.
- [ ] Development-branch integration and gameplay regression tests passed.
- [ ] Physical OPPO A5 Pro sustained-play test completed.
