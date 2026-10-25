#!/usr/bin/env node

// Offline city compiler. JavaScript is used only while building the game; the
// shipped application and its runtime contain no JavaScript or web renderer.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const sourceRoot = path.resolve(process.argv[2]);
const outputRoot = path.resolve(process.argv[3]);
const {PbfReader} = await import(pathToFileURL(path.join(sourceRoot, 'node_modules/pbf/index.js')));
const {VectorTile} = await import(pathToFileURL(path.join(sourceRoot, 'node_modules/@mapbox/vector-tile/index.js')));
const {MeshoptDecoder} = await import(pathToFileURL(path.join(sourceRoot, 'node_modules/meshoptimizer/meshopt_decoder.mjs')));
await MeshoptDecoder.ready;
const vectorRoot = path.join(sourceRoot, 'public/streets/tiles/vector/16');
const dataRoot = path.join(sourceRoot, 'data');
const ZOOM = 16;
const TILES = 2 ** ZOOM;
const HALF_WORLD = 20037508.34;
const ORIGIN_LAT = 47.02473049780068;
const ORIGIN_LON = 28.832596947039136;
const ORIGIN_EAST = ORIGIN_LON * HALF_WORLD / 180;
const ORIGIN_NORTH = Math.log(Math.tan((90 + ORIGIN_LAT) * Math.PI / 360)) * HALF_WORLD / Math.PI;
const GROUND_SCALE = Math.cos(ORIGIN_LAT * Math.PI / 180);
const ROTATION = 0.7793683518335637;
const ROT_C = Math.cos(ROTATION);
const ROT_S = Math.sin(ROTATION);

if (!fs.existsSync(vectorRoot)) throw new Error(`Missing vector tiles: ${vectorRoot}`);
fs.mkdirSync(outputRoot, {recursive: true});

const tileData = new Map();
const customOsmIds = new Set();
const customFeatures = new Map();
const customBuildings = new Map();
const landmarkReplacementIds = new Set();
const landmarkCatalogFile = path.join(dataRoot, 'map-md-models.json');
const landmarkCatalog = fs.existsSync(landmarkCatalogFile) ? JSON.parse(fs.readFileSync(landmarkCatalogFile, 'utf8')) : [];
for (const model of landmarkCatalog) for (const id of model.replace ?? []) { landmarkReplacementIds.add(`w${id}`); landmarkReplacementIds.add(`r${id}`); customOsmIds.add(`w${id}`); customOsmIds.add(`r${id}`); }

function tileBucket(x, y) {
  const key = `${x}/${y}`;
  let value = tileData.get(key);
  if (!value) {
    value = {x, y, vertices: [], collisions: [], sources: new Set()};
    tileData.set(key, value);
  }
  return value;
}

function projectedPoint(tileX, tileY, extent, point) {
  const east = ((tileX + point.x / extent) / TILES * 2 - 1) * HALF_WORLD;
  const north = (1 - (tileY + point.y / extent) / TILES * 2) * HALF_WORLD;
  return [(east - ORIGIN_EAST) * GROUND_SCALE, -(north - ORIGIN_NORTH) * GROUND_SCALE];
}

function localPoint(point) {
  const dx = point[0] - 24;
  const dz = point[1] + 15;
  return [ROT_C * dx - ROT_S * dz, ROT_S * dx + ROT_C * dz];
}

function tileForPoint(point) {
  const east = ORIGIN_EAST + point[0] / GROUND_SCALE;
  const north = ORIGIN_NORTH - point[1] / GROUND_SCALE;
  return [
    Math.floor((east / HALF_WORLD + 1) * 0.5 * TILES),
    Math.floor((1 - north / HALF_WORLD) * 0.5 * TILES),
  ];
}

function number(value, fallback = 0) {
  const result = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(result) ? result : fallback;
}

function colorFromHex(value, fallback) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return fallback;
  return [Number.parseInt(value.slice(1, 3), 16) / 255, Number.parseInt(value.slice(3, 5), 16) / 255, Number.parseInt(value.slice(5, 7), 16) / 255, 1];
}

function shade(color, amount) {
  return [color[0] * amount, color[1] * amount, color[2] * amount, color[3] ?? 1];
}

function materialCode(kind, roughness = .88, metalness = 0) {
  return kind * 64 + Math.max(0, Math.min(7, Math.round(roughness * 7))) * 8 + Math.max(0, Math.min(7, Math.round(metalness * 7)));
}

function vertex(out, position, normal, color) {
  out.push(position[0], position[1], position[2], normal[0], normal[1], normal[2], color[0], color[1], color[2], color[3] ?? 1);
}

function srgbChannelToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function triangle(out, a, b, c, normal, color) {
  // Numeric palettes and JSON hex values are authored in sRGB, while the
  // BGRA8_sRGB Metal target expects the fragment shader to output linear light.
  const linear=[srgbChannelToLinear(color[0]),srgbChannelToLinear(color[1]),srgbChannelToLinear(color[2]),color[3]??1];
  vertex(out, a, normal, linear);
  vertex(out, b, normal, linear);
  vertex(out, c, normal, linear);
}

