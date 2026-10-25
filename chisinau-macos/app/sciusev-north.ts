import * as T from 'three';
import catalog from '../data/sciusev-north-buildings.json';
import realm from '../data/sciusev-north.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';
export function createSciusevNorth(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog as unknown as PhotoBuilding[],'Șciusev131–133 și119A'),m=streetMesh(scene,'Șciusev · curți nord',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Șciusev131–133 · sol',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+.035,true);},c.coverage);
 // Photo-backed weathered board boundary; actual gate spans stay open.
 const runs:[XY,XY][]=[[[ -1015.22,587.89],[-1018.3,585.3]],[[-1022.3,582],[-1036.5,570.1]],[[-1040,567.2],[-1049.93,558.78]]];
 for(const[p,q]of runs)m.job('gard lemn fotografiat',[p,q],[],function*(){const f=m.facade(p,q,0),angle=Math.atan2(-(q[1]-p[1]),q[0]-p[0]),n=Math.ceil(f.len/.21);
  for(let k=0;k<n;k++){const u=(k+.5)*f.len/n,pt=f.at(u),y=ground(...pt),h=1.80+(k%5)*.026;m.box(pt[0],y+h/2,pt[1],f.len/n-.025,h,.07,k%3?'#747563':'#82806b',true,false,angle);if(k%10===9)yield;}
  for(let u=0;u<f.len;u+=1.4){const w=Math.min(1.4,f.len-u),pt=f.at(u+w/2);m.box(pt[0],ground(...pt)+.7,pt[1],w,.1,.12,'#646d57',false,true,angle);yield;}
  for(let u=0;u<=f.len;u+=2.5){const pt=f.at(u);m.box(pt[0],ground(...pt)+.96,pt[1],.13,1.92,.13,'#727965',false,true);}yield;
 });
 // Opposite street: low cream/pink boundary and piers, with an open access gap.
 for(const[p,q]of[[[-1016.23,562.08],[-1008.23,568.58]],[[-1005.73,570.58],[-997.23,577.48]]]as[XY,XY][])m.job('119A · zid jos',[p,q],[],function*(){const f=m.facade(p,q,0),angle=Math.atan2(-(q[1]-p[1]),q[0]-p[0]),n=Math.ceil(f.len/2.5);for(let k=0;k<n;k++){const pt=f.at((k+.5)*f.len/n),y=ground(...pt);m.box(pt[0],y+.45,pt[1],f.len/n,.9,.25,'#baa690',false,true,angle);m.box(pt[0],y+.96,pt[1],f.len/n,.14,.38,'#ccc5ac',false,false,angle);yield;}for(let k=0;k<=n;k++){const pt=f.at(k*f.len/n),y=ground(...pt);m.box(pt[0],y+.62,pt[1],.38,1.24,.38,'#c8c4aa',false,true);m.box(pt[0],y+1.3,pt[1],.52,.12,.52,'#cbc6ad');}yield;});
 const b=catalog.find(b=>b.id==='w71405852')!;
 m.job('119A · fronton și coșuri',b.p as XY[],[],function*(){const y=ground(...b.anchor as XY)+.12;for(const f of a.faces(b.p as XY[],y)){const p=f.at(f.len/2),q=f.at(f.len/2,1);if((q[0]-p[0])*(-.638)+(q[1]-p[1])*.77>.8&&f.len>15){a.pediment(f,f.len/2,b.height,5.3,1.3,y,'#cfc7ad');yield;}}for(const[x,z]of[[-1004,557],[-995,563]]){m.box(x,y+b.height+1.2,z,.75,1.9,.6,'#956e58',false,true);m.box(x,y+b.height+2.2,z,.89,.15,.75,'#826f59');yield;}});
 for(const[x,z,h,r]of realm.trees)m.job('arbore curte',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),g=new T.CylinderGeometry(.14,.22,h*.55,7);g.translate(x,y+h*.275,z);m.put(g,'#69705a',false,true);for(const[dx,dy,rr]of[[0,.73,r],[-r*.35,.7,r*.72],[r*.3,.88,r*.68]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z);m.put(g,'#6b804d');yield;}});
 const layers=[bodies,m,l];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:bodies.replacements,treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
