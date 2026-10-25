import * as T from 'three';
import realm from '../data/museum-quarter-ground.json';
import {streetMesh,streetRect as rect,lettering} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import {scrollBench} from './street-furniture';
import {sculpture} from './pedestrian-furniture';
import {feature,type XY} from './city-layout';

/** Library forecourt and museum thresholds. The Caldarâm works stay native. */
export function createMuseumQuarter(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const architecture=streetMesh(scene,'31 August · arhitectură',ground,loaded),a=photoArchitecture(architecture);
 const realmLayer=landscapeLayer(scene,'31 August · spațiul pietonal',ground,loaded,{maxEdge:3,residentDistance:620});
 const {job,put,box,solid,facade}=architecture;
 const stone='#bbb59f',trim='#c9c4b1',base='#9c9985',roof='#707970';
 const libraryFloor=()=>ground(25,291.5)+1.16;
 const footprint=feature('w26790041');
 job('Biblioteca Națională · blocul central',footprint.p,[26790041],function*(){
  const y=libraryFloor(),height=15.2,p=footprint.p;
  solid(p,height+5,y-5,stone,true);solid(p,.20,y+height,roof,true);yield;
  // Six colossal columns, three doors and two tall upper window rows.
  const f=facade([-3.26,286.37],[53.73,285.62],y);
  f.panel(f.len/2,1.0,.12,f.len,2.0,.24,base);
  for(const top of[2.10,6.45,10.77,14.55,15.02])f.panel(f.len/2,top,.25,f.len+.22,top>14?.34:.20,.52,trim);
  for(const u of[15.3,20.6,25.9,31.2,36.5,41.8]){
   const [x,z]=f.at(u,1.15);a.column(x,z,y+2.0,12.25,.69,stone,true);
   box(x,y+1,z,1.98,2.0,1.72,base,false,true);
   for(let h=2.7;h<13.7;h+=.65){const g=new T.TorusGeometry(.658,.010,3,14);g.rotateX(Math.PI/2);g.translate(x,y+h,z);put(g,'#a6a38f',true);}
   const medal=new T.TorusGeometry(.18,.026,4,12);medal.translate(0,0,.02);medal.rotateY(Math.atan2(.75,56.99));medal.translate(x,y+13.78,z+.65);put(medal,trim,true);yield;
  }
  for(const u of[17.95,28.55,39.15]){
   a.door(f,u,4.05,2.52,'#554134');
   f.panel(u,4.30,.35,3.05,.29,.25,trim);
  }
  for(const u of[17.95,23.25,28.55,33.85,39.15]){
   f.window(u,8.52,3.42,2.68,trim,'#51473b');f.window(u,12.63,3.42,2.72,trim,'#51473b');yield;
  }
  for(const u of[3.9,8.9,47.1,52.2])for(const h of[3.55,8.52,12.63])f.window(u,h,2.35,2.7,trim,'#51473b');
  // Rusticated base and restrained stone frieze; surface colour is warm limestone.
  for(let u=.3;u<f.len;u+=1.15){for(let row=0;row<3;row++)f.panel(u+(row%2)*.46,.35+row*.57,.265,1.02,.47,.07,row%2?'#a5a28e':base,true);if(Math.floor(u/1.15)%6===5)yield;}
  f.panel(f.len/2,15.6,.15,f.len+.5,.95,.46,stone);
  for(let u=.2;u<f.len;u+=.52)f.panel(u,15.7,.43,.12,.50,.16,trim,true);
  for(const u of[15.9,30.0,41.5]){f.panel(u,1.50,.42,.64,.47,.05,'#46544a');f.label('BIBLIOTECA',u,1.57,.048,'#b8a570',.46);f.label('NAȚIONALĂ',u,1.47,.045,'#b8a570',.46);}
  yield;
  for(const face of a.faces(p,y)){
   const q=face.at(face.len/2);if(q[1]>284)continue;
   a.cornice(face,height,trim);yield* a.windows(face,3,height,Math.max(2,Math.round(face.len/4.8)),3.5,trim,'#61594b');
  }
 });
 job('Biblioteca · trepte și palier',rect(25,288.75,29.2,5.5),[],function*(){
  const low=ground(25,291.5)+.12,high=libraryFloor(),count=8,start=291.5,end=287.1;
  for(let i=0;i<count;i++){
   const front=start+(end-start)*i/count,back=start+(end-start)*(i+1)/count,top=low+(high-low)*(i+1)/count;
   const bottom=Math.min(ground(25,(front+back)/2)-.15,low-.15);
   box(25,(bottom+top)/2,(front+back)/2,29.2,top-bottom,front-back,'#946f63',false,true);
   box(25,top+.004,front-.045,29.2,.008,.09,'#b3a79a',true);
   if(i%3===2)yield;
  }
  yield* architecture.surfaceStaged(rect(25,286.35,29.2,1.5),()=>high,'#a39280',true);
 });
 const museum=feature('w75517098');
 job('Muzeul Național de Artă · sediul Dadiani',museum.p,[75517098],function*(){
  const y=ground(124,328.4)+.54,brick='#b18d66',limestone='#c3b292',light='#cbbfa4',wood='#653f32';
  solid(museum.p,10.9,y-5,limestone,true);solid(museum.p,7.3,y+5.9,brick,true);solid(museum.p,.18,y+13.2,roof,true);yield;
  const central=rect(124.06,338.15,14.72,14.85);solid(central,3.2,y+13.2,brick,true);solid(central,.18,y+16.4,roof,true);
  function pointed(f:ReturnType<typeof facade>,u:number,bottom:number,w:number,h:number){
   const r=w/2,s=new T.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);
   s.quadraticCurveTo(r*.66,h-.21,0,h);s.quadraticCurveTo(-r*.66,h-.21,-r,h-r);s.closePath();
   const p=f.at(u,.34),v=f.at(1),q=f.at(0),angle=Math.atan2(-(v[1]-q[1]),v[0]-q[0]),g=new T.ShapeGeometry(s,10);g.rotateY(angle);g.translate(p[0],y+bottom,p[1]);put(g,'#506365',false,false,1);
   const path=new T.CatmullRomCurve3([[-r,bottom+h-r],[ -r*.69,bottom+h-.4],[0,bottom+h],[r*.69,bottom+h-.4],[r,bottom+h-r]].map(([x,h])=>new T.Vector3(x,h,0)));
   const edge=new T.TubeGeometry(path,18,.13,5,false);edge.rotateY(angle);const at=f.at(u,.43);edge.translate(at[0],y,at[1]);put(edge,light);
   for(const sign of[-1,1])f.panel(u+sign*(r+.1),bottom+(h-r)/2,.39,.20,h-r,.28,light);
   f.panel(u,bottom+h*.43,.44,w,.07,.065,wood,true);f.panel(u,bottom+(h-r)/2,.43,.07,h-r,.07,wood,true);
   if(h>4){const ring=new T.TorusGeometry(.37,.047,4,14);ring.rotateY(angle);const p=f.at(u,.46);ring.translate(p[0],y+bottom+h-1.02,p[1]);put(ring,wood,true);for(const dx of[-.48,.48])f.panel(u+dx,bottom+1.75,.44,.05,3.1,.05,wood,true);}
  }
  const segments:[XY,XY,number,number][]=[[[169.56,330.61],[165.21,330.65],13.2,1],[[165.19,331.16],[148.59,331.2],13.2,4],[[148.62,330.67],[144.46,330.69],14.1,1],[[144.51,333.78],[131.33,333.8],13.2,3],[[131.41,330.72],[116.7,330.75],16.4,3],[[116.76,333.83],[103.58,333.86],13.2,3],[[103.6,330.78],[99.21,330.79],14.1,1],[[99.2,331.33],[80.29,331.38],13.2,4],[[80.28,330.84],[75.82,330.84],13.2,1]];
  for(const [from,to,h,bays]of segments){
   const f=facade(from,to,y),main=h===16.4;
   for(const top of[.75,5.83,6.14,h-.50,h-.13])f.panel(f.len/2,top,.28,f.len+.15,top>h-1?.27:.18,.55,light);
   for(let row=0;row<8;row++){f.panel(f.len/2,1.05+row*.54,.17,f.len,.023,.03,'#a4947d',true);if(row%4===3)yield;}
   for(let i=0;i<bays;i++){
    const u=(i+.5)*f.len/bays;
    const centerFace=main&&i===1?facade([126.78,330.35],[121.44,330.39],y):f;
    const centerU=main&&i===1?centerFace.len/2:u;
    if(main&&i===1){pointed(centerFace,centerU,.12,2.9,5.12);a.door(centerFace,centerU,3.3,2.58,wood);const ring=new T.TorusGeometry(.53,.05,4,18);ring.rotateY(Math.PI);const p=centerFace.at(centerU,.47);ring.translate(p[0],y+4.02,p[1]);put(ring,wood,true);}
    else pointed(f,u,1.42,main?2.50:2.30,3.80);
    pointed(centerFace,centerU,6.74,main?2.84:2.52,main?5.28:4.26);
    for(const sign of[-1,1]){f.panel(u+sign*1.66,8.9,.35,.39,5.3,.35,light);if(!main)for(let k=0;k<7;k++)f.panel(u+sign*1.66,6.7+k*.62,.39,.58,.25,.42,light,true);}
    yield;
   }
   // Round-arched corbel course below the broad pale upper frieze.
   for(let u=.43;u<f.len;u+=.78){
    const p=f.at(u,.46),arch=new T.TorusGeometry(.24,.065,4,9,Math.PI);arch.rotateY(Math.PI);arch.translate(p[0],y+h-1.22,p[1]);put(arch,light,true);
    f.panel(u-.34,h-1.52,.37,.12,.60,.37,light,true);
    if(Math.floor(u/.78)%7===6)yield;
   }
   f.panel(f.len/2,h-.55,.30,f.len,.54,.59,light);
  }
  const f=facade([131.41,330.72],[116.7,330.75],y),mid=f.len/2;
  f.panel(mid,6.04,1.00,8.5,.34,2.0,light);f.panel(mid,7.07,1.92,8.5,.15,.24,light);
  for(let i=-4;i<=4;i++){
   const u=mid+i*.89;f.panel(u,6.57,1.9,.14,.83,.25,light,true);
   if(i<4){const p=f.at(u+.45,1.93),g=new T.TorusGeometry(.28,.055,4,12);g.rotateY(Math.PI);g.translate(p[0],y+6.58,p[1]);put(g,light,true);}
  }
  for(const side of[-1,1]){const p=f.at(mid+side*3.2,.64);const g=new T.ConeGeometry(.35,1.0,4);g.rotateZ(Math.PI);g.translate(p[0],y+5.4,p[1]);put(g,light);}
  f.panel(mid,17.08,.12,3.40,2.35,.40,brick);pointed(f,mid,16.16,1.84,2.43);a.pediment(f,mid,18.25,3.9,.7,y,light);yield;
  // Small open lantern above the central roof, with a dark cap.
  for(const dx of[-.43,.43])for(const dz of[-.43,.43])box(124.05+dx,y+18.35,337.4+dz,.17,2.35,.17,light,true);
  const cap=new T.ConeGeometry(.95,1.45,6);cap.translate(124.05,y+20.1,337.4);put(cap,'#625a4d');
  for(const p of [[98.7,337],[149,337]] as const)box(p[0],y+14.5,p[1],.65,1.8,.65,brick);
  yield;
  for(const face of a.faces(museum.p,y)){const p=face.at(face.len/2);if(p[1]<334||face.len<3)continue;a.cornice(face,13.2,light);yield* a.windows(face,2,13.2,Math.max(1,Math.round(face.len/4)),3.2,light,wood);}
 });
 job('Muzeul de Artă · accesul central',rect(124.05,329.2,3.35,2.8),[],function*(){
  const high=ground(124,328.4)+.54,low=ground(124.05,327.5)+.12;
  for(let i=0;i<4;i++){const top=low+(high-low)*(i+1)/4,bottom=Math.min(low-.18,ground(124.05,328+i*.62)-.18);box(124.05,(top+bottom)/2,327.65+(i+.5)*.62,3.35,top-bottom,.62,'#999786',false,true);yield;}
  yield* architecture.surfaceStaged(rect(124.05,330.25,3.35,.24),()=>high,'#999786',true);
 });
 // The wide stair has a level first tread. Blend its apron into the sloping
 // terrain over three metres, including the two sides of the actual stair.
 const floor=(x:number,z:number)=>{
  const native=ground(x,z)+.12;
  const wx=Math.max(0,1-Math.max(0,Math.abs(x-25)-14.6)/3);
  const wz=Math.max(0,1-Math.abs(z-291.5)/3);
  return native+(ground(25,291.5)+.12-native)*wx*wz;
 };
 for(const cell of realm.cells)realmLayer.job(`alei ${cell.x}/${Math.round(cell.z)}`,cell.x,cell.z,function*(){
  for(const p of cell.patches)yield* realmLayer.surfaceStaged(p.rings,p.color,p.kind,floor,true);
 },cell.coverage);
 // Furniture belongs to the forecourt, where the current mapped benches remain.
 for(const p of realm.benches){const [x,z]=p.p;realmLayer.job(`bancă ${p.id}`,x,z,function*(){
  const angle=z>301?Math.PI:x<25?Math.PI/2:-Math.PI/2;
  scrollBench(realmLayer,x,floor(x,z),z,angle,'#79614a');yield;
 });}
 realmLayer.job('Vasile Alecsandri · monumentul Bibliotecii',25.95,294.95,function*(){
  const x=25.95,z=294.95,y=floor(x,z),s=sculpture(realmLayer,x,y,z),stone='#a7a58f';
  s.block(0,.09,0,1.70,.18,1.65,stone,true);s.block(0,.65,0,1.19,1.00,1.13,stone,true);s.block(0,1.18,0,1.40,.14,1.32,stone,true);
  // Standing poet in a long coat, left leg forward and one hand at the waist.
  s.rod([-.20,1.36,.05],[-.12,2.40,0],.092);s.rod([.22,1.36,.10],[.13,2.40,0],.092);
  s.ball(-.20,1.32,.17,.13,.07,.26);s.ball(.22,1.32,.20,.13,.07,.26);
  const coat=new T.CylinderGeometry(.28,.38,1.22,12);coat.scale(1,1,.58);coat.translate(0,2.55,0);s.put(coat);
  s.ball(0,3.46,.02,.19,.23,.18);s.ball(0,3.60,-.06,.19,.10,.15,'#4b554b');
  s.rod([-.28,3.0,0],[-.35,2.34,.11],.08);s.ball(-.35,2.30,.12,.073,.11,.064);
  s.rod([.28,3.0,0],[.43,2.61,.02],.08);s.rod([.43,2.61,.02],[.17,2.52,.17],.068);
  for(const [text,h]of[['VASILE',.82],['ALECSANDRI',.65]] as const){const g=lettering(text,.09);g.translate(x,y+h,z+.57);realmLayer.put(g,'#555a4d',0,true);}
  yield;
 });
 return{
  objects:[...architecture.objects,...realmLayer.objects],collisionObjects:[...architecture.collisionObjects,...realmLayer.collisionObjects],replacements:architecture.replacements,
  get ready(){return architecture.ready&&realmLayer.ready;},
  readyNear(x:number,z:number,r=420){return architecture.readyNear(x,z,r)&&realmLayer.readyNear(x,z,r);},
  update(camera:T.PerspectiveCamera,now:number){architecture.update(camera,now);realmLayer.update(camera,now);},
  dispose(){architecture.dispose();realmLayer.dispose();}
 };
}
