import * as T from 'three';
import {feature,type XY} from './city-layout';
import {streetMesh} from './street-mesh';
import cadastral from '../data/cantemir-cadastral-plans.json';

/** Cantemir → Mihai Viteazul. Footprints come from OSM; finishes and distinctive
 * forms from the individually inspected photos in segment-one-references.json.
 * Floor-based heights are estimates, not a claim of a measured survey. */
export function createSegmentOneFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Ștefan cel Mare · porțiunea 1',ground,loaded);
 const {job,solid,box,beam,put,facade}=mesh;
 const stone='#b7b8aa',metal='#9faea9',dark='#35494d',blue='#376581',roof='#77837a';
 const v=(p:XY,y:number)=>new T.Vector3(p[0],y,p[1]);
 function faces(p:XY[],y:number){
  const area=p.slice(1).reduce((s,b,i)=>s+p[i][0]*b[1]-b[0]*p[i][1],0),out=[];
  for(let i=1;i<p.length;i++){const a=area>0?p[i]:p[i-1],b=area>0?p[i-1]:p[i];if(Math.hypot(a[0]-b[0],a[1]-b[1])>.25)out.push(facade(a,b,y));}return out;
 }
 function building(id:string,name:string,h:number,color:string,anchor:XY,detail:(p:XY[],y:number,h:number)=>Generator<void>,glass=false){
  const source=feature(id),official=(cadastral as Record<string,{rings:number[][][][]}>)[id],polys=official?.rings??[[source.p,...source.holes]],main=polys.reduce((a,b)=>a[0].length>b[0].length?a:b),f={p:main[0] as XY[],holes:main.slice(1) as XY[][]};job(name,polys.flatMap(p=>p[0]) as XY[],[Number(id.slice(1))],function*(){const y=ground(...anchor)+.14;
   for(const [p,...holes]of polys){solid(p as XY[],h+5,y-5,color,true,holes as XY[][],glass?1:0);solid(p as XY[],.19,y+h,roof,true,holes as XY[][]);}yield;
   yield* detail(f.p,y,h);
  });
 }
 function* plain(p:XY[],y:number,h:number,rows:number,skipFront=false,glassColor='#506b73'){
  for(const f of faces(p,y)){if(f.len<2)continue;const a=f.at(0),b=f.at(f.len),out=f.at(f.len/2,1),mid=f.at(f.len/2);
   f.panel(f.len/2,.28,.14,f.len,.56,.28,'#7d8177');f.panel(f.len/2,h-.15,.16,f.len+.12,.28,.32,stone);
   if(skipFront&&((mid[1]<0&&out[1]>mid[1])||(mid[1]>0&&out[1]<mid[1]))&&Math.abs(b[0]-a[0])>Math.abs(b[1]-a[1])*1.7)continue;
   const n=Math.max(1,Math.round(f.len/3.2));for(let row=0;row<rows;row++){for(let i=0;i<n;i++){const u=(i+.5)*f.len/n,hh=2+row*(h-.7)/rows;f.panel(u,hh,.21,Math.min(1.75,f.len/n*.66),2.1,.03,glassColor,false,1);f.panel(u,hh,.26,.07,2.1,.08,metal,true);if(i%8===7)yield;}yield;}
  }
 }
 function entrance(f:ReturnType<typeof facade>,u:number,w:number,canopy:string=metal){
  f.panel(u,1.7,.28,w,3.25,.035,dark,false,1);for(const a of[-1,0,1])f.panel(u+a*w/2,1.7,.33,.08,3.25,.09,metal,true);
  f.panel(u,3.6,1.6,w+1.4,.28,3.1,canopy);for(const a of[-1,1])f.panel(u+a*(w/2+.44),1.72,2.78,.10,3.43,.10,metal);
 }

 building('w95087721','Kentford · corpul alb de la stradă',7.5,'#c1c4b7',[-1890,-33.8],function*(p,y,h){
  yield* plain(p,y,h,2,true);solid(p,.14,y+h+.20,'#667e64',true);
  const f=facade([-1906.2,-33.38],[-1872.14,-35.75],y);
  f.panel(f.len/2,1.6,.20,f.len,3.2,.4,'#845d49');
  for(let i=0;i<12;i++){const u=(i+.5)*f.len/12;f.window(u,5.70,1.35,1.48,stone,'#66756a');f.panel(u,1.79,.43,2.33,2.9,.02,'#3e5e66',false,1);f.panel(u,3.25,.48,2.60,.48,.38,'#aa9679');if(i%4===3)yield;}
  entrance(f,17,2.6,'#94897a');yield;
 });
 building('w147646996','Kentford · podium albastru',4.4,'#315f88',[-1927.27,-91.55],function*(p,y,h){
  yield* plain(p,y,h,1,false,'#4a6773');for(const f of faces(p,y)){f.panel(f.len/2,h-.25,.25,f.len,.48,.50,'#376f98');yield;}
  const f=facade([-1934.19,-97.67],[-1920.35,-85.44],y);
  f.panel(f.len/2,1.7,.29,4.8,3.25,.035,dark,false,1);
  for(const side of[-1,0,1])f.panel(f.len/2+side*2.4,1.7,.34,.08,3.25,.10,'#285988');
  // Three photographed vaulted bays; solid blue supports stay beside the path.
  for(const centre of[f.len/2-5.6,f.len/2,f.len/2+5.6]){
   const radius=2.65,depth=4.5,positions:number[]=[];
   for(let j=0;j<12;j++){
    const a0=j*Math.PI/12,a1=(j+1)*Math.PI/12;
    const point=(angle:number,d:number)=>{const q=f.at(centre+Math.cos(angle)*radius,d);return[q[0],y+2.65+Math.sin(angle)*1.55,q[1]];};
    const aa=point(a0,.45),bb=point(a1,.45),cc=point(a1,depth),dd=point(a0,depth);
    positions.push(...aa,...bb,...cc,...aa,...cc,...dd);
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();put(g,'#c7c5ae');
   for(const d of[.45,1.8,3.15,depth]){let last:T.Vector3|undefined;for(let j=0;j<=12;j++){const angle=j*Math.PI/12,q=f.at(centre+Math.cos(angle)*radius,d),point=v(q,y+2.68+Math.sin(angle)*1.55);if(last)beam(last,point,.035,'#285988');last=point;}yield;}
   for(const d of[.45,depth])for(const side of[-1,1]){const q=f.at(centre+side*radius,d);box(q[0],y+1.325,q[1],.12,2.65,.12,'#285988',false,true);}
  }
  // Ground-level glazing and planters beside, not across, the main entrance.
  for(const u of[2.5,f.len-2.5]){f.panel(u,1.65,.26,3.6,2.9,.035,'#557f91',false,1);const q=f.at(u,5.6);box(q[0],y+.32,q[1],1.6,.64,.65,'#929e95',false,true);const crown=new T.IcosahedronGeometry(.65,1);crown.scale(1,1.3,1);crown.translate(q[0],y+1.05,q[1]);put(crown,'#65834c');}yield;
 });
 building('w117624161','Kentford · turn',31.5,'#687b86',[-1906,-90],function*(p,y,h){
  for(const f of faces(p,y)){if(f.len<3)continue;const bays=Math.max(1,Math.round(f.len/3));
   for(let row=0;row<9;row++){f.panel(f.len/2,1.9+row*3.35,.22,f.len-.18,2.12,.04,'#7398aa',false,1);f.panel(f.len/2,3.15+row*3.35,.27,f.len,.82,.30,'#627b8b');yield;}
   for(let i=0;i<=bays;i++){f.panel(i*f.len/bays,15.5,.40,.23,31,.45,'#396e95');if(i%6===5)yield;}
   if(f.len>18){f.panel(f.len/2,15.4,.60,Math.min(7,f.len*.26),30.6,.045,'#345666',false,1);for(let r=0;r<10;r++)f.panel(f.len/2,r*3.15+.30,.66,Math.min(7,f.len*.26),.075,.08,metal,true);}
   f.panel(f.len/2,h+.18,.12,f.len+.8,.66,.68,'#c1c7be');yield;
  }
  const f=facade([-1926.93,-107.85],[-1914.35,-98.4],y);f.label('KENTFORD',f.len/2,h+1.04,.72,'#477a9d');yield;
 });

 building('w891058413','Infinity Tower · vitraj curbat',42.9,'#4e7488',[-1943,46.2],function*(p,y,h){
  // Follow every mapped curve segment; no square tower substituted for the plan.
  let run=0;for(const f of faces(p,y)){
   for(let row=1;row<14;row++)f.panel(f.len/2,row*h/13,.15,f.len+.015,.065,.09,'#354a54',true);
   const bays=Math.max(1,Math.ceil(f.len/1.6));for(let i=0;i<bays;i++)f.panel(i*f.len/bays,h/2,.17,.045,h,.085,'#344a54',true);
   f.panel(f.len/2,h+.12,.12,f.len+.10,.24,.32,'#465d63');
   // Deep diagonal folds visible in S1-02: three dark, slanted glazed facets.
   const a=f.at(0),b=f.at(f.len);if((a[1]+b[1])/2<64&&f.len>2.8){const aa=f.at(f.len*.12,.23),bb=f.at(f.len*.85,.23);beam(v(aa,y+.3),v(bb,y+h),.085,'#304450',true);}
   run+=f.len;if(run>9){run=0;yield;}
  }
  // One coherent raised diagonal band replaces generic floor balconies.
  const a=new T.Vector3(-1957,y+1.2,39.65),b=new T.Vector3(-1937.5,y+h,49.50);beam(a,b,.20,'#324c5a',false);yield;
 },true);
 building('w142883642','Building Group · sticlă verde și piatră',33,'#abae9b',[-1885,40.8],function*(p,y,h){
  yield* plain(p,y,h,10,true,'#4f716b');
  const f=facade([-1862.62,40.78],[-1910.8,40.94],y);
  f.panel(f.len/2,16.2,.27,f.len-.25,31.5,.035,'#4b776f',false,1);
  for(let row=1;row<11;row++){f.panel(f.len/2,row*3.16,.32,f.len,.12,.12,'#788d7e');yield;}
  for(let i=0;i<27;i++){const u=(i+.5)*f.len/27;f.panel(u,16.3,.34,.055,32,.10,'#7a9784',true);if(i%6===5)yield;}
  f.panel(f.len/2,16.4,.47,6.5,32,.04,'#3d5d5c',false,1);f.panel(f.len/2,33.3,.15,f.len+.1,.65,.8,stone);
  entrance(f,f.len/2,4.2,'#567769');
  const g=new T.CylinderGeometry(1,1,.18,28);g.scale(5.8,1,2.8);const q=f.at(f.len/2,2.6);g.translate(q[0],y+3.77,q[1]);put(g,'#456f5d');yield;
 });

 building('w96545862','ARTICO · piramida și fațada',13.4,'#a2b1b4',[-1763,53.3],function*(p,y,h){
  yield* plain(p,y,h,4,true,'#68818a');
  const f=facade([-1665.89,53.04],[-1837.04,53.53],y);
  for(let row=1;row<=4;row++){f.panel(f.len/2,row*2.78,.21,f.len,1.20,.03,'#71848c',false,1);yield;}
  // Silver modular cladding, white projecting screens and narrow ochre edges.
  for(let u=0;u<f.len;u+=4.2){f.panel(u,6.9,.25,.035,12.7,.035,'#73898e',true);if(Math.round(u/4.2)%8===7)yield;}
  for(const u of[26,61,116,151]){f.panel(u,8.4,.56,11.4,9.4,.88,'#bcc1b6');for(const s of[-1,1])f.panel(u+s*5.76,8.4,1.03,.20,9.65,.12,'#b09c47');f.panel(u,6.35,1.025,9.65,2.15,.035,'#657b84',false,1);f.panel(u,13.16,.99,11.7,.22,.40,'#baa050');yield;}
  const cx=-1763.1,front=40.4,back=53.3,half=16.4,top=y+16.8,bottom=y+.20;
  const A=new T.Vector3(cx-half,bottom,front),B=new T.Vector3(cx+half,bottom,front),C=new T.Vector3(cx,top,back);
  const triangle=(a:T.Vector3,b:T.Vector3,c:T.Vector3,color:string,kind=1)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...a.toArray(),...b.toArray(),...c.toArray()],3));g.computeVertexNormals();put(g,color,false,true,kind);};
  // Winding points toward the street; actual sloping glazing remains walkable.
  triangle(B,A,C,'#68899e');triangle(A,new T.Vector3(cx-half,bottom,back),C,'#718c9a');triangle(new T.Vector3(cx+half,bottom,back),B,C,'#567a8f');
  for(let i=0;i<=12;i++){
   const t=i/12,left=A.clone().lerp(C,t),right=B.clone().lerp(C,t);left.z-=.075;right.z-=.075;beam(left,right,.035,metal);
   const low=A.clone().lerp(B,t),a=A.clone().lerp(C,t),b=B.clone().lerp(C,1-t);low.z-=.07;a.z-=.07;b.z-=.07;beam(low,a,.039,metal);beam(low,b,.039,metal);if(i%3===2)yield;
  }
  const entry=facade([cx+3.0,front-.10],[cx-3.0,front-.10],y);entrance(entry,3,4.7,'#809cad');entry.label('ARTICO',3,4.02,.62,'#c4cec5',1.8);
  for(const sign of[-1,1]){beam(new T.Vector3(cx+sign*4.2,y+.65,front-.8),new T.Vector3(cx+sign*15,y+.65,front-.8),.027,metal);}
  // Small colored logo triangles near the apex, well separated from the glazing.
  const q=C.clone().lerp(A,.16),r=C.clone().lerp(B,.16),tip=C.clone().lerp(A,.04);for(const t of[q,r,tip])t.z-=.10;triangle(r,q,tip,'#8b615e',0);yield;
 });

 building('w95087778','USPEE 200 · corp principal',17.4,'#b8bdb2',[-1784,-6.3],function*(p,y,h){
  yield* plain(p,y,h,5,true);const f=facade([-1823.18,-6.37],[-1747.29,-6.31],y),bays=23;
  for(let row=0;row<5;row++){for(let i=0;i<bays;i++)f.window((i+.5)*f.len/bays,2.15+row*3.35,1.50,2.30,stone,'#96a59d');yield;}
  for(let i=0;i<=bays;i++){f.panel(i*f.len/bays,8.8,.53,.30,17.1,.80,'#435b83');if(i%6===5)yield;}
  entrance(f,11.5,6.2,'#536586');f.panel(11.5,3.84,1.7,21,.9,3.4,'#5e7190');f.label('USPEE',11.5,4.65,.70,'#c8ccb9',3.44);f.label('CONSTANTIN STERE',11.5,3.62,.25,'#c8ccb9',3.44);
  for(let i=0;i<10;i++){const u=27+i*1.5;for(let row=0;row<3;row++){f.panel(u,1+row*.74,.61,1.40,.13,.28,'#b7b396');f.panel(u-.67,1.33+row*.74,.61,.13,.74,.28,'#b7b396');}if(i%3===2)yield;}
 });
 building('w147647043','USPEE 200 · aripă joasă',7.5,'#b9bdae',[-1840,-6.3],function*(p,y,h){yield* plain(p,y,h,2);});
 building('w85699413','CNA 198 · fațada lungă',18.2,'#b4b29c',[-1652,-7.1],function*(p,y,h){
  yield* plain(p,y,h,5,true);const f=facade([-1705.57,-7.07],[-1607.44,-7.22],y);
  for(let row=0;row<5;row++){for(let i=0;i<24;i++)f.window((i+.5)*f.len/24,2.65+row*3.35,2.76,2.10,'#b3b6a9','#869487');yield;}
  for(const yy of[.8,4.1,7.45,10.8,14.15,17.5])f.panel(f.len/2,yy,.20,f.len,.18,.36,'#adae9d');
  for(let i=0;i<=24;i++)f.panel(i*f.len/24,9.3,.35,.26,17.4,.38,'#bfc0ae',true);
  f.panel(f.len/2,h-.28,.36,f.len+.2,.23,.72,'#4b695b');f.panel(f.len/2,h+.16,.28,f.len,.06,.05,dark,true);
  entrance(f,87,4.6,'#a3aca3');f.panel(87,3.6,2,10,.28,4.1,'#969f98');f.panel(87,1.55,.35,4.4,2.85,.07,'#815f42',false,1);yield;
 });
 return{...mesh,replacements:mesh.replacements.map(r=>({...r,footprints:(cadastral as Record<string,{rings:number[][][][]}>)[`w${r.id}`]?.rings,get ready(){return r.ready;}})),get ready(){return mesh.ready;}};
}
