import {GAME_SPAWN} from './game-spawn';
import * as T from 'three';
import type {ShotHit} from './impacts';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {modelAssetUrl} from './model-assets';
import {WEAPON,makeGunState,advanceGun,fireGun,reloadGun,segmentBox,type HitBox} from './weapon-physics';

export type WeaponAction='interact'|'reload'|'drop'|'fire'|'aim';
export type WeaponHud={loaded:boolean;failed:boolean;equipped:boolean;near:boolean;atTable:boolean;ammo:number;reserve:number;reloading:number;aiming:boolean;hit:boolean;message:string};
export type GunSound='shot'|'reload'|'empty';
export const TABLE={...GAME_SPAWN.table,w:1.9,d:.9,height:.87};
type Options={ground?:(x:number,z:number)=>number;sound:(kind:GunSound)=>void;kick:()=>void;raycast?:(a:T.Vector3,b:T.Vector3)=>ShotHit|null;blocks?:(a:T.Vector3,b:T.Vector3)=>HitBox[]};

export function createWeapon(scene:T.Scene,camera:T.Camera,options:Options){
  const state=makeGunState(),table=new T.Group(),pickup=new T.Group(),held=new T.Group(),arms=new T.Group();
  table.name='Masa cu AK-47';pickup.name='AK-47 pe masă';held.name='AK-47 în mâini';scene.add(table,pickup,held);
  table.position.set(TABLE.x,0,TABLE.z);
  const wood=new T.MeshStandardMaterial({color:'#745439',roughness:.87}),metal=new T.MeshStandardMaterial({color:'#263231',roughness:.6,metalness:.3});
  const box=(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number,parent=table)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
  box(TABLE.w,.1,TABLE.d,wood,0,TABLE.height-.05,0);for(const x of[-.79,.79])for(const z of[-.32,.32])box(.065,.78,.065,metal,x,.39,z);
  box(.3,.17,.2,metal,.64,.955,.06);
  const label=document.createElement('canvas');label.width=512;label.height=96;const ctx=label.getContext('2d')!;ctx.fillStyle='#182a2b';ctx.fillRect(0,0,512,96);ctx.fillStyle='#efd498';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.fillText('AK-47  ·  MUNIȚIE',256,61);
  const labelTexture=new T.CanvasTexture(label);labelTexture.colorSpace=T.SRGBColorSpace;
  const plaque=new T.Mesh(new T.PlaneGeometry(1.02,.19),new T.MeshBasicMaterial({map:labelTexture}));plaque.position.set(0,.71,TABLE.d/2+.004);table.add(plaque);
  let loaded=false,failed=false,disposed=false,requested=false,trigger=false,aiming=false,dry=false,time=0,kick=0,flashTime=0,hitTime=0;
  let message='',messageTime=0,dropVelocity:T.Vector3|null=null,restY=0;
  let collisionBoxes:HitBox[]=[];
  const velocity=new T.Vector3(),dir=new T.Vector3(),start=new T.Vector3(),end=new T.Vector3(),aimPoint=new T.Vector3(),tmp=new T.Vector3(),tmp2=new T.Vector3();
  const q=new T.Quaternion(),q2=new T.Quaternion(),scale=new T.Vector3(1,1,1),matrix=new T.Matrix4();
  const magazine=new T.Group();held.add(magazine,arms);held.visible=false;
  let pickupModel:T.Group|null=null;
  const onTable=()=>{pickup.position.set(TABLE.x-.15,table.position.y+TABLE.height+.035,TABLE.z);pickup.rotation.set(0,Math.PI/2,Math.PI/2,'YXZ');};onTable();pickup.visible=false;
  function load(){
    if(requested||disposed)return;requested=true;
    new GLTFLoader().load(modelAssetUrl('/ak47.glb'),gltf=>{
      if(disposed){disposeObject(gltf.scene);return;}
      gltf.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(gltf.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
      const factor=.89/size.x;const transform=new T.Matrix4().makeRotationY(Math.PI/2).multiply(new T.Matrix4().makeScale(factor,factor,factor)).multiply(new T.Matrix4().makeTranslation(-center.x,-center.y,-center.z));
      const groups=new Map<T.Material,{body:T.BufferGeometry[];mag:T.BufferGeometry[]}>();
      gltf.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;const mat=o.material as T.MeshStandardMaterial;mat.roughness=.7;mat.metalness=.22;
        const geometry=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(transform,o.matrixWorld));
        const parts=groups.get(mat)??{body:[],mag:[]};(/magazine/i.test(o.name)?parts.mag:parts.body).push(geometry);groups.set(mat,parts);
      });
      pickupModel=new T.Group();
      for(const [material,parts]of groups)for(const part of ['body','mag'] as const){if(!parts[part].length)continue;const geo=mergeGeometries(parts[part],false);parts[part].forEach(g=>g.dispose());if(!geo)continue;
        const mesh=new T.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.name=part==='mag'?'Încărcător AK-47':'Corp AK-47';(part==='mag'?magazine:held).add(mesh);pickupModel.add(mesh.clone());
      }
      // Shared texture and material ownership stays with the two displayed models.
      gltf.scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});pickup.add(pickupModel);loaded=true;pickup.visible=true;
    },undefined,()=>{failed=true;});
  }
  const skin=new T.MeshStandardMaterial({color:'#c29779',roughness:.86}),sleeve=new T.MeshStandardMaterial({color:'#526467',roughness:.9});
  function forearm(a:T.Vector3,b:T.Vector3){const length=a.distanceTo(b),m=new T.Mesh(new T.CapsuleGeometry(.042,length-.08,3,7),sleeve);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP,b.clone().sub(a).normalize());arms.add(m);const hand=new T.Mesh(new T.SphereGeometry(.047,8,6),skin);hand.position.copy(b);hand.scale.set(.8,1,1.35);arms.add(hand);}
  forearm(new T.Vector3(.1,-.25,.23),new T.Vector3(.025,-.057,.09));forearm(new T.Vector3(-.25,-.23,.18),new T.Vector3(-.023,-.015,-.19));
  const flashMaterial=new T.MeshBasicMaterial({color:0xffd28a,transparent:true,opacity:1,depthWrite:false});
  const flash=new T.Mesh(new T.ConeGeometry(.055,.23,6),flashMaterial);flash.rotation.x=-Math.PI/2;flash.position.set(0,.085,-.51);flash.visible=false;held.add(flash);
  const flashLight=new T.PointLight(0xffb45c,0,3);flashLight.position.copy(flash.position);held.add(flashLight);
  const bullets=Array.from({length:32},()=>({position:new T.Vector3(),previous:new T.Vector3(),velocity:new T.Vector3(),life:0}));let nextBullet=0;
  const trailData=new Float32Array(32*6),trailGeometry=new T.BufferGeometry();trailGeometry.setAttribute('position',new T.BufferAttribute(trailData,3).setUsage(T.DynamicDrawUsage));
  const trails=new T.LineSegments(trailGeometry,new T.LineBasicMaterial({color:'#ffdf95',transparent:true,opacity:.85,depthWrite:false}));trails.frustumCulled=false;scene.add(trails);
  const marks=Array.from({length:28},()=>{const mark=new T.Mesh(new T.SphereGeometry(.045,5,4),new T.MeshBasicMaterial({color:'#6c5a43',transparent:true,opacity:.8}));mark.visible=false;scene.add(mark);return{mesh:mark,life:0};});let nextMark=0;
  const casings=Array.from({length:20},()=>({position:new T.Vector3(),velocity:new T.Vector3(),rotation:new T.Euler(),life:0}));let nextCasing=0;
  const shells=new T.InstancedMesh(new T.CylinderGeometry(.009,.009,.035,6),new T.MeshStandardMaterial({color:'#b49a55',metalness:.55,roughness:.4}),20);shells.instanceMatrix.setUsage(T.DynamicDrawUsage);shells.frustumCulled=false;scene.add(shells);
  const near=(p:T.Vector3)=>loaded&&!state.equipped&&Math.hypot(p.x-pickup.position.x,p.z-pickup.position.z)<2.2;
  const atTable=(p:T.Vector3)=>Math.hypot(p.x-TABLE.x,p.z-TABLE.z)<2.3;
  function say(text:string){message=text;messageTime=3;}
  function stop(){trigger=aiming=false;dry=false;}
  function interact(p:T.Vector3){
    if(near(p)){state.equipped=true;dropVelocity=null;pickup.visible=false;held.visible=true;say('Click: trage · R: reîncarcă · G: lasă arma');return true;}
    if(state.equipped&&atTable(p)){state.reserve=WEAPON.reserve;say('Rezerva de muniție este completată.');return true;}return false;
  }
  function reload(){if(reloadGun(state)){stop();options.sound('reload');return;}if(state.reserve===0)say('Muniția s-a terminat. Revino la masa de lângă Arc.');}
  function drop(p:T.Vector3,yaw:number,floor:number){if(!state.equipped)return;state.equipped=false;state.reload=0;stop();held.visible=false;pickup.visible=true;
    start.set(p.x,1.1+floor,p.z);end.set(p.x-Math.sin(yaw)*.85,1.1+floor,p.z-Math.cos(yaw)*.85);const obstruction=closest(start,end,collisionBoxes);
    pickup.position.copy(start).lerp(end,obstruction<1?Math.max(0,obstruction-.35):1);pickup.rotation.set(.2,yaw,Math.PI/2,'YXZ');dropVelocity=new T.Vector3(-Math.sin(yaw)*.6,.4,-Math.cos(yaw)*.6);restY=floor+.04;
    for(const b of collisionBoxes)if(pickup.position.x>=b.min.x&&pickup.position.x<=b.max.x&&pickup.position.z>=b.min.z&&pickup.position.z<=b.max.z&&b.max.y<=pickup.position.y)restY=Math.max(restY,b.max.y+.04);
  }
  function closest(a:T.Vector3,b:T.Vector3,blocks:HitBox[],damage=false,direction=dir){let t=1;for(const block of (options.blocks?.(a,b)??blocks)){const hit=segmentBox(a,b,block);if(hit!==null)t=Math.min(t,hit);}if(b.y<.025&&a.y>=.025)t=Math.min(t,(a.y-.025)/(a.y-b.y));const object=options.raycast?.(a,b);if(object&&object.fraction<=t){t=object.fraction;if(damage)object.hit?.(a.clone().lerp(b,t),direction.clone().normalize());}return t;}
  function impact(p:T.Vector3){const mark=marks[nextMark++%marks.length];mark.mesh.position.copy(p);mark.mesh.visible=true;mark.life=1.2;hitTime=.12;}
  function shoot(blocks:HitBox[]){
    camera.getWorldPosition(start);camera.getWorldDirection(dir);end.copy(start).addScaledVector(dir,200);aimPoint.copy(start).lerp(end,closest(start,end,blocks));
    held.updateWorldMatrix(true,true);held.localToWorld(tmp.set(0,.085,-.445));
    // Test the eye-to-muzzle segment so a nearby wall cannot be shot through.
    const obstruction=closest(start,tmp,blocks,true,dir);if(obstruction<1){impact(start.lerp(tmp,obstruction));}
    else{const bullet=bullets[nextBullet++%bullets.length];bullet.position.copy(tmp);bullet.previous.copy(tmp);bullet.velocity.copy(aimPoint).sub(tmp).normalize();
      const spread=aiming?.0013:.007;bullet.velocity.add(tmp2.set((Math.random()-.5)*spread,(Math.random()-.5)*spread,(Math.random()-.5)*spread)).normalize().multiplyScalar(WEAPON.projectileSpeed);bullet.life=WEAPON.lifetime;}
    const casing=casings[nextCasing++%casings.length];held.localToWorld(casing.position.set(.04,.04,.015));casing.velocity.set(1.6,1.7,.5).applyQuaternion(held.getWorldQuaternion(q));casing.life=2;casing.rotation.set(0,0,0);
    kick=Math.min(.10,kick+.055);flashTime=.055;options.kick();options.sound('shot');
  }
  function update(dt:number,p:T.Vector3,yaw:number,pitch:number,firstPerson:boolean,active:boolean,inCar:boolean,floor:number,blocks:HitBox[]){
    const ground=options.ground??(()=>0);
    table.position.y=ground(TABLE.x,TABLE.z);
    if(!state.equipped&&!dropVelocity&&Math.abs(pickup.position.x-(TABLE.x-.15))<.01&&Math.abs(pickup.position.z-TABLE.z)<.01)onTable();
    collisionBoxes=blocks;
    time+=dt;messageTime=Math.max(0,messageTime-dt);hitTime=Math.max(0,hitTime-dt);flashTime=Math.max(0,flashTime-dt);kick=T.MathUtils.damp(kick,0,17,dt);
    const usable=state.equipped&&!inCar;held.visible=loaded&&usable;arms.visible=firstPerson;
    if(usable){
      if(firstPerson){camera.updateWorldMatrix(true,false);camera.getWorldQuaternion(q);held.quaternion.copy(q).multiply(q2.setFromEuler(new T.Euler(kick,0,0)));
        tmp.set(aiming?.04:.22,aiming?-.115:-.225,aiming?-.48:-.5);tmp.y+=Math.sin(time*2)*.002;tmp.z+=kick*.28;held.position.copy(tmp.applyQuaternion(q)).add(camera.position);
      }else{held.position.set(.12,1.34,-.18).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw).add(tmp.set(p.x,floor,p.z));held.rotation.set(-pitch+kick,yaw,0,'YXZ');}
      const progress=state.reload>0?1-state.reload/WEAPON.reloadSeconds:0;
      magazine.position.y=state.reload>0?-Math.sin(progress*Math.PI)*.22:0;magazine.rotation.x=state.reload>0?Math.sin(progress*Math.PI)*.2:0;
      if(state.reload>0)held.rotateZ(Math.sin(progress*Math.PI)*-.25);
    }
    if(active){
      if(advanceGun(state,dt))options.sound('reload');
      if(usable&&trigger&&fireGun(state))shoot(blocks);else if(usable&&trigger&&state.ammo===0&&state.reload===0&&!dry){dry=true;options.sound('empty');say('Încărcător gol · R pentru reîncărcare');}
      if(dropVelocity){dropVelocity.y-=9.8*dt;pickup.position.addScaledVector(dropVelocity,dt);pickup.rotation.y+=dt*.7;if(pickup.position.y<=restY){pickup.position.y=restY;dropVelocity=null;pickup.rotation.x=0;}}
      for(let i=0;i<bullets.length;i++){const b=bullets[i];if(b.life>0){b.previous.copy(b.position);b.velocity.y-=WEAPON.gravity*dt;end.copy(b.position).addScaledVector(b.velocity,dt);const t=closest(b.position,end,blocks,true,b.velocity);b.position.lerp(end,t);b.life-=dt;if(t<1){impact(b.position);b.life=0;}}const show=b.life>0;const o=i*6;trailData[o]=show?b.position.x:0;trailData[o+1]=show?b.position.y:-100;trailData[o+2]=show?b.position.z:0;tmp.copy(b.position).addScaledVector(b.velocity,-.009);trailData[o+3]=show?tmp.x:0;trailData[o+4]=show?tmp.y:-100;trailData[o+5]=show?tmp.z:0;}
      (trailGeometry.getAttribute('position') as T.BufferAttribute).needsUpdate=true;
      for(const m of marks){m.life=Math.max(0,m.life-dt);m.mesh.visible=m.life>0;(m.mesh.material as T.MeshBasicMaterial).opacity=Math.min(.8,m.life);}
      casings.forEach((c,i)=>{c.life=Math.max(0,c.life-dt);if(c.life>0){c.velocity.y-=9.8*dt;c.position.addScaledVector(c.velocity,dt);const casingFloor=ground(c.position.x,c.position.z)+.035;if(c.position.y<casingFloor){c.position.y=casingFloor;c.velocity.y=Math.abs(c.velocity.y)*.22;c.velocity.x*=.65;c.velocity.z*=.65;}c.rotation.x+=dt*8;c.rotation.z+=dt*6;}matrix.compose(c.position,q.setFromEuler(c.rotation),scale.setScalar(c.life>0?1:0));shells.setMatrixAt(i,matrix);});shells.instanceMatrix.needsUpdate=true;
    }
    flash.visible=flashTime>0&&usable&&active;flashLight.intensity=flash.visible?2:0;
  }
  const armPos=new T.Vector3(),handPos=new T.Vector3(),target=new T.Vector3(),v1=new T.Vector3(),v2=new T.Vector3();
  function poseAvatar(avatar:T.Object3D){
    if(!state.equipped)return;held.updateWorldMatrix(true,true);avatar.updateWorldMatrix(true,true);
    for(const side of ['Right','Left']){const upper=avatar.getObjectByName(`mixamorig${side}Arm`),fore=avatar.getObjectByName(`mixamorig${side}ForeArm`),hand=avatar.getObjectByName(`mixamorig${side}Hand`);if(!upper||!fore||!hand)continue;
      held.localToWorld(target.set(side==='Right'?.025:-.023,side==='Right'?-.057:-.015,side==='Right'?.09:-.19));
      for(let iteration=0;iteration<6;iteration++)for(const joint of [fore,upper]){joint.getWorldPosition(armPos);hand.getWorldPosition(handPos);v1.copy(handPos).sub(armPos).normalize();v2.copy(target).sub(armPos).normalize();q.setFromUnitVectors(v1,v2).multiply(joint.getWorldQuaternion(q2));if(joint.parent)q.premultiply(joint.parent.getWorldQuaternion(q2).invert());joint.quaternion.copy(q);joint.updateWorldMatrix(false,true);}
    }
  }
  function hud(p:T.Vector3):WeaponHud{return{loaded,failed,equipped:state.equipped,near:near(p),atTable:atTable(p),ammo:state.ammo,reserve:state.reserve,reloading:state.reload>0?Math.max(.001,1-state.reload/WEAPON.reloadSeconds):0,aiming,hit:hitTime>0,message:messageTime>0?message:''};}
  return{state,table,pickup,held,load,near,atTable,hud,update,poseAvatar,interact,reload,drop,stop,get loaded(){return loaded},get failed(){return failed},get aiming(){return aiming},fire(value:boolean){trigger=value;if(!value)dry=false;},aim(value:boolean){aiming=value;},dispose(){disposed=true;for(const o of[table,pickup,held,trails,shells,...marks.map(m=>m.mesh)]){scene.remove(o);disposeObject(o);}labelTexture.dispose();}};
}

function disposeObject(object:T.Object3D){object.traverse(o=>{if(!(o instanceof T.Mesh||o instanceof T.LineSegments))return;o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();}});}
export function playGunSound(ctx:AudioContext,output:AudioNode,kind:GunSound){
  const duration=kind==='shot'?.16:.065,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){const t=i/data.length;data[i]=(Math.random()*2-1)*Math.exp(-t*(kind==='shot'?10:18));}
  const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='shot'?2300:1300;gain.gain.value=kind==='shot'?.8:.22;source.connect(filter);filter.connect(gain);gain.connect(output);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
