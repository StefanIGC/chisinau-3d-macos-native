import * as T from 'three';
import realm from '../data/alecsandri-va14.json';
import catalog from '../data/alecsandri-va14-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** Hâjdeu → Țirelson. Complete official plans, original opaque geometry.
 * Visible elevations follow Sep2025 references; unmeasured dimensions estimated. */
export function createAlecsandriVa14(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[]})[];
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'Alecsandri VA14 · corpuri cadastrale');
 const m=streetMesh(scene,'Alecsandri VA14 · detalii',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Alecsandri VA14 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const angle=(f:Face)=>Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
 function door(f:Face,u:number,bottom:number,w=1.2,h=2.4){f.panel(u,bottom+h/2,.36,w,h,.04,'#675b48',false,1);for(const s of[-1,1])f.panel(u+s*(w/2+.07),bottom+h/2,.42,.13,h+.16,.20,'#bda98c');for(const yy of[bottom,bottom+h])f.panel(u,yy,.43,w+.25,.13,.22,'#bda98c');f.panel(u+.28,bottom+1.05,.49,.035,.25,.06,'#a8a58e',true);}
 function stairs(f:Face,u:number,w:number,rise:number){const n=Math.ceil(rise/.13),foot=f.at(u,n*.29+.9),top=ground(...foot)+.035+rise;
  const p=f.at(u,.43);m.box(p[0],top-.12,p[1],w,.24,.6,'#a28d77',false,true,angle(f));
  for(let k=0;k<n;k++){const p=f.at(u,.73+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#a28d77',false,true,angle(f));}return top-f.y;
 }
 function curvedGlass(f:Face,u:number,w:number,bottom:number,top:number,bulge=.55){
  const sample=(t:number,yy:number)=>{const p=f.at(u+(t-.5)*w,.36+bulge*Math.sin(Math.PI*t));return new T.Vector3(p[0],f.y+yy,p[1]);},out:number[]=[];
  const count=Math.max(3,Math.round(w/.85));
  for(let k=0;k<count;k++){const t=k/count,q=(k+1)/count,A=sample(t,bottom),B=sample(q,bottom),C=sample(q,top),D=sample(t,top);for(const v of[A,B,D,B,C,D])out.push(v.x,v.y,v.z);m.beam(sample(t,bottom),sample(t,top),.035,'#9c8068');}
  m.beam(sample(1,bottom),sample(1,top),.035,'#9c8068');
  const heights=[bottom,top];for(let yy=bottom+2.85;yy<top-.01;yy+=2.85)heights.push(yy);
  for(const yy of heights)for(let k=0;k<count;k++)m.beam(sample(k/count,yy),sample((k+1)/count,yy),.055,'#a88a70');
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,'#6f9190',false,false,1);
 }
 function waveGable(f:Face,u:number,w:number,base:number,rise:number){
  const out:number[]=[],top=(t:number)=>base+rise*Math.pow(Math.cos((t-.5)*Math.PI),2);
  for(let k=0;k<20;k++){const t=k/20,q=(k+1)/20,A=f.at(u+(t-.5)*w,.48),B=f.at(u+(q-.5)*w,.48),ya=top(t),yb=top(q);out.push(A[0],f.y+base,A[1],B[0],f.y+base,B[1],A[0],f.y+ya,A[1],B[0],f.y+base,B[1],B[0],f.y+yb,B[1],A[0],f.y+ya,A[1]);m.beam(new T.Vector3(A[0],f.y+ya,A[1]),new T.Vector3(B[0],f.y+yb,B[1]),.12,'#b59a7e');}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,'#c0b398');a.arch(m.facade(f.at(0,.30),f.at(f.len,.30),f.y),u,base+.18,1.6,1.9,f.y,'#6f8882','#cfc2a4');
 }
 for(const original of buildings)m.job(original.title,original.p as XY[],[],function*(){for(const b of original.parts?.length?original.parts.map(part=>({...original,...part,parts:undefined})):[original]){const y=ground(...b.anchor as XY)+.12,h=b.height;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<1.3)continue;const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[0]-p[0])*b.front[0]>.8;
   a.cornice(f,h,b.trim);f.panel(f.len/2,.42,.10,f.len,.84,.20,b.style==='acaem'?'#a08770':'#969281');
   if(b.style==='annex'){if(front&&f.len>5)f.window(f.len*.5,1.5,.85,1.05,b.trim,'#7e806a');yield;continue;}
   if(b.style==='acaem'&&front&&f.len>10){
    const u=f.len*.52,w=f.len*.70;curvedGlass(f,u,w,2.5,11.05,.65);yield;
    for(const yy of[2.25,5.3,8.15,11.3,13.95])f.panel(f.len/2,yy,.18,f.len,.20,.36,'#af8d70');
    // Open upper loggia and curved canopy; no black solid balcony box.
    f.panel(u,12.65,.32,w,2.0,.035,'#736d59',false,1);
    for(let k=0;k<6;k++){const du=(k/5-.5)*w;f.panel(u+du,12.9,.9,.10,2.65,.10,'#b9a182');}
    for(const yy of[11.6,12.5])f.panel(u,yy,1.0,w,.055,.055,'#82755f',true);
    for(let du=-w/2;du<=w/2;du+=.25)f.panel(u+du,12.04,1.0,.025,.86,.025,'#82755f',true);
    for(let k=0;k<16;k++){const t=k/16,q=(k+1)/16,A=f.at(u+(t-.5)*w,.85),B=f.at(u+(q-.5)*w,.85),C=f.at(u+(t-.5)*w,-1.8),D=f.at(u+(q-.5)*w,-1.8),hh=(tt:number)=>y+14.1+.65*Math.sin(tt*Math.PI),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([A[0],hh(t),A[1],C[0],hh(t),C[1],B[0],hh(q),B[1],B[0],hh(q),B[1],C[0],hh(t),C[1],D[0],hh(q),D[1]],3));g.computeVertexNormals();m.put(g,'#8d8a71');yield;}
    waveGable(f,f.len*.68,Math.min(6.8,f.len*.55),h-.1,2.5);
    const u0=f.len*.13,r=stairs(f,u0,1.6,.52);door(f,u0,r,1.15,2.5);
    f.panel(f.len*.54,1.8,.44,5.6,.53,.16,'#9e8469');f.label('VILLA ACAEM',f.len*.54,1.68,.29,'#d0c5a8',.55);
   }else if(b.style==='acaem'){
    yield* a.windows(f,4,h,Math.max(1,Math.round(f.len/3.0)),1.7,b.trim,'#8b765f');for(const yy of[3.1,6.1,9.1,12.1])f.panel(f.len/2,yy,.18,f.len,.16,.34,'#ad9075');
   }else if(b.style==='corner104'){
    const n=Math.max(1,Math.round(f.len/3.1));
    if(front&&f.len>5){for(let row=0;row<5;row++){curvedGlass(f,f.len*.50,Math.min(3.5,f.len*.45),1.05+row*3,2.8+row*3,.48);for(const side of[-1,1]){f.window(f.len/2+side*f.len*.37,1.9+row*3,.95,1.65,b.trim,'#b4b5a2');if(row>0&&row<4)f.panel(f.len/2+side*f.len*.37,3.05+row*3,.14,.65,.65,.28,'#9d786c');}yield;}for(let yy=3.4;yy<16;yy+=3.0)f.panel(f.len/2,yy,.17,f.len,.18,.34,b.trim);
     f.panel(f.len/2,1.45,.3,f.len,2.3,.04,'#526b67',false,1);door(f,f.len*.80,0,1.25,2.55);
    }else yield* a.windows(f,5,h,n,1.8,b.trim,'#7b806e');
   }else{yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.7)),1.8,b.trim,'#7e7a67');if(front&&f.len>10&&b.style==='cornerHouse')door(f,f.len*.58,0,.95,2.3);}
   yield;
  }
 }});
 function wall(name:string,p0:XY,p1:XY,h:number,c:string,iron=false){const len=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]),n=Math.ceil(len/4);
  for(let k=0;k<n;k++){const A:XY=[p0[0]+(p1[0]-p0[0])*k/n,p0[1]+(p1[1]-p0[1])*k/n],B:XY=[p0[0]+(p1[0]-p0[0])*(k+1)/n,p0[1]+(p1[1]-p0[1])*(k+1)/n];m.job(name,[A,B],[],function*(){const p:XY=[(A[0]+B[0])/2,(A[1]+B[1])/2],y=ground(...p),f=m.facade(A,B,y),base=iron?.55:h;m.box(p[0],y+(base-.35)/2,p[1],f.len,base+.35,.20,c,false,true,angle(f));
   if(iron){for(const yy of[.65,h])f.panel(f.len/2,yy,0,f.len,.05,.06,'#4b5346',true);for(let u=.08;u<f.len;u+=.20){const p=f.at(u);m.box(p[0],y+(h+.55)/2,p[1],.025,h-.55,.035,'#4b5346',true,true,angle(f));}for(const u of[0,f.len]){const p=f.at(u);m.box(p[0],ground(...p)+h/2,p[1],.23,h+.15,.23,'#b6a188',false,true);}}else for(let yy=.25;yy<h;yy+=.40)f.panel(f.len/2,yy,.12,f.len,.024,.026,'#b9ad94',true);yield;
  });}
 }
 wall('ACAEM · gard metalic',[601.4,-899],[601.4,-906.55],1.8,'#ac967b',true);
 wall('ACAEM · gard metalic',[601.4,-908.85],[601.4,-916.7],1.8,'#ac967b',true);
 wall('ACAEM · racord gard',[601.4,-916.7],[598.4,-921.85],1.8,'#ac967b',true);
 wall('ACAEM · racord nord',[598.4,-925.05],[597,-928.0],1.8,'#ac967b',true);
 wall('Hâjdeu · zid piatră',[599,-878.5],[599,-891.25],1.8,'#aba38e');
 wall('Hâjdeu · zid piatră',[599,-894.45],[599,-898.5],1.8,'#b29b82');
 // Low edging around the eastern planted forecourt, with actual driveway gap.
 wall('104 · soclu grădină',[638.4,-880],[638.4,-911.9],.5,'#a8a08a');
 wall('104 · soclu conifere',[638.4,-922.6],[638.4,-925],.5,'#a8a08a');
 for(const [x,z,h,r,kind]of realm.trees)m.job('arbore',streetRect(x,z,2*r,2*r),[],function*(){const y=ground(x,z),g=new T.CylinderGeometry(.15,.27,h*.50,7);g.translate(x,y+h*.25,z);m.put(g,'#77745a',false,true);
  if(kind===1){for(let k=0;k<4;k++){const g=new T.ConeGeometry(r*(1-k*.19),h*.42,10);g.translate(x,y+h*(.40+k*.16),z);m.put(g,'#789083');yield;}}else for(const [dx,dz,dy,rr]of[[0,0,.67,r],[r*.37,.2,.78,r*.72],[-r*.32,-.3,.84,r*.65],[0,0,.95,r*.45]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.08,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#728d54');yield;}
 });
 for(const [x,z]of realm.poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),s=x<618?1:-1;m.box(x,y+3.8,z,.17,7.6,.17,'#a5ac98',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x+s*1.4,y+7.35,z),.04,'#8c9982');m.box(x+s*1.4,y+7.35,z,.6,.10,.25,'#b7bea8');yield;});
 for(let z=-945;z<-876;z+=10)m.job('fire troleibuz',[[616,z],[619.5,Math.min(z+10,-876)]],[],function*(){for(const dx of[-1.7,1.7])m.beam(new T.Vector3(617.5+dx,ground(617.5,z)+6.1,z),new T.Vector3(617.5+dx,ground(617.5,z+10)+6.1,z+10),.014,'#52624e');yield;});
 for(const [x,z]of[[633.5,-890],[633.5,-900]])m.job('bancă sub arbori',streetRect(x,z,2,1),[],function*(){const y=ground(x,z);m.box(x,y+.48,z,.5,.12,1.7,'#948064',false,true);m.box(x+.22,y+.80,z,.07,.6,1.7,'#948064');for(const dz of[-.6,.6])m.box(x,y+.23,z+dz,.4,.46,.06,'#65765f',false,true);yield;});
 for(const [x,z]of[[636,-918.5],[642,-925]])m.job('stâlpi acces curte',streetRect(x,z,.3,.3),[],function*(){const y=ground(x,z);m.box(x,y+.52,z,.055,1.04,.055,'#74836c',true,true);yield;});
 for(const [x,z]of[[615,-887],[621,-910],[614,-935]])m.job('capac utilități',streetRect(x,z,.7,.7),[],function*(){const g=new T.CylinderGeometry(.31,.31,.016,14);g.translate(x,ground(x,z)+.047,z);m.put(g,'#7a8271');yield;});
 // Keep the native shells alone while the small replacement group is being
 // staged. Completed new bodies must not overlap the still-active old shell.
 // These two mesh builders never evict; public ground retains its own ordinary
 // streaming lifecycle and is ready before the initial handoff.
 const pairs=[...bodies.objects.map((root,i)=>[root,bodies.collisionObjects[i]]),...m.objects.map((root,i)=>[root,m.collisionObjects[i]])] as [T.Group,T.Group][];
 const prepared=new Set<T.Group>();let active=false;
 function handoff(){
  for(const[root,collision]of pairs)if(root.visible&&collision.userData.grounded===true)prepared.add(collision);
  active||=pairs.every(([,collision])=>prepared.has(collision))&&l.ready;
  for(const[root,collision]of pairs){const on=active&&prepared.has(collision);root.visible=on;if(collision.userData.grounded!==on){collision.userData.grounded=on;collision.userData.revision=(collision.userData.revision??0)+1;}}
 }
 const owner=(i:number)=>active&&prepared.has(bodies.collisionObjects[i]),ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:618,z:-905,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-6000000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];for(let z=-940;z<-877;z+=6)for(const x of[599,605,632,638])treeOverrides.push({x,z,height:0,radius:4.1,texture:0,get ready(){return active&&l.readyNear(x,z,20);}});
 const anchors=[...buildings.map(b=>b.anchor),...realm.trees,...realm.poles,...realm.cells.map(c=>[c.x,c.z])];
 // Outside this bounded approach the complete old group remains available.
 // Requiring the farthest replacement there could exceed the builders' 510 m
 // work radius and hold up an unrelated map destination. Within 350 m, every
 // job in this compact sector is inside that radius and the handoff is required.
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return active&&layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r))&&(active||Math.hypot(x-618,z+908)>350||!anchors.some(p=>Math.hypot(x-p[0],z-p[1])<=r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);handoff();},dispose(){active=false;for(const v of layers)v.dispose();}};
}
