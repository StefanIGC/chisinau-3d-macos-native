import * as T from 'three';
import realm from '../data/vasilenco.json';
import catalog from '../data/vasilenco-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** First complete mapped block east of Ciuflea, with a referenced entrance. */
export function createVasilenco(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Ion Vasilenco · fronturi',ground,loaded),a=photoArchitecture(m);
 const infill=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>b.style!=='rammos16') as PhotoBuilding[],'Ion Vasilenco · corpuri');
 const l=landscapeLayer(scene,'Ion Vasilenco · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.12:.035),true);},c.coverage);
 const b=catalog.find(b=>b.style==='rammos16')!;
 m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);m.solid(b.p as XY[],.22,y+h,b.roof,false,b.holes as XY[][]);yield;
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1);a.cornice(f,h,b.trim);
   if(q[0]>p[0]-.75){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.7)),1.9,b.trim);continue;}
   for(let yy=.45;yy<h-.3;yy+=.53){f.panel(f.len/2,yy,.04,f.len,.026,.032,'#a6a78f',true);yield;}
   const u=f.len*.48,depth=1.5,start=f.at(u,depth+.10),low=ground(...start)+.035,top=Math.max(low+.14,y+.52),n=Math.ceil((top-low)/.13),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
   for(let k=0;k<n;k++){const p=f.at(u,depth-(k+.5)*depth/n);m.box(p[0],low+(top-low)*(k+1)/n-.22,p[1],4.8,.44,depth/n,'#535b50',false,true,angle);yield;}
   const base=top-y;f.panel(u,base+1.48,.27,4.45,2.96,.035,'#334c50',false,1);
   for(const offset of[-2.25,-1.04,0,1.04,2.25])f.panel(u+offset,base+1.48,.33,.10,3.10,.11,'#303e35',true);
   for(const offset of[-2.40,2.40])f.panel(u+offset,base+1.51,.26,.20,3.35,.32,b.trim);
   f.panel(u,base+3.23,.28,4.96,.19,.36,b.trim);f.panel(u,base+3.74,.19,4.60,.69,.14,'#2f3e36');f.label('RAMMOS TRAVEL',u,base+3.65,.36,'#bfcbb7',.30);
   for(const v of[f.len*.21,f.len*.77])f.window(v,5.78,1.58,1.82,b.trim,'#7d8370');
   f.label('16',f.len-.36,2.20,.22,'#3f5749');yield;
  }
 });
 m.job('joncțiune · stâlp cartografiat',streetRect(1731.418,311.972,2,2),[],function*(){const x=1731.418,z=311.972,y=ground(x,z);m.box(x,y+3.6,z,.13,7.2,.13,'#7c8778',false,true);m.beam(new T.Vector3(x,y+7.0,z),new T.Vector3(x-2.1,y+7.4,z),.045,'#788673');m.box(x-2.1,y+7.37,z,.64,.12,.25,'#a3ad9b',true);yield;});
 const layers=[m,l,infill];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),
  get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
