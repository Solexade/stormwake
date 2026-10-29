# Sunken Isles — Phase 2 baseline audit

Date: 2026-10-26. Audit only: the environment upgrade is not yet implemented.

## Baseline

Branch `prototype/machine-invasion`, commit `bdbfcbcccd9cff0b35c5cf47f923af0cef99549a`. Working tree clean before this report. Existing melee-only changes preserved. No reset, merge, deployment, schema change or production-data access.

Reviewed: scene3d.js, scene/environment.js, scene/harbour.js, scene/assets.js, asset-cache.js, asset-manifest.js, realism.js, lighting.js, palette.js, quality.js, cinematic.js, characters.js, world.js, app.js quality initialization and graphics tests.

## Prioritized findings

1. **P1: failed harbour assets cannot retry through the wrapper.** createHarbourAssets sets `started=true` before loading and never clears it on rejection. The lower cache permits retries, but the wrapper returns its old promise. Reproduced with an injected loader that fails once: add -> low -> high gives one attempt, zero loaded models, fallback visible. Fix explicit retry without creating an automatic retry loop; test the wrapper, not only the cache.
2. **P1: prominent geometry is still simplistic.** Islands are extruded polygons, repeated perturbed icosahedra form the shore, cottages are box-built and trees use generated needle cards. Photographic textures cannot fix those silhouettes. Prioritize cliffs, trees and roofs over additional small props or bloom.
3. **P1: asset cost needs rebalancing.** The existing boulder alone is 66,122 triangles. Repeating it around the shoreline would be expensive. Reduce offline, preserve UVs and inspect silhouette at the real camera before adding instances.
4. **P1: fitting is not a general placement guarantee.** fitHarbourAsset supports radius or height. Height alone does not constrain width. New houses/cliffs need explicit finite bounds, horizontal budgets, ground offset and camera exclusion zones. Preserve all original collision boundaries.
5. **P1: camera occlusion is only handled for existing buildings.** Imported trees/cliffs can hide the player despite having no colliders. Extend visual fade/placement rules before using tall foreground assets.
6. **P2: ocean shading has no coastline-distance/depth input.** Waves, analytic sky reflection and haze are independent of land. Foam ribbons alone do not create shallow/wet transitions. Add coastline-aware colour and wave attenuation, without introducing traversable elevation or physics changes.
7. **P2: Low mode retains some significant costs.** It disables grass, shadows, bloom and shore ribbons, restores lightweight prop fallbacks and stops tree sway; tree crowns remain rendered. Photographic textures/HDR still load. Measure before changing this established fallback.
8. **P2: instrumentation is incomplete.** Draw calls/triangles are renderer totals, not visible-object counts. CPU draw time is not GPU time. Asset loading duration and object counts are not exposed. Add diagnostics before claiming improved loading or mobile performance.
9. **P2: existing visual tests have gaps.** They test source-cache retry, initial fallback, basic fitting, quality flags, shore samples and asset hashes. Missing: wrapper retry, asymmetric/rotated placement, imported camera obstruction, geometry budgets and matched visual checks. The asset-count assertion currently expects exactly 18.

The narrow baseline screenshot also shows a large HUD/interaction overlay obscuring scenery. That is a separate UI concern; this environment phase must not silently redesign controls.

## Preserved geography

Scene scale: simulation X,Y divided by 40 becomes scene X,Z. Land remains flat. Shared collision uses polygon/bridge membership, circular obstacles, rotated structure footprints and four cardinal radius probes. Movement is swept in steps no greater than four simulation units.

| Landmark | X,Y |
|---|---|
| Spawn/extraction | 465,1410 |
| Hearthhall | 445,1315 |
| Forge | 647,1460 |
| Supplies | 795,1625 |
| Shrine | 1135,815 |
| Boss | 1910,560 |
| Chest | 580,720 |

Harbour polygon: (245,1210), (380,1080), (685,1070), (890,1170), (985,1420), (860,1650), (370,1700), (220,1510).

Houses: centres (420,1240), (660,1390), (760,1580); footprints 126x101, 114x96, 90x78; rotations -.15, .1, .35 radians. Harbour obstacle: (700,1520), radius52. Bridges: (670,1070,160,200), (800,755,260,100), (1430,740,200,110).

Visual route: spawn -> (655,1360) -> (750,1180) -> (930,1100) -> shrine -> (1420,820) -> (1650,795) -> (1840,680) -> boss. These references do not replace authoritative navigation/collision.

## Verified local models

