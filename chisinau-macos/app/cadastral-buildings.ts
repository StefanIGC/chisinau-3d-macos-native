import * as T from 'three';
import data from '../data/cadastral-buildings.json';
import {streetMesh} from './street-mesh';
import type {XY} from './city-layout';
import {ionCreangaDetails,buildIonCreangaDetails} from './ion-creanga-details';
import {buildUpscMain} from './upsc-architecture';

/** Cadastral geometry supplies plan dimensions only. Unknown elevations remain estimates. */
export function createCadastralBuildings(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'FNDG · clădiri cadastrale',ground,loaded);
 for(const c of data.chunks)m.job(c.key,c.bodies.flatMap(b=>b.rings[0])as XY[],[],function*(){
  for(const b of c.bodies){const[p,...holes]=b.rings as XY[][],y=ground(...b.anchor as XY)+.12,h=b.height;
   if(b.id==='cladiri.17259/0/0'){yield* buildUpscMain(m,p,y);continue;}
   const detail=ionCreangaDetails[b.id];
   m.solid(p,h+2,y-2,detail?.wall??'#b2ac98',true,holes);yield;
   if(detail){yield* buildIonCreangaDetails(m,b,y);continue;}
   m.solid(p,.12,y+h,'#777d72',false,holes);yield;
   // Conservative facades: the cadastre does not document windows or colors.
   if(h>4.5)for(let i=1;i<p.length;i++){const f=m.facade(p[i-1],p[i],y);if(f.len<3)continue;
    const bays=Math.max(1,Math.floor(f.len/4.2));for(let row=0;row<Math.min(12,b.levels);row++){for(let j=0;j<bays;j++)f.panel((j+.5)*f.len/bays,(row+.55)*h/b.levels,.025,Math.min(1.4,f.len/bays*.45),Math.min(1.8,h/b.levels*.5),.02,'#627879',false,1);yield;}
   }
  }
 });
 const owners=new Map(data.chunks.map((c,i)=>[c.key,m.collisionObjects[i]]));
 const chunkReplacements=data.chunks.map((c,i)=>{const points=c.bodies.flatMap(b=>b.rings[0]);return{id:-2000000-i,x:points.reduce((n,p)=>n+p[0],0)/points.length,z:points.reduce((n,p)=>n+p[1],0)/points.length,radius:0,footprints:c.bodies.map(b=>b.rings),get ready(){return owners.get(c.key)?.userData.grounded===true;}};});
 const mappedReplacements=data.replacements.map(r=>({...r,get ready(){return r.keys.every(k=>owners.get(k)?.userData.grounded===true);}}));
 return{...m,replacements:[...mappedReplacements,...chunkReplacements],get ready(){return m.ready;}};
}
