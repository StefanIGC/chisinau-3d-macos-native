import * as T from 'three';
import realm from '../data/sciusev-test.json';
import catalog from '../data/sciusev-test-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** Street-view-informed test block; original opaque geometry, no photo textures.
 * Every authored body replaces its native counterpart only after it is ready. */
export function createSciusevTest(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Bulgară–Tighina detalii',ground,loaded),a=photoArchitecture(m);
 const special=new Set(['w52333835','w253934275','w692816449','w692816450','w692816452','w93332177','w96569211']);
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!special.has(b.id)) as PhotoBuilding[],'Șciusev · corpuri complete');
 const l=landscapeLayer(scene,'Șciusev · stradă și curți',ground,loaded,{maxEdge:2.5,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 for(const b of catalog.filter(b=>special.has(b.id)))m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;
  const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  if(b.roofRise>.6)a.roof((minX+maxX)/2,(minZ+maxZ)/2,maxX-minX+.18,maxZ-minZ+.18,y+h+.08,b.roofRise,b.roof);
  else m.solid(b.p as XY[],.16,y+h,b.roof,false,b.holes as XY[][]);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8,east=q[0]-p[0]>.8;
   a.cornice(f,h,b.trim);
   f.panel(f.len/2,.38,.06,f.len,.76,.12,'#85887c');
   if(f.len<2.5)continue;
   if(b.id==='w96569211'){
    // Synagogue corner: real pale arch fields divided by red pilasters.
    const count=Math.max(2,Math.round(f.len/3.9)),bay=f.len/count;
    for(let k=0;k<count;k++){
     const u=(k+.5)*bay;f.panel(u,3.9,.045,bay-.48,4.95,.09,'#bdb8a9');
     a.arch(f,u,1.8,1.72,3.4,y,'#45534f','#d0c8b5');
     for(const xx of[-.83,0,.83])f.panel(u+xx,3.08,.47,.055,2.4,.07,'#574f48',true);
     for(const yy of[2.55,3.55])f.panel(u,yy,.48,1.65,.055,.07,'#574f48',true);
     f.panel(u,1.30,.26,2.0,.17,.48,'#a6a493');yield;
    }
   }else if(b.id==='w93332177'){
    // Multi-storey bank; no imported model and no white untextured mass.
    const count=Math.max(2,Math.round(f.len/3.5));
    for(let row=0;row<4;row++)for(let k=0;k<count;k++){
     f.window((k+.5)*f.len/count,2.2+row*3.65,1.8,2.15,b.trim,'#687573');if(k%3===2)yield;
    }
    if(front){f.panel(f.len/2,2.10,.30,f.len-.3,3.8,.08,'#59625e');f.label('ENERGBANK',f.len/2-4,3.40,.72,'#c9cbba',.39);}
    for(const yy of[4.15,7.8,11.45])f.panel(f.len/2,yy,.12,f.len,.16,.24,b.trim);
   }else if(b.id==='w52333835'){
    const n=Math.max(2,Math.round(f.len/3.9));
    for(let row=0;row<2;row++)for(let k=0;k<n;k++){
     const u=(k+.5)*f.len/n;f.window(u,3.5+row*3.8,1.65,2.65,'#b9b8ad','#aaa99f');
     if(row===0)f.panel(u,.80,.25,.90,.60,.03,'#58615c',true);yield;
    }
    f.panel(f.len/2,5.28,.08,f.len,.18,.16,'#9f9e94');
   }else if(front&&b.id==='w253934275'){
    f.panel(f.len/2,h-.72,.12,f.len,1.26,.24,b.wall);
    for(const yy of[h-1.36,h-.10])f.panel(f.len/2,yy,.20,f.len+.2,.16,.40,b.trim);
    // West-side door and three windows, deliberately not repeated default bays.
    a.door(f,.95,3.30,1.32,'#746344');
    for(const u of[3.02,5.02,7.02]){f.window(u,2.34,1.22,2.65,b.trim,'#884c49');yield;}
    for(const u of[.05,1.92])f.panel(u,2.22,.15,.20,4.1,.30,b.trim);
    const u=.95;for(let k=0;k<8;k++){const xx=-.94+k*.235,p=f.at(u+xx,.8),q=f.at(u+xx+.235,.8);m.beam(new T.Vector3(p[0],y+3.7+.25*Math.cos(xx),p[1]),new T.Vector3(q[0],y+3.7+.25*Math.cos(xx+.235),q[1]),.032,'#55574c');}
    f.panel(u,3.7,.5,1.9,.09,1.0,'#70796e');
   }else if(front&&b.id==='w692816449'){
    // Captioned historic double timber door, kept as original modeled panels.
    a.door(f,1.03,2.75,1.50,'#665246');
    for(const u of[3.65,6.2]){f.window(u,2.06,1.33,2.10,'#baa78d','#945b61');f.panel(u,1.0,.44,1.65,.16,.44,'#9d6064');yield;}
   }else if(front&&b.id==='w692816450'){
    for(const u of[f.len*.27,f.len*.72])f.window(u,1.95,1.20,1.95,b.trim,'#6f6c5b');
    a.pediment(f,f.len*.50,h-.05,f.len*.86,1.15,y,b.wall);
    f.panel(f.len*.5,h+.43,.48,.72,.82,.12,'#a59c82');
   }else if(front&&b.id==='w692816452'){
    const n=6;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,2.72,1.48,2.7,b.trim,'#5e655b');a.pediment(f,u,4.14,1.85,.42,y,b.trim);yield;}
   }else yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),b.levels>1?2.5:2.1,b.trim,'#697069');
   if(front&&['w253934275','w692816449','w692816452'].includes(b.id)){
    const number=b.id==='w253934275'?'12':b.id==='w692816449'?'10':'4';
    f.panel(f.len-.55,2.45,.47,.54,.36,.045,'#526779');f.label(number,f.len-.73,2.32,.22,'#d1d0c0',.50);
   }
   yield;
  }
 });
 // Boundary walls stop at genuine opening positions. Opening gates use the
 // existing game gate/collision subsystem, not decorative sealed rectangles.
 const walls:[XY,XY,string,number][]=[
  [[1024,631],[1030,631],'#8d897b',2.0],[[1034.4,631],[1044.6,631],'#8d897b',2.0],
  [[1048,607.2],[1050,607.2],'#b6a085',2.25],[[1054.5,607.2],[1057.2,607.2],'#b6a085',2.25],
  [[1066.15,606.9],[1077.55,606.9],'#a6a18b',1.8],
  [[1085.7,606.8],[1088,606.8],'#995e4f',2.4],[[1092.5,606.8],[1097.5,606.8],'#995e4f',2.4],
  [[1107,629],[1111,629],'#9b9d8e',1.9],[[1115.5,629],[1123,629],'#9b9d8e',1.9],
  [[1118.65,606.5],[1121,606.5],'#a6aaa0',2.0],[[1125.5,606.5],[1128.2,606.5],'#a6aaa0',2.0],
  [[1137.15,629],[1138.1,629],'#9aa598',1.8],[[1140.8,629],[1142.2,629],'#9aa598',1.8],
  [[1163.3,606.3],[1165.0,606.3],'#92988a',2.0],[[1168.8,606.3],[1170.2,606.3],'#92988a',2.0],
  [[1166,633],[1167,633],'#b7b4a2',2.1],[[1170.8,633],[1172.2,633],'#b7b4a2',2.1],
 ];
 for(const[aa,bb,color,h]of walls)m.job('zid și împrejmuire',[aa,bb],[],function*(){
  const len=Math.hypot(bb[0]-aa[0],bb[1]-aa[1]),n=Math.ceil(len/2),angle=Math.atan2(-(bb[1]-aa[1]),bb[0]-aa[0]);
  for(let k=0;k<n;k++){const t=(k+.5)/n,x=aa[0]+(bb[0]-aa[0])*t,z=aa[1]+(bb[1]-aa[1])*t,y=ground(x,z);m.box(x,y+h/2+.04,z,len/n,h,.22,color,false,true,angle);m.box(x,y+h+.06,z,len/n+.02,.12,.30,'#777c6e');yield;}
 });
 // Manually observed trunk positions, approximate spacing and crown size.
 // Native trees are suppressed only inside small matching replacement discs.
 for(const[x,z,h]of realm.trees)m.job('arbore matur',streetRect(x,z,5,5),[],function*(){
  const y=ground(x,z),g=new T.CylinderGeometry(.18,.32,h*.57,8);g.translate(x,y+h*.285,z);m.put(g,'#686854',false,true);
  const base=new T.CylinderGeometry(.33,.33,1.05,8);base.translate(x,y+.525,z);m.put(base,'#c2c3ad');
  for(const [dx,dy,dz,r]of[[0,.69,0,2.8],[-1.5,.61,.6,2.0],[1.4,.66,-.6,2.1],[0,.87,0,2.0]]){const g=new T.IcosahedronGeometry(r,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#5f7b49');yield;}
 });
 const poles:XY[]=[[995,604],[1037,611],[1083,611],[1119,611],[1155,611],[1197.7,608.4],[1198,648]];
 for(const[x,z]of poles)m.job('stâlp și lampă',streetRect(x,z,2,2),[],function*(){
  const y=ground(x,z);m.box(x,y+3.9,z,.18,7.8,.18,'#92968a',false,true);m.beam(new T.Vector3(x,y+7.1,z),new T.Vector3(x,y+7.4,z+1.5),.048,'#677367');m.box(x,y+7.4,z+1.55,.23,.14,.65,'#a6ac9e');yield;
 });
 for(let k=1;k<poles.length-1;k++)m.job('cabluri',[poles[k-1],poles[k]],[],function*(){
  const aa=poles[k-1],bb=poles[k];for(let wire=0;wire<4;wire++)for(let s=0;s<5;s++){
   const at=(t:number)=>new T.Vector3(aa[0]+(bb[0]-aa[0])*t,ground(...aa)*(1-t)+ground(...bb)*t+7.15-.32*Math.sin(t*Math.PI),aa[1]+(bb[1]-aa[1])*t+wire*.14);m.beam(at(s/5),at((s+1)/5),.013,'#465449');yield;
  }
 });
 // Visible western waste collection bay: brown slat screen, grey wheeled bin
 // and yellow separate collection bin. It does not obstruct the public path.
 m.job('containere și paravan',streetRect(1038,628,3,2),[],function*(){
  const y=ground(1038,628);for(const[x,c]of[[1037.2,'#a6a798'],[1038.5,'#c2a04c']]as[number,string][]){m.box(x,y+.6,628,.9,1.1,.7,c,false,true);m.box(x,y+1.18,628,1.0,.1,.8,'#737b6e');for(const dx of[-.3,.3])m.box(x+dx,y+.10,628.24,.12,.19,.12,'#3e4c43');yield;}
  for(let j=0;j<9;j++){m.box(1038,y+.18+j*.16,628.6,3.3,.10,.08,'#79614b');yield;}
 });
 // The existing photographed Tighina stop is retained at the block boundary.
 m.job('stația Șciusev · Tighina',streetRect(1198,640,3,6),[],function*(){
  const y=ground(1198,640);for(const z of[637.5,640,642.5])m.box(1197.2,y+1.36,z,.08,2.72,.08,'#3d4b43',false,true);
  m.box(1198.1,y+2.76,640,2.25,.16,5.4,'#465249',false,true);
  for(const z of[638.5,641.2]){m.box(1197.21,y+1.43,z,.06,2.15,2.35,'#6f7b6b');m.box(1197.27,y+1.50,z,.03,1.1,1.7,'#b2b7a4');}
  m.box(1197.8,y+.51,640,.48,.12,3.9,'#777a68',false,true);yield;
  const f=m.facade([1199.2,642.6],[1199.2,637.4],y);f.label('SCIUSEV',.6,2.49,.28,'#c2c6b6',.03);
  const g=new T.CylinderGeometry(.32,.26,.60,12);g.translate(1199.6,y+.34,643.6);m.put(g,'#b5a272',false,true);yield;
 });
 for(const[x,z,rot]of realm.crossings)m.job('indicator trecere',streetRect(x+(rot?5.3:2),z+(rot?2:7.1),1,1),[],function*(){
  const px=x+(rot?5.3:2),pz=z+(rot?2:7.1),y=ground(px,pz),f=m.facade([px-.34,pz],[px+.34,pz],y);
  m.box(px,y+1.5,pz,.045,3,.045,'#929b8c',false,true);f.panel(.34,2.70,0,.72,.72,.06,'#386d91');a.pediment(f,.34,2.4,.57,.51,y,'#cdd0ba');yield;
 });
 const layers=[m,l,bodies];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),
  get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
