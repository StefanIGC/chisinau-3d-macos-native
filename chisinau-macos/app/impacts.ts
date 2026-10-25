import * as T from 'three';
export type ShotHit={fraction:number;hit?:(point:T.Vector3,direction:T.Vector3)=>void};
export type ParticleKind='red'|'feather'|'glass'|'spark';
/** Fixed pools keep automatic fire from creating new meshes or unbounded particles. */
export function createImpactEffects(scene:T.Scene){
 const colors={red:'#a92628',feather:'#dce1df',glass:'#aedbe4',spark:'#e9ba67'};
 const pools=(Object.keys(colors) as ParticleKind[]).map(kind=>{
  const count=kind==='red'?96:kind==='feather'?100:80;
  const geometry=kind==='feather'?new T.PlaneGeometry(.045,.13):kind==='glass'?new T.TetrahedronGeometry(.025):new T.SphereGeometry(kind==='red'?.024:.016,4,3);
  const material=new T.MeshBasicMaterial({color:colors[kind],side:T.DoubleSide,transparent:kind==='glass',opacity:kind==='glass'?.7:1});
  const mesh=new T.InstancedMesh(geometry,material,count);mesh.name=`Particule ${kind}`;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);
  return{kind,mesh,next:0,items:Array.from({length:count},()=>({p:new T.Vector3(),v:new T.Vector3(),life:0,max:1,spin:0,rotation:new T.Euler()}))};
 });
 const matrix=new T.Matrix4(),q=new T.Quaternion(),scale=new T.Vector3();
 function burst(kind:ParticleKind,p:T.Vector3,direction:T.Vector3,count=14){const pool=pools.find(x=>x.kind===kind)!;for(let i=0;i<count;i++){const a=pool.items[pool.next++%pool.items.length];a.p.copy(p);const force=kind==='feather'?.8:kind==='glass'?2.8:1.2;a.v.set((Math.random()-.5)*force,Math.random()*force+.6,(Math.random()-.5)*force).addScaledVector(direction,kind==='red'?.4:.2);a.life=a.max=kind==='feather'?2.8:kind==='glass'?1.8:.6;a.spin=Math.random()*12-6;a.rotation.set(Math.random()*6,Math.random()*6,0);}}
 function update(dt:number){for(const pool of pools){pool.items.forEach((a,i)=>{if(a.life>0){a.life=Math.max(0,a.life-dt);a.v.y-=(pool.kind==='feather'?1.5:9.8)*dt;a.p.addScaledVector(a.v,dt);a.rotation.x+=a.spin*dt;a.rotation.z+=a.spin*dt*.6;if(pool.kind==='feather'){a.p.x+=Math.sin(a.life*11+a.spin)*dt*.12;a.v.x*=Math.exp(-dt*1.3);}if(a.p.y<.025){a.p.y=.025;a.v.y=Math.abs(a.v.y)*.12;a.v.x*=.6;a.v.z*=.6;}}matrix.compose(a.p,q.setFromEuler(a.rotation),scale.setScalar(a.life>0?Math.min(1,a.life/.18):0));pool.mesh.setMatrixAt(i,matrix);});pool.mesh.instanceMatrix.needsUpdate=true;}}
 update(0);return{burst,update,dispose(){for(const p of pools){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}}};
}
/** Closest swept-sphere intersection, used for animated people and small birds. */
export function segmentSphere(a:T.Vector3,b:T.Vector3,center:T.Vector3,radius:number){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,ox=a.x-center.x,oy=a.y-center.y,oz=a.z-center.z;
 const c=ox*ox+oy*oy+oz*oz-radius*radius;if(c<=0)return 0;const aa=dx*dx+dy*dy+dz*dz;if(aa<1e-12)return null;const bb=ox*dx+oy*dy+oz*dz,disc=bb*bb-aa*c;if(disc<0)return null;const t=(-bb-Math.sqrt(disc))/aa;return t>=0&&t<=1?t:null;
}
