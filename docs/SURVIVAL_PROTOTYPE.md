# Survival prototype verification — 2026-11-16

Branch: feature/open-voyage. Not merged or deployed.

## Implemented
- New local and cloud runs use server-authoritative survival mode; legacy active expedition snapshots retain their rules.
- Successive waves start after the previous squad is defeated. Squads grow from six to a maximum of 24; health scales to a bounded multiplier. Death ends the run.
- Personal survival records (kills, score, wave, active seconds, completed runs) persist additively in gear. No legacy extraction currency or wins are awarded on death.
- Mainland and bridges connect the harbour, Old City, Riverhold and Emerald Reach. Added twelve original timber buildings and five loot caches. Survival ferry routes are unlocked.
- Restored original timber houses instead of the imported medieval house. Existing optimized pine assets and graphics presets remain.
- Survival HUD, results and field guide replace chapter instructions for new runs. Enemy render slots are keyed by type and ID, avoiding incorrect models across old/new run types.

## Verification
- npm test: 127 tests pass, zero failures. Includes connected walking routes, successive waves, pause/death, ferry access and once-only cloud survival records across restore.
- npm run build: passed.
- Local browser: http://127.0.0.1:5263/; isolated data in work/survival-review.
- Observed username entry, prologue skip, wave one with six machines, weapon cache discovery/equipping, death result (11 seconds), restart and pause. No browser error logs returned.
- Screenshot: ../open-voyage-review/survival-result.jpg (relative to outputs repository parent).
- Local HTTP test was initially blocked by network sandbox EACCES; it passed after local network permission was granted.

## Limits
- This is a functional prototype, not a claim of photorealism. The added city uses original procedural architecture, and the wider world still needs composition/detail work.
- Survival records are personal. The existing Hall of Voyagers retains legacy expedition scores.
- Real mobile hardware and real PostgreSQL concurrency were not tested; cloud coverage uses pg-mem.
- No new comparable frame-time benchmark was captured for survival mode. Previous environment-only measurements are not survival performance evidence.
- On-foot connectivity is automated coverage; this session did not manually traverse every district in the browser.
- Enemy navigation remains existing collision-aware chasing, not a new obstacle-routing system. This can limit pursuit around dense buildings and across distant regions.
