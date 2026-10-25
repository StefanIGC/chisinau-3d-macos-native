import * as T from 'three';
import {segmentBox,type HitBox} from './weapon-physics';
import type {ShotHit,ParticleKind} from './impacts';
const wheelNames=['front_left','front_right','rear_left','rear_right'];
const regions=[
 {id:'front',min:[-.72,.83,-1.45],max:[.72,1.44,-.49]},
 {id:'rear',min:[-.71,.91,1.04],max:[.71,1.43,1.87]},
 {id:'left-front',min:[-.88,.87,-.75],max:[-.64,1.43,.27]},
 {id:'right-front',min:[.64,.87,-.75],max:[.88,1.43,.27]},
 {id:'left-rear',min:[-.88,.91,.27],max:[-.60,1.43,1.13]},
 {id:'right-rear',min:[.60,.91,.27],max:[.88,1.43,1.13]}
];
const boxOf=(min:number[],max:number[]):HitBox=>({min:{x:min[0],y:min[1],z:min[2]},max:{x:max[0],y:max[1],z:max[2]}});
export function createCarDamage(root:T.Group,model:T.Group,burst:(kind:ParticleKind,p:T.Vector3,d:T.Vector3,n?:number)=>void,alarm:()=>void,mirrors:T.Group[]=[]){
 const flat=new Set<number>(),broken=new Set<string>(),panes=new Map<string,T.Mesh[]>();let time=0;
 const models=[model,...mirrors],wheels=models.map(m=>wheelNames.map(name=>m.getObjectByName(name)));const a=new T.Vector3(),b=new T.Vector3(),inverse=new T.Matrix4();
 // Split the supplied model's merged window mesh into individually breakable panes.
 for(const model of models){model.updateWorldMatrix(true,true);const invModel=model.matrixWorld.clone().invert();const source:T.Mesh[]=[];
 model.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.name==='windowglass')source.push(o);});
 for(const mesh of source){const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(invModel,mesh.matrixWorld));const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');const groups=new Map<string,number[]>();
  for(let i=0;i<pos.count;i+=3){const x=(pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3,z=(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3,nz=normal?Math.abs(normal.getZ(i)):0;
   const key=z<-.55&&nz>.45?'front':z>1.05&&nz>.4?'rear':`${x<0?'left':'right'}-${z<.27?'front':'rear'}`;const values=groups.get(key)??[];for(let j=0;j<3;j++)values.push(i+j);groups.set(key,values);}
  for(const [key,indices]of groups){const geo=new T.BufferGeometry();for(const [name,attribute]of [['position',pos],['normal',normal],['uv',uv]] as const){if(!attribute)continue;const values=new Float32Array(indices.length*attribute.itemSize);indices.forEach((idx,j)=>{for(let k=0;k<attribute.itemSize;k++)values[j*attribute.itemSize+k]=attribute.getComponent(idx,k);});geo.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize));}
   const material=mesh.material as T.MeshStandardMaterial;material.opacity=.34;material.transparent=true;material.depthWrite=false;const pane=new T.Mesh(geo,material);pane.name=`Geam ${key}`;model.add(pane);const list=panes.get(key)??[];list.push(pane);panes.set(key,list);}
  mesh.visible=false;geometry.dispose();
 }
 }
 const wheelBoxes=wheels[0].map(w=>w?boxOf([w.position.x-.16,.05,w.position.z-.32],[w.position.x+.16,.57,w.position.z+.32]):null);
 const windowBoxes=regions.map(r=>({id:r.id,box:boxOf(r.min,r.max)}));
 const broadBox=boxOf([-.94,0,-2.23],[.94,1.6,2.23]);
 const bodyBox=boxOf([-.82,.43,-2.14],[.82,.92,2.14]),upperBox=boxOf([-.6,1.38,-.55],[.6,1.51,.9]);
 function raycast(start:T.Vector3,end:T.Vector3):ShotHit|null{
  if(!root.visible)return null;root.updateWorldMatrix(true,false);inverse.copy(root.matrixWorld).invert();a.copy(start).applyMatrix4(inverse);b.copy(end).applyMatrix4(inverse);
  if(segmentBox(a,b,broadBox)===null)return null;
  let fraction=Infinity,kind='body',index=-1;
  for(let i=0;i<wheelBoxes.length;i++){const box=wheelBoxes[i];if(!box)continue;const t=segmentBox(a,b,box);if(t!==null&&t<fraction){fraction=t;kind='wheel';index=i;}}
  for(let i=0;i<windowBoxes.length;i++){if(broken.has(windowBoxes[i].id))continue;const t=segmentBox(a,b,windowBoxes[i].box);if(t!==null&&t<fraction){fraction=t;kind='glass';index=i;}}
  for(const box of[bodyBox,upperBox]){const t=segmentBox(a,b,box);if(t!==null&&t<fraction){fraction=t;kind='body';}}
  if(!Number.isFinite(fraction))return null;return{fraction,hit(p,d){alarm();if(kind==='wheel'){if(!flat.has(index)){flat.add(index);burst('spark',p,d,10);}}else if(kind==='glass'){const key=windowBoxes[index].id;broken.add(key);panes.get(key)?.forEach(pane=>pane.visible=false);burst('glass',p,d,24);}else burst('spark',p,d,5);}};
 }
 function update(dt:number,speed:number){time+=dt;for(const set of wheels)for(let i=0;i<set.length;i++){const w=set[i];if(!w)continue;w.scale.y=flat.has(i)?.56:1;w.position.y=flat.has(i)?.19:.302;}
  for(const model of models){if(flat.size){model.position.y=-.055;model.rotation.z=(flat.has(0)||flat.has(2)?1:-1)*.035+Math.sin(time*(8+Math.abs(speed)))*Math.min(.016,Math.abs(speed)*.0015);}else{model.position.y=0;model.rotation.z=0;}}}
 function reset(){flat.clear();broken.clear();panes.forEach(list=>list.forEach(p=>p.visible=true));update(0,0);}
 return{raycast,update,reset,get flatCount(){return flat.size},get brokenCount(){return broken.size},get pull(){return((flat.has(0)||flat.has(2)?-.13:0)+(flat.has(1)||flat.has(3)?.13:0));},dispose(){panes.forEach(list=>list.forEach(p=>{p.removeFromParent();p.geometry.dispose();}));}};
}
