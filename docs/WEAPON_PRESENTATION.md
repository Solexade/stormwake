# Weapon presentation preview

Rifle: original locally constructed receiver, wooden stock/handguard, magazine, barrel and iron sights. Two-bone hand targeting replaces fixed arm Euler offsets. Root-relative rifle follows existing authoritative aim, with a short recoil and muzzle flash at the existing .08-second shot time. This is procedural geometry, not a downloaded AK model or a claim of photorealism.

Spear: two-handed forward thrust presentation replaces sword/kick clips. Hooded sword users receive arm-driven cuts instead of kicks; steel heroes retain authored sword clips. Axe attacks and accepted running are untouched. Damage, range, timing, input and saves are unchanged.

Validation: 98 tests passed; build passed. Local narrow browser view exercised rifle firing and spear switching/attack. Real mobile touch hardware, both full character rigs in combat and subjective motion quality still need player review. Local preview only; no production deployment.

## Aim correction
Rifle mesh yaw cancels actor-render turn lag and follows the firing angle. Pulse trace starts at the rendered barrel tip, not player centre. Automatic sticky target selection considers living enemies within 480 units and checks wall visibility; asleep boss excluded. This submits an aim intent only; server damage validation is unchanged. T or the HUD target-lock button toggles manual aim. Local browser firing/toggle checked without console errors; targeting regression tests cover four directions, blocked/range/dead targets. Real touch hardware remains untested.