function signedArea(points) {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) area += points[j][0] * points[i][1] - points[i][0] * points[j][1];
  return area * 0.5;
}

function cleanRing(points) {
  const result = [];
  for (const p of points) {
    if (!result.length || Math.hypot(p[0] - result.at(-1)[0], p[1] - result.at(-1)[1]) > 0.025) result.push(p);
  }
  if (result.length > 2 && Math.hypot(result[0][0] - result.at(-1)[0], result[0][1] - result.at(-1)[1]) < 0.025) result.pop();
  return result;
}

function pointInTriangle(p, a, b, c) {
  const s1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const s2 = (c[0] - b[0]) * (p[1] - b[1]) - (c[1] - b[1]) * (p[0] - b[0]);
  const s3 = (a[0] - c[0]) * (p[1] - c[1]) - (a[1] - c[1]) * (p[0] - c[0]);
  return (s1 >= -1e-5 && s2 >= -1e-5 && s3 >= -1e-5) || (s1 <= 1e-5 && s2 <= 1e-5 && s3 <= 1e-5);
}

// Small ear-clipping triangulator. City footprints are simple OSM polygons;
// holes keep their open courtyards because only the exterior ring gets a roof.
function triangulate(points) {
  if (points.length < 3) return [];
  const ccw = signedArea(points) > 0;
  const indices = points.map((_, index) => index);
  const result = [];
  let guard = points.length * points.length;
  while (indices.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < indices.length; i++) {
      const ia = indices[(i + indices.length - 1) % indices.length];
      const ib = indices[i];
      const ic = indices[(i + 1) % indices.length];
      const a = points[ia], b = points[ib], c = points[ic];
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if ((ccw && cross <= 1e-6) || (!ccw && cross >= -1e-6)) continue;
      let contains = false;
      for (const candidate of indices) {
        if (candidate !== ia && candidate !== ib && candidate !== ic && pointInTriangle(points[candidate], a, b, c)) { contains = true; break; }
      }
      if (contains) continue;
      result.push(ccw ? [ia, ib, ic] : [ic, ib, ia]);
      indices.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (indices.length === 3) result.push(ccw ? [...indices] : [indices[2], indices[1], indices[0]]);
  if (!result.length) for (let i = 1; i + 1 < points.length; i++) result.push([0, i, i + 1]);
  return result;
}

function addExtrusion(bucket, rawRing, height, wallColor, roofColor, collision = true) {
  const ring = cleanRing(rawRing);
  if (ring.length < 3) return;
  const out = bucket.vertices;
  const roofY = Math.max(2.5, height);
  for (const [ia, ib, ic] of triangulate(ring)) {
    triangle(out, [ring[ia][0], roofY, ring[ia][1]], [ring[ib][0], roofY, ring[ib][1]], [ring[ic][0], roofY, ring[ic][1]], [0, 1, 0], roofColor);
  }
  const ccw = signedArea(ring) > 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length = Math.hypot(dx, dz) || 1;
    const normal = ccw ? [dz / length, 0, -dx / length] : [-dz / length, 0, dx / length];
    const c = shade(wallColor, 0.88 + 0.12 * Math.abs(normal[0]));
    triangle(out, [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], roofY, b[1]], normal, c);
    triangle(out, [a[0], 0, a[1]], [b[0], roofY, b[1]], [a[0], roofY, a[1]], normal, c);
  }
  if (collision) addFootprintCollision(bucket, ring, roofY);
}

// Follow the real outline instead of blocking the footprint's entire axis-
// aligned bounding box. The old AABB could extend several metres beyond a
// rotated building and made walkers stick or stop against invisible corners.
function addFootprintCollision(bucket, rawRing, height) {
  const ring=cleanRing(rawRing),padding=.12;
  if(ring.length<3)return;
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.04)continue;
    bucket.collisions.push(a[0],a[1],b[0],b[1],padding,height);
  }
}

function addFlatPolygon(bucket, rawRing, y, color) {
  const ring = cleanRing(rawRing);
  if (ring.length < 3) return;
  for (const [ia, ib, ic] of triangulate(ring)) {
    triangle(bucket.vertices, [ring[ia][0], y, ring[ia][1]], [ring[ib][0], y, ring[ib][1]], [ring[ic][0], y, ring[ic][1]], [0, 1, 0], color);
  }
}

function roadWidth(properties) {
  const lanes = number(properties.lanes, 0);
  if (lanes) return Math.min(22, Math.max(3.2, lanes * 3.15));
  switch (properties.pathType) {
    case 'motorway': return 18;
    case 'trunk': case 'primary': return 12.5;
    case 'secondary': return 10;
    case 'tertiary': return 8.5;
    case 'residential': return 6.2;
    case 'service': return 4.2;
    case 'pedestrian': return 5.5;
    case 'footway': case 'path': return 1.8;
    case 'cycleway': return 2.2;
    default: return 3.4;
  }
}

