# REALCITY emulated performance comparison — 2026-10-20

## Method

Two adjacent GitHub Actions runs used the same Playwright/Chromium headless SwiftShader measurement script and 8-second animation-frame sampling window. Baseline commit: `e22d2c9c4ef8e3462fb1504e84f25205f4cb5094`. Adaptive-render commit: `b8509f0675a809ba04e2e5c77a291e6da4692daf`. The new touch-viewport detection/adaptive-scale telemetry work is being retested separately.

| Profile | Baseline FPS | New FPS | Baseline median frame | New median frame | Baseline p95 | New p95 |
|---|---:|---:|---:|---:|---:|---:|
| Mobile-low emulation (360×800) | 13.1 | 20.5 | 83.3 ms | 50.0 ms | 83.4 ms | 50.1 ms |
| Mobile-medium emulation (390×844) | 11.7 | 20.3 | 83.3 ms | 50.0 ms | 100.0 ms | 50.1 ms |
| Desktop reference (1280×720) | 4.9 | 9.4 | 200.0 ms | 100.0 ms | 216.7 ms | 116.8 ms |

These runs are directionally better in the new run, but are not yet evidence that adaptive resolution caused the improvement: the earlier emulated test reported a 1.0 pixel ratio in all profiles, and the Playwright mobile viewport had not been confirmed to activate the mobile-safe renderer path. Test code now explicitly detects touch-capable narrow viewports and reports `mobileSafeDefault` and `adaptiveRenderScale`; the new run must pass its assertions before that behavior is considered verified.

Both runs had zero browser console/page errors and zero failed HTTP responses. The mobile profiles reported around 189–192 draw calls, ~32.3k triangles, 377–380 visible static meshes, 12 pedestrians and 11 vehicles. The desktop software-renderer profile remains slow. These numbers are from software-rendered headless Chromium, not a physical phone.

## Decision

- **Emulated browser functionality:** passed for pedestrian movement, touch movement control, sustained throttle/braking/exit, and viewport HUD bounds.
- **Adaptive-resolution effect:** provisional; new test must prove the mobile-safe path and show scale reduction under sustained low FPS.
- **Physical OPPO A5 Pro:** not tested by CI; requires a real-device session.
- **Performance gate:** remains open until new adaptive test results and a sustained physical-device run are reviewed.
