# Stormwake: The Shattered Isles

An original browser adventure by **[@oxsolexade](https://x.com/oxsolexade)**. Version 0.5 is a playable **3D prototype**, with an original articulated Norse adventurer, textured environments, animated water, shadows and a perspective follow camera. The visual style is grounded, stylized fantasy; it is not photorealistic or a production release. Stormwake is a free arcade adventure: choose a username and play, with no email, password, wallet or payments.

Game models, story and synthesized sound are included locally. Photo-based environment textures and HDR lighting are CC0 assets from Poly Haven; see THIRD_PARTY.md. Three.js r180 is bundled under its MIT license in `public/vendor/THREE-LICENSE.txt`; playing does not require a CDN or external asset downloads. The renderer requires WebGL 2. Use **Performance** mode if your device struggles with shadows, or **Tactical view** for a wider camera.

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

`data/isles.sqlite` stores guests, completed expeditions and shared progress. It is excluded from version control. Use a private recovery key to recover a profile after cookie loss. Active runs are in memory and end on server restart; completed results survive.

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

## Username entry and free arcade play

Choose a username (3–18 letters, numbers, spaces, dashes or underscores) and select **Play free**. No email, password, wallet, blockchain network, or payment is required. Progress is tied to the server-issued HttpOnly browser session, not to the name alone. Returning browsers keep their profile. Usernames are display names, not unique account credentials; choosing another player's name never loads their save.

**Save & restore** creates a private recovery key for another browser or device. Anyone with the key can access that profile; store it privately. Keys last one year. Existing cookies and recovery keys continue to work, including profiles previously linked to wallets. Existing players confirm a username once after this update without losing inventory, scores or progress. Wallet sign-in and onchain endpoints return HTTP 410 and the browser no longer loads wallet-provider code. A player who has lost both their cookie and recovery key cannot restore a former wallet save by username.

## Flexible controls and weapons (0.4)

Choose a username before leaving the harbour. Safehouse & shop opens rest, forging, armour, boots and potion purchases.

Movement now faces travel direction unless attacking, guarding or locking a target. Rotate the camera with its arrow buttons; movement stays relative to the camera. Select axe, sword or spear from the weapon menu, or press 1/2/3. Switching waits until the current move finishes. Sword trades damage for speed and stamina efficiency; spear trades recovery time and sweep width for reach. Weapon forging adds permanent damage to all weapons.

Touch controls can be enabled on any device. Drag the left stick to move, reach the outer edge to sprint, and use the labelled buttons on the right to fight with assisted aim. Tap Attack twice then Heavy for a finisher; hold Guard to block. Blood FX toggles stylized hit particles.

## Vercel cloud release

Vercel uses api/index.js and the cloud/ Postgres backend, not the local SQLite server. Set DATABASE_URL (pooled Neon/Postgres URL) on Vercel. Tables use the stormwake_ prefix to keep this game isolated from other products. The schema initializes on the first API request.

Cloud profiles, sessions, gear, potions, active expedition snapshots, completed/abandoned runs, purchases, combat events, contributions persist across function restarts. My records shows the latest 50 personal activity records. Raw wallet signatures and private keys are not stored. Guest cookies last one year; private recovery keys restore the same profile across browsers.

The server advances combat from elapsed wall-clock time on each input request, with bounded catch-up after connection loss. Browser requests never supply trusted scores or damage. PostgreSQL row locks serialize updates for a player, and extraction rewards are committed with the run state to prevent double credit. Database storage and function usage remain subject to the hosting account quotas.

The local npm start preview still uses SQLite and a continuous game loop. Local guest data is not automatically uploaded to cloud production.

## Focused play update
Starting or resuming an expedition enters a viewport-sized play mode with no page scrolling or permanent story sidebar. Wallet, Tasks and Pause remain available at the top. Pause/Tasks freezes server combat and expedition time; closing resumes the run. Return to harbour is available in Pause. Reduced motion quiets water/boat motion, and sound, blood effects and graphics controls are available in Pause. Touch layouts adapt to portrait and landscape with safe-area spacing. Normal movement is 310 units/s and sprint is 440, with faster acceleration/braking, longer strides, turn lean and bounded collision-aware visual extrapolation.

This remains a stylized solo prototype. Additional islands, daily quests, motion-captured animations and real-device mobile performance validation are future work; no token rewards are promised.

## Free arcade release

All players enter with a username. Wallet sign-in and arrival transactions have been removed. Existing profile records are retained. Progress uses a server-side profile and an HttpOnly cookie with a one-year lifetime, renewed as players return. Save & restore creates a private, one-year recovery key for another browser. Production saves active expeditions in Postgres, with the existing 45-minute expedition limit. Local SQLite saves inventory and results; active local runs remain in memory. Nearby cache, shrine, shop and extraction prompts are tappable. Three successful melee strikes charge one Stormbreaker button; misses and storm damage do not charge it.

## October material and responsiveness update

Local photographic ground, rock and timber maps use normal and roughness detail with HDR reflections. Spruce foliage uses alpha-cutout needles; original character meshes remain stylized. Shared locomotion tuning now gives faster acceleration, braking and direction changes. The renderer displays local predicted movement without an extra position smoothing layer. Input changes during requests are queued; mobile joystick movement uses a radial deadzone and curved response. Server authority over collisions, stamina, damage and rewards remains unchanged.


### October 6: sound, rigged characters and movement
- Original synthesized adventure score, battle pulse, footsteps and layered combat/loot sounds; Sound controls all audio, Pause > Music controls the score separately.
- Audio unlocks on the expedition button gesture; background tabs suspend playback.
- Quaternius CC0 knight and helmet replace primitive character bodies, with blended idle/walk/run/roll/attack clips. This is stylized art, not photorealism. Existing models remain a load-failure fallback.
- Shared swept movement prevents large rolls/lunges crossing cottage walls, with tangential sliding at rotated walls and foundation-sized collision boxes.
- Faster acceleration, braking and reversal, retaining authoritative collision and rewards.


### October 8: combat presentation

- Separate light and heavy attack clips with alternating animation actions for combo blending; guard, wind-up, stagger and death presentation. Combat timing and movement constants are unchanged.
- Enemy warning countdowns, including an archer aim line, plus hit sparks independent of the blood toggle.
- Improved armour reflections, restored bone-attached capes and archer bows on the existing CC0 knight. These remain stylized assets, not photorealistic replacements.
- Single-pass highlight bloom and subtle cool-shadow/warm-highlight grading; low graphics mode bypasses the pass.
- Free asset route: Quaternius CC0 animation/character packs and Poly Haven CC0 materials/HDRIs. Higher-detail hero art still requires modelling, rigging, retargeting, and mobile optimization; effects alone cannot deliver AAA character quality.

## Publish the arcade update to Vercel

Target the existing **stormwake** project in **adebayosolomon54-2971s-projects**:
https://vercel.com/adebayosolomon54-2971s-projects/stormwake

From the repository root, after `npm ci`, `npm run build`, and `npm test`:

```sh
# Authenticate with Vercel securely first, or inject VERCEL_TOKEN through environment settings.
# Do not paste tokens into chat or commit them.
npm exec --yes --package vercel@64.5.0 -- vercel project inspect stormwake --scope adebayosolomon54-2971s-projects
npm exec --yes --package vercel@64.5.0 -- vercel link --yes --project stormwake --scope adebayosolomon54-2971s-projects
npm exec --yes --package vercel@64.5.0 -- vercel deploy --prod --yes --scope adebayosolomon54-2971s-projects
```

Keep the existing production `DATABASE_URL` (or `POSTGRES_URL`) configured on Vercel. It must point to the existing game database to retain saves. This update adds `usernameCreated` to profile JSON on username creation; no destructive Postgres migration is needed. Local SQLite adds an independent `username_created` column automatically. Do not replace production storage with SQLite or ephemeral memory.

After Vercel reports a ready production deployment, verify its actual production URL: the homepage has no Connect wallet control; a new browser can create a username and start play; a returning browser retains its name and progress; recovery keys still restore profiles; `/api/auth/challenge` and `/api/auth/verify` return 410. Confirm `/api/state` returns 200 before declaring hosting complete. Publishing requires access to this Vercel team/project; a passing local build does not publish the update.