function addRoad(bucket, points, width, color) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 0.05) continue;
    const ox = -dz / length * width * 0.5, oz = dx / length * width * 0.5;
    // This is distant fallback context. Several original Șciusev road meshes
    // intentionally sit at y=0, while newer modules use 0.035–0.15 m. Keep
    // every OSM/curated fallback below the complete authored layer so it can
    // never cover it or z-fight at sector seams.
    const p0 = [a[0] + ox, -0.012, a[1] + oz], p1 = [a[0] - ox, -0.012, a[1] - oz];
    const p2 = [b[0] - ox, -0.012, b[1] - oz], p3 = [b[0] + ox, -0.012, b[1] + oz];
    triangle(bucket.vertices, p0, p1, p2, [0, 1, 0], color);
    triangle(bucket.vertices, p0, p2, p3, [0, 1, 0], color);
  }
}

function addBox(bucket, x, y, z, sx, sy, sz, color) {
  const x0=x-sx/2,x1=x+sx/2,y0=y-sy/2,y1=y+sy/2,z0=z-sz/2,z1=z+sz/2,o=bucket.vertices;
  const faces=[
    [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1]],
    [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1]],
    [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0]],
    [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0]],
    [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0]],
  ];
  for(const f of faces){triangle(o,f[0],f[1],f[2],f[4],color);triangle(o,f[0],f[2],f[3],f[4],color);}
}

function addTreeCrown(bucket,x,y,z,rx,ry,rz,color,phase=0){
  const latitude=5,longitude=8,out=bucket.vertices;
  for(let row=0;row<latitude;row++){
    const a0=-Math.PI/2+row*Math.PI/latitude,a1=-Math.PI/2+(row+1)*Math.PI/latitude;
    for(let column=0;column<longitude;column++){
      const b0=phase+column*Math.PI*2/longitude,b1=phase+(column+1)*Math.PI*2/longitude;
      const point=(a,b)=>[x+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(a)*ry,z+Math.cos(a)*Math.sin(b)*rz];
      const normal=(a,b)=>{const n=[Math.cos(a)*Math.cos(b)/rx,Math.sin(a)/ry,Math.cos(a)*Math.sin(b)/rz],length=Math.hypot(...n)||1;return n.map(v=>v/length);};
      const p00=point(a0,b0),p01=point(a0,b1),p10=point(a1,b0),p11=point(a1,b1),n0=normal((a0+a1)/2,(b0+b1)/2),shadeAmount=.88+.12*Math.max(0,Math.cos(b0-phase));
      const c=shade(color,shadeAmount);triangle(out,p00,p01,p11,n0,c);triangle(out,p00,p11,p10,n0,c);
    }
  }
}

function addTree(bucket, x, z, seed) {
  const height = 5.5 + (seed % 29) * 0.11;
  addBox(bucket, x, height * 0.22, z, 0.42, height * 0.44, 0.42, [0.25,0.18,0.09,materialCode(0,1,0)]);
  const green=[0.12+(seed%5)*.012,0.29+(seed%7)*.011,0.105,materialCode(2,1,0)];
  const r=height*(.245+(seed%5)*.008),phase=(seed%17)*.19;
  addTreeCrown(bucket,x,height*.70,z,r,height*.31,r*.94,green,phase);
  addTreeCrown(bucket,x-r*.32,height*.76,z+r*.16,r*.58,height*.20,r*.54,shade(green,1.04),phase+.31);
}

