import * as T from 'three';
import {feature,type XY} from './city-layout';
import {streetMesh} from './street-mesh';
import {photoArchitecture} from './photo-architecture';

/** Petru Movilă → Maria Cebotari. See docs/boulevard-references/segment-three.json.
 * Parliament, Presidency, Herța and Kligman retain their existing detailed meshes. */
export function createSegmentThreeFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Ștefan cel Mare · porțiunea 3',ground,loaded);
 const {job,solid,box,put,facade,beam}=mesh;
 const {C,faces,street,cornice,windows,plain,building,roof,pediment,door,steps,arch,column,fence}=photoArchitecture(mesh);

 building('w27446579','UTM 168 · Camera Fiscală',14.3,'#c2c1a6',[-913,-13.5],function*(p,y,h){
  yield* plain(p,y,h,3);const f=facade([-946.58,-13.49],[-879.94,-13.29],y),mid=33.3,n=21;
  f.panel(mid,2.22,.10,f.len,4.4,.20,'#ac9a86');
  for(const hh of[.72,4.47,8.97,13.8])f.panel(mid,hh,.24,f.len,.23,.45,C.trim);
  for(let r=0;r<3;r++){for(let i=0;i<n;i++){
   const u=(i+.5)*f.len/n;
   if(Math.abs(u-mid)<4.7&&r===1)arch(f,u,5.1,1.55,3.1,y,C.glass,C.trim);
   else if(!(r===0&&Math.abs(u-mid)<2.6))f.window(u,2.38+r*4.4,1.53,r===0?2.18:2.70,C.trim,'#625141');
   if(r===1&&Math.abs(u-mid)>4.7){f.panel(u,8.50,.46,2.1,.19,.55,C.trim);pediment(f,u,8.60,2.25,.30,y);}
   if(i%5===4)yield;
  }yield;}
  for(let yy=1;yy<4.1;yy+=.48)f.panel(mid,yy,.23,f.len,.04,.04,'#847f70',true);
  for(let u=1.2;u<f.len;u+=2.45){f.panel(u,2.32,.23,.042,3.45,.04,'#898274',true);if(Math.round(u/2.45)%9===0)yield;}
  for(const u of[.42,7.7,28.25,32.0,35.8,39.25,58.7,66.25]){f.panel(u,9.5,.43,.43,9,.58,C.trim);f.panel(u,13.70,.51,.90,.40,.65,C.trim);}
  for(let u=.3;u<f.len;u+=.73)f.panel(u,13.96,.42,.26,.25,.44,C.trim,true);
  pediment(f,mid,14.5,14.5,2.6,y);f.panel(mid,14.37,.5,15.2,.3,.7,C.trim);
  for(const sign of[-1,1]){const q=f.at(mid+sign*2.1,2.05);column(q[0],q[1],y+.32,3.45,.3);}
  f.panel(mid,3.95,1.2,5.45,.36,2.65,C.trim);door(f,mid,3.55,2.0,'#846139');steps(f,mid,5.2,.42);
  for(let u=mid-2.4;u<=mid+2.4;u+=.36)f.panel(u,4.58,2.44,.10,.90,.12,C.trim,true);
  f.panel(mid,5.08,2.44,5.45,.15,.27,C.trim);f.label('UTM',mid,4.54,.62,'#6a6762',2.63);yield;
 });

 building('r12899639','166 · fațada de piatră și porticul',13.7,'#b8ad94',[-810,-26.5],function*(p,y,h){
  yield* plain(p,y,h,3);const f=facade([-846.17,-25.96],[-775.78,-26.67],y),mid=f.len/2;
  for(const yy of[.76,4.45,8.85,12.95])f.panel(mid,yy,.19,f.len,.20,.38,'#bdb39b');
  yield* windows(f,3,h,22,2.15,'#bdb69f','#9aab9f');
  for(const du of[-8.5,-4.3,4.3,8.5]){const q=f.at(mid+du,1.02);column(q[0],q[1],y+.80,11.4,.54,'#b6aa90');}
  f.panel(mid,12.7,.55,20.8,.8,1.3,'#c0b49a');f.panel(mid,14.0,.32,14.0,1.7,.64,'#b7ab91');
  for(let u=.4;u<f.len;u+=.81)f.panel(u,13.25,.4,.32,.32,.47,'#c1b59a',true);
  door(f,mid,3.70,2.2,'#85623b');f.panel(mid,4.3,.72,5.1,.40,1.4,C.trim);steps(f,mid,5.8,.42);
  for(const s of[-1,1]){const q=f.at(mid+s*2.3,.6);box(q[0],y+2.4,q[1],1.15,.70,.05,'#586b69',true);}
  yield;
 });

 building('w98427971','164 · Biserica Schimbarea la Față',12.0,'#bdb098',[-759,-22.4],function*(p,y,h){
  const brick='#926d56',gold='#b69b4e',green='#426756';
  for(const f of faces(p,y)){if(f.len<4)continue;const bays=Math.max(1,Math.round(f.len/3.7));
   f.panel(f.len/2,.60,.19,f.len,1.2,.38,'#929285');for(const hh of[1.55,5.45,5.8,10.95,11.7])f.panel(f.len/2,hh,.24,f.len,.15,.43,brick);
   for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;for(const bottom of[1.9,6.5]){arch(f,u,bottom,Math.min(1.5,f.len/bays*.60),3.2,y,C.glass,brick);for(let k=0;k<4;k++)f.panel(u,bottom+.65+k*.55,.40,1.28,.038,.05,'#aeb4a2',true);}
    f.panel(u,4.55,.42,.045,2.45,.08,C.trim,true);f.panel(u,9.12,.42,.045,2.5,.08,C.trim,true);if(i%3===2)yield;}
   cornice(f,12,brick);yield;
  }
  roof(-759,-41,18.0,35,y+12.0,2.5,green);
  const front=facade([-767.19,-22.27],[-753,-22.38],y);pediment(front,7.1,12.2,10.0,2.3,y,'#b8ad98');
  // Two distinct drums and gold domes; the taller bell tower is at the entry.
  function* dome(x:number,z:number,base:number,r:number,drum:number){
   let g:T.BufferGeometry=new T.CylinderGeometry(r,r,drum,12);g.translate(x,y+base+drum/2,z);put(g,'#bdb099',false,true);
   for(let i=0;i<8;i++){const a=(i+.10)*Math.PI/4,b=(i+.90)*Math.PI/4,pa:XY=[x+Math.cos(a)*r,z+Math.sin(a)*r],pb:XY=[x+Math.cos(b)*r,z+Math.sin(b)*r];const f=facade(pb,pa,y);arch(f,f.len/2,base+.65,Math.min(1.25,f.len*.72),drum-1.05,y,C.glass,brick);yield;}
   const profile=[[0,0],[.92,0],[1,.35],[.98,.72],[.80,1.15],[.48,1.55],[.13,1.9],[0,2.1]].map(([rr,hh])=>new T.Vector2(rr*r,hh*r));
   g=new T.LatheGeometry(profile,24);g.translate(x,y+base+drum,z);put(g,gold,false,true);
   const yy=y+base+drum+2.1*r;box(x,yy+.8,z,.065,1.65,.065,gold,true);box(x,yy+1.12,z,.84,.065,.065,gold,true);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;let last:T.Vector3|undefined;for(const [rr,hh]of[[.93,0],[1,.35],[.98,.72],[.80,1.15],[.48,1.55],[.13,1.9]]){const p=new T.Vector3(x+rr*r*Math.cos(a),y+base+drum+hh*r,z+rr*r*Math.sin(a));if(last)beam(last,p,.026,'#c3ad67');last=p;}if(i%3===2)yield;}
  }
  yield* dome(-759.1,-28.2,13.1,2.1,5.5);yield* dome(-759,-49.1,12.3,3.3,3.7);
  const porch=facade([-764.1,-20.5],[-754.0,-20.5],y);for(const u of[1.8,5.05,8.3])arch(porch,u,1.0,u===5.05?2.8:2.45,u===5.05?4.0:3.6,y,'#8b7254',brick);door(porch,5.05,3.05,2.5,'#68452c');steps(porch,5.05,5,.56);
  for(const [a,b]of[[[-768.0,-18.4],[-762.0,-18.4]],[[-756.2,-18.4],[-750.8,-18.4]],[[-750.8,-18.4],[-750.5,-58.8]]] as [XY,XY][]){const f=facade(a,b,y);f.panel(f.len/2,.27,0,f.len,.54,.45,'#aca48d');yield* fence(a,b,y+.5,1.18);}yield;
 });

 // The outline is a replacement ID, never a second 50 m extrusion. Its two
 // constituent parts become visible/physical together before native retirement.
 const court=feature('w844952925');job('162 · turnul și corpul jos',court.p,[844952925,27616454,87155934],function*(){
  const y=ground(-661,-50.4)+.14,tower=feature('w27616454'),base=feature('w87155934');
  solid(tower.p,55,y-5,'#b8b69f',true,tower.holes);solid(base.p,10,y-5,'#b1b5a5',true,base.holes);solid(tower.p,.17,y+50,'#808978',true);solid(base.p,.17,y+5,'#778273',true);yield;
  for(const f of faces(tower.p,y)){if(f.len<4)continue;const bays=Math.max(2,Math.round(f.len/2.75)),start=f.len>20?1.5:0;
   for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;if(start&&((i===0)||(i===bays-1)))continue;
    f.panel(u,25.4,.23,Math.min(1.45,f.len/bays*.72),46.6,.03,'#547d80',false,1);
    f.panel(u-f.len/bays*.39,25.4,.45,.23,47.1,.42,'#c2bfaa');
    for(let r=1;r<16;r++)f.panel(u,2.9+r*2.93,.31,Math.min(1.5,f.len/bays*.73),.17,.15,'#aaaF9f',true);
    if(i%3===2)yield;
   }cornice(f,50,'#b5b79f');yield;
  }
  for(const f of faces(base.p,y)){if(f.len<4)continue;f.panel(f.len/2,2.65,.24,f.len-.3,2.3,.03,'#5a7070',false,1);f.panel(f.len/2,4.75,.30,f.len,.33,.60,C.trim);for(let u=1;u<f.len;u+=3.1)f.panel(u,2.7,.40,.15,4.7,.30,C.trim,true);yield;}
  const f=facade([-673.8,-50.42],[-641.0,-50.42],y),u=12;
  door(f,u,3.9,4.1,'#536863');f.panel(u,4.5,.32,9.5,.9,.62,'#b8bba9');f.label('JUDECĂTORIA CHIȘINĂU',u,4.45,.33,'#3c4f49');
  for(const s of[-1,1])f.panel(u+s*4.6,4.0,1.45,.34,8.0,.60,'#c0c2b1');f.panel(u,7.8,1.0,9.55,.28,2.5,C.trim);steps(f,u,8,.42);yield;
 });

 building('w73667570','115/1 · UBC',35.0,'#45615d',[-710,28.9],function*(p,y,h){
  for(const f of faces(p,y)){if(f.len<4)continue;
   // The corner is left as dark curtain wall; fins fill the long middle bays.
   for(let row=1;row<11;row++){f.panel(f.len/2,3.1+row*2.75,.18,f.len,.08,.15,'#b3b8aa');yield;}
   const bays=Math.max(1,Math.round(f.len/1.95));for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;if(u>f.len*.23&&u<f.len*.85)f.panel(u,21.0,.64,.30,23.5,1.05,'#bbc0b5');else f.panel(u,17.5,.20,.055,34.5,.09,'#334f4c',true);if(i%5===4)yield;}
   f.panel(f.len/2,h+.12,.58,f.len+1.8,.36,1.6,'#625c44');f.panel(f.len/2,7.8,.35,f.len,.6,.8,'#89744c');yield;
  }
  const f=facade([-689.61,28.55],[-730.04,29.38],y);door(f,10,4.5,4.6,'#3c5751');f.panel(10,4.85,2.0,13.0,.40,4.0,'#6f6a50');f.label('UBC',10,5.45,.78,'#bfc0a7',3.85);yield;
 },[73667570,1379314084],1);

 return mesh;
}
