import * as T from 'three';
import realm from '../data/sciusev-west.json';
import catalog from '../data/sciusev-west-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** Complete Șciusev block, Armenească–Bulgară. See the evidence manifest for
 * photographic dates, estimated rear elevations and the unmapped 33B body. */
export function createSciusevWest(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Armenească–Bulgară',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('west')),regular=catalog.filter(b=>!b.style.startsWith('west'));
 const bodies=createPhotoFrontages(scene,ground,loaded,regular as PhotoBuilding[],'Șciusev vest · curți complete');
 const l=landscapeLayer(scene,'Șciusev vest · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const grilles=(f:Face,u:number,yy:number,w=1.25,h=2)=>{for(let x=-w/2;x<=w/2;x+=.20)f.panel(u+x,yy,.51,.025,h,.035,'#536055',true);for(const dh of[-h*.38,h*.38])f.panel(u,yy+dh,.53,w,.025,.035,'#536055',true);};
 function sideStair(f:Face,doorU:number,rise:number,run:number,side:number){
  const p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]),v=1.0,foot=f.at(doorU+side*(run+.8),v),low=ground(...foot)+.045,top=low+rise,n=Math.ceil(rise/.13),w=1.3;
  const q=f.at(doorU,v);m.box(q[0],top-.11,q[1],1.6,.22,w,'#9c9d8b',false,true,angle);
  for(let k=0;k<n;k++){const u=doorU+side*(.8+(k+.5)*run/n),p=f.at(u,v),h=top-(k+1)*rise/n;m.box(p[0],h-.11,p[1],run/n+.015,.22,w,'#929583',false,true,angle);}
  const start=f.at(doorU+side*.8,v+w/2),end=f.at(doorU+side*(run+.8),v+w/2);m.beam(new T.Vector3(start[0],top+.90,start[1]),new T.Vector3(end[0],low+.90,end[1]),.035,'#4a564b');
  for(let k=0;k<=n;k+=2){const t=k/n,p=f.at(doorU+side*(.8+t*run),v+w/2),h=top-t*rise;m.box(p[0],h+.45,p[1],.035,.90,.035,'#4a564b');}
  return top-f.y;
 }
 for(const b of custom)m.job(b.title,b.p as XY[],b.id.startsWith('w')?[Number(b.id.slice(1))]:[],function*(){
  const y=ground(...b.anchor as XY)+.12,h=b.height,xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);
  m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;
  a.roof((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2,Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs),y+h+.08,b.roofRise,b.roof);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<1.7;
   f.panel(f.len/2,.37,.07,f.len,.74,.14,'#878a7c');if(!(front&&b.style==='west31'))a.cornice(f,h,b.trim);
   if(!front||f.len<4){if(f.len>2.5)yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4)),2.15,b.trim,'#6b695a');continue;}
   if(b.style==='west27'){
    for(let row=0;row<2;row++)for(let k=0;k<5;k++){const u=(k+.5)*f.len/5;f.window(u,2.35+row*4.05,1.45,2.35,b.trim,k%2?'#927567':'#b3b7a8');yield;}
    for(let yy=.9;yy<4.5;yy+=.48)f.panel(f.len/2,yy,.11,f.len,.065,.22,'#939486',true);
    f.panel(f.len/2,4.7,.16,f.len,.22,.34,b.trim);
    for(const u of[f.len*.10,f.len*.90]){for(const dx of[-1.12,1.12])f.panel(u+dx,6.60,.23,.26,3.9,.42,b.trim);a.pediment(f,u,h+.14,3.65,.9,y,b.trim);}
   }else if(b.style==='west31'){
    const unit=f.len/22.1,door=7.5*unit;
    // TVR low wing and the taller pair of arched windows; 33A occupies the west end.
    for(const u of[1.7,3.7,5.7])f.window(u*unit,3.6,1.12,2.5,'#c7c5b4','#b7bcae');
    const rise=sideStair(f,door,1.1,2.9,-1);sideStair(f,door,1.1,2.9,1);
    f.panel(door,rise+1.42,.38,2.1,2.84,.05,'#a9b8b0');f.panel(door,3.35,.17,2.5,4.4,.27,'#a98d86');f.window(door,rise+1.42,1.9,2.75,'#c8ccbf','#bbc3b5');
    f.panel(4.5*unit,h,.24,9*unit,.20,.48,b.trim);
    f.panel(12.45*unit,6.4,.09,7.0*unit,2.3,.18,b.wall);f.panel(12.45*unit,7.5,.24,7.15*unit,.20,.48,b.trim);
    for(const u of[10.9,14.0]){a.arch(f,u*unit,2.3,2.45,4.45,y,'#536b6d','#8c7960');f.panel(u*unit,4.3,.48,.065,4.0,.065,'#75634e',true);f.panel(u*unit,5.50,.48,2.40,.065,.065,'#75634e',true);for(const t of[Math.PI/4,Math.PI*3/4]){const p=f.at(u*unit,.48),q=f.at(u*unit+1.18*Math.cos(t),.48);m.beam(new T.Vector3(p[0],y+5.50,p[1]),new T.Vector3(q[0],y+5.50+1.18*Math.sin(t),q[1]),.032,'#75634e');}yield;}
    for(let yy=1.1;yy<7.2;yy+=.45)f.panel(12.45*unit,yy,.20,6.85*unit,.025,.025,'#9e9b88',true);
    f.panel(12.45*unit,1.54,.39,6.5*unit,.9,.06,'#c2c7b7');f.label('TVR MOLDOVA',12.45*unit,1.42,.43,'#596f87',.44);
    f.panel(door,5.05,.38,4.2,.52,.10,'#c4c6b6');f.label('STUDIOUL CHISINAU',door,4.97,.20,'#46564b',.45);
    for(const u of[6.2,8.9]){f.panel(u*unit,5.36,.46,.68,.5,.55,'#aeb5a7');yield;}
    const start=16.05*unit;f.panel((start+f.len)/2,2.9,.08,f.len-start,5.65,.16,'#c5b99e');f.panel((start+f.len)/2,h,.25,f.len-start,.20,.48,b.trim);
    for(const u of[16.8,18.1,19.4]){a.arch(f,u*unit,1.1,.98,3.45,y,'#566967','#8a5048');f.panel(u*unit,4.72,.3,1.15,.18,.4,b.trim);}
    const entry=21.25*unit;a.arch(f,entry,.55,1.15,3.4,y,'#854e42',b.trim);a.arch(f,entry,h-.05,1.65,.825,y,'#c5b99e',b.trim,0);
    const angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);for(let k=0;k<4;k++){const v=1.35-k*.28,p=f.at(entry,v),top=y+(k+1)*.1375;m.box(p[0],top-.12,p[1],1.5,.24,.28,'#989989',false,true,angle);}
   }else if(b.style==='west30'){
    f.panel(f.len/2,.75,.1,f.len,1.5,.2,'#a56453');const door=1.25,rise=sideStair(f,door,1.23,3.0,1);
    a.arch(f,door,rise,1.8,3.85,y,'#748477',b.trim);a.arch(f,door,h-.25,2.8,1.4,y,b.wall,b.trim,0);
    for(let k=0;k<4;k++){const u=3.7+k*(f.len-4.7)/3;f.window(u,3.75,1.25,2.2,b.trim,'#b9c1b0');f.panel(u,2.29,.33,1.5,.35,.17,b.trim);f.panel(u,.68,.3,.60,.70,.025,'#57776b');yield;}
   }else if(b.style==='west32'){
    const rise=sideStair(f,1.3,.52,1.35,1);a.arch(f,1.3,rise,1.5,3.6,y,'#75614e',b.trim);a.arch(f,1.3,h-.1,2.8,1.4,y,b.wall,b.trim,0);
    f.panel(1.3,3.9,.75,2.35,.10,1.45,'#67786b');
    for(const u of[4.2,7.3,10.2]){f.window(u,2.6,1.38,2.35,b.trim,'#888e78');grilles(f,u,2.6,1.35,2.2);for(const dx of[-1,1])f.panel(u+dx,2.7,.14,.20,4.0,.28,'#baa096');yield;}
   }else if(b.style==='west26'){
    f.panel(2.7,1.9,.26,4.7,3.6,.04,'#a8b5ac');a.door(f,6.9,2.9,1.15,'#985946');f.window(f.len-1.2,2.05,.72,1.8,'#bfc6ba','#a8afa1');
    a.pediment(f,f.len/2,h,f.len,2.2,y,'#8d684b');for(let yy=h+.25;yy<h+1.8;yy+=.25)f.panel(f.len/2,yy,.46,(h+2.2-yy)/2.2*f.len,.025,.02,'#76573f',true);
   }else if(b.style==='west18'){
    // Prefer the April2025 simple yellow frontage to a conflicting historic photo.
    for(let k=0;k<7;k++){const u=(k+.5)*f.len/7;if(k===3){a.door(f,u,2.9,1.15,'#535c50');continue;}f.window(u,2.15,1.55,1.95,'#b6b397','#78846e');grilles(f,u,2.15,1.5,1.85);yield;}
   }else if(b.style==='west23'){
    const n=7;for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(k===3)a.door(f,u,3.2,1.3,'#80644d');else f.window(u,2.6,1.18,2.55,b.trim,'#8c765d');for(const du of[-.85,.85])f.panel(u+du,2.4,.14,.16,4.5,.28,b.trim);yield;}
   }else if(b.style==='west33b'){
    a.door(f,1.3,3.2,1.35,'#777c6b');a.arch(f,1.3,h-.2,2.5,1.25,y,b.wall,b.trim,0);f.panel(1.3,3.7,.8,2.6,.12,1.5,'#7e8273');
    for(const u of[3.45,5.2]){a.arch(f,u,1.0,1.05,3.3,y,'#63746d','#8b6257');for(const yy of[.8,4.5])f.panel(u,yy,.32,1.35,.22,.32,b.trim);yield;}
   }else if(b.style==='west29'||b.style==='west29b'){
    const count=b.style==='west29'?3:3;for(let k=0;k<count;k++){const u=(k+.5)*f.len/count;if(k===0&&b.style==='west29')a.door(f,u,3.1,1.35,'#96513f');else f.window(u,2.5,1.25,2.4,b.trim,'#886b58');yield;}
    for(const u of[.3,f.len-.3])f.panel(u,h-.4,.17,.48,1.3,.35,b.trim);
   }else{yield* a.windows(f,1,h,Math.max(3,Math.round(f.len/3.8)),2.5,b.trim,'#88705e');for(let u=1.8;u<f.len;u+=3.8)grilles(f,u,2.5);}
   yield;
  }
 });
 const walls:[XY,XY,string,number][]=[[[814.3,607],[815.5,607],'#a9a38f',2],[[819.7,607],[824.2,607],'#a9a38f',2],[[956.3,607],[957.5,607],'#b5ad91',2.1],[[962,607],[965.3,607],'#b5ad91',2.1],[[924.4,630],[925.4,630],'#a4a18b',2],[[929.9,630],[932.5,630],'#a4a18b',2],[[823.8,629],[830.8,629],'#aaa896',2]];
 for(const[p,q,col,h]of walls)m.job('zid curte',[p,q],[],function*(){const n=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/2);for(let k=0;k<n;k++){const x=p[0]+(q[0]-p[0])*(k+.5)/n,z=p[1]+(q[1]-p[1])*(k+.5)/n;m.box(x,ground(x,z)+h/2,z,(q[0]-p[0])/n,h,.22,col,false,true);yield;}});
 // Ornate white courtyard portals observed opposite TVR. No solid lintel closes
 // their openings; the existing gate subsystem supplies movable leaves.
 m.job('portaluri albe',streetRect(857,607,12,2),[],function*(){for(const[x,h]of[[851.8,3.3],[855.2,3.3],[857.2,4.4],[862.3,4.4]]){const y=ground(x,607);m.box(x,y+h/2,607,.44,h,.50,'#c3c2af',false,true);m.box(x,y+h,607,.72,.18,.72,'#d0ccba');yield;}});
 for(const[x,z,h]of realm.trees)m.job('arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.18,.32,h*.59,8);trunk.translate(x,y+h*.295,z);m.put(trunk,'#656951',false,true);const base=new T.CylinderGeometry(.33,.33,1.0,8);base.translate(x,y+.5,z);m.put(base,'#c4c4ae');for(const[dx,dy,dz,r]of[[0,.68,0,2.8],[-1.6,.63,.5,2.1],[1.5,.72,-.4,2.2],[0,.90,0,1.9]]){const g=new T.IcosahedronGeometry(r,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#617c48');yield;}});
 const poles:XY[]=[[793.866,623.879],[822,612.2],[853,611.7],[889,612.2],[927,612.3],[960,612.2],[984.511,611.2]];
 for(const[x,z]of poles)m.job('stâlp și lampă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.9,z,.17,7.8,.17,'#93978a',false,true);m.beam(new T.Vector3(x,y+7.1,z),new T.Vector3(x,y+7.6,z+1.6),.045,'#697664');m.box(x,y+7.6,z+1.6,.25,.14,.6,'#b0b4a5');yield;});
 for(let i=1;i<poles.length;i++)m.job('fire aeriene',[poles[i-1],poles[i]],[],function*(){const p=poles[i-1],q=poles[i];for(let wire=0;wire<5;wire++)for(let k=0;k<4;k++){const point=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7.15-.25*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+wire*.13);m.beam(point(k/4),point((k+1)/4),.012,'#4a574a');yield;}});
 m.job('container lângă27',streetRect(914.7,625.5,2,1.5),[],function*(){const y=ground(914.7,625.5);m.box(914.7,y+.6,625.5,1.45,1.1,.78,'#929a8c',false,true);m.box(914.7,y+1.18,625.5,1.55,.1,.87,'#697a6b');for(const dx of[-.55,.55])m.box(914.7+dx,y+.10,625.5,.12,.18,.15,'#475849');yield;});
 m.job('coș la Armenească',streetRect(772.037,629.458,1,1),[],function*(){const y=ground(772.037,629.458),g=new T.CylinderGeometry(.28,.24,.7,10);g.translate(772.037,y+.4,629.458);m.put(g,'#6b7968',false,true);yield;});
 for(const[x,z]of[[789.0,625.5],[979.5,610.5]])m.job('indicator trecere',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),f=m.facade([x-.35,z],[x+.35,z],y);m.box(x,y+1.45,z,.05,2.9,.05,'#8d9989',false,true);f.panel(.35,2.62,0,.7,.7,.05,'#3c7193');a.pediment(f,.35,2.38,.56,.48,y,'#c9ccb8');yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
