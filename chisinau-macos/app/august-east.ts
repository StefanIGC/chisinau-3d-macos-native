import * as T from 'three';
import realm from '../data/august-east.json';
import mapped from '../data/august-east-map.json';
import {streetMesh,streetRect as rect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** The three photographed anchors of 31 August east. Plans are mapped;
 * elevations and small street details are estimates documented in the manifest. */
export function createAugustEast(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'31 August est · arhitectură',ground,loaded),a=photoArchitecture(m);
 const l=landscapeLayer(scene,'31 August est · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const {solid,box,put,beam,facade}=m,trim='#d0cfc0',iron='#414b45';
 const feature=(id:string)=>mapped.features.find(f=>f.id===id)!;
 const low=(i:number)=>ground(...realm.stairs[i].start as XY)+.12;
 type Face=ReturnType<typeof facade>;
 function door(f:Face,u:number,bottom:number,w:number,h:number,color='#b1b8aa'){
  f.panel(u,bottom+h/2,.36,w,h,.025,'#465e60',false,1);
  for(const d of[-.5,0,.5])f.panel(u+d*w,bottom+h/2,.41,.07,h,.08,color);
  for(const hh of[bottom,bottom+h*.73,bottom+h])f.panel(u,hh,.41,w,.075,.08,color);
  f.panel(u+.16,bottom+1.1,.47,.055,.46,.07,'#a6b1a4',true);
 }
 const cnas=feature('w85741699');
 m.job('CTAS Centru · 31 August 87',cnas.p as XY[],[85741699],function*(){
  const y=low(0),h=4.25,p=cnas.p as XY[];
  solid(p,h+5,y-5,'#8f958b');solid(p,.17,y+h,'#a8ada1');
  a.roof(646.8,338.5,18.1,17.9,y+h+.17,2.4,'#596660');yield;
  for(const f of a.faces(p,y)){
   const mid=f.at(f.len/2),q=f.at(f.len/2,1),north=q[1]<mid[1]-.85,west=q[0]<mid[0]-.85;
   f.panel(f.len/2,.35,.065,f.len,.7,.13,'#979d91');
   f.panel(f.len/2,3.77,.095,f.len,.65,.19,trim);a.cornice(f,h,'#b7c0b3');
   if(north&&f.len>15){
    for(let i=0;i<5;i++){const u=2.5+i*2.82;f.window(u,2.07,1.24,2.27,trim,'#b6c0b4');yield;}
   }else if(west&&f.len>15){
    yield* a.windows(f,1,h,5,2.07,trim,'#b6c0b4');
    a.pediment(f,f.len/2,h+.12,7.1,2.03,y,'#68736b');
    const vent=new T.CircleGeometry(.27,12),p=f.at(f.len/2,.48),v=f.at(1),u=f.at(0);vent.rotateY(Math.atan2(-(v[1]-u[1]),v[0]-u[0]));vent.translate(p[0],y+h+1.06,p[1]);put(vent,'#36443c',true);
   }else if(f.len>5)yield* a.windows(f,1,h,Math.max(1,Math.round(f.len/3.5)),2.0,trim,'#b6c0b4');
   // Small limestone blocks break up the low rough plinth, not the windows.
   for(let u=.4;u<f.len;u+=.7){f.panel(u,.25,.145,.64,.29,.025,u%1.4<.7?'#878e82':'#a3a697',true);if(Math.round(u/.7)%12===0)yield;}
   yield;
  }
 });
 const minerva=feature('w67803023');
 m.job('Liceul Minerva · 31 August 50',minerva.p as XY[],[67803023],function*(){
  const y=ground(875,300)+.12,h=8.25,p=minerva.p as XY[];
  solid(p,h+5,y-5,'#aea787');solid(p,.20,y+h,'#646b5b');yield;
  // Separate low pitched roofs follow the three wings; courtyard is not filled.
  a.roof(849.25,269.9,17.2,60.8,y+h+.17,1.75,'#596452');
  a.roof(881.9,282.0,50.8,13.5,y+h+.17,1.65,'#596452');
  a.roof(900.3,289.1,14.8,21.8,y+h+.17,1.65,'#596452');
  for(const f of a.faces(p,y)){
   const q=f.at(f.len/2,1),p=f.at(f.len/2),front=q[1]>p[1]+.8;
   f.panel(f.len/2,2.02,.08,f.len,3.65,.16,'#c9c7b4');
   f.panel(f.len/2,.30,.10,f.len,.6,.2,'#979780');
   for(let yy=.75;yy<3.75;yy+=.61)f.panel(f.len/2,yy,.175,f.len,.027,.027,'#919883',true);
   a.cornice(f,h,'#7a7f68');
   if(f.len>4){
    const n=Math.max(1,Math.round(f.len/3.5));
    for(let i=0;i<n;i++){
     const u=(i+.5)*f.len/n;
     f.window(u,2.19,1.3,2.36,'#d0ceba','#775c42');
     f.window(u,6.09,1.28,2.4,'#9e9b7d','#705a42');
     if(front&&f.len<16){a.arch(f,u,1.03,1.50,3.10,y,'#9b9c84','#d2d0bf');f.window(u,2.19,1.3,2.36,'#d0ceba','#775c42',.14);}
     yield;
    }
   }
   if(front&&f.len>25){const u=f.len/2;door(f,u,.05,1.65,2.75,'#655944');f.label('LICEUL TEORETIC MINERVA',u,4.18,.24,'#345b72',.42);}
   yield;
  }
 });
 const amt=feature('w26426035');
 m.job('AMT Centru · 31 August 63',amt.p as XY[],[26426035],function*(){
  const y=low(1),h=23.0,p=amt.p as XY[];
  solid(p,h+5,y-5,'#b4b3a4');solid(p,.19,y+h,'#879184');yield;
  for(const f of a.faces(p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]<p[1]-.85,entry=front&&p[0]>867&&p[0]<896&&p[1]<334;
   f.panel(f.len/2,.7,.09,f.len,1.4,.18,'#aaa38c');
   const bays=Math.max(1,Math.round(f.len/3.15)),bay=f.len/bays;
   if(f.len>4){
    for(let row=0;row<6;row++){
     const hh=5.50+row*2.82;
     for(let i=0;i<bays;i++){
      const u=(i+.5)*bay,wide=front&&i%4<2;
      f.window(u,hh,Math.min(bay-.5,wide?2.45:1.6),1.95,'#c2c4b7','#bac3b8',wide?.12:0);
      if(wide){f.panel(u,hh-1.22,.22,bay, .44,.44,'#a4ad9f');f.panel(u+bay/2-.09,hh,.25,.18,2.82,.50,'#c1c5b8');}
      else if(front)f.panel(u,hh-1.15,.12,1.57,.31,.24,'#958676');
      if((i+row)%8===0)f.panel(u+.95,hh-.88,.53,.66,.43,.54,'#a3afa3',true);
      if(i%5===4)yield;
     }yield;
    }
   }
   if(front&&f.len>8){
    f.panel(f.len/2,4.15,.08,f.len,1.0,.16,'#a3ada4');
    for(let i=0;i<bays;i++){
     const u=(i+.5)*bay;
     f.window(u,2.95,Math.min(bay-.4,2.7),2.10,'#b9c1b6','#b8c2b5');yield;
    }
    if(entry){
     const u=f.len/2+(p[0]-879.5);
     door(f,u,1.44,2.15,2.7);f.panel(u,4.72,1.07,18.3,.82,2.14,'#9fa99f');
     f.label('ASOCIAȚIA MEDICALĂ TERITORIALĂ CENTRU',u,4.76,.35,'#2e658b',2.15);
     for(const d of[-1,1]){f.panel(u+d*2.02,2.87,.46,1.16,2.89,.92,'#bdb9a3');f.panel(u+d*2.02,3.36,.94,.69,.47,.035,'#c3c9bb',true);}
    }
   }
   yield;
  }
 });
 for(const [i,s]of realm.stairs.entries())m.job(s.name+' · acces',rect((s.start[0]+s.end[0])/2,(s.start[1]+s.end[1])/2,s.width+1,Math.abs(s.end[1]-s.start[1])+1),[],function*(){
  const base=low(i),tread=(s.end[1]-s.start[1]-s.landing)/s.count;
  for(let k=0;k<s.count;k++){const top=base+(k+1)*s.rise/s.count;box(s.start[0],(top+base-.25)/2,s.start[1]+(k+.5)*tread,s.width,top-base+.25,tread,s.color,false,true);yield;}
  box(s.end[0],base+s.rise-.17,s.end[1]-s.landing/2,s.width,.34,s.landing,s.color,false,true);
  if(i===1)for(const side of[-1,1]){
   const x=s.start[0]+side*(s.width/2-.13),zs=[s.start[1],s.end[1]-s.landing,s.end[1]-.1];
   for(let j=0;j<zs.length;j++){const top=j?base+s.rise:base;beam(new T.Vector3(x,top,zs[j]),new T.Vector3(x,top+.94,zs[j]),.026,'#a7b3a5');if(j)for(const hh of[.40,.94])beam(new T.Vector3(x,(j===1?base:base+s.rise)+hh,zs[j-1]),new T.Vector3(x,base+s.rise+hh,zs[j]),.025,'#a7b3a5');}
  }
 });
 for(const r of realm.ramps)m.job(realm.stairs[r.stair].name+' · rampă',r.rings[0] as XY[],[],function*(){
  const start=ground(...r.start as XY)+.12,top=low(r.stair)+realm.stairs[r.stair].rise;
  const h=(x:number)=>T.MathUtils.lerp(start,top,T.MathUtils.clamp((x-r.start[0])/(r.end[0]-r.start[0]),0,1));
  yield* m.surfaceStaged(r.rings[0] as XY[],(x)=>h(x),'#a5a68f',true);
  if(r.stair===1)for(const side of[-1,1]){const z=r.start[1]+side*r.width/2;for(let j=0;j<=8;j++){const x=T.MathUtils.lerp(r.start[0],r.end[0],j/8);beam(new T.Vector3(x,h(x),z),new T.Vector3(x,h(x)+.94,z),.024,'#a7b3a5');}for(const hh of[.4,.94])beam(new T.Vector3(r.start[0],start+hh,z),new T.Vector3(r.end[0],top+hh,z),.026,'#a7b3a5');}
 });
 const pavement=(x:number,z:number)=>{
  let y=ground(x,z)+.12;
  for(let i=0;i<realm.stairs.length;i++){const s=realm.stairs[i],w=Math.max(0,1-Math.max(0,Math.abs(x-s.start[0])-s.width/2))*Math.max(0,1-Math.abs(z-s.start[1])/1.1);y+=(low(i)-y)*w;}
  return y;
 };
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,p.raised?pavement:(x,z)=>ground(x,z)+.035,true);},c.coverage);
 l.job('CTAS · stâlpișori și jardiniere',641,332,function*(){
  for(const[x,z]of[[636.4,326.4],[641.4,326.5],[646.4,326.5],[633.8,331.8],[633.9,337.3],[634.1,342.8]]){const y=ground(x,z)+.12;l.cylinder(x,y+.37,z,.041,.048,.74,'#a4afa3',true,7);l.cylinder(x,y+.65,z,.047,.047,.07,'#944d42',true,7);yield;}
  for(const[x,z]of[[640.2,329.2],[645.2,329.2]]){const y=ground(x,z)+.12;l.box(x,y+.29,z,1.4,.58,.7,'#6f7e71',true,true);l.box(x,y+.587,z,1.23,.015,.55,'#575c43',true);l.shrub(x,y+.59,z,.58,.24,.23,'#526e40',true);yield;}
 });
 l.job('AMT · jardiniere și vegetație',879,330,function*(){
  for(const x of[871.5,887.5]){const y=low(1);l.box(x,y+.43,329.1,3.35,.86,2.0,'#a69e81',false,true);l.box(x,y+.88,329.1,3.45,.06,2.10,'#b6af94',true);l.shrub(x,y+.92,329.1,1.35,.77,.75,'#4e6544');yield;}
  for(const x of[861,868,890,898,905]){const z=325.6,y=ground(x,z)+.12;l.box(x,y+.29,z,.7,.58,.7,'#a49f8b',true,true);l.shrub(x,y+.58,z,.29,.28,.29,'#4f6841',true);yield;}
 });
 for(let k=0;k<realm.separators.length;k+=12){const group=realm.separators.slice(k,k+12);m.job('separatoare pistă '+k,group as XY[],[],function*(){for(const[x,z]of group){const y=ground(x,z)+.035;box(x,y+.038,z,.33,.075,.32,'#39453e');box(x,y+.22,z,.065,.4,.065,'#354039',true);for(const h of[.18,.32])box(x,y+h,z,.07,.065,.07,'#b6a04a',true);yield;}});}
 const ctasOwner=m.replacements.find(r=>r.id===85741699);if(ctasOwner)Object.assign(ctasOwner,{footprints:[[cnas.p,...(cnas.holes??[])]]});
 return{objects:[...m.objects,...l.objects],collisionObjects:[...m.collisionObjects,...l.collisionObjects],replacements:m.replacements,
  get ready(){return m.ready&&l.ready;},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return m.readyNear(x,z,r)&&l.readyNear(x,z,r);},update(camera:T.PerspectiveCamera,now:number){m.update(camera,now);l.update(camera,now);},dispose(){m.dispose();l.dispose();}};
}
