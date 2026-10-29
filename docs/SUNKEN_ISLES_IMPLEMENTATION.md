# Sunken Isles — first implementation report

2026-10-26. Local preview: http://127.0.0.1:5247/ . Branch prototype/machine-invasion, based on bdbfcbcccd9cff0b35c5cf47f923af0cef99549a. No deployment, push, merge or commit performed. The pre-existing untracked SUNKEN_ISLES_BASELINE.md is preserved.

## Implemented

- Harbour loads now deduplicate in-flight work, retain fallbacks on synchronous/asynchronous failure, clear pending state, and retry explicitly through retry() or switching back to High. Successful models publish once. Loading metrics expose pending, failed, loaded and longest attempt duration.
- Imported four instances of an optimized scanned CC0 coastal cliff below the walking plane. Existing shoreline geometry remains underneath as the failure/Performance fallback. No collision shapes or traversable elevation added.
- Replaced the harbour obstacle's scanned boulder with a 5,998-triangle derivative (90.9% fewer triangles than the original 66,122). Original verified asset remains in the repository for provenance; the environment now requests the reduced version.
- Replaced one foreground procedural spruce with a 15,846-triangle coastal tree, with 512px embedded PBR maps. Performance/failure restores the old spruce. Other trees remain unchanged.
- Added layered roof shingles and ridge detail to the three existing cottages within their existing foundation placements. These are still procedural buildings, not newly acquired photorealistic houses.
- Added a 128x128 harbour coastline-distance texture. Water now attenuates waves near shore, blends shallow-water colour and subtle procedural caustic/foam cues, and ground gains a sandy margin. This is a visual approximation, not actual refraction, fluid simulation or a traversable seabed.
- Added material-isolated ray-based fading for imported scenery and the foreground fallback tree. Existing building fading remains. Fitting now supports simultaneous height/radius limits, offset and rotation and rejects invalid bounds. No shared source material is faded.
- Added diagnostic visible mesh/instance counts and pixel ratio. Counts are frustum-visible scene submissions, not exact per-instance occlusion measurements.

## Files changed

- public/asset-manifest.js — three asset records and checksums.
- public/scene/harbour.js — retry lifecycle, load diagnostics and constrained fitting.
- public/scene/environment.js — harbour replacements, cottage/foreground fallback detail and coastal materials/water.
- public/scene3d.js — scenery visibility and diagnostic metrics.
- server.js — allowlist for the new static scene module only; API/backend behavior unchanged.
- tests/harbour.test.js — verified asset inventory now 21.

## Files added

- public/scene/sunken-isles.js — coast field, cliff placements, visibility controller.
- tests/sunken-isles.test.js — six regression tests.
- public/assets/boulder_01_lod.glb
- public/assets/coastal_cliff_02_lod.glb
- public/assets/island_tree_01_lod.glb
- docs/asset-provenance/coastal_cliff_02.json
- docs/asset-provenance/island_tree_01.json
- docs/SUNKEN_ISLES_IMPLEMENTATION.md — this report.

The earlier docs/SUNKEN_ISLES_BASELINE.md remains untracked and unchanged by this implementation.

## Assets and processing

| Local asset | Triangles | Bytes | Author and source | Licence |
|---|---:|---:|---|---|
| boulder_01_lod.glb | 5998 | 3059040 | Rico Cilliers; https://polyhaven.com/a/boulder_01 | CC0-1.0 |
| coastal_cliff_02_lod.glb | 22000 | 3046384 | Rob Tuytel; https://polyhaven.com/a/coastal_cliff_02 | CC0-1.0 |
| island_tree_01_lod.glb | 15846 | 2097652 | Rob Tuytel / Rico Cilliers; https://polyhaven.com/a/island_tree_01 | CC0-1.0 |

Poly Haven licence: https://polyhaven.com/license . Cliff/tree downloads were verified against API MD5 records stored in docs/asset-provenance. Boulder derives from the already verified local CC0 source. Manifest records output SHA-256 and byte lengths; the build verifies them.

Offline processing: meshoptimizer 1.3.0, attribute-aware simplification with Permissive; tree additionally Prune; compact unused vertices, retain position/normal/UV streams. Cliff/boulder keep source 1K JPEG textures. Tree maps resized to 512px with Pillow Lanczos and JPEG quality90, no chroma subsampling. ARM red supplies AO. Tree source leaf material used BLEND but JPEGs contain no alpha; exported geometry uses opaque leaf surfaces. No runtime decoder or game dependency added. Preparation scripts/source downloads are in workspace work/sunken-assets outside Git.

