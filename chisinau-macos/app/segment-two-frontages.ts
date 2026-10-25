import * as T from 'three';
import {feature,type XY} from './city-layout';
import {streetMesh} from './street-mesh';

/** Mihai Viteazul → Petru Movilă. Mapped footprints, individually inspected
 * exterior photographs and historic elevations: docs/boulevard-references/segment-two.json.
 * Unsurveyed heights and ornament profiles remain conservative approximations. */
export function createSegmentTwoFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Ștefan cel Mare · porțiunea 2',ground,loaded);
 const {job,solid,facade,box,put,beam}=mesh;
 const C={stone:'#bab8a2',trim:'#c7c3ae',base:'#838878',roof:'#70796c',glass:'#4b6464',wood:'#694936',iron:'#384b44'};
 type Face=ReturnType<typeof facade>;
 function faces(p:XY[],y:number){const area=p.slice(1).reduce((s,b,i)=>s+p[i][0]*b[1]-b[0]*p[i][1],0),out:Face[]=[];for(let i=1;i<p.length;i++){const a=area>0?p[i]:p[i-1],b=area>0?p[i-1]:p[i];if(Math.hypot(b[0]-a[0],b[1]-a[1])>.6)out.push(facade(a,b,y));}return out;}
 function towardStreet(f:Face){const m=f.at(f.len/2),n=f.at(f.len/2,1);return m[1]*n[1]<m[1]*m[1]&&Math.abs(n[1]-m[1])>.8;}
 function cornice(f:Face,h:number,color=C.trim){for(const [y,d,w]of[[h-.45,.25,.19],[h-.15,.43,.20],[h+.09,.56,.18]])f.panel(f.len/2,y,d/2,f.len+.16,w,d,color);}
 function* windows(f:Face,rows:number,h:number,bays=Math.max(1,Math.round(f.len/3.2)),first=2.2){for(let row=0;row<rows;row++){for(let i=0;i<bays;i++){f.window((i+.5)*f.len/bays,first+row*(h-.7)/rows,Math.min(1.55,f.len/bays*.61),rows===1?2.75:2.15,C.trim,C.wood);if(i%6===5)yield;}yield;}}
 function* plain(p:XY[],y:number,h:number,rows:number){for(const f of faces(p,y)){f.panel(f.len/2,.32,.12,f.len,.64,.24,C.base);cornice(f,h);if(!towardStreet(f))yield* windows(f,rows,h);yield;}}
 function building(id:string,title:string,h:number,color:string,anchor:XY,detail:(p:XY[],y:number,h:number)=>Generator<void>){const f=feature(id);job(title,f.p,[Number(id.slice(1))],function*(){const y=ground(...anchor)+.14;solid(f.p,h+4,y-4,color,true,f.holes);solid(f.p,.12,y+h,C.roof,true,f.holes);yield;yield* detail(f.p,y,h);});}
 function roof(x:number,z:number,w:number,d:number,y:number,rise:number,color=C.roof){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],r=[x-w/2+Math.min(d*.4,w*.2),y+rise,z],s=[x+w/2-Math.min(d*.4,w*.2),y+rise,z];const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([a,r,b,b,r,s,b,s,c,c,s,e,e,s,r,e,r,a].flat(),3));g.computeVertexNormals();put(g,color,false,true);}
 function pediment(f:Face,u:number,base:number,w:number,h:number,y:number,color=C.trim){const a=f.at(u-w/2,.42),b=f.at(u+w/2,.42),c=f.at(u,.42);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([a[0],y+base,a[1],b[0],y+base,b[1],c[0],y+base+h,c[1]],3));g.computeVertexNormals();put(g,color);beam(new T.Vector3(a[0],y+base,a[1]),new T.Vector3(c[0],y+base+h,c[1]),.07,color);beam(new T.Vector3(c[0],y+base+h,c[1]),new T.Vector3(b[0],y+base,b[1]),.07,color);}
 function door(f:Face,u:number,h=3.0,w=1.65,color=C.wood){f.panel(u,h/2+.06,.37,w,h,.04,color,false,1);for(const side of[-1,1]){f.panel(u+side*(w/2+.12),h/2+.08,.36,.22,h+.2,.31,C.trim);for(const yy of[.65,1.45,2.25])f.panel(u+side*w/4,yy,.43,w*.34,.45,.09,'#805a42',true);}f.panel(u,h/2,.47,.07,h,.10,'#472f26',true);f.panel(u,h+.19,.43,w+.55,.25,.44,C.trim);}
 function steps(f:Face,u:number,w:number,rise=.42){const q=f.at(u,1.6),low=ground(...q)+.14,n=Math.max(1,Math.ceil(rise/.14)),a=f.at(0),b=f.at(1),angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);for(let i=0;i<n;i++){const q=f.at(u,1.5-i*.33);box(q[0],low+(i+1)*rise/n-.28,q[1],w,.56,.33,C.base,false,true,angle);}}
 function arch(f:Face,u:number,bottom:number,w:number,h:number,y:number,trim=C.trim){const r=w/2,s=new T.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();const a=f.at(u,.34),b=f.at(1),c=f.at(0),angle=Math.atan2(-(b[1]-c[1]),b[0]-c[0]);const g=new T.ShapeGeometry(s,10);g.rotateY(angle);g.translate(a[0],y+bottom,a[1]);put(g,C.glass,false,false,1);const t=new T.TorusGeometry(r+.09,.09,4,16,Math.PI);t.rotateY(angle);const q=f.at(u,.43);t.translate(q[0],y+bottom+h-r,q[1]);put(t,trim,true);for(const sign of[-1,1])f.panel(u+sign*(r+.09),bottom+(h-r)/2,.4,.16,h-r,.20,trim,true);}

 // Historic city hospital at 190: pale cream/rose wings, tall windows, grey
 // roofs and the central peach-coloured church. Distinct from Toma Ciorbă 163.
 for(const [id,title,anchor,w,d,rows,h,color]of[
  ['w96301013','190 · pavilion vestic',[-1334,-9.5],13,49,1,5.8,'#c2c0a9'],
  ['w669214166','190 · pavilion lângă biserică',[-1294,-10.8],31,17,1,5.8,'#c5baa2'],
  ['w169828521','190 · aripa cu portic',[-1234,-11.6],57,17,1,5.8,'#c1b59b'],
  ['w669214165','190 · pavilion estic',[-1190,-12.3],22,19,1,5.8,'#c3b7a0']
 ] as [string,string,XY,number,number,number,number,string][]){building(id,title,h,color,anchor,function*(p,y,h){
  yield* plain(p,y,h,rows);for(const f of faces(p,y)){if(!towardStreet(f))continue;yield* windows(f,1,h,Math.max(2,Math.round(f.len/3.6)),2.75);f.panel(f.len/2,.60,.14,f.len,1.05,.28,'#888b7b');}
  const xmin=Math.min(...p.map(q=>q[0])),xmax=Math.max(...p.map(q=>q[0])),zmax=Math.max(...p.map(q=>q[1]));roof((xmin+xmax)/2,zmax-d/2,w,d,y+h,1.5);
  if(id==='w169828521'){const f=facade([-1260.54,-11.25],[-1203.18,-12.09],y),u=30.7;door(f,u,3.5,1.9,'#704934');
   for(const side of[-1,1]){const q=f.at(u+side*2.25,1.90);box(q[0],y+2.2,q[1],.46,4.4,.46,C.trim);box(q[0],y+.2,q[1],.72,.4,.72,C.base);}
   f.panel(u,4.55,1.23,5.8,.37,2.5,C.trim);pediment(f,u,4.75,6.1,1.18,y);steps(f,u,5.4,.28);yield;
  }
 });}
 building('w169828522','Biserica Sfântul Ierarh Nicolae',8.8,'#be9b6f',[-1269.5,-8.1],function*(p,y,h){
  yield* plain(p,y,h,1);const f=facade([-1277.88,-11.03],[-1260.54,-11.25],y),u=f.len/2;
  for(const yy of[.8,1.2,2.0,7.45,8.4])f.panel(u,yy,.28,f.len,.15,.48,C.trim);
  for(const v of[3.5,f.len-3.5]){arch(f,v,2.05,2.6,4.8,y);for(let i=0;i<5;i++)f.panel(v,2.7+i*.63,.44,2.55,.035,.045,'#9b9d80',true);}
  // Raised central porch/tower follows the narrow projecting mapped entrance.
  box(-1269.6,y+6.0,-9.6,6.8,12,3.1,'#c6a77d',false,true);
  const front=facade([-1273.0,-8.01],[-1266.17,-8.11],y);arch(front,3.4,.23,2.9,4.0,y,'#cfbf9a');door(front,3.4,2.8,2.3,'#3c3c2b');
  for(const yy of[.8,1.3,4.35,5.0,9.35,10.4,11.8])front.panel(3.4,yy,.37,7.05,.19,.55,C.trim);
  for(const uu of[1.75,3.4,5.05])arch(front,uu,5.65,1.1,2.75,y);
  for(const side of[-1,1]){front.panel(3.4+side*3.02,6.0,.44,.35,11.8,.58,C.trim);arch(front,3.4+side*1.35,9.65,1.55,1.50,y);}
  function spire(x:number,z:number,base:number,r:number,height:number){let g:T.BufferGeometry=new T.ConeGeometry(r,height,8);g.translate(x,y+base+height/2,z);put(g,'#3f827b',false,true);g=new T.SphereGeometry(r*.18,10,6);g.scale(1,1.4,1);g.translate(x,y+base+height+.30,z);put(g,'#4d8881');box(x,y+base+height+1.15,z,.06,1.4,.06,'#b8b292',true);box(x,y+base+height+1.36,z,.65,.06,.06,'#b8b292',true);}
  spire(-1269.6,-10.2,12.1,3.6,5.8);for(const x of[-1277.2,-1261.3])spire(x,-11.8,9.1,.62,2.5);
  roof(-1269.5,-24.5,17.1,23,y+8.8,2.0,'#507f72');steps(front,3.4,4.5,.42);yield;
 });

 building('w669577927','Spitalul Toma Ciorbă 163 · pavilion istoric',5.8,'#a19a79',[-1365,45.1],function*(p,y,h){
  yield* plain(p,y,h,1);const f=facade([-1335.48,43.93],[-1397.78,45.17],y);
  yield* windows(f,1,h,17,2.85);for(const yy of[.65,1.1,4.9])f.panel(f.len/2,yy,.23,f.len,.20,.42,'#b4a98a');
  for(let u=0;u<f.len;u+=3.66){f.panel(u,3.1,.25,.24,5.3,.35,'#b7a889',true);if(Math.round(u/3.66)%8===0)yield;}
  const mid=f.len/2;door(f,mid,3.65,1.75,'#a9b5a5');pediment(f,mid,5.8,8.2,1.65,y,'#8e8e75');steps(f,mid,3.2,.56);
  roof(-1366.4,51.1,63,14,y+h,1.8);for(const x of[-1379.9,-1351.3])roof(x,68,12,23,y+h,1.4);yield;
 });

 building('w88955491','184 · blocul de piatră cu patru niveluri',14.3,'#bab69f',[-1126,-11.8],function*(p,y,h){
  yield* plain(p,y,h,4);const f=facade([-1159.26,-11.48],[-1092.62,-12.14],y);
  yield* windows(f,3,10.6,21,5.2);f.panel(f.len/2,3.3,.26,f.len,.27,.45,C.trim);f.panel(f.len/2,1.45,.20,f.len,2.9,.35,'#9c9e8b');
  for(let i=0;i<16;i++){const u=(i+.5)*f.len/16;f.panel(u,1.55,.40,2.5,2.7,.03,C.glass,false,1);f.panel(u,3.03,.44,2.8,.44,.18,'#a79c7b');if(i%5===4)yield;}
  for(const u of[13.3,33.3,53.3]){for(const hh of[5.9,9.4]){f.panel(u,hh,1.0,3.0,.20,1.6,C.base);f.panel(u,hh+.55,1.74,3.0,1.0,.055,C.iron,true);for(let k=-4;k<=4;k++)f.panel(u+k*.32,hh+.54,1.70,.035,.95,.04,C.trim,true);}yield;}
  for(let u=.3;u<f.len;u+=.72)f.panel(u,h-.30,.39,.20,.31,.36,C.trim,true);door(f,9,2.7,1.8);yield;
 });

 building('w49070366','Casa Modei 182 · podium și acces',6.0,'#b9bcb1',[-1060,-23.9],function*(p,y,h){
  yield* plain(p,y,h,1);for(const f of faces(p,y)){if(!towardStreet(f))continue;f.panel(f.len/2,4.5,.22,f.len,2.3,.38,'#bcc2b9');const n=Math.max(1,Math.round(f.len/4.3));for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.panel(u,1.7,.36,2.6,2.8,.035,C.glass,false,1);yield;}}
  const f=facade([-1081.47,-23.53],[-1038.13,-24.61],y);door(f,19,3.6,5.0,'#413f32');steps(f,19,8.0,.56);f.label('CENTRUL DE MODĂ',22,4.63,.70,'#394440');yield;
 });
 building('w88955489','Casa Modei 182 · ecranul geometric',20,'#9dada7',[-1051.9,-43.9],function*(p,y,h){
  yield* plain(p,y,h,5);const f=facade([-1081.83,-43.76],[-1021.7,-44.8],y);f.panel(f.len/2,12,.3,f.len,14.9,.04,'#425951',false,1);
  const cols=44,rows=12,w=f.len/cols,hh=14/rows;
  // Repeated folded light fins and their dark recesses, modelled as one merged
  // opaque batch. Close detail is culled; no image atlas or alpha flickering.
  for(let row=0;row<rows;row++){for(let col=0;col<cols;col++){
   const u=(col+.5)*w,h=5.0+(row+.5)*hh,q=[[-w*.48,hh*.48,.63],[0,-hh*.38,1.02],[w*.48,hh*.48,.63],[-w*.48,-hh*.08,.54],[w*.48,-hh*.08,.54]],pts=q.map(([a,b,v])=>{const p=f.at(u+a,v);return[p[0],y+h+b,p[1]];});
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([pts[0],pts[3],pts[1],pts[1],pts[4],pts[2]].flat(),3));g.computeVertexNormals();put(g,'#bbc3b7',true);if(col%11===10)yield;
  }yield;}
  cornice(f,20,'#abae9c');yield;
 });
 building('w88955495','Casa Editurilor 180',40,'#b5b39c',[-981,-30.8],function*(p,y,h){
  for(const f of faces(p,y)){if(f.len<5)continue;const a=f.at(0),b=f.at(f.len),side=Math.abs(b[1]-a[1])>Math.abs(b[0]-a[0])*1.7;
   if(side&&f.len>18){const bays=Math.max(3,Math.round(f.len/3.1));
    for(let row=0;row<11;row++){const hh=4.25+row*3.15;for(let i=0;i<bays;i++){
     const u=(i+.5)*f.len/bays,w=f.len/bays-.18;f.panel(u,hh,.29,w,2.1,.03,'#455e59',false,1);
     // Red projecting chevrons with light edge strips, visible in BACU 2019.
     const left=f.at(u-w/2,.50),tip=f.at(u,1.12),right=f.at(u+w/2,.50),vertices:number[]=[];
     for(const [a,b]of[[left,tip],[tip,right]]){for(const [q,h]of[[a,hh-1.7],[b,hh-1.7],[b,hh-.85],[a,hh-1.7],[b,hh-.85],[a,hh-.85]] as [XY,number][])vertices.push(q[0],y+h,q[1]);beam(new T.Vector3(a[0],y+hh-.85,a[1]),new T.Vector3(b[0],y+hh-.85,b[1]),.025,'#c1beb0');}
     const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();put(g,'#974a4b');
     for(const q of[left,tip,right])beam(new T.Vector3(q[0],y+hh-1.7,q[1]),new T.Vector3(q[0],y+hh-.85,q[1]),.024,'#c1beb0');
     if(i%4===3)yield;
    }yield;}
    for(let i=0;i<=bays;i++){f.panel(i*f.len/bays,20,.47,.11,37,.12,'#b5b8a6',true);if(i%6===5)yield;}
   }
   else{yield* windows(f,12,39,Math.max(1,Math.round(f.len/4)),2.0);}
   cornice(f,h);yield;
  }
  const f=facade([-994.7,-27.21],[-984.25,-27.17],y);f.panel(f.len/2,3.9,1.4,11.1,.4,2.7,'#a0a694');door(f,5.2,3.2,4.6,'#3c4f4b');f.label('CASA EDITURILOR',5.2,4.30,.40,'#c5c4af');yield;
 });

 building('w96301011','Camera de Comerț și Industrie 151',9.5,'#bcbba9',[-1142,32.8],function*(p,y,h){
  yield* plain(p,y,h,2);const f=facade([-1122.11,32.87],[-1160.75,32.81],y);yield* windows(f,2,h,12,2.3);f.panel(f.len/2,4.8,.24,f.len,.24,.44,C.trim);
  for(const u of[.3,12.8,18.4,25.5,38.3]){f.panel(u,5.1,.36,.45,8.6,.58,C.trim);f.panel(u,9.10,.43,.76,.4,.70,C.trim);}
  const u=18.7;door(f,u,3.6,2.2);f.panel(u,5.0,1.10,3.5,.28,2.1,C.trim);for(let i=-4;i<=4;i++)f.panel(u+i*.36,5.55,2.07,.12,.90,.12,C.trim,true);f.panel(u,6.04,2.07,3.7,.15,.24,C.trim);
  for(const dx of[-1,1])f.panel(u+dx*2.6,9.95,.20,1.35,.80,.45,C.trim);f.panel(u,10.18,.20,6.6,.28,.60,C.trim);steps(f,u,3.5,.28);roof(-1141.5,40,39,15,y+h,1.5);yield;
 });
 building('w312887036','141 · casa istorică',8.2,'#aaa993',[-1027.1,33.3],function*(p,y,h){
  yield* plain(p,y,h,2);const f=facade([-1018.95,33.39],[-1035.27,33.31],y);yield* windows(f,1,4,5,6.0);
  for(const u of[.22,5.5,10.8,16.1])f.panel(u,6.0,.25,.34,4.0,.45,'#bfbba2');f.panel(f.len/2,3.65,.35,f.len,.28,.62,C.trim);
  // Open arched entrance impression stays inset in its actual street frontage.
  arch(f,13.35,.12,3.5,3.2,y);door(f,2.1,2.9,1.75,'#824737');for(const u of[6.6,9.2])f.window(u,1.8,1.3,1.9,C.trim,C.wood);
  for(let yy=.5;yy<3.5;yy+=.48)f.panel(f.len/2,yy,.19,f.len,.045,.035,'#868976',true);roof(-1027.1,39.7,16.4,12.8,y+h,1.5);yield;
 });
 return mesh;
}
