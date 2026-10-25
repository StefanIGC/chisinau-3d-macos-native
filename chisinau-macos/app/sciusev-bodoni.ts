import * as T from 'three';
import realm from '../data/sciusev-bodoni.json';
import catalog from '../data/sciusev-bodoni-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** Original bounded geometry, informed by Street View September2025, satellite and facade
 * photographs. Unseen elevations and small dimensions remain estimates. */
export function createSciusevBodoni(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Bănulescu-Bodoni–Pușkin',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('bod')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('bod')) as PhotoBuilding[],'Șciusev Bodoni · curți complete');
 const l=landscapeLayer(scene,'Șciusev Bodoni · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const grilles=(f:Face,u:number,yy:number,w=1.15,h=2.0)=>{for(let x=-w/2;x<=w/2;x+=.21)f.panel(u+x,yy,.52,.025,h,.035,'#47584d',true);for(const dh of[-h*.37,h*.37])f.panel(u,yy+dh,.54,w,.028,.035,'#47584d',true);};
 const ac=(f:Face,u:number,yy:number)=>{f.panel(u,yy,.44,.65,.47,.48,'#a9b0a2');for(let d=-.22;d<=.22;d+=.11)f.panel(u+d,yy,.71,.025,.3,.025,'#6a7a6c',true);};
 const stairs=(f:Face,u:number,w:number,rise:number,offset=.2,color='#95988a')=>{
  const n=Math.max(1,Math.ceil(rise/.13)),run=n*.28,foot=f.at(u,run+offset+.1),low=ground(...foot)+.045,top=low+rise,p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  for(let k=0;k<n;k++){const v=offset+(k+.5)*.28,p=f.at(u,v),h=top-k*rise/n;m.box(p[0],h-.11,p[1],w,.22,.30,color,false,true,angle);}return top-f.y;
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
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.16+b.roofRise*Math.min(1,d/(b.style==='bod67'?2.5:run)),p[1]];};
  function tri(a:XY,b:XY,c:XY,depth=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(depth<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,depth+1);tri(p,b,c,depth+1);}else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,depth+1);tri(a,p,c,depth+1);}else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,depth+1);tri(p,b,c,depth+1);}return;}out.push(...vertex(a),...vertex(b),...vertex(c));}
  for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
  src.dispose();g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.computeVertexNormals();m.put(result,b.roof,false,true);
 }
 const barrel=(f:Face,u:number,yy:number,w:number,depth=1.0)=>{const pts:number[]=[];for(let k=0;k<12;k++){const du0=-w/2+k*w/12,du1=-w/2+(k+1)*w/12,h0=yy+.40*Math.sqrt(Math.max(0,1-(du0/(w/2))**2)),h1=yy+.40*Math.sqrt(Math.max(0,1-(du1/(w/2))**2)),p0=f.at(u+du0,.14),p1=f.at(u+du1,.14),p2=f.at(u+du0,depth),p3=f.at(u+du1,depth);pts.push(p0[0],f.y+h0,p0[1],p1[0],f.y+h1,p1[1],p2[0],f.y+h0,p2[1],p1[0],f.y+h1,p1[1],p3[0],f.y+h1,p3[1],p2[0],f.y+h0,p2[1]);m.beam(new T.Vector3(p2[0],f.y+h0,p2[1]),new T.Vector3(p3[0],f.y+h1,p3[1]),.023,'#48554a');}const bottom=pts.slice();for(let i=0;i<bottom.length;i+=9)for(const k of[0,6,3])pts.push(bottom[i+k],bottom[i+k+1]+.035,bottom[i+k+2]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();m.put(g,'#7b8371');};
 const balcony=(f:Face,u:number,yy:number,w:number)=>{const p:XY[]=[];for(let k=0;k<=12;k++)p.push(f.at(u+w/2*Math.cos(k*Math.PI/12),.12+1.0*Math.sin(k*Math.PI/12)));m.solid(p,.16,f.y+yy-.08,'#b8b8a4',false);for(let k=1;k<p.length;k++){m.beam(new T.Vector3(p[k-1][0],f.y+yy+.9,p[k-1][1]),new T.Vector3(p[k][0],f.y+yy+.9,p[k][1]),.027,'#7d8a7c');m.beam(new T.Vector3(p[k][0],f.y+yy+.08,p[k][1]),new T.Vector3(p[k][0],f.y+yy+.9,p[k][1]),.020,'#7d8a7c');}};
 const entry=(f:Face,u:number,w:number,rise:number,col='#635649',stepColor='#95988a')=>{const r=stairs(f,u,w,rise,.2,stepColor);a.door(f,u,2.55+r,Math.min(1.5,w-.5),col);return r;};
 const band=(f:Face,h:number,color:string)=>f.panel(f.len/2,h/2,.09,f.len,h,.18,color);
 const ornament=(f:Face,u:number,yy:number,w:number,h:number,frame:string,kind=0)=>{f.window(u,yy,w,h,'#ccc8b5',frame);f.panel(u,yy+h/2+.22,.30,w+.55,.16,.40,'#c9c7b6');if(kind)a.pediment(f,u,yy+h/2+.30,w+.6,.30,f.y,'#c9c7b6');};
 const dormer=(f:Face,u:number,bottom:number,w:number,h:number,col:string,round=false)=>{f.panel(u,bottom+h/2,-.45,w,h,1.2,col);f.window(u,bottom+h*.51,w*.67,h*.60,col,'#725d47');if(round){a.arch(f,u,bottom+h-.05,w,.85,f.y,col,col,0);}else a.pediment(f,u,bottom+h,w+.35,.7,f.y,col);};
 const canopy=(f:Face,u:number,h:number,w:number,color='#40504a')=>{f.panel(u,h,.72,w,.12,1.44,color);for(const d of[-w/2,w/2])f.panel(u+d,h-.22,1.1,.035,.5,.035,color,true);};
 const rusticate=(f:Face,h:number)=>{for(let yy=.9;yy<h-.5;yy+=.48)f.panel(f.len/2,yy,.025,f.len,.025,.05,'#9e9b88',true);};
 function* build(b:PhotoBuilding):Generator<void>{
  if(b.parts?.length){for(const part of b.parts)yield* build({...b,...part,parts:undefined});return;}
  const y=ground(...b.anchor as XY)+.12,h=b.height,s=b.style;
  m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<2.1;
   const corner=(['bod84','bodcorner8'].includes(s)&&q[0]<p[0]-.8)||(s==='bod65'&&q[0]>p[0]+.8)||(s==='bodolympic'&&q[0]>p[0]+.8);
   if((!front&&!corner)||f.len<3){if(f.len>3)yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),2.1,b.trim,'#7b7461');continue;}
   a.cornice(f,h,'#c9c6b4');
   if(s==='bodolympic'){
    band(f,.7,'#8b8c7a');rusticate(f,h);const n=front?7:3;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(k===0||k===n-1){f.panel(u,h/2,.12,f.len/n-.2,h,.24,b.wall);a.arch(f,u,1.25,1.65,3.5,y,'#546a64','#ccc8b7');a.pediment(f,u,h+.05,f.len/n-.5,1.4,y,'#c6c1ac');}else ornament(f,u,2.9,1.6,2.9,'#745a45');yield;}
    for(let u=.5;u<f.len;u+=.7)f.panel(u,h-.46,.28,.22,.30,.50,'#c9c6b4',true);
    if(corner){entry(f,f.len*.50,2.9,.65);f.label('COMITETUL OLIMPIC',f.len/2,h-.80,.16,'#6a6b58');}
   }else if(s==='bod65'){
    band(f,1.45,'#53584d');rusticate(f,h);const n=Math.max(4,Math.round(f.len/3.8));
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(k===n-1&&front){entry(f,u,3.0,.78,'#5f4837');a.pediment(f,u,h-.2,4.0,1.1,y,b.trim);}else{ornament(f,u,3.45,1.55,2.65,'#6f604b');grilles(f,u,3.45,1.53,2.6);f.panel(u,.7,.20,1.1,.48,.10,'#39473e',false,1);}yield;}
    for(let u=.3;u<f.len;u+=.65)f.panel(u,h-.45,.30,.22,.37,.5,'#c2bca6',true);ac(f,f.len*.3,h-.7);
   }else if(s==='bod66'){
    band(f,.50,'#4b4e44');const n=5;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(k===2){entry(f,u,3.5,.39,'#6e5038');}else f.window(u,2.0,1.7,2.65,'#c6bdb0','#70543f');yield;}
    canopy(f,f.len/2,3.55,f.len*.8,'#5c4d40');for(const u of[f.len*.13,f.len*.87])f.panel(u,1.85,1.1,.08,3.55,.08,'#655240');f.label('RED RABBIT',f.len/2,3.12,.30,'#894e40');
   }else if(s==='bod67'){
    band(f,.65,'#4e574d');rusticate(f,h);for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;a.arch(f,u,.90,1.65,2.65,y,'#536961',b.trim);ornament(f,u,5.65,1.6,2.15,'#685940');dormer(f,u,h+.5,1.85,1.75,b.wall);yield;}
    f.panel(f.len/2,3.70,.14,f.len,.24,.28,b.trim);f.label('ZEPTER',f.len/2,4.22,.42,'#766951');
   }else if(s==='bod69'){
    band(f,.40,'#8c8d79');for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(!k){entry(f,u,2.0,.39,'#697155');a.pediment(f,u,h,3.3,.9,y,b.wall);}else{f.window(u,2.1,1.3,2.5,b.trim,'#829483');canopy(f,u,3.5,1.6,'#456657');}yield;}f.label('METIER',f.len*.56,3.84,.25,'#526553');
   }else if(s==='bod70'){
    band(f,.42,'#704a3c');for(let k=0;k<6;k++){const u=(k+.5)*f.len/6;if(k===5)a.arch(f,u,.08,1.4,3.0,y,'#36463c',b.trim);else ornament(f,u,2.0,1.35,2.25,'#71634f');yield;}
    canopy(f,f.len*.36,3.65,f.len*.62,'#717f6c');for(let u=f.len*.05;u<f.len*.67;u+=.32)f.panel(u,3.71,.73,.13,.02,1.44,'#c0bba2',true);f.label('LITTLE NAPOLI',f.len*.38,3.02,.21,'#e0c5a0');
   }else if(s==='bod72blue'||s==='bod72pink'||s==='bod68'||s==='bod74'){
    band(f,.55,'#8e8d79');if(s==='bod68')rusticate(f,h);const n=s==='bod74'?6:s==='bod68'?5:4;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(s==='bod74'&&k===n-1)entry(f,u,1.8,.26,'#826647');else{ornament(f,u,2.2,1.25,2.35,'#b9c2ae');if(s==='bod74')grilles(f,u,2.2,1.22,2.3);}yield;}
    if(s==='bod68'){ac(f,f.len*.8,3.6);f.label('NOTAR',f.len*.2,3.5,.19,'#746741');}
   }else if(s==='bod76'){
    band(f,.65,'#855a48');f.panel(f.len/2,3.6,.16,f.len,.20,.32,b.trim);
    for(let k=0;k<5;k++){const u=f.len*(.06+k*.14);for(const yy of[2.05,5.7]){f.window(u,yy,1.45,2.3,'#cecebf','#b8c2af');grilles(f,u,yy,1.43,2.25);}yield;}
    const u=f.len*.86,r=entry(f,u,3.4,.65,'#695039','#895846');for(const du of[-1.55,1.55]){const p=f.at(u+du,.95);a.column(...p,y+r,3.55,.23,'#c5c6b5',true);}f.panel(u,r+3.7,.70,4.0,.26,1.4,b.trim);a.pediment(f,u,r+3.83,4.7,1.2,y,b.trim);f.label('MOLDINDCONBANK',f.len*.37,3.76,.23,'#527387');
    f.panel(f.len*.44,h+.92,-3.0,f.len*.78,1.84,3.5,b.wall);f.panel(f.len*.44,h+1.88,-3.0,f.len*.81,.12,3.8,b.roof);for(let k=0;k<4;k++)f.window(f.len*(.13+k*.19),h+1.0,1.45,1.20,b.trim,'#a1ab98',-1.43);for(const t of[.15,.5,.85])f.panel(f.len*t,h+2.1,-2,.6,2.2,.7,'#986146');
   }else if(s==='bod78'||s==='bod78amg'){
    band(f,.62,s==='bod78'?'#825947':'#aaa089');const n=s==='bod78'?4:3;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(!k){entry(f,u,1.9,s==='bod78'?.39:.13,'#70523a');barrel(f,u,3.4,2.0,1.0);}else{ornament(f,u,2.3,1.45,2.6,'#725139');if(s==='bod78'){f.panel(u,3.97,.35,.50,.31,.18,b.trim);for(const du of[-.85,.85])f.panel(u+du,2.3,.25,.2,2.75,.30,b.trim);}}yield;}if(s==='bod78amg')f.label('AMG',f.len*.55,3.22,.23,'#6e745e');
   }else if(s==='bod78works'||s==='bod73works'){
    if(s==='bod73works'){f.panel(f.len/2,1.2,.38,f.len,2.4,.20,'#746554');for(let u=.12;u<f.len;u+=.32)f.panel(u,1.2,.50,.028,2.4,.03,'#8e7a5b',true);f.panel(f.len/2,4.4,.38,f.len,3.5,.04,'#637957');}
    else for(let k=0;k<2;k++){f.panel((k+.5)*f.len/2,5.7,.05,f.len/2-.4,3.7,.03,'#4d554c',false,1);f.panel((k+.5)*f.len/2,2.0,.05,f.len/2-.4,2.7,.03,'#5c6155',false,1);}yield;
   }else if(s==='bod80'||s==='bod81office'||s==='bod82'||s==='bod83hotel'||s==='bod89rear'){
    const n=s==='bod83hotel'?4:s==='bod82'?4:3;band(f,.58,'#868977');
    for(let row=0;row<b.levels;row++){const yy=(row+.53)*h/b.levels;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,yy,Math.min(2.6,f.len/n-.5),h/b.levels*.64,'#c9c9b7','#785e48');if(s==='bod83hotel'&&row>0&&k>0&&k<3)rail(f,u,yy-h/b.levels*.34,2.15,.65,true);yield;}f.panel(f.len/2,(row+1)*h/b.levels-.08,.1,f.len,.16,.2,b.trim);}
    if(s==='bod82'){for(const u of[f.len*.26,f.len*.73])dormer(f,u,h+.05,f.len*.37,1.65,b.wall,true);for(const u of[f.len*.23,f.len*.81]){entry(f,u,2.5,.39,'#7b5f43');canopy(f,u,3.12,2.6,'#775d49');}f.label('QUO VADIS',f.len*.52,3.62,.47,'#588b9d');}
    if(s==='bod80'){entry(f,f.len*.85,2.4,.26,'#8b663e');a.pediment(f,f.len*.85,3.35,3.7,1.0,y,b.trim);canopy(f,f.len*.32,3.5,f.len*.65,'#735e48');for(const u of[.5,f.len*.65])f.panel(u,1.75,1.15,.10,3.5,.10,'#73634c');f.label('Florentino Delure',f.len*.76,3.18,.17,'#645f4b');}
    if(s==='bod81office'){f.panel(f.len/2,7.0,.35,f.len*.82,.80,.12,'#575f54');f.label('INDRIVO',f.len/2,7,.42,'#c8ccbc');yield* a.fence(f.at(.1,-.20),f.at(f.len-.1,-.20),y+h+.15,.95);}
    if(s==='bod83hotel'){for(const u of[f.len*.08,f.len*.33,f.len*.66,f.len*.92])f.panel(u,h/2,.20,.36,h,.4,b.trim);dormer(f,f.len/2,h-.1,4.7,1.9,b.wall,true);for(const u of[f.len*.14,f.len*.86])a.arch(f,u,h+.05,1.0,1.05,y,'#506358',b.trim);}
   }else if(s==='bod77'){
    band(f,.60,'#797f70');for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(k===2){entry(f,u,1.95,.39,'#904b3e');canopy(f,u,3.55,2.7,'#39473f');a.pediment(f,u,3.55,2.8,.52,y,'#39473f');}else f.window(u,2.45,1.4,2.15,b.trim,'#954e3e');yield;}
    f.panel(f.len*.64,2.7,.24,.78,.85,.08,'#35463d');f.label('A. ȘCIUSEV',f.len*.64,2.70,.095,'#c9b575',.31);f.panel(f.len*.84,3.86,.24,.50,.70,.13,'#b7b5a0');
   }else if(s==='bod81'){
    band(f,1.3,'#a97d76');a.pediment(f,f.len/2,h,f.len+1,3.0,y,b.wall);for(const u of[f.len*.37,f.len*.63])f.window(u,h+.83,1.2,1.4,b.trim,'#795d44');
    for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;if(k===3){entry(f,u,1.75,.78,'#614933');}else{ornament(f,u,3.0,1.3,2.4,'#795c42',1);f.panel(u,.6,.20,1.0,.42,.05,'#455447',false,1);grilles(f,u,.6,1,.4);}yield;}ac(f,f.len/2,h+.90);
   }else if(s==='bod84'){
    band(f,.70,'#939788');const n=corner?5:6;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n,arched=k<2||k===n-1;if(front&&k===n-1){entry(f,u,3.1,.65,'#527370');rail(f,u,.68,3.1,1.5,true);a.arch(f,u,.72,1.85,3.8,y,'#486660',b.trim);}else if(arched)a.arch(f,u,.95,1.75,3.5,y,'#5c7974','#cecab7');else ornament(f,u,2.6,1.4,2.8,'#5a7770');if(k===0||k===n-1){f.panel(u,h+.46,.05,2.5,.85,.1,b.trim);a.arch(f,u,h+.47,2.0,.9,y,b.wall,b.trim,0);}yield;}
    for(let u=.3;u<f.len;u+=.75)f.panel(u,h-.43,.05,.30,.13,.08,'#525c50',false,1);
    for(const u of[.25,f.len*.32,f.len*.81,f.len-.25])for(let yy=.8;yy<h;yy+=.58)f.panel(u,yy,.20,.55,.38,.4,'#c9c5b2');
   }else if(s==='bod85'){
    band(f,.6,'#979886');for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(k===2)entry(f,u,1.8,.39,'#70513a');else a.arch(f,u,1.0,1.22,2.45,y,'#53675c',b.trim);yield;}for(const u of[f.len*.23,f.len*.77])dormer(f,u,h+.25,3.6,1.8,b.wall);
   }else if(s==='bod87'){
    band(f,.58,'#4e5348');rusticate(f,h);for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(k===1)entry(f,u,2.0,.26,'#3c4b41');else if(k===0||k===4)a.arch(f,u,.83,1.75,3.0,y,'#526958',b.trim);else ornament(f,u,2.45,1.5,2.95,'#3f5447');f.panel(u,4.97,.18,.65,.27,.03,'#404f42',false,1);yield;}for(const u of[f.len*.13,f.len*.90]){f.panel(u,h+.36,.07,2.8,.75,.14,b.wall);a.arch(f,u,h+.38,2.2,.9,y,b.wall,b.trim,0);}
   }else if(s==='bod89'){
    band(f,1.2,'#929688');for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;if(k===1||k===3){const r=entry(f,u,2.6,.65,'#4c5b4d');rail(f,u,r,2.6,1.6);canopy(f,u,3.7,2.9,'#57758a');}else ornament(f,u,2.4,1.3,2.3,'#786249');yield;}
   }else if(s==='bod71'){
    band(f,.65,'#858676');for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;if(!k)entry(f,u,1.75,.52,'#80553d');else ornament(f,u,2.55,1.25,2.6,'#7b5c44');yield;}for(const u of[f.len*.14,f.len*.80]){f.panel(u,h+.4,.12,2.6,1.0,.24,b.wall);a.arch(f,u,h+.3,1.4,.9,y,b.wall,b.trim,0);}
   }else if(s==='bod73'){
    band(f,.6,'#90957f');for(const t of[.27,.47])f.window(f.len*t,2.0,1.15,1.65,b.trim,'#565e4b');canopy(f,f.len*.37,3.15,f.len*.46,'#37473b');const r=entry(f,f.len*.85,1.85,.39,'#5d624f');rail(f,f.len*.85,r,1.85,1.0);
   }else if(s==='bod75'){
    for(let yy=.5;yy<h-.3;yy+=.22)f.panel(f.len*.64,yy,.035,f.len*.72,.035,.07,'#8b9e89',true);for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(k===3)entry(f,u,1.8,.26,'#7c8c70');else f.window(u,2.1,1.25,2.1,b.trim,'#8b9c83');yield;}f.label('O BLANC',f.len*.66,3.7,.21,'#69755d');
   }else if(s==='bod82low'){
    band(f,.4,'#8e9788');for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;if(k===1){entry(f,u,1.55,.26,'#82613e');canopy(f,u,3.12,1.8,'#74705b');}else{f.window(u,2.1,1.17,2.05,b.trim,'#bbc3af');grilles(f,u,2.1,1.25,2.05);}yield;}
   }else if(s==='bodcorner8'){
    band(f,.6,'#969988');const n=corner?4:6;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(!corner&&k===4){entry(f,u,2.3,.65,'#76523b');barrel(f,u,3.8,2.7,1.2);}else ornament(f,u,2.6,1.2,2.65,'#7c5d43',1);yield;}for(let u=.4;u<f.len;u+=.50)f.panel(u,h-.45,.26,.16,.22,.4,b.trim,true);
   }else{band(f,.55,'#919681');yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.6)),2.1,b.trim,'#7a705c');}
  }
 }
 for(const b of custom)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],()=>build(b));
 // Opaque street details share the same bounded build queue and collision lifecycle.
 const fenceRuns:[XY,XY,number][]=[[[129,610.0],[170,610.0],.85],[[-25.0,630.0],[-11.2,630.0],2.35],[[-39.5,630.0],[-32.3,630.0],2.55],[[15.5,611.2],[16.2,611.2],1.8]];
 for(const[p,q,h]of fenceRuns)m.job('zid și împrejmuire',[p,q],[],function*(){const x=(p[0]+q[0])/2,z=(p[1]+q[1])/2,y=ground(x,z);if(h>2){m.box(x,y+h/2,z,q[0]-p[0],h,.24,'#bebdb0',false,true);for(let xx=p[0]+.3;xx<q[0];xx+=2.7){m.box(xx,y+h/2,z,.32,h+.25,.4,'#cfccbb');m.box(xx,y+h+.22,z,.46,.18,.48,'#c6c5b2');}}else yield* a.fence(p,q,y+.25,h);yield;});
 // The gallery courtyard entrance is a freestanding arch, with walking space below.
 m.job('Gregory · portal',[[-32,630],[-26,630]],[],function*(){const y=ground(-29,630),f=m.facade([-32,630],[-26,630],y);for(const u of[.3,5.7])f.panel(u,1.75,0,.55,3.5,.50,'#babdab');f.panel(3,3.28,0,5.9,.65,.48,'#bcbdad');a.arch(f,3,3.55,2.6,.7,y,'#bfc0b1','#c9c8b6',0);f.label('GREGORY HOTEL',3,3.3,.25,'#807044',.29);yield;});
 for(const[x,z,h]of realm.trees)m.job(h<6?'arbore tuns':'arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(h<6?.10:.21,h<6?.16:.32,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#636750',false,true);const crowns=h<6?[[0,.73,0,1.6]]:[[0,.67,0,2.8],[-1.7,.64,.5,2.0],[1.5,.76,-.4,2.2],[0,.91,0,1.9]];for(const[dx,dy,dz,r]of crowns){const g=h<6?new T.SphereGeometry(r,12,7):new T.IcosahedronGeometry(r,1);g.scale(1,h<6?.63:1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,h<6?'#728b4f':'#657d4a');yield;}});
 for(let x=132;x<172;x+=5)m.job('conifer CNOS',streetRect(x,609.2,2,2),[],function*(){const y=ground(x,609.2);for(let k=0;k<3;k++){const g=new T.ConeGeometry(1.1-k*.23,3.6-k*.6,8);g.translate(x,y+2.0+k*1.6,609.2);m.put(g,'#3f6650');}yield;});
 const poles:XY[]=[[-119,613.2],[-86,613.2],[-55,613.2],[-24,613.2],[11,613.1],[42,613.1],[75,613.0],[107,613.0],[140,613.0],[171,613.0]];
 for(const[x,z]of poles)m.job('stâlp și iluminat',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.8,z,.22,7.6,.22,'#999e8b',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x,y+7.4,z+1.3),.045,'#6b7866');m.box(x,y+7.4,z+1.3,.28,.12,.55,'#b1b7a1');yield;});
 for(let i=1;i<poles.length;i++)m.job('cabluri aeriene',[poles[i-1],poles[i]],[],function*(){const p=poles[i-1],q=poles[i];for(let w=0;w<6;w++)for(let k=0;k<4;k++){const point=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7-.3*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+w*.10);m.beam(point(k/4),point((k+1)/4),.012,'#4a5647');yield;}});
 for(const[x,z]of[[-119,611.5],[-137,611.5],[-119,628],[-137,628]])m.job('indicator pietoni',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),f=m.facade([x-.33,z],[x+.33,z],y);m.box(x,y+1.35,z,.055,2.7,.055,'#9aa38d',false,true);f.panel(.33,2.43,0,.68,.68,.07,'#b6be58');f.panel(.33,2.43,.045,.54,.54,.02,'#447492');a.pediment(f,.33,2.21,.46,.4,y,'#ced2ba');yield;});
 for(const[x,z]of[[-120.5,611],[-136,628.5]])m.job('semafor Bodoni',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.8,z,.09,3.6,.09,'#647263',false,true);m.box(x,y+2.8,z,.32,1.0,.25,'#34493f');for(const[d,c]of[[.28,'#a45a42'],[0,'#b79e4f'],[-.28,'#668c50']]as const){const g=new T.CircleGeometry(.10,12);g.translate(x,y+2.8+d,z+.14);m.put(g,c);}yield;});
 for(const[x,z]of[[47,628.4],[10,628.4],[-44,631],[-90,612.2],[112,609]])m.job('coș',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+.42,z,.42,.78,.42,'#61745f',false,true);m.box(x,y+.85,z,.48,.10,.48,'#455b48');yield;});
 for(const[x,z]of[[129.6,627.6],[131,627.6],[132.4,627.6]])m.job('container stradal',streetRect(x,z,1.2,1),[],function*(){const y=ground(x,z);m.box(x,y+.65,z,1.1,1.0,.8,'#5c7360',false,true);m.box(x,y+1.17,z,1.2,.15,.9,'#3d5948');for(const dx of[-.42,.42])m.box(x+dx,y+.13,z,.13,.24,.18,'#37493d');yield;});
 for(const[x,z]of[[93,627.8],[98,627.8]])m.job('terasă Metier',streetRect(x,z,3,3),[],function*(){const y=ground(x,z);m.box(x,y+1.45,z,.05,2.9,.05,'#73654d',false,true);const shade=new T.ConeGeometry(1.55,.35,8);shade.translate(x,y+2.85,z);m.put(shade,'#c7c6ad');m.box(x,y+.74,z,1.05,.07,.8,'#665c47',false,true);for(const dx of[-.75,.75]){m.box(x+dx,y+.46,z,.43,.07,.43,'#9d7851',false,true);m.box(x+dx,y+.7,z+.2,.43,.45,.05,'#9d7851');}yield;});
 for(const[x,z]of[[90,628],[101.3,628],[113,609.2],[-65,632]])m.job('jardinieră',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+.37,z,.62,.72,.62,'#8d8c73',false,true);const crown=new T.IcosahedronGeometry(.42,1);crown.scale(1,1.4,1);crown.translate(x,y+.88,z);m.put(crown,'#5c8050');yield;});
 for(const[x,z,txt]of[[-101,611.5,'ALEXEI ȘCIUSEV'],[-120,597,'BĂNULESCU-BODONI'],[167,609,'ALEXEI ȘCIUSEV']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x-1,z],[x+1,z],ground(x,z));f.panel(1,2.5,.02,1.9,.42,.05,'#526f86');f.label(txt,1,2.5,.11,'#d0d2bd',.07);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
