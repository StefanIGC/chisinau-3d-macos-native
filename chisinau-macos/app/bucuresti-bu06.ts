import * as T from 'three';
import realm from '../data/bucuresti-bu06.json';
import catalog from '../data/bucuresti-bu06-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {bucurestiBu06Architecture} from './bucuresti-bu06-architecture';
import type {AugustCiufleaBodyOverride} from './august-ciuflea';
import type {XY} from './city-layout';

type GroundPatch={rings:number[][][];color:string;kind:number;raised:boolean;role?:string;surfaceOffset?:number};
type GroundCell={x:number;z:number;coverage:number[][][][];patches:GroundPatch[]};
type SeamTransition={axis:'x'|'z';start:number;end:number;bounds:number[];pedestrian:number[];kerb:number[];carriageway:number[]};
type PreviousOwnerHandoff={id:number;priorSector:string;priorBodyId:string;newSourceId:string;previousGroundCells:XY[];cells:GroundCell[]};
type ClosedFrontage={name:string;a:XY;b:XY;height:number;color?:string;material?:string;kind?:string};
type NativeDependency={id:number;point:XY;radius:number;newSourceIds?:string[]};
type SurfaceEnvelope={sourceId:string;requiredGroundCells?:XY[];nativeIds?:number[]};
type StreetFurniture={
 pedestrianFences?:{name:string;p:XY[];height:number}[];
 parkingBarriers?:{name:string;a:XY;b:XY}[];
 separatorIslands?:{name:string;p:XY[];signPoint:XY}[];
 ledBoards?:{name:string;point:XY;width:number;height:number;front:XY}[];
 trafficSignalPoles?:{point:XY}[];
 manholes?:{point:XY;radius:number}[];
};

/** Lev Tolstoi–Ciuflea/Dacia. Official polygons, estimated visible building
 * parts and the open Nr1 court remain separate source concepts. The Midtown
 * correction is a complete body/ground transaction with its preceding owner. */
