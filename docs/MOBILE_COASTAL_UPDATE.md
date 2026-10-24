# Mobile rendering and coastal water

Touch devices start in Performance mode: pixel ratio capped at 1, shadows and bloom disabled, antialiasing disabled at renderer creation. Desktop defaults remain High. Optional harbour GLB downloads are deferred until High is selected; original fallbacks remain usable. Foliage animation is skipped in Performance. Authoritative movement speed, input prediction, combat and collision are unchanged.

Game surfaces suppress browser gestures and buttons use touch-action manipulation to prevent double-tap zoom. Page pinch zoom remains available outside the playfield.

Ocean presentation uses broader mesh swells, fragment-level ripples, Fresnel sky colour and distance haze. Fishing moorings and rope coils add water-side harbour details without new collisions. These are procedural effects, not photorealistic scanned water or new gameplay.

Verification: 89 tests and build pass. Browser shader inspection produced no console errors and expedition launched. A later browser automation timeout prevented reliable frame-rate comparison. Actual phone frame rate, load time and double-tap behavior still require device testing; no measured performance gain is claimed.
