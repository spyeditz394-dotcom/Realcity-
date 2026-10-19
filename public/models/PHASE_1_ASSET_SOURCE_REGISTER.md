# REALCITY Phase 1 — Candidate Asset Sources and Acquisition Log

This file records candidate sources to investigate. It does **not** authorize importing a model until the exact asset page, binary, and license are checked and preserved.

## Candidate sources found during Phase 1 planning

| Source | Potential use | Constraints before acceptance |
|---|---|---|
| https://models.codelove.in/ | Search across characters, vehicles, buildings, trees, props, and bundled assets; pages describe a mix of MIT, CC0, public-domain, and CC BY content | Verify the exact model's own license and attribution file; inspect art style and mesh/texture budgets. A site-wide claim is not a substitute for per-asset provenance. |
| https://3dassets.dev/assets?category=buildings | Search for self-contained GLB building assets | Filter for modern/realistic assets; confirm the specific record is CC0 and download the original attribution/provenance metadata if present. |
| https://3dassets.dev/assets?category=vehicles | Search for cars and service vehicles | Verify body/wheel geometry, dimensions, texture style, and CC0 record before use. The result set may contain unrelated vehicle types. |
| https://3dassets.dev/assets?category=environments | Search for nature, landscaping, and environment pieces | Verify individual asset license, visual style, LOD suitability, and runtime material support. |
| https://github.com/petroulacl/fps-buildings-env-kit | Candidate collection of CC0 environment sources and PBR textures | Audit actual files, sub-pack licenses, file size, provenance, and visual consistency before import. Do not import the full repository blindly. |
| https://avatarsdk.com/3d-character-creator/ | Candidate for a customizable rigged full-body character | Confirm export rights for the intended use, whether free export includes the required outfit/detail level, and the resulting rig/animation compatibility. Do not upload personal photos; use a generated original reference if needed. |

## Acquisition decision

REALCITY's target is contemporary, grounded, realistic art—not a uniform low-poly kit. Prefer original high-quality hero assets for the protagonist and signature buildings, then use carefully selected optimized licensed assets for background variety. If a candidate is visibly stylized or has incompatible topology/materials, reject it rather than lowering the target.

## Required log entry per accepted asset

- Exact asset name and repository path
- Exact source-page URL and author
- License/version and retained license or attribution file
- Original file hash and imported file hash
- Measured GLB size, triangles, materials, texture dimensions, bounds
- Visual inspection notes and preview
- Validation command/result
- Integration owner and regression-test result

## Current status

No new model is accepted by this register alone. The previously documented protagonist and sedan are existing baselines; new distinct pedestrians, imported vehicles, and environment variations remain pending until their actual binaries are added and validated.
