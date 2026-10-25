import * as T from 'three';
import realm from '../data/alecsandri-va13.json';
import catalog from '../data/alecsandri-va13-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** VA13: whole official plans, original opaque meshes, dated visible elevations.
 * Heights and screened courts remain estimates. No remote models or photo tiles. */
export function createAlecsandriVa13(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 type B=Omit<PhotoBuilding,'parts'>&{nativeIds:number[];sourceIds:string[];roofMansard?:{bands:number[][][][];cap:number[][][][]};parts?:Partial<B>[]};
 const buildings=catalog as unknown as B[];
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,roofRise:b.roofMansard?0:b.roofRise,parts:b.parts?.map(p=>({...p,roofRise:p.roofMansard?0:p.roofRise})),facades:false})),'Alecsandri VA13 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA13 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA13 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const angle=(f:Face)=>Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
 const atZ=(f:Face,z:number)=>(z-f.at(0)[1])/(f.at(f.len)[1]-f.at(0)[1])*f.len;
 function door(f:Face,u:number,bottom:number,w=1.1,h=2.5){f.panel(u,bottom+h/2,.34,w,h,.05,'#665341',false,1);for(const s of[-1,1])f.panel(u+s*(w/2+.07),bottom+h/2,.40,.13,h+.18,.20,'#c7c6b4');for(const yy of[bottom,bottom+h])f.panel(u,yy,.41,w+.25,.13,.22,'#c7c6b4');f.panel(u+.26,bottom+1.1,.46,.035,.27,.06,'#ada486',true);}
 function stairs(f:Face,u:number,w:number,rise:number,landing=.5){const n=Math.ceil(rise/.13),run=n*.29,foot=f.at(u,run+landing+.35),top=ground(...foot)+.035+rise;
  const p=f.at(u,landing/2+.16);m.box(p[0],top-.12,p[1],w,.24,landing+.04,'#9f7464',false,true,angle(f));
  for(let k=0;k<n;k++){const p=f.at(u,landing+.18+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#9f7464',false,true,angle(f));}return top-f.y;
 }
 function balcony(f:Face,u:number,yy:number,w:number){f.panel(u,yy,.65,w,.16,1.25,'#a19d87');for(const dh of[.15,1.1])f.panel(u,yy+dh,1.2,w,.04,.04,'#556357',true);for(let du=-w/2;du<=w/2;du+=.3)f.panel(u+du,yy+.62,1.2,.028,.96,.03,'#556357',true);for(const du of[-w/2,w/2])f.panel(u+du,yy+.62,.7,.035,.96,1,'#556357',true);}
 function ac(f:Face,u:number,yy:number){f.panel(u,yy,.44,.65,.43,.38,'#b9bdb0');for(let k=0;k<5;k++)f.panel(u-.24+k*.12,yy,.65,.018,.30,.025,'#7c8777',true);}
 function* facadeDetails(b:B){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  if(b.style!=='ruin')for(const f of a.faces(b.p as XY[],y)){
   if(f.len<1.3)continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),nx=q[0]-p[0],nz=q[1]-p[1],front=nx*b.front[0]>.85;
   a.cornice(f,h,b.trim);
   if(b.style==='annex'){if(front&&f.len>6){f.window(f.len*.35,1.6,.85,1.1,b.trim,'#7b806a');door(f,f.len*.72,0,.8,2);}yield;continue;}
   if(!front){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),1.8,b.trim,'#828777');yield;continue;}
   if(b.style==='hotelNorth'||b.style==='astoria'){
    f.panel(f.len/2,.42,.10,f.len,.84,.20,'#959b89');const n=Math.max(1,Math.round(f.len/3.3));
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;for(let row=0;row<b.levels;row++)f.window(u,1.65+row*2.95,Math.min(1.15,f.len/n*.62),2.05,b.trim,'#5e6b64');if(k%3===0)for(let yy=.7;yy<h;yy+=.48)f.panel(u-f.len/n*.43,yy,.16,.18,.035,.10,'#a1aaa0',true);yield;}
    for(let yy=3.4;yy<h;yy+=2.95)f.panel(f.len/2,yy,.16,f.len,.16,.32,b.trim);
    if(b.style==='hotelNorth'){for(let yy=1.7;yy<h;yy+=2.95)f.window(f.len*.5,yy,1.8,2.6,b.trim,'#65716b');}
    else if(f.len>10){f.panel(f.len/2,3.4,.35,4.5,.6,.22,'#758475');f.label('ASTORIA',f.len/2,3.27,.28,'#c6cbb7',.50);}
    if(f.len>10)for(let k=0;k<3;k++){const u=(k+.5)*f.len/3,p=f.at(u,-.85);m.box(p[0],y+h+2.45,p[1],1.5,.13,1.4,'#747e70',false,false,angle(f));f.window(u,h+1.9,.82,1.15,b.trim,'#65716b',-1.1);yield;}
   }else if(b.style==='turretHouse'&&f.len>10){
    const n=Math.max(3,Math.round(f.len/3.2));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,1.9,1.3,2.1,b.trim,'#56675d');f.window(u,5.25,1.25,2.2,b.trim,'#56675d');yield;}
    f.panel(f.len/2,3.7,.3,f.len,.25,.6,b.trim);const u=f.len*.62;
    f.panel(u,7.7,.12,3.5,3.2,.24,b.wall);a.arch(f,u,6.7,2.2,3.35,y,'#5a6c61',b.trim);balcony(f,u,6.5,3.3);
    const r=stairs(f,f.len*.25,1.7,.39,.45);door(f,f.len*.25,r,1.1,2.6);
    const p=f.at(u,-1.25);m.box(p[0],y+9.25,p[1],3.2,2.3,3.2,b.wall);
    let g:T.BufferGeometry=new T.ConeGeometry(2.6,2.0,4);g.rotateY(Math.PI/4);g.translate(p[0],y+11.4,p[1]);m.put(g,'#956b5b');
    const mast=new T.CylinderGeometry(.035,.06,2.3,6);mast.translate(p[0],y+13.25,p[1]);m.put(mast,'#839781',true);for(const yy of[12.5,13.5]){g=new T.TorusGeometry(.28,.025,4,12);g.rotateY(Math.PI/2);g.translate(p[0],y+yy,p[1]);m.put(g,'#839781',true);}
   }else if(b.style==='stairHouse'){
    if(f.len>10){for(const u of[f.len*.28,f.len*.68])f.window(u,1.85,1.15,1.65,b.trim,'#636b55');door(f,f.len*.55,0,1.0,2.35);f.panel(f.len*.55,3.0,.2,2.2,.45,.2,'#93946f');}yield;
   }else if(b.style==='chicago'){
    f.panel(f.len/2,.36,.1,f.len,.72,.2,'#9a8e79');const n=4;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,1.7,1.3,1.9,b.trim,'#737561');f.window(u,4.75,1.3,2.05,b.trim,'#737561');for(const du of[-f.len/n/2,f.len/n/2]){f.panel(u+du,3.1,.17,.24,h,.34,'#a07c68');for(let yy=.4;yy<h;yy+=.65)f.panel(u+du,yy,.36,.24,.15,.05,'#b39c80',true);}yield;}
    balcony(f,f.len*.73,3.5,3.3);f.panel(f.len*.3,3.3,.31,4.0,.65,.2,'#a9977d');f.label('CHICAGO',f.len*.3,3.19,.30,'#786153',.46);
    f.panel(f.len*.75,1.35,.38,2.5,2.6,.12,'#9b7764');
    const u=f.len*.7;a.pediment(f,u,h+.15,5.5,2.1,y,'#b7a98c');f.window(u,h+.85,1.5,1.35,b.trim,'#6d6b59',.30);balcony(f,u,6.35,3.0);
   }else if(b.style==='office141'||b.style==='officeBay'){
    f.panel(f.len/2,.45,.12,f.len,.9,.24,'#959f90');const n=Math.max(2,Math.round(f.len/3.5));
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;for(let row=0;row<3;row++)f.window(u,2.6+row*3.0,Math.min(2.4,f.len/n*.82),2.4,'#c1c6b9','#7f9b99');yield;}
    for(let yy=1;yy<h;yy+=.95)f.panel(f.len/2,yy,.12,f.len,.035,.24,'#9da9a0',true);
    if(b.style==='office141'&&f.len>5&&f.at(f.len/2)[1]>-822){const u=f.len*.35,r=stairs(f,u,1.8,.78,.8);door(f,u,r,1.5,2.7);f.panel(u,r+2.9,.8,2.5,.16,1.6,'#a6b7ac');}
    if(b.style==='officeBay'&&f.len>10){const r=stairs(f,f.len*.22,1.6,.78,.8);door(f,f.len*.22,r,1.25,2.7);const u=f.len*.52,w=3.5;for(let row=0;row<3;row++){f.panel(u,2.6+row*3,.70,w,2.65,.08,'#7e9f9c',false,1);for(let du=-w/2;du<=w/2;du+=.7)f.panel(u+du,2.6+row*3,.75,.06,2.7,.08,'#b6c7b6',true);}const p=f.at(u,.4),g=new T.SphereGeometry(2.6,16,8,0,Math.PI*2,0,Math.PI/2);g.scale(1,.48,.65);g.translate(p[0],y+h+.5,p[1]);m.put(g,'#778c70');}
   }else if(b.style==='tower100'){
    f.panel(f.len/2,.4,.1,f.len,.8,.2,'#a29b88');const n=Math.max(1,Math.floor(f.len/3.8));
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;for(let row=0;row<8;row++){f.window(u,1.65+row*2.9,Math.min(1.8,f.len/n*.72),1.95,'#c0c2b0','#939d8b');if((row+k)%5===2)ac(f,u+.9,2.5+row*2.9);}yield;}
    for(const du of[-f.len*.31,f.len*.31])f.panel(f.len/2+du,h/2,.13,.44,h,.26,'#a39780');
    if(f.len>5.5){a.arch(f,f.len/2,13.6,2.6,2.6,y,'#8eaaab','#c3c7b3');f.panel(f.len/2,h+.4,.2,Math.min(6.5,f.len),.5,.4,'#aab2a1');}
   }else{yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.4)),1.8,b.trim,'#828777');}
   yield;
  }
  if(b.roofMansard){
   for(const [polys,cap]of[[b.roofMansard.bands,false],[b.roofMansard.cap,true]]as const)for(const rings of polys){
    const s=new T.Shape();rings[0].forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));for(const r of rings.slice(1)){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));s.holes.push(hole);}
    const g=new T.ShapeGeometry(s);g.rotateX(-Math.PI/2);const v=g.attributes.position;for(let i=0;i<v.count;i++){const p:XY=[v.getX(i),v.getZ(i)],d=Math.min(...b.p.slice(1).map((q,k)=>pointSegmentDistance(p,b.p[k]as XY,q as XY)));v.setY(i,y+h+.15+b.roofRise*(cap?1:Math.min(1,d/1.5)));}g.computeVertexNormals();m.put(g,b.roof,false,true);yield;
   }
  }
 }
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){if(b.parts?.length){for(const part of b.parts)yield* facadeDetails({...b,...part,parts:undefined});}else yield* facadeDetails(b);});
 m.job('141 · copertină verde curbată',streetRect(593.5,-820.8,9.0,7.5),[],function*(){const b=buildings.find(b=>b.style==='office141')!,y=ground(...b.anchor as XY)+.12+b.height+.35,out:number[]=[];
  const arc=(x:number,t:number)=>new T.Vector3(x,y+Math.sin(t)*1.35,-820.8+Math.cos(t)*3.6);
  for(let k=0;k<16;k++){const p=arc(589.5,k*Math.PI/16),q=arc(597.3,k*Math.PI/16),r=arc(597.3,(k+1)*Math.PI/16),s=arc(589.5,(k+1)*Math.PI/16);for(const v of[p,q,s,q,r,s])out.push(v.x,v.y,v.z);m.beam(q,r,.035,'#92ad91');yield;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,'#6b8a6e');m.box(597.3,y+.32,-820.8,.06,.64,7.15,'#789675');yield;
 });
 // The west external metal flight follows the observed side access. Rise,
 // placement and its concealed attic continuation remain approximate.
 m.job('Țirilson3 · scară metalică exterioară',streetRect(603.4,-677,2,10),[],function*(){const x=603.4,z=-681,n=24,top=ground(x,z)+.035+3;
  for(let k=0;k<n;k++){const zz=z+(k+.5)*.29;m.box(x,top-(n-1-k)*.125-.08,zz,.88,.16,.295,'#637161',false,true);if(k%6===5)yield;}
  m.box(x,top-.10,z+n*.29+.30,1.25,.20,.7,'#637161',false,true);
  for(const dx of[-.48,.48]){m.beam(new T.Vector3(x+dx,ground(x,z)+.95,z),new T.Vector3(x+dx,top+.95,z+n*.29),.025,'#74846e');for(let k=0;k<=n;k+=4)m.box(x+dx,top-(n-k)*.125+.48,z+k*.29,.035,.95,.035,'#74846e',true,true);}yield;
 });
 function wallrun(name:string,p0:XY,p1:XY,color:string,h:number,stone=false){const len=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]),count=Math.ceil(len/5.0);
  for(let k=0;k<count;k++){const a0:XY=[p0[0]+(p1[0]-p0[0])*k/count,p0[1]+(p1[1]-p0[1])*k/count],b0:XY=[p0[0]+(p1[0]-p0[0])*(k+1)/count,p0[1]+(p1[1]-p0[1])*(k+1)/count];m.job(name,[a0,b0],[],function*(){const y=ground((a0[0]+b0[0])/2,(a0[1]+b0[1])/2),f=m.facade(a0,b0,y),p=f.at(f.len/2);m.box(p[0],y+(h-.5)/2,p[1],f.len,h+.5,.17,color,false,true,angle(f));
   if(stone){for(let yy=.2;yy<h;yy+=.36)f.panel(f.len/2,yy,.10,f.len,.022,.025,'#aaa68b',true);for(let u=.5;u<f.len;u+=.75)for(let yy=.38;yy<h;yy+=.72)f.panel(u,yy,.11,.02,.32,.025,'#aaa68b',true);for(const u of[0,f.len]){const p=f.at(u);m.box(p[0],ground(...p)+h/2,p[1],.3,h+.25,.3,'#b3aa8e',false,true);}for(const yy of[h+.1,h+.55])f.panel(f.len/2,yy,0,f.len,.04,.04,'#8c6c60',true);for(let u=.1;u<f.len;u+=.22)f.panel(u,h+.32,0,.025,.5,.025,'#8c6c60',true);}
   yield;
  });}
 }
 wallrun('zid de piatră fotografiat',[598.5,-615],[598.5,-653],'#b3aa8e',1.65,true);
 wallrun('zid alb · sud',[598.5,-678.5],[598.5,-685.55],'#bdbba4',1.9);wallrun('zid alb · mijloc',[598.5,-687.05],[598.5,-721.95],'#bdbba4',1.9);wallrun('zid alb · nord',[598.5,-725.15],[598.5,-728],'#bdbba4',1.9);
 wallrun('100/1 · împrejmuire laterală',[640,-814],[640,-804.95],'#8f9e87',1.9);
 wallrun('139 · împrejmuire de curte',[600,-743],[600,-811],'#a79783',1.9);
 for(let z=-681;z>-726;z-=3.8)m.job('vegetație peste zid',streetRect(597.8,z,3.2,4.0),[],function*(){const g=new T.IcosahedronGeometry(1.6,1);g.scale(1.1,.72,1.4);g.translate(597.5,ground(597.5,z)+2.3,z);m.put(g,'#6f8851');yield;});
 // The real printed construction screen is represented by original neutral
 // opaque panels and its frame. No fake completed facade or photo texture.
 wallrun('ecran de șantier · închidere',[646.7,-751],[646.7,-701],'#aaa99a',2.0);
 for(let z=-748;z< -701;z+=5)m.job('ecran de șantier · cadru',streetRect(646.7,z,1,5),[],function*(){const y=ground(646.7,z);m.box(646.7,y+5.1,z,.08,6.0,5,'#b5b7a7');for(const dz of[-2.5,2.5])m.box(646.55,y+4.8,z+dz,.10,9.6,.10,'#7b897a',false,true);for(const yy of[2.1,5.1,8.1])m.box(646.55,y+yy,z,.10,.08,5,'#7b897a');m.beam(new T.Vector3(646.5,y+5.1,z-2.5),new T.Vector3(646.5,y+8.1,z+2.5),.035,'#7b897a');yield;});
 m.job('chioșc mic fotografiat',realm.kiosk[0]as XY[],[],function*(){const y=ground(637.2,-673.5);m.solid(realm.kiosk[0]as XY[],2.8,y,'#b8bdb0',true);m.box(637.2,y+2.9,-673.5,3.1,.2,13.4,'#bfc4b5');const f=m.facade([635.8,-680],[635.8,-667],y);for(let u=1.2;u<12;u+=2.3)f.window(u,1.55,1.85,1.95,'#c5c9bb','#9aa595');yield;});
 for(const z of[-683.8,-689.0,-694.2])m.job('terasă · umbrelă și mobilier',streetRect(637.9,z,5,5),[],function*(){const y=ground(637.9,z);m.box(637.9,y+1.5,z,.08,3,.08,'#7c806b',true,true);const g=new T.ConeGeometry(2.7,.65,4);g.rotateY(Math.PI/4);g.scale(1,1,.88);g.translate(637.9,y+3.1,z);m.put(g,'#526352');m.box(638.5,y+.76,z,1.25,.12,.8,'#927b5c',false,true);for(const dz of[-.8,.8]){m.box(638.5,y+.43,z+dz,.95,.12,.44,'#8f795b',false,true);m.box(638.5,y+.72,z+dz,.95,.55,.08,'#8f795b');}yield;});
 for(const[x,z,h,r]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.15,.28,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#75765b',false,true);if(realm.trees.find(t=>t[0]===x&&t[1]===z)?.[4]===1){for(let k=0;k<4;k++){const g=new T.ConeGeometry(r*(1-k*.19),h*.4,9);g.translate(x,y+h*(.42+k*.16),z);m.put(g,'#748d79');yield;}return;}for(const[dx,dz,dy,rr]of[[0,0,.67,r],[r*.4,.25,.77,r*.70],[-r*.36,-.3,.81,r*.63],[0,0,.94,r*.46]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.08,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#6d8850');yield;}});
 for(const[x,z]of realm.poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),sign=x<619?1:-1;m.box(x,y+3.75,z,.17,7.5,.17,'#a4ad99',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x+sign*1.4,y+7.4,z),.04,'#899984');m.box(x+sign*1.4,y+7.4,z,.65,.1,.26,'#b7beaa');yield;});
 for(let z=-876;z<-615;z+=12)m.job('fire troleibuz',[[616.3,z],[619.7,z+12]],[],function*(){for(const dx of[-1.7,1.7])m.beam(new T.Vector3(618+dx,ground(618,z)+6.1,z),new T.Vector3(618+dx,ground(618,z+12)+6.1,z+12),.014,'#53634f');yield;});
 for(const[x,z]of[[608.0,-846.5],[629,-846.5],[605,-864],[632,-851]])m.job('indicator trecere',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.5,z,.045,3,.045,'#909f8b',true,true);m.box(x,y+2.65,z,.62,.70,.04,'#b7b64d');m.box(x,y+2.65,z+.035,.48,.56,.025,'#426e8c');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.19,y+2.46,z+.055,x+.19,y+2.46,z+.055,x,y+2.88,z+.055],3));g.computeVertexNormals();m.put(g,'#ccd1bd',true);yield;});
 for(const[x,z]of[[615,-641],[622,-675],[614,-718],[620,-752],[622,-788],[615,-826],[623,-860]])m.job('capac utilități',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.31,.31,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#788271');yield;});

 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:618,z:-736,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4900000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=-876;z<-615;z+=6)for(const x of[600,635])treeOverrides.push({x,z,height:0,radius:4,texture:0,get ready(){return m.readyNear(x,z,15)&&l.readyNear(x,z,20);}});
 for(const[x,z,h,r]of realm.trees)treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,15)&&l.readyNear(x,z,20);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
