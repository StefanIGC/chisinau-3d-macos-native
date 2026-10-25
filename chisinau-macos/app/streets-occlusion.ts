import * as T from 'three';
import {mercatorToLocal,ROTATION,WORLD_SCALE} from './streets-coordinates';

export type NativeInstanceDepth={name:string;kind:number;x:number;z:number;positions:Float32Array;uv:Float32Array;indices:Uint32Array;instances:Float32Array;stride:number;images:HTMLImageElement[]};
type NativeBarrierDepth={id:string;x:number;z:number;positions:Float32Array;uv:Float32Array;textureIds:Uint8Array};
export type NativeOcclusionFrame={instances:NativeInstanceDepth[];barriers:NativeBarrierDepth[];barrierImages:(HTMLImageElement|null)[]};
type InstanceEntry={mesh:T.Mesh<T.InstancedBufferGeometry,T.ShaderMaterial>;buffer:T.InstancedInterleavedBuffer;source:Float32Array;instanceSource:Float32Array};
type BarrierEntry={source:NativeBarrierDepth;meshes:T.Mesh[];cursor:number;seen:number;active:boolean};

// The same transforms and alpha threshold as Streets GL's tree / instance shaders.
// A depth-only prepass lets the native map show through wherever it is nearer.
export const INSTANCE_DEPTH_VERTEX=`
attribute vec3 instancePosition;
#if INSTANCE_KIND == 2
attribute vec3 instanceScale;
attribute vec3 instanceRotation;
#else
attribute float instanceScale;
attribute float instanceRotation;
#endif
#if INSTANCE_KIND == 1
attribute float instanceSeed;
varying float vSeed;
#endif
varying vec2 vUv;
void main(){
  vUv=uv;
  vec3 p=position*instanceScale;
  #if INSTANCE_KIND == 2
    float cz=cos(instanceRotation.z),sz=sin(instanceRotation.z);
    p.xy=mat2(cz,sz,-sz,cz)*p.xy;
    float angle=instanceRotation.y;
  #else
    float angle=instanceRotation;
  #endif
  float c=cos(angle),s=sin(angle);
  p.xz=mat2(c,-s,s,c)*p.xz;
  #if INSTANCE_KIND == 1
    vSeed=instanceSeed;
  #endif
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p+instancePosition,1.0);
}`;
export const INSTANCE_DEPTH_FRAGMENT=`
varying vec2 vUv;
uniform sampler2D t0;
#if INSTANCE_KIND == 1
varying float vSeed;
uniform sampler2D t1;
uniform sampler2D t2;
uniform sampler2D t3;
uniform sampler2D t4;
#endif
void main(){
  #if INSTANCE_KIND == 1
    float alpha;
    if(vSeed<0.5)alpha=texture2D(t0,vUv).a;
    else if(vSeed<1.5)alpha=texture2D(t1,vUv).a;
    else if(vSeed<2.5)alpha=texture2D(t2,vUv).a;
    else if(vSeed<3.5)alpha=texture2D(t3,vUv).a;
    else alpha=texture2D(t4,vUv).a;
    if(alpha<0.5)discard;
  #elif INSTANCE_KIND == 0
    if(texture2D(t0,vUv).a<0.5)discard;
  #endif
  gl_FragColor=vec4(0.0);
}`;

