import * as T from 'three';
import {feature,type XY} from './city-layout';
import {streetMesh} from './street-mesh';
import {photoArchitecture} from './photo-architecture';

/** Vasile Alecsandri → Bulgară. Mapped footprints, photo-guided elevations,
 * atomic native replacement and the existing shared boulevard grade. */
export function createSegmentSixFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Bulevard · segmentul 6',ground,loaded);
 const {job,solid,box,put,facade,beam}=mesh;
 const {faces,cornice,arch,column,roof,pediment}=photoArchitecture(mesh);
 const C={wall:'#b8b6a1',trim:'#c6c2af',base:'#7b7d70',roof:'#7b8278',glass:'#506666',frame:'#b4bcad',iron:'#424e45'};
 type Face=ReturnType<typeof facade>;
 // Flat reveals and mortar joints need two triangles, not six box faces.
 // Keep the actual sills, balconies, columns and silhouette in solid geometry.
 function flat(f:Face,u:number,h:number,v:number,w:number,hh:number,color:string,fine=true,twoSided=false){
  const a=f.at(u,v),b=f.at(1),c=f.at(0),angle=Math.atan2(-(b[1]-c[1]),b[0]-c[0]);
  for(const turn of twoSided?[0,Math.PI]:[0]){const g=new T.PlaneGeometry(w,hh);g.rotateY(angle+turn);g.translate(a[0],f.y+h,a[1]);put(g,color,fine);}
 }
 function window(f:Face,u:number,h:number,w:number,hh:number,trim=C.trim,frame=C.frame,offset=0){
  f.panel(u,h,.31+offset,w,hh,.03,C.glass,false,1);
  for(const s of[-1,1])flat(f,u+s*(w/2+.07),h,.36+offset,.13,hh+.21,trim);
  flat(f,u,h+hh/2+.075,.39+offset,w+.3,.13,trim);
  f.panel(u,h-hh/2-.075,.34+offset,w+.3,.13,.28,trim,true);
  flat(f,u,h,.40+offset,.06,hh,frame);flat(f,u,h+hh*.27,.41+offset,w,.055,frame);
 }
 function* windows(f:Face,rows:number,bays:number,first:number,pitch:number,w=1.6,hh=2.35,skip?:(r:number,i:number)=>boolean){
  for(let r=0;r<rows;r++){for(let i=0;i<bays;i++){if(!skip?.(r,i))window(f,(i+.5)*f.len/bays,first+r*pitch,w,hh,C.trim,C.frame);if(i%5===4)yield;}yield;}
 }
 function balcony(f:Face,u:number,y:number,w=2.5,stone=true){
  f.panel(u,y,.87,w+.15,.18,1.72,C.base);
  f.panel(u,y+1.05,1.65,w+.15,.13,.20,stone?C.trim:C.iron,true);
  for(let n=0;n<=8;n++)flat(f,u-w/2+n*w/8,y+.56,1.66,stone?.13:.035,.94,stone?C.trim:C.iron,true,true);
  for(const side of[-1,1])f.panel(u+side*w/2,y+.56,.91,.10,.95,1.55,stone?C.trim:C.iron,true);
 }
 function* parapet(f:Face,y:number){
  f.panel(f.len/2,y+.60,.12,f.len,.17,.40,C.trim);
  for(let u=.20;u<f.len;u+=.42){flat(f,u,y+.28,.23,.11,.56,C.trim,true,true);if(Math.round(u/.42)%20===19)yield;}
  for(let u=0;u<=f.len;u+=4.1)f.panel(u,y+.37,.12,.39,.76,.44,C.trim);yield;
 }
 function* rustication(f:Face,h=3.9,color=C.base){
  f.panel(f.len/2,h/2,.10,f.len,h,.2,color);
  for(let row=0;row<Math.floor(h/.57);row++){
   const yy=.26+row*.57;flat(f,f.len/2,yy,.23,f.len,.035,'#686e63');
   for(let u=(row%2)*.64;u<f.len;u+=1.28)flat(f,u,yy+.27,.23,.026,.5,'#686e63');
   yield;
  }
  f.panel(f.len/2,h+.08,.28,f.len,.22,.55,C.trim);yield;
 }
 function* shopfronts(f:Face,bays:number,color='#586053'){
  for(let i=0;i<bays;i++){
   const u=(i+.5)*f.len/bays,w=Math.min(2.8,f.len/bays-.58);
   f.panel(u,1.66,.31,w,2.85,.03,C.glass,false,1);
   for(const sign of[-1,1])f.panel(u+sign*w/2,1.66,.37,.09,2.95,.14,C.frame,true);
   f.panel(u,1.66,.38,.075,2.85,.09,C.frame,true);f.panel(u,3.38,.40,w+.26,.44,.56,color);
   if(i%4===3)yield;
  }yield;
 }
 function urn(x:number,z:number,y:number,color=C.trim){
  box(x,y+.12,z,.50,.24,.50,color);
  const g=new T.CylinderGeometry(.30,.15,.50,8);g.translate(x,y+.49,z);put(g,color,true);
  const lip=new T.CylinderGeometry(.33,.30,.08,8);lip.translate(x,y+.78,z);put(lip,color,true);
 }
 // True openings: the solid spandrel starts above the semicircle. No dark
 // facade plane or OSM wall covers the space between the piers/columns.
 function archHead(f:Face,u:number,spring:number,w:number,top:number,y:number,color:string,trim:string){
  const r=w/2,s=new T.Shape();s.moveTo(-r,top);s.lineTo(r,top);s.lineTo(r,spring);s.absarc(0,spring,r,0,Math.PI,false);s.closePath();
  const a=f.at(u,.1),b=f.at(1),c=f.at(0),angle=Math.atan2(-(b[1]-c[1]),b[0]-c[0]);
  const g=new T.ExtrudeGeometry(s,{depth:.65,bevelEnabled:false,curveSegments:12});g.rotateY(angle);g.translate(a[0],y,a[1]);put(g,color,false,true);
  const ring=new T.TorusGeometry(r+.10,.11,4,18,Math.PI);ring.rotateY(angle);const q=f.at(u,.83);ring.translate(q[0],y+spring,q[1]);put(ring,trim,true);
 }

 // No.126 has five levels in its corner pavilions and four in the wings.
 // A single five-storey extrusion would lose the photographed stepped skyline.
 const apartment=feature('w67803027');
 job('126 · pavilioanele de colț și aripile',apartment.p,[67803027],function*(){
  const y=ground(701,-18.5)+.08,h=15.15;
  solid(apartment.p,h+5,y-5,C.wall,true,apartment.holes);solid(apartment.p,.16,y+h,C.roof,true);yield;
  for(const f of faces(apartment.p,y)){
   if(f.len<2.8)continue;
   const q=f.at(f.len/2),out=f.at(f.len/2,1),front=q[1]>-21&&out[1]>q[1],side=(q[0]<639&&out[0]<q[0])||(q[0]>763&&out[0]>q[0]),decorated=front||side;
   const corner=front&&(q[0]<650||q[0]>752),center=front&&q[0]>673&&q[0]<729,bays=Math.max(1,Math.round(f.len/3.4));
   const loggia=(i:number)=>corner?i===Math.floor(bays/2):center&&[2,Math.floor(bays/2),bays-3].includes(i);
   yield* rustication(f);
   if(decorated){
    yield* shopfronts(f,bays);
    yield* windows(f,3,bays,5.74,3.46,1.62,2.38,(r,i)=>loggia(i)&&(r===1||r===2));
    for(let i=1;i<bays;i+=3){const u=(i+.5)*f.len/bays;if(loggia(i))continue;for(const yy of[4.34,7.80,11.26])balcony(f,u,yy,2.5);yield;}
    for(let u=.5;u<f.len;u+=1.05)f.panel(u,h-.52,.41,.22,.42,.62,C.trim,true);
    for(let i=0;i<bays;i++)if(loggia(i)){
     const u=(i+.5)*f.len/bays;
     f.panel(u,9.20,.80,3.05,2.6,1.60,'#b6baa8');
     window(f,u,9.20,2.72,2.38,C.trim,C.frame,1.42);balcony(f,u,7.79,3.18);
     arch(f,u,11.45,2.40,3.65,y,'#4e584c',C.trim,0);balcony(f,u,11.28,2.70);
     for(const sign of[-1,1]){const p=f.at(u+sign*1.42,.55);column(p[0],p[1],y+11.5,2.55,.17,C.trim);}
     const a=f.at(u-2.12,.43),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
     const ring=new T.TorusGeometry(.37,.105,4,16);ring.rotateY(angle);ring.translate(a[0],y+14.47,a[1]);put(ring,C.trim,true);
     const dark=new T.CircleGeometry(.28,16);dark.rotateY(angle);dark.translate(a[0],y+14.47,a[1]);put(dark,'#515b50',true);yield;
    }
   }else yield* windows(f,4,bays,1.97,3.55,1.42,2.10);
   if(!corner&&!center){cornice(f,h);if(front)yield* parapet(f,h+.24);}yield;
  }
  for(const [x,z,w,d]of[[643.40,-24.80,12.0,13.0],[701.05,-25.75,56.35,14.50],[759.16,-25.00,11.8,12.4]]){
   const p:XY[]=[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2],[x-w/2,z-d/2]];
   solid(p,3.55,y+h+.18,C.wall,true);solid(p,.16,y+h+3.73,C.roof,true);yield;
   for(const f of faces(p,y)){
    const bays=Math.max(1,Math.round(f.len/3.4));yield* windows(f,1,bays,h+1.84,0,1.44,2.20);
    for(let i=0;i<=bays;i++){
     const u=i*f.len/bays;f.panel(u,h+1.93,.21,.50,2.43,.36,C.trim,true);
     for(const yy of[1.22,1.67,2.12,2.57])f.panel(u,h+yy,.42,.21,.21,.14,'#9b9b85',true);
    }
    cornice(f,h+3.73);yield* parapet(f,h+3.95);yield;
   }
  }
 });

 // No.75 / MAI. The dated frontal photograph resolves five arches, a recessed
 // loggia, a three-storey centre, two-storey ends and TWO modest stair flights.
 const ministry=feature('w67799194');
 job('75 · Ministerul Afacerilor Interne',ministry.p,[67799194],function*(){
  const y=ground(700.15,19.5)+.02,cream='#c1b99b',trim='#d0c7ae',tan='#98927a',floor=2.24;
  const body:XY[]=ministry.p.map(p=>[...p] as XY);body.splice(3,4,[710.12,33.05],[690.18,33.05]);
  solid(body,15.55,y-5,cream,true,ministry.holes);solid(body,.16,y+10.55,'#657f6c',true);yield;
  const upper:XY[]=[[723.85,31.86],[710.12,31.99],[710.12,33.05],[690.18,33.05],[690.18,32.54],[678.03,32.67],[677.94,23.73],[670,23.81],[670,38.58],[670.11,38.58],[670.2,46.83],[692.26,46.62],[692.27,47.75],[692.62,83.44],[707.14,83.3],[706.79,47.48],[728.67,47.27],[728.59,38.79],[729,38.79],[729,23.48],[723.77,23.53],[723.85,31.86]];
  solid(upper,4.7,y+10.55,cream,true);solid(upper,.18,y+15.25,'#657f6c',true);yield;
  for(const f of faces(body,y)){
   if(f.len<2.5)continue;
   const q=f.at(f.len/2),out=f.at(f.len/2,1),front=out[1]<q[1]&&q[1]<34,backOfPorch=Math.abs(q[1]-33.05)<.1&&q[0]>690&&q[0]<711;
   if(backOfPorch)continue;
   const center=q[0]>669.9&&q[0]<729.1,hh=center?15.25:10.55,bays=Math.max(1,Math.round(f.len/4.0));
   yield* rustication(f,6.05,tan);cornice(f,hh,trim);
   if(front){
    yield* windows(f,center?3:2,bays,4.22,4.04,1.68,2.4);
    for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;pediment(f,u,9.66,2.3,.46,y,trim);if(i%4===3)yield;}
   }else yield* windows(f,center?3:2,bays,4.22,4.04,1.5,2.35);
   for(let u=.30;u<f.len;u+=1.15)f.panel(u,hh-.42,.36,.20,.27,.48,trim,true);yield;
  }
  const front=facade([710.12,28.50],[690.18,28.50],y),back=facade([710.12,33.05],[690.18,33.05],y);
  const span=front.len,pitch=(span-.9)/5;
  for(let i=0;i<=5;i++){
   const u=.45+i*pitch,q=front.at(u);
   box(q[0],y+(floor+6.18)/2,q[1],.88,6.18-floor,.96,tan,false,true);
   box(q[0],y+9.17,q[1],.79,6.10,.86,cream,false,true);
   box(q[0],y+13.785,q[1]-.425,.79,2.93,.65,cream,false,true);
   for(const yy of[6.29,12.18])front.panel(u,yy,.08,1.16,.28,1.12,trim);
   // Capital relief kept in the fine-distance mesh.
   for(const s of[-1,1]){const g=new T.SphereGeometry(.17,6,4);g.scale(1,1.6,.7);const p=front.at(u+s*.32,.61);g.translate(p[0],y+11.93,p[1]);put(g,trim,true);}
   yield;
  }
  for(let i=0;i<5;i++){
   const u=.45+(i+.5)*pitch;archHead(front,u,12.32,pitch-.79,15.25,y,cream,trim);
   for(const yy of[4.20,8.30,12.18]){
    if(i===2&&yy===4.20){back.panel(u,4.13,.27,1.75,3.78,.03,'#775040',false,1);back.panel(u,4.13,.36,.065,3.78,.09,'#49372e',true);}
    else window(back,u,yy,1.68,2.52,trim,'#bcc4ba');
   }
   pediment(back,u,9.66,2.55,.50,y,trim);yield;
  }
  front.panel(span/2,6.15,.02,span+.35,.30,1.10,trim);
  front.panel(span/2,15.32,.1,span+.8,.30,1.25,trim);
  solid([[690.05,28.1],[710.25,28.1],[710.25,33.05],[690.05,33.05]],.18,y+15.25,'#657f6c',true);yield;
  pediment(front,span/2,15.55,span+1.2,3.15,y,cream);
  for(let u=.5;u<span;u+=.76)front.panel(u,15.07,.71,.20,.26,.28,trim,true);
  // Six 14 cm lower risers, an intermediate platform, then ten upper risers.
  for(let i=0;i<6;i++){const z=19.75+i*.36;solid([[684,z],[716.3,z],[716.3,22.0],[684,22.0]],(i+1)*.14+.15,y-.15,'#9e9d8c',true);yield;}
  solid([[683.8,21.8],[716.5,21.8],[716.5,24.30],[683.8,24.30]],.22,y+.62,'#aaa994',true);yield;
  for(let i=0;i<10;i++){const z=24.25+i*.36;solid([[690.05,z],[710.25,z],[710.25,28.0],[690.05,28.0]],(i+1)*.14+.22,y+.62,'#77786c',true);yield;}
  solid([[689.75,27.8],[710.5,27.8],[710.5,33.16],[689.75,33.16]],.22,y+floor-.22,'#a7a38e',true);yield;
  // Flanking terraces retain the central access opening. No blanket surface
  // is added over the boulevard or the planted setback.
  for(const [a,b]of[[[677.9,27.8],[690.05,27.8]],[[710.25,27.8],[723.8,27.8]]] as [XY,XY][]){
   const f=facade(b,a,y);f.panel(f.len/2,1.10,0,f.len,2.20,.32,tan);
   yield* parapet(f,2.28);for(const u of[.4,f.len-.4]){const p=f.at(u);urn(p[0],p[1],y+3.04,trim);}yield;
  }
  roof(656.9,31.0,41.8,14.4,y+10.72,1.16,'#65806d');roof(746.5,30.9,35.0,14.4,y+10.72,1.16,'#65806d');yield;
 });

 // No.124: four storeys, rusticated lower two levels and giant flat pilasters
 // on the upper pair. Keep the open access gap before the next mapped block.
 const corner124=feature('w67803019');
 job('124 · colțul Armenească',corner124.p,[67803019],function*(){
  const y=ground(810,-18.7)+.06,h=15.1;
  solid(corner124.p,h+5,y-5,'#bcb6a1',true,corner124.holes);solid(corner124.p,.16,y+h,C.roof,true);yield;
  for(const f of faces(corner124.p,y)){
   if(f.len<2.5)continue;
   const q=f.at(f.len/2),out=f.at(f.len/2,1),front=q[1]>-21&&out[1]>q[1],side=q[0]<786&&out[0]<q[0],bays=Math.max(1,Math.round(f.len/3.8));
   cornice(f,h);yield* rustication(f,7.02,'#aaa590');
   if(front||side){
    yield* shopfronts(f,bays,'#555a53');yield* windows(f,3,bays,5.5,3.57,1.75,2.48);
    for(let i=0;i<=bays;i++){
     const u=i*f.len/bays;f.panel(u,10.57,.18,.45,6.83,.35,C.trim,true);f.panel(u,13.95,.24,.70,.28,.45,C.trim,true);
     for(const s of[-1,1]){const g=new T.SphereGeometry(.135,6,4);g.scale(1,2,.7);const p=f.at(u+s*.16,.49);g.translate(p[0],y+13.73,p[1]);put(g,'#aaa48e',true);}if(i%4===3)yield;
    }
    for(let i=1;i<bays;i+=4)pediment(f,(i+.5)*f.len/bays,10.47,2.24,.43,y,C.trim);
    if(front){
     const u=f.len*.50;
     for(const s of[-1,1])f.panel(u+s*2.46,4.12,.24,.34,7.80,.45,C.trim);
     f.panel(u,7.94,.31,5.40,.24,.64,C.trim);f.panel(u,3.75,.28,5.40,.21,.60,C.trim);
     for(const s of[-1,1]){const p=f.at(u+s*2.30,.3);urn(p[0],p[1],y+8.07);}
     for(let yy=1.1;yy<7.6;yy+=.55)for(const s of[-1,1])f.panel(u+s*2.46,yy,.50,.14,.24,.09,'#958d76',true);
    }
   }else yield* windows(f,4,bays,1.95,3.56,1.55,2.22);yield;
  }
 });

 // No.73: the APP full front and the dated Bulgară corner photo agree on
 // pale limestone, three-storey wings and a taller five-arched central loggia.
 const justice=feature('w45513802');
 job('73 · corpul public și porticul central',justice.p,[45513802],function*(){
  const y=ground(885.3,26.8)+.04,h=14.0,stone='#bebca8',trim='#ccc9b7';
  const body:XY[]=justice.p.map(p=>[...p] as XY);
  body[0]=[902.07,40.15];body[1]=[902.07,40.15];body[body.length-2]=[868.58,40.15];body[body.length-1]=body[0];
  solid(body,h+5,y-5,stone,true,justice.holes);solid(body,.18,y+h,C.roof,true);yield;
  const central:XY[]=[[868.58,40.15],[902.07,40.15],[901.98,53.2],[868.70,53.0],[868.58,40.15]];
  solid(central,3.24,y+h,stone,true);solid(central,.16,y+17.24,C.roof,true);yield;
  for(const f of faces(body,y)){
   if(f.len<2.7)continue;
   const q=f.at(f.len/2),out=f.at(f.len/2,1),front=out[1]<q[1]&&q[1]<41,backOfPorch=Math.abs(q[1]-40.15)<.1&&q[0]>868&&q[0]<903,bays=Math.max(1,Math.round(f.len/4.15));
   if(backOfPorch)continue;
   const cornerEntry=front&&q[0]>968&&q[0]<977&&q[1]<27;
   yield* rustication(f,4.96,'#b5b3a0');cornice(f,h,trim);
   if(!cornerEntry)yield* windows(f,3,bays,2.73,4.02,1.58,2.55);
   if(front){
    if(!cornerEntry)for(let i=1;i<bays;i+=5){const u=(i+.5)*f.len/bays;f.panel(u,7.15,.18,2.15,4.0,.28,'#a5a794',true);window(f,u,6.75,1.58,2.55,trim,C.frame,.10);arch(f,u,8.1,1.72,1.7,y,'#747e6d',trim,0);yield;}
    f.panel(f.len/2,h+.87,.1,f.len,.12,.26,trim);
    for(let u=0;u<f.len-.5;u+=.80){const a=f.at(u,.14),b=f.at(u+.4,.14),c=f.at(u+.8,.14);beam(new T.Vector3(a[0],y+h+.23,a[1]),new T.Vector3(b[0],y+h+.78,b[1]),.055,trim,true);beam(new T.Vector3(b[0],y+h+.78,b[1]),new T.Vector3(c[0],y+h+.23,c[1]),.055,trim,true);if(Math.round(u/.8)%15===14)yield;}
   }yield;
  }
  const front=facade([902.07,34.78],[868.58,34.78],y),back=facade([902.07,40.15],[868.58,40.15],y),span=front.len,pitch=5.32,margin=(span-5*pitch)/2;
  for(const u of[margin/2,span-margin/2])front.panel(u,10.96,.10,margin,12.56,.90,stone);
  for(let i=0;i<5;i++){
   const u=margin+(i+.5)*pitch;archHead(front,u,12.90,pitch-.80,17.24,y,stone,trim);
   // Recessed doors and windows remain behind the genuine upper arcade.
   if(i===0||i===2||i===4)back.panel(u,2.63,.25,2.10,3.60,.03,'#665346',false,1);else window(back,u,2.80,1.8,2.7,trim,C.frame);
   for(const yy of[7.07,11.23])window(back,u,yy,1.8,2.65,trim,C.frame);
   for(let k=0;k<=12;k++){const a=k*Math.PI/12,q=front.at(u+Math.cos(a)*(pitch/2-.18),.84),g=new T.BoxGeometry(.13,.42,.12);g.rotateZ(a-Math.PI/2);g.rotateY(Math.PI);g.translate(q[0],y+12.90+Math.sin(a)*(pitch/2-.18),q[1]);put(g,trim,true);}yield;
  }
  for(let i=0;i<=5;i++){
   const u=margin+i*pitch;
   const support=front.at(u,.02);box(support[0],y+2.83,support[1],.85,3.96,1.12,'#b2b19d',false,true);
   front.panel(u,15.07,.425,.80,4.34,.65,stone);
   // Pairs of round shafts, with dark patterned collars seen in the photo.
   for(const dx of[-.25,.25]){
    const q=front.at(u+dx,.14);column(q[0],q[1],y+5.15,7.61,.23,trim,true);
    for(const yy of[5.90,12.35]){const g=new T.CylinderGeometry(.265,.265,.28,10);g.translate(q[0],y+yy,q[1]);put(g,'#786f59',true);}yield;
   }
  }
  front.panel(span/2,4.94,.08,span,.32,1.24,trim);cornice(front,17.24,trim);yield* parapet(front,17.51);
  solid([[868.45,34.35],[902.25,34.35],[902.25,40.15],[868.45,40.15]],.18,y+17.24,C.roof,true);
  solid([[868.45,34.35],[902.25,34.35],[902.25,40.15],[868.45,40.15]],.20,y+4.95,trim,true);yield;
  solid([[868.45,34.35],[902.25,34.35],[902.25,40.24],[868.45,40.24]],.20,y+.64,'#b0ab96',true);yield;
  for(let i=0;i<6;i++){const z=30.55+i*.64;solid([[867.9,z],[902.7,z],[902.7,34.48],[867.9,34.48]],(i+1)*.14+.17,y-.17,'#a9a38e',true);yield;}
  // The Bulgară corner has its own tall recessed arch and modest doorstep.
  const corner=facade([976.22,26.39],[968.81,26.37],y),u=corner.len/2;
  corner.panel(u,5.83,.10,5.40,10.35,.16,'#b4b3a0');
  arch(corner,u,5.31,3.96,7.77,y,'#768073',trim,0);
  window(corner,u,7.27,2.17,2.74,trim,C.frame,.09);window(corner,u,10.75,2.17,2.6,trim,C.frame,.09);
  corner.panel(u,2.36,.36,2.10,3.92,.03,'#624d40',false,1);corner.panel(u,4.75,.58,4.90,.29,1.40,trim);
  for(const s of[-1,1])corner.panel(u+s*2.03,4.06,.57,.43,1.08,.83,trim);
  for(let i=0;i<3;i++){const p=corner.at(u,1.25-i*.36);box(p[0],y+(i+1)*.14-.25,p[1],3.20,.50,.365,'#99917e',false,true,Math.PI);}yield;
 });

 // The long mapped block, addressed 64 on Bulgară, crosses the segment edge.
 // Replace it once, in full: the future segment 7 must reuse this owner.
 const residential=feature('w48188615');
 job('Bulgară 64 · blocul continuu de pe latura nordică',residential.p,[48188615],function*(){
  const y=ground(988,-17.3)+.06,h=18.25;
  solid(residential.p,h+6,y-6,'#bbbba9',true,residential.holes);solid(residential.p,.18,y+h,C.roof,true);yield;
  for(const f of faces(residential.p,y)){
   if(f.len<2.6)continue;
   const q=f.at(f.len/2),out=f.at(f.len/2,1),front=out[1]>q[1]&&q[1]>-40,side=Math.abs(out[0]-q[0])>.75,bays=Math.max(1,Math.round(f.len/3.8));
   cornice(f,h);f.panel(f.len/2,.34,.11,f.len,.68,.22,'#818378');
   if(front||side){
    yield* shopfronts(f,bays,'#73786d');yield* windows(f,4,bays,5.32,3.45,1.48,2.25);
    for(let i=2;i<bays;i+=5){const u=(i+.5)*f.len/bays;
     for(let r=0;r<4;r++){
      balcony(f,u,3.98+r*3.45,2.25,r%3===1);
      if(r===1&&i%2===0){f.panel(u,8.67,.77,2.20,2.20,1.54,'#aeb7ad');window(f,u,8.67,1.90,1.98,C.trim,C.frame,1.3);}yield;
     }
    }
    for(let i=0;i<bays;i+=8){const u=(i+.5)*f.len/bays;
     for(const s of[-1,1])f.panel(u+s*1.37,11.45,.22,.33,13.0,.42,'#b2b5a2');
     f.panel(u,h+.95,.1,3.30,.18,.40,C.trim);
     for(let dx=-1.48;dx<=1.5;dx+=.31)f.panel(u+dx,h+.48,.1,.10,.86,.18,C.trim,true);yield;
    }
   }else yield* windows(f,5,bays,1.97,3.45,1.45,2.18);
   f.panel(f.len/2,14.01,.17,f.len,.14,.34,C.trim);yield;
  }
 });

 return mesh;
}
