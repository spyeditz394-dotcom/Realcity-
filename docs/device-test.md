# REALCITY Phase 10 — OPPO A5 Pro device session

Status: **UNVERIFIED — requires a real OPPO A5 Pro and human-run session.** CI/desktop emulation must not be copied into the device results.

## Before starting
- Open the current feature-branch Vercel preview on the OPPO A5 Pro in Chrome.
- Open the preview with `?debug=perf`. The overlay is measurement-only and reports FPS, rolling p95 frame time, NPC count, and build SHA.
- Confirm the displayed SHA matches the Phase 10 report and `/version.json`.
- Record Android and Chrome versions. Keep the same browser and graphics preset for the session.
- Avoid screen recording unless needed; it can affect performance.

## Scripted 15-minute session
Record overlay readings at minute 0, 1, 3, 5, 7, 9, 11, 13, and 15. Note hitches, input delay, overheating warnings, and layout issues with timestamps.

1. **00:00–02:00 — Idle and walk.** Observe city rendering, walk/turn, release controls, and confirm movement stops cleanly.
2. **02:00–04:00 — Driving.** Enter a parked vehicle, accelerate, steer, brake to a stop, release brake, and exit.
3. **04:00–05:30 — Reverse.** From rest, reverse briefly, release, then alternate forward/brake/reverse five times.
4. **05:30–08:00 — NPC interactions.** Approach three pedestrians, open/close interactions, walk away from one, and test Back/Escape cancellation where available.
5. **08:00–11:00 — Population/traffic.** Record actual NPC count. Use only existing supported controls; do not add a gameplay feature to force 40 NPCs. Observe traffic around pedestrians and obstructions.
6. **11:00–13:00 — Graphics and camera.** Rotate camera, traverse a street, switch one graphics preset, and check missing assets, blank frames, blur, and layout overflow.
7. **13:00–15:00 — Sustained run.** Continue moving through a representative street; watch frame time, freezes, control delay, and thermal changes.

## Results template
Copy this into a dated results file and fill it using the real device. Leave unknowns blank.

- Date/time:
- Device model:
- Android version:
- Browser and exact version:
- Preview URL:
- Build SHA shown by overlay:
- `/version.json` build SHA:
- Graphics preset:
- Session duration (minutes):
- Battery level / ambient conditions (optional):
- NPC count at each checkpoint:
- FPS at 0 / 1 / 3 / 5 / 7 / 9 / 11 / 13 / 15 minutes:
- p95 frame time (ms) at those checkpoints:
- Dropped-frame notes and timestamps:
- Reverse/brake behavior:
- NPC interaction results:
- Traffic/collision observations:
- Browser errors or asset failures:
- Thermal observations:
- Screenshots/evidence references:
- Tester notes:

## Acceptance interpretation
Target: approximately 30 FPS (33.3 ms/frame) on the real phone. Report sustained periods above 33.3 ms and spikes above 50 ms. Device performance remains **UNVERIFIED** until actual results and evidence are submitted.


## Cross-device/browser compatibility matrix (manual release gate)

The OPPO A5 Pro session above is one reference-device run, not the entire compatibility target. Repeat the functional subset below across available hardware and supported browsers. Record exact device, OS, browser version, viewport, graphics preset, build SHA, and evidence for each run.

| Class | Browser / environment | Required checks |
|---|---|---|
| Android phone, lower-memory | Current Chrome; narrow 320–360 CSS px viewport where available | Startup, touch movement, release/cancel controls, vehicle entry/throttle/brake/reverse/exit, UI overflow, LOW/BALANCED quality |
| Android phone, reference | OPPO A5 Pro + current Chrome | Full 15-minute script above; approximately 30 FPS target; frame pacing, memory proxy, thermals, sustained play |
| Android phone, alternate engine | Current Firefox or another available Android browser | WebGL startup, controls, resize/orientation, settings persistence, asset/network failures |
| iPhone | Current iOS Safari | WebGL startup, touch controls, safe-area layout, orientation change, audio/browser restrictions if applicable, settings persistence |
| Tablet | Android Chrome and/or iPad Safari | Portrait/landscape, touch target reachability, minimap/HUD overlap, camera gestures, driving controls |
| Desktop/laptop | Current Chrome, Edge, Firefox, Safari where available | Keyboard movement, mouse camera, vehicle controls, pause/escape, resizing, settings persistence |
| High-DPI / high refresh | Any available mobile/desktop browser | Device pixel ratio cap, stable resolution switching, no unbounded render-target growth |
| WebGL unavailable/blocked | Browser/profile with WebGL disabled, if available | App must show a clear unsupported-browser message instead of silently leaving a blank game surface; 3D gameplay is not possible without WebGL |

### Exact per-browser steps

1. Open the final preview URL in a fresh browser tab and verify its displayed build SHA equals `/version.json`.
2. Wait for the game to finish loading. Confirm the canvas fills the viewport and there is no blank/black half-screen, clipped HUD, or persistent loading overlay.
3. Walk forward/left/right/back; release every control and confirm movement stops. On touch devices, test pointer cancel, finger lift, and dragging the camera without leaving a control latched.
4. Enter a parked vehicle, accelerate, steer, brake until fully stopped, release the brake, press reverse from rest, return to forward movement, and exit safely.
5. Approach NPCs, open and dismiss their interactions, then walk away. Observe traffic yielding, obstruction recovery, and any persistent overlaps.
6. Open an interior, exit it, change graphics/time settings, reload the page, and confirm persistence.
7. Resize the window or rotate the device, then repeat movement and driving controls.
8. Save screenshots of initial load, HUD/layout, vehicle side/front-three-quarter, NPC interaction, interior, and any defect. Save console/network errors and a performance trace when the browser supports them.
9. Record PASS/FAIL per step. Do not mark a device/browser as supported from viewport emulation alone.

### Interpretation

- “Broad device support” means passing the documented browser/device matrix, not a universal guarantee for every GPU, browser version, or unsupported WebGL environment.
- CI Playwright emulation can validate layout and scripted controls, but it cannot measure physical GPU frame pacing, total process/GPU memory, device thermals, battery behavior, or sustained mobile throttling.
- Any device/browser class not actually tested remains **NEEDS DEVICE** or **NEEDS REVIEW**; do not infer a pass from a Vercel deployment being READY.
