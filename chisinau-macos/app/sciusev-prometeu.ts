import * as T from 'three';
import catalog from '../data/sciusev-prometeu-buildings.json';
import realm from '../data/sciusev-prometeu.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';
/** Own geometry; September 2025 street elevations, satellite roofs, mapped plans.
 * Unseen courtyard details and exact heights remain estimates. */
export function createSciusevPrometeu(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog as unknown as PhotoBuilding[],'Șciusev · Prometeu corpuri');
 const m=streetMesh(scene,'Prometeu · detalii',ground,loaded),a=photoArchitecture(m);
 const l=landscapeLayer(scene,'Prometeu · curți și trotuare',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 // Street-visible historic entrance has a small pointed roof above an arched bay.
 m.job('Prometeu · intrare istorică',streetRect(-919,639,7,7),[],function*(){
  const y=ground(-919,636)+.12,f=m.facade([-916.4,636.1],[-923,636.1],y);
  a.arch(f,2.1,.2,1.55,3.2,y,'#455b50','#bcc3a8');
  const g=new T.ConeGeometry(2.45,3.7,4);g.rotateY(Math.PI/4);g.translate(-918.5,y+6.35,638.5);m.put(g,'#704c43');
  for(let u=4.1;u<6.3;u+=1.4){for(let v=-.45;v<=.45;v+=.22)f.panel(u+v,2.0,.6,.027,2.3,.035,'#52614d',true);yield;}
  // Shallow approach steps terminate against the building, away from the gate.
  const n=4;for(let k=0;k<n;k++){const p=f.at(2.1,.25+(k+.5)*.28),top=ground(...p)+.045+(n-k)*.12;m.box(p[0],top-.11,p[1],1.85,.22,.29,'#9e9d89',false,true);}
 });
 // Ivy-covered green metal boundary, with a real gap occupied by the interactive gate.
 for(const[x0,x1]of[[-910.3,-881],[-938,-932]])m.job('gard verde și iederă',streetRect((x0+x1)/2,636,x1-x0,3),[],function*(){
  for(let x=x0;x<x1;x+=1.5){const y=ground(x,636),w=Math.min(1.5,x1-x);m.box(x+w/2,y+1.03,636,w,2.06,.12,'#547954',false,true);
   for(let d=.15;d<w;d+=.26)m.box(x+d,y+1.03,635.91,.045,2.06,.08,'#77916b',true);
   const h=2.5+.9*(.5+.5*Math.sin(x*1.7)),g=new T.IcosahedronGeometry(1,1);g.scale(w*.7,h*.47,.75);g.translate(x+w/2,y+h*.73,636.1);m.put(g,'#4e6e3d');yield;}
 });
 m.job('Prometeu · coronament iederă',streetRect(-912,640,5,5),[],function*(){const y=ground(-912,640);for(let k=0;k<5;k++){const g=new T.IcosahedronGeometry(1.4,1);g.scale(1,1.6,.75);g.translate(-911.7,y+2+k*1.5,640);m.put(g,k%2?'#637f43':'#4e6e3d');yield;}});
 // Stere4: mint-coloured framing, set back from the pavement behind iron fencing.
 const stere=catalog.find(b=>b.id==='w895149760')!;
 m.job('Stere4 · ancadramente',stere.p as XY[],[],function*(){const y=ground(...stere.anchor as XY)+.12;
  for(const f of a.faces(stere.p as XY[],y)){const p=f.at(f.len/2),q=f.at(f.len/2,1);if(q[0]-p[0]<.8||f.len<2.5)continue;
   for(let yy=3;yy<14.8;yy+=2.96)f.panel(f.len/2,yy,.26,f.len,.22,.2,'#93bdb0');
   for(const u of[.15,f.len-.15])f.panel(u,7.4,.27,.28,14.8,.2,'#93bdb0');yield;}
 });
 for(const[z0,z1]of[[671,689],[692,707]])m.job('Stere · împrejmuire',streetRect(-870.6,(z0+z1)/2,1,z1-z0),[],function*(){
  const y=ground(-870.6,z0);yield* a.fence([-870.6,z0],[-870.6,z1],y+.3,1.35);
  m.box(-870.6,y+.15,(z0+z1)/2,.20,.30,z1-z0,'#a6a38c',false,true);
  // A continuous collider follows the rails, not the open gateway.
  m.box(-870.6,y+.92,(z0+z1)/2,.07,1.3,z1-z0,'#574c40',true,true);
 });
 // Chapel roof silhouette is visible from above; concealed ornament is not asserted.
 m.job('Capelă · acoperiș',streetRect(-911.5,683.5,6,7),[],function*(){const y=ground(-911.5,677.8)+.12;const drum=new T.CylinderGeometry(1.15,1.3,1.5,10);drum.translate(-911.5,y+7,683.5);m.put(drum,'#bdb698');const roof=new T.ConeGeometry(1.75,3,10);roof.translate(-911.5,y+9.2,683.5);m.put(roof,'#657d60');m.box(-911.5,y+11.1,683.5,.08,1.1,.08,'#9e9261');m.box(-911.5,y+11.3,683.5,.58,.07,.07,'#9e9261');yield;});
 for(const[x,z,h,r]of realm.trees)m.job('arbore',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z);const trunk=new T.CylinderGeometry(.10,.16,h*.55,7);trunk.translate(x,y+h*.275,z);m.put(trunk,'#706d55',false,true);for(const[dx,dy,rr]of[[0,.7,r],[-r*.35,.8,r*.75],[r*.3,.9,r*.65]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,h<4?2:1.2,1);g.translate(x+dx,y+h*dy,z);m.put(g,'#68814e');yield;}});
 for(const[x,z]of[[-910,631.9],[-870,685]])m.job('stâlp utilități',streetRect(x,z,.6,.6),[],function*(){const y=ground(x,z);m.box(x,y+4.3,z,.25,8.6,.25,'#9b9e8c',false,true);m.box(x,y+5,z,.35,.55,.3,'#969c88');m.beam(new T.Vector3(x,y+7.5,z),new T.Vector3(x+1.4,y+8,z),.05,'#6b7669');m.box(x+1.4,y+8,z,.48,.12,.23,'#747b69');yield;});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
