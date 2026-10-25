import {CITY_DATA} from './city-layout';
import parts from '../data/commercial-building-parts.json';
import {localToMercator,WORLD_SCALE} from './streets-coordinates';

// These native IDs were verified in the live vector tiles. The map catalog and
// tile server use different OSM generations (way ↔ relation), so retire both.
const nativeAliases:Record<number,number[]>={762704772:[10579543],17536997:[27616485]};
export function buildingOwnership(r:{id:number;x:number;z:number;radius:number;footprints?:number[][][][]}){
 const [x,,z]=localToMercator(r.x,0,r.z);
 // Podium outlines enclose portions of separately streamed tall bodies.
 // Their fallback ownership must use the same polygon difference as the mesh,
 // so a completed shop base cannot prematurely erase an unfinished tower.
 const partitioned:Record<number,{p:number[][];holes:number[][][]}[]>={48681172:parts.north6Podium,91646503:parts.south3West,91646499:parts.south3East};
 const outlines=partitioned[r.id]??CITY_DATA.features.filter(f=>Number(f.id.slice(1))===r.id&&(f.t.building||f.t['building:part']));
 const polygons=(r.footprints??outlines.map(f=>[f.p,...(f.holes??[])])).map(rings=>rings.map(ring=>ring.map(([xx,zz])=>{const[n,,e]=localToMercator(xx,0,zz);return[n,e];})));
 const p=polygons.flat(2),bounds=p.length?[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))]:undefined;
 return{id:r.id,aliases:nativeAliases[r.id],x,z,radius:r.radius*WORLD_SCALE,polygons,bounds};
}
