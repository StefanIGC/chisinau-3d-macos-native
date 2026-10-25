import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {modelAssetUrl} from './model-assets';
import { advanceCar, makeCarState, overlapsCar, selectGear, type DriveInput, type Obstacle } from './prius-physics';

export type VehicleHud = {loaded:boolean; failed:boolean; driving:boolean; loading:boolean; near:boolean; nearTraffic:boolean; speed:number; gear:string; mode:string; battery:number; lights:boolean; message:string};
export const EMPTY_VEHICLE:VehicleHud={loaded:false,failed:false,driving:false,loading:false,near:false,nearTraffic:false,speed:0,gear:'P',mode:'READY',battery:.64,lights:false,message:''};
export type VehicleAction='spawn'|'interact'|'gear'|'park'|'lights'|'horn'|'find'|'recover';

export function createPrius(scene:T.Scene,blocks:Obstacle[],traffic:()=>Obstacle[],mapBlocked:(x:number,z:number,heading:number)=>boolean=()=>false,bounds=[-379,-299,240,86],nearbyBlocks?:(x:number,z:number,r:number)=>Obstacle[],ground:(x:number,z:number)=>number=()=>0){
  const root=new T.Group();root.name='Toyota Prius XW20';scene.add(root);
  const body=new T.Group();root.add(body);
  const state=makeCarState();let loaded=false,failed=false,disposed=false,requested=false,headlights=false,driving=false;
  let model:T.Group|null=null,spin=0,lean=0,nod=0;
  const wheels:{steering:T.Object3D; axle:T.Group; front:boolean}[]=[];
  const brakeMaterials:T.MeshStandardMaterial[]=[],glass:T.MeshStandardMaterial[]=[];
  const rearMaterial=new T.MeshStandardMaterial({color:0x7e1415,emissive:0xff2010,emissiveIntensity:.1,roughness:.2});
  const whiteMaterial=new T.MeshStandardMaterial({color:0xfbf4d6,emissive:0xfff0c4,emissiveIntensity:.05,roughness:.2});
  const reverseMaterial=new T.MeshStandardMaterial({color:0xe5e5dd,emissive:0xffffff,emissiveIntensity:0});
  const lights:T.SpotLight[]=[];
  // A small local sky reflection gives paint and alloy surfaces readable highlights.
  const environment=new T.CubeTexture(Array.from({length:6},(_,face)=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!;
    const gradient=ctx.createLinearGradient(0,0,0,64);gradient.addColorStop(0,'#93b8d2');gradient.addColorStop(.52,'#e8ebdf');gradient.addColorStop(.57,'#747d71');gradient.addColorStop(1,'#444b42');
    ctx.fillStyle=face===2?'#c1d5e1':face===3?'#5c6355':gradient;ctx.fillRect(0,0,64,64);return canvas;
  }));environment.colorSpace=T.SRGBColorSpace;environment.needsUpdate=true;
  const lamp=(material:T.Material,x:number,y:number,z:number,w:number,h:number)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,.018),material);m.position.set(x,y,z);body.add(m);};
  for(const side of [-1,1]){
    lamp(reverseMaterial,side*.685,.65,2.077,.12,.055);
    lamp(whiteMaterial,side*.65,.69,-2.065,.21,.07);
    const light=new T.SpotLight(0xffefcc,0,36,.40,.6,1.3);light.position.set(side*.64,.71,-2);light.target.position.set(side*1.4,.15,-23);root.add(light,light.target);lights.push(light);
  }
  lamp(rearMaterial,0,1.20,1.843,.38,.035);
  function load(){
    if(requested||disposed)return;requested=true;
    new GLTFLoader().load(modelAssetUrl('/prius-playable.glb'),gltf=>{
    if(disposed){gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});return;}
    model=gltf.scene;body.add(model);
    model.traverse(o=>{if(!(o instanceof T.Mesh))return;o.castShadow=true;o.receiveShadow=true;
      const materials=Array.isArray(o.material)?o.material:[o.material];
      for(const mat of materials){if(!(mat instanceof T.MeshStandardMaterial))continue;
        if(mat.name==='interior'){mat.color.set('#595b5d');mat.roughness=.85;}
        if(mat.name==='carpaint'){mat.metalness=.48;mat.roughness=.28;mat.envMap=environment;mat.envMapIntensity=.7;}
        if(mat.name==='chrome'||mat.name==='material'){mat.metalness=.75;mat.roughness=.24;mat.envMap=environment;mat.envMapIntensity=.9;}
        if(mat.name.includes('glass')){mat.depthWrite=false;o.castShadow=false;mat.roughness=.16;if(!glass.includes(mat))glass.push(mat);}
        if(mat.name==='redglass'&&!brakeMaterials.includes(mat))brakeMaterials.push(mat);
      }
    });
    for(const name of ['front_left','front_right','rear_left','rear_right']){
      const steering=model.getObjectByName(name);if(!steering)continue;
      const axle=new T.Group();for(const child of [...steering.children])axle.add(child);steering.add(axle);wheels.push({steering,axle,front:name.startsWith('front')});
    }
    loaded=true;root.visible=true;
    },undefined,()=>{failed=true;root.visible=false;});
  }
  root.visible=false;root.position.set(state.x,ground(state.x,state.z),state.z);root.rotation.y=state.heading;
  const parkedBounds=()=>({x:state.x,z:state.z,w:1.74,d:4.44});
  function blocked(x:number,z:number,heading:number){
    if(x<bounds[0]||x>bounds[2]||z<bounds[1]||z>bounds[3]||mapBlocked(x,z,heading))return true;
    for(const b of (nearbyBlocks?.(x,z,2.7)??blocks))if(Math.abs(b.x-x)<b.w/2+2.7&&Math.abs(b.z-z)<b.d/2+2.7&&overlapsCar(x,z,heading,b))return true;
    for(const b of traffic())if(overlapsCar(x,z,heading,b))return true;
    return false;
  }
  function walkBlocked(x:number,z:number,y=root.position.y){return loaded&&y<root.position.y+1.6&&y+1.8>root.position.y&&overlapsCar(state.x,state.z,state.heading,{x,z,w:.52,d:.52});}
  function local(x:number,y:number,z:number,out=new T.Vector3()){return out.set(x,y,z).applyAxisAngle(T.Object3D.DEFAULT_UP,state.heading).add(root.position);}
  function exitPoint(canMove:(x:number,z:number)=>boolean){
    for(const [x,z]of[[-1.52,-.25],[1.52,-.25],[-1.6,1.4],[1.6,1.4],[0,3.15]]){const p=local(x,0,z);if(canMove(p.x,p.z)&&!traffic().some(b=>Math.abs(p.x-b.x)<b.w/2+.4&&Math.abs(p.z-b.z)<b.d/2+.4))return p;}
    return null;
  }
  const near=(p:T.Vector3)=>loaded&&Math.abs(p.y-root.position.y)<2&&Math.hypot(p.x-state.x,p.z-state.z)<3.8;
  function setDriving(value:boolean,preserveMomentum=false){driving=value;if(!value&&!preserveMomentum){state.speed=0;selectGear(state,'P');}else if(value&&Math.abs(state.speed)<.35)selectGear(state,'D');}
  function update(dt:number,input:DriveInput,active:boolean){
    if(loaded&&driving&&active)advanceCar(state,input,dt,blocked);
    if(loaded&&!driving&&Math.abs(state.speed)>.01){advanceCar(state,{throttle:0,brake:.18,steer:0,handbrake:false,offroad:false},dt,blocked);if(Math.abs(state.speed)<.03){state.speed=0;selectGear(state,'P');}}
    root.position.set(state.x,ground(state.x,state.z),state.z);root.rotation.y=state.heading;
    spin-=state.speed*dt/.302;
    for(const wheel of wheels){wheel.steering.rotation.y=wheel.front?state.steer:0;wheel.axle.rotation.x=spin;}
    const lateral=state.speed*state.speed*Math.tan(state.steer)/2.7;
    lean=T.MathUtils.damp(lean,T.MathUtils.clamp(lateral*.007,-.045,.045),6,dt);
    nod=T.MathUtils.damp(nod,active?-state.acceleration*.004:0,6,dt);
    // Only the shell leans; the axles stay grounded.
    const shell=model?.getObjectByName('body');if(shell){shell.rotation.z=lean;shell.rotation.x=nod;}
    const brake=driving&&(state.braking||state.gear==='P');
    rearMaterial.emissiveIntensity=brake?2.8:headlights?.5:.08;
    brakeMaterials.forEach(m=>{m.emissive.setHex(0xe51808);m.emissiveIntensity=brake?1.3:headlights?.22:0;});
    whiteMaterial.emissiveIntensity=headlights?3:.04;reverseMaterial.emissiveIntensity=driving&&state.gear==='R'?2.2:0;
    lights.forEach(l=>{l.intensity=headlights?16:0;});
  }
  function cabin(enabled:boolean){glass.forEach(m=>{if(m.name==='windowglass'||m.name==='clearglass')m.opacity=enabled?.10:.3;});}
  function recover(x?:number,z?:number,heading?:number){Object.assign(state,makeCarState(x,z,heading));if(driving)state.gear='D';spin=0;update(0,{throttle:0,brake:1,steer:0,handbrake:false,offroad:false},false);}
  return {root,state,load,near,local,blocked,walkBlocked,exitPoint,parkedBounds,update,setDriving,cabin,recover,
    get model(){return model},get loaded(){return loaded},get failed(){return failed},get driving(){return driving},get headlights(){return headlights},
    setBodyVisible(value:boolean){body.visible=value;lights.forEach(light=>{light.visible=value;light.target.visible=value;});},
    lights(){headlights=!headlights;return headlights},
    gearTo(gear:'D'|'R'){return selectGear(state,gear)},
    gear(){return selectGear(state,state.gear==='R'?'D':'R')},
    park(){return selectGear(state,state.gear==='P'?'D':'P')},
    dispose(){disposed=true;environment.dispose();scene.remove(root);root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});}
  };
}

