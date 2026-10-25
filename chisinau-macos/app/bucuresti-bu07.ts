import * as T from 'three';
import realm from '../data/bucuresti-bu07.json';
import catalog from '../data/bucuresti-bu07-buildings.json';
import {createPhotoFrontages, type PhotoBuilding} from './central-infill';
import {streetMesh, streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {bucurestiBu07Architecture} from './bucuresti-bu07-architecture';
import type {XY} from './city-layout';

type Building=PhotoBuilding&{nativeIds:number[];sourceIds?:string[]};
type Patch={rings:number[][][];color:string;kind:number;raised:boolean;role?:string;surfaceOffset?:number};
type Cell={x:number;z:number;coverage:number[][][][];patches:Patch[]};
type Seam={axis?:string;start:number;end:number;bounds:number[];pedestrian:number[];kerb:number[];carriageway:number[]};
type Frontage={name:string;a:XY;b:XY;height:number;color?:string;material?:string;kind?:string;solidHeight?:number};
type FurniturePoint={point:XY;name?:string;height?:number;width?:number;depth?:number;shape?:string;plantForm?:string;angle?:number;heading?:number;color?:string};
type Furniture={drains?:XY[];manholes?:XY[];bins?:FurniturePoint[];planters?:FurniturePoint[];benches?:FurniturePoint[];bollards?:FurniturePoint[];trafficSignalPoles?:FurniturePoint[];crossingSigns?:FurniturePoint[]};
type PreviousBody={chunkKey:string;body:{id:string;rings:XY[][];anchor:XY;height:number;levels:number}};
type Extra={cells:Cell[];previousCoarseBodies:PreviousBody[];permanentGroundCells?:Cell[];seamHeightTransition?:Seam;roadAxes?:Record<string,XY[]>;closedFrontages?:Frontage[];treeForms?:{point:number[];form:string}[];treeMasks?:{x:number;z:number;radius:number}[];photoPoles?:{point:XY;height:number}[];overheadWires?:{path:XY[];height:number}[];streetFurniture?:Furniture;nativeReplacementDependencies?:{id:number;point:XY;radius:number}[];preservedNativeOSMIds?:number[]};

/** București, Alecsandri–Eminescu. Plans are official building polygons.
 * Heights, facade dimensions and unobserved rear details remain estimates.
 * The exact v108 coarse volumes stay visible during staged detailed loading.
 * A complete coarse group, including its retained neighbours, first replaces
 * native bodies. All detailed bodies and colliders then replace it together. */
export function createBucurestiBu07(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean,priorReady:(x:number,z:number,r:number)=>boolean=()=>false){
 const buildings=catalog as unknown as Building[],extra=realm as unknown as Extra;
 const m=streetMesh(scene,'București BUC07 · detalii',ground,loaded);
 const architecture=bucurestiBu07Architecture as (mesh:typeof m,ground:(x:number,z:number)=>number,surface?:(x:number,z:number)=>number)=>ReturnType<typeof bucurestiBu07Architecture>&{customRoof?:(b:PhotoBuilding)=>boolean;detailExtra?:(b:PhotoBuilding)=>Generator<void>};
 const d=architecture(m,ground,ground),a=d.a;
 const customRoof=(b:PhotoBuilding)=>d.customRoof?.(b)??false;
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false,roofRise:customRoof(b)?0:b.roofRise,parts:customRoof(b)?b.parts?.map(p=>({...p,roofRise:0})):b.parts})),'București BUC07 · corpuri cadastrale');
 const l=landscapeLayer(scene,'București BUC07 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 const court=landscapeLayer(scene,'București BUC07 · curte persistentă',ground,loaded,{maxEdge:3});
 const fallback=streetMesh(scene,'București BUC07 · reprezentare v108',ground,loaded);
 // These are the original v108 records, not a new approximate proxy. Keep the
 // cadastral builder's base, roof, colours and conservative window algorithm.
 for(const{body:b}of extra.previousCoarseBodies)fallback.job(b.id,b.rings[0],[],function*(){
  const[p,...holes]=b.rings,y=ground(...b.anchor)+.12,h=b.height;
  fallback.solid(p,h+2,y-2,'#b2ac98',true,holes);yield;
  fallback.solid(p,.12,y+h,'#777d72',false,holes);yield;
  if(h>4.5)for(let i=1;i<p.length;i++){
   const f=fallback.facade(p[i-1],p[i],y);if(f.len<3)continue;
   const bays=Math.max(1,Math.floor(f.len/4.2));
   for(let row=0;row<Math.min(12,b.levels);row++){
    for(let j=0;j<bays;j++)f.panel((j+.5)*f.len/bays,(row+.55)*h/b.levels,.025,Math.min(1.4,f.len/bays*.45),Math.min(1.8,h/b.levels*.5),.02,'#627879',false,1);
    yield;
   }
  }
 });
 function offset(p:Patch,x:number,z:number){
  if(p.surfaceOffset!==undefined)return p.surfaceOffset;
  const seam=extra.seamHeightTransition,basic=p.raised?.14:.035;
  if(!seam||x<seam.bounds[0]-.001||x>seam.bounds[2]+.001||z<seam.bounds[1]-.001||z>seam.bounds[3]+.001)return basic;
  const pair=p.role==='pedestrian'?seam.pedestrian:p.role==='kerb'?seam.kerb:seam.carriageway;
  const t=T.MathUtils.clamp(((seam.axis==='z'?z:x)-seam.start)/(seam.end-seam.start),0,1);
  return pair[0]+(pair[1]-pair[0])*t;
 }
 function cells(layer:typeof l,items:Cell[]){for(const c of items)layer.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* layer.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+offset(p,x,z),true);},c.coverage);}
 cells(l,extra.cells);cells(court,extra.permanentGroundCells??[]);

 // Detail jobs are first and retain the same index as their cadastral body.
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<.65)continue;
   if(d.handles(b,f)){yield* d.detail(b,f);continue;}
   if(b.style==='unconfirmedFront'){yield;continue;}
   a.cornice(f,b.height,b.trim);
   // Conservative rear openings are explicitly estimated. They never become
   // an invented photographed entrance or a traversable interior route.
   if(b.style==='annex'){
    if(b.height>2&&f.len>9){f.window(f.len*.5,1.65,.8,1.0,b.trim,'#748074');yield;}
   }else yield* a.windows(f,b.levels,b.height,Math.max(1,Math.round(f.len/5.4)),1.55,b.trim,'#788178');
   yield;
  }
  if(d.detailExtra)yield* d.detailExtra(b);
 });

 const crown=new T.IcosahedronGeometry(1,1),trunk=new T.CylinderGeometry(.52,1,1,7),conifer=new T.ConeGeometry(1,1,9);
 const treeIndices:number[]=[];
 for(const[index,[x,z,h,r]]of realm.trees.entries()){
  const form=extra.treeForms?.find(t=>Math.hypot(t.point[0]-x,t.point[1]-z)<.5)?.form;
  treeIndices.push(m.objects.length);
  m.job('arbore individual',streetRect(x,z,r*2,r*2),[],function*(){
   const y=ground(x,z),young=form==='sapling',g=trunk.clone(),trunkHeight=h*(young?.72:.52),trunkWidth=young?.065:.29;
   g.scale(trunkWidth,trunkHeight,trunkWidth);g.translate(x,y+trunkHeight/2,z);m.put(g,'#74775f',false,true);
   if(young){
    // Only survey-marked young trees receive the photographed timber supports.
    for(let k=0;k<3;k++){
     const t=k*Math.PI*2/3,tx=x+Math.cos(t)*.39,tz=z+Math.sin(t)*.39,next=t+Math.PI*2/3;
     m.box(tx,y+1.05,tz,.045,2.1,.045,'#aa9673',false,true);
     m.beam(new T.Vector3(tx,y+1.35,tz),new T.Vector3(x+Math.cos(next)*.39,y+1.35,z+Math.sin(next)*.39),.016,'#9e8c69');
    }
    yield;
   }
   if(form==='conifer')for(let k=0;k<5;k++){const g=conifer.clone();g.scale(r*(1-k*.17),h*.40,r*(1-k*.17));g.translate(x,y+h*(.32+k*.135),z);m.put(g,k%2?'#698875':'#5b7967');yield;}
   else for(const[dx,dz,dy,rr]of[[0,0,.62,r],[r*.45,.2,.76,r*.70],[-r*.32,-.35,.83,r*.64],[.2,-.1,.94,r*.43]]){
    const g=crown.clone();g.scale(rr,rr*(.95+(index%3)*.12),rr*.96);g.rotateY(index*.47);g.translate(x+dx,y+h*dy,z+dz);m.put(g,['#6d8750','#758b51','#65824f'][index%3]);yield;
   }
  });
 }
 const poles=[...realm.poles.map(p=>({point:[p[0],p[1]] as XY,height:p[2]??7.7})),...(extra.photoPoles??[]).filter(p=>!realm.poles.some(q=>Math.hypot(p.point[0]-q[0],p.point[1]-q[1])<.8))];
 function towardRoad(x:number,z:number):XY{
  let closest=Infinity,normal:XY=[0,z<469?1:-1];
  for(const path of Object.values(extra.roadAxes??{}))for(let i=1;i<path.length;i++){
   const p=path[i-1],q=path[i],dx=q[0]-p[0],dz=q[1]-p[1],length=dx*dx+dz*dz;
   const t=length?T.MathUtils.clamp(((x-p[0])*dx+(z-p[1])*dz)/length,0,1):0,nx=p[0]+dx*t-x,nz=p[1]+dz*t-z,distance=Math.hypot(nx,nz);
   if(distance>.05&&distance<closest){closest=distance;normal=[nx/distance,nz/distance];}
  }
  return normal;
 }
 for(const pole of poles){const[x,z]=pole.point;m.job('stâlp de iluminat cartografiat',streetRect(x,z,2,2),[],function*(){
  const y=ground(x,z),h=pole.height,[nx,nz]=towardRoad(x,z);
  m.box(x,y+h/2,z,.17,h,.17,'#a1a899',false,true);
  const arm=[[0,-.48],[.28,-.18],[.70,.02],[1.20,.08],[1.70,.06]];
  for(let i=1;i<arm.length;i++)m.beam(new T.Vector3(x+nx*arm[i-1][0],y+h+arm[i-1][1],z+nz*arm[i-1][0]),new T.Vector3(x+nx*arm[i][0],y+h+arm[i][1],z+nz*arm[i][0]),.045,'#84927f');
  m.box(x+nx*1.7,y+h+.01,z+nz*1.7,.28,.12,.72,'#c4c8b7',false,false,Math.atan2(nx,nz));yield;
 });}
 for(const wire of extra.overheadWires??[])for(let i=1;i<wire.path.length;i++){
  const p=wire.path[i-1],q=wire.path[i],len=Math.hypot(q[0]-p[0],q[1]-p[1]),count=Math.max(1,Math.ceil(len/12));
  for(let k=0;k<count;k++){const at=(t:number):XY=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t],start=at(k/count),end=at((k+1)/count);
   m.job('cabluri aeriene observate',[start,end],[],function*(){
    const point=(t:number)=>{const[x,z]=at(t);return new T.Vector3(x,ground(x,z)+wire.height-.12*Math.sin(t*Math.PI),z);};
    m.beam(point(k/count),point((k+1)/count),.014,'#52614d');yield;
   });
  }
 }
 for(const wall of extra.closedFrontages??[])m.job(wall.name,[wall.a,wall.b],[],function*(){
  const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz),count=Math.max(1,Math.ceil(length/2.5)),angle=Math.atan2(-dz,dx),color=wall.color??'#969984';
  const solid=wall.solidHeight??wall.height;
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,x=wall.a[0]+dx*t,z=wall.a[1]+dz*t,y=ground(x,z),w=length/count;
   if(wall.material==='timber-horizontal'){
    // The photographed side fence is boards on posts, not a masonry slab.
    for(const edge of[-.5,.5])m.box(x+dx/count*edge,y+wall.height/2,z+dz/count*edge,.075,wall.height,.075,'#74664f',false,true,angle);
    const rows=Math.max(3,Math.ceil(wall.height/.17)),pitch=wall.height/rows;
    for(let row=0;row<rows;row++)m.box(x,y+pitch*(row+.5),z,w,pitch-.025,.055,color,false,true,angle);
    yield;continue;
   }
   if(wall.material==='metal-panel'){
    // The observed fixed fence is thin profiled sheet metal. Its visible
    // sheet supplies the collision; no masonry volume spans the gate opening.
    m.box(x,y+wall.height/2,z,w,wall.height,.045,color,false,true,angle);
    for(let u=.18;u<w-.10;u+=.22){
     const along=u-w/2,nx=-dz/length,nz=dx/length;
     m.box(x+dx/length*along+nx*.035,y+wall.height/2,z+dz/length*along+nz*.035,.028,wall.height-.05,.035,color,false,false,angle);
    }
    for(const edge of i===count-1?[-.5,.5]:[-.5])m.box(x+dx/count*edge,y+wall.height/2,z+dz/count*edge,.06,wall.height+.04,.075,color,false,true,angle);
    yield;continue;
   }
   if(solid>0)m.box(x,y+solid/2,z,w+.008,solid,.16,color,false,true,angle);
   if(solid<wall.height){
    const f=m.facade([wall.a[0]+dx*i/count,wall.a[1]+dz*i/count],[wall.a[0]+dx*(i+1)/count,wall.a[1]+dz*(i+1)/count],y);
    for(const h of[solid+.08,wall.height-.06])m.box(x,y+h,z,w,.045,.045,color,false,true,angle);
    for(let u=.10;u<w;u+=.17){const p=f.at(u);m.box(p[0],y+(solid+wall.height)/2,p[1],.026,wall.height-solid,.034,color,true,true,angle);}
   }else m.box(x,y+wall.height+.045,z,w+.025,.09,.21,color,false,false,angle);
   yield;
  }
 });

 const furniture=extra.streetFurniture??{};
 for(const[x,z]of furniture.drains??[])m.job('gură de scurgere observată',streetRect(x,z,.6,.7),[],function*(){
  const y=ground(x,z)+.047;m.box(x,y,z,.49,.025,.61,'#56624f');for(let dz=-.24;dz<=.24;dz+=.08)m.box(x,y+.018,z+dz,.43,.018,.018,'#929c84',true);yield;
 });
 for(const[x,z]of furniture.manholes??[])m.job('capac de utilități observat',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.30,.30,.018,16);g.translate(x,ground(x,z)+.047,z);m.put(g,'#74806b');yield;});
 for(const p of furniture.bins??[]){const[x,z]=p.point;m.job(p.name??'coș stradal observat',streetRect(x,z,.7,.7),[],function*(){
  const y=ground(x,z)+.035,h=p.height??.78,w=p.width??.46;
  if(p.shape==='slatted-cylinder'){
   for(let i=0;i<14;i++){
    const t=i*Math.PI*2/14;m.box(x+Math.cos(t)*w*.46,y+h*.51,z+Math.sin(t)*w*.46,.055,h*.90,.035,p.color??'#a79a77',false,true,-t-Math.PI/2);
   }
   for(const dy of[h*.10,h*.87]){
    const g=new T.TorusGeometry(w*.48,.025,5,18);g.rotateX(Math.PI/2);g.translate(x,y+dy,z);m.put(g,'#576252',false,true);
   }
   const base=new T.CylinderGeometry(w*.42,w*.42,.035,14);base.translate(x,y+.09,z);m.put(base,'#485743',false,true);
  }else{m.box(x,y+h/2,z,w,h,w,p.color??'#98a18e',false,true);m.box(x,y+h+.03,z,w+.03,.06,w+.03,'#546453');}
  yield;
 });}
 for(const p of furniture.planters??[]){const[x,z]=p.point;m.job(p.name??'jardinieră observată',streetRect(x,z,1,1),[],function*(){
  const y=ground(x,z)+.035,w=p.width??.70,depth=p.depth??.62,h=p.height??.42,angle=p.angle??0;
  if(p.shape==='rectangular'){
   m.box(x,y+h/2,z,w,h,depth,p.color??'#bcc0ab',false,true,angle);
   m.box(x,y+h+.008,z,w-.10,.025,depth-.10,'#69774f',false,false,angle);
  }else{
   const g=new T.CylinderGeometry(w/2,w*.33,h,10);g.translate(x,y+h/2,z);m.put(g,p.color??'#bcc0ab',false,true);
   const soil=new T.CylinderGeometry(w*.43,w*.43,.025,10);soil.translate(x,y+h+.008,z);m.put(soil,'#69774f');
  }
  if(p.plantForm==='shrub')for(const[dx,dz,dy,r]of[[-.12,.08,.18,.24],[.15,-.07,.24,.27],[0,.06,.39,.24]]){
   const g=crown.clone();g.scale(r,r*.9,r*.82);g.translate(x+dx,y+h+dy,z+dz);m.put(g,'#6f8954');
  }
  yield;
 });}
 for(const p of furniture.bollards??[]){const[x,z]=p.point;m.job(p.name??'bolard observat',streetRect(x,z,.4,.4),[],function*(){
  const y=ground(x,z)+.035,h=p.height??.70,w=p.width??.13,r=p.shape==='sphere-top'?w*.78:0,shaft=h-r*2;
  const g=new T.CylinderGeometry(w*.50,w*.61,shaft,8);g.translate(x,y+shaft/2,z);m.put(g,p.color??'#5c6a5a',false,true);
  if(r){const cap=new T.SphereGeometry(r,10,6);cap.translate(x,y+shaft+r,z);m.put(cap,p.color??'#5c6a5a',false,true);}
  yield;
 });}
 for(const p of furniture.benches??[]){const[x,z]=p.point;m.job(p.name??'bancă observată',streetRect(x,z,2,.9),[],function*(){
  const y=ground(x,z)+.035,angle=p.angle??0,c=Math.cos(angle),s=Math.sin(angle),w=p.width??1.8;
  for(const dx of[-w*.35,w*.35])m.box(x+dx*c,y+.22,z-dx*s,.065,.44,.46,'#4e6051',false,true,angle);
  for(let k=0;k<4;k++)m.box(x+(k-1.5)*.13*s,y+.47,z+(k-1.5)*.13*c,w,.07,.105,p.color??'#8f8466',false,true,angle);
  m.box(x+.22*s,y+.79,z+.22*c,w,.48,.065,p.color??'#8f8466',false,true,angle);yield;
 });}
 function sign(p:FurniturePoint,signal:boolean){const[x,z]=p.point;m.job(p.name??(signal?'semafor observat':'indicator de trecere observat'),streetRect(x,z,1,1),[],function*(){
  const y=ground(x,z)+.035,heading=p.heading??0,h=p.height??(signal?4.8:3.3),f=m.facade([x-.4*Math.cos(heading),z+.4*Math.sin(heading)],[x+.4*Math.cos(heading),z-.4*Math.sin(heading)],y);
  m.box(x,y+h/2,z,.10,h,.10,'#97a08f',false,true);
  if(signal){f.panel(.4,h-.5,.05,.29,.84,.23,'#394638');for(const[i,color]of['#aa5d48','#b3a155','#5e8255'].entries())f.panel(.4,h-.25-i*.25,.18,.17,.17,.025,color);}
  else{f.panel(.4,h-.45,0,.66,.66,.07,'#c4cb65');f.panel(.4,h-.45,.045,.53,.53,.025,'#547c92');a.pediment(f,.4,h-.66,.43,.40,y,'#d4d8c5');}
  yield;
 });}
 for(const p of furniture.trafficSignalPoles??[])sign(p,true);
 for(const p of furniture.crossingSigns??[])sign(p,false);

 type Pair=[T.Group,T.Group];
 const bodyPairs:Pair[]=buildings.flatMap((_,i)=>[[bodies.objects[i],bodies.collisionObjects[i]],[m.objects[i],m.collisionObjects[i]]] as Pair[]).concat(court.objects.map((o,i)=>[o,court.collisionObjects[i]] as Pair));
 const fallbackPairs:Pair[]=fallback.objects.map((o,i)=>[o,fallback.collisionObjects[i]]);
 const treePairs:Pair[]=treeIndices.map(i=>[m.objects[i],m.collisionObjects[i]]);
 const preparedBodies=new Set<T.Group>(),preparedFallback=new Set<T.Group>(),preparedTrees=new Set<T.Group>();
 let active=false,replacementReady=false,treesActive=false,disposed=false;
 function setPair([root,collision]:Pair,on:boolean){root.visible=on;if(collision.userData.grounded!==on){collision.userData.grounded=on;collision.userData.revision=(collision.userData.revision??0)+1;}}
 function remember(pairs:Pair[],prepared:Set<T.Group>){for(const[root,collision]of pairs)if(root.visible&&collision.userData.grounded===true)prepared.add(collision);}
 function activate(){
  remember(bodyPairs,preparedBodies);remember(fallbackPairs,preparedFallback);remember(treePairs,preparedTrees);
  replacementReady=!disposed&&fallbackPairs.every(([,collision])=>preparedFallback.has(collision))&&(extra.nativeReplacementDependencies??[]).every(dep=>priorReady(...dep.point,dep.radius));
  active=replacementReady&&bodyPairs.every(([,collision])=>preparedBodies.has(collision));
  treesActive=!disposed&&treePairs.every(([,collision])=>preparedTrees.has(collision));
  for(const pair of bodyPairs)setPair(pair,active);
  for(const pair of fallbackPairs)setPair(pair,replacementReady&&!active);
  for(const pair of treePairs)setPair(pair,treesActive);
 }
 const retained=new Set(extra.preservedNativeOSMIds??[]),ids=[...new Set(buildings.flatMap(b=>b.nativeIds))].filter(id=>!retained.has(id));
 const replacements=[...ids.map(id=>({id,x:550,z:470,radius:0,get ready(){return replacementReady;}})),...buildings.map((b,i)=>({id:-5600000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return replacementReady;}}))];
 const treeOverrides:{x:number;z:number;height:number;radius:number;texture:number;readonly ready:boolean}[]=[],keys=new Set<string>();
 for(const{x,z,radius}of[...realm.trees.map(([x,z,,radius])=>({x,z,radius})),...(extra.treeMasks??[])]){
  const key=`${x}/${z}/${radius}`;if(keys.has(key))continue;keys.add(key);treeOverrides.push({x,z,height:0,radius,texture:0,get ready(){return treesActive;}});
 }
 const layers=[bodies,m,l,court,fallback];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,instanceOverrides:[],
  entryRoutes:()=>d.entryRoutes(),thresholdRoutes:()=>d.thresholdRoutes(),
  get ready(){return layers.every(v=>v.ready)&&active&&treesActive;},
  readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r))&&(active||buildings.every(b=>Math.hypot(b.anchor[0]-x,b.anchor[1]-z)>r))&&(treesActive||realm.trees.every(([tx,tz])=>Math.hypot(tx-x,tz-z)>r));},
  update(camera:T.PerspectiveCamera,now:number){
   fallback.update(camera,now);l.update(camera,now);court.update(camera,now);activate();
   // Prepare the detailed replacement only after the original complete group
   // is visible. This makes the retained representation a real loading phase.
   if(replacementReady){bodies.update(camera,now);m.update(camera,now);activate();}
  },
  dispose(){disposed=true;active=replacementReady=treesActive=false;for(const v of layers)v.dispose();crown.dispose();trunk.dispose();conifer.dispose();}
 };
}
