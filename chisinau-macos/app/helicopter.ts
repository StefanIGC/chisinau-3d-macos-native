import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelAssetUrl} from './model-assets';
import {advanceHelicopter,makeFlightState,IDLE_FLIGHT,type FlightInput,type FlightWorld} from './helicopter-physics';

export type HelicopterAction='interact'|'spawn'|'land'|'hover';
export type HelicopterHud={loaded:boolean;failed:boolean;piloting:boolean;near:boolean;speed:number;altitude:number;rotor:number;grounded:boolean;landing:boolean;message:string};
export const EMPTY_HELICOPTER:HelicopterHud={loaded:false,failed:false,piloting:false,near:false,speed:0,altitude:0,rotor:0,grounded:true,landing:false,message:''};

export function prepareHelicopterModel(model:T.Group,clips:T.AnimationClip[]){
  const alignment=new T.Group();alignment.add(model);model.rotation.y=-Math.PI/2;
  alignment.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(alignment),scale=10.6/(bounds.max.z-bounds.min.z),center=bounds.getCenter(new T.Vector3());
  alignment.scale.setScalar(scale);alignment.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;if(o instanceof T.SkinnedMesh)o.frustumCulled=false;}});
  // The supplied animation also flies the entire airframe. Keep only both rotors;
  // actual translation and attitude belong to the player's flight controller.
  const tracks=clips.flatMap(clip=>clip.tracks.filter(track=>/^(Blades_01|Screw_02)\./.test(track.name)));
  const mixer=new T.AnimationMixer(model);
  if(tracks.length)mixer.clipAction(new T.AnimationClip('Rotors',Math.max(...clips.map(c=>c.duration)),tracks)).play();
  return{alignment,mixer};
}

export function createHelicopter(scene:T.Scene,world:FlightWorld){
  const root=new T.Group(),body=new T.Group();root.name='Elicopter civil';root.add(body);scene.add(root);root.visible=false;
  const state=makeFlightState();let loaded=false,failed=false,disposed=false,requested=false,placed=false,piloting=false,landing=false,mixer:T.AnimationMixer|null=null,model:T.Group|null=null;
  function disposeModel(object:T.Object3D){const materials=new Set<T.Material>(),textures=new Set<T.Texture>();object.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();if(o instanceof T.SkinnedMesh)o.skeleton.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);}}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());}
  function load(){
    if(requested||disposed)return;requested=true;
    new GLTFLoader().load(modelAssetUrl('/helicopter-playable.glb'),gltf=>{
      if(disposed){disposeModel(gltf.scene);return;}
      model=gltf.scene;const prepared=prepareHelicopterModel(model,gltf.animations);body.add(prepared.alignment);mixer=prepared.mixer;loaded=true;
    },undefined,()=>{failed=true;});
  }
  function place(x:number,z:number,heading:number,y=world.surface?.(x,z,world.ground(x,z)+2,heading)??world.ground(x,z)){Object.assign(state,makeFlightState(x,y,z,heading));placed=true;landing=false;root.position.set(state.x,state.y,state.z);root.rotation.y=heading;root.visible=loaded;}
  function update(dt:number,input:FlightInput,visible:boolean){
    if(!loaded||!placed)return;
    if(!state.grounded||piloting||visible)advanceHelicopter(state,{...input,land:landing},dt,piloting,world);
    if(state.grounded)landing=false;
    root.position.set(state.x,state.y,state.z);root.rotation.y=state.heading;body.rotation.set(state.pitch,0,state.bank);
    root.visible=piloting||visible;
    if(root.visible&&mixer&&state.rotor>.002)mixer.update(dt*state.rotor*2);
  }
  function setPiloting(value:boolean){piloting=value;landing=!value&&!state.grounded;}
  function local(x:number,y:number,z:number){return new T.Vector3(x,y,z).applyAxisAngle(T.Object3D.DEFAULT_UP,state.heading).add(root.position);}
  function walkBlocked(x:number,z:number,y=state.y){if(!placed||y+1.8<state.y||y>state.y+2.8)return false;const dx=x-state.x,dz=z-state.z,c=Math.cos(state.heading),s=Math.sin(state.heading);return Math.abs(dx*c-dz*s)<1.55&&Math.abs(dx*s+dz*c)<4.6;}
  function near(p:T.Vector3){return loaded&&placed&&state.grounded&&Math.abs(p.y-state.y)<2&&Math.hypot(p.x-state.x,p.z-state.z)<8.8;}
  function exitPoint(clear:(x:number,z:number,y:number)=>boolean){
    for(const [x,z]of[[-2.6,-2],[2.6,-2],[-3.5,0],[3.5,0],[0,-6.2]]){const point=local(x,state.grounded?0:.3,z);if(clear(point.x,point.z,point.y))return point;}
    return null;
  }
  return{root,state,load,place,update,setPiloting,near,local,walkBlocked,exitPoint,
    hover(){landing=false;state.vx=state.vy=state.vz=0;},land(){landing=true;},
    get loaded(){return loaded},get failed(){return failed},get placed(){return placed},get piloting(){return piloting},get landing(){return landing},
    dispose(){disposed=true;mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);disposeModel(model);}scene.remove(root);}
  };
}

export function createHelicopterAudio(ctx:AudioContext,output:AudioNode){
  const engine=ctx.createOscillator(),pulse=ctx.createOscillator(),gain=ctx.createGain(),mod=ctx.createGain(),filter=ctx.createBiquadFilter();
  engine.type='sawtooth';pulse.type='sine';gain.gain.value=0;mod.gain.value=0;filter.type='lowpass';filter.frequency.value=260;
  engine.connect(filter);filter.connect(gain);gain.connect(output);pulse.connect(mod);mod.connect(gain.gain);engine.start();pulse.start();
  return{update(rotor:number,distance:number,active:boolean){const t=ctx.currentTime,volume=active?Math.max(0,1-distance/100)*rotor*.12:0;engine.frequency.setTargetAtTime(35+rotor*68,t,.12);pulse.frequency.setTargetAtTime(4+rotor*17,t,.12);gain.gain.setTargetAtTime(volume,t,.08);mod.gain.setTargetAtTime(volume*.65,t,.08);},dispose(){engine.stop();pulse.stop();engine.disconnect();pulse.disconnect();gain.disconnect();mod.disconnect();filter.disconnect();}};
}
