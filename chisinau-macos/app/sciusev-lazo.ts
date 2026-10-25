import * as T from 'three';
import realm from '../data/sciusev-lazo.json';
import catalog from '../data/sciusev-lazo-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,featureContains,type XY} from './city-layout';

/** Original bounded geometry, informed by dated Street View, satellite and independent photographs. Unseen elevations and small dimensions remain estimates. */
export function createSciusevLazo(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Sfatul Țării–Serghei Lazo',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('lz')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('lz')) as PhotoBuilding[],'Șciusev Lazo · curți complete');
 const l=landscapeLayer(scene,'Șciusev Lazo · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
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
  if(b.style==='lz107'){
   m.solid(b.p as XY[],.14,y+b.height,b.roof,false,b.holes as XY[][]);
   const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),z0=Math.min(...zs)+3.0,z1=Math.max(...zs)-.4,w=(xmax-xmin)/2-.25,base=y+b.height;
   for(let k=0;k<2;k++){const x=xmin+(k+.5)*(xmax-xmin)/2,hh=3.5,roofPos=[x-w/2,base,z0,x,base+hh,z0,x,base+hh,z1,x-w/2,base,z0,x,base+hh,z1,x-w/2,base,z1,x,base+hh,z0,x+w/2,base,z0,x+w/2,base,z1,x,base+hh,z0,x+w/2,base,z1,x,base+hh,z1],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(roofPos,3));g.computeVertexNormals();m.put(g,b.roof,false,true);
    for(const zz of[z0,z1]){const cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute([x-w/2,base,zz,x+w/2,base,zz,x,base+hh,zz],3));cap.computeVertexNormals();m.put(cap,b.wall);}yield;
   }return;
  }
  if(!b.roofRise){m.solid(b.p as XY[],.18,y+b.height,b.roof,false,b.holes as XY[][]);return;}
  const shape=new T.Shape();b.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));for(const r of b.holes){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));shape.holes.push(hole);}
  const src=new T.ShapeGeometry(shape);src.rotateX(-Math.PI/2);const g=src.toNonIndexed(),v=g.attributes.position,out:number[]=[],xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),run=Math.max(2,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2);
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.16+b.roofRise*Math.min(1,d/(b.style==='sf94mansard'?1.35:run)),p[1]];};
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
 const barrel=(f:Face,u:number,yy:number,w:number,depth=1.0,color='#384038')=>{const pts:number[]=[];for(let k=0;k<12;k++){const du0=-w/2+k*w/12,du1=-w/2+(k+1)*w/12,h0=yy+.40*Math.sqrt(Math.max(0,1-(du0/(w/2))**2)),h1=yy+.40*Math.sqrt(Math.max(0,1-(du1/(w/2))**2)),p0=f.at(u+du0,.14),p1=f.at(u+du1,.14),p2=f.at(u+du0,depth),p3=f.at(u+du1,depth);pts.push(p0[0],f.y+h0,p0[1],p1[0],f.y+h1,p1[1],p2[0],f.y+h0,p2[1],p1[0],f.y+h1,p1[1],p3[0],f.y+h1,p3[1],p2[0],f.y+h0,p2[1]);m.beam(new T.Vector3(p2[0],f.y+h0,p2[1]),new T.Vector3(p3[0],f.y+h1,p3[1]),.023,'#48554a');}const bottom=pts.slice();for(let i=0;i<bottom.length;i+=9)for(const k of[0,6,3])pts.push(bottom[i+k],bottom[i+k+1]+.035,bottom[i+k+2]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();m.put(g,color);};
 const entry=(f:Face,u:number,w:number,rise:number,col='#635649',stepColor='#95988a')=>{const r=stairs(f,u,w,rise,.2,stepColor);a.door(f,u,2.55+r,Math.min(1.5,w-.5),col);return r;};
 const band=(f:Face,h:number,color:string)=>f.panel(f.len/2,h/2,.09,f.len,h,.18,color);
 const ornament=(f:Face,u:number,yy:number,w:number,h:number,frame:string,kind=0)=>{f.window(u,yy,w,h,'#ccc8b5',frame);f.panel(u,yy+h/2+.22,.30,w+.55,.16,.40,'#c9c7b6');if(kind)a.pediment(f,u,yy+h/2+.30,w+.6,.30,f.y,'#c9c7b6');};
 const dormer=(f:Face,u:number,bottom:number,w:number,h:number,col:string,round=false)=>{f.panel(u,bottom+h/2,-.45,w,h,1.2,col);f.window(u,bottom+h*.51,w*.67,h*.60,col,'#725d47');if(round){a.arch(f,u,bottom+h-.05,w,.85,f.y,col,col,0);}else a.pediment(f,u,bottom+h,w+.35,.7,f.y,col);};
 const canopy=(f:Face,u:number,h:number,w:number,color='#40504a')=>{f.panel(u,h,.72,w,.12,1.44,color);for(const d of[-w/2,w/2])f.panel(u+d,h-.22,1.1,.035,.5,.035,color,true);};
 const pane=(f:Face,u:number,yy:number,w:number,h:number,n=3)=>{f.window(u,yy,w,h,'#d0d0c0','#b9c2b4');for(let k=1;k<n;k++)f.panel(u-w/2+k*w/n,yy,.365,.06,h,.08,'#b9c2b4',true);};
 const slope=(f:Face,u0:number,u1:number,v0:number,v1:number,y0:number,y1:number,railColor='#9aab9d')=>{
  const pos:number[]=[],p=[f.at(u0,v0),f.at(u1,v0),f.at(u1,v1),f.at(u0,v1)].map(([x,z],i)=>new T.Vector3(x,i===0||i===3?y0:y1,z));
  for(const tri of[[0,1,2],[0,2,3]]){if(new T.Vector3().subVectors(p[tri[1]],p[tri[0]]).cross(new T.Vector3().subVectors(p[tri[2]],p[tri[0]])).y<0)tri.reverse();for(const i of tri)pos.push(...p[i].toArray());}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();m.put(g,'#aaa894',false,true);
  for(const vv of[v0,v1]){const a0=f.at(u0,vv),a1=f.at(u1,vv);m.beam(new T.Vector3(a0[0],y0+.92,a0[1]),new T.Vector3(a1[0],y1+.92,a1[1]),.032,railColor);for(let t=0;t<=1;t+=.25){const x=a0[0]+(a1[0]-a0[0])*t,z=a0[1]+(a1[1]-a0[1])*t,yy=y0+(y1-y0)*t;m.box(x,yy+.46,z,.045,.92,.045,railColor,true);}}
 };
 // Window arches and mullions are bounded opaque geometry, not photo textures.
 const arched=(f:Face,u:number,w:number,h:number,bottom:number,trim:string,frame='#6f6755')=>{a.arch(f,u,bottom,w,h,f.y,'#51676a',trim);f.panel(u,bottom+h*.45,.45,.055,h*.83,.06,frame,true);f.panel(u,bottom+h*.58,.46,w,.055,.06,frame,true);f.panel(u,bottom-.08,.30,w+.38,.16,.48,trim);};
 const triple=(f:Face,u:number,bottom:number,w=3.15)=>{for(const d of[-1,0,1])arched(f,u+d*w*.31,w*.23,2.65,bottom,'#c6c3b2');const r=w*.57,pts:number[]=[];for(let k=0;k<18;k++){const t=k*Math.PI/18,t1=(k+1)*Math.PI/18,p=f.at(u+Math.cos(t)*r,.48),q=f.at(u+Math.cos(t1)*r,.48);m.beam(new T.Vector3(p[0],f.y+bottom+2.02+Math.sin(t)*.95,p[1]),new T.Vector3(q[0],f.y+bottom+2.02+Math.sin(t1)*.95,q[1]),.12,'#cdc7b4');}};
 function* build(b:PhotoBuilding):Generator<void>{
  if(b.parts?.length){for(const part of b.parts)yield* build({...b,...part,parts:undefined});return;}
  const y=ground(...b.anchor as XY)+.12,h=b.height,s=b.style;
  m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const edges=(b as PhotoBuilding&{exteriorEdges?:number[][][]}).exteriorEdges,p=f.at(f.len/2),q=f.at(f.len/2,1),nx=q[0]-p[0],nz=q[1]-p[1];
   if(edges&&!edges.some(e=>pointSegmentDistance(p,e[0]as XY,e[1]as XY)<.012))continue;
   const front=nz*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<7,side=s==='lz109'&&nx<-.8||s==='lz13'&&nx>.8;
   if(f.len<2.4)continue;
   band(f,s==='lz105'?3.55:s==='lz13'?1.0:.7,s==='lz105'?'#796b69':'#858579');
   if(s==='lzoffice'){
    const visible=nz>.35||nx>.5,balcony=nz>.8&&f.len>10;
    if(visible){
     f.panel(f.len/2,1.8,.13,f.len-.6,3.2,.03,'#42585a',false,1);f.panel(f.len/2,3.65,.38,f.len,.28,.76,b.wall);
     for(let u=.3;u<f.len;u+=2.4){f.panel(u,1.8,.19,.10,3.3,.06,'#6b746e',true);yield;}
     for(let row=1;row<8;row++){
      const yy=4.85+(row-1)*3.15;
      f.panel(f.len/2,yy+.55,.13,f.len-.6,2.50,.025,'#6b7772',false,1);
      for(let u=.2;u<f.len;u+=1.7){f.panel(u,yy+.55,.20,.10,2.65,.10,'#8f9289',true);yield;}
      f.panel(f.len/2,yy-1.00,.35,f.len+.16,.52,.70,b.wall);
      if(balcony&&row>1){const u=f.len*.25,w=f.len*.50;f.panel(u,yy-.92,1.05,w,.28,2.1,b.wall);f.panel(u,yy-.52,2.05,w,.65,.16,b.wall);for(let du=-w/2;du<=w/2;du+=.23)f.panel(u+du,yy+.01,2.1,.025,.46,.035,'#5c635c',true);f.panel(u,yy+.23,2.1,w,.035,.045,'#5c635c',true);}
      yield;
     }
     if(balcony){f.panel(f.len/2,3.35,.75,f.len-.7,.15,1.4,'#494b43');f.label('coffee',f.len*.3,3.23,.22,'#bfbda9',1.48);}
    }else yield* a.windows(f,8,h,Math.max(2,Math.round(f.len/3.8)),1.9,b.trim,'#7b8075');
    a.cornice(f,h,b.wall);continue;
   }
   a.cornice(f,h,b.trim);
   if(!front&&!side){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.4)),1.9,b.trim,'#8f8b79');continue;}
   if(s==='lz105'){
    const n=11,bw=f.len/n;
    for(let k=0;k<n;k++){const u=(k+.5)*bw;
     if(k===0||k===n-1){a.door(f,u,2.8,1.4,'#5c5148');stairs(f,u,1.9,.26);}else{f.window(u,1.9,1.4,2.2,b.trim,'#615b50');}
     f.window(u,6.05,1.4,3.0,'#c4beae','#625e54');f.panel(u,4.1,.2,1.9,.76,.16,b.trim);f.panel(u,4.1,.3,1.5,.44,.07,b.wall);
     f.panel(u,7.75,.24,1.9,.16,.36,b.trim);for(const du of[-.83,.83])f.panel(u+du,6.1,.17,.16,3.2,.16,b.trim);yield;
    }
    for(const hh of[3.55,3.72])f.panel(f.len/2,hh,.28,f.len,.18,.45,b.trim);
    for(const u of[.2,f.len*.27,f.len*.73,f.len-.2]){f.panel(u,6.1,.14,.42,5.8,.26,b.trim);f.panel(u,4.6,.29,.065,8.6,.075,'#5f5a4e',true);}continue;
   }
   if(s==='lz107'){
    band(f,3.55,'#c6c3b4');const n=4,bw=f.len/n;
    for(let k=0;k<n;k++){const u=(k+.5)*bw;
     if(k===0){a.door(f,u,2.7,1.5,'#514438');stairs(f,u,2.2,.26);a.pediment(f,u,3.62,bw+.6,.68,y,'#c9c4b2');f.label('GUGUȚĂ',u,3.13,.18,'#3f4942');}
     else f.window(u,1.8,1.3,1.8,b.trim,'#675744');
     f.window(u,5.15,1.35,2.35,b.trim,'#725e4c');arched(f,u,1.45,2.30,7.0,b.trim,'#6e5d4b');f.panel(u,6.65,.2,.85,.55,.15,b.trim);
     for(const v of[u-bw*.44,u+bw*.44])for(let d=-.10;d<=.11;d+=.07)f.panel(v+d,6.9,.14,.035,6.1,.06,b.trim,true);yield;
    }
    // Curving parapet silhouette, bounded strip mesh. No copied texture.
    for(let k=0;k<16;k++){const u0=f.len*k/16,u1=f.len*(k+1)/16,hh=(u:number)=>h+.40+2.05*Math.exp(-(((u/f.len-.35)/.34)**2)),p0=f.at(u0,.02),p1=f.at(u1,.02),h0=hh(u0),h1=hh(u1),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([p0[0],y+h,p0[1],p1[0],y+h,p1[1],p1[0],y+h1,p1[1],p0[0],y+h,p0[1],p1[0],y+h1,p1[1],p0[0],y+h0,p0[1]],3));g.computeVertexNormals();m.put(g,b.wall);m.beam(new T.Vector3(p0[0],y+h0,p0[1]),new T.Vector3(p1[0],y+h1,p1[1]),.14,b.trim);yield;}
    for(let u=.2;u<f.len;u+=.38)f.panel(u,3.53,.20,.15,.18,.23,b.trim,true);
    f.label('HAINE DE ȘCOALĂ',f.len*.62,3.17,.18,'#4b4c43');continue;
   }
   if(s==='lz102yellow'){
    band(f,3.5,'#b29149');const n=Math.max(2,Math.round(f.len/3.3));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,1.9,1.35,2.1,'#bda96d','#716b55');pane(f,u,5.15,2.0,1.8,2);ac(f,u,3.1);yield;}
    for(let hh=3.6;hh<h;hh+=.43)f.panel(f.len/2,hh,.035,f.len,.025,.028,'#96998b',true);for(let u=.4;u<f.len;u+=.9)f.panel(u,5.3,.039,.026,3.2,.03,'#96998b',true);
    for(const u of[.15,f.len-.15])f.panel(u,2.8,.45,.08,5.6,.08,'#c1a747',true);f.panel(f.len/2,3.35,.45,f.len,.07,.07,'#c1a747',true);continue;
   }
   if(s==='lz102'){
    const n=Math.max(3,Math.round(f.len/3.8));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(k===0){a.door(f,u,2.8,1.25,'#a24746');stairs(f,u,1.7,.13);}else{f.window(u,1.9,1.15,2.0,'#b9a78e','#665e4c');grilles(f,u,1.9,1.12,1.98);if(k%2===0)ac(f,u,3.05);}yield;
    }continue;
   }
   if(s==='lz10'){
    const n=Math.max(3,Math.round(f.len/3.6));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(k===Math.floor(n/2)){a.door(f,u,3.35,1.4,'#665140');pairedStairs(f,u);a.pediment(f,u,h,5.0,1.5,y,b.wall);f.panel(u,4.02,.85,4.0,.20,1.7,b.trim);for(let v=-1.9;v<2;v+=.23)f.panel(u+v,4.65,1.7,.026,1.05,.035,'#585b4d',true);f.panel(u,5.17,1.7,4,.045,.045,'#585b4d',true);}
     else pane(f,u,2.18,1.45,2.0,2);pane(f,u,5.85,1.5,1.8,2);yield;
    }for(let u=.3;u<f.len;u+=1.0)f.panel(u,h-.12,.45,.10,.40,.7,'#79634f',true);continue;
   }
   if(s==='lz10wing'){
    for(let k=0;k<3;k++){const u=(k+.5)*f.len/3;f.window(u,1.9,1.3,1.65,b.trim,'#645c4d');grilles(f,u,1.9,1.3,1.65);if(k!==1)dormer(f,u,h-.05,2.1,2.05,b.wall);yield;}continue;
   }
   if(s==='lz104a'){
    const n=Math.max(3,Math.round(f.len/2.4));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,1.55,f.len/n-.35,2.3,'#c0b29b','#85715a');yield;}f.panel(f.len/2,3.13,.3,f.len,.36,.60,'#aba08c');for(let u=.1;u<f.len;u+=.28)f.panel(u,4.2,.25,.035,.8,.04,'#5c5d50',true);f.panel(f.len/2,4.65,.25,f.len,.04,.05,'#5c5d50',true);continue;
   }
   if(s==='lz104court'){
    for(let k=0;k<Math.max(2,Math.round(f.len/4));k++){const u=(k+.5)*f.len/Math.max(2,Math.round(f.len/4));pane(f,u,1.85,2.0,1.65,3);arched(f,u,1.55,2.0,4.35,b.trim);yield;}for(const hh of[.8,3.5,6.6])f.panel(f.len/2,hh,.055,f.len,.035,.04,'#846758',true);for(let u=.5;u<f.len;u+=4)f.panel(u,3.7,.055,.035,5.8,.04,'#846758',true);continue;
   }
   const n=Math.max(2,Math.round(f.len/(s==='lz109'?3.5:3.8))),bw=f.len/n;
   for(let k=0;k<n;k++){const u=(k+.5)*bw;
    if(side&&k===Math.floor(n/2)){a.door(f,u,3.0,1.5,'#8a7c61');stairs(f,u,2.0,.39);a.pediment(f,u,3.30,2.4,.50,y,b.trim);}
    else{f.window(u,2.6,Math.min(1.45,bw*.6),2.55,b.trim,'#6f6653');if(s==='lz109'||s==='lzmint')grilles(f,u,2.6,1.36,2.45);}
    if(s==='lz109'||s==='lzmint'){f.panel(u,1.0,.15,1.75,.50,.16,b.trim);f.panel(u,1.0,.25,1.4,.28,.06,b.wall);}if(k%4===1)ac(f,u,4.2);yield;
   }
   for(const u of[.22,f.len-.22]){f.panel(u,h*.53,.14,.38,h*.86,.22,b.trim);for(let dx=-.09;dx<=.1;dx+=.07)f.panel(u+dx,h*.55,.27,.025,h*.64,.045,'#aea997',true);}
  }
 }
 for(const b of custom)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],()=>build(b));
 // Opaque perimeter walls; photographed gate spans remain genuinely open when toggled.
 const walls:[XY,XY,number,string][]=[[[ -700,615.3],[-696,615.3],2.05,'#b9b9aa'],[[-691.8,615.3],[-679.6,615.3],2.05,'#b9b9aa'],[[-700,615.3],[-700,578],2.05,'#b9b9aa'],[[-667.5,615.3],[-665.0,615.3],1.95,'#b7b09b'],[[-639.1,634],[-638.22,634],1.9,'#9a8c74'],[[-624.4,634],[-621.8,634],1.9,'#aaab97'],[[-720.5,692],[-711.3,692],1.6,'#a6a18a']];
 for(const[p,q,h,col]of walls)m.job('zid curte',[p,q],[],function*(){const f=m.facade(p,q,0),p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);for(let u=0;u<f.len;u+=1.5){const len=Math.min(1.5,f.len-u),pt=f.at(u+len/2),y=ground(...pt);m.box(pt[0],y+h/2,pt[1],len,h,.26,col,false,true,angle);m.box(pt[0],y+.22,pt[1],len,.44,.32,'#968b73',false,true,angle);m.box(pt[0],y+h+.06,pt[1],len+.03,.12,.34,'#bcb6a3',false,true,angle);yield;}});
 // Café terrace at the modern corner; main walking lane stays clear.
 for(const x of[-617.5,-614,-610.5])m.job('terasă cafenea',streetRect(x,616.7,3.0,1.2),[],function*(){const z=616.7,y=ground(x,z);m.box(x,y+.38,z,2.85,.75,.75,'#686e61',false,true);m.box(x,y+.94,z,2.8,.5,.62,'#6c7b44');yield;});
 m.job('incintă deșeuri',streetRect(-629,631.7,3.8,1.0),[],function*(){const x=-629,z=631.7,y=ground(x,z);for(let j=0;j<6;j++)m.box(x,y+.2+j*.22,z+.4,3.8,.16,.075,'#876a4f');for(const dx of[-1.85,1.85])m.box(x+dx,y+.68,z,.08,1.36,.95,'#555c4c',false,true);for(const[dx,col]of[[-1.0,'#b09c35'],[.8,'#8b9286']]as[number,string][]){m.box(x+dx,y+.62,z,1.1,1.02,.67,col,false,true);m.box(x+dx,y+1.18,z,1.17,.14,.75,'#646e5d');for(const w of[-.35,.35])m.box(x+dx+w,y+.1,z,.12,.20,.20,'#50574b');}yield;});
 for(const[x,z]of[[-681,618.9],[-720,632.8],[-613,630.5]])m.job('coș stradal',streetRect(x,z,.5,.5),[],function*(){const y=ground(x,z);m.box(x,y+.47,z,.40,.83,.38,'#465b47',false,true);m.box(x,y+.91,z,.44,.06,.42,'#788574');yield;});
 for(const[x,z]of[[-680,634.25],[-684,634.25]])m.job('jardinieră107',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+.24,z,.65,.48,.65,'#917b62',false,true);const g=new T.ConeGeometry(.29,1.1,7);g.translate(x,y+1.03,z);m.put(g,'#506c43');yield;});
 for(const[x,z,h]of realm.trees)m.job('arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.19,.29,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#646b53',false,true);m.box(x,y+.55,z,.35,1.1,.35,'#b9bcb0');for(const[dx,dy,dz,r]of[[0,.67,0,2.6],[-1.6,.64,.5,1.8],[1.5,.76,-.4,2.0],[0,.91,0,1.7]]){const g=new T.IcosahedronGeometry(r,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#647e4b');yield;}});
 const poles=realm.lamps as XY[];
 for(const[x,z]of poles)m.job('stâlp și cablaj',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.8,z,.19,7.6,.19,'#959e8e',false,true);m.box(x,y+1.8,z,.24,1.1,.26,'#b8bcaa');m.beam(new T.Vector3(x,y+7.3,z),new T.Vector3(x,y+7.55,z+1.5),.04,'#687968');m.box(x,y+7.54,z+1.5,.27,.13,.55,'#b8bda8');m.box(x,y+5.0,z,.38,.58,.22,'#9ba48f');yield;});
 const northPoles=poles.filter(p=>p[1]<620).sort((p,q)=>p[0]-q[0]);
 for(let i=1;i<northPoles.length;i++)m.job('fascicul cabluri',[northPoles[i-1],northPoles[i]],[],function*(){const p=northPoles[i-1],q=northPoles[i];for(let w=0;w<5;w++)for(let k=0;k<4;k++){const pt=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7.0+w*.055-.23*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+w*.09);m.beam(pt(k/4),pt((k+1)/4),.012,'#485545');yield;}});
 for(const[x,z]of[[-728.5,619],[-728.5,631.8],[-733,615],[-744.3,635]])m.job('indicator trecere',streetRect(x,z,.8,.8),[],function*(){const y=ground(x,z);m.box(x,y+1.55,z,.055,3.1,.055,'#939f8b',false,true);const f=m.facade([x-.4,z],[x+.4,z],y);f.panel(.4,2.85,.04,.74,.74,.08,'#bac853');f.panel(.4,2.85,.09,.56,.56,.03,'#4e6e8d');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.23,y+2.64,z+.12,x+.23,y+2.64,z+.12,x,y+3.08,z+.12],3));g.computeVertexNormals();m.put(g,'#c7ccba');f.label('↟',.4,2.8,.1,'#455148',.15);yield;});
 for(const[x,z]of[[-635,620],[-658,620.1],[-686,620.4],[-714,620.8]])m.job('gură de scurgere',streetRect(x,z,.55,.9),[],function*(){const y=ground(x,z)+.048;m.box(x,y,z,.43,.025,.66,'#4d584a');for(let k=-2;k<=2;k++)m.box(x+k*.075,y+.018,z,.028,.012,.59,'#929885',true);yield;});
 for(const[x,z,txt]of[[-726.8,635.4,'SERGHEI LAZO'],[-707,635.8,'ALEXEI ȘCIUSEV']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x+1,z],[x-1,z],ground(x,z));f.panel(1,2.6,.04,1.9,.38,.07,'#577186');f.label(txt,1,2.6,.115,'#cdd0bf',.09);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
