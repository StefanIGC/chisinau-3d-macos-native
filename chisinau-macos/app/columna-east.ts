import * as T from 'three';
import realm from '../data/columna-east.json';
import {streetMesh,streetRect as rect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import {feature,type XY} from './city-layout';

/** Columna, Pușkin–Alecsandri: five mapped, photo-supported facades and a
 * continuous public street. Reference limits: docs/columna-east-references.md. */
export function createColumnaEast(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Columna est · arhitectură',ground,loaded),a=photoArchitecture(m);
 const l=landscapeLayer(scene,'Columna est · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const {solid,box,facade,put,beam}=m,trim='#c9c4af',iron='#394640',glass='#4e6568',wood='#655043';
 type Face=ReturnType<typeof facade>;
 const low=(i:number)=>ground(...realm.stairs[i].start as XY)+.12;
 const along=(f:Face,x:number,z:number)=>{const p=f.at(0),q=f.at(1);return(x-p[0])*(q[0]-p[0])+(z-p[1])*(q[1]-p[1]);};
 function door(f:Face,u:number,bottom:number,w=1.7,h=2.6,color=wood){
  f.panel(u,bottom+h/2,.35,w,h,.02,glass,false,1);
  for(const d of[-.5,0,.5])f.panel(u+d*w,bottom+h/2,.41,.065,h,.07,color);
  for(const y of[bottom,bottom+h*.73,bottom+h])f.panel(u,y,.42,w,.07,.08,color);
  f.panel(u+.15,bottom+1.05,.47,.04,.40,.05,'#b5b39b',true);
 }
 function* rail(f:Face,u:number,w:number,y:number,h=.95,v=.8){
  for(const hh of[y,y+h])f.panel(u,hh,v,w,.05,.05,iron,true);
  for(let x=-w/2;x<=w/2;x+=.20){f.panel(u+x,y+h/2,v,.025,h,.028,iron,true);if(Math.round((x+w/2)/.20)%15===14)yield;}
 }
 function address(f:Face,text:string,u:number){f.panel(u,2.25,.29,.47,.34,.04,'#3b6473');f.label(text,u,2.15,.21,trim,.34);}

 const richmond=feature('w50148001');
 m.job('115 · Richmond',richmond.p,[50148001],function*(){
  const y=low(0),h=10.25;
  solid(richmond.p,h+4,y-4,'#92948c',true,richmond.holes);solid(richmond.p,.15,y+h,'#3e4a49');
  a.roof(243.13,-330.37,64.8,12.8,y+h,2.35,'#3e4849');yield;
  for(const f of a.faces(richmond.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]<p[1]-.9;
   f.panel(f.len/2,.26,.08,f.len,.52,.16,'#79604e');a.cornice(f,h,trim);
   if(front&&f.len>40){
    const bays=15,center=along(f,243.15,-336.68);
    f.panel(f.len/2,2.72,.055,f.len,4.85,.11,'#7b817d');
    for(const yy of[5.05,5.32,9.36])f.panel(f.len/2,yy,.18,f.len,.21,.36,trim);
    for(let i=0;i<bays;i++){
     const u=(i+.5)*f.len/bays,entry=Math.abs(u-center)<2.5;
     if(!entry)f.window(u,2.60,1.62,2.85,trim,'#303c3c');
     if(!entry)f.window(u,7.23,1.60,3.08,trim,'#303c3c');
     for(const d of[-1.18,1.18])f.panel(u+d,7.46,.15,.32,4.08,.30,trim,true);
     f.panel(u,5.77,.16,1.55,.38,.25,trim,true);
     for(let yy=1.0;yy<4.8;yy+=.65)f.panel(u,yy,.115,3.55,.025,.035,'#525d59',true);
     f.panel(u,9.73,.25,.40,.44,.28,trim,true);yield;
    }
    door(f,center,.56,2.65,3.15,'#303b39');a.arch(f,center,5.75,1.95,3.2,y,glass,trim);
    for(const u of[center-2.8,center+2.8])f.window(u,7.12,1.35,2.82,trim,'#35403e');
    f.panel(center,5.34,.83,8.10,.26,1.66,'#5f675f');yield* rail(f,center,7.8,5.49,1.02,1.61);
    f.panel(center,4.26,.39,5.10,1.05,.28,'#35423e');f.label('RICHMOND',center,4.20,.45,'#b8a471',.57);f.label('HOTEL',center,3.87,.21,'#b8a471',.57);
    a.arch(f,center,10.6,2.75,2.9,y,'#727974',trim,0);f.label('1880',center,11.2,.67,trim,.57);address(f,'115',f.len-1.1);
   }else if(f.len>5)yield* a.windows(f,2,h,Math.max(2,Math.round(f.len/4.5)),2.6,trim,'#3b4743');
   yield;
  }
  const crest=new T.CylinderGeometry(3.05,5.7,4.35,4);crest.rotateY(Math.PI/4);crest.scale(1,1,.64);crest.translate(243.15,y+12.38,-333.1);put(crest,'#3e4849',false,true);
  box(243.15,y+14.65,-333.1,4.7,.18,3.12,'#354240');beam(new T.Vector3(243.15,y+14.7,-333.1),new T.Vector3(243.15,y+16.0,-333.1),.04,iron);
  for(const x of[218,226,258,267])box(x,y+11.2,-330.0,.62,1.80,.68,'#414d49',true);
 });

 const modern=feature('w142259279');
 m.job('92 · biroul modern',modern.p,[142259279],function*(){
  const y=low(1),h=14.9;
  solid(modern.p,h+4,y-4,'#96998c',true,modern.holes);solid(modern.p,.26,y+h,'#4d6754');yield;
  for(const f of a.faces(modern.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]>p[1]+.8;
   if(f.len<2.3)continue;
   f.panel(f.len/2,.35,.055,f.len,.70,.11,'#82897c');
   const bays=Math.max(1,Math.round(f.len/3.1));
   for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;for(const h of[2.42,6.0,9.50])f.window(u,h,1.45,1.85,'#838d7c','#4a6353');yield;}
   f.panel(f.len/2,13.20,.18,f.len,2.70,.03,'#607f7e',false,1);
   for(let yy=12;yy<14.7;yy+=.30)f.panel(f.len/2,yy,.43,f.len,.055,.055,'#a3ac9d',true);
   for(const u of[.25,f.len-.25])f.panel(u,13.30,.45,.055,2.80,.06,'#a4aa9c',true);
   if(front&&p[0]>286&&p[0]<295){const u=along(f,291.7,-360.95);if(u>0&&u<f.len)door(f,u,.84,2.15,3.1,'#3a6050');}
   yield;
  }
  const front=facade([286.2,-360.91],[295.18,-360.91],y),u=5.50;
  door(front,u,.84,2.3,3.2,'#3b6551');
  box(291.7,y+4.16,-359.42,5.15,.22,3.05,'#b0b3a0');a.column(294.0,-358.2,y+.72,3.25,.18,'#a7afa2',true);
  // Projecting green-framed glass tower at the western corner.
  const tower=facade([273.2,-355.95],[276.3,-355.95],y);
  tower.panel(1.55,9.05,.44,3.1,9.50,.03,'#7a9890',false,1);
  for(let yy=4.3;yy<14;yy+=1.14)tower.panel(1.55,yy,.50,3.14,.055,.07,'#3f6250',true);
  for(const xx of[.04,1.55,3.06])tower.panel(xx,9.05,.51,.06,9.55,.08,'#3f6250',true);
  for(let i=0;i<6;i++)tower.label('LUKOIL'[i],.66,11.7-i*1.05,.67,'#9d4742',.58);
  for(const x of[274.8,290.3]){
   const z=-365.8;for(const d of[-1.6,1.6])beam(new T.Vector3(x+d,y+15.1,z),new T.Vector3(x,y+18.2,z),.044,'#a1a78e');beam(new T.Vector3(x-1.6,y+15.1,z),new T.Vector3(x+1.6,y+15.1,z),.044,'#a1a78e');
  }
 });

 const old=feature('w67799190');
 m.job('92 · Casa Vartolomeu',old.p,[67799190],function*(){
  const y=low(2),h=8.7,brick='#98684e';solid(old.p,h+4,y-4,'#c0b99d',true,old.holes);a.roof(302.38,-364.23,14.5,16.4,y+h,1.6,'#5f6e60');yield;
  for(const f of a.faces(old.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]>p[1]+.85;
   f.panel(f.len/2,.40,.09,f.len,.80,.18,'#928976');a.cornice(f,h,trim);
   if(front&&f.len>10){
    const entry=along(f,307.2,-356.22);
    for(const yy of[4.55,8.16])f.panel(f.len/2,yy,.16,f.len,yy>8?.76:.20,.32,brick);
    for(let i=0;i<4;i++){
     const u=(i+.5)*f.len/4,isDoor=Math.abs(u-entry)<1.6;
     if(isDoor){door(f,entry,.56,1.85,3.15);door(f,entry,4.75,1.65,2.6);f.panel(entry,4.53,.85,3.2,.22,1.7,trim);yield* rail(f,entry,3.0,4.68,.95,1.64);}
     else for(const hh of[2.7,6.2]){f.window(u,hh,1.5,2.13,trim,'#7c5145');for(let j=-5;j<=5;j++){const du=j*.17;f.panel(u+du,hh+1.27+.14*(1-(du/.9)**2),.37,.16,.32,.14,j===0||Math.abs(j)===3?trim:brick,true);}}
     f.panel(u,.22,.17,1.5,.47,.20,brick,true);yield;
    }
    for(let u=.25;u<f.len;u+=.42)f.panel(u,8.45,.26,.18,.28,.17,brick,true);
    f.label('LUKOIL',entry,7.83,.40,'#ad5550',.4);address(f,'92',entry+1.0);
   }else if(f.len>3)yield* a.windows(f,2,h,Math.max(1,Math.round(f.len/3.8)),2.6,trim,'#7c5145');
   yield;
  }
 });

 const hotel=feature('w46331597');
 m.job('72 · hotelul de pe Vlaicu',hotel.p,[46331597],function*(){
  const y=low(3),h=12.8;solid(hotel.p,h+4,y-4,'#c1baa5',true,hotel.holes);solid(hotel.p,.16,y+h,'#7e8578');yield;
  for(const f of a.faces(hotel.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),west=q[0]<p[0]-.85;
   f.panel(f.len/2,1.15,.06,f.len,2.30,.12,'#aaa28d');
   if(west&&f.len>20){
    const u=along(f,332.42,-322.1),bays=6;
    for(let i=0;i<bays;i++){const t=(i+.5)*f.len/bays;for(const yy of[3.2,6.8,10.45]){if(Math.abs(t-u)<3.3)continue;f.window(t,yy,2.1,2.80,trim,'#4b4d46');}yield;}
    f.panel(u,8.70,.44,6.1,7.2,.03,'#627b7b',false,1);
    for(let yy=5.3;yy<=12.4;yy+=1.8)f.panel(u,yy,.50,6.15,.075,.08,'#495650',true);
    for(let xx=-3;xx<=3;xx+=1.5)f.panel(u+xx,8.70,.51,.075,7.3,.08,'#495650',true);
    door(f,u,.56,2.3,3.10,'#4f564e');
    f.panel(u,4.16,.46,7.1,.65,.42,trim);f.label('MERCURE HOTEL',u,4.03,.31,'#3f4d46',.69);
    for(const sign of[-1,1])a.arch(f,u+sign*6.0,8.1,1.6,4.0,y,glass,trim);
    // Broad curved parapet and stepped upper body, as shown in both photos.
    const shape=new T.Shape();shape.moveTo(-f.len/2,0);shape.lineTo(f.len/2,0);
    for(let i=20;i>=0;i--){const du=-f.len/2+i*f.len/20;shape.lineTo(du,1.8*Math.sqrt(Math.max(0,1-(du/(f.len/2))**2)));}shape.closePath();
    const origin=f.at(f.len/2,.06),start=f.at(0),end=f.at(1),curve=new T.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:false});curve.rotateY(Math.atan2(-(end[1]-start[1]),end[0]-start[0]));curve.translate(origin[0],y+h,origin[1]);put(curve,'#c1baa5');yield;
    address(f,'72',f.len-.85);
   }else if(f.len>4)yield* a.windows(f,3,h,Math.max(2,Math.round(f.len/3.5)),3.2,trim,'#596055');
   yield;
  }
  solid(rect(345.05,-322.8,7.0,18.0),7.0,y+h,'#c3c2b4');
  for(const f of a.faces(rect(345.05,-322.8,7.0,18.0),y+h))yield* a.windows(f,2,7.0,Math.max(1,Math.round(f.len/3.5)),1.7,trim,'#5a655d');
  box(345.05,y+20,-322.8,7.15,.19,18.2,'#9a9d8e');
 });

 const church=feature('w74002827');
 m.job('76 · Sfânta Matrona',church.p,[74002827],function*(){
  const y=low(4),h=4.45;solid(church.p,h+4,y-4,'#a2b79b',true,church.holes);a.roof(570.42,-366.54,31.1,15.2,y+h,1.45,'#6a786e');yield;
  for(const f of a.faces(church.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]>p[1]+.9;
   f.panel(f.len/2,.33,.08,f.len,.66,.16,'#828b78');a.cornice(f,h,'#b8c5ac');
   if(front&&f.len>20){
    const u=along(f,569.5,-359.29);f.panel(u,2.27,.22,5.2,3.52,.24,'#79a375');door(f,u,.70,1.85,2.76,'#ae7c42');
    f.panel(u,2.08,.385,1.74,2.70,.022,'#b48c54');for(const d of[-.43,.43])for(const yy of[1.25,2.05,2.85])f.panel(u+d,yy,.416,.63,.56,.032,'#a9804b',true);
    for(const t of[3.4,6.4,9.6,20.5,24,27.3]){if(Math.abs(t-u)<2.5)continue;f.window(t,2.25,1.2,1.75,trim,'#d0d1bc');for(const d of[-.38,0,.38])f.panel(t+d,2.25,.50,.025,1.7,.03,iron,true);yield;}
    // Open freestanding metal bell frame, with an opaque low-polygon bell.
    const center=f.at(u,.63);for(const dx of[-1.32,1.32])for(const dz of[-.85,.85])box(center[0]+dx,y+4.37,center[1]+dz,.07,7.32,.07,iron,false,false);
    for(const hh of[5.85,7.05])box(center[0],y+hh,center[1]+.85,2.7,.055,.06,iron,true);
    const bell=new T.CylinderGeometry(.24,.43,.58,10);bell.translate(center[0],y+6.35,center[1]);put(bell,'#82744f',true);
    a.roof(center[0],center[1],3.05,2.3,y+7.05,.94,'#738074');
    const cap=new T.SphereGeometry(.21,8,5);cap.scale(.7,1,.7);cap.translate(center[0],y+8.16,center[1]);put(cap,'#b7a05b',true);
    box(center[0],y+8.63,center[1],.06,.66,.06,'#a79457',true);box(center[0],y+8.74,center[1],.40,.05,.05,'#a79457',true);address(f,'76',f.len-1.0);
   }else if(f.len>7)yield* a.windows(f,1,h,Math.max(2,Math.round(f.len/4.3)),2.3,trim,'#c2c7b3');
   yield;
  }
  yield* a.fence([573.4,-355.9],[582.4,-355.9],ground(577,-355.9)+.12,.46);
 });

 realm.stairs.forEach((s,i)=>m.job(s.name+' · trepte',rect((s.start[0]+s.end[0])/2,(s.start[1]+s.end[1])/2,8,8),[],function*(){
  const base=low(i),dx=s.end[0]-s.start[0],dz=s.end[1]-s.start[1],len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
  for(let k=0;k<s.count;k++){const t=(k+.5)/s.count,top=base+(k+1)*s.rise/s.count;box(s.start[0]+dx*t,(top+base-.30)/2,s.start[1]+dz*t,s.width,top-base+.30,len/s.count,s.color,false,true,angle);yield;}
  for(const r of realm.ramps.filter(r=>r.stair===i)){
   const dx=r.end[0]-r.start[0],dz=r.end[1]-r.start[1],length=dx*dx+dz*dz,ring=r.rings[0],vertices:number[]=[];
   const top=(p:number[])=>{const t=T.MathUtils.clamp(((p[0]-r.start[0])*dx+(p[1]-r.start[1])*dz)/length,0,1);return(ground(...r.start as XY)+.12)*(1-t)+(base+s.rise)*t;};
   for(let j=1;j<ring.length;j++){const p=ring[j-1],q=ring[j],a=[p[0],ground(p[0],p[1])+.02,p[1]],b=[q[0],ground(q[0],q[1])+.02,q[1]],c=[q[0],top(q),q[1]],d=[p[0],top(p),p[1]];vertices.push(...a,...b,...c,...a,...c,...d,...c,...b,...a,...d,...c,...a);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();put(g,s.color);yield;
  }
 }));
 const pavement=(x:number,z:number)=>{
  let y=ground(x,z)+.12;
  for(let i=0;i<realm.stairs.length;i++){
   const s=realm.stairs[i],dx=s.end[0]-s.start[0],dz=s.end[1]-s.start[1],len=Math.hypot(dx,dz),forward=((x-s.start[0])*dx+(z-s.start[1])*dz)/len,across=Math.abs(((x-s.start[0])*dz-(z-s.start[1])*dx)/len),w=Math.max(0,1-Math.max(0,across-s.width/2)/.8)*Math.max(0,1-Math.abs(forward)/1.0);
   y+=(low(i)-y)*w;
  }
  return y;
 };
 for(const r of realm.ramps){
  const s=realm.stairs[r.stair],dx=r.end[0]-r.start[0],dz=r.end[1]-r.start[1],length=dx*dx+dz*dz;
  l.job(s.name+' · rampă',(r.start[0]+r.end[0])/2,(r.start[1]+r.end[1])/2,function*(){
   yield* l.surfaceStaged(r.rings,s.color,1,(x,z)=>{const t=T.MathUtils.clamp(((x-r.start[0])*dx+(z-r.start[1])*dz)/length,0,1);return (ground(...r.start as XY)+.12)*(1-t)+(low(r.stair)+s.rise)*t;},true);
  },[r.rings]);
 }
 for(const cell of realm.cells)l.job(`sol ${cell.x}/${cell.z}`,cell.x,cell.z,function*(){for(const p of cell.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,p.raised?pavement:(x,z)=>ground(x,z)+.035,true);},cell.coverage);
 return{objects:[...m.objects,...l.objects],collisionObjects:[...m.collisionObjects,...l.collisionObjects],replacements:m.replacements,
  get ready(){return m.ready&&l.ready;},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return m.readyNear(x,z,r)&&l.readyNear(x,z,r);},update(camera:T.PerspectiveCamera,now:number){m.update(camera,now);l.update(camera,now);},dispose(){m.dispose();l.dispose();}};
}
