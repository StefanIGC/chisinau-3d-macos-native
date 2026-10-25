import * as T from 'three';
import data from '../data/dendrarium.json';
import cadastre from '../data/cadastral-buildings.json';
import {landscapeLayer} from './landscape-layer';
import {streetMesh,streetRect} from './street-mesh';
import {prepareLandmarkCollision} from './landmark-collision';
import type {XY} from './city-layout';

/** FNDG parcel 01005170203. Photo-derived dimensions remain estimates. */
export function createDendrarium(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const land=landscapeLayer(scene,'Dendrariu · teren',ground,loaded,{maxEdge:5,residentDistance:850});
 const m=streetMesh(scene,'Dendrariu · obiecte',ground,loaded);
 const trees=new Map<string,typeof data.trees>(),fences=new Map<string,typeof data.fences>(),objects=new Map<string,typeof data.objects>();
 const key=(x:number,z:number)=>`${Math.floor(x/64)}/${Math.floor(z/64)}`;
 for(const t of data.trees){const k=key(t[0]as number,t[1]as number);if(!trees.has(k))trees.set(k,[]);trees.get(k)!.push(t);}
 for(const f of data.fences){const k=key((f[0][0]+f[1][0])/2,(f[0][1]+f[1][1])/2);if(!fences.has(k))fences.set(k,[]);fences.get(k)!.push(f);}
 for(const o of data.objects){const k=key(...o.p as XY);if(!objects.has(k))objects.set(k,[]);objects.get(k)!.push(o);}
 const waterLevels=data.water.map(r=>{const p=r[0],x=p.reduce((s,p)=>s+p[0],0)/p.length,z=p.reduce((s,p)=>s+p[1],0)/p.length;return{x,z,get y(){return ground(x,z)+.045;}};});
 for(const c of data.cells){const k=key(c.x,c.z);
  land.job(`${c.x}/${c.z}`,c.x,c.z,function*(){
   for(const p of c.patches){
    // The water material is opaque and separate from the disjoint shore floor.
    // Use one shared level per mapped basin, including when it spans cells.
    const ring=p.rings[0],cx=ring.reduce((s,p)=>s+p[0],0)/ring.length,cz=ring.reduce((s,p)=>s+p[1],0)/ring.length;
    const w=waterLevels.reduce((a,b)=>Math.hypot(a.x-cx,a.z-cz)<Math.hypot(b.x-cx,b.z-cz)?a:b);
    yield* land.surfaceStaged(p.rings,p.color,p.kind,p.kind===6?()=>w.y:(x,z)=>ground(x,z)+.035,p.kind!==6);
   }
   for(const t of trees.get(k)??[]){const[x,z,h,r,conifer]=t as [number,number,number,number,boolean],y=ground(x,z);
    const trunk=new T.CylinderGeometry(.11,.24,h*.65,6);trunk.translate(x,y+h*.325,z);land.put(trunk,'#746951',0,false,true);
    if(conifer){for(let i=0;i<3;i++){const crown=new T.ConeGeometry(r*(1-i*.23),h*.48,8);crown.translate(x,y+h*(.54+i*.15),z);land.put(crown,i%2?'#486647':'#395b3b');}}
    else{const crown=new T.IcosahedronGeometry(1,1);crown.scale(r,h*.28,r*.88);crown.rotateY(x*.37);crown.translate(x,y+h*.70,z);land.put(crown,['#567d42','#63894a','#466a38','#719052'][Math.abs(Math.round(x+z))%4]);
     const top=new T.IcosahedronGeometry(1,0);top.scale(r*.67,h*.23,r*.76);top.translate(x+r*.25,y+h*.83,z-r*.20);land.put(top,'#62864a');}
    yield;
   }
  },c.coverage);
  if(fences.has(k)||objects.has(k))m.job(`mobilier ${c.x}/${c.z}`,streetRect(c.x,c.z,64,64),[],function*(){
   for(const [p,q]of fences.get(k)??[]){const dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx),n=Math.max(1,Math.ceil(len/.28));
    // Confirmed spear-picket design on Ion Creangă; other sides are estimated.
    for(let i=0;i<=n;i++){const u=i/n,x=p[0]+dx*u,z=p[1]+dz*u,y=ground(x,z);m.box(x,y+1.13,z,.035,1.94,.035,'#343e37',true,true,angle);
     if(i%9===0){m.box(x,y+1.16,z,.09,2.1,.09,'#343e37',false,true);const tip=new T.ConeGeometry(.065,.15,4);tip.translate(x,y+2.26,z);m.put(tip,'#343e37',true);}if(i%12===0)yield;}
    const segments=Math.ceil(len/2);for(let j=0;j<segments;j++){const u=(j+.5)/segments,x=p[0]+dx*u,z=p[1]+dz*u,y=ground(x,z);m.box(x,y+.12,z,len/segments+.01,.24,.26,'#a6a597',false,true,angle);for(const h of[.55,1.65])m.box(x,y+h,z,len/segments+.01,.045,.045,'#394138',false,false,angle);}yield;
   }
   for(const o of objects.get(k)??[]){const[x,z]=o.p,y=ground(x,z)+.035,angle=o.angle;
    if(o.kind==='bench'){bench(x,z,y,angle);}
    else if(o.kind==='waste_basket'){const g=new T.CylinderGeometry(.23,.20,.67,8);g.translate(x,y+.37,z);m.put(g,'#414a3d',false,true);m.box(x,y+.73,z,.54,.06,.54,'#606b55');}
    else if(o.kind==='street_lamp')lamp(x,z,y);
    else if(o.kind==='toilets'){m.box(x,y+1.38,z,3.8,2.76,2.7,'#bfc2ad',false,true,angle);m.box(x,y+2.84,z,4,.13,2.9,'#6b7869',false,false,angle);const f=m.facade([x-1.9*Math.cos(angle),z+1.9*Math.sin(angle)],[x+1.9*Math.cos(angle),z-1.9*Math.sin(angle)],y);f.panel(1.9,1.2,1.39,.95,2.3,.04,'#687f7c');f.label('WC',1.9,2.55,.22,'#344c49',1.42);}
    else if(o.kind==='playground'){yield* playground(x,z,y,angle);}
    else if(o.kind==='fitness_station'){for(const dx of[-1,1])m.box(x+dx,y+1.2,z,.09,2.4,.09,'#6b785d',false,true);m.box(x,y+2.4,z,2.1,.09,.09,'#a8b591');}
    else if(o.kind==='fountain'){yield* fountain(x,z,y,o.id==='8281789582'?4:2.2);}
    else if(o.kind==='artwork'&&o.name==='Isus Hristos'){yield* jesus(x,z,y);}
    else if(o.kind==='information'){m.box(x,y+1.1,z,.09,2.2,.09,'#60705a',false,true);m.box(x,y+1.75,z,1.3,1.2,.09,'#e0ddbf',false,false,angle);}
    yield;
   }
  });
 }
 function bench(x:number,z:number,y:number,angle:number,white=false){
  const f=m.facade([x-Math.cos(angle),z+Math.sin(angle)],[x+Math.cos(angle),z-Math.sin(angle)],y),wood=white?'#d4d8c7':'#886544';
  for(let i=0;i<5;i++)f.panel(1,.46,-.24+i*.12,1.85,.07,.09,wood);for(let i=0;i<4;i++)f.panel(1,.72+i*.115,.31,1.85,.09,.07,wood);
  for(const u of[.20,1.80]){f.panel(u,.25,0,.07,.50,.58,'#3c493e');f.panel(u,.77,0,.065,.09,.62,'#39473b');}m.box(x,y+.4,z,1.85,.16,.48,'#776f51',true,true,angle);
 }
 function lamp(x:number,z:number,y:number){m.box(x,y+2.8,z,.09,5.6,.09,'#39453a',false,true);
  for(const side of[-1,1]){m.beam(new T.Vector3(x,y+5.5,z),new T.Vector3(x+side*.8,y+5.3,z),.035,'#39453a',false);const g=new T.ConeGeometry(.27,.34,6);g.translate(x+side*.8,y+5.14,z);m.put(g,'#3d493d');m.box(x+side*.8,y+4.9,z,.26,.33,.26,'#d1d2b3');}
 }
 function* playground(x:number,z:number,y:number,angle:number){
  // Dimensions and equipment distribution are estimated from municipal photos.
  m.box(x,y+.035,z,15,.07,11,'#967965',false,false,angle);
  for(const offset of[-3,3]){for(const dx of[-.8,.8])for(const dz of[-.8,.8])m.box(x+offset+dx,y+1.5,z+dz,.09,3,.09,'#bfa256',false,true);m.box(x+offset,y+1.25,z,1.9,.15,1.9,'#8b8b54');const roof=new T.ConeGeometry(1.65,1,4);roof.rotateY(Math.PI/4);roof.translate(x+offset,y+3,z);m.put(roof,offset<0?'#a64e3a':'#9f9441');
   const slide=new T.BoxGeometry(.8,.08,3.2);slide.rotateX(-.38);slide.translate(x+offset,y+.67,z+2.1);m.put(slide,offset<0?'#397c91':'#aa5c42');yield;}
  for(let i=0;i<5;i++)m.box(x-1.5+i*.7,y+1.25,z,.75,.12,1.2,'#bca86b');
 }
 function* fountain(x:number,z:number,y:number,r:number){
  const rim=new T.TorusGeometry(r,.15,6,40);rim.rotateX(Math.PI/2);rim.translate(x,y+.12,z);m.put(rim,'#67746c');
  const water=new T.CylinderGeometry(r-.12,r-.12,.05,40);water.translate(x,y+.05,z);m.put(water,'#57887e');
  // Opaque slender jets avoid transparency sorting and flashing against water.
  for(let i=0;i<12;i++){const an=i*Math.PI/6;for(let s=0;s<5;s++){const t=s/5,u=(s+1)/5;const p=(v:number)=>new T.Vector3(x+Math.cos(an)*r*.72*(1-v),y+.2+Math.sin(v*Math.PI)*.62,z+Math.sin(an)*r*.72*(1-v));m.beam(p(t),p(u),.015,'#b5d1c7',false);}yield;}
 }
 function* jesus(x:number,z:number,y:number){
  // Own low-poly sculpture; location and robed raised-hand form are confirmed,
  // facial/anatomical details are intentionally approximate.
  m.box(x,y+.30,z,1.25,.60,1.25,'#747e70',false,true);const robe=new T.CylinderGeometry(.23,.49,1.60,10);robe.translate(x,y+1.42,z);m.put(robe,'#736952');
  const head=new T.IcosahedronGeometry(.23,1);head.scale(.9,1.2,.9);head.translate(x,y+2.50,z);m.put(head,'#70654c');
  for(const [side,rise]of[[-1,.1],[1,.8]]){const shoulder=new T.Vector3(x+side*.26,y+2.1,z);const elbow=new T.Vector3(x+side*.55,y+2.02+rise*.4,z);const hand=new T.Vector3(x+side*.6,y+2.02+rise,z);m.beam(shoulder,elbow,.10,'#736952',false);m.beam(elbow,hand,.075,'#736952',false);}yield;
 }
 for(const gate of data.gates)m.job(`intrare ${gate.id}`,streetRect(...gate.p as XY,12,12),[],function*(){const[x,z]=gate.p,[ux,uz]=gate.axis,y=ground(x,z);
  for(const side of[-1,1]){m.box(x+side*ux*3.4,y+1.35,z+side*uz*3.4,.30,2.7,.30,'#7d8979',false,true);lamp(x+side*ux*4.2,z+side*uz*4.2,y);}
  // Open leaves run along the approach rather than across the pedestrian gap.
  for(const side of[-1,1])m.box(x+side*ux*3.25-uz*1.0,y+1.0,z+side*uz*3.25+ux*1.0,.08,1.8,2,'#3d493d',false,false,Math.atan2(-uz,ux));yield;
 });
 // Only two cadastral structures are outside the old import. Other park
 // buildings retain their existing official footprint models without duplication.
 const existing=new Set(cadastre.chunks.flatMap(c=>c.bodies).map(b=>b.id.split('/').slice(0,2).join('/'))),newBodies=data.buildings.filter(b=>!existing.has(b.id));
 const ownership:{id:number;x:number;z:number;radius:number;footprints:number[][][][];readonly ready:boolean}[]=[];
 for(const [i,b]of newBodies.entries()){const index=m.collisionObjects.length;m.job(`clădire ${b.id}`,b.rings[0]as XY[],[],function*(){const y=ground(...b.p as XY);m.solid(b.rings[0]as XY[],b.height+1,y-1,'#b6b7a0',true,b.rings.slice(1)as XY[][]);m.solid(b.rings[0]as XY[],.14,y+b.height,'#707b6c',false);yield;});ownership.push({id:-3100000-i,x:b.p[0],z:b.p[1],radius:0,footprints:[b.rings],get ready(){return m.collisionObjects[index].userData.grounded===true;}});}
 for(const bridge of data.bridges){const p=bridge.p[0],q=bridge.p[bridge.p.length-1];m.job(`pod ${bridge.id}`,[p,q]as XY[],[],function*(){
  const dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx);
  for(const side of[-1,1]){const n=Math.ceil(len/.55);for(let i=1;i<n;i++){const x=p[0]+dx*i/n-side*dz/len*1.25,z=p[1]+dz*i/n+side*dx/len*1.25,y=ground(x,z);m.box(x,y+.53,z,.045,1.06,.045,'#424c40',true,true);if(i%8===0)yield;}
   const x=(p[0]+q[0])/2-side*dz/len*1.25,z=(p[1]+q[1])/2+side*dx/len*1.25;m.box(x,ground(x,z)+1.08,z,len,.07,.07,'#404d3e',false,false,angle);}
 });}
 for(const deck of data.decks){const p=deck[0],a=p[0],b=p[p.length-2],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
  // The pier is mapped; the pergola's offset, bay widths and hanging seats
  // follow the municipal photograph and remain metric estimates.
  const x=p.slice(0,-1).reduce((s,q)=>s+q[0],0)/(p.length-1),z=p.slice(0,-1).reduce((s,q)=>s+q[1],0)/(p.length-1),angle=Math.atan2(-uz,ux);
  m.job('faleza · pergolă albă și leagăne',streetRect(x,z,40,40),[],function*(){
   const y=ground(x,z)+.10;
   for(let k=0;k<5;k++){const xx=x+(k-2)*5.1*ux-uz*5.0,zz=z+(k-2)*5.1*uz+ux*5.0;
    for(const side of[-1,1]){const f=m.facade([xx-ux*2.3,zz-uz*2.3],[xx+ux*2.3,zz+uz*2.3],y);for(const u of[0,4.6])f.panel(u,1.7,side*1.65,.13,3.4,.13,'#d5d9cb');f.panel(2.3,3.35,side*1.65,4.7,.16,.15,'#d5d9cb');}
    for(let s=0;s<16;s++){const qx=xx+ux*(s/15-.5)*4.6,qz=zz+uz*(s/15-.5)*4.6;m.box(qx,y+3.43,qz,.08,.12,3.6,'#d7dccc',true,false,angle);}
    bench(xx,zz,y+.08,angle,true);for(const sign of[-1,1])m.beam(new T.Vector3(xx+ux*sign*.8,y+3.3,zz+uz*sign*.8),new T.Vector3(xx+ux*sign*.8,y+.63,zz+uz*sign*.8),.016,'#a8b4a7',true);yield;
   }
   // Water-side railing; the landward approach remains open.
   const f=m.facade([x-ux*len/2+uz*2.1,z-uz*len/2-ux*2.1],[x+ux*len/2+uz*2.1,z+uz*len/2-ux*2.1],y);
   for(let u=0;u<f.len;u+=1.4)f.panel(u,.56,0,.075,1.12,.075,'#494d3d');for(const h of[.34,.68,1.1])f.panel(f.len/2,h,0,f.len,.09,.07,'#4e513d');yield;
  });
 }
 // Rose beds: mapped garden margins carry low planting, while all mapped
 // crossing paths remain unobstructed. Blossoms are merged static geometry.
 for(const [i,garden]of data.gardens.entries()){const p=garden[0],x=p.reduce((s,q)=>s+q[0],0)/p.length,z=p.reduce((s,q)=>s+q[1],0)/p.length;
  m.job(`grădină ${i}`,p as XY[],[],function*(){for(let j=1;j<p.length;j++){const a=p[j-1],b=p[j],len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let u=.9;u<len;u+=2.4){const x=a[0]+(b[0]-a[0])*u/len,z=a[1]+(b[1]-a[1])*u/len,y=ground(x,z),g=new T.IcosahedronGeometry(.36,0);g.scale(1,.7,1);g.translate(x,y+.35,z);m.put(g,'#4e7139',true);const flower=new T.IcosahedronGeometry(.13,0);flower.translate(x,y+.62,z);m.put(flower,['#bd7b83','#c49b62','#d2c2a4'][i%3],true);yield;}}});
 }
 // The lake is not a walkable floor. Invisible shoreline collision keeps the
 // pedestrian on land without inventing a visible wall around the natural bank.
 const waterLimits:T.Group[]=[],waterMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
 for(const [i,rings]of data.water.entries()){const p=rings[0],area=Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;if(area<500)continue;
  const limit=new T.Group();limit.name='Dendrariu · malul lacului';waterLimits.push(limit);
  m.job(`limita lacului ${i}`,p as XY[],[],function*(){const parts:T.BufferGeometry[]=[];
   for(let j=1;j<p.length;j++){const a=p[j-1],b=p[j],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),n=Math.ceil(len/3);for(let k=0;k<n;k++){const x=a[0]+dx*(k+.5)/n,z=a[1]+dz*(k+.5)/n,g=new T.BoxGeometry(len/n+.02,6,.10);g.rotateY(Math.atan2(-dz,dx));g.translate(x,ground(x,z)+1,z);parts.push(g);}yield;}
   for(const g of parts)limit.add(new T.Mesh(g,waterMaterial));limit.updateMatrixWorld(true);yield* prepareLandmarkCollision(limit);limit.userData.grounded=true;limit.userData.revision=1;
  });
 }
 const layers=[land,m];let cursor=0;
 return{objects:layers.flatMap(l=>l.objects),collisionObjects:[...layers.flatMap(l=>l.collisionObjects),...waterLimits],replacements:ownership,
 treeOverrides:data.cells.flatMap((c,i)=>c.coverage.map(r=>({x:c.x,z:c.z,radius:50,height:0,texture:0,polygon:r[0],get ready(){return land.objects[i].visible&&land.objects[i].children.length>0;}}))),
 get ready(){return layers.every(l=>l.ready);},readyNear(x:number,z:number,r=420){return layers.every(l=>l.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){const first=cursor++%layers.length;for(let i=0;i<layers.length;i++)layers[(first+i)%layers.length].update(camera,now);},dispose(){for(const l of layers)l.dispose();for(const g of waterLimits)g.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});waterMaterial.dispose();}};
}
