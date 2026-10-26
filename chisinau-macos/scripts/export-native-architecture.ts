import fs from 'node:fs';
import * as T from 'three';
import {createStefanPark} from '../app/stefan-park';
import {createBoulevard} from '../app/boulevard';
import {createBoulevardMonuments} from '../app/boulevard-monuments';
import {createBoulevardFrontages} from '../app/boulevard-frontages';
import {createSegmentOneFrontages} from '../app/segment-one-frontages';
import {createSegmentTwoFrontages} from '../app/segment-two-frontages';
import {createSegmentThreeFrontages} from '../app/segment-three-frontages';
import {createSegmentFourFrontages} from '../app/segment-four-frontages';
import {createSegmentFiveFrontages} from '../app/segment-five-frontages';
import {createSegmentSixFrontages} from '../app/segment-six-frontages';
import {createSegmentSevenFrontages} from '../app/segment-seven-frontages';
import {createSegmentEightFrontages} from '../app/segment-eight-frontages';
import {createBoulevardCompletion} from '../app/boulevard-completion';
import {createPuskinDistrict} from '../app/puskin-district';
import {createBodoniDistrict} from '../app/bodoni-district';
import {createGovernmentDistrict} from '../app/government-district';
import {createColumnaDistrict} from '../app/columna-district';
import {createEugenDoga} from '../app/eugen-doga';
import {createMuseumQuarter} from '../app/museum-quarter';
import {createAlexandruSector} from '../app/alexandru-sector';
import {createDosofteiSector} from '../app/dosoftei-sector';
import {createColumnaEast} from '../app/columna-east';
import {createColumnaIsmailTighina} from '../app/columna-ismail-tighina';
import {createAugustQuarter} from '../app/august-quarter';
import {createAugustEast} from '../app/august-east';
import {createAugustTighina} from '../app/august-tighina';
import {createAugustIsmail} from '../app/august-ismail';
import {createAugustTolstoi} from '../app/august-tolstoi';
import {createAugustCiuflea} from '../app/august-ciuflea';
import {createVasilenco} from '../app/vasilenco';
import {createAugustCaucaz} from '../app/august-caucaz';
import {createAugustJunction} from '../app/august-junction';
import {createSciusevTest} from '../app/sciusev-test';
import {createSciusevWest} from '../app/sciusev-west';
import {createSciusevParcalab} from '../app/sciusev-parcalab';
import {createSciusevPuskin} from '../app/sciusev-puskin';
import {createSciusevBodoni} from '../app/sciusev-bodoni';
import {createSciusevIorga} from '../app/sciusev-iorga';
import {createSciusevCebotari} from '../app/sciusev-cebotari';
import {createSciusevLazo} from '../app/sciusev-lazo';
import {createSciusevStere} from '../app/sciusev-stere';
import {createSciusevPrometeu} from '../app/sciusev-prometeu';
import {createSciusev121} from '../app/sciusev-121';
import {createSciusevBend} from '../app/sciusev-bend';
import {createSciusevNorth} from '../app/sciusev-north';
import {createSciusevSfatul} from '../app/sciusev-sfatul';
import {createSciusevEminescu} from '../app/sciusev-eminescu';
import {createSciusevAlecsandri} from '../app/sciusev-alecsandri';
import {createIonCreanga} from '../app/ion-creanga';
import {createDendrarium} from '../app/dendrarium';
import {createCadastralBuildings} from '../app/cadastral-buildings';
import {createAlecsandriVa05} from '../app/alecsandri-va05';
import {createAlecsandriVa06} from '../app/alecsandri-va06';
import {createAlecsandriVa07} from '../app/alecsandri-va07';
import {createAlecsandriVa08} from '../app/alecsandri-va08';
import {createAlecsandriVa09} from '../app/alecsandri-va09';
import {createAlecsandriVa10} from '../app/alecsandri-va10';
import {createAlecsandriVa11} from '../app/alecsandri-va11';
import {createAlecsandriVa12} from '../app/alecsandri-va12';
import {createAlecsandriVa13} from '../app/alecsandri-va13';
import {createAlecsandriVa14} from '../app/alecsandri-va14';
import {createBucurestiBu01} from '../app/bucuresti-bu01';
import {createBucurestiBu02} from '../app/bucuresti-bu02';
import {createBucurestiBu03} from '../app/bucuresti-bu03';
import {createBucurestiBu04} from '../app/bucuresti-bu04';
import {createBucurestiBu05} from '../app/bucuresti-bu05';
import {createBucurestiBu06} from '../app/bucuresti-bu06';
import {createBucurestiBu07} from '../app/bucuresti-bu07';
import {createBucurestiBu08} from '../app/bucuresti-bu08';
import {createBucurestiBu09} from '../app/bucuresti-bu09';
import {createBucurestiBu10} from '../app/bucuresti-bu10';
import {createBucurestiBu11} from '../app/bucuresti-bu11';
import {createCentralInfill} from '../app/central-infill';
import {createCourtyardGates} from '../app/courtyard-gates';
import {createCentralStreetObjects} from '../app/central-street-objects';
import {createCathedralPark} from '../app/cathedral-park';
import {createOperaGrounds} from '../app/opera-grounds';

