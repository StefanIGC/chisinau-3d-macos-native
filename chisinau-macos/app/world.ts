import {findCarSpawn} from './car-spawn';
import * as T from 'three';
import {SUN_OFFSET} from './daylight';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {cloneAnimatedRig} from './animated-rig';
import {modelAssetUrl} from './model-assets';
import { createPrius, createCarAudio, type VehicleHud, type VehicleAction } from './prius';
import {createHelicopter,createHelicopterAudio,EMPTY_HELICOPTER,type HelicopterHud,type HelicopterAction} from './helicopter';
import {HELICOPTER,IDLE_FLIGHT,type FlightState} from './helicopter-physics';
import {GAME_SPAWN} from './game-spawn';
import {helicopterSpot} from './helicopter-spawn';
import {makeWalkerState,advanceWalker,ejectWalker,jumpWalker} from './walker-physics';
import { CITY_DATA, LANDMARKS, createMapPhysics, featureContains, type XY } from './city-layout';
import {createImpactEffects,segmentSphere,type ShotHit} from './impacts';
import {createCarDamage} from './car-damage';
import {createCrowdRenderer} from './crowd-renderer';
import {createTraffic,type TrafficCar} from './traffic';
import type {CarState} from './prius-physics';
import {createCentralLandmarks} from './central-landmarks';
import {createGovernmentDistrict} from './government-district';
import {createColumnaDistrict} from './columna-district';
import {createCathedralPark} from './cathedral-park';
import {createStefanPark} from './stefan-park';
import {createBoulevard} from './boulevard';
import {createBoulevardMonuments} from './boulevard-monuments';
import {createBoulevardFrontages} from './boulevard-frontages';
import {createSegmentOneFrontages} from './segment-one-frontages';
import {createSegmentTwoFrontages} from './segment-two-frontages';
import {createSegmentThreeFrontages} from './segment-three-frontages';
import {createSegmentFourFrontages} from './segment-four-frontages';
import {createSegmentFiveFrontages} from './segment-five-frontages';
import {createSegmentSixFrontages} from './segment-six-frontages';
import {createSegmentSevenFrontages} from './segment-seven-frontages';
import {createSegmentEightFrontages} from './segment-eight-frontages';
import {createBoulevardCompletion} from './boulevard-completion';
import {createPuskinDistrict} from './puskin-district';
import {createBodoniDistrict} from './bodoni-district';
import {createEugenDoga} from './eugen-doga';
import {createMuseumQuarter} from './museum-quarter';
import {createAlexandruSector} from './alexandru-sector';
import {createDosofteiSector} from './dosoftei-sector';
import {createColumnaEast} from './columna-east';
import {createColumnaIsmailTighina} from './columna-ismail-tighina';
import {createAugustQuarter} from './august-quarter';
import {createAugustEast} from './august-east';
import {createAugustTighina} from './august-tighina';
import {createAugustIsmail} from './august-ismail';
import {createAugustTolstoi} from './august-tolstoi';
import {createAugustCiuflea} from './august-ciuflea';
import {createVasilenco} from './vasilenco';
import {createAugustCaucaz} from './august-caucaz';
import {createAugustJunction} from './august-junction';
import {createSciusevTest} from './sciusev-test';
import {createSciusevWest} from './sciusev-west';
import {createSciusevParcalab} from './sciusev-parcalab';
import {createSciusevPuskin} from './sciusev-puskin';
import {createSciusevBodoni} from './sciusev-bodoni';
import {createSciusevIorga} from './sciusev-iorga';
import {createSciusevCebotari} from './sciusev-cebotari';
import {createSciusevLazo} from './sciusev-lazo';
import {createSciusevStere} from './sciusev-stere';
import {createSciusevPrometeu} from './sciusev-prometeu';
import {createSciusev121} from './sciusev-121';
import {createSciusevBend} from './sciusev-bend';
import {createSciusevNorth} from './sciusev-north';
import {createIonCreanga} from './ion-creanga';
import {createDendrarium} from './dendrarium';
import {createCadastralBuildings} from './cadastral-buildings';
import {createSciusevSfatul} from './sciusev-sfatul';
import {createSciusevEminescu} from './sciusev-eminescu';
import {createSciusevAlecsandri} from './sciusev-alecsandri';
import {createAlecsandriVa05} from './alecsandri-va05';
import {createAlecsandriVa06} from './alecsandri-va06';
import {createBucurestiBu01} from './bucuresti-bu01';
import {createBucurestiBu02} from './bucuresti-bu02';
import {createBucurestiBu03} from './bucuresti-bu03';
import {createBucurestiBu04} from './bucuresti-bu04';
import {createBucurestiBu05} from './bucuresti-bu05';
import {createBucurestiBu06} from './bucuresti-bu06';
import {createBucurestiBu07} from './bucuresti-bu07';
import bucurestiBu07Data from '../data/bucuresti-bu07.json';
import {createBucurestiBu08} from './bucuresti-bu08';
import {createBucurestiBu09} from './bucuresti-bu09';
import {createBucurestiBu10} from './bucuresti-bu10';
import bucurestiBu10Data from '../data/bucuresti-bu10.json';
import bucurestiBu10Buildings from '../data/bucuresti-bu10-buildings.json';
import bucurestiBu10RetainedPlans from '../data/bucuresti-bu10-retained-footprints.json';
import {createBucurestiBu11} from './bucuresti-bu11';
import bucurestiBu11Data from '../data/bucuresti-bu11.json';
import bucurestiBu11Buildings from '../data/bucuresti-bu11-buildings.json';
import cadastralBuildingData from '../data/cadastral-buildings.json';
import bucurestiBu08Data from '../data/bucuresti-bu08.json';
import {createAlecsandriVa07} from './alecsandri-va07';
import {createAlecsandriVa08} from './alecsandri-va08';
import {createAlecsandriVa09} from './alecsandri-va09';
import {createAlecsandriVa10} from './alecsandri-va10';
import {createAlecsandriVa11} from './alecsandri-va11';
import {createAlecsandriVa12} from './alecsandri-va12';
import {createAlecsandriVa13} from './alecsandri-va13';
import {createAlecsandriVa14} from './alecsandri-va14';
import {createCentralStreetObjects} from './central-street-objects';
import {createCentralInfill} from './central-infill';
import {createCourtyardGates,type GateHud} from './courtyard-gates';
import {beginSceneBuild,setSceneBuildFocus} from './scene-build-budget';
import {createOperaHouse} from './opera-house';
import {createMapMdModels} from './map-md-models';
import {createVisibility} from './visibility';
import {createStreetsGameWorld} from './streets-game-world';
import {createGameMinimap} from './game-minimap';
import {createMapTravel,type MapPoint} from './map-travel';
import {localToGeo,localBearing,ORIGIN} from './streets-coordinates';
import {SpatialIndex} from './spatial-index';
import { createWeapon, playGunSound, TABLE, type WeaponHud, type WeaponAction, type GunSound } from './weapon';

type Callbacks = { gate?:(value:GateHud)=>void; preparing?:(value:boolean)=>void; progress?:(v:string)=>void; ready:()=>void; location:(v:string)=>void; paused:(v:boolean)=>void; camera?:(v:boolean)=>void; started?:()=>void; error:(v:string)=>void; vehicle?:(v:VehicleHud)=>void; helicopter?:(v:HelicopterHud)=>void; sound?:(v:boolean)=>void; weapon?:(v:WeaponHud)=>void };
type Place = 'arc'|'catedrala'|'stefan'|'sciusev'|'sciusevWest'|'sciusevAlecsandri'|'sciusevEminescu'|'sciusevParcalab'|'sciusevPuskin'|'sciusevBodoni'|'sciusevIorga'|'sciusevCebotari'|'sciusevSfatul'|'sciusevLazo'|'sciusevStere'|'sciusevPrometeu'|'sciusev121'|'sciusevBend'|'sciusevNorth'|'ionCreanga'|'ionCreangaDendrarium'|'dendrarium'|'dendrariumLake'|'alecsandriVa05'|'alecsandriVa06'|'alecsandriVa07'|'alecsandriVa08'|'alecsandriVa09'|'alecsandriVa10'|'alecsandriVa11'|'alecsandriVa12'|'alecsandriVa13'|'alecsandriVa14'|'bucurestiBu01'|'bucurestiBu02'|'bucurestiBu03'|'bucurestiBu04'|'bucurestiBu05'|'bucurestiBu06'|'bucurestiBu07'|'bucurestiBu08'|'bucurestiBu09'|'bucurestiBu10'|'bucurestiBu11';
type Block = { x:number; z:number; w:number; d:number; h?:number };
const PI=Math.PI;

