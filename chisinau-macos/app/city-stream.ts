import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
import {CITY_DATA, type XY} from './city-layout';

// The central scene retains its surveyed detail. Shortbread tiles add the
// surrounding city on demand and are cached by the browser's HTTP cache.
const ZOOM=14, COUNT=2**ZOOM, CELL=256, RANGE=620, MAX_TILES=12;
const origin:[number,number]=[47.02473049780068,28.832596947039136];
const angle=CITY_DATA.rotation,c=Math.cos(angle),s=Math.sin(angle),latitudeScale=111195;
const lonScale=latitudeScale*Math.cos(origin[0]*Math.PI/180);
const limits={west:28.70,east:28.98,south:46.92,north:47.12};
const insideCenter=(x:number,z:number)=>x>CITY_DATA.bounds[0]&&x<CITY_DATA.bounds[2]&&z>CITY_DATA.bounds[1]&&z<CITY_DATA.bounds[3];
function project(lat:number,lon:number):XY{const e=(lon-origin[1])*lonScale,n=(lat-origin[0])*latitudeScale;return[e*c-n*s+24,-e*s-n*c-15];}
function unproject(x:number,z:number){const a=x-24,b=z+15,e=a*c-b*s,n=-a*s-b*c;return[origin[0]+n/latitudeScale,origin[1]+e/lonScale];}
function tileAt(lat:number,lon:number){return{x:Math.floor((lon+180)/360*COUNT),y:Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*COUNT)};}
function place(tx:number,ty:number,px:number,py:number,extent:number):XY{const lon=(tx+px/extent)/COUNT*360-180,lat=Math.atan(Math.sinh(Math.PI*(1-2*(ty+py/extent)/COUNT)))*180/Math.PI;return project(lat,lon);}
function distanceToTile(x:number,z:number,tx:number,ty:number){const corners=[place(tx,ty,0,0,1),place(tx+1,ty,0,0,1),place(tx,ty+1,0,0,1),place(tx+1,ty+1,0,0,1)];const minX=Math.min(...corners.map(p=>p[0])),maxX=Math.max(...corners.map(p=>p[0])),minZ=Math.min(...corners.map(p=>p[1])),maxZ=Math.max(...corners.map(p=>p[1]));return Math.hypot(Math.max(minX-x,0,x-maxX),Math.max(minZ-z,0,z-maxZ));}
function roadWidth(kind:string){return kind==='motorway'||kind==='trunk'?17:kind==='primary'?13:kind==='secondary'?10:kind==='tertiary'?8:kind==='residential'||kind==='unclassified'?6:kind==='service'?4:2.4;}
function buildingHeight(properties:Record<string,string|number|boolean>,footprint:number){
 const raw=Number(properties.height??properties['building:height']??properties.est_height);
 if(Number.isFinite(raw)&&raw>1)return Math.min(110,raw);
 const levels=Number(properties['building:levels']??properties.levels);
 if(Number.isFinite(levels)&&levels>0)return Math.min(110,levels*3.1);
 return 5.5+Math.min(14,Math.sqrt(Math.max(1,footprint))*.28);
}
function classifyLayer(name:string,properties:Record<string,string|number|boolean>){
 if(/building/i.test(name)||properties.building||properties['building:part'])return 'buildings';
 if(/street|road|highway/i.test(name)||properties.highway)return 'streets';
 if(/water/i.test(name)||properties.natural==='water')return 'water_polygons';
 if(/land|park|vegetation/i.test(name)||properties.leisure==='park'||properties.landuse)return 'land';
 return null;
}
function roadGeometry(points:XY[],width:number){const v:number[]=[],uv:number[]=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.03)continue;const nx=-dz/len*width/2,nz=dx/len*width/2,y=.06;const corners:[[number,number],[number,number],[number,number],[number,number]]=[[a[0]-nx,a[1]-nz],[b[0]-nx,b[1]-nz],[b[0]+nx,b[1]+nz],[a[0]+nx,a[1]+nz]];for(const k of [0,2,1,0,3,2]){const p=corners[k];v.push(p[0],y,p[1]);uv.push(p[0]/50,p[1]/50);}}if(!v.length)return null;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return geo;}

