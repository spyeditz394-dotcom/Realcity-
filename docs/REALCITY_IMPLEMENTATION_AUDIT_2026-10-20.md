# REALCITY implementation audit — 2026-10-20

## Candidate and repository safety

- Repository: `spyeditz394-dotcom/Realcity-`
- Feature branch: `feature/realcity-protagonist-animation-audit`
- Current candidate source commit: `891f68ec8095b5712dab0b0b7c7539b75b3a9071`
- Preview: https://realcity-fbruapswz-spyeditz394-4635s-projects.vercel.app/
- Vercel state: READY; deployment metadata maps the preview to candidate commit `891f68ec8095b5712dab0b0b7c7539b75b3a9071`.
- PR #2: open, draft, unmerged. Base/main SHA: `3772a0279978d8a23f6f05593530431c485ced4a`.
- No merge or production traffic change was performed.
- A browser tool could not open the live preview URL directly in this session. CI browser gameplay tests run the built game through Vite preview locally; that is not the same as manually exercising the deployed URL.

## Fixes made during this verification pass

1. **Road network extent corrected.** The 32 × 32 cell generator previously had a road/curb/marking loop limited to k = -6…6 with 340-unit road segments. It now generates 33 road grid lines across the full 640-unit city extent, using 680-unit road/curb/marking spans.
2. **Landmark cells reserved.** Random park substitution could skip the Market landmark sign. The seven named landmark cells are now excluded from park substitution; runtime QA exposes generated landmark labels and asserts all seven are present.
3. **Collision limits aligned.** Player/vehicle collision boundaries and saved-position clamps now allow the outer road ring without letting actors leave the ground area.
4. **Foliage instancing.** Repeated tree trunks, crowns, and flower heads are batched into instanced meshes per 80-unit spatial chunk and material. Chunk culling uses a padding radius so instances near chunk edges are not incorrectly hidden.
5. **Tracked acceptance checklist.** See `docs/REALCITY_ACCEPTANCE_CHECKLIST_2026-10-20.md`.

## Procedural world evidence

- Grid: 32 × 32 = 1,024 cells at 20 units per cell; approximate span 640 × 640.
- Road grid: 33 lines per axis to connect the full cell grid.
- Fixed-seed generator: deterministic LCG seeded with 17031.
- District categories: Downtown, Market, Residential, Civic, Industrial, Luxury, Parks, Suburbs.
- Required sign treatments: POLICE, HOSPITAL, FIRE, SCHOOL, FUEL, MARKET, VILLAS.
- Browser QA now asserts grid metrics, district coverage, landmark presence, collision behavior, player movement/animation/jump, pedestrian motion, vehicle entry/driving/braking/exit, settings persistence, and browser/network errors.

## Automated verification

Latest candidate `891f68ec8095b5712dab0b0b7c7539b75b3a9071` observed results:
- TypeScript check: passed in GitHub Actions.
- Production build: passed in GitHub Actions.
- Local bundled GLB asset validation: passed in GitHub Actions.
- Browser gameplay smoke test: passed in GitHub Actions, including expanded-grid/district/landmark assertions.
- Final-candidate emulated performance test: passed as a test execution; measured frame rate remains below acceptance target.
- Vercel preview deployment: READY for the exact candidate SHA.
- Live deployed-URL interactive gameplay: not directly verified because the browser access path was unavailable in this session.
- Physical OPPO A5 Pro: not tested; the agent has no attached physical-device session.

## Performance evidence and limitations

The completed emulated performance run for candidate `891f68ec8095b5712dab0b0b7c7539b75b3a9071` used headless Chromium 156 with SwiftShader, touch/mobile viewport emulation, and 8-second sampling. Results:
- Mobile-low emulation (360 × 800): 13.3 FPS; median frame 66.8 ms; p95 83.4 ms; approximate JS heap 76.6 MB.
- Mobile-medium emulation (390 × 844): 12.5 FPS; median frame 83.3 ms; p95 83.4 ms; approximate JS heap 68.0 MB.
- Desktop reference (1280 × 720): 5.8 FPS; median frame 166.7 ms; p95 200.0 ms; approximate JS heap 103 MB.
- Static mesh count dropped from 11,578 on pre-instancing candidate `b527208491b5b80767966bc0bb1ca4efc1601c2a` to 9,233 after instancing (about 20.2% fewer tracked static meshes).
- Browser errors and failed HTTP responses: zero in all three emulated profiles.

Compared with the previous completed emulation, low/mobile FPS improved from 9.0 to 13.3, medium from 8.4 to 12.5, and desktop from 3.3 to 5.8. Approximate mobile JS heap also fell from 103 MB to 76.6/68.0 MB. These are software-rendered CI measurements, not physical-device performance. They remain well below the 30 FPS target; the performance gate is still open. No claim is made that the OPPO A5 Pro target is met.

## Feature status

| System | Status |
|---|---|
| Expanded 1,024-cell city and full-span road grid | Implemented; browser QA asserts grid metrics and full road-grid count |
| Eight district categories and seven landmark signs | Implemented; browser QA asserts runtime coverage |
| Player movement, animation, jump, camera and touch controls | Automated browser coverage passes on the candidate |
| Pedestrian movement and imported character/vehicle/building assets | Automated browser coverage and asset validation pass on the candidate |
| Collision/spawn checks | Automated collision probe passes on the candidate; physical exploration still needed |
| Foliage batching | Implemented; final performance effect awaiting completed matching benchmark |
| High-fidelity photorealistic art | Not achieved; assets and procedural materials remain stylized/low-to-mid fidelity |
| World streaming | Not implemented; world is generated up front with static visibility culling |
| Full police/fire/hospital gameplay, economy, missions/story, combat | Not implemented; landmarks are signs/structures, not complete service gameplay |
| Physical OPPO A5 Pro performance and stability | Not tested |
| Deployed-preview interactive session | Not directly verified in this environment |

## Acceptance decision

**Not complete.** Automated build/asset/browser checks pass on the current candidate, and its Vercel deployment is READY. The current-candidate emulated performance run completed but is far below target, the live deployed URL was not directly exercised, visual before/after screenshot comparison is not complete, and the physical OPPO A5 Pro gate remains unresolved. Keep PR #2 open/draft/unmerged and keep `main` unchanged.
