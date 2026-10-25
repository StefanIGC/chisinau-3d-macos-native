import * as T from 'three';
import realm from '../data/alecsandri-va08.json';
import catalog from '../data/alecsandri-va08-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** VA08: complete official bodies with original, photo-informed architecture.
 * Photographs are references only. All meshes are local, opaque and batched. */
export function createAlecsandriVa08(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[]})[],bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'Alecsandri VA08 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA08 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA08 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
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
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<(b.style==='kiosk'?.7:1.3))continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]>(b.style==='kiosk'?.25:.85),side=(b.style==='kiosk'&&Math.abs(q[1]-p[1])>.8)||(b.style==='corner121'&&q[1]<p[1]-.85)||(b.style==='corner123'&&q[1]>p[1]+.85)||(b.style==='corner80'&&q[1]>p[1]+.85)||(b.style==='varlaam65'&&q[1]<p[1]-.85);
   f.panel(f.len/2,.35,.07,f.len,.7,.14,'#949080');a.cornice(f,h,b.trim);
   if(!front&&!side){if(b.style!=='annex'&&f.len>3)yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.6)),1.7,b.trim,'#7e7561');yield;continue;}
   if(b.style==='office78'||b.style==='officeWing'){
    const n=Math.max(1,Math.round(f.len/3.2)),bw=f.len/n;
    for(let row=0;row<b.levels;row++){
     const yy=1.85+row*(h/b.levels);f.panel(f.len/2,yy,.16,f.len,row?2.05:2.7,.32,row?'#d0d2c9':'#4b5958');
     for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,yy,bw-.28,row?1.65:2.5,'#d0d3c9','#b0b6ab');if(row>0&&k%3===1)ac(f,u+.7,yy-1.15);yield;}
    }
    f.panel(f.len/2,h-.15,.3,f.len,.30,.6,'#a6aaa2');
    if(b.style==='office78'&&front&&f.len>70){for(const[z,text,col]of[[-124,'APP','#4d7e59'],[-164,'INTRARE','#364b4a']] as [number,string,string][]){const u=uAtZ(f,z);f.panel(u,3.7,.65,5.7,1.0,.5,col);f.label(text,u,3.7,.4,'#d3d4ba',.93);door(f,u,.9,2.1,2.6,'#4b6964');}}
   }else if(b.style==='varlaam65'){
    const n=Math.max(1,Math.round(f.len/3.2)),bw=f.len/n;
    f.panel(f.len/2,1.7,.18,f.len,3.4,.36,'#68716a');f.panel(f.len/2,15.6,.18,f.len,2.5,.16,'#56645e');for(let yy=3.8;yy<14.2;yy+=.38)f.panel(f.len/2,yy,.15,f.len,.017,.03,'#a2a593',true);
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,1.9,bw-.3,2.5,b.trim,'#bfc4b8');for(let row=1;row<5;row++){f.window(u,1.8+row*3.45,Math.min(row===4?2.7:1.6,bw-.4),2.2,b.trim,'#bfc4b8');if(row===4)f.panel(u,15.6,.33,.32,3,.35,'#c8c5b3');}if(k%3===0)ac(f,u+.7,7.2);yield;}
   }else if(b.style==='kiosk'){
    const n=Math.max(1,Math.round(f.len/2.6));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,1.55,Math.min(.95,f.len/n-.3),1.85,'#ad8e63','#655c45');yield;}for(let u=.15;u<f.len;u+=.30)f.panel(u,1.45,.16,.025,2.65,.04,'#957548',true);if(front&&f.len>5)door(f,f.len*.60,.04,1.1,2.4,'#7c7358');
   }else if(b.style==='house117'){
    const n=Math.max(2,Math.round(f.len/3.25)),bw=f.len/n;
    for(let k=0;k<n;k++){const u=(k+.5)*bw;for(let row=0;row<3;row++)f.window(u,1.9+row*3.35,1.35,2.2,b.trim,'#c0c6b7');if(k%3===1){f.panel(u,7.1,.55,2.25,.18,1.2,'#aa9b7d');railing(f,u,7.2,2.05,1.16);}if(k%3===2)ac(f,u+.7,6.8);yield;}
    for(let yy=.4;yy<h;yy+=.45)f.panel(f.len/2,yy,.15,f.len,.017,.035,'#aca88e',true);
    if(f.len>20){for(const frac of[.16,.56,.88]){const u=f.len*frac,r=stairs(f,u,1.65,.39);door(f,u,r,1.1,2.4,'#776a54');f.panel(u,3.1,.7,1.9,.12,1.4,'#6b725a');}}
   }else if(b.style==='office119'){
    const n=Math.max(2,Math.round(f.len/3.15)),bw=f.len/n;
    for(let k=0;k<n;k++){const u=(k+.5)*bw;for(let row=0;row<3;row++)f.window(u,2.0+row*3.2,1.25,2.05,b.trim,'#bac1b4');f.panel(u+bw/2,6.5,.21,.28,6.6,.40,b.trim);f.panel(u+bw/2,9.9,.30,.65,.33,.55,b.trim);if(k%3===0)ac(f,u+.65,6.6);for(let j=0;j<4;j++)f.panel(u-.55+j*.35,7.17,.24,.22,.12,.08,'#a7a68e',true);yield;}
    for(let yy=.3;yy<3.4;yy+=.4)f.panel(f.len/2,yy,.15,f.len,.02,.04,'#a6a48d',true);
    if(front&&f.len>30){const u=uAtZ(f,-158),r=stairs(f,u,1.75,.39);door(f,u,r,1.5,2.8,'#484b41');f.panel(u,3.8,.28,3.8,.47,.4,'#b1a78c');f.panel(u,5.2,.5,3.5,.18,1,b.trim);railing(f,u,5.3,3.2,1);for(const du of[-2,2])f.panel(u+du,7.8,.28,.55,5.3,.5,b.trim);f.panel(u,3.3,.52,2.5,.54,.10,'#426279');f.label('CEC',u,3.3,.22,'#cbcdbd',.59);door(f,uAtZ(f,-144),.84,1.2,2.4,'#b2c0b4');}
   }else if(b.style==='corner121'){
    const n=Math.max(1,Math.round(f.len/3)),bw=f.len/n;
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,2.1,1.2,2.2,b.trim,'#725f4f');f.window(u,5.45,1.1,2.05,b.trim,'#b9b7a7');a.pediment(f,u,h+.02,Math.min(bw-.3,2.7),1.1,y,'#997961');if(k%3===0)ac(f,u+.55,4);yield;}
    f.panel(f.len/2,.7,.12,f.len,1.4,.24,'#9d9a88');for(let yy=.3;yy<1.4;yy+=.32)f.panel(f.len/2,yy,.25,f.len,.035,.03,'#7d7f71',true);
    if(front&&f.len>25){const u=uAtZ(f,-180.5),r=stairs(f,u,1.8,.78);door(f,u,r,1.3,2.6,'#846951');f.panel(u,3.8,.65,2.3,.14,1.3,'#555b4c');f.panel(u,4.6,.75,2,.14,1.55,'#a99a7b');railing(f,u,4.65,1.8,1.4);for(const du of[-.55,.55]){const pp=f.at(u+du,1.25);m.box(pp[0],y+4.95,pp[1],.45,.48,.4,'#978464');}}
   }else if(b.style==='corner123'||b.style==='corner80'){
    yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3)),2.1,b.trim,'#a4ac9a');if(f.len>8){const r=stairs(f,f.len*.72,1.6,.26);door(f,f.len*.72,r,1.0,2.4,'#776a55');}if(b.levels===2)f.panel(f.len/2,h*.5,.23,f.len,.22,.40,b.trim);
   }else yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.2)),1.8,b.trim,'#7d6c55');
   f.panel(.12,h/2,.23,.055,h,.08,'#7e8572',true);yield;
  }
 });
 // APP's long side ramp and its top link form a connected, walkable surface.
 m.job('78 · scară și rampă APP',streetRect(638.8,-118,6,22),[],function*(){
  const base=ground(636.5,-124)+.035,top=base+.95;
  for(let k=0;k<8;k++)m.box(636.9+(k+.5)*2.45/8,base+(k+1)*.95/8-.12,-124,2.45/8+.004,.24,5.4,'#a5a495',false,true);
  m.box(640.15,top-.14,-124,1.6,.28,6.4,'#a5a495',false,true);m.box(638,top-.14,-122,3,.28,2.4,'#a5a495',false,true);
  const bottom=ground(637.2,-108)+.035;yield* m.surfaceStaged(streetRect(637.2,-114.4,1.4,12.8),(x,z)=>bottom+(top-bottom)*(-108-z)/12.8,'#a4a591',true);
  for(const x of[636.5,637.9]){m.beam(new T.Vector3(x,bottom+.9,-108),new T.Vector3(x,top+.9,-120.8),.025,'#879582');for(let z=-108;z>-121;z-=2.5)m.box(x,bottom+(top-bottom)*(-108-z)/12.8+.45,z,.035,.9,.035,'#879582',true);}yield;
 });
 m.job('119 · scară laterală și rampă',streetRect(618,-139,5,14),[],function*(){
  const base=ground(619,-144)+.035,top=base+.78;
  for(let k=0;k<6;k++)m.box(619.5-(k+.5)*2/6,base+(k+1)*.13-.12,-144,2/6+.004,.24,2.0,'#a7aca3',false,true);
  m.box(616.5,top-.12,-144,2,.24,2.4,'#a7aca3',false,true);m.box(618,top-.12,-143.3,1.2,.24,1.0,'#a7aca3',false,true);
  const bottom=ground(618,-134)+.035;yield* m.surfaceStaged(streetRect(618,-138.4,1.1,8.8),(x,z)=>bottom+(top-bottom)*(-134-z)/8.8,'#a7aca3',true);
  for(const x of[617.45,618.55])m.beam(new T.Vector3(x,bottom+.9,-134),new T.Vector3(x,top+.9,-142.8),.025,'#7a8979');yield;
 });
 m.job('128 · scară metalică exterioară',streetRect(613.7,-55.2,8,1.3),[],function*(){
  const base=ground(616.9,-55.2)+.035,top=base+3;
  for(let k=0;k<24;k++){m.box(616.8-(k+.5)*6.4/24,base+(k+1)*.125-.055,-55.2,6.4/24+.003,.11,1.05,'#8d9688',false,true);yield;}
  m.box(609.9,top-.06,-55.2,1,.12,1.05,'#8d9688',false,true);
  for(const z of[-55.73,-54.67]){m.beam(new T.Vector3(616.9,base+.9,z),new T.Vector3(610.4,top+.9,z),.027,'#6e7d6c');for(let k=0;k<7;k++)m.box(616.8-k,base+k*3/6.4+.45,z,.04,.9,.04,'#6e7d6c',true);}yield;
 });
 // Photographed restaurant terrace. The doorway is an open two metre gap.
 m.job('78 · terasă Georgian Grill',streetRect(638.5,-197,5,21),[],function*(){
  const y=ground(638,-197);m.box(638.5,y+3.1,-197,5,.20,21,'#435b43');
  for(let z=-207;z<=-187;z+=2.5){m.box(636.1,y+1.5,z,.10,3,.10,'#424d41',false,true);if(z<-200||z>-196)m.box(636.1,y+1.55,z+1.1,.05,2.6,2.1,'#596e64',false,false,0,1);yield;}
  const f=m.facade([636,-207],[636,-187],y);f.panel(10,3.45,.10,5,.65,.20,'#405242');f.label('GEORGIAN GRILL',10,3.45,.27,'#d1ceb3',.24);
 });
 for(const[x,z,h,r,conifer]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.14,.26,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#73745a',false,true);if(conifer){for(let k=0;k<4;k++){const g=new T.ConeGeometry(r*(1-k*.18),h*.40,8);g.translate(x,y+h*(.40+k*.16),z);m.put(g,'#657e5a');yield;}}else for(const[dx,dz,dy,rr]of[[0,0,.68,r],[r*.43,.3,.76,r*.73],[-r*.36,-.4,.80,r*.65],[0,0,.94,r*.50]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.12,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,h<8?'#789654':'#6c864b');yield;}});
 const poles:XY[]=[[617.8,-59],[618.4,-100],[617.5,-146],[616.5,-188],[616.6,-219],[631.6,-67],[632,-108],[631.5,-150],[631,-188],[632,-219],[646,-218],[607,-232]];
 for(const[x,z]of poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),sign=x<625?1:-1;m.box(x,y+3.7,z,.16,7.4,.16,'#a9ad9d',false,true);m.beam(new T.Vector3(x,y+6.9,z),new T.Vector3(x+sign*1.5,y+7.3,z),.04,'#869482');m.box(x+sign*1.5,y+7.3,z,.65,.1,.26,'#b9bcaa');yield;});
 for(let z=-225;z<-20;z+=24)m.job('cabluri troleibuz',[[620,z],[630,z+24]],[],function*(){for(const dx of[-1.7,1.7])for(let k=0;k<4;k++){const pt=(t:number)=>{const zz=z+t*24,x=624.9+(zz+67)*.0095+dx;return new T.Vector3(x,ground(x,zz)+6.1-.12*Math.sin(t*Math.PI),zz);};m.beam(pt(k/4),pt((k+1)/4),.014,'#4d5b4d');yield;}});
 for(const z of[-67,-108,-150,-188,-218])m.job('suspensie cabluri',[[617,z],[633,z]],[],function*(){m.beam(new T.Vector3(617,ground(617,z)+6.6,z),new T.Vector3(633,ground(633,z)+6.6,z),.014,'#5d6958');yield;});
 for(const[x,z]of[[617,-211.7],[631,-211.7],[612,-219],[636.2,-231],[650,-74]])m.job('indicator trecere',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.5,z,.045,3,.045,'#919e8d',true,true);m.box(x,y+2.7,z,.62,.70,.045,'#b6b44b');m.box(x,y+2.7,z+.03,.48,.56,.025,'#416b8b');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.19,y+2.51,z+.05,x+.19,y+2.51,z+.05,x,y+2.94,z+.05],3));g.computeVertexNormals();m.put(g,'#d0cfb9',true);yield;});
 for(const[x,z]of[[617,-211.7],[631,-231],[610,-230],[636,-215]])m.job('semafor Varlaam',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.9,z,.06,3.8,.06,'#869380',false,true);m.box(x,y+3.1,z,.29,.85,.22,'#46513f');for(let k=0;k<3;k++)m.box(x,y+3.37-k*.27,z+.12,.18,.18,.025,['#a65846','#a3a05c','#597f59'][k],true);yield;});
 for(const[x,z]of[[618.4,-127],[619,-152],[619,-163],[618.7,-190],[633,-120],[633,-164]])m.job('jardinieră',streetRect(x,z,.75,.75),[],function*(){const y=ground(x,z);m.box(x,y+.31,z,.7,.62,.7,'#aaa991',false,true);const g=new T.IcosahedronGeometry(.31,1);g.translate(x,y+.78,z);m.put(g,'#74854f');yield;});
 for(const[x,z]of[[618.2,-91],[632.1,-122],[632.1,-168],[619,-208]])m.job('coș stradal',streetRect(x,z,.5,.5),[],function*(){const y=ground(x,z);m.box(x,y+.65,z,.38,.55,.38,'#7b8570',true,true);m.box(x,y+.32,z,.055,.64,.055,'#7a8472',true);yield;});
 for(const[x,z]of[[626,-43],[625,-98],[624,-174],[622,-221],[641,-74]])m.job('capac utilități',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.31,.31,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#6f796d');yield;});
 // Low red arched barriers along the Varlaam planting strip stop at the crossing.
 for(const[aa,bb]of[[[590,-230.5],[610,-230.5]],[[637,-230.5],[667,-230.5]]] as [XY,XY][])m.job('Varlaam · gard jos',[aa,bb],[],function*(){const len=Math.hypot(bb[0]-aa[0],bb[1]-aa[1]),f=m.facade(aa,bb,ground(...aa));for(let u=0;u<len;u+=1.5){f.panel(u,.40,0,.035,.8,.035,'#906751',true);for(let k=0;k<6;k++){const a0=k*Math.PI/6,a1=(k+1)*Math.PI/6,p=f.at(u+.75+.65*Math.cos(a0)),q=f.at(u+.75+.65*Math.cos(a1));m.beam(new T.Vector3(p[0],f.y+.20+.55*Math.sin(a0),p[1]),new T.Vector3(q[0],f.y+.20+.55*Math.sin(a1),q[1]),.018,'#906751');}yield;}});
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:624,z:-126,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4400000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=-234;z<-15;z+=6)for(const x of[616,635])treeOverrides.push({x,z,height:0,radius:4,texture:0,get ready(){return m.readyNear(x,z,9)&&l.readyNear(x,z,18);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
