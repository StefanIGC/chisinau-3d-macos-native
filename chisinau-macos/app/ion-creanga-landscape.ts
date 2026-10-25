import * as T from 'three';
import {streetRect,type streetMesh} from './street-mesh';
import type {landscapeLayer} from './landscape-layer';

// September 2025 panorama and satellite alignment. Dimensions are photo estimates.
export const continuationTrees = [
 [-2035.5,354,14,3.8,0],[-2035.8,374,15,4.2,0],
 [-2036.2,395,15.5,4.4,0],[-2036.0,419,14.5,4.1,0],
 [-2035.7,444,15,4.3,0],[-2035.4,467,14,3.9,0],
 [-2032.8,385,5.3,1.25,0],[-2033.1,433,5.7,1.4,0],
 [-2071.4,363,8.5,2.6,1],[-2072.0,375,9,2.8,1],
 [-2071.7,387,8.3,2.5,1],[-2074.4,397,10,3.4,0],
 [-2062,488,11,3.3,0],[-2060,516,13,3.8,0],[-2059,543,12,3.5,0],
 [-2032,489,15,4.1,0],[-2031.5,516,15.5,4.3,0],[-2031,544,15,4.0,0],[-2030,575,16,4.2,0],
 // Narrow deciduous crowns and dense courtyard foliage at the Petru junction.
 // Positions triangulated approximately from the September panorama and satellite.
 [-2079,563,18,2.2,2],[-2088,566,17,2.0,2],[-2086,552,11,3.7,0],
] as const;

export function addIonCreangaLandscape(m:ReturnType<typeof streetMesh>,l:ReturnType<typeof landscapeLayer>){
 for(const [x,z,h,r,needle] of continuationTrees)m.job('Ion Creangă · arbore fotografiat',streetRect(x,z,r*2,r*2),[],function*(){
  const y=m.ground(x,z),young=h<7,trunkH=needle===1?h*.7:needle===2?h*.45:h*.63;
  const trunk=new T.CylinderGeometry(young?.045:.18,young?.065:.32,trunkH,7);
  trunk.translate(x,y+trunkH/2,z);m.put(trunk,needle===1?'#7d7260':'#b0aa91',false,true);yield;
  if(needle===2){
   for(let k=0;k<4;k++){
    const rr=r*(1-k*.16),g=new T.IcosahedronGeometry(rr,1);
    g.scale(1,h*.20/rr,1);
    g.translate(x+Math.sin(k*2)*r*.12,y+h*(.43+k*.12),z+Math.cos(k*2)*r*.12);
    m.put(g,k%2?'#77874e':'#647947');yield;
   }
  }else if(needle===1){
   // Layered lateral boughs instead of a single default cone.
   for(let k=0;k<4;k++){
    const g=new T.IcosahedronGeometry(r*(1-k*.16),1);g.scale(1,.45,1);
    g.translate(x+Math.sin(k*2.2)*r*.12,y+h*(.43+k*.14),z+Math.cos(k*2.2)*r*.12);
    m.put(g,k%2?'#4c6f4b':'#3f6243');yield;
   }
  }else{
   // Opaque, merged foliage: overlapping lobes in both axes, with the top at h.
   // Former crowns exceeded the estimated height and all lay in one vertical plane.
   for(const [dx,dz,dy,rr,v,color] of [
    [0,0,.73,.78,.25,'#68804b'],[-.55,-.12,.70,.82,.22,'#71844e'],
    [.52,.20,.72,.85,.23,'#617744'],[.05,-.09,.83,.66,.17,'#788953'],
    [.12,-.40,.65,.72,.20,'#6a7d49'],
   ]as const){
    const g=new T.IcosahedronGeometry(r*rr,1);g.scale(1,h*v/(r*rr),1);
    g.translate(x+dx*r,y+h*dy,z+dz*r);m.put(g,color);yield;
   }
  }

 });
 m.job('Ion Creangă · zidul curții',streetRect(-2063,356,2,66),[],function*(){
  // Keep the visible southern driveway open at z=390–409.
  for(let z=323;z<388;z+=2){const y=m.ground(-2063,z);m.box(-2063,y+.82,z,.20,1.64,2,'#bebaa2',false,true);yield;}
  const x=-2059.15,z=400,y=m.ground(x,z);
  m.box(x,y+4.15,z,.19,8.3,.19,'#979b90',false,true);
  m.beam(new T.Vector3(x,y+8.12,z),new T.Vector3(x+1.65,y+8.25,z),.055,'#929a90',false);
  m.box(x+1.7,y+8.23,z,.48,.14,.27,'#a9b0a4');yield;
 });
 return continuationTrees.map(([x,z])=>({x,z,height:0,radius:3.5,texture:0}));
}
