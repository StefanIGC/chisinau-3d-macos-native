import * as T from 'three';
import catalog from '../data/central-infill.json';
import {streetMesh} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {pointSegmentDistance,type XY} from './city-layout';
import {upscHistoricFacade} from './upsc-architecture';

type Entry={x:number;z:number;width:number;rise:number;depth:number;style?:string};
type Passage={rings:number[][][];clearance:number;walls:number[][][][];floorOffset?:number};
export type PhotoBuilding={id:string;title:string;p:number[][];holes:number[][][];height:number;levels:number;style:string;wall:string;trim:string;roof:string;roofRise:number;roofHoles?:number[][][];front:number[];bay:number;anchor:number[];doors:Entry[];passages:Passage[];parts?:Partial<PhotoBuilding>[];facades?:boolean;nativeIds?:number[]};
type Building=PhotoBuilding;
/** Mapped plans with photographic elevations where documented in the manifest. */
export function createCentralInfill(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 return createPhotoFrontages(scene,ground,loaded,catalog as unknown as Building[],'Fronturi completate');
}
/** Shared construction and collision lifecycle for adjacent photographed blocks. */
export function createPhotoFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean,buildings:Building[],name:string){
 const m=streetMesh(scene,name,ground,loaded),a=photoArchitecture(m);
 const {solid,box,put,beam}=m;
 function* roof(b:Building,y:number){
  if(!b.roofRise){solid(b.p as XY[],.18,y+b.height,b.roof,false,b.holes as XY[][]);return;}
  const shape=new T.Shape();b.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
  for(const r of [...b.holes,...(b.roofHoles??[])]){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));shape.holes.push(hole);}
  const source=new T.ShapeGeometry(shape);source.rotateX(-Math.PI/2);const g=source.toNonIndexed(),v=g.attributes.position,out:number[]=[];
  const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),run=Math.max(2,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2);
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.15+b.roofRise*Math.min(1,d/run),p[1]];};
  function tri(a:XY,b:XY,c:XY,depth=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(depth<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,depth+1);tri(p,b,c,depth+1);}else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,depth+1);tri(a,p,c,depth+1);}else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,depth+1);tri(p,b,c,depth+1);}return;}out.push(...vertex(a),...vertex(b),...vertex(c));}
  for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
  source.dispose();g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.computeVertexNormals();put(result,b.roof,false,true);
 }
 function* build(b:Building):Generator<void>{
  if(b.parts?.length){for(const part of b.parts)yield* build({...b,...part,parts:undefined});return;}
  const y=ground(...b.anchor as XY)+.12,h=b.height,p=b.p as XY[],storey=h/b.levels,glass='#4b6263';
  if(b.style==='portico'){
   // The separately mapped triangle is a canopy, never a solid annex.
   solid(p,.25,y+h-.25,b.roof,true,b.holes as XY[][]);yield* roof({...b,roofRise:1.15},y);
   for(const [x,z]of[[788.5,291.5],[788.7,303.8],[801.7,303.9]])a.column(x,z,ground(x,z)+.12,h,.43,b.trim,true);
   yield* m.surfaceStaged(p,(x,z)=>ground(x,z)+.12,'#9e9f90',true);return;
  }
  if(b.passages.length){
   const clearance=Math.max(...b.passages.map(p=>p.clearance));
   for(const poly of b.passages[0].walls)solid(poly[0] as XY[],clearance+5,y-5,b.wall,true,poly.slice(1) as XY[][]);
   solid(p,h-clearance,y+clearance,b.wall,true,b.holes as XY[][]);
   for(const passage of b.passages)yield* m.surfaceStaged(passage.rings[0] as XY[],(x,z)=>ground(x,z)+(passage.floorOffset??.12),'#94988a',true,passage.rings.slice(1) as XY[][]);
  }else solid(p,h+5,y-5,b.wall,true,b.holes as XY[][]);
  yield;yield* roof(b,y);
  if(b.facades===false)return;
  if(b.id==='w32516026'){yield* upscHistoricFacade(m,p,y,h,b.levels,5);return;}
  for(const f of a.faces(p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]+(q[1]-p[1])*b.front[1]>.8;
   const historic=['historic','villa','stone','bank','court','russo107','lume','julien','sis','serotinski'].includes(b.style),plain=b.style==='annex';
   const opening=(u:number,height=0)=>{const p=f.at(u);return b.passages.some(s=>height<s.clearance&&s.rings[0].some(v=>Math.hypot(v[0]-p[0],v[1]-p[1])<2.3));};
   // Lower trim uses small pieces around real openings, never a band across one.
   for(let u=.4;u<f.len;u+=.8)if(!opening(u,.6))f.panel(u,.36,.07,Math.min(.8,f.len-u+.4),.72,.14,b.style==='optic'?'#89614e':'#949586');
   a.cornice(f,h,b.trim);
   if(f.len<2.4)continue;
   const bays=front&&b.style==='russo107'?5:Math.max(1,Math.round(f.len/b.bay)),bw=f.len/bays;
   const doorAt=(u:number)=>b.doors.some(d=>pointSegmentDistance([d.x,d.z],f.at(0),f.at(f.len))<.22&&Math.hypot(...f.at(u).map((v,i)=>v-[d.x,d.z][i]))<d.width/2+.75);
   const angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
   const rail=(u:number,yy:number,width:number,depth=1.05,color='#3f4940')=>{f.panel(u,yy,depth/2,width,.16,depth,b.trim);for(const hh of[yy+.18,yy+1.02])f.panel(u,hh,depth,width,.045,.045,color,true);for(let v=-width/2;v<=width/2;v+=.23)f.panel(u+v,yy+.6,depth,.027,.85,.035,color,true);};
   if(b.style==='cascada'){
    const east=q[0]>p[0]+.85,south=q[1]>p[1]+.85;
    if(east||south){
     f.panel(f.len/2,3.28,.15,f.len,6.35,.025,glass,false,1);
     for(let u=.2;u<f.len;u+=2.1){f.panel(u,3.3,.20,.06,6.5,.075,'#a5b5ad',true);yield;}
     for(const yy of[.3,3.2,6.45])f.panel(f.len/2,yy,.22,f.len,.09,.085,'#aebcb1',true);
     for(let row=0;row<7;row++){
      const yy=7.1+row*3.2;f.panel(f.len/2,yy+1.20,.12,f.len-.7,2.05,.025,glass,false,1);
      f.panel(f.len/2,yy+.10,.72,f.len+.2,.94,1.44,'#c1c3b2');
      for(let u=1.5;u<f.len;u+=3.1)f.panel(u,yy+.37,1.46,2.63,.31,.028,'#a9b29f',true);
      if(east){
       f.panel(f.len/2,yy+1.27,.86,6.8,3.15,.03,'#8da6a5');
       for(const d of[-1,1]){
        const u=f.len/2+d*4.3,at=f.at(u,1.2),g=new T.CylinderGeometry(1.12,1.12,.88,16,1,false,0,Math.PI*2);g.translate(at[0],y+yy+.12,at[1]);put(g,'#c5c7b6');
        a.column(at[0],at[1],y+yy+.53,2.33,.20,'#b4bcad');
       }
      }yield;
     }
    }else{f.panel(f.len/2,h/2,.04,f.len,h,.08,'#91b49f');yield* a.windows(f,9,h,Math.max(2,Math.round(f.len/3.0)),1.8,'#b7c6b5','#718d7d');}
   }else if(front&&b.style==='portholes'){
    // Two floors, with circular attic vents: not a third storey.
    const peach='#af8e74';
    for(const sign of[-1,1]){
     const u=f.len/2+sign*f.len*.29;
     f.window(u,5.10,f.len*.28,1.35,peach,'#c4cebf');
     f.window(u,1.88,2.3,2.3,peach,'#8b6948');
     for(let j=-1;j<=1;j++){
      const v=u+j*1.40,pt=f.at(v,.38),a0=f.at(0),a1=f.at(1),angle=Math.atan2(-(a1[1]-a0[1]),a1[0]-a0[0]);
      const vent=new T.CircleGeometry(.35,14);vent.rotateY(angle);vent.translate(pt[0],y+7.0,pt[1]);put(vent,glass);
      const rim=new T.TorusGeometry(.39,.075,5,16);rim.rotateY(angle);rim.translate(pt[0],y+7.0,pt[1]);put(rim,peach,true);
     }yield;
    }
    for(const d of[-.42,0,.42])f.panel(f.len/2+d,6.43,.10,.15,3.07,.025,'#3e5351',false,1);
    f.panel(f.len/2,3.33,.76,2.6,.15,1.52,'#7f8b7b');
    // The gate bay itself stays empty up to its lintel.
   }else if(front&&b.style==='micb38'){
    if(f.len>14){
     const ww=f.len*.90,hh=Math.min(11.6,h-5.8);a.arch(f,f.len/2,3.35,ww,hh,y,'#565e54','#b8bda9');
     const r=ww/2,cy=3.35+hh-r;
     for(let u=f.len*.05+.6;u<f.len*.95;u+=1.8){const dx=u-f.len/2,top=cy+Math.sqrt(Math.max(0,r*r-dx*dx));f.panel(u,(3.35+top)/2,.41,.06,top-3.35,.06,'#343e34');yield;}
     for(let yy=4.3;yy<3.35+hh;yy+=1.7){const half=yy>cy?Math.sqrt(Math.max(0,r*r-(yy-cy)**2)):r;f.panel(f.len/2,yy,.42,half*2,.06,.06,'#343e34');}
     for(let u=1.4;u<f.len;u+=3.2)a.arch(f,u,h-2.5,1.3,1.8,y,glass,b.trim);
     if(f.len>21)f.label('MOLDINDCONBANK',f.len/2,h-3.5,.55,'#3b4a42');
    }else yield* a.windows(f,4,h,Math.max(1,bays),2.2,b.trim);
   }else if(front&&b.style==='granier'){
    // The inspected Ion Creangă storefront: charcoal sign, cream awning,
    // metal-framed glazing and a recessed glazed door. Capture date unknown.
    const ww=Math.max(1,f.len-.35);
    f.panel(f.len/2,1.65,.28,ww,2.8,.035,'#728f91',false,1);
    for(let u=.15;u<f.len;u+=1.15)f.panel(u,1.65,.34,.055,2.85,.09,'#454b49');
    f.panel(f.len/2,3.60,.25,f.len,.95,.35,'#414a4d');
    f.label('GRANIER',f.len/2,3.55,Math.min(.47,f.len/12),'#c7b58c',.46);
    f.panel(f.len/2,3.01,.95,f.len,.12,1.9,'#c3c5ba');
    f.panel(f.len/2,2.82,1.87,f.len,.27,.08,'#c3c5ba');
    const door=Math.min(f.len-1.0,f.len*.30);f.panel(door,1.5,.37,1.05,2.7,.025,'#48646a',false,1);f.panel(door+.40,1.35,.43,.035,.32,.05,'#a1a899');
    const apron=f.at(door,1.4),low=ground(...apron)+.035,aa=f.at(0),bb=f.at(1),angle=Math.atan2(-(bb[1]-aa[1]),bb[0]-aa[0]);
    for(let step=0;step<2;step++){const q=f.at(door,1.13-step*.45),top=low+(step+1)*.12;box(q[0],top-.14,q[1],1.7,.28,.45,'#787d77',false,true,angle);}
    yield;
   }else if(front&&b.style==='monami'){
    for(let row=0;row<2;row++){
     const yy=2.65+row*3.75;
     for(let i=0;i<bays;i++)f.window((i+.5)*bw,yy,Math.max(1.4,bw-.75),2.65,'#9f916d','#665d45');
     f.panel(f.len/2,yy+1.55,.55,f.len,.20,1.1,'#785b41');yield;
    }
    for(let yy=.75;yy<h;yy+=.48)f.panel(f.len/2,yy,.05,f.len,.025,.035,'#908772',true);
    if(q[0]<p[0]-.8){const p=f.at(f.len-.75,.50);a.column(p[0],p[1],y+.5,7.4,.52,'#c2b38e',true);}
   }else if(front&&b.style==='villa95'){
    for(const u of[f.len*.17,f.len*.84])for(const yy of[2,5.6])f.window(u,yy,2.2,2.3,b.trim,'#66523f');
    const u=f.len*.53;a.arch(f,u,4.35,2.5,2.5,y,glass,b.trim);
    rail(u,4.12,3,1.1,b.trim);f.panel(u,4.7,.65,3,.92,1.3,b.wall);
    for(const side of[-1,1]){const q=f.at(u+side*1.37,.64);a.column(q[0],q[1],y+4.8,1.25,.17,b.trim);}
    f.panel(u,3.2,.72,3.8,.15,1.44,'#765547');
    for(let v=.5;v<f.len;v+=.9){f.panel(v,h-.45,.08,.18,.16,.16,b.trim,true);yield;}
   }else if(front&&b.style==='universul'){
    f.panel(f.len/2,1.65,.07,f.len,3.3,.14,'#434c43');
    for(let u=1;u<f.len;u+=2.7){f.panel(u,h/2,.22,1.70,h-.5,.03,'#738580',false,1);for(const d of[-.90,.90])f.panel(u+d,h/2,.31,.16,h,.18,'#bbc0b1');for(let yy=3.4;yy<h;yy+=3.5)f.panel(u,yy,.34,1.90,.12,.20,b.trim);yield;}
    if(f.len>20&&f.len<30){
     // The photographed diagonal outdoor stair, kept inside the frontage recess.
     const start=1.0,end=f.len-2.0,rise=4.15,n=32,w=1.4;
     for(let k=0;k<n;k++){const u=start+(end-start)*(k+.5)/n,pt=f.at(u,1.1),yy=.12+rise*(k+1)/n;box(pt[0],y+yy-.10,pt[1],(end-start)/n,.2,w,'#909b8d',false,true,angle);}
     for(const v of[.4,1.8]){
      const a0=f.at(start,v),a1=f.at(end,v),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([a0[0],y+.20,a0[1],a1[0],y+rise+.20,a1[1],a1[0],y+rise+1.3,a1[1],a0[0],y+.20,a0[1],a1[0],y+rise+1.3,a1[1],a0[0],y+1.3,a0[1]],3));g.computeVertexNormals();put(g,'#c6cabb');
      for(let u=start+.25;u<end;u+=.42){const yy=.12+rise*(u-start)/(end-start);for(const dh of[.33,.63,.93])f.panel(u,yy+dh,v+.015,.08,.055,.026,'#4e5d52',true);yield;}
     }
     f.panel(f.len/2,5.65,.30,f.len-2,1.1,.1,'#c6cabb');
    }
   }else if(front&&b.style==='partial'){
    f.panel(f.len/2,2.0,.06,f.len,3.8,.12,'#b5b8aa');for(let i=0;i<bays;i++)f.window((i+.5)*bw,2.2,2.1,1.6,b.trim,'#a9b7a8');
   }else if(front&&b.style==='low66'){
    f.panel(f.len/2,h-.45,.20,f.len,.75,.4,b.trim);f.panel(f.len/2,1.7,.13,4.6,3.2,.06,'#8f9a8c');
    for(let yy=.4;yy<3.3;yy+=.18)f.panel(f.len/2,yy,.18,4.5,.025,.03,'#69786a',true);
   }else if(front&&b.style==='timber'){
    f.panel(f.len/2,3.20,.14,f.len,.58,.28,'#806344');f.panel(f.len/2,6.80,.08,f.len,.56,.16,'#c3c5b6');
    for(let u=.12;u<f.len;u+=.24){f.panel(u,3.2,.33,.095,.58,.10,'#a6885e',true);if(Math.round(u/.24)%18===0)yield;}
    for(let i=0;i<bays;i++){
     const u=(i+.5)*bw;for(const hh of[1.65,5.07]){f.panel(u,hh,.21,bw-.21,2.45,.025,glass,false,1);for(const d of[-1,1])f.panel(u+d*(bw/2-.10),hh,.25,.085,2.6,.12,'#35443d');}
     f.panel(u,6.98,.85,.075,1.63,.075,'#34443b',true);f.panel(u,7.76,.84,.075,.075,1.72,'#34443b',true);yield;
    }
   }else{
    if(front&&b.style==='redcross')for(let row=0;row<2;row++)for(let i=0;i<bays;i++){f.panel((i+.5)*bw,storey*(row+1)-.93,.095,bw-.95,1.45,.19,'#a96e4e');yield;}
    if(front&&b.style==='zentrum')f.panel(f.len/2,(h+storey)/2,.06,f.len,h-storey,.12,'#94765a');
    for(let row=0;row<b.levels;row++){
     const yy=storey*(row+.52),isShop=front&&row===0&&['modern','panel','optic','zentrum','low-shop','limone','lea','amadeus','primtravel','cactus','limestoneblock','reconstructed'].includes(b.style),w=Math.min(bw*.65,isShop?2.15:1.45),hh=Math.min(storey*.62,isShop?2.7:2.35);
     for(let i=0;i<bays;i++){
      const u=(i+.5)*bw;if(opening(u,yy-hh/2)||(row===0&&doorAt(u)))continue;
      f.window(u,yy,w,hh,b.trim,b.style==='low-shop'?'#c1c5b6':historic?'#6b5e49':'#4f5c53');
      if(front&&historic){f.panel(u,yy+hh/2+.27,.26,w+.62,.16,.52,b.trim);f.panel(u,yy-hh/2-.18,.23,w+.34,.15,.46,b.trim);if(b.style==='bank'||b.style==='villa')a.pediment(f,u,yy+hh/2+.30,w+.68,.44,y,b.trim);}
      if(front&&['panel','limestoneblock','cactus','medexpert'].includes(b.style)&&row>0){f.panel(u,yy-hh/2-.27,.59,bw-.16,.62,1.18,'#a3ac9d');for(const d of[-1,1])f.panel(u+d*(bw/2-.08),yy,.45,.16,storey,.9,b.trim);}
      if(front&&b.style==='zentrum'&&row===2){f.panel(u,yy-hh/2-.12,.55,bw-.3,.14,1.10,'#6c6957');for(const v of[-1,1])f.panel(u+v*(bw/2-.2),yy-hh/2+.35,1.06,.04,.8,.04,'#485047',true);for(const h of[yy-hh/2+.07,yy-hh/2+.76])f.panel(u,h,1.06,bw-.4,.04,.04,'#485047',true);}
      yield;
     }
     if(front&&b.style==='zentrum'&&row===2)for(let yy=h-storey+.25;yy<h-.25;yy+=.25){f.panel(f.len/2,yy,.10,f.len,.026,.028,'#836753',true);yield;}
    }
   }
   if(front&&['sis','cactus','limestoneblock','primtravel'].includes(b.style)){
    if(b.style==='primtravel')f.panel(f.len/2,storey/2,.025,f.len,storey,.05,'#c9c7b5');
    // Stone courses and quoin strips: raised, opaque, with no coplanar decals.
    for(let yy=b.style==='sis'?.7:storey;yy<h-.5;yy+=.48){f.panel(f.len/2,yy,.05,f.len,.024,.035,'#8f8e7b',true);yield;}
    if(b.style==='sis')for(let i=0;i<bays;i++){const u=(i+.5)*bw;if(doorAt(u))continue;for(let dx=-.55;dx<=.55;dx+=.28)f.panel(u+dx,storey*.52,.51,.028,2.1,.03,'#5e6b5d',true);}
    if(['cactus','limestoneblock'].includes(b.style))for(let u=bw;u<f.len;u+=bw*2)rail(u,storey*2-.2,2.8,.9);
    if(b.style==='primtravel')rail(f.len*.63,storey-.15,3.8,1.2,'#7d5542');
   }
   if(front&&b.style==='garagehouse'){
    for(let i=0;i<bays;i++){const u=(i+.5)*bw;f.panel(u,1.3,.38,bw-.4,2.45,.06,'#626e62');for(let yy=.25;yy<2.5;yy+=.18)f.panel(u,yy,.43,bw-.43,.026,.035,'#a2ac9b',true);}
    for(let row=1;row<5;row++)f.panel(f.len/2,row*storey+.2,.035,f.len,.6,.07,row%2?'#949e91':'#c4c6b5');
   }
   if(front&&b.style==='limone'){
    f.panel(f.len/2,1.65,.055,f.len,3.3,.11,'#514d42');rail(f.len/2,storey-.15,f.len*.62,1.2);f.label('LIMONE',f.len/2,2.95,.42,'#d0b77e');
   }
   if(front&&b.style==='lea'){
    f.panel(f.len*.22,1.9,.045,f.len*.42,3.8,.09,'#3d463c');f.window(f.len*.22,1.55,2.7,2.4,'#313d33','#384a3b');f.label('LEA LEA',f.len*.22,3.34,.36,'#baa466');
   }
   if(front&&b.style==='medexpert'){f.panel(f.len/2,3.45,.21,f.len, .62,.42,'#376185');if(f.len>15)f.label('MEDEXPERT',f.len/2,3.50,.45,'#c6cbbc');}
   if(b.style==='stalin59'){
    f.panel(f.len/2,storey/2,.055,f.len,storey,.11,'#b9af91');
    // Rusticated lower storey, weathered peach upper walls and photographed balconies.
    for(let yy=.48;yy<storey;yy+=.52){f.panel(f.len/2,yy,.13,f.len,.026,.035,'#939785',true);yield;}
    for(const yy of[storey,storey+.23])f.panel(f.len/2,yy,.23,f.len,.16,.46,b.trim);
    if(front&&f.len>30){
     for(let i=0;i<bays;i++){
      const u=(i+.5)*bw;
      if(i%4===1)for(let row=1;row<4;row++)rail(u,storey*row+.08,2.4,1.15,'#40463b');
      if(i%5===0){f.panel(u,storey+(h-storey)/2,.12,.56,h-storey,.24,'#bab8a4');for(let yy=storey+.5;yy<h;yy+=1.1)f.panel(u,yy,.27,.45,.26,.05,'#979d8b',true);}
      yield;
     }
     const u=f.len-6.15;
     f.panel(u,3.47,.96,7.5,.85,1.92,'#bfc5b7');f.label('INVITRO',u-.25,3.46,.46,'#53536d',1.94);
     for(const d of[-1,1])f.panel(u+d*3.38,1.5,1.6,.16,3,.16,'#abb7ad');
    }
   }
   if(front&&b.style==='factory'){for(let row=0;row<3;row++)f.panel(f.len/2,(row+1)*storey-.55,.1,f.len,.11,.2,b.trim);if(f.len>20)for(const u of[2.0,f.len-2])rail(u,storey*2-.5,2.4,.75,'#7f775d');}
   if(front&&b.style==='amadeus'){for(let i=0;i<=bays;i++)f.panel(i*bw,storey*.48,.31,.26,storey,.62,b.trim);f.label('AMADEUS',f.len/2,storey-.37,.43,'#cfccb5');}
   if(front&&b.style==='orient'){f.panel(f.len/2,h-.55,.10,f.len,.68,.20,b.trim);a.pediment(f,f.len/2,h+.08,Math.min(f.len-1,7),1.15,y,b.trim);f.label('ORIENT',f.len/2,h-.50,.45,'#466949');}
   if(front&&b.style==='court'){
    for(let yy=.5;yy<storey;yy+=.6)f.panel(f.len/2,yy,.10,f.len,.05,.16,'#9b9980',true);
    const u=f.len/2;rail(u,storey-.15,5,1.2);for(const d of[-1,1]){const pt=f.at(u+d*2.0,.75);a.column(pt[0],pt[1],y+.4,storey-.6,.32,b.trim);}f.panel(u,storey+.1,.65,5.6,.4,1.3,b.trim);
   }
   if(front&&b.style==='lume'){
    for(let u=bw/2;u<f.len;u+=bw){f.panel(u,4.0,.67,Math.min(2.4,bw-.4),.10,1.34,'#a99a77');if(u>2&&u<f.len-2)a.pediment(f,u,h+.12,2.2,1.5,y,b.trim);}
   }
   if(front&&b.style==='russo107'){
    for(const d of[-1,1]){const pt=f.at(f.len/2+d*1.47,.70);a.column(pt[0],pt[1],y+.2,3.75,.31,b.trim,true);}
    f.panel(f.len/2,4.08,.63,4.1,.30,1.26,b.trim);a.arch(f,f.len/2,h-.02,3.0,.98,y,b.wall,b.trim,0);
    for(let u=.75;u<f.len;u+=1.45){f.panel(u,h+.23,.12,1.1,.40,.24,b.trim);yield;}
   }
   if(front&&(historic||b.style==='redcross'||b.style==='cnam')){
    for(const u of[.22,f.len-.22]){f.panel(u,h/2,.23,.46,h,.46,b.trim);for(let yy=.4;yy<h-.4;yy+=.7)f.panel(u,yy,.25,.49,.035,.51,'#949680',true);}
    for(let u=.35;u<f.len;u+=.7){f.panel(u,h-.30,.38,.24,.19,.76,b.trim,true);if(Math.round(u/.7)%15===0)yield;}
   }
   if(front&&['bank','serotinski','redcross','cnam','ctas87'].includes(b.style)){
    const u=f.len/2,ww=Math.min(7,f.len*.48);
    a.pediment(f,u,h+.2,ww,b.style==='serotinski'?1.35:.85,y,b.trim);
    if(b.style==='ctas87'){for(const d of[-1,1])f.panel(u+d*1.07,2.0,.32,.43,3.7,.64,b.trim);f.label('CTAS CENTRU',u+2.0,2.8,.12,'#435b5a');}
    if(b.style==='bank'){for(const d of[-1,1]){const p=f.at(u+d*1.45,.75);a.column(p[0],p[1],y+.36,3.85,.26,b.trim);}f.panel(u,4.48,.65,4.4,.40,1.3,b.trim);}
    if(b.style==='redcross'||b.style==='cnam'){f.panel(u,storey-.10,.79,4.2,.22,1.58,b.trim);for(const d of[-1,1])f.panel(u+d*2.0,storey+.48,1.53,.14,1.1,.14,b.style==='cnam'?'#3e4b40':b.trim);for(const hh of[storey+.04,storey+.99])f.panel(u,hh,1.53,4.13,.1,.1,b.style==='cnam'?'#3e4b40':b.trim);}
   }
   if(front&&b.style==='low-shop'){for(let u=.5;u<f.len;u+=2.8){f.panel(u,h-.18,.51,.075,.10,1.02,'#384a3d',true);yield;}f.panel(f.len/2,h-.10,.54,f.len,.13,1.08,'#4c5a4b');}
   if(!front&&plain)continue;
   for(const d of b.doors){
    const a0=f.at(0),a1=f.at(1),u=(d.x-a0[0])*(a1[0]-a0[0])+(d.z-a0[1])*(a1[1]-a0[1]);
    if(u<.5||u>f.len-.5||pointSegmentDistance([d.x,d.z],f.at(0),f.at(f.len))>.22)continue;
    const rise=d.rise,top=ground(d.x,d.z)+.12+rise,hh=Math.min(2.85,storey-.45),doorBottom=top-y;
    f.panel(u,doorBottom+hh/2,.57,d.width,hh,.025,historic?'#665040':'#394e4e',false,historic?0:1);
    if(b.style==='door85')f.panel(u,doorBottom+hh/2,.61,d.width,hh,.04,'#365365');
    if(historic)for(const v of[-1,1])for(const yy of[.7,1.45,2.18])f.panel(u+v*d.width*.24,doorBottom+yy,.60,d.width*.35,.46,.07,'#82644b',true);
    for(const side of[-1,1])f.panel(u+side*(d.width/2+.13),doorBottom+hh/2,.34,.24,hh+.3,.68,b.trim);
    f.panel(u,doorBottom+hh+.11,.36,d.width+.49,.22,.72,b.trim);
    if(d.style==='arch')a.arch(f,u,doorBottom+hh*.65,d.width,hh*.35+.45,y,'#3d4f4b',b.trim);
    if(d.style==='canopy'||['optic','sis','serotinski','primtravel'].includes(b.style)){
     f.panel(u,doorBottom+hh+.45,.80,d.width+1.2,.14,1.6,b.roof);
     for(const d0 of[-1,1]){f.panel(u+d0*(d.width/2+.42),doorBottom+hh/2,.98,.055,hh,.055,'#3f4b3e',true);for(const y0 of[.48,.98]){const near=f.at(u+d0*(d.width/2+.27),.10),far=f.at(u+d0*(d.width/2+.27),d.depth);beam(new T.Vector3(near[0],top+y0,near[1]),new T.Vector3(far[0],top-rise+y0,far[1]),.025,'#445140');}}
    }
    const n=Math.max(1,Math.ceil(rise/.14)),depth=d.depth||n*.3,angle=Math.atan2(-(a1[1]-a0[1]),a1[0]-a0[0]);
    for(let k=0;k<(b.style==='ctas87'?0:n);k++){const v=depth-(k+.5)*depth/n,p=f.at(u,v),low=ground(p[0],p[1])+.12,step=Math.max(low,top-rise+(k+1)*rise/n);box(p[0],step-.24,p[1],d.width+.55,.48,depth/n,b.style==='optic'?'#89614e':'#a19f8b',false,true,angle);yield;}
   }
   yield;
  }
  if(b.style==='monami'){
   const cx=487.28,cz=329.61,low=ground(cx-1.8,cz-1.8)+.12;
   for(let k=0;k<6;k++){const r=2.25-k*.27,shape=new T.Shape();shape.moveTo(0,0);shape.absarc(0,0,r,Math.PI/2,Math.PI,false);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false,steps:1,curveSegments:12});g.rotateX(-Math.PI/2);g.translate(cx,low+(k+1)*.14-.22,cz);put(g,'#a79f87',false,true);yield;}
   a.column(cx+.15,cz+.15,y+.7,7.2,.70,'#c1b28f',true);
  }
 }
 for(const b of buildings)m.job(b.title,b.p as XY[],b.nativeIds??[Number(b.id.slice(1))].filter(Number.isFinite),()=>build(b));
 return m;
}
