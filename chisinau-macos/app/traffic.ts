import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelAssetUrl} from './model-assets';
import {CITY_DATA,roadWidth,type XY} from './city-layout';
import {createCarDamage} from './car-damage';
import type {ParticleKind,ShotHit} from './impacts';
import {overlapsCar,advanceCar,type CarState,type Obstacle} from './prius-physics';
import type {createVisibility} from './visibility';

type Route={p:XY[];length:number;segments:number[];width:number;oneway:boolean;anchor:number};
function routes(){
  const all=CITY_DATA.features.filter(f=>['primary','secondary','tertiary'].includes(f.t.highway)&&f.t.name&&f.p.length>1),used=new Set<string>(),out:Route[]=[];
  for(const first of all){
    if(used.has(first.id))continue;const p=first.p.slice();used.add(first.id);let found=true;
    while(found){found=false;for(const f of all){if(used.has(f.id)||f.t.name!==first.t.name)continue;const end=p.at(-1)!,start=p[0];if(Math.hypot(end[0]-f.p[0][0],end[1]-f.p[0][1])<1){p.push(...f.p.slice(1));used.add(f.id);found=true;break;}if(Math.hypot(start[0]-f.p.at(-1)![0],start[1]-f.p.at(-1)![1])<1){p.unshift(...f.p.slice(0,-1));used.add(f.id);found=true;break;}}}
    let length=0,anchor=0,nearest=Infinity;const segments=[0];
    for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(!len){segments.push(length);continue;}const t=T.MathUtils.clamp(((24-a[0])*dx+(-15-a[1])*dz)/(len*len),0,1),distance=Math.hypot(a[0]+dx*t-24,a[1]+dz*t+15);if(distance<nearest){nearest=distance;anchor=length+len*t;}length+=len;segments.push(length);}
    if(length>170)out.push({p,length,segments,width:roadWidth(first),oneway:first.t.oneway==='yes',anchor});
  }
  return out.sort((a,b)=>b.length-a.length).slice(0,8);
}

