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

for(const name of fs.readdirSync(worldRoot).filter(name=>name.endsWith('.dtile')).sort()){
  const buffer=fs.readFileSync(path.join(worldRoot,name));
  if(buffer.readUInt32LE(0)!==0x4c495443||buffer.readUInt32LE(4)!==1)throw new Error(`Invalid tile ${name}`);
  const vertices=buffer.readUInt32LE(24),end=64+vertices*40;
  for(let offset=64;offset+120<=end;offset+=120){
    const material=Math.floor(buffer.readFloatLE(offset+36)/64);
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

for(const value of Object.values(corridors)){
  value.detail_tiles=value.detail_tiles.size;
  if(!Number.isFinite(value.min_y_m))value.min_y_m=null;
  if(!Number.isFinite(value.max_y_m))value.max_y_m=null;
  if(value.min_y_m!==null)value.min_y_m=Number(value.min_y_m.toFixed(4));
  if(value.max_y_m!==null)value.max_y_m=Number(value.max_y_m.toFixed(4));
}

const inventories={sciusev:familyInventory('sciusev-'),bucuresti:familyInventory('bucuresti-bu'),columna:familyInventory('columna-')};
const passed=inventories.sciusev.modules===16&&inventories.bucuresti.modules===11&&inventories.columna.modules===1&&
  inventories.sciusev.building_footprints===432&&inventories.bucuresti.building_footprints===357&&inventories.columna.building_footprints===66&&
  Object.values(corridors).every(value=>value.asphalt_triangles>0&&value.detail_tiles>0&&value.min_y_m>-.012)&&
  manifest.authoredArchitecture?.spatiallySuppressedBuildings>0&&manifest.authoredArchitecture?.collisionOnlyBuildings>0;
const report={
  version:'2.8.0',
  compiled_world:{base_tiles:manifest.tiles,detail_tiles:manifest.authoredArchitecture.tiles,base_vertices:manifest.vertices,authored_vertices:manifest.authoredArchitecture.vertices,authored_layers:manifest.authoredArchitecture.layers,authored_meshes:manifest.authoredArchitecture.meshes,collision_segments:manifest.collisions,spatially_suppressed_osm_buildings:manifest.authoredArchitecture.spatiallySuppressedBuildings,collision_only_authored_buildings:manifest.authoredArchitecture.collisionOnlyBuildings},
  authored_sector_inventory:inventories,
  authoritative_surface_scan:corridors,
  base_fallback_road_y_m:-.012,
  minimum_verified_authored_road_separation_m:Number((Math.min(...Object.values(corridors).map(value=>value.min_y_m))+.012).toFixed(4)),
  map:{offline:true,quick_destinations:10,total_named_destinations:49,worked_street_destinations:38},
  result:passed?'passed':'failed',
};
const text=JSON.stringify(report,null,2)+'\n';
if(output)fs.writeFileSync(output,text);else process.stdout.write(text);
if(!passed)process.exitCode=1;
