import * as T from 'three';
import realm from '../data/alecsandri-va11.json';
import catalog from '../data/alecsandri-va11-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** VA11: original local meshes from whole metric official plans and dated photos.
 * No per-object model/photo/WFS fetches. Screened surfaces and heights estimated. */
export function createAlecsandriVa11(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[];roofMansard?:{bands:number[][][][];cap:number[][][][]}})[],bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,roofRise:b.roofMansard?0:b.roofRise,facades:false})),'Alecsandri VA11 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA11 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA11 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const angle=(f:Face)=>Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
 const atZ=(f:Face,z:number)=>(z-f.at(0)[1])/(f.at(f.len)[1]-f.at(0)[1])*f.len;
 function door(f:Face,u:number,bottom:number,w=1.15,h=2.6,color='#705b49'){
  f.panel(u,bottom+h/2,.34,w,h,.05,color,false,1);
  for(const s of[-1,1])f.panel(u+s*(w/2+.07),bottom+h/2,.40,.13,h+.18,.20,'#c3c4b5');
  for(const yy of[bottom,bottom+h])f.panel(u,yy,.41,w+.25,.13,.22,'#c3c4b5');
  f.panel(u+.26,bottom+1.1,.46,.035,.27,.06,'#ada486',true);
 }
 function stairs(f:Face,u:number,w:number,rise:number,landing=0){const n=Math.ceil(rise/.13),run=n*.29,foot=f.at(u,run+landing+.35),top=ground(...foot)+.035+rise;
  if(landing){const p=f.at(u,landing/2+.16);m.box(p[0],top-.12,p[1],w,.24,landing+.04,'#a7a38d',false,true,angle(f));}
  for(let k=0;k<n;k++){const p=f.at(u,landing+.18+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#a7a38d',false,true,angle(f));}return top-f.y;
 }
 function rail(f:Face,u:number,yy:number,w:number,v:number,color='#8d9b89'){for(const dh of[.15,.95])f.panel(u,yy+dh,v,w,.035,.04,color,true);for(let du=-w/2;du<=w/2;du+=.32)f.panel(u+du,yy+.54,v,.025,.90,.03,color,true);}
 function ac(f:Face,u:number,yy:number){f.panel(u,yy,.4,.68,.45,.38,'#b9bdb0');for(let k=0;k<5;k++)f.panel(u-.24+k*.12,yy,.61,.018,.30,.025,'#7c8777',true);}
 function circle(f:Face,u:number,yy:number,r:number){const p=f.at(u,.40),g=new T.CircleGeometry(r,18),rim=new T.TorusGeometry(r+.065,.065,4,18);for(const [geo,col]of[[g,'#61787a'],[rim,'#c3c6b6']]as const){geo.rotateY(angle(f));geo.translate(p[0],f.y+yy,p[1]);m.put(geo,col,true);}}
 function crown(f:Face,u:number,y:number,w:number){
  const ps=[[-w/2,0],[-w/2,.8],[-w*.30,1.0],[-w*.23,1.8],[0,2.1],[w*.23,1.8],[w*.30,1.0],[w/2,.8],[w/2,0]],out:number[]=[];
  for(let k=1;k<ps.length-1;k++)for(const [du,dh]of[ps[0],ps[k+1],ps[k]]){const p=f.at(u+du,.18);out.push(p[0],f.y+y+dh,p[1]);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,'#b4b6a8');
  for(let k=1;k<ps.length;k++){const p=f.at(u+ps[k-1][0],.3),q=f.at(u+ps[k][0],.3);m.beam(new T.Vector3(p[0],f.y+y+ps[k-1][1],p[1]),new T.Vector3(q[0],f.y+y+ps[k][1],q[1]),.065,'#c6c7b7');}
  circle(f,u,y+1.10,.40);
 }
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<1.3)continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]>.85,side=(['ornate46','historic44','inspection48','plov29'].includes(b.style))&&((q[1]-p[1])*(b.anchor[1]<-477?1:-1)>.8);
   const opening=(u:number)=>b.style==='dentpark'&&f.at(u)[1]<-446.05;
   if(b.style!=='setback135')a.cornice(f,h,b.trim);
   if(!front&&!side){if(!['annex','setback135'].includes(b.style))yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.8)),1.8,b.trim,'#8d8f79');yield;continue;}
   const n=Math.max(1,Math.round(f.len/(b.style==='dentpark'?2.05:3.3))),bw=f.len/n;
   if(b.style==='dentpark'&&front){
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw;f.window(u,5.9,1.02,2.05,b.trim,'#7a6851');
     for(const du of[-.63,.63])f.panel(u+du,5.9,.15,.13,2.45,.3,'#c2b9a0');
     f.panel(u,4.57,.19,1.27,.19,.36,'#c2b9a0');f.panel(u,7.12,.19,1.27,.17,.36,'#c2b9a0');
     if(!opening(u)&&Math.abs(f.at(u)[1]+434.5)>1.5&&Math.abs(f.at(u)[1]+442.5)>.75){f.window(u,2.40,1.0,2.1,b.trim,'#7a6851');f.panel(u,.82,.15,1.3,.34,.12,'#b5ad92');}
     if(k%4===1)ac(f,u+.65,6.8);yield;
    }
    for(const yy of[3.65,7.6])f.panel(f.len/2,yy,.15,f.len,.19,.30,b.trim);
    f.panel(f.len/2,3.82,.19,f.len-.8,.56,.25,'#c1c5b4');f.label('DENTPARK',f.len*.50,3.72,.31,'#668c48',.36);
    f.panel(f.len/2,7.55,.24,f.len-.7,.45,.20,'#7c9b49');f.label('CLINICA STOMATOLOGICA',f.len/2,7.45,.20,'#cbd1b9',.39);
    for(const z of[-434.5,-442.5]){
     const u=atZ(f,z),w=z===-434.5?3.6:2.0,r=stairs(f,u,w,.78,.95);
     if(z===-434.5)for(const du of[-.69,.69])a.arch(f,u+du,r,1.1,2.70,y,'#7b6655',b.trim);else door(f,u,r,1.0,2.6,'#6e6651');
     f.panel(u,r+2.82,.95,w+.1,.13,1.9,'#697e70');
     for(const du of[-w/2+.05,w/2-.05]){const top=f.at(u+du,.2),edge=f.at(u+du,3.04);m.beam(new T.Vector3(top[0],y+r+.95,top[1]),new T.Vector3(edge[0],ground(...edge)+.985,edge[1]),.025,'#8e9c8a');for(let v=.3;v<3;v+=.65){const p=f.at(u+du,v),yy=v<1.1?y+r:ground(...p)+.035+.78*(3.04-v)/1.94;m.box(p[0],yy+.48,p[1],.025,.95,.025,'#8e9c8a',true);}}
    }
    // Portal border only: no opaque painted doorway across the working passage.
    const u=atZ(f,-447.55);for(const du of[-1.48,1.48])f.panel(u+du,1.7,.25,.21,3.4,.3,b.trim);
    const p=f.at(u,.37),torus=new T.TorusGeometry(1.45,.10,4,18,Math.PI);torus.rotateY(angle(f));torus.translate(p[0],y+2.4,p[1]);m.put(torus,b.trim);
    // Opaque roof lights sit above the actual roof slope, with a small separation.
    const run=1.5;
    const ry=(p:XY)=>y+h+.20+b.roofRise*Math.min(1,Math.min(...b.p.slice(1).map((q,i)=>pointSegmentDistance(p,b.p[i]as XY,q as XY)))/run);
    for(let k=0;k<n;k++){const u=(k+.5)*bw,out:number[]=[];for(const [du,v]of[[-.40,-.35],[.40,-.35],[.40,-1.25],[-.40,-.35],[.40,-1.25],[-.40,-1.25]]){const p=f.at(u+du,v);out.push(p[0],ry(p),p[1]);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,'#7d9e9f');yield;}
   }else if(b.style==='ornate46'&&front&&f.len>12){
    // The Alecsandri side is mostly a plain party wall, unlike the ornate
    // Alexandru cel Bun elevation. Do not stamp historic windows on this wall.
    f.panel(f.len/2,.44,.08,f.len,.88,.16,'#878e7b');f.label('PLOV CENTRU',f.len*.52,1.45,Math.min(.60,f.len/17),'#c7cbbb',.23);
    const u=f.at(0)[1]>f.at(f.len)[1]?2.0:f.len-2.0;for(const yy of[2.0,5.65])f.window(u,yy,1.25,2.2,b.trim,'#566354');yield;
   }else if(b.style==='ornate46'){
    for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,2.0,1.40,2.5,b.trim,'#424d47');f.window(u,5.65,1.35,2.3,b.trim,'#525c50');
     f.panel(u,4.15,.17,1.6,.35,.25,'#c4c4b3');a.pediment(f,u,7.0,1.9,.33,y,b.trim);
     for(const du of[-bw/2,bw/2]){f.panel(u+du,4.1,.16,.26,7.65,.32,b.trim);for(let yy=.4;yy<7.6;yy+=.48)f.panel(u+du,yy,.33,.35,.10,.06,'#b3b7a7',true);}
     if(k%2===0){f.panel(u,8.85,.13,1.95,1.7,.26,b.wall);a.arch(f,u,8.15,1.5,1.6,y,'#7b8c85',b.trim);}yield;
    }
    f.panel(f.len/2,3.65,.38,f.len,.23,.76,b.trim);
    if(f.len>8){f.panel(f.len/2,8.85,.13,5.2,1.8,.26,b.wall);crown(f,f.len/2,9.4,5.2);f.window(f.len/2,8.8,1.05,1.25,b.trim,'#566354');const u=f.len*.32,r=stairs(f,u,1.7,.52);door(f,u,r,1.15,2.5,'#524d45');f.panel(u,3.20,.45,2.2,.60,.25,'#5f6076');f.label('PLOV',u,3.09,.23,'#c0c6b4',.60);}
    rail(f,f.len/2,3.8,Math.min(3.2,f.len*.65),.88,'#525d51');
   }else if(b.style==='inspection48'||b.style==='inspectionWing'){
    for(let k=0;k<n;k++){const u=(k+.5)*bw;for(let r=0;r<b.levels;r++)f.window(u,1.9+r*3.05,1.05,1.75,b.trim,'#b4beb0');yield;}
    for(const yy of[3.4,6.5])if(yy<h)f.panel(f.len/2,yy,.14,f.len,.17,.28,b.trim);
   }else if(b.style==='plov29'){
    f.panel(f.len/2,.42,.08,f.len,.84,.16,'#8f9480');
    if(side&&f.len>5)f.label('PLOV CENTRU',f.len/2,1.25,Math.min(.65,f.len/16),'#c5cbbb',.20);
    else yield* a.windows(f,1,h,n,2.0,b.trim,'#6e6651');
   }else if(b.style!=='setback135')yield* a.windows(f,b.levels,h,n,1.8,b.trim,'#8d8f79');yield;
  }
  if(b.roofMansard){
   // Exact inset boundaries keep the steep roof face and the cap joined. A
   // coarse distance-gradient triangulation would produce a jagged silhouette.
   for(const [polys,cap]of[[b.roofMansard.bands,false],[b.roofMansard.cap,true]]as const)for(const rings of polys){
    const s=new T.Shape();rings[0].forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));
    for(const r of rings.slice(1)){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));s.holes.push(hole);}
    const g=new T.ShapeGeometry(s);g.rotateX(-Math.PI/2);const v=g.attributes.position;
    for(let i=0;i<v.count;i++){const p:XY=[v.getX(i),v.getZ(i)],d=Math.min(...b.p.slice(1).map((q,k)=>pointSegmentDistance(p,b.p[k]as XY,q as XY)));v.setY(i,y+h+.15+b.roofRise*(cap?1:Math.min(1,d/1.5)));}
    g.computeVertexNormals();m.put(g,b.roof,false,true);yield;
   }
  }
  if(b.style==='setback135')for(let z=-440;z> -464;z-=4){const x=601.8;if(z<Math.min(...b.p.map(p=>p[1])))continue;m.box(x,y+2.67,z,.75,5.35,.75,'#a5a694',false,true);yield;}
 });
 // Real temporary enclosure photographed in2025, with a clear operable access.
 for(let z=-437;z> -468;z-=2.5)m.job('135 · împrejmuire observată',streetRect(611.5,z,.8,2.5),[],function*(){const y=ground(611.5,z),color=z> -446?'#9ba99b':z> -458?'#a7a263':'#9d745b';m.box(611.5,y+1.02,z,.1,2.04,2.5,color,false,true);for(let dz=-1.2;dz<1.25;dz+=.24)m.box(611.57,y+1.02,z+dz,.022,2.04,.022,'#a0a58c',true);yield;});
 for(const[x,z,h,r]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.15,.28,h*.54,7);trunk.translate(x,y+h*.27,z);m.put(trunk,'#75765b',false,true);for(const[dx,dz,dy,rr]of[[0,0,.67,r],[r*.4,.25,.77,r*.70],[-r*.36,-.3,.81,r*.63],[0,0,.94,r*.46]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.08,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#6d8850');yield;}});
 const poles:XY[]=[[616.32,-434.98],[616.8,-462],[631.7,-451],[630.3,-470.8],[604.59,-492.04],[630.49,-494.03],[674.11,-474.25],[585,-481.8]];
 for(const[x,z]of poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),sign=x<625?1:-1;m.box(x,y+3.75,z,.17,7.5,.17,'#a4ad99',false,true);m.beam(new T.Vector3(x,y+7.0,z),new T.Vector3(x+sign*1.4,y+7.4,z),.04,'#899984');m.box(x+sign*1.4,y+7.4,z,.65,.1,.26,'#b7beaa');yield;});
 for(let z=-514;z< -432;z+=14)m.job('fire troleibuz',[[618,z],[628,z+14]],[],function*(){for(const dx of[-1.7,1.7]){const x=(zz:number)=>zz< -480?618.2:623.1;m.beam(new T.Vector3(x(z)+dx,ground(x(z),z)+6.1,z),new T.Vector3(x(z+14)+dx,ground(x(z+14),z+14)+6.1,z+14),.014,'#53634f');yield;}});
 m.job('Alexandru cel Bun · fire',[[551,-476],[704,-485]],[],function*(){for(const d of[-1.4,1.4])for(let x=552;x<704;x+=12){const z=(x:number)=>x<620.8?-476.4+(620.8-x)*.029:-476.4-(x-620.8)*.084;m.beam(new T.Vector3(x,ground(x,z(x))+6.2,z(x)+d),new T.Vector3(x+12,ground(x+12,z(x+12))+6.2,z(x+12)+d),.014,'#53634f');yield;}});
 // White pedestrian guardrails have explicit gaps at the marked crossings.
 for(const[a0,b0]of[[[605,-481.8],[612,-482.3]],[[616,-480],[616,-487]],[[637,-470.7],[653,-472.1]]]as[XY,XY][])m.job('balustradă intersecție',[a0,b0],[],function*(){const y=ground((a0[0]+b0[0])/2,(a0[1]+b0[1])/2),f=m.facade(a0,b0,y),ang=angle(f);for(const yy of[.3,.95]){const p=f.at(f.len/2);m.box(p[0],y+yy,p[1],f.len,.035,.035,'#a5b8a3',true,true,ang);}for(let u=0;u<=f.len;u+=1.7){const p=f.at(u);m.box(p[0],y+.5,p[1],.04,1,.04,'#a5b8a3',true,true);yield;}});
 for(const[x,z]of[[616,-469],[631,-474],[601,-481]])m.job('indicator trecere',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+1.5,z,.045,3,.045,'#909f8b',true,true);m.box(x,y+2.65,z,.62,.70,.04,'#b7b64d');m.box(x,y+2.65,z+.035,.48,.56,.025,'#426e8c');const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.19,y+2.46,z+.055,x+.19,y+2.46,z+.055,x,y+2.88,z+.055],3));g.computeVertexNormals();m.put(g,'#ccd1bd',true);yield;});
 for(const[x,z]of[[624,-445],[623,-465],[611,-480],[644,-479]])m.job('capac utilități',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.31,.31,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#788271');yield;});
 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:623,z:-450,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-4700000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=-514;z<-432;z+=6)for(const x of[612,633])treeOverrides.push({x,z,height:0,radius:4,texture:0,get ready(){return m.readyNear(x,z,15)&&l.readyNear(x,z,20);}});
 for(const[x,z,h,r]of realm.trees)treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,15)&&l.readyNear(x,z,20);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
