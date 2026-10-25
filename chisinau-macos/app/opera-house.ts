import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelAssetUrl} from './model-assets';
import {geoToLocal,HALF_WORLD,WORLD_SCALE} from './streets-coordinates';
import {finishOpera} from './opera-materials';
import {createOperaGrounds} from './opera-grounds';

// Original map.md placement and scale, recorded beside the self-contained asset.
export const OPERA={id:25525257,lat:47.0277484266623,lon:28.829911079694597,scale:8.9445e-8,rotation:-2.37};

export function prepareOperaModel(model:T.Group){
  const alignment=new T.Group();alignment.add(model);
  // Fit the surveyed map footprint (OSM way 25525257). The map.md placement
  // made the facade ~52 m wide; its mapped frontage is ~66 m. Do not enlarge
  // depth/height by the same factor or push the stairs into the access road.
  const left=new T.Vector2(-384.64,-86.34),right=new T.Vector2(-318.69,-85.63);
  const width=right.clone().sub(left),front=left.clone().add(right).multiplyScalar(.5);
  const forward=new T.Vector2(-width.y,width.x).normalize();
  const depth=new T.Vector2(-383.51,-191.43).sub(left).dot(forward)*-1;
  const [x,,z]=geoToLocal(OPERA.lat,OPERA.lon);
  alignment.rotation.y=Math.atan2(-forward.y,forward.x);
  alignment.scale.set(depth/(9.753+33.89),2*HALF_WORLD/WORLD_SCALE*OPERA.scale,width.length()/(7.70318+13.585428));
  alignment.updateMatrixWorld(true);
  const sourceFront=new T.Vector3(9.753,0,(7.70318-13.585428)/2).applyMatrix4(alignment.matrixWorld);
  alignment.position.set(front.x-x-sourceFront.x,0,front.y-z-sourceFront.z);
  alignment.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(alignment);
  alignment.position.y=-bounds.min.y;alignment.updateMatrixWorld(true);
  bounds.setFromObject(alignment);
  return{alignment,bounds};
}

export function createOperaHouse(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  const [x,,z]=geoToLocal(OPERA.lat,OPERA.lon);
  const grounds=createOperaGrounds(scene,ground,loaded);
  const root=new T.Group(),collision=new T.Group();
  root.name='Teatrul Național de Operă și Balet „Maria Bieșu”';collision.name='Opera · coliziune';
  root.position.set(x,0,z);root.visible=false;scene.add(root);
  const replacement={id:OPERA.id,x,z,radius:0,ready:false};
  const collisionMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>([collisionMaterial]);
  const meshes:T.Mesh[]=[],bounds=new T.Box3(),sphere=new T.Sphere(),frustum=new T.Frustum(),matrix=new T.Matrix4();
  const modelBounds=new T.Box3(),baseOutline:T.Vector3[]=[];
  let foundation:T.BufferGeometry|null=null;
  let available=false,disposed=false,nextGround=0,entranceX=x,entranceZ=z;
  new GLTFLoader().load(modelAssetUrl('/models/opera-maria-biesu/opera.glb'),gltf=>{
    gltf.scene.traverse(object=>{if(object instanceof T.Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}});
    if(disposed){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());return;}
    const finishes=finishOpera(gltf.scene);
    const prepared=prepareOperaModel(gltf.scene);bounds.copy(prepared.bounds);root.add(prepared.alignment);
    modelBounds.copy(bounds);
    // The stair foot anchors the model. A small skirt joins its open bottom to
    // the real terrain, which falls by about 3 m towards the back of this site.
    entranceX=x+(bounds.min.x+bounds.max.x)/2;entranceZ=z+bounds.max.z;
    prepared.alignment.traverse(object=>{if(object instanceof T.Mesh){object.castShadow=object.receiveShadow=true;object.geometry.computeBoundingSphere();meshes.push(object);geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}});
    const physical=prepared.alignment.clone(true);
    physical.traverse(object=>{if(object instanceof T.Mesh)object.material=collisionMaterial;});collision.add(physical);
    // Inset from the asset's lower perimeter, including the rear recess, so no
    // foundation surface fights with an original wall or closes the entrance.
    for(const [px,pz]of[[8.70,7.43],[-33.85,7.43],[-33.85,2.51],[-29.90,2.51],[-29.90,-8.59],[-33.85,-8.59],[-33.85,-13.24],[8.70,-13.24]])baseOutline.push(new T.Vector3(px,.51,pz).applyMatrix4(prepared.alignment.matrixWorld));
    foundation=new T.BufferGeometry();foundation.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(baseOutline.length*18),3));geometries.add(foundation);
    const plinth=new T.Mesh(foundation,finishes[0]);plinth.name='Opera · soclu adaptat terenului';plinth.receiveShadow=true;root.add(plinth);meshes.push(plinth);
    collision.add(new T.Mesh(foundation,collisionMaterial));
    available=true;
  },undefined,()=>{ /* Keep the streamed building if this optional asset cannot load. */ });
  return{objects:[root,...grounds.objects],collisionObjects:[collision,...grounds.collisionObjects],replacements:[replacement],treeOverrides:grounds.treeOverrides,
    get ready(){return replacement.ready;},
    // The native theatre remains visible while its optional detailed asset loads.
    readyNear(px:number,pz:number,r=420){return grounds.readyNear(px,pz,r);},
    update(camera:T.PerspectiveCamera,now:number){
      grounds.update(camera,now);
      if(!available||disposed)return;
      if((!replacement.ready||now>=nextGround)&&loaded(entranceX,entranceZ)&&baseOutline.every(p=>loaded(x+p.x,z+p.z))){
        root.position.y=ground(entranceX,entranceZ)+.025;
        const positions=foundation!.getAttribute('position') as T.BufferAttribute;let vertex=0;
        for(let i=0;i<baseOutline.length;i++){
          const a=baseOutline[i],b=baseOutline[(i+1)%baseOutline.length];
          const ay=Math.min(a.y-.02,ground(x+a.x,z+a.z)-root.position.y-.12),by=Math.min(b.y-.02,ground(x+b.x,z+b.z)-root.position.y-.12);
          for(const [px,py,pz]of[[a.x,a.y,a.z],[b.x,b.y,b.z],[a.x,ay,a.z],[b.x,b.y,b.z],[b.x,by,b.z],[a.x,ay,a.z]])positions.setXYZ(vertex++,px,py,pz);
        }
        positions.needsUpdate=true;foundation!.computeVertexNormals();foundation!.computeBoundingBox();foundation!.computeBoundingSphere();
        bounds.copy(modelBounds).union(foundation!.boundingBox!);
        root.userData.grounded=true;root.updateMatrixWorld(true);
        collision.position.copy(root.position);collision.userData.grounded=true;collision.userData.revision=(collision.userData.revision??0)+1;collision.updateMatrixWorld(true);
        replacement.ready=true;nextGround=now+1500;
      }
      bounds.getBoundingSphere(sphere);sphere.center.add(root.position);
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      root.visible=replacement.ready&&frustum.intersectsSphere(sphere);
      const shadow=root.visible&&camera.position.distanceTo(sphere.center)-sphere.radius<100;
      for(const mesh of meshes)mesh.castShadow=shadow;
    },
    dispose(){disposed=true;scene.remove(root);grounds.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  };
}
