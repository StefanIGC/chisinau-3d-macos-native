import * as T from 'three';
import layout from '../data/stefan-park.json';
import {landscapeLayer} from './landscape-layer';
import {lettering} from './street-mesh';
import {type XY} from './city-layout';

const C={grass:'#567340',edge:'#a9aa9c',flowers:'#a24943',asphalt:'#666760',slab:'#96998f',band:'#675f59',paver:'#91867e',red:'#815e52',green:'#30794f',iron:'#303d36',bronze:'#424d44',stone:'#b9b5a2'};
const kinds:Record<string,number>={grass:4,edge:0,flowers:5,asphalt:3,slab:1,band:0,paver:2};
const rect=(x:number,z:number,w:number,d:number):XY[]=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
const smooth=(a:number,b:number,v:number)=>{const t=T.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};

/** Local terraces only. Original DEM and both landmark models remain unchanged. */
export function parliamentProfile(raw:(x:number,z:number)=>number){
 let calibration:{low:number;middle:number;top:number}|undefined;
 const levels=()=>calibration??=(function(){const low=raw(-506,28),top=raw(-503.89763663,106.65068688);return{low,middle:low+1.115,top};})();
 const profile=(z:number)=>{const a=levels();if(z<28)return a.low;if(z<32.2)return a.low+(z-28)/4.2*.98;if(z<54.65)return a.low+.98+(z-32.2)/22.45*.135;if(z<60.05)return a.middle+(z-54.65)/5.4*1.26;return T.MathUtils.lerp(a.middle+1.26,a.top,T.MathUtils.clamp((z-60.05)/35.25,0,1));};
 const ground=(x:number,z:number)=>{
  const native=raw(x,z);if(x< -527||x> -485||z<23||z>101)return native;
  const weight=(1-smooth(9.8,21,Math.abs(x+506)))*smooth(23,28,z)*(1-smooth(95.3,101,z));
  return native+Math.max(0,profile(z)-native)*weight;
 };
 return{ground,profile,levels};
}