function featureOsmKey(properties) {
  const prefix = number(properties.osmType, 1) === 2 ? 'r' : 'w';
  return `${prefix}${properties.osmId}`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const identityMatrix=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function multiplyMatrix(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function gltfNodeMatrix(n){if(n.matrix)return n.matrix;const t=n.translation??[0,0,0],s=n.scale??[1,1,1],q=n.rotation??[0,0,0,1],x=q[0],y=q[1],z=q[2],w=q[3],x2=x+x,y2=y+y,z2=z+z;
 return[(1-(y*y2+z*z2))*s[0],(x*y2+z*w*2)*s[0],(x*z2-y*w*2)*s[0],0,(x*y2-z*w*2)*s[1],(1-(x*x2+z*z2))*s[1],(y*z2+x*w*2)*s[1],0,(x*z2+y*w*2)*s[2],(y*z2-x*w*2)*s[2],(1-(x*x2+y*y2))*s[2],0,t[0],t[1],t[2],1];}
function transformGltfPoint(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
function transformGltfNormal(m,n){const p=[m[0]*n[0]+m[4]*n[1]+m[8]*n[2],m[1]*n[0]+m[5]*n[1]+m[9]*n[2],m[2]*n[0]+m[6]*n[1]+m[10]*n[2]],l=Math.hypot(...p)||1;return p.map(v=>v/l);}
const gltfReaders={5120:['getInt8',1],5121:['getUint8',1],5122:['getInt16',2],5123:['getUint16',2],5125:['getUint32',4],5126:['getFloat32',4]},gltfTypeSize={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};

function readCompressedGlb(file){const buffer=fs.readFileSync(file);if(buffer.readUInt32LE(0)!==0x46546c67)throw new Error(`Invalid GLB: ${file}`);let offset=12,json,bin;
 while(offset<buffer.length){const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4),data=buffer.subarray(offset+8,offset+8+length);if(type===0x4e4f534a)json=JSON.parse(data.toString());else if(type===0x004e4942)bin=data;offset+=8+length;}
 const views=(json.bufferViews??[]).map(view=>{const ext=view.extensions?.EXT_meshopt_compression;if(!ext)return{data:bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),stride:view.byteStride};const decoded=new Uint8Array(ext.count*ext.byteStride),source=bin.subarray(ext.byteOffset??0,(ext.byteOffset??0)+ext.byteLength);MeshoptDecoder.decodeGltfBuffer(decoded,ext.count,ext.byteStride,source,ext.mode,ext.filter);return{data:decoded,stride:ext.byteStride};});
 return{json,views};}
function gltfAccessor(glb,index){const a=glb.json.accessors[index],view=glb.views[a.bufferView],components=gltfTypeSize[a.type],reader=gltfReaders[a.componentType],stride=view.stride??components*reader[1],start=a.byteOffset??0,data=new DataView(view.data.buffer,view.data.byteOffset,view.data.byteLength),out=[];
 for(let i=0;i<a.count;i++){const row=[];for(let c=0;c<components;c++)row.push(data[reader[0]](start+i*stride+c*reader[1],true));out.push(row);}return out;}
function gltfColor(json,index){const factor=json.materials?.[index]?.pbrMetallicRoughness?.baseColorFactor;if(factor)return factor;return[.68,.66,.61,1];}
function geoNative(lat,lon){const east=lon*HALF_WORLD/180,north=Math.log(Math.tan((90+lat)*Math.PI/360))*HALF_WORLD/Math.PI;return[(east-ORIGIN_EAST)*GROUND_SCALE,-(north-ORIGIN_NORTH)*GROUND_SCALE];}

function addLandmarkModel(spec) {
  const center=geoNative(spec.lat,spec.lon),tile=tileForPoint(center),bucket=tileData.get(`${tile[0]}/${tile[1]}`);if(!bucket)return false;
  const file=path.join(sourceRoot,'public/models/map-md',spec.file);if(!fs.existsSync(file))return false;const glb=readCompressedGlb(file),raw=[];
  function visit(index,parent){const node=glb.json.nodes[index],world=multiplyMatrix(parent,gltfNodeMatrix(node));if(node.mesh!==undefined){for(const primitive of glb.json.meshes[node.mesh].primitives){if((primitive.mode??4)!==4||primitive.attributes.POSITION===undefined)continue;const positions=gltfAccessor(glb,primitive.attributes.POSITION),normals=primitive.attributes.NORMAL!==undefined?gltfAccessor(glb,primitive.attributes.NORMAL):null,indices=primitive.indices!==undefined?gltfAccessor(glb,primitive.indices).map(x=>x[0]):positions.map((_,i)=>i),color=gltfColor(glb.json,primitive.material);
    for(let k=0;k+2<indices.length;k+=3){const ids=[indices[k],indices[k+1],indices[k+2]],p=ids.map(i=>transformGltfPoint(world,positions[i]));let fallback;const ab=p[1].map((v,i)=>v-p[0][i]),ac=p[2].map((v,i)=>v-p[0][i]);fallback=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const fl=Math.hypot(...fallback)||1;fallback=fallback.map(v=>v/fl);for(let j=0;j<3;j++)raw.push({p:p[j],n:normals?transformGltfNormal(world,normals[ids[j]]):fallback,c:color});}
  }}for(const child of node.children??[])visit(child,world);}
  for(const root of glb.json.scenes[glb.json.scene??0]?.nodes??[])visit(root,identityMatrix());if(!raw.length)return false;
  const worldScale=(HALF_WORLD/180/111195)/Math.cos(ORIGIN_LAT*Math.PI/180),modelScale=2*HALF_WORLD/worldScale*number(spec.scale,1),yaw=number(spec.rotation,0),cy=Math.cos(yaw),sy=Math.sin(yaw),fit=spec.fit??[1,1,1];let minY=Infinity;
  for(const v of raw){let x=v.p[0]*modelScale,z=v.p[2]*modelScale,y=v.p[1]*modelScale;x*=fit[0];y*=fit[1];z*=fit[2];v.p=[x*cy+z*sy,y,-x*sy+z*cy];const nx=v.n[0]*cy+v.n[2]*sy,nz=-v.n[0]*sy+v.n[2]*cy;v.n=[nx,v.n[1],nz];minY=Math.min(minY,y);}
  const offset=localPoint([24+(spec.offset?.[0]??0),-15+(spec.offset?.[2]??0)]),lift=number(spec.lift,0)+number(spec.groundOffset,0)+.035;
  for(const v of raw)vertex(bucket.vertices,[center[0]+offset[0]+v.p[0],v.p[1]-minY+lift,center[1]+offset[1]+v.p[2]],v.n,v.c);
  bucket.sources.add(`map.md · ${spec.title}`);return true;
}

function collectCustomData() {
  const featureFiles = ['central-chisinau.json', ...fs.readdirSync(dataRoot).filter(name => name.endsWith('-map.json'))];
  const boulevardRoutes = path.join(dataRoot, 'boulevard-routes.json');
  for (const name of [...featureFiles, ...(fs.existsSync(boulevardRoutes) ? ['boulevard-routes.json'] : [])]) {
    const file = name === 'central-chisinau.json' ? path.join(dataRoot, name) : path.join(dataRoot, name);
    if (!fs.existsSync(file)) continue;
    const json = readJson(file);
    const features = Array.isArray(json) ? json : (json.features ?? []);
    for (const item of features) {
      if (!item?.id || !Array.isArray(item.p) || item.p.length < 2) continue;
      customOsmIds.add(item.id);
      if (!customFeatures.has(item.id)) customFeatures.set(item.id, item);
    }
  }

  for (const name of fs.readdirSync(dataRoot).filter(name => name.endsWith('-buildings.json'))) {
    const json = readJson(path.join(dataRoot, name));
    if (!Array.isArray(json)) continue;
    for (const item of json) if (item?.id && Array.isArray(item.p) && item.p.length >= 3) { customBuildings.set(item.id, item); if (/^[wr]\d+$/.test(item.id)) customOsmIds.add(item.id); }
  }
  for (const name of ['central-infill.json', 'commercial-building-parts.json']) {
    const file = path.join(dataRoot, name); if (!fs.existsSync(file)) continue;
    const json = readJson(file); if (!Array.isArray(json)) continue;
    for (const item of json) if (item?.id && Array.isArray(item.p) && item.p.length >= 3) { customBuildings.set(item.id, item); if (/^[wr]\d+$/.test(item.id)) customOsmIds.add(item.id); }
  }
  const cadastralFile = path.join(dataRoot, 'cadastral-buildings.json');
  if (fs.existsSync(cadastralFile)) {
    const json = readJson(cadastralFile);
    for (const chunk of json.chunks ?? []) for (const body of chunk.bodies ?? []) {
      const ring = body.rings?.[0];
      if (body.id && Array.isArray(ring) && ring.length >= 3) customBuildings.set(body.id, {...body, p:ring, holes:body.rings.slice(1)});
    }
  }
  const completionFile = path.join(dataRoot, 'boulevard-completion.json');
  if (fs.existsSync(completionFile)) {
    const json = readJson(completionFile);
    for (const item of json.buildings ?? []) {
      const ring = item.rings?.[0]?.[0] ?? item.rings?.[0];
      if (item.id && Array.isArray(ring) && ring.length >= 3) { customBuildings.set(item.id, {...item, p:ring, holes:[]}); for (const id of item.ids ?? []) customOsmIds.add(`w${id}`); }
    }
  }
}

collectCustomData();

const authoredMaskCell=96,authoredMasks=[],authoredMaskGrid=new Map();
function pointInPolygon2(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j],cross=(a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1]+Number.EPSILON)+a[0];if(cross)inside=!inside;
}return inside;}
function segmentsCross(a,b,c,d){const orient=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]),abC=orient(a,b,c),abD=orient(a,b,d),cdA=orient(c,d,a),cdB=orient(c,d,b);return (abC>1e-6&&abD<-1e-6||abC<-1e-6&&abD>1e-6)&&(cdA>1e-6&&cdB<-1e-6||cdA<-1e-6&&cdB>1e-6);}
function polygonEdgesCross(a,b){for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)if(segmentsCross(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]))return true;return false;}
function registerAuthoredMask(points){const ring=cleanRing(points);if(ring.length<3)return;const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),mask={ring,minX:Math.min(...xs),minZ:Math.min(...zs),maxX:Math.max(...xs),maxZ:Math.max(...zs)},index=authoredMasks.push(mask)-1;
 for(let x=Math.floor(mask.minX/authoredMaskCell);x<=Math.floor(mask.maxX/authoredMaskCell);x++)for(let z=Math.floor(mask.minZ/authoredMaskCell);z<=Math.floor(mask.maxZ/authoredMaskCell);z++){const key=`${x}/${z}`,list=authoredMaskGrid.get(key)??[];list.push(index);authoredMaskGrid.set(key,list);}}
