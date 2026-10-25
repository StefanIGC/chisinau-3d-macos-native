import * as T from 'three';
import {localToMercator} from './streets-coordinates';
export type GroundOwner={id:string;rings:number[][][][];bounds:number[]};
/** Active authored ground replaces native paving in the same frame. The source
 * rings are immutable between completed build/eviction events; camera movement
 * never rebuilds or reprojects this catalog. */
export function groundOwnership(){
 let roots:T.Object3D[]=[],lastKey='',owners:GroundOwner[]=[];
 const cache=new WeakMap<T.Object3D,{source:number[][][][];packet:GroundOwner}>();
 return{
  setRoots(items:T.Object3D[]){roots=items;lastKey='';},
  collect(){
   const active:GroundOwner[]=[];let key='';
   for(const root of roots){const source=root.userData.groundRings as number[][][][]|undefined;if(!root.visible||!source?.length)continue;
    let entry=cache.get(root);if(!entry||entry.source!==source){
     const rings=source.map(poly=>poly.map(ring=>ring.map(([x,z])=>{const[n,,e]=localToMercator(x,0,z);return[n,e];}))),p=rings.flat(2);
     const packet={id:root.uuid+':'+(root.userData.groundRevision=(root.userData.groundRevision??0)+1),rings,bounds:[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))]};entry={source,packet};cache.set(root,entry);
    }
    active.push(entry.packet);key+=entry.packet.id+'|';
   }
   if(key===lastKey)return null;lastKey=key;owners=active;return owners;
  }
 };
}
