import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import catalog from '../data/map-md-models.json';
import fallbackFiles from '../data/landmark-fallbacks.json';
import {geoToLocal,HALF_WORLD,WORLD_SCALE,ROTATION} from './streets-coordinates';
import {finishMapLandmark} from './map-md-finishes';
import {prepareLandmarkCollision} from './landmark-collision';
import {modelAssetUrl} from './model-assets';

export type MapModel={id:string;title:string;file:string;lat:number;lon:number;scale:number;rotation:number;min:number[];max:number[];fit:number[];offset:number[];replace:number[];drape?:boolean;lift?:number;groundOffset?:number};
type Replacement={id:number;x:number;z:number;radius:number;ready:boolean};
type Request={manager:T.LoadingManager;settled:boolean;started:number;progress:number;expire:()=>void};
type Entry={spec:MapModel;root:T.Group;collision:T.Group;replacements:Replacement[];sphere:T.Sphere;status:'idle'|'loading'|'loaded'|'failed';lastNear:number;retryAt:number;nextGround:number;distance:number;request?:Request;portable?:boolean;failures?:number;meshes:T.Mesh[];geometries:Set<T.BufferGeometry>;materials:Set<T.Material>;textures:Set<T.Texture>;collisionJob?:Generator<void>;collisionReady?:boolean;drape:{attribute:T.BufferAttribute;index:number;original:Float32Array}[]};
const fallbacks:Record<string,string>=fallbackFiles;

