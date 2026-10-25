import * as T from 'three';
import catalog from '../data/ground-partitions.json';
type Rings=number[][][];
const partitions=catalog as {surfaces:Record<string,Record<string,Rings[]>>;coverage:Record<string,Rings[]>};
function key(rings:Rings){let h=2166136261;const text=rings.map(r=>r.map(([x,z])=>`${Math.round(x*1000)},${Math.round(z*1000)}`).join(';')).join('|');for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return String(h>>>0);}
/** Offline polygon partitions: only one floor mesh and collider at each point.
 * An empty result intentionally retires a fully covered older surface. */
export function groundPartition(owner:string,rings:Rings):Rings[]{const source=partitions.surfaces[owner];return source?.[key(rings)]??[rings];}
export function groundCoverage(owner:string,fallback:Rings[]):Rings[]{return partitions.coverage[owner]??fallback;}

export function groundShape(rings:Rings){const shape=new T.Shape();rings[0].forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();for(const points of rings.slice(1)){const hole=new T.Path();points.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();shape.holes.push(hole);}return shape;}
