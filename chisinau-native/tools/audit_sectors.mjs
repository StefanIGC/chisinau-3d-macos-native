#!/usr/bin/env node

// Read-only verification for the native package. It cross-checks the worked
// street datasets against the compiled world and scans the Metal detail tiles
// for the authoritative asphalt/material layer in each requested corridor.
import fs from 'node:fs';
import path from 'node:path';

const sourceRoot=path.resolve(process.argv[2]);
const worldRoot=path.resolve(process.argv[3]);
const output=process.argv[4]?path.resolve(process.argv[4]):null;
const dataRoot=path.join(sourceRoot,'data');
const manifest=JSON.parse(fs.readFileSync(path.join(worldRoot,'manifest.json'),'utf8'));
const rotation=.7793683518335637,c=Math.cos(rotation),s=Math.sin(rotation);

function authoredPoint(nativeX,nativeZ){
  const dx=c*nativeX+s*nativeZ,dz=-s*nativeX+c*nativeZ;
  return[dx+24,dz-15];
}
function nativePoint(authoredX,authoredZ){const dx=authoredX-24,dz=authoredZ+15;return[c*dx-s*dz,s*dx+c*dz];}
function json(name){return JSON.parse(fs.readFileSync(path.join(dataRoot,name),'utf8'));}
function familyInventory(prefix){
  const buildingFiles=fs.readdirSync(dataRoot).filter(name=>name.startsWith(prefix)&&name.endsWith('-buildings.json')).sort();
  const segmentFiles=fs.readdirSync(dataRoot).filter(name=>name.startsWith(prefix)&&name.endsWith('.json')&&!name.endsWith('-buildings.json')&&!name.endsWith('-map.json')&&!name.endsWith('-gates.json')&&!name.includes('retained-footprints')&&!name.includes('sectors')).sort();
  return{modules:buildingFiles.length,building_footprints:buildingFiles.reduce((sum,name)=>sum+(Array.isArray(json(name))?json(name).length:0),0),building_files:buildingFiles,segment_files:segmentFiles};
}

const corridors={
  sciusev:{bounds:[-1100,540,1220,850]},
  bucuresti:{bounds:[-325,390,1750,550]},
  columna_ismail_tighina:{bounds:[1192,-447,1439,-240]},
};
for(const value of Object.values(corridors))Object.assign(value,{asphalt_triangles:0,min_y_m:Infinity,max_y_m:-Infinity,detail_tiles:new Set()});
const armeneasca=nativePoint(776.123062,470.256627),armeneascaRadius=95,armeneascaSurfaceTriangles=new Set();let armeneascaDuplicateSurfaceTriangles=0,armeneascaDegenerateDuplicateSurfaceTriangles=0;
const nr1=nativePoint(1620,590),nr1Radius=160;let cityDuplicateVisibleTriangles=0,nr1DuplicateVisibleTriangles=0,nr1VisibleTriangles=0;
const gateCatalog=json('courtyard-gates.json');
const collisionKey=(a,b)=>[a,b].map(point=>point.map(value=>Math.round(value*100)).join(',')).sort().join('|');
const expectedGateCollisionKeys=new Set(gateCatalog.filter(gate=>!gate.initialOpen).map(gate=>collisionKey(nativePoint(...gate.a),nativePoint(...gate.b)))),compiledGateCollisionKeys=new Set();
let authoredDetailCollisionSegments=0;