export function createStefanPark(scene:T.Scene,raw:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const terrace=parliamentProfile(raw),ground=terrace.ground;
 const ready=(x:number,z:number)=>loaded(x,z)&&(x> -430||loaded(-506,28)&&loaded(-504,106.7));
 const layer=landscapeLayer(scene,'Ștefan cel Mare / Parlament',ground,ready);
 const {job,box,cylinder,shrub,beam,surfaceStaged,put}=layer;
 function ellipsoid(x:number,y:number,z:number,rx:number,ry:number,rz:number,color:string,fine=false){const g=new T.SphereGeometry(1,12,8);g.scale(rx,ry,rz);g.translate(x,y,z);put(g,color,0,fine);}
 function bench(x:number,z:number,angle:number){
  const y=ground(x,z)+.14,c=Math.cos(angle),s=Math.sin(angle);
  const at=(u:number,v:number,w:number)=>new T.Vector3(x+u*c+w*s,y+v,z-u*s+w*c);
  const part=(u:number,v:number,w:number,ww:number,h:number,d:number,col:string)=>{const p=at(u,v,w);box(p.x,p.y,p.z,ww,h,d,col,true,false,angle);};
  for(let i=0;i<5;i++)part(0,.47,-.21+i*.10,1.95,.062,.086,C.green);
  for(let i=0;i<5;i++)part(0,.66+i*.092,-.27-(i*.017),1.95,.08,.064,C.green);
  for(const side of[-1,1]){
   const u=side*.79;
   for(const w of[-.20,.21]){const a=at(u,.04,w),b=at(u,.48,w*.69);beam(a,b,.044,C.iron);}
   const back=[at(u,.08,-.25),at(u,.46,-.28),at(u,.79,-.36),at(u,1.04,-.39)];put(new T.TubeGeometry(new T.CatmullRomCurve3(back),7,.037,5,false),C.iron,0,true);
   const arm=[at(u,.53,.18),at(u,.65,.27),at(u,.77,.18),at(u,.80,-.05),at(u,.83,-.29)];put(new T.TubeGeometry(new T.CatmullRomCurve3(arm),10,.034,5,false),C.iron,0,true);
  }
 }
 function lamp(x:number,z:number,bollard=false){
  const y=ground(x,z)+.14;
  if(bollard){cylinder(x,y+.43,z,.068,.075,.86,'#929b99',true,8);cylinder(x,y+.84,z,.07,.07,.085,'#d2d1b8',true,8);return;}
  cylinder(x,y+.18,z,.15,.24,.36,C.iron,true);cylinder(x,y+1.94,z,.048,.08,3.48,C.iron,true);
  cylinder(x,y+3.79,z,.20,.12,.45,'#c3c8b3',true,4);cylinder(x,y+4.07,z,.035,.30,.22,C.iron,true,4);
  for(const dx of[-.15,.15])for(const dz of[-.15,.15])box(x+dx,y+3.79,z+dz,.025,.46,.025,C.iron,true);
  cylinder(x,y+4.23,z,0,.056,.16,C.iron,true,6);
 }
 function bust(p:typeof layout.props[number]){
  const x=p.x,z=p.z,y=ground(x,z)+.14,pushkin=p.id==='369821241',a=p.angle,c=Math.cos(a),s=Math.sin(a);
  const transform=(g:T.BufferGeometry,col:string,fine=false)=>{g.rotateY(a);g.translate(x,y,z);put(g,col,0,fine);};
  const shape=(xx:number,yy:number,zz:number,rx:number,ry:number,rz:number,col=C.bronze)=>{const g=new T.SphereGeometry(1,14,9);g.scale(rx,ry,rz);g.translate(xx,yy,zz);transform(g,col,true);};
  let top=2.2;
  if(pushkin){
   top=4.55;for(let i=0;i<3;i++)box(x,y+(i+.5)*.18,z,2.6-i*.44,.18,2.35-i*.38,C.stone,false,true);
   cylinder(x,y+2.36,z,.43,.52,3.55,C.stone,false,20,true);box(x,y+4.27,z,1.2,.22,1.12,C.stone,false,true);box(x,y+4.48,z,1.29,.18,1.19,C.stone);
   for(const side of[-1,1]){const g=new T.TorusGeometry(.21,.071,6,14);g.translate(side*.41,4.24,.35);transform(g,C.stone);}
  }else{
   for(let i=0;i<3;i++)box(x,y+(i+.5)*.12,z,1.72-i*.24,.12,1.48-i*.19,C.red,false,true,a);
   box(x,y+1.23,z,.79,1.74,.75,C.red,false,true,a);box(x,y+2.10,z,.96,.17,.88,'#92695c',false,true,a);
   const lines=p.name.split(' ');for(let i=0;i<lines.length;i++){const g=lettering(lines[i],.074);g.translate(0,1.43-i*.13,.382);transform(g,'#c6b6a0',true);}
  }
  // Sculptural low-detail silhouettes, not claimed as scanned facial likenesses.
  const older=/Creangă|Hașdeu|Alecsandri|Stamati|Hâjdeu/.test(p.name),bronze=pushkin?'#487364':C.bronze;
  const torso=new T.CylinderGeometry(.42,.28,.66,8);torso.scale(1,1,.56);torso.translate(0,top+.33,0);transform(torso,bronze);
  shape(0,top+.63,.015,.13,.20,.115,bronze);shape(0,top+.99,.035,.22,.30,.205,bronze);
  shape(0,top+1.11,-.057,.225,.238,.19,bronze);shape(0,top+.96,.217,.056,.092,.079,bronze);
  for(const side of[-1,1]){shape(side*.211,top+.99,.025,.043,.076,.037,bronze);shape(side*.076,top+1.065,.202,.057,.022,.023,'#333e37');}
  if(older){shape(0,top+.76,.129,.155,.135,.12,bronze);shape(0,top+.881,.206,.139,.039,.036,bronze);}
  else if(pushkin){for(const side of[-1,1])for(let i=0;i<3;i++)shape(side*.19,top+1.07-i*.095,-.071,.068,.072,.061,bronze);}
  for(const side of[-1,1]){const lapel=new T.BoxGeometry(.12,.43,.055);lapel.rotateZ(side*.37);lapel.translate(side*.16,top+.44,.18);transform(lapel,bronze,true);}
 }
 for(const cell of layout.cells)job(`alei ${cell.x}/${cell.z}`,cell.x,cell.z,function*(){
  for(const patch of cell.patches){const k=patch.kind,col=cell.parliament&&k==='paver'?'#aa8f81':C[k as keyof typeof C];yield* surfaceStaged(patch.rings,col,kinds[k],(x,z)=>ground(x,z)+(k==='grass'?.105:k==='flowers'?.155:.14),true);yield;}
  for(const p of layout.props){if(p.x<cell.x-18||p.x>=cell.x+18||p.z<cell.z-18||p.z>=cell.z+18)continue;if(p.kind==='bench')bench(p.x,p.z,p.angle);else if(p.kind==='lamp')lamp(p.x,p.z,p.x< -430);else bust(p);yield;}
 });
 // The imported ornate core remains. Its old undersized rectangular pool is
 // removed during decoding; this single notched basin follows the mapped outline.
 const pool=layout.water.find(w=>w.id==='w33077598')!;
 job('havuz · bazin și apă',-280.2,166.65,function*(){
  const y=ground(-280.2,166.65),ring=pool.rings[0];
  yield* surfaceStaged(pool.rings,'#526f68',0,()=>y+.06,true);
  yield* surfaceStaged(pool.rings,'#547f7d',6,()=>y+.24);
  for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,angle=Math.atan2(-dz,dx);
   box(x,y+.27,z,len+.02,.55,.46,'#7d544c',false,true,angle);
   box(x,y+.565,z,len+.04,.11,.56,'#946c60',false,true,angle);yield;
  }
  // A small static tube batch and the water shader avoid particle allocation.
  for(let i=0;i<12;i++){
   const a=i/12*Math.PI*2,x=-280.2+Math.cos(a)*2.15,z=166.65+Math.sin(a)*2.15;
   const points=[new T.Vector3(x,y+.27,z),new T.Vector3(x,y+1.95,z),new T.Vector3(x+Math.cos(a)*.22,y+2.15,z+Math.sin(a)*.22),new T.Vector3(x+Math.cos(a)*.40,y+.31,z+Math.sin(a)*.40)];
   put(new T.TubeGeometry(new T.CatmullRomCurve3(points),14,.023,4,false),'#b7cdca',0,true);if(i%3===0)yield;
  }
 });
 // Photo-guided recumbent marble silhouettes on the two sides of the basin.
 // Their sculptural detail and placement remain an approximation, not scans.
 for(const [x,z,resting]of[[-296.0,166.65,1],[-264.0,166.65,0]])job(`leu de marmură ${x}`,x,z,function*(){
  const y=ground(x,z)+.14,col='#babbb0';
  box(x,y+.16,z,1.2,.32,2.0,'#858d88',false,true);box(x,y+.37,z,1.35,.12,2.15,'#a9aca0',false,true);
  ellipsoid(x,y+.65,z+.25,.43,.29,.63,col);
  for(const side of[-1,1]){ellipsoid(x+side*.28,y+.51,z-.25,.135,.13,.56,col);ellipsoid(x+side*.28,y+.48,z-.69,.19,.13,.24,col);}
  const headY=y+(resting?.77:1.09),headZ=z-.49;
  ellipsoid(x,headY,headZ,.32,.33,.30,'#aeafa3');ellipsoid(x,headY-.04,headZ-.18,.225,.20,.21,col);
  ellipsoid(x,headY-.1,headZ-.35,.15,.085,.065,'#949b91');
  for(const side of[-1,1]){ellipsoid(x+side*.23,headY+.23,headZ,.081,.09,.053,col);ellipsoid(x+side*.102,headY+.04,headZ-.333,.026,.02,.015,'#727e74');}
  const tail=[new T.Vector3(x+.31,y+.58,z+.67),new T.Vector3(x+.49,y+.48,z+.75),new T.Vector3(x+.49,y+.49,z+.27)];put(new T.TubeGeometry(new T.CatmullRomCurve3(tail),9,.043,5,false),col,0,true);yield;
 });
 // The mapped rows are rendered by native instancing, with these matching lamps.
 for(const z of[59,84,112,140,222,249,279])for(const x of[-277.2,-283.7])job(`felinar ${x}/${z}`,x,z,function*(){lamp(x,z);yield;});
 for(const [x,z]of[[-265,154],[-296,154],[-265,182],[-296,182],[-269,196],[-291,196]])job(`felinar piațetă ${x}/${z}`,x,z,function*(){lamp(x,z);yield;});
 // Parliament: 7 shallow lower treads and 9 paired middle treads. The existing
 // imported building owns its upper entrance stair, so no second stair overlaps it.
 job('Parlament · scara de jos și rampă',-506,30,function*(){
  const low=terrace.levels().low+.14;
  for(let i=0;i<7;i++){const za=28+i*.6,top=low+(i+1)*.14;box(-506,top-.30,za+.3,19.6,.60,.602,C.red,false,true);yield;}
  yield* surfaceStaged([rect(-494.4,30.1,2.0,4.2)],(C.paver),2,(_x,z)=>terrace.profile(z)+.14,true);
  for(const x of[-495.5,-493.3])for(let i=0;i<7;i++)box(x,low+(i+.5)*.14+.09,28+(i+.5)*.6,.18,.22,.602,C.red,false,true);
 });
 job('Parlament · trepte MOLDOVA',-506,57.35,function*(){
  const low=terrace.levels().middle+.14;
  for(const x of[-513.0,-499.0])for(let i=0;i<9;i++){const top=low+(i+1)*.14;box(x,top-.31,54.65+(i+.5)*.6,4.5,.62,.602,C.red,false,true);yield;}
  const label=lettering('MOLDOVA',1.11);label.rotateX(-Math.PI/2+Math.atan(1.26/5.4));label.translate(-506,terrace.profile(57.2)+.28,57.2);put(label,'#294829',0,false);
 });
 job('Parlament · grădinile geometrice',-506,70,function*(){
  for(const [z,half]of[[47.5,3.0],[69,3.05],[79.7,2.7]]){
   const diamond:XY[]=[[-506-half,z],[-506,z-3.1],[-506+half,z],[-506,z+3.1],[-506-half,z]];
   yield* surfaceStaged([diamond],'#b19a3a',5,(x,zz)=>ground(x,zz)+.19,true);for(let i=1;i<diamond.length;i++){const a=diamond[i-1],b=diamond[i],n=8;for(let k=0;k<n;k++){const t=(k+.5)/n,x=T.MathUtils.lerp(a[0],b[0],t),zz=T.MathUtils.lerp(a[1],b[1],t);shrub(x,ground(x,zz)+.15,zz,.28,.17,.28,'#3c592d',true);}}yield;
  }
  for(const x of[-515.2,-497.0])for(let z=37;z<92;z+=7){lamp(x,z,true);yield;}
 });
 for(const h of layout.hedges){const p=h.p;job(`gard viu ${h.id}`,p[0][0],p[0][1],function*(){
  // The central motifs are rebuilt above; only outer planted boundaries here.
  if(p.every(([x,z])=>x> -513&&x< -500&&z>40&&z<85))return;
  for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/.8);for(let k=0;k<n;k++){const t=(k+.5)/n,x=T.MathUtils.lerp(a[0],b[0],t),z=T.MathUtils.lerp(a[1],b[1],t);shrub(x,ground(x,z)+.10,z,.46,.28,.46,'#3e5f38',true);if(k%16===0)yield;}}
 });}
 // Upper approach stone border follows the same continuous walking surface.
 for(const x of[-514.85,-497.6])job(`bordură Parlament ${x}`,x,68,function*(){for(let z=32.5;z<85;z+=1.5){if(z>53.5&&z<61)continue;box(x,ground(x,z)+.16,z,.17,.13,1.50,C.red);if(Math.round(z)%6===0)yield;}});
 for(const step of layout.steps){const a=step.p[0],b=step.p.at(-1)!;job(`trepte parc ${step.id}`,a[0],a[1],function*(){
  let start=a,end=b;if(raw(start[0],start[1])>raw(end[0],end[1]))[start,end]=[end,start];const dx=end[0]-start[0],dz=end[1]-start[1],length=Math.hypot(dx,dz),low=ground(start[0],start[1])+.14,high=ground(end[0],end[1])+.14,rise=high-low;if(rise<.08)return;
  const n=Math.max(1,Math.ceil(rise/.14)),angle=Math.atan2(dx,dz);
  for(let i=0;i<n;i++){const t=(i+.5)/n,top=low+rise*(i+1)/n;box(start[0]+dx*t,top-.24,start[1]+dz*t,step.width,.48,length/n+.008,C.edge,false,true,angle);if(i%5===0)yield;}
 });}
 return{...layer,get ready(){return layer.ready;},treeOverrides:[],ground};
}
