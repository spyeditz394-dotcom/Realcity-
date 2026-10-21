# REALCITY Phase 10 — Performance Audit

Date: 2026-10-21

## Changes

- Disabled multisample antialiasing on the mobile-safe renderer path while retaining it for non-mobile-safe profiles. Existing adaptive resolution, mobile shadow policy, static batching, spatial collision/camera indexes, and distance-based visibility are preserved.
- Fixed the standalone GLB validation command so `npm run validate:glb` validates the bundled protagonist by default; explicit path and role arguments still work.
- The existing prebuild asset fetcher verifies and downloads the three CC0 building variants when needed. The build and browser smoke test confirmed all 12 expected local model assets were present after prebuild.

## Comparable software-rendered benchmark

The repository performance harness ran before and after disabling MSAA with the same Chromium + SwiftShader setup, viewports, quality presets, and 8-second RAF sampling windows. These are emulated software-renderer results, not physical Android hardware measurements.

| Profile | Before FPS | After FPS | After median frame time | After p95 frame time | After draw calls | After triangles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile-low emulation (360×800) | 6.9 | 9.3 | 100.0 ms | 116.8 ms | 65 | 89,828 |
| Mobile-medium emulation (390×844) | 6.0 | 7.9 | 133.3 ms | 150.0 ms | 82 | 103,736 |
| Desktop reference (1280×720) | 2.5 | 3.9 | 250.0 ms | 283.3 ms | 163 | 106,687 |

Emulated FPS increased by about 35% on mobile-low, 32% on mobile-medium, and 56% on the desktop reference. SwiftShader remains far below 30 FPS; this does not establish the expected performance on a physical phone.

## Verification

- `npm run check:types`: PASS.
- `npm run validate:glb`: PASS, 25 structural checks; 3 optional-clip warnings.
- `npm run validate:assets`: PASS, 12/12 assets; package size 3.95 MiB. Existing warnings remain for optional animation clips and GLB chunk alignment in some vehicle models; runtime smoke loaded the vehicle models.
- `npm run build`: PASS. Vite still warns that the Three.js chunk is 587.37 kB minified (150.91 kB gzip).
- `npm run test:browser`: PASS, 31 checks, zero browser console/page errors and zero HTTP error responses. Covered city/district/landmark generation, protagonist idle/walk/run/jump, pedestrian movement, collisions, keyboard/touch movement, settings persistence, pause/resume, vehicle entry/throttle/braking/exit, servicing, and vehicle persistence.
- `npm run test:performance`: PASS as a test run; all three profiles emitted measurements and the expected low-FPS emulation warnings.
- `npm ci --no-audit --no-fund`: PASS in the sandbox after generating a lockfile locally; the lockfile addition is not yet present on the GitHub branch.
- `git diff --check`: PASS before the local commit.

## Unverified / remaining

- No physical OPPO A5 Pro was attached; actual-device FPS, thermals, GPU memory, and sustained-play stability remain unverified.
- The 30 FPS target is not demonstrated.
- A before/after screenshot pair from identical camera poses was not retained.
- The Three.js chunk warning remains; splitting core Three.js imports should be measured before attempting it.
