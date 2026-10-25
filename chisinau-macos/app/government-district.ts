import {groundPartition,groundShape,groundCoverage} from './ground-partition';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITY_DATA,feature,centroid,type XY} from './city-layout';
import firMesh from '../data/government-fir.json';

export const GOVERNMENT={id:762704772,entrance:{x:24.93,z:95.33},height:20,frontBays:31};
const AREA={minX:-121,maxX:166,minZ:39,maxZ:175};
const inside=([x,z]:XY)=>x>AREA.minX&&x<AREA.maxX&&z>AREA.minZ&&z<AREA.maxZ;
type Batch={material:T.Material;geometries:T.BufferGeometry[];fine:boolean;land:boolean};

/** Photographic reconstruction on the existing OSM footprint; references in docs/government-references.md. */
export function createGovernmentDistrict(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  const building=new T.Group(),landscape=new T.Group();building.name='Casa Guvernului · fațade și acoperiș';landscape.name='Guvern · grădini și trepte';
  building.visible=landscape.visible=false;scene.add(building,landscape);
  const stone=new T.MeshStandardMaterial({color:'#c8c3b7',roughness:.84});
  const lightStone=new T.MeshStandardMaterial({color:'#dedbd1',roughness:.8});
  const joint=new T.MeshStandardMaterial({color:'#9c968c',roughness:.92});
  const base=new T.MeshStandardMaterial({color:'#756b62',roughness:.87});
  const steps=new T.MeshStandardMaterial({color:'#8d8178',roughness:.9});
  const pavement=new T.MeshStandardMaterial({color:'#b2b1a8',roughness:.98});
  const glass=new T.MeshStandardMaterial({color:'#79a7b1',roughness:.3,metalness:.12});glass.name='Guvern · geamuri albastre';
  const metal=new T.MeshStandardMaterial({color:'#a1aaa6',roughness:.47,metalness:.48});
  const darkMetal=new T.MeshStandardMaterial({color:'#454d4b',roughness:.57,metalness:.4});
  const smokedGlass=new T.MeshStandardMaterial({color:'#47615e',roughness:.3,metalness:.15});
  const roof=new T.MeshStandardMaterial({color:'#909692',roughness:.92});
  const lawn=new T.MeshStandardMaterial({color:'#4e7037',roughness:1});
  const hedge=new T.MeshStandardMaterial({color:'#335733',roughness:1});
  const soil=new T.MeshStandardMaterial({color:'#59463a',roughness:1});
  const red=new T.MeshStandardMaterial({color:'#91354b',roughness:.9});
  const water=new T.MeshStandardMaterial({color:'#485955',roughness:.37,metalness:.12});
  const lamp=new T.MeshStandardMaterial({color:'#deded2',roughness:.5});
  const collisionMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  const materials:T.Material[]=[stone,lightStone,joint,base,steps,pavement,glass,metal,darkMetal,smokedGlass,roof,lawn,hedge,soil,red,water,lamp,collisionMaterial];
  const textures:T.Texture[]=[],flags:{mesh:T.Mesh;source:Float32Array}[]=[];
  const batches=new Map<string,Batch>(),merged=new Map<string,T.Mesh>(),visuals:{mesh:T.Mesh;fine:boolean;land:boolean}[]=[];
  const collisionObjects:T.Group[]=[],collisionBuckets=new Map<string,T.Group>();
  // Stable groups are registered with the world before their ground-dependent geometry is built.
  for(let x=-4;x<=5;x++)for(let z=1;z<=5;z++){const group=new T.Group();group.name=`Guvern · coliziune ${x}/${z}`;collisionBuckets.set(`${x}/${z}`,group);collisionObjects.push(group);}
  const buildingCollision=new T.Group();buildingCollision.name='Guvern · clădire';collisionObjects.push(buildingCollision);
  const shape=(p:XY[])=>{const s=new T.Shape();p.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s;};
  function solid(p:XY[],height:number,y=0){const g=new T.ExtrudeGeometry(shape(p),{depth:height,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;}
  function physical(g:T.BufferGeometry,land=false){
    const mesh=new T.Mesh(g.clone(),collisionMaterial);g.computeBoundingBox();const center=g.boundingBox!.getCenter(new T.Vector3());
    const group=land?collisionBuckets.get(`${Math.floor(center.x/32)}/${Math.floor(center.z/32)}`):buildingCollision;
    group?.add(mesh);if(!group)mesh.geometry.dispose();
  }
  function put(g:T.BufferGeometry,material:T.Material,land=false,fine=false,collision=false){
    if(collision)physical(g,land);
    g.computeBoundingBox();const p=g.boundingBox!.getCenter(new T.Vector3()),key=`${land}/${fine}/${Math.floor(p.x/64)}/${Math.floor(p.z/64)}/${material.uuid}`;
    let batch=batches.get(key);if(!batch){batch={material,geometries:[],fine,land};batches.set(key,batch);}
    const flat=g.index?g.toNonIndexed():g.clone();if(!('map' in material)||!material.map)flat.deleteAttribute('uv');batch.geometries.push(flat);g.dispose();
  }
  function box(x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material,land=false,fine=false,collision=false,angle=0){const g=new T.BoxGeometry(w,h,d);g.rotateY(angle);g.translate(x,y,z);put(g,material,land,fine,collision);}
  function cylinder(x:number,y:number,z:number,r:number,h:number,material:T.Material,land=false,collision=false){const g=new T.CylinderGeometry(r,r,h,10);g.translate(x,y,z);put(g,material,land,false,collision);}
  function edge(a:XY,b:XY,y:number,w:number,h:number,material:T.Material,land=false,fine=false,collision=false){const dx=b[0]-a[0],dz=b[1]-a[1];box((a[0]+b[0])/2,y,(a[1]+b[1])/2,Math.hypot(dx,dz),h,w,material,land,fine,collision,Math.atan2(-dz,dx));}
  function flush(){
    for(const [key,batch]of batches){if(!batch.geometries.length)continue;
      const previous=merged.get(key);if(previous)batch.geometries.unshift(previous.geometry);
      const g=mergeGeometries(batch.geometries,false)!;batch.geometries.forEach(p=>p.dispose());g.computeBoundingBox();g.computeBoundingSphere();
      if(previous){previous.geometry=g;batches.delete(key);continue;}
      const mesh=new T.Mesh(g,batch.material);mesh.castShadow=mesh.receiveShadow=true;mesh.name=batch.fine?'Guvern · detalii apropiate':'Guvern · structură';
      (batch.land?landscape:building).add(mesh);visuals.push({mesh,fine:batch.fine,land:batch.land});merged.set(key,mesh);batches.delete(key);
    }
  }

  const outline=feature('w762704772').p;
  // A buried foundation prevents gaps below the raised entrance on sloping terrain.
  put(solid(outline,28,-8),stone,false,false,true);
  put(solid(outline,.22,19.95),roof,false,false,true);
  // Continuous pale cornice and roof parapets follow the true U-shaped footprint.
  for(let i=1;i<outline.length;i++){
    edge(outline[i-1],outline[i],20.18,.44,.58,lightStone,false,false,true);
    edge(outline[i-1],outline[i],19.57,.32,.25,joint);
    edge(outline[i-1],outline[i],.12,.24,.48,base);
  }
  function facade(a:XY,b:XY,bays:number,pilasters=true,entrance=false){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length,angle=Math.atan2(-dz,dx),pitch=length/bays;
    const at=(x:number,z:number):XY=>[a[0]+x*ux-z*uz,a[1]+x*uz+z*ux];
    const panel=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,fine=false)=>{const p=at(x,z);box(p[0],y,p[1],w,h,d,m,false,fine,false,angle);};
    for(let bay=0;bay<bays;bay++){
      const middle=pilasters?(bay+.5)*pitch:length/2+(bay-(bays-1)/2)*1.68,windowWidth=pilasters?pitch-1.0:1.28;
      for(let floor=0;floor<6;floor++){
        const bottom=.38+floor*3.18,windowHeight=floor===0?2.85:2.7;
        const centerDoor=entrance&&Math.abs(middle-length/2)<pitch*1.6&&floor===0;
        const paneCount=pilasters?(centerDoor?3:2):1;
        for(let pane=0;pane<paneCount;pane++){
          // Keep real separation from the stone shell: the old 4.6 cm gap
          // collapsed to the same depth value in distant / moving views.
          const pw=windowWidth/paneCount-.045,px=middle-windowWidth/2+(pane+.5)*windowWidth/paneCount,p=at(px,-.34);
          const g=new T.PlaneGeometry(pw,windowHeight);g.rotateY(Math.PI+angle);g.translate(p[0],bottom+windowHeight/2,p[1]);
          put(g,glass);
        }
        panel(middle,bottom+windowHeight+.14,-.37,windowWidth,.27,.16,metal);
        panel(middle,bottom+windowHeight*.67,-.40,windowWidth,.048,.045,metal,true);
        for(let pane=0;pane<=paneCount;pane++)panel(middle-windowWidth/2+pane*windowWidth/paneCount,bottom+windowHeight/2,-.41,.055,windowHeight,.07,metal,true);
        if(centerDoor){
          panel(middle,.25,-.6,windowWidth+.12,.18,1.1,base);
          panel(middle,3.47,-.38,windowWidth+.3,.35,.75,darkMetal);
          for(const sign of[-1,1])panel(middle+sign*.38,1.45,-.48,.04,.62,.07,metal,true);
        }
      }
    }
    if(pilasters)for(let i=0;i<=bays;i++){
      panel(i*pitch,9.98,-.41,.86,19.5,.81,lightStone);
      panel(i*pitch,.44,-.46,1.08,.4,.94,base);
      for(let row=1;row<12;row++)panel(i*pitch,row*1.62,-.824,.85,.018,.018,joint,true);
    }
    panel(length/2,19.65,-.28,length+.8,.48,.86,lightStone);
  }
  facade([-63.77,95.63],[113.14,95.04],GOVERNMENT.frontBays,true,true);
  facade([113.14,95.04],[113.35,156.42],10);
  facade([-63.56,157.41],[-63.77,95.63],10);
  facade([98.49,113.07],[-48.75,113.47],25);
  facade([-48.75,113.47],[-48.63,150.44],6);
  facade([98.59,150.57],[98.49,113.07],6);
  facade([113.35,156.42],[96.19,156.48],4,false);
  facade([-45.92,157.34],[-63.56,157.41],4,false);
  // Modest service entrances and canopies on the courtyard side.
  for(const x of[-34,13,60,88]){box(x,3.1,113.8,5,.22,1.7,roof);box(x,1.45,113.58,3.7,2.5,.12,darkMetal);}
  // Low glazed courtyard annex, visible in the rear aerial reference.
  box(-38.3,-2.5,117.1,16,5,7.2,base,false,false,true);
  box(-38.3,1.5,117.1,16,3,7.2,smokedGlass,false,false,true);
  box(-38.3,3.13,117.1,16.6,.26,7.7,darkMetal,false,false,true);
  box(-38.3,.12,117.1,16.2,.24,7.5,base);
  for(let x=-46.3;x<=-30.2;x+=1.34)box(x,1.52,120.74,.05,2.82,.06,metal,false,true);
  for(const y of[.22,1.14,2.08,2.96])box(-38.3,y,120.74,16,.05,.06,metal,false,true);
  for(const x of[-46.34,-30.26])for(let z=114;z<120.7;z+=1.32)box(x,1.52,z,.06,2.82,.05,metal,false,true);
  // Roof service blocks, ventilation and drainage remain low and unobtrusive.
  for(const [x,z,w,d]of[[-50,121,4,7],[104,131,4,7],[-3,105,8,5],[54,105,8,5]]){
    box(x,20.72,z,w,1.35,d,stone,false,false,true);box(x,21.43,z,w+.2,.14,d+.2,roof,false,false,true);
  }
  for(let x=-53;x<108;x+=20){box(x,20.48,104.9,1.4,.58,.8,metal);box(x,20.8,104.9,1.65,.08,1.05,darkMetal);}
  for(const x of[-57,108])for(let z=117;z<152;z+=14)box(x,20.45,z,1.05,.5,.85,metal);

  const loader=new T.TextureLoader();
  const firTexture=loader.load('/government/fir.png');firTexture.colorSpace=T.SRGBColorSpace;firTexture.flipY=false;textures.push(firTexture);
  const firMaterial=new T.MeshStandardMaterial({map:firTexture,side:T.DoubleSide,alphaTest:.5,roughness:.95});materials.push(firMaterial);
  const firGeometry=new T.BufferGeometry();firGeometry.setAttribute('position',new T.Float32BufferAttribute(firMesh.POSITION,3));firGeometry.setAttribute('normal',new T.Float32BufferAttribute(firMesh.NORMAL,3));firGeometry.setAttribute('uv',new T.Float32BufferAttribute(firMesh.TEXCOORD_0,2));firGeometry.setIndex(firMesh.indices);
  const signTexture=loader.load('/government/entrance-sign.svg');signTexture.colorSpace=T.SRGBColorSpace;textures.push(signTexture);
  const signMaterial=new T.MeshStandardMaterial({map:signTexture,roughness:.7});materials.push(signMaterial);
  const sign=new T.PlaneGeometry(3.9,.43);sign.rotateY(Math.PI);sign.translate(24.69,3.5,94.57);put(sign,signMaterial);
  const flagTexture=loader.load('/government/flag-md.svg');flagTexture.colorSpace=T.SRGBColorSpace;textures.push(flagTexture);
  const flagMaterial=new T.MeshStandardMaterial({map:flagTexture,side:T.DoubleSide,roughness:.88});materials.push(flagMaterial);
  const crestTexture=loader.load('/government/coat-md.svg');crestTexture.colorSpace=T.SRGBColorSpace;textures.push(crestTexture);
  const crestMaterial=new T.MeshStandardMaterial({map:crestTexture,transparent:true,alphaTest:.25,roughness:.6,metalness:.3});
  crestMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = vec3(0.64 + dot(diffuseColor.rgb, vec3(0.299,0.587,0.114))*0.3);');};
  materials.push(crestMaterial);
  const disk=new T.CylinderGeometry(1.48,1.48,.22,40);disk.rotateX(Math.PI/2);disk.translate(24.69,20.48,94.63);put(disk,darkMetal);
  const crest=new T.Mesh(new T.PlaneGeometry(1.83,2.31),crestMaterial);crest.rotation.y=Math.PI;crest.position.set(24.69,20.5,94.49);building.add(crest);
  function flag(x:number,y:number,z:number,height:number,width:number,land:boolean){
    cylinder(x,y+height/2,z,land?.15:.065,height,metal,land,true);box(x,y+.15,z,.6,.3,.6,base,land,false,true);
    const g=new T.PlaneGeometry(width,width/2,16,6);g.translate(width/2,-width/4,0);
    const mesh=new T.Mesh(g,flagMaterial);mesh.position.set(x,y+height-.18,z);mesh.rotation.y=.2;(land?landscape:building).add(mesh);flags.push({mesh,source:new Float32Array(g.attributes.position.array)});
  }
  flag(24.7,20.46,96.7,5.6,2.9,false);
  flush();

  const selected=CITY_DATA.features.filter(f=>f.p.length>2&&f.p.every(inside));
  const jobs:(()=>void)[]=[];
  let built=false,ready=false,nextGround=0,lastFlag=0;
  const entryFloor=()=>Math.max(ground(24.93,95.33)+.24,ground(24.6,86.3)+1.86);
  // Subdivision keeps the added paving on the same sloping terrain as Streets GL.
  function surface(p:XY[],m:T.Material,raise=.06,elevation=ground,collision=false){
    const partition=groundPartition(landscape.name,[p]);if(!partition.length)return;landscape.userData.groundRings=[...(landscape.userData.groundRings??[]),...partition];
    const source=new T.ShapeGeometry(partition.map(groundShape));source.rotateX(-Math.PI/2);const flat=source.toNonIndexed(),v=flat.getAttribute('position'),vertices:number[]=[];
    const triangle=(a:XY,b:XY,c:XY,depth=0)=>{
      if(depth<5&&Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))>9){
        const ab:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2],bc:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2],ca:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];triangle(a,ab,ca,depth+1);triangle(ab,b,bc,depth+1);triangle(ca,bc,c,depth+1);triangle(ab,bc,ca,depth+1);return;
      }
      for(const [x,z]of[a,b,c])vertices.push(x,elevation(x,z)+raise,z);
    };
    for(let i=0;i<v.count;i+=3)triangle([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);
    source.dispose();flat.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();put(g,m,true,false,collision);
  }
  function stair(a:XY,b:XY,width:number,count:number,low:number,high:number){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
    for(let i=0;i<count;i++){
      const t=(i+.5)/count,x=a[0]+dx*t,z=a[1]+dz*t,top=Math.max(ground(x,z)+.075,low+(high-low)*(i+1)/count),bottom=Math.min(ground(x,z)-.2,low-.2);
      box(x,(bottom+top)/2,z,width,top-bottom,length/count+.014,steps,true,false,true,angle);
      const nose=new T.BoxGeometry(width,.022,.05);nose.rotateY(angle);nose.translate(x-Math.sin(angle)*length/count*.46,top+.009,z-Math.cos(angle)*length/count*.46);put(nose,lightStone,true,true);
    }
  }
  function border(p:XY[],m=lightStone){for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/4);for(let j=0;j<n;j++){const u=j/n,v=(j+1)/n,aa:XY=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],bb:XY=[a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v];edge(aa,bb,ground((aa[0]+bb[0])/2,(aa[1]+bb[1])/2)+.13,.15,.22,m,true,true);}}}
  for(const f of selected){
    if(f.t.landuse==='grass'||f.t.leisure==='garden')jobs.push(()=>{surface(f.p,lawn);border(f.p);});
    if(f.t.amenity==='fountain')jobs.push(()=>{
      const c=centroid(f.p),level=ground(c[0],c[1])+.05;surface(f.p,water,.02,()=>level);
      for(let i=1;i<f.p.length;i++)edge(f.p[i-1],f.p[i],level+.24,.45,.45,base,true);
    });
  }
  // Mapped courtyard and lateral pedestrian paths, with real stepped flights.
  for(const f of CITY_DATA.features.filter(f=>f.p.every(inside))){
    if(f.t.highway==='footway')jobs.push(()=>{
      if(f.p.every(p=>p[0]>12&&p[0]<37&&p[1]<96))return;
      for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.1)continue;const nx=-dz/length*.85,nz=dx/length*.85;
        surface([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]],pavement);
      }
    });
    if(f.t.highway==='steps'&&!(centroid(f.p)[0]>12&&centroid(f.p)[0]<37&&centroid(f.p)[1]<96))jobs.push(()=>{let a=f.p[0],b=f.p.at(-1)!;if(ground(...a)>ground(...b))[a,b]=[b,a];const low=ground(...a)+.04,high=Math.max(low+.14,ground(...b)+.08),count=Math.max(2,Math.ceil((high-low)/.15));stair(a,b,3.6,count,low,high);});
  }
  jobs.push(()=>{
    const low=ground(24.05,58.1)+.06,high=Math.max(low+1.68,ground(24.1,61.65)+.08);
    stair([24.05,58.1],[24.1,61.65],20,12,low,high);
    const forecourt=(x:number,z:number)=>Math.max(ground(x,z)+.05,high+(ground(x,79)+.08-high)*T.MathUtils.clamp((z-61.65)/17.35,0,1));
    surface([[14.8,61.42],[34.2,61.42],[34.2,79.1],[14.8,79.1]],pavement,.006,forecourt,true);
    const top=entryFloor();stair([24.66,86.32],[24.69,88.04],24,6,top-1.8,top-.9);
    // Overlap the slightly rotated flights at both ends: no narrow gaps to fall through.
    surface([[12.7,87.75],[36.7,87.75],[36.7,89.96],[12.7,89.96]],steps,.006,()=>top-.9,true);
    stair([24.72,89.66],[24.76,91.72],24,6,top-.9,top);
    surface([[12.7,91.43],[36.7,91.43],[36.7,95.42],[12.7,95.42]],steps,.006,()=>top,true);
    flag(24.5,forecourt(24.5,70.4),70.4,23,3.8,true);
    for(const x of[15.55,33.45])for(const [z,d]of[[64.9,2.4],[70.4,5.5],[75.8,2.4]]){
      const y=forecourt(x,z);box(x,y+.1,z,1.45,.18,d,lightStone,true);box(x,y+.21,z,1.13,.13,d-.27,soil,true);
      box(x,y+.3,z,1.0,.16,d-.42,red,true,true);
    }
    for(const x of[7.5,41.7]){box(x,ground(x,89)+.34,89,1.1,.65,1.1,base,true,false,true);const g=new T.SphereGeometry(.6,10,7);g.translate(x,ground(x,89)+.87,89);put(g,hedge,true);}
    // The small memorial at the pavement edge is mapped, not a newly invented monument.
    const m=ground(24.24,49.37);box(24.24,m+.19,49.37,2.1,.38,1.2,base,true,false,true);box(24.24,m+.6,49.37,1.22,.45,.48,joint,true);
  });
  for(const p of CITY_DATA.points.filter(p=>inside(p.p)&&p.t.highway==='street_lamp'))jobs.push(()=>{
    const [x,z]=p.p,y=ground(x,z);cylinder(x,y+2.25,z,.065,4.5,darkMetal,true);const g=new T.SphereGeometry(.22,10,8);g.translate(x,y+4.62,z);put(g,lamp,true);
  });
  const trees=CITY_DATA.points.filter(p=>p.t.natural==='tree'&&inside(p.p)&&p.p[1]<95).flatMap((p,i)=>{
    const [x,z]=p.p;
    if(z>86&&z<92&&x>-65&&x<119)return[{x,z,radius:2.4,height:12.5+(i%5)*.65,texture:1}];
    if(z>49&&z<55)return[{x,z,radius:2.4,height:1.75+(i%3)*.15,texture:4}];
    if(x>-10&&x<44&&z>70&&z<79)return[{x,z,radius:2.4,height:11+(i%3),texture:1}];
    return[];
  });
  // These trees share the building's depth pass, so the new façade cannot paint over them.
  // Hide only the corresponding native instances; all other city vegetation stays native.
  const treeOverrides=trees.map(tree=>({...tree,height:0}));
  for(const tree of trees)jobs.push(()=>{
    const {x,z,height,texture}=tree,y=ground(x,z);
    if(texture===4){
      const g=new T.IcosahedronGeometry(1,2);g.scale(height*.75,height*.47,height*.65);g.translate(x,y+height*.47,z);put(g,hedge,true);
      return;
    }
    cylinder(x,y+height*.48,z,.15,height*.96,base,true,true);
    const g=firGeometry.clone(),scale=height*1.06;g.scale(scale,scale,scale);g.rotateY(x*.47);g.translate(x,y,z);put(g,firMaterial,true);
  });
  // Small ornamental conifers on the two front lawns, clear of the entrance axis.
  // Reuse and batch the existing tree asset; planting remains incrementally built.
  for(const [i,x]of[-53,-33,-13,7,42,62,82,102].entries())jobs.push(()=>{
    const z=61.8,height=3.2+(i%3)*.22,y=ground(x,z);
    cylinder(x,y+height*.42,z,.085,height*.84,base,true,true);
    const g=firGeometry.clone(),scale=height*1.06;g.scale(scale,scale,scale);g.rotateY(x*.47);g.translate(x,y,z);put(g,firMaterial,true);
  });
  const frustum=new T.Frustum(),matrix=new T.Matrix4(),sphere=new T.Sphere(),worldCenter=new T.Vector3();
  const replacements=[{id:GOVERNMENT.id,x:24.7,z:111,radius:0,ready:false}];
  return{objects:[building,landscape],collisionObjects,replacements,treeOverrides,
    get ready(){return ready&&built;},
    readyNear(x:number,z:number,r=420){return Math.hypot(x-25,z-100)>r+140||ready&&built;},
    update(camera:T.PerspectiveCamera,now:number){
      if((!ready||now>=nextGround)&&loaded(24.93,95.33)){
        building.position.y=entryFloor()-.22;buildingCollision.position.y=building.position.y;buildingCollision.userData.grounded=true;buildingCollision.updateMatrixWorld(true);building.updateMatrixWorld(true);ready=true;replacements[0].ready=true;nextGround=now+1500;
      }
      if(ready&&!built&&[[-115,52],[159,52],[-112,167],[158,169]].every(([x,z])=>loaded(x,z))){
        const deadline=performance.now()+2.5;let count=0;
        while(jobs.length&&count++<3&&performance.now()<deadline)jobs.shift()!();flush();
        for(const object of collisionObjects){if(object===buildingCollision)continue;object.userData.grounded=object.children.length>0;object.userData.revision=(object.userData.revision??0)+1;object.updateMatrixWorld(true);}
        built=jobs.length===0;
      }
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));building.visible=ready;landscape.visible=ready;
      for(const {mesh,fine,land}of visuals){sphere.copy(mesh.geometry.boundingSphere!);sphere.center.y+=land?0:building.position.y;const distance=camera.position.distanceTo(sphere.center)-sphere.radius;mesh.visible=distance<(fine?130:camera.far)&&frustum.intersectsSphere(sphere);mesh.castShadow=mesh.visible&&distance<85;}
      if(now-lastFlag>33){for(const flag of flags){flag.mesh.getWorldPosition(worldCenter);flag.mesh.visible=ready&&camera.position.distanceTo(worldCenter)<350;if(!flag.mesh.visible)continue;const p=flag.mesh.geometry.attributes.position as T.BufferAttribute;for(let i=0;i<p.count;i++){const x=flag.source[i*3];p.setZ(i,Math.sin(x*3.1-now*.0024+flag.source[i*3+1])*.16*x);}p.needsUpdate=true;}lastFlag=now;}
    },
    dispose(){for(const root of[building,landscape,...collisionObjects]){scene.remove(root);root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}for(const batch of batches.values())batch.geometries.forEach(g=>g.dispose());firGeometry.dispose();materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  };
}
