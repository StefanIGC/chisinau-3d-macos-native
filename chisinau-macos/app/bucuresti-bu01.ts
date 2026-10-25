import * as T from 'three';
import realm from '../data/bucuresti-bu01.json';
import catalog from '../data/bucuresti-bu01-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {bucurestiArchitecture} from './bucuresti-architecture';
import type {XY} from './city-layout';

/** BUC01: Alecsandri–Armenească, both fronts and complete adjoining cadastral bodies.
 * 2020/2026 official ortho + July/September 2025 panoramas. Heights, obscured
 * courts and small dimensions are estimates, never cadastral height claims. */
export function createBucurestiBu01(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const buildings=catalog as unknown as (PhotoBuilding&{nativeIds:number[]})[];
 const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'București BUC01 · corpuri cadastrale');
 const m=streetMesh(scene,'București BUC01 · detalii',ground,loaded),d=bucurestiArchitecture(m,ground),a=d.a;
 const l=landscapeLayer(scene,'București BUC01 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
  const y=ground(...b.anchor as XY)+.12;
  for(const f of a.faces(b.p as XY[],y)){
   if(f.len<1.5)continue;
   if(d.handles(b,f)){yield* d.detail(b,f);continue;}
   // Rear/court openings are conservative approximations. The sheltered upper
   // gallery at 43 is separately supported by the AIRM January 2023 photographs.
   a.cornice(f,b.height,b.trim);
   if(b.style==='historic43'&&d.normal(f)[1]>.8&&f.len>4){
    const n=Math.max(1,Math.round(f.len/3.3));for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,5.8,1.05,1.9,b.trim,'#6c8472');if(i%2===0){const p=f.at(u,.92);m.box(p[0],y+5.9,p[1],.055,3.0,.055,'#658573',true);}yield;}
    d.balcony(f,f.len/2,4.2,f.len,1.05);f.panel(f.len/2,7.42,.65,f.len,.10,1.4,'#718370');
   }else if(b.style==='annex'){
    if(b.height>2&&f.len>9){f.window(f.len*.5,1.65,.8,1.0,b.trim,'#73806b');yield;}
   }else{yield* a.windows(f,b.levels,b.height,Math.max(1,Math.round(f.len/4.2)),1.8,b.trim,'#7b8675');}
   yield;
  }
 });

 // Each tree is individually digitised from the ortho; no regular planting grid.
 // Geometry templates and vertex-colour materials are shared by the staged jobs.
 const crown=new T.IcosahedronGeometry(1,1),trunk=new T.CylinderGeometry(.52,1,1,7),conifer=new T.ConeGeometry(1,1,9);
 const plazaTrees:[[number,number,number,number],[number,number,number,number],[number,number,number,number]]=[[800.0,486.0,6.7,2.25],[799.0,495.0,7.4,2.6],[803.0,497.0,6.4,2.3]];
 for(const [index,[x,z,h,r]]of realm.trees.entries())m.job('arbore individual',streetRect(x,z,r*2,r*2),[],function*(){
  const y=ground(x,z),g=trunk.clone();g.scale(.29,h*.52,.29);g.translate(x,y+h*.26,z);m.put(g,'#767960',false,true);
  for(const [dx,dz,dy,rr]of[[0,0,.62,r],[r*.45,.2,.76,r*.70],[-r*.32,-.35,.83,r*.64],[.2,-.1,.94,r*.43]]){const g=crown.clone();g.scale(rr,rr*(.95+(index%3)*.12),rr*.96);g.rotateY(index*.47);g.translate(x+dx,y+h*dy,z+dz);m.put(g,['#6b8651','#738b52','#64824e'][index%3]);yield;}
 });
 for(const[x,z,h,r]of plazaTrees)m.job('scuar · conifer fotografiat',streetRect(x,z,r*2,r*2),[],function*(){
  const y=ground(x,z),g=trunk.clone();g.scale(.18,h*.65,.18);g.translate(x,y+h*.325,z);m.put(g,'#7a7a60',false,true);
  for(let k=0;k<5;k++){const g=conifer.clone();g.scale(r*(1-k*.17),h*.40,r*(1-k*.17));g.translate(x,y+h*(.32+k*.135),z);m.put(g,k%2?'#78988a':'#6a8b7c');yield;}
 });
 // Three light positions are mapped; pole/arm dimensions and cable heights are estimated.
 for(const[x,z]of realm.poles)m.job('stâlp de iluminat cartografiat',streetRect(x,z,2,2),[],function*(){const y=ground(x,z),sign=z>467?-1:1;
  m.box(x,y+3.85,z,.17,7.7,.17,'#9ba48e',false,true);m.beam(new T.Vector3(x,y+7.3,z),new T.Vector3(x,y+7.6,z+sign*1.7),.045,'#899783');m.box(x,y+7.55,z+sign*1.7,.28,.12,.72,'#c6ccba');yield;
 });
 const signals:[[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[768.8,458.2,Math.PI/2],[783.2,457.7,Math.PI],[768.6,476.0,0],[783.2,476.7,-Math.PI/2]];
 for(const[x,z,rotation]of signals)m.job('Armenească · semafor și indicator',streetRect(x,z,1.5,1.5),[],function*(){const y=ground(x,z);
  m.box(x,y+3.45,z,.20,6.9,.20,'#9da48f',false,true);m.box(x,y+3.2,z,.31,1.05,.26,'#3e4e44',false,false,rotation);
  for(const[i,col]of['#9c5945','#8e8250','#557553'].entries()){const g=new T.CylinderGeometry(.105,.105,.035,12);g.rotateX(Math.PI/2);g.rotateY(rotation);g.translate(x+Math.sin(rotation)*.16,y+3.52-i*.31,z+Math.cos(rotation)*.16);m.put(g,col,true);}
  const f=m.facade([x-.5*Math.cos(rotation),z+.5*Math.sin(rotation)],[x+.5*Math.cos(rotation),z-.5*Math.sin(rotation)],y);
  f.panel(.5,2.1,.13,.63,.68,.04,'#c2c53f');f.panel(.5,2.1,.16,.48,.54,.035,'#537b91');
  const p=f.at(.5,.19),g=new T.BufferGeometry(),points=[[-.19,-.2],[.19,-.2],[0,.21]].map(([u,v])=>{const q=f.at(.5+u,.19);return[q[0],y+2.1+v,q[1]];});g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();m.put(g,'#d8dcc6',true);
  f.panel(.5,2.08,.21,.035,.21,.025,'#476579',true);f.panel(.5,1.97,.21,.19,.028,.025,'#476579',true);
  // Original cable loops; these are visible infrastructure, not collision barriers.
  const loop=new T.TorusGeometry(.28,.018,4,14);loop.rotateY(rotation);loop.translate(x,y+5.1,z);m.put(loop,'#53614f',true);yield;
 });
 for(let x=660;x<805;x+=12)m.job('București · fire aeriene',[[x,465],[Math.min(805,x+12),470]],[],function*(){
  for(const z of[465.8,468.8])m.beam(new T.Vector3(x,ground(x,z)+6.2,z),new T.Vector3(Math.min(805,x+12),ground(Math.min(805,x+12),z)+6.2,z),.014,'#52614c');yield;
 });
 for(const[x,z]of[[683.45,476.5],[696.74,462.7],[768.6,476],[783.2,457.7]])m.job('cablu transversal',[[x,z],[x,467]],[],function*(){m.beam(new T.Vector3(x,ground(x,z)+6.5,z),new T.Vector3(x,ground(x,467)+6.2,467),.012,'#52614c');yield;});

 // Street View July 2025: paired grated drains at the south-west crossing.
 for(const[x,z]of[[768.2,473.5],[768.2,474.3]])m.job('Armenească · gură de scurgere',streetRect(x,z,.55,.66),[],function*(){const y=ground(x,z)+.047;
  m.box(x,y,z,.49,.025,.61,'#596653');for(let dz=-.24;dz<=.24;dz+=.08)m.box(x,y+.018,z+dz,.43,.018,.018,'#929c84',true);yield;
 });
 for(const[x,z]of[[774.3,475.9],[772.2,469.0],[768.3,491.0]])m.job('capac de utilități observat',streetRect(x,z,.8,.8),[],function*(){const g=new T.CylinderGeometry(.30,.30,.018,16);g.translate(x,ground(x,z)+.047,z);m.put(g,'#75806b');yield;});
 // Small dated objects are deliberately kept out of the pedestrian through route.
 for(const[x,z]of[[697.6,476.0],[705.0,476.4],[718.5,476.3]])m.job('43 · jardinieră deschisă',streetRect(x,z,.85,.85),[],function*(){const y=ground(x,z),g=new T.CylinderGeometry(.36,.24,.38,10);g.translate(x,y+.23,z);m.put(g,'#c7cbb8',false,true);const soil=new T.CylinderGeometry(.30,.30,.025,10);soil.translate(x,y+.43,z);m.put(soil,'#77835e');yield;});
 m.job('43 · coș stradal',streetRect(693.7,477.4,.55,.6),[],function*(){const y=ground(693.7,477.4);m.box(693.7,y+.43,477.4,.36,.76,.37,'#a4b0a0',false,true);m.box(693.7,y+.83,477.4,.38,.06,.39,'#586e5c');yield;});

 // The small south-east square: observed features; positions/sizes estimated
 // from the 2020 ortho and July 2025 panorama. No inscription is invented.
 m.job('scuar · stelă de piatră roșie',streetRect(790.5,486.8,2.3,2.3),[],function*(){const x=790.5,z=486.8,y=ground(x,z);
  m.box(x,y+.12,z,1.65,.24,1.25,'#b18b78',false,true);m.box(x,y+1.52,z,.73,2.8,.40,'#a87763',false,true);
  const f=m.facade([x-.36,z-.23],[x+.36,z-.23],y);for(let yy=.55;yy<2.65;yy+=.48){f.panel(.36,yy,.04,.36,.045,.035,'#8f6656',true);f.panel(.36,yy+.11,.04,.045,.28,.035,'#8f6656',true);}yield;
 });
 for(const[x,z,w,d0]of[[798.4,500.1,12.8,.7],[787.3,493.0,.7,9.2],[799.2,481.5,7.6,.7]])m.job('scuar · gard viu',streetRect(x,z,w,d0),[],function*(){const y=ground(x,z);m.box(x,y+.46,z,w,.70,d0,'#66824e',false,true);for(let u=-w/2+.3;u<w/2;u+=.65){const g=crown.clone();g.scale(.48,.42,Math.max(.35,d0*.46));g.translate(x+u,y+.65,z);m.put(g,'#718952');if(Math.round(u*10)%5===0)yield;}yield;});
 for(const[x,z]of[[785.8,477.8],[787.5,478.0],[789.3,478.2]])m.job('scuar · bolard semisferic',streetRect(x,z,.7,.7),[],function*(){const g=new T.SphereGeometry(.31,10,6,0,Math.PI*2,0,Math.PI/2);g.scale(1,.72,1);g.translate(x,ground(x,z)+.04,z);m.put(g,'#b5ad8d',false,true);yield;});
 for(const[x,z]of[[789.2,481.8],[791.0,489.0],[807.5,500.0]])m.job('scuar · vas pentru flori',streetRect(x,z,.9,.9),[],function*(){const y=ground(x,z),g=new T.CylinderGeometry(.40,.25,.42,12);g.translate(x,y+.5,z);m.put(g,'#bdc0a6',false,true);m.box(x,y+.14,z,.35,.28,.35,'#b3b9a0',false,true);const top=new T.CylinderGeometry(.34,.34,.025,12);top.translate(x,y+.72,z);m.put(top,'#728455');yield;});
 // The known west gate at 43 and north gates are owned by courtyard-gates.ts;
 // no static panel is placed behind an interactive leaf.

 const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true,ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
 const replacements=[...ids.map(id=>({id,x:715,z:467,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),...buildings.map((b,i)=>({id:-5000000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))];
 const treeOverrides=[];
 for(let x=662;x<766;x+=5.5)for(const z of[461.4,475.7])treeOverrides.push({x,z,height:0,radius:3.3,texture:0,get ready(){return m.readyNear(x,z,16)&&l.readyNear(x,z,22);}});
 for(const[x,z,h,r]of[...realm.trees,...plazaTrees])treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,16)&&l.readyNear(x,z,22);}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();crown.dispose();trunk.dispose();conifer.dispose();}};
}
