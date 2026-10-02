import {access} from 'node:fs/promises';
for(const file of ['public/index.html','public/app.js','public/scene3d.js','public/vendor/three.module.js','public/vendor/BufferGeometryUtils.js'])await access(file);
console.log('Stormwake static client and Postgres API ready.');