export type TrafficCar={root:T.Group;model:T.Group;distant:T.Group;damage:ReturnType<typeof createCarDamage>;path:Route;distance:number;speed:number;base:number;panic:number;spin:number;direction:number;idle:number;shadows:boolean;meshes:T.Mesh[];lowMeshes:T.Mesh[];wheels:{group:T.Object3D;axle:T.Object3D}[];box:Obstacle;parked:boolean;controlled:boolean;coast?:CarState};
export function createTraffic(scene:T.Scene,burst:(kind:ParticleKind,p:T.Vector3,d:T.Vector3,n?:number)=>void,visibility?:ReturnType<typeof createVisibility>,mobile=false,ground:(x:number,z:number)=>number=()=>0,mapBlocked:(x:number,z:number,heading:number)=>boolean=()=>false){
  const paths=routes(),colors=['#e7e5dc','#334b64','#973f36','#667650','#b6b6b0','#b79555','#2c3539','#bec9ce'];
  const cars:TrafficCar[]=[],ownedMaterials=new Set<T.Material>(),materialCopies=new Map<string,T.Material>(),nearObstacles:Obstacle[]=[];
  let loaded=false,failed=false,disposed=false,requested=false,source:T.Group|null=null,distantSource:T.Group|null=null,nearDone=false,farDone=false;
  const distantParts:T.InstancedMesh[]=[],distantCars:TrafficCar[]=[],hiddenMatrix=new T.Matrix4().makeScale(0,0,0);
  const count=mobile?28:40;
  function load(){
    if(requested||disposed)return;requested=true;
    const loader=new GLTFLoader();
    loader.load(modelAssetUrl('/prius-traffic.glb'),g=>{if(disposed)return;source=g.scene;nearDone=true;},undefined,()=>{nearDone=true;});
    loader.load(modelAssetUrl('/prius-distant.glb'),g=>{if(disposed)return;distantSource=g.scene;farDone=true;},undefined,()=>{farDone=true;});
  }
  function makeCar(i:number){
    const path=paths[i%paths.length],root=new T.Group(),model=(source??distantSource)!.clone(true),distant=(distantSource??source)!.clone(true);
    root.name=`Toyota Prius trafic ${i+1}`;root.add(model,distant);root.visible=false;
    const meshes:T.Mesh[]=[],wheels:{group:T.Object3D;axle:T.Object3D}[]=[];
    for(const detail of[model,distant]){
      detail.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes.push(o);o.castShadow=o.receiveShadow=true;
        const alter=(mat:T.Material)=>{const key=`${i%colors.length}:${mat.uuid}`;if(materialCopies.has(key))return materialCopies.get(key)!;const m=mat.clone() as T.MeshStandardMaterial;if(m.name==='carpaint'){m.color.set(colors[i%colors.length]);m.metalness=.42;m.roughness=.31;}if(m.name==='windowglass'){m.transparent=true;m.opacity=.34;m.depthWrite=false;}materialCopies.set(key,m);ownedMaterials.add(m);return m;};
        o.material=Array.isArray(o.material)?o.material.map(alter):alter(o.material);if((o.material as T.Material).name?.includes('glass'))o.castShadow=false;
      });
      for(const name of ['front_left','front_right','rear_left','rear_right']){const group=detail.getObjectByName(name);if(!group)continue;const axle=new T.Group();for(const c of [...group.children])axle.add(c);group.add(axle);wheels.push({group,axle});}
    }
    const row=Math.floor(i/paths.length),distance=(path.anchor+(row-2.5)*57+path.length*4)%path.length;
    const car:TrafficCar={root,model,distant,damage:null as unknown as ReturnType<typeof createCarDamage>,path,distance,speed:7.5+i%3,base:7.5+i%3,panic:0,spin:0,direction:path.oneway||row%2===0?1:-1,idle:0,shadows:true,meshes,lowMeshes:[],wheels,box:{x:0,z:0,w:2,d:4.5},parked:false,controlled:false};
    car.damage=createCarDamage(root,model,burst,()=>{car.panic=9;},[distant]);
    distant.traverseVisible(o=>{if(o instanceof T.Mesh)car.lowMeshes.push(o);});
    if(!distantParts.length)for(const [i,part]of car.lowMeshes.entries()){const material=(part.material as T.MeshStandardMaterial).clone();material.color.set(0xffffff);ownedMaterials.add(material);const batch=new T.InstancedMesh(part.geometry,material,count);batch.name=`Prius departe · parte ${i}`;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.frustumCulled=false;batch.count=0;scene.add(batch);distantParts.push(batch);}
    cars.push(car);place(car,0);
  }
  const located={x:0,z:0,heading:0};
  function locate(path:Route,distance:number,direction=1){
    const d=((distance%path.length)+path.length)%path.length;let i=1;while(i<path.segments.length-1&&path.segments[i]<d)i++;
    const a=path.p[i-1],b=path.p[i],t=(d-path.segments[i-1])/Math.max(.001,path.segments[i]-path.segments[i-1]);
    located.heading=Math.atan2(-(b[0]-a[0])*direction,-(b[1]-a[1])*direction);const lane=path.oneway?0:Math.min(2,path.width*.22);
    located.x=a[0]+(b[0]-a[0])*t+Math.cos(located.heading)*lane;located.z=a[1]+(b[1]-a[1])*t-Math.sin(located.heading)*lane;return located;
  }
  function place(c:TrafficCar,dt:number){
    const p=locate(c.path,c.distance,c.direction),drift=c.damage?.flatCount?Math.sin(c.distance*.22)*.32:0;
    c.root.position.set(p.x+Math.cos(p.heading)*drift,ground(p.x,p.z),p.z-Math.sin(p.heading)*drift);
    const previous=c.root.rotation.y,delta=Math.atan2(Math.sin(p.heading-previous),Math.cos(p.heading-previous));c.root.rotation.y=dt?previous+delta*(1-Math.exp(-8*dt)):p.heading;
    c.box.x=c.root.position.x;c.box.z=c.root.position.z;c.box.w=Math.abs(Math.cos(p.heading))*1.8+Math.abs(Math.sin(p.heading))*4.5;c.box.d=Math.abs(Math.sin(p.heading))*1.8+Math.abs(Math.cos(p.heading))*4.5;
    return delta;
  }
  function update(dt:number,player:{x:number;z:number;heading:number;speed?:number;steer?:number}|null,pedestrian?:T.Vector3){
    // Build a few shared-geometry instances per frame, avoiding one long loading stall.
    if(nearDone&&farDone&&!loaded&&!failed){if((!source&&!distantSource)||!paths.length)failed=true;else{for(let i=0;i<3&&cars.length<count;i++)makeCar(cars.length);loaded=cars.length===count;}}
    nearObstacles.length=0;distantCars.length=0;
    for(const c of cars){
      if(c.controlled&&player){
        c.root.position.set(player.x,ground(player.x,player.z),player.z);c.root.rotation.y=player.heading;
        c.spin-=(player.speed??0)*dt/.302;
        for(const wheel of c.wheels){wheel.axle.rotation.x=c.spin;wheel.group.rotation.y=wheel.group.name.startsWith('front')?(player.steer??0):0;}
        c.box.x=player.x;c.box.z=player.z;c.box.w=Math.abs(Math.cos(player.heading))*1.8+Math.abs(Math.sin(player.heading))*4.5;c.box.d=Math.abs(Math.sin(player.heading))*1.8+Math.abs(Math.cos(player.heading))*4.5;
        c.model.visible=true;c.distant.visible=false;if(!c.model.parent)c.root.add(c.model);c.distant.removeFromParent();
        if(!c.root.parent)scene.add(c.root);c.root.visible=true;c.root.updateMatrixWorld(true);
        c.damage.update(dt,player.speed??0);continue;
      }
      const nearby=!visibility||visibility.sees(c.root.position,3,mobile?220:320),wasVisible=c.root.visible;
      if(c.coast){
        const s=c.coast;
        advanceCar(s,{throttle:0,brake:.18,steer:0,handbrake:false,offroad:false},dt,(x,z,h)=>mapBlocked(x,z,h)||cars.some(other=>other!==c&&overlapsCar(x,z,h,other.box))||!!player&&overlapsCar(x,z,h,{x:player.x,z:player.z,w:1.8,d:4.5}));
        c.root.position.set(s.x,ground(s.x,s.z),s.z);c.root.rotation.y=s.heading;c.speed=s.speed;c.spin-=s.speed*dt/.302;
        c.box.x=s.x;c.box.z=s.z;c.box.w=Math.abs(Math.cos(s.heading))*1.8+Math.abs(Math.sin(s.heading))*4.5;c.box.d=Math.abs(Math.sin(s.heading))*1.8+Math.abs(Math.cos(s.heading))*4.5;
        if(Math.abs(s.speed)<.03){c.speed=0;c.coast=undefined;}
      }
      const active=!c.parked&&(nearby||!player||Math.hypot(c.root.position.x-player.x,c.root.position.z-player.z)<100);
      c.idle+=dt;const step=active?c.idle:c.idle>=.5?c.idle:0;
      let delta=0;
      if(step&&!c.parked){c.idle=0;c.panic=Math.max(0,c.panic-step);let target=c.panic>0?(c.damage.flatCount?14:21):c.base;
        if(pedestrian&&Math.hypot(c.root.position.x-pedestrian.x,c.root.position.z-pedestrian.z)<5)target=0;
        if(player&&Math.hypot(c.root.position.x-player.x,c.root.position.z-player.z)<12){const next=locate(c.path,c.distance+c.direction*6,c.direction);if(overlapsCar(player.x,player.z,player.heading,{x:next.x,z:next.z,w:4,d:4}))target=0;}
        for(const other of cars){if(other===c||other.controlled||other.path!==c.path||other.direction!==c.direction)continue;const ahead=((other.distance-c.distance)*c.direction+c.path.length)%c.path.length;if(ahead<9)target=Math.min(target,Math.max(0,other.speed-3));}
        c.speed=T.MathUtils.damp(c.speed,target,target<c.speed?5:1.4,step);c.distance=(c.distance+c.direction*c.speed*step+c.path.length)%c.path.length;delta=place(c,step);c.spin-=c.speed*step/.302;
      }
      const visible=!visibility||visibility.sees(c.root.position,3,mobile?220:320);c.root.visible=visible;
      if(visible){const distance=visibility?c.root.position.distanceTo(visibility.position):0;
        const detailed=distance<(mobile?28:45);c.model.visible=detailed;c.distant.visible=!detailed;
        if(detailed){if(!c.model.parent)c.root.add(c.model);c.distant.removeFromParent();if(!c.root.parent)scene.add(c.root);}
        else{if(!c.distant.parent)c.root.add(c.distant);c.model.removeFromParent();c.root.removeFromParent();distantCars.push(c);}
        for(const w of c.wheels){w.axle.rotation.x=c.spin;w.group.rotation.y=w.group.name.startsWith('front')?T.MathUtils.clamp(-delta*.45,-.4,.4):0;}c.damage.update(dt,c.speed);
        const shadows=distance<45;if(shadows!==c.shadows){for(const m of c.meshes)m.castShadow=shadows&&!(m.material as T.Material).name?.includes('glass');c.shadows=shadows;}
        if(!wasVisible)c.root.updateMatrixWorld(true);
      }else if(c.root.parent)scene.remove(c.root);
      const observer=pedestrian??player??visibility?.position;
      if(!observer||Math.hypot(c.box.x-observer.x,c.box.z-observer.z)<65)nearObstacles.push(c.box);
    }
    for(const c of distantCars)c.root.updateMatrixWorld(true);
    for(let part=0;part<distantParts.length;part++){const batch=distantParts[part];batch.count=distantCars.length;batch.visible=distantCars.length>0;
      for(let i=0;i<distantCars.length;i++){const mesh=distantCars[i].lowMeshes[part];batch.setMatrixAt(i,mesh.visible?mesh.matrixWorld:hiddenMatrix);batch.setColorAt(i,(mesh.material as T.MeshStandardMaterial).color);}
      if(distantCars.length){batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
    }
  }
  function raycast(a:T.Vector3,b:T.Vector3){let result:ShotHit|null=null;for(const c of cars){if(!c.root.visible)continue;const hit=c.damage.raycast(a,b);if(hit&&(!result||hit.fraction<result.fraction))result=hit;}return result;}
  function nearest(position:T.Vector3,range=3.8){let found:TrafficCar|null=null,best=range;for(const c of cars){if(Math.abs(c.root.position.y-position.y)>2)continue;const distance=Math.hypot(c.root.position.x-position.x,c.root.position.z-position.z);if(distance<best){best=distance;found=c;}}return found;}
  function take(c:TrafficCar){c.controlled=true;c.parked=false;c.coast=undefined;c.speed=0;c.idle=0;return{x:c.root.position.x,z:c.root.position.z,heading:c.root.rotation.y};}
  function release(c:TrafficCar,motion?:CarState){c.controlled=false;c.parked=true;c.speed=motion?.speed??0;c.idle=0;c.coast=motion?{...motion}:undefined;}
  return{cars,load,update,raycast,nearest,take,release,get loaded(){return loaded},get failed(){return failed},obstacles:()=>nearObstacles,dispose(){disposed=true;for(const batch of distantParts)scene.remove(batch);for(const c of cars){c.damage.dispose();scene.remove(c.root);}for(const s of[source,distantSource])s?.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});ownedMaterials.forEach(m=>m.dispose());}};
}
