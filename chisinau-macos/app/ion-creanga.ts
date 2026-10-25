import * as T from 'three';
import realm from '../data/ion-creanga.json';
import catalog from '../data/ion-creanga-buildings.json';
import boulevardBuildings from '../data/boulevard-completion.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {addCantemirApproach} from './cantemir-approach';
import {addIonCreangaLandscape} from './ion-creanga-landscape';
import {ionCreangaTreeOwnership} from './ion-creanga-tree-ownership';
import {addUpscCourtyard} from './upsc-architecture';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {GroundExcavation} from './ground-excavations';
import type {XY} from './city-layout';

/** Whole mapped bodies and public space. Photo limitations live in the ledger. */
export function createIonCreanga(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog as unknown as PhotoBuilding[],'Cantemir · clădiri'),m=streetMesh(scene,'Cantemir · mobilier',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Cantemir · spațiu public',ground,loaded,{maxEdge:4,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+.035,true);},c.coverage);
 const passage=streetMesh(scene,'Cantemir · pasaj subteran',ground,loaded);
 let lower=0;
 const cuts:GroundExcavation[]=[];
 const allPoints=[...realm.stairs,...realm.corridors].flatMap(s=>s.p) as XY[];
 const ready=()=>passage.collisionObjects[0]?.userData.grounded===true;
 for(const [items,hideGround]of[[realm.stairs,true],[realm.corridors,false]]as const)for(const s of items)for(let i=1;i<s.p.length;i++){
  const p=s.p[i-1],q=s.p[i],dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,w=3.7;
  cuts.push({a:[p[0]+uz*w/2,p[1]-ux*w/2],axis:[ux,uz],size:[len,w],bottom:0,ready,hideGround});
 }
 passage.job('București / Alba-Iulia · coridoare',allPoints,realm.skippedBuildings,function*(){
  // One elevation joins all branches. Exact depth is not publicly surveyed.
  lower=Math.min(...realm.stairs.map(s=>ground(...s.p[s.p.length-1] as XY)))-3.55;
  for(const c of cuts)c.bottom=lower-.10;
  for(const rr of realm.openings)yield* passage.surfaceStaged(rr[0]as XY[],()=>lower-.1,'#808779',false,rr.slice(1)as XY[][]);
  for(const rr of realm.tunnel){passage.solid(rr[0]as XY[],.20,lower-.20,'#7e837c',true,rr.slice(1)as XY[][]);yield;}
  for(const rr of realm.roof){passage.solid(rr[0]as XY[],.18,lower+2.78,'#c7c9bd',true,rr.slice(1)as XY[][]);yield;}
  for(const [p,q]of realm.tunnelWalls){
   const dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx),x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;
   passage.box(x,lower+1.4,z,len,2.8,.17,'#bcbeb2',false,true,angle);
   const f=passage.facade(p as XY,q as XY,lower);
   for(let u=0;u<len;u+=.8){f.panel(Math.min(len-.1,u+.4),1.4,.091,.012,2.75,.012,'#9ea39a',true);if(u%4<.8)yield;}
   for(const h of[.65,1.3,1.95,2.6])f.panel(len/2,h,.10,len,.014,.015,'#a0a69a',true);
   if(len>8){
    f.label((p[0]+q[0])/2<-2040?'BUCUREȘTI':'ALBA-IULIA',len/2,2.30,.25,'#557a98',.13);
    for(let u=3;u<len-2;u+=7){f.panel(u,1.55,.13,2.8,1.35,.07,'#65797e');f.panel(u,1.55,.18,2.55,1.12,.02,'#a8b4ae',false,1);for(let j=0;j<8;j++)f.panel(u-1.05+j*.30,1.43+Math.sin(j)*.28,.205,.25,.48,.02,['#557895','#b29c63','#6b8b79'][j%3],true);yield;}
   }yield;
  }
  for(const s of realm.stairs){
   const p=s.p as XY[],length=p.slice(1).reduce((n,q,i)=>n+Math.hypot(q[0]-p[i][0],q[1]-p[i][1]),0),top=ground(...p[p.length-1])+.035,steps=Math.ceil((top-lower)/.145);
   let distance=0;
   for(let j=1;j<p.length;j++){
    const aa=p[j-1],bb=p[j],dx=bb[0]-aa[0],dz=bb[1]-aa[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,angle=Math.atan2(-dz,dx),n=Math.max(1,Math.round(steps*len/length));
    for(let i=0;i<n;i++){
     const t=(i+.5)/n,x=aa[0]+dx*t,z=aa[1]+dz*t,yy=lower+(top-lower)*(distance+len*i/n)/length;
     passage.box(x,yy-.11,z,len/n+.004,.22,3.68,'#a4a99b',false,true,angle);yield;
    }
    // Side retaining walls and handrails follow the descent; no cap across it.
    for(const sign of[-1,1]){
     const y0=lower+(top-lower)*distance/length+.82,y1=lower+(top-lower)*(distance+len)/length+.82;
     passage.beam(new T.Vector3(aa[0]-sign*uz*1.72,y0,aa[1]+sign*ux*1.72),new T.Vector3(bb[0]-sign*uz*1.72,y1,bb[1]+sign*ux*1.72),.035,'#8e9e99',false);
    }
    distance+=len;
   }
   // Bottom landing overlaps the corridor floor only below walking elevation.
   const start=p[0];passage.box(start[0],lower-.105,start[1],3.65,.21,3.65,'#969d91',false,true);
  }
  for(const [p,q]of realm.stairWalls){const len=Math.hypot(q[0]-p[0],q[1]-p[1]),x=(p[0]+q[0])/2,z=(p[1]+q[1])/2,high=Math.max(ground(...p as XY),ground(...q as XY))+.78;passage.box(x,(lower+high)/2,z,len,high-lower,.17,'#bdbeb3',false,true,Math.atan2(-(q[1]-p[1]),q[0]-p[0]));yield;}
  for(const s of realm.corridors)for(let i=1;i<s.p.length;i++){
   const p=s.p[i-1],q=s.p[i],len=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.ceil(len/8),angle=Math.atan2(-(q[1]-p[1]),q[0]-p[0]);
   for(let j=0;j<n;j++){const t=(j+.5)/n;passage.box(p[0]+(q[0]-p[0])*t,lower+2.70,p[1]+(q[1]-p[1])*t,1.25,.07,.32,'#e0ddbf',false,false,angle);yield;}
  }
 });
 // The university-side landing is visible in Alex Mur's October 2022 panorama.
 // Keep its warning paving outside the excavation and its sign beside the stairs.
 m.job('universitate · pavaj tactil și indicator pasaj',streetRect(-2046,68,8,16),[],function*(){
  const color='#c8bd89',x=-2047.92,z=62.15;
  m.box(x,ground(x,z)+.054,z,3.4,.014,.60,color);
  for(let i=0;i<17;i++)for(let j=0;j<3;j++){
   const xx=x-1.6+i*.20,zz=z-.20+j*.20;
   m.box(xx,ground(xx,zz)+.065,zz,.055,.009,.055,'#b2a979',true);
  }
  m.box(-2045.135,ground(-2045.135,z)+.054,z,2.17,.014,.60,color);
  for(const dz of[-.20,-.10,0,.10,.20])m.box(-2045.135,ground(-2045.135,z+dz)+.065,z+dz,2.13,.009,.026,'#b2a979',true);
  yield;
  // Low raised ribs follow the sidewalk slope without adding walking colliders.
  for(let zz=62.45;zz<74;zz+=.5){
   const xx=-2044.35;m.box(xx,ground(xx,zz)+.054,zz,.60,.014,.5,color);
   for(const dx of[-.20,-.10,0,.10,.20])m.box(xx+dx,ground(xx+dx,zz)+.065,zz,.026,.009,.46,'#b2a979',true);
   yield;
  }
  const sx=-2045.78,sz=60.82,y=ground(sx,sz);
  m.box(sx,y+1.20,sz,.065,2.40,.065,'#83918a',false,true);
  const f=m.facade([sx-.34,sz],[sx+.34,sz],y);
  f.panel(.34,2.44,0,.72,.72,.065,'#b6c0b9');f.panel(.34,2.44,.045,.66,.66,.018,'#34587c');
  // Own pictogram: stairs and descending pedestrian, no downloaded sign texture.
  for(let i=0;i<4;i++){f.panel(.14+i*.10,2.23+i*.08,.065,.115,.025,.01,'#e2e7d8');f.panel(.19+i*.10,2.27+i*.08,.065,.025,.10,.01,'#e2e7d8');}
  f.panel(.40,2.65,.065,.065,.065,.01,'#e2e7d8');f.panel(.39,2.54,.065,.035,.15,.01,'#e2e7d8');
  for(const [u,h]of[[.33,2.49],[.43,2.47],[.36,2.41],[.46,2.39]])f.panel(u,h,.065,.075,.025,.01,'#e2e7d8');
  yield;
 });
 // September 2025 panorama: cantilever traffic heads and crossing signs.
 // Posts stand off both continuous walking routes; vehicle behavior is unchanged.
 m.job('Ion Creangă · trecere semaforizată',streetRect(-2054,182,32,8),[],function*(){
  for(const [x,z,side]of[[-2066,180,1],[-2041,184,-1]]){
   const y=ground(x,z);m.box(x,y+2.9,z,.13,5.8,.13,'#8d9790',false,true);
   m.beam(new T.Vector3(x,y+5.75,z),new T.Vector3(x+side*8.0,y+5.75,z),.055,'#88958d',false);
   for(const [xx,hh]of[[x,2.5],[x+side*8,5.0]]){
    const f=m.facade([xx-.16,z],[xx+.16,z],y);f.panel(.16,hh,0,.31,.87,.15,'#35453e');
    for(let k=0;k<3;k++)f.panel(.16,hh+.26-k*.26,.10,.17,.17,.035,k===1?'#b8964a':'#4b5549');
   }
   const f=m.facade([x-.40,z+.08],[x+.40,z+.08],y);f.panel(.4,3.6,0,.78,.78,.06,'#c7cebf');f.panel(.4,3.6,.045,.70,.70,.025,'#3f6485');
   // Original geometry for the white triangle and pedestrian pictogram.
   const a=f.at(.13,.069),b=f.at(.67,.069),c=f.at(.40,.069),g=new T.BufferGeometry();
   g.setAttribute('position',new T.Float32BufferAttribute([a[0],y+3.33,a[1],b[0],y+3.33,b[1],c[0],y+3.89,c[1]],3));g.computeVertexNormals();m.put(g,'#dddccc');
   f.panel(.40,3.69,.08,.065,.065,.015,'#4a554f');f.panel(.40,3.57,.08,.033,.14,.015,'#4a554f');
   for(const [u,hh]of[[.33,3.52],[.46,3.52],[.34,3.43],[.46,3.43]])f.panel(u,hh,.08,.08,.025,.015,'#4a554f');
   yield;
  }
 });
 // Topaz's photographed concrete fins, recessed windows and orange retail base.
 const oldTopaz=boulevardBuildings.buildings.find(b=>b.id==='w41434947');
 const topaz=oldTopaz?{p:oldTopaz.rings[0][0],anchor:oldTopaz.anchor,height:oldTopaz.height}:undefined;
 if(topaz)m.job('Topaz · lamele verticale',topaz.p as XY[],[],function*(){const y=ground(...topaz.anchor as XY)+.12;for(const f of a.faces(topaz.p as XY[],y)){
  const p=f.at(f.len/2),q=f.at(f.len/2,1);if(q[0]<p[0]||f.len<30)continue;
  for(let u=.3;u<f.len;u+=3.2){f.panel(u,topaz.height/2,.28,.27,topaz.height,.60,'#c3c5b7');for(let row=1;row<8;row++)for(let k=0;k<3;k++)f.panel(u+1.55,row*3.5+1.05+k*.19,.32,2.4,.10,.12,'#9fa99e',true);yield;}
  for(let u=2;u<f.len;u+=4){f.panel(u,1.65,.29,3.55,3.1,.30,'#b78453');f.panel(u,1.65,.46,2.9,2.7,.035,'#4a6878',false,1);for(const side of[-1,1])f.panel(u+side*1.47,1.65,.49,.065,2.75,.08,'#3e535d');f.panel(u,2.1,.50,2.9,.06,.08,'#627a83');yield;}
  // Blue fascia on the south-eastern retail end visible in September 2025.
  f.panel(f.len*.88,3.2,.40,f.len*.24,.8,.45,'#326bab');f.label('TOPAZ',f.len*.18,topaz.height+.3,1.1,'#497b99',.5);
 }});
 for(const[x,z,h,r,needle]of (realm.trees as [number,number,number,number,boolean][]))m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.16,.27,h*.55,6);trunk.translate(x,y+h*.275,z);m.put(trunk,'#737362',false,true);
  if(needle){for(let k=0;k<3;k++){const g=new T.ConeGeometry(r*(1-k*.2),h*.48,8);g.translate(x,y+h*(.40+k*.18),z);m.put(g,'#426853');yield;}}
  else for(const[dx,dy,rr]of[[0,.72,r],[-r*.3,.77,r*.7],[r*.3,.86,r*.65]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.18,1);g.translate(x+dx,y+h*dy,z);m.put(g,'#68824d');yield;}
 });
 for(const o of realm.objects)m.job(o.type,streetRect(...o.p as XY,5,5),[],function*(){const[x,z]=o.p,y=ground(x,z);
  if(o.type==='bench'){
   m.box(x,y+.47,z,1.9,.12,.52,'#927354',false,true);m.box(x,y+.86,z+.26,1.9,.64,.10,'#927354',false,true);for(const dx of[-.72,.72])m.box(x+dx,y+.23,z,.07,.46,.45,'#425450');
  }else if(o.type==='waste_basket'){
   const g=new T.CylinderGeometry(.25,.23,.7,8);g.translate(x,y+.35,z);m.put(g,'#53685d',false,true);
  }else if(o.type==='picnic_table'){
   m.box(x,y+.74,z,.85,.10,.85,'#9a927b',false,true);m.box(x,y+.36,z,.15,.72,.15,'#55665b',false,true);for(const dx of[-.8,.8]){m.box(x+dx,y+.43,z,.4,.1,.4,'#9a927b',false,true);m.box(x+dx,y+.2,z,.09,.4,.09,'#55665b');}
  }else if(o.type==='street_lamp'){
   if('style'in o&&o.style==='road-double-arm'){
    const angle='angle'in o?Number(o.angle):0,ux=Math.cos(angle),uz=Math.sin(angle);m.box(x,y+4.5,z,.12,9,.12,'#9da7a0',false,true);
    for(const side of[-1,1]){const p=new T.Vector3(x+ux*side*1.7,y+9.4,z+uz*side*1.7);const curve=new T.QuadraticBezierCurve3(new T.Vector3(x,y+8.4,z),new T.Vector3(x+ux*side*.6,y+9.7,z+uz*side*.6),p),g=new T.TubeGeometry(curve,6,.045,4,false);m.put(g,'#9da7a0');m.box(p.x,p.y,p.z,.70,.14,.27,'#b9c3b2',false,false,-angle);}
   }else{m.box(x,y+3.4,z,.10,6.8,.10,'#909e96',false,true);for(const dx of[-.65,.65]){m.beam(new T.Vector3(x,y+6.5,z),new T.Vector3(x+dx,y+6.5,z),.045,'#889c8e');const g=new T.SphereGeometry(.27,8,6);g.translate(x+dx,y+6.65,z);m.put(g,'#c4cba2');}}
  }yield;
 });
 // Photographed clipped shrubs around the planted central rondo.
 m.job('rondou · arbuști și bordură',realm.island as XY[],[],function*(){const cx=-2081,cz=-5;for(let i=1;i<realm.island.length;i++){
  const p=realm.island[i-1],q=realm.island[i],len=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.ceil(len/2),angle=Math.atan2(-(q[1]-p[1]),q[0]-p[0]);
  for(let k=0;k<n;k++){const t=(k+.5)/n,x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t;m.box(x,ground(x,z)+.11,z,len/n,.15,.18,'#b7b9a5',false,false,angle);}yield;
  if(i%4===0){const dx=cx-p[0],dz=cz-p[1],ll=Math.hypot(dx,dz),x=p[0]+dx/ll*3,z=p[1]+dz/ll*3,g=new T.IcosahedronGeometry(1.3,1);g.scale(1,.65,1);g.translate(x,ground(x,z)+.7,z);m.put(g,'#517047');yield;}
 }
 for(const [x,z]of[[-2090,-14],[-2084,-20],[-2078,-25],[-2100,0],[-2073,5],[-2065,-4]]){for(let k=0;k<5;k++){const dx=Math.cos(k*1.256)*2,dz=Math.sin(k*1.256)*2,g=new T.IcosahedronGeometry(1.1,1);g.scale(1,.65,1);g.translate(x+dx,ground(x+dx,z+dz)+.65,z+dz);m.put(g,k%2?'#638048':'#7c8650');}yield;}
 // Remove the former invented lettering; planting geometry remains photo estimated.
 });
 m.job('rondou · marcaje',realm.roundabout as XY[],[],function*(){for(let i=1;i<realm.roundabout.length;i+=2){const p=realm.roundabout[i-1],q=realm.roundabout[i],len=Math.hypot(q[0]-p[0],q[1]-p[1]),angle=Math.atan2(-(q[1]-p[1]),q[0]-p[0]),x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;m.box(x,ground(x,z)+.065,z,Math.min(2.3,len),.006,.13,'#d4d5c3',false,false,angle);yield;}});
 const gardenTreeOverrides=addCantemirApproach(m);
 const continuationTreeOverrides=addIonCreangaLandscape(m,l);
 const campusTreeOwnership=addUpscCourtyard(m);
 const layers=[bodies,m,l,passage];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),excavations:cuts,treeOverrides:[...ionCreangaTreeOwnership,campusTreeOwnership,...(realm.trees as [number,number,number,number,boolean][]).map(([x,z])=>({x,z,height:0,radius:2,texture:0})),...continuationTreeOverrides,...gardenTreeOverrides],get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
