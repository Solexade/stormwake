# Harbour vertical slice — implementation and review

Baseline: `78b74508c6d3715a2ad096d0887c434ee5629d17`. Date: 2026-10-15.

## Plan recorded before implementation

Reuse the already-shipped Poly Haven CC0 ground/rock/timber PBR maps and HDR, and the credited Quaternius knight. No new external asset downloads, paid assets, runtime CDN or framework migration. Extract scene responsibilities first, then add a restrained harbour presentation layer. Risks: initialization order, visual/collision disagreement, warning contrast and mobile GPU cost. Preserve current coordinates, input, camera-relative motion, authoritative simulation and interactions.

## Architecture and visual differences

- `scene3d.js` now orchestrates rendering; `scene/environment.js` builds the world; `scene/actors.js` contains the extracted actor factory and animation calculations; `scene/lighting.js` creates the existing lighting/sky. Construction order, seeded environment, actor motion and camera formulas are retained.
- `scene/harbour.js` adds spatially limited material variation and darker damp low rock surfaces. Cottage foundations have stone-course detail and timber joints inside their existing foundation footprint. No paths, collision geometry, interactable coordinates or new obstacles were introduced.
- An instanced, low-opacity shoreline ribbon sits below the playable land surface. Samples that fall on overlapping islands are excluded. The effect follows the harbour island outline and is disabled in Performance mode; reduced motion freezes its phase.
- Existing PBR assets now share loaded textures between matching material variants, reducing duplicate loading/resources. Missing maps retain the procedural material fallback; a missing HDR retains the original generated environment. The replaced fallback environment target is disposed after HDR loading.
- `asset-manifest.js` inventories all eleven unchanged binary assets with URLs, licenses, sources, sizes and SHA-256 hashes. Unknown historical acquisition/conversion details are marked unknown. `scene/assets.js` caches GLB sources and clones independent skeletons; failures can retry. Character socket/idle validation happens before replacing its visible fallback.
- `scene/palette.js` documents the HDR/PBR → grade → ACES → sRGB pipeline. Exposure, fog and light settings retain the baseline; highlight bloom strength changes from .12 to .10. High uses the existing single pass; Performance bypasses bloom/grade while retaining ACES and lighting. No SSAO, extra shadow lights, higher-resolution textures or engine upgrade.
- Quality settings are centralized in `scene/quality.js`, retaining the familiar High/Performance toggle. Performance disables shadows, grass, shore and post-processing at pixel ratio 1; High keeps the existing 1.6 pixel-ratio cap.

This is an incremental realism pass. Buildings, cliffs, shore effects and fallback characters remain procedural geometry; the knight remains stylized. It is **not** a photorealistic asset replacement or a new Viking character release. Existing photographic maps are credited in THIRD_PARTY.md. Further geometry/character replacement belongs in subsequent focused PRs.

## Verification

| Check | Outcome |
| --- | --- |
| `npm test` (final run) | 46 passed, 0 failed; 2.08 seconds runner time |
| `npm run build` | Passed; now checks all manifest asset hashes and static browser imports in addition to existing checks |
| `git diff --check` | Passed with CRLF-aware whitespace configuration matching existing files |
| Protected runtime comparison to baseline | No changes to app input, motion, prediction, combat, world/collision, catalog, wallet, chain, cloud/API or Vercel config |
| Local Node server | New module routes return JavaScript; unknown scene routes remain 404; existing HTTP/session tests pass |
| Browser WebGL | Local 5196: materials ready, characters rigged, Three.js r180, no console error/warning reported in sampled final session |
| UI → API → data → UI | Started guest expedition through normal UI; server connected; mobile-sized tappable Hearthhall opens sanctuary with current inventory/stats |
| `npm run test:playthrough` | Failed: bot died at boss (`dead !== won`). Same assertion reproduced on untouched baseline. No combat/bot changes made to force a pass |

An intermediate HTTP test and baseline retry were blocked by localhost EACCES until network permission was restored. The final full test run above completed successfully. The full expedition bot failure remains an explicit release caveat, not a passed test.

## Rendering measurements

Windows Node 24.15.0, Codex in-app Chromium/WebGL2, local SQLite server. Desktop viewport 1280×720, game canvas 1280×658, follow camera at harbour spawn, assets loaded. These are short stationary samples during development, not controlled GPU benchmarks or real-phone certification. Frame p95 uses the last 180 intervals (roughly three seconds at 60 Hz); CPU p95 measures JavaScript draw-call submission, **not GPU execution time**. Both include development-machine scheduling noise.

| Scene | FPS snapshot | Draw calls | Triangles | Frame p95 | CPU submission p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline High | 60 | 399 | 404,400 | Not instrumented | Not instrumented |
| Updated High | 60 | 400 | 408,262 | 23.90 ms | 13.60 ms |
| Updated Performance | 60 | 196 | 236,666 | 17.10 ms | 11.30 ms |

Counters include scene/shadow/post passes: `cinematic.js` already disabled automatic counter reset and resets once per frame. This inspection corrects the earlier audit's concern about final-pass-only counts. New DOM data attributes on `#world`: `data-frame-p95-ms`, `data-cpu-p95-ms`, `data-frame-samples`, `data-graphics-quality`. Existing FPS/draw-call/triangle/network attributes remain. Preset switches reset sample history; suspended-tab gaps are excluded.

At 390×844 the touch layout and Hearthhall prompt were inspected and activated; this is viewport testing, not physical touch/GPU testing. Desktop High p95 does not meet a strict 16.7 ms target in this short sample. No sustained mobile/thermal, production PostgreSQL, wallet-device or full-combat rendering benchmark is claimed. Keep the PR draft until real-device review and the existing playthrough issue are assessed.

## Tests added and review notes

New tests cover cache deduplication/retry, shore placement outside land without coordinate mutation, quality fallback, bounded percentile statistics/suspended gaps, all asset hashes/imports, and static scene routes/MIME/404 behavior. Existing movement-release, wall collision, combo, extraction, save and identity tests remain unchanged.

Review checked extracted functions against their source, kept seeded random calls in order, retained character/camera equations, and restricted `server.js` changes to the static allowlist. Material callback cloning and instanced world coordinates were checked; shader compilation was exercised in-browser. No binary assets or dependency versions changed. No save migration or production deployment is required by this PR.

## Rollback and next review

Revert this graphics PR or restore the previous deployment; no database rollback is needed. Future work should begin with a licensed high-quality cottage/hero asset and real-device profiling, not more post-processing. Keep gameplay changes, bot repair and production hardening separate.
