import * as T from 'three';
import realm from '../data/sciusev-cebotari.json';
import catalog from '../data/sciusev-cebotari-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,featureContains,type XY} from './city-layout';

/** Original bounded geometry, informed by dated Street View, satellite and independent photographs. Unseen elevations and small dimensions remain estimates. */
export function createSciusevCebotari(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Maria Cebotari–Nicolae Iorga',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('ceb')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('ceb')) as PhotoBuilding[],'Șciusev Cebotari · curți complete');
 const l=landscapeLayer(scene,'Șciusev Cebotari · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
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
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.16+b.roofRise*Math.min(1,d/(b.style==='ceb101modern'?1.35:run)),p[1]];};
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
 function schoolEntry(f:Face,u:number){
  const r=stairs(f,u,6.8,.78,1.6,'#b1a99a'),p=f.at(u,.82),p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  m.box(p[0],f.y+r-.19,p[1],6.8,.40,1.62,'#b1a99a',false,true,angle);
  f.panel(u,4.3,.07,7.4,6.0,.14,'#77655f');f.panel(u,r+1.50,.32,3.9,2.95,.03,'#4d6061',false,1);
  for(const du of[-1.95,-.66,.66,1.95])f.panel(u+du,r+1.50,.36,.075,3.0,.07,'#c0c8bc',true);
  for(const yy of[r+.05,r+2.35,r+2.98])f.panel(u,yy,.38,4,.08,.10,'#c0c8bc',true);
  f.panel(u,4.45,.18,7.4,.77,.15,'#625348');f.label('LICEUL TEORETIC',u,4.60,.24,'#d5d2bc');f.label('N.V. GOGOL',u,4.23,.24,'#d5d2bc');
  const low=f.at(u-11,.95);slope(f,u-11,u-3.35,.23,1.57,ground(...low)+.045,f.y+r+.01);
 }
 function* build(b:PhotoBuilding):Generator<void>{
  if(b.parts?.length){for(const part of b.parts)yield* build({...b,...part,parts:undefined});return;}
  const y=ground(...b.anchor as XY)+.12,h=b.height,s=b.style;
  if(b.passages.length){const clearance=b.passages[0].clearance;for(const rings of b.passages[0].walls)m.solid(rings[0]as XY[],clearance+5,y-5,b.wall,true,rings.slice(1)as XY[][]);m.solid(b.p as XY[],h-clearance,y+clearance,b.wall,true,b.holes as XY[][]);for(const pass of b.passages)yield* m.surfaceStaged(pass.rings[0]as XY[],(x,z)=>ground(x,z)+.035,'#9b9c8d',true,pass.rings.slice(1)as XY[][]);}
  else m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);
  yield;yield* roof(b,y);
  for(const f of [...a.faces(b.p as XY[],y),...b.holes.flatMap(hole=>a.faces(hole as XY[],y).map(f=>m.facade(f.at(f.len),f.at(0),y)))]){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<2.1;
   const corner=s==='cebiorga15'&&q[0]>p[0]+.8||s==='ceb101'&&q[0]<p[0]-.8;
   if(s.startsWith('cebschool')){
    const edges=(b as PhotoBuilding&{exteriorEdges?:number[][][]}).exteriorEdges;
    if(edges&&!edges.some(e=>pointSegmentDistance(p,e[0]as XY,e[1]as XY)<.01))continue;
    const opening=(u:number)=>b.passages.some(pass=>featureContains(f.at(u,-.1),{p:pass.rings[0],holes:pass.rings.slice(1)}as never));
    for(let u=.3;u<f.len;u+=.6)if(!opening(u))f.panel(u,.31,.075,Math.min(.6,f.len-u+.3),.62,.15,'#62574d');
    f.panel(f.len/2,h+.35,.02,f.len,.38,.22,b.wall);f.panel(f.len/2,h+.55,.03,f.len+.12,.06,.29,'#c8cbbd');
    if(f.len<2.7)continue;
    if(s==='cebschoolClass'){
     const n=Math.max(1,Math.round(f.len/6.1));for(let row=0;row<4;row++)for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(row===0&&opening(u))continue;pane(f,u,2.0+row*3.1,Math.min(4.8,f.len/n-.8),1.7,5);yield;}
    }else if(s==='cebschoolHall'){
     const n=Math.max(1,Math.round(f.len/6.0));for(let k=0;k<n;k++){pane(f,(k+.5)*f.len/n,2.0,Math.min(4.7,f.len/n-.9),2.5,3);yield;}
    }else{
     const streetFace=q[1]>p[1]+.8&&p[1]>596,projecting=streetFace&&p[1]>604;
     const entryFace=streetFace&&!projecting&&p[0]>-335,entryU=entryFace?-321-f.at(0)[0]:-100;
     if(entryFace)schoolEntry(f,entryU);
     if(streetFace&&!projecting&&p[0]<-359){
      const u=f.len-2,r=stairs(f,u,2.8,.52,1.3),pt=f.at(u,.75);a.door(f,u,2.6+r,1.5,'#65574f');
      m.box(pt[0],y+r-.19,pt[1],2.8,.40,1.15,'#aaa894',false,true);
      const low=f.at(u-11,.7);slope(f,u-11,u-1.35,.2,1.3,ground(...low)+.045,y+r+.01);
     }
     const n=Math.max(1,Math.round(f.len/4.2));for(let k=0;k<n;k++){
      const u=(k+.5)*f.len/n;if(entryFace&&Math.abs(u-entryU)<4.4)continue;
      if(projecting){
       if(u<3)continue;
       pane(f,u,1.95,Math.min(3.55,f.len/n-.4),1.85,3);pane(f,u,5.25,Math.min(3.55,f.len/n-.4),.42,3);
       f.panel(u,3.06,.39,Math.min(3.95,f.len/n),.18,.78,b.wall);
      }else if(streetFace){
       if(p[0]<-359&&u>f.len-4)continue;
       pane(f,u,1.65,Math.min(3.55,f.len/n-.5),1.15,4);pane(f,u,4.55,Math.min(3.55,f.len/n-.5),1.25,4);
       f.panel(u,5.35,.28,Math.min(3.9,f.len/n),.16,.56,b.trim);
      }else{pane(f,u,1.9,Math.min(3.0,f.len/n-.6),2.25,3);pane(f,u,5.55,Math.min(3.0,f.len/n-.6),.85,3);}
      yield;
     }
     if(projecting){
      // Original schematic relief recalls the visible mural's warm vertical
      // field; fine artwork is not claimed as an exact photographic copy.
      f.panel(1.6,3.65,.10,2.65,6.35,.20,'#9d5947');
      for(let k=0;k<5;k++){const out:number[]=[];for(let j=0;j<18;j++){
       const yy=.60+j*.34,yy1=yy+.34,u=1.6+Math.sin(j*.52+k*1.4)*.84,u1=1.6+Math.sin((j+1)*.52+k*1.4)*.84,w=.11;
       const p0=f.at(u-w,.23+k*.012),p1=f.at(u+w,.23+k*.012),p2=f.at(u1-w,.23+k*.012),p3=f.at(u1+w,.23+k*.012);
       for(const[v,h]of[[p0,yy],[p1,yy],[p2,yy1],[p1,yy],[p3,yy1],[p2,yy1]]as[XY,number][])out.push(v[0],y+h,v[1]);
      }const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,['#bd854b','#ba4e40','#c2b59a','#af6c43','#cab897'][k]);yield;}
     }
    }
    continue;
   }
   if(f.len<2.7)continue;
   if(s==='cebblock'){
    // Nine mapped residential storeys. Balcony rhythm is taken from background
    // photographs; hidden facade divisions remain estimated, not surveyed.
    band(f,.7,'#909285');const n=Math.max(2,Math.round(f.len/3.5)),storey=h/9;
    for(let r=0;r<9;r++){
     for(let k=0;k<n;k++){
      const u=(k+.5)*f.len/n,yy=(r+.55)*storey;
      if(f.len>18&&k%3===1){f.panel(u,yy-.9,.62,2.55,.92,1.24,r%3===0?'#9c9b88':'#c3c3b5');f.window(u,yy+.18,2.25,1.35,'#c8c9bb','#879185');f.panel(u,yy-.11,.72,2.4,.035,.04,'#718477');}
      else f.window(u,yy,1.4,1.7,'#c4c6b6','#9ca596');
      yield;
     }
     f.panel(f.len/2,(r+1)*storey-.07,.025,f.len,.09,.05,'#90988b',true);
    }
    f.panel(f.len/2,h+.23,.04,f.len,.40,.08,'#b9bbac');
    if(front){entry(f,f.len*.12,2.0,.26,'#5c6a58');canopy(f,f.len*.12,2.8,2.25,'#778073');}
    continue;
   }
   band(f,s==='cebiorga15'?.70:.60,s==='cebiorga15'?'#a49c7b':s==='ceb97'||s==='ceb97small'?'#64544b':'#72776b');
   if(!front&&!corner){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.2)),2.25,b.trim,'#7c806b');continue;}
   a.cornice(f,h,b.trim);
   if(s==='ceb97'){
    const n=6,doorU=.5*f.len/n;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(k===0){
      const rise=stairs(f,u,2.8,.52,1.3,'#817b6d'),pt=f.at(u,.75);m.box(pt[0],y+rise-.19,pt[1],2.8,.4,1.15,'#817b6d',false,true);
      a.door(f,u,2.55+rise,1.35,'#60503c');a.pediment(f,u,3.48,3.3,.68,y,b.trim);a.pediment(f,u,4.85,4.3,.9,y,b.trim);
      for(const du of[-1.35,1.35]){const p=f.at(u+du,.16);a.column(...p,y+.52,2.8,.17,b.trim,true);}
      const low=f.at(f.len-.6,.75);slope(f,f.len-.6,doorU+1.35,.2,1.3,ground(...low)+.045,y+rise+.01,'#343d36');
     }else{pane(f,u,2.1,.96,1.9,2);pane(f,u,5.0,1.10,1.55,2);}yield;}
    f.panel(f.len/2,3.4,.10,f.len,.20,.2,b.trim);a.pediment(f,f.len*.62,6.25,f.len*.66,.95,y,b.trim);
   }else if(s==='ceb97small'){
    for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;if(k===0){entry(f,u,2.0,.26,'#55463b');a.pediment(f,u,3.48,2.7,.5,y,b.trim);}else pane(f,u,2.05,.98,2.5,2);yield;}
   }else if(s==='ceb101modern'){
    for(let k=0;k<6;k++){const u=(k+.5)*f.len/6;
     if(k===0||k===4){const r=entry(f,u,1.65,.52,'#67513e');if(k===4)barrel(f,u,3.12+r,1.9,1.35);}
     else pane(f,u,2.0,.88,1.75,2);
     pane(f,u,5.5,.92,1.8,2);f.panel(u,4.2,.13,1.1,.40,.12,b.trim);yield;
    }
    const u=f.len/12;f.panel(u,4.35,.67,1.8,.18,1.34,b.trim);
    for(let du=-.83;du<=.85;du+=.18)f.panel(u+du,4.88,1.3,.025,.97,.03,'#3d4941',true);
    f.panel(u,5.36,1.3,1.8,.04,.04,'#3d4941');
    for(const u of[f.len*.18,f.len*.48,f.len*.78])dormer(f,u,h+.18,1.8,1.75,b.wall,true);
    f.label('101',f.len-.45,2.15,.19,b.trim,.44);
   }else if(s==='ceb99'){
    const n=6;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(k===0){entry(f,u,2.8,.52,'#77604b');a.arch(f,u,.58,2.8,3.05,y,'#716554',b.trim,0);a.door(f,u,2.85,1.6,'#736149');a.pediment(f,u,4.18,3.8,.60,y,b.trim);for(const du of[-1.65,1.65])f.panel(u+du,2.08,.28,.5,3.55,.56,b.trim);f.panel(u,4.08,.25,3.85,.35,.50,b.trim);}
     else{ornament(f,u,2.4,1.30,2.65,'#91937b');grilles(f,u,2.4,1.22,2.55);}yield;}
   }else if(s==='ceb101'||s==='ceb101small'){
    const n=s==='ceb101small'?3:Math.max(2,Math.round(f.len/3.6));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(s==='ceb101'&&((front&&k===1)||(corner&&k===0))){entry(f,u,2.1,.39,'#675443');barrel(f,u,3.1,2.35,1.35);f.panel(u,h+.40,.04,3.15,1.0,.38,b.wall);f.panel(u,h+.96,.06,3.4,.18,.47,b.trim);}
     else{ornament(f,u,2.5,1.3,2.55,'#818773');f.panel(u,.92,.18,1.65,.43,.18,b.trim);f.panel(u,.94,.28,1.36,.25,.035,b.wall);if(s==='ceb101small'&&k===1)f.panel(u,2.5,.45,1.28,2.5,.05,b.wall);else grilles(f,u,2.5,1.22,2.45);}
     yield;
    }
   }else if(s==='cebiorga15'){
    const n=front?8:4,u=f.len/2;
    for(let k=0;k<n;k++){const v=(k+.5)*f.len/n;if(corner&&Math.abs(v-u)<2.5)continue;ornament(f,v,2.4,1.3,2.4,'#bfc3b0');yield;}
    for(let v=.2;v<f.len;v+=.38)f.panel(v,h-.38,.20,.15,.20,.28,b.trim,true);
    if(corner){const rise=entry(f,u,4.3,.65,'#675443');for(const du of[-2.2,-1.4,1.4,2.2]){const p=f.at(u+du,1.15);m.box(p[0],y+rise+1.7,p[1],.36,3.4,.36,b.trim,false,true);f.panel(u+du,rise+3.35,1.15,.5,.17,.5,b.trim);}f.panel(u,4.3,.65,5.2,.45,1.3,b.trim);a.pediment(f,u,4.57,5.45,1.05,y,b.trim);}
   }
  }
 }
 for(const b of custom)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],()=>build(b));
 m.job('liceu · panouri și ventilații',streetRect(-314.5,563,12,39),[],function*(){
  const y=ground(-347.33,606.17)+.12+13.2;
  for(let row=0;row<12;row++)for(let k=0;k<6;k++){
   const x=-320+k*1.35,z=548+row*2.6,g=new T.BoxGeometry(1.17,.055,1.85);g.rotateX(-.30);g.translate(x,y+.54,z);m.put(g,'#35494f');m.box(x,y+.18,z,1.15,.15,1.7,'#9fa89c',true);yield;
  }
  for(const x of[-368,-353,-338,-323,-308]){const g=new T.CylinderGeometry(.22,.26,.55,8);g.translate(x,ground(-347.33,606.17)+7.88,535.4);m.put(g,'#859082');yield;}
  const vent=new T.CylinderGeometry(.70,.70,1.0,12);vent.translate(-335,ground(-347.33,606.17)+5.6,549);m.put(vent,'#756756');
 });
 // Fence spans are split at access routes; batched rods keep visible gaps and
 // participate in the prepared collider, so there is no invisible solid wall.
 const spans:[XY,XY][]=[
  [[-426.4,611.8],[-391.4,611.8]],
  [[-426.4,611.8],[-425.5,521.7]],[[-425.5,521.7],[-388,522.5]],[[-388,522.5],[-388.1,518.7]],[[-388.1,518.7],[-289.5,517.4]],[[-289.5,517.4],[-289.4,589]]
 ];
 for(const[p,q]of spans)m.job('gard liceu',[p,q],[],function*(){
  const f=m.facade(p,q,0);
  for(let u=0;u<=f.len;u+=.28){const p=f.at(u),y=ground(...p);m.box(p[0],y+1.02,p[1],.028,1.9,.028,'#99a896',true,true);if(Math.round(u/.28)%12===0)m.box(p[0],y+1.02,p[1],.09,2.05,.09,'#a7b09f',false,true);if(Math.round(u/.28)%12===0)yield;}
  for(let u=0;u<f.len;u+=3){const w=Math.min(3,f.len-u),p0=f.at(u),p1=f.at(u+w);for(const hh of[.40,1.05,1.8])m.beam(new T.Vector3(p0[0],ground(...p0)+hh,p0[1]),new T.Vector3(p1[0],ground(...p1)+hh,p1[1]),.025,'#8d9b8b');yield;}
 });
 // Sports mesh is sparse original geometry; no alpha-tested fence texture.
 for(const[p,q]of[[[-421.4,529.5],[-391.5,529.5]],[[-421.4,603.5],[-391.5,603.5]],[[-421.4,529.5],[-421.4,603.5]],[[-391.5,529.5],[-391.5,554]],[[-391.5,564],[-391.5,603.5]]]as[XY,XY][])m.job('împrejmuire teren sportiv',[p,q],[],function*(){
  const f=m.facade(p,q,0);for(let u=0;u<=f.len;u+=1){const p=f.at(u),y=ground(...p);m.box(p[0],y+1.8,p[1],u%4===0?.065:.015,3.6,u%4===0?.065:.015,'#798d76',u%4!==0,u%4===0);if(u%4===0)yield;}
  for(const hh of[.1,1.0,1.9,2.8,3.6])m.beam(new T.Vector3(p[0],ground(...p)+hh,p[1]),new T.Vector3(q[0],ground(...q)+hh,q[1]),.012,'#71876c');
 });
 for(const z of[532,601])m.job('poartă fotbal',streetRect(-406.5,z,5,1),[],function*(){const y=ground(-406.5,z);for(const x of[-409,-404])m.box(x,y+1.1,z,.075,2.2,.075,'#c4c9b9',false,true);m.box(-406.5,y+2.2,z,5.075,.075,.075,'#c4c9b9');yield;});
 for(const[x,z]of[[-388.258,610.043]])m.job('coș cartografiat',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+.42,z,.42,.78,.42,'#65775e',false,true);m.box(x,y+.85,z,.47,.1,.47,'#425b47');yield;});
 for(const[x,z]of[[-388.368,627.814],[-330.628,604.029]])m.job('rastel biciclete',streetRect(x,z,2,.8),[],function*(){const y=ground(x,z);for(const dx of[-.65,0,.65]){m.box(x+dx,y+.43,z,.045,.86,.045,'#8f9e8c',false,true);m.box(x+dx,y+.43,z+.55,.045,.86,.045,'#8f9e8c',false,true);m.box(x+dx,y+.88,z+.275,.045,.045,.6,'#8f9e8c');}yield;});
 for(const[x,z,txt]of[[-425,634,'ALEXEI ȘCIUSEV'],[-428.3,641,'MARIA CEBOTARI']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x+1,z],[x-1,z],ground(x,z));f.panel(1,2.6,.02,1.9,.42,.05,'#557388');f.label(txt,1,2.6,.11,'#d0d2bd',.07);yield;});
 for(const[x,z,h]of realm.trees)m.job('arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.19,.29,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#636750',false,true);for(const[dx,dy,dz,r]of[[0,.67,0,2.8],[-1.7,.64,.5,2],[1.5,.76,-.4,2.2],[0,.91,0,1.9]]){const g=new T.IcosahedronGeometry(r,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#657d4a');yield;}});
 const conifer=(x:number,z:number,h:number,potted=false)=>{
  const y=ground(x,z);if(potted)m.box(x,y+.29,z,.70,.58,.65,'#896f56',false,true);
  else m.box(x,y+h*.22,z,.20,h*.44,.20,'#65654f',false,true);
  for(let k=0;k<4;k++){const g=new T.ConeGeometry(h*(.22-k*.035),h*.47,9);g.translate(x,y+(potted?.45:0)+h*(.33+k*.18),z);m.put(g,k%2?'#476451':'#506e58');}
 };
 for(const[x,z,h]of[[-331,605,9],[-315,607,11],[-306,605,10],[-299,605,9]])m.job('conifer liceu',streetRect(x,z,4,4),[],function*(){conifer(x,z,h);yield;});
 for(const x of[-424,-421.4,-418.8,-416.2,-413.6,-411,-408.4])m.job('jardinieră fațadă101',streetRect(x,632,1,1),[],function*(){conifer(x,632,1.9,true);yield;});
 m.job('101 · luminator subsol',streetRect(-400.6,632.9,2.5,1.4),[],function*(){
  const y=ground(-400.6,632.9);m.box(-400.6,y+.42,632.9,2.4,.76,1.35,'#586d69',false,true);
  for(const x of[-401.8,-401,-400.2,-399.4])m.box(x,y+.44,632.16,.035,.80,.045,'#829083',true);
  m.box(-400.6,y+.85,632.9,2.5,.07,1.45,'#819284');yield;
 });
 m.job('indicatoare prioritate Cebotari',streetRect(-426,615,1,1),[],function*(){
  const x=-426,z=615,y=ground(x,z);m.box(x,y+1.45,z,.065,2.9,.065,'#929b8d',false,true);
  for(const[w,c,v]of[[.68,'#cccdbc',.08],[.49,'#be9a51',.09]]as[number,string,number][]){const g=new T.PlaneGeometry(w,w);g.rotateZ(Math.PI/4);g.rotateY(Math.PI/2);g.translate(x+v,y+2.85,z);m.put(g,c);}
  const f=m.facade([x,z+.55],[x,z-.55],y);f.panel(.55,2.10,.09,1.1,.32,.06,'#4c6481');
  f.panel(.59,2.10,.13,.65,.045,.02,'#c8ccbc');const g=new T.BufferGeometry(),pts=[x+.15,y+2.10,z+.4,x+.15,y+2.21,z+.23,x+.15,y+1.99,z+.23];g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();m.put(g,'#c8ccbc');yield;
 });
 m.job('indicator oprirea interzisă',streetRect(-373.5,628,1,1),[],function*(){const x=-373.5,z=628,y=ground(x,z);m.box(x,y+1.45,z,.065,2.9,.065,'#929b8d',false,true);
  const f=m.facade([x+.4,z],[x-.4,z],y);const disk=(r:number,col:string,v:number)=>{const g=new T.CircleGeometry(r,20);g.rotateY(Math.PI);g.translate(x,y+2.85,z-v);m.put(g,col);};disk(.35,'#ad534b',.06);disk(.27,'#4b6380',.07);
  for(const side of[-1,1])m.beam(new T.Vector3(x-.2,y+2.85-side*.2,z-.09),new T.Vector3(x+.2,y+2.85+side*.2,z-.09),.028,'#ad534b');
  f.panel(.4,2.27,.08,.55,.27,.04,'#c9cbbb');f.label('15 m',.4,2.23,.12,'#46534b',.11);yield;
 });
 const poles=realm.lamps as XY[];
 for(const[x,z]of poles)m.job('stâlp iluminat cartografiat',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.7,z,.18,7.4,.18,'#969e8e',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x,y+7.3,z+1.3),.04,'#6d7b68');m.box(x,y+7.3,z+1.3,.25,.12,.5,'#b8bda9');yield;});
 const northPoles=poles.filter(p=>p[1]>615&&p[1]<618).sort((p,q)=>p[0]-q[0]);
 for(let i=1;i<northPoles.length;i++)m.job('cabluri',[northPoles[i-1],northPoles[i]],[],function*(){const p=northPoles[i-1],q=northPoles[i];for(let w=0;w<4;w++)for(let k=0;k<4;k++){const pt=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7-.25*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+w*.10);m.beam(pt(k/4),pt((k+1)/4),.012,'#4a5647');yield;}});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
