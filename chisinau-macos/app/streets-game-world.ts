import {NATIVE_SUN_DIRECTION} from './daylight';
import {groundOwnership,type GroundOwner} from './ground-ownership';
import {groundExcavations} from './ground-excavations';
import * as T from 'three';
import {SpatialIndex} from './spatial-index';
import {localToMercator,mercatorToLocal,WORLD_SCALE,ROTATION} from './streets-coordinates';
import {createStreetsOcclusion,type NativeOcclusionFrame} from './streets-occlusion';
import {buildingOwnership} from './building-ownership';

type NativePart={start:number;count:number;min:number[];max:number[]};
type NativeTile={id:string;x:number;z:number;positions:Float32Array;parts:NativePart[]};
type Replacement={id:number;x:number;z:number;radius:number;ready?:boolean;footprints?:number[][][][];rings?:number[][][];bounds?:number[]};
type TreeOverride={x:number;z:number;radius:number;height:number;texture:number;polygon?:number[][];readonly ready?:boolean};
type InstanceOverride={type:'busStop'|'statueSmall'|'statueBig';x:number;z:number;radius:number;readonly ready?:boolean};
type NativeWorld={ready:boolean;render(frame:{sunDirection:[number,number,number];position:[number,number,number];target:[number,number,number];fov:number;aspect:number;near:number;distance:number;scale:number;visible?:boolean;streamFocus:[number,number];streamVelocity:[number,number];prepareRadius:number}):void;occlusion?():NativeOcclusionFrame|null;replaceBuildings(items:Replacement[]):void;replaceGround?(items:GroundOwner[]):void;replaceTrees?(items:TreeOverride[]):void;replaceInstances?(items:InstanceOverride[]):void;height(x:number,z:number):number|null;tiles(x:number,z:number,radius:number):NativeTile[];hasTile(x:number,z:number):boolean;areaReady?(x:number,z:number,radius:number):boolean;tileId?:(x:number,z:number)=>string|null};
type Proxy={mesh:T.Mesh;bounds:T.Box3};

