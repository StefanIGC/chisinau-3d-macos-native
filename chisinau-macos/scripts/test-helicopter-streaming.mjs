#!/usr/bin/env node

import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles:[{text:source}]}=await build({
  entryPoints:['app/helicopter-physics.ts'],
  bundle:true,
  format:'esm',
  platform:'node',
  write:false,
});
const physics=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const input={forward:1,turn:0,lift:0,boost:true,land:false};
let ready=true,blockedCalls=0;
const world={
  ground:()=>0,
  surface:()=>0,
  ready:()=>ready,
  blocked:()=>{blockedCalls++;return false;},
};
const state=physics.makeFlightState(0,60,0,0);
Object.assign(state,{grounded:false,rotor:1});

for(let i=0;i<60;i++)physics.advanceHelicopter(state,input,1/60,true,world);
const beforeStream={z:state.z,speed:Math.hypot(state.vx,state.vz)};
ready=false;
for(let i=0;i<120;i++)physics.advanceHelicopter(state,input,1/60,true,world);

assert.ok(state.z<beforeStream.z-55,`elicopterul a avansat doar ${beforeStream.z-state.z} m`);
assert.ok(Math.hypot(state.vx,state.vz)>35,'viteza a fost pierdută în timpul streamingului');
assert.equal(state.waiting,true,'starea de preîncărcare nu a fost semnalată');
assert.equal(blockedCalls,60,'coliziunile nesincronizate nu trebuie interogate');

const altitude=state.y;
for(let i=0;i<60;i++)physics.advanceHelicopter(state,{...input,lift:-1},1/60,true,world);
assert.equal(state.y,altitude,'elicopterul a coborât spre un teren încă necunoscut');
assert.ok(Math.hypot(state.vx,state.vz)>35,'menținerea altitudinii a frânat zborul');

ready=true;
physics.advanceHelicopter(state,input,1/60,true,world);
assert.equal(state.waiting,false,'indicatorul de streaming a rămas activ după sincronizare');
assert.ok(Math.hypot(state.vx,state.vz)>35,'viteza nu a rămas continuă după sincronizare');

console.log('OK: zborul continuă lin peste dale nesincronizate, fără pierdere de viteză sau altitudine.');
