# Clean coastal presentation

Reference review: ATLAS World Quest (https://atlas-world-quest.vercel.app/) inspected live: ivory canvas, mint/lavender washes, one prominent call to action. Stormwake adopts its spacing and background treatment with evergreen/sea-glass accents, retaining its existing world artwork.

Photography: https://www.joebudman.com/photo/eliassen-rorbuer/ and https://www.joebudman.com/photo/stormy-hamnoy-2/ (visual reference only, not imported). Observations: cool muted water/stone, selective warm timber colour, working-harbour props outside clear routes.

Game art reference: https://www.airshipsyndicate.com/ and Wayfinder screenshots reviewed through image search. Borrowed principle: separate readable fighters from atmospheric backgrounds, not commercial art or models.

Lighting reference: https://polyhaven.com/a/gray_pier (CC0 overcast reference, not downloaded). Existing licensed local furry_clouds HDR, rock PBR textures, boulder scan and wooden barrel GLB are reused. No newly downloaded assets and no photorealism claim.

Structure: two principal sections (introduction + play setup). Profile/recovery details, private-room controls and explanatory text use native accessible disclosures. All existing IDs and handlers remain. No changes to combat, movement, API, saves or Solo gameplay. Arena changes affect light/material colour, fog, rail density and non-colliding out-of-lane props only. Performance hides extra props.

Verification: 87 tests pass; npm run build passes. Browser inspected at desktop 1280x800, portrait 390x844 and landscape 844x390. Portrait had no horizontal overflow; hero/arena selection and match entry worked; landscape movement/action controls stayed visible. No browser console errors observed. These are browser viewport checks, not real touch hardware or FPS benchmarks. HDR is illumination-only to exclude its modern skyline. Existing characters remain stylized; this is a presentation improvement, not a photorealistic asset replacement.
