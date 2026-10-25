import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import {photoArchitecture} from './photo-architecture';
import type {streetMesh} from './street-mesh';
import type {XY} from './city-layout';

/** Original mesh elevations derived from the dated photographs in docs/bucuresti-bu01-references.
 * All metric facade dimensions are estimates; this helper never changes a cadastral footprint. */
export function bucurestiArchitecture(m:ReturnType<typeof streetMesh>,ground:(x:number,z:number)=>number){
 const a=photoArchitecture(m);
 type Face=ReturnType<typeof m.facade>;
 const preserved:Record<string,string>={'cladiri.8966/0':'house45','cladiri.8967/0':'house45shop','cladiri.9717/0':'house46','cladiri.9720/0':'yellowWing'};
 const kind=(b:PhotoBuilding)=>preserved[b.id]??b.style;
 const normal=(f:Face)=>{const p=f.at(f.len/2),q=f.at(f.len/2,1);return[q[0]-p[0],q[1]-p[1]];};
 const angle=(f:Face)=>Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
 function handles(b:PhotoBuilding,f:Face){
  const n=normal(f),p=f.at(f.len/2),k=kind(b);
  if(preserved[b.id])return f.len>5&&Math.abs(n[1])>.85&&(k==='house46'||k==='yellowWing'?n[1]>0&&p[1]>453:n[1]<0&&p[1]<482);
  if(k==='corner41')return f.len>2.5&&(n[1]<-.65||n[0]>.65);
  if(k==='cornerNorth')return f.len>2.5&&(n[1]>.65||n[0]>.65);
  if(k==='cornerEast')return f.len>4&&(n[0]<-.85||n[1]>.85);
  if(k==='armeneascaSouth')return f.len>4&&(n[0]<-.85||n[1]<-.85);
  if(k==='modernSouth')return f.len>4&&(n[0]<-.85||n[1]<-.85);
  return f.len>2.5&&n[0]*b.front[0]+n[1]*b.front[1]>.85;
 }
 function door(f:Face,u:number,bottom:number,w=1.1,h=2.3,color='#54605b'){
  f.panel(u,bottom+h/2,.35,w,h,.05,color,false,1);
  for(const s of[-1,1])f.panel(u+s*(w/2+.065),bottom+h/2,.42,.13,h+.15,.20,'#c9c9ba');
  for(const yy of[bottom,bottom+h])f.panel(u,yy,.43,w+.24,.13,.21,'#c9c9ba');
  f.panel(u+w*.3,bottom+1.05,.49,.035,.28,.05,'#b7b8a5',true);
 }
 function stairs(f:Face,u:number,w:number,rise:number,landing=.5,rail=false){
  const n=Math.max(1,Math.ceil(rise/.13)),run=n*.29,foot=f.at(u,run+landing+.35),top=ground(...foot)+.035+rise;
  const p=f.at(u,landing/2+.16);m.box(p[0],top-.12,p[1],w,.24,landing+.04,'#a3a295',false,true,angle(f));
  for(let k=0;k<n;k++){const p=f.at(u,landing+.18+(k+.5)*.29);m.box(p[0],top-k*rise/n-.12,p[1],w,.24,.295,'#a3a295',false,true,angle(f));}
  if(rail)for(const s of[-1,1]){
   const p=f.at(u+s*(w/2-.05),.3),q=f.at(u+s*(w/2-.05),run+landing+.2);
   m.beam(new T.Vector3(p[0],top+.9,p[1]),new T.Vector3(q[0],top-rise+.9,q[1]),.025,'#4c5951');
   for(const [v,yy]of[[.35,top],[run+landing,top-rise]]){const t=f.at(u+s*(w/2-.05),v);m.box(t[0],yy+.45,t[1],.035,.9,.035,'#4c5951',true,true);}
  }
  return top-f.y;
 }
 function canopy(f:Face,u:number,bottom:number,w=1.8){
  const p=f.at(u,.7);m.box(p[0],f.y+bottom,p[1],w,.09,1.45,'#5d655b',false,false,angle(f));
  for(const s of[-1,1]){const p=f.at(u+s*w*.42,.18),q=f.at(u+s*w*.42,1.35);m.beam(new T.Vector3(p[0],f.y+bottom-.45,p[1]),new T.Vector3(q[0],f.y+bottom-.04,q[1]),.025,'#46534b');}
 }
 function balcony(f:Face,u:number,yy:number,w:number,depth=.78){
  f.panel(u,yy,depth/2,w,.15,depth,'#c6c5b6');
  for(const h of[.15,.95])f.panel(u,yy+h,depth,w,.035,.035,'#48564d',true);
  for(let du=-w/2+.1;du<w/2;du+=.23){f.panel(u+du,yy+.54,depth,.025,.82,.035,'#48564d',true);if(Math.round(du/.23)%3===0){const p=f.at(u+du,depth),g=new T.TorusGeometry(.12,.012,4,8);g.rotateY(angle(f));g.translate(p[0],f.y+yy+.56,p[1]);m.put(g,'#48564d',true);}}
  for(const du of[-w/2,w/2])f.panel(u+du,yy+.55,depth/2,.04,.9,depth,'#48564d',true);
 }
 function ac(f:Face,u:number,h:number){f.panel(u,h,.52,.65,.44,.42,'#b8bdb0');for(let j=0;j<5;j++)f.panel(u-.23+j*.115,h,.75,.018,.30,.025,'#818a7a',true);}
 function shallowArch(f:Face,u:number,bottom:number,w:number,h:number){
  const r=w/2,rise=.24,s=new T.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-rise);s.quadraticCurveTo(0,h+rise,-r,h-rise);s.closePath();
  const p=f.at(u,.34),g=new T.ShapeGeometry(s,10);g.rotateY(angle(f));g.translate(p[0],f.y+bottom,p[1]);m.put(g,'#617570',false,false,1);
  // Segmental heads and no projecting stone surround at ground level (AIRM 2023).
  for(const sign of[-1,1])f.panel(u+sign*(r-.035),bottom+(h-rise)/2,.38,.045,h-rise,.04,'#aab9aa',true);
 }
 function* detail(b:PhotoBuilding,f:Face){
  const k=kind(b),h=b.height,y=f.y;
  f.panel(f.len/2,.36,.06,f.len,.72,.12,k==='historic43'?'#626c62':'#8e9081');a.cornice(f,h,b.trim);
  if(k==='historic43'){
   f.panel(f.len/2,2.03,.08,f.len,3.28,.16,'#aabfb0');
   f.panel(f.len/2,4.0,.2,f.len,.22,.4,b.trim);
   const n=Math.max(1,Math.round(f.len/3.16));
   for(let i=0;i<n;i++){
    const u=(i+.5)*f.len/n,w=Math.min(1.45,f.len/n*.6);a.arch(f,u,4.7,w,2.45,y,'#728787',b.trim);
    f.panel(u,5.6,.4,.045,1.75,.04,'#c2c8bb',true);f.panel(u,6.35,.4,w,.045,.04,'#c2c8bb',true);
    if(n>8&&[3,8,11].includes(i)){
     const r=stairs(f,u,1.65,.39,.45,true);door(f,u,r,1.05,2.45);canopy(f,u,r+2.65,1.9);
     if(i===8){f.panel(u+.93,1.9,.31,.44,.55,.05,'#718168');f.label('NOTAR',u,3.23,.20,'#d4d6bc');}
    }else{shallowArch(f,u,.73,w,2.35);f.panel(u,1.7,.4,.045,1.6,.04,'#bac6ba',true);}
    if([1,6,10].includes(i))ac(f,u+.9,3.15);yield;
   }
   for(let u=.3;u<f.len;u+=.58){f.panel(u,h-.52,.30,.19,.22,.24,b.trim,true);f.panel(u,3.81,.28,.17,.18,.20,b.trim,true);}
   for(const u of[.17,f.len-.17])f.panel(u,h*.48,.17,.34,h-.8,.34,b.trim);
   f.panel(f.len/2,3.6,.32,f.len,.035,.035,'#566350',true);
   f.label('43',f.len-.75,2.5,.22,'#d6dbc5',.53);
  }else if(k==='heritage42'){
   f.panel(f.len/2,.63,.1,f.len,1.26,.20,'#aaa191');
   // Official front breaks match the photographed three-window wing, six-window
   // centre and two projecting entrance bays. Do not insert a door among the six windows.
   if(f.len<4.0){const u=f.len*.5,r=stairs(f,u,Math.min(1.55,f.len-.4),.78,.4,true);door(f,u,r,1.2,2.9);a.pediment(f,u,h+.15,f.len+.25,1.15,y,b.trim);
    const p=f.at(u,.47),g=new T.CircleGeometry(.29,16);g.rotateY(angle(f));g.translate(p[0],y+h+.48,p[1]);m.put(g,'#687766',true, false,1);const ring=new T.TorusGeometry(.34,.06,4,16);ring.rotateY(angle(f));ring.translate(p[0],y+h+.48,p[1]);m.put(ring,b.trim,true);yield;return;}
   const n=Math.max(2,Math.round(f.len/2.55));
   for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,3.15,1.16,2.05,'#d0cfc0','#6d7f73');f.window(u,.61,1.45,.90,'#bdb7a6','#5d665c');f.panel(u,4.35,.24,1.50,.16,.35,b.trim);for(let du=-.65;du<.66;du+=.15)f.panel(u+du,.61,.54,.022,.86,.025,'#737c6b',true);yield;}
   for(let u=.25;u<f.len;u+=.46)f.panel(u,h-.48,.22,.20,.2,.24,b.trim,true);
  }else if(k==='house44'||k==='house45'||k==='house45shop'||k==='houseEast'){
   const n=Math.max(2,Math.round(f.len/2.7));
   for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,2.2,1.22,2.05,b.trim,'#60746c');for(const dh of[-1.12,1.12])f.panel(u,2.2+dh,.3,1.55,.14,.38,b.trim);yield;}
   const u=f.len*.83,r=stairs(f,u,1.2,.26,.35);door(f,u,r,.9,2.4);
   if(k==='house45shop'){f.panel(f.len*.45,3.5,.3,Math.min(5.8,f.len*.6),.5,.13,'#e1dace');f.label('DEPO',f.len*.45,3.37,.25,'#656a60');canopy(f,u,3,1.65);}
   if(k==='house44')f.label('44',f.len*.14,2.8,.19,'#dbd7c2');
  }else if(k==='house46'){
   f.panel(f.len/2,.43,.10,f.len,.86,.20,'#959b83');
   for(const u of[f.len*.13,f.len*.29,f.len*.71,f.len*.87])f.window(u,2.45,1.25,2.22,b.trim,'#738b77');
   const u=f.len*.5,r=stairs(f,u,2.35,.39,.42);
   f.panel(u,r+1.55,.25,3.1,3.1,.22,'#83967d');door(f,u,r,1.12,2.65);
   for(const du of[-1.3,1.3]){const p=f.at(u+du,.7);a.column(p[0],p[1],y+r,3.1,.20,b.trim,true);}
   f.panel(u,4.15,.5,3.6,.34,1.0,b.trim);a.pediment(f,u,h+.1,4.7,1.45,y,b.trim);a.arch(f,u,h+.3,.95,.9,y,'#7b8b75',b.trim);
   f.label('46',f.len-.6,2.7,.21,'#e0ddc7');yield;
  }else if(k==='yellowWing'){
   const n=Math.max(3,Math.round(f.len/2.9));for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;for(const yy of[1.8,5.05])f.window(u,yy,1.2,1.95,b.trim,'#607263');yield;}
   f.panel(f.len/2,3.45,.2,f.len,.18,.4,b.trim);door(f,f.len*.2,0,1.0,2.45);
  }else if(k==='corner41'){
   const n=Math.max(1,Math.round(f.len/3.8)),storey=h/4;
   for(let i=0;i<n;i++){
    const u=(i+.5)*f.len/n,w=Math.min(1.85,f.len/n*.61);a.arch(f,u,.12,w,3.0,y,'#627c79',b.trim);
    for(let row=1;row<4;row++){const cy=storey*row+1.5;f.window(u,cy,w*.83,2.05,b.trim,'#778c8a');if(row===1){a.arch(f,u,cy+1.05,w*.95,.92,y,'#c8c8b7',b.trim);for(let j=0;j<7;j++){const du=(j-3)*w*.095;f.panel(u+du,cy+1.35,.45,.025,.48,.04,'#b6b7a7',true);}}}
    for(const side of[-1,1]){const pos=u+side*f.len/n*.43;f.panel(pos,6.65,.23,.34,6.0,.46,b.trim);for(const du of[-.10,0,.10])f.panel(pos+du,6.65,.48,.024,5.7,.04,'#b5b5a4',true);}
    yield;
   }
   for(const yy of[3.4,10.1]){f.panel(f.len/2,yy,.35,f.len+.1,.25,.7,b.trim);f.panel(f.len/2,yy+.22,.25,f.len+.1,.18,.5,b.trim);}
   for(let yy=.35;yy<3.3;yy+=.42)f.panel(f.len/2,yy,.13,f.len,.03,.26,'#b6b5a2',true);
   balcony(f,f.len*.5,3.35,f.len+.12,.9);
   if(f.len>7){const u=f.len*.5,r=stairs(f,u,2.3,.39,.55);door(f,u,r,1.45,2.6);}
  }else if(k==='cornerNorth'){
   f.panel(f.len/2,2.4,.1,f.len,3.5,.2,'#777e73');f.panel(f.len/2,3.75,.21,f.len,.58,.32,'#4a5750');
   const n=Math.max(1,Math.round(f.len/3));for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,2.0,Math.min(1.7,f.len/n*.6),2.4,'#c5c8b9','#52685e');yield;}
   if(f.len>7){f.label('ODESA',f.len*.60,3.58,.36,'#cdd0bf');const u=f.len*.74,r=stairs(f,u,2.4,.65,.55,true);door(f,u,r,1.1,2.35);}
  }else if(k==='cornerEast'){
   const n=Math.max(2,Math.round(f.len/3.15));
   f.panel(f.len/2,1.55,.08,f.len,3.1,.16,'#a6aaa0');
   if(f.at(f.len/2)[0]<807&&f.at(f.len/2)[1]>437){f.panel(f.len/2,3.05,.28,f.len,.8,.48,'#538642');f.label('market',f.len*.48,2.85,.45,'#d6d9c6');}
   for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,1.5,Math.min(2.15,f.len/n*.82),2.35,'#b6beab','#5f7670');for(let row=1;row<5;row++){const cy=3.1+row*2.85-1.3;f.window(u,cy,1.25,1.65,'#c8cbbc','#778e8a');if(i%3===1){balcony(f,u,cy-1.0,2.5,.72);if(row%2===0){f.panel(u,cy+.05,.75,2.3,1.85,.055,'#8ea29b',false,1);for(const du of[-.78,0,.78])f.panel(u+du,cy+.05,.81,.055,1.85,.06,'#c6cbbd',true);}}}if(i%5===0)ac(f,u+.9,8.6);yield;}
  }else if(k==='armeneascaSouth'){
   const n=Math.max(2,Math.round(f.len/3.2));
   for(let i=0;i<n;i++){const u=(i+.5)*f.len/n,w=Math.min(1.8,f.len/n*.65);a.arch(f,u,.15,w,3.3,y,'#5d736a',b.trim);
    for(let row=1;row<3;row++){f.window(u,1.75+row*3.2,1.25,2.0,b.trim,'#77897c');if(row<3)balcony(f,u,1.0+row*3.2,1.5,.25);}
    f.panel(u-f.len/n*.45,6.75,.16,.25,6.5,.32,b.trim);f.window(u,h+.85,.85,1.25,b.trim,'#7d8878',-.7);yield;}
   for(const yy of[3.7,7.1,10.7])f.panel(f.len/2,yy,.25,f.len,.18,.5,b.trim);
   const u=f.len*.5,r=stairs(f,u,2.3,.39,.5);door(f,u,r,1.6,2.8);
  }else if(k==='modernSouth'){
   const n=Math.max(2,Math.round(f.len/3.05));
   f.panel(f.len/2,10.65,.07,f.len,14.5,.14,'#8c776b');
   f.panel(f.len/2,h-1.2,.09,f.len,2.4,.18,'#88736b');
   for(let i=0;i<n;i++){
    const u=(i+.5)*f.len/n;f.window(u,1.75,Math.min(1.8,f.len/n*.70),2.55,b.trim,'#708277');
    for(let row=1;row<6;row++){
     const cy=1.65+row*2.95;f.window(u,cy,1.15,2.12,b.trim,'#80928a');
     if(i%4===3){f.panel(u,cy-.94,.52,2.45,.17,1.12,b.trim);for(const v of[-.98,.98])f.panel(u+v,cy+.2,.48,.14,2.55,1.05,b.trim);f.panel(u,cy-.42,1.03,2.2,.85,.045,'#b2beb0',false,1);}
    }
    f.window(u,h-1.15,1.15,1.35,b.trim,'#778a7d');f.panel(u-f.len/n*.45,10.6,.16,.22,14.7,.32,b.trim);yield;
   }
   for(const yy of[3.6,18.2]){f.panel(f.len/2,yy,.28,f.len,.30,.56,b.trim);f.panel(f.len/2,yy+.30,.18,f.len,.18,.36,b.trim);}
  }else if(k==='armeneascaLow'){
   f.panel(f.len/2,.56,.09,f.len,1.12,.18,'#a57565');const n=Math.max(2,Math.round(f.len/2.5));
   for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,2.55,1.0,1.75,b.trim,'#788575');f.window(u,4.85,.7,.72,b.trim,'#6b7869');for(let du=-.42;du<.45;du+=.17)f.panel(u+du,2.55,.52,.022,1.7,.03,'#6a7565',true);yield;}
   const u=f.len*.5,r=stairs(f,u,2.0,.65,.5,true);door(f,u,r,1.0,2.4);canopy(f,u,r+2.65,2.0);
  }else{
   // Hidden elevations: deliberately low-detail estimated openings.
   if(b.height>2&&f.len>6){f.window(f.len*.35,1.65,.9,1.15,b.trim,'#6b7b67');door(f,f.len*.72,0,.8,2.0);}yield;
  }
 }
 return {a,kind,normal,handles,detail,stairs,door,balcony,canopy,angle};
}
