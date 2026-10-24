# Machinefall experiment — not merged

Branch: prototype/machine-invasion. Local preview: http://127.0.0.1:5239/

Human heroes, movement, map collision, extraction and profile schema are retained.
Enemy presentation uses original procedural box robots in brown/mint, silver/orange, red and purple palettes, inspired by https://testnet.vibevibe.fun/vibe-vibers/for-raiders. No official NFT artwork or models were imported; this is not an official collaboration.

Equip Pulse carbine with the weapon dropdown (mobile too) or 4. Existing attack controls fire; heavy overcharges. Server simulation checks aim, range, stamina and terrain obstruction. Shots hit one target and do not lunge. Existing melee weapons remain available.

City prototype replaces three cottage silhouettes and adds a distant skyline. This is a coastal district reskin, not a separately selectable arena. Existing paths and collision remain. Authored gun aiming/recoil clips, official asset permission, dedicated gun audio, mechanical damage effects and a complete city environment remain future work.

Verification: browser weapon equip succeeded; 23 focused combat/presentation tests passed; build passed. Full npm test: 70 pass, 4 suite-load failures due to missing pg, pg-mem and viem dependencies in this isolated checkout. No mobile hardware validation or production deployment. Production saves are not used; trial has isolated DATA_DIR.

## Story campaign revision

Preview now runs at http://127.0.0.1:5241/. No merge or deployment.

The Heartbeat and original heroes remain central. Rogue machines cross a time fracture into the medieval islands to seize the Heartbeat before their own era. The campaign has three deployments: The Breach, The Occupied Reach, The Fracture Gate. Server-owned saved wins select the chapter; clearing and extracting unlocks the next deployment. Later deployments start in existing inland/eastern regions and increase commander vitality. All three currently share the existing map and relic/extraction rules; they are not three new maps. After three wins the last chapter can be replayed.

The redesigned hub shows chapter locks and a single continuation action. New players see a four-part, skippable animated HTML prologue before the expedition starts; reduced-motion users advance manually. It is an illustrated story sequence, not a rendered film or motion-captured cutscene. Replay is available from the campaign page.

Gun presentation now adds an upper-body brace, hides the shield, adjusts the carbine attachment, and adds a recoil accent around the authoritative hit time. These are procedural pose corrections, not an authored rifle animation pack. Movement constants and collision rules were not changed.

Verified browser: new username -> prologue; campaign hub and locked chapters; responsive narrow layout. Dedicated mobile hardware and complete gun alignment across every hero remain review items.

Final verification (2026-10-24): npm test 92/92 passed, npm run build passed, git diff --check clean. The isolated automated playthrough reached the boss but died (boss had 206 HP at 50s), so its win assertion failed. Campaign balance and end-to-end completion need further playtesting; this is not a release-ready campaign. No test assertions were weakened.

## Occupied harbour + combat cores

Two timber cottages have been restored inside existing structure footprints, retaining their collision. The central machine tower and distant skyline remain; nearby spruce placement reuses existing obstacle locations. Trees and old houses now coexist with the invasion structures. No new downloaded assets.

Every third non-boss kill grants a 14-second core, cycling Overdrive (+25% damage), Aegis (35% reduction), Surge (double stamina recovery). One core at a time; no stacking or permanent statistics. Timers pause with the expedition and survive snapshots. Server input cannot specify buffs. HUD displays the active core/countdown and the next kill threshold.

A perfect parry opens a 1.4-second Counterstrike window through the existing attack button (mobile label becomes Counter!). Axe finishers sweep wide; spear finishers concentrate reach; sword finishers favour damage. Existing three-hit charge, keyboard chain, movement and gun controls remain. These are mechanical/pose variations using existing authored clips, not newly motion-captured moves.

This revision: all 94 tests pass, build passes. Browser inspected at narrow width; interaction prompt relocated below the status panel. The automated expedition again died at the boss, so balance/end-to-end completion remains an open prototype issue.
