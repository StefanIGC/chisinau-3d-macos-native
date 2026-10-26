import {detailInRange} from './detail-visibility';
import {groundPartition,groundShape,groundCoverage} from './ground-partition';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import letters from '../data/street-lettering.json';
import {prepareLandmarkCollision} from './landmark-collision';
import {parkMaterial} from './park-materials';
import {centroid,type XY} from './city-layout';
import {canBuildScene,sceneBuildDeadline,sceneBuildFocus,sceneBuildStages} from './scene-build-budget';

export const streetRect=(x:number,z:number,w:number,d:number):XY[]=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
export function lettering(text:string,size:number){
  const glyphs=letters as Record<string,{advance:number;rings:number[][][]}>,path=new T.ShapePath();let cursor=0;
  for(const char of text.toUpperCase()){const g=glyphs[char];if(!g)continue;for(const ring of g.rings){ring.forEach(([x,y],i)=>i?path.lineTo((x+cursor)*size,y*size):path.moveTo((x+cursor)*size,y*size));path.currentPath?.closePath();}cursor+=g.advance;}
  const g=new T.ShapeGeometry(path.toShapes());g.translate(-cursor*size/2,0,0);return g;
}
type Job={root:T.Group;physical:T.Group;x:number;z:number;points:XY[];ids:number[];run:()=>Generator<void>;done:boolean;nextProbe:number};
type Part={g:T.BufferGeometry;kind:number;fine:boolean;physical:boolean;nativeShell:boolean};
/** Static architecture with bounded stages, merged draws and a prepared collider. */
export function streetMesh(scene:T.Scene,name:string,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  // The native Metal edition reuses these exact authored meshes through an
  // offline export pass. This flag is absent during normal web gameplay.
  const nativeExport=Array.isArray((globalThis as any).__CHISINAU_NATIVE_STREET_MESHES__);
  const matte=new T.MeshStandardMaterial({name:name+' · piatră',vertexColors:true,roughness:.9});
  const glass=new T.MeshStandardMaterial({name:name+' · geamuri',vertexColors:true,roughness:.34,metalness:.14});
  // Small, stable world-space texture. No transparent/coplanar facade overlays.
  matte.onBeforeCompile=s=>{s.vertexShader='varying vec3 streetP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstreetP=position;');s.fragmentShader='varying vec3 streetP;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=fract(sin(dot(floor(streetP*9.),vec3(12.9898,78.233,31.17)))*43758.5453);float detail=1.-smoothstep(.3,1.,length(fwidth(streetP*9.)));diffuseColor.rgb*=1.+(grain-.5)*.08*detail;');};
  const materials=[matte,glass,parkMaterial('paver')],physicalMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  const jobs:Job[]=[],objects:T.Group[]=[],collisionObjects:T.Group[]=[],replacements:{id:number;x:number;z:number;radius:number;ready:boolean}[]=[],visuals:{mesh:T.Mesh;fine:boolean}[]=[];
  let groundRings:number[][][][]=[],nativeShellRings:XY[][][]=[];
  let active:Job|undefined,iterator:Generator<void>|undefined,parts:Part[]=[];const colors=new Map<string,T.Color>(),unitBox=new T.BoxGeometry(1,1,1).toNonIndexed();unitBox.deleteAttribute('uv');
  function put(g:T.BufferGeometry,color:string,fine=false,physical=false,kind=0,nativeShell=false){
    const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();flat.deleteAttribute('uv');let c=colors.get(color);if(!c){c=new T.Color(color);colors.set(color,c);}const values=new Float32Array(flat.attributes.position.count*3);for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}flat.setAttribute('color',new T.BufferAttribute(values,3));parts.push({g:flat,kind,fine,physical,nativeShell});
  }
  function box(x:number,y:number,z:number,w:number,h:number,d:number,c:string,fine=false,physical=false,angle=0,kind=0){const g=unitBox.clone();g.scale(w,h,d);g.rotateY(angle);g.translate(x,y,z);put(g,c,fine,physical,kind);}
  function beam(a:T.Vector3,b:T.Vector3,r:number,c:string,fine=true){const delta=b.clone().sub(a),g=new T.CylinderGeometry(r,r,delta.length(),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);put(g,c,fine);}
  function shape(p:XY[]){const s=new T.Shape();p.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s;}
  function solid(p:XY[],h:number,y:number,c:string,physical=true,holes:XY[][]=[],kind=0){const outline=shape(p);for(const ring of holes){const hole=new T.Path();ring.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();outline.holes.push(hole);}const g=new T.ExtrudeGeometry(outline,{depth:h,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);g.translate(0,y,0);const nativeShell=physical&&h>2;if(nativeExport&&nativeShell)nativeShellRings.push([p,...holes]);put(g,c,false,physical,kind,nativeShell);}
  function* surfaceStaged(p:XY[],elevation:(x:number,z:number)=>number,c='#989d94',physical=true,holes:XY[][]=[]){
    const partition=groundPartition(active!.root.name,[p,...holes]);if(!partition.length)return;groundRings.push(...partition);
    const source=new T.ShapeGeometry(partition.map(groundShape));source.rotateX(-Math.PI/2);const flat=source.index?source.toNonIndexed():source,v=flat.attributes.position,out:number[]=[];
    function tri(a:XY,b:XY,c:XY,depth=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(depth<12&&Math.max(ab,bc,ca)>3){if(ab>=bc&&ab>=ca){const m:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,m,c,depth+1);tri(m,b,c,depth+1);}else if(bc>=ca){const m:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,m,depth+1);tri(a,m,c,depth+1);}else{const m:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,m,depth+1);tri(m,b,c,depth+1);}return;}for(const [x,z]of[a,b,c])out.push(x,0,z);}
    for(let i=0;i<v.count;i+=3)tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);if(flat!==source)flat.dispose();source.dispose();
    for(let i=0;i<out.length;i+=3){out[i+1]=elevation(out[i],out[i+2]);if(i%192===189)yield;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();put(g,c,false,physical,2);
  }
  function surface(...args:Parameters<typeof surfaceStaged>){for(const _ of surfaceStaged(...args)){};}
  function facade(a:XY,b:XY,y:number){
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx);
    const at=(u:number,v=0):XY=>[a[0]+u*dx/len-v*dz/len,a[1]+u*dz/len+v*dx/len];
    function panel(u:number,h:number,v:number,w:number,height:number,depth:number,c:string,fine=false,kind=0){const p=at(u,v);if(kind===1){const g=new T.PlaneGeometry(w,height);g.rotateY(angle);g.translate(p[0],y+h,p[1]);put(g,c,fine,false,1);}else box(p[0],y+h,p[1],w,height,depth,c,fine,false,angle);}
    function window(u:number,h:number,w:number,height:number,trim='#b7b4a3',frame='#655952',offset=0){
      panel(u,h,.31+offset,w,height,.03,'#50676b',false,1);for(const side of[-1,1])panel(u+side*(w/2+.07),h,.34+offset,.13,height+.21,.20,trim,true);for(const side of[-1,1])panel(u,h+side*(height/2+.075),.37+offset,w+.3,.13,.27,trim,true);panel(u,h,.35+offset,.06,height,.06,frame,true);panel(u,h+height*.27,.36+offset,w,.055,.06,frame,true);
    }
    function label(text:string,u:number,h:number,size:number,c='#d1c4a4',v=.50){const p=at(u,v),g=lettering(text,size);g.rotateY(angle);g.translate(p[0],y+h,p[1]);put(g,c,true);}
    return{len,y,at,panel,window,label};
  }
  function job(title:string,points:XY[],ids:number[],run:()=>Generator<void>){
    const root=new T.Group(),physical=new T.Group();root.name=name+' · '+title;physical.name=root.name+' · coliziune';root.visible=false;root.matrixAutoUpdate=false;physical.matrixAutoUpdate=false;scene.add(root);objects.push(root);collisionObjects.push(physical);
    // A row of bollards or a four-corner open rectangle is not a closed OSM
    // polygon. Its polygon centroid omitted the closing edge and could land
    // hundreds of metres away, delaying local objects and destination readiness.
    const closed=points.length>3&&points[0][0]===points.at(-1)![0]&&points[0][1]===points.at(-1)![1];
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
    const [x,z]=closed?centroid(points):[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2];
    jobs.push({root,physical,points,ids,x,z,run,done:false,nextProbe:0});for(const id of ids)replacements.push({id,x,z,radius:0,ready:false});
  }
  function* flush(){
    // Keep the structural solids in the native export. They are the closed
    // walls and roofs behind the photo-authored facade details. Removing them
    // left windows, cornices and balconies floating over empty space because
    // the corresponding OSM fallback is deliberately suppressed downstream.
    // These shells are not duplicates: the native compiler removes the old
    // OSM footprint before this authoritative layer is drawn.
    if(nativeExport)active!.root.userData.nativeShellVertices=(active!.root.userData.nativeShellVertices??0)+parts.filter(p=>p.nativeShell).reduce((sum,p)=>sum+p.g.getAttribute('position').count,0);
    for(const fine of[false,true])for(let kind=0;kind<materials.length;kind++){const selected=parts.filter(p=>p.fine===fine&&p.kind===kind);if(!selected.length)continue;const g=mergeGeometries(selected.map(p=>p.g))!;g.computeBoundingSphere();g.computeBoundingBox();const mesh=new T.Mesh(g,materials[kind]);mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;active!.root.add(mesh);visuals.push({mesh,fine});const physical=selected.filter(p=>p.physical);if(!nativeExport&&physical.length){const collider=new T.Mesh(mergeGeometries(physical.map(p=>p.g))!,physicalMaterial);collider.matrixAutoUpdate=false;active!.physical.add(collider);}selected.forEach(p=>p.g.dispose());yield;}
    parts=[];active!.physical.updateMatrixWorld(true);if(!nativeExport)yield* prepareLandmarkCollision(active!.physical);active!.root.userData.groundRings=groundRings;groundRings=[];active!.root.userData.nativeShellRings=nativeShellRings;nativeShellRings=[];
  }
  const frustum=new T.Frustum(),matrix=new T.Matrix4();
  function buildAllForNativeExport(){
    if(!nativeExport)throw new Error('Native export is not active.');
    for(const selected of jobs){
      if(selected.done)continue;
      active=selected;iterator=(function*(){yield* selected.run();yield* flush();})();
      while(!iterator.next().done){}
      selected.done=true;selected.root.visible=true;selected.root.updateMatrixWorld(true);
      for(const replacement of replacements)if(selected.ids.includes(replacement.id))replacement.ready=true;
      active=undefined;iterator=undefined;
    }
  }
  const api={objects,collisionObjects,replacements,put,box,beam,solid,surface,surfaceStaged,facade,job,ground,buildAllForNativeExport,
    get ready(){return jobs.every(j=>j.done);},
    readyNear(x:number,z:number,r=420){return jobs.every(j=>Math.hypot(x-j.x,z-j.z)>r||j.done);},
    update(camera:T.PerspectiveCamera,_now:number){
      const focus=sceneBuildFocus(camera);
      if(!active){let best=510;for(const j of jobs){if(j.done)continue;const d=Math.hypot(focus.x-j.x,focus.z-j.z);if(d>=best||_now<j.nextProbe)continue;
        // A not-yet-streamed footprint used to query the iframe at every
        // vertex, in every frame, across all frontage layers.
        if(loaded(j.x,j.z)&&j.points.every(p=>loaded(...p))){best=d;active=j;}
        else j.nextProbe=_now+300;
      }if(active){const selected=active;iterator=(function*(){yield* selected.run();yield* flush();})();}}
      if(active&&canBuildScene()){const until=sceneBuildDeadline(1.1);let count=0;do{const next=iterator!.next();count++;if(next.done){active.done=true;active.root.visible=true;active.root.updateMatrixWorld(true);active.physical.userData.grounded=true;active.physical.userData.revision=1;active.physical.updateMatrixWorld(true);for(const r of replacements)if(active.ids.includes(r.id))r.ready=true;active=undefined;break;}}while(count<sceneBuildStages(2)&&performance.now()<until);}
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));for(const {mesh,fine}of visuals){const sphere=mesh.geometry.boundingSphere!,d=camera.position.distanceTo(sphere.center)-sphere.radius;mesh.visible=(fine?detailInRange(mesh,d,110):d<camera.far)&&frustum.intersectsSphere(sphere);mesh.castShadow=mesh.visible&&d<65;}
    },
    dispose(){for(const root of[...objects,...collisionObjects]){scene.remove(root);root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}unitBox.dispose();parts.forEach(p=>p.g.dispose());[...materials,physicalMaterial].forEach(m=>m.dispose());}
  };
  if(nativeExport)(globalThis as any).__CHISINAU_NATIVE_STREET_MESHES__.push(api);
  return api;
}
