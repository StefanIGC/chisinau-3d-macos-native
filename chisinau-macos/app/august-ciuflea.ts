import * as T from 'three';
import realm from '../data/august-ciuflea.json';
import mapped from '../data/august-ciuflea-map.json';
import catalog from '../data/august-ciuflea-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {addCiufleaArchitecture,CIUFLEA_CUSTOM} from './ciuflea-architecture';
import type {XY} from './city-layout';

/** A complete replacement owns its body and its corrected ground together.
 * The caller commits after all scene layers update, so rotation of the scene
 * build queue cannot display both owners for one rendered frame. */
export type AugustCiufleaBodyOverride={
 id:number;groundCells:XY[];readonly ready:boolean;setActive(active:boolean):void;
};

export function createAugustCiuflea(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'31 August · Tolstoi–Ciuflea',ground,loaded);
 addCiufleaArchitecture(m,catalog as PhotoBuilding[]);
 const l=landscapeLayer(scene,'Tolstoi–Ciuflea · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const infill=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!CIUFLEA_CUSTOM.includes(b.style)) as PhotoBuilding[],'Tolstoi–Ciuflea · fronturi');
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
  for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.12:.035),true);
 },c.coverage);
 for(let k=0;k<realm.separators.length;k+=8){const group=realm.separators.slice(k,k+8);m.job('protecție pistă '+k,group as XY[],[],function*(){
  for(const[x,z]of group){const y=ground(x,z)+.035;m.box(x,y+.037,z,1.65,.075,.24,'#37453d');for(const d of[-1,1])m.box(x+d*.60,y+.079,z,.27,.012,.20,'#b3a04c',true);m.box(x,y+.26,z,.065,.45,.065,'#354139',true);yield;}
 });}
 l.job('31 August · colectare cartografiată',1611.621,324.94,function*(){
  const x=1611.621,z=324.94,y=ground(x,z)+.12;l.box(x,y+.51,z,.87,1.02,.72,'#5d7159',true,true);l.box(x,y+1.06,z,.96,.10,.8,'#455d47',true);yield;
 });
 for(const p of mapped.points.filter(p=>p.t.highway==='street_lamp'&&p.p[0]>=1660&&p.p[0]<1725&&p.p[1]>=254&&p.p[1]<=433)){
  const[x,z]=p.p;m.job('iluminat '+p.id,streetRect(x,z,2,2),[],function*(){
   const y=ground(x,z)+.12;m.box(x,y+3.9,z,.13,7.8,.13,'#7b8579',false,true);
   const sign=x<1690?1:-1;m.beam(new T.Vector3(x,y+7.6,z),new T.Vector3(x+sign*2.3,y+8.0,z),.045,'#778575');m.box(x+sign*2.3,y+7.96,z,.62,.11,.27,'#a9b2a1',true);yield;
  });
 }
 m.job('Midtown · lampă dublă fotografiată',streetRect(1653.9,406.6,3,3),[],function*(){
  const x=1653.9,z=406.6,y=ground(x,z)+.12;m.box(x,y+3.7,z,.13,7.4,.13,'#858b7e',false,true);
  for(const sign of[-1,1]){m.beam(new T.Vector3(x,y+7.15,z),new T.Vector3(x+sign*2.9,y+8.0,z),.05,'#90988a');m.box(x+sign*2.9,y+7.96,z,.68,.12,.25,'#b7bca9',true);}yield;
 });
 // Pole offsets avoid mapped pedestrian centerlines. Heights are estimates.
 for(const[x,z,angle]of[[1677.5,291.9,Math.PI/2],[1691.5,295.6,-Math.PI/2],[1693.9,292.7,Math.PI/2],[1707.1,296.3,-Math.PI/2],[1666.3,311.1,0]] as number[][]){
  m.job('semafor '+x,streetRect(x,z,1,1),[],function*(){const y=ground(x,z)+.12;m.box(x,y+1.9,z,.095,3.8,.095,'#536455',false,true);m.box(x,y+3.25,z,.25,.75,.20,'#34473b',true,false,angle);for(let k=0;k<3;k++){const g=new T.CircleGeometry(.074,8);g.rotateY(angle);g.translate(x+Math.sin(angle)*.12,y+3.48-k*.23,z+Math.cos(angle)*.12);m.put(g,['#9b5042','#a79d55','#508668'][k],true);}yield;});
 }
 l.job('Manhattan · margine de parter și jardiniere',1665,340,function*(){
  // Low photographed railings remain behind the clear Ciuflea footway.
  for(const z of[329.5,332,345.5,349,352]){
   const x=1665.65-(z-327)*.046,y=ground(x,z)+.12;l.box(x,y+.19,z,.66,.38,.78,'#948d6b',true,true);l.shrub(x,y+.39,z,.29,.50,.30,'#536e4d');yield;
  }
 });
 m.job('Casa15 · barieră de parcare',streetRect(1641.5,329,3,3),[],function*(){
  const x=1643.5,z=329,y=ground(x,z)+.12;m.box(x,y+.58,z,.40,1.16,.42,'#b1b6a8',true,true);
  // The arm is visual scenery above the access; pedestrians can pass beneath.
  m.beam(new T.Vector3(x,y+1.07,z),new T.Vector3(x-1.25,y+3.65,z),.045,'#c2c7b7');yield;
 });
 const layers=[m,l,infill];
 const customBodies=catalog.filter(b=>CIUFLEA_CUSTOM.includes(b.style));
 const bodyOwners=new Map(customBodies.map((b,i)=>[Number(b.id.slice(1)),{root:m.objects[i],collision:m.collisionObjects[i],replacement:m.replacements.find(r=>r.id===Number(b.id.slice(1)))!}]));
 const groundOwners=new Map(realm.cells.map((c,i)=>[`${c.x}/${c.z}`,{root:l.objects[i],collision:l.collisionObjects[i],x:c.x,z:c.z}]));
 let overrides:AugustCiufleaBodyOverride[]=[],disposed=false;
 const activeBodies=new Set<number>(),activeGround=new Set<string>();
 function physicalActive(root:T.Group,collision:T.Group,on:boolean){
  root.visible=on;
  if(collision.userData.grounded!==on){collision.userData.grounded=on;collision.userData.revision=(collision.userData.revision??0)+1;}
 }
 function applyBodyOverrides(){
  if(disposed)return;
  const nextBodies=new Set<number>(),nextGround=new Set<string>();
  for(const override of overrides){
   if(!override.ready){override.setActive(false);continue;}
   nextBodies.add(override.id);
   for(const[x,z]of override.groundCells)nextGround.add(`${x}/${z}`);
  }
  // Restore only a genuinely completed original job when an override is
  // explicitly withdrawn. Merely having partly flushed meshes is insufficient.
  for(const id of activeBodies)if(!nextBodies.has(id)){
   const owner=bodyOwners.get(id)!;physicalActive(owner.root,owner.collision,owner.replacement.ready);
  }
  for(const key of activeGround)if(!nextGround.has(key)){
   const owner=groundOwners.get(key)!;physicalActive(owner.root,owner.collision,l.readyNear(owner.x,owner.z,.001));
  }
  for(const id of nextBodies){const owner=bodyOwners.get(id)!;physicalActive(owner.root,owner.collision,false);}
  for(const key of nextGround){const owner=groundOwners.get(key)!;physicalActive(owner.root,owner.collision,false);}
  activeBodies.clear();for(const id of nextBodies)activeBodies.add(id);
  activeGround.clear();for(const key of nextGround)activeGround.add(key);
  // The old roots and colliders are inactive before the new group is exposed.
  // Ground ownership reads the same root visibility later in streets.render.
  for(const override of overrides)override.setActive(nextBodies.has(override.id));
 }
 function setBodyOverrides(next:AugustCiufleaBodyOverride[]){
  for(const override of next){
   if(!bodyOwners.has(override.id))throw new Error(`Unknown AugustCiuflea body override ${override.id}`);
   for(const[x,z]of override.groundCells)if(!groundOwners.has(`${x}/${z}`))throw new Error(`Unknown AugustCiuflea ground override ${x}/${z}`);
  }
  for(const previous of overrides)if(!next.includes(previous))previous.setActive(false);
  overrides=next;applyBodyOverrides();
 }
 const replacements=layers.flatMap(v=>v.replacements).map(r=>bodyOwners.has(r.id)?{...r,get ready(){return r.ready||activeBodies.has(r.id);}}:r);
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,setBodyOverrides,applyBodyOverrides,
  get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},
  update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);applyBodyOverrides();},
  dispose(){disposed=true;for(const override of overrides)override.setActive(false);overrides=[];activeBodies.clear();activeGround.clear();for(const v of layers)v.dispose();}};
}
