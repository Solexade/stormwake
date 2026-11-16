# Survival prototype asset pass — 2026-11-14

Work remains on feature/open-voyage. No merge or deployment.

## Installed
- Daniel Andersson / Daniel74 Medieval House 2, CC0. Source: https://opengameart.org/content/medieval-house-pack . Original declaration retained in docs/licenses/medieval_house_02.html.
- public/assets/medieval_house_02.glb: 4,282,376 bytes, 12,760 triangles, twelve material primitives. Packed original base-colour textures. No normal or AO maps; not described as photorealistic.
- Blender 4.2.9 converted original .blend using scripts/convert-medieval-house.py. Missing source linked Wood material restored with packed Wood.jpg. Camera/lights omitted. Geometry joined, original UVs retained.
- Ten expanded-settlement cottages replaced visually inside original footprints, fallback retained on failed load. Materials cloned for existing obstruction fading. Shared source geometry/textures cached.
- High/Medium/Low cycling in game and pause controls; local preference retained. Medium caps DPR at 1.25, keeps shadows/foliage/shore, disables bloom. Low remains DPR1 without optional effects; touch defaults Low.

## Research decision
Poly Haven pine_tree_01 source geometry alone is approximately 949 MB. Do not serve this original to players. It remains a possible offline simplification source, not an installed asset. Asset size alone does not improve rendering; triangle, texture-memory and draw-call budgets matter. Existing optimized tree models remain available.

## Verification
120 tests passed before final preference persistence edit; build passed. Browser caught a duplicate import omitted by current build checks; fixed and verified with node --check and a successful playable browser reload. Riverhold scene visibly renders imported houses. Medium selected in UI. Captured outputs/open-voyage-review/medieval-medium.jpg outside repo. No new captured console errors after reload; old duplicate-import error remains in browser history.
No matched performance benchmark or physical mobile test yet. Current viewport is narrow and HUD remains crowded. Imported house windows are saturated and need art tuning; repeated building type is still obvious.

## Still pending
Survival waves, chapter removal, survival scoring/persistence and distinct civilian characters are NOT implemented by this asset pass. No claims of completion or photorealism. Existing expedition rules remain functional. Full isolated playthrough previously failed at boss and remains a release blocker.

## Verified continuation — 2026-11-15
Supersedes the earlier tree-not-installed note. Full 948,849,556-byte pine source downloaded and MD5 verified. Offline source remains outside public/repo. Runtime High GLB: 11,797,108 bytes / 86,274 triangles; Medium: 10,178,360 bytes / 31,630 triangles. Poly Haven CC0, https://polyhaven.com/a/pine_tree_01 . Optimized variant B with meshoptimizer 1.3.0 (offline tooling only). Low uses existing lightweight fallback.

Fixed an unapplied placement edit: three starting-harbour houses now actually use the imported building. Hidden fallback buildings skip raycasts; imported buildings use bounds-filtered scenery obstruction checks. Saved graphics choice is read before asset loading to avoid downloading High on a saved Medium/Low startup. Added asynchronous quality-switch regression coverage.

Browser verified at localhost:5262 with isolated pine-review database. 1280x720 desktop IAB, hardware not identified, no physical mobile verification. Same stationary harbour view: High ~32 FPS / 753 calls / 1,606,163 triangles / p95 36ms; Medium before final bounds filtering ~33 FPS / 752 calls / 1,169,009 triangles / p95 34.4ms; Low ~60 FPS / 335 calls / 455,743 triangles / p95 18.3ms. Final Medium observation: 41 FPS / 728 calls / 1,143,489 triangles / p95 42ms (includes load/transition frames; not a controlled performance improvement claim). Final asset load report: 19 ready, zero pending/failures; no console warnings/errors. Cached load 939ms, earlier cold load 10.6s.

Before/after captures outside repository in outputs/open-voyage-review: harbour-before-fix.jpg and harbour-final-medium.jpg. Images show the building replacement; do not establish photorealism. Architecture repeats, blue windows and basic terrain/character silhouettes remain limitations. Survival-mode redesign is still pending; this pass changes scenery only. No merge or deployment.
