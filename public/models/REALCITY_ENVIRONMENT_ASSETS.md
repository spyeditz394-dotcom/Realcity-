# REALCITY environment asset acquisition and integration

## Imported building variants

The Vite build runs `npm run assets:environment` before bundling. The script downloads nine CC0 building GLBs into `public/models/`, verifies their exact Git blob SHA-1, byte length, GLB v2 header and declared file length, and fails closed on a mismatch. The deployed application then loads the files from same-origin `/models/` URLs; the browser does not fetch these assets from the upstream repository.

| Local build output | Source asset | Upstream Git blob SHA-1 | License |
|---|---|---|---:|---|
| `realcity-building-d.glb` | [Kenney City Kit Commercial — building D](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_d/building_d.glb) | `cf0c89e6083f4c8811510e007d9c8ba3a7a227c1` | CC0 1.0 |
| `realcity-building-e.glb` | [Kenney City Kit Commercial — building E](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_e/building_e.glb) | `7ff4a5d74a1d93f0354126ad65fedef045b05c4a` | CC0 1.0 |
| `realcity-building-n.glb` | [Kenney City Kit Commercial — building N](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_n/building_n.glb) | `250ba859deb96c957e678aaf833b69cdb375e40e` | CC0 1.0 |
| `realcity-building-a.glb` | [Kenney City Kit Commercial — building A](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_a/building_a.glb) | `8a03830f1ab4eed5fc0d052b52f1a5c55c7496e8` | CC0 1.0 |
| `realcity-building-b.glb` | [Kenney City Kit Commercial — building B](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_b/building_b.glb) | `96ec68671ebb61950a17d23dcd284cba38432bbe` | CC0 1.0 |
| `realcity-building-c.glb` | [Kenney City Kit Commercial — building C](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_c/building_c.glb) | `af4f90b02df21108f0f80834c41401e25ba8628e` | CC0 1.0 |
| `realcity-building-f.glb` | [Kenney City Kit Commercial — building F](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_f/building_f.glb) | `66c9eb4dfa201062002657414ab54b2b399d2884` | CC0 1.0 |
| `realcity-building-g.glb` | [Kenney City Kit Commercial — building G](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_g/building_g.glb) | `861fda665576628cc90b0dbfa05c32c5f287fa6d` | CC0 1.0 |
| `realcity-building-h.glb` | [Kenney City Kit Commercial — building H](https://github.com/Papyszoo/CC0-Public-Domain-Models/blob/main/packs/kenney-city-kit-commercial/models/building_h/building_h.glb) | `691bc722a57819750ff852a7a4689506e9bb7624` | CC0 1.0 |

License evidence: upstream [CC0 model collection](https://github.com/Papyszoo/CC0-Public-Domain-Models) and its `LICENSE` file. Kenney's City Kit Commercial models are stylized/low-poly, not photorealistic. They are being introduced as a first environment-art variation pass, not as the final realistic building library. No attribution is required under CC0, but source records are retained here.

## Runtime integration

- Selected low-rise procedural building placeholders are retained for collision and camera-blocker logic.
- Nine imported variants are loaded through Three.js `GLTFLoader`, scaled to the existing building envelope, and shown as the visual building model.
- Procedural facade/window/roof details are skipped on selected replacement buildings to avoid stacking a second facade over the imported model.
- QA exposes `importedBuildingCount`; the browser smoke test requires at least three imported replacements, while the city now selects across nine verified building variants.
- The GLB validator checks structure and local self-contained buffers/materials. Browser loading is a separate runtime gate.
- A passing asset gate does not establish visual realism, art direction consistency, or device performance.

## Remaining environment-art work

The imported Kenney variants are a controlled initial integration, not a claim that the whole city is realistic. Review the deployed preview on a physical device, inspect silhouette/material quality and scale, then source a consistent higher-detail CC0 PBR building set if the art direction still falls short. Do not label the environment-art gate complete solely because the models load.
