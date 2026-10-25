import * as T from 'three';
import realm from '../data/alexandru-sector.json';
import plans from '../data/alexandru-cadastral-plans.json';
import {streetMesh,streetRect as rect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import {feature,type XY} from './city-layout';

/** Alexandru cel Bun, Bodoni–Pușkin. Static, staged jobs on mapped footprints.
 * Unverified neighbouring facades and their native street furniture stay native. */
export function createAlexandruSector(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Alexandru cel Bun · arhitectură',ground,loaded),a=photoArchitecture(m);
 const l=landscapeLayer(scene,'Alexandru cel Bun · trotuare',ground,loaded,{maxEdge:2.5,residentDistance:620});
 const {solid,box,facade,put}=m;
 const trim='#c2c0ad',metal='#35474f',glass='#4d6878',stone='#a8a58e';
 const austroFloor=()=>ground(-62.25,-458.5)+.96;
 const cremeFloor=()=>ground(13.8,-473.5)+.83;
 function segmentalWindow(f:ReturnType<typeof facade>,u:number,w:number,y:number){
  const h=2.4,r=w/2,s=new T.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-.22);s.quadraticCurveTo(0,h+.22,-r,h-.22);s.closePath();
  const q=f.at(u,.34),p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  const g=new T.ShapeGeometry(s,8);g.rotateY(angle);g.translate(q[0],y+1.12,q[1]);put(g,glass,false,false,1);
  f.panel(u,2.15,.40,w,.08,.08,metal,true);
  const curve=new T.QuadraticBezierCurve3(new T.Vector3(-r,3.3,0),new T.Vector3(0,3.74,0),new T.Vector3(r,3.3,0));
  const edge=new T.TubeGeometry(curve,10,.072,4,false);edge.rotateY(angle);const at=f.at(u,.42);edge.translate(at[0],y,at[1]);put(edge,trim,true);
 }
 function* masonry(f:ReturnType<typeof facade>,h:number){
  // Thin mortar courses are merged and culled at distance; no brick meshes.
  for(let row=0;row<h/.36;row++){
   f.panel(f.len/2,row*.36,.027,f.len,.022,.033,'#858878',true);
   if(row%7===6)yield;
  }
 }
 const austro={...feature('w689623074'),p:plans.austro.p as XY[],holes:plans.austro.holes as XY[][]};
 m.job('85 · Centrul Austro-German',austro.p,[689623074],function*(){
  const y=austroFloor(),h=8.6;
  for(const [p,...holes]of plans.austro.lowerWalls)solid(p as XY[],8.7,y-4,'#93968c',true,holes as XY[][]);
  solid(austro.p,h-4.7,y+4.7,'#93968c',true,austro.holes);solid(austro.p,.18,y+h,'#555f5a');yield;
  const front:[XY,XY][]=[[[ -48.94,-454.66],[-56.68,-454.48]],[[-56.68,-454.48],[-59.6,-456.47]],[[-59.6,-456.47],[-64.86,-456.17]],[[-64.86,-456.17],[-67.39,-454.48]],[[-67.39,-454.48],[-71.43,-454.42]]];
  for(const [start,end]of front){
   const f=facade(start,end,y),centerBay=start[0]===-59.6,bays=centerBay?1:Math.max(1,Math.round(f.len/2.9));
   f.panel(f.len/2,.22,.13,f.len,.44,.26,'#514e46');
   for(let i=0;i<bays;i++){
    const u=(i+.5)*f.len/bays,w=Math.min(1.55,f.len/bays-.8);
    if(centerBay){
     f.panel(u,1.78,.34,1.95,3.5,.05,glass,false,1);
     for(const off of[-1,0,1])f.panel(u+off*.98,1.8,.4,.08,3.54,.10,metal);
     for(const hh of[.07,1.7,3.55])f.panel(u,hh,.41,2.0,.075,.11,metal);
     f.panel(u+.2,1.3,.47,.03,.36,.055,'#a5ac9f',true);
    }else {segmentalWindow(f,u,w,y);f.panel(u,.65,.26,w+.36,.65,.25,trim);for(let h=.43;h<.91;h+=.1)f.panel(u,h,.407,w,.025,.025,'#797c70',true);}
    for(const sign of[-1,1]){
     const v=u+sign*(w/2+.21);f.panel(v,2.35,.22,.24,3.35,.35,trim);
     for(const hh of[1.1,3.36,3.66])f.panel(v,hh,.29,.42,.13,.41,trim);
    }
    f.panel(u,4.02,.21,f.len/bays-.18,.54,.30,trim);
    for(let t=u-w/2;t<=u+w/2;t+=.32)f.panel(t,4.38,.2,.15,.29,.31,trim,true);
    yield;
   }
   f.panel(f.len/2,4.7,.20,f.len,.40,.40,trim);
   f.panel(f.len/2,6.71,.16,f.len,3.53,.07,glass,false,1);
   for(let u=.1;u<f.len;u+=1.12)f.panel(u,6.73,.23,.052,3.58,.065,metal);
   for(const h of[4.95,7.35,8.46])f.panel(f.len/2,h,.24,f.len,.065,.075,metal);
   yield;
  }
  // The centre retains the photographed projecting glazing and curved support.
  const f=facade([-59.6,-456.47],[-64.86,-456.17],y);
  f.panel(f.len/2,4.70,.39,f.len,.37,.79,trim);
  f.label('CENTRUL AUSTRO-GERMAN',f.len/2,4.56,.155,'#b39a66',.81);
  const curve=new T.CatmullRomCurve3([[-58.0,y,-455.35],[-59.0,y+1.5,-455.48],[-59.3,y+2.55,-455.62],[-58.65,y+3.75,-455.63],[-58.05,y+4.5,-455.5]].map(p=>new T.Vector3(...p as [number,number,number])));
  put(new T.TubeGeometry(curve,12,.18,5,false),trim,false,true);yield;
  for(const f of a.faces(austro.p,y)){const p=f.at(f.len/2);if(p[1]<-453)continue;yield* a.windows(f,2,h,Math.max(1,Math.round(f.len/3.5)),2.35,trim,metal);}
 });
 m.job('85 · șase trepte la intrare',rect(-62.25,-457.4,4.5,2.2),[],function*(){
  const y=austroFloor(),low=y-.84,start=-458.5,end=-456.3;
  for(let i=0;i<6;i++){
   const z0=start+(end-start)*i/6,z1=start+(end-start)*(i+1)/6,top=low+(i+1)*.14;
   box(-62.25,(top+low-.2)/2,(z0+z1)/2,4.5,top-low+.2,z1-z0,'#5c5750',false,true);yield;
  }
 });
 const pg={...feature('w656482665'),p:plans.pg.p as XY[],holes:plans.pg.holes as XY[][]};
 m.job('100 · zidărie aparentă',pg.p,[656482665],function*(){
  const y=ground(-22.3,-475.77)+.12,h=18.0;
  solid(pg.p,h+5,y-5,stone,true,pg.holes);solid(pg.p,.19,y+h,'#626961',true,pg.holes);yield;
  for(const f of a.faces(pg.p,y)){
   const p=f.at(f.len/2),out=f.at(f.len/2,1);if(f.len<2.7)continue;
   const front=p[1]>-479&&out[1]>p[1];
   for(const top of[.5,4.1,7.8,11.45,15.05,17.8])f.panel(f.len/2,top,.08,f.len,.24,.16,'#898d80');
   yield* a.windows(f,4,15.2,Math.max(1,Math.round(f.len/4.5)),2.15,'#b7bcad','#6b7772');
   if(front){
    yield* masonry(f,h);
    for(let u=2;u<f.len;u+=4.5){
     f.panel(u,16.25,.12,1.35,1.7,.20,'#bab49d');
     const q=f.at(u,.67),r=f.at(u,.16);m.beam(new T.Vector3(q[0],y+17.65,q[1]),new T.Vector3(r[0],y+15.95,r[1]),.045,'#5d635b',true);yield;
    }
    for(let u=3;u<f.len;u+=12){const q=f.at(u,-1);box(q[0],y+18.6,q[1],.78,1.08,.68,'#966f57');}
   }
   yield;
  }
 });
 const creme={...feature('w656482664'),p:plans.creme.p as XY[],holes:plans.creme.holes as XY[][]};
 m.job('98A · Crème de la Crème',creme.p,[656482664],function*(){
  const y=cremeFloor(),h=17.5;
  for(const [p,...holes]of plans.creme.lowerWalls)solid(p as XY[],8.16,y-5,'#b2ab95',true,holes as XY[][]);
  solid(creme.p,h-3.16,y+3.16,'#b2ab95',true,creme.holes);solid(creme.p,.16,y+h,'#687367');yield;
  for(const f of a.faces(creme.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1);if(f.len<2||q[0]<p[0]&&p[0]<0)continue;
   f.panel(f.len/2,3.2,.12,f.len,6.4,.24,'#b9b09a');
   for(const hh of[.40,3.1,6.35,6.7,10.4,14,17.3])f.panel(f.len/2,hh,.20,f.len+.1,.16,.40,trim);
   const bays=Math.max(1,Math.round(f.len/3.3));
   for(let i=0;i<bays;i++){
    const u=(i+.5)*f.len/bays;
    if(p[0]>10&&p[1]>-477.5)a.door(f,u,2.7,1.65,'#6e4935');
    else for(const hh of[1.65,4.85])f.window(u,hh,Math.min(1.55,f.len/bays-.7),2.36,trim,'#684b3a');
    for(const hh of[8.55,12.05,15.7])f.window(u,hh,Math.min(1.55,f.len/bays-.7),2.10,trim,'#827765');
    yield;
   }
   a.cornice(f,h,trim);
  }
  // Chamfered mapped corner becomes the photographed curved bay above the door.
  const cx=10.15,cz=-477.02,r=2.16;
  for(let i=0;i<8;i++){
   const a0=i*Math.PI/16,a1=(i+1)*Math.PI/16;
   const f=facade([cx+Math.cos(a1)*r,cz+Math.sin(a1)*r],[cx+Math.cos(a0)*r,cz+Math.sin(a0)*r],y);
   f.panel(f.len/2,4.78,.04,f.len,2.82,.06,glass,false,1);
   f.panel(0,4.78,.09,.055,2.9,.11,'#684b3a');
   for(const hh of[3.16,6.25])f.panel(f.len/2,hh,.07,f.len+.06,.25,.34,trim);
   f.panel(f.len/2,2.89,.10,f.len+.07,.48,.36,'#a79776');yield;
  }
  const sign=facade([12.15,-476.65],[10.4,-474.9],y);
  sign.label('CRÈME DE LA CRÈME',sign.len/2,2.90,.115,'#695432',.35);
 });
 m.job('98A · treptele intrării pe colț',rect(12.7,-474.5,4.5,4.5),[],function*(){
  const low=cremeFloor()-.71,start:XY=[13.8,-473.5],end:XY=[11.3,-475.77];
  const dx=end[0]-start[0],dz=end[1]-start[1],len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
  for(let i=0;i<6;i++){
   const t=(i+.5)/6,top=low+(i+1)*.71/6;
   box(start[0]+dx*t,(top+low-.2)/2,start[1]+dz*t,2.05,top-low+.2,len/6,'#746554',false,true,angle);yield;
  }
 });
 // North/south footways share only boundaries with Doga and native asphalt.
 const floor=(x:number,z:number)=>{
  const base=ground(x,z)+.12;
  const wx=Math.max(0,1-Math.max(0,Math.abs(x+62.25)-2.25)/1.2);
  const wz=Math.max(0,1-Math.abs(z+458.5)/1.5);
  return base+(austroFloor()-.84-base)*wx*wz;
 };
 for(const cell of realm.cells)l.job(`pavaj ${cell.x}/${cell.z}`,cell.x,cell.z,function*(){
  for(const p of cell.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,floor,true);
 },cell.coverage);
 return{
  objects:[...m.objects,...l.objects],collisionObjects:[...m.collisionObjects,...l.collisionObjects],replacements:m.replacements.map(r=>({...r,footprints:r.id===689623074?[[austro.p,...austro.holes]]:r.id===656482665?[[pg.p,...pg.holes]]:[[creme.p,...creme.holes]],get ready(){return r.ready;}})),
  get ready(){return m.ready&&l.ready;},get residentCount(){return l.residentCount;},
  readyNear(x:number,z:number,r=420){return m.readyNear(x,z,r)&&l.readyNear(x,z,r);},
  update(camera:T.PerspectiveCamera,now:number){m.update(camera,now);l.update(camera,now);},
  dispose(){m.dispose();l.dispose();}
 };
}
