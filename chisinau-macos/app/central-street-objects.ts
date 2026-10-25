import * as T from 'three';
import catalog from '../data/central-bicycle-parking.json';
import {landscapeLayer} from './landscape-layer';

/** Exact OSM nodes and tagged rack family, compact local geometry. No runtime
 * photo requests, occupied bicycles, transparent overlays or proxy walls. */
export function createCentralStreetObjects(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const l=landscapeLayer(scene,'Mobilier central · biciclete',ground,loaded,{residentDistance:650});
 const cells=new Map<string,typeof catalog.racks>();
 for(const p of catalog.racks){const key=`${Math.floor(p.x/80)}/${Math.floor(p.z/80)}`;const group=cells.get(key)??[];group.push(p);cells.set(key,group);}
 for(const[key,group]of cells){
  const [cx,cz]=key.split('/').map(Number);
  l.job('parcări '+key,cx*80+40,cz*80+40,function*(){
   for(const p of group){
    const stand=p.type!=='wall_loops',n=Math.max(1,Math.min(8,p.capacity?Math.ceil(p.capacity/(stand?2:1)):stand?2:4)),gap=stand?.85:.39;
    const c=Math.cos(p.angle),s=Math.sin(p.angle),metal=stand?'#727e75':'#8a968d';
    const at=(u:number,h:number,v:number)=>{const x=p.x+u*c+v*s,z=p.z-u*s+v*c;return new T.Vector3(x,ground(x,z)+.14+h,z);};
    for(let i=0;i<n;i++){
     const u=(i-(n-1)/2)*gap;
     const points=stand?[[u,0,-.39],[u,.62,-.39],[u,.79,-.28],[u,.79,.28],[u,.62,.39],[u,0,.39]]:[[u,0,-.32],[u,.30,-.30],[u,.47,-.16],[u,.47,.16],[u,.30,.30],[u,0,.32]];
     const curve=new T.CatmullRomCurve3(points.map(q=>at(q[0],q[1],q[2])),false,'centripetal');
     l.put(new T.TubeGeometry(curve,12,stand?.031:.019,5,false),metal,0,true,true);
     for(const v of[-.39,.39])if(stand){const q=at(u,.014,v);l.box(q.x,q.y,q.z,.13,.028,.16,metal,true,false,p.angle);}
     yield;
    }
    if(!stand)for(const v of[-.28,.28]){const q=at(0,.045,v);l.box(q.x,q.y,q.z,n*gap+.14,.045,.045,metal,true,false,p.angle);}
   }
  });
 }
 return l;
}
