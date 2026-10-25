import * as T from 'three';
import realm from '../data/sciusev-puskin.json';
import catalog from '../data/sciusev-puskin-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** Original bounded geometry, informed by Street View April/July2025, satellite and facade
 * photographs. Unseen elevations and small dimensions remain estimates. */
export function createSciusevPuskin(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Pușkin–Pârcălab',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('pus')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('pus')) as PhotoBuilding[],'Șciusev Pușkin · curți complete');
 const l=landscapeLayer(scene,'Șciusev Pușkin · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const grilles=(f:Face,u:number,yy:number,w=1.15,h=2.0)=>{for(let x=-w/2;x<=w/2;x+=.21)f.panel(u+x,yy,.52,.025,h,.035,'#47584d',true);for(const dh of[-h*.37,h*.37])f.panel(u,yy+dh,.54,w,.028,.035,'#47584d',true);};
 const ac=(f:Face,u:number,yy:number)=>{f.panel(u,yy,.44,.65,.47,.48,'#a9b0a2');for(let d=-.22;d<=.22;d+=.11)f.panel(u+d,yy,.71,.025,.3,.025,'#6a7a6c',true);};
 const stairs=(f:Face,u:number,w:number,rise:number,offset=.2)=>{
  const n=Math.max(1,Math.ceil(rise/.13)),run=n*.28,foot=f.at(u,run+offset+.1),low=ground(...foot)+.045,top=low+rise,p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  for(let k=0;k<n;k++){const v=offset+(k+.5)*.28,p=f.at(u,v),h=top-k*rise/n;m.box(p[0],h-.11,p[1],w,.22,.30,'#95988a',false,true,angle);}return top-f.y;
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
 const barrel=(f:Face,u:number,yy:number,w:number,depth=1.0)=>{const pts:number[]=[];for(let k=0;k<12;k++){const du0=-w/2+k*w/12,du1=-w/2+(k+1)*w/12,h0=yy+.40*Math.sqrt(Math.max(0,1-(du0/(w/2))**2)),h1=yy+.40*Math.sqrt(Math.max(0,1-(du1/(w/2))**2)),p0=f.at(u+du0,.14),p1=f.at(u+du1,.14),p2=f.at(u+du0,depth),p3=f.at(u+du1,depth);pts.push(p0[0],f.y+h0,p0[1],p1[0],f.y+h1,p1[1],p2[0],f.y+h0,p2[1],p1[0],f.y+h1,p1[1],p3[0],f.y+h1,p3[1],p2[0],f.y+h0,p2[1]);m.beam(new T.Vector3(p2[0],f.y+h0,p2[1]),new T.Vector3(p3[0],f.y+h1,p3[1]),.023,'#48554a');}const bottom=pts.slice();for(let i=0;i<bottom.length;i+=9)for(const k of[0,6,3])pts.push(bottom[i+k],bottom[i+k+1]+.035,bottom[i+k+2]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();m.put(g,'#7b8371');};
 const balcony=(f:Face,u:number,yy:number,w:number)=>{const p:XY[]=[];for(let k=0;k<=12;k++)p.push(f.at(u+w/2*Math.cos(k*Math.PI/12),.12+1.0*Math.sin(k*Math.PI/12)));m.solid(p,.16,f.y+yy-.08,'#b8b8a4',false);for(let k=1;k<p.length;k++){m.beam(new T.Vector3(p[k-1][0],f.y+yy+.9,p[k-1][1]),new T.Vector3(p[k][0],f.y+yy+.9,p[k][1]),.027,'#7d8a7c');m.beam(new T.Vector3(p[k][0],f.y+yy+.08,p[k][1]),new T.Vector3(p[k][0],f.y+yy+.9,p[k][1]),.020,'#7d8a7c');}};
 const entry=(f:Face,u:number,w:number,rise:number,col='#635649')=>{const r=stairs(f,u,w,rise);a.door(f,u,2.55+r,Math.min(1.5,w-.5),col);return r;};
 const gateGap=(b:PhotoBuilding,x:number,z:number)=>b.passages.some(p=>x>Math.min(...p.rings[0].map(v=>v[0]))-.1&&x<Math.max(...p.rings[0].map(v=>v[0]))+.1&&z>Math.min(...p.rings[0].map(v=>v[1]))-.1&&z<Math.max(...p.rings[0].map(v=>v[1]))+.1);
 function* build(b:PhotoBuilding):Generator<void>{
  if(b.parts?.length){for(const part of b.parts)yield* build({...b,...part,parts:undefined});return;}
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  if(b.passages.length){
   // Split the footprint before extrusion: the real street opening is walkable.
   // Parts meet at x213; the passage is wholly within the cream western part.
   if(b.style==='pus62cream'){
    const west=b.p.map(([x,z])=>[Math.min(x,209.7),z] as XY),east=b.p.map(([x,z])=>[Math.max(x,212.5),z] as XY);
    m.solid(west,3.5+5,y-5,b.wall,true);m.solid(east,3.5+5,y-5,b.wall,true);m.solid(b.p as XY[],h-3.5,y+3.5,b.wall,true);
   }else m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);
  }else m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);
  yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<2.0;
   const corner=(b.style==='pus62cream'||b.style==='pus63')&&q[0]<p[0]-.8,shopReturn=b.style==='pus55'&&(q[0]>p[0]+.8||q[1]<p[1]-.8);
   if((!front&&!corner&&!shopReturn)||f.len<3){if(f.len>3)yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),2.1,b.trim,'#80745f');continue;}
   a.cornice(f,h,b.trim);
   if(b.style==='pus55'){
    f.panel(f.len/2,.48,.06,f.len,.96,.12,'#444f48');f.panel(f.len/2,4.0,.20,f.len,.55,.40,'#646a60');
    const n=Math.max(1,Math.round(f.len/3.5));
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.panel(u,2.2,.06,f.len/n-.20,2.9,.08,'#86998d',false,1);f.panel(u-f.len/n/2+.08,2.2,.12,.17,3.1,.24,'#6c6350');yield;}
    for(let row=0;row<4;row++){
     const yy=4.85+row*3.0;f.panel(f.len/2,yy+.15,.50,f.len,.67,1.0,'#b1b8a7');
     for(let k=0;k<n;k++){const u=(k+.5)*f.len/n,w=f.len/n-.25,offset=(k+row)%4===0?.20:1.04,col=(k+row)%5===0?'#939c87':'#a8b5a3';
      f.panel(u,yy+1.45,offset,w,2.05,.06,col,false,1);for(const du of[-w/2,0,w/2])f.panel(u+du,yy+1.45,offset+.07,.075,2.14,.12,'#c0c5b6',true);f.panel(u,yy+1.72,offset+.09,w,.07,.12,'#c0c5b6',true);
      if((k+row)%4===0){for(let d=-w/2;d<w/2;d+=.25)f.panel(u+d,yy+.74,1.02,.025,.65,.03,'#737a68',true);}yield;
     }
    }
    if(q[1]<p[1]-.8&&f.len>40){for(const u of[f.len*.24,f.len*.77]){const r=entry(f,u,2.8,.65,'#49544a');rail(f,u,r,2.8,1.65);}f.label('Nr.1',f.len*.58,3.70,.62,'#c6bda7',.45);}
    if(q[1]<p[1]-.8&&f.len>12&&f.len<22){
     const u=f.len*.50,r=stairs(f,u,5.0,.91,1.2),landing=f.at(u,.60),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);a.door(f,u,2.6+r,2.7,'#384a42');m.box(landing[0],y+r-.10,landing[1],5,.20,1.25,'#858c7d',false,true,angle);f.panel(u,3.9,.40,6.2,.7,.5,'#5b655a');f.label('Nr.1',u+2.25,3.35,.6,'#c8bda7',.67);f.label('FELICIA',u-1.5,4.0,.23,'#ccd1bf',.68);
     for(const side of[-1,1]){const x0=f.at(u+side*2.55,.26),x1=f.at(u+side*2.55,2.5);m.beam(new T.Vector3(x0[0],y+r+.8,x0[1]),new T.Vector3(x1[0],ground(...x1)+.85,x1[1]),.032,'#b1b9a8');}
    }
    continue;
   }
   if(b.style==='pus62cream'){
    for(let u=.45;u<f.len;u+=.8){const v=f.at(u);if(!gateGap(b,...v)){f.panel(u,.35,.08,.79,.70,.16,'#928d78');for(const yy of[1.2,2.1,3.0,4.0])f.panel(u,yy,.025,.79,.065,.05,b.trim,true);}}
    const n=corner?8:6;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n,v=f.at(u),pass=gateGap(b,...v)||(front&&Math.abs(v[0]-211.1)<2.0);f.window(u,(k===0||k===n-1)?6.87:7.15,(k===0||k===n-1)?1.35:1.45,(k===0||k===n-1)?3.55:3.0,b.trim,'#394c43');
     if(k%2===0)a.pediment(f,u,8.86,2.15,.60,y,b.trim);else{a.arch(f,u,8.66,2.0,.75,y,b.wall,b.trim,0);f.panel(u,8.65,.48,2.25,.16,.50,b.trim);}
     f.panel(u,5.25,.15,1.9,.62,.3,b.trim);for(const dx of[-.55,.55])f.panel(u+dx,5.25,.33,.60,.33,.04,'#c0b999',true);
     if(front&&k===4){const r=entry(f,u,1.8,.52,'#75553e');rail(f,u,r,1.8,1.35,true);barrel(f,u,3.65,2.15,1.0);}else if(!pass){f.window(u,2.30,1.70,2.7,b.trim,'#68725f');}
     if(k===0||k===n-1){balcony(f,u,5.35,2.6);}
     yield;
    }
    for(let u=.4;u<f.len;u+=.65)f.panel(u,h-.43,.23,.17,.28,.45,b.trim,true);
    for(const u of[.6,f.len-.6]){f.panel(u,h+.35,.06,1.6,.80,.20,b.trim);a.arch(f,u,h+.30,1.15,.7,y,b.wall,b.trim,0);}
    if(front){f.label('ȘCIUSEV 62',f.len*.65,4.28,.13,'#6c6b5c');}
   }else if(b.style==='pus62lilac'){
    f.panel(f.len/2,.60,.08,f.len,1.2,.16,'#978c80');f.panel(f.len/2,4.6,.20,f.len,.18,.40,b.trim);
    const n=5;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,6.3,1.05,2.15,b.trim,'#b8c3b1');if(k===1||k===4){const r=entry(f,u,2.0,.91);rail(f,u,r,2.0,2.1);}else f.window(u,2.8,1.02,2.5,b.trim,'#a9b7a7');yield;}
    a.pediment(f,f.len/2,h,4.2,1.65,y,b.trim);f.window(f.len/2,h+.53,1.65,.8,b.trim,'#9ba893',.25);f.label('MARY KAY',f.len*.64,4.15,.35,'#b8a45e');f.panel(f.len*.25,4.2,.22,3.8,.48,.08,'#435e87');
    for(const u of[f.len*.25,f.len*.45])ac(f,u,7.7);
   }else if(b.style==='pus60'){
    f.panel(f.len/2,.65,.08,f.len,1.30,.16,'#945d4e');f.panel(f.len/2,4.35,.14,f.len,.17,.28,b.trim);
    const n=7;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(k===3){f.panel(u,4.45,.08,3.25,h-.2,.16,b.trim);a.arch(f,u,5.10,1.58,2.55,y,'#748879',b.trim,1);}else f.window(u,6.30,1.42,2.1,b.trim,'#b6c0b0');
     if(k===1||k===5){balcony(f,u,5.0,2.4);const r=entry(f,u,2.4,1.04,'#766050');rail(f,u,r,2.4,2.35);}else if(k===6){a.door(f,u,2.15,1.1,'#4c473a');f.label('ATELIER',u,1.80,.15,'#bbb69e');}else f.window(u,2.85,1.30,2.45,b.trim,'#adaf98');yield;
    }
    for(const t of[.16,.50,.84]){const u=f.len*t;a.pediment(f,u,h,4.7,2.45,y,b.trim);f.window(u,h+.73,1.75,1.15,b.trim,'#bdc6b4',.24);}
    for(const u of[1.0,f.len-1.0])ac(f,u,4.0);
   }else if(b.style==='pus58'){
    f.panel(f.len/2,.34,.10,f.len,.68,.20,'#b9b194');
    for(const t of[.38,.62]){f.window(f.len*t,2.15,.92,1.50,b.trim,'#4c5143');grilles(f,f.len*t,2.15,.90,1.48);}
    for(const[t,r]of[[.13,.26],[.89,.52]]){entry(f,f.len*t,1.65,r);barrel(f,f.len*t,3.0+r,1.85,1.1);}
    for(const u of[.15,f.len*.27,f.len*.76,f.len-.15]){f.panel(u,h/2,.10,.26,h+.40,.2,b.trim);a.arch(f,u,h-.02,.38,.52,y,b.trim,b.trim,0);}
    a.pediment(f,f.len*.53,h-.10,4.3,.65,y,b.wall);f.label('NOTAR',f.len*.12,3.75,.20,'#917a43');
   }else if(b.style==='pus56'){
    f.panel(f.len/2,.55,.1,f.len,1.10,.20,'#686c62');
    for(let k=0;k<4;k++){const u=f.len*(.09+k*.17);f.window(u,2.85,1.25,2.75,b.trim,'#6b5843');yield;}
    const u=f.len*.85,r=entry(f,u,3.1,.65,'#4a493c');rail(f,u,r,3.1,1.55);for(const d of[-2.15,2.15])f.panel(u+d,3.1,.28,.52,4.9,.56,b.trim);f.panel(u,5.25,.30,4.85,.45,.6,b.trim);a.pediment(f,u,5.47,5.9,1.40,y,b.trim);f.label('VIVAVINO',u,5.19,.39,'#424d42',.65);f.label('ȘCIUSEV 56',u+1.9,3.95,.10,'#526e83');
   }else if(b.style==='pus56east'){
    f.panel(f.len/2,2.25,.035,f.len-.30,4.2,.07,'#384541');for(let k=0;k<3;k++)f.window((k+.5)*f.len/3,1.8,1.05,2.5,'#777c67','#4b4e3e');f.label('ARTIFICII',f.len/2,3.8,.32,'#cbb75d');f.label('MAXSEM',f.len/2,3.3,.20,'#c8c4a6');
   }else if(b.style==='pus27'){
    f.panel(f.len/2,.33,.10,f.len,.66,.20,'#858d83');const n=front?5:3;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(front&&k===n-1){entry(f,u,2.3,.52,'#4e5345');barrel(f,u,3.5,2.4,1.0);f.panel(u,3.87,.18,2.9,.55,.12,'#617952');}else f.window(u,2.0,1.2,1.85,b.trim,'#88917d');yield;}
   }else if(b.style==='pus61'){
    f.panel(f.len*.73,h/2,.025,f.len*.54,h,.05,'#9e9589');f.panel(f.len/2,.52,.08,f.len,1.04,.16,'#8f9182');for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;f.window(u,2.3,1.1,2.05,b.trim,'#736c5b');grilles(f,u,2.3,1.07,2.0);yield;}
   }else if(b.style==='pus63'){
    f.panel(f.len/2,.55,.08,f.len,1.1,.16,'#7e8b82');f.panel(f.len/2,4.25,.1,f.len,.2,.2,b.trim);
    const n=front?5:5;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,6.13,1.55,2.15,b.trim,'#a4b3a4');if(k===2&&front){const r=entry(f,u,2.7,.52,'#4d6257');rail(f,u,r,2.7,1.50);f.label('LUTNITA',u,4.55,.18,'#424f44');}else f.window(u,2.2,1.45,2.15,b.trim,'#abb7a7');yield;}
   }
  }
 }
 for(const b of custom)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],()=>build(b));
 // Long ramp alongside the recessed supermarket entrance, separate from the
 // stair flight. Both ends meet the measured terrain smoothly.
 m.job('rampă Nr.1',streetRect(321.2,631.8,12,1.5),[],function*(){
  const xa=327.0,xb=321.85,z=633.5,w=1.18,ya=ground(xa,z)+.05,yb=ground(319.485,630.88)+.955,vertices=[xa,ya,z-w/2,xb,yb,z-w/2,xa,ya,z+w/2,xb,yb,z-w/2,xb,yb,z+w/2,xa,ya,z+w/2];const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();m.put(g,'#858c7d',false,true);for(const s of[-1,1]){m.beam(new T.Vector3(xa,ya+.85,z+s*w/2),new T.Vector3(xb,yb+.85,z+s*w/2),.028,'#a8b49f');}yield;
 });
 const walls:[XY,XY,string,number][]=[[[212.2,628.5],[215.0,628.5],'#a79d7f',2.25],[[218.4,628.5],[221.1,628.5],'#a79d7f',2.25],[[239.3,628.7],[240.0,628.7],'#91967e',2.5],[[245.9,628.7],[247.4,628.7],'#91967e',2.5],[[292.6,608.5],[295.0,608.5],'#938d78',2.2]];
 for(const[p,q,color,h]of walls)m.job('împrejmuire', [p,q],[],function*(){const x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;m.box(x,ground(x,z)+h/2,z,q[0]-p[0],h,.28,color,false,true);for(let yy=.4;yy<h;yy+=.36)m.box(x,ground(x,z)+yy,z-.16,q[0]-p[0],.018,.02,'#807f67',true);yield;});
 for(const[x,z,h]of realm.trees)m.job(h<6?'arbore tuns':'arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(h<6?.10:.21,h<6?.16:.32,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#636750',false,true);const crowns=h<6?[[0,.73,0,1.6]]:[[0,.67,0,2.8],[-1.7,.64,.5,2.0],[1.5,.76,-.4,2.2],[0,.91,0,1.9]];for(const[dx,dy,dz,r]of crowns){const g=h<6?new T.SphereGeometry(r,12,7):new T.IcosahedronGeometry(r,1);g.scale(1,h<6?.63:1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,h<6?'#728b4f':'#657d4a');yield;}});
 const poles:XY[]=[[197,612.9],[229,612.9],[264,612.9],[298,612.9],[326,613.0]];
 for(const[x,z]of poles)m.job('stâlp și iluminat',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.8,z,.22,7.6,.22,'#999e8b',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x,y+7.4,z+1.3),.045,'#6b7866');m.box(x,y+7.4,z+1.3,.28,.12,.55,'#b1b7a1');yield;});
 for(let i=1;i<poles.length;i++)m.job('cabluri aeriene',[poles[i-1],poles[i]],[],function*(){const p=poles[i-1],q=poles[i];for(let w=0;w<5;w++)for(let k=0;k<4;k++){const point=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7-.30*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+w*.12);m.beam(point(k/4),point((k+1)/4),.012,'#4a5647');yield;}});
 for(const[x,z]of[[195,625.8],[195,611.7],[172,625.8],[173,611.7]])m.job('indicator pietoni',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),f=m.facade([x-.33,z],[x+.33,z],y);m.box(x,y+1.35,z,.055,2.7,.055,'#9aa38d',false,true);f.panel(.33,2.43,0,.68,.68,.07,'#b6be58');f.panel(.33,2.43,.045,.54,.54,.02,'#447492');a.pediment(f,.33,2.21,.46,.4,y,'#ced2ba');yield;});
 for(const[x,z]of[[191.0,609.6],[175.3,629.5]])m.job('semafor Pușkin',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.8,z,.09,3.6,.09,'#647263',false,true);m.box(x,y+2.8,z,.32,1.0,.25,'#34493f');for(const[d,c]of[[.28,'#a45a42'],[0,'#b79e4f'],[-.28,'#668c50']]as const){const g=new T.CircleGeometry(.10,12);g.translate(x,y+2.8+d,z+.14);m.put(g,c);}yield;});
 for(const[x,z]of[[276,627.7],[303,627.7],[254,608.5]])m.job('coș',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+.42,z,.42,.78,.42,'#61745f',false,true);m.box(x,y+.85,z,.48,.10,.48,'#455b48');yield;});
 for(const[x,z]of[[282,659],[299,666]])m.job('bancă în curte',streetRect(x,z,2.1,1),[],function*(){const y=ground(x,z);for(const dx of[-.70,.70])m.box(x+dx,y+.28,z,.08,.56,.52,'#4e5e4c',false,true);for(let k=0;k<4;k++)m.box(x,y+.52,z-.22+k*.15,1.95,.08,.13,'#9c7550',false,true);yield;});
 for(const[x,z]of[[196.2,607.7],[202,607.7]])m.job('terasă colț62',streetRect(x,z,3.2,3.2),[],function*(){const y=ground(x,z);m.box(x,y+1.35,z,.055,2.7,.055,'#716650',false,true);const shade=new T.ConeGeometry(1.65,.40,8);shade.translate(x,y+2.6,z);m.put(shade,'#8e4963');m.box(x,y+.74,z,1.15,.07,.85,'#665c47',false,true);for(const dx of[-.87,.87]){m.box(x+dx,y+.46,z,.46,.07,.46,'#9d7851',false,true);m.box(x+dx,y+.75,z+.2,.46,.54,.06,'#9d7851');}yield;});
 for(const[x,z,txt]of[[194.8,627.0,'ALEXEI ȘCIUSEV'],[193.1,603.8,'ALEXANDR PUȘKIN']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x-1,z],[x+1,z],ground(x,z));f.panel(1,2.5,.02,1.9,.42,.05,'#526f86');f.label(txt,1,2.5,.125,'#d0d2bd',.07);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
