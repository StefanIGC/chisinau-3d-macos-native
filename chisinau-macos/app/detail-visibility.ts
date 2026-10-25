import type {Mesh} from 'three';

/** Keep small camera movements from repeatedly switching the same detail batch. */
export function detailInRange(mesh:Mesh,distance:number,limit:number){
  const wasNear=mesh.userData.detailInRange===true;
  const near=distance<(wasNear?limit+18:limit);
  mesh.userData.detailInRange=near;
  return near;
}