for(const feature of customFeatures.values())if(feature.t?.building)registerAuthoredMask(feature.p.map(localPoint));
for(const item of customBuildings.values())registerAuthoredMask(item.p.map(localPoint));
function overlapsAuthoredMask(rawRing){const ring=cleanRing(rawRing);if(ring.length<3)return false;const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),minX=Math.min(...xs),minZ=Math.min(...zs),maxX=Math.max(...xs),maxZ=Math.max(...zs),candidates=new Set();
 for(let x=Math.floor(minX/authoredMaskCell);x<=Math.floor(maxX/authoredMaskCell);x++)for(let z=Math.floor(minZ/authoredMaskCell);z<=Math.floor(maxZ/authoredMaskCell);z++)for(const index of authoredMaskGrid.get(`${x}/${z}`)??[])candidates.add(index);
 const center=ring.reduce((sum,p)=>[sum[0]+p[0]/ring.length,sum[1]+p[1]/ring.length],[0,0]);
 for(const index of candidates){const mask=authoredMasks[index];if(maxX<mask.minX||minX>mask.maxX||maxZ<mask.minZ||minZ>mask.maxZ)continue;if(pointInPolygon2(center,mask.ring)||ring.some(p=>pointInPolygon2(p,mask.ring))||mask.ring.some(p=>pointInPolygon2(p,ring))||polygonEdgesCross(ring,mask.ring))return true;}
 return false;
}

