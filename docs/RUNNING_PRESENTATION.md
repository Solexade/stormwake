# Hero running presentation — revised

The original jogging loop at 1x did not match travel speed: 310 simulation units/s is 7.75 scene metres/s. Normal full-stick movement now uses the authored running clip. Low analog speeds retain walk/jog. Running cadence uses scene speed, clip duration and nominal two-step stride lengths (3.4m normal, 4.1m sprint), bounded to 2.8x. These are visual calibration values, not measured foot-lock guarantees.

The mesh faces travel during locomotion, reducing sideways sliding caused by stale aim bearing. Mesh yaw returns to combat facing outside locomotion. World heading, positions, controls, speed, collision and combat remain unchanged. No new assets.

Targeted presentation tests: 6 passed. Build passed. Full tests attempted but the HTTP test could not connect to localhost:5194 (EACCES in this sandbox). Browser loaded the updated page, but the session ended during the movement check; continuous animation and real touch hardware are not verified. Local preview only, not deployed.
