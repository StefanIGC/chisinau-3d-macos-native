import * as T from 'three';
import realm from '../data/alecsandri-va06.json';
import catalog from '../data/alecsandri-va06-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {bucurestiArchitecture} from './bucuresti-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** VA06. Metric official complete bodies with Sept2025 photographed street faces.
 * Unseen elevations, heights and small dimensions remain documented estimates. */
export function createAlecsandriVa06(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[]})[],bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'Alecsandri VA06 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA06 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA06 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 const buc=bucurestiArchitecture(m,ground);
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const angle=(f:Face)=>Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
 function door(f:Face,u:number,bottom:number,w=1.15,h=2.45,col='#73614e'){
  f.panel(u,bottom+h/2,.35,w,h,.04,col,false,1);for(const sign of[-1,1])f.panel(u+sign*(w/2+.07),bottom+h/2,.40,.13,h+.2,.20,'#d0c9b4');for(const yy of[bottom,bottom+h])f.panel(u,yy,.41,w+.25,.14,.22,'#d0c9b4');f.panel(u+.24,bottom+1.1,.44,.035,.25,.05,'#b4aa89',true);
 }
 function stairs(f:Face,u:number,w:number,rise:number){const n=Math.ceil(rise/.13),run=n*.29,foot=f.at(u,run+.35),top=ground(...foot)+.035+rise;for(let k=0;k<n;k++){const p=f.at(u,.18+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#a2a18f',false,true,angle(f));}return top-f.y;}
 function grille(f:Face,u:number,yy:number,w=1.2,h=1.8){for(let du=-w/2;du<=w/2;du+=.18)f.panel(u+du,yy,.57,.025,h,.035,'#44574c',true);for(const dh of[-h*.4,h*.4])f.panel(u,yy+dh,.58,w,.03,.04,'#44574c',true);}
 function ac(f:Face,u:number,yy:number){f.panel(u,yy,.45,.68,.45,.40,'#b9bdb0');for(let k=0;k<5;k++)f.panel(u-.24+k*.12,yy,.67,.018,.3,.025,'#7a887b',true);}
 function canopy(f:Face,u:number,yy:number,w=2.1,depth=1.5){for(let k=0;k<10;k++){const t=(k+.5)/10;f.panel(u-w/2+w*t,yy+.30*Math.sin(Math.PI*t),depth/2,w/10+.01,.07,depth,'#8c8b72');}}
 function doubleStairs(f:Face){
  const center=f.len/2,pt=f.at(center,1.7),top=ground(...pt)+.035+1.65,land=f.at(center,1.2);m.box(land[0],top-.13,land[1],2.6,.26,2.4,'#c3c0a9',false,true,angle(f));
  for(const sign of[-1,1]){
   const start=center+sign*5.3,end=center+sign*1.3,foot=f.at(start,1.7),low=ground(...foot)+.035,n=Math.ceil((top-low)/.13);
   for(let k=0;k<n;k++){const u=start+(end-start)*(k+.5)/n,p=f.at(u,1.7),yy=low+(top-low)*(k+1)/n;m.box(p[0],yy-.13,p[1],4/n+.005,.26,1.4,'#bebda7',false,true,angle(f));}
   for(const v of[1.0,2.4]){const p=f.at(start,v),q=f.at(end,v);m.beam(new T.Vector3(p[0],low+.85,p[1]),new T.Vector3(q[0],top+.85,q[1]),.027,'#8d9585');for(let k=0;k<=7;k++){const t=k/7,u=start+(end-start)*t,p=f.at(u,v);m.box(p[0],low+(top-low)*t+.42,p[1],.03,.84,.03,'#8d9585',true);}}
  }return top-f.y;
 }
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   if(buc.handles(b,f)&&['cladiri.8966/0','cladiri.8967/0','cladiri.9717/0','cladiri.9720/0'].includes(b.id)){yield* buc.detail(b,f);continue;}
   if(f.len<2)continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]>.85,corner=(b.style==='corner103'||b.style==='stone56')&&Math.abs(q[1]-p[1])>.85;
   f.panel(f.len/2,.35,.07,f.len,.70,.14,'#8e9181');a.cornice(f,h,b.trim);
   if(!front&&!corner){if(b.style!=='annex')yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.3)),1.8,b.trim,'#7c7564');yield;continue;}
   if(b.style==='stone56'){
    f.panel(f.len/2,1.75,.1,f.len,3.5,.20,'#a19f8f');
    for(let row=0;row<10;row++)for(let k=0;k<Math.ceil(f.len/.75);k++){const u=(k+.5+(row%2)*.25)*.75;if(u>f.len-.1)continue;f.panel(u,.28+row*.31,.23,.58+(k%3)*.045,.23,.04,['#b6b29f','#bdb9a6','#a6a592'][k%3],true);if(k%18===17)yield;}
    for(let row=0;row<2;row++)for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;a.arch(f,u,.75+row*3.2,1.25,2.05,y,'#677d79','#a89d84');yield;}
    if(front){const u=f.len*.23,r=stairs(f,u,2.0,.65);door(f,u,r,1.15,2.5,'#7a5e49');for(const sign of[-1,1]){const pt=f.at(u+sign*1.45,.95);m.box(pt[0],y+3.6,pt[1],.33,7.2,.35,'#aaa99b',false,true,angle(f));}for(let k=0;k<10;k++){const t=Math.PI*(k+.5)/10;f.panel(u+1.45*Math.cos(t),3.75,.55+1.0*Math.sin(t),.48,.85,.22,'#a7a38f');}f.panel(u,6.8,.60,3.3,.18,1.2,'#a9aa9b');}
   }else if(b.style==='cafe58'){
    f.panel(f.len/2,.55,.12,f.len,1.1,.24,'#4b5147');f.panel(f.len/2,3.55,.20,f.len,.70,.40,'#343e37');
    for(let k=0;k<4;k++){const u=(k+.5)*f.len/4;f.window(u,2.05,1.40,2.35,'#cdcfbd','#b7c1b0');f.panel(u,3.1,.9,1.8,.12,1.8,'#384239');yield;}door(f,f.len*.5,.10,1.2,2.7,'#687b70');
   }else if(b.style==='barred58'){
    f.panel(f.len/2,.37,.14,f.len,.74,.28,'#a99f7c');for(const frac of[.10,.30,.72,.90]){f.window(f.len*frac,2.2,1.05,1.8,'#ceccbd','#adb7a8');grille(f,f.len*frac,2.2,1,1.75);}f.panel(f.len/2,2.1,.12,.32,3.8,.24,'#b8b6a7');
   }else if(b.style==='house60'||b.style==='house64'){
    const n=b.style==='house60'?5:Math.max(5,Math.round(f.len/3.4));for(let k=0;k<n;k++){const u=(k+.5)*f.len/(n+1);f.window(u,2.25,1.02,2.1,b.trim,'#7f6551');f.panel(u,3.45,.22,1.40,.18,.32,b.trim);yield;}
    const u=f.len*.91,r=stairs(f,u,1.5,b.style==='house60'?.39:.26);door(f,u,r,1.0,2.45,'#76604a');if(b.style==='house64')ac(f,f.len*.55,3.2);
   }else if(b.style==='nouveau62'){
    // The precise plan has three street bays and a recessed middle pair of
    // windows. Detail each bay once instead of squeezing a whole facade into it.
    const bay=p[1]<386.2?0:p[1]<389.1?1:2;
    if(bay===0){const u=f.len*.50,r=stairs(f,u,1.7,.39);door(f,u,r,1.15,2.75,'#4b4f43');a.pediment(f,u,3.25,1.9,.40,y,b.trim);}
    const windows=bay===0?[]:bay===1?[.25,.75]:[.50];
    for(const frac of windows){const u=f.len*frac;f.window(u,2.35,1.10,2.55,b.trim,'#4e5043');f.panel(u,.92,.22,1.45,.20,.36,b.trim);f.panel(u,3.80,.22,1.45,.20,.36,b.trim);for(const side of[-1,1])f.panel(u+side*.64,2.35,.20,.12,2.9,.22,b.trim);for(const dx of[-.35,.35])f.panel(u+dx,.62,.20,.24,.20,.04,'#b2ad98',true);}
    for(const frac of(bay===1?[]:[.02,.98])){const u=f.len*frac;f.panel(u,h-.10,.2,.54,1.5,.40,b.trim);const pt=f.at(u,.42),g=new T.CircleGeometry(.27,14);g.rotateY(angle(f));g.translate(pt[0],y+h+.65,pt[1]);m.put(g,b.trim);for(const du of[-.12,.12])f.panel(u+du,h-.35,.43,.025,.72,.025,'#aaa797',true);}f.panel(f.len/2,h-.17,.1,f.len,.80,.20,b.wall);
   }else if(b.style==='house99'){
    if(f.len>25){f.panel(f.len*.54,h/2,.04,f.len*.26,h,.08,'#c2b2a9');f.panel(f.len/2,.55,.10,f.len,1.10,.20,'#b6ad89');}
    const bays=Math.max(3,Math.round(f.len/2.8));for(let k=0;k<bays;k++){const u=(k+.5)*f.len/bays;f.window(u,2.35,1.18,2.1,b.trim,'#806c55');yield;}
    if(f.len>25){for(const[frac,rise]of[[.25,.39],[.59,.65],[.92,.91]]){const u=f.len*frac,r=stairs(f,u,2.0,rise);door(f,u,r,1.2,2.45,'#94765b');if(frac<.3){a.pediment(f,u,3.45,3.5,.85,y,b.trim);for(const sign of[-1,1]){const pt=f.at(u+sign*1.4,.9);a.column(pt[0],pt[1],y+.15,3.1,.14,'#d5cbb0',true);}}else canopy(f,u,r+2.8,2.2);}}
   }else if(b.style==='house101'){
    f.panel(f.len/2,.70,.12,f.len,1.40,.24,'#b1ae97');for(let k=0;k<7;k++){const u=(k+.5)*f.len/7;if(k!==3){a.arch(f,u,1.85,1.12,2.25,y,'#69786a',b.trim);grille(f,u,2.95,1.05,1.9);}f.window(u,.56,.80,.60,b.trim,'#777864');yield;}
    if(front&&f.len>10){const r=doubleStairs(f);door(f,f.len/2,r,1.2,2.50,'#81664a');canopy(f,f.len/2,4.65,2.65,2.2);a.pediment(f,f.len/2,h+.05,3.5,1.05,y,b.trim);}
    f.panel(f.len/2,h+.83,.1,f.len,1.65,.2,b.roof);for(const frac of[.15,.29,.72,.87])f.window(f.len*frac,h+1.0,.75,1.15,'#c5c5b4','#9aa995');
   }else if(b.style==='court99'||b.style==='peach'){
    f.panel(f.len/2,h+.8,.1,f.len,1.6,.2,b.roof);if(front&&b.style==='peach'){const u=f.len*.10,r=stairs(f,u,1.7,.65);door(f,u,r,1.1,2.5,'#8d6f4b');canopy(f,u,r+2.7,1.9);}
    const n=Math.max(2,Math.round(f.len/3));for(let row=0;row<2;row++)for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,1.9+row*3,1.13,2.02,b.trim,'#9b805b');yield;}for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,h+.65,.95,1.1,b.trim,'#a69370');a.arch(f,u,h+.02,1.1,1.55,y,'#8c9f7c',b.trim);}f.panel(f.len/2,3.4,.2,f.len,.25,.4,b.trim);
   }else if(b.style==='corner103'){
    const n=Math.max(3,Math.round(f.len/2.5));for(let row=0;row<2;row++)for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,1.85+row*3.7,Math.min(1.45,f.len/n*.65),2.7,'#d3d7c8','#7a8980');yield;}f.panel(f.len/2,3.65,.23,f.len,.35,.46,'#d2d6c7');
    if(front&&f.len>10){const u=f.len*.5,r=stairs(f,u,2.1,.26);door(f,u,r,1.5,2.65,'#788e84');for(const du of[-1.2,1.2])f.panel(u+du,5.7,.25,.26,3.7,.5,'#d2d6c7');a.pediment(f,u,h+.1,4.2,1.15,y,'#c8d1c2');const point=f.at(u,.54),vent=new T.CircleGeometry(.22,14);vent.rotateY(angle(f));vent.translate(point[0],y+h+.62,point[1]);m.put(vent,'#8d9c8c');
     const p=f.at(u-1.3,.28),q=f.at(u+1.3,.28),tip=f.at(u,1.8),lo=f.at(u,1.3),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([p[0],y+4.2,p[1],q[0],y+4.2,q[1],tip[0],y+3.55,tip[1],p[0],y+4.2,p[1],tip[0],y+3.55,tip[1],lo[0],y+2.85,lo[1],tip[0],y+3.55,tip[1],q[0],y+4.2,q[1],lo[0],y+2.85,lo[1]].flat(),3));g.computeVertexNormals();m.put(g,'#4b5a54');}
   }else yield* a.windows(f,1,h,Math.max(1,Math.round(f.len/4)),1.6,b.trim,'#7e7763');
   f.panel(.12,h/2,.23,.055,h,.08,'#778372',true);if(f.len>5)f.panel(f.len/2,3.2,.24,f.len,.025,.025,'#87876b',true);yield;
  }
 });
 for(const[x,z,h,r]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(h<8?.12:.19,h<8?.18:.31,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#73745a',false,true);for(const[dx,dz,dy,rr]of[[0,0,.68,r],[r*.43,.3,.76,r*.73],[-r*.36,-.4,.80,r*.65],[0,0,.94,r*.50]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.12,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,h<8?'#789654':'#6c864b');yield;}});
 const poles:XY[]=[[635.5,452],[635.5,422],[635.7,372],[635.7,340],[621.7,452],[621.8,423],[621.8,390],[621.8,356],[621.8,332]];
 for(const[x,z]of poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),sign=x<629?1:-1;m.box(x,y+3.7,z,.16,7.4,.16,'#a9ad9d',false,true);m.beam(new T.Vector3(x,y+6.9,z),new T.Vector3(x+sign*1.5,y+7.3,z),.04,'#869482');m.box(x+sign*1.5,y+7.3,z,.65,.1,.26,'#b9bcaa');yield;});
 for(let i=0;i<5;i++)m.job('cabluri troleibuz',[[626,335+i*24],[632,359+i*24]],[],function*(){const z=335+i*24;for(const x of[627,630.7])for(let k=0;k<4;k++){const p=(t:number)=>new T.Vector3(x,ground(x,z+t*24)+6.1-.12*Math.sin(t*Math.PI),z+t*24);m.beam(p(k/4),p((k+1)/4),.014,'#4d5b4d');yield;}});
 for(const z of[356,390,423])m.job('suspensie cabluri',[[621.8,z],[635.5,z]],[],function*(){m.beam(new T.Vector3(621.8,ground(621.8,z)+6.6,z),new T.Vector3(635.5,ground(635.5,z)+6.6,z),.014,'#5d6958');yield;});
 m.job('București · acces interzis',streetRect(635.5,452,1,1),[],function*(){const x=635.5,z=452,y=ground(x,z),disk=new T.CircleGeometry(.34,20);disk.translate(x,y+3.1,z+.10);m.put(disk,'#a64f42');m.box(x,y+3.1,z+.13,.47,.11,.025,'#d7d8c4');yield;});
 m.job('64 · conductă și cabluri',[[637.3,380.5],[637.3,395]],[],function*(){const y=ground(637.3,387)+3.5;m.beam(new T.Vector3(637.3,y,380.5),new T.Vector3(637.3,y,395),.035,'#b2a051');for(const z of[381,392])m.beam(new T.Vector3(637.3,ground(637.3,z)+.1,z),new T.Vector3(637.3,y,z),.03,'#aaa078');const coil=new T.TorusGeometry(.25,.022,5,14);coil.rotateY(Math.PI/2);coil.translate(635.65,ground(635.7,372)+6.2,372);m.put(coil,'#5a6658',true);yield;});
 // Small photographed street objects are kept to the pavement edges.
 for(const[x,z]of[[636.3,431],[636.3,436]])m.job('terasă · masă',streetRect(x,z,1.2,1.2),[],function*(){const y=ground(x,z),top=new T.CylinderGeometry(.38,.38,.07,10);top.translate(x,y+.74,z);m.put(top,'#867c62');m.box(x,y+.36,z,.06,.72,.06,'#495b49',false,true);for(const dz of[-.62,.62]){m.box(x,y+.43,z+dz,.42,.06,.42,'#7c785e',true);m.box(x,y+.65,z+dz+.18,.42,.38,.035,'#6e725b',true);}yield;});
 m.job('container galben',streetRect(619.6,435,1.2,1),[],function*(){const y=ground(619.6,435);m.box(619.6,y+.63,435,1.15,1.10,.85,'#b8b74c',false,true);m.box(619.6,y+1.22,435,1.24,.1,.93,'#777e4a');yield;});
 m.job('dulap utilități',streetRect(635.3,369.4,1,1),[],function*(){const y=ground(635.3,369.4);m.box(635.3,y+.72,369.4,.75,1.44,.4,'#a1a89b',false,true);m.box(635.3,y+1.46,369.4,.82,.04,.45,'#b0b5a5');yield;});
 for(const z of[378,382.5,387,391.5])m.job('101 · jardinieră',streetRect(622, z,1.4,.7),[],function*(){const y=ground(622,z);m.box(622,y+.23,z,1.25,.46,.62,'#8f998b',false,true);m.box(622,y+.47,z,1.04,.035,.43,'#58684b');yield;});
 for(const[x,z0,z1]of[[637.6,441.9,442],[637.9,409.1,409.2],[637.7,380.5,380.8],[618.4,408.7,409.5],[618,389.7,389.9],[617.8,369.5,369.6]])m.job('zid lângă poartă',[[x,z0],[x,z1]],[],function*(){const z=(z0+z1)/2;m.box(x,ground(x,z)+1.0,z,.2,2,z1-z0,'#b8b19a',false,true);yield;});
 for(const z of[394.5,398,402.5,407,337,334])m.job('stâlpișor roșu',streetRect(622.8,z,.3,.3),[],function*(){const y=ground(622.8,z);m.box(622.8,y+.28,z,.07,.56,.07,'#995a4a',false,true);m.box(622.8,y+.48,z,.075,.055,.075,'#c6c6af');yield;});
 for(const[x,z]of[[626,449],[631,412],[627,370],[632,337]])m.job('capac utilități',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.31,.31,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#6f796d');yield;});
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:629,z:395,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4200000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=336;z<459;z+=6)for(const x of[620.7,635.1])treeOverrides.push({x,z,height:0,radius:3.4,texture:0,get ready(){return m.readyNear(x,z,9)&&l.readyNear(x,z,18);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
