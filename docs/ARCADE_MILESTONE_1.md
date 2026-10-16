# Stormwake 2.0 — Oathring milestone 1

## Audit and implementation plan

The starting point is harbour recovery commit `70a6ad2`: Three.js r180 ES modules, GLTFLoader/SkeletonUtils and local CC0 Knight rig, existing fixed Solo movement/combat modules, Node SQLite service and Vercel PostgreSQL JSONB snapshots. Guest sessions are HttpOnly `isles` cookies. The homepage owns a separate Solo render/input loop.

Plan delivered before implementation: isolate a deterministic fighting simulation; make outcomes server-owned; add private two-person rooms on the existing persistence/authentication infrastructure; build a 3D side-view arena and touch controls; integrate mode navigation and verify regression. This PR is based on the unmerged harbour recovery branch to retain its character fix without merging it automatically.

## Play

Start the existing server with `npm start`, open the homepage and choose **Play Arcade / Multiplayer**. Or open `/arcade.html`.
- **Solo Arcade:** choose Apprentice/Raider/Oathkeeper and Enter the ring.
- **Online Duel:** Create room, copy its 10-character code, and send it to someone using the same deployment in another browser/device. The other player selects Join. Separate guest sessions are required; two tabs sharing one cookie are one player.
- **Solo Quest:** remains on `/`; entering Arcade from its homepage pauses an active expedition. Resume it normally afterwards. No Solo currency or rewards are awarded by Arcade.
- A/D move, W jump, S crouch, J light, K heavy, L block, U Storm. Mobile buttons support pointer capture and multiple simultaneous fingers. Input is cleared on blur, visibility loss and pointer cancellation. The arena suppresses scrolling.
- Land a light strike and cancel late recovery into heavy/special. Crouch ducks high light strikes; heavy/special are mid strikes. Storm cooldown is four seconds. No artificial token utility or reward promise.

## Architecture and rules

`public/arcade/{state,input,movement,hitboxes,combat,rounds,ai,engine,config}.js`: isolated pure deterministic 60 Hz simulation. Configurable startup/active/recovery, hit/hurt boxes, stun, block stun, cooldowns, knockback, facing, arena clamping and combo scaling. AI sees public position and action state, not pending inputs. Three difficulty profiles, seeded choices.

60-second rounds; first to two wins. Equal health at timeout or double KO replays a drawn round without awarding a win. Three total drawn rounds terminate in a match draw (bounded stalls). Two-second countdown and 2.5-second round break. Health resets between rounds. Match results and forfeit/disconnect reasons persist as room snapshots.

`arcade/service.js`: authoritative intent processing, room membership and storage adapters. Each participant can only control their own seat. Monotonic sequence numbers reject repeated/old commands. Unknown result fields in sync are rejected; there is no client outcome endpoint. Guest session IDs come only from existing authentication. Source, elapsed time, HP, damage, wins and opponent inputs are never accepted from clients.

The client polls at up to 10 Hz; the server performs 60 Hz steps against elapsed wall-clock, preserving fractional remainder and capping catch-up to 500 ms after gaps. Stale controls stop after 24 simulation frames. Twenty seconds without a participant heartbeat forfeits; both disconnected produces a draw. Waiting rooms expire after one hour. Reconnect uses Resume current match. A profile may create at most five new matches/minute. Room codes are 40 random bits; membership is still required for sync.

Local requests use a serialized SQLite room store. Vercel requests acquire the existing profile transaction, then `SELECT ... FOR UPDATE` on the room and save one JSONB snapshot. Arcade bypasses Solo dispatch/advance. New tables/indexes only; no destructive migration or changes to existing Solo saves. Existing profiles/session tables and wallet flow remain intact. Room records are not automatically purged; define a retention policy before large-scale rollout.

`public/arcade/view.js`: actual animated GLB clones, separate side camera with automatic two-fighter framing, original harbour ring, sea plane, directional/contact shadows, warm/cold corner lights, hit sparks and restrained shake (disabled for reduced motion). High/Performance switch. The existing low-poly Knight asset remains a licensed placeholder; crouch currently scales its presentation vertically because no authored crouch clip exists. Not photorealistic. No new downloaded assets or licenses.

## Verification evidence

Story: homepage → Arcade API → authenticated room snapshot in SQLite/Postgres adapter → two rendered fighters and server-calculated round/match results.

| Boundary | Evidence |
|---|---|
| UI → API | Homepage Arcade button, AI start and room create/join exercised in browser. |
| API → data | SQLite adapter test closes and reopens a disposable file database, then resumes the same match and sequence number. HTTP integration tests exercise guest-authorized room writes. |
| Data → UI | Separate `127.0.0.1` and `localhost` guest cookies joined one room; host heavy strike reduced guest HP from 100 to 83 in both browsers. |
| Complete AI flow | Browser completed two rounds, displayed defeat 0–2, then Replay began a new match. |
| Multiplayer lifecycle | Joined as seat two, jumped via touch button, then Leave match recorded a forfeit and displayed victory to host. |
| Mobile layout | 390×844 viewport inspected with labelled controls and a visible jumping fighter. This is not real-phone hardware/multitouch verification. |
| Solo regression | HTTP test preserves paused run ID/HP across room operations; existing combat, movement, persistence and wallet tests pass. Returned to Solo homepage in browser. |

Screenshots outside repository: `outputs/arcade-evidence/ai-match-complete.png`, `room-host.png`, `room-guest.png`, `room-result.png`, `mobile-controls.png`.

- `npm test`: 61 passed, including 11 dedicated Arcade tests and expanded HTTP integration coverage.
- `npm run build`: passed.
- `npm run test:playthrough`: **fails** at existing Solo boss (`dead !== won`, boss at 180 HP near 60s). Same failure was reproduced on untouched baseline during the harbour work. Solo gameplay and bot were not weakened to force success.
- Browser console: no errors in inspected Arcade session. Render telemetry: 2 fighters, approximately 5,330 triangles / 46 draw calls in the test view. No claim of stable mobile FPS.

## Before production / known limitations

1. PostgreSQL adapter tests use pg-mem. No local PostgreSQL/Docker executable or disposable real test database was available; true concurrent row-lock behavior and Vercel cold-start latency still require integration testing. Do not call this production-validated.
2. Snapshot multiplayer has roughly 100 ms input/network cadence plus network/database latency. No rollback, prediction, matchmaking, spectating, tournaments, skill rating or spectator reconnection. Cold starts and poor mobile networks can feel delayed; high-concurrency polling can be costly.
3. Arcade records do not yet have a history UI or reward economy. Outcomes remain in the room table; Solo leaderboard stays unchanged.
4. Rig, crouch and attack clips are temporary. Dedicated Viking fighter assets, authored crouch/block/hit-reaction animations, sound design and richer arena art are future milestones.
5. A browser hidden for >20 seconds forfeits the match; there is no AI pause menu in this milestone. Normal inputs are cleared immediately on backgrounding.
6. No merge or production deployment performed. Review this focused PR against the harbour recovery branch, then test a staging deployment with real PostgreSQL before promoting.
