# Stormwake technical audit

Date: 2026-10-15. Repository: https://github.com/Solexade/stormwake
Baseline: `78b74508c6d3715a2ad096d0887c434ee5629d17` (main at inspection).

## Scope and results

Inventoried all **67 tracked files**: all first-party runtime modules, HTML/CSS/icon, both backends, configuration/launch/build scripts, eight test files, documentation, eleven binary assets and seven vendor code/license files plus placeholders. Reviewed first-party source and tests; inspected GLB metadata and asset sizes; checked vendor imports/license and dependency lockfile. This is not a line-by-line security audit of bundled Three.js or its transitive dependencies. No runtime, gameplay, asset, database or deployment changes were made.

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Exit 0; 89 packages installed; npm reported 0 vulnerabilities at installation time |
| `npm test` | Exit 0; **41 passed, 0 failed, 0 skipped**; runner duration 1.66 seconds |
| `npm run build` | Exit 0; selected-file existence check passed |
| Runtime | Windows, Node v24.15.0 |
| Real PostgreSQL / production / mobile graphics | Not exercised in this audit |
| `npm run test:playthrough` | Not run in this documentation-only pass |

Passing tests establish the covered behaviors, not production capacity, absence of vulnerabilities, visual quality or real-device performance. No production credentials/data were accessed. See root AGENTS.md for the architecture and protected invariants.

## What is already worth preserving

The authoritative simulation is shared across Node/SQLite and Vercel/PostgreSQL. Input validation ignores forged outcome fields, command IDs suppress repeated attacks, cloud updates lock profiles and commit rewards with state. The test suite protects rapid response, diagonal normalization, collision sliding and the no-drag release correction. Guest recovery and optional EOA wallet identity have explicit profile separation and revocation behavior. Three.js is already in place; an engine/framework rewrite is unnecessary.

## Prioritized findings

P1 = address before broad public expansion or high-detail asset rollout. P2 = measured improvement in the next upgrade stages. P3 = optional later refinement. No confirmed P0 outage or exploit was established. Source anchors refer to the baseline; risks marked unverified need reproduction.

### P1-1: Capture production API and PostgreSQL behavior in tests

Evidence: `tests/cloud.test.js` uses pg-mem and calls service functions directly; `api/index.js:11-15` owns the actual transaction, row locking, rate handling and commit. Existing tests do not prove real concurrent extraction/purchase/login behavior, rollback or PostgreSQL lock contention. Profile restore/login can lock the current row and then a second row (`cloud/game-service.js:42,60`); opposite concurrent switches present a potential lock-order/deadlock risk, not a reproduced failure.

Next: add handler contract tests and an isolated real PostgreSQL suite with concurrent same-profile requests, repeated extraction, insufficient funds, first wallet linking and cross-profile restores. Assert exactly-once credit and intact old saves. Do not remove locks or switch databases. Add bounded retry/lock-order changes only after tests reproduce a problem.

### P1-2: Guest creation bypasses the current per-profile traffic limit

Evidence: `api/index.js:12-14` opens/creates a session before checking its profile rate. `cloud/game-service.js:71` creates profiles for missing/invalid cookies. Discarding cookies creates new rate buckets; unknown API routes also reach session creation. This exposes database/function usage to unauthenticated churn; no live abuse or cost incident was measured.

Next: reject unsupported routes/method combinations before creating records; add bounded guest-creation protection without blocking normal guest/recovery access. Define expiry/retention for disposable sessions and combat records separately from permanent progress. Do not delete existing saves as a cleanup shortcut.

### P1-3: File-existence build is a weak release gate

Evidence: `scripts/build.mjs` calls `access()` for selected files only, omitting some imported modules/maps. No tracked CI workflow. A successful build cannot detect missing runtime imports, invalid JavaScript, failed GLB rig contracts, shader failures or route/MIME mismatches.

Next: a small CI/check PR should run npm ci, tests, build, JS syntax/import/asset checks and a browser boot smoke test. Preserve local static allowlisting. New KTX2/WebP assets will otherwise fail the local jpg/hdr/glb route even if Vercel serves them.

### P1-4: New animation assets can desynchronize combat or fail partially

Evidence: `public/characters.js:12-24` assumes `Torso`, `PalmR`, `PalmL` and known clips, hides the fallback rig before all setup completes, and only changes a dataset flag on exceptions. `characters.js:38-39` scales clip duration but does not align attack clip playback to authoritative `actionTime`; state changes start a local animation. `combat-presentation.js` uses the same clip for both lights, and one jumping attack for heavy/finisher; guard/stagger/wind-up are held poses. Archer presentation also reuses melee animation.

Consequences: contact can appear later than server damage under latency; a substitute rig can lose sockets or leave a partial model without a usable fallback. Root translation in a new clip could visually revive the drag problem.

Next: define semantic clip/socket contracts and validate before swapping models; install atomically with rollback to the procedural rig. Align presentation to existing authoritative phase/contact time. Keep movement, hit windows, damage and input buffering untouched. Test interrupted/repeated attacks, delayed snapshots and asset failure.

### P2-1: Production request cost and latency need measurement

Evidence: `public/app.js` schedules input every 80 ms with one request in flight. Each cloud request locks a profile, advances simulation, writes its whole JSONB document and may insert event records (`api/index.js:11-15`, `cloud/game-service.js:10-25`). The nominal upper cadence is 12.5 requests/second/player, reduced by RTT; the per-profile cap is 150/10 seconds. Store pool max is four per process, not a global deployment connection cap.