export function createStreetsGameWorld(host:HTMLElement,scene:T.Scene,onError:(message:string)=>void,onProgress?:(message:string)=>void) {
  const frame=document.createElement('iframe');
  frame.className='game-streets-world';frame.title='Lumea Streets GL';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
  frame.src='/streets/index.html?game=1&build=58#47.02843,28.82546,45.00,0.00,1206.19';
  host.insertBefore(frame,host.firstChild);
  const depthMaterial=new T.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:T.DoubleSide});
  const proxies=new Map<string,Proxy>();
  const tileIds=new Set<string>();
  let pending:{id:string;tile:NativeTile;part:NativePart;distance:number}[]=[];
  let collisionIndex=new SpatialIndex<Proxy>();
  const candidates:Proxy[]=[],landmarks:T.Object3D[]=[];
  let nativeVisible=true;
  type Landmark={object:T.Object3D;bounds:T.Box3};
  let landmarkIndex=new SpatialIndex<Landmark>(24),indexedLandmarks=0,indexReady=false;
  const indexedObjects=new Set<T.Object3D>();
  const landmarkCandidates:Landmark[]=[],hits:T.Intersection[]=[];
  const landmarkBounds=new Map<T.Object3D,{x:number;y:number;z:number;revision:number;box:T.Box3}>();
  function boundsFor(object:T.Object3D){
    let entry=landmarkBounds.get(object);
    const revision=object.userData.revision??0;
    if(!entry||entry.x!==object.position.x||entry.y!==object.position.y||entry.z!==object.position.z||entry.revision!==revision){object.updateWorldMatrix(true,true);const swept=object.userData.worldCollisionBounds;entry={x:object.position.x,y:object.position.y,z:object.position.z,revision,box:swept instanceof T.Box3?swept.clone():new T.Box3().setFromObject(object)};landmarkBounds.set(object,entry);}
    return entry.box;
  }
  // Refresh once per animation frame, not for every foot/camera/vehicle probe.
  // Collision groups stay indexed even when their visible mesh is culled.
  function refreshLandmarks(){
    let changed=!indexReady,count=0;
    for(const object of landmarks){
      if(!object.userData.grounded)continue;
      count++;if(!indexedObjects.has(object))changed=true;const previous=landmarkBounds.get(object);boundsFor(object);
      if(previous!==landmarkBounds.get(object))changed=true;
    }
    if(count!==indexedLandmarks)changed=true;
    if(changed){
      landmarkIndex=new SpatialIndex<Landmark>(24);
      indexedObjects.clear();
      for(const object of landmarks)if(object.userData.grounded){indexedObjects.add(object);const bounds=boundsFor(object);if(!bounds.isEmpty())landmarkIndex.insert({object,bounds},bounds.min.x,bounds.min.z,bounds.max.x,bounds.max.z);}
      indexedLandmarks=count;indexReady=true;
    }
  }
  function visibleInHierarchy(object:T.Object3D){
    for(let parent:T.Object3D|null=object;parent;parent=parent.parent)if(!parent.visible)return false;
    return true;
  }
  function intersections(object:T.Object3D,recursive:boolean){
    hits.length=0;
    if(object.userData.fullHeightObstacle===true){
      if(!visibleInHierarchy(object))return hits;
      object.traverseVisible(child=>{if(child instanceof T.Mesh)raycaster.intersectObject(child,false,hits);});
      return hits;
    }
    return raycaster.intersectObject(object,recursive,hits);
  }
  let replacements:Replacement[]=[],localReplacements:Replacement[]=[],replacementsSent=false,replacementKey='';
  let treeOverrides:TreeOverride[]=[],localTreeOverrides:TreeOverride[]=[],treesSent=false,treeKey='';
  let instanceOverrides:InstanceOverride[]=[],localInstanceOverrides:InstanceOverride[]=[],instancesSent=false,instanceKey='';
  const raycaster=new T.Raycaster(),direction=new T.Vector3();
  const a=new T.Vector3(),b=new T.Vector3(),look=new T.Vector3();
  let failed=false,lastSync=-Infinity,lastTerrain=-Infinity,lastGround=0,lastProgress=performance.now();
  let terrainX=Infinity,terrainZ=Infinity,terrainPending=0,unloadedSince=0;
  const heights=new Map<string,number>();
  const ownedGround=groundOwnership();
  const excavations=groundExcavations();
  let lastCacheTrim=0;
  const native=()=>((frame.contentWindow as (Window&{streetsGame?:NativeWorld})|null)?.streetsGame);
  const fail=(message:string)=>{if(failed)return;failed=true;onError(message);};
  const onMessage=(event:MessageEvent)=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='streets-status')return;
    lastProgress=performance.now();
    if(event.data.status==='unsupported')fail('Streets GL are nevoie de WebGL 2. Activează accelerarea grafică în browser și reîncarcă jocul.');
    else if(event.data.status==='error')fail('Harta Streets GL nu s-a putut încărca. Reîncarcă jocul pentru a reîncerca.');
    else if(event.data.status==='loading')onProgress?.(`Se încarcă Streets GL… ${Math.round((event.data.progress??0)*100)}%`);
    else onProgress?.('Se încarcă terenul și clădirile din Chișinău…');
  };
  window.addEventListener('message',onMessage);
  frame.addEventListener('load',()=>frame.contentWindow?.postMessage({type:'streets-request-status'},location.origin));

  function height(x:number,z:number):number|null {
    const [n,,e]=localToMercator(x,0,z),value=native()?.height(n,e);
    return value==null||!Number.isFinite(value)?null:value/WORLD_SCALE;
  }
  // Landmark placement needs elevation, not the arrival of unrelated building proxies.
  const terrainReady=(x:number,z:number)=>height(x,z)!==null;
  function areaReady(x:number,z:number,radius:number){
    const [n,,e]=localToMercator(x,0,z);
    return terrainReady(x,z)&&native()?.areaReady?.(n,e,radius*WORLD_SCALE)===true;
  }
  const occlusion=createStreetsOcclusion(scene,ground,terrainReady);
  // A 2 m lattice avoids repeated cross-frame terrain queries during movement.
  // Missing samples are not cached: arriving height tiles become usable immediately.
  function sample(x:number,z:number) {
    const key=`${x}:${z}`,cached=heights.get(key);if(cached!==undefined)return cached;
    const value=height(x*2,z*2);if(value!==null)heights.set(key,value);return value;
  }
  function ground(x:number,z:number) {
    if(x>-121&&x<170&&z>-337&&z<-5)return height(x,z)??lastGround;
    const gx=Math.floor(x/2),gz=Math.floor(z/2),tx=x/2-gx,tz=z/2-gz;
    const h00=sample(gx,gz),h10=sample(gx+1,gz),h01=sample(gx,gz+1),h11=sample(gx+1,gz+1);
    if(h00===null||h10===null||h01===null||h11===null)return height(x,z)??lastGround;
    return (h00*(1-tx)+h10*tx)*(1-tz)+(h01*(1-tx)+h11*tx)*tz;
  }
  function loaded(x:number,z:number,requireSynced=false,feetY=-Infinity) {
    const [n,,e]=localToMercator(x,0,z);
    const api=native();if(!api?.hasTile(n,e)||height(x,z)===null)return false;
    // Teleports must wait for newly arrived tiles to enter the collision queue.
    if(requireSynced&&(api.tileId?!tileIds.has(api.tileId(n,e)??''):api.tiles(n,e,0).some(tile=>!tileIds.has(tile.id))))return false;
    // Do not let the player enter a newly streamed wall before its proxy exists.
    return !pending.some(({tile,part})=>part.max[1]/WORLD_SCALE>=feetY-.1&&n>tile.x+part.min[0]-8&&n<tile.x+part.max[0]+8&&e>tile.z+part.min[2]-8&&e<tile.z+part.max[2]+8);
  }

  // Colour comes entirely from Streets GL. These exact native building triangles
  // write depth only, so game actors are correctly hidden by the native buildings.
  function rebuildCollisionIndex(){
    collisionIndex=new SpatialIndex<Proxy>();
    for(const proxy of proxies.values()){const {min,max}=proxy.bounds;collisionIndex.insert(proxy,min.x,min.z,max.x,max.z);}
  }
  function syncBuildings(x:number,z:number) {
    const api=native();if(!api?.ready)return;
    const [n,,e]=localToMercator(x,0,z),keep=new Set<string>();let added=false;
    for(const tile of api.tiles(n,e,460*WORLD_SCALE)) {
      keep.add(tile.id);if(tileIds.has(tile.id))continue;
      tileIds.add(tile.id);added=true;
      for(const part of tile.parts)pending.push({id:`${tile.id}/${part.start}`,tile,part,distance:0});
    }
    const removed=[...tileIds].some(id=>!keep.has(id));
    // Most polls see the same resident tiles. Avoid filtering, scanning every
    // proxy and sorting the pending queue when the native set did not change.
    if(!added&&!removed)return;
    pending=pending.filter(p=>keep.has(p.tile.id));
    let removedProxy=false;
    for(const [id,proxy] of proxies)if(!keep.has(id.slice(0,id.lastIndexOf('/')))){
      scene.remove(proxy.mesh);proxy.mesh.geometry.dispose();proxies.delete(id);removedProxy=true;
    }
    for(const id of tileIds)if(!keep.has(id))tileIds.delete(id);
    // Near collision/depth proxies arrive first; construction has a per-frame budget.
    for(const p of pending)p.distance=Math.hypot(p.tile.x+(p.part.min[0]+p.part.max[0])/2-n,p.tile.z+(p.part.min[2]+p.part.max[2])/2-e);
    pending.sort((a,b)=>a.distance-b.distance);
    if(removedProxy)rebuildCollisionIndex();
  }
  function buildPending(motionCritical=false) {
    const deadline=performance.now()+(motionCritical?.6:2);
    let count=0;
    while(pending.length&&count++<(motionCritical?4:12)&&performance.now()<deadline){
      const {id,tile,part}=pending.shift()!;
      const geometry=new T.BufferGeometry();
      // Native buffers belong to the iframe's JS realm. Three.js checks the array
      // constructor during GPU upload, so adopt the values into the host realm.
      // Keep the copy within this budgeted queue; never pass an iframe array through.
      const positions=new Float32Array(tile.positions.subarray(part.start*3,(part.start+part.count)*3));
      geometry.setAttribute('position',new T.BufferAttribute(positions,3));
      geometry.boundingBox=new T.Box3(new T.Vector3().fromArray(part.min),new T.Vector3().fromArray(part.max));
      geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new T.Sphere());
      const mesh=new T.Mesh(geometry,depthMaterial);mesh.name='Streets GL · building depth';
      mesh.position.fromArray(mercatorToLocal(tile.x,0,tile.z));
      mesh.rotation.y=Math.PI/2+ROTATION;mesh.scale.setScalar(1/WORLD_SCALE);mesh.renderOrder=-1000;
      mesh.updateMatrixWorld(true);mesh.matrixAutoUpdate=false;scene.add(mesh);
      const proxy={mesh,bounds:geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)};
      proxies.set(id,proxy);const {min,max}=proxy.bounds;collisionIndex.insert(proxy,min.x,min.z,max.x,max.z);
    }
  }

  // A moving, depth-only terrain patch also occludes actors behind hills.
  // Four-metre, world-aligned cells replace the old 15 m depth triangles that
  // could cut through added paving as the patch shifted under the player.
  const terrainGeometry=new T.PlaneGeometry(480,480,120,120);terrainGeometry.rotateX(-Math.PI/2);
  const terrain=new T.Mesh(terrainGeometry,depthMaterial);terrain.renderOrder=-1001;terrain.frustumCulled=false;scene.add(terrain);
  // Building depth proxies share depthMaterial and must keep writing depth.
  const terrainDepthMaterial=depthMaterial.clone();excavations.mask(terrainDepthMaterial);terrain.material=terrainDepthMaterial;
  const shadowMaterial=new T.ShadowMaterial({opacity:.25,depthWrite:false});
  excavations.mask(shadowMaterial);
  const groundShadows=new T.Mesh(terrainGeometry,shadowMaterial);groundShadows.receiveShadow=true;groundShadows.frustumCulled=false;scene.add(groundShadows);
  groundShadows.visible=false;
  terrain.visible=false;
  let terrainJob:{x:number;z:number;index:number;values:Float32Array;missing:number}|null=null;
  function syncTerrain(x:number,z:number) {
    const positions=terrainGeometry.getAttribute('position') as T.BufferAttribute;
    const cx=Math.round(x/12)*12,cz=Math.round(z/12)*12;
    terrainJob={x:cx,z:cz,index:0,values:new Float32Array(positions.count),missing:0};
  }
  function buildTerrain(motionCritical=false){
    if(!terrainJob)return;
    const job=terrainJob,positions=terrainGeometry.getAttribute('position') as T.BufferAttribute,deadline=performance.now()+(motionCritical?.3:.8);
    for(let count=0;job.index<positions.count&&count<(motionCritical?128:384)&&performance.now()<deadline;count++,job.index++){
      const i=job.index,value=sample((job.x+positions.getX(i))/2,(job.z+positions.getZ(i))/2);
      if(value===null)job.missing++;job.values[i]=(value??lastGround)-.18;
    }
    if(job.index<positions.count)return;
    for(let i=0;i<positions.count;i++)positions.setY(i,job.values[i]);
    terrainGeometry.computeVertexNormals();
    positions.needsUpdate=true;terrain.position.set(job.x,0,job.z);terrain.updateMatrixWorld(true);terrain.visible=true;
    groundShadows.position.copy(terrain.position);groundShadows.visible=true;
    terrainX=job.x;terrainZ=job.z;terrainPending=job.missing;terrainJob=null;
  }

  function raycast(from:T.Vector3,to:T.Vector3,includeGround=true):number|null {
    if(!indexReady)refreshLandmarks();
    const length=direction.copy(to).sub(from).length();if(length<.0001)return null;
    direction.divideScalar(length);raycaster.set(from,direction);raycaster.near=0;raycaster.far=length;
    let nearest=Infinity;
    const minX=Math.min(from.x,to.x),maxX=Math.max(from.x,to.x),minZ=Math.min(from.z,to.z),maxZ=Math.max(from.z,to.z);
    for(const {mesh,bounds} of collisionIndex.query(minX,minZ,maxX,maxZ,candidates)) {
      if(maxX<bounds.min.x||minX>bounds.max.x||maxZ<bounds.min.z||minZ>bounds.max.z||Math.min(from.y,to.y)>bounds.max.y||Math.max(from.y,to.y)<bounds.min.y)continue;
      const hit=intersections(mesh,false)[0];if(hit)nearest=Math.min(nearest,hit.distance);
    }
    for(const {object,bounds} of landmarkIndex.query(minX,minZ,maxX,maxZ,landmarkCandidates)){
      if(!object.userData.grounded)continue;
      if(maxX<bounds.min.x||minX>bounds.max.x||maxZ<bounds.min.z||minZ>bounds.max.z||Math.min(from.y,to.y)>bounds.max.y||Math.max(from.y,to.y)<bounds.min.y)continue;
      const hit=intersections(object,true)[0];if(hit)nearest=Math.min(nearest,hit.distance);
    }
    if(includeGround&&terrain.visible){const hit=raycaster.intersectObject(terrain,false).find(h=>!excavations.contains(h.point.x,h.point.z));if(hit)nearest=Math.min(nearest,hit.distance);}
    return Number.isFinite(nearest)?nearest/length:null;
  }

  const surfaceNormal=new T.Vector3();
  function surface(x:number,z:number,ceiling:number){
    if(!indexReady)refreshLandmarks();
    let floor=excavations.floor(x,z,ground(x,z));if(ceiling<floor)return floor;
    raycaster.set(a.set(x,ceiling,z),direction.set(0,-1,0));raycaster.near=0;raycaster.far=ceiling-floor+.1;
    const take=(object:T.Object3D,recursive:boolean)=>{
      for(const hit of intersections(object,recursive)){
        if(hit.point.y<=floor||!hit.face)continue;
        surfaceNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        if(surfaceNormal.y>.55){floor=hit.point.y;break;}
      }
    };
    for(const {mesh,bounds}of collisionIndex.query(x,z,x,z,candidates))if(x>=bounds.min.x&&x<=bounds.max.x&&z>=bounds.min.z&&z<=bounds.max.z&&ceiling>=bounds.min.y&&bounds.max.y>floor)take(mesh,false);
    for(const {object,bounds} of landmarkIndex.query(x,z,x,z,landmarkCandidates))if(object.userData.grounded&&ceiling>=bounds.min.y&&bounds.max.y>floor)take(object,true);
    return floor;
  }

  type PlanPoint={x:number;z:number};
  function segmentDistanceSquared(p:PlanPoint,a:PlanPoint,b:PlanPoint){
    const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
    const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0;
    return (p.x-a.x-t*dx)**2+(p.z-a.z-t*dz)**2;
  }
  function segmentsIntersect(a:PlanPoint,b:PlanPoint,c:PlanPoint,d:PlanPoint){
    const cross=(p:PlanPoint,q:PlanPoint,r:PlanPoint)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);
    return Math.max(a.x,b.x)>=Math.min(c.x,d.x)&&Math.max(c.x,d.x)>=Math.min(a.x,b.x)&&
      Math.max(a.z,b.z)>=Math.min(c.z,d.z)&&Math.max(c.z,d.z)>=Math.min(a.z,b.z)&&
      cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;
  }
  function insidePolygon(p:PlanPoint,polygon:PlanPoint[]){
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
    }
    return inside;
  }
  function capsuleIntersects(polygon:PlanPoint[],from:PlanPoint,to:PlanPoint,radius:number){
    if(insidePolygon(from,polygon)||insidePolygon(to,polygon))return true;
    for(let i=0;i<polygon.length;i++){
      const p=polygon[i],q=polygon[(i+1)%polygon.length];
      if(segmentsIntersect(from,to,p,q)||Math.min(segmentDistanceSquared(p,from,to),segmentDistanceSquared(q,from,to),
        segmentDistanceSquared(from,p,q),segmentDistanceSquared(to,p,q))<=radius*radius)return true;
    }
    return false;
  }
  function polygonsIntersect(a:PlanPoint[],b:PlanPoint[]){
    if(a.some(p=>insidePolygon(p,b))||b.some(p=>insidePolygon(p,a)))return true;
    return a.some((p,i)=>b.some((q,j)=>segmentsIntersect(p,a[(i+1)%a.length],q,b[(j+1)%b.length])));
  }
  function clipHeight(polygon:T.Vector3[],height:number,above:boolean){
    const clipped:T.Vector3[]=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],inA=above?a.y>=height:a.y<=height,inB=above?b.y>=height:b.y<=height;
      if(inA)clipped.push(a);
      if(inA!==inB)clipped.push(a.clone().lerp(b,(height-a.y)/(b.y-a.y)));
    }
    return clipped;
  }
  // Thin real barriers can fall between the ordinary fixed-height probes.
  // Only explicitly marked, prepared colliders take this path. Clip their
  // actual triangles to the body height, then intersect the swept walking
  // capsule or oriented car footprint; a broad-phase box never becomes a wall.
  function fullHeightBlocked(minX:number,minZ:number,maxX:number,maxZ:number,low:number,high:number,
    intersects:(polygon:PlanPoint[])=>boolean){
    if(!indexReady)refreshLandmarks();
    for(const {object,bounds} of landmarkIndex.query(minX,minZ,maxX,maxZ,landmarkCandidates)){
      if(object.userData.fullHeightObstacle!==true||!object.userData.grounded||!visibleInHierarchy(object)||
        bounds.max.y<low||bounds.min.y>high)continue;
      let blocked=false;
      object.traverseVisible(child=>{
        if(blocked||!(child instanceof T.Mesh))return;
        const geometry=child.geometry,position=geometry.getAttribute('position'),index=geometry.index;
        if(!position)return;
        const first=Math.ceil(geometry.drawRange.start/3)*3;
        const last=Math.floor(Math.min(index?.count??position.count,geometry.drawRange.start+geometry.drawRange.count)/3)*3;
        child.updateWorldMatrix(true,false);
        for(let i=first;i<last;i+=3){
          const vertices=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(position,index?index.getX(i+k):i+k).applyMatrix4(child.matrixWorld));
          if(Math.max(...vertices.map(p=>p.x))<minX||Math.min(...vertices.map(p=>p.x))>maxX||
            Math.max(...vertices.map(p=>p.z))<minZ||Math.min(...vertices.map(p=>p.z))>maxZ||
            Math.max(...vertices.map(p=>p.y))<low||Math.min(...vertices.map(p=>p.y))>high)continue;
          const clipped=clipHeight(clipHeight(vertices,low,true),high,false);
          if(clipped.length&&intersects(clipped)){blocked=true;break;}
        }
      });
      if(blocked)return true;
    }
    return false;
  }
  function blocked(x:number,z:number,fromX=x,fromZ=z,radius=.3,feetY=ground(fromX,fromZ)) {
    if(!loaded(x,z,true,feetY))return true;
    const floor=Math.max(feetY,surface(x,z,feetY+.4)),previous=feetY;
    if(excavations.floor(x,z,ground(x,z))>feetY+.55)return true;
    if(fullHeightBlocked(Math.min(x,fromX)-radius,Math.min(z,fromZ)-radius,Math.max(x,fromX)+radius,Math.max(z,fromZ)+radius,
      Math.min(previous,floor)+.35,Math.max(previous,floor)+1.75,polygon=>capsuleIntersects(polygon,{x:fromX,z:fromZ},{x,z},radius)))return true;
    for(const h of [.35,1.25]) {
      a.set(fromX,previous+h,fromZ);b.set(x,floor+h,z);
      if(raycast(a,b,false)!==null)return true;
      a.set(x,floor+h,z);
      for(let i=0;i<6;i++){const angle=i*Math.PI/3;b.set(x+Math.cos(angle)*radius,floor+h,z+Math.sin(angle)*radius);if(raycast(a,b,false)!==null)return true;}
    }
    return false;
  }
  function carBlocked(x:number,z:number,heading:number) {
    if(!loaded(x,z))return true;
    const floor=ground(x,z),s=Math.sin(heading),c=Math.cos(heading);
    const corners=[[-.98,-2.25],[.98,-2.25],[.98,2.25],[-.98,2.25]].map(([px,pz])=>[x+px*c+pz*s,z-px*s+pz*c]);
    if(fullHeightBlocked(Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1])),
      floor+.20,floor+1.60,polygon=>polygonsIntersect(polygon,corners.map(([x,z])=>({x,z})))))return true;
    for(let i=0;i<4;i++) {
      const p=corners[i],q=corners[(i+1)%4];
      if(!loaded(p[0],p[1])||Math.abs(ground(p[0],p[1])-floor)>1.2)return true;
      a.set(p[0],floor+.65,p[1]);b.set(q[0],floor+.65,q[1]);if(raycast(a,b,false)!==null)return true;
      a.set(x,floor+.65,z);if(raycast(a,b,false)!==null)return true;
    }
    return false;
  }

  function render(camera:T.PerspectiveCamera,x:number,z:number,now:number,scale=1,velocity={x:0,z:0},prepareRadius=0,motionCritical=false) {
    excavations.update(x,z);
    refreshLandmarks();
    const api=native();
    if(!api?.ready){if(!failed&&now-lastProgress>120000)fail('Încărcarea Streets GL a durat prea mult. Verifică conexiunea și reîncearcă.');return;}
    const changedGround=ownedGround.collect();if(changedGround)api.replaceGround?.(changedGround);
    const active=replacements.filter((_,i)=>localReplacements[i].ready!==false),key=active.map(r=>r.id).join(',');
    if(!replacementsSent||key!==replacementKey){
      api.replaceBuildings(active);replacementsSent=true;replacementKey=key;
      // Retire the original depth meshes in this same frame as the visible replacement.
      lastSync=-Infinity;
    }
    let nextTreeKey='';const activeTrees=treeOverrides.filter((_,i)=>{if(localTreeOverrides[i].ready===false)return false;nextTreeKey+=i+',';return true;});
    if(!treesSent||nextTreeKey!==treeKey){api.replaceTrees?.(activeTrees);treesSent=true;treeKey=nextTreeKey;}
    let nextInstanceKey='';const activeInstances=instanceOverrides.filter((_,i)=>{if(localInstanceOverrides[i].ready===false)return false;nextInstanceKey+=i+',';return true;});
    if(!instancesSent||nextInstanceKey!==instanceKey){api.replaceInstances?.(activeInstances);instancesSent=true;instanceKey=nextInstanceKey;}
    const floor=height(x,z);if(floor!==null)lastGround=floor;
    if(now-lastCacheTrim>10000){
      for(const key of heights.keys()){const [gx,gz]=key.split(':').map(Number);if(Math.abs(gx*2-x)>600||Math.abs(gz*2-z)>600)heights.delete(key);}
      lastCacheTrim=now;
    }
    camera.getWorldDirection(look).add(camera.position);
    const [n,,e]=localToMercator(x,0,z),[vn,,ve]=localToMercator(x+velocity.x,0,z+velocity.z);
    api.render({sunDirection:NATIVE_SUN_DIRECTION,position:localToMercator(camera.position.x,camera.position.y,camera.position.z),target:localToMercator(look.x,look.y,look.z),fov:camera.fov,aspect:camera.aspect,near:camera.near*WORLD_SCALE,distance:camera.far*WORLD_SCALE,scale,visible:nativeVisible,streamFocus:[n,e],streamVelocity:[vn-n,ve-e],prepareRadius:prepareRadius*WORLD_SCALE});
    if(nativeVisible)occlusion.update(api.occlusion?.(),now,motionCritical?.55:1.5);
    if(now-lastSync>(motionCritical?500:350)){syncBuildings(x,z);lastSync=now;}
    buildPending(motionCritical);
    if(!terrainJob&&(Math.hypot(x-terrainX,z-terrainZ)>48||(terrainPending>0&&now-lastTerrain>2000))&&floor!==null){syncTerrain(x,z);lastTerrain=now;}
    buildTerrain(motionCritical);
    if(loaded(x,z))unloadedSince=0;
    else {if(!unloadedSince)unloadedSince=now;if(now-unloadedSince>120000)fail('Datele hărții Streets GL nu au ajuns. Verifică conexiunea și reîncarcă jocul.');}
  }
  function setVisible(visible:boolean){nativeVisible=visible;frame.style.visibility=visible?'visible':'hidden';if(!visible)occlusion.update(null,performance.now());return nativeVisible;}
  return {ground,surface,terrainReady,areaReady,loaded,blocked,carBlocked,raycast,render,setVisible,get visible(){return nativeVisible;},
    setGroundExcavations:excavations.set,
    setGroundLayers:ownedGround.setRoots,
    setLandmarks(objects:T.Object3D[],items:Replacement[]){landmarks.push(...objects);indexReady=false;localReplacements=items;replacements=items.map(buildingOwnership);replacementsSent=false;},
    setTrees(items:TreeOverride[]){localTreeOverrides=items;treeOverrides=items.map(r=>{const [x,,z]=localToMercator(r.x,0,r.z);return{...r,x,z,radius:r.radius*WORLD_SCALE,height:r.height*WORLD_SCALE,polygon:r.polygon?.map(p=>{const [n,,e]=localToMercator(p[0],0,p[1]);return[n,e];})};});treesSent=false;},
    setInstances(items:InstanceOverride[]){localInstanceOverrides=items;instanceOverrides=items.map(r=>{const [x,,z]=localToMercator(r.x,0,r.z);return{type:r.type,x,z,radius:r.radius*WORLD_SCALE};});instancesSent=false;},
    get ready(){return !!native()?.ready&&!failed;},dispose(){native()?.replaceInstances?.([]);window.removeEventListener('message',onMessage);occlusion.dispose();for(const {mesh}of proxies.values()){scene.remove(mesh);mesh.geometry.dispose();}proxies.clear();pending=[];heights.clear();scene.remove(terrain,groundShadows);terrainGeometry.dispose();terrainDepthMaterial.dispose();depthMaterial.dispose();shadowMaterial.dispose();frame.remove();}};
}
