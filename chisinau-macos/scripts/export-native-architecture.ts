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
const meshes:T.Mesh[]=[];
const exportRoots=[...activeLayers.flatMap(layer=>layer.objects),...standaloneGateRoots];
for(const root of exportRoots)root.traverse(object=>{
  if(object instanceof T.Mesh&&object.geometry?.getAttribute('position'))meshes.push(object);
});
const vertexCount=meshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count),0);
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
header.writeUInt32LE(vertexCount,8);
header.writeUInt32LE(replacementIds.length,12);
header.writeUInt32LE(meshes.length,16);
header.writeUInt32LE(activeLayers.length,20);
replacementIds.forEach((id,index)=>header.writeUInt32LE(id,32+index*4));
const descriptor=fs.openSync(output,'w');
fs.writeSync(descriptor,header);

const point=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3();
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
for(const mesh of meshes){
  const geometry=mesh.geometry;
  if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
  const position=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),colors=geometry.getAttribute('color'),parkStyles=geometry.getAttribute('parkStyle'),index=geometry.index;
  const material=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material) as T.Material&T.MeshStandardMaterial;
  const base=material.color??new T.Color(1,1,1),count=index?.count??position.count;
  normalMatrix.getNormalMatrix(mesh.matrixWorld);
  for(let start=0;start<count;start+=65536){
    const length=Math.min(65536,count-start),buffer=Buffer.allocUnsafe(length*40);
    for(let j=0;j<length;j++){
      const source=index?index.getX(start+j):start+j,offset=j*40;
      point.fromBufferAttribute(position,source).applyMatrix4(mesh.matrixWorld);
      normal.fromBufferAttribute(normals,source).applyMatrix3(normalMatrix).normalize();
      const materialCode=packedMaterial(material,parkStyles?.getX(source));
      buffer.writeFloatLE(point.x,offset);buffer.writeFloatLE(point.y,offset+4);buffer.writeFloatLE(point.z,offset+8);
      buffer.writeFloatLE(normal.x,offset+12);buffer.writeFloatLE(normal.y,offset+16);buffer.writeFloatLE(normal.z,offset+20);
      buffer.writeFloatLE((colors?colors.getX(source):1)*base.r,offset+24);
      buffer.writeFloatLE((colors?colors.getY(source):1)*base.g,offset+28);
      buffer.writeFloatLE((colors?colors.getZ(source):1)*base.b,offset+32);
      buffer.writeFloatLE(materialCode,offset+36);
    }
    fs.writeSync(descriptor,buffer);written+=length;
  }
}
fs.closeSync(descriptor);
if(written!==vertexCount)throw new Error(`Architecture vertex count mismatch: ${written} != ${vertexCount}`);
console.log(JSON.stringify({format:'Chișinău authored architecture 1',layers:activeLayers.length,excludedFallbackLayers:excludedLayers.map(layer=>layer.objects[0]?.name??'fallback'),restoredFamilies:['Guvern','Columna Pușkin–Bodoni','Parcul Catedralei','terenul Operei','parcări de biciclete','porțile de curte'],meshes:meshes.length,vertices:vertexCount,solidShellVertices,replacementIds:replacementIds.length,ownershipSurfaces:ownershipSurfaces.length,gates:{count:standaloneGateRoots.length,meshes:gateMeshes.length,vertices:gateVertices},bytes:fs.statSync(output).size,largestLayers:[...layerVertices,{name:'Porți de curte · canaturi',jobs:standaloneGateRoots.length,vertices:gateVertices}].sort((a,b)=>b.vertices-a.vertices).slice(0,24)}));