for(const name of fs.readdirSync(worldRoot).filter(name=>name.endsWith('.dtile')).sort()){
  const buffer=fs.readFileSync(path.join(worldRoot,name));
  if(buffer.readUInt32LE(0)!==0x4c495443||buffer.readUInt32LE(4)!==1)throw new Error(`Invalid tile ${name}`);
  const collisions=buffer.readUInt32LE(28);authoredDetailCollisionSegments+=collisions;
  const vertices=buffer.readUInt32LE(24),end=64+vertices*40,tileNearArmeneasca=Math.hypot(buffer.readFloatLE(16)-armeneasca[0],buffer.readFloatLE(20)-armeneasca[1])<360;
  for(let i=0;i<collisions;i++){const at=end+i*24;compiledGateCollisionKeys.add(collisionKey([buffer.readFloatLE(at),buffer.readFloatLE(at+4)],[buffer.readFloatLE(at+8),buffer.readFloatLE(at+12)]));}
  const tileVisibleTriangles=new Set();
  for(let offset=64;offset+120<=end;offset+=120){
    const material=Math.floor(buffer.readFloatLE(offset+36)/64);
    let visibleX=0,visibleZ=0;const visibleSignature=[];for(let i=0;i<3;i++){const at=offset+i*40,x=buffer.readFloatLE(at),y=buffer.readFloatLE(at+4),z=buffer.readFloatLE(at+8);visibleX+=x/3;visibleZ+=z/3;visibleSignature.push(`${Math.round(x*1000)},${Math.round(y*1000)},${Math.round(z*1000)}`);}const visibleKey=visibleSignature.sort().join('|'),nearNr1=Math.hypot(visibleX-nr1[0],visibleZ-nr1[1])<nr1Radius;if(nearNr1)nr1VisibleTriangles++;if(tileVisibleTriangles.has(visibleKey)){cityDuplicateVisibleTriangles++;if(nearNr1)nr1DuplicateVisibleTriangles++;}else tileVisibleTriangles.add(visibleKey);
    if(tileNearArmeneasca&&[3,4,5,7].includes(material)){
      let cx=0,cz=0,cy=0;const signatures=[],points=[];for(let i=0;i<3;i++){const at=offset+i*40,x=buffer.readFloatLE(at),y=buffer.readFloatLE(at+4),z=buffer.readFloatLE(at+8);cx+=x/3;cy+=y/3;cz+=z/3;points.push([x,y,z]);signatures.push([Math.round(x*1000),Math.round(y*1000),Math.round(z*1000),material,Math.round(buffer.readFloatLE(at+24)*4096),Math.round(buffer.readFloatLE(at+28)*4096),Math.round(buffer.readFloatLE(at+32)*4096)].join(','));}
      if(cy<1&&Math.hypot(cx-armeneasca[0],cz-armeneasca[1])<armeneascaRadius){const key=signatures.sort().join('|');if(armeneascaSurfaceTriangles.has(key)){const a=points[0],b=points[1],d=points[2],ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ad=[d[0]-a[0],d[1]-a[1],d[2]-a[2]],area=.5*Math.hypot(ab[1]*ad[2]-ab[2]*ad[1],ab[2]*ad[0]-ab[0]*ad[2],ab[0]*ad[1]-ab[1]*ad[0]);if(area>=.001)armeneascaDuplicateSurfaceTriangles++;else armeneascaDegenerateDuplicateSurfaceTriangles++;}else armeneascaSurfaceTriangles.add(key);}
    }
    if(material!==3)continue;
    let x=0,y=0,z=0;
    for(let i=0;i<3;i++){x+=buffer.readFloatLE(offset+i*40)/3;y+=buffer.readFloatLE(offset+i*40+4)/3;z+=buffer.readFloatLE(offset+i*40+8)/3;}
    const [ax,az]=authoredPoint(x,z);
    for(const value of Object.values(corridors)){
      const [minX,minZ,maxX,maxZ]=value.bounds;
      if(ax<minX||ax>maxX||az<minZ||az>maxZ)continue;
      value.asphalt_triangles++;value.min_y_m=Math.min(value.min_y_m,y);value.max_y_m=Math.max(value.max_y_m,y);value.detail_tiles.add(name);
    }
  }
}