Source cliff export was 943284 triangles; geometry buffer 26773008 bytes. Original tree geometry buffer was 60709812 bytes. Source meshes were not shipped unchanged. Detailed tree canopy quality still needs artist review; reduction is a compromise.

## Verification

- Final npm test: **106 passed, 0 failed** after allowing disposable localhost HTTP tests. An earlier rerun was blocked by localhost EACCES; that infrastructure failure was resolved and the complete suite rerun.
- Final npm run build: **passed**; 21 asset records/imports verified.
- New tests cover transient and synchronous failure recovery, pending deduplication, no duplicate publication, quality changes during loading, fitting bounds/offset, material-isolated camera fade/restoration, coastal invariants and GLB triangle/PBR budgets.
- Browser: local isolated SunkenReview profile; loaded all seven harbour placements, no pending/failed assets, materials ready; no captured console warnings/errors. Checked movement, attack (Crosscut visible), camera rotation and High -> Performance -> High switching. Reload retained the username/profile.
- Existing full HTTP expedition: reached shrine/relic, healing cache and boss, then **failed** (player dead, expected won; boss last logged at 86 HP). Extraction completion is therefore NOT claimed. No combat retuning was made to force a pass. Baseline audit already recorded a historical boss-playthrough failure, but this report does not claim a new matched baseline expedition was rerun.
- Diff review: no changes to movement, world/collision, combat, catalogue, character animation, app controls, saves, cloud handlers or API contracts. Only static module serving changed in server.js.

## Screenshots and performance

Evidence outside checkout: ../sunken-isles-review/ .

- before-matched-high.png: unchanged bdbfcbc source snapshot, spawn/follow view.
- after-matched-high.png: upgraded source, same spawn/follow view.
- after-low.png: fallback preset at spawn.
- after-camera-route.png: rotated view after moving/attacking.
- before.png and after-narrow-high.png: 435x462 canvas checks; use the larger matched captures for the primary comparison.
- before-high-metrics.json, after-high-metrics.json, after-low-metrics.json; tests-final.log; playthrough.log.

Windows host, Codex in-app Chromium, local HTTP/isolated SQLite. Main comparison canvas 1280x658 CSS pixels; High rendering pixel ratio 1.5 in final capture (same browser/display setup; baseline DPR was not separately recorded). Stationary follow view, 180-frame rolling samples. Windows hardware queries were unavailable, so CPU/GPU model is unverified. Tabs and system load varied: these are observations, not a controlled benchmark or guaranteed speedup. Source snapshot served on 5248 used the same isolated API on 5247.

| Capture | FPS display | Frame p95 ms | CPU draw p95 ms | Draw calls | Submitted triangles |
|---|---:|---:|---:|---:|---:|
| Before High | 42 | 34.10 | 27.10 | 587 | 603970 |
| After High | 50 | 27.10 | 7.90 | 597 | 670212 |
| After Performance | 60 | 19.60 | 7.10 | 278 | 268774 |

After High: 280 frustum-visible meshes / 1848 instances (aggregate instances for visible batches); Performance 274 / 477. Longest local harbour load/fit attempt 1654 ms; seven placements, zero failures. This is NOT total page loading time or cold internet transfer. Before had no equivalent load/object instrumentation.

High costs +10 draw calls and approximately +11% submitted triangles versus this baseline view. Retaining the low mode is important. Both shadow and scene passes contribute to renderer totals. CPU draw time is not GPU timing. No physical-phone performance or touch-device validation performed.

## Remaining limitations

The inspected result has sandy shore edging, altered roof contours and one real coastal tree, with scanned cliff shelves most relevant from coastal angles. It is still not photorealistic. Most trees, distant scenery, buildings, terrain topology and character animation remain earlier placeholders. Water uses analytic reflections and shader depth cues, not actual underwater geometry/refraction. The default elevated camera and HUD obscure some shoreline detail; this phase did not redesign either.

Full extraction, physical mobile testing and production PostgreSQL remain unverified. Before expanding to another arena, review this local slice, improve canopy/roof art where needed, and diagnose the isolated boss playthrough separately. Next character work should retarget in-place sword/spear contact/recovery while preserving existing authoritative timing and root movement.
