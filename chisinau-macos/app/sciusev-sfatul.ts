import * as T from 'three';
import realm from '../data/sciusev-sfatul.json';
import catalog from '../data/sciusev-sfatul-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,featureContains,type XY} from './city-layout';

/** Original bounded geometry, informed by dated Street View, satellite and independent photographs. Unseen elevations and small dimensions remain estimates. */
export function createSciusevSfatul(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Sfatul Țării–Maria Cebotari',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('sf')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('sf')) as PhotoBuilding[],'Șciusev Sfatul Țării · curți complete');
 const l=landscapeLayer(scene,'Șciusev Sfatul Țării · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
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
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.16+b.roofRise*Math.min(1,d/(b.style==='sf94mansard'?1.35:run)),p[1]];};
  function tri(a:XY,b:XY,c:XY,depth=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(depth<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,depth+1);tri(p,b,c,depth+1);}else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,depth+1);tri(a,p,c,depth+1);}else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,depth+1);tri(p,b,c,depth+1);}return;}out.push(...vertex(a),...vertex(b),...vertex(c));}
  for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
  src.dispose();g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.computeVertexNormals();m.put(result,b.roof,false,true);
 }
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
  for(const f of [...a.faces(b.p as XY[],y),...b.holes.flatMap(r=>a.faces(r as XY[],y).map(f=>m.facade(f.at(f.len),f.at(0),y)))]){
   const edges=(b as PhotoBuilding&{exteriorEdges?:number[][][]}).exteriorEdges,p=f.at(f.len/2),q=f.at(f.len/2,1),nx=q[0]-p[0],nz=q[1]-p[1];
   if(edges&&!edges.some(e=>pointSegmentDistance(p,e[0]as XY,e[1]as XY)<.012))continue;
   const front=nz*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<7.0,corner=s==='sfcorner'&&nx>.8;
   band(f,s.startsWith('sfzem')?.8:s==='sfcorner'?.82:.6,s==='sfcorner'?'#765b51':'#74796c');
   if(f.len<2.5)continue;
   if(s==='sf98'){
    const long=nz>.8&&f.len>24,side=nx>.8;
    if(side){f.panel(f.len/2,h/2,.045,f.len,h,.09,'#737a71');for(let hh=.4;hh<h;hh+=.45)f.panel(f.len/2,hh,.10,f.len,.025,.03,'#858b7f',true);continue;}
    const n=Math.max(2,Math.round(f.len/3.4));
    if(long){
     f.panel(f.len/2,1.75,.13,f.len-.6,2.8,.025,'#536764',false,1);f.panel(f.len/2,3.42,.52,f.len+.2,.70,1.04,'#b4bcb0');
     for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;for(const d of[-1,1])f.panel(u+d*f.len/n/2,1.78,.21,.075,2.9,.08,'#a5b09f',true);yield;}
     for(const[u,txt,col]of[[f.len*.22,'LINELLA','#a34747'],[f.len*.56,'FARMACIA FELICIA','#496c65'],[f.len*.84,'IL FORNO','#b7b393']]as[number,string,string][]){f.label(txt,u,3.36,.31,col,.57);stairs(f,u,3.1,.26,.2);}
     for(let row=1;row<5;row++){
      const yy=4.65+(row-1)*3.05;
      for(let k=0;k<n;k++){const u=(k+.5)*f.len/n,w=f.len/n-.09,closed=k%7!==0;
       if(closed){f.panel(u,yy+.55,.35,w,1.95,.025,'#617a72',false,1);for(let v=-w/2;v<=w/2+.01;v+=w/3)f.panel(u+v,yy+.55,.40,.065,1.97,.08,row===4&&k>n*.58?'#a18e7b':'#c1c5b6',true);for(const hh of[yy-.44,yy+1.54])f.panel(u,hh,.42,w,.065,.08,'#bdc3b4',true);}
       else{f.window(u,yy+.52,w*.58,1.9,'#bfc2ad','#8b977e');f.panel(u,yy-.05,.85,w,.87,1.7,'#92a47f');}
       f.panel(u,yy-1.02,.45,w,.95,.85,row===4&&k>n*.58?'#846551':k%8===2?'#a1a391':'#99ad84');
       if(row===2&&k%5===1)ac(f,u,yy-.85);yield;
      }
     }
     f.panel(f.len/2,h+.15,.05,f.len,.3,.12,'#9aa991');for(let u=0;u<f.len;u+=2.4)f.panel(u,h+.53,.07,.03,.56,.035,'#646f60',true);f.panel(f.len/2,h+.79,.07,f.len,.035,.035,'#646f60',true);
    }else{yield* a.windows(f,5,h,n,1.7,'#b7bca6','#82937b');for(let row=1;row<5;row++)f.panel(f.len/2,row*3.15,.07,f.len,.15,.15,'#bbc1aa');}
    continue;
   }
   a.cornice(f,h,b.trim);
   if(s.startsWith('sfzem')){
    if(!front){yield* a.windows(f,1,h,Math.max(1,Math.round(f.len/4.2)),2.45,b.trim,'#706d58');continue;}
    const u=f.len/2;
    if(s==='sfzemgable'){
     a.pediment(f,u,h-.12,f.len+.14,1.6,y,b.wall);triple(f,u,1.35,Math.min(3.3,f.len*.66));
    }else if(s==='sfzementry'){
     for(const du of[-f.len*.29,f.len*.29])triple(f,u+du,1.05,2.5);
     const r=entry(f,u,3.7,.65,'#70563b');barrel(f,u,3.45+r,3.2,1.8,'#52705b');f.label('CASA ZEMSTVEI',u,4.4,.17,'#6a6151',.36);
    }else if(s==='sfzemporch'){
     for(let k=0;k<3;k++){const v=(k+.5)*f.len/3;arched(f,v,2.0,3.05,.95,b.trim,k===1?'#668b6c':'#6f6755');if(k===1)f.panel(v,1.62,.48,1.5,2.2,.04,'#617b5d');}
    }else if(s==='sfzemdoor'){
     const v=f.len*.25,r=entry(f,v,2.4,.65,'#66503b');arched(f,v,1.5,3.2,.4+r,b.trim);a.door(f,v,3.3+r,1.45,'#6a5039');a.pediment(f,v,h+.12,2.5,.52,y,b.trim);arched(f,f.len*.73,1.12,2.65,1.2,b.trim);
    }else{
     const n=s.endsWith('3')?3:s.endsWith('4')?4:2;
     for(let k=0;k<n;k++){const v=(k+.5)*f.len/n;arched(f,v,s.includes('pavilion')?1.5:1.0,s.includes('pavilion')?3.1:2.65,1.2,b.trim);if(s.includes('pavilion')){f.panel(v,4.65,.48,.22,.30,.22,b.trim);for(const d of[-1,1]){const t=v+d*f.len/n*.46;f.panel(t,3.15,.22,.42,4.6,.44,b.trim);for(const dd of[-.11,0,.11])f.panel(t+dd,3.0,.47,.032,3.8,.025,'#a49f87',true);f.panel(t,5.15,.32,.62,.28,.64,b.trim);}}yield;}
     if(s.includes('pavilion')){f.panel(u,h+.38,.09,f.len-.2,.5,.40,b.wall);f.panel(u,h+.73,.12,f.len*.83,.30,.45,b.trim);f.panel(u,h+.92,.14,f.len*.87,.10,.48,b.trim);}
    }
    continue;
   }
   if(s==='sfairm'){
    if(nz<-.8){a.pediment(f,f.len/2,h-.10,f.len+.08,1.55,y,b.wall);triple(f,f.len/2,1.4,3.7);}
    else{yield* a.windows(f,1,h,Math.max(2,Math.round(f.len/4.2)),2.45,'#c4b494','#6b5b43');}
    for(const u of[.4,f.len-.4])f.panel(u,h/2,.13,.7,h,.26,'#cacabb');f.panel(f.len/2,1.02,.16,f.len,.13,.25,'#c7c7b5');continue;
   }
   if(s==='sfcorner'){
    if(front||corner){band(f,3.3,'#a47b69');for(let yy=.5;yy<3.3;yy+=.47)f.panel(f.len/2,yy,.18,f.len,.027,.02,'#785e52',true);
     const n=Math.max(3,Math.round(f.len/3.8));for(let row=0;row<3;row++)for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(front&&row===0&&k===n-1){entry(f,u,2.8,.65,'#635045');continue;}f.window(u,1.95+row*3.36,1.1,2.05,b.trim,'#6b6153');yield;}
     // Small curved balconies near the street corner, independently modeled rails.
     if(front)for(const yy of[3.7,7.05]){const u=f.len-2.6,w=2.3,pts:XY[]=[];for(let k=0;k<=12;k++)pts.push(f.at(u+Math.cos(k*Math.PI/12)*w/2,.1+Math.sin(k*Math.PI/12)*1.1));m.solid(pts,.16,y+yy,b.trim,false);for(let k=0;k<=12;k++){const p=pts[k];m.box(p[0],y+yy+.59,p[1],.027,.94,.027,'#9ca38e',true);if(k){const q=pts[k-1];m.beam(new T.Vector3(q[0],y+yy+1.08,q[1]),new T.Vector3(p[0],y+yy+1.08,p[1]),.025,'#9ca38e');}}}
    }else yield* a.windows(f,3,h,Math.max(2,Math.round(f.len/4.2)),2.0,b.trim,'#7d7966');continue;
   }
   if(s==='sfinfill'){
    yield* a.windows(f,2,h,Math.max(2,Math.round(f.len/2.8)),1.8,b.trim,'#949e8b');if(front){a.pediment(f,f.len*.52,h-.08,3.3,1.25,y,b.wall);entry(f,f.len*.77,1.65,.26);f.panel(f.len/2,3.5,.16,f.len,.16,.30,b.trim);}continue;
   }
   if(s==='sf94'||s==='sf94mansard'){
    if(!front){yield* a.windows(f,1,h,Math.max(1,Math.round(f.len/3.4)),2.2,b.trim,'#969985');continue;}
    const mansard=s==='sf94mansard',n=mansard?3:4;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(k===0||mansard&&k===1){entry(f,u,2.1,.39,'#725a46','#6d7466');if(mansard){arched(f,u,1.4,2.9,.3,b.trim);a.pediment(f,u,4.08,2.1,.55,y,b.trim);}else{for(const d of[-1,1])f.panel(u+d*1.25,2.5,.25,.55,4.85,.5,b.trim);f.panel(u,h+.34,.08,3.15,.68,.35,b.trim);for(const yy of[h+.15,h+.65])f.panel(u,yy,.3,3.55,.17,.55,b.trim);}}
     else{ornament(f,u,2.35,mansard?1.85:1.32,2.5,'#bfc3b1');f.panel(u,.84,.16,1.64,.30,.20,b.trim);}
     yield;
    }
    if(mansard){dormer(f,f.len*.50,h+.10,2.7,2.5,b.wall);f.panel(f.len*.50,h+2.75,.06,3.2,.25,.40,b.trim);}
    continue;
   }
  }
 }
 for(const b of custom)m.job(b.title,b.p as XY[],b.id.startsWith('local-')?[]:[Number(b.id.slice(1))],()=>build(b));
 // Garden walls leave the two interactive gate spans open.
 for(const[p,q]of[[[-572.5,635],[-551.2,635]],[[-545.8,635],[-545.2,635]],[[-581.9,657.8],[-581.9,671]],[[-581.9,676],[-581.9,679.8]]]as[XY,XY][])m.job('zid și gard grădină',[p,q],[],function*(){
  const f=m.facade(p,q,0);for(let u=0;u<f.len;u+=2){const len=Math.min(2,f.len-u),pt=f.at(u+len/2),y=ground(...pt),a0=f.at(0),a1=f.at(1),rot=Math.atan2(-(a1[1]-a0[1]),a1[0]-a0[0]);m.box(pt[0],y+.50,pt[1],len,1.0,.44,'#8d8c73',false,true,rot);m.box(pt[0],y+1.04,pt[1],len+.03,.11,.56,'#a9a38b',false,true,rot);yield;}
  for(let u=0;u<=f.len;u+=.24){const pt=f.at(u),y=ground(...pt);m.box(pt[0],y+1.62,pt[1],.035,1.15,.035,'#424d40',true,true);if(Math.round(u/.24)%10===0)yield;}
  for(const hh of[1.3,1.95])m.beam(new T.Vector3(p[0],ground(...p)+hh,p[1]),new T.Vector3(q[0],ground(...q)+hh,q[1]),.03,'#47513f');
 });
 for(const[x,z]of[[-550.9,635],[-546.1,635]])m.job('stâlp poartă Zemstvei',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+1.3,z,.65,2.6,.65,'#a29e83',false,true);m.box(x,y+2.63,z,.81,.17,.81,'#b1aa91');yield;});
 for(const[x,z]of[[-472,630.3],[-501,630.7],[-531,631.0],[-558,631.3],[-574,631.5]])m.job('bancă stradală',streetRect(x,z,2.0,.7),[],function*(){const y=ground(x,z);for(const dx of[-.70,.70]){m.box(x+dx,y+.28,z,.07,.56,.52,'#485344',false,true);m.box(x+dx,y+.70,z+.22,.045,.75,.045,'#485344');}for(let k=0;k<4;k++)m.box(x,y+.52,z-.23+k*.145,1.9,.07,.10,'#857253',false,true);for(let k=0;k<3;k++)m.box(x,y+.78+k*.11,z+.27,1.9,.08,.055,'#857253',false,true);yield;});
 for(const[x,z]of[[-470,630.4],[-536,631.5],[-577,631.8],[-513,610.2],[-565,611.4]])m.job('coș de gunoi',streetRect(x,z,.6,.6),[],function*(){const y=ground(x,z);m.box(x,y+.45,z,.44,.8,.40,'#485c47',false,true);m.box(x,y+.90,z,.48,.09,.46,'#68775f');yield;});
 m.job('rastel Zemstvei',streetRect(-524.8,630.7,3.5,1),[],function*(){const y=ground(-524.8,630.7);for(const x of[-526,-525,-524]){for(const z of[630.4,631])m.box(x,y+.4,z,.04,.8,.04,'#a0ab9a',false,true);m.box(x,y+.82,630.7,.045,.045,.64,'#a0ab9a');}yield;});
 for(const[x,z]of[[-475,615.1],[-487,617.2],[-504,609.8]])m.job('jardinieră',streetRect(x,z,.9,.9),[],function*(){const y=ground(x,z);m.box(x,y+.30,z,.75,.60,.75,'#99876e',false,true);const g=new T.IcosahedronGeometry(.45,1);g.scale(.8,1.3,.8);g.translate(x,y+.95,z);m.put(g,'#607b50');yield;});
 // A small kiosk and café terrace visible in April2025; no parked photo cars.
 m.job('chioșc colț98',streetRect(-567,613,2.8,2.4),[],function*(){const x=-567,z=613,y=ground(x,z);m.box(x,y+1.32,z,2.7,2.64,2.2,'#75646d',false,true);m.box(x,y+2.75,z,2.9,.5,2.4,'#785d79');const f=m.facade([x-1.35,z+1.12],[x+1.35,z+1.12],y);f.window(1.35,1.4,1.7,1.8,'#b7b3aa','#8b8e82');f.label('PRESĂ',1.35,2.67,.22,'#d1cabc');yield;});
 for(const[x,z]of[[-574.5,611],[-579.2,611]])m.job('terasă colț98',streetRect(x,z,4,4),[],function*(){const y=ground(x,z);m.box(x,y+1.25,z,.09,2.5,.09,'#7f725a',false,true);const cone=new T.ConeGeometry(2.45,.7,6);cone.translate(x,y+2.68,z);m.put(cone,'#c3ad7e');m.box(x,y+.72,z,1.0,.1,1.0,'#918063',false,true);for(const dx of[-1.2,1.2]){m.box(x+dx,y+.4,z,.5,.07,.5,'#777663',false,true);m.box(x+dx,y+.6,z+.22,.5,.5,.06,'#777663',false,true);}yield;});
 for(const x of[-581,-577.8,-574.6,-571.4])m.job('gard viu terasă',streetRect(x,613.8,2.8,.8),[],function*(){const y=ground(x,613.8);m.box(x,y+.34,613.8,2.6,.68,.66,'#777c6b',false,true);m.box(x,y+1.0,613.8,2.55,.7,.7,'#486b50');yield;});
 for(const[x,z,h]of realm.trees)m.job('arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.19,.29,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#646b53',false,true);m.box(x,y+.55,z,.35,1.1,.35,'#b9bcb0');for(const[dx,dy,dz,r]of[[0,.67,0,2.6],[-1.6,.64,.5,1.8],[1.5,.76,-.4,2.0],[0,.91,0,1.7]]){const g=new T.IcosahedronGeometry(r,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#647e4b');yield;}});
 for(const[x,z,h]of[[-523,641,15],[-467,660,13]])m.job('conifer Zemstvei',streetRect(x,z,5,5),[],function*(){const y=ground(x,z);m.box(x,y+3,z,.27,6,.27,'#63634f',false,true);for(let k=0;k<5;k++){const g=new T.ConeGeometry(3.0-k*.42,5.6,9);g.translate(x,y+5.2+k*2.1,z);m.put(g,'#476653');yield;}});
 for(const[x,z]of realm.heritage)m.job('felinar istoric',streetRect(x,z-2.2,1,1),[],function*(){const zz=z-2.2,y=ground(x,zz);const g=new T.CylinderGeometry(.065,.12,3.45,8);g.translate(x,y+1.725,zz);m.put(g,'#434f40',false,true);m.box(x,y+.1,zz,.28,.2,.28,'#475443',false,true);m.box(x,y+3.65,zz,.40,.50,.40,'#c0c2a8');for(const dx of[-.22,.22])for(const dz of[-.22,.22])m.box(x+dx,y+3.65,zz+dz,.035,.52,.035,'#3f4c3b',true);const roof=new T.ConeGeometry(.38,.28,4);roof.rotateY(Math.PI/4);roof.translate(x,y+4.03,zz);m.put(roof,'#404c3b');yield;});
 const poles=realm.lamps as XY[];
 for(const[x,z]of poles)m.job('stâlp și cablaj',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.8,z,.19,7.6,.19,'#959e8e',false,true);m.box(x,y+1.8,z,.24,1.1,.26,'#b8bcaa');m.beam(new T.Vector3(x,y+7.3,z),new T.Vector3(x,y+7.55,z+1.5),.04,'#687968');m.box(x,y+7.54,z+1.5,.27,.13,.55,'#b8bda8');m.box(x,y+5.0,z,.38,.58,.22,'#9ba48f');yield;});
 const northPoles=poles.filter(p=>p[1]<620).sort((p,q)=>p[0]-q[0]);
 for(let i=1;i<northPoles.length;i++)m.job('fascicul cabluri',[northPoles[i-1],northPoles[i]],[],function*(){const p=northPoles[i-1],q=northPoles[i];for(let w=0;w<5;w++)for(let k=0;k<4;k++){const pt=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7.0+w*.055-.23*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+w*.09);m.beam(pt(k/4),pt((k+1)/4),.012,'#485545');yield;}});
 for(const[x,z]of[[-578.8,619.2],[-580,630.4],[-598,615],[-586.8,636.2]])m.job('indicator trecere',streetRect(x,z,.8,.8),[],function*(){const y=ground(x,z);m.box(x,y+1.55,z,.055,3.1,.055,'#939f8b',false,true);const f=m.facade([x-.4,z],[x+.4,z],y);f.panel(.4,2.85,.04,.74,.74,.08,'#bac853');f.panel(.4,2.85,.09,.56,.56,.03,'#4e6e8d');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.23,y+2.64,z+.12,x+.23,y+2.64,z+.12,x,y+3.08,z+.12],3));g.computeVertexNormals();m.put(g,'#c7ccba');f.label('↟',.4,2.8,.1,'#455148',.15);yield;});
 for(const[x,z]of[[-460,619],[-478,619.2],[-511,620.0],[-549,621],[-567,621.2]])m.job('gură de scurgere',streetRect(x,z,.55,.9),[],function*(){const y=ground(x,z)+.048;m.box(x,y,z,.43,.025,.66,'#4d584a');for(let k=-2;k<=2;k++)m.box(x+k*.075,y+.018,z,.028,.012,.59,'#929885',true);yield;});
 for(const[x,z,txt]of[[-578.2,634.6,'SFATUL ȚĂRII'],[-450.3,635,'ALEXEI ȘCIUSEV']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x+1,z],[x-1,z],ground(x,z));f.panel(1,2.6,.04,1.9,.38,.07,'#577186');f.label(txt,1,2.6,.115,'#cdd0bf',.09);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