// Rebuild the exact photo-authored Three.js architecture offline, then split
// it into close-range native Metal tiles. JavaScript never ships in the app.
const architectureTempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'chisinau-authored-'));
process.on('exit',()=>{try{fs.rmSync(architectureTempRoot,{recursive:true,force:true});}catch{}});
const architectureBundle=path.join(architectureTempRoot,'export-native-architecture.mjs');
const architectureFile=path.join(architectureTempRoot,'architecture.carch');
const architectureEntry=path.join(sourceRoot,'scripts/export-native-architecture.ts');
const esbuild=path.join(sourceRoot,'node_modules/esbuild/bin/esbuild');
if(!fs.existsSync(architectureEntry)||!fs.existsSync(esbuild))throw new Error('Missing authored architecture exporter or esbuild.');
execFileSync(process.execPath,[esbuild,architectureEntry,'--bundle','--platform=node','--format=esm',`--outfile=${architectureBundle}`,'--log-level=warning'],{stdio:'inherit'});
const architectureOutput=execFileSync(process.execPath,[architectureBundle,architectureFile],{encoding:'utf8',maxBuffer:1024*1024}).trim();
if(architectureOutput)console.log(architectureOutput);

function architectureHeader(file){
  const descriptor=fs.openSync(file,'r'),header=Buffer.alloc(32);fs.readSync(descriptor,header,0,header.length,0);
  if(header.readUInt32LE(0)!==0x48435241||header.readUInt32LE(4)!==1)throw new Error('Invalid authored architecture file.');
  const result={vertices:header.readUInt32LE(8),replacementCount:header.readUInt32LE(12),meshes:header.readUInt32LE(16),layers:header.readUInt32LE(20),headerBytes:32+header.readUInt32LE(12)*4,replacements:[]};
  const ids=Buffer.alloc(result.replacementCount*4);fs.readSync(descriptor,ids,0,ids.length,32);fs.closeSync(descriptor);
  for(let i=0;i<result.replacementCount;i++)result.replacements.push(ids.readUInt32LE(i*4));
  return result;
}
const authoredArchitecture=architectureHeader(architectureFile);
for(const id of authoredArchitecture.replacements){customOsmIds.add(`w${id}`);customOsmIds.add(`r${id}`);}

function compileArchitectureTiles(file,header){
  // Authored façades are much denser than Streets GL context. Spatially small
  // detail pages let the native streamer finish the nearest block first instead
  // of waiting for a 50–125 MB Web-Mercator tile to upload in its entirety.
  const detailTileSize=192;
  const details=new Map(),descriptor=fs.openSync(file,'r'),triangleBytes=3*10*4,batchTriangles=8192,readBuffer=Buffer.allocUnsafe(triangleBytes*batchTriangles);
  function bucket(x,y){const key=`${x}/${y}`;let value=details.get(key);if(!value){value={x,y,vertices:0,bytes:0,buffer:Buffer.allocUnsafe(1200000),file:path.join(architectureTempRoot,`${x}_${y}.raw`)};details.set(key,value);}return value;}
  function flush(value){if(!value.bytes)return;fs.appendFileSync(value.file,value.buffer.subarray(0,value.bytes));value.bytes=0;}
  let position=header.headerBytes,remaining=header.vertices,processed=0;
  while(remaining){
    const vertices=Math.min(remaining,batchTriangles*3),bytes=vertices*40,read=fs.readSync(descriptor,readBuffer,0,bytes,position);if(read!==bytes)throw new Error('Truncated authored architecture file.');
    for(let at=0;at<bytes;at+=triangleBytes){
      let centerX=0,centerZ=0;const transformed=[];
      for(let j=0;j<3;j++){
        const offset=at+j*40,x=readBuffer.readFloatLE(offset),y=readBuffer.readFloatLE(offset+4),z=readBuffer.readFloatLE(offset+8),nx=readBuffer.readFloatLE(offset+12),ny=readBuffer.readFloatLE(offset+16),nz=readBuffer.readFloatLE(offset+20);
        const p=localPoint([x,z]),tx=ROT_C*nx-ROT_S*nz,tz=ROT_S*nx+ROT_C*nz;centerX+=p[0]/3;centerZ+=p[1]/3;
        transformed.push([p[0],y,p[1],tx,ny,tz,readBuffer.readFloatLE(offset+24),readBuffer.readFloatLE(offset+28),readBuffer.readFloatLE(offset+32),readBuffer.readFloatLE(offset+36)]);
      }
      const tileX=Math.floor(centerX/detailTileSize),tileY=Math.floor(centerZ/detailTileSize),target=bucket(tileX,tileY);if(target.bytes+triangleBytes>target.buffer.length)flush(target);
      for(const values of transformed)for(const value of values){target.buffer.writeFloatLE(value,target.bytes);target.bytes+=4;}
      target.vertices+=3;processed+=3;
    }
    position+=bytes;remaining-=vertices;
  }
  fs.closeSync(descriptor);if(processed!==header.vertices)throw new Error(`Authored architecture count mismatch: ${processed} != ${header.vertices}`);
  let totalBytes=0;
  for(const value of details.values()){
    flush(value);const center=[(value.x+.5)*detailTileSize,(value.y+.5)*detailTileSize],headerBuffer=Buffer.alloc(64);headerBuffer.writeUInt32LE(0x4c495443,0);headerBuffer.writeUInt32LE(1,4);headerBuffer.writeInt32LE(value.x,8);headerBuffer.writeInt32LE(value.y,12);headerBuffer.writeFloatLE(center[0],16);headerBuffer.writeFloatLE(center[1],20);headerBuffer.writeUInt32LE(value.vertices,24);
    const output=path.join(outputRoot,`detail_${value.x}_${value.y}.dtile`),out=fs.openSync(output,'w');fs.writeSync(out,headerBuffer);const input=fs.openSync(value.file,'r'),copy=Buffer.allocUnsafe(4*1024*1024);let offset=0;for(;;){const read=fs.readSync(input,copy,0,copy.length,offset);if(!read)break;fs.writeSync(out,copy,0,read);offset+=read;}fs.closeSync(input);fs.closeSync(out);totalBytes+=64+value.vertices*40;
  }
  return{tiles:details.size,vertices:processed,bytes:totalBytes};
}
const architectureTiles=compileArchitectureTiles(architectureFile,authoredArchitecture);

