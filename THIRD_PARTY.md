# Third-party notices

## viem 2.57.0

Server-side Ethereum signature verification uses viem (MIT), installed from npm with pinned dependencies in package-lock.json. Its license is included by npm in node_modules/viem/LICENSE. Source: https://github.com/wevm/viem .

## Three.js 0.180.0

- Source: https://github.com/mrdoob/three.js/tree/r180
- Package: https://www.npmjs.com/package/three/v/0.180.0
- License: MIT. Full notice included in `public/vendor/THREE-LICENSE.txt`.
- Vendored files: `three.module.js` (the minified module build) `three.core.min.js`, and `BufferGeometryUtils.js` and `HDRLoader.js` (local module imports adjusted).
- The package is pinned as a development dependency for reproducibility. Production serves the vendored files locally and does not depend on npm or a CDN at runtime.

Scene geometry, game characters, needle cutouts and synthesized audio are created in the project code. No third-party character model is shipped.


## Poly Haven photographic materials (CC0)

The locally hosted 1K diffuse, OpenGL normal and roughness maps come from:
- Forest Floor: https://polyhaven.com/a/forest_floor
- Weathered Brown Planks: https://polyhaven.com/a/weathered_brown_planks
- Aerial Rocks 02: https://polyhaven.com/a/aerial_rocks_02
- Furry Clouds HDR environment: https://polyhaven.com/a/furry_clouds

License: https://polyhaven.com/license — CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
These free public-domain assets are hosted locally; the game makes no requests to Poly Haven. Material tint, scale and normal strength are adjusted in code.