type ExportLayer={
  objects:T.Group[];
  replacements:{id:number}[];
  buildAllForNativeExport:()=>void;
};

declare global {
  // Registered by street-mesh only while this build-only program is running.
  // eslint-disable-next-line no-var
  var __CHISINAU_NATIVE_STREET_MESHES__:ExportLayer[]|undefined;
}

const output=process.argv[2];
const ownershipOutput=process.argv[3];
if(!output)throw new Error('Usage: export-native-architecture <output.carch> [ownership.json]');
globalThis.__CHISINAU_NATIVE_STREET_MESHES__=[];
const scene=new T.Scene(),ground=()=>0,loaded=()=>true,ready=()=>true;

// This mirrors the hand-authored architecture layers in world.ts. Readiness
// callbacks matter only to the interactive replacement lifecycle; all source
// geometry is deliberately compiled here.
createGovernmentDistrict(scene,ground,loaded);
createColumnaDistrict(scene,ground,loaded);
createPuskinDistrict(scene,ground,loaded);
const bodoni=createBodoniDistrict(scene,ground,loaded);
createEugenDoga(scene,ground,loaded);
createMuseumQuarter(scene,ground,loaded);
createAlexandruSector(scene,ground,loaded);
createDosofteiSector(scene,ground,loaded);
createColumnaEast(scene,ground,loaded);
createColumnaIsmailTighina(scene,ground,loaded);
createAugustQuarter(scene,ground,loaded);
createAugustEast(scene,ground,loaded);
createAugustTighina(scene,ground,loaded);
createAugustIsmail(scene,ground,loaded);
createAugustTolstoi(scene,ground,loaded);
createAugustCiuflea(scene,ground,loaded);
createVasilenco(scene,ground,loaded);
createAugustCaucaz(scene,ground,loaded);
createAugustJunction(scene,ground,loaded);
createSciusevTest(scene,ground,loaded);
createSciusevWest(scene,ground,loaded);
createSciusevParcalab(scene,ground,loaded);
createSciusevPuskin(scene,ground,loaded);
createSciusevBodoni(scene,ground,loaded);
createSciusevIorga(scene,ground,loaded);
createSciusevCebotari(scene,ground,loaded);
createSciusevLazo(scene,ground,loaded);
createSciusevStere(scene,ground,loaded);
createSciusevPrometeu(scene,ground,loaded);
createSciusev121(scene,ground,loaded);
createSciusevBend(scene,ground,loaded);
createSciusevNorth(scene,ground,loaded);
createSciusevSfatul(scene,ground,loaded);
createSciusevEminescu(scene,ground,loaded);
createSciusevAlecsandri(scene,ground,loaded);
createIonCreanga(scene,ground,loaded);
createDendrarium(scene,ground,loaded);
createCadastralBuildings(scene,ground,loaded);
createAlecsandriVa05(scene,ground,loaded);
createAlecsandriVa06(scene,ground,loaded);
createAlecsandriVa07(scene,ground,loaded);
createAlecsandriVa08(scene,ground,loaded);
createAlecsandriVa09(scene,ground,loaded);
createAlecsandriVa10(scene,ground,loaded);
createAlecsandriVa11(scene,ground,loaded);
createAlecsandriVa12(scene,ground,loaded);
createAlecsandriVa13(scene,ground,loaded);
createAlecsandriVa14(scene,ground,loaded);
createBucurestiBu01(scene,ground,loaded);
createBucurestiBu02(scene,ground,loaded);
createBucurestiBu03(scene,ground,loaded);
createBucurestiBu04(scene,ground,loaded,ready);
createBucurestiBu05(scene,ground,loaded,ready);
createBucurestiBu06(scene,ground,loaded,ready);
createBucurestiBu08(scene,ground,loaded,ready,ready);
createBucurestiBu09(scene,ground,loaded,ready,ready,ready);
createBucurestiBu10(scene,ground,loaded,ready,ready);
createBucurestiBu11(scene,ground,loaded,ready,ready,()=>true,()=>true);
createBucurestiBu07(scene,ground,loaded,ready);
createCentralInfill(scene,ground,loaded);
const courtyardGates=createCourtyardGates(scene,ground,loaded);
createCentralStreetObjects(scene,ground,loaded);
createOperaGrounds(scene,ground,loaded);
createCathedralPark(scene,ground,loaded,ready,(x,z)=>ground(x,z)+.115);
createStefanPark(scene,ground,loaded);
const boulevard=createBoulevard(scene,ground,loaded);
createBoulevardMonuments(scene,boulevard.ground,loaded);
createBoulevardFrontages(scene,boulevard.ground,loaded);
createSegmentOneFrontages(scene,boulevard.ground,loaded);
createSegmentTwoFrontages(scene,boulevard.ground,loaded);
createSegmentThreeFrontages(scene,boulevard.ground,loaded);
createSegmentFourFrontages(scene,boulevard.ground,loaded);
createSegmentFiveFrontages(scene,boulevard.ground,loaded);
createSegmentSixFrontages(scene,boulevard.ground,loaded);
createSegmentSevenFrontages(scene,boulevard.ground,loaded);
createSegmentEightFrontages(scene,boulevard.ground,loaded);
createBoulevardCompletion(scene,boulevard.ground,loaded);
void bodoni;

