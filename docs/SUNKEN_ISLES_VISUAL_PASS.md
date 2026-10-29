# Sunken Isles harbour visual pass — 27 October 2026

Local review only. No merge, push or deployment. Branch prototype/machine-invasion, baseline commit bdbfcbcccd9cff0b35c5cf47f923af0cef99549a. Pre-existing local changes retained.

## What changed
The earlier pass was visually limited by brown ground coverage, sparse canopy, and cliffs sitting too low/outside the main view. The harbour now has its own grass/sand PBR material with connected sandy paths and damp coastal edges, raised offshore scanned cliffs, fuller scanned tree foliage and quieter warm lighting. Existing cottage roof detailing remains. Other islands keep their existing ground materials.

The loader supports retry after synchronous/asynchronous failures, deduplicates pending requests and publishes each placement once. Registered scenery uses isolated materials for camera-obstruction fading. Cliffs remain outside playable land; no traversal elevation or collision changes were introduced.

## Changed source / tests
- public/asset-manifest.js
- public/scene/environment.js
- public/scene/harbour.js
- public/scene3d.js
- server.js (static module allowlist only)
- tests/harbour.test.js
- Added public/scene/sunken-isles.js
- Added public/scene/harbour-terrain.js
- Added tests/sunken-isles.test.js

## Assets
All local additions are recorded with source, author, size and SHA-256 in asset-manifest.js. Poly Haven CC0 source records are under docs/asset-provenance/.
- boulder_01_lod.glb: 5,998 triangles, 3,059,040 bytes, reduced from 66,122 triangles.
- coastal_cliff_02_lod.glb: 22,000 triangles, 3,046,384 bytes.
- island_tree_01_lod.glb: 26,846 triangles, 3,122,516 bytes. Leaf components enlarged around their own centres to retain canopy coverage at reduced detail. This is an edited scanned model, not a new photorealistic character.
- coast_sand_01_diff_1k.jpg, coast_sand_01_nor_gl_1k.jpg, coast_sand_01_rough_1k.jpg: original 1K maps, 960,614 / 1,146,826 / 383,892 bytes. Source https://polyhaven.com/a/coast_sand_01
- sparse_grass_diff_1k.jpg, sparse_grass_nor_gl_1k.jpg, sparse_grass_rough_1k.jpg: original 1K maps, 955,945 / 1,440,314 / 463,340 bytes. Source https://polyhaven.com/a/sparse_grass
Licence: https://polyhaven.com/license . No runtime dependencies added. User reference images were not shipped as environment substitutes.

## Verification and evidence
- npm test: 106 passed, 0 failed. Initial HTTP test was blocked by sandbox socket EACCES; rerun after localhost permission passed.
- npm run build: passed, including import and asset hash validation.
- git diff --check: passed.
- Browser: game started with an isolated guest profile; terrain ready, nine placements loaded, zero pending/failures, no console warnings/errors. Movement and attack input accepted; nearby shop action appeared. Performance preset toggled successfully. Browser session disappeared before the final shop click / low-preset metric capture.
- No changes to gameplay, movement, combat, world, identity or persistence modules.
- Full expedition was not re-completed in this pass. Earlier isolated playthrough reached the boss but died; this is not evidence of successful extraction. Automated mission/extraction tests pass.

Screenshots in ../sunken-isles-review relative to repository parent: before-matched-high.png (original baseline), after-matched-high.png (first pass), visual-pass-after.png (this pass). All matched high captures use the spawn follow view and 1280x658 game canvas. UI timing and lighting animation vary.

## Performance observations
Same available Windows desktop / in-app Chromium preview, High preset, 1280x658 canvas, DPR 1.5. Hardware identification unavailable. These are observed rolling samples, not controlled GPU benchmarks.
- Original baseline: 587 draw calls, 603,970 triangles, 42 FPS, frame p95 34.1 ms, CPU p95 27.1 ms.
- Current pass: 602 calls, 766,484 triangles, 281 visible meshes / 1,551 instances, 44 FPS, frame p95 31.7 ms, CPU p95 14.7 ms. Longest recorded harbour model load 8,694 ms; terrain reports ready. Loading and frame timings vary with local contention/cache.
- Geometry increased materially; do not interpret similar FPS as proof the cost is free. Low fallback retained. No physical mobile-device validation or new low-mode timing available.

## Limitations / next step
This is a playable incremental harbour improvement, NOT photorealism at the supplied reference level. Cottage silhouettes, angular distant conifers, broad flat terrain and water remain visible limitations. No high-detail longhouse was imported. The next environment pass should replace the most visible cottage with a licensed optimized model inside the existing footprint, then measure mobile cost before adding density. Character work should separately inspect in-place locomotion/contact clips and transitions without altering accepted movement or authoritative timing.