Next: benchmark a disposable deployment/database for p50/p95 request latency, lock wait, payload size, rows written and function/DB use. Do not lower input frequency, add smoothing or replace transport blindly. Any later persistence optimization must keep response feel and transaction guarantees and be a separate PR.

### P2-2: Local/cloud behavior and public copy differ

Evidence: `cloud/game-service.js:49` pauses on `leave`; local `server.js` abandons; the browser confirmation says abandon/lose carried salvage. Cloud snapshots survive function restarts; local runs do not. Both have a 720-second simulated gameplay limit in `combat.js`, alongside a 45-minute wall-clock run limit. README mixes historical releases and presents the latter without that distinction. Cloud history returns 50 non-combat records, while local history covers a narrower set.

Next: write route parity tests and a behavior matrix first. Correct misleading copy against the chosen existing production contract without silently changing either backend. Any actual behavior reconciliation requires a separate decision; this audit does not choose new game rules.

### P2-3: Save schema and record retention are implicit

Evidence: `cloud/store.js` initializes tables with CREATE IF NOT EXISTS; full profile/run documents have no explicit format version. `combat.js` retains only 24 recent events; cloud records that ring after catch-up, so it cannot guarantee a complete replay log if more events occur before persistence. Expired sessions/combat records have no scheduled cleanup in this repo.

Next: inventory old-save shapes and establish fixtures and versioned, backward-compatible migrations before changing any state layout. Distinguish durable outcomes from optional telemetry. Do not advertise full replay recording. Review backups/retention with deployment configuration separately; their existence cannot be determined from this repository.

### P2-4: Error boundaries and wallet-provider changes need coverage

Evidence: `api/index.js:8` parses Origin outside try/catch; malformed Origin can escape JSON error handling. Invalid JSON inside the handler becomes a misleading storage-unavailable 503. `public/wallet.js` discovers injected providers but no `accountsChanged`/`chainChanged` handling exists in the application. The signed server session can remain associated with the old account after a provider switch; this is a UX consistency risk, not evidence of signature bypass.

Next: test malformed input/Origin, return controlled client errors and preserve cookie/origin protections. Add explicit provider/session status handling without silently signing, disconnecting or merging profiles. Arrival endpoints remain disabled.

### P2-5: Character/material fidelity is the main art limitation

Measured `knight.glb`: **1,022,896 bytes, 1,524 triangles, two meshes/materials, one skin, twelve animations, zero embedded images**. One stylized model is tinted/scaled for all roles. `characters.js:12` replaces every imported material with similar metallic settings, preventing a realistic skin/leather/steel distinction. Current weapons, props and cottages largely use procedural geometry.

Next: one original, anatomically credible Viking hero with correct PBR material regions; validate at the actual camera, then replace enemy silhouettes one at a time. More bloom cannot supply missing anatomy or material detail. See asset plan.

### P2-6: Establish mobile budgets before adding detail

Evidence: assets total about **8.57 MiB** on disk before vendor code; nine JPG maps, one HDR and one GLB. `realism.js` loads similar map sets separately for material variants. Characters disable frustum culling; their hidden fallback joints still get animation work. High mode uses 2048 shadows and a full-resolution half-float post-process target; Performance bypasses that pass and shadows but does not supply alternate character LODs/textures. Scene uses useful instancing/static batching already. Old PMREM resources and the cinematic target lack a complete world-disposal path.

Next: profile real phones, share textures safely (preserving per-material repeat), add bounded LOD/quality choices and explicit disposal. Avoid accidental repeated loading of model/texture variants. Keep the existing low-cost mode; target budgets in the plan are proposals, not measurements of current FPS.

### P2-7: HUD layering and diagnostics need a regression harness

Evidence: `style.css` has successive responsive overrides; `scene3d.js` draws warning labels and cooldown text at fixed canvas coordinates, independently of DOM HUD/touch layouts. This is an overlap risk, not a newly reproduced screenshot bug. `app.js` exports dataset FPS/network time/draw counts; with post-processing, `renderer.info` counters can reflect the final pass rather than total scene work unless accumulated deliberately.

Next: screenshot/interaction tests for portrait, landscape, short screens, safe areas and simultaneous boss/combo/chest UI. Measure complete frame work, not only the fullscreen pass. Keep controls in their familiar locations; no wholesale HUD redesign.

### P2-8: Asset provenance and build reproducibility are incomplete

Evidence: THIRD_PARTY.md both says no third-party character ships and later credits the Quaternius knight. Source conversion/retarget scripts are not tracked; vendor code is committed alongside npm Three.js. No machine-readable asset manifest or checksums. README also retains superseded character descriptions.

Next: reconcile credits and record per-asset provenance, transformations, export tooling/version and hashes. Verify vendor revision/import compatibility. Retain all required notices; do not assume a site's entire catalog has the same license as an older downloaded asset.

### P3: Additional atmosphere only after the above gates

Keep current fog, water, wind, HDR light and warm/cool direction. Consider restrained contact shadows, material decals, contextual audio and optional ambient occlusion only after measured headroom. Avoid stacking effects, hiding telegraphs, increasing input latency or claiming console-quality photorealism.

## Review boundaries

No live browser/phone playtest, Vercel configuration inspection, load test, backup validation or live wallet/RPC transaction was performed. These are explicit future acceptance gates. Runtime defects above are documented for focused PRs; none was repaired during this documentation task.
