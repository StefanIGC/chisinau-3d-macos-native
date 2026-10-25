import * as T from 'three';
import realm from '../data/august-tolstoi.json';
import catalog from '../data/august-tolstoi-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {addTolstoiArchitecture,TOLSTOI_CUSTOM} from './tolstoi-architecture';
import type {XY} from './city-layout';

/** Ismail–Lev Tolstoi, using the existing preparation and collider lifecycle. */
export function createAugustTolstoi(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'31 August · Ismail–Tolstoi',ground,loaded);
 addTolstoiArchitecture(m,catalog as PhotoBuilding[]);
 const l=landscapeLayer(scene,'Ismail–Tolstoi · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const infill=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!TOLSTOI_CUSTOM.includes(b.style)) as PhotoBuilding[],'Ismail–Tolstoi · fronturi');
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
  for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.12:.035),true);
 },c.coverage);
 for(let k=0;k<realm.separators.length;k+=10){const group=realm.separators.slice(k,k+10);m.job('pistă protejată '+k,group as XY[],[],function*(){
  for(const[x,z]of group){const y=ground(x,z)+.035;m.box(x,y+.037,z,1.65,.075,.24,'#37453d');for(const d of[-1,1])m.box(x+d*.60,y+.079,z,.27,.012,.20,'#b3a04c',true);m.box(x,y+.26,z,.065,.45,.065,'#354139',true);for(const h of[.24,.39])m.box(x,y+h,z,.07,.07,.07,'#c4b052',true);yield;}
 });}
 l.job('31 August 25 · punct de colectare',1495.682,322.217,function*(){
  const x=1495.682,z=322.217,y=ground(x,z)+.12;l.box(x,y+.51,z,.87,1.02,.72,'#5d7159',true,true);l.box(x,y+1.06,z,.96,.10,.8,'#455d47',true);yield;
 });
 l.job('31 August · borne de trotuar',1489,322,function*(){
  for(const x of[1430,1435,1440,1445,1450,1455,1460,1465,1470,1475,1480,1485,1490,1508,1513,1518,1523,1528,1545,1550,1555]){
   const z=322.03,y=ground(x,z)+.12;l.cylinder(x,y+.39,z,.036,.036,.78,'#adb8ac',true,6,true);l.cylinder(x,y+.64,z,.038,.038,.11,'#a35849',true,6);yield;
  }
 });
 l.job('Flori25 · mese înguste',1494,325.6,function*(){
  for(const x of[1493.65,1495.05]){const z=325.65,y=ground(x,z)+.12;l.box(x,y+.96,z,.72,.045,.28,'#424b3d',true,true);l.box(x,y+.47,z,.045,.94,.045,'#3e473a',true);l.box(x,y+.025,z,.40,.05,.28,'#3e473a',true);yield;}
 });
 m.job('Ismail · stâlp stradal cartografiat',streetRect(1425.714,302.219,2,2),[],function*(){
  const x=1425.714,z=302.219,y=ground(x,z);m.box(x,y+3.6,z,.16,7.2,.16,'#838b7b',false,true);
  m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x-2.2,y+7.3,z),.045,'#687667');m.box(x-2.3,y+7.25,z,.62,.12,.27,'#a5aea0',true);yield;
 });
 l.job('Bella Vita · curte pavată',1525,359,function*(){
  // Wall and furniture are visible in Glemus90_6b. Their unsurveyed positions
  // fit the complete mapped rear wings; the photographed passage is the entry.
  for(const [a,b]of[[[1516.5,334.65],[1531.4,334.65]],[[1516.5,335],[1516.5,373.8]],[[1516.5,374],[1522.4,374]],[[1522.4,374],[1522.4,387.8]]] as XY[][]){
   const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2),angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]),len=Math.hypot(b[0]-a[0],b[1]-a[1]);
   for(let k=0;k<n;k++){const t=(k+.5)/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=ground(x,z)+.12;l.box(x,y+1.06,z,len/n,2.12,.18,'#c1c9b9',false,true,angle);l.box(x,y+.16,z,len/n,.32,.20,'#535f52',true,false,angle);yield;}
  }
  for(const z of[341,353,365]){
   const x=1517.4,y=ground(x,z)+.12;for(let k=0;k<5;k++)l.box(x-.28+k*.13,y+.46,z,.095,.08,1.85,'#536152',true,true);
   for(const dz of[-.72,.72])l.box(x,y+.22,z+dz,.50,.44,.055,'#3e4d40',true);l.box(x-.32,y+.82,z,.08,.55,1.85,'#4b594b',true);yield;
   const xx=1517.6,zz=z+4,yy=ground(xx,zz)+.12;l.box(xx,yy+.26,zz,.88,.52,1.45,'#b8ad90',true,true);l.box(xx,yy+.54,zz,.78,.05,1.35,'#696548',true);for(const d of[-.43,0,.43]){l.shrub(xx,yy+.55,zz+d,.28,.17,.24,'#5d704d');l.shrub(xx+.10,yy+.74,zz+d,.11,.08,.09,'#b87980');}yield;
  }
 });
 const layers=[m,l,infill];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),
  get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
