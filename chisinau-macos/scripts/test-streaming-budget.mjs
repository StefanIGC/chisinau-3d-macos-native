#!/usr/bin/env node

import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {build} from 'esbuild';

const {outputFiles:[{text:source}]}=await build({
  entryPoints:['vendor/streets-gl/src/app/GameBridge.ts'],
  bundle:true,
  format:'esm',
  platform:'node',
  write:false,
});
const bridge=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const centers=bridge.streamCenters([0,0],[38,0]);
assert.deepEqual(centers.map(([x])=>x),[0,190,418,646],'coridorul nu mai acoperă 17 secunde de zbor rapid');
assert.equal(centers.length,4);

const tileSystem=await readFile('vendor/streets-gl/src/app/systems/TileSystem.ts','utf8');
assert.match(tileSystem,/radius=i===0\?1:0/,'punctele viitoare au redevenit vecinătăți 3×3');
assert.match(tileSystem,/i\*\.12/,'prioritatea coridorului predictiv lipsește');

const loading=await readFile('vendor/streets-gl/src/app/systems/TileLoadingSystem.ts','utf8');
assert.match(loading,/completed=this\.completed\.shift\(\)/,'rezultatele lucrătorilor nu mai sunt eșalonate');
const scene=await readFile('vendor/streets-gl/src/app/systems/SceneSystem.ts','utf8');
assert.match(scene,/instanceSelectionKeys/,'deduplicarea bufferelor instanțiate lipsește');
const worker=await readFile('vendor/streets-gl/src/app/world/worker/WorkerInstance.ts','utf8');
assert.match(worker,/addGameParts\(buffers\)/,'limitele clădirilor nu mai sunt calculate în worker');

for(const file of [
  'public/streets/tiles/vector/16/38017/23042.pbf',
  'public/streets/tiles/vector/13/4752/2880.pbf',
  'public/streets/tiles/elevation/13/2880/4752.lerc',
]) assert.ok((await stat(file)).size>0,`lipsește dala locală ${file}`);

console.log('OK: coridor predictiv de 17 s, coadă eșalonată, buffere deduplicate și dale locale prezente.');
