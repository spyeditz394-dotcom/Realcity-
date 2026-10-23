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
