import * as T from 'three';
import realm from '../data/alecsandri-va12.json';
import catalog from '../data/alecsandri-va12-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** VA12: whole official plans, original opaque meshes, dated visible elevations.
 * Heights and screened courts remain estimates. No remote models or photo tiles. */
export function createAlecsandriVa12(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[];roofMansard?:{bands:number[][][][];cap:number[][][][]}})[];
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,roofRise:b.roofMansard?0:b.roofRise,facades:false})),'Alecsandri VA12 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA12 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA12 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
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
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<1.3)continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),nx=q[0]-p[0],nz=q[1]-p[1],front=nx*b.front[0]>.85,corner=['gogaWest','gogaEast','police'].includes(b.style)&&nz<-.8;
   a.cornice(f,h,b.trim);
   if(b.style==='church'){
    f.panel(f.len/2,.37,.10,f.len,.74,.20,'#8b8770');for(const yy of[h-.7,h-.38])f.panel(f.len/2,yy,.2,f.len,.16,.4,'#d0cdb8');
    if(nz>.65&&nx<-.4&&f.len>9&&f.len<12){door(f,f.len/2,0,1.7,2.9);a.pediment(f,f.len/2,3.25,2.8,.72,y,'#d0cdb8');f.panel(f.len/2,4.7,.3,.7,.85,.12,'#86785b');f.label('SF HARALAMBIE',f.len/2,3.9,.14,'#eee4be',.46);}
    else for(let u=1.8;u<f.len-1;u+=3.9){a.arch(f,u,1.5,1.3,2.9,y,'#6d7c70','#d0cdb8');f.panel(u,2.9,.46,.055,2.1,.05,'#c4c4ae',true);yield;}
   }else if(b.style==='shops137'&&front&&f.len>10){
    f.panel(f.len/2,1.35,.12,f.len,2.7,.24,'#9e9c87');for(const yy of[2.75,5.50,8.35])f.panel(f.len/2,yy,.22,f.len,.18,.44,b.trim);
    const n=5,bw=f.len/n;
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,1.3,bw*.72,1.85,'#aeb5a5','#626658');f.window(u,4.05,1.7,2.25,b.trim,'#6e7060');f.window(u,6.9,1.65,2.0,b.trim,'#6e7060');balcony(f,u,5.85,bw*.88);yield;}
    for(const[z,label]of[[-519.1,'MILESTII MICI'],[-533.2,'SALTEA']]as const){const u=atZ(f,z),r=stairs(f,u,1.4,1.30);door(f,u,r,.95,2.4);f.panel(u,r+2.7,.35,2.0,.55,.22,'#75584d');f.label(label,u,r+2.62,.13,'#d2c8a6',.49);}
    f.panel(f.len*.5,2.65,.34,5.5,.65,.22,'#8e6650');f.label('DONER KEBAB',f.len*.5,2.52,.27,'#d8cbb2',.50);
   }else if(b.style==='tyres'){
    // Jambs/header only on the working double portal. Never paint a solid
    // facade panel over a clearance that the shell and gate actually provide.
    if(front){for(const z of[-556.3,-549.8]){const u=atZ(f,z);for(const du of[-1.8,1.8]){f.panel(u+du,1.5,.18,.18,3,.35,b.wall);f.panel(u+du,.35,.38,.22,.7,.12,'#4e7d8e');}f.panel(u,3.03,.25,3.6,.36,.4,b.wall);}
     f.panel(f.len/2,3.8,.25,f.len,.85,.3,'#9c5a4e');f.label('VULCANIZARE',f.len/2,3.72,.42,'#c9c2ac',.44);f.panel(f.len/2,3.32,.28,f.len,.26,.34,'#52758e');f.label('ANVELOPE',f.len/2,3.25,.16,'#d5cbb0',.47);
    }else if(Math.abs(nx)<.8){f.panel(f.len/2,.38,.1,f.len,.76,.2,'#587d86');}
   }else if(b.style==='annex'){
    // Screened annex elevations are deliberately simple estimates.
    if(f.len>5&&front){f.window(f.len*.35,1.75,.85,1.1,b.trim,'#78806a');door(f,f.len*.72,0,.8,2.0);}
   }else if(front||corner){
    f.panel(f.len/2,.36,.1,f.len,.72,.2,b.style==='gogaEast'?'#838675':'#8d927c');
    const n=Math.max(1,Math.round(f.len/3.4));for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;for(let r=0;r<b.levels;r++)f.window(u,1.8+r*2.9,Math.min(1.45,f.len/n*.58),1.8,b.trim,'#737862');yield;}
    if(b.style==='house92'&&f.len>12){balcony(f,f.len*.5,3.1,3.5);door(f,f.len*.5,3.15,1.3,2.25);}
   }else yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),1.8,b.trim,'#838770');yield;
  }
  if(b.roofMansard){
   for(const [polys,cap]of[[b.roofMansard.bands,false],[b.roofMansard.cap,true]]as const)for(const rings of polys){
    const s=new T.Shape();rings[0].forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));for(const r of rings.slice(1)){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));s.holes.push(hole);}
    const g=new T.ShapeGeometry(s);g.rotateX(-Math.PI/2);const v=g.attributes.position;for(let i=0;i<v.count;i++){const p:XY=[v.getX(i),v.getZ(i)],d=Math.min(...b.p.slice(1).map((q,k)=>pointSegmentDistance(p,b.p[k]as XY,q as XY)));v.setY(i,y+h+.15+b.roofRise*(cap?1:Math.min(1,d/1.5)));}g.computeVertexNormals();m.put(g,b.roof,false,true);yield;
   }
  }
 });
 function cross(x:number,z:number,y:number,h:number,color='#bfb58b'){m.box(x,y+h/2,z,.12,h,.12,color,true);m.box(x,y+h*.72,z,h*.57,.12,.12,color,true);m.box(x,y+h*.85,z,h*.30,.09,.10,color,true);}
 // Round drum, shallow red dome and the separate square belfry from the2024
 // courtyard photo. Their elevations are estimated, not cadastral measurements.
 m.job('Sfântul Haralambie · cupolă și clopotniță',streetRect(563,-549,30,34),[],function*(){
  const church=buildings.find(b=>b.style==='church')!,y=ground(...church.anchor as XY)+.12,x=567.4,z=-557,r=4.6,base=y+7.1,dh=4.0;
  let g:T.BufferGeometry=new T.CylinderGeometry(r,r,dh,32);g.translate(x,base+dh/2,z);m.put(g,'#c5aa63',false,true);
  for(const yy of[base+.12,base+dh-.13]){g=new T.CylinderGeometry(r+.18,r+.18,.20,32);g.translate(x,yy,z);m.put(g,'#d0cdb8');}
  for(let k=0;k<10;k++){const t=k*Math.PI/5,px=x+Math.cos(t)*r,pz=z+Math.sin(t)*r,dx=-Math.sin(t),dz=Math.cos(t),f=m.facade([px-dx*.8,pz-dz*.8],[px+dx*.8,pz+dz*.8],base);a.arch(f,.8,.70,1.15,2.65,base,'#78857a','#d0cdb8');f.panel(.8,1.7,.46,.055,1.7,.05,'#c6c7b3',true);yield;}
  g=new T.SphereGeometry(r+.07,32,12,0,Math.PI*2,0,Math.PI/2);g.scale(1,.61,1);g.translate(x,base+dh,z);m.put(g,'#966454');
  a.column(x,z,base+dh+2.75,.68,.40,'#b4a773');g=new T.SphereGeometry(.52,12,6,0,Math.PI*2,0,Math.PI/2);g.translate(x,base+dh+3.43,z);m.put(g,'#b9ab73');cross(x,z,base+dh+3.85,1.4);
  const bx=555.8,bz=-542.0,by=y+6.8,bh=4.6;
  m.box(bx,by+.25,bz,4.7,.5,4.7,'#c5aa63',false,true);
  for(const sx of[-1,1])for(const sz of[-1,1])m.box(bx+sx*1.95,by+bh/2,bz+sz*1.95,.6,bh,.6,'#c5aa63',false,true);
  for(const f of a.faces(streetRect(bx,bz,4.5,4.5).concat([[bx-2.25,bz-2.25]])as XY[],by)){a.arch(f,f.len/2,1.0,2.1,3.1,by,'#454d3c','#d0cdb8');f.panel(f.len/2,bh-.12,.13,f.len,.25,.26,'#d0cdb8');}
  a.roof(bx,bz,5.0,5.0,by+bh,.9,'#966454');cross(bx,bz,by+bh+.9,1.25);yield;
 });
 function fence(name:string,p0:XY,p1:XY,color:string,h:number,wood=false){m.job(name,[p0,p1],[],function*(){const f=m.facade(p0,p1,ground((p0[0]+p1[0])/2,(p0[1]+p1[1])/2)),n=Math.ceil(f.len/(wood?.18:2.0));
  if(!wood){const p=f.at(f.len/2);m.box(p[0],f.y+h/2,p[1],f.len,h,.10,color,false,true,angle(f));for(let u=.1;u<f.len;u+=.25)f.panel(u,h/2,.065,.025,h,.025,'#8a9582',true);}
  else for(let k=0;k<n;k++){const p=f.at((k+.5)*f.len/n);m.box(p[0],f.y+h*.55,p[1],.13,h*.9,.08,color,true,true,angle(f));if(k%16===0)yield;}
  for(let u=0;u<=f.len+.01;u+=2.8){const p=f.at(Math.min(u,f.len));m.box(p[0],ground(...p)+h/2,p[1],wood?.3:.11,h+.1,wood?.3:.11,wood?'#aea790':'#a9ac99',false,true);}yield;
 });}
 fence('92 · împrejmuire de tablă',[635,-540],[635,-520.55],'#b2b9aa',1.9);fence('92 · continuare împrejmuire',[635,-516.25],[635,-515.2],'#b2b9aa',1.9);
 fence('Goga19 · gard vișiniu',[602.3,-581],[602.3,-561.25],'#8c7070',1.8);fence('Goga19 · întoarcere gard',[602.3,-558.65],[602.3,-555],'#8c7070',1.8);
 fence('biserică · împrejmuire fotografiată',[544,-549],[544,-570],'#85674d',1.6,true);fence('biserică · acces liber',[544,-572],[559.6,-572],'#85674d',1.6,true);
 m.job('biserică · monument din curte',streetRect(548,-559,4,4),[],function*(){const x=548,z=-559,y=ground(x,z);m.box(x,y+.14,z,3.4,.28,2.9,'#626d5b',false,true);m.box(x,y+.75,z,2.7,1.25,2.3,'#bbbda7',false,true);m.box(x,y+1.45,z,2.95,.2,2.55,'#c5c7b2');cross(x,z,y+1.55,4.3,'#bbc1ae');for(const dx of[-.92,.92]){a.column(x+dx,z,y+1.55,1.8,.18,'#b7bda9');const g=new T.SphereGeometry(.19,8,6);g.translate(x+dx,y+3.48,z);m.put(g,'#bbc1ae');}yield;});
 for(const[x,z,h,r]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.15,.28,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#75765b',false,true);for(const[dx,dz,dy,rr]of[[0,0,.67,r],[r*.4,.25,.77,r*.70],[-r*.36,-.3,.81,r*.63],[0,0,.94,r*.46]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.08,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#6d8850');yield;}});
 const poles:XY[]=[[629.82,-536.99],[604.64,-536.27],[629.38,-579.56],[604.79,-581.18],[652.58,-580.02],[568.21,-585.76]];
 for(const[x,z]of poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),sign=x<619?1:-1;m.box(x,y+3.75,z,.17,7.5,.17,'#a4ad99',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x+sign*1.4,y+7.4,z),.04,'#899984');m.box(x+sign*1.4,y+7.4,z,.65,.1,.26,'#b7beaa');yield;});
 for(let z=-614;z< -515;z+=12)m.job('fire troleibuz',[[616.7,z],[620.1,z+12]],[],function*(){for(const dx of[-1.7,1.7])m.beam(new T.Vector3(618.4+dx,ground(618.4,z)+6.1,z),new T.Vector3(618.4+dx,ground(618.4,z+12)+6.1,z+12),.014,'#53634f');yield;});
 for(const[x,z]of[[631.8,-581.7],[603.2,-583.3],[636,-591]])m.job('indicator trecere',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.5,z,.045,3,.045,'#909f8b',true,true);m.box(x,y+2.65,z,.62,.70,.04,'#b7b64d');m.box(x,y+2.65,z+.035,.48,.56,.025,'#426e8c');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.19,y+2.46,z+.055,x+.19,y+2.46,z+.055,x,y+2.88,z+.055],3));g.computeVertexNormals();m.put(g,'#ccd1bd',true);yield;});
 for(const[x,z]of[[622,-528],[615,-551],[622,-575],[654,-583],[562,-574]])m.job('capac utilități',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.31,.31,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#788271');yield;});
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:618.4,z:-556,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4800000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=-614;z<-515;z+=6)for(const x of[604,633])treeOverrides.push({x,z,height:0,radius:4,texture:0,get ready(){return m.readyNear(x,z,15)&&l.readyNear(x,z,20);}});
 for(const[x,z,h,r]of realm.trees)treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,15)&&l.readyNear(x,z,20);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