// The main boulevard is the local X axis. The cathedral axis points toward -Z.
export function createCity(host:HTMLDivElement, map:HTMLCanvasElement, callbacks:Callbacks) {
  const mobile=matchMedia('(pointer:coarse)').matches;
  const scene=new T.Scene();
  scene.background=null;
  scene.fog=new T.Fog('#c5ced0',mobile?130:170,mobile?310:400);
  const camera=new T.PerspectiveCamera(58,host.clientWidth/host.clientHeight,.12,mobile?310:400);
  const visibility=createVisibility(camera,mobile);
  let renderer:T.WebGLRenderer;
  // The city contains thousands of small meshes. Native MSAA multiplies their
  // fragment cost and becomes especially visible as helicopter judder on
  // integrated Mac GPUs; the reduced flight pixel ratio already softens edges.
  try { renderer=new T.WebGLRenderer({antialias:false,alpha:true,powerPreference:'high-performance'}); }
  catch {callbacks.error('La această plimbare ai nevoie de WebGL. Activează accelerarea grafică în browser și reîncarcă pagina.');callbacks.helicopter?.({...EMPTY_HELICOPTER,failed:true});return {gate(){},start(){},teleport(){},getMapPosition(){return{...ORIGIN,bearing:0}},setMapOpen(_open:boolean){},setMenuOpen(_open:boolean){},teleportTo(_point:MapPoint,_signal?:AbortSignal){return Promise.reject(new Error('Jocul 3D nu este disponibil.'))},helicopter(_action:HelicopterAction){},camera(){return false},sound(){return false},streets(_visible:boolean){return false},reset(){},pause(){},weapon(_a:WeaponAction,_value?:boolean){},look(_dx:number,_dy:number){},vehicle(_a:VehicleAction){},pedal(_p:string,_v:boolean){},dispose(){}};}
  renderer.setSize(host.clientWidth,host.clientHeight);
  const resolutionLimit=()=>Math.min(devicePixelRatio,mobile?1:1.2,Math.sqrt(1450000/(host.clientWidth*host.clientHeight)));
  renderer.setPixelRatio(resolutionLimit());
  // GTA-style ambient/directional lighting is deliberately used instead of a
  // second full city render for dynamic shadow maps. Small moving actors keep
  // their readable material shading without flight-time shadow-map stalls.
  renderer.shadowMap.enabled=false;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.0;
  renderer.outputColorSpace=T.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const canvas=renderer.domElement;
  const telemetry=document.createElement('output');telemetry.id='game-performance';telemetry.hidden=true;host.appendChild(telemetry);
  const flightTest=new URLSearchParams(location.search).get('flight-test')==='1';
  canvas.className="game-actors";canvas.style.opacity="0";
  renderer.setClearColor(0x000000,0);
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Lume 3D. WASD pentru mers, mouse pentru privire, Shift pentru alergare, V pentru cameră.');

  let seed=43892;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const rnd=(a:number,b:number)=>a+random()*(b-a);
  const colliders:Block[]=[];
  const textures:T.Texture[]=[];
  const materialList:T.Material[]=[];
  const materialCache=new Map<string,T.MeshStandardMaterial>();
  const makeMat=(color:T.ColorRepresentation,extra:T.MeshStandardMaterialParameters={})=>{
    const key=JSON.stringify([color,extra]);const cached=materialCache.get(key);if(cached)return cached;const m=new T.MeshStandardMaterial({color,roughness:.82,...extra});materialList.push(m);materialCache.set(key,m);return m;
  };
  const mat={skin:makeMat('#b78f70'),darkStone:makeMat('#c9c2af'),black:makeMat('#283330',{metalness:.55})};
  function mesh(geo:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=scene,shadow=true){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
  function box(w:number,h:number,d:number,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=scene,shadow=true){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent,shadow);}
  function cyl(top:number,bottom:number,h:number,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=scene,seg=16){return mesh(new T.CylinderGeometry(top,bottom,h,seg),m,x,y,z,parent);}
  function sphere(rx:number,ry:number,rz:number,m:T.Material,x:number,y:number,z:number,parent:T.Object3D=scene){const o=mesh(new T.SphereGeometry(1,Math.max(rx,ry,rz)<.2?8:16,Math.max(rx,ry,rz)<.2?6:12),m,x,y,z,parent);o.scale.set(rx,ry,rz);return o;}
  function beam(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,parent:T.Object3D=scene,r2=r){const dir=b.clone().sub(a);const o=mesh(new T.CylinderGeometry(r2,r,dir.length(),9),m,0,0,0,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;}
  // Warm, directional late-afternoon light with a clear, atmospheric sky.
  const hemi=new T.HemisphereLight('#dceeff','#807765',1.65);scene.add(hemi);
  const sun=new T.DirectionalLight('#fff0d5',2.9);sun.position.set(SUN_OFFSET.x,SUN_OFFSET.y,SUN_OFFSET.z);sun.castShadow=false;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;sun.shadow.camera.far=380;sun.shadow.camera.near=1;sun.shadow.bias=-.00025;sun.shadow.normalBias=.055;scene.add(sun,sun.target);
  const positionSun=(x:number,y:number,z:number)=>{sun.target.position.set(x,y,z);sun.position.set(x+SUN_OFFSET.x,y+SUN_OFFSET.y,z+SUN_OFFSET.z);};
  const streets=createStreetsGameWorld(host,scene,message=>{callbacks.error(message);onBlur();document.exitPointerLock?.();},callbacks.progress);
  const groundLevel=(x:number,z:number)=>streets.ground(x,z);
  const landmarks=createCentralLandmarks(scene,groundLevel,streets.terrainReady);
  const government=createGovernmentDistrict(scene,groundLevel,streets.terrainReady);
  const columna=createColumnaDistrict(scene,groundLevel,streets.terrainReady);
  const puskin=createPuskinDistrict(scene,groundLevel,streets.terrainReady);
  const bodoni=createBodoniDistrict(scene,groundLevel,streets.terrainReady);
  const doga=createEugenDoga(scene,groundLevel,streets.terrainReady);
  const museumQuarter=createMuseumQuarter(scene,groundLevel,streets.terrainReady);
  const alexandruSector=createAlexandruSector(scene,groundLevel,streets.terrainReady);
  const dosofteiSector=createDosofteiSector(scene,groundLevel,streets.terrainReady);
  const columnaEast=createColumnaEast(scene,groundLevel,streets.terrainReady);
  const columnaIsmailTighina=createColumnaIsmailTighina(scene,groundLevel,streets.terrainReady);
  const augustQuarter=createAugustQuarter(scene,groundLevel,streets.terrainReady);
  const augustEast=createAugustEast(scene,groundLevel,streets.terrainReady);
  const augustTighina=createAugustTighina(scene,groundLevel,streets.terrainReady);
  const augustIsmail=createAugustIsmail(scene,groundLevel,streets.terrainReady);
  const augustTolstoi=createAugustTolstoi(scene,groundLevel,streets.terrainReady);
  const augustCiuflea=createAugustCiuflea(scene,groundLevel,streets.terrainReady);
  const vasilenco=createVasilenco(scene,groundLevel,streets.terrainReady);
  const augustCaucaz=createAugustCaucaz(scene,groundLevel,streets.terrainReady);
  const augustJunction=createAugustJunction(scene,groundLevel,streets.terrainReady);
  const sciusevTest=createSciusevTest(scene,groundLevel,streets.terrainReady);
  const sciusevWest=createSciusevWest(scene,groundLevel,streets.terrainReady);
  const sciusevParcalab=createSciusevParcalab(scene,groundLevel,streets.terrainReady);
  const sciusevPuskin=createSciusevPuskin(scene,groundLevel,streets.terrainReady);
  const sciusevBodoni=createSciusevBodoni(scene,groundLevel,streets.terrainReady);
  const sciusevIorga=createSciusevIorga(scene,groundLevel,streets.terrainReady);
  const sciusevCebotari=createSciusevCebotari(scene,groundLevel,streets.terrainReady);
  const sciusevStere=createSciusevStere(scene,groundLevel,streets.terrainReady);
  const sciusevPrometeu=createSciusevPrometeu(scene,groundLevel,streets.terrainReady);
  const sciusev121=createSciusev121(scene,groundLevel,streets.terrainReady);
  const sciusevBend=createSciusevBend(scene,groundLevel,streets.terrainReady);
  const sciusevNorth=createSciusevNorth(scene,groundLevel,streets.terrainReady);
  const cadastralBuildings=createCadastralBuildings(scene,groundLevel,streets.terrainReady);
  const ionCreanga=createIonCreanga(scene,groundLevel,streets.terrainReady);
  const dendrarium=createDendrarium(scene,groundLevel,streets.terrainReady);
  const sciusevLazo=createSciusevLazo(scene,groundLevel,streets.terrainReady);
  const sciusevSfatul=createSciusevSfatul(scene,groundLevel,streets.terrainReady);
  const sciusevEminescu=createSciusevEminescu(scene,groundLevel,streets.terrainReady);
  const sciusevAlecsandri=createSciusevAlecsandri(scene,groundLevel,streets.terrainReady);
  const alecsandriVa05=createAlecsandriVa05(scene,groundLevel,streets.terrainReady);
  const alecsandriVa06=createAlecsandriVa06(scene,groundLevel,streets.terrainReady);
  const bucurestiBu01=createBucurestiBu01(scene,groundLevel,streets.terrainReady);
  const bucurestiBu02=createBucurestiBu02(scene,groundLevel,streets.terrainReady);
  const bucurestiBu03=createBucurestiBu03(scene,groundLevel,streets.terrainReady);
  const bucurestiBu04=createBucurestiBu04(scene,groundLevel,streets.terrainReady,(x,z,r)=>bucurestiBu03.readyNear(x,z,r));
  // The hotel shares a native shell with the retained BUC04 body. Its
  // replacement stays resident even when the old sector's ground cells evict.
  const bucurestiHotelNeighbor=bucurestiBu04.replacements.find(r=>r.id===254108790);
  const bucurestiBu05=createBucurestiBu05(scene,groundLevel,streets.terrainReady,()=>bucurestiHotelNeighbor?.ready===true);
  // Three Nr1 bodies share a native relation with an existing rear annex.
  // Keep that shell until the annex's persistent cadastral collider is ready.
  const bucurestiNr1RearOwner=cadastralBuildings.collisionObjects.find(o=>o.name==='FNDG · clădiri cadastrale · 15/6 · coliziune');
  const bucurestiBu06=createBucurestiBu06(scene,groundLevel,streets.terrainReady,()=>bucurestiNr1RearOwner?.userData.grounded===true);
  augustCiuflea.setBodyOverrides(bucurestiBu06.bodyOverrides);
  // Native corner volumes also cover retained cadastral context. Wait for
  // every permanent owner before replacing those complete native identities.
  const bucurestiBu08PriorOwners=[...new Set(bucurestiBu08Data.nativeReplacementDependencies.flatMap(d=>d.coarseKeys))]
    .map(key=>cadastralBuildings.collisionObjects.find(o=>o.name===`FNDG · clădiri cadastrale · ${key} · coliziune`));
  const bucurestiBu08=createBucurestiBu08(scene,groundLevel,streets.terrainReady,()=>bucurestiBu08PriorOwners.every(o=>o?.userData.grounded===true),(x,z,r)=>bucurestiBu07.readyNear(x,z,r));
  // BUC09 retires no native identity shared with a retained cadastral body.
  // Its separate markings on BUC08 wait only for that existing ground.
  const bucurestiBu09FacadeOwner=cadastralBuildings.collisionObjects.find(o=>o.name==='FNDG · clădiri cadastrale · 2/3 · coliziune');
  const bucurestiBu09=createBucurestiBu09(scene,groundLevel,streets.terrainReady,()=>true,(x,z,r)=>bucurestiBu08.readyNear(x,z,r),()=>bucurestiBu09FacadeOwner?.userData.grounded===true);
  // A native shell can span several cadastral bodies. Its replacement waits
  // for the exact retained collision owners, including bodies outside BU10.
  const bucurestiBu10Dependencies=bucurestiBu10Data.nativeReplacementDependencies as {coarseKeys:string[]}[];
  const bucurestiBu10CoarseKeys=new Set(bucurestiBu10Dependencies.flatMap(d=>d.coarseKeys));
  const bucurestiBu10PriorOwners=[...bucurestiBu10CoarseKeys]
    .map(key=>cadastralBuildings.collisionObjects.find(o=>o.name===`FNDG · clădiri cadastrale · ${key} · coliziune`));
  // The four Bodoni owners are realigned to official footprints in place.
  // In particular, the old 29 shell overlaps part of official body 10682;
  // that part can return only after the aligned persistent owner is ready.
  const bucurestiBu10BodoniOwners=bucurestiBu10Data.retainedBuildingDependencies
    .map(({nativeId})=>bodoni.replacements.find(r=>r.id===nativeId));
  const bucurestiBu10=createBucurestiBu10(scene,groundLevel,streets.terrainReady,()=>bucurestiBu10PriorOwners.every(o=>o?.userData.grounded===true)&&bucurestiBu10BodoniOwners.every(r=>r?.ready===true),(x,z,r)=>bucurestiBu09.readyNear(x,z,r)&&bodoni.readyNear(x,z,r));
  // BUC11 retires only complete identities owned within its new group.
  // Its markings at the Bodoni seam wait for the existing authored floor.
  const bucurestiBu11GroundOwner=(requirement:{dataset:string;cellX:number;cellZ:number})=>{
    const name=requirement.dataset==='bucuresti-bu10.json'?`București BUC10 · spațiu public · sol ${requirement.cellX}/${requirement.cellZ}`:null;
    return {visual:name?bucurestiBu10.objects.find(o=>o.name===name):undefined,collision:name?bucurestiBu10.collisionObjects.find(o=>o.name===name+' · coliziune'):undefined};
  };
  const bucurestiBu11RetainedGround=new Map(bucurestiBu11Data.clearedNativeBuildings.map(item=>[item.id,item.retainedGroundRequirements.map(bucurestiBu11GroundOwner)]));
  // The Bodoni shelter and empty tree pit stand wholly on the retained BUC10
  // platform. A proximity test against new BUC11 cells cannot prove that floor.
  const bucurestiBu11RetainedFurnitureGround=new Map([...bucurestiBu11Data.streetFurniture.busShelters,...bucurestiBu11Data.retainedGroundTreePits]
    .map(item=>[item.name,item.retainedGroundRequirements.map(bucurestiBu11GroundOwner)]));
  const bucurestiBu11=createBucurestiBu11(scene,groundLevel,streets.terrainReady,()=>true,(x,z,r)=>bucurestiBu10.readyNear(x,z,r)&&bodoni.readyNear(x,z,r),id=>{
    const owners=bucurestiBu11RetainedGround.get(id);
    return !!owners?.length&&owners.every(({visual,collision})=>visual?.visible===true&&visual.userData.groundRings?.length>0&&collision?.userData.grounded===true);
  },name=>{
    const owners=bucurestiBu11RetainedFurnitureGround.get(name);
    return !!owners?.length&&owners.every(({visual,collision})=>visual?.visible===true&&visual.userData.groundRings?.length>0&&collision?.userData.grounded===true);
  });
  const bucurestiBu07PriorOwners=[...new Set(bucurestiBu07Data.nativeReplacementDependencies.flatMap(d=>d.coarseKeys))]
    .map(key=>cadastralBuildings.collisionObjects.find(o=>o.name===`FNDG · clădiri cadastrale · ${key} · coliziune`));
  // BUC08 now owns 9230, 8874 and 9837, which share native identities with
  // BUC07. Their complete old volumes must be ready before those identities
  // are hidden. BUC08 does not wait for BUC07, so this has no readiness cycle.
  const bucurestiBu07=createBucurestiBu07(scene,groundLevel,streets.terrainReady,()=>bucurestiBu07PriorOwners.every(o=>o?.userData.grounded===true)&&bucurestiBu08.previousRepresentationReady);
  const alecsandriVa07=createAlecsandriVa07(scene,groundLevel,streets.terrainReady);
  const alecsandriVa08=createAlecsandriVa08(scene,groundLevel,streets.terrainReady);
  const alecsandriVa09=createAlecsandriVa09(scene,groundLevel,streets.terrainReady);
  const alecsandriVa10=createAlecsandriVa10(scene,groundLevel,streets.terrainReady);
  const alecsandriVa11=createAlecsandriVa11(scene,groundLevel,streets.terrainReady);
  const alecsandriVa12=createAlecsandriVa12(scene,groundLevel,streets.terrainReady);
  const alecsandriVa13=createAlecsandriVa13(scene,groundLevel,streets.terrainReady);
  const alecsandriVa14=createAlecsandriVa14(scene,groundLevel,streets.terrainReady);
  streets.setGroundExcavations([...augustJunction.excavations,...sciusev121.excavations,...ionCreanga.excavations,...bucurestiBu09.excavations,...bucurestiBu10.excavations,...bucurestiBu11.excavations]);
  const centralStreetObjects=createCentralStreetObjects(scene,groundLevel,streets.terrainReady);
  const centralInfill=createCentralInfill(scene,groundLevel,streets.terrainReady);
  const courtyardGates=createCourtyardGates(scene,groundLevel,streets.terrainReady);
  const opera=createOperaHouse(scene,groundLevel,streets.terrainReady);
  const mapModels=createMapMdModels(scene,groundLevel,streets.terrainReady,mobile);
  const park=createCathedralPark(scene,groundLevel,streets.terrainReady,mapModels.parkReady,mapModels.parkLevel);
  const stefan=createStefanPark(scene,groundLevel,streets.terrainReady);
  const boulevard=createBoulevard(scene,groundLevel,streets.terrainReady);
  const boulevardMonuments=createBoulevardMonuments(scene,boulevard.ground,streets.terrainReady);
  const boulevardFrontages=createBoulevardFrontages(scene,boulevard.ground,streets.terrainReady);
  const segmentOne=createSegmentOneFrontages(scene,boulevard.ground,streets.terrainReady);
  const segmentTwo=createSegmentTwoFrontages(scene,boulevard.ground,streets.terrainReady);
  const segmentThree=createSegmentThreeFrontages(scene,boulevard.ground,streets.terrainReady);
  const segmentFour=createSegmentFourFrontages(scene,boulevard.ground,streets.terrainReady);
  const segmentFive=createSegmentFiveFrontages(scene,boulevard.ground,streets.terrainReady);
  const segmentSix=createSegmentSixFrontages(scene,boulevard.ground,streets.terrainReady);
  const segmentSeven=createSegmentSevenFrontages(scene,boulevard.ground,streets.terrainReady);
  const segmentEight=createSegmentEightFrontages(scene,boulevard.ground,streets.terrainReady);
  const boulevardCompletion=createBoulevardCompletion(scene,boulevard.ground,streets.terrainReady);
  let readySent=false,readyCompiling=false;
  const detailLayers=[columna,park,puskin,bodoni,stefan,boulevard,boulevardMonuments,boulevardFrontages,segmentOne,segmentTwo,segmentThree,segmentFour,segmentFive,segmentSix,segmentSeven,segmentEight,boulevardCompletion,doga,museumQuarter,alexandruSector,dosofteiSector,columnaEast,columnaIsmailTighina,augustQuarter,augustEast,augustTighina,augustIsmail,augustTolstoi,augustCiuflea,vasilenco,augustCaucaz,augustJunction,sciusevTest,sciusevWest,sciusevAlecsandri,alecsandriVa05,alecsandriVa06,bucurestiBu01,bucurestiBu02,bucurestiBu03,bucurestiBu04,bucurestiBu05,bucurestiBu06,bucurestiBu07,bucurestiBu08,bucurestiBu09,bucurestiBu10,bucurestiBu11,alecsandriVa07,alecsandriVa08,alecsandriVa09,alecsandriVa10,alecsandriVa11,alecsandriVa12,alecsandriVa13,alecsandriVa14,sciusevEminescu,sciusevParcalab,sciusevPuskin,sciusevBodoni,sciusevIorga,sciusevCebotari,sciusevSfatul,sciusevLazo,sciusevStere,sciusevPrometeu,sciusev121,sciusevBend,sciusevNorth,ionCreanga,dendrarium,cadastralBuildings,centralStreetObjects,centralInfill,courtyardGates];let detailCursor=0,bucurestiCursor=0;
  const bucurestiPuskinFocus={x:170,z:468};
  // BUC10 and BUC09 meet at Pușkin and depend on retained BUC08/07, Bodoni
  // and cadastral owners. Give that bounded dependency chain the existing
  // frame budget while it is near, instead of one turn among every city layer.
  const bucurestiPuskinLayers=[bucurestiBu10,bucurestiBu09,bucurestiBu08,bucurestiBu07,bodoni,cadastralBuildings];
  const startupPreparationRadius=mobile?170:230,preparationRadius=mobile?270:350;
  const sceneryReady=(x:number,z:number,radius=readySent?preparationRadius:startupPreparationRadius)=>streets.areaReady(x,z,radius)&&government.readyNear(x,z,radius)&&opera.readyNear(x,z,radius)&&detailLayers.every(layer=>layer.readyNear(x,z,radius));
  // BUC10 exchanges its complete fallback group atomically. From BUC08 the
  // near end is visible while its far owners are beyond streetMesh's 510 m
  // scheduling radius. Prepare that bounded dependency group from the nearest
  // point of its bounds, retaining the real camera for final visibility. This
  // orders nearby ground ahead of cells beyond the real residency distance.
  const bucurestiBu10PrepareCamera=camera.clone();
  const bucurestiBu10PreparationPoints=[
    ...bucurestiBu10Buildings.flatMap(b=>b.p),
    ...bucurestiBu10Data.previousCoarseBodies.flatMap(({body})=>body.rings.flat()),
    ...Object.values(bucurestiBu10RetainedPlans.buildings).flatMap(b=>b.p),
    ...cadastralBuildingData.chunks.filter(c=>bucurestiBu10CoarseKeys.has(c.key)).flatMap(c=>c.bodies.flatMap(b=>b.rings.flat())),
    ...bucurestiBu10Data.cells.flatMap(c=>[[c.x-19,c.z-19],[c.x+19,c.z+19]]),
    ...bucurestiBu10Data.trees.map(([x,z])=>[x,z]),
  ];
  const bucurestiBu10PrepareBounds=[Math.min(...bucurestiBu10PreparationPoints.map(p=>p[0])),Math.min(...bucurestiBu10PreparationPoints.map(p=>p[1])),Math.max(...bucurestiBu10PreparationPoints.map(p=>p[0])),Math.max(...bucurestiBu10PreparationPoints.map(p=>p[1]))];
  const bucurestiBu11PrepareCamera=camera.clone();
  const bucurestiBu11PreparationPoints=[
    ...bucurestiBu11Buildings.flatMap(b=>b.p),
    ...bucurestiBu11Data.previousCoarseBodies.flatMap(({body})=>body.rings.flat()),
    ...bucurestiBu11Data.cells.flatMap(c=>[[c.x-19,c.z-19],[c.x+19,c.z+19]]),
    ...bucurestiBu11Data.trees.map(([x,z])=>[x,z]),
  ];
  const bucurestiBu11PrepareBounds=[Math.min(...bucurestiBu11PreparationPoints.map(p=>p[0])),Math.min(...bucurestiBu11PreparationPoints.map(p=>p[1])),Math.max(...bucurestiBu11PreparationPoints.map(p=>p[0])),Math.max(...bucurestiBu11PreparationPoints.map(p=>p[1]))];
  let bucurestiBu10Preparing=false,bucurestiBu11Preparing=false;
  function nativePreparationRadius(x:number,z:number,base:number){
    let radius=base;
    for(const bounds of [bucurestiBu10Preparing?bucurestiBu10PrepareBounds:null,bucurestiBu11Preparing?bucurestiBu11PrepareBounds:null]){
      if(!bounds)continue;
      const [minX,minZ,maxX,maxZ]=bounds;
      radius=Math.max(radius,...[[minX,minZ],[minX,maxZ],[maxX,minZ],[maxX,maxZ]].map(([px,pz])=>Math.hypot(px-x,pz-z)+40));
    }
    return radius;
  }
  function updateScenery(now:number,preparing=false,focus={x:camera.position.x,z:camera.position.z},motionCritical=false){
    const intersectionPending=bucurestiPuskinLayers.some(layer=>!layer.readyNear(bucurestiPuskinFocus.x,bucurestiPuskinFocus.z,520));
    const intersectionDistance=Math.hypot(focus.x-bucurestiPuskinFocus.x,focus.z-bucurestiPuskinFocus.z);
    const prioritizeIntersection=readySent&&intersectionPending&&intersectionDistance<700&&(!preparing||intersectionDistance<260);
    const buildFocus=prioritizeIntersection?bucurestiPuskinFocus:focus;
    const activePreparationRadius=readySent?preparationRadius:startupPreparationRadius;
    // A merge or triangulation step may exceed its nominal deadline before it
    // can yield. During actual movement keep authored scenery immutable; the
    // complete Streets GL city remains visible and detail catches up as soon as
    // the player slows or stops.
    beginSceneBuild(preparing?(mobile?4.5:6):motionCritical?0:2,preparing,buildFocus);
    bucurestiBu10Preparing=!bucurestiBu10.readyNear(buildFocus.x,buildFocus.z,activePreparationRadius+20);
    if(bucurestiBu10Preparing){
      const [minX,minZ,maxX,maxZ]=bucurestiBu10PrepareBounds;
      bucurestiBu10PrepareCamera.copy(camera);
      bucurestiBu10PrepareCamera.position.set(T.MathUtils.clamp(buildFocus.x,minX,maxX),camera.position.y,T.MathUtils.clamp(buildFocus.z,minZ,maxZ));
      bucurestiBu10PrepareCamera.updateMatrixWorld(true);
    }
    bucurestiBu11Preparing=!bucurestiBu11.readyNear(buildFocus.x,buildFocus.z,activePreparationRadius+20);
    if(bucurestiBu11Preparing){
      const [minX,minZ,maxX,maxZ]=bucurestiBu11PrepareBounds;
      bucurestiBu11PrepareCamera.copy(camera);
      bucurestiBu11PrepareCamera.position.set(T.MathUtils.clamp(buildFocus.x,minX,maxX),camera.position.y,T.MathUtils.clamp(buildFocus.z,minZ,maxZ));
      bucurestiBu11PrepareCamera.updateMatrixWorld(true);
    }
    const urgentRadius=readySent?480:startupPreparationRadius+90;
    const urgent=detailLayers.filter(layer=>!layer.readyNear(buildFocus.x,buildFocus.z,urgentRadius));
    const intersectionPriority=prioritizeIntersection?bucurestiPuskinLayers.filter(layer=>!layer.readyNear(bucurestiPuskinFocus.x,bucurestiPuskinFocus.z,520)):[];
    const priority=intersectionPriority.length?intersectionPriority:urgent.length?urgent:detailLayers;
    const first=(intersectionPriority.length?bucurestiCursor++:detailCursor++)%priority.length;
    const updateLayer=(layer:typeof detailLayers[number])=>{
      if(bucurestiBu10Preparing&&(layer===bucurestiBu10||layer===bodoni||layer===cadastralBuildings)){
        setSceneBuildFocus(bucurestiBu10PrepareCamera.position);
        layer.update(bucurestiBu10PrepareCamera,now);
        setSceneBuildFocus(buildFocus);
      }
      if(bucurestiBu11Preparing&&layer===bucurestiBu11){
        setSceneBuildFocus(bucurestiBu11PrepareCamera.position);
        layer.update(bucurestiBu11PrepareCamera,now);
        setSceneBuildFocus(buildFocus);
      }
      layer.update(camera,now);
    };
    const layerBudget=Math.min(priority.length,preparing?(mobile?28:40):motionCritical?2:(mobile?16:24));
    for(let i=0;i<layerBudget;i++)updateLayer(priority[(first+i)%priority.length]);
    // Exchange the complete Midtown body and its affected ground in one frame.
    augustCiuflea.applyBodyOverrides();
  }

  streets.setLandmarks([...landmarks.collisionObjects,...government.collisionObjects,...opera.collisionObjects,...mapModels.collisionObjects,...columna.collisionObjects,...park.collisionObjects,...puskin.collisionObjects,...bodoni.collisionObjects,...stefan.collisionObjects,...boulevard.collisionObjects,...boulevardMonuments.collisionObjects,...boulevardFrontages.collisionObjects,...segmentOne.collisionObjects,...segmentTwo.collisionObjects,...segmentThree.collisionObjects,...segmentFour.collisionObjects,...segmentFive.collisionObjects,...segmentSix.collisionObjects,...segmentSeven.collisionObjects,...segmentEight.collisionObjects,...boulevardCompletion.collisionObjects,...doga.collisionObjects,...museumQuarter.collisionObjects,...alexandruSector.collisionObjects,...dosofteiSector.collisionObjects,...columnaEast.collisionObjects,...columnaIsmailTighina.collisionObjects,...augustQuarter.collisionObjects,...augustEast.collisionObjects,...augustTighina.collisionObjects,...augustIsmail.collisionObjects,...augustTolstoi.collisionObjects,...augustCiuflea.collisionObjects,...vasilenco.collisionObjects,...augustCaucaz.collisionObjects,...augustJunction.collisionObjects,...sciusevTest.collisionObjects,...sciusevWest.collisionObjects,...sciusevAlecsandri.collisionObjects,...alecsandriVa05.collisionObjects,...alecsandriVa06.collisionObjects,...bucurestiBu01.collisionObjects,...bucurestiBu02.collisionObjects,...bucurestiBu03.collisionObjects,...bucurestiBu04.collisionObjects,...bucurestiBu05.collisionObjects,...bucurestiBu06.collisionObjects,...bucurestiBu07.collisionObjects,...bucurestiBu08.collisionObjects,...bucurestiBu09.collisionObjects,...bucurestiBu10.collisionObjects,...bucurestiBu11.collisionObjects,...alecsandriVa07.collisionObjects,...alecsandriVa08.collisionObjects,...alecsandriVa09.collisionObjects,...alecsandriVa10.collisionObjects,...alecsandriVa11.collisionObjects,...alecsandriVa12.collisionObjects,...alecsandriVa13.collisionObjects,...alecsandriVa14.collisionObjects,...sciusevEminescu.collisionObjects,...sciusevParcalab.collisionObjects,...sciusevPuskin.collisionObjects,...sciusevBodoni.collisionObjects,...sciusevIorga.collisionObjects,...sciusevCebotari.collisionObjects,...sciusevSfatul.collisionObjects,...sciusevLazo.collisionObjects,...sciusevStere.collisionObjects,...sciusevPrometeu.collisionObjects,...sciusev121.collisionObjects,...sciusevBend.collisionObjects,...sciusevNorth.collisionObjects,...ionCreanga.collisionObjects,...dendrarium.collisionObjects,...cadastralBuildings.collisionObjects,...centralStreetObjects.collisionObjects,...centralInfill.collisionObjects,...courtyardGates.collisionObjects],[...landmarks.replacements,...government.replacements,...opera.replacements,...mapModels.replacements,...columna.replacements,...puskin.replacements,...bodoni.replacements,...boulevardFrontages.replacements,...segmentOne.replacements,...segmentTwo.replacements,...segmentThree.replacements,...segmentFour.replacements,...segmentFive.replacements,...segmentSix.replacements,...segmentSeven.replacements,...segmentEight.replacements,...boulevardCompletion.replacements,...museumQuarter.replacements,...alexandruSector.replacements,...dosofteiSector.replacements,...columnaEast.replacements,...columnaIsmailTighina.replacements,...augustQuarter.replacements,...augustEast.replacements,...augustTighina.replacements,...augustIsmail.replacements,...augustTolstoi.replacements,...augustCiuflea.replacements,...vasilenco.replacements,...augustCaucaz.replacements,...augustJunction.replacements,...sciusevTest.replacements,...sciusevWest.replacements,...sciusevAlecsandri.replacements,...alecsandriVa05.replacements,...alecsandriVa06.replacements,...bucurestiBu01.replacements,...bucurestiBu02.replacements,...bucurestiBu03.replacements,...bucurestiBu04.replacements,...bucurestiBu05.replacements,...bucurestiBu06.replacements,...bucurestiBu07.replacements,...bucurestiBu08.replacements,...bucurestiBu09.replacements,...bucurestiBu10.replacements,...bucurestiBu11.replacements,...alecsandriVa07.replacements,...alecsandriVa08.replacements,...alecsandriVa09.replacements,...alecsandriVa10.replacements,...alecsandriVa11.replacements,...alecsandriVa12.replacements,...alecsandriVa13.replacements,...alecsandriVa14.replacements,...sciusevEminescu.replacements,...sciusevParcalab.replacements,...sciusevPuskin.replacements,...sciusevBodoni.replacements,...sciusevIorga.replacements,...sciusevCebotari.replacements,...sciusevSfatul.replacements,...sciusevLazo.replacements,...sciusevStere.replacements,...sciusevPrometeu.replacements,...sciusev121.replacements,...sciusevBend.replacements,...sciusevNorth.replacements,...ionCreanga.replacements,...dendrarium.replacements,...cadastralBuildings.replacements,...centralInfill.replacements]);
  streets.setGroundLayers([...columna.objects,...park.objects,...puskin.objects,...bodoni.objects,...stefan.objects,...boulevard.objects,...government.objects,...opera.objects,...boulevardFrontages.objects,...segmentOne.objects,...segmentTwo.objects,...segmentThree.objects,...segmentFour.objects,...segmentFive.objects,...segmentSix.objects,...segmentSeven.objects,...segmentEight.objects,...boulevardCompletion.objects,...doga.objects,...museumQuarter.objects,...alexandruSector.objects,...dosofteiSector.objects,...columnaEast.objects,...columnaIsmailTighina.objects,...augustQuarter.objects,...augustEast.objects,...augustTighina.objects,...augustIsmail.objects,...augustTolstoi.objects,...augustCiuflea.objects,...vasilenco.objects,...augustCaucaz.objects,...augustJunction.objects,...sciusevTest.objects,...sciusevWest.objects,...sciusevAlecsandri.objects,...alecsandriVa05.objects,...alecsandriVa06.objects,...bucurestiBu01.objects,...bucurestiBu02.objects,...bucurestiBu03.objects,...bucurestiBu04.objects,...bucurestiBu05.objects,...bucurestiBu06.objects,...bucurestiBu07.objects,...bucurestiBu08.objects,...bucurestiBu09.objects,...bucurestiBu10.objects,...bucurestiBu11.objects,...alecsandriVa07.objects,...alecsandriVa08.objects,...alecsandriVa09.objects,...alecsandriVa10.objects,...alecsandriVa11.objects,...alecsandriVa12.objects,...alecsandriVa13.objects,...alecsandriVa14.objects,...sciusevEminescu.objects,...sciusevParcalab.objects,...sciusevPuskin.objects,...sciusevBodoni.objects,...sciusevIorga.objects,...sciusevCebotari.objects,...sciusevSfatul.objects,...sciusevLazo.objects,...sciusevStere.objects,...sciusevPrometeu.objects,...sciusev121.objects,...sciusevBend.objects,...sciusevNorth.objects,...ionCreanga.objects,...dendrarium.objects,...cadastralBuildings.objects,...centralStreetObjects.objects,...centralInfill.objects]);
  streets.setTrees([...sciusevTest.treeOverrides,...sciusevWest.treeOverrides,...sciusevAlecsandri.treeOverrides,...alecsandriVa05.treeOverrides,...alecsandriVa06.treeOverrides,...bucurestiBu01.treeOverrides,...bucurestiBu02.treeOverrides,...bucurestiBu03.treeOverrides,...bucurestiBu04.treeOverrides,...bucurestiBu05.treeOverrides,...bucurestiBu06.treeOverrides,...bucurestiBu07.treeOverrides,...bucurestiBu08.treeOverrides,...bucurestiBu09.treeOverrides,...bucurestiBu10.treeOverrides,...bucurestiBu11.treeOverrides,...alecsandriVa07.treeOverrides,...alecsandriVa08.treeOverrides,...alecsandriVa09.treeOverrides,...alecsandriVa10.treeOverrides,...alecsandriVa11.treeOverrides,...alecsandriVa12.treeOverrides,...alecsandriVa13.treeOverrides,...alecsandriVa14.treeOverrides,...sciusevEminescu.treeOverrides,...sciusevParcalab.treeOverrides,...sciusevPuskin.treeOverrides,...sciusevBodoni.treeOverrides,...sciusevIorga.treeOverrides,...sciusevCebotari.treeOverrides,...sciusevSfatul.treeOverrides,...sciusevLazo.treeOverrides,...sciusevStere.treeOverrides,...sciusevPrometeu.treeOverrides,...sciusev121.treeOverrides,...sciusevBend.treeOverrides,...sciusevNorth.treeOverrides,...ionCreanga.treeOverrides,...dendrarium.treeOverrides,...government.treeOverrides,...opera.treeOverrides,...columna.treeOverrides,...columnaIsmailTighina.treeOverrides,...park.treeOverrides,...puskin.treeOverrides,...bodoni.treeOverrides]);
  streets.setInstances([...bucurestiBu03.instanceOverrides,...bucurestiBu04.instanceOverrides,...bucurestiBu09.instanceOverrides,...bucurestiBu10.instanceOverrides,...bucurestiBu11.instanceOverrides].filter(item=>item.type!=='busStop'));
  const mapPhysics=createMapPhysics(); // Existing route names and traffic behaviours only.
  const effects=createImpactEffects(scene);
  const traffic=createTraffic(scene,effects.burst,visibility,mobile,groundLevel,(x,z,h)=>streets.carBlocked(x,z,h));

  // Articulated walkers. Curved forms and independent joints keep gait natural.
  const personTemplates=new Map<string,{root:T.Group;body:T.Group;limbs:T.Group[]}>();
  function person(jacketColor:string,trouserColor:string,scale=1){
    const key=jacketColor+trouserColor,template=personTemplates.get(key);
    if(template){const root=template.root.clone(true);root.scale.setScalar(scale);return{root,body:root.getObjectByName('Torso') as T.Group,limbs:template.limbs.map((_,i)=>root.getObjectByName(`joint-${i}`) as T.Group)};}
    const root=new T.Group();root.scale.setScalar(scale);
    const coat=makeMat(jacketColor),pants=makeMat(trouserColor),hair=makeMat('#342d25');
    const body=new T.Group();body.name='Torso';root.add(body);
    const torso=mesh(new T.CapsuleGeometry(.195,.34,5,12),coat,0,1.18,0,body);torso.scale.x=1.16;torso.scale.z=.73;
    sphere(.165,.205,.15,mat.skin,0,1.72,0,body);sphere(.171,.107,.155,hair,0,1.84,-.018,body);cyl(.065,.07,.11,mat.skin,0,1.49,0,body);
    sphere(.042,.044,.055,mat.skin,0,1.71,.147,body);for(const xx of[-.067,.067])sphere(.015,.018,.012,hair,xx,1.758,.132,body);
    box(.014,.4,.025,mat.darkStone,0,1.21,.158,body); // jacket zip
    const limbs:T.Group[]=[];
    for(const side of[-1,1]){
      const leg=new T.Group();leg.position.set(side*.105,.89,0);body.add(leg);const thigh=mesh(new T.CapsuleGeometry(.083,.34,4,9),pants,0,-.23,0,leg);
      const shin=new T.Group();shin.position.y=-.46;leg.add(shin);mesh(new T.CapsuleGeometry(.066,.29,4,9),pants,0,-.18,0,shin);sphere(.078,.06,.15,mat.black,0,-.38,.055,shin);limbs.push(leg,shin);
      const arm=new T.Group();arm.position.set(side*.265,1.4,0);arm.rotation.z=side*.06;body.add(arm);mesh(new T.CapsuleGeometry(.067,.26,4,9),coat,0,-.16,0,arm);const fore=new T.Group();fore.position.y=-.32;arm.add(fore);mesh(new T.CapsuleGeometry(.052,.22,4,9),coat,0,-.13,.015,fore);sphere(.055,.09,.047,mat.skin,0,-.29,.015,fore);limbs.push(arm,fore);
    }
    limbs.forEach((limb,i)=>limb.name=`joint-${i}`);
    // Merge rigid pieces per joint, retaining articulated arms and legs.
    root.traverse(node=>{const groups=new Map<T.Material,T.Mesh[]>();for(const child of node.children){if(!(child instanceof T.Mesh)||Array.isArray(child.material))continue;const list=groups.get(child.material)??[];list.push(child);groups.set(child.material,list);}for(const [material,list]of groups){if(list.length<2)continue;const geometries=list.map(mesh=>{mesh.updateMatrix();return(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(mesh.matrix);});const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!geometry)continue;list.forEach(mesh=>{node.remove(mesh);mesh.geometry.dispose();});const joined=new T.Mesh(geometry,material);joined.castShadow=joined.receiveShadow=true;node.add(joined);}});
    const result={root,body,limbs};personTemplates.set(key,result);return result;
  }
  const player=person('#526467','#313f49',1);scene.add(player.root);player.root.position.set(GAME_SPAWN.player.x,0,GAME_SPAWN.player.z);player.root.rotation.y=PI;
  const playerVisual=new T.Group();player.root.add(playerVisual);playerVisual.add(player.body);
  let playerMixer:T.AnimationMixer|null=null;
  const playerActions:Record<string,T.AnimationAction>={};let playerAction='Idle';
  let playerModelRequested=false;
  function loadPlayerModel(){
    if(playerModelRequested||disposed)return;playerModelRequested=true;
    new GLTFLoader().load(modelAssetUrl('/walker.glb'),gltf=>{
      if(disposed)return;const model=gltf.scene;const bounds=new T.Box3().setFromObject(model);const size=bounds.getSize(new T.Vector3());const scale=1.83/size.y;model.scale.setScalar(scale);model.rotation.y=PI;model.position.y=-bounds.min.y*scale;
      model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{if(m instanceof T.MeshStandardMaterial){m.roughness=.86;m.metalness=.05;}});}});
      player.body.visible=false;playerVisual.add(model);playerMixer=new T.AnimationMixer(model);gltf.animations.forEach(clip=>{playerActions[clip.name]=playerMixer!.clipAction(clip);});playerActions.Idle?.play();
    },undefined,()=>{});
  }
  const walkRoutes=CITY_DATA.features.filter(f=>f.t.highway==='footway'&&!f.t.tunnel&&f.t.layer!=='-1'&&f.p.length>1&&f.p.length<12&&f.p.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-f.p[i][0],p[1]-f.p[i][1]),0)>10).sort((a,b)=>Math.hypot(a.p[0][0]-24,a.p[0][1]+90)-Math.hypot(b.p[0][0]-24,b.p[0][1]+90));
  const npcs:{p:ReturnType<typeof person>;route:XY[];phase:number;speed:number;down:boolean;fall:number;fallVelocity:number;fallSign:number;hitDelay:number;distance:number;nextUpdate:number;meshes:T.Mesh[];shadows:boolean;custom?:T.Group;mixer?:T.AnimationMixer}[]=[];
  const visiblePeople:typeof npcs=[];
  for(let i=0;i<(mobile?100:160);i++){const available=i<48?Math.min(90,walkRoutes.length):walkRoutes.length;const route=walkRoutes[(i*37+11)%available]?.p??[[18,-42],[48,-42]];const p=person(['#af9272','#626961','#836752','#384c65','#b2aba0'][i%5],['#3e4443','#4d535a','#706557'][i%3],rnd(.93,1.04));p.root.name=`Pieton ${i+1}`;p.root.position.set(route[0][0],0,route[0][1]);const meshes:T.Mesh[]=[];p.root.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});npcs.push({p,route,phase:rnd(0,6),speed:rnd(.15,.22),down:false,fall:0,fallVelocity:0,fallSign:1,hitDelay:0,distance:Infinity,nextUpdate:i*.006,meshes,shadows:true});}
  const crowd=createCrowdRenderer(scene,npcs,mobile?36:56);
  function dress(n:typeof npcs[number],model:T.Group,height=1.75,boundsTarget:T.Object3D=model){
    model.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(boundsTarget),size=bounds.getSize(new T.Vector3());
    if(!Number.isFinite(size.y)||size.y<.01)return false;
    const center=bounds.getCenter(new T.Vector3());model.position.x-=center.x;model.position.y-=bounds.min.y;model.position.z-=center.z;
    const pivot=new T.Group();pivot.scale.setScalar(height/size.y/n.p.root.scale.y);pivot.add(model);
    pivot.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=true;}});
    n.p.body.visible=false;n.p.root.add(pivot);n.custom=pivot;return true;
  }
  const peopleLoader=new GLTFLoader();
  let crowdLoadTimer:ReturnType<typeof setTimeout>|undefined;
  const crowdJobs:(()=>void)[]=[];
  function loadAnimatedCrowd(){
    peopleLoader.load(modelAssetUrl('/people-animated.glb'),gltf=>{
    if(disposed)return;
    const variants:T.Object3D[]=[];gltf.scene.traverse(o=>{if(o.name.startsWith('rig_CharRoot'))variants.push(o);});
    const fullClip=gltf.animations[0];if(!variants.length)return;
    npcs.forEach((n,i)=>{if(i%12!==0)return;crowdJobs.push(()=>{
      const selected=variants[(i/12)%variants.length];
      const model=cloneAnimatedRig(selected);
      const rig=model.getObjectByName(selected.name);if(!rig)return;
      if(!dress(n,model,1.55+(i%5)*.06,rig)||!fullClip)return;
      const tracks=fullClip.tracks.filter(track=>{const name=track.name.slice(0,track.name.lastIndexOf('.'));return !!rig.getObjectByName(name)&&!(name===selected.name&&track.name.endsWith('.position'));});
      if(tracks.length){const clip=new T.AnimationClip('Walk',fullClip.duration,tracks);n.mixer=new T.AnimationMixer(model);const action=n.mixer.clipAction(clip);action.time=(i*1.17)%clip.duration;action.play();}
    });});
    },undefined,()=>{});
  }
  function scheduleAnimatedCrowd(){if(!disposed)crowdLoadTimer=setTimeout(loadAnimatedCrowd,700);}
  function loadCrowdModels(){
    peopleLoader.load(modelAssetUrl('/people-static.glb'),gltf=>{
      if(disposed)return;
      const variants=gltf.scene.getObjectByName('RootNode')?.children.filter(o=>o.children.some(c=>c instanceof T.Mesh))??[];
      // The compact GLB keeps these six original slots in ascending order.
      const retainedSlots=[3,6,9,15,18,21];
      if(variants.length)npcs.forEach((n,i)=>{if(i%3!==0||i%12===0)return;const original=(i*7)%24;const slot=variants.length===6?retainedSlots.indexOf(original):original%variants.length;if(slot<0)return;crowdJobs.push(()=>{dress(n,variants[slot].clone(true) as T.Group,1.7+(i%5)*.04);});});
      scheduleAnimatedCrowd();
    },undefined,scheduleAnimatedCrowd);
  }
  const animatePerson=(p:ReturnType<typeof person>,time:number,moving:boolean,run=false)=>{
    const f=moving?Math.sin(time*(run?11:7)):0,amp=run?.88:.5;
    p.limbs[0].rotation.x=f*amp;p.limbs[4].rotation.x=-f*amp;
    p.limbs[1].rotation.x=Math.max(0,-f)*amp*.9;p.limbs[5].rotation.x=Math.max(0,f)*amp*.9;
    p.limbs[2].rotation.x=-f*amp*.68;p.limbs[6].rotation.x=f*amp*.68;
    p.limbs[3].rotation.x=run?-.8:-.18;p.limbs[7].rotation.x=run?-.8:-.18;
    p.body.position.y=moving?Math.abs(f)*.025:Math.sin(time*1.7)*.003;
  };

  // Pigeons over the square and slowly drifting birds in the sky.
  const birds:T.Group[]=[];const birdmat=makeMat('#515956');
  for(let i=0;i<11;i++){const b=new T.Group();sphere(.065,.07,.14,birdmat,0,.12,0,b);sphere(.047,.05,.048,birdmat,0,.2,.1,b);mesh(new T.ConeGeometry(.022,.08,5),mat.darkStone,0,.2,.16,b).rotation.x=PI/2;b.name=`Porumbel ${i+1}`;b.position.set(rnd(38,69),0,rnd(-29,5));scene.add(b);birds.push(b);}

  // Camera-relative locomotion and collision sliding.
  let mapOpen=false,menuOpen=false,pausedBeforeMap=true;
  let started=false,disposed=false,firstPerson=false,paused=false,yaw=GAME_SPAWN.player.heading,pitch=.09;
  let targetYaw=yaw,targetPitch=pitch,walkPhase=0;
  const keys=new Set<string>();
  const position=new T.Vector3(GAME_SPAWN.player.x,0,GAME_SPAWN.player.z);
  const walker=makeWalkerState(position);
  function resetWalker(){Object.assign(walker,makeWalkerState(position));playerVisual.rotation.set(0,0,0);playerVisual.position.set(0,0,0);}
  const input={x:0,y:0};
  const pedals={throttle:false,brake:false,left:false,right:false,up:false,down:false,boost:false};
  const weapon=createWeapon(scene,camera,{sound:weaponSound,raycast:traceWorld,blocks:queryCameraBlocks,ground:(x,z)=>streets.surface(x,z,groundLevel(x,z)+2),kick:()=>{targetPitch=Math.max(-.45,targetPitch-.008);}});
  colliders.push({x:TABLE.x,z:TABLE.z,w:TABLE.w,d:TABLE.d,h:TABLE.height});
  const colliderIndex=new SpatialIndex<Block>(),nearColliders:Block[]=[];
  colliders.forEach(b=>colliderIndex.insert(b,b.x-b.w/2,b.z-b.d/2,b.x+b.w/2,b.z+b.d/2));
  const nearbyColliders=(x:number,z:number,r:number)=>colliderIndex.query(x-r,z-r,x+r,z+r,nearColliders);
  const prius=createPrius(scene,colliders,traffic.obstacles,(x,z,h)=>streets.carBlocked(x,z,h),[-Infinity,-Infinity,Infinity,Infinity],nearbyColliders,groundLevel);
  const helicopter=createHelicopter(scene,{ground:groundLevel,surface:flightSurface,ready:(x,z,y)=>streets.loaded(x,z,true,y),blocked:flightBlocked});
  const assetLoadTimers:ReturnType<typeof setTimeout>[]=[];
  let assetsScheduled=false;
  function scheduleOptionalAssets(){
    if(assetsScheduled||disposed)return;assetsScheduled=true;
    const later=(delay:number,task:()=>void)=>assetLoadTimers.push(setTimeout(()=>{if(!disposed)task();},delay));
    later(40,()=>prius.load());
    later(360,()=>helicopter.load());
    later(720,()=>weapon.load());
    later(1050,()=>traffic.load());
    later(1450,loadPlayerModel);
    later(2400,loadCrowdModels);
  }
  function revealReadyScene(){
    if(disposed||readySent)return;
    readySent=true;canvas.style.opacity='1';publishVehicle();callbacks.weapon?.(weapon.hud(position));callbacks.ready();scheduleOptionalAssets();
  }
  function compileAndReveal(){
    if(readyCompiling||readySent)return;readyCompiling=true;
    const timeout=new Promise<void>(resolve=>setTimeout(resolve,900));
    void Promise.race([renderer.compileAsync(scene,camera).then(()=>{}),timeout]).catch(()=>{}).finally(revealReadyScene);
  }
  const flightProbeA=new T.Vector3(),flightProbeB=new T.Vector3();
  let flightMessage='',flightMessageUntil=0,helicopterAudio:ReturnType<typeof createHelicopterAudio>|null=null;
  let playerCarDamage:ReturnType<typeof createCarDamage>|null=null;
  const hitCenter=new T.Vector3();
  function traceWorld(a:T.Vector3,b:T.Vector3):ShotHit|null{
    const mapHit=streets.raycast(a,b);let result:ShotHit|null=mapHit===null?null:{fraction:mapHit};
    const take=(hit:ShotHit|null)=>{if(hit&&(!result||hit.fraction<result.fraction))result=hit;};
    take(traffic.raycast(a,b));if(playerCarDamage)take(playerCarDamage.raycast(a,b));
    for(const n of npcs){if(n.down||!n.p.root.visible)continue;for(const [height,radius]of[[1.68,.19],[1.05,.33],[.43,.27]]){hitCenter.set(n.p.root.position.x,n.p.root.position.y+height*n.p.root.scale.y,n.p.root.position.z);const t=segmentSphere(a,b,hitCenter,radius);if(t!==null){take({fraction:t,hit(point,direction){if(n.down)return;effects.burst('red',point,direction,15);n.down=true;n.hitDelay=.10;n.fallVelocity=.8;n.fallSign=Math.random()>.5?1:-1;}});}}}
    for(const bird of birds){if(!bird.visible)continue;hitCenter.copy(bird.position);hitCenter.y+=.14;const t=segmentSphere(a,b,hitCenter,.17);if(t!==null)take({fraction:t,hit(point,direction){if(!bird.visible)return;bird.visible=false;effects.burst('feather',point,direction,24);}});}
    return result;
  }
  let carOrbit=0,carLookTimer=0,vehicleSnap=false,carMessage='',carMessageUntil=0,lastImpact=0;
  let carAudio:ReturnType<typeof createCarAudio>|null=null;
  let activeTraffic:TrafficCar|null=null,ownCarState:CarState|null=null,ownCarVisual:T.Group|null=null;
  function leaveTrafficCar(preserveMomentum=false){
    if(!activeTraffic)return;
    traffic.release(activeTraffic,preserveMomentum?prius.state:undefined);activeTraffic=null;
    if(ownCarState){Object.assign(prius.state,ownCarState);ownCarState=null;}
    if(ownCarVisual){scene.remove(ownCarVisual);ownCarVisual=null;}
    prius.setBodyVisible(true);
    prius.update(0,driveInput,false);
  }
  const driveInput={throttle:0,brake:0,steer:0,handbrake:false,offroad:false};
  const cameraDelta=new T.Vector3(),carLook=new T.Vector3();
  function tellCar(message:string){carMessage=message;carMessageUntil=performance.now()+3200;publishVehicle();}
  function publishVehicle(){const nearCar=traffic.nearest(position),ownDistance=Math.hypot(position.x-prius.state.x,position.z-prius.state.z);const nearTraffic=!!nearCar&&(!prius.near(position)||Math.hypot(position.x-nearCar.root.position.x,position.z-nearCar.root.position.z)<ownDistance);callbacks.vehicle?.({loaded:prius.loaded,failed:prius.failed,driving:prius.driving,loading:false,near:prius.near(position)||!!nearCar,nearTraffic,speed:Math.round(Math.abs(prius.state.speed)*3.6),gear:prius.state.gear,mode:prius.state.mode,battery:prius.state.energy,lights:prius.headlights,message:performance.now()<carMessageUntil?carMessage:''});}
  function clearInput(){weapon.stop();keys.clear();input.x=input.y=0;for(const p of Object.keys(pedals)as(keyof typeof pedals)[])pedals[p]=false;}
  function pedal(p:string,value:boolean){if(mapOpen||menuOpen)return;if(p in pedals){pedals[p as keyof typeof pedals]=value;if(value){paused=false;callbacks.paused(false);}}}
  function vehicle(action:VehicleAction){
    if(mapOpen||menuOpen)return;
    if(helicopter.piloting){tellFlight('Apasă E pentru a ieși din elicopter.');return;}
    if(!readySent)return;
    if(!prius.loaded){prius.load();tellCar(prius.failed?'Priusul nu s-a încărcat. Reîncarcă pagina pentru a încerca din nou.':'Se pregătește Priusul…');return;}
    if(action==='spawn'){
      if(prius.driving){tellCar('Coboară din mașină mai întâi.');return;}
      const spot=findCarSpawn(position,yaw,{ground:groundLevel,surface:streets.surface,
        ready:(x,z,y)=>streets.loaded(x,z,true,y),
        blocked:(x,z,heading)=>prius.blocked(x,z,heading)||(helicopter.placed&&Math.abs(groundLevel(x,z)-helicopter.state.y)<4&&Math.hypot(x-helicopter.state.x,z-helicopter.state.z)<8)
      });
      if(!spot){tellCar('Nu este loc pentru mașină. Mergi într-un spațiu liber.');return;}
      prius.recover(spot.x,spot.z,yaw);playerCarDamage?.reset();tellCar('Mașină generată.');return;
    }
    if(action==='find'||action==='recover'){
      if(activeTraffic){prius.setDriving(false);leaveTrafficCar();}
      if(action==='recover'){prius.recover();playerCarDamage?.reset();}
      const point=prius.exitPoint((x,z)=>canMove(x,z,x,z,groundLevel(x,z)));if(!point){tellCar('Nu este loc de coborâre. Folosește „Readu Priusul”.');return;}
      if(prius.driving)prius.setDriving(false);
      position.copy(point);started=true;paused=false;callbacks.started?.();callbacks.paused(false);clearInput();
      targetYaw=yaw=prius.state.heading;targetPitch=pitch=.08;prius.cabin(false);resetWalker();
      camera.position.set(point.x+Math.sin(yaw)*5.6,groundLevel(point.x,point.z)+3,point.z+Math.cos(yaw)*5.6);publishVehicle();return;
    }
    if(action==='interact'){
      if(prius.driving){
        const point=prius.exitPoint(canMove)??prius.local(0,1.75,0);
        const exitHeading=prius.state.heading,speed=prius.state.speed;
        ejectWalker(walker,point,{x:-Math.sin(exitHeading)*speed,y:0,z:-Math.cos(exitHeading)*speed});
        prius.setDriving(false,true);prius.cabin(false);position.copy(point);targetYaw=yaw=exitHeading;targetPitch=pitch=.08;
        leaveTrafficCar(true);
        if(Math.abs(speed)>4)tellCar('Ai sărit din mers · te ridici automat.');
        camera.position.set(point.x+Math.sin(yaw)*5.6,point.y+3,point.z+Math.cos(yaw)*5.6);
      }else{
        const nearbyTraffic=traffic.nearest(position),ownDistance=Math.hypot(position.x-prius.state.x,position.z-prius.state.z);
        if(!prius.near(position)&&!nearbyTraffic){tellCar('Apropie-te de o mașină.');return;}
        if(nearbyTraffic&&(!prius.near(position)||Math.hypot(position.x-nearbyTraffic.root.position.x,position.z-nearbyTraffic.root.position.z)<ownDistance)){
          ownCarState={...prius.state};ownCarVisual=prius.root.clone(true);ownCarVisual.position.set(ownCarState.x,groundLevel(ownCarState.x,ownCarState.z),ownCarState.z);scene.add(ownCarVisual);
          const selected=traffic.take(nearbyTraffic);activeTraffic=nearbyTraffic;
          Object.assign(prius.state,{x:selected.x,z:selected.z,heading:selected.heading,speed:0});prius.setBodyVisible(false);
          prius.update(0,driveInput,false);
        }
        started=true;callbacks.started?.();weapon.stop();prius.setDriving(true);prius.cabin(firstPerson);position.copy(prius.root.position);carOrbit=0;targetPitch=pitch=.05;vehicleSnap=true;player.root.visible=false;
      }
      clearInput();paused=false;callbacks.paused(false);requestLock();publishVehicle();return;
    }
    if(!prius.driving)return;
    if(action==='gear'&&!prius.gear())tellCar('Frânează până la oprire înainte de D / R.');
    if(action==='park'&&!prius.park())tellCar('Oprește mașina înainte de a selecta P.');
    if(action==='lights')prius.lights();
    if(action==='horn'){if(!audioOn)sound();carAudio?.horn();}
    publishVehicle();
  }
  function weaponAction(action:WeaponAction,value=true){
    if(mapOpen||menuOpen)return;
    if(prius.driving||helicopter.piloting||walker.recovery>0)return;
    if(!weapon.loaded){weapon.load();return;}
    if(action==='interact'){if(weapon.interact(position)){started=true;paused=false;callbacks.started?.();callbacks.paused(false);callbacks.weapon?.(weapon.hud(position));requestLock();}return;}
    if(!started)return;
    if(action==='reload'||action==='drop'){paused=false;callbacks.paused(false);requestLock();}
    if(paused)return;
    if(action==='fire')weapon.fire(value);if(action==='aim')weapon.aim(value);
    if(action==='reload')weapon.reload();if(action==='drop')weapon.drop(position,yaw,position.y);
    callbacks.weapon?.(weapon.hud(position));
  }
  function interact(){if(helicopter.piloting||!prius.driving&&helicopter.near(position))flightAction('interact');else if(!prius.driving&&(weapon.near(position)||(weapon.state.equipped&&weapon.atTable(position))))weaponAction('interact');else if(!prius.driving&&courtyardGates.hud(position).near)gateAction();else vehicle('interact');}
  function gateAction(){if(!mapOpen&&!menuOpen&&!travel.target&&!prius.driving&&!helicopter.piloting&&courtyardGates.toggle(position)){callbacks.gate?.(courtyardGates.hud(position));requestLock();}}
  const forward=new T.Vector3(),right=new T.Vector3(),move=new T.Vector3();
  const viewTarget=new T.Vector3(),desiredCamera=new T.Vector3();
  const cameraRay=new T.Ray();const cameraHit=new T.Vector3();
  const cameraBlocks=colliders.map(b=>new T.Box3(new T.Vector3(b.x-b.w/2,0,b.z-b.d/2),new T.Vector3(b.x+b.w/2,b.h??(b.w>20?20:7),b.z+b.d/2)));
  const cameraIndex=new SpatialIndex<T.Box3>(),cameraCandidates:T.Box3[]=[];
  cameraBlocks.forEach(b=>cameraIndex.insert(b,b.min.x,b.min.z,b.max.x,b.max.z));
  function queryCameraBlocks(a:T.Vector3,b:T.Vector3){return cameraIndex.query(Math.min(a.x,b.x),Math.min(a.z,b.z),Math.max(a.x,b.x),Math.max(a.z,b.z),cameraCandidates);}
  const bulletBlocks=cameraBlocks;
  camera.position.set(GAME_SPAWN.camera.x,GAME_SPAWN.camera.y,GAME_SPAWN.camera.z);camera.lookAt(GAME_SPAWN.camera.targetX,GAME_SPAWN.camera.targetY,GAME_SPAWN.camera.targetZ);
  function canMove(x:number,z:number,fromX=x,fromZ=z,y=position.y){
    if(streets.blocked(x,z,fromX,fromZ,.3,y))return false;
    for(const b of nearbyColliders(x,z,.3))if(y<groundLevel(b.x,b.z)+(b.h??2)&&Math.abs(x-b.x)<b.w/2+.28&&Math.abs(z-b.z)<b.d/2+.28)return false;
    return !helicopter.walkBlocked(x,z,y)&&!prius.walkBlocked(x,z,y)&&!traffic.obstacles().some(b=>y<groundLevel(b.x,b.z)+1.7&&Math.abs(x-b.x)<b.w/2+.25&&Math.abs(z-b.z)<b.d/2+.25);
  }
  function jump(){if(mapOpen||menuOpen)return;if(started&&!paused&&!prius.driving&&!helicopter.piloting)jumpWalker(walker);}
  function flightSurface(x:number,z:number,ceiling:number,heading:number){
    const c=Math.cos(heading),s=Math.sin(heading);let floor=streets.surface(x,z,ceiling);
    for(const [dx,dz]of[[-1.1,-2.3],[1.1,-2.3],[-1.1,2],[1.1,2]])floor=Math.max(floor,streets.surface(x+dx*c+dz*s,z-dx*s+dz*c,ceiling));
    return floor;
  }
  const walkWorld={surface:streets.surface,clear:canMove,ready:(x:number,z:number)=>streets.loaded(x,z,true,walker.y),ceiling:(from:{x:number;y:number;z:number},to:{x:number;y:number;z:number})=>streets.raycast(flightProbeA.set(from.x,from.y,from.z),flightProbeB.set(to.x,to.y,to.z),false)!==null};
  function flightPoint(point:{x:number;y:number;z:number;heading:number},x:number,y:number,z:number,out:T.Vector3){const c=Math.cos(point.heading),s=Math.sin(point.heading);return out.set(point.x+x*c+z*s,point.y+y,point.z-x*s+z*c);}
  function flightBlocked(from:FlightState,to:{x:number;y:number;z:number;heading:number}){
    if(Math.hypot(from.x-to.x,from.y-to.y,from.z-to.z)<.000001&&Math.abs(from.heading-to.heading)<.000001)return false;
    const probes=[[-1.35,.65,-3.7],[1.35,.65,-3.7],[-1.35,.65,2.8],[1.35,.65,2.8],[0,1.6,4.8],[-4.5,2.5,-1.1],[4.5,2.5,-1.1],[0,2.5,-5.2],[0,2.5,3.4]];
    for(const [x,y,z]of probes){flightPoint(from,x,y,z,flightProbeA);flightPoint(to,x,y,z,flightProbeB);if(streets.raycast(flightProbeA,flightProbeB,false)!==null)return true;}
    // Cross-sections catch walls between sample points and prevent rotation into them.
    for(const y of[.7,1.6,2.5]){flightPoint(to,-1.5,y,-3.7,flightProbeA);flightPoint(to,1.5,y,3.8,flightProbeB);if(streets.raycast(flightProbeA,flightProbeB,false)!==null)return true;flightPoint(to,1.5,y,-3.7,flightProbeA);flightPoint(to,-1.5,y,3.8,flightProbeB);if(streets.raycast(flightProbeA,flightProbeB,false)!==null)return true;}
    flightPoint(to,-4.5,2.5,-1.1,flightProbeA);flightPoint(to,4.5,2.5,-1.1,flightProbeB);if(streets.raycast(flightProbeA,flightProbeB,false)!==null)return true;
    if(to.y<groundLevel(to.x,to.z)+2.2){
      if(prius.loaded&&Math.hypot(to.x-prius.state.x,to.z-prius.state.z)<5.8)return true;
      for(const b of [...nearbyColliders(to.x,to.z,5),...traffic.obstacles()])if(Math.abs(to.x-b.x)<b.w/2+3&&Math.abs(to.z-b.z)<b.d/2+4)return true;
    }
    return false;
  }
  function clearHelicopterSpot(x:number,z:number,ceiling:number){
    return helicopterSpot({ground:groundLevel,surface:streets.surface,
      ready:(x,z,y)=>streets.loaded(x,z,true,y),
      blocked:(a,b)=>streets.raycast(flightProbeA.set(a.x,a.y,a.z),flightProbeB.set(b.x,b.y,b.z),false)!==null,
      occupied:(x,z,y)=>{
        if(prius.loaded&&Math.abs(y-groundLevel(prius.state.x,prius.state.z))<3&&Math.hypot(x-prius.state.x,z-prius.state.z)<8)return true;
        return [...nearbyColliders(x,z,6),...traffic.obstacles()].some(b=>y<groundLevel(b.x,b.z)+((b as Block).h??2)+.25&&Math.abs(x-b.x)<b.w/2+5.7&&Math.abs(z-b.z)<b.d/2+5.7);
      }
    },x,z,ceiling);
  }
  function findHelicopterSpot(x:number,z:number,heading:number,nearby=false){
    const ceiling=nearby?position.y+.65:groundLevel(x,z)+2;
    if(!nearby){const spot=clearHelicopterSpot(x,z,ceiling);if(spot)return spot;}
    for(const radius of nearby?[8,13,20,30]:[10,18,28])for(let i=0;i<12;i++){
      const angle=heading-Math.PI/2+i*Math.PI/6,px=x-Math.sin(angle)*radius,pz=z-Math.cos(angle)*radius;
      const spot=clearHelicopterSpot(px,pz,ceiling);if(spot)return spot;
    }
    return null;
  }
  function tellFlight(message:string){flightMessage=message;flightMessageUntil=performance.now()+4200;publishHelicopter();}
  function publishHelicopter(){const h=helicopter.state;callbacks.helicopter?.({loaded:helicopter.loaded,failed:helicopter.failed,piloting:helicopter.piloting,near:helicopter.near(position),speed:Math.round(Math.hypot(h.vx,h.vz)*3.6),altitude:Math.max(0,Math.round(h.y-groundLevel(h.x,h.z))),rotor:Math.round(h.rotor*100),grounded:h.grounded,landing:helicopter.landing,message:performance.now()<flightMessageUntil?flightMessage:h.waiting&&helicopter.piloting?'Se pregătește zona din față · zborul continuă.':h.contact&&helicopter.piloting?'Obstacol · urcă sau schimbă direcția.':''});}
  function flightAction(action:HelicopterAction){
    if(mapOpen||menuOpen||!readySent)return;
    if(!helicopter.loaded){helicopter.load();tellFlight(helicopter.failed?'Elicopterul nu s-a încărcat. Reîncarcă pagina pentru a reîncerca.':'Se încarcă elicopterul…');return;}
    if(prius.driving){tellFlight('Coboară din mașină pentru a folosi elicopterul.');return;}
    if(action==='spawn'){
      if(helicopter.piloting){tellFlight('Ieși din elicopter înainte de a-l genera din nou.');return;}
      const spot=findHelicopterSpot(position.x,position.z,yaw,true);if(!spot){tellFlight('Nu este suficient loc liber. Mergi într-o piață sau într-un parc și încearcă din nou.');return;}
      helicopter.place(spot.x,spot.z,flightTest?-Math.PI/2:yaw,spot.y+(flightTest?35:0));
      if(flightTest){helicopter.setPiloting(true);helicopter.hover();position.copy(helicopter.root.position);player.root.visible=false;yaw=targetYaw=-Math.PI/2;targetPitch=pitch=.08;carOrbit=0;vehicleSnap=true;paused=false;callbacks.paused(false);}
      started=true;callbacks.started?.();tellFlight('Elicopter generat.');publishHelicopter();return;
    }
    if(action==='interact'){
      if(helicopter.piloting){
        const h=helicopter.state,point=helicopter.exitPoint((x,z,y)=>canMove(x,z,x,z,y))??helicopter.local(0,3.5,0);
        ejectWalker(walker,point,{x:h.vx,y:h.vy,z:h.vz});
        helicopter.setPiloting(false);position.copy(point);targetYaw=yaw=helicopter.state.heading;targetPitch=pitch=.08;player.root.position.copy(point);player.root.visible=!firstPerson;
        if(!h.grounded)tellFlight('Ai sărit din elicopter · te ridici automat după cădere.');
        camera.position.set(point.x+Math.sin(yaw)*5.6,point.y+3,point.z+Math.cos(yaw)*5.6);
      }else{
        if(!helicopter.near(position)){tellFlight('Elicopterul este în fața Catedralei. Îl poți genera și lângă tine.');return;}
        helicopter.setPiloting(true);helicopter.hover();position.copy(helicopter.root.position);player.root.visible=false;carOrbit=0;targetPitch=pitch=.08;vehicleSnap=true;
      }
      started=true;paused=false;clearInput();callbacks.started?.();callbacks.paused(false);requestLock();publishHelicopter();return;
    }
    if(!helicopter.piloting)return;
    clearInput();if(action==='land')helicopter.land();else helicopter.hover();paused=false;callbacks.paused(false);requestLock();publishHelicopter();
  }
  function requestLock(){canvas.focus();if(!mobile&&document.pointerLockElement!==canvas){try{const p=canvas.requestPointerLock?.();if(p&&typeof(p as Promise<void>).catch==='function')(p as Promise<void>).catch(()=>{});}catch{}}}
  function start(){if(mapOpen||menuOpen)return;if(!readySent)return;started=true;paused=false;callbacks.started?.();callbacks.paused(false);requestLock();}
  function switchCamera(){firstPerson=!firstPerson;prius.cabin(prius.driving&&firstPerson);vehicleSnap=true;callbacks.camera?.(firstPerson);return firstPerson;}
  function teleport(place:Place){
    if(!readySent||travel.target)return;
    const points={arc:[21,-3.5,0],catedrala:[GAME_SPAWN.player.x,GAME_SPAWN.player.z,GAME_SPAWN.player.heading],stefan:[LANDMARKS.stefan[0],LANDMARKS.stefan[1]-14,PI],sciusev:[1071,612.3,0],sciusevWest:[905,624,Math.PI],sciusevAlecsandri:[706,621,Math.PI],alecsandriVa05:[629,584,0],alecsandriVa06:[629,410,0],bucurestiBu01:[710,467,-Math.PI/2],bucurestiBu02:[910,469,-Math.PI/2],bucurestiBu03:[1114,469,-Math.PI/2],bucurestiBu04:[1334,469,-Math.PI/2],bucurestiBu05:[1515,470,-Math.PI/2],bucurestiBu06:[1638,460.75,-Math.PI/2],bucurestiBu07:[560,461.7,Math.PI/2],bucurestiBu08:[400,462,Math.PI/2],bucurestiBu09:[245,461.7,Math.PI/2],bucurestiBu10:[0,475,Math.PI/2],bucurestiBu11:[-215,478,Math.PI/2],alecsandriVa07:[627,240,0],alecsandriVa08:[624,-130,0],alecsandriVa09:[623.3,-296,0],alecsandriVa10:[623.4,-388,0],alecsandriVa11:[622.9,-454,0],alecsandriVa12:[618.4,-556,0],alecsandriVa13:[618,-731,0],alecsandriVa14:[617.5,-906,0],sciusevEminescu:[554,621,Math.PI],sciusevParcalab:[410,621,Math.PI],sciusevPuskin:[269,620,Math.PI],sciusevBodoni:[25,620,Math.PI],sciusevIorga:[-202,621,Math.PI],sciusevCebotari:[-356,622,Math.PI],sciusevSfatul:[-520,624,Math.PI],sciusevLazo:[-675,625,Math.PI],sciusevStere:[-807,626,Math.PI],sciusevPrometeu:[-913.5,630,Math.PI],sciusev121:[-868,798,Math.PI/2],sciusevBend:[-981,610,Math.PI/3],sciusevNorth:[-1031,574,Math.PI/3],ionCreanga:[-2018,19,Math.PI/2],ionCreangaDendrarium:[-2060.4,430,Math.PI/2],dendrarium:[-1993,625,-Math.PI/2],dendrariumLake:[-1668,416,Math.PI]};
    const p=points[place];
    void travel.request(localToGeo(p[0],p[1])).then(()=>{targetYaw=yaw=p[2];targetPitch=pitch=.08;paused=false;callbacks.paused(false);}).catch(error=>{if(error.name!=='AbortError')callbacks.error(error.message);});
  }
  const savedMapCamera={position:new T.Vector3(),quaternion:new T.Quaternion(),fov:58,near:.12};
  const landingFrom=new T.Vector3(),landingTo=new T.Vector3();
  const travel=createMapTravel({
    begin(){
      savedMapCamera.position.copy(camera.position);savedMapCamera.quaternion.copy(camera.quaternion);savedMapCamera.fov=camera.fov;savedMapCamera.near=camera.near;
      clearInput();paused=true;callbacks.paused(true);callbacks.preparing?.(true);callbacks.progress?.('Se pregătesc drumurile și clădirile de la destinație…');canvas.style.opacity='0';
    },
    restore(){camera.position.copy(savedMapCamera.position);camera.quaternion.copy(savedMapCamera.quaternion);camera.fov=savedMapCamera.fov;camera.near=savedMapCamera.near;camera.updateProjectionMatrix();canvas.style.opacity=readySent?'1':'0';callbacks.preparing?.(false);},
    loaded:(x,z)=>streets.loaded(x,z,true),
    prepared:sceneryReady,
    clear(x,z){
      const floor=streets.surface(x,z,groundLevel(x,z)+2);
      if(!canMove(x,z,x,z,floor))return false;
      landingFrom.set(x,floor+.7,z);landingTo.set(x,floor+1200,z);
      // Roofs above ground identify enclosed footprints, even when no wall is nearby.
      return streets.raycast(landingFrom,landingTo,false)===null;
    },
    commit(x,z){
      helicopter.setPiloting(false);
      if(prius.driving)prius.setDriving(false);leaveTrafficCar();prius.cabin(false);clearInput();
      position.set(x,streets.surface(x,z,groundLevel(x,z)+2),z);resetWalker();targetPitch=pitch=.08;player.root.position.copy(position);player.root.visible=!firstPerson;
      camera.position.set(x+Math.sin(yaw)*(firstPerson?0:5.6),position.y+(firstPerson?1.65:3.05),z+Math.cos(yaw)*(firstPerson?0:5.6));
      camera.lookAt(x-Math.sin(yaw)*10,position.y+1.52,z-Math.cos(yaw)*10);camera.fov=baseFov;camera.updateProjectionMatrix();
      started=true;paused=true;pausedBeforeMap=false;callbacks.started?.();callbacks.paused(true);publishVehicle();updateLocation();drawMap();canvas.style.opacity='1';callbacks.preparing?.(false);
    }
  });
  function getMapPosition(){return{...localToGeo(position.x,position.z),bearing:localBearing(yaw)*180/Math.PI};}
  function teleportTo(point:MapPoint,signal?:AbortSignal){
    if(!readySent)return Promise.reject(new Error('Așteaptă încărcarea jocului înainte de teleportare.'));
    return travel.request(point,signal);
  }
  function setMenuOpen(open:boolean){
    menuOpen=open;clearInput();
    if(open){helicopterAudio?.update(0,0,false);paused=true;callbacks.paused(true);document.exitPointerLock?.();}
  }
  function setMapOpen(open:boolean){
    if(open===mapOpen)return;
    if(open){helicopterAudio?.update(0,0,false);pausedBeforeMap=!started||paused;mapOpen=true;clearInput();paused=true;callbacks.paused(true);document.exitPointerLock?.();}
    else{travel.cancel();mapOpen=false;clearInput();paused=pausedBeforeMap;callbacks.paused(paused);if(started&&!paused)requestLock();}
  }
  const onKeyDown=(e:KeyboardEvent)=>{
    if(mapOpen||menuOpen||travel.target)return;
    if(['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName))return;
    if(e.code==='Space'&&(e.target as HTMLElement)?.closest('button'))return;
    if(['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','ControlLeft','ControlRight','KeyC','KeyV','KeyE','KeyR','KeyP','KeyL','KeyH','KeyG'].includes(e.code)){
      e.preventDefault();if(!started)return;keys.add(e.code);
      if(!e.repeat){if(e.code==='Space')jump();if(e.code==='KeyV')switchCamera();
        if(e.code==='KeyE')interact();if(e.code==='KeyG')weaponAction('drop');if(e.code==='KeyR'&&!prius.driving&&!helicopter.piloting)weaponAction('reload');
        const actions:Record<string,VehicleAction>={KeyP:'park',KeyL:'lights',KeyH:'horn'};if(actions[e.code])vehicle(actions[e.code]);}
    }
    if(e.code==='Escape'){paused=true;clearInput();callbacks.paused(true);}
  };
  const onKeyUp=(e:KeyboardEvent)=>keys.delete(e.code);
  const onBlur=()=>{helicopterAudio?.update(0,0,false);clearInput();if(started){paused=true;callbacks.paused(true);}};
  const onLockChange=()=>{if(started){paused=mapOpen||menuOpen||!!travel.target||document.pointerLockElement!==canvas;callbacks.paused(paused);clearInput();}};
  function look(dx:number,dy:number){
    if(mapOpen||menuOpen)return;
    if(prius.driving||helicopter.piloting){carOrbit=T.MathUtils.clamp(carOrbit-dx,firstPerson?-1.65:-Math.PI,firstPerson?1.65:Math.PI);carLookTimer=2.5;}
    else targetYaw-=dx;
    targetPitch=T.MathUtils.clamp(targetPitch+dy,firstPerson&&(prius.driving||helicopter.piloting)?-.5:-.45,firstPerson&&(prius.driving||helicopter.piloting)?.5:.9);
  }
  const onMouse=(e:MouseEvent)=>{if(started&&document.pointerLockElement===canvas)look(e.movementX*.0022,e.movementY*.0017);};
  let dragPointer:number|null=null,lastX=0,lastY=0;
  const onPointerDown=(e:PointerEvent)=>{if(mapOpen||menuOpen)return;if(!started)return;if(e.pointerType==='mouse'&&document.pointerLockElement===canvas&&weapon.state.equipped&&!prius.driving&&!helicopter.piloting){if(e.button===0)weaponAction('fire');if(e.button===2)weaponAction('aim');}if(e.pointerType==='touch'||document.pointerLockElement!==canvas){dragPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);paused=false;callbacks.paused(false);}if(e.pointerType==='mouse')requestLock();};
  const onPointerMove=(e:PointerEvent)=>{if(e.pointerId!==dragPointer||document.pointerLockElement===canvas)return;look((e.clientX-lastX)*.005,(e.clientY-lastY)*.004);lastX=e.clientX;lastY=e.clientY;};
  const onPointerUp=()=>{dragPointer=null;};
  const onMouseUp=(e:MouseEvent)=>{if(e.button===0)weapon.fire(false);if(e.button===2)weapon.aim(false);};
  const onContextMenu=(e:MouseEvent)=>{if(weapon.state.equipped)e.preventDefault();};
  document.addEventListener('mouseup',onMouseUp);canvas.addEventListener('contextmenu',onContextMenu);
  document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);document.addEventListener('pointerlockchange',onLockChange);document.addEventListener('mousemove',onMouse);canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',onPointerUp);
  const joy=document.getElementById('joystick'),knob=document.getElementById('joystick-knob'),jumpButton=document.getElementById('touch-jump');let joyPointer:number|null=null;
  const joyMove=(e:PointerEvent)=>{if(joyPointer!==e.pointerId||!joy)return;const b=joy.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,d=Math.hypot(x,y),factor=d>35?35/d:1;input.x=x*factor/35;input.y=-y*factor/35;if(knob)knob.style.transform=`translate(${x*factor}px,${y*factor}px)`;};
  const joyDown=(e:PointerEvent)=>{if(mapOpen||menuOpen)return;e.preventDefault();e.stopPropagation();joyPointer=e.pointerId;joy?.setPointerCapture(e.pointerId);paused=false;callbacks.paused(false);joyMove(e);};
  const joyEnd=()=>{joyPointer=null;input.x=input.y=0;if(knob)knob.style.transform='';};
  joy?.addEventListener('pointerdown',joyDown);joy?.addEventListener('pointermove',joyMove);joy?.addEventListener('pointerup',joyEnd);joy?.addEventListener('pointercancel',joyEnd);jumpButton?.addEventListener('pointerdown',jump);

  // Synthesized park ambience is opt-in and runs only in this tab.
  let audioContext:AudioContext|null=null,audioGain:GainNode|null=null,audioOn=false,nextBird=0;
  function sound(){
    if(!audioContext){audioContext=new AudioContext();audioGain=audioContext.createGain();audioGain.gain.value=0;audioGain.connect(audioContext.destination);const buffer=audioContext.createBuffer(1,audioContext.sampleRate*3,audioContext.sampleRate);const arr=buffer.getChannelData(0);let prev=0;for(let i=0;i<arr.length;i++){prev=(prev+Math.random()*.03-.015)/1.01;arr[i]=prev;}const source=audioContext.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;source.connect(filter);filter.connect(audioGain);source.start();carAudio=createCarAudio(audioContext,audioGain);helicopterAudio=createHelicopterAudio(audioContext,audioGain);}
    audioOn=!audioOn;audioContext.resume().catch(()=>{});audioGain!.gain.setTargetAtTime(audioOn?.3:0,audioContext.currentTime,.4);callbacks.sound?.(audioOn);return audioOn;
  }
  function weaponSound(kind:GunSound){if(!audioContext)sound();if(audioOn&&audioContext&&audioGain)playGunSound(audioContext,audioGain,kind);}
  function chirp(){if(!audioOn||!audioContext||!audioGain)return;const now=audioContext.currentTime;for(let i=0;i<3;i++){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.setValueAtTime(1900+i*220,now+i*.15);o.frequency.exponentialRampToValueAtTime(3400-i*300,now+i*.15+.08);g.gain.setValueAtTime(0,now+i*.15);g.gain.linearRampToValueAtTime(.022,now+i*.15+.03);g.gain.exponentialRampToValueAtTime(.001,now+i*.15+.13);o.connect(g);g.connect(audioGain);o.start(now+i*.15);o.stop(now+i*.15+.14);}}

  const minimap=createGameMinimap(map);
  function drawMap(){minimap.draw(position.x,position.z,yaw,prius.loaded?prius.state:undefined,helicopter.placed?helicopter.state:undefined);}
  let lastLocation='';
  function updateLocation(){const point=localToGeo(position.x,position.z);const central=position.x>CITY_DATA.bounds[0]&&position.x<CITY_DATA.bounds[2]&&position.z>CITY_DATA.bounds[1]&&position.z<CITY_DATA.bounds[3];const label=central?mapPhysics.label(position.x,position.z):`${point.lat.toFixed(4)}° N · ${point.lon.toFixed(4)}° E`;if(label!==lastLocation){lastLocation=label;callbacks.location(label);}}

  const lifecycle=new AbortController();
  const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;
  if(context?.registerTool){try{void Promise.resolve(context.registerTool({name:'navigate_chisinau_landmark',title:'Mergi la un reper din Chișinău',description:'Mută vizitatorul la Arcul de Triumf, Catedrală sau monumentul lui Ștefan cel Mare în orașul 3D.',inputSchema:{type:'object',properties:{landmark:{type:'string',enum:['arc','catedrala','stefan']}},required:['landmark'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input:unknown){const p=(input as{landmark?:string})?.landmark;if(!['arc','catedrala','stefan'].includes(p??''))throw new Error('Alege arc, catedrala sau stefan.');teleport(p as Place);return{landmark:p,location:lastLocation};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}

  const deviceMemory=(navigator as Navigator&{deviceMemory?:number}).deviceMemory??8,cpuCores=navigator.hardwareConcurrency??8;
  const initialQuality=mobile||deviceMemory<=4||cpuCores<=4?2:1;
  let frame=0,last=performance.now(),elapsed=0,mapTimer=0,frameCount=0,perfTime=0,worstFrameMs=0,qualityTier=initialQuality,stableWindows=0;
  let pixelRatio=Math.max(.7,resolutionLimit()-initialQuality*.1),appliedPixelRatio=pixelRatio,nextHelicopterPlacement=0;renderer.setPixelRatio(pixelRatio);
  const applyPixelRatio=(flight=false)=>{
    const desired=Math.min(pixelRatio,flight?(mobile?.60:.72):Infinity);
    if(Math.abs(desired-appliedPixelRatio)>.001){appliedPixelRatio=desired;renderer.setPixelRatio(desired);}
  };
  const baseFov=58;
  function animate(now:number){
    if(disposed)return;frame=requestAnimationFrame(animate);const realDt=Math.min((now-last)/1000,.3);const dt=Math.min(realDt,.05);last=now;if(document.hidden)return;if(!started||!paused)elapsed+=dt;
    const destination=travel.target;
    if(destination){
      const floor=groundLevel(destination.x,destination.z);
      camera.position.set(destination.x+Math.sin(yaw)*8,floor+14,destination.z+Math.cos(yaw)*8);camera.lookAt(destination.x,floor+1,destination.z);camera.near=.12;camera.fov=58;camera.updateProjectionMatrix();
      visibility.prepare(qualityTier);mapModels.update(camera,now,destination,false,true);landmarks.setImported(mapModels.readyIds);landmarks.update(camera,now);government.update(camera,now);opera.update(camera,now);updateScenery(now,true,destination);streets.render(camera,destination.x,destination.z,now,Math.min(1.1,pixelRatio),{x:0,z:0},nativePreparationRadius(destination.x,destination.z,preparationRadius));
      travel.step();
      // Commit/cancel changes the camera. Render that exact view before React
      // removes the loading cover, without exposing the elevated staging view.
      if(!travel.target){updateScenery(now);streets.render(camera,position.x,position.z,now,Math.min(1.1,pixelRatio),{x:0,z:0},nativePreparationRadius(position.x,position.z,0));}
      renderer.render(scene,camera);return;
    }
    // The 2D map remains interactive without rendering the paused 3D scene.
    if(mapOpen&&readySent)return;
    courtyardGates.advance(started&&!paused?dt:0,position);
    if(prius.loaded&&prius.model&&!playerCarDamage)playerCarDamage=createCarDamage(prius.root,prius.model,effects.burst,()=>tellCar('Prius avariat · readu mașina pentru reparație.'));
    if(!readySent&&!readyCompiling&&streets.ready&&streets.loaded(position.x,position.z,true)&&landmarks.ready&&sceneryReady(position.x,position.z))compileAndReveal();
    if(helicopter.loaded&&!helicopter.placed&&readySent&&now>=nextHelicopterPlacement){nextHelicopterPlacement=now+1000;const spot=findHelicopterSpot(HELICOPTER.home.x,HELICOPTER.home.z,0);if(spot)helicopter.place(spot.x,spot.z,0,spot.y);}
    if(started&&helicopter.piloting){
      const lift=(keys.has('Space')||pedals.up||flightTest&&position.y-groundLevel(position.x,position.z)<32?1:0)-(keys.has('KeyC')||keys.has('ControlLeft')||keys.has('ControlRight')||pedals.down?1:0);
      const forward=(keys.has('KeyW')||keys.has('ArrowUp')||pedals.throttle||flightTest?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||pedals.brake?1:0)+input.y;
      const turn=(keys.has('KeyD')||keys.has('ArrowRight')||pedals.right?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||pedals.left?1:0)+input.x+(flightTest?.08:0);
      if(!paused&&(lift||forward||turn)&&helicopter.landing)helicopter.hover();
      helicopter.update(paused?0:dt,{forward,turn,lift,boost:flightTest||keys.has('ShiftLeft')||keys.has('ShiftRight')||pedals.boost,land:false},true);
      const h=helicopter.state;position.set(h.x,h.y,h.z);player.root.visible=false;
      if(!paused){carLookTimer=Math.max(0,carLookTimer-dt);if(carLookTimer===0)carOrbit=T.MathUtils.damp(carOrbit,0,2.5,dt);}
      yaw=h.heading+carOrbit;pitch=T.MathUtils.damp(pitch,targetPitch,10,dt);
      if(firstPerson){
        // The supplied model has no separate interior; place the camera at the nose.
        desiredCamera.copy(helicopter.local(0,1.75,-4.3));camera.position.copy(desiredCamera);
        carLook.set(-Math.sin(yaw)*20,-Math.sin(pitch)*20,-Math.cos(yaw)*20).add(camera.position);camera.lookAt(carLook);
      }else{
        viewTarget.set(h.x,h.y+1.7,h.z);const distance=15+Math.min(Math.hypot(h.vx,h.vz)*.1,3);
        desiredCamera.set(h.x+Math.sin(yaw)*distance,h.y+5.8+Math.sin(pitch)*10,h.z+Math.cos(yaw)*distance);
        // At flight altitude the terrain cannot enter the short chase-camera
        // segment. Omitting its 120x120 triangle grid removes a full terrain
        // raycast every frame while building collision remains exact.
        const contact=streets.raycast(viewTarget,desiredCamera,false);if(contact!==null)desiredCamera.lerpVectors(viewTarget,desiredCamera,Math.max(.12,contact-.04));
        if(vehicleSnap)camera.position.copy(desiredCamera);else camera.position.lerp(desiredCamera,1-Math.exp(-5*dt));camera.lookAt(viewTarget);
      }
      vehicleSnap=false;camera.near=firstPerson?.08:.12;camera.fov=T.MathUtils.damp(camera.fov,firstPerson?73:64,5,dt);camera.updateProjectionMatrix();
      positionSun(h.x,h.y,h.z);
    }else if(started&&prius.driving){
      const back=keys.has('KeyS')||keys.has('ArrowDown')||pedals.brake||input.y<-.05;
      const forward=keys.has('KeyW')||keys.has('ArrowUp')||pedals.throttle||input.y>.05;
      const c=prius.state;
      if(!paused&&back!==forward&&Math.abs(c.speed)<.18){
        if(back&&c.gear!=='R')prius.gearTo('R');
        if(forward&&c.gear!=='D')prius.gearTo('D');
      }
      const against=(back&&c.gear==='D')||(forward&&c.gear==='R');
      driveInput.brake=paused||against||(back&&forward)?1:0;
      driveInput.throttle=paused||against||back===forward?0:1;
      driveInput.steer=paused?0:(keys.has('KeyD')||keys.has('ArrowRight')||pedals.right?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||pedals.left?1:0)+input.x;
      driveInput.handbrake=keys.has('Space');
      driveInput.offroad=mapPhysics.parks.some(f=>featureContains([c.x,c.z],f))&&!mapPhysics.onPaved(c.x,c.z);
      const damage=activeTraffic?.damage??playerCarDamage;
      if(damage?.flatCount){driveInput.steer+=damage.pull;driveInput.throttle*=.78;driveInput.offroad=true;}
      prius.update(paused?0:dt,driveInput,!paused);
      if(c.impact>1&&elapsed-lastImpact>1){tellCar('Obstacol. Frânează și manevrează cu grijă.');lastImpact=elapsed;}
      position.set(c.x,groundLevel(c.x,c.z),c.z);player.root.visible=false;
      if(!paused){carLookTimer=Math.max(0,carLookTimer-dt);if(carLookTimer===0)carOrbit=T.MathUtils.damp(carOrbit,0,2.5,dt);}
      yaw=c.heading+carOrbit;pitch=T.MathUtils.damp(pitch,targetPitch,12,dt);
      if(firstPerson){
        prius.local(-.34,1.12,-.28,desiredCamera);camera.position.copy(desiredCamera);
        carLook.set(-Math.sin(yaw)*10,-Math.sin(pitch)*10,-Math.cos(yaw)*10).add(camera.position);camera.lookAt(carLook);
      }else{
        viewTarget.set(c.x,position.y+1.05,c.z);const distance=6.7+Math.min(Math.abs(c.speed)*.035,1.3);
        desiredCamera.set(c.x+Math.sin(yaw)*distance,position.y+2.65+Math.sin(pitch)*4,c.z+Math.cos(yaw)*distance);
        cameraDelta.copy(desiredCamera).sub(viewTarget);const length=cameraDelta.length();cameraRay.set(viewTarget,cameraDelta.normalize());let nearest=length;
        for(const block of queryCameraBlocks(viewTarget,desiredCamera)){const hit=cameraRay.intersectBox(block,cameraHit);if(hit)nearest=Math.min(nearest,hit.distanceTo(viewTarget));}
        const mapContact=streets.raycast(viewTarget,desiredCamera);if(mapContact!==null)nearest=Math.min(nearest,length*mapContact);
        if(nearest<length)desiredCamera.copy(viewTarget).addScaledVector(cameraDelta,Math.max(1,nearest-.3));
        if(vehicleSnap)camera.position.copy(desiredCamera);else camera.position.lerp(desiredCamera,1-Math.exp(-7*dt));camera.lookAt(viewTarget);
      }
      vehicleSnap=false;camera.near=firstPerson?.045:.12;
      camera.fov=T.MathUtils.damp(camera.fov,(firstPerson?72:61)+Math.min(Math.abs(c.speed)*.16,6),5,dt);camera.updateProjectionMatrix();
      positionSun(c.x,groundLevel(c.x,c.z),c.z);
    }else if(started){
      camera.near=.12;
      yaw=T.MathUtils.damp(yaw,targetYaw,17,dt);pitch=T.MathUtils.damp(pitch,targetPitch,17,dt);
      const forwardInput=paused?0:(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+input.y;
      const sideInput=paused?0:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+input.x;
      const run=keys.has('ShiftLeft')||keys.has('ShiftRight');
      forward.set(-Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));move.copy(forward).multiplyScalar(forwardInput).addScaledVector(right,sideInput);if(move.length()>1)move.normalize();
      const moving=move.length()>.02&&walker.recovery===0;
      const speed=run?7:3.25;
      advanceWalker(walker,{x:move.x*speed,z:move.z*speed},paused?0:dt,walkWorld);position.set(walker.x,walker.y,walker.z);
      const tumbling=walker.recovery>0;
      if(moving){const angle=Math.atan2(move.x,move.z),diff=Math.atan2(Math.sin(angle-player.root.rotation.y),Math.cos(angle-player.root.rotation.y));player.root.rotation.y+=diff*Math.min(1,dt*12);walkPhase+=dt;}
      else walkPhase+=paused?0:dt*.3;
      if(weapon.state.equipped&&!tumbling)player.root.rotation.y=yaw+PI;
      player.root.position.copy(position);player.root.visible=!firstPerson||tumbling;animatePerson(player,walkPhase,moving,run);
      if(playerMixer){const next=moving?(run?'Run':'Walk'):'Idle';if(next!==playerAction){playerActions[playerAction]?.fadeOut(.2);playerActions[next]?.reset().fadeIn(.2).play();playerAction=next;}playerMixer.update(paused?0:dt);}
      if(tumbling){
        player.root.rotation.y=walker.heading;
        const stand=Math.min(1,walker.recovery/.65),angle=(walker.grounded?Math.PI/2+Math.sin(walker.roll)*.65:.65)*stand;
        playerVisual.rotation.set(angle,0,Math.sin(walker.roll*1.7)*.32*stand);
        // Rotate around the torso, keeping the body above the roof or pavement.
        const centerHeight=walker.grounded?.91*Math.abs(Math.cos(angle))+.24*Math.abs(Math.sin(angle)):.91;
        playerVisual.position.set(0,centerHeight-.91*Math.cos(angle),-.91*Math.sin(angle));
        player.limbs[1].rotation.x=player.limbs[5].rotation.x=.8*stand;
        for(const name of ['mixamorigLeftLeg','mixamorigRightLeg']){const bone=playerVisual.getObjectByName(name);if(bone)bone.rotation.x=.8*stand;}
      }else{playerVisual.rotation.set(0,0,0);playerVisual.position.set(0,0,0);}
      const floor=position.y;
      viewTarget.set(position.x,floor+(tumbling?.9:1.52),position.z);
      if(firstPerson&&!tumbling){camera.position.copy(viewTarget);camera.lookAt(position.x-Math.sin(yaw)*10,1.52+floor-Math.sin(pitch)*10,position.z-Math.cos(yaw)*10);}
      else{const armed=weapon.state.equipped&&!tumbling,distance=armed?3.2:tumbling?7:5.6,shoulder=armed?.65:0;
        desiredCamera.set(position.x+Math.sin(yaw)*distance+Math.cos(yaw)*shoulder,(armed?1.95:2.6)+floor+Math.sin(pitch)*distance,position.z+Math.cos(yaw)*distance-Math.sin(yaw)*shoulder);
        const delta=cameraDelta.copy(desiredCamera).sub(viewTarget);cameraRay.set(viewTarget,forward.copy(delta).normalize());let nearest=delta.length();for(const block of queryCameraBlocks(viewTarget,desiredCamera)){const hit=cameraRay.intersectBox(block,cameraHit);if(hit)nearest=Math.min(nearest,hit.distanceTo(viewTarget));}const mapContact=streets.raycast(viewTarget,desiredCamera);if(mapContact!==null)nearest=Math.min(nearest,delta.length()*mapContact);if(nearest<delta.length())desiredCamera.copy(viewTarget).addScaledVector(delta.normalize(),Math.max(.45,nearest-.3));camera.position.lerp(desiredCamera,1-Math.exp(-9*dt));
        if(armed){carLook.set(position.x-Math.sin(yaw)*40,1.52+floor-Math.sin(pitch)*40,position.z-Math.cos(yaw)*40);camera.lookAt(carLook);}else camera.lookAt(viewTarget);
      }
      const desiredFov=weapon.state.equipped&&weapon.aiming?44:baseFov+(run&&moving?5:0);camera.fov=T.MathUtils.damp(camera.fov,desiredFov,4,dt);camera.updateProjectionMatrix();
      positionSun(position.x,position.y,position.z);
    }else{
      const drift=Math.sin(elapsed*.055)*1.7,floor=streets.surface(position.x,position.z,groundLevel(position.x,position.z)+2),view=GAME_SPAWN.camera;position.y=floor;resetWalker();player.root.position.y=floor;camera.position.set(view.x+drift,floor+view.y,view.z);camera.lookAt(view.targetX,floor+view.targetY,view.targetZ);positionSun(position.x,floor,position.z);
    }
    if(!started&&playerMixer)playerMixer.update(dt);
    if(!prius.driving)prius.update(started&&paused?0:dt,driveInput,false);
    if(carAudio)carAudio.update(prius.state.speed,driveInput.throttle,prius.state.mode==='HYBRID',prius.state.gear==='R',audioOn&&prius.driving&&!paused);
    const simulationDt=started&&paused?0:dt;
    const movementSpeed=helicopter.piloting?Math.hypot(helicopter.state.vx,helicopter.state.vz):prius.driving?Math.abs(prius.state.speed):Math.hypot(walker.vx,walker.vz);
    const motionCritical=started&&!paused&&movementSpeed>.25;
    const altitude=Math.max(0,position.y-groundLevel(position.x,position.z));
    visibility.prepare(qualityTier,altitude,helicopter.piloting);
    applyPixelRatio(helicopter.piloting);
    if(!helicopter.piloting)helicopter.update(simulationDt,IDLE_FLIGHT,visibility.sees(helicopter.root.position,7,220));
    if(helicopterAudio)helicopterAudio.update(helicopter.state.rotor,helicopter.piloting?0:helicopter.root.position.distanceTo(position),audioOn&&!paused);
    if(prius.loaded){prius.root.visible=prius.driving||visibility.sees(prius.root.position,3,180);if(prius.root.visible&&!prius.root.parent)scene.add(prius.root);else if(!prius.root.visible&&prius.root.parent)scene.remove(prius.root);}
    traffic.update(simulationDt,prius.loaded?prius.state:null,started&&!prius.driving&&!helicopter.piloting?position:undefined);if(!activeTraffic)playerCarDamage?.update(simulationDt,prius.state.speed);
    // Creating every crowd clone in a single download callback used to stall a
    // frame. Keep the procedural people visible while dressing a few at a time.
    const crowdDeadline=performance.now()+.8;let crowdSteps=0;
    while(crowdJobs.length&&crowdSteps++<2&&performance.now()<crowdDeadline)crowdJobs.shift()!();
    visiblePeople.length=0;
    npcs.forEach((n,i)=>{
      const immediate=n.distance<30*30||n.p.root.visible&&Number.isFinite(n.distance);
      const update=immediate||elapsed>=n.nextUpdate;
      if(update){n.nextUpdate=elapsed+.35+(i%5)*.035;
      if(n.down){if(simulationDt){n.hitDelay=Math.max(0,n.hitDelay-simulationDt);if(n.hitDelay===0){n.fallVelocity+=simulationDt*5.8;n.fall=Math.min(PI/2,n.fall+n.fallVelocity*simulationDt);n.p.root.rotation.x=n.fall*n.fallSign;n.p.root.position.y=groundLevel(n.p.root.position.x,n.p.root.position.z)+Math.sin(n.fall)*.19;n.p.limbs[1].rotation.x=.6*Math.sin(n.fall);n.p.limbs[5].rotation.x=.3*Math.sin(n.fall);}}}else{
      const a=elapsed*n.speed+n.phase,phase=(Math.sin(a)+1)*.5*(n.route.length-1),index=Math.min(n.route.length-2,Math.floor(phase)),t=phase-index,p=n.route[index],q=n.route[index+1],direction=Math.cos(a)>0?1:-1;
      n.p.root.position.set(p[0]+(q[0]-p[0])*t,0,p[1]+(q[1]-p[1])*t);n.p.root.position.y=groundLevel(n.p.root.position.x,n.p.root.position.z);n.p.root.rotation.y=Math.atan2((q[0]-p[0])*direction,(q[1]-p[1])*direction);}
      }
      n.distance=n.p.root.position.distanceToSquared(camera.position);if(visibility.sees(n.p.root.position,2.3,mobile?100:140))visiblePeople.push(n);
    });
    visiblePeople.sort((a,b)=>a.distance-b.distance);visiblePeople.length=Math.min(visiblePeople.length,mobile?36:56);const selectedPeople=new Set(visiblePeople);
    npcs.forEach((n,i)=>{const active=selectedPeople.has(n);n.p.root.visible=active;if(active){
      if(!n.down&&simulationDt){if(n.mixer)n.mixer.update(simulationDt);else if(n.custom)n.custom.position.y=Math.sin(elapsed*6+n.phase)*.025;else animatePerson(n.p,elapsed+i,true);}
      const shadow=n.distance<35*35;if(shadow!==n.shadows){n.meshes.forEach(m=>m.castShadow=shadow);n.shadows=shadow;}
      if(n.custom&&!n.p.root.parent)scene.add(n.p.root);
    }else if(n.p.root.parent)scene.remove(n.p.root);});
    crowd.update(visiblePeople.filter(n=>!n.custom));
    birds.forEach((b,i)=>{if(!b.visible||!simulationDt)return;const distance=Math.hypot(b.position.x-position.x,b.position.z-position.z);if(started&&distance<2.8){b.userData.flight=Math.min(2.3,(b.userData.flight??0)+dt*3);b.position.x+=dt*2;}else{b.userData.flight=Math.max(0,(b.userData.flight??0)-dt*.5);b.rotation.y=Math.sin(elapsed*.3+i)*2;}b.position.y=groundLevel(b.position.x,b.position.z)+(b.userData.flight??0);});
    effects.update(simulationDt);
    weapon.update(paused?0:dt,position,yaw,pitch,firstPerson,started&&!paused,prius.driving||helicopter.piloting||walker.recovery>0,position.y,bulletBlocks);
    if(weapon.state.equipped&&!prius.driving&&!helicopter.piloting&&!firstPerson&&walker.recovery===0){if(playerMixer)weapon.poseAvatar(player.root);else{player.limbs[2].rotation.x=-1.3;player.limbs[6].rotation.x=-1.35;player.limbs[3].rotation.x=-.45;player.limbs[7].rotation.x=-.4;}}
    if(audioOn&&elapsed>nextBird){chirp();nextBird=elapsed+rnd(4,10);}
    mapTimer+=dt;if(mapTimer>.1){drawMap();updateLocation();publishVehicle();publishHelicopter();callbacks.weapon?.(weapon.hud(position));callbacks.gate?.(started&&!prius.driving&&!helicopter.piloting?courtyardGates.hud(position):{near:false,open:false,name:''});mapTimer=0;}
    // Adjust fill rate and view distance gradually; geometry outside the view stays dormant.
    perfTime+=realDt;frameCount++;worstFrameMs=Math.max(worstFrameMs,realDt*1000);if(perfTime>2){const fps=frameCount/perfTime;telemetry.dataset.fps=fps.toFixed(1);telemetry.dataset.worstFrameMs=worstFrameMs.toFixed(1);telemetry.dataset.quality=String(qualityTier);telemetry.dataset.pixelRatio=appliedPixelRatio.toFixed(2);telemetry.dataset.flying=String(helicopter.piloting);if(readySent&&fps<(motionCritical?55:48)){stableWindows=0;if(qualityTier<4){qualityTier++;pixelRatio=Math.max(.5,pixelRatio-.15);applyPixelRatio(helicopter.piloting);}}else if(readySent&&fps>57&&qualityTier>0){if(++stableWindows>=4){qualityTier--;pixelRatio=Math.min(resolutionLimit(),pixelRatio+.15);applyPixelRatio(helicopter.piloting);stableWindows=0;}}else stableWindows=0;perfTime=0;frameCount=0;worstFrameMs=0;}
    const fog=scene.fog as T.Fog;
    fog.near=T.MathUtils.damp(fog.near,visibility.range*(helicopter.piloting?.52:.42),2.8,realDt);
    fog.far=visibility.range;
    visibility.update();
    renderer.shadowMap.needsUpdate=false;
    // Starting or decoding a new landmark can briefly occupy the renderer
    // thread. Native buildings remain visible while motion is active; detailed
    // replacements resume automatically at the next idle moment.
    mapModels.update(camera,now,position,readySent&&qualityTier===0&&!motionCritical,readySent&&!motionCritical);landmarks.setImported(mapModels.readyIds);landmarks.update(camera,now);
    government.update(camera,now);opera.update(camera,now);
    const physicalStreamVelocity=helicopter.piloting?{x:helicopter.state.vx,z:helicopter.state.vz}:prius.driving?{x:-Math.sin(prius.state.heading)*prius.state.speed,z:-Math.cos(prius.state.heading)*prius.state.speed}:{x:walker.vx,z:walker.vz};
    const streamVelocity=physicalStreamVelocity;
    // Helicopter boost reaches 38 m/s. Prepare authored scenery roughly twelve
    // seconds ahead so a fast crossing cannot outrun the incremental builders.
    const streamSpeed=Math.hypot(streamVelocity.x,streamVelocity.z),leadSeconds=prius.driving?12:helicopter.piloting?12:2.5;
    const leadDistance=Math.min(prius.driving?480:helicopter.piloting?600:24,streamSpeed*leadSeconds),leadScale=streamSpeed>.001?leadDistance/streamSpeed:0;
    const sceneryFocus={x:position.x+streamVelocity.x*leadScale,z:position.z+streamVelocity.z*leadScale};
    updateScenery(now,!readySent,sceneryFocus,motionCritical);
    streets.render(camera,position.x,position.z,now,Math.min(helicopter.piloting?(mobile?.60:.72):1.1,appliedPixelRatio),streamVelocity,nativePreparationRadius(position.x,position.z,readySent?0:startupPreparationRadius),motionCritical);
    // Keep both renderers behind the loading state until all nearby street cells
    // have completed, including their colliders and native-ground replacement.
    if(!readySent&&streets.ready)callbacks.progress?.('Se pregătesc drumurile, trotuarele și clădirile din apropiere…');
    const tableFloor=groundLevel(TABLE.x,TABLE.z);cameraBlocks[0].min.y=tableFloor;cameraBlocks[0].max.y=tableFloor+TABLE.height;
    renderer.render(scene,camera);
  }
  const resize=()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);pixelRatio=Math.min(pixelRatio,resolutionLimit());applyPixelRatio(helicopter.piloting);};window.addEventListener('resize',resize);
  const onContextLost=(e:Event)=>{e.preventDefault();callbacks.error('Conexiunea grafică a fost întreruptă. Reîncarcă pagina pentru a relua plimbarea.');};canvas.addEventListener('webglcontextlost',onContextLost);
  drawMap();visibility.prepare();visibility.update();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);frame=requestAnimationFrame(animate);

  return {gate:gateAction,start,teleport,teleportTo,getMapPosition,setMapOpen,setMenuOpen,camera:switchCamera,sound,streets:(visible:boolean)=>streets.setVisible(visible),vehicle,helicopter:flightAction,pedal,weapon:weaponAction,look,pause:onBlur,reset:()=>teleport('catedrala'),dispose(){disposed=true;clearTimeout(crowdLoadTimer);assetLoadTimers.forEach(clearTimeout);crowdJobs.length=0;travel.cancel();cancelAnimationFrame(frame);lifecycle.abort();landmarks.dispose();government.dispose();columna.dispose();park.dispose();stefan.dispose();boulevard.dispose();boulevardMonuments.dispose();boulevardFrontages.dispose();segmentOne.dispose();segmentTwo.dispose();segmentThree.dispose();segmentFour.dispose();segmentFive.dispose();segmentSix.dispose();segmentSeven.dispose();segmentEight.dispose();boulevardCompletion.dispose();doga.dispose();museumQuarter.dispose();alexandruSector.dispose();dosofteiSector.dispose();columnaEast.dispose();columnaIsmailTighina.dispose();augustQuarter.dispose();augustEast.dispose();augustTighina.dispose();augustIsmail.dispose();augustTolstoi.dispose();augustCiuflea.dispose();vasilenco.dispose();augustCaucaz.dispose();augustJunction.dispose();sciusevTest.dispose();sciusevWest.dispose();sciusevAlecsandri.dispose();alecsandriVa05.dispose();alecsandriVa06.dispose();bucurestiBu01.dispose();bucurestiBu02.dispose();bucurestiBu03.dispose();bucurestiBu04.dispose();bucurestiBu05.dispose();bucurestiBu06.dispose();bucurestiBu07.dispose();bucurestiBu08.dispose();bucurestiBu09.dispose();bucurestiBu10.dispose();bucurestiBu11.dispose();alecsandriVa07.dispose();alecsandriVa08.dispose();alecsandriVa09.dispose();alecsandriVa10.dispose();alecsandriVa11.dispose();alecsandriVa12.dispose();alecsandriVa13.dispose();alecsandriVa14.dispose();sciusevEminescu.dispose();sciusevParcalab.dispose();sciusevPuskin.dispose();sciusevBodoni.dispose();sciusevIorga.dispose();sciusevCebotari.dispose();sciusevSfatul.dispose();sciusevLazo.dispose();sciusevStere.dispose();sciusevPrometeu.dispose();sciusev121.dispose();sciusevBend.dispose();sciusevNorth.dispose();ionCreanga.dispose();cadastralBuildings.dispose();centralStreetObjects.dispose();centralInfill.dispose();courtyardGates.dispose();puskin.dispose();bodoni.dispose();opera.dispose();mapModels.dispose();streets.dispose();minimap.dispose();weapon.dispose();effects.dispose();crowd.dispose();traffic.dispose();playerCarDamage?.dispose();document.removeEventListener('mouseup',onMouseUp);canvas.removeEventListener('contextmenu',onContextMenu);document.removeEventListener('keydown',onKeyDown);document.removeEventListener('keyup',onKeyUp);document.removeEventListener('mousemove',onMouse);document.removeEventListener('pointerlockchange',onLockChange);window.removeEventListener('blur',onBlur);window.removeEventListener('resize',resize);canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointermove',onPointerMove);canvas.removeEventListener('pointerup',onPointerUp);canvas.removeEventListener('pointercancel',onPointerUp);canvas.removeEventListener('webglcontextlost',onContextLost);joy?.removeEventListener('pointerdown',joyDown);joy?.removeEventListener('pointermove',joyMove);joy?.removeEventListener('pointerup',joyEnd);joy?.removeEventListener('pointercancel',joyEnd);jumpButton?.removeEventListener('pointerdown',jump);carAudio?.dispose();helicopterAudio?.dispose();helicopter.dispose();audioContext?.close().catch(()=>{});prius.dispose();playerMixer?.stopAllAction();visibility.restore();npcs.forEach(n=>scene.add(n.p.root));scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});textures.forEach(t=>t.dispose());materialList.forEach(m=>m.dispose());renderer.dispose();telemetry.remove();canvas.remove();}};
}
