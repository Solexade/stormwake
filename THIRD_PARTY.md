# Third-party notices

## viem 2.57.0

Server-side Ethereum signature verification uses viem (MIT), installed from npm with pinned dependencies in package-lock.json. Its license is included by npm in node_modules/viem/LICENSE. Source: https://github.com/wevm/viem .

## Three.js 0.180.0

- Source: https://github.com/mrdoob/three.js/tree/r180
- Package: https://www.npmjs.com/package/three/v/0.180.0
- License: MIT. Full notice included in `public/vendor/THREE-LICENSE.txt`.
- Vendored files: `three.module.js` (the minified module build) `three.core.min.js`, and `BufferGeometryUtils.js` and `HDRLoader.js` (local module imports adjusted).
- The package is pinned as a development dependency for reproducibility. Production serves the vendored files locally and does not depend on npm or a CDN at runtime.

Fallback character geometry, environment geometry, harbour weathering/shore effects, needle cutouts and synthesized audio are original project code. The shipped third-party animated knight is credited below. All existing asset files are unchanged; public/asset-manifest.js records hashes and provenance. Historical acquisition/export details that were not recorded are explicitly marked unknown.


## Poly Haven photographic materials (CC0)

The locally hosted 1K diffuse, OpenGL normal and roughness maps come from:
- Forest Floor: https://polyhaven.com/a/forest_floor
- Weathered Brown Planks: https://polyhaven.com/a/weathered_brown_planks
- Aerial Rocks 02: https://polyhaven.com/a/aerial_rocks_02
- Furry Clouds HDR environment: https://polyhaven.com/a/furry_clouds

License: https://polyhaven.com/license — CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
These free public-domain assets are hosted locally; the game makes no requests to Poly Haven. Material tint, scale and normal strength are adjusted in code.


## Animated knight
Quaternius Animated Knight Pack (CC0): https://quaternius.com/packs/knightcharacter.html
Source FBX from https://opengameart.org/content/lowpoly-animated-knight converted to GLB with Three.js. GLTFLoader and SkeletonUtils use the existing Three.js MIT license.

## Music and effects
The adventure score, footsteps and layered effects in audio.js are original procedural synthesis. No external recordings, subscription or attribution requirement.

## Harbour recovery assets (2026-10-16)

- `public/assets/boulder_01.glb`: Boulder 01 by Rico Cilliers, https://polyhaven.com/a/boulder_01 — CC0-1.0.
- `public/assets/wooden_barrels_01.glb`: first barrel from Wooden Barrels 01 by James Ray Cock, https://polyhaven.com/a/wooden_barrels_01 — CC0-1.0.
- License: https://polyhaven.com/license . Both individual asset pages identify CC0. Verified 2026-10-16.
- Original model vertices and 1K base colour, OpenGL normal and ARM JPEGs retained. Container repack removes unused pack objects; ARM red channel is enabled for AO. These are real imported models, not generated geometry.
- Source URLs and MD5s: `docs/asset-provenance/*.json`. Shipped SHA-256: `public/asset-manifest.js`.
- Reproduce from repository root: `node scripts/acquire-harbour-assets.mjs`, then `node scripts/pack-harbour-assets.mjs`. Acquisition needs network; ordinary play/build does not download external assets. Sources are cached in sibling `asset-acquisition/`.
