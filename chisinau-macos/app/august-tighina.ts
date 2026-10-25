import * as T from 'three';
import realm from '../data/august-tighina.json';
import catalog from '../data/august-tighina-buildings.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {photoArchitecture} from './photo-architecture';
import type {XY} from './city-layout';

/** One complete frontage block; estimates are recorded in the source manifest.
 * All geometry shares the existing staged build, readiness and collider lifecycle. */
export function createAugustTighina(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'31 August · Bulgară–Tighina',ground,loaded),a=photoArchitecture(m);
 const l=landscapeLayer(scene,'Bulgară–Tighina · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const infill=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!['lara','army','embassy57'].includes(b.style)) as PhotoBuilding[],'Bulgară–Tighina · fronturi');
 const {box,solid,put,beam}=m,iron='#435044',gold='#a99957';
 const lara=catalog.find(b=>b.style==='lara')!;
 m.job(lara.title,lara.p as XY[],[Number(lara.id.slice(1))],function*(){
  const y=ground(1042,310)+.12;
  for(const mass of lara.masses??[{p:lara.p,height:lara.height,levels:lara.levels}]){
   solid(mass.p as XY[],mass.height+6,y-6,lara.wall);solid(mass.p as XY[],.22,y+mass.height,'#859080');yield;
  }
  for(const f of a.faces(lara.p as XY[],y)){
   const mid=f.at(f.len/2),out=f.at(f.len/2,1),street=out[0]<mid[0]-.7||out[1]>mid[1]+.7;
   const levels=mid[0]<1030?(mid[1]<247?5:mid[1]<272?6:8):8,h=levels===5?17.94:levels===6?21.16:27.6;
   const bays=Math.max(1,Math.round(f.len/3.0)),width=f.len/bays;
   const recessed=(out[0]<mid[0]-.8&&((mid[0]<1020&&mid[0]>1008.7)||(mid[0]>1063.2&&mid[0]<1066)))
    ||(out[0]>mid[0]+.8&&((mid[0]>1020&&mid[0]<1023)||(mid[0]>1075&&mid[0]<1078.4)))
    ||(f.len>3.8&&f.len<6.5&&Math.abs(out[1]-mid[1])>.75&&mid[1]<306);
   if(recessed)f.panel(f.len/2,(h+4.2)/2,.065,f.len,h-4.2,.13,'#bcb99e');
   // The curved footprint carries continuous gold-framed bay glazing.
   f.panel(f.len/2,2.13,.07,f.len,4.05,.14,'#b6ae92');
   if(f.len>.8){
    for(let j=0;j<bays;j++){
     const u=(j+.5)*width,w=Math.max(.45,width-.22);
     f.panel(u,2.03,.19,w,2.94,.025,'#567070',false,1);
     for(const d of[-1,1])f.panel(u+d*w/2,2.03,.25,.065,3.04,.08,gold);
     f.panel(u,2.50,.27,w,.06,.08,gold);yield;
    }
    for(let row=0;row<levels-1;row++){
     const hh=5.35+row*3.22;
     for(let j=0;j<bays;j++){
      const u=(j+.5)*width,w=recessed?Math.min(1.25,width*.45):Math.max(.4,width-(f.len<3?.15:.55)),frame=recessed?'#c3c8b6':gold;
      f.panel(u,hh,recessed?.20:.10,w,2.11,.025,'#566c6c',false,1);
      for(const d of[-1,1])f.panel(u+d*w/2,hh,recessed?.26:.16,.055,2.18,.065,frame);
      f.panel(u,hh,recessed?.27:.17,.045,2.11,.075,frame);
      if(f.len>5&&j%3===1)f.panel(u+width*.43,hh,.19,.09,2.11,.08,'#b8bda8',true);
     }
     if(!recessed)f.panel(f.len/2,hh+1.47,.16,f.len+.02,.72,.32,lara.wall);yield;
    }
   }
   if(f.len>6){
    for(const u of[.25,f.len-.25]){f.panel(u,h/2,.16,.50,h,.32,'#b8ae87');for(let yy=4.2;yy<h;yy+=3.22)f.panel(u,yy,.34,.52,.085,.07,'#d0cbbb');}
   }
   a.cornice(f,h,'#b4bdab');
   if(street&&mid[1]>307&&f.len>6){
    // The tall central glazed bay and its small crown identify the main corner.
    f.panel(f.len/2,15.25,.33,f.len*.65,22,.025,'#61756e',false,1);
    for(let u=f.len*.175;u<=f.len*.825;u+=.95)f.panel(u,15.25,.40,.055,22.1,.08,gold);
    for(let yy=4.3;yy<27;yy+=3.22)f.panel(f.len/2,yy,.41,f.len*.65,.07,.08,gold);
    f.label('LARA CITY',f.len/2,26.6,.53,'#ac9d65',.54);
    const q=f.at(f.len/2,-1.0),g=new T.CylinderGeometry(f.len*.35,f.len*.35,1.5,20);g.translate(q[0],y+h+.75,q[1]);put(g,'#8e9d8b');
   }
   yield;
  }
 });
 const army=catalog.find(b=>b.style==='army')!;
 m.job(army.title,army.p as XY[],[Number(army.id.slice(1))],function*(){
  const y=ground(1171,264)+.12+1.12,p=army.p as XY[],h=13.8;
  // Main hall plus two lower side wings: an open forecourt, not a filled box.
  solid(p,9.35+5,y-5,'#b9bca9');solid(p,.18,y+9.35,'#7e8878');
  solid(streetRect(1156.5,263.3,13.0,31.6),4.45,y+9.35,'#c6c7b5');
  solid(streetRect(1156.5,263.3,13.2,31.8),.20,y+h,'#899380');yield;
  for(const f of a.faces(p,y)){
   const mid=f.at(f.len/2),q=f.at(f.len/2,1),front=q[0]>mid[0]+.85&&mid[0]>1162&&mid[0]<1164;
   const hh=front?h:9.35;
   f.panel(f.len/2,.25,.10,f.len,.5,.2,'#9ba08c');a.cornice(f,hh,'#c6c9b7');
   if(front){
    const n=5,bw=f.len/n;
    for(let row=0;row<3;row++)for(let j=0;j<n;j++){
     const u=(j+.5)*bw;
     if(row===0&&j===2)continue;
     f.window(u,1.7+row*3.62,1.6,row===0?2.7:1.85,'#bfc6b4','#645b40');yield;
    }
    for(const u of[bw,bw*2,bw*3,bw*4]){
     const pt=f.at(u,.62);box(pt[0],y+5.35,pt[1],.82,10.5,.66,'#c9cdbc',false,true);
     box(pt[0],y+.16,pt[1],1.04,.30,.94,'#bcc3b0',false,true);
     f.panel(u,10.5,.60,1.2,.32,1.20,gold);
    }
    a.door(f,f.len/2,3.05,2.25,'#896d40');a.arch(f,f.len/2,3.80,2.25,1.80,y,'#536358','#c0c5b1');
    for(const uu of[bw*1.5,bw*2.5,bw*3.5])for(const yy of[4.65,8.05]){
     const pts=[];for(let k=0;k<=12;k++){const d=(k/12-.5)*2.2,pt=f.at(uu+d,.40);pts.push(new T.Vector3(pt[0],y+yy-.46*Math.sin(Math.PI*k/12),pt[1]));}
     const g=new T.TubeGeometry(new T.CatmullRomCurve3(pts),12,.055,5,false);put(g,gold,true);
    }
    f.panel(f.len/2,12.32,.10,f.len*.73,1.24,.20,'#b6beaa');
    for(let u=f.len*.15;u<f.len*.85;u+=.7)f.panel(u,12.32,.27,.15,1.10,.20,'#d0d0bc',true);
   }else if(f.len>3){yield* a.windows(f,2,9.0,Math.max(1,Math.round(f.len/4.3)),2.3,'#c3c8b5','#655f46');}
   for(let yy=.7;yy<hh-.6;yy+=.59){f.panel(f.len/2,yy,.055,f.len,.018,.025,'#a3ae9b',true);yield;}
  }
  // Broad photographed entrance stairs stay within the recessed courtyard.
  const low=y-1.12;
  for(let k=0;k<8;k++)box(1170.9-(k+.5)*.48,low+(k+1)*.14-.18,263.4,.48,.36,21.0,'#6d7970',false,true);
  box(1165.15,y-.16,263.4,3.85,.32,21.0,'#7f8a79',false,true);
 });
 const embassy=catalog.find(b=>b.style==='embassy57')!;
 m.job(embassy.title,embassy.p as XY[],[Number(embassy.id.slice(1))],function*(){
  const y=ground(1079,333)+.12,h=6.2,roof='#735148';
  solid(embassy.p as XY[],h+4,y-4,'#a6a18b');a.roof(1079.6,343.1,14.9,16.0,y+h,3.6,roof);yield;
  for(const f of a.faces(embassy.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]<p[1]-.75;
   a.cornice(f,h,'#bdbdaa');
   if(f.len>2.5)for(let u=1.5;u<f.len;u+=3.0){
    a.arch(f,u,1.5,1.75,3.6,y,'#53615a','#c4c2ad');
    if(front)for(let v=-.7;v<=.7;v+=.23)f.panel(u+v,3.1,.53,.025,2.8,.025,iron,true);yield;
   }
   // Small rough stone joints are subordinate to the facade, with opaque depth.
   for(let yy=.4;yy<6;yy+=.46)for(let u=.2;u<f.len;u+=.62){f.panel(u+(Math.round(yy/.46)%2)*.18,yy,.07,.23,.022,.025,'#8b937f',true);if(Math.round(u/.62)%10===0)yield;}
  }
  const cx=1082.6,cz=337.2,tower=new T.CylinderGeometry(2.30,2.30,4.1,8);tower.translate(cx,y+6.25,cz);put(tower,'#aaa58f');
  const crown=new T.ConeGeometry(2.75,3.15,8);crown.rotateY(Math.PI/8);crown.translate(cx,y+9.875,cz);put(crown,roof);
  for(const angle of[-Math.PI/4,0,Math.PI/4]){
   const x=cx+Math.sin(angle)*2.2,z=cz-Math.cos(angle)*2.2;
   const f=m.facade([x+.55*Math.cos(angle),z+.55*Math.sin(angle)],[x-.55*Math.cos(angle),z-.55*Math.sin(angle)],y);
   a.arch(f,.55,5.1,.82,2.65,y,'#4c564c','#c0bda5');
  }
  // The frontage wall keeps the two photographed openings clear.
  for(const[x,w]of[[1070.6,7.4],[1078.3,3.6],[1086.4,3.6]]){box(x,y+1.30,332.55,w,2.6,.35,'#a3a08a',false,true);box(x,y+2.65,332.55,w+.15,.16,.56,roof);}
  for(const[x,w]of[[1075.45,1.7],[1082.35,4.1]]){
   const arch=new T.TorusGeometry(w/2,.16,5,20,Math.PI);arch.translate(x,y+2.0,332.55);put(arch,'#c4c3b0');
  }
 });
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
  for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.12:.035),true);
 },c.coverage);
 for(let k=0;k<realm.separators.length;k+=10){const group=realm.separators.slice(k,k+10);m.job('pistă protejată '+k,group as XY[],[],function*(){
  for(const[x,z]of group){const y=ground(x,z)+.035;box(x,y+.037,z,1.65,.075,.24,'#37453d');for(const d of[-1,1])box(x+d*.60,y+.079,z,.27,.012,.20,'#b3a04c',true);box(x,y+.26,z,.065,.45,.065,'#354139',true);for(const h of[.24,.39])box(x,y+h,z,.07,.07,.07,'#c4b052',true);yield;}
 });}
 // Only photo-supported small objects; public paths retain continuous clearance.
 m.job('Lara · acces comercial',streetRect(1004,235,8,8),[],function*(){
  const y=ground(1003.6,235)+.12;
  for(let k=0;k<7;k++)box(1003.6+(k+.5)*.40,y+(k+1)*.14-.20,235,.40,.40,4.6,'#919a8b',false,true);
  box(1006.93,y+.82,235,1.06,.32,4.6,'#919a8b',false,true);
  const f=m.facade([1007.47,231.25],[1007.47,238.75],y);
  f.panel(3.75,2.45,.21,1.85,2.95,.025,'#4b625f',false,1);
  for(const u of[2.825,3.75,4.675])f.panel(u,2.45,.26,.07,3.02,.10,gold);
  f.label('MARKET',3.75,4.03,.65,'#b79d62',.30);
  for(const z of[233,237]){for(const x of[1003.6,1006.4]){const h=y+(x-1003.6)/2.8*.98;beam(new T.Vector3(x,h,z),new T.Vector3(x,h+.9,z),.028,'#a8b6a7');}beam(new T.Vector3(1003.6,y+.9,z),new T.Vector3(1006.4,y+1.88,z),.028,'#a8b6a7');}
 });
 l.job('Curtea Lara · grădină',1042,270,function*(){
  for(const[x,z]of[[1031,260],[1054,260],[1032,277],[1054,277],[1043,285]]){const y=ground(x,z)+.12;l.shrub(x,y,z,.65,.58,.65,'#4c6744');yield;}
  // The photographed small pool follows its independently mapped curved outline.
  l.edging(realm.pool,.13,.18,'#9cadac');
 });
 l.job('31 August · colectare deșeuri',1116.43,326.546,function*(){
  const x=1116.43,z=326.546,y=ground(x,z)+.12;
  for(const dx of[-.6,.6]){l.box(x+dx,y+.55,z,.95,1.1,.75,'#5f735d',true,true);l.box(x+dx,y+1.14,z,1.02,.10,.83,'#465b48',true);for(const side of[-1,1])l.cylinder(x+dx+side*.31,y+.08,z+.22,.075,.075,.14,'#344135',true,7);yield;}
 });
 l.job('31 August 59 · curte',1036,353,function*(){
  // Playground/benches are visible in apt59_12; positions are estimates inside its mapped courtyard.
  const x=1035,z=354,y=ground(x,z)+.12;
  for(const dx of[-.62,.62])for(const dz of[-.62,.62])l.box(x+dx,y+.95,z+dz,.075,1.9,.075,'#9a5141',true,true);
  l.box(x,y+1.30,z,1.36,.12,1.36,'#9d8662',false,true);
  for(let k=0;k<7;k++)l.box(x-.83,y+(k+1)*.18,z,.19,.08,1.0,'#8a9c98',true,true);
  const slide=new T.BufferGeometry();slide.setAttribute('position',new T.Float32BufferAttribute([x+.6,y+1.38,z-.40,x+.6,y+1.38,z+.40,x+3.4,y+.14,z+.40,x+.6,y+1.38,z-.40,x+3.4,y+.14,z+.40,x+3.4,y+.14,z-.40],3));slide.computeVertexNormals();l.put(slide,'#b8993c',0,false,true);
  for(const dz of[-.44,.44])l.beam(new T.Vector3(x+.6,y+1.60,z+dz),new T.Vector3(x+3.4,y+.32,z+dz),.04,'#b8993c');yield;
  for(const[bx,bz]of[[1022,349],[1048,361]]){
   const by=ground(bx,bz)+.12;
   for(const dx of[-.75,.75])l.box(bx+dx,by+.23,bz,.07,.46,.50,'#4b574c',true,true);
   for(let k=0;k<4;k++)l.box(bx,by+.47,bz-.24+k*.16,2,.05,.13,'#8d7350',true,true);
   for(let k=0;k<3;k++)l.box(bx,by+.67+k*.15,bz+.30,2,.12,.06,'#8d7350',true);yield;
  }
  const bx=1046,bz=360.8,by=ground(bx,bz)+.12;l.box(bx,by+.44,bz,.42,.88,.42,'#806d4c',true,true);l.box(bx,by+.9,bz,.46,.05,.46,'#4e5d4e',true);
 });
 l.job('Tighina · stația 31 August',1193.88,268.8,function*(){
  const x=1196.5,z=268.8,y=ground(x,z)+.12,c='#4d5145';
  // Mapped stop location; the municipal photograph supplies the shelter family.
  // Open glazing is represented by its frame, avoiding an opaque pedestrian wall.
  for(const dx of[-.8,.8])for(const dz of[-2.1,2.1])l.box(x+dx,y+1.32,z+dz,.065,2.64,.065,c,false,true);
  l.box(x,y+2.68,z,2.1,.17,4.65,c);l.box(x-.77,y+1.22,z+1.8,.09,1.9,.55,'#737767',true,true);
  for(const dz of[-1,1]){l.box(x-.4,y+.43,z+dz*.85,.48,.08,1.35,'#826f4c',true,true);l.box(x-.65,y+.72,z+dz*.85,.07,.5,1.35,'#826f4c',true);}
  l.box(x+.72,y+2.30,z-1.62,.035,.34,.38,'#476980',true);
 });
 const layers=[m,l,infill];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),
  get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
