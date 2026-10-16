# Working on Stormwake

## Scope and architecture

Stormwake: The Shattered Isles is a solo browser action-adventure. Preserve its existing product and infrastructure; improve it through small, reviewable changes. This file applies to the entire repository. The audit and proposed work are in `docs/TECHNICAL_AUDIT.md` and `docs/UPGRADE_PLAN.md`; proposals there are not authorization to implement them.

- Native browser ES modules, HTML and CSS; no React, bundler or client framework. `public/app.js` owns input, polling, menus, identity and the render loop. `public/adventure.js` owns Hearthhall/shop UI.
- `public/scene3d.js` renders with locally vendored Three.js r180/WebGL 2. `characters.js` loads/clones the skinned GLB; `combat-presentation.js` maps authoritative states to poses/warnings; `realism.js` loads materials/HDR; `cinematic.js` provides optional post-processing; `audio.js` generates sound/music.
- `public/game.js` re-exports the shared simulation. `combat.js` owns combat, enemies, rewards and expedition rules; `world.js` owns map/collision; `motion.js` owns locomotion; `catalog.js` owns weapons, shop and loadout stats. These modules run on the server too: keep them DOM-free.
- `movement-preview.js` predicts presentation locally. It is not a second authority for damage, inventory, position acceptance or scores.
- Local: `server.js`, Node HTTP and `node:sqlite`, persistent `data/isles.sqlite`, in-memory active runs and a 30 Hz simulation loop. Docker is an alternative persistent-process host, not the Vercel runtime.
- Production: `vercel.json` serves `public/` and rewrites `/api/*` to `api/index.js`. That Node function uses `cloud/game-service.js` and `cloud/store.js`, PostgreSQL transactions, profile row locks, and persisted JSONB run snapshots. Simulation advances on requests with bounded catch-up. Keep this architecture.
- PostgreSQL tables: `stormwake_profiles`, `stormwake_sessions`, `stormwake_records`, `stormwake_world`. `DATABASE_URL` (or existing `POSTGRES_URL` fallback) is server-only; `PUBLIC_ORIGIN` binds wallet challenges. Never expose connection strings or copy production data into fixtures.
- `chain.js` verifies optional EOA wallet sign-in; `public/wallet.js` discovers injected wallets. Robinhood Chain Testnet is chain **46630 / 0xb626**. Arrival transaction endpoints currently return 410; leave them disabled.

## Non-negotiable gameplay and data rules

1. **Preserve the accepted movement and controls.** Do not retune movement as part of art/animation work. Baseline `MOTION`: jog 310, sprint 440, raven 350, acceleration 55, braking 85, reversal 75, turn 26. Preserve the joystick deadzone/response curve, camera-relative directions, immediate local prediction, released-stick no-drag behavior, stale-input stop and swept wall collisions. Do not add a smoothing layer to the displayed player position.
2. Server authority remains mandatory: accept input intents only. Never trust client HP, damage, combo charge, currency, equipment costs, scores, extraction or outcomes. Visual animation events must never award damage/rewards. Keep command-ID replay protection and transactionally once-only extraction credit.
3. Root-motion animation must not translate the authoritative player or predicted root. Mesh gait, lean, sockets and clips are presentation. Retarget in-place animations to the existing attack phases; do not change attack timings to fit new clips.
4. Preserve all desktop controls: WASD/arrows; J/left click light; K/right click heavy; C charged combo; Space roll; Shift sprint; F guard/parry; Q storm; R heal; E interact; T target lock; 1/2/3 weapon; Escape pause. Preserve camera, weapon, sound, graphics and touch toggles.
5. Preserve mobile joystick and labelled action buttons, assisted aiming and outer-edge sprint. Nearby chest/shrine/shop/extraction actions must remain tappable. Three landed melee strikes charge the Combo button; retain the keyboard chain. Never introduce keyboard-only progression.
6. Preserve harbour safety, safehouse/rest/shop, relic choices, boss gating, extraction, weapon trade-offs, gear/potions and the shared beacon. No redesign of map, enemy behavior, progression or economy without a separately requested gameplay change.
7. Preserve profile IDs, banked salvage, wins/best score, gear, potions, contributions, records and active cloud saves. No resets, destructive migrations or silent profile merges. Cloud and local saves are separate. Local active runs are not durable across restarts.
8. Guest play and private recovery keys remain usable without a wallet. Keep explicit wallet connect/manage/disconnect, single-use domain/chain-bound signature verification, first-link guest-key revocation, and separate existing-wallet saves. Never add signing, approval or transaction prompts to ordinary gameplay. No promises of token conversion/rewards.
9. Preserve pause and background-input safety, reduced-motion, sound/music controls, blood toggle and Performance graphics mode. Effects must not obscure enemy warnings or interactive buttons.

## Development conventions

