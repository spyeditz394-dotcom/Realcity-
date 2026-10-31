# REALCITY Phase 1 — Asset Furnishing Master Gate

**Purpose:** Produce a coherent, license-cleared asset pack before integrating new art into the game. This is a tracking and acceptance contract, not a claim that any unchecked binary exists.

## Phase 1 exit definition

Phase 1 is complete only when every required asset category below has actual files in the repository, source/license evidence, preview renders, measured budgets, and validation results. Concept art, placeholder meshes, tinted clones, procedural silhouettes, source links, and plans do not count as delivered production assets.

## Asset families and required deliverables

### A. Playable protagonist — priority P0
- [ ] `realcity-protagonist-v2.glb` — original contemporary urban protagonist with detailed face, hair, hands, jacket, trousers, and boots.
- [ ] Rig and clips: `Idle`, `Walk`, `Run`, `Jump`, `Land`, `TurnLeft`, `TurnRight`.
- [ ] Optional follow-up clips: `Crouch`, `Fall`, `GetUp`.
- [ ] Source project, preview sheet, export notes, license declaration, and measured GLB validation report.
- [ ] In-place locomotion documented; skeleton and clip names match runtime contract.

### B. Distinct pedestrians — priority P1
- [ ] `realcity-pedestrian-casual.glb`
- [ ] `realcity-pedestrian-worker.glb`
- [ ] `realcity-pedestrian-formal.glb`
- [ ] At least one further distinct body/face/hair silhouette as budget allows.
- [ ] Each has a real separate mesh/model identity, valid skeleton, and working idle/walk; different material tints alone do not qualify.
- [ ] Variety strategy documents skin/hair/clothing palette combinations without relying on clones as the core variety.

### C. Vehicles — priority P1
- [ ] `realcity-sedan.glb` (existing asset must be revalidated, not assumed complete)
- [ ] `realcity-hatchback.glb`
- [ ] `realcity-pickup.glb`
- [ ] `realcity-taxi.glb`
- [ ] Optional police cruiser / service van after core set.
- [ ] Each has grounded dimensions, wheel meshes or documented wheel pivot anchors, material separation, and a stable visual root.
- [ ] Existing controller, collision footprint, enter/exit, service, and save/load semantics must remain owned by game logic.

### D. Modern urban architecture — priority P1
- [ ] Contemporary mid-rise apartment block (modular facade variation).
- [ ] Glass-and-concrete office/commercial building.
- [ ] Street-level retail / restaurant storefront modules.
- [ ] Low-rise residential block.
- [ ] Multiple distinct detached homes / bungalows (at least 3 facade/roof layouts).
- [ ] Police station exterior with readable signage and secure vehicle bay.
- [ ] Rooftop HVAC, balconies, railings, windows, doors, awnings, utility boxes, air-conditioning units, gutters, and roof parapets as reusable props.
- [ ] Modular dimensions and pivots documented; collision proxies separated from decorative details.

### E. Nature, gardens, and street dressing — priority P1
- [ ] At least 4 distinct tree silhouettes (e.g., broad-canopy, palm, ornamental street tree, conifer where appropriate).
- [ ] Shrubs, hedges, ground cover, lawn patches, flower beds, and at least 4 flower/planter variations.
- [ ] Garden fences, gates, benches, bins, bollards, streetlights, signs, traffic lights, bus stop, hydrants, manholes, curb/crossing pieces, road markings, and street furniture.
- [ ] LOD/instancing plan for repeated vegetation and props; avoid hundreds of unique draw calls.

### F. Interiors and interaction props — priority P2
- [ ] Reusable modern interior kits: apartment room, shop counter, office/police reception.
- [ ] Doors, handles, lights, shelves, chairs, tables, lockers, desk, monitor, storage, and interaction markers.
- [ ] Interior assets are staged only after core exterior assets and protagonist are validated.

## License and provenance gate

For every non-original file, keep the source page URL, creator, exact license name/version, attribution wording, download date, modifications, and a copy of the license/attribution where required. Do not infer a license from a search snippet or a pack name. Do not rip assets from commercial games. AI-generated assets must have their source/tool and any applicable terms recorded; inspect outputs for artifacts before acceptance.

## Initial mobile budgets (targets, not verified results)

- Protagonist GLB: prefer <= 8 MB; hard initial review ceiling 12 MB.
- Individual pedestrian GLB: prefer <= 5 MB; reuse compatible animation data only when technically valid.
- Vehicle GLB: prefer <= 5 MB each before optional texture compression.
- Modular building/prop: keep each reusable module light; texture atlases are preferred over many tiny materials.
- Main color/normal/roughness textures: generally 1K–2K for hero assets; smaller atlases for distant props.
- Provide LODs or simplified distant representations for assets repeated across the city.
- Profile actual draw calls, triangles, texture memory, download size, decode time, and sustained frame time. Budgets are not accepted based on estimates alone.

## Validation and integration gate

For every GLB:
1. Confirm valid glTF 2.0 structure and that all buffers/images resolve.
2. Record file size, vertex/triangle counts, material count, texture dimensions, and world-space bounds.
3. Check finite transforms, sensible scale/orientation, no unintended floating origins, and no visible missing/black materials.
4. Inspect a neutral daylight preview and an in-game-scale preview.
5. Test skin/animation if rigged; test wheel alignment and bounding boxes if a vehicle.
6. Store a brief validation report and evidence preview alongside the asset.
7. Integrate only after passing checks; preserve fallbacks and run the game's type, build, browser, and performance gates.

## Order of production

1. Protagonist model + rig + locomotion clips.
2. Distinct pedestrian models and shared animation compatibility.
3. Hatchback, pickup, taxi, and revalidation of sedan.
4. Building kit and bungalow variations, then police station.
5. Tree species, gardens, flowers, and street props.
6. Interior kit and interaction props.
7. Pack-size review, atlas/LOD pass, preview gallery, and Phase 1 exit audit.

## Current verified state at brief creation

- Existing protagonist GLB is a stylized baseline, not the target realistic hero asset.
- Existing imported sedan is the only imported vehicle currently documented by the asset gate.
- Existing pedestrians clone/tint the protagonist; this does not meet distinct-model requirements.
- All unchecked entries above remain **pending** until actual files and validation evidence are committed.
- Browser/emulator performance does not equal physical OPPO A5 Pro validation; that test remains outstanding until run on the device.
