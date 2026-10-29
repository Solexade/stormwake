# Harbour refurbishment — 27 October 2026

Local preview: http://127.0.0.1:5252/ . No deployment or merge.

Changes beyond SUNKEN_ISLES_VISUAL_PASS.md:
- Added scene/harbour-refurbish.js: open gable infill, plank doors with iron straps, structural framing and roof variation; bounded coastal planting using instanced bent leaf geometry; a submerged coastal shelf outside existing walkable land.
- environment.js integrates these elements, changes only harbour water colour/depth response and synchronizes cottage material clones after photographic maps load. Guarded normalScale handling for basic window-light materials after browser testing caught an exception.
- harbour-terrain.js exposes loaded sand maps to the coastal shelf.
- scene3d.js hides extra planting in Performance mode.
- server.js serves the new module.
- sunken-isles.test.js adds deterministic planting and coastal-shelf geometry checks.
No external assets or runtime dependencies added in this pass. New geometric details are original procedural art; they are not scanned architecture or a claim of photorealism.

Verification: 108 automated tests pass (after restoring localhost network permission); build passes. Git diff whitespace check passes. Gameplay/world/movement/app/cloud modules remain untouched. Browser movement, attack, orbit and Performance toggle exercised; nearby shop opened and paused expedition correctly. Nine harbour model placements loaded, zero failures, terrain/materials ready. No new console errors on the corrected 5252 build; the same browser tab retained the earlier 5251 error in its history.

Screenshots: outputs/sunken-isles-review/visual-pass-after.png is the prior pass; refurbish-high.png is the current matching spawn view. Both game canvases 1280x658, High, DPR1.5. Updated buildings and vegetation are visible, though this remains substantially below the reference fidelity.

Performance: same available Windows desktop / in-app browser. Current High sample 34 FPS, frame p95 37.3ms, CPU p95 29.3ms, 614 draw calls, 794460 triangles, 287 visible meshes, 2156 instances. Prior pass sample 44 FPS / 602 calls / 766484 triangles. Timing is noisy and not a controlled benchmark; added geometry has a cost. Performance-mode sample after movement/orbit: 50 FPS, p95 24.5ms, CPU19.3ms, 203 calls, 240873 triangles, 199 meshes, 402 instances; this is not a matched viewpoint comparison. Longest model load4780ms. Physical mobile not tested.

Remaining: houses still use custom primitive-based construction, distant vegetation remains angular, the shelf has faceted edges and sea still lacks scene reflections/refraction. No full expedition/extraction retest this pass. Do not present as reference-level realism. Next substantial art improvement requires a carefully fitted authored longhouse/vegetation kit, with mobile profiling before greater density. Existing controls, saves and mission contracts have not been edited.

## Completion follow-up
Camera visibility now uses cached world bounds to reject distant scenery before triangle raycasts, and reuses obstruction results while stationary (100ms maximum interval, immediate refresh for camera/hero movement or enable/visibility changes). Material fading still updates each frame. Added regression test for broad-phase rejection and refresh. No scenery or gameplay removed.

Final npm test: 109 passed, zero failures. Build and whitespace checks passed. Browser loaded nine placements with no console warnings/errors. A later sample at Raven's Hollow in a narrower viewport reached60FPS, p95frame17.9ms, CPUp957.4ms,442calls/549819triangles; this is NOT a matched harbour comparison and must not be reported as a proven 34-to-60FPS gain. Physical mobile and complete expedition remain unverified. Current preview http://127.0.0.1:5253/ . No merge or deployment.

## Daylight clarity pass — 28 October 2026
Changed palette.js (exposure1.08, ambient.85, sun1.8, lighter neutral ground illumination, fog.0085), cinematic.js (less cool/warm grading), style.css (reduce gameplay vignette). Existing geometry, combat changes, controls, saves and movement preserved. No new geometry/assets or rendering passes. This palette is shared across Solo environments, not a harbour-only light volume.
Build passed; all111 tests passed. Local HTTP preview responds200 at http://127.0.0.1:5255/ . No matched screenshot or visual inspection completed for this lighting pass; do not infer reference-level clarity from passing tests. Needs visual review for washed-out highlights and both presets. No deployment/merge.

## Coastal composition pass
Approved daylight unchanged. Added six placements of the existing optimized CC0 scanned boulder, with low-mode rock fallbacks. Every conservative placement radius is tested outside playable land. Added original procedural dock underside braces, rope wraps, mooring lines and timber fenders. Harbour shallows now use bounded transparency to expose the existing real shelf geometry; deep water remains opaque. No new downloaded assets, dependency or gameplay changes. Changed environment.js, harbour-refurbish.js and sunken-isles.test.js.

112 tests passed; build passed. This adds up to35,988 model triangles before shadow passes when all six rocks are visible in High. Low uses existing simpler geometry. No new measured FPS claim. Windows browser inspection was attempted, but Computer Use app approval timed out; the shallow-water transparency and composition remain visually unverified. Review locally at http://127.0.0.1:5256/ before accepting or deploying. No merge or deployment.
