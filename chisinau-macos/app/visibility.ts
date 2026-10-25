import * as T from 'three';

export const CHUNK_SIZE=64;
type VisiblePart={object:T.Object3D;parent:T.Object3D;bounds:T.Sphere;max:number;min:number;shadow:boolean};

/** Culls small geographic batches before the renderer visits their geometry. */
export function createVisibility(camera:T.PerspectiveCamera,mobile:boolean){
  const frustum=new T.Frustum(),projection=new T.Matrix4(),probe=new T.Sphere();
  const parts:VisiblePart[]=[];
  let range=mobile?310:400;
  function prepare(quality=0,altitude=0,flight=false){
    // Flight uses a deliberately bounded GTA-style horizon. The altitude bonus
    // stays small so climbing cannot multiply the active tile/geometry set.
    // Ten-metre steps avoid residency churn for tiny altitude changes.
    const base=flight?(mobile?290:350):(mobile?310:400);
    const altitudeBonus=flight?Math.min(mobile?70:100,altitude*.38):Math.min(mobile?110:160,altitude*.65);
    const target=Math.max(mobile?230:280,base-quality*30+altitudeBonus);
    range=Math.round(target/10)*10;
    if(camera.far!==range){camera.far=range;camera.updateProjectionMatrix();}
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  }
  function add(object:T.Mesh,min=0,max=Infinity){
    object.updateMatrixWorld(true);
    if(object instanceof T.InstancedMesh){object.computeBoundingSphere();probe.copy(object.boundingSphere!);}
    else{object.geometry.computeBoundingSphere();probe.copy(object.geometry.boundingSphere!);}
    const bounds=probe.clone().applyMatrix4(object.matrixWorld);
    parts.push({object,parent:object.parent!,bounds,min,max,shadow:object.castShadow});
    object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false;
  }
  function update(){
    for(const p of parts){
      const distance=p.bounds.center.distanceToSquared(camera.position),radius=p.bounds.radius;
      const near=distance<(Math.min(range,p.max)+radius)**2&&(p.min===0||distance>=(p.min+radius)**2);
      const shadow=p.shadow&&distance<((mobile?42:65)+radius)**2;
      p.object.visible=near&&frustum.intersectsSphere(p.bounds);
      (p.object as T.Mesh).castShadow=p.object.visible&&shadow;
      if(p.object.visible&&!p.object.parent)p.parent.add(p.object);else if(!p.object.visible&&p.object.parent)p.object.removeFromParent();
    }
  }
  function sees(position:T.Vector3,radius:number,max:number){
    if(position.distanceToSquared(camera.position)>(max+radius)**2)return false;
    probe.center.copy(position);probe.radius=radius;return frustum.intersectsSphere(probe);
  }
  return{add,prepare,update,sees,parts,restore(){for(const p of parts)if(!p.object.parent)p.parent.add(p.object);},position:camera.position,get range(){return range}};
}
