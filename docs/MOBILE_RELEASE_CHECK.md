# Landscape release verification

2026-10-17: Chromium in-app browser viewport checks, not physical-device tests.

- Arcade: 667 x 375 and 568 x 320. All eight directional/action buttons fit entirely within the viewport; smallest measured control size 60 x 58 px.
- Solo: 667 x 375. Joystick and all seven actions fit entirely within the viewport; action buttons are 46 x 46 px. Nearby Hearthhall action is tappable.
- Touch hardware enables Solo controls using any coarse pointer or maxTouchPoints, including devices with a connected mouse. Manual Touch controls toggle remains available.
- Layout responds to orientation media queries; no orientation lock is imposed. Users must turn off their device rotation lock.
- Physical iOS/Android multitouch and performance still require real-device validation. Browser viewport checks do not prove those properties.
- Preserve main's username-only entry, HTTP 410 wallet endpoints, existing sessions and recovery keys while combining the Arcade branch.
