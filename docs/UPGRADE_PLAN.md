# Photorealistic Viking upgrade plan

Baseline and findings: [technical audit](TECHNICAL_AUDIT.md). Protected architecture and gameplay: [AGENTS.md](../AGENTS.md).

This is a proposed sequence, not an implementation or a promise of console-AAA quality. The goal is a coherent, grounded Viking adventure that remains responsive on phones and desktops. Keep the current story, islands, game loop, Node backends, Vercel/PostgreSQL, controls, wallet and saves.

## Art direction and replacement order

Cold maritime daylight, weathered stone and timber, warm hearths, restrained blue-green relic light. Believable adult anatomy, practical layered clothing, worn metal edges and rough leather rather than uniformly glossy surfaces. Preserve distinct raider, archer, brute and Warden silhouettes at gameplay distance. Use original designs; do not copy commercial characters or extract game assets.

| Priority | Current asset/system | Replacement scope | Acceptance |
| --- | --- | --- | --- |
| 1 | Shared stylized knight | One original Viking hero with rigged hands, face, beard/hair cards, cloth/leather/metal material separation | All weapons/sockets work, in-place gait, no root drift, silhouette readable in both cameras |
| 2 | Reused attack/held clips | Retargeted light 1/2, heavy, finisher, guard/parry, recoil and death; later archer draw/release | Contact matches existing server hit phase; guard/roll interruptions and repeated combos blend without gameplay timing changes |
| 3 | Tinted/scaled enemies | Raider first, archer second, brute then Warden; reuse a compatible skeleton where appropriate | Role recognizable without color alone; warning visibility and existing collider sizes preserved |
| 4 | Procedural weapon props | Axe, sword, spear, shield and bow with worn PBR materials | Same grip alignment, visual reach consistent with existing reach; no invisible collider changes |
| 5 | Cottages/bridge/chest/shrine | Modular timber/stone kit and landmark props, one area at a time | Existing navigable footprint and interaction anchors match; no decorative obstruction of routes |
| 6 | Repeated terrain/foliage | Retain existing photographic maps; add variation, lower-cost foliage LODs and sparse decals | No route concealment, excessive alpha overdraw, floating feet or new gameplay obstacles |
| 7 | Lighting/post effects | Tune existing light/material pipeline, then restrained bloom/grading/contact shadows | Warning contrast survives, Performance mode remains available, measured frame budget passes |

Photographic materials are already present; retain them until replacements show a demonstrable improvement. The hero is the first art milestone, not an all-islands rebuild.

## Free-resource and provenance policy

