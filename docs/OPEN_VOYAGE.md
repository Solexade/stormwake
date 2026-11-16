# Open Voyage prototype — 13 November 2026

Status: work in progress on feature/open-voyage. Do not merge or deploy without user approval. Existing bright-lobby edits are preserved.

## Implemented
- World bounds expanded from 2500 × 1850 to 5300 × 2400 simulation units. Bounds include ocean; this is not a claim that playable land grew by the same ratio.
- Expanded Sunken Coast/Southwatch, Riverhold and Emerald Reach, with chapter-specific spawn, shrine, commander and extraction points.
- Five additional land polygons, two river bridges, ten timber houses, three camp markets and three named guide NPCs.
- Four directed ferry routes connect unlocked regions. These are three-second scripted transfers, not player-steered boats. Input and prediction stop during crossing; pause freezes travel.
- Sixteen extra caches: weapons, healing, salvage and temporary combat cores. Server chooses rewards and rejects repeat openings. A starter axe remains available. Legacy equipped melee weapons remain available.
- Discovered weapons persist in gear JSON on SQLite and PostgreSQL paths. Active caches belong to their expedition; new expeditions replenish caches. Carried salvage and rank are banked on successful extraction only.
- Voyage rank: 10 XP per defeated enemy (including commander), plus 150 per commander. Tideforged Knight at 450 XP and Grove Sentinel at 1000 XP are cosmetic colour variants of existing licensed rigs, not new models.
- Camps offer the existing rest, forging, armour, stamina and healing purchases. NPC dialogue offers a direct route into the local market.
- Existing movement constants, attack damage/timing, recovery keys, identity and database schemas remain intact. Legacy run snapshots fall back to original mission coordinates.

## Verification
- npm test: 119 passing, 0 failing after localhost network access was granted. An earlier run's HTTP failure was EACCES from the sandbox, not an application assertion.
- npm run build: successful.
- git diff --check: passes after normalizing mixed line endings.
- New tests cover landmark walkability, grid connectivity, one-time rewards, legacy weapons, chapter relic/extraction, gated ferry travel, pause/prediction, rank thresholds, cloud discovery restoration and once-only rank banking.
- Browser: Windows in-app browser, 1280 × 720, High, DPR 1.5. Guest entry, starter weapon cache, Southwatch traversal, Riverhold deployment (isolated fixture with one win), NPC conversation, market opening and Riverhold-to-Southwatch ferry were observed. No captured console errors.
- Southwatch sample after travel: 47 FPS, p95 frame 27.7 ms, CPU p95 21.2 ms, 575 draw calls, 1,086,126 triangles; 15 harbour assets loaded, 0 failed, 2126 ms reported asset time. These are one-device observations, not a baseline comparison or mobile certification.
- Screenshot: ../outputs/open-voyage-review/southwatch.jpg relative to the outer workspace outputs directory; actual image is outside this repository.
- npm run test:playthrough: FAILED. The automated bot reached the first commander but died. Random loot could change its weapon, so the script now explicitly re-equips its expected axe through the public API; the rerun still died. No combat values were weakened to pass the bot. This remains a release blocker for end-to-end combat acceptance.

## Remaining work / limits
- This is a finite three-region adventure prototype, not an endless open world or a fully simulated city.
- NPCs currently reuse existing champion rigs and static locations; bespoke civilian models, peaceful idle animations, routines and richer quests remain art/gameplay work.
- Architecture remains procedural timber geometry with existing local PBR materials. New islands are sparse; foliage/shoreline composition and landmarks need another art pass. No photorealistic claim.
- No new external assets or dependencies. Existing assets retain their repository licence records.
- Boats now align to nearby coastline, but transfers are scripted; sailing physics and water navigation are not implemented.
- Only two original cosmetic recolours were added; UI unlocks are not a security entitlement system.
- Emerald Reach has simulation/connectivity coverage, but has not had a complete browser combat/extraction playthrough.
- No real mobile hardware or real PostgreSQL concurrency test in this pass. pg-mem does not establish production transaction behaviour.
- Local active runs remain in-memory, as before. Restarting the local server loses an active run; profile inventory survives. Cloud JSON snapshots remain persistent.
- Preview database contains an explicitly isolated Voyage QA progression fixture. No production records changed.

## Next review
Keep on feature/open-voyage. First reproduce the boss playthrough failure against the unchanged baseline to separate bot tactics from regressions. Then verify each chapter end-to-end, test phone landscape multitouch, enrich civilian animations, and dress one regional route before adding more regions.
