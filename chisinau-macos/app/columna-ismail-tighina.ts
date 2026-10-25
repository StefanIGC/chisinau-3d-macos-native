import * as T from 'three';
import catalog from '../data/columna-ismail-tighina-buildings.json';
import realm from '../data/columna-ismail-tighina.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

type ColumnaBuilding=PhotoBuilding&{nativeIds:number[];side:'north'|'south';streetFront:boolean;addressEvidence:{number:string}[]};

/** COL-IT-01: Columna, Tighina → Ismail, both fronts and adjoining bodies.
 * Official plans establish horizontal geometry only. April 2025 public
 * panoramas establish visible elevations; unobserved heights stay explicit
 * estimates in the catalog and reference manifest. */
export function createColumnaIsmailTighina(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as ColumnaBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'Columna COL-IT-01 · corpuri verificate');
 const m=streetMesh(scene,'Columna COL-IT-01 · fațade și mobilier',ground,loaded),a=photoArchitecture(m);
 const l=landscapeLayer(scene,'Columna COL-IT-01 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:720});
 const asphalt='#626964',paver='#a6a79a',curb='#c0c0b2',iron='#3d4941',wire='#4d584e',glass='#50696a';
 const road:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[1210,-341.08],[1412,-342.70],[1412,-353.27],[1210,-351.64],[1210,-341.08]];
 const north:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[1210,-341.08],[1412,-342.70],[1412,-339.47],[1210,-337.85],[1210,-341.08]];
 const south:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[1210,-351.64],[1412,-353.27],[1412,-357.94],[1210,-356.32],[1210,-351.64]];
 const tighina=streetRect(1203.2,-347.4,6.8,49),ismail=streetRect(1425.5,-348.0,27,51);

 // landscapeLayer is part of both renderers now, so the native build consumes
 // these exact online polygons and surface classes instead of a paver-only
 // compatibility copy.
 l.job('carosabil și racorduri',1311,-348,function*(){
  yield* l.surfaceStaged([road],asphalt,0,(x,z)=>ground(x,z)+.052,true);
  yield* l.surfaceStaged([tighina],asphalt,0,(x,z)=>ground(x,z)+.054,true);
  yield* l.surfaceStaged([ismail],asphalt,0,(x,z)=>ground(x,z)+.056,true);
 },[[road],[tighina],[ismail]]);
 l.job('trotuar nord',1311,-338.7,function*(){yield* l.surfaceStaged([north],paver,2,(x,z)=>ground(x,z)+.135,true);},[[north]]);
 l.job('trotuar sud',1311,-356.2,function*(){yield* l.surfaceStaged([south],paver,2,(x,z)=>ground(x,z)+.135,true);},[[south]]);

 // Two one-way lanes. Opaque raised paint avoids coplanar flashing.
 m.job('marcaje rutiere',road,[],function*(){
  for(let x=1218;x<1406;x+=11){const z=-346.14-(x-1210)*.00802,y=ground(x,z)+.074;m.box(x,y,z,5.4,.018,.13,'#d1d0bd');yield;}
  for(const z of[-342.7,-353.15])for(let x=1214;x<1409;x+=7){const zz=z-(x-1210)*.00802;m.box(x,ground(x,zz)+.076,zz,3.4,.018,.11,'#c9c8b7',true);if(x%28===0)yield;}
 });

 function crossing(name:string,a0:XY,b0:XY,alongX:boolean){m.job(name,[a0,b0],[],function*(){
  const n=9;for(let i=0;i<n;i++){const t=(i+.5)/n,x=a0[0]+(b0[0]-a0[0])*t,z=a0[1]+(b0[1]-a0[1])*t,y=ground(x,z)+.082;m.box(x,y,z,alongX?.48:3.15,.018,alongX?3.15:.48,'#dad9c7');yield;}
 });}
 crossing('Tighina · trecere nord',realm.crossings.tighinaNorth[0] as XY,realm.crossings.tighinaNorth[1] as XY,true);
 crossing('Tighina · trecere sud',realm.crossings.tighinaSouth[0] as XY,realm.crossings.tighinaSouth[1] as XY,true);
 crossing('Ismail · trecere peste Columna',realm.crossings.ismailColumna[0] as XY,realm.crossings.ismailColumna[1] as XY,false);
 crossing('Ismail · trecere nord',realm.crossings.ismailNorth[0] as XY,realm.crossings.ismailNorth[1] as XY,true);
 crossing('Ismail · trecere sud',realm.crossings.ismailSouth[0] as XY,realm.crossings.ismailSouth[1] as XY,true);

 // Street-facing elevation only. Rear and courtyard bodies retain complete,
 // conservative shells without invented doors or shopfronts.
 for(const b of buildings.filter(b=>b.streetFront))m.job(b.title+' · elevație',b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,faces=a.faces(b.p as XY[],y);
  if(!faces.length)return;
  const front=faces.reduce((best,f)=>{const z=f.at(f.len/2)[1],bz=best.at(best.len/2)[1];return b.side==='north'?(z<bz?f:best):(z>bz?f:best);});
  if(front.len<2.1)return;
  front.panel(front.len/2,.35,.10,front.len,.70,.20,'#85867a');a.cornice(front,b.height,b.trim);
  const bays=Math.max(1,Math.round(front.len/b.bay)),door=Math.min(front.len-1.0,Math.max(1.0,front.len*(.28+(b.nativeIds[0]%3)*.18)));
  if(b.style==='low-shop'){
   front.panel(front.len/2,1.65,.18,front.len-.45,2.75,.03,glass,false,1);
   for(let u=.25;u<front.len;u+=2.25){front.panel(u,1.68,.25,.065,2.85,.10,'#454d47',true);yield;}
   front.panel(front.len/2,3.35,.32,front.len,.58,.62,b.trim);
   for(let u=.45;u<front.len;u+=.7)front.panel(u,3.34,.66,.34,.13,1.25,(Math.round(u*10)%2)?'#9a4d45':'#d3cfb9',true);
  }else yield* a.windows(front,b.levels,b.height,bays,b.levels===1?2.05:2.0,b.trim,'#6b584b');
  a.door(front,door,b.levels===1?2.75:3.0,Math.min(1.7,front.len*.18),'#675043');
  if(b.addressEvidence.length){front.panel(Math.min(front.len-.35,door+.85),2.15,.44,.43,.31,.05,'#3b6473');front.label(b.addressEvidence[0].number,Math.min(front.len-.35,door+.85),2.07,.24,'#d9d5c2',.48);}
  if(b.style==='historic'){
   for(let u=.5;u<front.len;u+=1.1){front.panel(u,b.height-.52,.32,.22,.36,.30,b.trim,true);yield;}
   front.panel(front.len/2,b.height*.53,.20,front.len,.20,.38,b.trim);
  }
 });

 const crown=new T.IcosahedronGeometry(1,1),trunk=new T.CylinderGeometry(.48,.72,1,7);
 for(const [index,[x,z,h,r]]of realm.trees.entries())m.job('arbore observat',streetRect(x,z,r*2,r*2),[],function*(){
  const y=ground(x,z),stem=trunk.clone();stem.scale(.33,h*.52,.33);stem.translate(x,y+h*.26,z);m.put(stem,'#716d58',false,true);
  for(const [dx,dz,dy,rr]of[[0,0,.66,r],[r*.42,.12,.80,r*.68],[-r*.34,-.18,.84,r*.62],[.1,-.1,.98,r*.42]]){const g=crown.clone();g.scale(rr,rr*.94,rr*.90);g.rotateY(index*.57);g.translate(x+dx,y+h*dy,z+dz);m.put(g,['#66814e','#718850','#5e7a49'][index%3]);yield;}
 });

 for(const [x,z,side]of realm.poles)m.job('stâlp și corp de iluminat',streetRect(x,z,2,2),[],function*(){
  const y=ground(x,z);m.box(x,y+3.9,z,.18,7.8,.18,'#879083',false,true);m.beam(new T.Vector3(x,y+7.45,z),new T.Vector3(x,y+7.75,z+side*1.75),.045,'#7e887c');m.box(x,y+7.68,z+side*1.78,.28,.13,.75,'#c9cdbc');yield;
 });
 for(let i=1;i<realm.poles.length;i++)m.job('cabluri aeriene '+i,[realm.poles[i-1].slice(0,2) as XY,realm.poles[i].slice(0,2) as XY],[],function*(){
  const p=realm.poles[i-1],q=realm.poles[i];for(const offset of[-.26,0,.26])m.beam(new T.Vector3(p[0],ground(p[0],p[1])+7.25,p[1]+offset),new T.Vector3(q[0],ground(q[0],q[1])+7.25,q[1]+offset),.012,wire);yield;
 });

 for(const [x,z,w,side]of realm.gates as [number,number,number,'north'|'south'][])m.job('poartă și stâlpi de curte',streetRect(x,z,w,1),[],function*(){
  const y=ground(x,z),depth=side==='north'?-.18:.18;m.box(x-w/2,y+1.05,z,.18,2.1,.20,'#817869',false,true);m.box(x+w/2,y+1.05,z,.18,2.1,.20,'#817869',false,true);
  for(const d of[-1,1]){const u=x+d*w*.26;m.box(u,y+.9,z+depth,w*.46,1.72,.055,iron,true);for(let q=-w*.20;q<=w*.20;q+=.24)m.box(u+q,y+.9,z+depth*1.1,.025,1.65,.035,'#596158',true);}yield;
 });

 // Low chains follow the photographed garden edges but remain non-colliding,
 // preserving a continuous walkable band on both pavements.
 for(const [z,side]of[[-338.25,1],[-356.55,-1]] as [number,number][])for(let x=1226;x<1401;x+=24)m.job('bolarzi cu lanț',[[x,z],[x+9,z]],[],function*(){
  const y=ground(x,z);for(const xx of[x,x+3,x+6,x+9]){m.box(xx,y+.42,z,.09,.84,.09,iron,true);if(xx<x+9){const a0=new T.Vector3(xx,y+.62,z),b0=new T.Vector3(xx+3,y+.62,z);m.beam(a0,b0,.022,iron);}}yield;
 });

 for(const [x,z]of realm.drains)m.job('gură de scurgere',streetRect(x,z,.65,.85),[],function*(){const y=ground(x,z)+.078;m.box(x,y,z,.58,.025,.76,'#525e54');for(let dz=-.3;dz<=.3;dz+=.09)m.box(x,y+.018,z+dz,.50,.018,.018,'#949b8c',true);yield;});
 for(const [x,z]of realm.manholes)m.job('capac utilități',streetRect(x,z,.9,.9),[],function*(){const g=new T.CylinderGeometry(.34,.34,.018,18);g.translate(x,ground(x,z)+.079,z);m.put(g,'#6b7568');yield;});
 for(const [x,z,color]of[[1335.2,-356.2,'#b9a931'],[1336.1,-356.2,'#777d72']] as [number,number,string][])m.job('container stradal observat',streetRect(x,z,.75,.75),[],function*(){const y=ground(x,z);m.box(x,y+.53,z,.65,1.02,.62,color,false,true);m.box(x,y+1.08,z-.04,.70,.12,.66,'#50594f');yield;});

 function crossingSign(x:number,z:number,rotation:number){m.job('indicator trecere pietoni',streetRect(x,z,1.2,1.2),[],function*(){const y=ground(x,z);m.box(x,y+1.75,z,.10,3.5,.10,'#7f887c',false,true);const f=m.facade([x-.38*Math.cos(rotation),z+.38*Math.sin(rotation)],[x+.38*Math.cos(rotation),z-.38*Math.sin(rotation)],y);f.panel(.38,2.65,.12,.68,.68,.04,'#c3c643');f.panel(.38,2.65,.15,.52,.52,.035,'#4f7890');yield;});}
 crossingSign(1209.6,-339.0,0);crossingSign(1209.4,-356.5,Math.PI);crossingSign(1408.8,-340.5,0);crossingSign(1409.0,-355.8,Math.PI);

 const treeOverrides=realm.trees.map(([x,z,_h,r])=>({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,20)&&l.readyNear(x,z,30);}}));
 const layers=[bodies,m,l];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:bodies.replacements,treeOverrides,
  get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();crown.dispose();trunk.dispose();}};
}