let continuousUnderlayTiles=0,compiledBaseTiles=0,underlayTriangles=0;
for(const name of fs.readdirSync(worldRoot).filter(name=>name.endsWith('.ctile')).sort()){
  const buffer=fs.readFileSync(path.join(worldRoot,name)),vertices=buffer.readUInt32LE(24),end=64+vertices*40;let tileUnderlayTriangles=0;compiledBaseTiles++;
  for(let offset=64;offset+120<=end;offset+=120){const material=Math.floor(buffer.readFloatLE(offset+36)/64);if(material!==5)continue;let underlay=true;for(let i=0;i<3;i++)underlay=underlay&&Math.abs(buffer.readFloatLE(offset+i*40+4)+.18)<.0005;if(underlay)tileUnderlayTriangles++;}
  underlayTriangles+=tileUnderlayTriangles;if(tileUnderlayTriangles>=2)continuousUnderlayTiles++;
}

for(const value of Object.values(corridors)){
  value.detail_tiles=value.detail_tiles.size;
  if(!Number.isFinite(value.min_y_m))value.min_y_m=null;
  if(!Number.isFinite(value.max_y_m))value.max_y_m=null;
  if(value.min_y_m!==null)value.min_y_m=Number(value.min_y_m.toFixed(4));
  if(value.max_y_m!==null)value.max_y_m=Number(value.max_y_m.toFixed(4));
}

const inventories={sciusev:familyInventory('sciusev-'),bucuresti:familyInventory('bucuresti-bu'),columna:familyInventory('columna-')};
const gateInventory={catalogued:gateCatalog.length,leaves:gateCatalog.reduce((sum,gate)=>sum+(gate.singleLeaf?1:2),0),initially_open:gateCatalog.filter(gate=>gate.initialOpen).length,closed_collision_segments:gateCatalog.filter(gate=>!gate.initialOpen).length,matched_closed_collision_segments:[...expectedGateCollisionKeys].filter(key=>compiledGateCollisionKeys.has(key)).length};
const expectedRestoredFamilies=['Guvern','Columna Pușkin–Bodoni','Parcul Catedralei','terenul Operei','parcări de biciclete'];
const restoredVectorFeatures=manifest.restoredVectorFeatures??{};
const surfaceOwnership=manifest.surfaceOwnership??{},suppressedBaseGeometry=surfaceOwnership.suppressedBaseGeometry??{};
const passed=inventories.sciusev.modules===16&&inventories.bucuresti.modules===11&&inventories.columna.modules===1&&
  inventories.sciusev.building_footprints===432&&inventories.bucuresti.building_footprints===357&&inventories.columna.building_footprints===66&&
  Object.values(corridors).every(value=>value.asphalt_triangles>0&&value.detail_tiles>0&&value.min_y_m>-.012)&&
  manifest.authoredArchitecture?.solidShellVertices>0&&manifest.authoredArchitecture?.layers>=190&&
  expectedRestoredFamilies.every(name=>manifest.authoredArchitecture?.restoredFamilies?.includes(name))&&
  manifest.operaModelVertices>0&&manifest.landmarkModels===25&&
  ['barriers','waterways','treeRows','highwayAreas','railways','streetFurniture'].every(name=>restoredVectorFeatures[name]>0)&&
  surfaceOwnership.masks>0&&surfaceOwnership.checks?.bucurestiArmeneasca?.owned===true&&
  surfaceOwnership.checks?.bucurestiArmeneasca?.suppressed?.landcover>0&&armeneascaDuplicateSurfaceTriangles===0&&
  ['roads','landcover','trees'].every(name=>suppressedBaseGeometry[name]>0)&&suppressedBaseGeometry.terrain===0&&
  manifest.terrainSafetyUnderlay?.continuous===true&&manifest.terrainSafetyUnderlay?.heightM===-.18&&manifest.terrainSafetyUnderlay?.tiles===manifest.tiles&&continuousUnderlayTiles===compiledBaseTiles&&compiledBaseTiles===manifest.tiles&&
  manifest.authoredArchitecture?.buildingOwnershipMasks>0&&manifest.authoredArchitecture?.suppressedLegacyCadastralTriangles>0&&manifest.authoredArchitecture?.deduplicatedVisibleTriangles>0&&cityDuplicateVisibleTriangles===0&&nr1DuplicateVisibleTriangles===0&&
  manifest.authoredArchitecture?.gates?.count===gateInventory.catalogued&&manifest.authoredArchitecture?.gates?.meshes===gateInventory.leaves&&manifest.authoredArchitecture?.gates?.vertices>0&&
  manifest.authoredArchitecture?.gateCollisionSegments===gateInventory.closed_collision_segments&&authoredDetailCollisionSegments===gateInventory.closed_collision_segments&&gateInventory.matched_closed_collision_segments===gateInventory.closed_collision_segments&&
  manifest.authoredArchitecture?.spatiallySuppressedBuildings>0&&manifest.authoredArchitecture?.collisionOnlyBuildings>0;
