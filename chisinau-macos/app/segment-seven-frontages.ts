import * as T from 'three';
import {feature,polygonContains,type XY} from './city-layout';
import {streetMesh} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {photoFrontageDetails} from './photo-frontage-details';
import parts from '../data/commercial-building-parts.json';

/** Bulgară → Ismail: photo-guided elevations on surveyed OSM footprints.
 * Existing no.64 and no.71 retain their previous owners across the boundary. */
export function createSegmentSevenFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Bulevard · segmentul 7',ground,loaded);
 const {job,solid,box,put,facade,beam}=mesh;
 const {faces,cornice,arch,column,pediment,roof}=photoArchitecture(mesh);
 const {C,flat,window,windows,balcony,parapet,rustication,shopfronts}=photoFrontageDetails(mesh);
 const rect=(x:number,z:number,w:number,d:number):XY[]=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2],[x-w/2,z-d/2]];
 const no62=feature('w48188616');
 job('62 · colțul Tighina, piatră și balcoane',no62.p,[48188616],function*(){
  const y=ground(1164,-16.4)+.08,h=15.5,trim='#c3c0af';
  solid(no62.p,h+5,y-5,'#afafa0',true,no62.holes);solid(no62.p,.16,y+h,C.roof,true);yield;
  for(const f of faces(no62.p,y)){
   if(f.len<2.6)continue;
   const q=f.at(f.len/2),o=f.at(f.len/2,1),front=q[1]>-18&&o[1]>q[1],side=q[0]>1189&&o[0]>q[0],bays=Math.max(1,Math.round(f.len/3.55));
   cornice(f,h,trim);yield* rustication(f,7.25,'#aaa798');
   if(front||side){
    yield* shopfronts(f,bays,'#545b5b');yield* windows(f,3,bays,5.65,3.52,1.45,2.35);
    for(let i=1;i<bays;i+=4){const u=(i+.5)*f.len/bays;for(const yy of[7.83,11.35])balcony(f,u,yy,2.3);pediment(f,u,14.15,2.6,.48,y,trim);yield;}
    for(let u=.5;u<f.len;u+=.85)f.panel(u,h-.49,.42,.22,.36,.62,trim,true);
    yield* parapet(f,h+.27);
   }else yield* windows(f,4,bays,2.0,3.51,1.3,2.14);
   yield;
  }
 });
 const court=feature('w67804496');
 job('69 · Curtea de Conturi',court.p,[67804496],function*(){
  const y=ground(1096,30.0)+.10,h=15.6,stone='#c0bdab',trim='#d1cab7',red='#855f50';
  solid(court.p,h+5,y-5,stone,true);solid(court.p,.16,y+h,C.roof,true);yield;
  for(const f of faces(court.p,y)){
   if(f.len<2.5)continue;
   const q=f.at(f.len/2),o=f.at(f.len/2,1),front=o[1]<q[1]&&q[1]<35,central=front&&q[0]>1085&&q[0]<1107,bays=Math.max(1,Math.round(f.len/3.25));
   cornice(f,h,trim);f.panel(f.len/2,3.96,.14,f.len,.24,.30,trim);
   if(central){
    // Central projection: three banks of windows, a glazed lobby and a raised attic.
    for(const yy of[6.04,9.51,12.98]){for(let j=0;j<6;j++)window(f,(j+.5)*f.len/6,yy,1.7,2.25,trim,C.frame);yield;}
    f.panel(f.len/2,1.81,.32,6.4,3.05,.03,'#576359',false,1);
    for(let u=-3.2;u<=3.2;u+=1.6)flat(f,f.len/2+u,1.81,.37,.10,3.05,'#624637');
    f.panel(f.len/2,8.16,.22,8.2,.95,.25,red,true);
    f.label('CURTEA DE CONTURI',f.len/2,7.7,.38,'#b0a573');
    for(const s of[-1,1])f.panel(f.len/2+s*3.34,1.82,.30,.42,3.4,.36,trim);
    for(const yy of[4.0,14.4])f.panel(f.len/2,yy,.21,f.len,.28,.42,red);
    for(const s of[-1,1])f.panel(f.len/2+s*(f.len/2-1.0),9.2,.16,.42,10.3,.28,trim,true);
   }else{
    yield* windows(f,4,bays,2.45,3.47,1.35,2.20);
    if(front)for(let i=0;i<bays;i++){pediment(f,(i+.5)*f.len/bays,10.7,1.9,.35,y,trim);if(i%5===4)yield;}
   }
   if(front){f.panel(f.len/2,14.47,.16,f.len,.20,.32,red);yield* parapet(f,h+.22);}yield;
  }
  const attic=rect(1095.9,38.1,20.1,12.1);solid(attic,2.15,y+h,stone,true);solid(attic,.16,y+h+2.15,C.roof,true);
  for(const f of faces(attic,y)){cornice(f,h+2.15,trim);const q=f.at(f.len/2);if(q[1]<33){f.panel(f.len/2,h+1.15,.27,8.0,1.05,.03,'#6c807e',false,1);for(let u=-3;u<=3;u+=1.5)flat(f,f.len/2+u,h+1.15,.31,.07,1.05,C.frame);}yield;}
  // Modest entrance treads, bounded to the doorway; boulevard profile is untouched.
  for(let i=0;i<3;i++){const z=30.4+i*.36;solid([[1092,z],[1099.8,z],[1099.8,31.9],[1092,31.9]],(i+1)*.14+.16,ground(1096,30.4)+.015-.16,'#575b53',true);yield;}
 });
 const tighina=feature('w67804494');
 const curved:XY[]=tighina.p.map(p=>[...p] as XY);
 curved.splice(1,2,[1186.7,24.23],[1188.80,24.63],[1190.59,25.86],[1191.86,27.81],[1192.33,30.20]);
 job('Tighina 55 · colțul rotunjit cu coloane',curved,[67804494],function*(){
  const y=ground(1170,24.3)+.09,h=16.0,stone='#c4bea5',trim='#d0cab4';
  solid(curved,h+5,y-5,stone,true);solid(curved,.16,y+h,C.roof,true);yield;
  for(const f of faces(curved,y)){
   const q=f.at(f.len/2),o=f.at(f.len/2,1),front=q[1]<25&&o[1]<q[1],side=q[0]>1191&&o[0]>q[0],round=q[0]>1186&&q[1]<30.3;
   if(f.len<2&&!round)continue;
   cornice(f,h,trim);
   if(front||side||round){
    yield* rustication(f,4.25,'#a49e86');
    const bays=Math.max(1,Math.round(f.len/3.6));
    for(let i=0;i<bays;i++){
     const u=(i+.5)*f.len/bays,w=Math.min(1.7,f.len*.64);
     arch(f,u,.15,Math.min(2.5,f.len*.77),3.55,y,C.glass,trim);
     window(f,u,6.24,w,2.6,trim,C.frame);window(f,u,9.98,w,2.6,trim,C.frame);
     arch(f,u,12.10,w,2.8,y,C.glass,trim);
     if(!round&&(i%3===1)){balcony(f,u,4.78,2.6);balcony(f,u,8.55,2.6);}
     if(round||i%3===0){const p=f.at(i*f.len/bays,.20);column(p[0],p[1],y+4.4,10.6,.38,trim);}
     yield;
    }
    for(let u=.3;u<f.len;u+=.78)f.panel(u,h-.50,.41,.25,.39,.59,trim,true);
    yield* parapet(f,h+.2);
   }else yield* windows(f,4,Math.max(1,Math.round(f.len/3.8)),2.1,3.72,1.4,2.3);
   yield;
  }
 });
 const no67=feature('w67804516'),side67=feature('w109763466');
 job('67 · frontul de piatră și aripa laterală',rect(1246.75,41.75,64,38),[67804516,109763466],function*(){
  const y=ground(1243,23.2)+.08;
  for(const [b,h,levels,color]of[[no67,15.8,4,'#b9ad91'],[side67,17.9,5,'#c4ae84']] as const){
   solid(b.p,h+5,y-5,color,true);solid(b.p,.16,y+h,C.roof,true);yield;
   for(const f of faces(b.p,y)){
    if(f.len<2.5)continue;
    const q=f.at(f.len/2),o=f.at(f.len/2,.5),other=b===no67?side67:no67;
    if(polygonContains(o,other.p))continue;
    const front=o[1]<q[1]&&q[1]<24||o[0]<q[0]&&q[0]<1217,bays=Math.max(1,Math.round(f.len/3.4));
    cornice(f,h);
    if(b===no67&&front){yield* rustication(f,7.42,'#afa389');yield* shopfronts(f,bays,'#536450');yield* windows(f,3,bays,5.8,3.57,1.5,2.4);for(let i=1;i<bays;i+=4){balcony(f,(i+.5)*f.len/bays,7.98,2.35);yield;}yield* parapet(f,h+.22);}
    else{yield* windows(f,levels,bays,2,3.39,1.5,2.14);if(b===side67)for(let i=1;i<bays;i+=2)for(const yy of[4,7.39,10.78,14.17]){balcony(f,(i+.5)*f.len/bays,yy,2.28,false);yield;}}
    yield;
   }
  }
 });
 // A single glass plane per face, with a sparse opaque mullion grid. No second
 // default facade remains behind it once this entire job is ready.
 function* curtain(f:ReturnType<typeof facade>,bottom:number,top:number,color:string,pitch=1.6,row=1.6){
  f.panel(f.len/2,(bottom+top)/2,.25,f.len-.10,top-bottom,.03,color,false,1);
  for(let u=.1;u<f.len;u+=pitch){flat(f,u,(bottom+top)/2,.31,.055,top-bottom,'#818f89');if(Math.floor(u/pitch)%16===15)yield;}
  for(let yy=bottom;yy<=top;yy+=row){flat(f,f.len/2,yy,.32,f.len,.055,'#818f89');yield;}
 }
 const ipteh=feature('w67804522'),iptehBase=feature('w91646497'),bank=feature('w67804510');
 job('65 · IPTEH și podiumul comercial',rect(1336.35,35.70,92.4,20.0),[67804522,91646497],function*(){
  const y=ground(1337,27.0)+.08,h=30.6;
  solid(ipteh.p,h+5,y-5,'#7c9292',true);solid(ipteh.p,.18,y+h,'#7c8985',true);yield;
  solid(iptehBase.p,4.05+5,y-5,'#969b8d',true);solid(iptehBase.p,.16,y+4.05,'#6e796f',true);yield;
  for(const f of faces(ipteh.p,y)){
   const q=f.at(f.len/2),o=f.at(f.len/2,.5);if(f.len<1.8||polygonContains(o,bank.p))continue;
   yield* curtain(f,q[1]<33?4.35:.4,h-.20,'#68888d',1.60,1.48);
   if(q[1]<33){for(const u of[f.len*.19,f.len*.56,f.len*.81]){f.panel(u,14.9,.37,.65,.65,.10,'#3e5459',true);yield;}}
  }
  for(const f of faces(iptehBase.p,y)){
   if(f.len<2.5||polygonContains(f.at(f.len/2,.5),ipteh.p))continue;
   yield* shopfronts(f,Math.max(1,Math.round(f.len/5.0)),'#697566');f.panel(f.len/2,4.02,.28,f.len,.24,.60,'#b8baa9');yield;
  }
 });
 job('Ismail 33 · corpul vitrat',bank.p,[67804510],function*(){
  const y=ground(1382,48.5)+.08,h=27.0;
  solid(bank.p,h+5,y-5,'#9ea596',true);solid(bank.p,.18,y+h,C.roof,true);yield;
  for(const f of faces(bank.p,y)){
   if(f.len<3||polygonContains(f.at(f.len/2,.5),ipteh.p))continue;
   const q=f.at(f.len/2),o=f.at(f.len/2,1),east=o[0]>q[0]&&q[0]>1380;
   yield* curtain(f,.55,h-.15,'#586f69',1.55,1.63);
   if(east){
    for(const u of[.8,f.len-.8])f.panel(u,h/2,.35,1.45,h,.45,'#bec0ac');
    pediment(f,f.len/2,h,f.len-3.8,2.0,y,'#71837c');
    f.label('EUROCREDITBANK',f.len/2,h-5.3,.90,'#bdbba2');
   }yield;
  }
 });
 const telecom=feature('r12340010'),tower=feature('w767896648');
 job('12 · Moldtelecom, corpurile și parterul',telecom.p,[12340010],function*(){
  const y=ground(1242,-17.5)+.10,wall='#a7aa9c',frame='#bbc1b4';
  for(const part of parts.moldtelecom){
   const p=part.p as XY[],h=part.height;
   solid(p,h+5,y-5,wall,true,part.holes as XY[][]);solid(p,.18,y+h,C.roof,true);yield;
   for(const f of faces(p,y)){
    if(f.len<2.5)continue;
    const q=f.at(f.len/2),o=f.at(f.len/2,.5),neighbour=parts.moldtelecom.find(b=>b!==part&&polygonContains(o,b.p as XY[]));
    const hidden=neighbour?.height??0;if(hidden>=h-.1)continue;
    const front=o[1]>q[1]&&q[1]>-30,west=o[0]<q[0];
    if(part.id===12340013&&(front||west)){
     const bottom=Math.max(5.3,hidden+.25),top=h-1.0;
     f.panel(f.len/2,(bottom+top)/2,.20,f.len-.5,top-bottom,.03,'#617877',false,1);
     for(let u=.4;u<f.len;u+=2.15){f.panel(u,(bottom+top)/2,.40,.18,top-bottom,.52,frame);yield;}
     for(let yy=bottom;yy<top;yy+=3.0){f.panel(f.len/2,yy,.29,f.len-.5,.18,.26,frame);for(let u=1.4;u<f.len;u+=2.15)flat(f,u,yy+1.45,.31,.045,2.8,frame);yield;}
    }else if(part.id===12340012){
     yield* shopfronts(f,Math.max(1,Math.round(f.len/4.1)),'#666e66');f.panel(f.len/2,4.7,.50,f.len,.55,1.3,'#b6bcb0');
     if(front&&f.len>20)f.label('MOLDTELECOM',f.len*.60,3.78,.55,'#b3c4b6',.58);
    }else{
     for(let yy=Math.max(3,hidden+.3);yy<h;yy+=3.0)flat(f,f.len/2,yy,.15,f.len,.10,'#7f8678');
     if(hidden<3&&f.len>7)yield* windows(f,1,Math.max(1,Math.round(f.len/3.5)),2.1,0,1.5,2.0);
    }
    f.panel(f.len/2,h-.13,.16,f.len,.28,.36,frame);yield;
   }
  }
 });
 job('Moldtelecom · turnul și coroana',tower.p,[767896648],function*(){
  const y=ground(1284,-33.6)+.10,h=51.2,stone='#b0b09d',trim='#bec0ab';
  solid(tower.p,h+5,y-5,stone,true);solid(tower.p,.18,y+h,C.roof,true);yield;
  for(const f of faces(tower.p,y)){
   if(f.len<6)continue;
   const q=f.at(f.len/2),o=f.at(f.len/2,1),main=Math.abs(o[1]-q[1])>.6;
   if(main){
    const bays=Math.max(3,Math.round(f.len/3.1)),pitch=f.len/bays;
    for(let i=0;i<bays;i++){
     const u=(i+.5)*pitch;
     f.panel(u,24.2,.27,pitch-1.0,39.6,.03,'#687f7c',false,1);
     for(let r=0;r<13;r++){const yy=5.05+r*3.0;flat(f,u,yy,.33,pitch-.92,.64,r%4===0?'#739992':'#688e89');flat(f,u,yy+1.21,.36,.055,1.73,trim);flat(f,u,yy+.38,.37,pitch-1.0,.08,trim);if(r%5===4)yield;}
     f.panel(i*pitch,24.0,.42,.45,40.0,.78,trim);
     f.panel(u,48.3,.83,pitch-.14,5.6,1.76,stone);
     const q=f.at(u,1.77),a=f.at(0),b=f.at(1),angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);
     const glass=new T.CircleGeometry(.44,8);glass.rotateY(angle);glass.translate(q[0],y+48.75,q[1]);put(glass,'#47554f',false,false,1);
     const rim=new T.TorusGeometry(.53,.10,4,8);rim.rotateY(angle);rim.translate(q[0],y+48.75,q[1]);put(rim,'#828c7c',true);
     for(const side of[-1,1]){const a=f.at(u+side*(pitch/2-.20),.45),b=f.at(u+side*(pitch/2-.20),1.50);beam(new T.Vector3(a[0],y+43.0,a[1]),new T.Vector3(b[0],y+45.5,b[1]),.13,trim,false);}
     yield;
    }
   }else{for(let yy=3;yy<h;yy+=3.2)flat(f,f.len/2,yy,.10,f.len,.035,'#8d9585');yield;}
  }
  // Rounded vertical end cores soften the brutalist silhouette, not extra walls.
  for(const [x,z]of[[1273.9,-35.7],[1294.2,-35.7],[1273.9,-58.7],[1294.2,-58.7]]){
   const g=new T.CylinderGeometry(2.1,2.1,h,12);g.translate(x,y+h/2,z);put(g,stone,false,true);yield;
  }
  box(1284,y+h+1.35,-47.4,7.8,2.7,7.8,'#778777');
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=1284+Math.cos(a)*3.25,z=-47.4+Math.sin(a)*3.25;beam(new T.Vector3(x,y+h+2.7,z),new T.Vector3(x,y+h+5.2,z),.06,'#5d6b64');}
  for(const [x,z,hh]of[[1284,-47,10],[1290,-49,6],[1278,-42,5]])beam(new T.Vector3(x,y+h,z),new T.Vector3(x,y+h+hh,z),.09,'#77817a',false);yield;
 });
 const unic=feature('r12340008'),unicOuter=feature('r12340007');
 job('8 · UNIC, un singur volum și accesul în trepte',unicOuter.p,[12340007,12340008],function*(){
  const y=ground(1338,-72)+1.14,h=18.0,stone='#bcb9a2',dark='#414d4c',trim='#a2a79c';
  for(const b of parts.unicWings){solid(b.p as XY[],h+7,y-7,stone,true,b.holes as XY[][]);solid(b.p as XY[],.16,y+h,C.roof,true,b.holes as XY[][]);yield;}
  const core=rect(1339,-86.825,13,10.35);solid(core,h+7,y-7,trim,true);solid(core,.16,y+h,C.roof,true);yield;
  // The overlapping relation's service wing is a polygon DIFFERENCE. Never
  // extrude both enclosing relations over the same shop building.
  for(const b of parts.unicService){solid(b.p as XY[],5.1+7,y-7,'#a4a693',true,b.holes as XY[][]);solid(b.p as XY[],.16,y+5.1,C.roof,true,b.holes as XY[][]);yield;}
  for(const f of faces(unic.p,y)){
   if(f.len<2.0)continue;
   const q=f.at(f.len/2),o=f.at(f.len/2,1),front=q[1]>-103&&o[1]>q[1],central=q[0]>1332&&q[0]<1346&&q[1]>-85;
   if(q[0]>1332.2&&q[0]<1345.8&&q[1]>-93)continue;
   if(front&&f.len>5){
    const bays=Math.max(1,Math.round(f.len/4.2)),pitch=f.len/bays;
    for(let i=0;i<bays;i++){
     const u=(i+.5)*pitch,wx=f.at(u)[0];
     if(wx<1320||wx>1357)continue;
     f.panel(u,10.1,.20,pitch-.55,15.3,.10,dark);
     for(let row=0;row<12;row++){flat(f,u+((i+row)%3-1)*.30,3.6+row*1.17,.27,.13,.19,'#939988',true);if(row%6===5)yield;}
     f.panel(i*pitch,10.2,.17,.48,16.0,.35,stone);
    }
   }else if(f.len>8){
    // Side walls are predominantly solid, interrupted by narrow dark ribs.
    for(let u=3;u<f.len-2;u+=6.2){f.panel(u,10.3,.14,1.9,14.5,.2,dark);yield;}
   }
   if(front&&!central){yield* shopfronts(f,Math.max(1,Math.round(f.len/4.1)),'#414a41');}
   f.panel(f.len/2,h+.09,.14,f.len,.18,.32,'#717c70');yield;
  }
  // One front plane for the central risalit. The former notched relation
  // edges are not decorated again behind its cladding or lettering.
  const cf=facade([1332.5,-81.65],[1345.5,-81.65],y);
  for(const [u,width,height]of[[6.5,7.4,21.3],[1.4,2.8,19.3],[11.6,2.8,19.3]]){
   const p=rect(1332.5+u,-86.825,width,10.35);solid(p,height-h,y+h,trim,true);solid(p,.16,y+height,C.roof,true);yield;
  }
  for(const u of[1.4,11.6]){
   cf.panel(u,10.02,.24,2.42,15.12,.03,'#657e7b',false,1);
   for(let yy=2.5;yy<17.7;yy+=2.5)flat(cf,u,yy,.31,2.42,.065,'#879c90');
   flat(cf,u,10.02,.32,.06,15.12,'#a1aea0');yield;
  }
  for(let yy=2.7;yy<21.3;yy+=1.36)flat(cf,6.5,yy,.21,7.40,.028,'#6f7d72');
  for(let u=3;u<10;u+=1.48)flat(cf,u,12,.22,.028,18.4,'#6f7d72');
  cf.label('UNIC',6.5,17.20,1.70,'#d0d2c0',.30);
  cf.label('MAGAZIN UNIVERSAL',6.5,16.50,.28,'#c8cabc',.30);
  cf.panel(6.5,1.33,.25,7.20,2.46,.03,'#536b60',false,1);
  for(let u=3;u<11;u+=1.75)flat(cf,u,1.33,.32,.09,2.46,'#a0afa0');yield;
  // Treads follow a continuous gentle cross-grade. Keep the broad plaza's
  // existing single pavement; only these physical risers sit above it.
  function slab(x0:number,x1:number,z0:number,z1:number,rise:number){
   const ya=ground(x0,-71.0)+rise,yb=ground(x1,-71.0)+rise,bottom=Math.min(ya,yb)-2.2;
   const v=[[x0,ya,z0],[x1,yb,z0],[x1,yb,z1],[x0,ya,z1],[x0,bottom,z0],[x1,bottom,z0],[x1,bottom,z1],[x0,bottom,z1]];
   const indices=[0,1,2,0,2,3,4,6,5,4,7,6,0,5,1,0,4,5,1,6,2,1,5,6,2,7,3,2,6,7,3,4,0,3,7,4];
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(indices.flatMap(i=>v[i]),3));g.computeVertexNormals();put(g,'#999d90',false,true);
  }
  for(let i=0;i<8;i++){for(let x=1315;x<1363;x+=3)slab(x,x+3,-71-i*.36,-71-(i+1)*.36,(i+1)*.14);yield;}
  // Central landing only reaches the real doorway; flanking forecourt remains native.
  for(let x=1333;x<1345;x+=3)slab(x,x+3,-73.88,-82.15,1.12);yield;
 });
 return mesh;
}