export function createCityStream(scene:T.Scene){
 const materials={building:new T.MeshStandardMaterial({color:'#d5cbb8',roughness:.86}),building2:new T.MeshStandardMaterial({color:'#c7c5bc',roughness:.86}),building3:new T.MeshStandardMaterial({color:'#e2d8c7',roughness:.86}),building4:new T.MeshStandardMaterial({color:'#c9b7aa',roughness:.86}),road:new T.MeshStandardMaterial({color:'#606461',roughness:1,side:T.DoubleSide}),walk:new T.MeshStandardMaterial({color:'#c4c0b2',roughness:1,side:T.DoubleSide}),park:new T.MeshStandardMaterial({color:'#607d4c',roughness:1,side:T.DoubleSide}),water:new T.MeshStandardMaterial({color:'#629195',roughness:.6,side:T.DoubleSide})};
 const tiles=new Map<string,{groups:T.Group[];stamp:number}>(),pending=new Set<string>(),failed=new Map<string,number>();
 const controller=new AbortController();let disposed=false,stamp=0,lastUpdate=0;
 function disposeGroups(groups:T.Group[]){for(const group of groups){scene.remove(group);group.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}}
 async function fetchTile(tx:number,ty:number){
  const urls=[`https://tiles.streets.gl/vector/${ZOOM}/${tx}/${ty}`,`https://vector.openstreetmap.org/shortbread_v1/${ZOOM}/${tx}/${ty}.mvt`];
  for(const [index,url] of urls.entries()){
   const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),index===0?4500:9000);
   try{
    const response=await fetch(url,{signal:AbortSignal.any([controller.signal,timeout.signal])});
    if(!response.ok)throw Error(`Tile ${response.status}`);
    const tile=new VectorTile(new PbfReader(new Uint8Array(await response.arrayBuffer())));
    if(!Object.entries(tile.layers).some(([name,layer])=>/building|street|road|highway/i.test(name)||Array.from({length:Math.min(layer.length,100)},(_,i)=>classifyLayer(name,layer.feature(i).properties)).some(kind=>kind==='buildings'||kind==='streets')))throw Error('No city layers');
    return tile;
   }catch(error){if(controller.signal.aborted)throw error;if(index===urls.length-1)throw error;}
   finally{clearTimeout(timer);}
  }
  throw Error('No map tiles');
 }
 async function load(tx:number,ty:number,key:string){pending.add(key);
  try{
   const tile=await fetchTile(tx,ty);
   const buckets=new Map<string,{kind:keyof typeof materials;geometries:T.BufferGeometry[];center:XY}>();
   const add=(kind:keyof typeof materials,center:XY,geo:T.BufferGeometry)=>{const key=`${kind}:${Math.floor(center[0]/CELL)}:${Math.floor(center[1]/CELL)}`;let bucket=buckets.get(key);if(!bucket){bucket={kind,geometries:[],center:[(Math.floor(center[0]/CELL)+.5)*CELL,(Math.floor(center[1]/CELL)+.5)*CELL]};buckets.set(key,bucket);}bucket.geometries.push(geo);};
   for(const layerName of Object.keys(tile.layers)){
    const layer=tile.layers[layerName];
    for(let i=0;i<layer.length;i++){
     const feature=layer.feature(i),name=classifyLayer(layerName,feature.properties);
     if(!name)continue;
     const rings=feature.loadGeometry(),kind=String(feature.properties.kind??'');
     for(const ring of rings){if(ring.length<2)continue;const points=ring.map(p=>place(tx,ty,p.x,p.y,layer.extent));const middle=points[Math.floor(points.length/2)];
      if(name==='buildings'&&feature.type===3&&points.length>=4){
       const bounds=points.reduce((a,p)=>[Math.min(a[0],p[0]),Math.min(a[1],p[1]),Math.max(a[2],p[0]),Math.max(a[3],p[1])] as [number,number,number,number],[Infinity,Infinity,-Infinity,-Infinity] as [number,number,number,number]);
       const center:XY=[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];if(insideCenter(center[0],center[1]))continue;
       const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],-p[1])));
       const height=buildingHeight(feature.properties,(bounds[2]-bounds[0])*(bounds[3]-bounds[1]));
       const geo=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1});geo.rotateX(-Math.PI/2);
       const shades=['building','building2','building3','building4'] as const;
       add(shades[Math.abs(Math.floor(center[0]*17+center[1]*31))%shades.length],center,geo);
      }else if(name==='streets'&&feature.type===2&&!feature.properties.rail){
       const roadKind=kind||String(feature.properties.highway??feature.properties.class??'residential');
       const road=!['footway','path','pedestrian','cycleway','steps','track'].includes(roadKind),width=road?roadWidth(roadKind):2.4;
       for(let j=1;j<points.length;j++){const mid:XY=[(points[j-1][0]+points[j][0])/2,(points[j-1][1]+points[j][1])/2];if(insideCenter(mid[0],mid[1]))continue;const geo=roadGeometry([points[j-1],points[j]],width);if(geo)add(road?'road':'walk',mid,geo);}
      }else if((name==='land'||name==='water_polygons')&&feature.type===3&&points.length>=4){
       const center=middle;if(insideCenter(center[0],center[1]))continue;
       if(name==='land'&&!['park','grass','forest','wood','garden','recreation_ground'].includes(kind||String(feature.properties.landuse??feature.properties.natural??'')))continue;
       const geo=new T.ShapeGeometry(new T.Shape(points.map(p=>new T.Vector2(p[0],-p[1]))));geo.rotateX(-Math.PI/2);geo.translate(0,.03,0);add(name==='land'?'park':'water',center,geo);
      }
     }
    }
   }
   if(disposed){for(const b of buckets.values())b.geometries.forEach(g=>g.dispose());return;}
   const groups:T.Group[]=[];
   for(const bucket of buckets.values()){
    const geometry=mergeGeometries(bucket.geometries,false);bucket.geometries.forEach(g=>g.dispose());if(!geometry)continue;
    const group=new T.Group();const mesh=new T.Mesh(geometry,materials[bucket.kind]);mesh.receiveShadow=true;group.add(mesh);scene.add(group);groups.push(group);
    group.userData.center=bucket.center;
   }
   tiles.set(key,{groups,stamp});failed.delete(key);
  }catch(error){if(!disposed&&!controller.signal.aborted){failed.set(key,Date.now()+30000);console.warn('Map tile unavailable',key,error);}}
  finally{pending.delete(key);}
 }
 function update(x:number,z:number){const now=Date.now();if(now-lastUpdate<350)return;lastUpdate=now;stamp++;
  const [lat,lon]=unproject(x,z);if(lat<limits.south||lat>limits.north||lon<limits.west||lon>limits.east)return;
  const center=tileAt(lat,lon),nearby:{x:number;y:number;distance:number}[]=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const tx=center.x+dx,ty=center.y+dy,distance=distanceToTile(x,z,tx,ty);if(distance<RANGE)nearby.push({x:tx,y:ty,distance});}
  nearby.sort((a,b)=>a.distance-b.distance);
  for(const candidate of nearby){const key=`${candidate.x}:${candidate.y}`,cached=tiles.get(key);if(cached){cached.stamp=stamp;continue;}if(pending.size>=2||pending.has(key)||now<(failed.get(key)??0))continue;void load(candidate.x,candidate.y,key);}
  for(const [key,tile]of tiles){for(const group of tile.groups){const [cx,cz]=group.userData.center as XY;group.visible=Math.hypot(cx-x,cz-z)<RANGE;}
   if(tiles.size>MAX_TILES&&stamp-tile.stamp>4){disposeGroups(tile.groups);tiles.delete(key);}}
 }
 return{update,dispose(){disposed=true;controller.abort();for(const tile of tiles.values())disposeGroups(tile.groups);Object.values(materials).forEach(m=>m.dispose());tiles.clear();}};
}
