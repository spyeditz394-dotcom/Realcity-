# REALCITY Part 8 — Living City Simulation (Incremental Milestone)

Date: 2026-10-18  
Repository: https://github.com/spyeditz394-dotcom/Realcity-  
Base branch: `part-7-open-world-systems`  
Base commit verified from GitHub: `1071be18cf6b2453a787e959da6faabbdb5302e8`  
Feature branch: `part-8-living-city-simulation`  
Implementation commit: `38453f020f0986ecdfe702b275aa4afe86cdbcd2`

## Continuity audit

The supplied historical Part 7 SHA (`a9ce225fb4a9e83a72c05c7fc122b441861ab3ce`) did not match the current GitHub branch head. The current branch head was verified as `1071be18cf6b2453a787e959da6faabbdb5302e8`, and Part 8 was branched from that actual commit. The Part 7 source entry point is `src/main.ts`; it already contains Three.js, Rapier static collision queries, a grid road network, 22 procedural fallback pedestrians, eight lane-following traffic vehicles, player driving, day/night lighting, quality presets, save/load, and interior interactions.

## Changes made in this milestone

### `src/main.ts`

- Traffic following now scans a longer look-ahead window and considers other traffic and the player-controlled vehicle when they are close to the same lane.
- Traffic uses explicit runtime states (`cruise`, `following`, `braking`, `stopped`) and smoothed acceleration/deceleration rather than an abrupt per-frame target-speed change.
- Traffic has a lower target cruise speed at night; the day/night switch records the city period and target-density intent on traffic agents. This is a lightweight time-of-day adaptation, not a complete dynamic population/spawning system.
- Ambient traffic is hidden when it is beyond the 150-unit player vicinity while continuing its simple lane simulation. This reduces visible distant clutter but is not full spatial partitioning or traffic pooling.
- Pedestrian fallback gait now responds to whether the pedestrian is moving and its turn/pace. Blocked agents use a restrained idle/avoidance pose rather than always showing a full walking gait.
- Pedestrian runtime state is recorded as `walking`, `turning`, `avoiding`, or `idle`; this is diagnostic state on the existing procedural fallback rig, not a full navmesh or realistic animation system.
- Existing controls, vehicle movement, collisions, day/night lighting, save data, quality settings, and interiors were not intentionally removed or rewritten.

## Verification

- GitHub branch creation: PASS.
- Source edit committed on the feature branch: PASS.
- Build: NOT TESTED in the repository runtime at the moment this report was written.
- Browser gameplay: NOT TESTED.
- Visual inspection/screenshot: NOT TESTED.
- Pedestrian route correctness and long-duration stall recovery: NOT TESTED.
- Traffic lane/intersection behavior: NOT TESTED; existing traffic still follows straight grid lanes and wraps at the map boundary. Full turn routing and signal priority remain future work.
- Vehicle control/service regression: NOT TESTED.
- ULTRA performance and phone performance: NOT TESTED.
- OPPO A5 Pro physical test: NOT TESTED.
- Production deployment: unchanged; only a preview deployment may be created for this branch.
- ANICORE: not accessed or modified.

## Remaining work / next gates

1. Build the exact feature commit in Vercel and inspect build output.
2. Run the served game in an actual browser and test pedestrian movement and traffic braking in multiple scenarios.
3. Improve traffic route/intersection handling with explicit road graph nodes before claiming full traffic AI.
4. Add deterministic tests for traffic speed transitions and pedestrian states, with a test runner only if it fits the current project/tooling.
5. Add population scheduling/pooling and district-specific activity as measured, bounded systems.
6. Improve actual vehicle geometry/materials and environment only after runtime baseline captures.
7. Benchmark ULTRA in desktop browser and physically on OPPO A5 Pro separately.

This milestone is intentionally incremental. The source changes are real, but runtime behavior and mobile performance are not claimed as verified.
