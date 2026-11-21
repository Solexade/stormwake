# Survival arena selection — 2026-11-21

The lobby now identifies Stormwake as a survival series. Four selectable starting arenas use existing connected-world locations: Sunken Coast, Old City, Riverhold and Emerald Reach. The selector shows tactical maps generated from shared land, bridge, building, obstacle and cache geometry. These are labelled layout maps, not gameplay renders.

Both local and cloud start handlers pass the requested arena through a server-owned allowlist. Invalid IDs default to the coast; an active run resumes unchanged. The selected arena ID/name persists in the run snapshot. No movement constants, combat timings, save identity or existing records were changed. Emerald Reach's deployment point is clear of house collision margins.

Validation: 129 tests pass; build passes. Added coverage for all four spawn locations and wave generation, forged selection fallback, cloud resume and persisted arena identity. Browser verified Old City launch and its HUD, card selection, and a 390px viewport with two card columns and no horizontal page overflow. Console errors: none. Physical mobile hardware and real PostgreSQL concurrency were not tested.

The arenas remain districts in a connected world, not four newly built isolated maps. Existing scenery is retained; further environmental art refinement remains future work. Legacy expedition records/cosmetic progression remain separate from survival records.
