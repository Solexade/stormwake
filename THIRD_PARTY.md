# Third-party notices

## viem 2.57.0

Server-side Ethereum signature verification uses viem (MIT), installed from npm with pinned dependencies in package-lock.json. Its license is included by npm in node_modules/viem/LICENSE. Source: https://github.com/wevm/viem .

## Three.js 0.180.0

- Source: https://github.com/mrdoob/three.js/tree/r180
- Package: https://www.npmjs.com/package/three/v/0.180.0
- License: MIT. Full notice included in `public/vendor/THREE-LICENSE.txt`.
- Vendored files: `three.module.js` (the minified module build) `three.core.min.js`, and `BufferGeometryUtils.js` (local module import adjusted).
- The package is pinned as a development dependency for reproducibility. Production serves the vendored files locally and does not depend on npm or a CDN at runtime.

All scene geometry, procedural textures, game characters and synthesized audio in this prototype are created in the project code; no third-party character models or game artwork are included.
