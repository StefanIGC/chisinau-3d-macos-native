import * as T from 'three';
import realm from '../data/alecsandri-va10.json';
import catalog from '../data/alecsandri-va10-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** Columna–Habad Liubavici. Whole official plans, observed street elevations,
 * original batched meshes. Heights and concealed courtyard details are estimates. */
export function createAlecsandriVa10(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[]})[],bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'Alecsandri VA10 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA10 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA10 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const angle=(f:Face)=>Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
 const atZ=(f:Face,z:number)=>(z-f.at(0)[1])/(f.at(f.len)[1]-f.at(0)[1])*f.len;
 function door(f:Face,u:number,bottom:number,w=1.15,h=2.65,color='#5b5148'){
  f.panel(u,bottom+h/2,.34,w,h,.05,color,false,1);
  for(const s of[-1,1])f.panel(u+s*(w/2+.07),bottom+h/2,.40,.13,h+.18,.20,'#c3c6ba');
  for(const yy of[bottom,bottom+h])f.panel(u,yy,.41,w+.25,.13,.22,'#c3c6ba');
  for(const yy of[bottom+.55,bottom+1.3])f.panel(u,yy,.39,w*.70,.36,.05,'#726153',true);
  f.panel(u+.30,bottom+1.1,.46,.035,.27,.06,'#ada486',true);
 }
 function stairs(f:Face,u:number,w:number,rise:number){const n=Math.ceil(rise/.13),run=n*.29,foot=f.at(u,run+.35),top=ground(...foot)+.035+rise;
  for(let k=0;k<n;k++){const p=f.at(u,.18+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#a4a797',false,true,angle(f));}return top-f.y;
 }
 function canopy(f:Face,u:number,yy:number,w:number,color='#7e5945'){
  // A small raised, curved metal hood, observed at88. No photo texture.
  const points:XY[]=[];for(let k=0;k<=8;k++){const q=f.at(u-w/2+k*w/8,1.05);points.push(q);}
  const out:number[]=[];for(let k=0;k<8;k++){
   const aa=f.at(u-w/2+k*w/8,.13),bb=f.at(u-w/2+(k+1)*w/8,.13),cc=points[k+1],dd=points[k];
   const ya=f.y+yy+.38*Math.sin(k/8*Math.PI),yb=f.y+yy+.38*Math.sin((k+1)/8*Math.PI);
   out.push(aa[0],ya,aa[1],dd[0],ya-.2,dd[1],bb[0],yb,bb[1],bb[0],yb,bb[1],dd[0],ya-.2,dd[1],cc[0],yb-.2,cc[1]);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,color);
  for(const s of[-1,1]){const p=f.at(u+s*(w/2-.12),.14),q=f.at(u+s*(w/2-.12),1.0);m.beam(new T.Vector3(p[0],f.y+yy-.75,p[1]),new T.Vector3(q[0],f.y+yy-.2,q[1]),.025,'#555e50');}
 }
 function ac(f:Face,u:number,yy:number){f.panel(u,yy,.4,.7,.5,.40,'#b7beb1');for(let k=0;k<5;k++)f.panel(u-.25+k*.12,yy,.62,.018,.32,.025,'#7a8677',true);}
 function* historic(f:Face,b:PhotoBuilding,front:boolean,side:boolean){
  const n=Math.max(1,Math.round(f.len/3.2)),bw=f.len/n;
  for(let yy=1;yy<3.8;yy+=.47){f.panel(f.len/2,yy,.065,f.len,.033,.04,'#939c90',true);yield;}
  for(let k=0;k<n;k++){const u=(k+.5)*bw,z=f.at(u)[1],entry=front&&(Math.abs(z+375)<1.5||Math.abs(z+390.5)<1.5);
   if(!entry){f.window(u,2.45,1.25,2.2,b.trim,'#a4b4a8');f.panel(u,3.76,.18,1.7,.17,.36,b.trim);a.pediment(f,u,3.87,1.65,.18,f.y,b.trim);f.panel(u,.66,.11,1.45,.38,.12,'#a7b0a1');
    if(front&&z< -392.5){f.panel(u,3.5,.82,1.75,.14,1.6,'#774953');f.panel(u,3.38,1.57,1.75,.26,.06,'#774953');}
   }
   for(const du of[-bw/2,bw/2])f.panel(u+du,2.4,.12,.15,3.85,.24,b.trim);yield;
  }
  f.panel(f.len/2,.28,.08,f.len,.56,.16,'#92998a');
  if(front&&f.len>20){f.label('NEFIS',atZ(f,-396.5),4.05,.33,'#965d6d',.40);for(const [z,color,hood]of[[-375,'#665447',false],[-390.5,'#4f554b',true]]as const){const u=atZ(f,z),r=stairs(f,u,2.0,.52);door(f,u,r,1.25,2.7,color);canopy(f,u,r+2.85,2.1,hood?'#936f50':'#72564b');if(hood){f.panel(u,r+2.2,.70,1.3,.37,.06,'#ac965c');f.label('88',u,r+2.12,.23,'#574f3e',.77);}}}
  if(side&&f.len>10){const u=f.len*.65,r=stairs(f,u,1.7,.39);door(f,u,r,1.1,2.55);f.panel(u,3.5,.65,2,.12,1.3,'#705e4c');}
 }
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<1.3)continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]>.85,side=b.style==='historic88'&&q[1]<p[1]-.8||['pharmacy','sideHouse'].includes(b.style)&&q[1]>p[1]+.7;
   a.cornice(f,h,b.trim);f.panel(f.len/2,.3,.065,f.len,.6,.13,'#92988a');
   if(!front&&!side){if(b.style!=='annex')yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.1)),1.9,b.trim,'#7c7d6b');yield;continue;}
   const n=Math.max(1,Math.round(f.len/3.4)),bw=f.len/n;
   if(b.style==='historic88')yield* historic(f,b,front,side);
   else if(b.style==='commercial133'){
    if(front){
     f.panel(f.len/2,1.4,.09,f.len,2.8,.18,'#999e90');
     for(let k=0;k<5;k++){
      const u=(k+.5)*f.len/5;f.window(u,1.6,3.5,2.5,'#c6cbbf','#93a89a');
      for(const yy of[4.85,7.65]){f.window(u,yy,3.05,1.90,b.trim,'#b2bbae');f.panel(u,yy+.39,.37,3.02,1.05,.08,'#bdc4b8');for(let hh=yy-.05;hh<yy+.9;hh+=.17)f.panel(u,hh,.42,3.0,.014,.025,'#a4afa1',true);}
      f.window(u,9.4+(1-Math.abs(k-2)/2)*1.25,1.35,.9,b.trim,'#a1afa3');yield;
     }
     for(const u of[f.len*.09,f.len*.65]){const r=stairs(f,u,1.6,.39);door(f,u,r,1.05,2.4,'#a3afa1');}
     f.panel(f.len/2,3.0,.17,f.len,.17,.34,b.trim);
    }else yield* a.windows(f,3,h,Math.max(1,n),1.8,b.trim,'#a7b3a6');
   }else if(b.style==='pharmacy'||b.style==='sideHouse'){
    for(let k=0;k<n;k++){const u=(k+.5)*bw;for(let row=0;row<b.levels;row++)f.window(u,1.9+row*3.15,Math.min(1.3,bw-.45),1.75,b.trim,'#b8c2b3');if(b.levels>1&&k%3===0)ac(f,u+.72,5.85);yield;}
    if(b.style==='pharmacy'){
     f.panel(f.len/2,3.15,.2,f.len,.86,.4,'#c3c6b9');f.label('FARMACIE',f.len/2,3.03,Math.min(.42,f.len/22),'#a35d84',.45);
     if(front&&f.len>9){const u=f.len*.17,r=stairs(f,u,1.5,.39);door(f,u,r,1.1,2.2,'#a75780');}
    }
   }else if(b.style==='stoneCourt'){
    for(let yy=.6;yy<h;yy+=.45)for(let u=.35;u<f.len;u+=.7)f.panel(u,yy,.073,.54,.31,.025,'#a69e7c',true);
    yield* a.windows(f,2,h,n,1.8,b.trim,'#b9c4b6');
   }else yield* a.windows(f,b.levels,h,n,1.8,b.trim,'#969f8f');yield;
  }
  if(b.style==='commercial133'){
   // Gabled attic follows the complete cadastral plan. Pitch is estimated.
   const zs=b.p.map(p=>p[1]),z0=Math.min(...zs),z1=Math.max(...zs),center=(z0+z1)/2,half=(z1-z0)/2;
   const roofY=(z:number)=>y+h+.16+3.05*Math.max(0,1-Math.abs(z-center)/half);
   const shape=new T.Shape();b.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
   for(const ring of b.holes){const hole=new T.Path();ring.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));shape.holes.push(hole);}
   const source=new T.ShapeGeometry(shape);source.rotateX(-Math.PI/2);const g=source.toNonIndexed(),v=g.attributes.position;
   // Cut at the ridge to avoid a flat triangle interpolating across both slopes.
   const out:number[]=[];
   for(let i=0;i<v.count;i+=3){const tri=[0,1,2].map(k=>[v.getX(i+k),v.getZ(i+k)]);for(const sign of[-1,1]){
    const clipped:number[][]=[];for(let k=0;k<3;k++){const aa=tri[k],bb=tri[(k+1)%3],inside=sign*(aa[1]-center)>=0,next=sign*(bb[1]-center)>=0;if(inside)clipped.push(aa);if(inside!==next){const t=(center-aa[1])/(bb[1]-aa[1]);clipped.push([aa[0]+t*(bb[0]-aa[0]),center]);}}
    for(let k=1;k<clipped.length-1;k++)for(const p of[clipped[0],clipped[k],clipped[k+1]])out.push(p[0],roofY(p[1]),p[1]);
   }yield;}
   source.dispose();g.dispose();const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(out,3));roof.computeVertexNormals();m.put(roof,b.roof,false,true);
   for(const f of a.faces(b.p as XY[],y)){
    const aa=f.at(0),bb=f.at(f.len),t=(center-aa[1])/(bb[1]-aa[1]),ps=[[aa[0],y+h,aa[1]],[aa[0],roofY(aa[1]),aa[1]]];
    if(t>0&&t<1){const p=f.at(t*f.len);ps.push([p[0],roofY(center),p[1]]);}ps.push([bb[0],roofY(bb[1]),bb[1]],[bb[0],y+h,bb[1]]);
    const data:number[]=[];for(let k=1;k<ps.length-1;k++)data.push(...ps[0],...ps[k],...ps[k+1]);const cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute(data,3));cap.computeVertexNormals();m.put(cap,b.wall,false,true);yield;
   }
  }
 });
 // Visible west enclosure, with gaps retained for the two operable gates.
 for(const[z0,z1]of[[-375.6,-372.7],[-393.5,-380]])m.job('131 · zid gri',[[614.5,z0],[614.5,z1]],[],function*(){const y=ground(614.5,(z0+z1)/2),len=z1-z0;m.box(614.5,y+.95,(z0+z1)/2,.20,1.90,len,'#a6b1a4',false,true);for(let z=z0+.6;z<z1;z+=2.6){m.box(614.5,y+1.02,z,.32,2.04,.27,'#bcc6b6');yield;}const f=m.facade([614.5,z0],[614.5,z1],y);for(let yy=.24;yy<1.85;yy+=.25)f.panel(f.len/2,yy,.12,f.len,.025,.04,'#919e90',true);});
 for(const[x,z,h,r,red]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.13,.24,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#77755c',false,true);for(const[dx,dz,dy,rr]of[[0,0,.67,r],[r*.4,.25,.77,r*.70],[-r*.36,-.3,.81,r*.63],[0,0,.94,r*.46]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.12,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,red?'#875d50':'#6b8852');yield;}});
 for(const[x,z]of[[617.8,-377],[617.7,-402],[630,-374],[630.7,-407],[649,-401]])m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),sign=x<625?1:-1;m.box(x,y+3.7,z,.16,7.4,.16,'#a4ae9d',false,true);m.beam(new T.Vector3(x,y+6.9,z),new T.Vector3(x+sign*1.5,y+7.3,z),.04,'#7e927d');m.box(x+sign*1.5,y+7.3,z,.65,.1,.26,'#b6bead');yield;});
 for(let z=-433;z<-363;z+=14)m.job('fire troleibuz',[[620,z],[630,z+14]],[],function*(){for(const dx of[-1.7,1.7]){m.beam(new T.Vector3(623.4+dx,ground(623.4,z)+6.1,z),new T.Vector3(623.4+dx,ground(623.4,z+14)+6.1,z+14),.014,'#50634f');yield;}});
 for(const z of[-377,-402])m.job('suspensie fire',[[617.7,z],[632,z]],[],function*(){m.beam(new T.Vector3(617.7,ground(617.7,z)+6.7,z),new T.Vector3(632,ground(632,z)+6.7,z),.014,'#55664f');yield;});
 for(const[x,z]of[[623,-382],[626,-407],[645,-405]])m.job('capac utilități',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.30,.30,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#748071');yield;});
 m.job('plăcuță Habad Liubavici',streetRect(634,-414,1,1),[],function*(){const f=m.facade([634.9,-415.4],[635,-413],ground(635,-414)+.12);f.panel(1.2,2.6,.20,1.8,.40,.05,'#4f7078');f.label('HABAD',1.2,2.52,.19,'#c7d0bc',.25);yield;});
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:624,z:-388,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4600000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=-432;z<-368;z+=6)for(const x of[615.5,633])treeOverrides.push({x,z,height:0,radius:4.2,texture:0,get ready(){return m.readyNear(x,z,15)&&l.readyNear(x,z,20);}});
 for(const[x,z,h,r]of realm.trees)treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,15)&&l.readyNear(x,z,20);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
