import * as T from 'three';
import realm from '../data/bucuresti-bu09.json';
import catalog from '../data/bucuresti-bu09-buildings.json';
import {createPhotoFrontages, type PhotoBuilding} from './central-infill';
import {streetMesh, streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {parkMaterial} from './park-materials';
import {bucurestiBu09Architecture} from './bucuresti-bu09-architecture';
import type {XY} from './city-layout';

type Building=PhotoBuilding&{nativeIds:number[];sourceIds?:string[]};
type Patch={rings:number[][][];color:string;kind:number;raised:boolean;role?:string;surfaceOffset?:number};
type Cell={x:number;z:number;coverage:number[][][][];patches:Patch[]};
type Seam={axis?:string;start:number;end:number;bounds:number[];pedestrian:number[];kerb:number[];carriageway:number[]};
type Frontage={name:string;a:XY;b:XY;height:number;color?:string;material?:string;kind?:string;solidHeight?:number};
type FurniturePoint={point:XY;name?:string;height?:number;width?:number;depth?:number;shape?:string;plantForm?:string;angle?:number;heading?:number;color?:string;signalType?:string;attachedSign?:string;signType?:string;diameter?:number;mountOnly?:boolean;woodColor?:string;plinthWidth?:number;plinthDepth?:number;plinthHeight?:number;id?:string};
type Furniture={drains?:XY[];manholes?:XY[];bins?:FurniturePoint[];planters?:FurniturePoint[];benches?:FurniturePoint[];bollards?:FurniturePoint[];trafficSignalPoles?:FurniturePoint[];crossingSigns?:FurniturePoint[];attachedPoleSigns?:FurniturePoint[];emptyTreePits?:FurniturePoint[];monuments?:FurniturePoint[]};
type PreviousBody={chunkKey:string;body:{id:string;rings:XY[][];anchor:XY;height:number;levels:number}};
type Extra={cells:Cell[];previousCoarseBodies:PreviousBody[];trees:[number,number,number,number][];permanentGroundCells?:Cell[];seamHeightTransition?:Seam;roadAxes?:Record<string,XY[]>;closedFrontages?:Frontage[];treeForms?:{point:number[];form:string}[];treeMasks?:{x:number;z:number;radius:number}[];photoPoles?:{point:XY;height:number;kind?:string;width?:number;depth?:number;color?:string}[];overheadWires?:{path:XY[];height:number}[];streetFurniture?:Furniture;emptyTreePits?:FurniturePoint[];retainedGroundTreePits?:FurniturePoint[];attachedPoleSigns?:FurniturePoint[];retainedGroundMarkings?:{start:XY;end:XY;width:number;pattern:string;surfaceOffset:number;dashLength?:number;gapLength?:number;dashOffset?:number;phase?:number}[];nativeReplacementDependencies?:{id:number;point:XY;radius:number}[];preservedNativeOSMIds?:number[]};

/** Local paving family10. The old material families remain unchanged. */
export function bucurestiBu09GroundMaterial(){
 const material=parkMaterial('ground'),baseCompile=material.onBeforeCompile;
 material.customProgramCacheKey=()=> 'bucuresti-bu09-local-interlocking-paving-v1';
 material.onBeforeCompile=(shader,renderer)=>{
  baseCompile.call(material,shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   if(parkUp>.55&&parkStyleV>9.5&&parkStyleV<10.5){
    vec2 q=parkPosition.xz/vec2(.30,.20);
    q.x+=mod(floor(q.y),2.)*.5;
    float y=fract(q.y),neck=step(.25,abs(y-.5));
    q.x+=(neck-.5)*.17;
    vec2 f=fract(q),aa=fwidth(q);
    vec2 line=smoothstep(vec2(.012)-aa,vec2(.012)+aa,min(f,1.-f));
    float joint=min(line.x,line.y);
    float tile=fract(sin(dot(floor(q),vec2(127.1,311.7)))*43758.5453);
    float fade=1.-smoothstep(.3,1.,max(aa.x,aa.y));
    diffuseColor.rgb*=mix(1.,mix(.62,1.,joint)*(.95+tile*.10),fade);
   }
  `);
 };
 return material;
}

/** București, Vlaicu Pârcălab–Alexandr Pușkin. Plans are official building polygons.
 * Heights, facade dimensions and unobserved rear details remain estimates.
 * The exact v111 coarse volumes stay visible during staged detailed loading.
 * A complete coarse group, including its retained neighbours, first replaces
 * native bodies. All detailed bodies and colliders then replace it together. */
export function createBucurestiBu09(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean,priorReady:(x:number,z:number,r:number)=>boolean=()=>false,retainedGroundReady:(x:number,z:number,r:number)=>boolean=()=>false,retainedFacadeReady:(x:number,z:number,r:number)=>boolean=()=>false){
 const buildings=catalog as unknown as Building[],extra=realm as unknown as Extra;
 const m=streetMesh(scene,'București BUC09 · detalii',ground,loaded);
 const architecture=bucurestiBu09Architecture as (mesh:typeof m,ground:(x:number,z:number)=>number,surface?:(x:number,z:number)=>number)=>ReturnType<typeof bucurestiBu09Architecture>&{customRoof?:(b:PhotoBuilding)=>boolean;detailExtra?:(b:PhotoBuilding)=>Generator<void>};
 const d=architecture(m,ground,ground),a=d.a;
 const customRoof=(b:PhotoBuilding)=>d.customRoof?.(b)??false;
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false,roofRise:customRoof(b)?0:b.roofRise,parts:customRoof(b)?b.parts?.map(p=>({...p,roofRise:0})):b.parts})),'București BUC09 · corpuri cadastrale');
 const l=landscapeLayer(scene,'București BUC09 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700,material:bucurestiBu09GroundMaterial()});
 const court=landscapeLayer(scene,'București BUC09 · curte persistentă',ground,loaded,{maxEdge:3});
 const fallback=streetMesh(scene,'București BUC09 · reprezentare v111',ground,loaded);
 const markings=streetMesh(scene,'București BUC09 · marcaj pe sol BU8',ground,(x,z)=>loaded(x,z)&&retainedGroundReady(x,z,4));
 const retainedFacade=streetMesh(scene,'București BUC09 · finisaj pe corpul păstrat 377',ground,(x,z)=>loaded(x,z)&&retainedFacadeReady(x,z,4));
 retainedFacade.job('Star Kebab · parterul corpului păstrat',[[226.9196,335],[227.1201,343.4061]],[],function*(){
  // The existing cadastral owner2/3 keeps its complete plan,3.2m height and
  // collider. Only its western ground-floor finish is renewed. The projecting
  // two-level glass pavilion in the photo has no confirmed plan in this scope.
  const y=ground(233.5827,337.5595)+.12;
  for(const[p,q]of[[[226.9196,335],[226.9313,337.8218]],[[226.9313,337.8218],[227.1201,343.4061]]]as[XY,XY][]){
   const f=retainedFacade.facade(p,q,y),count=Math.max(1,Math.round(f.len/1.8));
   f.panel(f.len/2,1.39,.08,f.len,2.62,.06,'#466658',false,1);
   for(let i=0;i<=count;i++)f.panel(i*f.len/count,1.4,.14,.055,2.65,.07,'#2e493d',true);
   for(const yy of[.08,.68,2.71])f.panel(f.len/2,yy,.14,f.len,.055,.07,'#304b3d',true);
   f.panel(f.len/2,2.96,.14,f.len,.43,.12,'#315843');
   if(f.len>4)f.label('STAR KEBAB',f.len/2,2.96,.25,'#e0dcc1',.22);
   yield;
  }
 });
 // These are the original v111 records, not a new approximate proxy. Keep the
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
  for(const part of b.parts?.length?b.parts:[b]){
  const piece={...b,...part,parts:undefined} as PhotoBuilding;
  for(const f of a.faces(piece.p as XY[],y)){
   if(f.len<.65)continue;
   if(d.handles(piece,f)){yield* d.detail(piece,f);continue;}
   if(piece.style==='unconfirmedFront'){yield;continue;}
   a.cornice(f,piece.height,piece.trim);
   // Conservative rear openings are explicitly estimated. They never become
   // an invented photographed entrance or a traversable interior route.
   if(piece.style==='annex'){
    if(piece.height>2&&f.len>9){f.window(f.len*.5,1.65,.8,1.0,piece.trim,'#748074');yield;}
   }else yield* a.windows(f,piece.levels,piece.height,Math.max(1,Math.round(f.len/5.4)),1.55,piece.trim,'#788178');
   yield;
  }
  }
  if(d.detailExtra)yield* d.detailExtra(b);
 });

 for(const mark of extra.retainedGroundMarkings??[]){
  const dx=mark.end[0]-mark.start[0],dz=mark.end[1]-mark.start[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
  markings.job('separator păstrat pe solul BUC08',[mark.start,mark.end],[],function*(){
   const verts:number[]=[],dash=mark.dashLength??3,gap=mark.gapLength??3,offset=mark.phase??mark.dashOffset??0,intervals:[number,number][]=[];
   if(mark.pattern==='dashed')for(let start=-offset;start<length;start+=dash+gap){const a=Math.max(0,start),b=Math.min(length,start+dash);if(b>a)intervals.push([a,b]);}
   else intervals.push([0,length]);
   const at=(distance:number,side:number):[number,number,number]=>{const t=distance/length,x=mark.start[0]+dx*t+nx*mark.width/2*side,z=mark.start[1]+dz*t+nz*mark.width/2*side;return[x,ground(x,z)+mark.surfaceOffset,z];};
   for(const[start,end]of intervals){const count=Math.ceil((end-start)/1.5);
    for(let i=0;i<count;i++){
     const near=start+(end-start)*i/count,far=start+(end-start)*(i+1)/count;
     const a=at(near,-1),b=at(near,1),c=at(far,1),d=at(far,-1);verts.push(...a,...c,...b,...a,...d,...c);yield;
    }
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();markings.put(g,'#d6d7c7',false,false);
   yield;
  });
 }

 for(const p of extra.retainedGroundTreePits??[]){const[x,z]=p.point;markings.job('alveolă arbore pe solul BUC08',streetRect(x,z,1.5,1.5),[],function*(){
  const r=(p.diameter??1.3)/2,y=ground(x,z)+.052,soil=new T.CircleGeometry(r,24);soil.rotateX(-Math.PI/2);soil.translate(x,y,z);markings.put(soil,'#726e59');
  const ring=new T.TorusGeometry(r+.035,.032,5,24);ring.rotateX(Math.PI/2);ring.translate(x,y+.005,z);markings.put(ring,'#a5a18d');yield;
 });}

 const crown=new T.IcosahedronGeometry(1,1),trunk=new T.CylinderGeometry(.52,1,1,7),conifer=new T.ConeGeometry(1,1,9);
 const treeIndices:number[]=[];
 for(const[index,[x,z,h,r]]of extra.trees.entries()){
  const form=extra.treeForms?.find(t=>Math.hypot(t.point[0]-x,t.point[1]-z)<.5)?.form;
  treeIndices.push(m.objects.length);
  m.job('arbore individual',streetRect(x,z,r*2,r*2),[],function*(){
   const y=ground(x,z),young=form==='sapling'||form==='young',supported=form==='sapling',g=trunk.clone(),trunkHeight=h*(young?.72:.52),trunkWidth=young?.065:.29;
   g.scale(trunkWidth,trunkHeight,trunkWidth);g.translate(x,y+trunkHeight/2,z);m.put(g,'#74775f',false,true);
   if(supported){
    // Only survey-marked young trees receive the photographed timber supports.
    for(let k=0;k<3;k++){
     const t=k*Math.PI*2/3,tx=x+Math.cos(t)*.39,tz=z+Math.sin(t)*.39,next=t+Math.PI*2/3;
     m.box(tx,y+1.05,tz,.045,2.1,.045,'#aa9673',false,true);
     m.beam(new T.Vector3(tx,y+1.35,tz),new T.Vector3(x+Math.cos(next)*.39,y+1.35,z+Math.sin(next)*.39),.016,'#9e8c69');
    }
    yield;
   }
   if(form==='pollarded'){
    for(let k=0;k<5;k++){
     const t=k*Math.PI*2/5+.2,dx=Math.cos(t)*r*.56,dz=Math.sin(t)*r*.56;
     m.beam(new T.Vector3(x,y+h*.47,z),new T.Vector3(x+dx,y+h*(.75+(k%2)*.07),z+dz),.10,'#74775f');
     const g=crown.clone();g.scale(r*.24,r*.31,r*.22);g.translate(x+dx,y+h*(.81+(k%2)*.07),z+dz);m.put(g,'#72884f');yield;
    }
   }else if(form==='conifer')for(let k=0;k<5;k++){const g=conifer.clone();g.scale(r*(1-k*.17),h*.40,r*(1-k*.17));g.translate(x,y+h*(.32+k*.135),z);m.put(g,k%2?'#698875':'#5b7967');yield;}
   else for(const[dx,dz,dy,rr]of[[0,0,.62,r],[r*.45,.2,.76,r*.70],[-r*.32,-.35,.83,r*.64],[.2,-.1,.94,r*.43]]){
    const g=crown.clone();g.scale(rr,rr*(.95+(index%3)*.12),rr*.96);g.rotateY(index*.47);g.translate(x+dx,y+h*dy,z+dz);m.put(g,['#6d8750','#758b51','#65824f'][index%3]);yield;
   }
  });
 }
 const poles:{point:XY;height:number;kind?:string;width?:number;depth?:number;color?:string}[]=[...realm.poles.map(p=>({point:[p[0],p[1]] as XY,height:p[2]??7.7})),...(extra.photoPoles??[]).filter(p=>!realm.poles.some(q=>Math.hypot(p.point[0]-q[0],p.point[1]-q[1])<.8))];
 function towardRoad(x:number,z:number):XY{
  let closest=Infinity,normal:XY=[0,z<469?1:-1];
  for(const path of Object.values(extra.roadAxes??{}))for(let i=1;i<path.length;i++){
   const p=path[i-1],q=path[i],dx=q[0]-p[0],dz=q[1]-p[1],length=dx*dx+dz*dz;
   const t=length?T.MathUtils.clamp(((x-p[0])*dx+(z-p[1])*dz)/length,0,1):0,nx=p[0]+dx*t-x,nz=p[1]+dz*t-z,distance=Math.hypot(nx,nz);
   if(distance>.05&&distance<closest){closest=distance;normal=[nx/distance,nz/distance];}
  }
  return normal;
 }
 for(const pole of poles){const[x,z]=pole.point;m.job(pole.kind==='utility'?'stâlp de utilități observat':'stâlp de iluminat cartografiat',streetRect(x,z,2,2),[],function*(){
  const y=ground(x,z),h=pole.height,[nx,nz]=towardRoad(x,z);
  m.box(x,y+h/2,z,pole.width??.17,h,pole.depth??.17,pole.color??'#a1a899',false,true);
  if(pole.kind==='utility'){m.box(x+.12,y+3.25,z,.27,.43,.15,'#8d9686',true);for(const dy of[4.1,5.8])m.box(x,y+dy,z,.25,.05,.25,'#656f60',true);yield;return;}
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
  if(p.shape==='concrete-cylinder'){
   const g=new T.CylinderGeometry(w/2,w*.48,h,14,1,true);g.translate(x,y+h/2,z);m.put(g,p.color??'#b7b7a7',false,true);
   const lip=new T.TorusGeometry(w*.48,.025,5,18);lip.rotateX(Math.PI/2);lip.translate(x,y+h,z);m.put(lip,'#9c9f8f');
   const bottom=new T.CylinderGeometry(w*.44,w*.44,.04,14);bottom.translate(x,y+.04,z);m.put(bottom,'#555f4c');
   const band=new T.TorusGeometry(w*.49,.014,4,18);band.rotateX(Math.PI/2);band.translate(x,y+h*.34,z);m.put(band,'#727c69',true);
  }else if(p.shape==='recycling-screen'){
   const depth=p.depth??1.05;
   for(let yy=.14;yy<h;yy+=.16){m.box(x,y+yy,z+depth/2,w,.12,.055,'#968263',false,true);m.box(x+w/2,y+yy,z,.055,.12,depth,'#968263',false,true);}
   for(const dx of[-w/2,w/2])m.box(x+dx,y+h/2,z-depth/2,.045,h,.045,'#69745f',false,true);
   for(const dy of[.10,h-.05])m.box(x,y+dy,z-depth/2,w,.045,.045,'#69745f',false,true);
   for(let dx=-w/2+.10;dx<w/2;dx+=.13)m.box(x+dx,y+h/2,z-depth/2,.015,h-.16,.018,'#6f7a66',true,true);
   for(let dy=.22;dy<h-.12;dy+=.14)m.box(x,y+dy,z-depth/2,w,.013,.018,'#6f7a66',true);
   m.box(x,y+.64,z,.82,1.12,.66,'#858e7a',false,true);m.box(x,y+1.23,z,.92,.08,.74,'#b3ad65');
   for(const dx of[-.32,.32]){const g=new T.CylinderGeometry(.085,.085,.07,8);g.rotateX(Math.PI/2);g.translate(x+dx,y+.10,z-.25);m.put(g,'#4d5947',true);}
  }else if(p.shape==='slatted-cylinder'){
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
  if(p.shape==='urn'){
   m.box(x,y+.10,z,w*.36,.20,w*.36,p.color??'#656b5c');
   const stem=new T.CylinderGeometry(w*.14,w*.18,h*.25,10);stem.translate(x,y+.20+h*.12,z);m.put(stem,p.color??'#656b5c');
   const cup=new T.CylinderGeometry(w*.49,w*.16,h*.56,12);cup.translate(x,y+h*.67,z);m.put(cup,p.color??'#656b5c',false,true);
   const lip=new T.TorusGeometry(w*.49,.028,4,16);lip.rotateX(Math.PI/2);lip.translate(x,y+h*.95,z);m.put(lip,p.color??'#656b5c');
  }else if(p.shape==='rectangular'){
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
  if(p.shape==='hemisphere'){const g=new T.SphereGeometry(w/2,12,6,0,Math.PI*2,0,Math.PI/2);g.scale(1,h/(w/2),1);g.translate(x,y,z);m.put(g,p.color??'#acae9d',false,true);yield;return;}
  if(p.shape==='slanted-cylinder'){
   const g=new T.CylinderGeometry(w/2,w/2,h,10),v=g.attributes.position;
   for(let i=0;i<v.count;i++)if(v.getY(i)>0)v.setY(i,v.getY(i)+v.getX(i)*.65);
   g.computeVertexNormals();g.rotateY(p.angle??0);g.translate(x,y+h/2,z);m.put(g,p.color??'#2c705c',false,true);yield;return;
  }
  const g=new T.CylinderGeometry(w*.50,w*.61,shaft,8);g.translate(x,y+shaft/2,z);m.put(g,p.color??'#5c6a5a',false,true);
  if(r){const cap=new T.SphereGeometry(r,10,6);cap.translate(x,y+shaft+r,z);m.put(cap,p.color??'#5c6a5a',false,true);}
  yield;
 });}
 for(const p of furniture.benches??[]){const[x,z]=p.point;m.job(p.name??'bancă observată',streetRect(x,z,2,.9),[],function*(){
  const y=ground(x,z)+.035,angle=p.angle??0,c=Math.cos(angle),s=Math.sin(angle),w=p.width??1.8;
  if(p.shape==='concrete-wood-backless'){
   for(const dx of[-w*.40,w*.40])m.box(x+dx*c,y+.23,z-dx*s,.28,.46,p.depth??.45,p.color??'#b6b6a9',false,true,angle);
   for(let k=0;k<4;k++)m.box(x+(k-1.5)*.115*s,y+.475,z+(k-1.5)*.115*c,w-.15,.065,.09,p.woodColor??'#ad9f79',false,true,angle);yield;return;
  }
  for(const dx of[-w*.35,w*.35])m.box(x+dx*c,y+.22,z-dx*s,.065,.44,.46,'#4e6051',false,true,angle);
  for(let k=0;k<4;k++)m.box(x+(k-1.5)*.13*s,y+.47,z+(k-1.5)*.13*c,w,.07,.105,p.color??'#8f8466',false,true,angle);
  m.box(x+.22*s,y+.79,z+.22*c,w,.48,.065,p.color??'#8f8466',false,true,angle);yield;
 });}
 const instanceOverrides:{type:'statueSmall'|'statueBig';x:number;z:number;radius:number;readonly ready:boolean}[]=[];
 for(const p of furniture.monuments??[]){const[x,z]=p.point,jobIndex=m.objects.length;
  // OSM historic=memorial + memorial=statue deterministically chooses one of
  // these two native instance types. Preserve both possible native versions
  // until this exact replacement has complete visible geometry and collision.
  for(const type of['statueSmall','statueBig']as const)instanceOverrides.push({type,x,z,radius:1.0,get ready(){return !disposed&&m.objects[jobIndex].visible&&m.collisionObjects[jobIndex].userData.grounded===true;}});
  m.job(p.name??'monument observat',streetRect(x,z,3.4,3.2),[],function*(){
  const y=ground(x,z)+.035,heading=p.heading??-Math.PI/2,h=p.height??2.5,ph=p.plinthHeight??1.65,w=p.plinthWidth??1.5,depth=p.plinthDepth??1.4;
  const stone='#d2cdb8',shade='#b9b6a4',bronze='#525b4d',bright='#69705d',scale=h/2.5;
  for(const[dy,ww,dd,hh]of[[.06,w+.70,depth+.70,.12],[.18,w+.40,depth+.40,.12],[.24+ph/2,w,depth,ph],[.24+ph+.07,w+.16,depth+.16,.14]])m.box(x,y+dy,z,ww,hh,dd,stone,false,true,heading);
  const face=m.facade([x-w/2*Math.cos(heading),z+w/2*Math.sin(heading)],[x+w/2*Math.cos(heading),z-w/2*Math.sin(heading)],y),u=w/2;
  for(const[text,dy,size]of[['MARIA',1.34,.15],['REGINA',1.13,.15],['ROMANIEI',.92,.15],['1875 - 1938',.66,.09]]as const)face.label(text,u,dy,size,'#6a6e5f',depth/2+.012);
  a.pediment(face,u,.24+ph-.09,w-.05,.22,y,shade);yield;
  const base=y+.24+ph+.14;
  const place=(g:T.BufferGeometry,c=bronze)=>{g.scale(scale,scale,scale);g.rotateY(heading);g.translate(x,base,z);m.put(g,c);};
  const profile:[[number,number],...number[][]]=[[.44,.04],[.45,.28],[.39,.72],[.32,1.10],[.33,1.38],[.45,1.67],[.47,1.82],[.22,1.95]];
  const vertices:number[]=[],radial=24;
  for(let row=1;row<profile.length;row++)for(let k=0;k<radial;k++){
   const point=(r:number,t:number)=>{const radius=profile[r][0]*(1+.05*Math.sin(t*7+r*.5));return[radius*Math.cos(t),profile[r][1],radius*Math.sin(t)*.64];};
   const aa=point(row-1,k*Math.PI*2/radial),bb=point(row-1,(k+1)*Math.PI*2/radial),cc=point(row,(k+1)*Math.PI*2/radial),dd=point(row,k*Math.PI*2/radial);vertices.push(...aa,...bb,...cc,...aa,...cc,...dd);
  }
  const robe=new T.BufferGeometry();robe.setAttribute('position',new T.Float32BufferAttribute(vertices,3));robe.computeVertexNormals();place(robe);
  const head=new T.SphereGeometry(1,12,10);head.scale(.155,.225,.15);head.translate(0,2.14,.02);place(head,bright);
  const neck=new T.CylinderGeometry(.085,.10,.19,8);neck.translate(0,1.94,.005);place(neck);
  const nose=new T.ConeGeometry(.036,.10,7);nose.rotateX(Math.PI/2);nose.translate(0,2.12,.172);place(nose,bright);
  const crown=new T.TorusGeometry(.162,.025,5,16);crown.rotateX(Math.PI/2);crown.translate(0,2.31,.01);place(crown,bright);
  for(let k=0;k<8;k++){const t=k*Math.PI/4,g=new T.ConeGeometry(.026,.17,5);g.translate(.155*Math.cos(t),2.395,.01+.155*Math.sin(t));place(g,bright);}
  const book=new T.BoxGeometry(.23,.39,.09);book.rotateZ(.13);book.translate(.32,1.38,.27);place(book,'#69715f');
  const limb=(aa:number[],bb:number[],r:number)=>{const a0=new T.Vector3(...aa),b0=new T.Vector3(...bb),d=b0.clone().sub(a0),g=new T.CylinderGeometry(r*.82,r,d.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate((aa[0]+bb[0])/2,(aa[1]+bb[1])/2,(aa[2]+bb[2])/2);place(g);};
  // Left anatomical hand carries the book; the right arm hangs beside the cloak.
  limb([.37,1.75,.03],[.41,1.38,.17],.105);limb([.41,1.38,.17],[.25,1.28,.31],.085);limb([-.39,1.75,.03],[-.45,1.28,.10],.105);limb([-.45,1.28,.10],[-.37,.95,.18],.075);
  for(let k=0;k<5;k++){const points:T.Vector3[]=[];for(let i=0;i<9;i++){const t=i/8;points.push(new T.Vector3(-.31+k*.13+.10*Math.sin(t*Math.PI),1.68-t*(1.23+k*.04),.25+.025*Math.sin(t*5+k)));}place(new T.TubeGeometry(new T.CatmullRomCurve3(points),11,.012,4,false),bright);}
  yield;
 });}
 for(const p of extra.emptyTreePits??[]){const[x,z]=p.point;m.job('alveolă observată fără arbore',streetRect(x,z,1.4,1.4),[],function*(){
  if(p.shape==='rectangle'){
   const w=p.width??1.5,depth=p.depth??1.1,y=ground(x,z)+.046;
   m.box(x,y,z,w,.018,depth,'#6f6b56');
   for(const sign of[-1,1]){m.box(x+sign*(w/2+.025),y+.005,z,.045,.035,depth+.10,'#9e9d8c');m.box(x,y+.005,z+sign*(depth/2+.025),w,.035,.045,'#9e9d8c');}yield;return;
  }
  const r=(p.diameter??1.0)/2,y=ground(x,z)+.046,soil=new T.CircleGeometry(r,24);soil.rotateX(-Math.PI/2);soil.translate(x,y,z);m.put(soil,'#6f6b56');
  const ring=new T.TorusGeometry(r+.035,.035,5,24);ring.rotateX(Math.PI/2);ring.translate(x,y+.004,z);m.put(ring,'#9e9d8c');yield;
 });}
 function noParking(f:ReturnType<typeof m.facade>,y:number){
  const angle=Math.atan2(-(f.at(f.len)[1]-f.at(0)[1]),f.at(f.len)[0]-f.at(0)[0]);
  for(const[r,c,d]of[[.29,'#ae5a4b',.15],[.23,'#587789',.158]]as const){const p=f.at(.4,d),g=new T.CircleGeometry(r,20);g.rotateY(angle);g.translate(p[0],f.y+y,p[1]);m.put(g,c);}
  const p=f.at(.4,.177),g=new T.BoxGeometry(.55,.045,.025);g.rotateZ(Math.PI/4);g.rotateY(angle);g.translate(p[0],f.y+y,p[1]);m.put(g,'#ae5a4b');
 }
 function sign(p:FurniturePoint,signal:boolean){const[x,z]=p.point;m.job(p.name??(signal?'semafor observat':'indicator de trecere observat'),streetRect(x,z,1,1),[],function*(){
  const y=ground(x,z)+.035,heading=p.heading??0,h=p.height??(signal?4.8:3.3),f=m.facade([x-.4*Math.cos(heading),z+.4*Math.sin(heading)],[x+.4*Math.cos(heading),z-.4*Math.sin(heading)],y);
  if(!p.mountOnly)m.box(x,y+h/2,z,.10,h,.10,'#97a08f',false,true);
  if(signal){const colors=p.signalType==='pedestrian'?['#aa5d48','#5e8255']:['#aa5d48','#b3a155','#5e8255'];f.panel(.4,h-.5,.05,.29,colors.length*.26+.06,.23,'#394638');for(const[i,color]of colors.entries())f.panel(.4,h-.25-i*.25,.18,.17,.17,.025,color);if(p.attachedSign==='no-parking')noParking(f,h+.10);}
  else{f.panel(.4,h-.45,0,.66,.66,.07,'#c4cb65');f.panel(.4,h-.45,.045,.53,.53,.025,'#547c92');a.pediment(f,.4,h-.66,.43,.40,y,'#d4d8c5');}
  yield;
 });}
 for(const p of extra.attachedPoleSigns??[]){const[x,z]=p.point;m.job('indicator montat pe stâlpul existent',streetRect(x,z,.8,.8),[],function*(){
  const y=ground(x,z),heading=p.heading??0,h=p.height??3.2,f=m.facade([x-.4*Math.cos(heading),z+.4*Math.sin(heading)],[x+.4*Math.cos(heading),z-.4*Math.sin(heading)],y);
  f.panel(.4,h,.11,.72,.82,.065,'#4c7388');
  for(const u of[.18,.4,.62]){f.panel(u,h-.04,.16,.035,.45,.03,'#dddccb');a.pediment(f,u,h+.18,.16,.14,y,'#dddccb');}
  f.panel(.13,h+.01,.165,.13,.035,.025,'#dddccb');
  const shape=new T.Shape();shape.moveTo(-.07,0);shape.lineTo(.015,.055);shape.lineTo(.015,-.055);shape.closePath();const q=f.at(.07,.18),g=new T.ShapeGeometry(shape);g.rotateY(heading);g.translate(q[0],y+h+.01,q[1]);m.put(g,'#dddccb');
  yield;
 });}
 for(const p of furniture.trafficSignalPoles??[])sign(p,true);
 for(const p of furniture.crossingSigns??[])sign(p,false);

 type Pair=[T.Group,T.Group];
 const bodyPairs:Pair[]=buildings.flatMap((_,i)=>[[bodies.objects[i],bodies.collisionObjects[i]],[m.objects[i],m.collisionObjects[i]]] as Pair[]).concat(court.objects.map((o,i)=>[o,court.collisionObjects[i]] as Pair));
 const fallbackPairs:Pair[]=fallback.objects.map((o,i)=>[o,fallback.collisionObjects[i]]);
 const treePairs:Pair[]=treeIndices.map(i=>[m.objects[i],m.collisionObjects[i]]);
 const preparedBodies=new Set<T.Group>(),preparedFallback=new Set<T.Group>(),preparedTrees=new Set<T.Group>();
 let active=false,replacementReady=false,treesActive=false,disposed=false,phaseCursor=0,replacementReadyAt=-Infinity;
 d.setActivationReady(()=>active&&!disposed);
 function setPair([root,collision]:Pair,on:boolean){root.visible=on;if(collision.userData.grounded!==on){collision.userData.grounded=on;collision.userData.revision=(collision.userData.revision??0)+1;}}
 function remember(pairs:Pair[],prepared:Set<T.Group>){for(const[root,collision]of pairs)if(root.visible&&collision.userData.grounded===true)prepared.add(collision);}
 function activate(now:number){
  remember(bodyPairs,preparedBodies);remember(fallbackPairs,preparedFallback);remember(treePairs,preparedTrees);
  const nextReplacementReady=!disposed&&fallbackPairs.every(([,collision])=>preparedFallback.has(collision))&&(extra.nativeReplacementDependencies??[]).every(dep=>priorReady(...dep.point,dep.radius));
  if(nextReplacementReady&&!replacementReady)replacementReadyAt=now;
  else if(!nextReplacementReady)replacementReadyAt=-Infinity;
  replacementReady=nextReplacementReady;
  active=replacementReady&&now>replacementReadyAt&&bodyPairs.every(([,collision])=>preparedBodies.has(collision));
  treesActive=!disposed&&treePairs.every(([,collision])=>preparedTrees.has(collision));
  for(const pair of bodyPairs)setPair(pair,active);
  for(const pair of fallbackPairs)setPair(pair,replacementReady&&!active);
  for(const pair of treePairs)setPair(pair,treesActive);
 }
 const retained=new Set(extra.preservedNativeOSMIds??[]),ids=[...new Set(buildings.flatMap(b=>b.nativeIds))].filter(id=>!retained.has(id));
 // Spatial retirement follows the physically owned partition. The raw
 // official30048 plan also includes retained central-infill135644953 and
 // must never be used to suppress that other owner's native fallback.
 const replacements=[...ids.map(id=>({id,x:250,z:468,radius:0,get ready(){return replacementReady;}})),...buildings.map((b,i)=>({id:-5800000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:(b.parts?.length?b.parts:[b]).map(part=>[part.p??b.p,...(part.holes??b.holes)]),get ready(){return replacementReady;}}))];
 const treeOverrides:{x:number;z:number;height:number;radius:number;texture:number;readonly ready:boolean}[]=[],keys=new Set<string>();
 for(const{x,z,radius}of[...extra.trees.map(([x,z,,radius])=>({x,z,radius})),...(extra.treeMasks??[])]){
  const key=`${x}/${z}/${radius}`;if(keys.has(key))continue;keys.add(key);treeOverrides.push({x,z,height:0,radius,texture:0,get ready(){return treesActive;}});
 }
 const layers=[bodies,m,l,court,fallback,markings,retainedFacade],preparationLayers=[fallback,l,court,markings,retainedFacade,bodies,m];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,instanceOverrides,
  entryRoutes:()=>d.entryRoutes(),thresholdRoutes:()=>d.thresholdRoutes(),excavations:d.excavations,
  get previousRepresentationReady(){return replacementReady;},
  originalReadyNear(x:number,z:number,r=20){return replacementReady||buildings.every(b=>Math.hypot(b.anchor[0]-x,b.anchor[1]-z)>r);},
  get ready(){return layers.every(v=>v.ready)&&active&&treesActive;},
  readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r))&&(active||buildings.every(b=>Math.hypot(b.anchor[0]-x,b.anchor[1]-z)>r))&&(treesActive||extra.trees.every(([tx,tz])=>Math.hypot(tx-x,tz-z)>r));},
  update(camera:T.PerspectiveCamera,now:number){
   // Prepare exact fallback and final meshes together without exceeding the
   // shared scene budget. The public swap remains atomic and collision-safe.
   const first=phaseCursor++%preparationLayers.length;
   for(let i=0;i<preparationLayers.length;i++)preparationLayers[(first+i)%preparationLayers.length].update(camera,now);
   activate(now);
  },
  dispose(){disposed=true;active=replacementReady=treesActive=false;for(const v of layers)v.dispose();crown.dispose();trunk.dispose();conifer.dispose();}
 };
}
