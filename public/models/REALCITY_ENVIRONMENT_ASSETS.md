# REALCITY environment asset acquisition and integration

## Imported building variants

The Vite build runs `npm run assets:environment` before bundling. The script downloads three CC0 building GLBs into `public/models/`, verifies their exact Git blob SHA-1, byte length, GLB v2 header and declared file length, and fails closed on a mismatch. The deployed application then loads the files from same-origin `/models/` URLs; the browser does not fetch these assets from the upstream repository.

| Local build output | Source asset | Upstream Git blob SHA-1 | Bytes | License |
|---|---|---|---:|---|
| `realcity-building-d.glb` | [Kenney City Kit Commercial — building D](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_d/building_d.glb) | `cf0c89e6083f4c8811510e007d9c8ba3a7a227c1` | 106,164 | CC0 1.0 |
| `realcity-building-e.glb` | [Kenney City Kit Commercial — building E](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_e/building_e.glb) | `7ff4a5d74a1d93f0354126ad65fedef045b05c4a` | 139,212 | CC0 1.0 |
| `realcity-building-n.glb` | [Kenney City Kit Commercial — building N](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_n/building_n.glb) | `250ba859deb96c957e678aaf833b69cdb375e40e` | 352,236 | CC0 1.0 |

License evidence: upstream [CC0 model collection](https://github.com/Papyszoo/CC0-Public-Domain-Models) and its `LICENSE` file. Kenney's City Kit Commercial models are stylized/low-poly, not photorealistic. They are being introduced as a first environment-art variation pass, not as the final realistic building library. No attribution is required under CC0, but source records are retained here.

## Runtime integration

- Selected low-rise procedural building placeholders are retained for collision and camera-blocker logic.
- Three imported variants are loaded through Three.js `GLTFLoader`, scaled to the existing building envelope, and shown as the visual building model.
- Procedural facade/window/roof details are skipped on selected replacement buildings to avoid stacking a second facade over the imported model.
- QA exposes `importedBuildingCount`; the browser smoke test requires at least three imported replacements.
- The GLB validator checks structure and local self-contained buffers/materials. Browser loading is a separate runtime gate.
- A passing asset gate does not establish visual realism, art direction consistency, or device performance.

## Remaining environment-art work

The imported Kenney variants are a controlled initial integration, not a claim that the whole city is realistic. Review the deployed preview on a physical device, inspect silhouette/material quality and scale, then source a consistent higher-detail CC0 PBR building set if the art direction still falls short. Do not label the environment-art gate complete solely because the models load.
