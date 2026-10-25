import ResourceLoader from './world/ResourceLoader';
import SceneSystem from './systems/SceneSystem';
import {Tile3DInstanceLODConfig,Tile3DInstanceType} from '../lib/tile-processing/tile3d/features/Tile3DInstance';

const treeImages=['treeBeechDiffuse','treeFirDiffuse','treeLinden0Diffuse','treeLinden1Diffuse','treeOakDiffuse'];
const aliases:Record<string,string>={statueSmall:'statue0',statueBig:'statue1'};
const barrierNames:Record<number,string>={12:'hedgeDiffuse',13:'woodFenceDiffuse',14:'concreteFenceDiffuse',26:'chainLinkFenceDiffuse',27:'metalFenceDiffuse',28:'stoneWallDiffuse',29:'concreteWallDiffuse'};
const images=new Map<string,HTMLImageElement[]>();

/** Share source geometry and the last rendered instance list, never framebuffer
 * pixels. The host adopts numeric arrays into its own JS realm before upload. */
export function getGameOcclusion(scene:SceneSystem){
  const instances=[];
  for(const [name,object]of scene.objects.instancedObjects){
    const buffers=object.getGameDepthBuffers();if(!buffers)continue;
    if(!images.has(name))images.set(name,(name==='tree'?treeImages:[`${aliases[name]??name}Diffuse`]).map(key=>ResourceLoader.get(key)));
    instances.push({name,kind:Tile3DInstanceLODConfig[name as Tile3DInstanceType].structure,...buffers,images:images.get(name)});
  }
  const barriers=[];
  for(const tile of scene.objects.tiles){
    if(tile.disposed||!tile.huggingMesh?.inCameraFrustum(scene.objects.camera))continue;
    const buffers=tile.huggingMesh.getGameDepthBuffers();if(!buffers.positions.length)continue;
    barriers.push({id:`${tile.x},${tile.y}:${tile.localId}`,x:tile.position.x,z:tile.position.z,...buffers});
  }
  if(!images.has('barriers'))images.set('barriers',Array.from({length:30},(_,id)=>barrierNames[id]?ResourceLoader.get(barrierNames[id]):null));
  return{instances,barriers,barrierImages:images.get('barriers')};
}
