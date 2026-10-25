import * as T from 'three';
import realm from '../data/sciusev-parcalab.json';
import catalog from '../data/sciusev-parcalab-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** Original bounded geometry, informed by Street View2025, satellite and facade
 * photographs. Unseen elevations and small dimensions remain estimates. */
export function createSciusevParcalab(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Pârcălab–Eminescu',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('par')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('par')) as PhotoBuilding[],'Șciusev Pârcălab · curți complete');
 const l=landscapeLayer(scene,'Șciusev Pârcălab · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
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
 // Roof tessellation follows each real footprint, including concavities/holes.
 function* roof(b:PhotoBuilding,y:number){
  const shape=new T.Shape();b.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));for(const r of b.holes){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));shape.holes.push(hole);}
  const src=new T.ShapeGeometry(shape);src.rotateX(-Math.PI/2);const g=src.toNonIndexed(),v=g.attributes.position,out:number[]=[],xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),run=Math.max(2,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2);
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.16+b.roofRise*Math.min(1,d/run),p[1]];};
  function tri(a:XY,b:XY,c:XY,depth=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(depth<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,depth+1);tri(p,b,c,depth+1);}else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,depth+1);tri(a,p,c,depth+1);}else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,depth+1);tri(p,b,c,depth+1);}return;}out.push(...vertex(a),...vertex(b),...vertex(c));}
  for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
  src.dispose();g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.computeVertexNormals();m.put(result,b.roof,false,true);
 }
 const canopy=(f:Face,u:number,yy:number,w:number,depth=1.45)=>{for(const side of[-1,1]){const p=f.at(u,depth/2),q=f.at(u+side*w/2,depth/2);m.beam(new T.Vector3(q[0],f.y+yy,q[1]),new T.Vector3(p[0],f.y+yy+.40,p[1]),.055,'#465248');}for(let k=0;k<10;k++){const du=-w/2+(k+.5)*w/10;f.panel(u+du,yy+.4*(1-Math.abs(du)/(w/2)),depth/2,w/10+.015,.06,depth,'#596659');}};
 const pilasters=(f:Face,h:number,c:string)=>{for(const u of[.25,f.len-.25]){f.panel(u,h/2,.16,.42,h,.30,c);for(let yy=.6;yy<h;yy+=.55)f.panel(u,yy,.33,.48,.18,.06,c,true);}};
 const balustrade=(f:Face,yy:number,c:string)=>{for(const dh of[0,.92])f.panel(f.len/2,yy+dh,.42,f.len,.14,.28,c);for(let u=.18;u<f.len;u+=.40){f.panel(u,yy+.46,.42,.11,.84,.15,c,true);f.panel(u,yy+.34,.42,.21,.20,.21,c,true);}};
 const brick=(f:Face,h:number,start=0,end=f.len)=>{for(let yy=1.45;yy<h-.35;yy+=.24){f.panel((start+end)/2,yy,.062,end-start,.018,.018,'#9c7653',true);for(let u=start+((Math.round(yy/.24)%2)*.25);u<end;u+=.52)f.panel(u,yy+.12,.066,.018,.23,.02,'#9c7653',true);}};
 const barrel=(f:Face,u:number,yy:number,w:number,depth:number)=>{const vertices:number[]=[];for(let k=0;k<16;k++){const u0=-w/2+k*w/16,u1=-w/2+(k+1)*w/16,h0=yy+.55*Math.sqrt(Math.max(0,1-(u0/(w/2))**2)),h1=yy+.55*Math.sqrt(Math.max(0,1-(u1/(w/2))**2)),p0=f.at(u+u0,.15),p1=f.at(u+u1,.15),p2=f.at(u+u0,depth),p3=f.at(u+u1,depth);vertices.push(p0[0],f.y+h0,p0[1],p1[0],f.y+h1,p1[1],p2[0],f.y+h0,p2[1],p1[0],f.y+h1,p1[1],p3[0],f.y+h1,p3[1],p2[0],f.y+h0,p2[1]);m.beam(new T.Vector3(p2[0],f.y+h0,p2[1]),new T.Vector3(p3[0],f.y+h1,p3[1]),.025,'#3f4d42');}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();m.put(g,'#485749');};
 const floral=(f:Face,u:number,base:number,h:number)=>{for(let yy=base;yy<base+h;yy+=.32){f.panel(u,yy,.40,.11,.22,.04,'#994d3f',true);f.panel(u-.12,yy,.40,.10,.10,.04,'#4c5545',true);f.panel(u+.12,yy,.40,.10,.10,.04,'#4c5545',true);}};
 for(const b of custom)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  if(b.style==='par52'){
   // Current hotel: five distinct volumes, broad brown glazed grids and small
   // upper setbacks. No historic demolished house or white imported block.
   const parts=b.parts as unknown as {p:XY[];height:number;base:number}[];
   for(const part of parts){m.solid(part.p,part.height+(part.base===0?5:0),y+part.base-(part.base===0?5:0),b.wall,true);yield;
    for(const f of a.faces(part.p,y+part.base)){
     const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]-p[1]>.8&&p[1]>b.anchor[1]-2;
     a.cornice(f,part.height,b.trim);
     if(front&&part.base===0){
      f.panel(f.len/2,.38,.10,f.len,.76,.20,'#807364');
      for(let k=0;k<8;k++){const u=(k+.5)*f.len/8;if(k===5){const rise=stairs(f,u,2.9,.52);f.panel(u,2.15,.1,2.0,3.6,.04,'#4e493c');a.door(f,u,3.5,1.7,'#644d38');rail(f,u,rise,2.9,1.50);continue;}f.window(u,2.40,1.5,3.1,b.trim,'#80533d');a.arch(f,u,3.73,1.8,.65,y,b.trim,b.trim,0);yield;}
      balustrade(f,5.2,b.trim);f.panel(f.len*.688,5.35,.42,3.1,1.5,.35,b.trim);f.label('AMBASSADOR',f.len*.688,4.60,.19,'#b79a51',.67);
     }else if(front){
      for(let k=0;k<3;k++){const u=(k+.5)*f.len/3,w=f.len/3-.55;f.panel(u,part.height/2,.035,w,2.82,.07,'#849b91',false,1);for(let j=0;j<5;j++)f.panel(u-w/2+j*w/4,part.height/2,.12,.085,2.9,.10,'#78553e');for(const yy of[.4,1.75,part.height-.4])f.panel(u,yy,.12,w,.09,.10,'#78553e');yield;}
      for(let k=0;k<=3;k++)f.panel(Math.min(f.len-.16,Math.max(.16,k*f.len/3)),part.height/2,.18,.38,part.height,.35,b.trim);
      if(part.base>15)balustrade(f,part.height+.2,b.trim);
     }else if(f.len>3){const n=Math.max(1,Math.round(f.len/4));for(let k=0;k<n;k++){f.window((k+.5)*f.len/n,part.height/2,1.3,Math.min(2.5,part.height-.7),b.trim,'#805c44');yield;}}
    }
   }
   m.solid(parts.at(-1)!.p,.16,y+h,b.roof,true);return;
  }
  m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<1.8;
   const corner=(b.style==='par47'&&q[0]>p[0]+.8)||(b.style==='par26'&&q[0]<p[0]-.8)||(b.style==='par53corner'&&q[0]<p[0]-.8);
   f.panel(f.len/2,.4,.06,f.len,.8,.12,'#858b7b');a.cornice(f,h,b.trim);
   if((!front&&!corner)||f.len<4){if(f.len>3){const bays=Math.max(1,Math.round(f.len/4));for(let r=0;r<b.levels;r++)for(let k=0;k<bays;k++){f.window((k+.5)*f.len/bays,2.05+r*(h-.65)/b.levels,1.25,2.0,b.trim,'#7d7762');yield;}}if(b.style==='par54villa'&&q[0]<p[0]-.8)for(let k=0;k<3;k++)ac(f,2+k*1.4,7.1);continue;}
   if(b.style==='par47'){
    f.panel(f.len/2,.73,.09,f.len,1.46,.18,'#848c83');brick(f,h);
    const n=corner?6:4;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,3.42,1.30,2.65,b.trim,'#6d533c');f.window(u,.63,.78,.73,'#9aa090','#485f54');f.panel(u,1.78,.24,1.85,.48,.34,b.trim);a.arch(f,u,4.83,1.62,.48,y,b.trim,b.trim,0);for(let j=0;j<4;j++)f.panel(u,4.74-j*.09,.3+j*.17,1.73,.12,.24,'#677446');yield;}
    for(const u of[.2,f.len*.5,f.len-.2]){f.panel(u,h+.43,.10,.65,1.10,.30,b.wall);f.panel(u,h+.95,.16,.92,.18,.44,b.trim);}
    f.panel(f.len/2,h+.22,.08,f.len,.4,.18,b.wall);for(let u=.7;u<f.len;u+=.7)f.panel(u,h-.46,.15,.24,.35,.16,b.trim,true);
    if(front)f.label('OLIVA VERDE',f.len*.5,5.20,.23,'#ded2b7');
   }else if(b.style==='par49a'){
    // East brick wing plus west green frontage share one mapped long body.
    f.panel(f.len*.18,h/2,.024,f.len*.36,h,.048,'#b7845c');brick(f,h,0,f.len*.36);
    for(const t of[.09,.27]){f.window(f.len*t,2.80,1.15,2.4,'#c4bd9f','#735a42');f.panel(f.len*t,1.38,.25,1.6,.38,.3,'#c4bd9f');}
    for(const t of[.48,.89]){f.window(f.len*t,2.15,1.65,2.25,b.trim,'#586451');grilles(f,f.len*t,2.15,1.58,2.16);}
    const u=f.len*.68;stairs(f,u,2.0,.52);a.door(f,u,3.05,1.35,'#514e3f');f.panel(f.len*.69,h+.2,.13,f.len*.62,.55,.26,b.wall);
    for(let u=f.len*.43;u<f.len-.2;u+=.64)a.arch(f,u,h+.02,.25,.46,y,'#344d41',b.wall,0);f.panel(f.len*.69,h+.55,.15,2.2,.52,.30,b.wall);
   }else if(b.style==='par49b'){
    f.panel(f.len/2,.30,.12,f.len,.60,.24,'#414c43');
    for(let k=0;k<7;k++){const u=(k+.5)*f.len/7;if(k===1){const r=stairs(f,u,2.75,.91);a.door(f,u,3.7,1.45,'#4f4b3c');rail(f,u,r,2.75,2.35,true);}else{f.window(u,2.45,1.00,2.55,'#4d4b3c','#625542');}yield;}
    f.panel(f.len*.95,h/2,.03,f.len*.10,h,.06,'#c4b48d');
   }else if(b.style==='par51'){
    f.panel(f.len/2,.65,.1,f.len,1.3,.20,'#9b9382');
    for(let k=0;k<5;k++){const u=f.len*(.075+k*.125);f.window(u,2.55,.95,2.45,b.trim,'#786f55');for(const d of[-.66,.66])floral(f,u+d,1.42,2.7);yield;}
    const u=f.len*.76,r=stairs(f,u,2.75,.78);a.door(f,u,3.55,1.45,'#444e3e');rail(f,u,r,2.75,2.0,true);for(const d of[-1.10,1.10])floral(f,u+d,.90,3.15);a.pediment(f,u,4.45,3.5,.78,y,b.trim);f.panel(u,4.08,.58,3.5,.88,.10,'#4f7651');f.label('LA ȘEZĂTOARE',u,4.1,.18,'#d0c9a5',.67);
    const v=f.len*.935;f.panel(v,2.38,.11,f.len*.13,1.75,.10,'#b8bdaf',false,1);f.panel(v,1.30,.24,f.len*.13,.3,.30,b.trim);
   }else if(b.style==='par53'){
    f.panel(f.len/2,.8,.08,f.len,1.6,.16,'#a8afa4');
    for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(k===2){a.arch(f,u,.14,1.85,5.10,y,'#544c3d',b.trim,0);f.panel(u,1.8,.41,1.72,3.4,.04,'#524d3d');for(const d of[-1.3,1.3]){f.panel(u+d,4.55,.25,.57,3.1,.50,b.trim);f.panel(u+d,5.68,.38,.83,.27,.76,b.trim);}barrel(f,u,4.6,2.6,1.3);continue;}
     a.arch(f,u,2.03,1.38,2.8,y,'#6b8075',b.trim,1);f.panel(u,3.2,.4,.055,2.45,.05,'#736750');f.panel(u,3.62,.4,1.3,.07,.05,'#736750');f.window(u,.73,1.0,.95,'#bdc0ac','#566456');grilles(f,u,.73,.96,.92);yield;}
    for(let yy=1.85;yy<6.1;yy+=.48){for(let u=.35;u<f.len;u+=1.12)f.panel(u,yy,.017,1.05,.025,.025,'#938f7b',true);yield;}
    for(let k=0;k<5;k++)for(let j=0;j<3;j++)f.panel((k+.5)*f.len/5+(j-1)*.34,h-.46,.18,.22,.23,.03,'#626a5a',true);pilasters(f,h,b.trim);
   }else if(b.style==='par54villa'){
    f.panel(f.len/2,.42,.09,f.len,.84,.18,'#756b5d');
    const u=f.len*.5;for(const t of[.13,.30,.70,.87])for(const yy of[2.05,5.50]){f.window(f.len*t,yy,.86,1.95,b.trim,'#969b89');yield;}
    f.panel(u,5.10,.5,3.2,2.8,1.0,b.trim);f.window(u,5.2,2.7,2.2,b.trim,'#99a293',.8);f.panel(u,3.55,.7,3.55,.30,1.45,b.trim);
    const r=stairs(f,u,3.6,.52);a.door(f,u,3.45,1.75,'#645441');for(const d of[-1.43,1.43])f.panel(u+d,1.8,.35,.40,3.6,.55,'#75685b');
    a.pediment(f,f.len/2,h+.08,f.len+.6,2.0,y,b.trim);a.arch(m.facade(f.at(0,.35),f.at(f.len,.35),y),u,h-.2,1.2,1.62,y,'#899788',b.trim,1);rail(f,u,h-.15,2.4,.85);for(const t of[.23,.77])f.window(f.len*t,h+.1,.7,1.08,b.trim,'#8c9787',.2);
    for(const yy of[3.5,3.75,6.8,7.0])f.panel(f.len/2,yy,.14,f.len,.13,.28,b.trim);void r;
   }else if(b.style==='par54low'){
    for(const t of[.12,.36,.87]){f.window(f.len*t,1.94,1.35,1.96,b.trim,'#507767');grilles(f,f.len*t,1.94,1.29,1.90);}
    const u=f.len*.62;stairs(f,u,1.8,.26);a.door(f,u,3.08,1.35,'#566456');f.panel(u,3.55,.18,2.55,1.4,.36,b.wall);f.panel(u,4.52,.21,2.9,.22,.42,b.trim);
    f.panel(f.len/2,h+.04,.14,f.len,.45,.28,b.wall);for(const t of[.02,.98]){f.panel(f.len*t,h+.28,.1,.50,.90,.40,b.trim);a.pediment(f,f.len*t,h+.73,.55,.36,y,'#7b7763');}
    f.label('54',f.len-.45,3.25,.18,'#4d6655');
   }else if(b.style==='par50'){
    f.panel(f.len/2,.72,.12,f.len,1.44,.24,'#919c90');for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;f.window(u,.70,1.2,.82,'#b0b6a1','#74806c');grilles(f,u,.70,1.15,.77);f.window(u,3.1,1.25,2.45,b.trim,'#929c88');yield;}
    f.window(f.len*.5,5.7,3.0,2.30,b.trim,'#9aa492');a.pediment(f,f.len/2,h+.05,f.len+.45,1.75,y,b.trim);f.panel(f.len/2,4.4,.2,f.len,.23,.45,b.trim);
   }else if(b.style==='par21'){
    // Capture shows temporary dark mesh; original concealed elevation is estimated.
    for(let k=0;k<6;k++){const u=(k+.5)*f.len/6;f.window(u,2.2,1.3,2.1,b.trim,'#81775e');yield;}
    f.panel(f.len*.69,1.8,.36,f.len*.62,3.6,.10,'#4f5a4e');for(let u=f.len*.4;u<f.len;u+=2.5)f.panel(u,1.85,.48,.06,3.7,.08,'#778173');
   }else if(b.style==='par26'){
    const n=6;for(let row=0;row<2;row++){for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,2.02+row*3.8,1.25,2.22,b.trim,'#929884');if(row===0)f.panel(u,3.35,.20,1.70,.20,.30,b.trim);yield;}}
    f.panel(f.len/2,4.05,.18,f.len,.30,.36,b.trim);pilasters(f,h,b.trim);for(let u=.3;u<f.len;u+=.50)f.panel(u,h-.48,.17,.20,.16,.06,'#7b8775',true);
   }else if(b.style==='par53corner'){
    f.panel(f.len/2,.52,.1,f.len,1.04,.20,'#788475');const n=corner?4:6;for(let row=0;row<2;row++)for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(corner&&row===0&&k===1){stairs(f,u,2.0,.26);a.door(f,u,3.0,1.4,'#a3a993');}else f.window(u,2.10+row*3.55,1.35,1.80,b.trim,'#a4ae9b');if(row===0&&k%2===0)ac(f,u+1.0,3.0);yield;}
    if(front){const u=f.len*.38;f.panel(u,h+.47,.1,5.6,1.2,.3,b.wall);for(let k=0;k<4;k++)f.window(u-1.9+k*1.26,h+.53,1.02,1.05,b.trim,'#8f9d8a');a.pediment(f,u,h+1.1,6.0,1.0,y,b.trim);}
   }
   yield;
  }
 });
 const walls:[XY,XY,string,number][]=[[[445.2,629.1],[448.15,629.1],'#797563',1.7],[[369.1,608.4],[373.8,608.4],'#c1bda6',2.5],[[390.95,609.0],[391.12,609.0],'#bfa88d',2.1],[[405.65,629.1],[406.25,629.1],'#bdb698',2.3]];
 for(const[p,q,color,h]of walls)m.job('zid de curte',[p,q],[],function*(){const x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;m.box(x,ground(x,z)+h/2,z,q[0]-p[0],h,.22,color,false,true);yield;});
 for(const[x,z,h]of realm.trees)m.job(h<6?'arbore tuns':'arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(h<6?.10:.20,h<6?.16:.32,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#646851',false,true);if(h>6){const white=new T.CylinderGeometry(.24,.33,1.05,8);white.translate(x,y+.525,z);m.put(white,'#bbbba7');}const crowns=h<6?[[0,.72,0,1.35]]:[[0,.67,0,2.7],[-1.7,.62,.5,2.0],[1.5,.75,-.4,2.2],[0,.9,0,1.9]];for(const[dx,dy,dz,r]of crowns){const g=h<6?new T.SphereGeometry(r,12,7):new T.IcosahedronGeometry(r,1);g.scale(1,h<6?.87:1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,h<6?'#698250':'#687d4e');yield;}});
 const poles:XY[]=[[347.5,612.6],[380,612.8],[432,612.8],[467,613.0]];
 for(const[x,z]of poles)m.job('stâlp și iluminat',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.8,z,.20,7.6,.20,'#969e8a',false,true);m.beam(new T.Vector3(x,y+7.0,z),new T.Vector3(x,y+7.5,z+1.3),.045,'#657563');m.box(x,y+7.5,z+1.3,.25,.12,.55,'#afb69f');yield;});
 for(let i=1;i<poles.length;i++)m.job('cabluri aeriene',[poles[i-1],poles[i]],[],function*(){const p=poles[i-1],q=poles[i];for(let w=0;w<5;w++)for(let k=0;k<4;k++){const point=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7.0-.35*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+w*.12);m.beam(point(k/4),point((k+1)/4),.012,'#4b5748');yield;}});
 for(const[x,z]of[[348.5,626],[348.5,611.6],[330,626.6],[330,611]])m.job('indicator pietoni',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),f=m.facade([x-.33,z],[x+.33,z],y);m.box(x,y+1.35,z,.055,2.7,.055,'#9aa38d',false,true);f.panel(.33,2.43,0,.68,.68,.07,'#b2bd55');f.panel(.33,2.43,.045,.54,.54,.02,'#447491');a.pediment(f,.33,2.21,.46,.4,y,'#ced2b8');yield;});
 m.job('sens interzis Pârcălab',streetRect(348.4,628.1,1,1),[],function*(){const x=348.4,z=628.1,y=ground(x,z);m.box(x,y+1.5,z,.06,3,.06,'#9ca38e',false,true);const g=new T.CircleGeometry(.33,16);g.translate(x,y+2.64,z);m.put(g,'#a65543',true);m.box(x,y+2.64,z+.025,.48,.10,.03,'#d1cfb8',true);yield;});
 for(const[x,z]of[[395,612.7],[400,612.7],[409,612.6],[414,612.6],[420,612.6]])m.job('arbuști de trotuar',streetRect(x,z,1.4,1.4),[],function*(){for(const[dx,dz]of[[-.3,0],[.3,.1],[0,-.3]]){const g=new T.IcosahedronGeometry(.60,1);g.scale(1,.9,1);g.translate(x+dx,ground(x,z)+.55,z+dz);m.put(g,'#5e7844');}yield;});
 m.job('molid curte Ortopan',streetRect(370.4,604.1,4,4),[],function*(){const x=370.4,z=604.1,y=ground(x,z);for(let k=0;k<4;k++){const g=new T.ConeGeometry(1.5-k*.27,2.5,9);g.translate(x,y+2+k*.85,z);m.put(g,'#6c8777');yield;}});
 for(const[x,z]of[[428.7,610.3],[360.4,609.5]])m.job('bancă',streetRect(x,z,2.1,1),[],function*(){const y=ground(x,z);for(const dx of[-.70,.70])m.box(x+dx,y+.28,z,.08,.56,.52,'#4e5e4c',false,true);for(let k=0;k<4;k++)m.box(x,y+.52,z-.22+k*.15,1.95,.08,.13,'#9c7550',false,true);for(let k=0;k<3;k++)m.box(x,y+.73+k*.15,z-.33,1.95,.13,.07,'#9c7550');yield;});
 for(const[x,z]of[[390,628.3],[349.2,624],[462,627.65]])m.job('coș stradal',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+.43,z,.42,.78,.42,'#667967',false,true);m.box(x,y+.85,z,.48,.10,.48,'#475b49');yield;});
 for(const[x,z,text]of[[347.2,630.2,'VLAICU PÂRCĂLAB'],[467.7,628.1,'ALEXEI ȘCIUSEV']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x-1,z],[x+1,z],ground(x,z));f.panel(1,2.5,.02,1.9,.42,.05,'#526f86');f.label(text,1,2.5,.125,'#d0d2bd',.07);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
