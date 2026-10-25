import {VectorTile} from './pbf/VectorTile';
import data from '../data/chisinau.json';
import parkBenches from '../data/cathedral-park-props.json';
import stefanProps from '../data/stefan-park-props.json';
import boulevardProps from '../data/boulevard-props.json';
import extensionProps from '../data/central-extension-props.json';

const known = data.levels as Record<string, {levels?: number; height?: number}>;
const protectedIds = new Set(data.protected);
const parkBenchIds = new Set([...parkBenches,...stefanProps.benches]);
const stefanPointIds=new Set([...stefanProps.busts,...stefanProps.lamps]);
const stefanTreeIslandIds=new Set(stefanProps.treeIslands);
const boulevardPointIds=new Set([...extensionProps.pointIds,...boulevardProps.pointIds,6105900885,9256283468,3159094971,1759418276,8400788478,14065770961,14065830284,14065841260,1138863940,12762866409]);
const boulevardTrees=new Map(boulevardProps.saplings.map(t=>[t.id,t.height]));
const boulevardColors=boulevardProps.colors as Record<string,{color:number;roofColor:number}>;
// JSON infers number[] instead of the [number, number] pairs checked by the
// generator and geometry regression test.
const pavement = data.pavementTiles as unknown as Record<string, VectorTile.PolygonGeometry[]>;
const HALF = 20037508.34, SIZE = 2 * HALF / 65536;
const ORIGIN_LAT = 47.02473049780068, ORIGIN_LON = 28.832596947039136;
const NORTH = Math.log(Math.tan((90 + ORIGIN_LAT) * Math.PI / 360)) * HALF / Math.PI;
const EAST = ORIGIN_LON * HALF / 180;
const SCALE = (HALF / 180 / 111195) / Math.cos(ORIGIN_LAT * Math.PI / 180);
const C = Math.cos(.7793683518335637), S = Math.sin(.7793683518335637);
const urbanTypes = new Set(['yes', 'apartments', 'residential', 'commercial', 'retail', 'office', 'government', 'hotel', 'school', 'university', 'college', 'hospital']);
const specialName = /conacul|conac |biseric|catedral|capel|sinagog|clopotni|arcul|teatr|sal[aă] cu org|cinema|piața de flori|PT-\d|ГРП/i;

export function applyChisinauCorrections(tile: VectorTile.Tile, x: number, y: number, zoom: number): void {
  if (zoom !== 16) return;
  // A small central zone, evaluated once when a tile is decoded in the worker.
  // There are no new per-frame loops or network requests.
  const east = x * SIZE - HALF, north = HALF - y * SIZE;
  if (east > EAST + 4500 || east + SIZE < EAST - 4500 || north < NORTH - 4500 || north - SIZE > NORTH + 4500) return;
  // Photo-guided brown benches are batched in the host park layer at these
  // same OSM nodes. Remove only the exact duplicate native bench instances.
  for(const layer of tile.layers.values())layer.features=layer.features.filter(f=>{
    const id=Number(f.tags.osmId);
    if(f.type===VectorTile.FeatureType.Point&&boulevardPointIds.has(id))return false;
    if(f.type===VectorTile.FeatureType.Point&&f.tags.type==='tree'&&boulevardTrees.has(id)){f.tags.height=boulevardTrees.get(id);f.tags.genus='generic';}
    if(f.type===VectorTile.FeatureType.Point&&((f.tags.type==='bench'&&parkBenchIds.has(id))||stefanPointIds.has(id)||[5962810507,5962810508].includes(id)))return false;
    if(f.type===VectorTile.FeatureType.Polygon&&Number(f.tags.osmType)===2){
      if(id===11739056)return false; // Pushkin's column is authored from photos.
      if(f.tags.type==='forest'&&stefanTreeIslandIds.has(id))return false;
    }
    return true;
  });
  const trees:VectorTile.Feature[]=[];
  for(let i=0;i<stefanProps.trees.length;i++){
    const tree=stefanProps.trees[i],dx=tree.x-24,dz=tree.z+15;
    const px=EAST+(C*dx-S*dz)*SCALE-east,py=north-(NORTH+(-S*dx-C*dz)*SCALE);
    if(px<0||py<0||px>=SIZE||py>=SIZE)continue;
    trees.push({id:i,type:VectorTile.FeatureType.Point,tags:{type:'tree',osmId:-360000-i,osmType:0,height:tree.height,genus:tree.genus},geometry:[[px,py]]});
  }
  if(trees.length)tile.layers.set('chisinau-stefan-trees',{features:trees});
  for (const layer of tile.layers.values()) for (const feature of layer.features) {
    // The photographed Columna block includes a parking edge as well as two
    // traffic lanes. Restrict this width correction to its two exact OSM ways.
    if (feature.type === VectorTile.FeatureType.LineString && feature.tags.type === 'path' &&
      [49565742, 93204040].includes(Number(feature.tags.osmId))) {
      feature.tags.width = 10.8;
    }
    if (feature.type !== VectorTile.FeatureType.Polygon || feature.tags.type !== 'building') continue;
    const tags = feature.tags;
    const id = `${tags.osmType === 2 ? 'r' : 'w'}${tags.osmId}`;
    if(boulevardColors[id])Object.assign(tags,boulevardColors[id]);
    if(id==='r12313269'){tags.color=0xc3c5bb;tags.roofColor=0xb8beb5;}
    // Source heights and floor counts win, including low historic buildings.
    if (Number(tags.height) > 0 || Number(tags.levels) > 0) continue;
    const record = known[id];
    if (record) { Object.assign(tags, record); continue; }
    if (protectedIds.has(id) || tags.isPart || tags.minHeight || tags.minLevel || !urbanTypes.has(String(tags.buildingType ?? 'yes')) || specialName.test(String(tags.name ?? ''))) continue;
    let twiceArea = 0, centerX = 0, centerY = 0;
    // PBF rings are clockwise in screen coordinates: outer positive, holes negative.
    for (const ring of feature.geometry) for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1], cross = a[0] * b[1] - b[0] * a[1];
      twiceArea += cross; centerX += (a[0] + b[0]) * cross; centerY += (a[1] + b[1]) * cross;
    }
    if (Math.abs(twiceArea) < 1) continue;
    const area = Math.abs(twiceArea) / (2 * SCALE * SCALE);
    const e = (east + centerX / (3 * twiceArea) - EAST) / SCALE;
    const n = (north - centerY / (3 * twiceArea) - NORTH) / SCALE;
    const localX = 24 + C * e - S * n, localZ = -15 - S * e - C * n;
    if (localX < -1150 || localX > 1450 || localZ < -650 || localZ > 600 || area < 220) continue;
    // Contextual estimates, not surveyed dimensions. Small courtyard structures
    // and detached houses never receive this multi-storey fallback.
    tags.levels = Math.abs(localZ - 4) < 110 || area >= 500 ? 4 : 3;
    tags.estimatedLevels = true;
  }
  const polygons = pavement[`${x}/${y}`];
  if (polygons) tile.layers.set('chisinau-pman-paving', {features: polygons.map((geometry, index) => ({
    id: index, type: VectorTile.FeatureType.Polygon,
    tags: {type: 'path', pathType: 'pedestrian'},
    // Handlers later transform coordinates in place. Never mutate shared JSON.
    geometry: geometry.map(ring => ring.map(p => [p[0], p[1]] as VectorTile.Point))
  }))});
}
