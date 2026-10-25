import * as T from 'three';
import realm from '../data/august-junction.json';
import catalog from '../data/august-junction-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {GroundExcavation} from './ground-excavations';
import type {XY} from './city-layout';

/** Complete mapped bodies at the final31August junction. Photo evidence and
 * estimated dimensions are recorded in the associated reference manifest. */
export function createAugustJunction(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'31 August · joncțiune detalii',ground,loaded),a=photoArchitecture(m);
 const buildings=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>b.id!=='w145588800') as PhotoBuilding[],'31 August · joncțiune corpuri');
 const l=landscapeLayer(scene,'31 August · joncțiune spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>{const u=(x-realm.crossing[0])*.9035+(z-realm.crossing[1])*.4286,v=-(x-realm.crossing[0])*.4286+(z-realm.crossing[1])*.9035;const hump=u>=3&&u<=3.65&&Math.abs(v)<3.55?.065*Math.sin(Math.PI*(u-3)/.65):0;return ground(x,z)+(p.raised?.12:.035)+hump;},true);},c.coverage);
 const alinta=catalog.find(b=>b.id==='w145588800')!;
 const excavation:GroundExcavation={...realm.stair,bottom:0,ready:()=>m.collisionObjects[0]?.userData.grounded===true};
 m.job('31 August2A · fostul Alinta',alinta.p as XY[],[145588800],function*(){
  const y=ground(...alinta.anchor as XY)+.10,h=4.15;
  m.solid(alinta.p as XY[],h+5,y-5,'#91ad8a',true);m.solid(alinta.p as XY[],.16,y+h,'#808b7c',false);yield;
  const f=m.facade([1934.441,270.549],[1949.887,279.119],y),angle=Math.atan2(-realm.stair.axis[1],realm.stair.axis[0]);
  // The basement entrance, not a fictitious street-level cafe door.
  const upper=ground(...f.at(6.5,1.05))+.055,lower=upper-2.02;
  excavation.bottom=lower-.08;
  f.panel(f.len/2,3.70,.12,f.len+.15,1.00,.24,'#c0c5b6');
  for(let u=.08;u<f.len;u+=.25){f.panel(u,3.70,.265,.027,1.00,.025,'#a5af9f',true);if(Math.round(u/.25)%16===0)yield;}
  f.panel(3.25,1.59,.045,6.5,3.18,.09,'#b87a43');
  for(const u of[1.6,4.6]){
   f.panel(u,1.92,.15,2.45,2.00,.025,'#4a5e55',false,1);
   for(const side of[-1,1])f.panel(u+side*1.27,1.92,.19,.14,2.18,.13,'#c6ccbe');
   for(const hh of[.85,2.98])f.panel(u,hh,.19,2.68,.14,.13,'#c6ccbe');
   f.panel(u,1.92,.20,.065,2.00,.075,'#b7c2b2');yield;
  }
  // Retained historical sign without any claim that the business is open.
  f.panel(12.1,3.72,.28,4.1,.87,.08,'#315575');f.label('ALINTA',12.1,3.48,.61,'#d6c267',.35);
  f.panel(12.1,3.17,.28,4.1,.22,.08,'#c7cbbc');
  for(const side of a.faces(alinta.p as XY[],y)){
   const pp=side.at(side.len/2),qq=side.at(side.len/2,1);
   if((qq[0]-pp[0])*(-.485)+(qq[1]-pp[1])*.875>.8)continue;
   side.panel(side.len/2,3.93,.12,side.len,.23,.24,'#b2bca9');
   if(side.len>5)yield* a.windows(side,1,3.8,Math.max(1,Math.round(side.len/4.5)),1.8,'#b9c7b0','#4c6553');yield;
  }
  const stairPoint=(u:number,v:number)=>f.at(u,v),stairBox=(u:number,v:number,top:number,w:number,d:number,color:string,thick=.22)=>{const p=stairPoint(u,v);m.box(p[0],top-thick/2,p[1],w,thick,d,color,false,true,angle);};
  const n=15,start=6.8,end=13.4;
  stairBox(6.65,1.05,upper,.30,1.8,'#a89b7b');
  for(let k=0;k<n;k++){stairBox(start+(k+.5)*(end-start)/n,1.05,upper-(k+1)*(upper-lower)/n,(end-start)/n,1.8,'#a7997a');yield;}
  stairBox(14.15,1.05,lower,1.5,1.8,'#9c9479');
  // Register complete ownership so native paving cannot bridge this opening.
  yield* m.surfaceStaged(realm.stair.rings[0] as XY[],()=>lower-.08,'#746b57',true);
  for(const v of[.075,2.025]){
   const p=f.at(10.7,v);m.box(p[0],(lower+upper)/2+.08,p[1],8.7,upper-lower+.35,.15,'#968069',false,true,angle);
   const cap=f.at(10.7,v);m.box(cap[0],upper+.27,cap[1],8.8,.16,.22,'#b7ae91',false,true,angle);
   const p0=f.at(6.6,v),p1=f.at(13.6,v);
   for(const dh of[.78])m.beam(new T.Vector3(p0[0],upper+dh,p0[1]),new T.Vector3(p1[0],lower+dh,p1[1]),.037,'#adb6a8');
   for(const u of[7.2,9.8,12.5]){const p=f.at(u,v),yy=upper-(upper-lower)*Math.max(0,(u-6.8)/(13.4-6.8));m.box(p[0],yy+.42,p[1],.035,.84,.035,'#9eaa9c',true);}
  }
  // Closed basement door and retaining end; exterior flight remains walkable.
  const endFace=m.facade(f.at(14.96,1.95),f.at(14.96,.15),lower);
  endFace.panel(.9,1.10,.02,1.75,2.2,.08,'#3c4e40');
  const ep=f.at(15.04,1.05);m.box(ep[0],lower+1.05,ep[1],.16,2.1,1.8,'#55715b',false,true,angle);
  // Shallow barrel canopy, opaque smoked material to avoid sorting flicker.
  const u0=6.2,u1=17.2,v0=.05,v1=3.15,segments=10;
  const roofY=(v:number)=>y+2.61+.56*Math.sin(Math.PI*(v-v0)/(v1-v0)*.80+.35);
  for(let k=0;k<segments;k++){
   const v=v0+(v1-v0)*k/segments,vv=v0+(v1-v0)*(k+1)/segments,p=f.at(u0,v),q=f.at(u1,v),r=f.at(u1,vv),s=f.at(u0,vv),g=new T.BufferGeometry();
   g.setAttribute('position',new T.Float32BufferAttribute([p[0],roofY(v),p[1],q[0],roofY(v),q[1],r[0],roofY(vv),r[1],p[0],roofY(v),p[1],r[0],roofY(vv),r[1],s[0],roofY(vv),s[1]].flat(),3));const positions=g.attributes.position.array;const reverse=[];for(let i=0;i<positions.length;i+=9)reverse.push(...Array.from(positions.slice(i,i+3)),...Array.from(positions.slice(i+6,i+9)),...Array.from(positions.slice(i+3,i+6)));for(let i=1;i<reverse.length;i+=3)reverse[i]+=.035;g.setAttribute('position',new T.Float32BufferAttribute([...positions,...reverse],3));g.computeVertexNormals();m.put(g,'#788779');yield;
  }
  for(const u of[6.2,9.9,13.6,17.2]){
   const p=f.at(u,3.15),yy=ground(...p)+.035;m.box(p[0],(yy+y+2.62)/2,p[1],.075,y+2.62-yy,.075,'#4c5040',false,true);
   for(let k=0;k<segments;k++){const v=v0+(v1-v0)*k/segments,vv=v0+(v1-v0)*(k+1)/segments,p=f.at(u,v),q=f.at(u,vv);m.beam(new T.Vector3(p[0],roofY(v)+.03,p[1]),new T.Vector3(q[0],roofY(vv)+.03,q[1]),.024,'#454f40');}yield;
  }
  for(const v of[.15,3.15]){const p=f.at(u0,v),q=f.at(u1,v);m.beam(new T.Vector3(p[0],roofY(v),p[1]),new T.Vector3(q[0],roofY(v),q[1]),.04,'#46513f');}
  const guard=m.facade(f.at(15.2,.15),f.at(15.2,3.0),upper);yield* a.fence(guard.at(0),guard.at(guard.len),upper,1.06);
  const lantern=f.at(11.2,.48);m.box(lantern[0],y+1.88,lantern[1],.24,.39,.25,'#b5b895',true);for(const dx of[-.14,.14])m.box(lantern[0]+dx,y+1.88,lantern[1],.025,.46,.27,'#374a39',true);
  // Photographed low planting bed and green pedestal planter.
  for(const u of[8,9.5,11,12.5,14,15.5,17]){
   const p=f.at(u,2.64),yy=ground(...p)+.16;m.box(p[0],yy,p[1],1.45,.28,.88,'#b59375',false,true,angle);
   for(const d of[-.30,.25]){const q=f.at(u+d,2.65),g=new T.IcosahedronGeometry(.35,0);g.scale(1,.8,1);g.translate(q[0],yy+.33,q[1]);m.put(g,'#648252');}yield;
  }
  const pot=f.at(6.0,3.25),py=ground(...pot)+.035;
  for(const[yy,rt,rb,hh]of[[.18,.20,.30,.36],[.50,.30,.18,.32],[.75,.39,.22,.20]]){const g=new T.CylinderGeometry(rt,rb,hh,12);g.translate(pot[0],py+yy,pot[1]);m.put(g,'#709579');}
  yield;
 });
 // Distinctive archival features with probable, explicitly documented body
 // assignments. The main footprint/roof remains in the shared building batch.
 for(const id of['w256820685','w744427000','w744427001']){
  const b=catalog.find(v=>v.id===id)!;
  m.job('detaliu fotografic '+id,b.p as XY[],[],function*(){
   const y=ground(...b.anchor as XY)+.12;
   if(id==='w256820685'){
    const f=m.facade([1912.659,262.534],[1927.978,262.713],y);
    f.panel(f.len/2,2.58,.45,f.len,4.95,.20,b.wall);
    for(const u of[2.2,5.8,9.4,13.0]){f.window(u,2.85,2.1,2.25,b.trim,'#7a8d7e',.40);yield;}
    const u=7.55;a.pediment(f,u,5.05,4.8,1.65,y,b.wall);
    for(const side of[-1,1]){const p=f.at(u+side*2.45,.5),q=f.at(u,.5);m.beam(new T.Vector3(p[0],y+5.05,p[1]),new T.Vector3(q[0],y+6.77,q[1]),.11,b.roof);}
   }else if(id==='w744427000'){
    const f=m.facade([1931.637,300.573],[1923.249,298.327],y),u=f.len*.57;
    f.panel(u,5.87,.15,3.0,2.55,.22,b.wall);a.pediment(f,u,7.1,3.25,1.10,y,b.wall);
    a.arch(f,u,4.9,1.65,2.30,y,'#566e68',b.trim,1);
    // The arch is in front of the dormer face, with an inset mullion.
    f.panel(u,5.85,.46,.055,1.8,.055,'#bac9b5',true);
    for(const side of[-1,1]){const p=f.at(u+side*1.65,.49),q=f.at(u,.49);m.beam(new T.Vector3(p[0],y+7.10,p[1]),new T.Vector3(q[0],y+8.22,q[1]),.10,b.roof);}
   }else{
    const f=m.facade([1947.873,307.051],[1944.49,318.941],y),u=f.len/2;
    f.panel(u,1.68,.48,1.62,1.97,.10,'#778075');for(let dx=-.65;dx<.8;dx+=.26)f.panel(u+dx,1.68,.55,.02,1.94,.025,'#5a695a',true);
   }yield;
  });
 }
 const crossing:[number,number]=[1963.3,295.4];
 m.job('trecere pietoni · indicator',streetRect(...crossing,2,2),[],function*(){
  const[x,z]=crossing,y=ground(x,z),f=m.facade([x+.45*.4286,z-.45*.9035],[x-.45*.4286,z+.45*.9035],y);
  m.box(x,y+1.85,z,.065,3.70,.065,'#929d8b',false,true);
  f.panel(.45,3.12,0,.88,.88,.07,'#b6c961');f.panel(.45,3.12,.045,.67,.67,.025,'#346e96');
  const v=[f.at(.19,.067),f.at(.71,.067),f.at(.45,.067)],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([v[0][0],y+2.88,v[0][1],v[1][0],y+2.88,v[1][1],v[2][0],y+3.41,v[2][1]],3));g.computeVertexNormals();m.put(g,'#d0d3bc');
  f.panel(.46,3.12,.078,.04,.19,.025,'#374d46',true);
  for(const off of[-1,1]){const a=f.at(.46,.08),b=f.at(.46+off*.085,.08);m.beam(new T.Vector3(a[0],y+3.09,a[1]),new T.Vector3(b[0],y+2.94,b[1]),.014,'#374d46');}yield;
 });
 // Photo-grounded compound edges. Positions/heights are estimates, each
 // opening matches a working gate and stays clear of the public pavement.
 const walls:[XY,XY,string,number][]=[[[1900,283.1],[1918,291.6],'#b8b7a2',1.65],[[1922,293.5],[1930.2,297.4],'#b8b7a2',1.65],[[1966.3,323],[1969.5,317.4],'#898675',1.8],[[1973.9,319.55],[1996,330.1],'#898675',1.8]];
 for(const[aa,bb,color,h]of walls)m.job('împrejmuire curte',[aa,bb],[],function*(){
  const len=Math.hypot(bb[0]-aa[0],bb[1]-aa[1]),angle=Math.atan2(-(bb[1]-aa[1]),bb[0]-aa[0]),wood=aa[0]>1960,n=Math.ceil(len/(wood?.19:1.8));
  for(let k=0;k<n;k++){
   const t=(k+.5)/n,x=aa[0]+(bb[0]-aa[0])*t,z=aa[1]+(bb[1]-aa[1])*t,y=ground(x,z);
   m.box(x,y+h/2,z,len/n-(wood?.022:0),h,.16,color,false,true,angle);
   if(!wood){m.box(x,y+.26,z,len/n,.52,.30,'#8d9180',false,true,angle);m.box(x,y+h+.04,z,len/n,.11,.27,'#c1bfac');}if(k%8===7)yield;
  }yield;
 });
 // Lamps and trees visible in the dated sequence. Exact pole/trunk locations
 // are inferred from photographs, not represented as surveyed OSM points.
 const poles:XY[]=[[1910,266.7],[1944,281.8],[1963.3,295.4],[1964.3,315.6]];
 for(const[x,z]of poles)m.job('stâlp fotografic',streetRect(x,z,2,2),[],function*(){
  const y=ground(x,z);m.box(x,y+3.8,z,.19,7.6,.19,'#a0a28f',false,true);m.beam(new T.Vector3(x,y+7.2,z),new T.Vector3(x-1.5,y+7.5,z+1.1),.045,'#687b69');
  const lamp=new T.SphereGeometry(1,10,6);lamp.scale(.38,.1,.19);lamp.translate(x-1.5,y+7.45,z+1.1);m.put(lamp,'#a8b3a0');yield;
 });
 for(let i=1;i<poles.length;i++)m.job('cabluri intersecție',[poles[i-1],poles[i]],[],function*(){const aa=poles[i-1],bb=poles[i];for(let wire=0;wire<3;wire++)for(let k=0;k<6;k++){
  const at=(t:number)=>new T.Vector3(aa[0]+(bb[0]-aa[0])*t,ground(...aa)*(1-t)+ground(...bb)*t+7.2+.10*wire-.45*Math.sin(Math.PI*t),aa[1]+(bb[1]-aa[1])*t+.15*wire);m.beam(at(k/6),at((k+1)/6),.018,'#425540');yield;
 }});
 for(const[x,z]of[[1904,283.5],[1912.5,287.2],[1926,295.5],[1953,325.5],[1977,326.5]])m.job('arbore de margine',streetRect(x,z,5,5),[],function*(){
  const y=ground(x,z),g=new T.CylinderGeometry(.17,.28,6,8);g.translate(x,y+3,z);m.put(g,'#787560',false,true);
  for(const[dx,dy,dz,r]of[[0,6.6,0,2.55],[-1.2,5.9,.5,1.9],[1.3,6.2,-.4,1.85],[0,8,0,1.9]]){const g=new T.IcosahedronGeometry(r,1);g.scale(1,1.3,1);g.translate(x+dx,y+dy,z+dz);m.put(g,'#627e54');yield;}
 });
 const layers=[m,l,buildings];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),excavations:[excavation],
  get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
