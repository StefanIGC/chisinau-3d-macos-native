import * as T from 'three';
import realm from '../data/sciusev-alecsandri.json';
import catalog from '../data/sciusev-alecsandri-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** Original bounded geometry, informed by Street View2025, satellite and facade
 * photographs. Unseen elevations and the missing39 plan remain estimates. */
export function createSciusevAlecsandri(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Alecsandri–Armenească',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('alec')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('alec')) as PhotoBuilding[],'Șciusev Alecsandri · curți complete');
 const l=landscapeLayer(scene,'Șciusev Alecsandri · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const grilles=(f:Face,u:number,yy:number,w=1.15,h=2.0)=>{for(let x=-w/2;x<=w/2;x+=.21)f.panel(u+x,yy,.52,.025,h,.035,'#47584d',true);for(const dh of[-h*.37,h*.37])f.panel(u,yy+dh,.54,w,.028,.035,'#47584d',true);};
 const ac=(f:Face,u:number,yy:number)=>{f.panel(u,yy,.44,.65,.47,.48,'#a9b0a2');for(let d=-.22;d<=.22;d+=.11)f.panel(u+d,yy,.71,.025,.3,.025,'#6a7a6c',true);};
 const stairs=(f:Face,u:number,w:number,rise:number)=>{
  const n=Math.max(1,Math.ceil(rise/.13)),run=n*.28,foot=f.at(u,run+.3),low=ground(...foot)+.045,top=low+rise,p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  for(let k=0;k<n;k++){const v=.2+(k+.5)*.28,p=f.at(u,v),h=top-k*rise/n;m.box(p[0],h-.11,p[1],w,.22,.30,'#95988a',false,true,angle);}return top-f.y;
 };
 function rail(f:Face,u:number,yy:number,w:number,depth=1.0,ornate=false){
  f.panel(u,yy,depth/2,w,.16,depth,'#b2af9a');
  for(const dh of[.2,.95])f.panel(u,yy+dh,depth,w,.04,.04,'#3d4b42',true);
  for(let du=-w/2;du<=w/2;du+=.24)f.panel(u+du,yy+.57,depth,.025,.82,.025,'#3d4b42',true);
  if(ornate)for(let du=-w/2+.4;du<w/2;du+=.65){const p=f.at(u+du,depth),p0=f.at(0),p1=f.at(1),g=new T.TorusGeometry(.27,.018,4,12);g.scale(.7,1.1,1);g.rotateY(Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]));g.translate(p[0],f.y+yy+.58,p[1]);m.put(g,'#3d4b42',true);}
 }
 function steppedGable(f:Face,u:number,yy:number,w:number,h:number){
  for(let k=0;k<4;k++){const width=w*(1-k*.20),height=h/4;f.panel(u,yy+(k+.5)*height,.13,width,height,.26,'#aca18a');f.panel(u,yy+(k+1)*height,.23,width+.18,.13,.46,'#996b52');}
  f.panel(u,yy+h*.42,.30,.35,.65,.04,'#546052');
 }
 // Roof tessellation follows each real footprint, including concavities/holes.
 function* roof(b:PhotoBuilding,y:number){
  const shape=new T.Shape();b.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));for(const r of b.holes){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));shape.holes.push(hole);}
  const src=new T.ShapeGeometry(shape);src.rotateX(-Math.PI/2);const g=src.toNonIndexed(),v=g.attributes.position,out:number[]=[],xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),run=Math.max(2,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2);
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.16+b.roofRise*Math.min(1,d/run),p[1]];};
  function tri(a:XY,b:XY,c:XY,depth=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(depth<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,depth+1);tri(p,b,c,depth+1);}else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,depth+1);tri(a,p,c,depth+1);}else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,depth+1);tri(p,b,c,depth+1);}return;}out.push(...vertex(a),...vertex(b),...vertex(c));}
  for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
  src.dispose();g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.computeVertexNormals();m.put(result,b.roof,false,true);
 }
 for(const b of custom)m.job(b.title,b.p as XY[],b.id.startsWith('local-')?[]:[Number(b.id.slice(1))],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  if(b.passages.length){const clearance=b.passages[0].clearance;for(const p of b.passages[0].walls)m.solid(p[0] as XY[],clearance+5,y-5,b.wall,true,p.slice(1) as XY[][]);m.solid(b.p as XY[],h-clearance,y+clearance,b.wall,true,b.holes as XY[][]);}
  else m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<(b.style==='alecCorner27'?4:1.8),side44=b.style==='alec44'&&q[0]<p[0]-.8;
   const inPassage=(u:number)=>{const pt=f.at(u);return b.passages.some(s=>pt[0]>Math.min(...s.rings[0].map(p=>p[0]))-.3&&pt[0]<Math.max(...s.rings[0].map(p=>p[0]))+.3);};
   // Keep the low plinth discontinuous at the true carriage passage.
   for(let u=.3;u<f.len;u+=.6)if(!inPassage(u))f.panel(u,.36,.07,Math.min(.6,f.len-u+.3),.72,.14,'#878b7c');
   if(!(front&&b.style==='alecCorner27'))a.cornice(f,h,b.trim);
   if(side44&&f.len>6){const u=f.len*.55,r=stairs(f,u,2.0,.65);a.door(f,u,3.0,1.3,'#776950');rail(f,u,r,2.0,1.65);continue;}
   if(!front||f.len<4){if(f.len>2.7)yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),2.05,b.trim,'#796956');continue;}
   if(b.style==='alec35a'){
    for(let row=0;row<2;row++)for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(row===0&&k===4)continue;f.window(u,2.05+row*3.75,1.25,2.3,b.trim,'#a1a78f');a.pediment(f,u,3.32+row*3.75,1.78,.28,y,'#a77459');yield;}
    for(const u of[f.len*.1,f.len*.90])steppedGable(f,u,h+.05,3.35,2.8);
    const door=f.len*.90,r=stairs(f,door,2.35,.48);a.arch(f,door,r,1.4,3.0,y,'#7f5742',b.trim);rail(f,door,4.0,2.8,1.0,true);
    for(const u of[.25,f.len*.2,f.len*.8,f.len-.25])f.panel(u,h/2,.13,.28,h,.26,'#b1a991');
   }else if(b.style==='alec35b'){
    const start=f.len-8.0,door=start+1.65;
    // West8m is the historic basement facade; the east shop shares its plan.
    f.panel(start/2,2.6,.10,start,5.15,.20,'#c3c0ad');const shopDoor=start-1.6,r=stairs(f,shopDoor,1.7,.91);f.window(shopDoor,r+1.4,1.4,2.8,'#b6b29d','#8c6954');
    for(let u=1.6;u<start-3;u+=3.2)f.window(u,2.65,2.0,2.2,'#b8b7a4','#7a6d5b');
    a.arch(f,door,.14,1.8,4.85,y,'#704837',b.trim);steppedGable(f,door,h+.10,3.0,2.0);a.pediment(f,door,h-.2,3.6,.8,y,b.trim);
    for(const u of[start+4.5,start+6.7]){f.window(u,3.45,1.15,2.15,b.trim,'#685e4c');grilles(f,u,3.45,1.08,2.1);f.window(u,.76,1.03,.85,'#aaa696','#58694f');for(const yy of[2.32,4.67])f.panel(u,yy,.25,1.55,.18,.34,'#a06c53');}
    f.panel((start+f.len)/2,1.46,.15,8,.17,.3,'#9b9e8c');
   }else if(b.style==='alec37'){
    for(let k=0;k<7;k++){const u=(k+.5)*f.len/7;f.window(u,5.88,1.17,2.10,b.trim,'#8d8a73');yield;}
    for(const u of[.3,f.len*.77,f.len-.3])for(const dx of[-.11,0,.11])f.panel(u+dx,6,.18,.055,3.7,.12,b.trim,true);
    for(const u of[f.len*.21,f.len*.38,f.len*.56])f.window(u,2.4,1.22,2.1,b.trim,'#919583');
    for(const u of[.9,f.len*.68]){stairs(f,u,1.65,.52);a.door(f,u,3.05,1.15,'#88917c');}
    f.panel(f.len*.35,1.27,1.15,5.0,.12,2.3,'#7c8274');
    for(let u=f.len*.15;u<f.len*.54;u+=.3)f.panel(u,.65,2.24,.025,1.18,.025,'#48564a',true);
    f.panel(f.len/2,4.0,.22,f.len,.22,.44,b.trim);
   }else if(b.style==='alec39'){
    for(let k=0;k<7;k++){const u=(k+.5)*f.len/7;if(k===4){stairs(f,u,2.6,.78);a.door(f,u,3.5,1.4,'#59634f');a.pediment(f,u,4.10,2.75,1.3,y,b.trim);continue;}f.window(u,3.15,1.16,2.30,b.trim,'#806653');f.panel(u,1.67,.24,1.60,.21,.30,b.trim);f.panel(u,4.6,.20,1.65,.21,.4,b.trim);yield;}
    for(let u=.7;u<f.len;u+=1.15)f.panel(u,5.30,.32,.4,.24,.035,'#596250');
    f.panel(f.len/2,.69,.08,f.len,1.38,.16,'#8c8576');
   }else if(b.style==='alec44'){
    f.panel(f.len/2,.75,.09,f.len,1.50,.18,'#86877b');
    for(let k=0;k<7;k++){const u=(k+.5)*f.len/7;a.arch(f,u,1.48,1.55,2.7,y,'#52676a',b.trim);f.panel(u,2.7,.48,.06,2.3,.07,'#6f6656',true);f.panel(u,3.55,.49,1.5,.06,.07,'#6f6656',true);f.panel(u,1.2,.29,1.95,.21,.38,b.trim);f.window(u,.55,.62,.60,'#9d9d8c','#737a68');yield;}
    for(let k=0;k<9;k++){const u=(k+.35)*f.len/9;f.panel(u,.7,.20,.7,.37,.04,k%2?'#9b9c8d':'#747d72',true);}
   }else if(b.style==='alec46'){
    const start=Math.max(0,f.len-9.8);
    for(let u=1.3;u<start;u+=2.9){f.window(u,2.25,1.0,1.8,'#c0c1ad','#75816d');grilles(f,u,2.25,.98,1.75);yield;}
    const door=start+2.0;f.panel(door-1.0,1.43,.23,1.35,2.8,.025,'#748253');f.window(door+.5,1.45,1.05,2.75,'#baa78d','#79583f');
    f.label('GARDINA',door,3.4,.33,'#796546');
    // Curved canopy, modeled as short opaque strips rather than a texture.
    for(let k=0;k<12;k++){const t=(k+.5)/12,u=door-2.0+4*t;f.panel(u,3.42+.55*Math.sin(Math.PI*t),1.0,.35,.07,2.0,'#835d43');}
    for(const dx of[-1.85,1.85]){const p=f.at(door+dx,.15),q=f.at(door+dx,1.95);m.beam(new T.Vector3(p[0],y+2.4,p[1]),new T.Vector3(q[0],y+3.42,q[1]),.035,'#4e5142');}
    stairs(f,door,3.8,.13);
    for(let k=0;k<12;k++){const u=door-1.8+(k%3)*.65,yy=.48+Math.floor(k/3)*.76;f.panel(u,yy,.14,.35+(k%2)*.12,.25,.08,'#a69574',true);}
    const display=start+7.1;f.panel(display,2.1,.58,4.9,3.65,1.15,'#8a7152');f.panel(display,2.1,1.18,4.55,3.3,.025,'#809b93',false,1);for(let k=-2;k<=2;k++)f.panel(display+k*.91,2.1,1.21,.055,3.35,.06,'#886342',true);f.panel(display,3.28,1.23,4.65,.06,.06,'#886342',true);
    for(let k=0;k<10;k++)f.panel(display-2.12+k*.47,2.0,1.205,.065,2.8,.035,'#a6b7a4',true);
   }else if(b.style==='alec40'){
    for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;f.window(u,2.15,1.0,2.05,b.trim,'#6b6656');grilles(f,u,2.15,.96,2.0);yield;}
   }else if(b.style==='alecShop'){
    f.panel(f.len/2,h-.15,.24,f.len,.64,.48,'#ac9c59');
    for(let k=0;k<3;k++){const u=(k+.5)*f.len/3;if(k===0||k===2)f.window(u,1.65,1.1,2.9,'#c4c9b6','#b9beaa');else f.window(u,2.1,1.05,1.9,b.trim,'#abb49f');}ac(f,f.len*.66,3.3);
   }else if(b.style==='alecVilla'){
    for(const u of[f.len*.15,f.len*.40,f.len*.65])f.window(u,2.6,1.2,2.3,b.trim,'#7e6d55');const u=f.len*.88;stairs(f,u,2,.65);a.door(f,u,3.2,1.2,'#736045');rail(f,u,.7,2.1,1.5);
    a.pediment(f,f.len*.54,h-.1,f.len*.60,.8,y,b.trim);for(const u of[.25,f.len-.25])f.panel(u,2.65,.18,.3,4.6,.35,b.trim);
   }else if(b.style==='alec38'){
    for(let row=0;row<2;row++)for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;if(row===0&&k===3)continue;f.window(u,2.08+row*3.7,1.6,2.15,b.trim,'#8e714f');f.panel(u,3.3+row*3.7,.25,1.98,.17,.34,b.trim);yield;}
    const u=f.len*.9,r=stairs(f,u,2.0,.65);a.door(f,u,3.15,1.4,'#8d7450');rail(f,u,r,2.4,1.4,true);f.panel(f.len/2,3.9,.19,f.len,.32,.38,b.trim);for(let yy=.85;yy<h;yy+=.48)f.panel(f.len/2,yy,.13,f.len,.027,.028,'#999e8c',true);
   }else if(b.style==='alecBrick'){
    f.panel(f.len/2,.45,.14,f.len,.90,.28,'#76674c');for(let yy=.9;yy<h;yy+=.25)f.panel(f.len/2,yy,.15,f.len,.025,.03,'#9c8965',true);
    for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(k===0){stairs(f,u,1.45,.39);a.door(f,u,3.0,1.0,'#5b5847');}else{f.window(u,2.40,.74,2.4,b.trim,'#66624c');grilles(f,u,2.40,.72,2.35);}f.panel(u+.7,2.6,.18,.23,3.9,.07,'#9f7252');yield;}
   }else if(b.style==='alecCorner27'){
    if(p[0]>760){
     // Modern east corner: rounded balcony and its vertical service strip.
     for(let row=0;row<2;row++)for(let k=0;k<3;k++){const u=(k+.5)*f.len/3;if(row===0&&k===0)continue;f.window(u,1.85+row*3.2,1.20,2.0,'#c6c9b8','#b8c1af');}
     f.panel(f.len/2,.48,.18,f.len,.96,.36,'#4e6471');stairs(f,1.2,1.65,.26);a.door(f,1.2,2.7,1.0,'#b7c0ad');
     const pt=f.at(1.5,.4),g=new T.CylinderGeometry(1.3,1.3,.2,16);g.translate(pt[0],y+3.2,pt[1]);m.put(g,'#bfc2b1');for(let k=0;k<13;k++){const t=Math.PI*k/12,pp=f.at(1.5+1.25*Math.cos(t),.4+1.25*Math.sin(t));m.box(pp[0],y+3.74,pp[1],.027,1.0,.027,'#46564b');if(k) {const t0=Math.PI*(k-1)/12,p0=f.at(1.5+1.25*Math.cos(t0),.4+1.25*Math.sin(t0));m.beam(new T.Vector3(p0[0],y+4.22,p0[1]),new T.Vector3(pp[0],y+4.22,pp[1]),.024,'#46564b');}}
     for(let k=0;k<5;k++)ac(f,.32,2.4+k*.8);a.cornice(f,h,b.trim);
    }else{
     const half=f.len*.50;
     // Narrow gabled27/10 and AGE CONTROL are distinct facades in one OSM plan.
     f.panel(half/2,2.9,.12,half,5.8,.24,'#b6ac93');a.pediment(f,half/2,6.0,half,1.6,y,'#706953');
     for(const u of[half*.26,half*.75]){f.window(u,4.75,.85,1.65,b.trim,'#56604f');grilles(f,u,4.75,.83,1.6);ac(f,u,6.0);}stairs(f,half/2,half-.2,.13);a.door(f,half/2,2.7,1.10,'#4e5142');f.panel(half/2,3.2,.9,half+.1,.15,1.8,'#97634c');
     const mid=half+(f.len-half)/2;f.panel(mid,h/2,.20,f.len-half,h,.40,'#b9ab8e');
     for(let row=0;row<2;row++)for(let k=0;k<3;k++){const u=half+(k+.5)*(f.len-half)/3;if(row===0&&k===1){stairs(f,u,1.4,.26);a.door(f,u,2.95,.95,'#735a40');}else a.arch(f,u,.65+row*3.3,.90,2.65,y,'#60736c','#c5b897');}
     rail(f,mid,3.65,f.len-half-.1,.85,true);f.label('AGE CONTROL',mid,4.04,.17,'#ded2b6',.89);a.cornice(f,h,'#c9b99b');
    }
   }
   yield;
  }
 });
 // Courtyard boundaries stop at the interactive leaves; no hidden solid wall.
 const walls:[XY,XY,string,number][]=[[[694.5,605],[695.0,605],'#aba48c',2.9],[[698.7,605],[702.6,605],'#b2ab95',2.9],[[733.03,605],[734.1,605],'#b4aa92',2.5],[[746.53,605.7],[747.4,605.7],'#afa38a',2.3],[[750.1,605.7],[751.55,605.7],'#afa38a',2.3],[[737.4,629],[740,629],'#ad9f89',2.2]];
 for(const[p,q,color,h]of walls)m.job('zid curte',[p,q],[],function*(){const x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;m.box(x,ground(x,z)+h/2,z,q[0]-p[0],h,.20,color,false,true);yield;});
 m.job('portal turcoaz',streetRect(696.85,605,4.4,1),[],function*(){const y=ground(696.85,605),f=m.facade([694.5,605],[699.3,605],y);a.pediment(f,2.35,3.0,4.7,1.15,y,'#b0aa91');for(const x of[694.8,698.95])m.box(x,y+1.5,605,.28,3,.32,'#beb79f',false,true);yield;});
 for(const[x,z,h]of realm.trees)m.job('arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.18,.32,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#656951',false,true);for(const[dx,dy,dz,r]of[[0,.67,0,2.7],[-1.7,.62,.5,2.0],[1.5,.75,-.4,2.2],[0,.9,0,1.9]]){const g=new T.IcosahedronGeometry(r,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#657e49');yield;}});
 const poles:XY[]=[[647.755,612.9],[685,612.8],[714,612.8],[748.626,626.988],[771.153,657.651]];
 for(const[x,z]of poles)m.job('stâlp',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.8,z,.17,7.6,.17,'#989c8c',false,true);m.beam(new T.Vector3(x,y+7.0,z),new T.Vector3(x,y+7.5,z+1.2),.04,'#657363');m.box(x,y+7.5,z+1.2,.24,.12,.55,'#adb19e');yield;});
 for(let i=1;i<poles.length-1;i++)m.job('cabluri',[poles[i-1],poles[i]],[],function*(){const p=poles[i-1],q=poles[i];for(let wire=0;wire<5;wire++)for(let k=0;k<4;k++){const point=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7.0-.25*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+wire*.13);m.beam(point(k/4),point((k+1)/4),.012,'#4a574a');yield;}});
 // Existing signal subsystem remains unchanged; these local housings are static.
 for(const[x,z,dir]of[[636.6,613.0,-1],[621,624.7,1]])m.job('semafor Alecsandri',streetRect(x,z,2,2),[],function*(){const y=ground(x,z);m.box(x,y+2.8,z,.15,5.6,.15,'#929987',false,true);m.beam(new T.Vector3(x,y+5.55,z),new T.Vector3(x+dir*1.0,y+6.15,z+dir*1.3),.09,'#929987');m.beam(new T.Vector3(x+dir*1,y+6.15,z+dir*1.3),new T.Vector3(x+dir*1.1,y+6.15,z+dir*4.8),.09,'#929987');const f=m.facade([x-.25,z+dir*4.8],[x+.25,z+dir*4.8],y);f.panel(.25,5.8,0,.45,1.2,.3,'#374338');for(const[dy,color]of[[.38,'#653f34'],[0,'#b58b32'],[-.38,'#365745']] as const){const p=f.at(.25,.17),g=new T.CircleGeometry(.125,10);g.translate(p[0],y+5.8+dy,p[1]);m.put(g,color,true);}yield;});
 for(const[x,z]of[[637,612.4],[634.4,625.1],[620.8,607.2],[765.4,625.8]])m.job('trecere pietoni',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),f=m.facade([x-.32,z],[x+.32,z],y);m.box(x,y+1.4,z,.05,2.8,.05,'#9ca38f',false,true);f.panel(.32,2.5,0,.66,.66,.08,'#a5b95c');f.panel(.32,2.5,.05,.53,.53,.02,'#467497');a.pediment(f,.32,2.29,.45,.39,y,'#c9cfb8');yield;});
 m.job('coș Alecsandri',streetRect(633.572,614.537,1,1),[],function*(){const y=ground(633.572,614.537),g=new T.CylinderGeometry(.27,.24,.72,10);g.translate(633.572,y+.42,614.537);m.put(g,'#697968',false,true);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
