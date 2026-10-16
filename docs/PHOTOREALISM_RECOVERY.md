# Photorealism recovery — harbour only

## Diagnosis and result

The previous harbour is still stylized. Photographic texture maps cannot disguise box cabins, repeated low-detail foliage cards, flat flags, simple docks, uniform coastline rocks and a low-poly character. The water is a shader approximation with no physically accurate shore interaction. Ground UVs repeat across large extruded surfaces; cliff silhouettes remain artificial. Golden roof trims and strong warm direct light amplified the toy-like appearance. Object scale and repeated compositions need authored assets, not additional bloom.

The incomplete-body defect had a separate, reproducible technical cause: SkeletonUtils clones have stale skin bind inverses until `updateMatrixWorld(true)` runs. Measuring them first gave an exaggerated bounding box, shrinking the animated body to approximately 8 cm while equipment remained full size. Character setup now updates skin transforms before measurement; a regression test animates cloned rigs at three actor scales and checks body height/grounding. Failed setup restores the fallback and all attachments. The existing knight is now complete, but it is still a low-poly knight, **not a realistic Viking**.

## Actual replacements

| Local model | Replacement | Cost |
|---|---|---|
| boulder_01.glb | Procedural obstacle rock at game (700,1520), inside its existing radius 52 | 66,122 triangles, 5,771,068 bytes |
| wooden_barrels_01.glb | Edda's decorative supply box at the same anchor | 11,184 triangles, 2,408,392 bytes |

Only those two objects are replaced. Longhouses, cottages, other cliffs, pines, docks, fishing equipment and the character model have **not** been replaced. Both new models have verified CC0 provenance in THIRD_PARTY.md and the source manifest. Original base colour, normal, roughness/metallic and AO maps are locally embedded. Boulder metallic factor is zero; barrel's authored metal mask distinguishes hoops from wood. No invented files or external runtime asset requests.

The barrel remains within the former box footprint and height. The boulder is uniformly fitted inside the existing circular obstacle. Loading failures retain existing visuals; Performance mode restores the light procedural props. High assets are currently downloaded at scene startup even on Performance: 8.18 MB added transfer. Future LOD/compression/lazy-loading work is required before wider placement. No new colliders, routes, interaction points, extraction rules or server logic.

Lighting now uses the palette consistently: neutral cool directional key at 1.1, restrained fill at .2, existing local HDR/environment, ACES/sRGB, reduced bloom .06. Soft PCF shadows are an approximation, not physically accurate area shadows. Warm interior accents remain. Scope is a recovery slice, not a claim of photorealism.

Local HTTP CSP now allows blob image/fetch resources needed for embedded GLB textures. Script, frame and object restrictions remain unchanged. The GLB loader rejects incomplete PBR materials rather than replacing fallbacks with untextured white props.

## Acquisition manifest / remaining art gates

| Priority | Asset requirement | Source/status | Integration acceptance |
|---|---|---|---|
| P0 | Anatomically proportioned Viking, leather/fur/cloth/steel; 20–40k tris; 2K PBR; in-place idle/walk/run/roll/attacks | No appropriately licensed realistic rig acquired. Existing Quaternius knight retained. Do not present it as photorealistic. | Verify commercial redistribution license per asset; record author/source/hash. Retarget Torso/PalmR/PalmL sockets, all existing animation names and timings; no root translation. Check every weapon, enemy scale, death, roll and fallback. |
| P1 | Timber longhouse and 2 cottage variants, weathered planks/thatch/turf; 15–35k tris; 2K tiling PBR | Not acquired; no exact model license verified. Search Fab/Sketchfab for downloadable CC0/CC-BY assets; do not use editorial/NC or extracted game content. | Fit the existing cottage dimensions and footprint, retain doorway/interactions and roof occlusion; test all paths. Record asset-specific license before import. |
| P1 | Realistic pine with branch cards, trunk normals and 3 LODs, target 5–12k tris/tree | https://polyhaven.com/a/pine_tree_01 — CC0 candidate, NOT installed. Source mesh payload approximately 949 MB; unsuitable for direct web use. | Offline reduction/baking needed; 1K alpha foliage, 2K bark, shadow budget. Preserve tree locations and clear route sightlines. No unverified claim of a ready LOD. |
| P2 | Modular scanned cliff meshes, 15–40k tris/segment; moss variation | Boulder source above installed for one rock only; not a full cliff kit. | Conform strictly outside walkable terrain; maintain shoreline elevations and bridge entrances. |
| P2 | Weathered dock timbers, mooring rope coils, nets, crates and fishing props, total <30k tris per cluster | Not acquired; asset-specific source and license still required. | Fit existing jetty footprint, boat/extraction anchors unchanged. Keep interactive chest separate from decorative crates. |

For every new asset: save original license evidence; download and checksum source; remove unused objects; author metric scale/pivot; retain PBR maps; create LODs; export self-contained GLB; add manifest hash and attribution; load via scene/assets.js; keep fallback until successful; exclude replacements from static batching; verify high/low, local/Vercel routes and camera occlusion. Never put model geometry into authoritative collision data as part of this visual pass.

## Verification

- `npm test`: 50 passed before final documentation; includes cloned skin bounds, conservative prop footprint, failed-load fallback, quality toggles and embedded PBR contract.
- `npm run build`: passed; checks all 13 assets and browser imports.
- Earlier isolated full playthrough failed at the boss on both untouched baseline and this branch; not disguised as a pass or fixed by gameplay changes.
- Browser evidence: complete bodies and textured scanned boulder visibly inspected. This is **not photorealistic yet**; missing character/building/vegetation assets remain the main blockers.
- Screenshot and final performance observations recorded below after final browser review. Desktop browser measurements do not establish real-phone performance or production database verification.

### Final browser observations (2026-10-16)

Codex Chromium desktop, 1280×720 viewport, local SQLite test profile; short stationary samples with 180-frame rolling statistics, not a controlled benchmark:

| Preset | FPS display | frame p95 | CPU p95 | draw calls | triangles |
|---|---:|---:|---:|---:|---:|
| High | 41 | 30.0 ms | 26.8 ms | 492 | 635,538 |
| Performance | 58 | 20.1 ms | 16.7 ms | 283 | 304,154 |

High is not a guaranteed 60 FPS. The repaired characters now have visible geometry and the camera/view differs from previous baseline sampling, so these numbers must not be represented as a like-for-like speedup. Mobile-sized 390×844 viewport shows the restored character; real mobile touch/GPU testing remains outstanding. No new console errors in the fresh verified tab. Two harbour assets loaded; PBR rock is visibly textured, barrel appears at Edda's supply stand. Performance mode restores the lightweight visuals. Movement/release, resume, camera rotation and quality switching were exercised in the local browser. All 50 tests and build passed after the CSP fix.

Local evidence folder (outside repository): `outputs/harbour-evidence/` with `recovery-before.png`, `recovery-after-high.png`, `recovery-performance.png`, `recovery-mobile.png`. Before/after are diagnostic views, not perfectly matched camera comparisons. The before shot shows floating cape/equipment; the after shows a complete body and scanned harbour rock. No production deployment, merge, real-phone test or production PostgreSQL test was performed.
