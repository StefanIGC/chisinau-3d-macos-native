import * as T from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

/** Copy one character and its transform chain, not its seven hidden siblings. */
export function cloneAnimatedRig(rig:T.Object3D){
  const result=new T.Group(),ancestors:T.Object3D[]=[];
  for(let parent=rig.parent;parent;parent=parent.parent)ancestors.unshift(parent);
  let target:T.Group=result;
  for(const source of ancestors){
    const group=new T.Group();group.position.copy(source.position);group.quaternion.copy(source.quaternion);group.scale.copy(source.scale);
    target.add(group);target=group;
  }
  target.add(cloneSkeleton(rig));
  return result;
}