Counts read directly from GLB accessors; licence labels refer to existing manifest/provenance records, not a fresh legal audit of every historical asset.

| Asset | Bytes | Triangles | Recorded licence |
|---|---:|---:|---|
| boulder_01.glb | 5771068 | 66122 | Poly Haven CC0 |
| wooden_barrels_01.glb | 2408392 | 11184 | Poly Haven CC0 |
| azure_champion.glb | 1907780 | 22500 | CC0 |
| hooded_blade.glb | 1531908 | 22500 | CC0 |
| knight.glb | 1022896 | 1524 | Quaternius CC0 |

Boulder source dimensions approximately 1.272 x 1.004 x 1.830 units; barrel 0.743 x 0.917 x 0.743 before fitting. Environment GLBs embed base, normal and ARM maps. Existing 1K forest-floor, rock, weathered-plank maps and furry-cloud HDR can be reused. Tiling ground materials currently use base/normal/roughness, without AO.

Lighting already uses ACES/sRGB, local HDR illumination, cool directional/hemisphere light, fog and subtle bloom. Increasing effects is not the primary fix. Low bypasses grading/bloom; evaluate both presets.

## Candidate assets — not installed

- Coastal Cliff 02: https://polyhaven.com/a/coastal_cliff_02 ; Rob Tuytel; CC0 via https://polyhaven.com/license . Inspected 1K glTF has ONE LOD0 mesh, 943284 triangles, 26773008-byte geometry buffer and about 2.38 MB textures. Bounds span about 40.928 x 10.053 x 8.648 units. API LOD metadata does not imply that this export contains ready lower LODs. Offline reduction required.
- Island Tree 01: https://polyhaven.com/a/island_tree_01 ; Rob Tuytel / Rico Cilliers; Poly Haven CC0 candidate. API geometry buffer 60709812 bytes with trunk/branch/leaf texture sets. Actual mesh and alpha complexity still needs inspection. Not appropriate for direct runtime download.
- No new licensed longhouse/cottage has passed geometry, footprint and texture review. Existing buildings remain procedural placeholders.

Provisional targets: cliff 15–30k triangles/segment; tree 5–12k; small rock LOD 2–6k. These are proposed budgets, not achieved measurements. Require embedded local maps, source checksum, individual provenance, screen-size inspection and fallback before importing.

No new game asset imported. A build-time meshoptimizer tool was installed in workspace work/sunken-assets outside the repository. No game dependency/lockfile changed.

## Verification and limitations

Baseline npm test: 100 passed, zero failed. Baseline npm run build: passed. No executable source changed after these checks.

Fresh local browser at localhost:5246: expedition begins, harbour renders, axe/sword/spear choices visible; no captured initial warning/error logs. Retry defect reproduced through an isolated in-memory harness with no database.

Baseline image is outside checkout at outputs/sunken-isles-review/before.png. Codex desktop in-app browser on Windows, stationary spawn, High preset, 435x462 CSS-pixel canvas, 180 rolling frame samples:

| FPS display | Frame p95 | CPU draw p95 | Draw calls | Submitted triangles | Harbour models |
|---:|---:|---:|---:|---:|---:|
| 60 | 18.80 ms | 7.80 ms | 470 | 500737 | 2 |

Actual GPU/effective DPR were not recorded. This is a narrow desktop browser, NOT a physical mobile measurement. Visible-object count and asset timing unavailable. No after image exists because environment changes have not begun. No performance improvement is claimed.

Full route/combat/boss/extraction, real PostgreSQL, physical touch devices and browser-network asset failure have not been verified by this audit. Automated tests do not substitute for them.

## Reviewable implementation sequence

1. Fix wrapper retry and add load/object diagnostics with lifecycle tests; establish repeatable fixed-camera measurements.
2. Optimize/integrate one scanned cliff family outside the existing walkable shore. Retain original fallback, bridge entrances, extraction sightline and collision data.
3. Add one optimized tree/rock family, then roof/material variation within house footprints. Test camera obstruction. Avoid spreading high detail across the entire world.
4. Add shoreline-aware ocean colour/wave attenuation, retaining the lightweight path and existing surface elevation.
5. Matched High/Low screenshots and measurements; route/interactions/combat/extraction tests; full suite/build; real-phone review before production consideration.

Next character step: retarget in-place sword/spear wind-up, contact and recovery clips to existing authoritative phases. Check feet, hand/weapon sockets and blends. Preserve root position, movement constants, damage and timing. No character-animation changes in this audit.