const pbfFiles = fs.readdirSync(vectorRoot, {recursive:true})
  .filter(name => String(name).endsWith('.pbf'))
  .map(name => path.join(vectorRoot, String(name)))
  .sort();

let spatiallySuppressedBuildings=0,collisionOnlyAuthoredBuildings=0;
for (const file of pbfFiles) {
  const relative = path.relative(vectorRoot, file).split(path.sep);
  if (relative.length !== 2) continue;
  const tileX = Number(relative[0]), tileY = Number(path.basename(relative[1], '.pbf'));
  const bucket = tileBucket(tileX, tileY); bucket.sources.add('Streets GL vector tiles');
  const tile = new VectorTile(new PbfReader(fs.readFileSync(file)));
  for (const [layerName, layer] of Object.entries(tile.layers)) {
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i), properties = feature.properties ?? {};
      if (properties.osmId && customOsmIds.has(featureOsmKey(properties))) continue;
      const geometry = feature.loadGeometry().map(ring => ring.map(point => projectedPoint(tileX, tileY, layer.extent, point)));
      if (layerName === 'buildings' && feature.type === 3) {
        if(geometry[0]&&overlapsAuthoredMask(geometry[0])){spatiallySuppressedBuildings++;continue;}
        const rawHeight = number(properties.height, number(properties.levels, 0) * 3.05);
        const seed = Number(properties.osmId ?? i) % 997;
        const height = rawHeight > 2 ? rawHeight : (properties.buildingType === 'apartments' ? 12.5 : 5.8 + (seed % 6) * 1.25);
        const palette = [[.66,.61,.53,1],[.73,.68,.59,1],[.61,.65,.63,1],[.71,.59,.50,1],[.76,.73,.66,1]];
        const wall = palette[seed % palette.length];
        if (geometry[0]) addExtrusion(bucket, geometry[0], height, wall, shade(wall,.62));
      } else if (layerName === 'highways' && feature.type === 2) {
        const width = roadWidth(properties);
        const walkway = ['pedestrian','footway','path','cycleway','steps'].includes(properties.pathType);
        const surface = walkway ? [.42,.40,.36,materialCode(4,1,0)] : [.19,.205,.215,materialCode(3,1,0)];
        for (const line of geometry) addRoad(bucket, line, width, surface);
      } else if (layerName === 'water' && feature.type === 3) {
        for (const ring of geometry) addFlatPolygon(bucket, ring, .045, [.12,.34,.48,materialCode(7,.3,.14)]);
      } else if ((layerName === 'common' || layerName === 'natural') && feature.type === 3) {
        const type = properties.type;
        const c = type === 'pitch' ? [.20,.39,.20,materialCode(5,1,0)] : [.18,.33,.18,materialCode(5,1,0)];
        for (const ring of geometry.slice(0,1)) addFlatPolygon(bucket, ring, .035, c);
      } else if (layerName === 'point' && feature.type === 1) {
        if (properties.type === 'tree') for (const group of geometry) for (const point of group) addTree(bucket, point[0], point[1], Number(properties.osmId ?? i));
      }
    }
  }
}