- Use ESM with explicit relative `.js` imports. Keep simulation, transport/persistence and rendering separated; do not migrate the engine, backend, database or framework for visual work.
- Read callers, both backends and relevant tests before editing shared modules. Document existing local/cloud differences rather than silently choosing one behavior.
- Keep diffs focused. Existing files are densely formatted; use readable formatting for new code without reformatting unrelated files. Do not edit generated/vendor code casually. Preserve pinned engine/addon compatibility and MIT notices.
- Keep assets local and licensed. Record source, author, exact license, acquisition date, checksum, conversion settings, rig/socket contract and budgets for each replacement. Do not ship extracted commercial-game assets. Keep a functioning fallback until a replacement is verified.
- New public modules/assets must work through BOTH Vercel static serving and the local server allowlist/MIME mapping. Current local asset routing accepts only lowercase/underscore/digit filenames ending in jpg, hdr or glb; new formats require an explicit serving change and test.
- Preserve existing database schemas and API contracts. Any future save-format change needs versioned migration, old-save fixtures, backup/rollback planning and real PostgreSQL verification. Never test purchases/rewards against production profiles.
- Do not commit `.env`, database files, cookies, signatures, recovery keys, credentials, node_modules or unrelated outputs. Commit dependency/lockfile changes together only when needed.
- Present evidence separately from assumptions. A build pass is not browser/mobile/database validation. Do not claim production deployment or device support without testing it.

## Commands and verification

Requires Node **22.13+** (`node:sqlite`); audit verified Node **24.15.0**. Use `npm.cmd` on PowerShell if its execution policy blocks `npm.ps1`.

```sh
npm ci
npm test
npm run build
npm start
# Optional full isolated HTTP expedition:
npm run test:playthrough
```

`npm start` defaults to localhost:5180; `Start Game.cmd` uses 5190. `PORT`, `HOST` and `DATA_DIR` configure the local server. Use an isolated DATA_DIR for manual testing. Unit/HTTP tests create disposable databases; HTTP test uses 5194 and playthrough uses 5195. Do not start duplicate servers on those ports.

- `npm test`: Node test runner covering simulation, movement/prediction, presentation mappings, audio, SQLite HTTP sessions, wallet signatures and cloud service behavior. Cloud tests use **pg-mem**, not a real PostgreSQL instance or the complete Vercel handler.
- `npm run build`: checks required modules, resolves browser imports and verifies asset sizes/hashes. It does not render graphics or exercise PostgreSQL.
- Changes to combat, persistence or identity need appropriate regression tests and the isolated playthrough; cloud transaction changes additionally need disposable real PostgreSQL integration tests.
- Rendering/input changes need desktop and real touch-device checks: move/reverse/release, delayed replies, wall contact, multitouch attacks, chest interaction, combo, pause/resume, save/restore and optional wallet. Test portrait/landscape and High/Performance modes. Record device, resolution, FPS/frame time, network latency and asset loading errors. Do not weaken existing motion assertions to accommodate visual changes.

## Visual direction

Aim for a grounded, photorealistic Viking fantasy at the actual gameplay camera: believable anatomy, worn steel, rough timber, leather/fur, cold coastal daylight and warm hearths. Keep Stormwake's original story, islands, routes, UI identity and readable combat silhouettes. Photorealism is a staged art target, not the current state or a promise of console-AAA fidelity.

Prioritize a coherent hero, contact timing, material response and legible warnings before increasing particles or post-processing. Preserve the current camera-relative control semantics. Use in-place rigs, bounded texture/mesh sizes, LODs and optional effects; mobile responsiveness outranks visual density. Bloom should enhance emissive accents, not wash out the HUD. Retain low-cost rendering and asset-load fallbacks. Proposed budgets and PR acceptance gates are in `docs/UPGRADE_PLAN.md`.

## Arcade / Oathring milestone

The user authorized a separate 2.5D fighting mode and private multiplayer rooms. Keep the Solo rules above unchanged; Arcade rules live in `public/arcade/` and do not import Solo combat/motion/world.
- `config.js` owns frame data; `engine.js` advances exactly one 60 Hz step. Input is intent-only, sequence checked; server wall-clock drives simulation.
- `arcade/service.js` owns room authorization, lifecycle and SQLite/Postgres adapters. `api/index.js` routes Arcade before Solo dispatch, so Arcade polling does not advance Solo runs. Preserve profile-row then room-row lock ordering; never lock the other participant's profile inside a room transaction.
- Local room requests are serialized on the shared SQLite connection. Cloud requests use the existing transaction and `FOR UPDATE` room lock.
- Additive `arcade_rooms` (SQLite) / `stormwake_arcade_rooms` (Postgres) hold match snapshots and outcomes. No Solo currency, rewards, wallet operations or profile merges occur in Arcade.
- `arcade.html` is a separate entry with its own renderer/input loop. Homepage navigation explicitly pauses Solo before entering. Controls: A/D, W, S, J/K, L, U plus pointer-captured touch buttons.
- Rooms require distinct guest sessions; two tabs sharing a cookie are the same player. 20-second disconnect grace, one-hour room expiry, five new matches per minute per profile. Existing-session rate limits also apply.
- First to two round wins; 60 seconds per round; equal-health/double-KO rounds replay; three total drawn rounds end in a match draw. Do not silently change those rules.
- No client-submitted outcome endpoint. Keep stored results authoritative and separate from any future progression economy.
- Before production: test real PostgreSQL concurrency, mobile hardware and internet latency/cost. pg-mem tests do not establish those properties. Snapshot transport is not rollback netcode.
