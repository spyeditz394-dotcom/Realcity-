# REALCITY realistic graphics upgrade — continuation audit

Date: 2026-10-21
Branch: `feature/realcity-protagonist-animation-audit`
Starting commit: `8477bdac2b0572c4c99cdffc9f773d7319ffc73a`

## Repository state and scope

- Inspected the current feature branch and PR #2 before edits.
- PR #2 was open, draft, and unmerged at audit time. Base is `main`; head was `8477bdac2b0572c4c99cdffc9f773d7319ffc73a`.
- `main` was not edited.
- Existing game is Three.js 0.160.0 + Vite + TypeScript; this change keeps that engine and the playable game.
- Existing procedural city/detail maps and bundled character/vehicle GLBs were reused. No new third-party assets were imported and no asset provenance is claimed.

## Implemented change

- Procedural asphalt/concrete/facade detail maps now use capped anisotropic filtering: up to 2x on mobile-safe profiles and up to 8x elsewhere, bounded by the actual WebGL renderer capability. This improves angled-surface texture clarity while limiting mobile sampling cost.
- Existing mipmapping and trilinear minification filtering remain enabled.
- This is a targeted rendering-quality adjustment, not a claim of photorealism or a measured performance improvement.

## Baseline findings from repository audit

- The game already has ACES filmic tone mapping, sRGB output, hemisphere and directional lighting, optional shadows, procedural surface detail maps, PBR materials, window instancing, city spatial grids, and adaptive mobile render scale.
- Mobile-safe mode disables shadow maps and uses lower default pixel ratio / quality; this protects performance but reduces contact-shadow realism.
- The city and many props are generated procedurally; these are not newly imported photorealistic environment assets.
- Protagonist and pedestrian models have existing GLB/fallback paths; optional protagonist turning clips are not guaranteed, and pedestrians may use procedural animation fallback.
- Prior software-rendered CI results are very slow and variable, so they cannot establish physical-phone performance.

## Verification status

This source-only GitHub edit was made through the repository API. A local checkout was not available in this execution context, so npm scripts could not be run here. The branch's CI and deployment must be checked after this commit. No matched before/after screenshot or physical OPPO A5 Pro measurement was captured during this operation.

| Acceptance criterion | Status | Evidence / limitation |
|---|---|---|
| Inspect latest repository / PR before edits | PASS | Branch tree and PR #2 metadata inspected |
| Keep Three.js game; no separate demo | PASS | Only existing `src/main.ts` renderer code changed |
| Reuse existing assets | PASS | No assets added |
| Improve texture response | PASS | Anisotropy capped by device profile and renderer capability |
| City geometry/material overhaul | UNVERIFIED | Existing procedural art pass inspected; not comprehensively redesigned here |
| Character and pedestrian fixes | UNVERIFIED | Existing GLB/fallback paths inspected; no locomotion changes in this commit |
| Vehicle improvements | UNVERIFIED | Existing procedural vehicle and bundled vehicle models retained; no vehicle changes |
| FPS / median / p95 / draw calls / triangles before-after | BLOCKED | CI rerun and matched baseline needed; no local browser run |
| Physical OPPO A5 Pro sustained performance | BLOCKED | Physical device unavailable |
| Matched screenshots | BLOCKED | No browser screenshot capture available in this execution context |
| npm ci, types, build, GLB/assets, browser/performance tests | UNVERIFIED | Must run in CI after commit |
| Preview corresponds to final commit | UNVERIFIED | Must inspect deployment after CI |
| PR #2 remains open/draft/unmerged; main unchanged | PASS at pre-edit inspection | Recheck PR state after commit |

## Honest limitations

This commit is a small, low-risk graphics tuning step. It does not complete the full realistic-city upgrade mission. The major remaining work is in-game visual inspection, matched screenshot capture, full CI execution, and measured Android performance validation. Do not treat a READY deployment as proof of gameplay or device performance.
