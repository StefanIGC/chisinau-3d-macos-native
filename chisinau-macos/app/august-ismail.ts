import * as T from 'three';
import realm from '../data/august-ismail.json';
import catalog from '../data/august-ismail-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {addIsmailArchitecture,ISMAIL_CUSTOM} from './ismail-architecture';
import type {XY} from './city-layout';

/** Tighina–Ismail frontage, sharing the existing loading and collision budget. */
export function createAugustIsmail(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'31 August · Tighina–Ismail',ground,loaded);
 addIsmailArchitecture(m,catalog as PhotoBuilding[]);
 const l=landscapeLayer(scene,'Tighina–Ismail · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const infill=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!ISMAIL_CUSTOM.includes(b.style)) as PhotoBuilding[],'Tighina–Ismail · fronturi');
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
  for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.12:.035),true);
 },c.coverage);
 for(let k=0;k<realm.separators.length;k+=10){const group=realm.separators.slice(k,k+10);m.job('pistă protejată '+k,group as XY[],[],function*(){
  for(const[x,z]of group){const y=ground(x,z)+.035;m.box(x,y+.037,z,1.65,.075,.24,'#37453d');for(const d of[-1,1])m.box(x+d*.60,y+.079,z,.27,.012,.20,'#b3a04c',true);m.box(x,y+.26,z,.065,.45,.065,'#354139',true);for(const h of[.24,.39])m.box(x,y+h,z,.07,.07,.07,'#c4b052',true);yield;}
 });}
 // OSM n633621356 explicitly records shelter=no. Keep the stop open.
 m.job('Stația 31 August · fără pavilion',streetRect(1237.85,308.792,2,2),[],function*(){
  const x=1237.85,z=308.792,y=ground(x,z)+.12;m.box(x,y+1.55,z,.06,3.1,.06,'#707c6e',false,true);
  const f=m.facade([x-.32,z],[x+.32,z],y);f.panel(.32,2.77,.03,.64,.72,.06,'#3e6684');f.panel(.32,2.8,.065,.47,.51,.025,'#c5ccbc');
  f.panel(.32,2.80,.086,.31,.17,.016,'#506057');for(const dx of[-.105,.105])f.panel(.32+dx,2.69,.09,.05,.05,.018,'#37483e');
 });
 l.job('31 August 43 · punct de colectare',1258.19,327.502,function*(){
  const x=1258.19,z=327.502,y=ground(x,z)+.12;l.box(x,y+.51,z,.87,1.02,.72,'#5d7159',true,true);l.box(x,y+1.06,z,.96,.10,.8,'#455d47',true);yield;
 });
 l.job('Salle de Café · mobilier exterior',1277.2,326.6,function*(){
  const x=1277.2,z=326.6,y=ground(x,z)+.12,wood='#987b50',iron='#424b3e';
  for(let k=0;k<5;k++)l.box(x,y+.74,z-.24+k*.12,1.12,.055,.095,wood,true,true);
  for(const dx of[-.43,.43]){l.beam(new T.Vector3(x+dx,y,z-.26),new T.Vector3(x+dx,y+.71,z+.26),.024,iron);l.beam(new T.Vector3(x+dx,y,z+.26),new T.Vector3(x+dx,y+.71,z-.26),.024,iron);}
  for(const dx of[-.86,.86]){for(const a of[-.17,.17])for(const b of[-.17,.17])l.box(x+dx+a,y+.22,z+b,.03,.44,.03,iron,true);for(let k=0;k<3;k++){l.box(x+dx,y+.45,z-.14+k*.14,.45,.045,.11,wood,true,true);l.box(x+dx,y+.61+k*.12,z+.22,.45,.095,.04,wood,true);}yield;}
 });
 m.job('London · bornă și bord de trotuar',streetRect(1399,311,13,3),[],function*(){
  for(const x of[1393.1,1398.6,1403.8]){const z=312.55,y=ground(x,z)+.12;m.box(x,y+.39,z,.055,.78,.055,'#aa5b43',true,true);m.box(x,y+.62,z,.06,.11,.06,'#cfbf9f',true);yield;}
 });
 const layers=[m,l,infill];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),
  get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
