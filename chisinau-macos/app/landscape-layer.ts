import {detailInRange} from './detail-visibility';
import {groundPartition,groundShape,groundCoverage} from './ground-partition';
import * as T from 'three';
import {canBuildScene,sceneBuildDeadline,sceneBuildFocus,sceneBuildStages} from './scene-build-budget';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {parkMaterial} from './park-materials';
import {prepareLandmarkCollision} from './landmark-collision';
import type {XY} from './city-layout';
type Job={root:T.Group;collision:T.Group;x:number;z:number;run:()=>Generator<void>;done:boolean;lastNear:number;iterator?:Generator<void>;coverage?:number[][][][]};
type Part={geometry:T.BufferGeometry;kind:number;fine:boolean;physical:boolean};
/** One material batch per cell, fixed world coordinates and persistent colliders. */
export function landscapeLayer(scene:T.Scene,name:string,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean,options:{material?:T.MeshStandardMaterial;maxEdge?:number;residentDistance?:number}={}){
  // Register the real road, pavement and landscaped cells during the native
  // build. Previously only streetMesh layers were exported, so Metal kept the
  // old Streets GL roads underneath otherwise up-to-date architecture.
  const nativeExport=Array.isArray((globalThis as any).__CHISINAU_NATIVE_STREET_MESHES__);
  // One ground shader per cell carries its surface family as a vertex attribute.
  // Different paving/grass appearances do not multiply draw calls.
  const materials=[options.material??parkMaterial('ground'),parkMaterial('water'),new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.35,transparent:true,opacity:.13,depthWrite:false,side:T.DoubleSide})];
  const physicalMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  const objects:T.Group[]=[],collisionObjects:T.Group[]=[],jobs:Job[]=[],visuals:{mesh:T.Mesh;fine:boolean}[]=[];
  let groundRings:number[][][][]=[];
  let target:T.Group,physical:T.Group,parts:Part[]=[],disposed=false;
  const colors=new Map<string,T.Color>(),unitBox=new T.BoxGeometry(1,1,1).toNonIndexed();unitBox.deleteAttribute('uv');
  function put(g:T.BufferGeometry,color:string,kind=0,fine=false,collide=false){
    const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();flat.deleteAttribute('uv');
    let c=colors.get(color);if(!c){c=new T.Color(color);colors.set(color,c);}
    const values=new Float32Array(flat.attributes.position.count*3);for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}
    flat.setAttribute('color',new T.BufferAttribute(values,3));flat.setAttribute('parkStyle',new T.BufferAttribute(new Float32Array(flat.attributes.position.count).fill(kind),1));parts.push({geometry:flat,kind,fine,physical:collide});
  }
  function* flush(){
    for(const fine of[false,true])for(let kind=0;kind<materials.length;kind++){
      const selected=parts.filter(p=>(p.kind===6?1:p.kind===9?2:0)===kind&&p.fine===fine);if(!selected.length)continue;
      const g=mergeGeometries(selected.map(p=>p.geometry))!;g.computeBoundingBox();g.computeBoundingSphere();
      const mesh=new T.Mesh(g,materials[kind]);mesh.name=target.name+(fine?' · detalii':' · suprafețe');mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;target.add(mesh);visuals.push({mesh,fine});
      const solid=selected.filter(p=>p.physical);if(!nativeExport&&solid.length){const g=mergeGeometries(solid.map(p=>p.geometry))!;physical.add(new T.Mesh(g,physicalMaterial));}
      selected.forEach(p=>p.geometry.dispose());yield;
    }
    parts=[];physical.updateMatrixWorld(true);if(!nativeExport)yield* prepareLandmarkCollision(physical);
    target.userData.groundRings=groundCoverage(target.name,active?.coverage??groundRings);groundRings=[];
  }
  function job(title:string,x:number,z:number,run:()=>Generator<void>,coverage?:number[][][][]){const root=new T.Group(),collision=new T.Group();root.name=`${name} · ${title}`;root.visible=false;root.matrixAutoUpdate=false;collision.matrixAutoUpdate=false;collision.name=root.name+' · coliziune';scene.add(root);objects.push(root);collisionObjects.push(collision);jobs.push({root,collision,x,z,run,done:false,lastNear:0,coverage});}
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,fine=false,collide=false,angle=0){const g=unitBox.clone();g.scale(w,h,d);g.rotateY(angle);g.translate(x,y,z);put(g,color,0,fine,collide);}
  function cylinder(x:number,y:number,z:number,rt:number,rb:number,h:number,color:string,fine=false,sides=10,collide=false){const g=new T.CylinderGeometry(rt,rb,h,sides);g.translate(x,y,z);put(g,color,0,fine,collide);}
  function shrub(x:number,y:number,z:number,rx:number,ry:number,rz:number,color='#426037',clipped=false){const g=new T.SphereGeometry(1,clipped?6:8,clipped?4:5);g.scale(rx,ry,rz);g.translate(x,y+ry,z);put(g,color,0,true);}
  function beam(a:T.Vector3,b:T.Vector3,r:number,color:string,kind=0,fine=true){const d=b.clone().sub(a),g=new T.CylinderGeometry(r,r,d.length(),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);put(g,color,kind,fine);}
  function polygon(rings:number[][][]){const shape=new T.Shape();rings[0].forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();for(const ring of rings.slice(1)){const hole=new T.Path();ring.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();shape.holes.push(hole);}return shape;}
  function* surfaceStaged(rings:number[][][],color:string,kind:number,height:(x:number,z:number)=>number,collide=false):Generator<void>{
    const partition=groundPartition(target.name,rings);if(!partition.length)return;groundRings.push(...partition);
    const source=new T.ShapeGeometry(partition.map(groundShape));source.rotateX(-Math.PI/2);const flat=source.index?source.toNonIndexed():source.clone(),v=flat.attributes.position,out:number[]=[];
    function triangle(a:XY,b:XY,c:XY,depth=0){
      const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),ca=Math.hypot(a[0]-c[0],a[1]-c[1]);
      if(depth<12&&Math.max(ab,bc,ca)>(options.maxEdge??5)){
        // Bisect the longest edge: a long, narrow footpath must not subdivide
        // like a square lawn into thousands of nearly degenerate triangles.
        if(ab>=bc&&ab>=ca){const m:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];triangle(a,m,c,depth+1);triangle(m,b,c,depth+1);}
        else if(bc>=ca){const m:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];triangle(a,b,m,depth+1);triangle(a,m,c,depth+1);}
        else{const m:XY=[(a[0]+c[0])/2,(a[1]+c[1])/2];triangle(a,b,m,depth+1);triangle(m,b,c,depth+1);}return;
      }
      for(const [x,z]of[a,b,c])out.push(x,0,z);
    }
    for(let i=0;i<v.count;i+=3)triangle([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);
    source.dispose();flat.dispose();
    // Cross-renderer terrain queries and interpolation are the expensive part.
    // Yield every 64 vertices instead of grounding one entire road cell at once.
    for(let i=0;i<out.length;i+=3){out[i+1]=height(out[i],out[i+2]);if(i%192===189)yield;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();put(g,color,kind,false,collide);
  }
  function surface(rings:number[][][],color:string,kind:number,height:(x:number,z:number)=>number,collide=false){for(const _ of surfaceStaged(rings,color,kind,height,collide)){};}
  function edging(ring:number[][],height:number,width=.15,color='#a4a69d'){
    for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),n=Math.max(1,Math.ceil(len/2.5));for(let k=0;k<n;k++){const t=(k+.5)/n,x=a[0]+dx*t,z=a[1]+dz*t;box(x,ground(x,z)+height/2+.08,z,len/n+.015,height,width,color,false,false,Math.atan2(-dz,dx));}}
  }
  function release(j:Job){
    for(let i=visuals.length-1;i>=0;i--)if(visuals[i].mesh.parent===j.root)visuals.splice(i,1);
    for(const group of[j.root,j.collision]){group.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});group.clear();}
    j.root.visible=false;j.root.userData.groundRings=[];j.collision.userData.grounded=false;j.collision.userData.revision=(j.collision.userData.revision??0)+1;j.done=false;j.iterator=undefined;
  }
  const frustum=new T.Frustum(),matrix=new T.Matrix4(),sphere=new T.Sphere();let active:Job|undefined;
  function buildAllForNativeExport(){
    if(!nativeExport)throw new Error('Native export is not active.');
    for(const selected of jobs){
      if(selected.done)continue;
      active=selected;target=selected.root;physical=selected.collision;
      selected.iterator=(function*(){yield* selected.run();yield* flush();})();
      while(!selected.iterator.next().done){}
      selected.done=true;selected.root.visible=true;selected.root.updateMatrixWorld(true);
      active=undefined;
    }
  }
  const api={objects,collisionObjects,job,put,box,cylinder,shrub,beam,surface,surfaceStaged,edging,replacements:[],buildAllForNativeExport,get ready(){return jobs.every(j=>j.done);},get residentCount(){return jobs.filter(j=>j.done).length;},readyNear(x:number,z:number,r=80){return jobs.every(j=>Math.hypot(x-j.x,z-j.z)>r||j.done);},
    update(camera:T.PerspectiveCamera,_now:number){
      if(disposed)return;
      const focus=sceneBuildFocus(camera);
      if(options.residentDistance){
        for(const j of jobs){const d=Math.hypot(focus.x-j.x,focus.z-j.z);if(d<options.residentDistance)j.lastNear=_now;else if(j.done&&_now-j.lastNear>15000)release(j);}
        if(active&&Math.hypot(focus.x-active.x,focus.z-active.z)>options.residentDistance){parts.forEach(p=>p.geometry.dispose());parts=[];groundRings=[];release(active);active=undefined;}
      }
      materials[1].userData.parkTime.value=_now*.001;
      if(!active){let best=440;for(const j of jobs){if(j.done)continue;const d=Math.hypot(focus.x-j.x,focus.z-j.z);if(d<best&&loaded(j.x,j.z)&&loaded(j.x-19,j.z-19)&&loaded(j.x+19,j.z+19)){best=d;active=j;}}
        if(active){const selected=active;active.iterator=(function*(){yield* selected.run();yield* flush();})();}}
      if(active&&canBuildScene()){target=active.root;physical=active.collision;const deadline=sceneBuildDeadline(1.25);let stages=0;do{const result=active.iterator!.next();stages++;if(result.done){active.done=true;active.root.visible=true;active.root.updateMatrixWorld(true);physical.userData.grounded=true;physical.userData.revision=1;physical.updateMatrixWorld(true);active=undefined;break;}}while(stages<sceneBuildStages(3)&&performance.now()<deadline);}
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      for(const item of visuals){sphere.copy(item.mesh.geometry.boundingSphere!);const distance=camera.position.distanceTo(sphere.center)-sphere.radius;item.mesh.visible=(item.fine?detailInRange(item.mesh,distance,115):distance<camera.far)&&frustum.intersectsSphere(sphere);item.mesh.castShadow=item.fine&&item.mesh.visible&&distance<65;}
    },
    dispose(){unitBox.dispose();disposed=true;for(const root of[...objects,...collisionObjects]){scene.remove(root);root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}parts.forEach(p=>p.geometry.dispose());[...materials,physicalMaterial].forEach(m=>m.dispose());}
  };
  if(nativeExport)(globalThis as any).__CHISINAU_NATIVE_STREET_MESHES__.push(api);
  return api;
}
