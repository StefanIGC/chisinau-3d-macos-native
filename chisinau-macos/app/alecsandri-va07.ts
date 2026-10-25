import * as T from 'three';
import realm from '../data/alecsandri-va07.json';
import catalog from '../data/alecsandri-va07-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** VA07: complete metric plans, photographed fronts, estimated hidden elevations.
 * No photograph, cadastral query or per-object network load occurs while walking. */
export function createAlecsandriVa07(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[]})[],bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'Alecsandri VA07 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA07 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA07 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const angle=(f:Face)=>Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
 function door(f:Face,u:number,bottom:number,w=1.15,h=2.45,col='#73614e'){
  f.panel(u,bottom+h/2,.35,w,h,.04,col,false,1);for(const sign of[-1,1])f.panel(u+sign*(w/2+.07),bottom+h/2,.40,.13,h+.2,.20,'#d0c9b4');for(const yy of[bottom,bottom+h])f.panel(u,yy,.41,w+.25,.14,.22,'#d0c9b4');f.panel(u+.24,bottom+1.1,.44,.035,.25,.05,'#b4aa89',true);
 }
 function stairs(f:Face,u:number,w:number,rise:number){const n=Math.ceil(rise/.13),run=n*.29,foot=f.at(u,run+.35),top=ground(...foot)+.035+rise;for(let k=0;k<n;k++){const p=f.at(u,.18+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#9b9987',false,true,angle(f));}return top-f.y;}
 function grille(f:Face,u:number,yy:number,w=1.2,h=1.8){for(let du=-w/2;du<=w/2;du+=.18)f.panel(u+du,yy,.57,.025,h,.035,'#4d594d',true);for(const dh of[-h*.4,h*.4])f.panel(u,yy+dh,.58,w,.03,.04,'#4d594d',true);}
 function ac(f:Face,u:number,yy:number){f.panel(u,yy,.45,.68,.45,.40,'#b9bdb0');for(let k=0;k<5;k++)f.panel(u-.24+k*.12,yy,.67,.018,.3,.025,'#7a887b',true);}
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<1.3)continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]>.85,side=(b.style==='orient'&&q[1]>p[1]+.85)||(b.style==='villa5'&&q[1]<p[1]-.85)||(b.style==='corner115'&&q[1]<p[1]-.7);
   f.panel(f.len/2,.32,.07,f.len,.64,.14,'#93917e');a.cornice(f,h,b.trim);
   if(!front&&!side){if(b.style!=='annex'&&f.len>3)yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),1.7,b.trim,'#7e7561');yield;continue;}
   if(b.style==='bays66'){
    const n=Math.max(1,Math.round(f.len/5)),bw=f.len/n;
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw;
     f.window(u,1.8,Math.min(1.2,bw*.40),2.7,b.trim,'#5c6254');
     // Five projecting polygonal bays, with glazed angled cheeks. Their
     // upper-level projection does not obstruct the pedestrian surface below.
     const outline=[f.at(u-bw*.45,.04),f.at(u-bw*.34,1),f.at(u+bw*.34,1),f.at(u+bw*.45,.04)];
     m.solid([...outline,outline[0]],6.82,y+3.60,b.wall);
     for(const yy of[5.15,8.5]){
      for(let side=0;side<3;side++){const bf=m.facade(outline[side],outline[side+1],y);bf.window(bf.len/2,yy,Math.max(.25,bf.len-.22),2.6,b.trim,'#55777c');}
      f.panel(u,yy-1.56,.58,bw*.96,.38,1.15,b.trim);f.panel(u,yy+1.52,.55,bw*.96,.20,1.10,b.trim);
      for(let dx=-bw*.4;dx<bw*.4;dx+=.18)f.panel(u+dx,yy-1.53,1.17,.025,.25,.035,'#aba990',true);
     }
     if(f.len>10){a.pediment(f,u,h+.05,bw,1.25,y,'#756652');if(k===2){const r=stairs(f,u,1.7,.26);door(f,u,r,1.15,2.5,'#647260');}}
     yield;
    }
   }else if(b.style==='orient'){
    f.panel(f.len/2,.45,.12,f.len,.9,.24,'#6e6356');f.panel(f.len/2,3.35,.22,f.len,.83,.44,'#c9c7b5');
    const n=Math.max(1,Math.round(f.len/3.1));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,1.75,1.22,2.0,'#c8c6b5','#555c4d');if(k%2===1)door(f,u,.02,1.05,2.5,'#5e6757');yield;}
    if(front&&f.len>12)f.label('ORIENT',f.len*.70,3.45,.43,'#405b6d',.47);if(side&&f.len>10)f.label('FARMACIE',f.len*.50,3.45,.40,'#94675a',.47);
   }else if(b.style==='lusso70'){
    const n=3,bw=f.len/n;f.panel(f.len/2,1.95,.16,f.len,3.9,.32,'#b7baaf');
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.panel(u,1.95,.37,bw-.40,3.1,.03,'#536f70',false,1);for(let row=1;row<4;row++)f.window(u,2.0+row*3.35,Math.min(1.7,bw-.65),2.4,'#b9bcae','#526a66');yield;}
    f.panel(f.len*.65,3.45,.47,f.len*.64,.6,.25,'#42534a');f.label('LUSSO',f.len*.65,3.45,.30,'#bdc3b1',.62);const u=f.len*.72,r=stairs(f,u,2.3,.52);door(f,u,r,1.6,2.65,'#617c71');for(const du of[-1.2,1.2]){const p=f.at(u+du,.9);m.box(p[0],ground(...p)+.8,p[1],.035,.75,.035,'#6e786b',true);}f.panel(f.len/2,h,.27,f.len,.35,.54,b.trim);
   }else if(b.style==='house68'){
    const n=Math.max(1,Math.round(f.len/3.5));for(let row=0;row<2;row++)for(let k=0;k<n;k++){f.window((k+.5)*f.len/n,1.95+row*3.2,1.15,2.12,b.trim,'#6d6e5b');yield;}f.panel(f.len/2,3.47,.20,f.len,.22,.4,b.trim);if(f.len>10){const u=f.len*.85,r=stairs(f,u,1.6,.39);door(f,u,r,1.0,2.6,'#69735f');a.pediment(f,u,3.3,2.3,.48,y,b.trim);ac(f,f.len*.15,3.2);}
   }else if(b.style==='print72'){
    f.panel(f.len/2,.36,.12,f.len,.72,.24,'#a6a18d');f.panel(f.len/2,h-.33,.20,f.len,.54,.40,'#9a6e69');
    const n=Math.max(2,Math.round(f.len/3.1));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,2.12,1.10,2.0,b.trim,'#697564');f.panel(u,3.34,.20,1.50,.20,.35,b.trim);yield;}if(front&&f.len>10){door(f,f.len*.17,.02,1.03,2.55,'#b6bba9');ac(f,f.len*.5,3.35);f.label('BIROTICĂ · XEROX',f.len/2,h-.30,.34,'#d0c9b5',.43);}
   }else if(b.style==='house105'){
    f.panel(f.len/2,.68,.12,f.len,1.36,.24,'#b8b7a7');
    if(front&&f.len>2&&f.len<4){const r=stairs(f,f.len/2,1.5,.26);door(f,f.len/2,r,1.05,3.5,'#746550');a.pediment(f,f.len/2,h+.05,3.8,1.15,y,b.trim);}
    else{const n=Math.max(1,Math.round(f.len/1.82));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,3.48,1.07,2.75,b.trim,'#827464');a.pediment(f,u,4.97,1.45,.25,y,b.trim);f.window(u,.65,1.0,.75,b.trim,'#8a856f');grille(f,u,.65,1.0,.72);yield;}}
    f.panel(f.len/2,h+.55,.12,f.len,1.1,.24,b.wall);
   }else if(b.style==='villa5'){
    const middle=p[1];
    if(front&&middle>210.5&&middle<219){
     if(middle>213.5&&middle<216.05){const r=stairs(f,f.len/2,1.35,.26);a.arch(f,f.len/2,r,1.1,3.1,y,'#4c5546',b.trim);door(f,f.len/2,r,.85,2.65,'#535d4d');}
     else{a.arch(f,f.len/2,1.05,1.4,2.45,y,'#677561',b.trim);grille(f,f.len/2,2.08,1.25,1.85);}
    }else if(f.len>1.5){const n=Math.max(1,Math.round(f.len/2.8));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,2.15,.78,2.05,b.trim,'#777460');grille(f,u,2.15,.72,2);f.panel(u,3.35,.23,1.25,.20,.40,b.trim);for(const dx of[-.45,.45])f.panel(u+dx,3.1,.23,.11,.35,.35,b.trim);yield;}}
    for(const yy of[3.65,3.80])f.panel(f.len/2,yy,.20,f.len,.07,.24,b.trim);
    for(let u=.4;u<f.len;u+=.8){f.panel(u,.34,.18,.65,.30,.04,'#a9a38d',true);if(Math.round(u*10)%3===0)f.panel(u,.85,.15,.37,.35,.04,'#b9a696',true);}yield;
   }else if(b.style==='house111'){
    f.panel(f.len/2,.55,.13,f.len,1.10,.26,'#8d9182');f.panel(f.len/2,h+.72,.08,f.len,1.44,.16,b.wall);
    if(front&&f.len>8){
     for(const frac of[.18,.76])f.window(f.len*frac,2.18,1.35,2.25,b.trim,'#777963');
     for(const frac of[.04,.36,.63,.96]){const u=f.len*frac;f.panel(u,2.55,.22,.40,3.9,.44,b.trim);f.panel(u,4.35,.28,.62,.22,.56,b.trim);}
     const u=f.len*.50,r=stairs(f,u,2.65,.78);door(f,u,r,1.15,2.65,'#5e6354');f.panel(f.len/2,3.8,.29,f.len,.32,.35,'#bfbdb0');f.label('BILETE DE AVION',f.len*.53,3.82,.27,'#a66161',.49);
     for(const frac of[.28,.79]){const u=f.len*frac;f.window(u,h+.76,.75,1.65,b.trim,'#757666');a.pediment(f,u,h+1.55,1.60,.9,y,b.roof);}
     for(const du of[-1.35,1.35]){const p=f.at(u+du,.4),q=f.at(u+du,2);m.beam(new T.Vector3(p[0],y+r+.85,p[1]),new T.Vector3(q[0],ground(...q)+.85,q[1]),.025,'#7c8b7a');}
    }else yield* a.windows(f,1,h,Math.max(1,Math.round(f.len/3)),2.1,b.trim,'#7a7864');
   }else if(b.style==='corner115'){
    const n=Math.max(2,Math.round(f.len/2.6));
    f.panel(f.len/2,1.65,.15,f.len,3.3,.3,'#9ea79d');
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,5.55,1.1,2.05,b.trim,'#80745f');f.panel(u,6.75,.25,1.52,.18,.38,b.trim);f.window(u,1.95,1.2,1.65,'#a7afa1','#6f785f');if(k%2===1)ac(f,u,4.0);yield;}
    if(front&&f.len>8){const u=f.len*.20,r=stairs(f,u,1.8,.52);door(f,u,r,1.15,2.5,'#937957');f.panel(f.len/2,3.1,.36,f.len,.66,.4,'#414e46');if(p[1]>42)f.label('PASIO COFFEE',f.len/2,3.14,.33,'#a3c3bb',.58);else f.label('KUKI',f.len/2,3.14,.35,'#bfc0ad',.58);for(const du of[-1,1]){const aa=f.at(u+du,.5),bb=f.at(u+du,1.5);m.beam(new T.Vector3(aa[0],y+r+.9,aa[1]),new T.Vector3(bb[0],ground(...bb)+.85,bb[1]),.025,'#7c8c7c');}}
   }else if(b.style==='theatre'){
    const n=Math.max(1,Math.round(f.len/3.1));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;a.arch(f,u,1.08,Math.min(1.55,f.len/n*.62),3.6,y,'#50665f',b.trim);yield;}f.panel(f.len/2,5.38,.20,f.len,.27,.40,b.trim);if(front&&f.len>12)f.label('TEATRUL LUCEAFĂRUL',f.len/2,5.52,.34,'#7d765f',.43);
   }else if(b.style==='shops74'||b.style==='shops113'){
    const n=Math.max(1,Math.round(f.len/3.3));f.panel(f.len/2,.40,.12,f.len,.80,.24,b.style==='shops74'?'#525a4d':'#8b8770');
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,2.03,1.3,2.4,b.trim,'#566d60');f.panel(u,3.50,.18,1.60,.25,.35,b.trim);if(k===n-1&&f.len>6){const r=stairs(f,u,1.4,.26);door(f,u,r,1.0,2.5,'#65735f');}yield;}
    if(b.style==='shops74'&&f.len>12){f.panel(f.len*.65,3.75,.24,f.len*.34,.54,.30,'#4a5548');ac(f,f.len*.25,3.5);}
   }else{
    const n=Math.max(1,Math.round(f.len/3.2));yield* a.windows(f,b.levels,h,n,1.8,b.trim,'#7d6c55');
    if(b.style==='house109'&&front&&f.len>15){
     for(const[frac,rise]of[[.45,.52],[.93,.39]]){const u=f.len*frac,r=stairs(f,u,1.7,rise);door(f,u,r,1.10,2.6,frac<.5?'#7d7562':'#a18a58');if(frac<.5){f.panel(u,3.2,.8,1.8,.12,1.6,'#7e7e68');ac(f,u-1.8,3.2);}else a.pediment(f,u,3.9,2.1,.55,y,b.trim);}
    }
   }
   f.panel(.12,h/2,.23,.055,h,.08,'#7e8572',true);yield;
  }
  if(b.style==='villa5'){
   // Actual open roof holes, not dark decals over an intact roof.
   for(let z=208.6;z<213.5;z+=.65){m.beam(new T.Vector3(612.1,y+h+1.65,z),new T.Vector3(616.1,y+h+.18,z),.055,'#77745f');yield;}
   m.beam(new T.Vector3(612.2,y+h+1.55,208.2),new T.Vector3(612.2,y+h+1.55,213.4),.06,'#656956');
  }
 });
 for(const[x,z,h,r,conifer]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.14,.26,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#73745a',false,true);if(conifer){for(let k=0;k<4;k++){const g=new T.ConeGeometry(r*(1-k*.18),h*.40,8);g.translate(x,y+h*(.40+k*.16),z);m.put(g,'#657e5a');yield;}}else for(const[dx,dz,dy,rr]of[[0,0,.68,r],[r*.43,.3,.76,r*.73],[-r*.36,-.4,.80,r*.65],[0,0,.94,r*.50]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.12,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,h<8?'#789654':'#6c864b');yield;}});
 const poles:XY[]=[[634.7,303],[634.2,271],[634.0,238],[633.5,212],[632.8,176],[632.4,142],[631.8,110],[631.4,77],[631,44],[618.2,304],[618,268],[617.5,234],[618.8,198],[617.1,151],[616.5,118],[615.9,81],[615.6,46]];
 for(const[x,z]of poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),sign=x<628?1:-1;m.box(x,y+3.7,z,.16,7.4,.16,'#a9ad9d',false,true);m.beam(new T.Vector3(x,y+6.9,z),new T.Vector3(x+sign*1.5,y+7.3,z),.04,'#869482');m.box(x+sign*1.5,y+7.3,z,.65,.1,.26,'#b9bcaa');yield;});
 for(let z=28;z<307;z+=24)m.job('cabluri troleibuz',[[620,z],[630,z+24]],[],function*(){for(const dx of[-1.7,1.7])for(let k=0;k<4;k++){const pt=(t:number)=>{const zz=z+t*24,x=623.9+(zz-23)*.014+dx;return new T.Vector3(x,ground(x,zz)+6.1-.12*Math.sin(t*Math.PI),zz);};m.beam(pt(k/4),pt((k+1)/4),.014,'#4d5b4d');yield;}});
 for(const z of[77,142,209,271])m.job('suspensie cabluri',[[617,z],[634,z]],[],function*(){m.beam(new T.Vector3(617,ground(617,z)+6.6,z),new T.Vector3(634,ground(634,z)+6.6,z),.014,'#5d6958');yield;});
 for(const[x,z]of[[618,211.1],[633,211.1],[615,186],[636.4,185]])m.job('indicator trecere',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.5,z,.045,3,.045,'#919e8d',true,true);m.box(x,y+2.7,z,.62,.70,.045,'#b6b44b');m.box(x,y+2.7,z+.03,.48,.56,.025,'#416b8b');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.19,y+2.51,z+.05,x+.19,y+2.51,z+.05,x,y+2.94,z+.05],3));g.computeVertexNormals();m.put(g,'#d0cfb9',true);yield;});
 // Photographed enclosure at the former water-tower corner. Access stays open
 // at the mapped gap, rather than a continuous barrier across Veronica Micle.
 for(const[aa,bb]of[[[638,180],[638,198]],[[638,180],[656,180]],[[642,199],[656,199]]] as [XY,XY][])m.job('împrejmuire colț Veronica Micle',[aa,bb],[],function*(){const len=Math.hypot(bb[0]-aa[0],bb[1]-aa[1]),f=m.facade(aa,bb,ground(...aa));f.panel(len/2,.92,0,len,1.84,.10,'#a9b1a5');for(let u=.2;u<len;u+=.25)f.panel(u,.92,.06,.025,1.84,.025,'#8e9b8a',true);f.panel(len/2,2.14,0,len,.60,.04,'#638b69');yield;});
 for(const[x,z]of[[635.2,276],[635.2,279]])m.job('66 · terasă',streetRect(x,z,1.5,1.5),[],function*(){const y=ground(x,z);m.box(x,y+.73,z,.75,.07,.75,'#8c7f64');m.box(x,y+.35,z,.06,.70,.06,'#53614f',false,true);for(const dz of[-.7,.7]){m.box(x,y+.43,z+dz,.42,.06,.42,'#7f7c62',true);m.box(x,y+.67,z+dz+.18,.42,.42,.035,'#71785d',true);}yield;});
 for(const[x,z]of[[618,181],[619,161],[635,300],[634,211]])m.job('coș stradal',streetRect(x,z,.5,.5),[],function*(){const y=ground(x,z);m.box(x,y+.65,z,.38,.55,.38,'#7b8570',true,true);m.box(x,y+.32,z,.055,.64,.055,'#7a8472',true);yield;});
 for(const[x,z]of[[611.5,183],[612.5,153],[619,235]])m.job('bancă',streetRect(x,z,1.7,.65),[],function*(){const y=ground(x,z);for(let k=0;k<4;k++){m.box(x,y+.45,z-.24+k*.16,1.55,.07,.12,'#8c8264');m.box(x,y+.73+k*.13,z+.30,1.55,.10,.055,'#8c8264');}for(const dx of[-.55,.55])m.box(x+dx,y+.22,z,.07,.44,.55,'#50604c',true,true);yield;});
 for(const[x,z]of[[636,273],[636,281],[636,283]])m.job('jardinieră terasă',streetRect(x,z,1,.5),[],function*(){const y=ground(x,z);m.box(x,y+.27,z,.95,.54,.45,'#b3b4a3',false,true);m.box(x,y+.56,z,.80,.05,.31,'#5f6e4f');yield;});
 for(const z of[300,305,310])m.job('stâlpișori colț',streetRect(634.3,z,.2,.2),[],function*(){const y=ground(634.3,z);m.box(634.3,y+.37,z,.065,.74,.065,'#adb8a6',true,true);m.box(634.3,y+.65,z,.07,.08,.07,'#a65c4c',true);yield;});
 for(const[x,z]of[[626,298],[630,248],[625,212],[628,164],[624,95],[629,54]])m.job('capac utilități',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.31,.31,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#6f796d');yield;});
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:628,z:166,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4300000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=23;z<312;z+=6)for(const x of[617.8,634])treeOverrides.push({x,z,height:0,radius:3.4,texture:0,get ready(){return m.readyNear(x,z,9)&&l.readyNear(x,z,18);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