/** Two continuous tones convey electric drive and CVT load without gear changes. */
export function createCarAudio(ctx:AudioContext,output:AudioNode){
  const electric=ctx.createOscillator(),engine=ctx.createOscillator(),evGain=ctx.createGain(),engineGain=ctx.createGain();
  electric.type='sine';engine.type='triangle';evGain.gain.value=engineGain.gain.value=0;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=550;
  electric.connect(evGain);evGain.connect(output);engine.connect(filter);filter.connect(engineGain);engineGain.connect(output);electric.start();engine.start();
  let nextBeep=0;
  function beep(frequency:number,length:number,volume:number){const o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+length);o.connect(g);g.connect(output);o.start();o.stop(now+length);}
  return {update(speed:number,throttle:number,hybrid:boolean,reverse:boolean,active:boolean){const t=ctx.currentTime;electric.frequency.setTargetAtTime(170+Math.abs(speed)*22,t,.12);engine.frequency.setTargetAtTime(34+throttle*74+Math.abs(speed)*.7,t,.2);evGain.gain.setTargetAtTime(active?.035+throttle*.045:0,t,.15);engineGain.gain.setTargetAtTime(active&&hybrid?.045+throttle*.11:0,t,.22);if(active&&reverse&&t>nextBeep){beep(920,.18,.07);nextBeep=t+.9;}},horn(){beep(392,.38,.2);beep(494,.4,.14);},dispose(){electric.stop();engine.stop();electric.disconnect();engine.disconnect();filter.disconnect();evGain.disconnect();engineGain.disconnect();}};
}
