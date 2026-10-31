# REALCITY phase recovery — brake/reverse regression

Date: 2026-10-21
Branch: `feature/realcity-protagonist-animation-audit`
Base commit: `dc828de4b143015f5e6f22536c2f9492bc884287`

## Baseline CI failure

GitHub Actions run 39573004675 tested merge commit 46696352fdd3627786d78b6ce6c9e12a22dd98dc (feature head `dc828de4b143015f5e6f22536c2f9492bc884287`).

Observed job steps:
- `npm ci --no-audit --no-fund`: PASS
- `npm run check:types`: PASS
- `npm run build`: PASS
- `npm run validate:assets`: PASS
- `npm run test:browser`: PASS
- `npm run test:performance`: FAIL

The exact failing assertion was `Deliberate reverse from rest did not move backward` at `scripts/realcity-mobile-performance.mjs:155`. The preceding browser test reported no page errors or failed HTTP responses and verified player movement, collision probes, vehicle entry/exit, service, and settings.

## Fix committed

- In `src/main.ts`, releasing keyboard reverse/brake input now explicitly clears the reverse-brake latch.
- Releasing the touch brake control now also clears the latch immediately, aligning touch and keyboard release semantics and avoiding stale braking state before a deliberate reverse input.
- In `scripts/realcity-mobile-performance.mjs`, the reverse regression trial explicitly releases any stale keyboard state and focuses the page before issuing the intentional reverse input. The assertion that speed becomes negative remains intact; it has not been weakened or skipped.

## Verification limits

This environment cannot resolve github.com from its local shell, so local checkout/npm execution is unavailable. The post-commit GitHub Actions run is the authoritative retest and is still required. NPC 5/10/20/40 performance matrix, route/collision regression suite, conversation lifecycle tests, and exact-preview verification remain outstanding unless covered by subsequent CI artifacts. Physical Android performance is not measured here.
