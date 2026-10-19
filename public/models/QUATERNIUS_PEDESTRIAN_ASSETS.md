# REALCITY pedestrian character assets — Quaternius

Two distinct skinned character meshes are bundled for pedestrian appearance variety:
- `realcity-pedestrian-casual.glb`: Quaternius Universal Base Characters, derived from `Superhero_Male_FullBody.gltf`.
- `realcity-pedestrian-worker.glb`: Quaternius Modular Character Outfits - Fantasy, derived from `Male_Peasant.gltf`.

Original creator: Quaternius. Both source packs were documented by the upstream source repository as CC0 1.0 Universal. The supplied license/provenance record is retained at `public/models/licenses/QUATERNIUS_CHARACTER_LICENSE.txt`.

Official sources:
- https://quaternius.com/packs/universalbasecharacters.html
- https://quaternius.com/packs/modularcharacteroutfitsfantasy.html
- https://creativecommons.org/publicdomain/zero/1.0/

Upstream derivation source: BibliothecaDAO/eternum at commit b015a52b6c94e9d194973ada0c9613455c438ee1, under `apps/game/public/models/characters/quaternius/`. The meshes preserve the 65-joint Quaternius skeleton and do not contain animation clips. REALCITY drives their named limbs procedurally; they are not claimed to contain authored idle/walk clips.


## Runtime compatibility note

The vendored GLBs keep their original skinned meshes and 65-joint skeletons. Embedded WebP texture references were removed because the project's pinned Three.js GLTFLoader reports image decode failures for this export; per-part PBR base colors are used instead. The browser smoke test must remain the acceptance gate for both model loading and visible locomotion.