export function createBucurestiBu06(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean,priorReady:(x:number,z:number,r:number)=>boolean=()=>false){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[];sourceIds?:string[]})[];
 const extra=realm as unknown as {
  cells:GroundCell[];seamHeightTransitions?:SeamTransition[];previousOwnerHandoffs?:PreviousOwnerHandoff[];
  closedFrontages?:ClosedFrontage[];treeForms?:{point:XY;form:string}[];treeMasks?:{x:number;z:number;radius:number}[];
  nativeReplacementDependencies?:NativeDependency[];surfaceEnvelopeBodies?:SurfaceEnvelope[];
  shrubs?:number[][];hedges?:{p:XY[];height:number;width:number}[];streetFurniture?:StreetFurniture;
 };
 const surfaceGround=ground;
 const m=streetMesh(scene,'București BUC06 · detalii',ground,loaded);
 const architecture=bucurestiBu06Architecture as (mesh:typeof m,ground:(x:number,z:number)=>number,surface?:(x:number,z:number)=>number)=>ReturnType<typeof bucurestiBu06Architecture>&{customRoof?:(b:PhotoBuilding)=>boolean;detailExtra?:(b:PhotoBuilding)=>Generator<void>};
 const d=architecture(m,ground,surfaceGround),a=d.a;
 const customRoof=(b:PhotoBuilding)=>d.customRoof?.(b)??false;
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false,roofRise:customRoof(b)?0:b.roofRise,parts:customRoof(b)?b.parts?.map(part=>({...part,roofRise:0})):b.parts})),'București BUC06 · corpuri cadastrale');
 const l=landscapeLayer(scene,'București BUC06 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 const court=landscapeLayer(scene,'București BUC06 · curte persistentă',ground,loaded,{maxEdge:3});
 const courtKeys=new Set((extra.surfaceEnvelopeBodies??[]).flatMap(e=>e.requiredGroundCells??[]).map(([x,z])=>`${x}/${z}`));
 function offset(p:GroundPatch,x:number,z:number){
  if(p.surfaceOffset!==undefined)return p.surfaceOffset;
  for(const t of extra.seamHeightTransitions??[]){
   const[minX,minZ,maxX,maxZ]=t.bounds;
   if(x<minX-.001||x>maxX+.001||z<minZ-.001||z>maxZ+.001)continue;
   const pair=p.role==='pedestrian'?t.pedestrian:p.role==='kerb'?t.kerb:t.carriageway;
   const u=T.MathUtils.clamp(((t.axis==='x'?x:z)-t.start)/(t.end-t.start),0,1);
   return pair[0]+(pair[1]-pair[0])*u;
  }
  return p.raised?.14:.035;
 }
 function addCells(layer:ReturnType<typeof landscapeLayer>,cells:GroundCell[]){
  for(const c of cells)layer.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
   for(const p of c.patches)yield* layer.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>surfaceGround(x,z)+offset(p,x,z),true);
  },c.coverage);
 }
 addCells(l,extra.cells.filter(c=>!courtKeys.has(`${c.x}/${c.z}`)));
 addCells(court,extra.cells.filter(c=>courtKeys.has(`${c.x}/${c.z}`)));

 // Building details are registered first, in the same order as the body
 // jobs. This allows a corrected owner to include its complete architecture.
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<.65)continue;
   if(d.handles(b,f)){yield* d.detail(b,f);continue;}
   if(b.style==='unconfirmedFront'){yield;continue;}
   a.cornice(f,b.height,b.trim);
   if(b.style==='annex'){
    if(b.height>2&&f.len>9){f.window(f.len*.5,1.65,.8,1.0,b.trim,'#737c71');yield;}
   }else{
    // Unseen side/rear openings are limited estimates, never registered as
    // photographed entrances or used to infer an interior pedestrian route.
    yield* a.windows(f,b.levels,b.height,Math.max(1,Math.round(f.len/5.4)),1.55,b.trim,'#788178');
   }
   yield;
  }
  if(d.detailExtra)yield* d.detailExtra(b);
 });

 const crown=new T.IcosahedronGeometry(1,1),trunk=new T.CylinderGeometry(.52,1,1,7);
 const treeForms=new Map((extra.treeForms??[]).map(t=>[t.point.join('/'),t.form]));
 for(const[index,[x,z,h,r]]of realm.trees.entries())m.job('arbore individual',streetRect(x,z,r*2,r*2),[],function*(){
  const y=surfaceGround(x,z),form=treeForms.get([x,z].join('/'))??'broadleaf';
  const conifer=/spruce|conifer/.test(form),stem=h<5?.12:.29,stemHeight=conifer?h*.81:h*.52;
  const g=trunk.clone();g.scale(stem,stemHeight,stem);g.translate(x,y+stemHeight/2,z);m.put(g,'#77796c',false,true);
  if(conifer){
   const blue=form==='blue-spruce',color=blue?'#7c9891':'#668065';
   for(let k=0;k<5;k++){
    const height=h*(.39-k*.035),radius=r*(1-k*.17),bottom=y+h*(.12+k*.145);
    const cone=new T.ConeGeometry(radius,height,9,1);cone.rotateY(index*.39+k*.31);cone.translate(x+(k%2?.07:-.04),bottom+height/2,z+(k%2?-.04:.06));m.put(cone,color);yield;
   }
   return;
  }
  const lobes=h<5?[[0,0,.70,r],[.15,-.1,.86,r*.72]]:[[0,0,.62,r],[r*.43,.2,.76,r*.70],[-r*.31,-.35,.83,r*.64],[.2,-.1,.94,r*.43]];
  for(const[dx,dz,dy,rr]of lobes){const g=crown.clone();g.scale(rr,rr*(.95+(index%3)*.12),rr*.96);g.rotateY(index*.47);g.translate(x+dx,y+h*dy,z+dz);m.put(g,['#6e8457','#7b8b59','#657c51','#7c8758'][index%4]);yield;}
 });

 for(const[index,[x,z,h,rx,rz]]of(extra.shrubs??[]).entries())m.job('mediană · arbuști observați',streetRect(x,z,rx*2,rz*2),[],function*(){
  for(const[dx,dz,scale]of[[0,0,1],[-rx*.45,rz*.10,.68],[rx*.39,-rz*.25,.72]]){
   const g=crown.clone();g.scale(rx*scale,h*.57*scale,rz*scale);g.rotateY(index*.31);g.translate(x+dx,ground(x,z)+h*.54,z+dz);m.put(g,'#70834f');yield;
  }
 });
 for(const hedge of extra.hedges??[])for(let i=1;i<hedge.p.length;i++){
  const p=hedge.p[i-1],q=hedge.p[i],length=Math.hypot(q[0]-p[0],q[1]-p[1]);
  m.job('mediană · gard viu observat',[p,q],[],function*(){
   const n=Math.max(1,Math.ceil(length/.65));
   for(let j=0;j<=n;j++){
    const t=j/n,x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t,g=crown.clone();
    g.scale(hedge.width*.65,hedge.height*(.48+(j%3)*.035),hedge.width*.65);g.rotateY(j*.47);g.translate(x,ground(x,z)+hedge.height*.52,z);m.put(g,j%2?'#76884f':'#687e49');yield;
   }
  });
 }

 const axes=realm.roadAxes as unknown as Record<string,XY[]>;
 function nearestAxis(x:number,z:number){
  let best={x,z,distance:Infinity};
  for(const axis of Object.values(axes))for(let i=1;i<axis.length;i++){
   const p=axis[i-1],q=axis[i],dx=q[0]-p[0],dz=q[1]-p[1],t=T.MathUtils.clamp(((x-p[0])*dx+(z-p[1])*dz)/(dx*dx+dz*dz||1),0,1);
   const xx=p[0]+dx*t,zz=p[1]+dz*t,distance=Math.hypot(xx-x,zz-z);if(distance<best.distance)best={x:xx,z:zz,distance};
  }
  return best;
 }
 for(const[x,z]of realm.poles)m.job('stâlp cartografiat · lampă și consolă',streetRect(x,z,2,2),[],function*(){
  const y=ground(x,z),near=nearestAxis(x,z),distance=Math.max(.01,near.distance),ux=(near.x-x)/distance,uz=(near.z-z)/distance;
  const pole=new T.CylinderGeometry(.105,.18,8.3,9);pole.translate(x,y+4.15,z);m.put(pole,'#a7aaa4',false,true);
  const points=[[0,7.62],[.55,8.08],[1.35,8.20],[2.08,8.12]].map(([v,h])=>new T.Vector3(x+ux*v,y+h,z+uz*v));
  m.put(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.039,5,false),'#939d91');
  m.box(x+ux*2.08,y+8.06,z+uz*2.08,.65,.12,.26,'#c2ccbd',false,false,-Math.atan2(uz,ux));
  const arm=Math.min(6.5,Math.max(3.2,distance*.72));
  m.beam(new T.Vector3(x,y+6.96,z),new T.Vector3(x+ux*arm,y+6.91,z+uz*arm),.052,'#7c8879',false);
  for(const t of[.37,.70,.93])m.beam(new T.Vector3(x+ux*arm*t,y+6.92,z+uz*arm*t),new T.Vector3(x+ux*arm*t,y+6.33,z+uz*arm*t),.018,'#586452');
  m.beam(new T.Vector3(x,y+6.96,z),new T.Vector3(near.x,ground(near.x,near.z)+6.3,near.z),.012,'#505950');yield;
 });
 // Wires use the measured road axes. At x1615 the two București endpoints
 // are exactly the preceding BUC05 endpoints (469.497 and472.497).
 for(const[name,axis]of Object.entries(axes))for(let i=1;i<axis.length;i++){
  const p=axis[i-1],q=axis[i],length=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.max(1,Math.ceil(length/12));
  for(let j=0;j<n;j++){
   const a0:XY=[p[0]+(q[0]-p[0])*j/n,p[1]+(q[1]-p[1])*j/n],b0:XY=[p[0]+(q[0]-p[0])*(j+1)/n,p[1]+(q[1]-p[1])*(j+1)/n];
   m.job(name+' · fire de contact',[a0,b0],[],function*(){
    for(const shift of name==='bucuresti'?[-2.84,.16]:[-1.5,1.5]){
     const a:XY=name==='bucuresti'?[a0[0],a0[1]+shift]:[a0[0]+shift,a0[1]],b:XY=name==='bucuresti'?[b0[0],b0[1]+shift]:[b0[0]+shift,b0[1]];
     m.beam(new T.Vector3(a[0],ground(...a)+6.3,a[1]),new T.Vector3(b[0],ground(...b)+6.3,b[1]),.014,'#505950');
    }
    yield;
   });
  }
 }

 const furniture=extra.streetFurniture??{};
 for(const cover of furniture.manholes??[])m.job('București · capac observat, poziție estimată',streetRect(...cover.point,cover.radius*2,cover.radius*2),[],function*(){
  const[x,z]=cover.point,g=new T.CylinderGeometry(cover.radius,cover.radius,.012,20);
  // Observed covers over the retained BUC05 roadway, whose offset is+.035.
  // The top at+.047 stays above that floor without a second ground owner.
  g.translate(x,ground(x,z)+.041,z);m.put(g,'#6c7168');yield;
 });
 function solidBeam(a:T.Vector3,b:T.Vector3,r:number,color:string){
  const direction=b.clone().sub(a),g=new T.CylinderGeometry(r,r,direction.length(),6);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);m.put(g,color,true,true);
 }
 for(const fence of furniture.pedestrianFences??[])for(let i=1;i<fence.p.length;i++){
  const p=fence.p[i-1],q=fence.p[i],length=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.max(1,Math.ceil(length/2.4));
  m.job(fence.name+' · segment '+i,[p,q],[],function*(){
   const point=(t:number,h:number)=>{const x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t;return new T.Vector3(x,ground(x,z)+.035+h,z);};
   for(let j=0;j<=n;j++){const v=point(j/n,fence.height/2);m.box(v.x,v.y,v.z,.045,fence.height,.045,'#5f6a55',true,true);yield;}
   for(const h of[.15,fence.height-.06])solidBeam(point(0,h),point(1,h),.019,'#616b59');
   for(let j=0;j<n;j++){
    const t=(j+.5)/n,dt=Math.min(.37/length,.40/n),middle=fence.height*.52;
    for(const[a,b]of[[point(t,middle-.32),point(t-dt,middle)],[point(t-dt,middle),point(t,middle+.32)],[point(t,middle+.32),point(t+dt,middle)],[point(t+dt,middle),point(t,middle-.32)]])solidBeam(a,b,.017,'#626d59');
    yield;
   }
  });
 }
 for(const barrier of furniture.parkingBarriers??[]){
  const colliderIndex=m.collisionObjects.length;
  m.job(barrier.name,[barrier.a,barrier.b],[],function*(){
  const a=barrier.a,b=barrier.b,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),y=ground(...a)+.035;
  m.box(a[0],y+.58,a[1],.40,1.16,.42,'#e0e0d6',false,true);
  m.box(a[0],y+1.18,a[1],.44,.08,.46,'#bcc3b5');
  // The photographed boom is down. Only the visible boom and pedestal
  // collide; there is no invisible gate plane across the pedestrian route.
  const n=Math.max(1,Math.ceil(length/.55));
  for(let j=0;j<n;j++){
   const t=(j+.5)/n,x=a[0]+dx*t,z=a[1]+dz*t;m.box(x,y+1.03,z,length/n,.075,.09,j%2?'#b84f45':'#e5e4da',false,true,angle);yield;
  }
  });
  // A waist-high thin boom falls between the ordinary fixed-height probes.
  // Opt in to real full-height triangle checks; never add an invisible plane.
  m.collisionObjects[colliderIndex].userData.fullHeightObstacle=true;
 }
 for(const island of furniture.separatorIslands??[])m.job(island.name+' · indicator ocolire',island.p,[],function*(){
  const[x,z]=island.signPoint,y=ground(x,z)+.14;
  m.box(x,y+1.05,z,.065,2.1,.065,'#7b8475',false,true);
  const f=m.facade([x,z-.24],[x,z+.24],y);
  f.panel(.24,.70,.035,.38,1.1,.06,'#ede7dc');
  for(const h of[.35,.70,1.05]){
   const stripe=new T.BoxGeometry(.39,.12,.023);stripe.rotateZ(-Math.PI/4);stripe.rotateY(-Math.PI/2);stripe.translate(x-.052,y+h,z);m.put(stripe,'#b55449');
  }
  const disc=new T.CylinderGeometry(.30,.30,.05,20);disc.rotateZ(Math.PI/2);disc.translate(x-.03,y+1.94,z);m.put(disc,'#2b68a0');
  const vertices=[[-.13,.14],[-.04,.18],[.12,-.05],[.19,.01],[.19,-.18],[0,-.18],[.06,-.11]].flatMap(([u,v])=>[x-.062,y+1.94+v,z+u]);
  const shape=new T.Shape();for(let i=0;i<vertices.length;i+=3){const u=vertices[i+2]-z,v=vertices[i+1]-y-1.94;i?shape.lineTo(u,v):shape.moveTo(u,v);}shape.closePath();
  const arrow=new T.ShapeGeometry(shape);arrow.rotateY(-Math.PI/2);arrow.translate(x-.064,y+1.94,z);m.put(arrow,'#eeeede');yield;
 });
 for(const board of furniture.ledBoards??[])m.job('Ciuflea · LED '+board.name,streetRect(...board.point,2,2),[],function*(){
  const[x,z]=board.point,y=ground(x,z)+.035,base=3.3,center=base+board.height/2;
  const pole=new T.CylinderGeometry(.19,.23,center,10);pole.translate(x,y+center/2,z);m.put(pole,'#a3aba1',false,true);
  const normal=new T.Vector2(...board.front).normalize(),ux=normal.y,uz=-normal.x;
  const f=m.facade([x-ux*board.width/2,z-uz*board.width/2],[x+ux*board.width/2,z+uz*board.width/2],y);
  f.panel(board.width/2,center,0,board.width+.16,board.height+.16,.27,'#555f59');
  f.panel(board.width/2,center,.16,board.width,board.height,.025,'#263a43');
  // Neutral display: no temporary advertisement or invented sign wording.
  yield;
 });

 function signalHead(x:number,y:number,z:number,heading:number,pedestrian=false){
  const width=pedestrian?.22:.29,height=pedestrian?.49:.80;
  m.box(x,y,z,width,height,.21,'#364238',false,false,heading);
  const n=pedestrian?2:3;
  for(let k=0;k<n;k++){
   const g=new T.CircleGeometry(pedestrian?.062:.080,10);g.rotateY(heading);g.translate(x+Math.sin(heading)*.113,y+height*.31-k*(height*.62/(n-1)),z+Math.cos(heading)*.113);
   m.put(g,pedestrian?['#b65c49','#5d9463'][k]:['#b65c49','#b7a156','#5d9463'][k]);
  }
 }
 for(const pole of furniture.trafficSignalPoles??[]){
  const[x,z]=pole.point,outer=x<1667||x>1713;
  m.job('Ciuflea · semafor observat',streetRect(x,z,2,2),[],function*(){
   const y=ground(x,z)+.035;
   if(outer){
    const direction=x<1690?1:-1,length=9.0;
    const points=[new T.Vector3(x,y,z),new T.Vector3(x,y+5.45,z),new T.Vector3(x+direction*.55,y+6.70,z),new T.Vector3(x+direction*2.0,y+7.02,z),new T.Vector3(x+direction*length,y+7.02,z)];
    m.put(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.072,7,false),'#a2aca1',false,true);
    for(const reach of[4.7,8.0])signalHead(x+direction*reach,y+6.42,z,z<475?0:Math.PI);
    signalHead(x,y+2.85,z+(z<475?.14:-.14),z<475?0:Math.PI);
   }else{
    const g=new T.CylinderGeometry(.048,.062,3.35,8);g.translate(x,y+1.675,z);m.put(g,'#909c8e',false,true);
    signalHead(x+(x<1690?-.13:.13),y+2.62,z,x<1690?-Math.PI/2:Math.PI/2,true);
   }
   yield;
  });
 }
 m.job('București · consolă curbată de semafor',streetRect(1657.4555,456.2624,2,2),[],function*(){
  const x=1657.4555,z=456.2624,y=ground(x,z),length=13.6;
  const path=[new T.Vector3(x,y+4.9,z),new T.Vector3(x,y+6.55,z+.55),new T.Vector3(x,y+7.03,z+2.2),new T.Vector3(x,y+7.03,z+length)];
  m.put(new T.TubeGeometry(new T.CatmullRomCurve3(path),16,.065,7,false),'#a2aca1');
  for(const reach of[8.8,12.9])signalHead(x,y+6.43,z+reach,-Math.PI/2);yield;
 });
 m.job('Intersecție sud · utilități pe stâlp observate',streetRect(1642.2002,493.7759,2,2),[],function*(){
  const x=1642.2002,z=493.7759,y=ground(x,z);
  m.box(x-.35,y+1.22,z-.12,.55,.80,.42,'#a8b0a3',false,true);m.box(x+.30,y+1.30,z-.10,.42,.95,.40,'#a4ada0',false,true);
  m.box(x+.12,y+8.42,z,.26,1.06,.18,'#adb7a6');
  m.beam(new T.Vector3(x+.12,y+8.85,z),new T.Vector3(x+.12,y+9.50,z),.012,'#6e7c69');yield;
 });

 // Midtown's seven affected old cells are rebuilt in a permanent group.
 // The ordinary BUC06 street cells above remain independently evictable.
 const handoffLayers=(extra.previousOwnerHandoffs??[]).map(h=>{
  const fixed=landscapeLayer(scene,`București BUC06 · corecție ${h.id}`,ground,loaded,{maxEdge:2.5});
  addCells(fixed,h.cells);
  const indices=buildings.flatMap((b,i)=>(b.id.replace(/\/\d+$/,'')===h.newSourceId||b.sourceIds?.includes(h.newSourceId))?[i]:[]);
  if(!indices.length)throw new Error(`Missing corrected body for ${h.newSourceId}`);
  const pairs=indices.flatMap(i=>[[bodies.objects[i],bodies.collisionObjects[i]],[m.objects[i],m.collisionObjects[i]]] as [T.Group,T.Group][]).concat(fixed.objects.map((root,i)=>[root,fixed.collisionObjects[i]]));
  return{source:h,layer:fixed,pairs,prepared:new Set<T.Group>(),active:false};
 });
 let disposed=false;
 // A native Nr1 shell spans several bodies and the open court. Its old
 // representation must remain alone while any part or retained rear annex
 // is pending; showing the new bodies independently would overlap it.
 const courtNativeIds=new Set((extra.surfaceEnvelopeBodies??[]).flatMap(e=>e.nativeIds??[]));
 const courtSourceIds=new Set((extra.surfaceEnvelopeBodies??[]).map(e=>e.sourceId));
 for(const b of buildings)if(b.nativeIds.some(id=>courtNativeIds.has(id)))courtSourceIds.add(b.id.replace(/\/\d+$/,''));
 for(const dep of extra.nativeReplacementDependencies??[])if(dep.newSourceIds?.some(id=>courtSourceIds.has(id)))for(const id of dep.newSourceIds)courtSourceIds.add(id);
 const courtIndices=buildings.flatMap((b,i)=>courtSourceIds.has(b.id.replace(/\/\d+$/,''))?[i]:[]);
 const courtPairs=courtIndices.flatMap(i=>[[bodies.objects[i],bodies.collisionObjects[i]],[m.objects[i],m.collisionObjects[i]]] as [T.Group,T.Group][]).concat(court.objects.map((root,i)=>[root,court.collisionObjects[i]]));
 const courtPrepared=new Set<T.Group>();
 let courtActive=courtPairs.length===0;
 function setPair(root:T.Group,collision:T.Group,on:boolean){
  root.visible=on;
  if(collision.userData.grounded!==on){collision.userData.grounded=on;collision.userData.revision=(collision.userData.revision??0)+1;}
 }
 function enforceHandoffs(){
  for(const h of handoffLayers)for(const[root,collision]of h.pairs){
   // A partially flushed job has children but no completed/grounded root.
   // Remember completion before hiding it, since this group never evicts.
   if(root.visible&&collision.userData.grounded===true)h.prepared.add(collision);
   setPair(root,collision,h.active&&h.prepared.has(collision));
  }
  for(const[root,collision]of courtPairs)if(root.visible&&collision.userData.grounded===true)courtPrepared.add(collision);
  courtActive=!disposed&&courtPairs.every(([,collision])=>courtPrepared.has(collision))&&(extra.nativeReplacementDependencies??[]).every(dep=>!dep.newSourceIds?.some(id=>courtSourceIds.has(id))||priorReady(...dep.point,dep.radius));
  for(const[root,collision]of courtPairs)setPair(root,collision,courtActive);
 }
 const bodyOverrides:AugustCiufleaBodyOverride[]=handoffLayers.map(h=>({
  id:h.source.id,groundCells:h.source.previousGroundCells,
  get ready(){return !disposed&&h.pairs.every(([,collision])=>h.prepared.has(collision));},
  setActive(active:boolean){h.active=active&&this.ready;for(const[root,collision]of h.pairs)setPair(root,collision,h.active);}
 }));
 const retainedNative=new Set<number>([...(realm.preservedNativeOSMIds??[]),...bodyOverrides.map(h=>h.id)]);
 const envelopeReady=(e:SurfaceEnvelope)=>(e.requiredGroundCells??[]).every(([x,z])=>court.readyNear(x,z,.001));
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true&&(!customRoof(buildings[i])||m.collisionObjects[i]?.userData.grounded===true)&&(extra.surfaceEnvelopeBodies??[]).every(e=>buildings[i].id.replace(/\/\d+$/,'')!==e.sourceId||envelopeReady(e))&&(extra.nativeReplacementDependencies??[]).every(dep=>!dep.newSourceIds?.includes(buildings[i].id.replace(/\/\d+$/,''))||priorReady(...dep.point,dep.radius));
 const ids=[...new Set(buildings.flatMap(b=>b.nativeIds))].filter(id=>!retainedNative.has(id));
 const nativeReady=(id:number)=>buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i))&&(extra.nativeReplacementDependencies??[]).every(dep=>dep.id!==id||priorReady(...dep.point,dep.radius))&&(extra.surfaceEnvelopeBodies??[]).every(e=>!e.nativeIds?.includes(id)||envelopeReady(e));
 const replacements=[
  ...ids.map(id=>({id,x:1680,z:474,radius:0,get ready(){return nativeReady(id);}})),
  ...buildings.map((b,i)=>({id:-5500000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i)&&b.nativeIds.filter(id=>!retainedNative.has(id)).every(nativeReady);}}))
 ];
 const treeOverrides:{x:number;z:number;height:number;radius:number;texture:number;readonly ready:boolean}[]=[];
 const masks=[...realm.trees.map(([x,z,,radius])=>({x,z,radius})),...(extra.treeMasks??[])];
 const treeMaskKeys=new Set<string>();
 for(const{x,z,radius}of masks){
  const key=`${x}/${z}/${radius}`;if(treeMaskKeys.has(key))continue;treeMaskKeys.add(key);
  treeOverrides.push({x,z,height:0,radius,texture:0,get ready(){return m.readyNear(x,z,16);}});
 }
 // No additional shelter is inferred from a bus-stop node. Any existing
 // native stop retains its current function and representation.
 const instanceOverrides:{type:'busStop';x:number;z:number;radius:number;readonly ready:boolean}[]=[];
 const layers=[bodies,m,l,court,...handoffLayers.map(h=>h.layer)];
 return{
  objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,instanceOverrides,bodyOverrides,
  entryRoutes:()=>d.entryRoutes(),thresholdRoutes:()=>d.thresholdRoutes(),
  get ready(){return layers.every(v=>v.ready)&&handoffLayers.every(h=>h.active)&&courtActive;},
  readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r))&&handoffLayers.every(h=>h.active||h.source.cells.every(c=>Math.hypot(c.x-x,c.z-z)>r))&&(courtActive||courtIndices.every(i=>Math.hypot(buildings[i].anchor[0]-x,buildings[i].anchor[1]-z)>r));},
  update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);enforceHandoffs();},
  dispose(){disposed=true;for(const h of bodyOverrides)h.setActive(false);for(const v of layers)v.dispose();crown.dispose();trunk.dispose();}
 };
}
