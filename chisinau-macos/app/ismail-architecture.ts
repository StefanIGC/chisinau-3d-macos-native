import * as T from 'three';
import {photoArchitecture} from './photo-architecture';
import type {streetMesh} from './street-mesh';
import type {PhotoBuilding} from './central-infill';
import type {XY} from './city-layout';

type Building=PhotoBuilding & {entry?:{a:XY;b:XY;u:number;width:number;depth:number;clearance:number;walls:number[][][][];rings:number[][][]}};
export const ISMAIL_CUSTOM=['london17','dent32','punto37','punto33','ortho35','transelit31','salle41','house40','shop38'];
/** Photo-supported elevations. All dimensions without survey data are estimates. */
export function addIsmailArchitecture(m:ReturnType<typeof streetMesh>,buildings:Building[]){
 const a=photoArchitecture(m),{box,solid,put,beam,ground}=m;
 const rail=(f:ReturnType<typeof m.facade>,u:number,h:number,width:number,depth:number,c='#495347')=>{
  f.panel(u,h,depth/2,width,.13,depth,'#aaac98');for(const hh of[h+.12,h+.96])f.panel(u,hh,depth,width,.035,.04,c,true);
  for(let v=-width/2;v<=width/2;v+=.22)f.panel(u+v,h+.52,depth,.025,.86,.035,c,true);
 };
 function gable(f:ReturnType<typeof m.facade>,u:number,w:number,base:number,rise:number,depth:number,wall:string,roof:string){
  const p=f.at(u-w/2),q=f.at(u+w/2),r=f.at(u),back=f.at(u,-depth),t=f.at(u-w/2,-depth),v=f.at(u+w/2,-depth),y=f.y;
  let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([p[0],y+base,p[1],q[0],y+base,q[1],r[0],y+base+rise,r[1],v[0],y+base,v[1],t[0],y+base,t[1],back[0],y+base+rise,back[1]],3));g.computeVertexNormals();put(g,wall,false,true);
  g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([p[0],y+base+.1,p[1],r[0],y+base+rise+.1,r[1],back[0],y+base+rise+.1,back[1],p[0],y+base+.1,p[1],back[0],y+base+rise+.1,back[1],t[0],y+base+.1,t[1],r[0],y+base+rise+.1,r[1],q[0],y+base+.1,q[1],v[0],y+base+.1,v[1],r[0],y+base+rise+.1,r[1],v[0],y+base+.1,v[1],back[0],y+base+rise+.1,back[1]],3));g.computeVertexNormals();put(g,roof,false,true);
  for(const e of[p,q])beam(new T.Vector3(e[0],y+base+.08,e[1]),new T.Vector3(r[0],y+base+rise+.08,r[1]),.09,'#706954');
 }
 for(const b of buildings.filter(b=>ISMAIL_CUSTOM.includes(b.style)))m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  if(b.entry){for(const p of b.entry.walls)solid(p[0] as XY[],b.entry.clearance+5,y-5,b.wall,true,p.slice(1) as XY[][]);solid(b.p as XY[],h-b.entry.clearance,y+b.entry.clearance,b.wall,true,b.holes as XY[][]);}
  else solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);
  solid(b.p as XY[],.13,y+h,b.roof);yield;
  const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const faces=a.faces(b.p as XY[],y);
  for(const f of faces){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),north=q[1]<p[1]-.8,south=q[1]>p[1]+.8,east=q[0]>p[0]+.8;
   const front=b.style==='london17'?(q[1]>p[1]+.45||q[0]>p[0]+.45):['dent32','house40','shop38'].includes(b.style)?south:north;
   a.cornice(f,h,b.trim);
   if(f.len<2.3)continue;
   if(!front){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.8)),2,b.trim);continue;}
   if(b.style==='london17'){
    const bays=Math.max(1,Math.round(f.len/3.75)),bw=f.len/bays;
    f.panel(f.len/2,.74,.12,f.len,1.48,.24,'#606c65');
    for(let row=0;row<3;row++){
     const yy=3.05+row*3.65,n=row===0?Math.max(1,Math.round(f.len/6.3)):bays,span=f.len/n;
     for(let k=0;k<n;k++){const u=(k+.5)*span;f.window(u,yy,row===0?span-.55:Math.min(1.5,bw*.58),row===0?3.0:2.40,b.trim,'#514f3e');
      if(row===2)a.pediment(f,u,yy+1.46,Math.min(2.15,bw-.2),.65,y,b.trim);yield;}
     f.panel(f.len/2,yy+1.60,.25,f.len,.18,.50,b.trim);
    }
    for(let yy=1.2;yy<h;yy+=.61){f.panel(f.len/2,yy,.045,f.len,.023,.03,'#949d8b',true);yield;}
    for(const u of[.25,f.len-.25])for(let yy=1.25;yy<h-.3;yy+=.5)f.panel(u,yy,.17,.5,.30,.34,b.trim,true);
    // Roof parapet with open balusters; no heavy imported transparent facade.
    for(const yy of[h+.18,h+1.0])f.panel(f.len/2,yy,.05,f.len+.15,.14,.35,b.trim);
    for(let u=.2;u<f.len;u+=.48)f.panel(u,h+.6,.05,.13,.71,.20,b.trim,true);
    if(east&&f.len>10)f.label('LONDON',f.len*.46,4.42,.43,'#bcaf84');
   }else if(b.style==='dent32'){
    const half=f.len/2;
    for(let i=0;i<2;i++){
     const u=half*(i+.5);gable(f,u,half-.25,h,3.5,12.9,b.wall,b.roof);
     // Recessed-looking attic balcony stays within its gable silhouette.
     f.panel(u,h+1.35,.12,half*.47,2.30,.025,'#405a52',false,1);rail(f,u,h+.2,half*.48,.48);
     for(let k=0;k<3;k++){const uu=half*i+half*(k+.5)/3;f.window(uu,5.55,1.18,1.8,b.trim,'#6a5542');f.window(uu,2.20,1.42,2.0,b.trim,'#625340');yield;}
     f.panel(u,3.95,.18,half-.4,.30,.36,b.trim);
    }
    for(let yy=.9;yy<h;yy+=.56){f.panel(f.len/2,yy,.13,f.len,.055,.04,'#806f56',true);yield;}
    for(const u of[.22,half,f.len-.22])f.panel(u,2.2,.19,.36,4.1,.38,b.trim);
    f.label('DENT VIP',half*.5,3.8,.34,'#c7bea0');f.label('TRANSELIT',half*1.5,3.8,.32,'#4b8c83');
    a.door(f,.9,2.8,1.2,'#5e4c3c');a.door(f,f.len-.95,2.8,1.2,'#5e4c3c');
   }else if(b.style==='punto37'){
    gable(f,f.len/2,f.len+.2,h,4.5,13.6,b.wall,b.roof);
    f.panel(f.len/2,.36,.06,f.len,.72,.12,'#394e46');
    for(const yy of[2.4,5.55])for(const u of[f.len*.16,f.len*.51,f.len*.84]){
     f.window(u,yy,yy<3?.73:1.35,yy<3?3.20:2.5,b.trim,'#bac7b6');yield;
    }
    f.window(f.len/2,9.65,1.55,2.8,b.trim,'#b3c4b4');
    for(const sign of[-1,1])f.window(f.len/2+sign*f.len*.29,9.07,1.12,1.70,b.trim,'#b3c4b4');
    rail(f,f.len/2,8.4,2.40,.55,'#a6b3a1');f.panel(f.len/2,4.16,.10,f.len,.60,.20,b.trim);f.label('PUNTO BIANCO',f.len/2,4.14,.40,'#b5bdaa');
    const disk=new T.CircleGeometry(.6,28);const pt=f.at(f.len/2,.18);disk.rotateY(Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]));disk.translate(pt[0],y+4.95,pt[1]);put(disk,'#c5cbbb',true);
   }else if(b.style==='punto33'){
    const u=f.len/2,ww=Math.min(1.5,f.len*.20);
    for(const v of[f.len*.15,f.len*.85])f.window(v,2.55,ww,2.9,b.trim,'#71573d');
    for(const v of[f.len*.16,f.len*.5,f.len*.84])f.window(v,6.50,ww,2.25,b.trim,'#71573d');
    f.panel(f.len/2,4.60,.27,f.len,.22,.54,b.trim);f.label('PUNTO BIANCO',u,4.33,.39,'#bcc1b3');
    for(let yy=1;yy<h;yy+=.60){
     if(yy<3.94){for(const side of[-1,1])f.panel(u+side*(f.len/4+.51),yy,.04,f.len/2-1.02,.018,.025,'#9f9f89',true);}
     else f.panel(f.len/2,yy,.04,f.len,.018,.025,'#9f9f89',true);yield;
    }
    for(const v of[u-1.14,u+1.14])f.panel(v,2.16,.16,.22,4.13,.32,b.trim);
    for(const v of[f.len*.15,f.len*.85])for(const yy of[.78,5.00]){f.panel(v,yy,.11,ww+.18,.55,.08,b.trim);f.panel(v,yy,.16,ww-.01,.37,.035,b.wall);}
   }else if(b.style==='ortho35'){
    const bays=Math.max(2,Math.round(f.len/3.6)),bw=f.len/bays;
    f.panel(f.len/2,1.75,.04,f.len,3.5,.08,'#927f71');
    for(let row=0;row<2;row++)for(let k=0;k<bays;k++){const u=(k+.5)*bw;f.window(u,2.35+row*3.50,1.35,2.25,b.trim,'#bfc8b8');if(row===0)for(let v=-.55;v<=.55;v+=.22)f.panel(u+v,2.35,.49,.025,2.1,.025,'#4d5040',true);yield;}
    for(let yy=.7;yy<3.4;yy+=.75)f.panel(f.len/2,yy,.10,f.len,.055,.05,'#b6a271',true);
    if(f.len>18){
     const u=f.len-3.9;f.panel(u,3.71,.26,4.6,.85,.16,'#3e6c88');f.label('ORTO-CLASS',u,3.75,.43,'#c8d1c1');f.panel(u,2.30,.41,1.35,2.7,.025,'#9daea0',false,1);
     a.arch(f,f.len*.52,7.5,5.05,2.97,y,b.trim,b.trim,0);
     a.arch(m.facade(f.at(0,.08),f.at(f.len,.08),y),f.len*.52,7.55,4.8,2.7,y,'#57706a',b.trim);
     // The foreground pane sits beyond the masonry arch.
     f.panel(f.len*.52,8.40,.52,3.1,1.45,.025,'#526761',false,1);
     for(let v=-1.2;v<=1.2;v+=.6)f.panel(f.len*.52+v,8.4,.57,.055,1.45,.07,b.trim);
     f.panel(u,4.25,.72,5.7,.20,1.44,b.trim);
     // Steps run beside the building, retaining the through footway.
     const start=u-2.8,end=u-.4,angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
     for(let k=0;k<7;k++){const pt=f.at(start+(k+.5)*(end-start)/7,.95);box(pt[0],y+(k+1)*.14-.20,pt[1],(end-start)/7,.4,1.5,'#90684d',false,true,angle);}
     const landing=f.at(u+.32,.95);box(landing[0],y+.82,landing[1],1.44,.32,1.5,'#90684d',false,true,angle);
     for(const v of[.23,1.68]){const p0=f.at(start,v),p1=f.at(end,v);beam(new T.Vector3(p0[0],y+.9,p0[1]),new T.Vector3(p1[0],y+1.88,p1[1]),.025,'#674f41');}
    }
   }else if(b.style==='transelit31'){
    gable(f,f.len/2,f.len+.15,h,3.30,17,b.wall,b.roof);
    for(let row=0;row<2;row++)for(const u of[f.len*.2,f.len*.79])f.window(u,2.22+row*3.5,1.35,2.1,b.trim,'#5a4938');
    const u=f.len/2;f.window(u,5.63,1.35,2.25,b.trim,'#614b36');
    const angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]),center=f.at(u,.08);
    const bottomPoint=f.at(u,3.14),low=ground(...bottomPoint)+.035,rise=y+.98-low,steps=Math.ceil(rise/.14);
    for(let k=0;k<steps;k++){const r=3.05-k*1.32/(steps-1),g=new T.CylinderGeometry(r,r,rise/steps,28,1,false,-Math.PI/2,Math.PI);g.rotateY(angle);g.translate(center[0],low+(k+.5)*rise/steps,center[1]);put(g,'#bac0a7',false,true);yield;}
    const balcony=new T.CylinderGeometry(1.95,1.95,.18,24,1,false,-Math.PI/2,Math.PI);balcony.rotateY(angle);balcony.translate(center[0],y+4.19,center[1]);put(balcony,'#9e9c86');
    const railPoints=[];for(let k=0;k<=20;k++){const t=-Math.PI/2+k*Math.PI/20,pt=f.at(u+Math.sin(t)*1.90,.08+Math.cos(t)*1.9);railPoints.push(new T.Vector3(pt[0],y+5.18,pt[1]));box(pt[0],y+4.68,pt[1],.026,.94,.026,'#4d5144',true);}
    put(new T.TubeGeometry(new T.CatmullRomCurve3(railPoints),20,.027,5,false),'#4d5144',true);
    f.label('TRANSELIT',u,3.76,.24,'#54867c');f.panel(u,2.36,.38,1.6,2.7,.025,'#5b5c46',false,1);
    f.window(u,8.20,.62,.65,b.trim,'#62533b');for(let yy=.5;yy<h;yy+=.66)f.panel(f.len/2,yy,.04,f.len,.025,.03,'#8f8974',true);
   }else if(b.style==='house40'){
    f.panel(f.len/2,1.45,.04,f.len,2.9,.08,'#b2967d');
    for(let row=0;row<2;row++)for(let k=0;k<(row?4:3);k++){const u=f.len*(row?k+.5:k+1)/4;f.window(u,1.6+row*3.4,1.18,row?2.0:1.5,b.trim,'#b4bdab');if(!row)for(let v=-.5;v<=.5;v+=.2)f.panel(u+v,1.6,.45,.024,1.4,.025,'#3a483d',true);yield;}
    for(const u of[.72,f.len-.72]){f.panel(u,1.30,.36,1.15,2.6,.025,'#bac1b2',false,1);for(const side of[-1,1])f.panel(u+side*.67,1.4,.14,.15,2.8,.28,b.trim);}
    for(const u of[f.len*.15,f.len*.85])a.pediment(f,u,h+.08,3.1,1.0,y,b.trim);
    f.panel(f.len/2,2.91,.17,f.len,.18,.34,b.trim);f.label('40',.50,3.72,.20,'#4b5648');
    // Shallow opaque leaf clusters follow the photographed climbing ivy.
    for(let band=0;band<3;band++){
     let last: T.Vector3|undefined;
     for(let k=0;k<25;k++){const u=f.len*(.36+band*.14)+.26*Math.sin(k*2.3),yy=1.1+k*.20,pt=f.at(u,.14),point=new T.Vector3(pt[0],y+yy,pt[1]);if(last)beam(last,point,.018,'#6d7250');last=point;
      const g=new T.IcosahedronGeometry(.17,0);g.scale(1.25,1,.28);g.translate(pt[0],y+yy,pt[1]);put(g,k%3?'#6e8154':'#83945d',true);if(k%12===0)yield;
     }
    }
   }else if(b.style==='shop38'){
    f.panel(f.len/2,.39,.08,f.len,.78,.16,'#927c5f');f.panel(f.len/2,h-.4,.16,f.len,.80,.32,'#544d40');
    for(let k=0;k<3;k++)f.window((k+.5)*f.len/3,2.5,1.16,2.25,b.trim,'#614d37');
    for(const yy of[1,2.4,3.6])f.panel(f.len/2,yy,.07,f.len,.045,.03,'#6f604a',true);
   }else if(b.style==='salle41'){
    f.panel(f.len/2,1.28,.06,f.len,2.56,.12,'#aa906b');
    for(const u of[f.len*.17,f.len*.50,f.len*.83])f.window(u,4.03,1.65,2.65,b.trim,'#b9c4b3');
    const u=f.len*.54;f.panel(u,1.21,.14,1.1,2.05,.025,'#466653',false,1);for(const sign of[-1,1]){f.panel(u+sign*.69,1.21,.18,.24,2.03,.12,'#789269');}
    const ang=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
    // Shallow curved sage canopy on the photographed iron frame.
    const roof=new T.CylinderGeometry(.76,.76,3.6,14,1,true,0,Math.PI);roof.rotateZ(Math.PI/2);roof.rotateY(ang);const pt=f.at(u,1.0);roof.translate(pt[0],y+2.18,pt[1]);put(roof,'#7c986b');
    for(const side of[-1,1]){const p=f.at(u+side*1.72,1.25);box(p[0],y+1.24,p[1],.04,2.48,.04,'#414c3e',true,true);}
    f.label('SALLE DE CAFE',u,2.54,.19,'#bdc3a4',1.62);
   }
   yield;
  }
  if(['ortho35','salle41','house40','shop38'].includes(b.style))a.roof((minX+maxX)/2,(minZ+maxZ)/2,maxX-minX,maxZ-minZ,y+h,b.roofRise,b.roof);
  if(b.style==='london17'){
   // The two photographed stair runs connect to one raised corner terrace.
   box(1403.2,y+1.30,308.2,5.4,.48,1.45,'#6b7467',false,true);
   box(1406.4,y+1.30,305.6,1.55,.48,6.5,'#6b7467',false,true);
   const southBase=ground(1396.55,308.2)+.035,eastBase=ground(1406.4,298.72)+.035,top=y+1.54;
   for(const eastRun of[false,true]){
    const low=eastRun?eastBase:southBase,rise=top-low,n=Math.ceil(rise/.14),tread=3.96/n;
    for(let k=0;k<n;k++){
     box(eastRun?1406.4:1396.55+(k+.5)*tread,low+(k+1)*rise/n-.21,eastRun?298.72+(k+.5)*tread:308.2,eastRun?1.55:tread,.42,eastRun?tread:1.45,'#b6bba6',false,true);yield;
    }
   }
   const balusters=(pa:XY,pb:XY)=>{const dx=pb[0]-pa[0],dz=pb[1]-pa[1],len=Math.hypot(dx,dz);for(let u=0;u<=len;u+=.43){const t=u/len,x=pa[0]+dx*t,z=pa[1]+dz*t;const g=new T.CylinderGeometry(.065,.09,.83,8);g.translate(x,y+2.06,z);put(g,b.trim,true);}beam(new T.Vector3(pa[0],y+2.52,pa[1]),new T.Vector3(pb[0],y+2.52,pb[1]),.085,b.trim);};
   balusters([1400.55,308.94],[1405.86,308.94]);balusters([1407.15,303.1],[1407.15,308.7]);
   for(const z of[307.55,308.87])beam(new T.Vector3(1396.55,southBase+.95,z),new T.Vector3(1400.51,y+2.49,z),.05,b.trim);
   for(const x of[1405.7,1407.1])beam(new T.Vector3(x,eastBase+.95,298.72),new T.Vector3(x,y+2.49,302.68),.05,b.trim);
   // Red phone kiosk visible beside the Ismail stair: closed decorative object.
   const x=1406.6,z=297.0,yy=ground(x,z)+.12,red='#974737';box(x,yy+1.22,z,.92,2.44,.94,red,false,true);box(x,yy+2.53,z,1.05,.19,1.06,red);
   for(const ff of a.faces([[x-.47,z-.48],[x+.47,z-.48],[x+.47,z+.48],[x-.47,z+.48],[x-.47,z-.48]],yy)){
    ff.panel(ff.len/2,1.3,.016,.71,1.98,.02,'#5a756d',false,1);for(let u=.18;u<ff.len;u+=.24)ff.panel(u,1.3,.055,.04,2.0,.04,red,true);for(let h=.42;h<2.4;h+=.35)ff.panel(ff.len/2,h,.055,.77,.04,.04,red,true);ff.label('TELEPHONE',ff.len/2,2.4,.074,'#cec2a2',.065);
   }
  }
  if(b.entry){
   const d=b.entry,f=m.facade(d.a,d.b,y),top=y+.98,angle=Math.atan2(-(d.b[1]-d.a[1]),d.b[0]-d.a[0]);
   yield* m.surfaceStaged(d.rings[0] as XY[],(x,z)=>ground(x,z)+.12,'#949b8a',true);
   for(let k=0;k<7;k++){const p=f.at(d.u,.55-(k+.5)*(d.depth+.55)/7);box(p[0],top-.98+(k+1)*.14-.16,p[1],d.width,.32,(d.depth+.55)/7,'#939e8d',false,true,angle);yield;}
   f.panel(d.u,.98+1.37,-d.depth+.025,d.width-.08,2.74,.03,'#63533e',false,1);
  }
 });
}