const report={
  version:'2.14.0',
  compiled_world:{base_tiles:manifest.tiles,detail_tiles:manifest.authoredArchitecture.tiles,base_vertices:manifest.vertices,authored_vertices:manifest.authoredArchitecture.vertices,solid_shell_vertices:manifest.authoredArchitecture.solidShellVertices,authored_layers:manifest.authoredArchitecture.layers,authored_meshes:manifest.authoredArchitecture.meshes,landmark_models:manifest.landmarkModels,opera_model_vertices:manifest.operaModelVertices,restored_authored_families:manifest.authoredArchitecture.restoredFamilies,restored_vector_features:restoredVectorFeatures,collision_segments:manifest.collisions,spatially_suppressed_osm_buildings:manifest.authoredArchitecture.spatiallySuppressedBuildings,collision_only_authored_buildings:manifest.authoredArchitecture.collisionOnlyBuildings,building_ownership_masks:manifest.authoredArchitecture.buildingOwnershipMasks,suppressed_legacy_cadastral_triangles:manifest.authoredArchitecture.suppressedLegacyCadastralTriangles,deduplicated_visible_triangles:manifest.authoredArchitecture.deduplicatedVisibleTriangles,surface_ownership_masks:surfaceOwnership.masks,suppressed_legacy_geometry:suppressedBaseGeometry,bucuresti_armeneasca_check:surfaceOwnership.checks?.bucurestiArmeneasca},
  authored_sector_inventory:inventories,
  authored_gate_inventory:{...gateInventory,exported:manifest.authoredArchitecture?.gates,compiled_detail_collision_segments:authoredDetailCollisionSegments},
  authoritative_surface_scan:corridors,
  anti_blink_scan:{whole_city_duplicate_visible_triangles:cityDuplicateVisibleTriangles,bucuresti_armeneasca_radius_m:armeneascaRadius,unique_authored_surface_triangles:armeneascaSurfaceTriangles.size,duplicate_visible_surface_triangles:armeneascaDuplicateSurfaceTriangles,degenerate_duplicate_triangles_below_0_001_m2:armeneascaDegenerateDuplicateSurfaceTriangles,nr1_lev_tolstoi:{radius_m:nr1Radius,visible_triangles:nr1VisibleTriangles,duplicate_visible_triangles:nr1DuplicateVisibleTriangles}},
  ground_gap_scan:{compiled_base_tiles:compiledBaseTiles,continuous_underlay_tiles:continuousUnderlayTiles,underlay_triangles:underlayTriangles,manifest:manifest.terrainSafetyUnderlay},
  base_fallback_road_y_m:-.012,
  minimum_verified_authored_road_separation_m:Number((Math.min(...Object.values(corridors).map(value=>value.min_y_m))+.012).toFixed(4)),
  map:{offline:true,quick_destinations:10,total_named_destinations:49,worked_street_destinations:38},
  result:passed?'passed':'failed',
};
const text=JSON.stringify(report,null,2)+'\n';
if(output)fs.writeFileSync(output,text);else process.stdout.write(text);
if(!passed)process.exitCode=1;
