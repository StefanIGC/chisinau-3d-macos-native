import * as T from 'three';
import realm from '../data/dosoftei-sector.json';
import {streetMesh,streetRect as rect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import {feature,type XY} from './city-layout';

/** Dosoftei, Sfatul Țării–Bodoni, with the Maria Cebotari / Opera connection.
 * Photo-supported exteriors on exact mapped footprints. See reference limits
 * in docs/dosoftei-sector-references.md. No runtime polygon work or image fetch. */
export function createDosofteiSector(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Dosoftei · arhitectură',ground,loaded),a=photoArchitecture(m);
 const l=landscapeLayer(scene,'Dosoftei · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const {solid,box,facade,put,beam}=m;
 const cream='#c0b9a3',trim='#c7c2ae',terracotta='#a07759',glass='#50686c',iron='#35423e',brown='#655143';
 type Face=ReturnType<typeof facade>;
 const stairLow=(i:number)=>ground(...realm.stairs[i].start as XY)+.12;
 const along=(f:Face,x:number,z:number)=>{const p=f.at(0),q=f.at(1);return(x-p[0])*(q[0]-p[0])+(z-p[1])*(q[1]-p[1]);};
 function* railing(f:Face,u:number,width:number,bottom:number,height=1.0,offset=.7,scrolls=false){
  for(const h of[bottom,bottom+height])f.panel(u,h,offset,width,.045,.04,iron,true);
  for(let t=-width/2;t<=width/2;t+=.22){f.panel(u+t,bottom+height/2,offset,.026,height,.032,iron,true);if(Math.round((t+width/2)/.22)%12===11)yield;}
  if(scrolls)for(let t=-width/2+.29;t<width/2;t+=.56){
   const p=f.at(u+t,offset),d=f.at(1),o=f.at(0),angle=Math.atan2(-(d[1]-o[1]),d[0]-o[0]);
   for(const hh of[bottom+.30,bottom+.72]){const g=new T.TorusGeometry(.19,.016,3,12);g.rotateY(angle);g.translate(p[0],f.y+hh,p[1]);put(g,iron,true);}yield;
  }
 }
 function glassDoor(f:Face,u:number,bottom:number,width:number,height:number,frame=brown){
  f.panel(u,bottom+height/2,.33,width,height,.03,glass,false,1);
  for(const q of[-.5,0,.5])f.panel(u+q*width,bottom+height/2,.40,.075,height,.08,frame);
  for(const h of[bottom,bottom+height*.76,bottom+height])f.panel(u,h,.41,width+.10,.09,.10,frame);
  f.panel(u+.18,bottom+1.05,.47,.035,.40,.055,'#adae9b',true);
 }
 function address(f:Face,label:string,u:number){f.panel(u,2.3,.32,.48,.33,.04,'#6b746b');f.label(label,u,2.2,.20,trim,.36);}

 const school=feature('w27616541');
 m.job('53 · Liceul Spiru Haret',school.p,[27616541],function*(){
  const y=stairLow(0),h=15.65;
  solid(school.p,h+5,y-5,cream,true,school.holes);solid(school.p,.18,y+h,'#687064');yield;
  for(const f of a.faces(school.p,y)){
   if(f.len<3)continue;
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[0]>p[0]+.9;
   f.panel(f.len/2,-2.0,.023,f.len,4.0,.046,'#8c8877');
   f.panel(f.len/2,1.06,.10,f.len,2.12,.20,'#86674f');
   f.panel(f.len/2,2.15,.16,f.len,.21,.32,'#ae967b');
   f.panel(f.len/2,5.03,.12,f.len,.16,.24,trim);
   f.panel(f.len/2,15.42,.12,f.len,.20,.24,trim);
   if(front){
    const bays=Math.max(1,Math.round(f.len/4.8));
    for(let i=0;i<bays;i++){
     const u=(i+.5)*f.len/bays,at=f.at(u),entry=Math.abs(at[1]+161.8)<4.1;
     for(const v of[-1,1])f.panel(u+v*1.30,10.27,.12,.43,10.6,.24,terracotta);
     for(const h of[5.0,15.5])f.panel(u,h,.12,3.02,.25,.24,terracotta);
     if(!entry){f.window(u,1.02,1.52,1.30,trim,'#bcbfb0');f.window(u,3.72,1.52,1.94,trim,'#bcbfb0');}
     for(const h of[6.9,10.15,13.4])f.window(u,h,2.02,2.15,trim,'#bcbfb0');
     yield;
    }
   }else if(f.len>25){yield* a.windows(f,5,h,Math.round(f.len/5),1.0,trim,'#a0a89e');}
   else if(p[1]<-199){
    // The northern end wall is mostly solid, with the photographed terracotta
    // stripes. Do not populate it with the generic all-over window grid.
    for(const u of[f.len*.20,f.len*.33,f.len*.72,f.len*.85])f.panel(u,8.1,.07,.68,14.6,.14,terracotta);
   }
   yield;
  }
  const front=facade([-447.5,-155.7],[-447.34,-168.0],y),u=6.1;
  for(const off of[-1.35,1.35]){
   a.arch(front,u+off,1.96,1.85,3.25,y,brown,trim,1);
   for(const hh of[2.6,3.6])front.panel(u+off,hh,.43,1.35,.42,.075,'#84654b',true);
  }
  // White square supports and pale soffit, green edge as in the entrance photo.
  for(const z of[-165.05,-158.55])box(-442.9,y+2.55,z,.30,5.1,.30,trim,false,true);
  box(-444.85,y+5.24,-161.8,5.5,.30,7.1,trim);
  box(-444.85,y+5.43,-161.8,5.62,.09,7.2,'#3e7356');
  const sign=facade([-442.02,-158.25],[-442.02,-165.35],y);
  sign.label('LICEUL SPIRU HARET',3.55,5.10,.28,'#367556',.03);
  for(const z of[-165,-158.6]){
   const end=new T.Vector3(-446.9,y+2.94,z),start=new T.Vector3(-441.7,y+.98,z);
   beam(start,end,.038,iron,false);
   for(let i=0;i<7;i++){const t=i/6,x=start.x+(end.x-start.x)*t,base=y+t*1.96;box(x,base+.5,z,.055,1,.055,iron,true);}
  }
  yield;
  // Low posts follow the photographed school frontage, with generous gaps at
  // the public entrance and drive. No speculative bins or shelters are added.
  for(let z=-174;z<-120;z+=3.4){if(Math.abs(z+161.8)<4.5)continue;const x=-439.5,base=ground(x,z)+.12;box(x,base+.36,z,.09,.72,.09,iron,true);yield;}
 });

 const intact=feature('w96301030');
 m.job('55 · Cebotari',intact.p,[96301030],function*(){
  const y=stairLow(3),h=11.15;
  solid(intact.p,h+5,y-5,cream,true,intact.holes);a.roof(-445.89,-239.69,19.15,17.45,y+h,2.75,'#735b49');yield;
  for(const f of a.faces(intact.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[0]>p[0]+.9;
   f.panel(f.len/2,.30,.1,f.len,.6,.2,'#626a65');a.cornice(f,h,trim);
   const bays=front?3:Math.max(2,Math.round(f.len/4.2));
   for(let i=0;i<bays;i++){
    const u=(i+.5)*f.len/bays,center=front&&i===1;
    for(const hh of[2.2,5.85,9.15]){
     if(center&&hh===2.2)continue;
     f.panel(u,hh,.09,3.15,2.75,.18,'#887664');
     f.window(u,hh,2.43,2.13,trim,'#565950');
    }
    if(center){glassDoor(f,u,.70,2.25,2.83);f.panel(u,4.37,.82,3.5,.23,1.64,trim);yield* railing(f,u,3.2,4.5,.91,1.57);}
    yield;
   }
   if(front){
    f.panel(f.len/2,3.66,.29,f.len,.78,.56,'#a63835');
    f.label('INTACT',f.len/2,3.39,.49,'#d4d0bc',.59);
    for(const du of[-1.56,1.56]){const p=f.at(f.len/2+du,1.25);a.column(p[0],p[1],y+.70,2.61,.24,trim,true);}
    address(f,'55',f.len-.85);
   }
   yield;
  }
  // A small gabled attic facing Cebotari; full roof depth remains estimated.
  const f=facade([-436.48,-231.19],[-436.49,-248.19],y);
  a.pediment(f,f.len/2,11.13,7.7,2.6,y,cream);f.window(f.len/2,11.86,1.1,1.30,trim,brown);
 });

 const dos112=feature('w696653322');
 m.job('112 · fațada cu balcoane',dos112.p,[696653322],function*(){
  const y=stairLow(1),h=16.1;
  solid(dos112.p,h+5,y-5,'#bab49f',true,dos112.holes);solid(dos112.p,.18,y+h,'#71786c');yield;
  for(const f of a.faces(dos112.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]>p[1]+.9;
   f.panel(f.len/2,.4,.10,f.len,.8,.20,'#8c8676');
   for(const h of[4.84,8.58,12.3,15.85])f.panel(f.len/2,h,.16,f.len,.20,.32,trim);
   if(front){
    const doorU=[along(f,-477.7,-232.9),along(f,-468.2,-232.9)];
    for(const u of doorU){
     glassDoor(f,u,.98,2.08,3.35);f.panel(u,4.5,.25,2.80,.31,.50,trim);
     for(const off of[-1.34,1.34])f.panel(u+off,2.72,.18,.30,3.6,.36,trim);
    }
    for(const u of[.7,f.len/2,f.len-1.3]){
     const w=u===f.len/2?4.5:1.5;f.panel(u,2.65,.27,w,3.35,.03,glass,false,1);
     for(const side of[-1,1])f.panel(u+side*w/2,2.65,.36,.075,3.43,.08,brown);
    }
    for(let row=0;row<3;row++){
     const yy=6.66+row*3.74;
     for(let i=0;i<4;i++){
      const u=(i+.5)*f.len/4;f.window(u,yy,1.74,2.30,trim,brown);
      f.panel(u,yy+1.42,.18,2.25,.22,.36,trim);f.panel(u,yy-1.39,.15,2.15,.17,.30,trim);
      if(i===0||i===2){
       f.panel(u,yy-1.35,.75,3.55,.25,1.5,trim);
       yield* railing(f,u,3.35,yy-1.19,.94,1.48,true);
      }
      yield;
     }
    }
    for(let h=1.2;h<4.8;h+=.45)f.panel(f.len/2,h,.021,f.len,.022,.03,'#9d9989',true);
    address(f,'112',f.len-.6);
   }else yield* a.windows(f,4,h,Math.max(2,Math.round(f.len/4.2)),2.7,trim,brown);
   a.cornice(f,h,trim);yield;
  }
 });

 const kindergarten=feature('w96301031');
 m.job('26 · grădinița',kindergarten.p,[96301031],function*(){
  const y=ground(-415.3,-231.1)+.12,h=4.15;
  solid(kindergarten.p,h+4,y-4,'#c1c0ae',true,kindergarten.holes);
  a.roof(-399.7,-241.6,32.7,18.15,y+h,1.7,'#864f4b');yield;
  for(const f of a.faces(kindergarten.p,y)){
   f.panel(f.len/2,.27,.07,f.len,.54,.14,'#7f897c');
   yield* a.windows(f,1,h,Math.max(2,Math.round(f.len/4.1)),2.1,'#c9ccbc','#b6c0b5');
   a.cornice(f,h,'#c1c1af');yield;
  }
 });

 const dos110=feature('w164959244');
 m.job('110 · front istoric',dos110.p,[164959244],function*(){
  const y=stairLow(4),h=4.55;
  solid(dos110.p,h+4,y-4,cream,true,dos110.holes);
  a.roof(-363.9,-239.1,18.35,17.2,y+h,1.85,'#95634a');yield;
  for(const f of a.faces(dos110.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]>p[1]+.9;
   f.panel(f.len/2,.24,.10,f.len,.48,.20,'#807c68');a.cornice(f,h,trim);
   if(front){
    const u=along(f,-368.5,-230.72);
    glassDoor(f,u,.42,1.75,2.80,'#927146');a.pediment(f,u,4.58,3.9,.87,y,trim);
    for(const off of[-1.35,1.35])f.panel(u+off,2.47,.17,.26,4.0,.34,trim);
    const start=f.at(u-1.15,.40),end=f.at(u+1.15,.40);
    const canopy=new T.CylinderGeometry(1.23,1.23,1.25,12,1,true,0,Math.PI);
    canopy.rotateZ(Math.PI/2);canopy.rotateY(Math.PI/2);canopy.scale(1,.40,1);canopy.translate((start[0]+end[0])/2,y+3.48,p[1]+.87);put(canopy,'#97846b');
    f.window(1.35,2.18,1.35,2.22,trim,'#927146');
    // The reference's removable terrace is represented by its opaque awning
    // and low screens. No historical restaurant name is asserted as current.
    const center=f.at(12.25,1.00);box(center[0],y+3.58,center[1],8.25,.13,1.86,'#b5b09d');
    f.panel(12.25,.65,1.87,8.25,1.03,.14,'#767a6c');
    for(const u of[8.15,12.25,16.35])f.panel(u,1.99,1.84,.065,3.18,.065,'#9ba496');
    address(f,'110',f.len-.58);
   }else yield* a.windows(f,1,h,Math.max(2,Math.round(f.len/4)),2.1,trim,brown);
   yield;
  }
 });

 // Physical treads are independent of distant decoration visibility.
 realm.stairs.forEach((s,i)=>m.job(s.name+' · trepte',rect((s.start[0]+s.end[0])/2,(s.start[1]+s.end[1])/2,8,8),[],function*(){
  const low=stairLow(i),dx=s.end[0]-s.start[0],dz=s.end[1]-s.start[1],len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
  for(let k=0;k<s.count;k++){
   const t=(k+.5)/s.count,top=low+(k+1)*s.rise/s.count;
   box(s.start[0]+dx*t,(top+low-.3)/2,s.start[1]+dz*t,s.width,top-low+.3,len/s.count,s.color,false,true,angle);yield;
  }
 }));
 const pavement=(x:number,z:number)=>{
  let top=ground(x,z)+.12;
  // Small aprons join flat photo-model stairs to the real sloping terrain.
  for(let i=0;i<realm.stairs.length;i++){
   const s=realm.stairs[i],dx=s.end[0]-s.start[0],dz=s.end[1]-s.start[1],len=Math.hypot(dx,dz);
   const along=((x-s.start[0])*dx+(z-s.start[1])*dz)/len;
   const across=Math.abs(((x-s.start[0])*dz-(z-s.start[1])*dx)/len);
   const w=Math.max(0,1-Math.max(0,across-s.width/2)/.7)*Math.max(0,1-Math.abs(along)/1.0);
   if(w>0)top+=(stairLow(i)-top)*w;
  }
  // Dropped kerbs at the mapped crossings; the through sidewalk stays level.
  for(const [cx,cz]of realm.crossings){const w=Math.max(0,1-Math.max(0,Math.abs(x-cx)-1.5)/.8)*Math.max(0,1-Math.abs(Math.abs(z-cz)-3.55)/1.2);top-=w*.08;}
  return top;
 };
 for(const cell of realm.cells)l.job(`sol ${cell.x}/${cell.z}`,cell.x,cell.z,function*(){
  for(const p of cell.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,p.raised?pavement:(x,z)=>ground(x,z)+.035,true);
 },cell.coverage);
 return{
  objects:[...m.objects,...l.objects],collisionObjects:[...m.collisionObjects,...l.collisionObjects],replacements:m.replacements,
  get ready(){return m.ready&&l.ready;},get residentCount(){return l.residentCount;},
  readyNear(x:number,z:number,r=420){return m.readyNear(x,z,r)&&l.readyNear(x,z,r);},
  update(camera:T.PerspectiveCamera,now:number){m.update(camera,now);l.update(camera,now);},
  dispose(){m.dispose();l.dispose();}
 };
}
