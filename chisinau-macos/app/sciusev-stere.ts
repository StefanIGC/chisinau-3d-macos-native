import * as T from 'three';
import realm from '../data/sciusev-stere.json';
import catalog from '../data/sciusev-stere-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** Original bounded geometry, informed by dated Street View, satellite and independent photographs. Unseen elevations and small dimensions remain estimates. */
export function createSciusevStere(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Dinamo–Constantin Stere',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('st')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('st')) as PhotoBuilding[],'Șciusev Dinamo · curți complete');
 const l=landscapeLayer(scene,'Șciusev Dinamo · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const grilles=(f:Face,u:number,yy:number,w=1.15,h=2.0)=>{for(let x=-w/2;x<=w/2;x+=.21)f.panel(u+x,yy,.52,.025,h,.035,'#47584d',true);for(const dh of[-h*.37,h*.37])f.panel(u,yy+dh,.54,w,.028,.035,'#47584d',true);};
 const ac=(f:Face,u:number,yy:number)=>{f.panel(u,yy,.44,.65,.47,.48,'#a9b0a2');for(let d=-.22;d<=.22;d+=.11)f.panel(u+d,yy,.71,.025,.3,.025,'#6a7a6c',true);};
 const stairs=(f:Face,u:number,w:number,rise:number,offset=.2,color='#95988a')=>{
  const n=Math.max(1,Math.ceil(rise/.13)),run=n*.28,foot=f.at(u,run+offset+.1),low=ground(...foot)+.045,top=low+rise,p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  for(let k=0;k<n;k++){const v=offset+(k+.5)*.28,p=f.at(u,v),h=top-k*rise/n;m.box(p[0],h-.11,p[1],w,.22,.30,color,false,true,angle);}return top-f.y;
 };
 // Roof tessellation follows each real footprint, including concavities/holes.
 function* roof(b:PhotoBuilding,y:number){
  if(!b.roofRise){m.solid(b.p as XY[],.18,y+b.height,b.roof,false,b.holes as XY[][]);return;}
  const shape=new T.Shape();b.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));for(const r of b.holes){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));shape.holes.push(hole);}
  const src=new T.ShapeGeometry(shape);src.rotateX(-Math.PI/2);const g=src.toNonIndexed(),v=g.attributes.position,out:number[]=[],xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),run=Math.max(2,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2);
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.16+b.roofRise*Math.min(1,d/run),p[1]];};
  function tri(a:XY,b:XY,c:XY,depth=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(depth<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,depth+1);tri(p,b,c,depth+1);}else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,depth+1);tri(a,p,c,depth+1);}else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,depth+1);tri(p,b,c,depth+1);}return;}out.push(...vertex(a),...vertex(b),...vertex(c));}
  for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
  src.dispose();g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.computeVertexNormals();m.put(result,b.roof,false,true);
 }
 const pairedStairs=(f:Face,u:number)=>{
  const center=f.at(u,1.12),top=ground(...center)+.91,p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  m.box(center[0],top-.45,center[1],2.1,.90,1.65,'#a59d84',false,true,angle);
  for(const side of[-1,1]){const n=7,run=n*.28,foot=f.at(u+side*(1.05+run+.10),1.12),low=ground(...foot)+.045,rise=top-low;
   for(let k=0;k<n;k++){const p=f.at(u+side*(1.05+(k+.5)*.28),1.12),h=top-k*rise/n;m.box(p[0],h-.11,p[1],.30,.22,1.65,'#aaa38d',false,true,angle);}
   for(const v of[.31,1.93]){const a0=f.at(u+side*1.02,v),a1=f.at(u+side*(1.05+run),v);m.beam(new T.Vector3(a0[0],top+.9,a0[1]),new T.Vector3(a1[0],low+rise/n+.9,a1[1]),.028,'#5d6252');for(let k=0;k<=4;k++){const t=k/4,p=f.at(u+side*(1.05+run*t),v),yy=top-rise*t;m.box(p[0],yy+.45,p[1],.035,.9,.035,'#5d6252',true);}}
  }
 };
 const band=(f:Face,h:number,color:string)=>f.panel(f.len/2,h/2,.09,f.len,h,.18,color);
 const pane=(f:Face,u:number,yy:number,w:number,h:number,n=3)=>{f.window(u,yy,w,h,'#d0d0c0','#b9c2b4');for(let k=1;k<n;k++)f.panel(u-w/2+k*w/n,yy,.365,.06,h,.08,'#b9c2b4',true);};
 // Window arches and mullions are bounded opaque geometry, not photo textures.
 const arched=(f:Face,u:number,w:number,h:number,bottom:number,trim:string,frame='#6f6755')=>{a.arch(f,u,bottom,w,h,f.y,'#51676a',trim);f.panel(u,bottom+h*.45,.45,.055,h*.83,.06,frame,true);f.panel(u,bottom+h*.58,.46,w,.055,.06,frame,true);f.panel(u,bottom-.08,.30,w+.38,.16,.48,trim);};
 // Terraced stands face the track; alternating shallow treads provide walkable aisles.
 function* stand(b:PhotoBuilding,y:number){
  const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),x0=Math.min(...xs)+.18,x1=Math.max(...xs)-.18,z0=Math.min(...zs)+.15,z1=Math.max(...zs)-.15,w=x1-x0,d=z1-z0,n=Math.ceil(d/.38),rise=3.30/n;
  for(let k=0;k<n;k++){
   const zz=z0+(k+.5)*d/n,hh=y-.075+(k+1)*rise;
   m.box((x0+x1)/2,hh-.11,zz,w,.22,d/n+.02,'#a6ab9d',false,true);
   if(k%2===1)for(let xx=x0+.7;xx<x1-.5;xx+=.62){if(Math.abs(xx-(x0+x1)/2)<1.0||Math.abs(xx-(x0+w*.25))<.7||Math.abs(xx-(x0+w*.75))<.7)continue;m.box(xx,hh+.24,zz,.46,.08,.34,'#416c95');m.box(xx,hh+.47,zz+.14,.46,.40,.07,'#416c95');}yield;
  }
  for(const xx of[x0,x1]){m.box(xx,y+1.75,(z0+z1)/2,.22,3.5,d,'#adb0a2',false,true);}
  const f=m.facade([x0,z1],[x1,z1],y+3.4);yield* a.fence([x0,z1],[x1,z1],y+3.4,.9);
 }
 function* build(b:PhotoBuilding):Generator<void>{
  if(b.parts?.length){for(const part of b.parts)yield* build({...b,...part,parts:undefined});return;}
  const y=ground(...b.anchor as XY)+.12,h=b.height,s=b.style;
  if(s==='ststand'){yield* stand(b,y);return;}
  m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const edges=(b as PhotoBuilding&{exteriorEdges?:number[][][]}).exteriorEdges,p=f.at(f.len/2),q=f.at(f.len/2,1),nx=q[0]-p[0],nz=q[1]-p[1];
   if(edges&&!edges.some(e=>pointSegmentDistance(p,e[0]as XY,e[1]as XY)<.012))continue;
   if(f.len<1.6)continue;
   const front=nx*b.front[0]+nz*b.front[1]>.8,side=s==='st111'&&nx>.8;
   band(f,s==='st111'?1.15:.65,'#8d8f81');a.cornice(f,h,b.trim);
   if(s==='stticket'){
    if(front){arched(f,f.len/2,.95,1.65,.75,'#bcb69f','#6c7970');f.panel(f.len/2,h+.13,.2,f.len+.2,.25,.4,'#a59b81');}yield;continue;
   }
   if(s==='stsportannex'){
    yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),1.7,b.trim,'#73949b');
    if(front){for(let u=1.5;u<f.len;u+=4){grilles(f,u,1.7,1.2,1.7);yield;}}continue;
   }
   if(!front&&!side){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.5)),1.95,b.trim,'#9a9886');continue;}
   if(s==='st111'){
    const n=front?7:5,bw=f.len/n,door=Math.floor(n/2);
    for(let k=0;k<n;k++){const u=(k+.5)*bw;
     if(k===door){a.door(f,u,3.85,1.65,'#705b46');if(side)pairedStairs(f,u);else stairs(f,u,2.8,.65);}
     else{f.window(u,3.05,Math.min(1.4,bw*.54),2.7,'#cec7af','#7d7562');f.panel(u,1.1,.22,1.5,.45,.25,'#73796a');f.panel(u,4.57,.2,1.85,.22,.35,'#c5bca2');}
     if(k!==door)for(const du of[-bw*.44,bw*.44]){f.panel(u+du,3.2,.18,.45,4.8,.30,'#cac3ad');for(let hh=1.1;hh<5.4;hh+=.45)f.panel(u+du,hh,.36,.49,.08,.12,'#b6b19e',true);}
     f.panel(u,h+.3,.1,1.7,.44,.26,'#beb9a3');
     for(const du of[-.56,0,.56]){const c=f.at(u+du,.2),g=new T.SphereGeometry(.17,8,5);g.scale(.7,1.3,.5);g.translate(c[0],y+h+.69,c[1]);m.put(g,'#c8c3ae');}yield;
    }
    for(const hh of[h-.8,h-.56])f.panel(f.len/2,hh,.24,f.len,.16,.36,'#986c5c');
    if(front){const u=f.len/2;f.panel(u,h+.60,.12,4.8,.90,.30,'#bcb59b');f.panel(u,h+1.11,.25,5.1,.15,.45,'#c7c1ad');f.panel(u,4.51,.85,4.0,.22,1.65,'#aaa78e');for(let dx=-1.85;dx<1.9;dx+=.28)f.panel(u+dx,5.06,1.65,.10,.92,.13,'#bdb9a2',true);f.panel(u,5.54,1.65,4.2,.14,.25,'#c9c1aa');}
    for(const u of[.24,f.len-.24])f.panel(u,3.1,.32,.6,5.8,.48,'#c5c0ac');continue;
   }
   if(s==='st111wing'){
    for(const hh of[3.6,h-.45])f.panel(f.len/2,hh,.13,f.len,.28,.25,'#906e60');
    const n=Math.max(3,Math.round(f.len/3.6));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;pane(f,u,1.9,1.55,2.1,2);grilles(f,u,1.9,1.48,2.02);pane(f,u,5.55,1.6,2.0,2);if(k%2===1)ac(f,u+.9,3.0);yield;}continue;
   }
   if(s==='stlavender'){
    for(let k=0;k<3;k++){const u=(k+.5)*f.len/3;pane(f,u,2.0,1.65,2.1,2);yield;}
    const w=f.len*.74,u=f.len/2;f.panel(u,h+.77,-.7,w,1.75,1.5,'#a7a8b1');for(const du of[-w*.27,w*.27])pane(f,u+du,h+.80,1.7,1.15,2);f.panel(u,h+1.70,-.5,w+.35,.14,1.95,b.roof);continue;
   }
   if(s==='st113'){
    for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;
     if(k===0){a.door(f,u,3.0,1.2,'#655949');stairs(f,u,1.9,.52);for(const du of[-.95,.95])f.panel(u+du,3.15,.30,.27,3.0,.42,'#c5bea8');a.arch(f,u,h-.2,2.5,1.10,y,b.wall,b.trim,0);}
     else{f.window(u,2.35,1.3,2.55,'#c6c4b4','#645a4a');f.panel(u,3.75,.18,1.95,.23,.3,'#c9c4b2');}yield;
    }
    const w=f.len*.54,u=f.len*.58;a.pediment(f,u,h+.20,w,1.6,y,'#80765e');for(let k=0;k<14;k++){const du=-w/2+k*w/13,hh=1.6*(1-Math.abs(du)/(w/2));if(hh>.05)f.panel(u+du,h+.20+hh/2,.48,.035,hh,.035,'#a28d6b',true);}continue;
   }
   if(s==='ststere1'){
    const n=6;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;pane(f,u,2.25,1.45,2.5,2);grilles(f,u,2.25,1.42,2.45);if(k%2===0)ac(f,u+.9,3.9);yield;}
    for(let k=0;k<7;k++){const u=(k+.5)*f.len/7,run=8.75,ps=[f.at(u-.48,-2.7),f.at(u+.48,-2.7),f.at(u+.48,-3.8),f.at(u-.48,-3.8)],vv=ps.map((p,i)=>new T.Vector3(p[0],y+h+.21+(i<2?2.7:3.8)*b.roofRise/run,p[1])),out:number[]=[];for(const tri of[[0,1,2],[0,2,3],[2,1,0],[3,2,0]])for(const j of tri)out.push(...vv[j].toArray());const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,'#526d73');for(let j=0;j<4;j++)m.beam(vv[j],vv[(j+1)%4],.045,'#b5b6a7');yield;}
    f.label('AVE COPIII',f.len*.55,4.55,.22,'#705e57');continue;
   }
   if(s==='stclub'){
    const n=3,bw=f.len/n;for(let k=0;k<n;k++){const u=(k+.5)*bw;
     if(k===1){a.door(f,u,3.1,2.3,'#687770');stairs(f,u,3.6,.52);}else pane(f,u,2.1,3.2,2.5,3);
     pane(f,u,5.65,3.2,2.65,3);f.panel(u,3.75,.2,3.8,.65,.25,'#b1b6a4');f.panel(u,3.75,.35,3.35,.38,.08,'#c9c8b6');yield;
    }
    for(let k=0;k<=n;k++){const u=k*bw+.06;f.panel(u,4.0,.25,.75,7.25,.40,'#c5c3b0');for(const du of[-.2,0,.2])f.panel(u+du,4.1,.5,.08,5.9,.08,'#aaa895',true);}
    f.panel(f.len/2,h+.44,.1,f.len,.88,.28,'#a18069');f.panel(f.len/2,h+1.1,.15,6.5,2.05,.45,'#aaa690');f.label('D',f.len/2,h+1.08,.95,'#74827b',.42);
    // Stylized athlete relief silhouettes; pose/detail estimated from dated photographs.
    for(const sign of[-1,1]){const u=f.len/2+sign*2.05,pt=f.at(u,.46),g=new T.SphereGeometry(.15,8,6);g.translate(pt[0],y+h+1.60,pt[1]);m.put(g,'#c1bda7');f.panel(u,h+1.13,.46,.24,.65,.09,'#c1bda7');for(const du of[-.2,.2]){const p0=f.at(u,.46),p1=f.at(u+du,.46);m.beam(new T.Vector3(p0[0],y+h+.84,p0[1]),new T.Vector3(p1[0],y+h+.43,p1[1]),.06,'#c1bda7');}}continue;
   }
  }
 }
 for(const b of custom)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],()=>build(b));
 // Every boundary has physical rails/walls; gate openings are cut from these paths.
 for(const d of realm.fences)m.job('împrejmuire '+d.style,[d.a,d.b]as XY[],[],function*(){
  const f=m.facade(d.a as XY,d.b as XY,0),h=d.height,opaque=d.style==='stone'||d.style==='pink',col=d.style==='pink'?'#b49892':'#adb09f',steps=Math.ceil(f.len/(opaque?1.2:.24));
  for(let k=0;k<steps;k++){const u=(k+.5)*f.len/steps,p=f.at(u),y=ground(...p),angle=Math.atan2(-(d.b[1]-d.a[1]),d.b[0]-d.a[0]);
   if(opaque){m.box(p[0],y+h/2,p[1],f.len/steps+.01,h,.27,col,false,true,angle);m.box(p[0],y+h+.05,p[1],f.len/steps+.03,.10,.38,'#b8b5a4',false,false,angle);}
   else{m.box(p[0],y+h/2,p[1],.022,h,.035,'#4f6559',true,false,angle);if(d.style==='ornate')m.box(p[0],y+.21,p[1],f.len/steps+.005,.42,.30,'#a9ab9a',false,true,angle);}
   if(k%8===7)yield;
  }
  if(!opaque){for(let u=0;u<f.len;u+=1.2){const length=Math.min(1.2,f.len-u),p=f.at(u),q=f.at(u+length);const mid=f.at(u+length/2);m.box(mid[0],ground(...mid)+.78,mid[1],length+.01,.10,.055,'#4f6559',false,true,Math.atan2(-(d.b[1]-d.a[1]),d.b[0]-d.a[0]));for(const hh of[d.style==='ornate'?.68:.7,h-.12])m.beam(new T.Vector3(p[0],ground(...p)+hh,p[1]),new T.Vector3(q[0],ground(...q)+hh,q[1]),.04,'#4f6559',true);if(d.style==='mesh')for(let hh=1.4;hh<h-.2;hh+=.65)m.beam(new T.Vector3(p[0],ground(...p)+hh,p[1]),new T.Vector3(q[0],ground(...q)+hh,q[1]),.012,'#617969');yield;}
   for(let u=0;u<=f.len;u+=3){const p=f.at(u);m.box(p[0],ground(...p)+h/2,p[1],.09,h+.1,.09,'#657668',false,true);}
  }
 });
 // Entry sign, original simple geometry over the working gate leaves.
 m.job('portal Dinamo',streetRect(-846.8,615.6,17,1),[],function*(){const f=m.facade([-854.7,615.6],[-838.3,615.6],ground(-846.8,615.6));f.panel(8.2,3.25,0,16.4,.18,.22,'#768a87');f.label('DINAMO',8.2,3.82,.63,'#508ea8',.12);yield;});
 // White goals and a sparse bounded net: all three mapped football pitches.
 for(const field of realm.pitches){const xs=field.p.map(p=>p[0]),zs=field.p.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z=(Math.min(...zs)+Math.max(...zs))/2,small=x1-x0<70,w=small?3:7.32,h=small?2:2.44;
  for(const[x,sign]of[[x0+.4,-1],[x1-.4,1]])m.job('poartă de fotbal',streetRect(x,z,3,w+1),[],function*(){const y=ground(x,z)+.05;for(const dz of[-w/2,w/2]){m.box(x,y+h/2,z+dz,.08,h,.08,'#c0c5b5',false,true);m.beam(new T.Vector3(x,y+h,z+dz),new T.Vector3(x+sign*1.4,y+.1,z+dz),.035,'#aebbaa');}m.box(x,y+h,z,.08,.08,w,'#c0c5b5');for(let dz=-w/2;dz<=w/2;dz+=.35)m.beam(new T.Vector3(x,y+h,z+dz),new T.Vector3(x+sign*1.4,y+.1,z+dz),.008,'#aebbaa');yield;});
 }
 for(const[x,z,h,r]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),young=h<7,trunk=new T.CylinderGeometry(young?.08:.18,young?.11:.27,h*.60,7);trunk.translate(x,y+h*.30,z);m.put(trunk,'#687058',false,true);if(!young)m.box(x,y+.52,z,.32,1.04,.32,'#b6bbad');for(const[dx,dy,dz,rr]of[[0,.70,0,r],[-r*.5,.67,r*.2,r*.66],[r*.4,.82,-r*.2,r*.70],[0,.96,0,r*.52]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.22,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#677d4d');yield;}if(young)for(const dx of[-.6,.6]){m.box(x+dx,y+1.1,z,.055,2.2,.055,'#897c5b');m.box(x,y+1.9,z,1.3,.06,.05,'#897c5b');}});
 for(const x of[-760,-788,-816,-871,-899,-927])m.job('bancă și coș',streetRect(x,618.9,2.8,1),[],function*(){const z=618.9,y=ground(x,z);for(const dx of[-.78,.78])m.box(x+dx,y+.23,z,.30,.46,.58,'#b1b3a1',false,true);for(let k=-2;k<=2;k++)m.box(x,y+.49,z+k*.105,2.1,.07,.09,'#827257',false,true);m.box(x+1.5,y+.44,z,.36,.82,.36,'#556555',false,true);yield;});
 for(const x of[-841,-834,-828,-781,-775,-754])m.job('bolard semisferic',streetRect(x,621.1,.7,.7),[],function*(){const y=ground(x,621.1),g=new T.SphereGeometry(.28,10,6,0,Math.PI*2,0,Math.PI/2);g.translate(x,y+.04,621.1);m.put(g,'#c0c3b3',false,true);yield;});
 const poles=realm.lamps as XY[];
 for(const[x,z]of poles)m.job('iluminat și utilități',streetRect(x,z,.6,.6),[],function*(){const y=ground(x,z);m.box(x,y+4,z,.19,8,.19,'#a1a797',false,true);m.box(x,y+2.3,z,.28,.7,.29,'#a6af9b');m.beam(new T.Vector3(x,y+7.8,z),new T.Vector3(x,y+8.2,z+1.5),.055,'#75836f');m.box(x,y+8.13,z+1.5,.30,.14,.6,'#b0b6a4');yield;});
 for(const row of[poles.filter(p=>p[1]>617&&p[1]<633).sort((p,q)=>p[0]-q[0]),poles.filter(p=>p[0]<-852&&p[0]>-869).sort((p,q)=>p[1]-q[1])])for(let i=1;i<row.length;i++){const p=row[i-1],q=row[i];if(Math.hypot(p[0]-q[0],p[1]-q[1])>80)continue;m.job('cabluri',[p,q],[],function*(){for(let w=0;w<4;w++)for(let k=0;k<4;k++){const pt=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t+w*.11,ground(...p)*(1-t)+ground(...q)*t+7.2-.25*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t);m.beam(pt(k/4),pt((k+1)/4),.012,'#4f5d4b');yield;}});}
 for(const[x,z,angle]of[[-838,620.5,0],[-843,633,Math.PI],[-853,650,Math.PI/2],[-867,655,-Math.PI/2]])m.job('semafor Stere',streetRect(x,z,.5,.5),[],function*(){const y=ground(x,z);m.box(x,y+1.7,z,.075,3.4,.075,'#717e6c',false,true);m.box(x,y+3.15,z,.30,.96,.27,'#37483e');for(const[dy,col]of[[.3,'#8e5b4b'],[0,'#8e8351'],[-.3,'#748954']]as[number,string][]){const g=new T.CircleGeometry(.095,10);g.rotateY(angle);g.translate(x+Math.sin(angle)*.15,y+3.15+dy,z+Math.cos(angle)*.15);m.put(g,col);}yield;});
 for(const[x,z,txt]of[[-754,634.6,'ALEXEI ȘCIUSEV'],[-850.7,674,'CONSTANTIN STERE']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x+1,z],[x-1,z],ground(x,z));f.panel(1,2.7,.04,1.9,.36,.07,'#577186');f.label(txt,1,2.7,.11,'#cdd0bf',.09);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
