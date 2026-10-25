export type BuildingReplacement={id:number;aliases?:number[];x:number;z:number;radius:number;rings?:number[][][];polygons?:number[][][][];bounds?:number[]};
type Part={id:number;start:number;count:number;min:number[];max:number[]};
function inRing(x:number,z:number,ring:number[][],tolerance:number){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
    if(Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<=tolerance)return true;
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
/** IDs can change when a way becomes an OSM relation. Match the owned footprint
 * too, including building parts, without hiding neighbouring courtyard buildings.
 * Runs only on replacement changes, never in the per-frame frustum loop. */
export function isBuildingReplaced(p:Part,vertices:Float32Array,x:number,z:number,items:BuildingReplacement[]){
  const candidates:number[][][][]=[];
  for(const r of items){
    if(r.id===p.id||r.aliases?.includes(p.id))return true;
    if(r.radius>0&&Math.hypot(x+(p.min[0]+p.max[0])/2-r.x,z+(p.min[2]+p.max[2])/2-r.z)<r.radius)return true;
    const polygons=r.polygons??(r.rings?[r.rings]:[]);
    if(!polygons.length||!r.bounds)continue;
    const b=r.bounds,pad=1.2;
    if(x+p.max[0]<b[0]-pad||x+p.min[0]>b[2]+pad||z+p.max[2]<b[1]-pad||z+p.min[2]>b[3]+pad)continue;
    // Sharing two walls can put 75% of a tiny neighbour's vertices on our
    // boundary without owning ANY of its floor area (e.g. the 126A annex).
    // Compare projected triangle area instead. Vertical walls have no area;
    // roof/floor centroids represent the interior, with only survey tolerance.
    candidates.push(...polygons);
  }
  // A legacy body may span several official bodies/chunks. Their READY union
  // owns that body, even when no single chunk covers 72% of it. Unready
  // replacements are excluded by the caller, so streaming keeps its fallback.
  if(candidates.length){
    let accepted=0,total=0;
    for(let i=p.start;i+2<p.start+p.count;i+=3){
      const ax=vertices[i*3],az=vertices[i*3+2],bx=vertices[(i+1)*3],bz=vertices[(i+1)*3+2],cx=vertices[(i+2)*3],cz=vertices[(i+2)*3+2];
      const area=Math.abs((bx-ax)*(cz-az)-(cx-ax)*(bz-az));if(area<1e-5)continue;
      const px=x+(ax+bx+cx)/3,pz=z+(az+bz+cz)/3;total+=area;
      if(candidates.some(rings=>inRing(px,pz,rings[0],.20)&&!rings.slice(1).some(h=>inRing(px,pz,h,0))))accepted+=area;
    }
    if(total&&accepted/total>=.72)return true;
  }
  return false;
}
