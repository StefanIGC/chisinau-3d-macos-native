import * as T from 'three';
import {feature,type XY} from './city-layout';
import {streetMesh} from './street-mesh';
import {photoArchitecture} from './photo-architecture';

/** Pușkin → Vasile Alecsandri. Photo-guided permanent architecture, retaining
 * mapped outlines and the boulevard's shared grade. Each original retires only
 * when its replacement and collision are complete. See segment-five.md. */
export function createSegmentFiveFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Bulevard · segmentul 5',ground,loaded);
 const {job,solid,box,put,facade,beam}=mesh;
 const {faces,cornice,roof,pediment,column}=photoArchitecture(mesh);
 const C={stone:'#bfb7a2',trim:'#ccc7b4',base:'#797970',glass:'#506562',roof:'#7c837d',wood:'#665044',iron:'#424d48'};
 type Face=ReturnType<typeof facade>;
 function* rows(f:Face,levels:number,bays:number,first=2.1,pitch=3.5,trim=C.trim){
  for(let r=0;r<levels;r++){for(let i=0;i<bays;i++){f.window((i+.5)*f.len/bays,first+r*pitch,Math.min(1.65,f.len/bays*.58),2.22,trim,C.wood);if(i%5===4)yield;}yield;}
 }
 function balcony(f:Face,u:number,y:number,w=2.4,stone=false){
  f.panel(u,y,.74,w,.18,1.40,C.base);
  f.panel(u,y+1,.74,w,.09,1.40,stone?C.trim:C.iron,true);
  for(let i=0;i<=8;i++)f.panel(u-w/2+i*w/8,y+.52,1.44,stone?.13:.038,.91,.075,stone?C.trim:C.iron,true);
  for(const side of[-1,1])f.panel(u+side*w/2,y+.52,.80,.055,.91,1.25,stone?C.trim:C.iron,true);
 }
 function* rustication(f:Face,top=3.6){
  f.panel(f.len/2,.3,.11,f.len,.60,.22,C.base);
  for(let yy=.85;yy<top;yy+=.52)f.panel(f.len/2,yy,.205,f.len,.026,.03,'#999685',true);
  f.panel(f.len/2,top,.24,f.len,.19,.48,C.trim);yield;
 }
 function* shops(f:Face,bays:number,fascia='#555b55'){
  for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays,w=Math.min(3.3,f.len/bays-.6);
   f.panel(u,1.65,.31,w,2.6,.03,C.glass,false,1);
   for(const side of[-1,1])f.panel(u+side*w/2,1.65,.38,.09,2.72,.17,C.wood,true);
   f.panel(u,1.65,.36,.07,2.6,.09,C.wood,true);
   f.panel(u,3.22,.35,w+.22,.45,.48,fascia);if(i%4===3)yield;
  }yield;
 }

 // Address-specific exterior photographs show pale piers and an upper glazed
 // volume at 134/1. A timber-clad restaurant photo was rejected: wrong branch.
 const restaurant=feature('w67803028');
 job('134/1 · pavilionul cu fațadă vitrată',restaurant.p,[67803028],function*(){
  const y=ground(248,-17.5)+.08,h=8.35;
  solid(restaurant.p,h+5,y-5,'#c3c2b2',true,restaurant.holes);solid(restaurant.p,.15,y+h,C.roof,true);yield;
  for(const f of faces(restaurant.p,y)){
   if(f.len<2.5)continue;
   const bays=Math.max(1,Math.round(f.len/4.65));
   for(const yy of[1.97,5.88]){
    for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays,w=f.len/bays-1.12;f.panel(u,yy,.18,w,2.93,.03,'#597472',false,1);for(const side of[-1,1])f.panel(u+side*w/2,yy,.24,.09,3.10,.14,'#9f8861',true);f.panel(u,yy+.35,.25,w,.07,.14,'#9f8861',true);yield;}
   }
   for(let i=0;i<=bays;i++){const u=i*f.len/bays;f.panel(u,5.65,.17,.8,4.8,.32,'#cbc9b7');pediment(f,u,7.92,.9,-.45,y,'#bab9a8');}
   f.panel(f.len/2,3.68,.29,f.len,.30,.50,'#b3b2a2');cornice(f,h);yield;
  }
  const upper:XY[]=restaurant.p.map(([x,z])=>[247.9+(x-247.9)*.93,-28.2+(z+28.2)*.91]);
  solid(upper,3.9,y+h+.18,'#b5b4a0',true);solid(upper,.12,y+h+4.08,'#73796f',true);yield;
  for(const f of faces(upper,y)){
   const q=f.at(f.len/2),out=f.at(f.len/2,1);if(q[1]>-22&&out[1]>q[1]){
    f.panel(f.len/2,h+2.13,.16,f.len,3.85,.03,'#738e91',false,1);
    for(let u=0;u<=f.len;u+=1.65)f.panel(u,h+2.13,.24,.06,3.86,.09,'#a59168',true);
    for(const yy of[h+.23,h+1.5,h+2.8,h+4.04])f.panel(f.len/2,yy,.24,f.len,.055,.10,'#a59168',true);yield;
   }
  }
 });

 // Pușkin 26/B: the official entrance photo resolves stone courses, red-brown
 // jambs and a white glazed door. Unseen upper elevations remain restrained;
 // their three-storey volume follows OSM rather than speculative ornament.
 const small=feature('w51812369');
 job('Pușkin 26/B · corpul de lângă Primărie',small.p,[51812369],function*(){
  const y=ground(214,24)+.06,h=11.65;
  solid(small.p,h+5,y-5,'#b9b8a8',true,small.holes);solid(small.p,.16,y+h,C.roof,true);yield;
  for(const f of faces(small.p,y)){
   if(f.len<3)continue;cornice(f,h);yield* rustication(f,3.85);
   const q=f.at(f.len/2),out=f.at(f.len/2,1),front=q[1]<25&&out[1]<q[1],bays=Math.max(1,Math.round(f.len/4.0));
   if(front){
    yield* rows(f,2,bays,5.74,3.56);
    const entry=2.5*f.len/bays;
    for(let i=0;i<bays;i++)if(i!==2)f.window((i+.5)*f.len/bays,2.06,Math.min(2.30,f.len/bays*.63),2.92,C.trim,'#c0c3b5');
    for(const side of[-1,1])f.panel(entry+side*.90,2.05,.30,.24,3.74,.42,'#80675a');
    f.panel(entry,2.05,.39,1.48,3.67,.03,C.glass,false,1);
    for(const side of[-1,1])f.panel(entry+side*.75,2.05,.45,.075,3.72,.10,'#cbcfc3',true);
    for(const hh of[1.80,2.92,3.85])f.panel(entry,hh,.46,1.50,.075,.10,'#cbcfc3',true);
    f.panel(entry,1.06,.46,.07,1.5,.1,'#cbcfc3',true);
    const angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]),low=ground(...f.at(entry,1.22))+.02;
    for(let i=0;i<3;i++){const q=f.at(entry,1.14-i*.30);box(q[0],low+(i+1)*.13-.25,q[1],2.12,.5,.305,'#8c8070',false,true,angle);}
   }else yield* rows(f,3,bays,2.15,3.55);yield;
  }
 });

 // Theatre: the porch is genuinely recessed, with collision-free space between
 // four columns. It is not a solid OSM box hidden behind a decorative facade.
 const theatre=feature('w25194183');
 job('79 · Teatrul Național Mihai Eminescu',theatre.p,[25194183],function*(){
  const y=ground(451,20)+.02,cream='#c5bba0',trim='#d0c5ab',red='#80685a';
  const body:XY[]=theatre.p.map(p=>[...p] as XY);
  const porch=body.findIndex(p=>Math.abs(p[0]-443.32)<.02);
  body.splice(porch,2,[443.4,30.15],[459.07,30.15]);
  solid(body,18.6,y-5,cream,true,theatre.holes);solid(body,.18,y+13.6,C.roof,true,theatre.holes);yield;
  for(const f of faces(body,y)){
   f.panel(f.len/2,.65,.10,f.len,1.30,.20,red);
   cornice(f,13.6,trim);
   if(f.len>5&&f.at(f.len/2)[1]>34){
    const bays=Math.max(1,Math.round(f.len/4.3));yield* rows(f,2,bays,3.45,5.12,trim);
    for(let u=0;u<f.len;u+=4.3)f.panel(u,7.0,.18,.46,10.2,.36,trim,true);
   }yield;
  }
  // Set-back attic and low metal roof follow the documented side silhouette.
  const attic:XY[]=[[437.3,29],[464.3,29],[466.4,89.7],[439.7,90.6],[437.3,29]];
  solid(attic,2.7,y+13.8,cream,true);solid(attic,.14,y+16.5,C.roof,true);yield;
  for(const f of faces(attic,y)){cornice(f,16.5,trim);if(f.len>8){const n=Math.round(f.len/4.5);for(let i=0;i<n;i++){f.window((i+.5)*f.len/n,15.1,1.12,1.60,trim,C.wood);if(i%5===4)yield;}}yield;}
  roof(452,65,27.2,47.8,y+16.68,2.0,'#8a8d82');yield;
  const front=facade([459.07,24],[443.32,24],y),back=facade([459.07,30.15],[443.4,30.15],y+1.26);
  // Nine 14 cm risers; the bottom tread starts on the existing paved forecourt.
  // Their width follows the facade, while the central top deck reaches the doors.
  for(let i=0;i<9;i++){
   const width=28.0-i*.15,z0=20.45+i*.39;
   solid([[451.35-width/2,z0],[451.35+width/2,z0],[451.35+width/2,24.12],[451.35-width/2,24.12]],(i+1)*.14+.15,y-.15,'#a6a494',true);yield;
  }
  solid([[442.6,23.96],[460.0,23.96],[460.0,30.23],[442.6,30.23]],.24,y+1.02,'#b0ab97',true);yield;
  for(const u of[1.9,5.9,9.9,13.9]){
   const q=front.at(u);column(q[0],q[1],y+1.26,11.0,.46,trim,true);
   // Restrained Corinthian leaf silhouette, merged with the opaque stone mesh.
   for(let k=0;k<8;k++){const a=k*Math.PI/4,g=new T.SphereGeometry(.15,6,4);g.scale(.72,2.5,.8);g.rotateZ(-.35);g.rotateY(a);g.translate(q[0]+Math.cos(a)*.44,y+11.77,q[1]+Math.sin(a)*.44);put(g,cream,true);}
   yield;
  }
  for(const u of[-.15,15.9])front.panel(u,6.87,0,.70,11.23,.80,trim);
  for(const [hh,h,d]of[[12.5,.32,.8],[13.06,.83,.80],[13.62,.22,1.15],[13.84,.15,1.35]])front.panel(7.875,hh,.12,17.0,h,d,trim);
  front.label('TEATRUL NATIONAL MIHAI EMINESCU',7.87,12.92,.34,'#68604e',.55);
  pediment(front,7.875,13.94,17.25,3.28,y,cream);
  for(let u=.1;u<16;u+=.40)front.panel(u,13.48,.54,.13,.19,.22,trim,true);
  for(const u of[3.7,7.85,12.0]){
   back.panel(u,1.88,.23,2.12,3.76,.035,'#584137',false,1);
   for(const s of[-1,1]){back.panel(u+s*1.14,1.95,.33,.18,3.9,.32,trim);for(let row=0;row<4;row++)back.panel(u+s*.49,.54+row*.77,.31,.75,.52,.07,'#795c48',true);}
   back.panel(u,1.88,.33,.07,3.76,.1,'#3f342d',true);
   back.window(u,7.45,2.10,3.02,trim,C.wood);
   back.panel(u,4.92,.24,2.18,1.18,.34,trim);
   const q=back.at(u,.45),g=new T.TorusGeometry(.35,.07,4,12);g.rotateY(Math.PI);g.translate(q[0],y+6.18,q[1]);put(g,cream,true);
   back.panel(u,4.12,.30,2.18,.19,.35,trim);yield;
  }
  // Narrow side bays and the actual lower wooden entrances, not extra columns.
  for(const [a,b]of[[[443.4,27.81],[436.51,27.73]],[[464.93,27.81],[459.07,27.8]]] as [XY,XY][]){
   const f=facade(a,b,y);f.window(f.len/2,8.74,2.18,3.0,trim,C.wood);f.window(f.len/2,3.48,2.18,3.02,trim,C.wood);
   f.panel(f.len/2,6.20,.28,2.3,1.13,.40,trim);for(const u of[.32,f.len-.32]){f.panel(u,6.9,.28,.46,10.45,.54,trim);f.panel(u,12.08,.39,.73,.38,.65,trim);}yield;
  }
  for(const x of[437.6,464.8]){
   const yy=ground(x,21.7);box(x,yy+.20,21.7,.58,.40,.58,red,false,true);
   beam(new T.Vector3(x,yy+.4,21.7),new T.Vector3(x,yy+3.25,21.7),.09,C.iron,false);
   for(const [dx,dz,dh]of[[0,0,0],[-.25,0,-.22],[.25,0,-.22],[0,.25,-.22]]){const g=new T.SphereGeometry(.13,8,5);g.translate(x+dx,yy+3.3+dh,21.7+dz);put(g,'#d0cbb8');}yield;
  }
 });

 // The mapped canopy at the west side is a roof, not a solid extra building.
 const canopy=feature('w859288020');
 job('Teatru · copertina laterală',canopy.p,[859288020],function*(){
  const y=ground(432.5,60);solid(canopy.p,.22,y+4.2,'#696e62',true);
  for(const [x,z]of[[429.4,51.5],[429.8,70.8]])box(x,y+2.1,z,.14,4.2,.14,C.iron,false,true);yield;
 });

 // North side: no.130 and the two separately mapped parts of no.128. The
 // limestone courses, iron balconies and dark retail plinth come from photos.
 for(const [id,title,h,anchor]of[
  ['w74002816','130 · colțul Eminescu',11.7,[501,-17]],
  ['w143181540','128/1 · magazinele joase',4.15,[549,-17]],
  ['w67803032','128 · colțul Alecsandri',11.7,[591,-17]]
 ] as [string,string,number,XY][]){
  const f=feature(id);
  job(title,f.p,[Number(id.slice(1))],function*(){
   const y=ground(...anchor)+.06,p=f.p.map(p=>[...p] as XY);
   if(id==='w74002816'){
    const corner=p.findIndex(p=>Math.abs(p[0]-485.43)<.02);
    p.splice(corner,1,[487.43,-16.53],[485.41,-18.51]);
   }
   solid(p,h+5,y-5,'#bcb6a1',true,f.holes);solid(p,.15,y+h,C.roof,true,f.holes);yield;
   for(const face of faces(p,y)){
    if(face.len<2.5)continue;
    const q=face.at(face.len/2),out=face.at(face.len/2,1),boulevard=q[1]>-20&&out[1]>q[1],side=(id==='w74002816'&&q[0]<486)||(id==='w67803032'&&q[0]>612);
    cornice(face,h);yield* rustication(face);
    const bays=Math.max(1,Math.round(face.len/3.8));
    if(boulevard||side){
     // Light lower finish at the Alecsandri corner is physically in front of
     // the body; panes are another 12 cm forward, never coplanar with masonry.
     if(id==='w67803032')face.panel(face.len/2,1.8,.08,face.len,3.6,.16,'#c8c8b9');
     yield* shops(face,bays,id==='w74002816'?'#7d4c49':'#585c57');
     if(h>8)yield* rows(face,2,bays,5.40,3.56);
     for(let u=.5;u<face.len;u+=1.05)face.panel(u,h-.47,.33,.22,.30,.43,C.trim,true);
     if(h>8)for(let u=6;u<face.len-2;u+=11.6){balcony(face,u,4.1,2.42);balcony(face,u,7.67,2.35,id==='w67803032');yield;}
     for(let yy=4.1;yy<h-.8;yy+=.52)face.panel(face.len/2,yy,.115,face.len,.023,.03,'#a29e8c',true);
    }else yield* rows(face,h>8?3:1,bays,2.02,3.5);
    yield;
   }
   if(id==='w74002816'){
    const corner=facade([485.41,-18.51],[487.43,-16.53],y);
    corner.panel(corner.len/2,1.56,.30,1.78,2.96,.03,C.glass,false,1);
    for(const yy of[5.4,8.96]){corner.window(corner.len/2,yy,1.40,2.24,C.trim,C.wood);balcony(corner,corner.len/2,yy-1.3,2.15);}
    corner.panel(corner.len/2,3.22,.37,corner.len+.2,.48,.50,'#844f4d');
    // Chamfered corner crown and shallow gray roof visible in the street view.
    const crown:XY[]=[[485.8,-18.3],[487.7,-16.8],[492.3,-16.9],[492.2,-24.1],[485.7,-24],[485.8,-18.3]];
    solid(crown,2.6,y+h,'#b8b29e',true);solid(crown,.18,y+h+2.6,C.trim,true);
    for(const f of faces(crown,y))if(f.len>3)f.window(f.len/2,h+1.12,.88,1.3,C.trim,C.wood);
    roof(489,-20.4,6.3,6.5,y+h+2.8,1.45,'#818579');yield;
   }
   if(id==='w67803032'){
    // The photographed raised side entrance on Alecsandri, with a stone
    // balustrade and rust-red base. It stays within the sidewalk recess.
    const low=ground(615.1,-26.7)+.02;
    for(let i=0;i<11;i++){
     const z=-27-i*.33;box(615.1,low+(i+1)*.155-.35,z,2.5,.70,.335,'#a99e8b',false,true);
     for(const x of[613.87,616.33]){box(x,low+(i+1)*.155+.48,z,.12,.88,.14,C.trim,true);box(x,low+(i+1)*.155+.94,z,.22,.12,.37,C.trim,true);}yield;
    }
    box(614.95,low+1.555,-31.2,2.80,.30,2.4,'#a99e8b',false,true);
    box(616.33,low+.79,-31.2,.18,1.57,2.4,'#866e60');
    for(let z=-32.3;z<-30;z+=.30)box(616.33,low+2.18,z,.12,.93,.14,C.trim,true);
    box(616.33,low+2.68,-31.2,.23,.14,2.5,C.trim,true);yield;
   }
  });
 }

 // Southern two-storey historic frontage, including no.77. Circular attic
 // openings are distinct from the tall upper windows in the dated photographs.
 const south=feature('w67803035');
 job('77 · frontul istoric spre Alecsandri',south.p,[67803035],function*(){
  const y=ground(532,24)+.08,h=10.35;
  solid(south.p,h+5,y-5,'#c2be9c',true,south.holes);solid(south.p,.16,y+h,C.roof,true,south.holes);yield;
  for(const f of faces(south.p,y)){
   cornice(f,h);yield* rustication(f,3.7);
   const q=f.at(f.len/2),out=f.at(f.len/2,1),isFront=q[1]<28&&out[1]<q[1];
   if(f.len<3)continue;
   const bays=Math.max(1,Math.round(f.len/3.85));
   if(isFront){
    yield* shops(f,bays,'#626853');
    yield* rows(f,1,bays,6.45,3.5);
    f.panel(f.len/2,4.0,.23,f.len,.26,.46,C.trim);
    for(let i=0;i<bays;i++){
     const u=(i+.5)*f.len/bays;
     f.panel(u,7.97,.33,2.35,.21,.56,C.trim,true);
     if(i%2===0){
      const q=f.at(u,.28),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
      const g=new T.CircleGeometry(.41,16);g.rotateY(angle);g.translate(q[0],y+9.18,q[1]);put(g,'#768578',false,false,1);
      const ring=new T.TorusGeometry(.48,.10,4,16);ring.rotateY(angle);ring.translate(q[0],y+9.18,q[1]);put(ring,C.trim,true);
     }
     if(i%4===1)balcony(f,u,4.47,2.48,true);
     if(i%4===3)yield;
    }
    for(let u=.35;u<f.len;u+=5.8)f.panel(u,6.84,.20,.38,4.8,.4,C.trim);
    // Open parapet rather than a dark oversized pitched roof.
    f.panel(f.len/2,10.91,.1,f.len,.15,.36,C.trim);
    for(let u=.2;u<f.len;u+=.48)f.panel(u,10.65,.1,.10,.48,.18,C.trim,true);
   }else yield* rows(f,2,bays,2.1,4.23);
   yield;
  }
 });

 // The corner is registered as Vasile Alecsandri 115, not boulevard 75. Its
 // pale upper stone and pronounced rectangular attic are photographed.
 const corner=feature('w1054390977');
 job('Alecsandri 115 · colțul bulevardului',corner.p,[1054390977],function*(){
  const y=ground(608,24)+.08,h=9.65;
  solid(corner.p,h+5,y-5,'#c3c1ac',true,corner.holes);solid(corner.p,.16,y+h,C.roof,true);yield;
  for(const f of faces(corner.p,y)){
   if(f.len<2.8)continue;cornice(f,h);yield* rustication(f,3.75);
   const q=f.at(f.len/2),out=f.at(f.len/2,1),isStreet=(q[1]<27&&out[1]<q[1])||(q[0]>614&&out[0]>q[0]),bays=Math.max(1,Math.round(f.len/3.6));
   if(isStreet){
    yield* shops(f,bays,'#778579');yield* rows(f,1,bays,6.65);
    f.panel(f.len/2,4.01,.28,f.len,.30,.55,C.trim);
    for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;f.panel(u,8.05,.34,2.28,.18,.53,C.trim);if(i%3===1)balcony(f,u,5.02,2.4,true);}
    for(const u of[.30,f.len-.30]){f.panel(u,6.65,.28,.57,5.02,.54,C.trim);f.panel(u,9.04,.42,.82,.27,.72,C.trim);}
   }else yield* rows(f,2,bays,2.05,4.35);yield;
  }
  box(611.1,y+h+.75,27.9,8.4,1.5,8.2,'#c3c1ac',false,true);
  box(611.1,y+h+1.58,27.9,8.7,.16,8.5,C.trim,false,true);yield;
 });

 return mesh;
}
