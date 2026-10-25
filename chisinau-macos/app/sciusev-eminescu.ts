import * as T from 'three';
import realm from '../data/sciusev-eminescu.json';
import catalog from '../data/sciusev-eminescu-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** Original bounded geometry, informed by Street View2025, satellite and facade
 * photographs. Unseen elevations and small dimensions remain estimates. */
export function createSciusevEminescu(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Eminescu–Alecsandri',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('emin')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('emin')) as PhotoBuilding[],'Șciusev Eminescu · curți complete');
 const l=landscapeLayer(scene,'Șciusev Eminescu · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
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
 for(const b of custom)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  if(b.passages.length){const clearance=b.passages[0].clearance;for(const p of b.passages[0].walls)m.solid(p[0] as XY[],clearance+5,y-5,b.wall,true,p.slice(1) as XY[][]);if(h>clearance)m.solid(b.p as XY[],h-clearance,y+clearance,b.wall,true,b.holes as XY[][]);}
  else m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<1.8;
   const inPassage=(u:number)=>{const pt=f.at(u);return b.passages.some(s=>pt[0]>Math.min(...s.rings[0].map(p=>p[0]))-.3&&pt[0]<Math.max(...s.rings[0].map(p=>p[0]))+.3);};
   for(let u=.3;u<f.len;u+=.6)if(!inPassage(u))f.panel(u,.36,.07,Math.min(.6,f.len-u+.3),.72,.14,'#828878');
   a.cornice(f,h,b.trim);
   const eminSide=b.style==='emin28'&&q[0]<p[0]-.8,alecSide=b.style==='emin41a'&&q[0]>p[0]+.8;
   if(eminSide&&f.len>8){
    for(let k=0;k<3;k++)f.window(2.1+k*3.2,3.05,1.25,2.55,b.trim,'#7c7059');
    const u=f.len-2.2;stairs(f,u,2.4,.52);a.door(f,u,3.6,1.6,'#806348');f.panel(u,4.6,.2,3.6,2.1,.4,b.wall);a.pediment(f,u,5.5,4.0,.95,y,b.trim);pilasters(f,h,b.trim);continue;
   }
   if(alecSide&&f.len>10){for(let k=0;k<8;k++){const u=(k+.5)*f.len/8;if(k===5){stairs(f,u,2.0,.52);a.door(f,u,3.4,1.25,'#6f6751');}else{f.window(u,2.75,1.15,2.45,b.trim,'#79715e');grilles(f,u,2.75,1.1,2.4);}yield;}pilasters(f,h,b.trim);continue;}
   if(!front||f.len<4){if(f.len>2.7){const bays=Math.max(1,Math.round(f.len/4));for(let row=0;row<b.levels;row++)for(let k=0;k<bays;k++){const u=(k+.5)*f.len/bays,yy=2.05+row*(h-.6)/b.levels;if(inPassage(u)&&yy<Math.max(...b.passages.map(p=>p.clearance)))continue;f.window(u,yy,1.3,2.05,b.trim,'#796956');yield;}}continue;}
   if(b.style==='emin44'){
    // West passage, central timber entrance and three projecting pediment bays.
    const centers=[f.len*.105,f.len*.50,f.len*.90];
    for(const u of centers){f.panel(u,6.35,.15,3.15,4.9,.30,b.wall);a.pediment(f,u,h+.12,3.8,1.35,y,b.trim);for(const d of[-1,1])f.panel(u+d*1.5,6.35,.27,.23,5.0,.25,b.trim);}
    for(const t of[.105,.255,.355,.50,.65,.75,.90]){const u=f.len*t;f.window(u,6.4,t===.355?1.05:1.2,2.7,b.trim,'#a1a68f');yield;}
    for(const t of[.275,.36,.68,.80,.92]){const u=f.len*t;f.window(u,2.0,t===.275?.55:1.12,2.3,b.trim,'#8b7960');grilles(f,u,2.0,t===.275?.50:1.08,2.22);}
    const u=f.len*.50;stairs(f,u,2.2,.26);a.door(f,u,3.35,1.65,'#a37340');canopy(f,u,3.55,2.7,1.75);
    for(let yy=.8;yy<h;yy+=.62){for(let v=.3;v<f.len;v+=1.3)if(yy>3.55||!inPassage(v))f.panel(v,yy,.17,1.22,.022,.025,'#9b9987',true);yield;}
    f.label('44',4.45,3.25,.19,'#48564a');
   }else if(b.style==='emin42'){
    // Western part kept taupe; east return was repainted white and re-roofed red.
    f.panel(f.len*.82,h/2,.025,f.len*.36,h,.05,'#c4c4b1');
    f.panel(f.len/2,.61,.12,f.len,1.22,.24,'#a59d85');
    for(let k=0;k<6;k++){const u=(k+.5)*f.len/6;if(k===0){const r=stairs(f,u,2.6,.52);a.door(f,u,3.5,1.40,'#74583f');canopy(f,u,3.65,2.5,1.8);rail(f,u,r,2.6,1.8);continue;}f.window(u,2.85,1.0,2.3,b.trim,'#705740');grilles(f,u,2.85,.97,2.2);if(k%2)f.window(u,.57,.78,.64,'#b4ad97','#5f6654');yield;}
    for(let v=.5;v<f.len;v+=.65)f.panel(v,.8,.255,.5,.40,.035,v%1>.5?'#b3a990':'#8d917b',true);
    f.label('42',.45,2.0,.19,'#4b5546');
   }else if(b.style==='emin46'){
    for(let k=0;k<3;k++){const u=(k+.5)*f.len/3;f.window(u,1.8,1.0,1.75,b.trim,'#899484');f.panel(u,2.85,.22,1.5,.16,.3,b.trim);yield;}
    f.panel(f.len/2,h+.20,.15,f.len,.45,.30,b.trim);a.pediment(f,f.len/2,h+.4,3.3,.4,y,b.trim);ac(f,f.len-.65,3.05);
   }else if(b.style==='emin48'){
    const u=f.len*.085;stairs(f,u,2,.39);a.door(f,u,3.7,1.6,'#8b5142');f.panel(u,4.95,.15,3.1,2.0,.30,b.wall);f.panel(u,5.92,.30,3.45,.20,.50,b.trim);f.panel(u,3.78,.75,2.2,.12,1.5,'#a66350');
    for(let k=0;k<5;k++){const v=f.len*(.27+k*.153);f.window(v,2.55,1.20,2.50,b.trim,'#869077');grilles(f,v,2.55,1.14,2.42);f.panel(v,1.12,.25,1.65,.22,.32,b.trim);f.panel(v,4.0,.22,1.7,.17,.32,b.trim);yield;}
    pilasters(f,h,b.trim);
   }else if(b.style==='emin30'){
    // One mapped plan contains a western plain wing, central pediment entrance,
    // and eastern Black Garden frontage with six fabric awnings.
    for(let k=0;k<4;k++)f.window(f.len*(.06+k*.075),2.20,1.0,2.3,b.trim,'#81948b');
    for(let k=0;k<6;k++){const u=f.len*(.49+k*.09);f.window(u,2.20,1.40,2.45,b.trim,'#839a92');for(let j=0;j<5;j++)f.panel(u,3.53-j*.055,.25+j*.15,1.80,.12,.20,'#46534c');yield;}
    const u=f.len*.38;f.panel(u,2.2,.18,3.6,4.4,.36,b.trim);f.panel(u,1.7,.4,2.7,3.4,.03,'#596d63');a.pediment(f,u,4.5,4.2,.9,y,b.trim);stairs(f,u,3.0,.26);canopy(f,u,3.9,3.6,1.5);ac(f,f.len-1.0,3.7);pilasters(f,h,b.trim);
   }else if(b.style==='emin41a'){
    for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(k===2){const r=stairs(f,u,2.6,.65);a.door(f,u,3.5,1.4,'#797059');rail(f,u,r,2.6,1.9,true);a.pediment(f,u,4.05,2.7,.50,y,b.trim);}else{f.window(u,2.65,1.2,2.5,b.trim,'#9aa48e');grilles(f,u,2.65,1.16,2.4);}yield;}
    pilasters(f,h,b.trim);
    for(let u=.5;u<f.len;u+=1.1){const p=f.at(u,.25),g=new T.IcosahedronGeometry(.72,0);g.scale(1.2,.75,.5);g.translate(p[0],y+h-.25,p[1]);m.put(g,'#4e6d46');yield;}
   }else if(b.style==='emin41b'){
    for(let k=0;k<7;k++){const u=(k+.5)*f.len/7;f.window(u,5.70,1.5,1.65,b.trim,'#929b88');a.pediment(f,u,h-.2,2.45,.7,y,b.trim);yield;}
    for(let k=0;k<8;k++){const u=(k+.5)*f.len/8;if(k===1||k===6){const r=stairs(f,u,2.75,.78);a.door(f,u,3.7,1.3,'#6d6956');rail(f,u,r,2.75,2.25,true);canopy(f,u,3.9,2.8,2.25);}else{f.window(u,2.35,1.10,2.7,b.trim,'#716a56');grilles(f,u,2.35,1.04,2.62);}yield;}
    f.panel(f.len/2,4.0,.22,f.len,.32,.44,b.trim);pilasters(f,4.0,b.trim);
   }else if(b.style==='emin43'){
    const u=f.len*.10;stairs(f,u,2.1,.39);a.door(f,u,3.65,1.4,'#9a6c48');canopy(f,u,3.85,2.8,1.6);
    for(const d of[-1.2,1.2])f.panel(u+d,1.93,1.5,.055,3.85,.055,'#425247',true);
    for(let k=0;k<4;k++){const v=f.len*(.31+k*.185);f.window(v,2.70,1.4,2.65,b.trim,'#8d8b75');grilles(f,v,2.7,1.32,2.55);f.panel(v,4.25,.23,1.93,.20,.35,b.trim);yield;}
    for(let v=.3;v<f.len;v+=.34)f.panel(v,h-.52,.26,.13,.21,.18,b.trim,true);pilasters(f,h,b.trim);
   }else if(b.style==='emin45'){
    f.panel(f.len/2,5.25,.05,f.len,3.5,.10,'#785443');
    for(let yy=3.6;yy<6.95;yy+=.30){for(let u=.22;u<f.len-.18;u+=.42){const du=u+(Math.round(yy/.3)%2)*.18;if(du>f.len-.18)continue;const shape=new T.Shape();shape.moveTo(-.20,.17);shape.lineTo(.20,.17);shape.lineTo(.20,0);shape.absarc(0,0,.20,0,-Math.PI,true);shape.closePath();const g=new T.ShapeGeometry(shape,5),p=f.at(du,.125),p0=f.at(0),p1=f.at(1);g.rotateY(Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]));g.translate(p[0],y+yy,p[1]);m.put(g,'#6b5142',true);}yield;}
    for(const t of[.28,.73]){const u=f.len*t;f.window(u,5.40,1.4,1.5,'#80634d','#343f38');f.window(u,1.9,1.7,2.7,'#58635a','#36473f');}
    const u=f.len*.72,r=stairs(f,u,2.7,.65);rail(f,u,r,2.7,1.75);f.label('GRIMERKKA',f.len*.46,3.03,.21,'#b9bba7');
   }else if(b.style==='eminAnnex28'){
    for(let u=.3;u<f.len;u+=.6)if(!inPassage(u))f.panel(u,.60,.16,.6,1.20,.32,'#8e5842');for(let k=0;k<3;k++){const u=(k+.5)*f.len/3;if(inPassage(u))continue;f.window(u,2.1,1.2,1.9,b.trim,'#8d6646');}pilasters(f,h,b.trim);
   }else if(b.style==='emin28'){
    f.panel(f.len/2,.65,.13,f.len,1.3,.26,'#8b9288');
    for(let k=0;k<7;k++){const u=(k+.5)*f.len/7;f.window(u,3.20,1.25,2.65,b.trim,'#989c88');f.panel(u,1.62,.25,1.78,.25,.40,b.trim);a.pediment(f,u,4.70,1.9,.42,y,b.trim);f.window(u,.62,.75,.66,'#afb2a0','#596d63');yield;}
    for(const u of[.26,f.len*.84,f.len-.26])f.panel(u,3.6,.20,.46,5.3,.40,b.trim);
    a.pediment(f,f.len*.91,h+.1,f.len*.18+1.0,1.0,y,b.trim);f.panel(f.len/2,1.35,.24,f.len,.21,.45,b.trim);
   }
   yield;
  }
 });
 // Visible courtyard walls stop at interactive leaf openings.
 const walls:[XY,XY,string,number][]=[[[577.5,606.5],[581.5,606.5],'#c1baa2',2.5],[[585.9,606.5],[587.3,606.5],'#c1baa2',2.5],[[588.65,606.5],[593.5,606.5],'#c1baa2',2.5],[[594.5,609.3],[595.0,609.3],'#b4ad93',2.8],[[521.05,610.4],[521.4,610.4],'#b9b8a5',2.5],[[541.5,607.7],[542.1,607.7],'#b5b4a1',2.5]];
 for(const[p,q,color,h]of walls)m.job('împrejmuire', [p,q],[],function*(){const x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;m.box(x,ground(x,z)+h/2,z,q[0]-p[0],h,.22,color,false,true);if(x>575&&x<594)m.box(x,ground(x,z)+h+.15,z,q[0]-p[0]+.15,.22,.75,'#8e5748');yield;});
 for(const[x,z,h]of realm.trees)m.job(h<6?'arbore tuns':'arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(h<6?.10:.20,h<6?.16:.32,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#646851',false,true);if(h>6){const white=new T.CylinderGeometry(.24,.33,1.05,8);white.translate(x,y+.525,z);m.put(white,'#bbbba7');}const crowns=h<6?[[0,.72,0,1.35]]:[[0,.67,0,2.7],[-1.7,.62,.5,2.0],[1.5,.75,-.4,2.2],[0,.9,0,1.9]];for(const[dx,dy,dz,r]of crowns){const g=h<6?new T.SphereGeometry(r,12,7):new T.IcosahedronGeometry(r,1);g.scale(1,h<6?.87:1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,h<6?'#698250':'#687d4e');yield;}});
 const poles:XY[]=[[488,613],[537,612.9],[569.2,612.8],[602,612.7],[623.606,575.418]];
 for(const[x,z]of poles)m.job('iluminat și cabluri',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.8,z,.19,7.6,.19,'#989d8c',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x,y+7.5,z+1.2),.04,'#687665');m.box(x,y+7.5,z+1.2,.24,.12,.55,'#afb49f');yield;});
 for(let i=1;i<4;i++)m.job('cabluri aeriene',[poles[i-1],poles[i]],[],function*(){const p=poles[i-1],q=poles[i];for(let wire=0;wire<5;wire++)for(let k=0;k<4;k++){const point=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7.0-.30*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+wire*.13);m.beam(point(k/4),point((k+1)/4),.012,'#4a574a');yield;}});
 for(const[x,z]of[[493.0,612.5],[487.5,625.4],[473.5,610],[474,628]])m.job('indicator pietoni',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),f=m.facade([x-.32,z],[x+.32,z],y);m.box(x,y+1.4,z,.055,2.8,.055,'#9ba28f',false,true);f.panel(.32,2.5,0,.66,.66,.08,'#a9bb5a');f.panel(.32,2.5,.05,.53,.53,.02,'#437194');a.pediment(f,.32,2.29,.45,.39,y,'#c8cfb7');yield;});
 for(const[x,z]of[[487,626.4],[474,612]])m.job('semafor Eminescu',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.9,z,.12,3.8,.12,'#8b9784',false,true);m.box(x,y+3.15,z,.42,1.15,.3,'#39463b');for(const[dy,color]of[[.34,'#984c39'],[0,'#8d7940'],[-.34,'#466149']]as const){const g=new T.CircleGeometry(.12,10);g.translate(x,y+3.15+dy,z+.16);m.put(g,color,true);}yield;});
 for(const[x,z,large]of[[485.281,629.5,0],[527,624.1,1]])m.job('coș și container',streetRect(x,z,1.5,1.5),[],function*(){const y=ground(x,z);m.box(x,y+(large?.62:.42),z,large?1.15:.44,large?1.10:.75,large?.78:.44,'#737e70',false,true);m.box(x,y+(large?1.22:.82),z,large?1.22:.49,.10,large?.85:.49,large?'#bca43d':'#4b5d4c');yield;});
 m.job('utilități și plăcuțe',streetRect(611,628,4,2),[],function*(){const x=612.131,z=629.688,y=ground(x,z);m.box(x,y+.60,z,.60,1.20,.35,'#8e9886',false,true);yield;});
 for(const[x,z,text]of[[490.6,633.0,'MIHAI EMINESCU'],[610.5,629.9,'ALEXEI ȘCIUSEV']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x-1,z],[x+1,z],ground(x,z));f.panel(1,2.5,.02,1.9,.42,.05,'#536e85');f.label(text,1,2.5,.13,'#d2d4c0',.07);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
