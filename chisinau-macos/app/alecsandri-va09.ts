import * as T from 'three';
import realm from '../data/alecsandri-va09.json';
import catalog from '../data/alecsandri-va09-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** VA09: complete official bodies with original, photo-informed architecture.
 * Photographs are references only. All meshes are local, opaque and batched. */
export function createAlecsandriVa09(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[]})[],bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'Alecsandri VA09 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA09 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA09 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const angle=(f:Face)=>Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
 function door(f:Face,u:number,bottom:number,w=1.15,h=2.45,col='#73614e'){
  f.panel(u,bottom+h/2,.35,w,h,.04,col,false,1);for(const sign of[-1,1])f.panel(u+sign*(w/2+.07),bottom+h/2,.40,.13,h+.2,.20,'#d0c9b4');for(const yy of[bottom,bottom+h])f.panel(u,yy,.41,w+.25,.14,.22,'#d0c9b4');f.panel(u+.24,bottom+1.1,.44,.035,.25,.05,'#b4aa89',true);
 }
 function stairs(f:Face,u:number,w:number,rise:number){const n=Math.ceil(rise/.13),run=n*.29,foot=f.at(u,run+.35),top=ground(...foot)+.035+rise;for(let k=0;k<n;k++){const p=f.at(u,.18+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#9b9987',false,true,angle(f));}return top-f.y;}
 function ac(f:Face,u:number,yy:number){f.panel(u,yy,.45,.68,.45,.40,'#c4c6b8');for(let k=0;k<5;k++)f.panel(u-.24+k*.12,yy,.67,.018,.3,.025,'#7a887b',true);}
 function railing(f:Face,u:number,yy:number,w:number,v=1){f.panel(u,yy+.9,v,w,.035,.04,'#6a6251',true);for(let k=-w/2;k<=w/2;k+=.22)f.panel(u+k,yy+.46,v,.025,.88,.035,'#6a6251',true);}
 function uAtZ(f:Face,z:number){return (z-f.at(0)[1])/(f.at(f.len)[1]-f.at(0)[1])*f.len;}
 function circle(f:Face,u:number,yy:number,r:number,col='#b4ad99',glazed=false){const p=f.at(u,.37),g=glazed?new T.CircleGeometry(r,18):new T.TorusGeometry(r,.07,5,18);g.rotateY(angle(f));g.translate(p[0],f.y+yy,p[1]);m.put(g,col,true);}
 function* curvedCrown(f:Face,u:number,yy:number,w:number){const radius=w/2;for(let k=0;k<12;k++){const t0=k*Math.PI/12,t1=(k+1)*Math.PI/12,p=f.at(u+radius*Math.cos(t0),.32),q=f.at(u+radius*Math.cos(t1),.32);m.beam(new T.Vector3(p[0],f.y+yy+Math.sin(t0)*w*.14,p[1]),new T.Vector3(q[0],f.y+yy+Math.sin(t1)*w*.14,q[1]),.075,'#c8c1b0');yield;}}
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<1.3)continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]>.85,side=(b.style==='philharmonic'&&q[1]>p[1]+.85)||['corner129','corner86'].includes(b.style)&&q[1]<p[1]-.85;
   if(b.style!=='arches84')f.panel(f.len/2,.35,.07,f.len,.7,.14,'#949080');a.cornice(f,h,b.trim);
   if(!front&&!side){if(b.style!=='annex'&&f.len>3)yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.8)),1.8,b.trim,'#7e7561');yield;continue;}
   const n=Math.max(1,Math.round(f.len/3.25)),bw=f.len/n;
   if(['mansion80b','mansion82','mansionWing'].includes(b.style)){
    f.panel(f.len/2,1.9,.10,f.len,3.8,.20,'#726252');
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw;f.window(u,1.9,Math.max(.7,bw-.55),2.7,'#a59b84','#6e7160');
     for(const yy of[5.3,8.65,11.85]){f.window(u,yy,Math.min(1.4,bw-.6),1.95,b.trim,'#b6c0b6');if(yy<11){f.panel(u,yy-1.22,.17,1.9,.66,.17,'#c6beaa');circle(f,u,yy-1.22,.13,'#d0cbb8',true);}else{f.panel(u,yy+1.1,.2,1.9,.15,.34,b.trim);a.pediment(f,u,yy+1.2,1.9,.45,y,b.trim);}}
     f.panel(u-bw/2,7.9,.13,.22,8.7,.26,b.trim);if(k%3===1)ac(f,u+.8,10.1);yield;
    }
    for(const yy of[3.75,h-.1])f.panel(f.len/2,yy,.26,f.len,.24,.52,b.trim);
    // Brick-colored end bay is visible on the south face of80/B.
    if(b.style==='mansion80b'&&front){const u=f.at(0)[1]>f.at(f.len)[1]?f.len-1.7:1.7;f.panel(u,8.2,.18,3.2,8.4,.1,'#a78271');for(const yy of[5.3,8.65,11.85])f.window(u,yy,.9,1.75,b.trim,'#665d4c');}
    if(front&&f.len>10){const z=b.style==='mansion80b'?-265:-291,u=uAtZ(f,z);if(u>1&&u<f.len-1){door(f,u,.65,1.3,2.65,'#617b67');f.panel(u,3.3,.47,2.2,.60,.32,'#54725a');}}
   }else if(b.style==='philharmonic'){
    for(let k=0;k<n;k++){const u=(k+.5)*bw;for(const yy of[2.15,5.9])f.window(u,yy,1.3,2.2,'#c4bbb0','#8a8e7c');if(k%4===1){f.panel(u,7.9,.14,bw-.2,.75,.12,'#a29187');yield* curvedCrown(f,u,8.1,bw-.1);}yield;}
    f.panel(f.len/2,3.5,.24,f.len,.24,.48,'#c7bdb0');
   }else if(b.style==='arches84'){
    const opening=(u:number)=>Math.abs(f.at(u)[1]+310.25)<2.05;
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw;
     if(!front||!opening(u)){f.panel(u,.42,.08,bw,.84,.16,'#9a9582');f.window(u,1.9,1.35,2.15,b.trim,'#a8b9a6');}
     f.window(u,5.1,1.40,2.2,b.trim,'#b5bfb4');if(k===Math.floor(n/2))a.arch(f,u,7.20,1.95,2.3,y,'#648083',b.trim);else f.window(u,8.45,1.4,1.95,b.trim,'#b5bfb4');yield* curvedCrown(f,u,h-.03,bw-.10);f.panel(u-bw/2,6.5,.19,.26,6.9,.38,b.trim);yield;
    }
    for(const yy of[3.7,7.0])f.panel(f.len/2,yy,.27,f.len,.22,.54,b.trim);
    if(front&&f.len>12){const u=uAtZ(f,-310.25);for(const du of[-1.95,1.95])f.panel(u+du,1.65,.22,.22,3.3,.35,b.trim);yield* curvedCrown(f,u,3.28,4.0);f.panel(u,3.65,.48,4.0,.38,.3,'#c2bda8');f.label('PIESE AUTO',u,3.65,.24,'#587056',.66);const v=f.len*.18,r=stairs(f,v,1.5,.39);door(f,v,r,1.0,2.4,'#695f4d');}
   }else if(b.style==='corner86'){
    f.panel(f.len/2,.65,.13,f.len,1.3,.26,'#555e59');
    for(let k=0;k<n;k++){const u=(k+.5)*bw;if(k%3!==1)f.window(u,2.65,1.05,1.7,b.trim,'#d0d0c0');else f.panel(u,2.65,.16,1.05,1.7,.14,b.wall);if(k%3===0){f.panel(u,3.5,.7,1.45,.12,1.4,'#424c42');f.label('CAFE',u,3.68,.22,'#d2c9b1',.42);}yield;}
    if(f.len>10){const u=f.len*.48,r=stairs(f,u,1.5,.52);door(f,u,r,1.1,2.75,'#857651');}
   }else if(b.style==='corner129'){
    f.panel(f.len/2,.60,.15,f.len,1.2,.3,'#b0a078');for(let yy=.18;yy<1.2;yy+=.25)f.panel(f.len/2,yy,.32,f.len,.025,.04,'#928567',true);
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,2.7,Math.min(1.5,bw-.45),2.05,b.trim,'#bfc4b6');yield* curvedCrown(f,u,3.85,bw-.2);if(k%3===0)ac(f,u+.7,3.8);yield;}
    if(f.len>9){for(const fraction of[.18,.64,.90]){const u=f.len*fraction,r=stairs(f,u,1.4,.91);door(f,u,r,1.0,2.45,'#a0b0a4');if(fraction<.9){f.panel(u,3.7,.7,1.6,.12,1.4,'#6e7059');f.panel(u+1.4,2.8,.38,1.2,1.6,.08,'#69968b');}}}
   }else if(b.style==='houseWest'||b.style==='house129'){
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,2.0,1.05,1.95,b.trim,'#7f7e69');a.pediment(f,u,3.15,1.65,.43,y,b.trim);if(k%3===0)ac(f,u+.7,2.8);yield;}
    if(front&&f.len>12&&b.style==='houseWest'){const u=uAtZ(f,-261),r=stairs(f,u,1.5,.65);door(f,u,r,1.0,2.5,'#667469');f.panel(u,3.3,.7,1.7,.12,1.4,'#707660');}
    for(let k=0;k<Math.max(1,f.len/2.2);k++){const u=.4+k*2.2;f.panel(u,.72+k%3*.25,.16,.50,.50,.05,'#a5a38d',true);}
   }else if(b.style==='northEast'){
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,2.40,1.20,2.15,b.trim,'#a5b4a7');f.panel(u,3.75,.18,1.65,.17,.36,b.trim);a.pediment(f,u,3.86,1.65,.18,y,b.trim);yield;}
    for(let yy=1;yy<3.7;yy+=.47)f.panel(f.len/2,yy,.065,f.len,.033,.04,'#939c90',true);
   }else yield* a.windows(f,b.levels,h,n,1.8,b.trim,'#7d6c55');
   f.panel(.12,h/2,.23,.055,h,.08,'#7e8572',true);yield;
  }
 });
 // Entry stairs and side ramp join one common landing at80/B.
 m.job('80/B · scară și rampă',streetRect(634.9,-261,4,12),[],function*(){
  const base=ground(631.8,-265)+.035,top=base+.65;
  for(let k=0;k<5;k++)m.box(631.9+(k+.5)*2/5,base+(k+1)*.13-.12,-265,2/5+.004,.24,3.1,'#a6aa9c',false,true);
  m.box(635.1,top-.12,-265,2.4,.24,3.3,'#a6aa9c',false,true);
  const bottom=ground(634.6,-255.4)+.035;yield* m.surfaceStaged(streetRect(634.6,-259.4,1.3,8),(x,z)=>bottom+(top-bottom)*(-255.4-z)/8,'#a6aa9c',true);
  for(const x of[633.95,635.25])m.beam(new T.Vector3(x,bottom+.9,-255.4),new T.Vector3(x,top+.9,-263.4),.025,'#91a291');yield;
 });
 //82 has a separate raised shop entrance, kept clear of the court gate.
 m.job('82 · scară',streetRect(632.4,-291,4,4),[],function*(){const base=ground(630.8,-291)+.035;for(let k=0;k<5;k++)m.box(631+(k+.5)*2.5/5,base+(k+1)*.13-.12,-291,2.5/5+.004,.24,2.7,'#aaa895',false,true);m.box(634.2,base+.65-.12,-291,1.4,.24,2.8,'#aaa895',false,true);yield;});
 // Photographed courtyard walls stop at the real gaps used by the gates.
 for(const[z0,z1,h]of[[-252.5,-246.9,2.1],[-300.2,-280.2,2.25]])m.job('zid curte vest',[[615.5,z0],[615.5,z1]],[],function*(){const y=ground(615.5,(z0+z1)/2),f=m.facade([615.5,z0],[615.5,z1],y);m.box(615.5,y+h/2,(z0+z1)/2,.22,h,f.len,'#b1ad96',false,true);for(let yy=.25;yy<h;yy+=.42)f.panel(f.len/2,yy,.13,f.len,.015,.03,'#8e917c',true);for(let u=.6;u<f.len;u+=1.6){f.panel(u,h/2,.13,.035,h,.025,'#92937e',true);yield;}m.box(615.5,y+h+.07,(z0+z1)/2,.4,.14,f.len+.15,'#c4bfa7');});
 for(const[x,z,h,r,conifer]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.14,.26,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#73745a',false,true);if(conifer){for(let k=0;k<4;k++){const g=new T.ConeGeometry(r*(1-k*.18),h*.40,8);g.translate(x,y+h*(.40+k*.16),z);m.put(g,'#657e5a');yield;}}else for(const[dx,dz,dy,rr]of[[0,0,.68,r],[r*.43,.3,.76,r*.73],[-r*.36,-.4,.80,r*.65],[0,0,.94,r*.50]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.12,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,h<8?'#789654':'#6c864b');yield;}});
 // Opaque temporary enclosure observed on the Philharmonic street front.
 m.job('Filarmonica · împrejmuire observată',[[498,-230],[560,-230]],[],function*(){for(let x=498;x<560;x+=4){const y=ground(x,-230);m.box(x+2,y+1.15,-230,4,2.3,.1,x%12===6?'#526b75':'#83534e',false,true);for(let u=.1;u<4;u+=.25)m.box(x+u,y+1.15,-229.94,.025,2.3,.025,'#7c685b',true);yield;}});
 const poles:XY[]=[[617.6,-258],[618,-289],[618,-315],[618,-336],[629.5,-250],[629.5,-282],[629.5,-319],[632,-341],[607,-359],[642,-359]];
 for(const[x,z]of poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),sign=x<625?1:-1;m.box(x,y+3.7,z,.16,7.4,.16,'#a9ad9d',false,true);m.beam(new T.Vector3(x,y+6.9,z),new T.Vector3(x+sign*1.5,y+7.3,z),.04,'#869482');m.box(x+sign*1.5,y+7.3,z,.65,.1,.26,'#b9bcaa');yield;});
 for(let z=-363;z<-229;z+=24)m.job('cabluri troleibuz',[[620,z],[630,z+24]],[],function*(){for(const dx of[-1.7,1.7])for(let k=0;k<4;k++){const pt=(t:number)=>{const zz=z+t*24,x=623.3+dx;return new T.Vector3(x,ground(x,zz)+6.1-.12*Math.sin(t*Math.PI),zz);};m.beam(pt(k/4),pt((k+1)/4),.014,'#4d5b4d');yield;}});
 for(const z of[-258,-289,-319,-345])m.job('suspensie cabluri',[[617,z],[633,z]],[],function*(){m.beam(new T.Vector3(617,ground(617,z)+6.6,z),new T.Vector3(633,ground(633,z)+6.6,z),.014,'#5d6958');yield;});
 // Columna wires connect to the existing eastern-centre network.
 m.job('Columna · fire',[[614,-351],[676,-351]],[],function*(){for(const dz of[-1.3,1.3])for(let x=614;x<676;x+=12){m.beam(new T.Vector3(x,ground(x,-351)+6.2,-351+dz),new T.Vector3(x+12,ground(x+12,-351)+6.2,-351+dz),.014,'#4d5b4d');yield;}});
 for(const[x,z]of[[618,-341.6],[631,-346.5],[609.8,-355],[636.8,-356]])m.job('indicator trecere',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.5,z,.045,3,.045,'#919e8d',true,true);m.box(x,y+2.7,z,.62,.70,.045,'#b6b44b');m.box(x,y+2.7,z+.03,.48,.56,.025,'#416b8b');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.19,y+2.51,z+.05,x+.19,y+2.51,z+.05,x,y+2.94,z+.05],3));g.computeVertexNormals();m.put(g,'#d0cfb9',true);yield;});
 for(const[x,z]of[[630.5,-306],[633,-323],[618.5,-334]])m.job('coș stradal',streetRect(x,z,.5,.5),[],function*(){const y=ground(x,z);m.box(x,y+.65,z,.38,.55,.38,'#7b8570',true,true);m.box(x,y+.32,z,.055,.64,.055,'#7a8472',true);yield;});
 for(const[x,z]of[[625,-247],[623,-286],[622,-332],[640,-352]])m.job('capac utilități',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.31,.31,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#6f796d');yield;});
 // Visible small hedge/planter at the coffee frontage. No invented bus shelter.
 for(const z of[-330,-334])m.job('86 · jardinieră',streetRect(634,z,.6,1.5),[],function*(){const y=ground(634,z);m.box(634,y+.25,z,.5,.5,1.2,'#7c8069',false,true);m.box(634,y+.6,z,.5,.4,1.1,'#637a4e');yield;});
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:624,z:-297,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4500000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=-368;z<-233;z+=6)for(const x of[616,635])treeOverrides.push({x,z,height:0,radius:4,texture:0,get ready(){return m.readyNear(x,z,9)&&l.readyNear(x,z,18);}});
 for(const x of[521,543])treeOverrides.push({x,z:-226.7,height:0,radius:4,texture:0,get ready(){return m.readyNear(x,-226.7,12);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