/** Map coordinates never depend on the camera. Assets are optional and streamed. */
export function createMapMdModels(scene:T.Scene,ground:(x:number,z:number)=>number,terrainReady:(x:number,z:number)=>boolean,mobile=false){
  const frustum=new T.Frustum(),projection=new T.Matrix4();
  const physicalMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  let disposed=false,inFlight=0,lastSchedule=-Infinity,lastWarm=-Infinity,warming=false;
  const warmed=new Set<string>(),warmController=new AbortController();
  const readyIds=new Set<number>();
  // The old landscape GLB contained a second, independently draped ground.
  // The park district now owns all paving and terraces; buildings stay original.
  const entries=(catalog as MapModel[]).filter(spec=>spec.title!=='Scuarul Catedralei').map(spec=>{
    const [x,,z]=geoToLocal(spec.lat,spec.lon),root=new T.Group(),collision=new T.Group();
    root.name=`map.md · ${spec.title}`;collision.name=`${root.name} · coliziune`;
    root.position.set(x+spec.offset[0],0,z+spec.offset[2]);root.visible=false;scene.add(root);
    const bounds=new T.Box3(new T.Vector3().fromArray(spec.min),new T.Vector3().fromArray(spec.max));
    const sphere=bounds.getBoundingSphere(new T.Sphere());sphere.center.add(root.position);
    return{spec,root,collision,sphere,status:'idle',portable:MeshoptDecoder.supported===false&&!!fallbacks[spec.file],lastNear:0,retryAt:0,nextGround:0,distance:Infinity,meshes:[],geometries:new Set(),materials:new Set(),textures:new Set(),drape:[],replacements:spec.replace.map(id=>({id,x:root.position.x,z:root.position.z,radius:0,ready:false}))} as Entry;
  });
  const sharing=new Map<number,Entry[]>();
  for(const entry of entries)for(const r of entry.replacements){const group=sharing.get(r.id)??[];group.push(entry);sharing.set(r.id,group);}
  function release(entry:Entry){
    if(entry.request){entry.request.settled=true;entry.request.manager.abort();entry.request=undefined;inFlight--;}
    entry.root.visible=false;entry.root.clear();entry.collision.clear();entry.collision.userData.grounded=false;
    entry.collision.userData.revision=(entry.collision.userData.revision??0)+1;
    entry.replacements.forEach(r=>r.ready=false);
    entry.geometries.forEach(g=>g.dispose());entry.materials.forEach(m=>m.dispose());entry.textures.forEach(t=>t.dispose());
    entry.geometries.clear();entry.materials.clear();entry.textures.clear();entry.meshes=[];entry.drape=[];
    entry.collisionJob=undefined;entry.collisionReady=false;
    entry.status='idle';entry.root.userData.grounded=false;entry.nextGround=0;
  }
  function receive(entry:Entry,model:T.Group){
    model.traverse(object=>{
      if(!(object instanceof T.Mesh))return;
      entry.geometries.add(object.geometry);entry.meshes.push(object);
      object.castShadow=false;object.receiveShadow=true;object.renderOrder=0;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        material.depthTest=true;material.depthWrite=!material.transparent;entry.materials.add(material);
        for(const value of Object.values(material))if(value instanceof T.Texture)entry.textures.add(value);
      }
    });
    if(disposed){release(entry);return;}
    finishMapLandmark(model,entry.spec.title);
    model.traverse(object=>{if(object instanceof T.Mesh){entry.geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])entry.materials.add(m);}});
    const alignment=new T.Group();alignment.rotation.y=ROTATION+entry.spec.rotation;
    alignment.scale.setScalar(2*HALF_WORLD/WORLD_SCALE*entry.spec.scale);alignment.add(model);
    // Calibration is in map axes, after the original model orientation.
    const fitted=new T.Group();fitted.scale.fromArray(entry.spec.fit);fitted.add(alignment);
    fitted.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(fitted);fitted.position.y=(entry.spec.drape?entry.spec.groundOffset??0:-bounds.min.y)+.035+(entry.spec.lift??0);
    entry.root.add(fitted);fitted.updateWorldMatrix(true,true);
    if(entry.spec.drape){
      // The cathedral square is a ground mesh, not a rigid 300 m floating slab.
      const inverse=new T.Matrix4().copy(entry.root.matrixWorld).invert();
      for(const mesh of entry.meshes){
        mesh.geometry=mesh.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
        entry.geometries.add(mesh.geometry);mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);entry.root.add(mesh);
        const attribute=mesh.geometry.getAttribute('position') as T.BufferAttribute;
        entry.drape.push({attribute,index:0,original:new Float32Array(attribute.array)});
      }
      entry.root.remove(fitted);
    }
    const collision=entry.root.clone(true);collision.position.set(0,0,0);
    collision.traverse(object=>{if(object instanceof T.Mesh)object.material=physicalMaterial;});
    entry.collision.add(collision);
    if(!entry.spec.drape)entry.collisionJob=prepareLandmarkCollision(entry.collision);
    entry.status='loaded';
  }
  function start(entry:Entry,now:number){
    entry.status='loading';inFlight++;
    // A stalled optional request used to occupy a slot forever. Isolate aborts
    // per model, and ignore late callbacks after timeout, retry or disposal.
    const manager=new T.LoadingManager(),loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
    const file=entry.portable?fallbacks[entry.spec.file]??entry.spec.file:entry.spec.file;
    const request:Request={manager,settled:false,started:now,progress:now,expire:()=>fail()};
    entry.request=request;
    function settle(){if(request.settled)return false;request.settled=true;entry.request=undefined;inFlight--;return true;}
    function fail(){
      if(!settle())return;
      manager.abort();
      if(disposed)return;
      entry.status='failed';entry.failures=(entry.failures??0)+1;
      const recover=!entry.portable&&!!fallbacks[entry.spec.file];
      if(recover)entry.portable=true;
      entry.retryAt=performance.now()+(recover?250:Math.min(30000,2000*2**Math.min(entry.failures,4)));
    }
    function discard(model:T.Group){
      const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
      model.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const material of Array.isArray(o.material)?o.material:[o.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);}}});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    }
    try{loader.load(modelAssetUrl(`/models/map-md/${file}`),gltf=>{
      if(request.settled||disposed){discard(gltf.scene);return;}
      try{receive(entry,gltf.scene);settle();entry.failures=0;}catch{release(entry);entry.status='failed';entry.portable=!!fallbacks[entry.spec.file];entry.retryAt=performance.now()+2000;}
    },()=>{request.progress=performance.now();},fail);}catch{fail();}
  }
  function groundEntry(entry:Entry,now:number){
    const {root,collision,spec}=entry;
    if(!terrainReady(root.position.x,root.position.z))return;
    if(spec.drape){
      const deadline=performance.now()+.65;
      for(const job of entry.drape){
        for(let count=0;job.index<job.attribute.count&&count<64&&performance.now()<deadline;count++){
          const i=job.index,x=job.original[i*3],z=job.original[i*3+2];
          if(!terrainReady(root.position.x+x,root.position.z+z))return;
          job.attribute.setY(i,ground(root.position.x+x,root.position.z+z)+job.original[i*3+1]);job.index++;
        }
        if(job.index<job.attribute.count)return;
      }
      for(const mesh of entry.meshes){mesh.geometry.getAttribute('position').needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();}
      entry.collisionJob=prepareLandmarkCollision(collision);
    }else{
      const y=ground(root.position.x,root.position.z);
      entry.nextGround=now+2000;
      if(root.userData.grounded&&Math.abs(root.position.y-y)<.001)return;
      root.position.y=y;
    }
    root.updateMatrixWorld(true);collision.position.copy(root.position);collision.updateMatrixWorld(true);
    collision.userData.grounded=true;collision.userData.revision=(collision.userData.revision??0)+1;
    root.userData.grounded=true;entry.replacements.forEach(r=>r.ready=true);
    new T.Box3().setFromObject(root).getBoundingSphere(entry.sphere);entry.nextGround=spec.drape?Infinity:now+2000;
  }
  return{objects:entries.map(e=>e.root),collisionObjects:entries.map(e=>e.collision),replacements:entries.flatMap(e=>e.replacements),readyIds,
    parkReady:()=>terrainReady(24,-150),
    parkLevel:(x:number,z:number)=>ground(x,z)+.115,
    update(camera:T.PerspectiveCamera,now:number,focus:{x:number;z:number}=camera.position,canWarm=false,canLoad=true){
      if(disposed)return;
      readyIds.clear();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      const preload=Math.min(850,camera.far+220),evict=preload+450;
      for(const entry of entries){
        if(entry.request&&(now-entry.request.progress>12000||now-entry.request.started>45000))entry.request.expire();
        entry.distance=Math.hypot(focus.x-entry.sphere.center.x,focus.z-entry.sphere.center.z)-entry.sphere.radius;
        if(entry.distance<preload)entry.lastNear=now;
        if(entry.status==='loaded'){
          if(entry.distance>evict&&now-entry.lastNear>15000){release(entry);continue;}
          if(entry.distance<preload&&(!entry.root.userData.grounded||now>=entry.nextGround))groundEntry(entry,now);
        }
      }
      // Build acceleration before activating replacement geometry. The native
      // building stays in place while optional models prepare off the main path.
      const deadline=performance.now()+.75;let steps=0;
      const preparationPriority=(e:Entry)=>e.distance-(fallbacks[e.spec.file]?240:0);
      for(const entry of entries.filter(e=>e.collisionJob).sort((a,b)=>preparationPriority(a)-preparationPriority(b))){
        // Even a busy frame or coarse browser clock must advance one bounded
        // 256-item slice. Otherwise loaded models can remain invisible forever.
        while(entry.collisionJob&&steps<64&&(steps===0||performance.now()<deadline)){
          steps++;
          if(entry.collisionJob.next().done){entry.collisionJob=undefined;entry.collisionReady=true;}
        }
        if(steps>=64||performance.now()>=deadline)break;
      }
      // Multi-file buildings switch together. A lower wing must not hide the
      // native tower while its upper model is still downloading.
      const prepared=(e:Entry)=>e.status==='loaded'&&!!e.root.userData.grounded&&!!e.collisionReady;
      for(const entry of entries){
        const ready=prepared(entry)&&entry.replacements.every(r=>sharing.get(r.id)!.every(prepared));
        entry.root.visible=ready&&frustum.intersectsSphere(entry.sphere);entry.collision.userData.grounded=ready;
        for(const r of entry.replacements){r.ready=ready;if(ready)readyIds.add(r.id);}
        for(const mesh of entry.meshes)mesh.castShadow=entry.root.visible&&entry.distance<100&&!entry.spec.drape;
      }
      if(!canLoad||now-lastSchedule<220||inFlight>=1)return;
      lastSchedule=now;
      // Important central buildings enter the queue before distant decorative
      // complexes, without increasing simultaneous downloads or resident limits.
      const priority=(e:Entry)=>e.distance-(fallbacks[e.spec.file]?240:0);
      const candidate=entries.filter(e=>(e.status==='idle'||e.status==='failed'&&now>=e.retryAt)&&e.distance<preload).sort((a,b)=>priority(a)-priority(b))[0];
      if(!candidate){
        // Only warm the next ring after nearby models are parsed. This fetch
        // fills the browser's asset cache without allocating any GPU objects.
        if(canWarm&&!warming&&now-lastWarm>1000&&!((navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData)){
          const next=entries.filter(e=>e.status==='idle'&&e.distance>=preload&&e.distance<preload+350&&!warmed.has(e.spec.file)).sort((a,b)=>a.distance-b.distance)[0];
          if(next){
            const file=next.spec.file;warmed.add(file);warming=true;lastWarm=now;
            void fetch(modelAssetUrl(`/models/map-md/${file}`),{signal:warmController.signal,cache:'force-cache'}).then(response=>{if(response.ok)return response.arrayBuffer();}).catch(()=>{}).finally(()=>{warming=false;});
          }
        }
        return;
      }
      const residents=entries.filter(e=>e.status==='loaded'||e.status==='loading');
      if(residents.length>=(mobile?18:24)){
        const farthest=residents.filter(e=>e.status==='loaded'&&!e.root.visible&&(e.distance>preload||e.distance>180&&priority(e)>priority(candidate)+120)).sort((a,b)=>priority(b)-priority(a))[0];
        if(!farthest)return;release(farthest);
      }
      start(candidate,now);
    },
    dispose(){disposed=true;warmController.abort();for(const entry of entries){release(entry);scene.remove(entry.root);}physicalMaterial.dispose();readyIds.clear();}
  };
}