let landmarkCount=0;
for (const spec of landmarkCatalog) {
  const p=geoNative(spec.lat,spec.lon);
  if(Math.hypot(p[0],p[1])<10000&&addLandmarkModel(spec))landmarkCount++;
}

// The high-detail, manually curated project data supersedes its OSM bodies.
for (const feature of customFeatures.values()) {
  if(landmarkReplacementIds.has(feature.id))continue;
  const tags = feature.t ?? {};
  const points = feature.p.map(localPoint);
  const centroid = points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
  const [tileX,tileY] = tileForPoint(centroid), bucket=tileBucket(tileX,tileY); bucket.sources.add('Chișinău Centru curated geometry');
  if (tags.building) {
    const levels=number(tags['building:levels'],0), height=Math.max(2.8,number(tags.height,levels?levels*3.05:(tags.building==='apartments'?12.4:7.2)));
    addFootprintCollision(bucket,points,height);collisionOnlyAuthoredBuildings++;
  } else if (tags.highway) {
    const width=number(tags.width,roadWidth({pathType:tags.highway,lanes:tags.lanes}));
    const walkway=['pedestrian','footway','path','cycleway','steps'].includes(tags.highway);
    addRoad(bucket,points,width,walkway?[.46,.43,.38,materialCode(4,1,0)]:[.18,.195,.205,materialCode(3,1,0)]);
  } else if (['park','garden'].includes(tags.leisure) || ['grass','forest','meadow'].includes(tags.landuse) || tags.natural==='wood') {
    addFlatPolygon(bucket,points,.05,[.17,.36,.18,materialCode(5,1,0)]);
  }
}

for (const item of customBuildings.values()) {
  if(landmarkReplacementIds.has(item.id))continue;
  const points=item.p.map(localPoint); if(points.length<3)continue;
  const centroid=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
  const [tileX,tileY]=tileForPoint(centroid),bucket=tileBucket(tileX,tileY);bucket.sources.add('Chișinău architectural/cadastral catalog');
  addFootprintCollision(bucket,points,Math.max(2.8,number(item.height,number(item.levels,item.floors)*3.05||7.2)));collisionOnlyAuthoredBuildings++;
}

// A terrain slab per tile hides unloaded space under the fog and ensures the
// player never sees holes while GPU buffers are integrated incrementally.
for (const bucket of tileData.values()) {
  const extent=65536;
  const corners=[[0,0],[extent,0],[extent,extent],[0,extent]].map(([x,y])=>projectedPoint(bucket.x,bucket.y,extent,{x,y}));
  addFlatPolygon(bucket,corners,-.035,[.145,.225,.145,materialCode(5,1,0)]);
}

let totalVertices=0,totalCollisions=0,totalBytes=0;
for (const bucket of [...tileData.values()].sort((a,b)=>a.x-b.x||a.y-b.y)) {
  const center=projectedPoint(bucket.x,bucket.y,65536,{x:32768,y:32768});
  const vertexCount=bucket.vertices.length/10,collisionCount=bucket.collisions.length/6;
  const bytes=64+bucket.vertices.length*4+bucket.collisions.length*4;
  const buffer=Buffer.allocUnsafe(bytes);buffer.fill(0);
  buffer.writeUInt32LE(0x4c495443,0);buffer.writeUInt32LE(1,4);buffer.writeInt32LE(bucket.x,8);buffer.writeInt32LE(bucket.y,12);
  buffer.writeFloatLE(center[0],16);buffer.writeFloatLE(center[1],20);buffer.writeUInt32LE(vertexCount,24);buffer.writeUInt32LE(collisionCount,28);
  let offset=64;for(const value of bucket.vertices){buffer.writeFloatLE(value,offset);offset+=4;}for(const value of bucket.collisions){buffer.writeFloatLE(value,offset);offset+=4;}
  fs.writeFileSync(path.join(outputRoot,`${bucket.x}_${bucket.y}.ctile`),buffer);
  totalVertices+=vertexCount;totalCollisions+=collisionCount;totalBytes+=bytes;
}

const attribution = {
  format:'Chișinău Native Tile 1', zoom:ZOOM, origin:[ORIGIN_LAT,ORIGIN_LON],
  tiles:tileData.size, vertices:totalVertices, collisions:totalCollisions, landmarkModels:landmarkCount, bytes:totalBytes,
  authoredArchitecture:{...architectureTiles,layers:authoredArchitecture.layers,meshes:authoredArchitecture.meshes,replacementIds:authoredArchitecture.replacementCount,spatiallySuppressedBuildings,collisionOnlyBuildings:collisionOnlyAuthoredBuildings},
  sources:['© OpenStreetMap contributors · ODbL 1.0','Chișinău · Centru 3D project datasets','Street View/photo-authored architecture modules','map.md placement catalog'],
  generated:new Date().toISOString(),
};
fs.writeFileSync(path.join(outputRoot,'manifest.json'),JSON.stringify(attribution,null,2)+'\n');
console.log(JSON.stringify(attribution,null,2));
