# Oathring visual refresh â€” 2026-10-16



Scope: Arcade presentation only. Solo controls, combat, world and persistence unchanged. Deep navy/cyan navigation, ember/violet health bars, bold display headings and a new original concept illustration take inspiration from the user-provided Last Bag site without reusing its assets.



## Shipped models

- Azure Champion: https://www.autosprite.io/free-3d-models/azure-champion

- Hooded Blade: https://www.autosprite.io/free-3d-models/hooded-blade

- Published by AutoSprite as AI-generated CC0 assets: https://www.autosprite.io/free/license

- Both downloaded 2026-10-16. Original source copies retained outside the repository in ../arcade-source-assets. Original rigs, local embedded colour maps and clips retained. Source pages underreport the number of animation clips; inspected binaries contain sword attacks on Azure and punch/kick on Hooded Blade.

- glTF Transform 4.2.1 simplify --ratio .15 --error .005; textures resized with Pillow to 1024 JPEG quality 88 and binary views repacked. 22,500 triangles each; 1,907,780 and 1,531,908 bytes. No runtime decompressor or asset CDN.

- Existing Quaternius model remains only as an asset-error fallback. The new models are still stylized; they are not the illustrated concepts or photorealistic custom Viking characters.

- Crouch uses joint poses, not body scaling. Horizontal hips animation is made in-place. The server's hit timing and position remain authoritative.



## Artwork

public/assets/oathring_concept.png was created using the built-in OpenAI image-generation tool. It is explicitly labelled concept art in the lobby, never presented as a gameplay screenshot.

Prompt: Original premium dark fantasy fighting game key art for Stormwake: two anatomically believable adult rivals in a ruined Nordic seaside arena; a weathered blue/gold-armoured male warrior with an ember sword and a violet-hooded female warrior with a curved magic blade; detailed faces, worn materials, full-body fighting stances; deep navy/cyan moonlight, violet and ember contrast; no text, UI, logos or watermark. Lobby concept art, not gameplay.



## Verification

63 automated tests and build pass. Browser loads both models with no console warnings/errors. New tests enforce skin/embedded texture/attack clips and geometry budget, plus no horizontal root-motion displacement. Desktop and responsive visual checks are recorded separately in ../arcade-evidence. Full real-phone GPU testing remains outstanding. No production deployment or merge.



Remaining art work: authored block/crouch/death clips for the hooded fighter, custom Viking designs matching the concept, higher-quality arena architecture. The imported fighter designs do not yet meet the reference illustration's anatomy/detail target.



## Final review — 2026-10-17



Closer adaptive camera framing keeps both fighters visible without altering simulation coordinates. Result headings now use a readable system font after browser review caught overlapping condensed text. Performance mode hides optional scanned background boulders in addition to disabling shadows and reducing pixel ratio.



Codex in-app Chromium, 390 × 844 responsive viewport: both detailed assets loaded; labelled movement/attack controls fit without horizontal overflow. Observed renderer counters: High detail 377,064 triangles / 23 calls; Performance 46,430 triangles / 16 calls. These are render counters, not measured FPS, and responsive emulation is not real-phone testing. AI matches reached a recorded outcome; Play again works. Private-room authorization and persistence passed automated SQLite/pg-mem coverage; live two-device PostgreSQL concurrency remains an acceptance check before merging.



Final npm test: 63 passed. npm run build: passed. No changes to Solo movement, wallet, save schema or combat rules. This release updates the existing draft PR and Vercel preview only; production/main is not merged automatically.



## Roster, arenas and input update - 2026-10-17

Five selectable presentations: Voyager, Drowned Warden and Coastal Scout reuse Solo's knight rig and rival palettes; Azure Champion and Hooded Blade remain guests. These are three base models, not five new assets. Live 3D previews show actual playable models. Solo simulation, controls and progress remain unchanged.

Harbour Watch, Ember Keep and Frostbound Reach change lighting, sea/fog colors and cliff silhouettes. They share competitive platform boundaries and hitboxes; these are arena themes, not exploration maps. Host arena and each player's hero persist in existing room JSON; invalid IDs fall back safely and old snapshots remain compatible.

Polling now has a separate in-flight flag so Leave is not ignored. Input changes flush after a pending request, tap queues survive ordinary latency, and requests time out after eight seconds. Blur/background/cancel clear controls. An eight-frame server attack buffer permits near-recovery follow-ups without changing damage or attack frame data.

Validation: 66/66 tests and build pass. Browser viewport 390x844 has no horizontal overflow; combat targets are 60x58 CSS px and tapped actions release. Live roster, selected arena and Leave were browser-checked. Physical multitouch and independent-client internet validation remain outstanding. The existing Solo playthrough bot still dies at the boss instead of winning. Snapshot transport retains round-trip latency; this is not rollback netcode.
