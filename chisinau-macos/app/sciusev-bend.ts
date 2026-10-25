import * as T from 'three';
import catalog from '../data/sciusev-bend-buildings.json';
import realm from '../data/sciusev-bend.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';
import {createSciusevBendDetails} from './sciusev-bend-details';
/** July2025 photographed fronts. Hidden rear finishes and metric heights estimated. */
export function createSciusevBend(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev125–129 · cotitură',ground,loaded),a=photoArchitecture(m),l=landscapeLayer(scene,'Șciusev125–129 · sol',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 for(const b of catalog)m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],function*(){
  const y=ground(b.anchor[0],b.anchor[1])+.12,h=b.height,p=b.p as XY[],unfinished=b.style==='bend129';
  m.solid(p,h+5,y-5,b.wall,true);yield;
  // A rotated hipped roof follows the actual rectangular plan, with upward normals.
  if(b.roofRise){
   const es=p.slice(1).map((q,i)=>({dx:q[0]-p[i][0],dz:q[1]-p[i][1],len:Math.hypot(q[0]-p[i][0],q[1]-p[i][1])})).sort((a,b)=>b.len-a.len),e=es[0],ux=e.dx/e.len,uz=e.dz/e.len;
   const us=p.map(q=>q[0]*ux+q[1]*uz),vs=p.map(q=>-q[0]*uz+q[1]*ux),u0=Math.min(...us)-.25,u1=Math.max(...us)+.25,v0=Math.min(...vs)-.25,v1=Math.max(...vs)+.25,inset=(v1-v0)/2;
   const at=(u:number,v:number,yy:number)=>new T.Vector3(u*ux-v*uz,yy,u*uz+v*ux),c=[at(u0,v0,y+h),at(u1,v0,y+h),at(u1,v1,y+h),at(u0,v1,y+h)],r0=at(u0+inset,(v0+v1)/2,y+h+b.roofRise),r1=at(u1-inset,(v0+v1)/2,y+h+b.roofRise),out:number[]=[];
   for(const[aa,bb,cc]of[[c[0],r0,c[3]],[c[3],r0,r1],[c[3],r1,c[2]],[c[2],r1,c[1]],[c[1],r1,r0],[c[1],r0,c[0]]]){const up=new T.Vector3().crossVectors(bb.clone().sub(aa),cc.clone().sub(aa)).y;out.push(...aa.toArray(),...(up>=0?bb:cc).toArray(),...(up>=0?cc:bb).toArray());}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,b.roof,false,true);yield;
  }else m.solid(p,.16,y+h,'#8b8b7b',true);
  for(const f of a.faces(p,y)){
   const mid=f.at(f.len/2),n=f.at(f.len/2,1),front=(n[0]-mid[0])*.638-(n[1]-mid[1])*.77>.8;
   f.panel(f.len/2,.33,.08,f.len,.66,.16,'#858c7d');
   if(!unfinished)a.cornice(f,h,b.trim);
   const count=front?(unfinished?3:3):Math.max(1,Math.round(f.len/4.4)),bw=f.len/count;
   if(unfinished){
    // Exposed limestone courses; mortar strips stay shallow and opaque.
    for(let row=0;row<10;row++){
     const yy=.62+row*.39;f.panel(f.len/2,yy,.027,f.len,.025,.035,'#827f6c',true);
     for(let u=.45+(row%2)*.38;u<f.len;u+=.78)f.panel(u,yy+.18,.028,.022,.36,.035,'#827f6c',true);yield;
    }
    f.panel(f.len/2,h-.12,.05,f.len,.25,.1,'#9b9c8a');
   }
   for(let k=0;k<count;k++){
    const u=(k+.5)*bw;if(front&&unfinished&&k===0){a.door(f,u,2.75,1.05,'#69513e');f.panel(u,3.15,.55,1.65,.12,1.1,'#596657');for(const d of[-.7,.7])f.panel(u+d,2.90,.48,.045,.46,.8,'#495448',true);continue;}
    f.window(u,2.05,Math.min(1.25,bw*.55),unfinished?2.4:1.85,unfinished?'#796e5a':b.trim,unfinished?'#504138':'#62695c');
    if(front&&unfinished){const q=f.at(u,.52),aa=f.at(0),bb=f.at(1);m.box(q[0],y+.28,q[1],1.65,.35,.85,'#92998a',false,true,Math.atan2(-(bb[1]-aa[1]),bb[0]-aa[0]));}if(front&&!unfinished)for(let j=-2;j<=2;j++)f.panel(u+j*.21,2.05,.43,.025,1.9,.035,'#4a574b',true);yield;
   }
   if(front){f.panel(f.len-.65,2.6,.40,.40,.24,.035,'#c6c6b1');f.label(b.title.replace('Șciusev ',''),f.len-.65,2.6,.13,'#404e43',.44);}
  }
 });
 // Photographed low front walls and piers; yard gates remain in the shared system.
 function wall(title:string,aa:XY,bb:XY,color:string,height=1.0){m.job(title,[aa,bb],[],function*(){
  const dx=bb[0]-aa[0],dz=bb[1]-aa[1],len=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx),n=Math.ceil(len/2.7);
  for(let i=0;i<n;i++){const t=(i+.5)/n,x=aa[0]+dx*t,z=aa[1]+dz*t,y=ground(x,z);m.box(x,y+height/2,z,len/n+.02,height,.20,color,false,true,angle);yield;}
  for(let i=0;i<=n;i++){const t=i/n,x=aa[0]+dx*t,z=aa[1]+dz*t,y=ground(x,z);m.box(x,y+(height+.3)/2,z,.34,height+.3,.34,'#c3c1ab',false,true);m.box(x,y+height+.34,z,.46,.12,.46,'#aeaE99');}yield;
 });}
 wall('125 · gard jos',[-970.8,625.5],[-959.2,635.2],'#a4a89a',.85);
 wall('127 · zid crem',[-988.33,609.90],[-977.83,618.65],'#c0bda7',1.0);
 wall('129 · zid lateral',[-1000.1,601.6],[-999.0,605.0],'#aaa998',1.8);
 // Discrete trunks avoid access paths; measured positions and crown sizes are approximate.
 for(const[x,z,h,r]of realm.trees)m.job('arbore curte',streetRect(x,z,r*2,r*2),[],function*(){const y=ground(x,z),g=new T.CylinderGeometry(.13,.22,h*.55,7);g.translate(x,y+h*.275,z);m.put(g,'#686b53',false,true);for(const[dx,dy,rr]of[[0,.73,r],[-r*.35,.7,r*.72],[r*.32,.88,r*.68]]){const g=new T.IcosahedronGeometry(rr,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z);m.put(g,'#687e4e');yield;}});
 // Planters at the photographed Movilă corner; positioned outside the walking line.
 for(const[x,z]of[[-971.8,601.3],[-973.8,600.3],[-975.8,599.3],[-977.8,598.3]])m.job('jardinieră rotundă',streetRect(x,z,1,1),[],function*(){const y=ground(x,z),g=new T.CylinderGeometry(.45,.38,.5,12);g.translate(x,y+.285,z);m.put(g,'#b7ad6c',false,true);const soil=new T.CircleGeometry(.37,12);soil.rotateX(-Math.PI/2);soil.translate(x,y+.541,z);m.put(soil,'#676448');yield;});
 for(const[x,z]of[[-976,622],[-1005,597]])m.job('stâlp stradal',streetRect(x,z,.5,.5),[],function*(){const y=ground(x,z);m.box(x,y+3.7,z,.20,7.4,.20,'#939986',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x+1.2,y+7.4,z-1.4),.045,'#7e8876');m.box(x+1.2,y+7.4,z-1.4,.48,.14,.28,'#636e5e');yield;});
 m.job('cabluri cotitură',[[-976,622],[-1005,597]],[],function*(){for(const d of[0,1.2])for(let i=0;i<5;i++){const t=i/5,q=(i+1)/5,x=-976-29*t+d,z=622-25*t,xx=-976-29*q+d,zz=622-25*q;m.beam(new T.Vector3(x,ground(x,z)+7.1,z),new T.Vector3(xx,ground(xx,zz)+7.1,zz),.018,'#4a5848');yield;}});
 const details=createSciusevBendDetails(scene,ground,loaded);
 const layers=[m,l,details];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:m.replacements,treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
