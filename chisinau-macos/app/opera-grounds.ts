import {groundPartition,groundShape,groundCoverage} from './ground-partition';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {feature,centroid,type XY} from './city-layout';
import firMesh from '../data/government-fir.json';

// The four planted islands and both rectangular basins are mapped features.
const LAWN_IDS=['w1263095090','w1263095091','w1263095092','w1263095093'];
const FOUNTAIN_IDS=['w39889217','w39889218'];
const TREES:XY[]=[[-413,-22],[-400,-23],[-387,-22],[-374,-23],[-409,-35],[-397,-33],[-382,-32],[-412,-51],[-350,-23],[-321,-23],[-307,-24],[-303,-34],[-321,-34],[-394,-80],[-307,-79]];

export function createOperaGrounds(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  const nativeExport=Array.isArray((globalThis as any).__CHISINAU_NATIVE_STREET_MESHES__);
  const root=new T.Group();root.name='Opera · peluze și fântâni';root.visible=false;scene.add(root);
  const lawn=new T.MeshStandardMaterial({name:'Opera · peluză',color:'#4f773b',roughness:1});
  const stone=new T.MeshStandardMaterial({name:'Opera · borduri și bazine',color:'#aaa99a',roughness:.9});
  const water=new T.MeshStandardMaterial({name:'Opera · apa fântânilor',color:'#639b97',roughness:.24,metalness:.28});
  const spray=new T.MeshStandardMaterial({name:'Opera · jeturi',color:'#c3deda',roughness:.35,emissive:'#45645f',emissiveIntensity:.12});
  const bark=new T.MeshStandardMaterial({color:'#706654',roughness:1});
  const collisionMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  const texture=nativeExport?undefined:new T.TextureLoader().load('/government/fir.png');if(texture){texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;}
  const evergreen=new T.MeshStandardMaterial({map:texture??null,color:nativeExport?'#365a35':'#ffffff',side:T.DoubleSide,alphaTest:.5,roughness:.95});
  const materials=[lawn,stone,water,spray,bark,collisionMaterial,evergreen];
  const geometries=new Set<T.BufferGeometry>(),visuals:{mesh:T.Mesh;fine:boolean}[]=[];
  const collisionObjects=FOUNTAIN_IDS.map(id=>{const g=new T.Group();g.name=`Opera · bazin ${id}`;return g;});
  const treeGeometry=new T.BufferGeometry();treeGeometry.setAttribute('position',new T.Float32BufferAttribute(firMesh.POSITION,3));treeGeometry.setAttribute('normal',new T.Float32BufferAttribute(firMesh.NORMAL,3));treeGeometry.setAttribute('uv',new T.Float32BufferAttribute(firMesh.TEXCOORD_0,2));treeGeometry.setIndex(firMesh.indices);geometries.add(treeGeometry);
  const shape=(points:XY[])=>{const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s;};
  function put(parts:T.BufferGeometry[],material:T.Material,name:string,fine=false,collision?:T.Group){
    if(!parts.length)return;
    const flat=parts.map(g=>{const f=g.index?g.toNonIndexed():g.clone();if(material!==evergreen)f.deleteAttribute('uv');return f;});
    const geometry=mergeGeometries(flat)!;parts.forEach(g=>g.dispose());flat.forEach(g=>g.dispose());
    geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.add(geometry);
    const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;root.add(mesh);visuals.push({mesh,fine});
    if(collision){collision.add(new T.Mesh(geometry,collisionMaterial));collision.userData.grounded=true;collision.userData.revision=(collision.userData.revision??0)+1;collision.updateMatrixWorld(true);}
  }
  // Small terrain-following triangles prevent lawns from cutting through slopes.
  function surface(points:XY[],elevation:(x:number,z:number)=>number){
    const partition=groundPartition(root.name,[points]);root.userData.groundRings=[...(root.userData.groundRings??[]),...partition];
    const source=new T.ShapeGeometry(partition.map(groundShape));source.rotateX(-Math.PI/2);const flat=source.toNonIndexed(),v=flat.getAttribute('position'),vertices:number[]=[];
    function triangle(a:XY,b:XY,c:XY,depth=0){
      if(depth<5&&Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))>6){
        const ab:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2],bc:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2],ca:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];triangle(a,ab,ca,depth+1);triangle(ab,b,bc,depth+1);triangle(ca,bc,c,depth+1);triangle(ab,bc,ca,depth+1);return;
      }
      for(const [x,z]of[a,b,c])vertices.push(x,elevation(x,z),z);
    }
    for(let i=0;i<v.count;i+=3)triangle([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);
    source.dispose();flat.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
  }
  function edge(a:XY,b:XY,y:number,width:number,height:number){
    const dx=b[0]-a[0],dz=b[1]-a[1],g=new T.BoxGeometry(Math.hypot(dx,dz),height,width);g.rotateY(Math.atan2(-dz,dx));g.translate((a[0]+b[0])/2,y,(a[1]+b[1])/2);return g;
  }
  const jobs:{points:XY[];build:()=>void}[]=[];
  for(const id of LAWN_IDS){const f=feature(id);jobs.push({points:f.p,build(){
    put([surface(f.p,(x,z)=>ground(x,z)+.09)],lawn,`Opera · spațiu verde ${id}`);
    const borders:T.BufferGeometry[]=[];
    for(let i=1;i<f.p.length;i++){
      const a=f.p[i-1],b=f.p[i],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4);
      for(let j=0;j<count;j++){const aa:XY=[a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count],bb:XY=[a[0]+(b[0]-a[0])*(j+1)/count,a[1]+(b[1]-a[1])*(j+1)/count];borders.push(edge(aa,bb,ground((aa[0]+bb[0])/2,(aa[1]+bb[1])/2)+.12,.16,.21));}
    }
    put(borders,stone,'Opera · borduri de piatră',true);
  }});}
  FOUNTAIN_IDS.forEach((id,index)=>{const f=feature(id);jobs.push({points:f.p,build(){
    const [x,z]=centroid(f.p),level=Math.max(...f.p.map(p=>ground(...p)))+.08,collision=collisionObjects[index];
    const base=new T.ExtrudeGeometry(shape(f.p),{depth:.27,bevelEnabled:false});base.rotateX(-Math.PI/2);base.translate(0,level-.15,0);
    const walls:T.BufferGeometry[]=[base];for(let i=1;i<f.p.length;i++)walls.push(edge(f.p[i-1],f.p[i],level+.35,.5,.7));
    put(walls,stone,`Opera · fântână ${index+1}`,false,collision);
    const inset=f.p.map(([px,pz])=>[x+(px-x)*.94,z+(pz-z)*.89] as XY);
    put([surface(inset,()=>level+.30)],water,'Opera · luciul apei');
    const jets:T.BufferGeometry[]=[];
    for(let j=-3;j<=3;j++){
      const cx=x+j*2.1,peak=j===0?2.1:1.15;
      const g=new T.CylinderGeometry(.045,.09,peak,6);g.translate(cx,level+.30+peak/2,z);jets.push(g);
      for(let side=0;side<4;side++){
        const angle=side*Math.PI/2,dx=Math.cos(angle),dz=Math.sin(angle);
        const curve=new T.QuadraticBezierCurve3(new T.Vector3(cx,level+.34,z),new T.Vector3(cx+dx*.4,level+peak*1.7,z+dz*.4),new T.Vector3(cx+dx*1.1,level+.32,z+dz*1.1));
        jets.push(new T.TubeGeometry(curve,6,.025,4,false));
      }
    }
    put(jets,spray,'Opera · jeturi de apă',true);
  }});});
  jobs.push({points:TREES,build(){
    const trunks:T.BufferGeometry[]=[],trees:T.BufferGeometry[]=[];
    TREES.forEach(([x,z],i)=>{
      const height=z<-60?6.2:3.8+(i%4)*.75,y=ground(x,z);
      const trunk=new T.CylinderGeometry(.09,.15,height*.8,6);trunk.translate(x,y+height*.4,z);trunks.push(trunk);
      const tree=treeGeometry.clone();tree.scale(height*1.06,height*1.06,height*1.06);tree.rotateY(i*.83);tree.translate(x,y,z);trees.push(tree);
    });
    put(trunks,bark,'Opera · trunchiuri');put(trees,evergreen,'Opera · conifere');
  }});
  const frustum=new T.Frustum(),matrix=new T.Matrix4();let disposed=false,nextBuild=0;
  function buildAllForNativeExport(){
    if(!nativeExport)throw new Error('Native export is not active.');
    while(jobs.length)jobs.shift()!.build();root.visible=true;root.updateMatrixWorld(true);
  }
  const api={objects:[root],collisionObjects,treeOverrides:TREES.map(([x,z])=>({x,z,radius:2,height:0,texture:1})),replacements:[],buildAllForNativeExport,
    readyNear(x:number,z:number,r=420){return jobs.every(j=>j.points.every(p=>Math.hypot(x-p[0],z-p[1])>r));},
    update(camera:T.PerspectiveCamera,now:number){
      if(disposed)return;
      // One small batch per frame; distant architecture never delays game start.
      if(jobs.length&&now>=nextBuild&&jobs[0].points.every(p=>loaded(...p))){jobs.shift()!.build();nextBuild=now+16;}
      root.visible=visuals.length>0;
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      for(const {mesh,fine}of visuals){const sphere=mesh.geometry.boundingSphere!,distance=camera.position.distanceTo(sphere.center)-sphere.radius;mesh.visible=distance<(fine?150:camera.far)&&frustum.intersectsSphere(sphere);mesh.castShadow=mesh.visible&&distance<80&&mesh.material!==water&&mesh.material!==spray;}
    },
    dispose(){disposed=true;scene.remove(root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture?.dispose();}
  };
  if(nativeExport)(globalThis as any).__CHISINAU_NATIVE_STREET_MESHES__.push(api);
  return api;
}