- Keep the existing credited assets as fallbacks. Poly Haven states its assets are CC0 and supplies textures, HDRIs and models; select specific assets with source records rather than importing an entire pack. [Poly Haven license](https://polyhaven.com/license).
- Use Blender for original sculpting, retopology, baking, skinning and glTF export; keep source/export settings reproducible. Its glTF documentation explains animation/export constraints. [Blender glTF manual](https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html).
- The existing Quaternius knight is credited as CC0 in this repository. Treat new packs individually: verify the exact download's license and included animations before using them. The public FAQ and newer license references should not be treated as blanket permission for every pack. [Quaternius FAQ](https://quaternius.com/faq.html).
- A free download is not automatically suitable, redistributable or photorealistic. No candidate hero has been approved/downloaded in this audit. If no suitable freely licensed rig exists, create/adapt an original hero rather than shipping a mismatched high-poly mesh.
- For each asset record: identifier, source URL, creator, license text/reference, acquisition date, source/export hashes, modifications, tool versions, triangles, bones, material slots, texture dimensions, animation names and compressed/download sizes. Retain attribution even where optional for traceability. Keep editable sources outside the web payload, with documented reproducible access.

## Asset integration contract

1. Author to a documented coordinate convention: glTF Y-up, feet on ground, predictable forward axis; renderer currently converts simulation x/y to x/z at 1/40 scale. Normalize the hero around its current 1.95-unit rendered height. Preserve existing role scales/collision independently of visuals.
2. Define semantic sockets (right hand, left hand, torso/cape) through an adapter; do not require every source skeleton to use `PalmR`, `PalmL`, `Torso`. Validate skeleton and required clips before hiding the old model.
3. Export in-place root translation. Mesh-only secondary motion is allowed; no animation may move the simulation/prediction root. Test idle after stick release, reversal, collision and delayed snapshots with every new rig.
4. Define clip aliases for idle, walk/run/sprint, roll, light1/light2/heavy/finisher, guard/parry, hit reaction, death and archer release. Record authored contact markers. Map them to `weaponAttack()` and authoritative action time; damage continues to resolve only in `combat.js`.
5. Use separate physical material regions. Base color in sRGB; normal/roughness/metalness as data. Bake detail into maps and use consistent texel density. Avoid adding translucency/fur simulation until budget permits.
6. Start with self-contained GLB supported by the current loader. Evaluate KTX2/mesh compression only in its own loader/decoder/serving PR, with pinned local decoder assets and an uncompressed fallback. Current local server does not serve those additional formats.
7. Validate clipping, tangents, skin weights, bounds, weapon sockets and all clips before promotion. Load failures or unsupported GPU features must retain a complete playable fallback.

## Proposed budgets and measurement gates

These are initial caps to validate, not current measured performance or universal device guarantees. Establish baseline first; lower them if the reference phone cannot sustain play.

| Budget | Mobile / Performance target | Desktop / High target |
| --- | --- | --- |
| Frame time | p95 <=33 ms during a 5-minute combat route | p95 <=16.7 ms on declared reference hardware |
| Input response | No regression versus baseline first-frame local response and release tests | Same |
| Hero mesh | <=15k triangles, <=4 material slots | <=35k triangles, <=4 material slots |
| Enemy per visible actor | <=8k triangles; distant LOD ~2k | <=20k near, lower distant LOD |
| Skeleton | Aim <=70 deform bones per actor | Same skeleton where feasible |
| Texture dimensions | 1K default; 2K only where measured necessary | 2K hero, 1K props; no default 4K packs |
| New hero payload | <=4 MiB including textures/animations | <=8 MiB, loaded as an optional quality upgrade |
| Total initial visual payload | Aim <=10 MiB; defer nonessential art | Aim <=15 MiB; defer distant art |
| Post processing | Bypass remains supported | Start with current lightweight pass; add effects only with headroom |

Measure total frame work/draw calls (including shadow and post passes), JS/render time, memory trend, asset bytes, cold-load time, long tasks and network p50/p95. The current asset set alone is approximately 8.57 MiB; new assets must replace/defer existing payload rather than silently accumulating it. No fixed draw-call limit is asserted until the baseline is measured. Check thermal slowdown and memory stability over a longer 15-minute session before release.

Reference matrix: a named midrange Android/Chrome phone, iPhone/Safari, integrated-GPU laptop and desktop. Include narrow portrait and short landscape, High/Performance, reduced motion, missing asset, 100/250 ms simulated latency, brief disconnect and background/resume. Emulation supplements but does not replace real touch/GPU testing.

## Sequence of small pull requests

Each row is an independently reviewable PR with one purpose. The present task only produces PR 0's documentation. No future PR is opened or implemented by this plan. Use a preview deployment and isolated test data for runtime PRs; release one at a time. Prefer reverting a visual module/asset selection over touching saves.

| PR | Change and dependency | Verification / completion gate | Rollback |
| --- | --- | --- | --- |
| 0 | Architecture guardrails, technical audit and this plan | Docs-only diff; npm test/build results recorded | Revert docs only |
| 1 | CI plus stronger build/import/asset checks; no application behavior change | 41 baseline tests; intentionally missing module/map is detected; browser boots local assets | Revert checks; runtime untouched |
| 2 | Disposable real PostgreSQL and API-handler contract test harness; after 1 | Concurrent extraction credited once; purchases cannot overspend; recovery/link/logout preserve data; rollback verified | Remove harness; never touch production DB |
| 3 | Narrow request-error handling fix; after 2 | Malformed JSON/Origin gives controlled 4xx JSON; valid wallet/guest routes unchanged | Revert handler change |
| 4 | Guest-creation abuse protection; after 2 | Cookie churn bounded; normal guest, wallet and recovery flow still work; thresholds configurable | Disable/revert protection while retaining existing sessions |
| 5 | Baseline visual/input capture and full-frame performance metrics; after 1 | Recorded desktop/mobile route, idle-release/latency/wall regressions, HUD screenshots; no control retuning | Revert harness/metrics |
| 6 | Asset manifest, corrected credits and reproducible export/validation tooling | Old GLB validates; missing clips/sockets rejected; license/hash inventory complete | Retain current assets; revert tooling |
| 7 | Character adapter and atomic load-failure fallback; after 5/6 | Current knight looks/plays the same; missing/invalid GLB restores full rig/weapons | Select old adapter/fallback |
| 8 | Server-phase-driven presentation and animation blends; after 7 | Delayed snapshots, repeated combos, roll/guard/death interruption; simulation outputs and movement constants unchanged | Restore old presentation module |
| 9 | One Viking hero replacement; after 8 | Side-by-side actual-camera approval, all three weapons, no idle/root drift, budgets and devices pass | Select existing knight; no data migration |
| 10 | Raider model only; after 9 | Recognizable silhouette, unchanged hitbox/AI/damage, warnings readable | Restore raider asset |
| 11 | Archer model/draw-release clips only; after 10 | Aim line and arrow release align with existing server wind-up; no AI changes | Restore archer asset |
| 12 | Brute replacement only; after 10 | Existing role scale, warning and hit timing preserved | Restore brute asset |
| 13 | Warden replacement only; after 11/12 | Both existing phases, slam radius/markers readable, no encounter rebalance | Restore boss asset |
| 14 | Weapon mesh/material set only; after hero/enemy adapters | Grip/reach consistency, no invisible weapons or altered stats | Restore weapon meshes |
| 15 | One harbour prop kit; after 5/6 | Cottage footprint, shop/chest prompts and camera occlusion unchanged | Restore procedural props |
| 16 | Texture sharing/LOD and disposal improvements; after measured need | Lower memory/frame cost; no missing parts/quality flicker; repeated sessions stable | Restore resource path |
| 17 | Restrained lighting/bloom/grading tune; after 16 | Before/after same camera/exposure; warnings remain legible; mobile budgets pass | Restore previous lighting/pass |
| 18 | Targeted HUD overlap/accessibility fixes from captured evidence | Portrait/landscape multi-touch, chest+combo+boss state, readable labels and focus | Restore layout changes |

Split any row further if it needs unrelated backend/asset changes. Save migrations, retention policy, wallet provider-event handling and local/cloud behavior reconciliation remain separately scoped maintenance PRs from the audit; do not bundle them into art replacements. Likewise, a combat rebalance, new enemies, quests, multiplayer, token rewards or transport rewrite is outside this upgrade.

## Release checklist for future visual PRs

- npm test and npm run build pass; strengthened checks from PR 1 pass.
- Protected simulation/movement files have no incidental edits; baseline input traces produce the same authoritative outcomes.
- Test an existing saved profile and active expedition on disposable PostgreSQL. Verify guest recovery, optional wallet restore/disconnect, purchases, extraction and contribution without resetting/merging data.
- Complete the normal explore/relic/boss/extract loop; verify desktop and touch prompts, weapon selection and Combo. For rendering-only PRs, no wallet transaction is required.
- Attach comparison images/video and device/frame-time results. Check asset-failure fallback, Performance/reduced-motion/audio/blood options and long-session stability.
- Keep a previous production deployment/asset selection available for rollback. Promote only the tested version; a passing local build alone is not release approval evidence.
