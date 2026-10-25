import * as T from 'three';
import catalog from '../data/sciusev-121-buildings.json';
import realm from '../data/sciusev-121.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';
import type {GroundExcavation} from './ground-excavations';
/** Complete mapped bodies; visible fronts dated in the reference ledger. */
export function createSciusev121(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const custom=catalog.filter(b=>b.style.startsWith('s121')||b.style==='garage') as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!custom.some(c=>c.id===b.id)) as unknown as PhotoBuilding[],'Șciusev121 · corpuri de curte');
 const m=streetMesh(scene,'Stere10–20 · fronturi',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Șciusev121 · acces și curți',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const front=(f:Face,b:PhotoBuilding)=>{const p=f.at(f.len/2),q=f.at(f.len/2,1);return(q[0]-p[0])*b.front[0]+(q[1]-p[1])*b.front[1]>.8;};
 const physicalPanel=(f:Face,u:number,yy:number,v:number,w:number,h:number,d:number,color:string)=>{const p=f.at(u,v),aa=f.at(0),bb=f.at(1);m.box(p[0],f.y+yy,p[1],w,h,d,color,false,true,Math.atan2(-(bb[1]-aa[1]),bb[0]-aa[0]));};
 const glass=(f:Face,u:number,yy:number,w:number,h:number)=>{f.panel(u,yy,.12,w,h,.045,'#526978',false,1);for(const du of[-w/2,0,w/2])f.panel(u+du,yy,.17,.055,h+.08,.085,'#48534d',true);for(const dh of[-h/2,h/2])f.panel(u,yy+dh,.17,w+.08,.055,.085,'#48534d',true);};
 function* balcony(f:Face,u:number,yy:number,w:number){
  const d=1.2;physicalPanel(f,u,yy,d/2,w,.18,d,'#cdc4ae');
  for(const edge of[-w/2,w/2])f.panel(u+edge,yy+.58,d/2,.10,1.0,d,'#ccc3ae');
  for(const hh of[yy+.18,yy+1.05])f.panel(u,hh,d,w,.11,.12,'#cfc6b2');
  const n=Math.max(3,Math.round(w/.5)),step=w/n;
  for(let i=0;i<n;i++)for(const sign of[-1,1]){const p=f.at(u-w/2+(i+.5)*step-sign*step/2,d),q=f.at(u-w/2+(i+.5)*step+sign*step/2,d);m.beam(new T.Vector3(p[0],f.y+yy+.2,p[1]),new T.Vector3(q[0],f.y+yy+1.02,q[1]),.027,'#d3c9b5');}yield;
 }
 function* build(b:PhotoBuilding):Generator<void>{
  const y=ground(...b.anchor as XY)+.12,h=b.height,p=b.p as XY[],retail=b.style==='s121retail';
  if(retail){m.solid(p,h-3.9,y+3.9,b.wall,true);m.solid(p,.22,y+3.7,b.trim,true);}
  else m.solid(p,h+5,y-5,b.wall,true,b.holes as XY[][]);
  m.solid(p,.20,y+h,b.roof,true,b.holes as XY[][]);yield;
  if(b.style==='s121historic'){
   // Hipped roof aligned to the mapped rotated rectangle, behind its parapet.
   const edges=p.slice(1).map((q,i)=>({dx:q[0]-p[i][0],dz:q[1]-p[i][1],len:Math.hypot(q[0]-p[i][0],q[1]-p[i][1])})).sort((a,b)=>b.len-a.len),e=edges[0],ux=e.dx/e.len,uz=e.dz/e.len;
   const us=p.map(q=>q[0]*ux+q[1]*uz),vs=p.map(q=>-q[0]*uz+q[1]*ux),u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs),inset=(v1-v0)/2;
   const at=(u:number,v:number,yy:number)=>new T.Vector3(u*ux-v*uz,yy,u*uz+v*ux),c=[at(u0,v0,y+h+.2),at(u1,v0,y+h+.2),at(u1,v1,y+h+.2),at(u0,v1,y+h+.2)],r0=at(u0+inset,(v0+v1)/2,y+h+b.roofRise),r1=at(u1-inset,(v0+v1)/2,y+h+b.roofRise),out:number[]=[];
   for(const[a0,b0,c0]of[[c[0],r0,c[3]],[c[3],r0,r1],[c[3],r1,c[2]],[c[2],r1,c[1]],[c[1],r1,r0],[c[1],r0,c[0]]]){const up=new T.Vector3().crossVectors(b0.clone().sub(a0),c0.clone().sub(a0)).y;out.push(...a0.toArray(),...(up>=0?b0:c0).toArray(),...(up>=0?c0:b0).toArray());}
   const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(out,3));roof.computeVertexNormals();m.put(roof,b.roof,false,true);yield;
  }
  if(b.style==='garage'){
   const faces=a.faces(p,y),ff=faces.filter(f=>front(f,b)).sort((a,b)=>b.len-a.len)[0];
   if(ff){const n=Math.max(1,Math.round(ff.len/3.1)),bw=ff.len/n;for(let k=0;k<n;k++){const u=(k+.5)*bw;ff.panel(u,1.18,.12,bw-.24,2.25,.07,'#697564');ff.panel(u,1.18,.17,.035,2.25,.04,'#37483d',true);ff.panel(u+.13,1.05,.20,.08,.15,.05,'#3f4a3a');yield;}}return;
  }
  for(const f of a.faces(p,y)){
   if(f.len<2.2)continue;const isFront=front(f,b),n=Math.max(1,Math.round(f.len/(retail?4.7:b.style==='s121tower'?3.0:3.3))),bw=f.len/n;
   if(b.style==='s121historic'){
    f.panel(f.len/2,.30,.12,f.len,.6,.24,'#96927d');a.cornice(f,h,b.trim);
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,2.1,Math.min(1.12,bw*.55),2.45,'#c6bea9','#b9bca9');
     if(isFront){for(let j=-1;j<=1;j++)f.panel(u+j*.42,3.60+Math.abs(j)*.11,.27,.39,.65,.38,'#c0b396');for(let j=-2;j<=2;j++)f.panel(u+j*.19,2.05,.46,.024,2.2,.035,'#6e7664',true);}yield;}
    if(isFront){
     f.panel(f.len/2,h+.52,.02,f.len,.9,.35,'#ada68d');f.panel(f.len/2,h+.99,.05,f.len,.17,.50,'#8d8974');
     for(let u=.25;u<f.len;u+=.58)f.panel(u,h-.51,.31,.34,.25,.34,'#b2a78e',true);
     for(const u of[.5,f.len-.5]){f.panel(u,2.45,.24,.44,4.5,.35,'#b4a68b');const pp=f.at(u,.20),aa=f.at(0),bb=f.at(1),angle=Math.atan2(-(bb[1]-aa[1]),bb[0]-aa[0]);const arch=new T.TorusGeometry(.48,.12,5,16,Math.PI);arch.rotateY(angle);arch.translate(pp[0],y+h+1,pp[1]);m.put(arch,'#a69b82');const cap=new T.CircleGeometry(.46,16,0,Math.PI);cap.rotateY(angle);cap.translate(pp[0],y+h+1,pp[1]);m.put(cap,'#ada68d');}
     f.panel(f.len/2,2.75,.5,1.6,.23,.06,'#bbb299');f.label('C. STERE 10',f.len/2,2.75,.14,'#5a5143',.56);
    }continue;
   }
   if(retail){
    f.panel(f.len/2,4.1,.24,f.len,.35,.5,b.trim);f.panel(f.len/2,h-.15,.26,f.len,.35,.52,b.trim);
    for(let k=0;k<n;k++){const u=(k+.5)*bw;glass(f,u,6.1,bw*.65,3.0);if(k<n-1)f.panel((k+1)*bw,6.1,.14,.85,3.5,.08,'#927059');
     const pp=f.at(k*bw+.3,-.45);m.box(pp[0],y+1.85,pp[1],.55,3.7,.55,'#5b5d54',false,true);yield;}
    continue;
   }
   // Tower: ground-floor shops and nine residential levels on a single mapped body.
   f.panel(f.len/2,1.75,.05,f.len,3.5,.10,'#585c54');
   for(let k=0;k<n;k++){
    const u=(k+.5)*bw;glass(f,u,1.7,bw*.84,3.05);
    const isBalcony=isFront&&(k===0||k===n-1||k%5===0);
    if(!isBalcony&&isFront)for(const du of[-bw*.41,bw*.41])f.panel(u+du,15.8,.12,bw*.18,24,.075,'#a47e5c');
    for(let row=0;row<9;row++){
     const base=3.8+row*3.30;if(!isBalcony)glass(f,u,base+1.45,bw*.59,2.65);
     if(isBalcony){f.panel(u,base+1.4,.04,bw*.86,2.8,.06,'#b7a78b');glass(f,u,base+1.45,bw*.64,2.55);yield* balcony(f,u,base,bw*.96);}
     else if(isFront&&k%5===2){f.panel(u,base-.02,.38,bw*.85,.15,.76,'#a3a18e');}
     yield;
    }
   }
   for(const yy of[3.55,27.1,h-.16])f.panel(f.len/2,yy,.27,f.len,.24,.54,b.trim);
   if(isFront)for(const u of[f.len*.21,f.len*.51,f.len*.81]){f.panel(u,h+.25,.08,bw*2,.65,.3,b.trim);a.pediment(f,u,h+.56,bw*2,.72,y,b.trim);}
  }
  if(b.style==='s121tower'){
   // Satellite-visible rooftop panel rows: compact opaque quads, no photo texture.
   const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
   for(let x=x0+3;x<x1-3;x+=3.3)for(let z=z0+3;z<z1-3;z+=2.6){if(!inside([x,z],p))continue;m.box(x,y+h+.28,z,2.3,.16,1.55,'#465962',false,false);yield;}
  }
 }
 function inside(q:XY,p:XY[]){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>q[1])!==(p[j][1]>q[1])&&q[0]<(p[j][0]-p[i][0])*(q[1]-p[i][1])/(p[j][1]-p[i][1])+p[i][0])yes=!yes;}return yes;}
 for(const b of custom)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],()=>build(b));
 // Stere10 side gate gap is preserved; the matching gate is in the shared registry.
 for(const[z0,z1]of[[755.4,756.5],[758.2,762.0]])m.job('Stere10 · zid lateral',streetRect(-872.8,(z0+z1)/2,.5,z1-z0),[],function*(){const y=ground(-872.8,z0);m.box(-872.8,y+1.03,(z0+z1)/2,.27,2.06,z1-z0,'#bcbfaf',false,true);for(const z of[z0,z1]){m.box(-872.8,y+1.1,z,.42,2.2,.42,'#c6c6b3',false,true);const g=new T.ConeGeometry(.36,.24,4);g.rotateY(Math.PI/4);g.translate(-872.8,y+2.32,z);m.put(g,'#c6c6b3');}yield;});
 // Observed shallow descent: carve terrain only after the stair collider is ready.
 const stairIndex=m.collisionObjects.length;
 const excavation:GroundExcavation={a:[-874.6,756.65],axis:[1,0],size:[4,1.4],bottom:0,ready:()=>m.collisionObjects[stairIndex]?.userData.grounded===true};
 m.job('Stere10 · trepte poartă',streetRect(-872.6,757.35,4,1.4),[],function*(){
  const top=ground(-870.6,757.35)+.035,low=top-.36;excavation.bottom=low-.08;
  for(let k=0;k<3;k++)m.box(-870.75-k*.30,top-(k+1)*.12-.10,757.35,.30,.20,1.4,'#a09e8b',false,true);
  m.box(-872.30,low-.10,757.35,1.60,.20,1.4,'#a09e8b',false,true);
  const ramp:XY[]=[[-874.6,756.65],[-873.1,756.65],[-873.1,758.05],[-874.6,758.05]];
  yield* m.surfaceStaged(ramp,(x,z)=>{const t=Math.max(0,Math.min(1,(x+874.6)/1.5));return ground(-874.6,z)+.035+(low-ground(-874.6,z)-.035)*t;},'#a09e8b',true);
  const cut:XY[]=[[-874.6,756.65],[-870.6,756.65],[-870.6,758.05],[-874.6,758.05]];
  yield* m.surfaceStaged(cut,()=>low-.08,'#797c6d',true);
  for(const z of[756.59,758.11])m.box(-872.6,low+.04,z,4,.30,.12,'#a09e8b',false,true);yield;
 });
 // Sparse mapped/visible vegetation; precise crowns are estimates.
 for(const[x,z,h,r]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),g=new T.CylinderGeometry(.12,.21,h*.57,7);g.translate(x,y+h*.285,z);m.put(g,'#6a6d54',false,true);for(const[dx,dy,rr]of[[0,.73,r],[-r*.4,.7,r*.70],[r*.3,.88,r*.7]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z);m.put(g,'#697e4f');yield;}});
 for(const[x,z]of[[-868,813],[-866,783],[-867,843]])m.job('stâlp și lampă Stere',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+4.2,z,.22,8.4,.22,'#a3a794',false,true);for(const sign of[-1,1]){m.beam(new T.Vector3(x,y+7.8,z),new T.Vector3(x+sign*1.9,y+8.4,z),.047,'#727d6c');m.box(x+sign*1.9,y+8.4,z,.64,.14,.27,'#737c6d');}yield;});
 // Wires stay above clearance and are merged with street details.
 m.job('Stere · cabluri',[[ -867,781],[-868,843]],[],function*(){for(const x of[-860.8,-859.7])for(let k=0;k<5;k++){const z=781+k*12.4;m.beam(new T.Vector3(x,ground(x,z)+7.1,z),new T.Vector3(x,ground(x,z+12.4)+7.1,z+12.4),.018,'#4e594b');yield;}});
 m.job('indicator oprire interzisă',streetRect(-869.4,834,1,1),[],function*(){const y=ground(-869.4,834);m.box(-869.4,y+1.4,834,.06,2.8,.06,'#778171',false,true);const g=new T.CircleGeometry(.29,16);g.rotateY(Math.PI/2);g.translate(-869.4,y+2.7,834);m.put(g,'#3d6091');const rim=new T.TorusGeometry(.26,.035,4,16);rim.rotateY(Math.PI/2);rim.translate(-869.38,y+2.7,834);m.put(rim,'#9b5049');for(const sign of[-1,1])m.beam(new T.Vector3(-869.36,y+2.53,834-sign*.17),new T.Vector3(-869.36,y+2.87,834+sign*.17),.024,'#9b5049');yield;});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),excavations:[excavation],treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