export function createStreetsOcclusion(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  const instances=new Map<string,InstanceEntry>(),barriers=new Map<string,BarrierEntry>();
  const textureCache=new Map<HTMLImageElement,T.Texture>(),barrierMaterials=new Map<number,T.MeshBasicMaterial>();
  const textures=new Set<T.Texture>();let disposed=false;
  function texture(image:HTMLImageElement,flipY=false){
    let value=textureCache.get(image);if(value)return value;
    // The already-loaded, CORS-safe DOM image can be uploaded in either GL
    // context. Numeric buffers below MUST be copied across the iframe realm.
    value=new T.Texture(image);value.flipY=flipY;value.wrapS=value.wrapT=T.RepeatWrapping;value.anisotropy=4;value.needsUpdate=true;
    textureCache.set(image,value);textures.add(value);return value;
  }
  function geometry(packet:NativeInstanceDepth){
    const g=new T.InstancedBufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(packet.positions),3));
    g.setAttribute('uv',new T.BufferAttribute(new Float32Array(packet.uv),2));
    g.setIndex(new T.BufferAttribute(new Uint32Array(packet.indices),1));
    const count=packet.instances.length/packet.stride,capacity=Math.max(32,T.MathUtils.ceilPowerOfTwo(count));
    const buffer=new T.InstancedInterleavedBuffer(new Float32Array(capacity*packet.stride),packet.stride);buffer.setUsage(T.DynamicDrawUsage);
    g.setAttribute('instancePosition',new T.InterleavedBufferAttribute(buffer,3,0));
    g.setAttribute('instanceScale',new T.InterleavedBufferAttribute(buffer,packet.kind===2?3:1,3));
    g.setAttribute('instanceRotation',new T.InterleavedBufferAttribute(buffer,packet.kind===2?3:1,packet.kind===2?6:4));
    if(packet.kind===1)g.setAttribute('instanceSeed',new T.InterleavedBufferAttribute(buffer,1,5));
    return{g,buffer};
  }
  function instance(packet:NativeInstanceDepth){
    let entry=instances.get(packet.name);
    if(!entry){
      const uniforms:Record<string,T.IUniform>={};packet.images.forEach((image,i)=>{uniforms[`t${i}`]={value:texture(image)};});
      const material=new T.ShaderMaterial({name:`Streets GL · ${packet.name} depth`,defines:{INSTANCE_KIND:packet.kind},uniforms,vertexShader:INSTANCE_DEPTH_VERTEX,fragmentShader:INSTANCE_DEPTH_FRAGMENT,colorWrite:false,depthWrite:true,depthTest:true,side:T.DoubleSide,blending:T.NoBlending});
      const {g,buffer}=geometry(packet),mesh=new T.Mesh(g,material);mesh.name=material.name;mesh.renderOrder=-1002;mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;
      entry={mesh,buffer,source:packet.positions,instanceSource:packet.instances};instances.set(packet.name,entry);scene.add(mesh);
    }else if(entry.buffer.array.length<packet.instances.length||entry.source!==packet.positions){
      entry.mesh.geometry.dispose();const {g,buffer}=geometry(packet);entry.mesh.geometry=g;entry.buffer=buffer;entry.source=packet.positions;
    }
    // Streets GL keeps static instance arrays alive between frames. Upload only
    // when that source changes instead of copying every tree/prop every frame.
    if(entry.instanceSource!==packet.instances||entry.mesh.geometry.instanceCount!==packet.instances.length/packet.stride){
      entry.buffer.array.set(packet.instances);entry.buffer.clearUpdateRanges();entry.buffer.addUpdateRange(0,packet.instances.length);entry.buffer.needsUpdate=true;entry.instanceSource=packet.instances;
    }
    entry.mesh.geometry.instanceCount=packet.instances.length/packet.stride;
    entry.mesh.position.fromArray(mercatorToLocal(packet.x,0,packet.z));entry.mesh.rotation.y=Math.PI/2+ROTATION;entry.mesh.scale.setScalar(1/WORLD_SCALE);
    entry.mesh.updateMatrix();entry.mesh.updateMatrixWorld(true);entry.mesh.visible=entry.mesh.geometry.instanceCount>0;
  }
  function buildBarrier(entry:BarrierEntry,images:NativeOcclusionFrame['barrierImages']){
    const data=entry.source,groups=new Map<number,{positions:number[];uv:number[]}>();
    // Fences / hedges follow native terrain. Limit new work to 180 triangles,
    // retaining completed batches rather than rebuilding them during movement.
    const end=Math.min(data.positions.length,entry.cursor+180*9);
    for(;entry.cursor<end;entry.cursor+=9){
      const offset=entry.cursor,id=data.textureIds[offset/3],image=images[id];if(!image)continue;
      const points:[number,number,number][]=[];
      for(let j=0;j<3;j++)points.push(mercatorToLocal(data.x+data.positions[offset+j*3],data.positions[offset+j*3+1],data.z+data.positions[offset+j*3+2]));
      if(points.some(([x,,z])=>!loaded(x,z)))break;
      let group=groups.get(id);if(!group){group={positions:[],uv:[]};groups.set(id,group);}
      for(let j=0;j<3;j++){const [x,y,z]=points[j];group.positions.push(x,ground(x,z)+y,z);const uvOffset=(offset/3+j)*2;group.uv.push(data.uv[uvOffset],data.uv[uvOffset+1]);}
    }
    for(const [id,group]of groups){
      let material=barrierMaterials.get(id);if(!material){material=new T.MeshBasicMaterial({map:texture(images[id]!,true),alphaTest:.5,colorWrite:false,depthWrite:true,side:T.DoubleSide});barrierMaterials.set(id,material);}
      // Incremental loading still produces at most one draw per tile/material.
      const previous=entry.meshes.find(mesh=>mesh.userData.textureId===id),old=previous?.geometry;
      const append=(name:string,values:number[])=>{const before=old?.getAttribute(name).array,array=new Float32Array((before?.length??0)+values.length);if(before)array.set(before);array.set(values,before?.length??0);return array;};
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(append('position',group.positions),3));g.setAttribute('uv',new T.BufferAttribute(append('uv',group.uv),2));g.computeBoundingSphere();
      if(previous){previous.geometry=g;old!.dispose();}
      else{const mesh=new T.Mesh(g,material);mesh.name='Streets GL · barrier depth';mesh.userData.textureId=id;mesh.renderOrder=-1002;scene.add(mesh);entry.meshes.push(mesh);}
    }
  }
  function removeBarrier(entry:BarrierEntry){for(const mesh of entry.meshes){scene.remove(mesh);mesh.geometry.dispose();}}
  return{
    update(frame:NativeOcclusionFrame|null|undefined,now:number,budget=1.5){
      if(disposed)return;
      for(const entry of instances.values())entry.mesh.visible=false;
      for(const entry of barriers.values()){entry.active=false;for(const mesh of entry.meshes)mesh.visible=false;}
      if(!frame)return;
      for(const packet of frame.instances)if(packet.instances.length)instance(packet);
      for(const packet of frame.barriers){
        let entry=barriers.get(packet.id);if(!entry){entry={source:packet,meshes:[],cursor:0,seen:now,active:true};barriers.set(packet.id,entry);}
        entry.seen=now;entry.active=true;for(const mesh of entry.meshes)mesh.visible=true;
      }
      const deadline=performance.now()+budget;
      for(const [id,entry]of barriers){
        if(!entry.active&&now-entry.seen>10000){removeBarrier(entry);barriers.delete(id);continue;}
        if(entry.active&&entry.cursor<entry.source.positions.length&&performance.now()<deadline)buildBarrier(entry,frame.barrierImages);
      }
    },
    dispose(){disposed=true;for(const entry of instances.values()){scene.remove(entry.mesh);entry.mesh.geometry.dispose();entry.mesh.material.dispose();}for(const entry of barriers.values())removeBarrier(entry);for(const material of barrierMaterials.values())material.dispose();textures.forEach(t=>t.dispose());instances.clear();barriers.clear();}
  };
}
