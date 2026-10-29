# Melee and harbour quality pass

Reviewed sampled frames from Recording 2026-10-25 182353.mp4. Visible limitations: obstructive plain modern shop, repetitive terrain/vegetation, low-detail enemies, flat-looking distant sea. No new licensed assets were acquired; this is not photorealism.

Removed gun from available weapons and keyboard selection. Server rejects it via shared catalogue. New and restored gun-equipped runs map to axe, preserving health, progress, gear ranks and salvage. Profile responses normalize the retired selection. No database reset or schema migration.

Replaced the obstructing shop with the existing dressed timber building at unchanged coordinates. Adjusted fog, lighting, sky colour management and wave/deep-water contrast. Spear/hooded sword presentation uses interpolated action time; spear extension peaks at authoritative hit time. Movement constants and axle/axe attack rules are unchanged. Cached rig bones/materials and removed rifle geometry to reduce per-frame overhead.

Build passed. 100 tests passed, including legacy gun-save normalization. Local browser rendered without console errors and showed the three melee choices. Continuous motion feel, real mobile performance and photorealistic assets remain outstanding review areas. Preview: localhost:5246. Not deployed in this pass.
