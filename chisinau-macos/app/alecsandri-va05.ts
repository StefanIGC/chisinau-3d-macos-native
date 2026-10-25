import * as T from 'three';
import realm from '../data/alecsandri-va05.json';
import catalog from '../data/alecsandri-va05-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {bucurestiArchitecture} from './bucuresti-architecture';
import {bucurestiBu07Architecture} from './bucuresti-bu07-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** Metric official plans, original meshes; observed street elevations Sept2025.
 * Heights, screened vegetation and back elevations remain documented estimates. */
export function createAlecsandriVa05(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[]})[];
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'Alecsandri VA05 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA05 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA05 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 const buc=bucurestiArchitecture(m,ground);
 const bu07=bucurestiBu07Architecture(m,ground);
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 function stairs(f:Face,u:number,w:number,rise:number){
  const n=Math.ceil(rise/.13),run=n*.29,low=f.at(u,run+.35),top=ground(...low)+.035+rise,angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
  for(let k=0;k<n;k++){const p=f.at(u,.18+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#9f9f91',false,true,angle);}return top-f.y;
 }
 function grille(f:Face,u:number,h:number,w=1.2,hh=1.9){for(let du=-w/2;du<=w/2;du+=.18)f.panel(u+du,h,.58,.025,hh,.04,'#43574e',true);for(const yy of[-hh*.4,hh*.4])f.panel(u,h+yy,.60,w,.03,.04,'#43574e',true);}
 function ac(f:Face,u:number,h:number){f.panel(u,h,.48,.66,.44,.40,'#b2b6aa');for(let j=0;j<5;j++)f.panel(u-.23+j*.11,h,.70,.018,.3,.025,'#788579',true);}
 function balcony(f:Face,u:number,h:number,w:number,depth=.8){f.panel(u,h,depth/2,w,.16,depth,'#bbb4a0');for(const y of[.18,.95])f.panel(u,h+y,depth,w,.04,.04,'#49564b',true);for(let du=-w/2;du<=w/2;du+=.22)f.panel(u+du,h+.56,depth,.025,.8,.03,'#49564b',true);}
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   // These two official bodies remain owned by VA05. July2025 documents
   // the Bucuresti47 frontage and temporary printed protective covering.
   if(['cladiri.8887/0','cladiri.1832351/0'].includes(b.id)){if(bu07.handles(b,f))yield* bu07.detail(b,f);continue;}
   if(buc.handles(b,f)&&['cladiri.8966/0','cladiri.8967/0','cladiri.9717/0','cladiri.9720/0'].includes(b.id)){yield* buc.detail(b,f);continue;}
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]>.85,bankSide=b.style==='bank'&&q[1]<p[1]-.85,side56=b.style==='corner56'&&q[1]<p[1]-.85;
   if(f.len<2)continue;
   f.panel(f.len/2,.38,.06,f.len,.76,.12,b.style==='bank'?'#8f8a79':'#858b80');a.cornice(f,h,b.trim);
   if(!front&&!bankSide&&!side56){if(b.style!=='annex')yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.2)),1.7,b.trim,'#797263');yield;continue;}
   if(b.style==='acord'||b.style==='acordWing'){
    f.panel(f.len/2,h+1.05,.10,f.len,2.10,.20,'#697c4f');
    const n=Math.max(2,Math.round(f.len/3.0));for(let row=0;row<2;row++){for(let k=0;k<n;k++)f.window((k+.5)*f.len/n,2.9+row*3.0,1.30,1.85,b.trim,'#a4b6b0');yield;}
    if(b.style==='acord'){
     const u=f.len*.42,w=Math.min(3.8,f.len*.48);f.panel(u,4.1,.85,w,7.0,1.7,'#728e8e',false,1);
     for(let du=-w/2;du<=w/2;du+=w/3)f.panel(u+du,4.1,.90,.055,7.0,.10,'#c4c9b7');for(const yy of[.7,2.7,4.7,6.8])f.panel(u,yy,.91,w,.055,.10,'#c4c9b7');
     a.arch(f,u,h-.6,w,2.4,y,'#7d9898',b.trim);f.label('ACORD GRUP',u,3.2,.25,'#87584c',.96);f.panel(u,2.78,.96,w,.55,.05,'#c2cabb');
     const d=f.len*.86,r=stairs(f,d,2.2,1.3);a.door(f,d,r+2.3,1.45,'#59615b');f.panel(d,r+2.8,1.1,2.5,.16,2.2,'#7d887d');
    }
    for(let k=0;k<2;k++){const u=(k+.5)*f.len/2;f.window(u,h+.72,1.2,1.4,b.trim,'#a5b1a2');a.arch(f,u,h+.1,1.5,1.9,y,'#71836b',b.trim);}yield;
   }else if(b.style==='hearing'){
    for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;f.window(u,2.15,1.35,1.9,b.trim,'#acb6a8');}f.panel(f.len/2,3.7,.22,f.len,.67,.44,'#c87543');f.label('APARATE AUDITIVE',f.len/2,3.57,.20,'#ded7c1');for(const yy of[.7,2.7])f.panel(f.len/2,yy,.18,f.len,.42,.36,'#ca7a4c');
   }else if(b.style==='house46'){
    f.panel(f.len/2,h+.67,.10,f.len,1.34,.20,'#7c5349');
    for(let row=0;row<2;row++)for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;if(!row&&k===2){const r=stairs(f,u,2.2,.39);a.door(f,u,r+2.55,1.35,'#6c5849');f.panel(u,3.2,.8,2.4,.10,1.6,'#575a4d');}else f.window(u,1.9+row*3.7,1.05,2.05,b.trim,'#afa98d');yield;}
    f.panel(f.len/2,3.8,.20,f.len,.24,.40,b.trim);for(const u of[f.len*.15,f.len*.8])ac(f,u,6.8);for(let k=0;k<3;k++)f.window((k+.5)*f.len/3,h+.65,.95,1.15,'#aaa99b','#696654');
   }else if(b.style==='house48'){
    for(let k=0;k<3;k++)f.window((k+.5)*f.len/4,2.05,1.1,1.8,b.trim,'#96947a');const u=f.len*.87;stairs(f,u,1.7,.26);a.door(f,u,2.65,1.0,'#807254');f.panel(u,3.05,.80,1.65,.10,1.6,'#736d57');f.label('MILLITEX',f.len*.5,3.65,.21,'#676956');
   }else if(b.style==='villa50'){
    for(let row=0;row<2;row++)for(let k=0;k<3;k++){const u=(k+.5)*f.len/3;f.window(u,1.9+row*3.35,1.4,1.85,'#ded0ad','#b6c0ab');f.panel(u,3.0+row*3.35,.24,1.95,.28,.48,'#ded0ad');yield;}a.pediment(f,f.len*.5,h-.1,f.len*.50,1.05,y,b.trim);stairs(f,f.len*.52,2.1,.52);a.door(f,f.len*.52,2.8,1.2,'#897b5c');
   }else if(b.style==='modern'){
    const n=3;f.panel(f.len/2,.5,.12,f.len,1.0,.24,'#8f7f73');for(let row=0;row<3;row++)for(let k=0;k<n;k++){const u=(k+.5)*f.len/n,w=k===1?f.len/3-.25:f.len/3-.6;f.window(u,1.9+row*3.2,w,2.6,'#cacfc0','#b6c6ba');if(k===1)f.panel(u,2.4+row*3.2,.44,w,.06,.08,'#c5cebd');yield;}stairs(f,f.len*.5,2.1,.52);
   }else if(b.style==='bank'||b.style==='corner56'){
    const n=Math.max(2,Math.round(f.len/3.4));for(let row=0;row<b.levels;row++)for(let k=0;k<n;k++){const u=(k+.5)*f.len/n,yy=1.9+row*3.2;if(b.style==='corner56'&&(row===0||row===2))a.arch(f,u,yy-1.15,1.3,2.35,y,'#627775',b.trim);else f.window(u,yy,1.25,2.1,b.trim,'#8a9687');if(row===1&&b.style==='corner56')balcony(f,u,yy-1.1,1.45,.28);yield;}
    for(let u=.18;u<f.len;u+=3.4)f.panel(u,h/2,.16,.25,h,.32,b.trim);for(let yy=1;yy<h;yy+=.53)f.panel(f.len/2,yy,.17,f.len,.023,.04,'#adae9f',true);
    if(bankSide){const u=f.len*.48,r=stairs(f,u,2.4,.65);a.door(f,u,r+2.6,1.5,'#657f81');a.pediment(f,u,h+.2,3,1.1,y,b.trim);ac(f,f.len*.75,6.2);}yield;
   }else if(b.style==='mansard'){
    for(let row=0;row<2;row++)for(let k=0;k<3;k++)f.window((k+.5)*f.len/3,2+row*3.1,1.1,1.9,b.trim,'#a3ab98');const u=f.len/2;stairs(f,u,2.1,.65);a.door(f,u,2.9,1.2,'#7c6852');balcony(f,u,4,2.2);a.pediment(f,u,h-.1,3.4,1.6,y,b.trim);
   }else if(b.style==='coffee'){
    for(let k=0;k<3;k++){const u=(k+.5)*f.len/3;f.window(u,2,1.15,2.2,'#bd947d','#8b6f53');f.panel(u,3.25,.90,1.65,.13,1.8,'#343f37');}f.label('cafe',f.len/2,3.7,.24,'#aa8064');stairs(f,f.len*.16,1.5,.39);
   }else if(b.style==='nouveau'||b.style==='historic'){
    const n=Math.max(3,Math.round(f.len/3.1));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,2.5,1.12,2.1,b.trim,'#92917a');grille(f,u,2.5);a.pediment(f,u,3.65,1.55,.24,y,b.trim);yield;}if(b.style==='nouveau'){const u=f.len*.5;f.panel(u,h/2,.18,2.0,h,.36,b.trim);a.pediment(f,u,h+.15,2.8,1.0,y,b.trim);a.door(f,u,3.0,1.1,'#6b6b55');stairs(f,u,1.8,.39);}
   }else{yield* a.windows(f,1,h,Math.max(1,Math.round(f.len/4)),1.5,'#bdb6a1','#7c7661');}
   // Downpipes and service cables remain small, opaque material batches.
   f.panel(.12,h/2,.25,.06,h,.09,'#687768',true);if(f.len>7)f.panel(f.len/2,3.2,.26,f.len,.025,.025,'#5b6658',true);yield;
  }
 });
 for(const[x,z,h,r]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.17,.30,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#73745a',false,true);const white=new T.CylinderGeometry(.28,.32,1.1,7);white.translate(x,y+.55,z);m.put(white,'#c2c4b0');for(const[dx,dz,dy,rr]of[[0,0,.68,r],[r*.48,.3,.72,r*.72],[-r*.4,-.4,.8,r*.68],[0,0,.93,r*.55]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.15,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#657f46');yield;}});
 for(const[x,z,h]of[[619,590.5,3.6],[619,591.7,3.8],[619,592.9,3.3],[619,594,3.2],[639.2,554,4.0],[639.2,556,4.5],[639.2,558,4.2]])m.job('conifer ornamental',streetRect(x,z,1.2,1.2),[],function*(){const y=ground(x,z);m.box(x,y+.23,z,1.05,.40,.85,'#a9aa92',false,true);for(let k=0;k<3;k++){const g=new T.ConeGeometry(.60-k*.12,h*.6,7);g.translate(x,y+.8+k*h*.18,z);m.put(g,'#3f6045');yield;}});
 const poles:XY[]=[[621.8,591],[621.8,567],[621.9,536],[622,506],[635.7,597],[635.8,565],[635.8,532],[635.8,499],[636.5,476]];
 for(const[x,z]of poles)m.job('stâlp și iluminat',streetRect(x,z,2,2),[],function*(){const y=ground(x,z);m.box(x,y+3.7,z,.16,7.4,.16,'#a9ad9d',false,true);const sign=x<629?1:-1;m.beam(new T.Vector3(x,y+6.9,z),new T.Vector3(x+sign*1.7,y+7.3,z),.045,'#7e8c7e');m.box(x+sign*1.7,y+7.3,z,.65,.10,.26,'#b9bcaa');yield;});
 for(let i=0;i<4;i++)m.job('cabluri troleibuz',[[625.7,482+i*28],[632,510+i*28]],[],function*(){const z=482+i*28;for(const x of[627,630.7])for(let k=0;k<4;k++){const p=(t:number)=>new T.Vector3(x,ground(x,z+t*28)+6.1-.12*Math.sin(t*Math.PI),z+t*28);m.beam(p(k/4),p((k+1)/4),.014,'#4d5b4d');yield;}});
 for(const z of[506,536,567])m.job('suspensie cabluri',[[621.8,z],[635.8,z]],[],function*(){m.beam(new T.Vector3(621.8,ground(621.8,z)+6.6,z),new T.Vector3(635.8,ground(635.8,z)+6.6,z),.014,'#5d6958');yield;});
 m.job('plăcuță stradală București',streetRect(635.9,475.7,1,1),[],function*(){const x=635.9,z=475.7,y=ground(x,z),f=m.facade([x-.75,z],[x+.75,z],y);f.panel(.75,2.15,0,1.5,.40,.08,'#436883');f.label('BUCUREȘTI',.75,2.07,.14,'#d5d8c4',.06);yield;});
 for(const[x,z]of[[622.8,475],[636,475],[620.3,465],[642.6,476]])m.job('indicator și semafor București',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),f=m.facade([x-.3,z],[x+.3,z],y);m.box(x,y+2.4,z,.10,4.8,.10,'#969f8d',false,true);f.panel(.3,3,0,.70,.70,.08,'#b9c66a');f.panel(.3,3,.055,.56,.56,.03,'#4f7991');a.pediment(f,.3,2.78,.45,.40,y,'#d0d3c2');f.panel(.3,4.25,.05,.36,1.03,.3,'#364339');for(const[yy,col]of[[4.56,'#814c3e'],[4.25,'#a68c42'],[3.94,'#54794e']]as const)f.panel(.3,yy,.22,.21,.21,.035,col);yield;});
 // Visible utility / waste objects. Their clearances leave both foot routes open.
 for(const[x,z,col]of[[619.5,528,'#b7b64a'],[619.6,525.8,'#a1aaa0']]as const)m.job('container deșeuri',streetRect(x,z,1.5,1.2),[],function*(){const y=ground(x,z);m.box(x,y+.65,z,1.18,1.1,.88,col,false,true);m.box(x,y+1.22,z,1.27,.10,.96,'#69776b');for(const dx of[-.44,.44])m.box(x+dx,y+.12,z,.13,.24,.22,'#4e5e50',true);yield;});
 for(const[x,z]of[[623.2,487],[634.4,481],[623.3,575]])m.job('gură de scurgere',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+.045,z,.6,.014,.9,'#53645a');for(let i=0;i<8;i++)m.box(x,y+.055,z-.38+i*.105,.5,.012,.025,'#8c9787',true);yield;});
 for(const[x,z]of[[626,495],[632,556],[628,589]])m.job('capac utilități',streetRect(x,z,1,1),[],function*(){const g=new T.CylinderGeometry(.32,.32,.016,16);g.translate(x,ground(x,z)+.047,z);m.put(g,'#6f796d');yield;});
 // Enclosures have the same openings as the interactive gate catalogue.
 for(const[x,z0,z1,col]of[[618.3,518,532.9,'#a4a18c'],[618.3,536.9,540.6,'#a4a18c'],[640.5,572,572.4,'#a8b5a1'],[639.3,543.2,544.2,'#95816a'],[638,590.2,591,'#bbb7a6']]as const)m.job('zid curte',[[x,z0],[x,z1]],[],function*(){const z=(z0+z1)/2,y=ground(x,z);m.box(x,y+1.05,z,.22,2.1,z1-z0,col,false,true);m.box(x,y+2.15,z,.29,.12,z1-z0,'#8e7c67');yield;});
 m.job('46 · lintel gang',streetRect(643,593.7,10,5.4),[],function*(){const y=ground(638,593.7)+.12;m.box(643,y+5.5,593.7,10,4.6,5.4,'#bebcb0',false,true);const f=m.facade([638,591],[638,596.4],y);for(const u of[1.3,4.1])f.window(u,5.5,.95,1.9,'#d0cabb','#a5ab9c');a.cornice(f,7.8,'#c9c5b2');f.panel(2.7,8.4,.10,5.4,1.2,.20,'#7c5349');yield;});
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true;
 const ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:629,z:544,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4100000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=484;z<606;z+=6)for(const x of[621.5,635.8])treeOverrides.push({x,z,height:0,radius:3.5,texture:0,get ready(){return m.readyNear(x,z,9)&&l.readyNear(x,z,18);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
