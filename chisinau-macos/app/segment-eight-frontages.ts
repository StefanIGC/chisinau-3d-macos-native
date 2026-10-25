import * as T from 'three';
import {feature,polygonContains,type XY} from './city-layout';
import {streetMesh} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {photoFrontageDetails} from './photo-frontage-details';
import parts from '../data/commercial-building-parts.json';

/** Ismail → Piața ONU. Preserve the authored no.6 slab; give its podium,
 * the opposite frontage and the end landmarks their own non-overlapping bodies. */
export function createSegmentEightFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Bulevard · segmentul 8',ground,loaded);
 const {job,solid,box,put,facade,beam}=mesh;
 const {faces,cornice,arch,pediment}=photoArchitecture(mesh);
 const {C,flat,window,windows,parapet,rustication,shopfronts}=photoFrontageDetails(mesh);
 const north=feature('w48681172'),northSlab=feature('w87155334');
 job('6 · galeria comercială de la parter',north.p,[48681172],function*(){
  const y=ground(1554,-50)+.14,h=5.0;
  for(const b of parts.north6Podium){
   solid(b.p as XY[],h+5,y-5,'#aaa997',true,b.holes as XY[][]);solid(b.p as XY[],.16,y+h,C.roof,true,b.holes as XY[][]);yield;
   for(const f of faces(b.p as XY[],y)){
    if(f.len<2.5||polygonContains(f.at(f.len/2,.4),northSlab.p))continue;
    yield* shopfronts(f,Math.max(1,Math.round(f.len/4.5)),'#777466');f.panel(f.len/2,h-.1,.16,f.len,.36,.40,'#b8b8a6');
    for(let u=.2;u<f.len;u+=4.5){f.panel(u,2.2,.28,.22,4.4,.5,'#bcbba8');yield;}
   }
  }
 });
 const south=feature('w48681174'),westBase=feature('w91646503'),eastBase=feature('w91646499');
 job('3 · blocul cu balcoane perechi',south.p,[48681174],function*(){
  const y=ground(1559,49.8)+.12,h=28.3,stone='#b8b49c',trim='#c4c5b4';
  solid(south.p,h+6,y-6,stone,true);solid(south.p,.18,y+h,C.roof,true);yield;
  for(const f of faces(south.p,y)){
   if(f.len<3)continue;
   const q=f.at(f.len/2),o=f.at(f.len/2,1),front=q[1]<51&&o[1]<q[1],paired=front&&f.len>12&&f.len<20,bays=Math.max(1,Math.round(f.len/3.45));
   if(paired){
    for(let row=0;row<9;row++){
     const floor=.32+row*3.08;
     for(const side of[-1,1]){
      const u=f.len/2+side*1.85,w=3.35;
      const p:XY[]=[[-w/2,-.1],[w/2,-.1],[w/2,.72],[w/2-.16,1.00],[w/2-.45,1.14],[-w/2+.45,1.14],[-w/2+.16,1.00],[-w/2,.72],[-w/2,-.1]].map(([du,v])=>f.at(u+du,v));
      solid(p,.16,y+floor,trim,true);solid(p,.86,y+floor+.16,(row+Math.round(q[0]))%11===0?'#aa8870':'#b9bcac',false);
      f.panel(u,floor+1.91,1.06,w-.28,1.66,.03,row%4?'#728580':'#56685f',false,1);
      for(const du of[-w*.31,0,w*.31])flat(f,u+du,floor+1.91,1.13,.075,1.68,row%5?'#b9c1b5':'#7a7664');
      f.panel(u,floor+2.79,.71,w+.1,.12,1.1,trim);
     }
     for(const u of[2.1,f.len-2.1])window(f,u,floor+1.90,1.85,1.61,stone,'#b9c2b6');yield;
    }
   }else yield* windows(f,9,bays,2.0,3.08,1.75,1.68,(_,i)=>f.len/bays<2.1&&i%2===1);
   // Large stone blocks read close up; no box per mortar joint.
   if(front){for(let yy=.5;yy<h;yy+=.63){flat(f,f.len/2,yy,.07,f.len,.022,'#9d9d87');yield;}}
   f.panel(f.len/2,h-.12,.16,f.len,.25,.38,trim);yield;
  }
 });
 job('3 · parterele comerciale și galeria Brâncuși',[[1469.8,33.8],[1653.6,33.8],[1653.6,63.0],[1469.8,63.0],[1469.8,33.8]],[91646503,91646499],function*(){
  const y=ground(1559,49.8)+.12,h=4.65,stone='#b2ae95';
  for(const [blocks,west]of[[parts.south3West,true],[parts.south3East,false]] as const){
   for(const b of blocks){
    solid(b.p as XY[],h+5,y-5,stone,true,b.holes as XY[][]);solid(b.p as XY[],.16,y+h,C.roof,true,b.holes as XY[][]);yield;
    for(const f of faces(b.p as XY[],y)){
     if(f.len<2.2||polygonContains(f.at(f.len/2,.5),south.p))continue;
     const q=f.at(f.len/2),o=f.at(f.len/2,1),front=o[1]<q[1]&&q[1]<41;
     if(front&&!west){
      // Gallery's stone frontage is mostly closed, unlike neighbouring shops.
      for(let yy=.3;yy<h;yy+=.64){flat(f,f.len/2,yy,.10,f.len,.024,'#8e9480');yield;}
      for(let u=6;u<f.len-4;u+=17.0){f.panel(u,2.7,.23,2.7,5.4,.42,'#b9b6a2');f.panel(u,3.0,.48,.62,1.90,.14,'#6e7461',true);yield;}
      if(f.len>15)f.label('CONSTANTIN BRANCUSI',f.len*.40,3.6,.45,'#807f6b');
     }else yield* shopfronts(f,Math.max(1,Math.round(f.len/4.6)),'#686e62');
     f.panel(f.len/2,h+.03,.24,f.len,.18,.52,'#777f71');yield;
    }
   }
  }
 });
 const hotel=feature('w1343695926'),annex=feature('w1343695927');
 job('4 · Hotel Național, fațada documentată în 2026',hotel.p,[1343695926],function*(){
  const y=ground(1684,-84.1)+.10,h=49.6,concrete='#a6a696',edge='#b4b6a6';
  solid(hotel.p,h+6,y-6,concrete,true);solid(hotel.p,.18,y+h,C.roof,true);yield;
  for(const f of faces(hotel.p,y)){
   if(f.len<5)continue;
   const q=f.at(f.len/2),o=f.at(f.len/2,1),front=o[1]>q[1]&&q[1]>-86,back=o[1]<q[1]&&q[1]<-108;
   if(front||back){
    const bays=Math.max(1,Math.round(f.len/3.2)),pitch=f.len/bays;
    for(let row=0;row<14;row++){
     const yy=6.1+row*3.0;
     for(let i=0;i<bays;i++){
      const u=(i+.5)*pitch;f.panel(u,yy+1.20,.21,pitch-.23,2.38,.03,'#46534e',false,1);
      const rail=front?(u/f.len<.36?'#618285':u/f.len<.70?'#b6a36e':'#a17569'):'#929a87';
      f.panel(u,yy+.40,.79,pitch-.12,.52,.23,rail);f.panel(u,yy-.04,.48,pitch+.02,.18,1.10,edge);
      f.panel(i*pitch,yy+1.27,.67,.18,2.8,.70,concrete);if(i%6===5)yield;
     }yield;
    }
    f.panel(f.len/2,3.0,.23,f.len-.4,2.8,.03,'#4a5850',false,1);f.panel(f.len/2,4.6,.68,f.len,.82,1.45,'#b7b8a6');
    if(front&&f.len>20){f.label('NATIONAL',f.len*.53,4.32,1.4,'#ad8c82',1.48);f.panel(f.len*.58,h+1.1,.30,18.0,2.2,1.0,'#b2ad9a');f.label('NATIONAL',f.len*.58,h+.49,1.95,'#ae9086',.84);}
   }else{for(let yy=2;yy<h;yy+=3)flat(f,f.len/2,yy,.09,f.len,.035,'#909887');}
   yield;
  }
 });
 job('Național · corpul jos și capătul rotunjit',annex.p,[1343695927],function*(){
  const y=ground(1745,-72)+.10,h=7.4;
  solid(annex.p,h+5,y-5,'#aeafa0',true);solid(annex.p,.17,y+h,C.roof,true);yield;
  for(const f of faces(annex.p,y)){
   if(f.len<2.4)continue;
   const bays=Math.max(1,Math.round(f.len/4.2));
   for(let row=0;row<2;row++){for(let i=0;i<bays;i++)f.panel((i+.5)*f.len/bays,1.85+row*3.5,.22,Math.min(2.9,f.len/bays-.45),2.35,.03,'#4a5650',false,1);yield;}
   f.panel(f.len/2,3.68,.24,f.len,.36,.49,'#bcc0b0');f.panel(f.len/2,h-.1,.22,f.len,.27,.45,'#bcc0b0');yield;
  }
 });
 const academy=feature('w38591267');
 job('1 · Academia de Științe a Moldovei',academy.p,[38591267],function*(){
  const y=ground(1757,42.0)+.12,h=21.0,stone='#b9b6a2',trim='#cbc7b3',red='#784b40';
  solid(academy.p,h+5,y-5,stone,true);solid(academy.p,.18,y+h,C.roof,true);yield;
  for(const f of faces(academy.p,y)){
   if(f.len<2.7)continue;
   const q=f.at(f.len/2),o=f.at(f.len/2,1),front=o[1]<q[1]&&q[1]<46,bays=Math.max(1,Math.round(f.len/3.48));
   cornice(f,h,trim);
   if(front){
    yield* rustication(f,7.85,stone);
    // Restore the red plinth in front of the taller stone rustication.
    f.panel(f.len/2,2.0,.16,f.len,4.0,.24,red);
    for(let yy=.55;yy<4;yy+=.60)flat(f,f.len/2,yy,.29,f.len,.04,'#6f5140');
    yield* windows(f,4,bays,2.28,4.04,1.78,2.62,(r,i)=>r<2&&Math.abs((i+.5)*f.len/bays-f.len/2)<6.2);
    for(let i=0;i<bays;i++){
     const u=(i+.5)*f.len/bays;f.panel(u,18.7,.14,f.len/bays-.25,3.75,.24,'#a87c63');arch(f,u,17.13,1.8,2.86,y,C.glass,trim);
     f.panel(i*f.len/bays,13.1,.24,.55,10.12,.4,trim);
     f.panel(i*f.len/bays,17.60,.35,1.1,.46,.57,trim);
     for(const side of[-1,1]){const p=f.at(i*f.len/bays+side*.28,.57),g=new T.SphereGeometry(.19,6,4);g.scale(1,1.3,.8);g.translate(p[0],y+17.36,p[1]);put(g,'#bdb9a5',true);}
     yield;
    }
    yield* parapet(f,h+.25);
    // Projecting three-door entrance with characteristic octagonal upper lights.
    const center=f.len/2;
    for(const du of[-4.3,0,4.3]){
     f.panel(center+du,4.45,.48,4.2,8.9,.95,red);
     f.panel(center+du,2.12,1.01,2.5,3.36,.03,'#594438',false,1);
     const at=f.at(center+du,1.04),a=f.at(0),b=f.at(1),angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);
     const g=new T.CircleGeometry(.72,8);g.rotateY(angle);g.translate(at[0],y+6.66,at[1]);put(g,'#657872',false,false,1);
     const ring=new T.TorusGeometry(.79,.09,4,8);ring.rotateY(angle);ring.translate(at[0],y+6.66,at[1]);put(ring,trim,true);
     f.panel(center+du,8.98,.59,4.50,.26,1.25,'#755740');yield;
    }
    f.label('ACADEMIA DE STIINTE',center,4.26,.37,'#c2b69b',1.06);
    f.panel(center,h+1.33,.15,7.2,2.2,.46,trim);
    const badge=f.at(center,.42),g=new T.CircleGeometry(.85,24);g.rotateY(Math.PI);g.translate(badge[0],y+h+1.31,badge[1]);put(g,'#737c6a',true);
   }else yield* windows(f,5,bays,2.3,4.04,1.55,2.4);
   yield;
  }
  for(let i=0;i<6;i++){const z=42.2+i*.34;solid([[1750.5,z],[1763.5,z],[1763.5,44.7],[1750.5,44.7]],(i+1)*.14+.16,ground(1757,42.2)+.015-.16,'#7c7b6a',true);yield;}
 });
 return mesh;
}
