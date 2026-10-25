import * as T from 'three';
type Person={p:{root:T.Group};meshes:T.Mesh[]};
/** All visible people share one draw per articulated part, retaining individual poses and colors. */
export function createCrowdRenderer(scene:T.Scene,people:Person[],capacity:number){
  const parts=people[0].meshes.map((template,i)=>{
    const material=(template.material as T.MeshStandardMaterial).clone();material.color.set(0xffffff);
    const mesh=new T.InstancedMesh(template.geometry,material,capacity);mesh.name=`Pietoni · parte ${i}`;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.count=0;scene.add(mesh);return mesh;
  });
  function update(visible:Person[]){
    for(const person of visible)person.p.root.updateMatrixWorld(true);
    for(let part=0;part<parts.length;part++){
      const batch=parts[part];batch.count=visible.length;batch.visible=visible.length>0;
      for(let i=0;i<visible.length;i++){
        const source=visible[i].meshes[part];batch.setMatrixAt(i,source.matrixWorld);batch.setColorAt(i,(source.material as T.MeshStandardMaterial).color);
      }
      batch.castShadow=visible.some(p=>p.meshes[part].castShadow);
      if(visible.length){batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
    }
  }
  return{parts,update,dispose(){for(const p of parts){scene.remove(p);p.material.dispose();}}};
}