const layers=globalThis.__CHISINAU_NATIVE_STREET_MESHES__!;
for(const layer of layers)layer.buildAllForNativeExport();
scene.updateMatrixWorld(true);

// The BUC07–BUC11 modules contain coarse "reprezentare" layers used only as
// temporary browser fallbacks while their photo-authored replacements build.
// A native build is complete before launch, so exporting those fallbacks would
// put two buildings in the same place. Export only the authoritative layers.
const activeLayers=layers.filter(layer=>!layer.objects.some(root=>/reprezentare\s+v\d+/i.test(root.name)));
const excludedLayers=layers.filter(layer=>!activeLayers.includes(layer));
// The shared courtyard registry keeps each hinged gate outside streetMesh so
// the browser can rotate its leaves independently. The posts are registered
// streetMesh jobs, but the 178 leaf roots are not; exporting only layer.objects
// therefore preserved the posts and silently dropped every gate leaf. Select
// just those standalone roots here, excluding the already registered posts.
const registeredObjects=new Set(layers.flatMap(layer=>layer.objects));
const standaloneGateRoots=courtyardGates.objects.filter(root=>!registeredObjects.has(root));
type GroundRings=number[][][];
const ownershipSurfaces:{owner:string;rings:GroundRings}[]=[];
for(const layer of activeLayers)for(const root of layer.objects){
  const surfaces=root.userData.groundRings as GroundRings[]|undefined;
  if(!Array.isArray(surfaces))continue;
  for(const rings of surfaces){
    if(!Array.isArray(rings)||!Array.isArray(rings[0])||rings[0].length<3)continue;
    ownershipSurfaces.push({owner:root.name,rings});
  }
}
if(ownershipOutput)fs.writeFileSync(ownershipOutput,JSON.stringify({format:'Chișinău authored surface ownership 1',surfaces:ownershipSurfaces}));
type OwnershipMask={rings:number[][][];minX:number;minZ:number;maxX:number;maxZ:number};
const ownershipCell=48,buildingOwnershipMasks:OwnershipMask[]=[],buildingOwnershipGrid=new Map<string,number[]>();
const legacyCadastralRoots=new Set(activeLayers.flatMap(layer=>layer.objects).filter(root=>root.name.startsWith('FNDG · clădiri cadastrale · ')));
for(const layer of activeLayers)for(const root of layer.objects){
  if(legacyCadastralRoots.has(root))continue;
  const shells=root.userData.nativeShellRings as number[][][][]|undefined;
  for(const rawRings of shells??[]){
    const rings=rawRings.filter(ring=>Array.isArray(ring)&&ring.length>=3);if(!rings.length)continue;
    const xs=rings[0].map(p=>p[0]),zs=rings[0].map(p=>p[1]),mask={rings,minX:Math.min(...xs),minZ:Math.min(...zs),maxX:Math.max(...xs),maxZ:Math.max(...zs)},index=buildingOwnershipMasks.push(mask)-1;
    for(let x=Math.floor(mask.minX/ownershipCell);x<=Math.floor(mask.maxX/ownershipCell);x++)for(let z=Math.floor(mask.minZ/ownershipCell);z<=Math.floor(mask.maxZ/ownershipCell);z++){
      const key=`${x}/${z}`,list=buildingOwnershipGrid.get(key)??[];list.push(index);buildingOwnershipGrid.set(key,list);
    }
  }
}
function pointInRing(point:number[],ring:number[][]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1]+Number.EPSILON)+a[0];if(cross)inside=!inside;
}return inside;}
function segmentDistance(point:number[],a:number[],b:number[]){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/(dx*dx+dz*dz||1))),x=a[0]+dx*t,z=a[1]+dz*t;return Math.hypot(point[0]-x,point[1]-z);}
function pointOwnedByNewShell(point:number[]){
  const candidates=buildingOwnershipGrid.get(`${Math.floor(point[0]/ownershipCell)}/${Math.floor(point[1]/ownershipCell)}`)??[];
  for(const index of candidates){const mask=buildingOwnershipMasks[index];if(point[0]<mask.minX-.08||point[0]>mask.maxX+.08||point[1]<mask.minZ-.08||point[1]>mask.maxZ+.08)continue;
    if(pointInRing(point,mask.rings[0])&&!mask.rings.slice(1).some(ring=>pointInRing(point,ring)))return true;
    for(const ring of mask.rings)for(let i=0;i<ring.length;i++)if(segmentDistance(point,ring[i],ring[(i+1)%ring.length])<.08)return true;
  }
  return false;
}
function legacyTriangleOwned(points:number[][]){const center=[(points[0][0]+points[1][0]+points[2][0])/3,(points[0][2]+points[1][2]+points[2][2])/3];return pointOwnedByNewShell(center)||points.some(p=>pointOwnedByNewShell([p[0],p[2]]));}
const meshes:T.Mesh[]=[],legacyCadastralMeshes=new Set<T.Mesh>();
const exportRoots=[...activeLayers.flatMap(layer=>layer.objects),...standaloneGateRoots];
for(const root of exportRoots)root.traverse(object=>{
  if(object instanceof T.Mesh&&object.geometry?.getAttribute('position')){meshes.push(object);if(legacyCadastralRoots.has(root))legacyCadastralMeshes.add(object);}
});
const sourceVertexCount=meshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count),0);
const gateMeshes:T.Mesh[]=[];for(const root of standaloneGateRoots)root.traverse(object=>{if(object instanceof T.Mesh&&object.geometry?.getAttribute('position'))gateMeshes.push(object);});
const gateVertices=gateMeshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count),0);
const solidShellVertices=activeLayers.reduce((sum,layer)=>sum+layer.objects.reduce((layerSum,root)=>layerSum+(Number(root.userData.nativeShellVertices)||0),0),0);
const layerVertices=activeLayers.map(layer=>({
  name:layer.objects[0]?.name.split(' · ').slice(0,-1).join(' · ')||'layer',
  jobs:layer.objects.length,
  vertices:layer.objects.reduce((sum,root)=>{root.traverse(object=>{if(object instanceof T.Mesh)sum+=object.geometry.index?.count??object.geometry.getAttribute('position')?.count??0;});return sum;},0),
})).sort((a,b)=>b.vertices-a.vertices);
const replacementIds=[...new Set(activeLayers.flatMap(layer=>layer.replacements.map(item=>item.id)).filter(id=>id>0))].sort((a,b)=>a-b);
const header=Buffer.alloc(32+replacementIds.length*4);
header.writeUInt32LE(0x48435241,0); // ARCH
header.writeUInt32LE(1,4);
header.writeUInt32LE(0,8);
header.writeUInt32LE(replacementIds.length,12);
header.writeUInt32LE(meshes.length,16);
header.writeUInt32LE(activeLayers.length,20);
replacementIds.forEach((id,index)=>header.writeUInt32LE(id,32+index*4));
const descriptor=fs.openSync(output,'w');
fs.writeSync(descriptor,header);

