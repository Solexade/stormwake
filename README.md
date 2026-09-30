# Stormwake: The Shattered Isles

An original browser adventure by **[@oxsolexade](https://x.com/oxsolexade)**. Version 0.5 is a playable **3D prototype**, with an original articulated Norse adventurer, textured environments, animated water, shadows and a perspective follow camera. The visual style is grounded, stylized fantasy; it is not photorealistic or a production release. No token has been created or connected to this game.

All game models, procedural textures, story and synthesized sound are included locally. Three.js r180 is bundled under its MIT license in `public/vendor/THREE-LICENSE.txt`; playing does not require a CDN or external asset downloads. The renderer requires WebGL 2. Use **Performance** mode if your device struggles with shadows, or **Tactical view** for a wider camera.

## Run

Requires Node.js 22.13+ with `node:sqlite` (tested with Node 24.15).

```sh
npm ci
npm start
```

Default URL: http://127.0.0.1:5180. On this workspace, the active preview uses **http://127.0.0.1:5190** because 5180 was already occupied.

PowerShell alternate port:

```powershell
$env:PORT='5190'
npm.cmd start
```

## Play

- Move: WASD/arrows. Aim: mouse. Light attack: J/left click. Heavy: K/right click. Tap J → J → K for the Stormbreaker finisher.
- Roll: Space. Sprint: Shift. Guard: F (time the start for a parry). Storm: Q. Heal: R. Target lock: T. Manage your stamina.
- Interact: E. Touch devices have a joystick and action buttons with nearby-enemy targeting.
- Follow the northern path out of the harbour. Defeat both shrine guardians and choose a relic at the central shrine. A cache in the northwest side area heals and grants salvage.
- Cross the eastern bridge to awaken the boss. Dodge its marked ground attacks. Once defeated, return to the harbour and press E to extract.
- Successful extraction saves score and salvage. Death or abandoning loses only that run's carried salvage. Relics last one expedition.
- Contribute 50 banked salvage at a time toward the shared 1,500-salvage beacon. Reaching the goal lights the beacon in the world.

## Implemented

- Original 3D world: coastal cliffs, harbour cottages, jetty, longboat, grove, bridges, shrine and temple.
- Articulated character with beard, braided hair, fur collar, leather armour, steel axe, round shield, walking and attack animation.
- Perspective aiming, visible arrows, attack telegraphs, damage numbers, floating objective marker and minimap.
- Follow and tactical cameras, physically based materials, environment lighting, dynamic shadows, ocean waves and a lower-cost graphics mode.
- Cottage collisions are enforced by the authoritative server.
- Three enemy types, attack telegraphs, health, dodge invulnerability, storm ability.
- Two relic choices with trade-offs and a two-phase boss.
- A complete start → explore → fight → recover → extract → contribute loop.
- Server-authoritative movement, damage, cooldowns, scores and extraction; the client submits input, never results.
- Cookie-based guest profiles, name editing, SQLite saved progress, shared beacon and top-ten leaderboard.
- Responsive UI, touch controls, minimap, narrative guide, sound toggle, fullscreen and field journal.

The original project's folder name stays `vibe-shattered-isles` to preserve local launch paths. The public game identity is **Stormwake: The Shattered Isles**.

## Local SQLite preview

`data/isles.sqlite` stores guests, completed expeditions and shared progress. It is excluded from version control. Cookie loss means loss of access to that guest profile; link a wallet at Hearthhall before losing the cookie to recover that profile on another browser. Active runs are in memory and end on server restart; completed results survive.

This server needs a **persistent Node process and persistent disk**. It is not suitable for deployment unchanged to Vercel Functions: the live game tick and local SQLite need a long-running server. Use one server instance behind HTTPS, with `HOST=0.0.0.0`, `NODE_ENV=production`, and `DATA_DIR` pointing at a backed-up persistent volume. Production cookies require HTTPS. Multi-instance scaling needs a shared database and a run-owner/coordinator design.

The local preview is only accessible on this machine. The Vercel cloud backend described below uses Postgres instead.

Before a public reward-bearing launch: add durable identity, abuse controls for guest creation, bot detection, operational monitoring and backups, load testing, and hosted deployment. Server-side game rules stop arbitrary score submissions but are not a complete anti-cheat system. Guest leaderboards are for playtesting and cannot establish unique humans.

## Not yet implemented

Real-time co-op, minted blockchain achievements, token rewards or conversion, and extra islands. No token or financial reward is promised.

## Tests

```sh
npm test
```

Tests cover traversable routes, attacks/cooldowns, relic restrictions, boss gating, extraction, healing, session persistence, origin checks and attempted client score tampering. Tests use a separate disposable database and do not seed the real leaderboard.

```sh
npm run test:playthrough
```

The full playtest starts an isolated server, plays through normal HTTP input, selects a relic, defeats the boss, extracts, checks that rewards are only recorded once, contributes salvage, and restarts the server to verify saved progress. It takes about a minute and requires port 5195 to be free. No playtest scores are written to the preview database.

A Dockerfile is included for a future persistent host. It has not been deployed or container-tested in this workspace. Mount a persistent volume at `/app/data` and terminate HTTPS in front of it.

## Hearthhall and progression

Enter Hearthhall in the harbour using E or its navigation button. It pauses your expedition, allows rest, and offers persistent gear upgrades and healing draughts for banked salvage. Your first victory unlocks a vitality perk.

Wallet login uses a single-use signed message verified by the server, not a transaction. Rabby/MetaMask-compatible injected EOA wallets are supported; contract-wallet signatures are not supported. Existing wallet profiles are restored separately; guest balances are not merged.

Optional Record arrival onchain sends a zero-value transaction to your own wallet with a unique memo on Robinhood Chain Testnet (46630). You approve it in your wallet and need test ETH for gas. The server verifies the chain, sender, recipient, memo and successful receipt. This is an arrival receipt, not a contract, NFT, onchain score or token reward. Gameplay remains server-side.

Faucet: https://faucet.testnet.chain.robinhood.com/ . Set PUBLIC_ORIGIN to your HTTPS origin in production.

## Flexible controls and weapons (0.4)

Connect wallet is directly available in the top navigation; sign in before leaving the harbour. Safehouse & shop opens rest, forging, armour, boots and potion purchases.

Movement now faces travel direction unless attacking, guarding or locking a target. Rotate the camera with its arrow buttons; movement stays relative to the camera. Select axe, sword or spear from the weapon menu, or press 1/2/3. Switching waits until the current move finishes. Sword trades damage for speed and stamina efficiency; spear trades recovery time and sweep width for reach. Weapon forging adds permanent damage to all weapons.

Touch controls can be enabled on any device. Drag the left stick to move, reach the outer edge to sprint, and use the labelled buttons on the right to fight with assisted aim. Tap Attack twice then Heavy for a finisher; hold Guard to block. Blood FX toggles stylized hit particles.

## Vercel cloud release

Vercel uses api/index.js and the cloud/ Postgres backend, not the local SQLite server. Set DATABASE_URL (pooled Neon/Postgres URL) on Vercel. Tables use the stormwake_ prefix to keep this game isolated from other products. The schema initializes on the first API request.

Cloud profiles, sessions, wallets, gear, potions, active expedition snapshots, completed/abandoned runs, purchases, combat events, contributions and confirmed arrival receipts persist across function restarts. My records shows the latest 50 personal activity records. Raw wallet signatures and private keys are not stored. Guest cookies last seven days; wallet login restores the same profile across browsers. Disconnecting does not delete saved progress.

The server advances combat from elapsed wall-clock time on each input request, with bounded catch-up after connection loss. Browser requests never supply trusted scores or damage. PostgreSQL row locks serialize updates for a player, and extraction rewards are committed with the run state to prevent double credit. Database storage and function usage remain subject to the hosting account quotas.

The local npm start preview still uses SQLite and a continuous game loop. Local guest data is not automatically uploaded to cloud production.