const normalMatrix=new T.Matrix3();
function packedMaterial(material:T.Material&T.MeshStandardMaterial,parkStyle?:number){
  const name=(material.name??'').toLocaleLowerCase('ro');
  let kind=0;
  if(Number.isFinite(parkStyle)){
    if(parkStyle!<.5)kind=3;
    else if(parkStyle!<3.5)kind=4;
    else if(parkStyle!<5.5)kind=5;
    else if(parkStyle!<7)kind=7;
  }
  else if(/geam|glass|vitrin/.test(name))kind=1;
  else if(/frunz|coroan|copac|arbust|gard viu|hedge|foliage|leaf|tree/.test(name))kind=2;
  else if(/asfalt|asphalt|carosabil|road/.test(name))kind=3;
  else if(/pavaj|paver|trotuar|pavement|slab/.test(name))kind=4;
  else if(/iarb|grass|lawn|peluz/.test(name))kind=5;
  else if(/metal|bronz|bronze|chrome|oțel|otel/.test(name))kind=6;
  else if(/apă|apa|water/.test(name))kind=7;
  const roughness=Math.max(0,Math.min(7,Math.round((material.roughness??.88)*7)));
  const metalness=Math.max(0,Math.min(7,Math.round((material.metalness??0)*7)));
  return kind*64+roughness*8+metalness;
}
let written=0;
let writtenMeshes=0,suppressedLegacyCadastralTriangles=0;
for(const mesh of meshes){
  const geometry=mesh.geometry;
  if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
  const position=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),colors=geometry.getAttribute('color'),parkStyles=geometry.getAttribute('parkStyle'),index=geometry.index;
  const material=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material) as T.Material&T.MeshStandardMaterial;
  const base=material.color??new T.Color(1,1,1),count=index?.count??position.count,legacy=legacyCadastralMeshes.has(mesh);
  normalMatrix.getNormalMatrix(mesh.matrixWorld);
  const triangle=Array.from({length:3},()=>({source:0,point:new T.Vector3(),normal:new T.Vector3(),materialCode:0}));
  const buffer=Buffer.allocUnsafe(65535*40);let bufferOffset=0,meshWritten=0;
  for(let start=0;start<count;start+=3){
    for(let j=0;j<3;j++){const source=index?index.getX(start+j):start+j,value=triangle[j];value.source=source;value.point.fromBufferAttribute(position,source).applyMatrix4(mesh.matrixWorld);value.normal.fromBufferAttribute(normals,source).applyMatrix3(normalMatrix).normalize();value.materialCode=packedMaterial(material,parkStyles?.getX(source));}
    if(legacy&&legacyTriangleOwned(triangle.map(v=>[v.point.x,v.point.y,v.point.z]))){suppressedLegacyCadastralTriangles++;continue;}
    if(bufferOffset+120>buffer.length){fs.writeSync(descriptor,buffer,0,bufferOffset);bufferOffset=0;}
    for(const value of triangle){const {source}=value,offset=bufferOffset;buffer.writeFloatLE(value.point.x,offset);buffer.writeFloatLE(value.point.y,offset+4);buffer.writeFloatLE(value.point.z,offset+8);buffer.writeFloatLE(value.normal.x,offset+12);buffer.writeFloatLE(value.normal.y,offset+16);buffer.writeFloatLE(value.normal.z,offset+20);buffer.writeFloatLE((colors?colors.getX(source):1)*base.r,offset+24);buffer.writeFloatLE((colors?colors.getY(source):1)*base.g,offset+28);buffer.writeFloatLE((colors?colors.getZ(source):1)*base.b,offset+32);buffer.writeFloatLE(value.materialCode,offset+36);bufferOffset+=40;}
    written+=3;meshWritten+=3;
  }
  if(bufferOffset)fs.writeSync(descriptor,buffer,0,bufferOffset);if(meshWritten)writtenMeshes++;
}
const countPatch=Buffer.alloc(8);countPatch.writeUInt32LE(written,0);countPatch.writeUInt32LE(writtenMeshes,4);fs.writeSync(descriptor,countPatch,0,4,8);fs.writeSync(descriptor,countPatch,4,4,16);
fs.closeSync(descriptor);
if(written>sourceVertexCount)throw new Error(`Architecture vertex count overflow: ${written} > ${sourceVertexCount}`);
console.log(JSON.stringify({format:'Chișinău authored architecture 1',layers:activeLayers.length,excludedFallbackLayers:excludedLayers.map(layer=>layer.objects[0]?.name??'fallback'),restoredFamilies:['Guvern','Columna Pușkin–Bodoni','Parcul Catedralei','terenul Operei','parcări de biciclete','porțile de curte'],meshes:writtenMeshes,sourceMeshes:meshes.length,vertices:written,sourceVertices:sourceVertexCount,solidShellVertices,replacementIds:replacementIds.length,ownershipSurfaces:ownershipSurfaces.length,buildingOwnershipMasks:buildingOwnershipMasks.length,suppressedLegacyCadastralTriangles,gates:{count:standaloneGateRoots.length,meshes:gateMeshes.length,vertices:gateVertices},bytes:fs.statSync(output).size,largestLayers:[...layerVertices,{name:'Porți de curte · canaturi',jobs:standaloneGateRoots.length,vertices:gateVertices}].sort((a,b)=>b.vertices-a.vertices).slice(0,24)}));
