#!/usr/bin/env node

// Exhaustive authored-geometry audit for z-fighting that survives exact
// triangle deduplication. It finds differently triangulated faces which still
// occupy a common coplanar area. Tiles are processed independently so the
// complete city can be checked without retaining the 36M-vertex world in RAM.
import fs from 'node:fs';
import path from 'node:path';

const worldRoot=path.resolve(process.argv[2]);
const output=process.argv[3]?path.resolve(process.argv[3]):null;
const rotation=.7793683518335637,c=Math.cos(rotation),s=Math.sin(rotation);
const gridSize=8,minimumArea=.01,parallelTolerance=5e-7,planeTolerance=.0007,colorTolerance=.02;
const materialNames=['solid','glass','foliage','road','pavement','grass','metal','water'];

function authoredPoint(nativeX,nativeZ){const dx=c*nativeX+s*nativeZ,dz=-s*nativeX+c*nativeZ;return[dx+24,dz-15];}
function colorDepthRank(color){return(Math.imul(Math.round(color[0]*4095),73856093)^Math.imul(Math.round(color[1]*4095),19349663)^Math.imul(Math.round(color[2]*4095),83492791))>>>0;}
function signedArea(p){let area=0;for(let i=0,j=p.length-1;i<p.length;j=i++)area+=p[j][0]*p[i][1]-p[i][0]*p[j][1];return area/2;}
function overlapArea(a,b){
  let polygon=a.map(p=>[p[0],p[1]]);const orientation=signedArea(b)>=0?1:-1;
  for(let edge=0;edge<3&&polygon.length;edge++){
    const x=b[edge],y=b[(edge+1)%3],dx=y[0]-x[0],dy=y[1]-x[1],input=polygon;polygon=[];
    const side=p=>orientation*(dx*(p[1]-x[1])-dy*(p[0]-x[0]));
    for(let i=0;i<input.length;i++){
      const current=input[i],previous=input[(i+input.length-1)%input.length],dc=side(current),dp=side(previous),currentInside=dc>=-1e-9,previousInside=dp>=-1e-9;
      if(currentInside!==previousInside){const t=dp/(dp-dc);polygon.push([previous[0]+(current[0]-previous[0])*t,previous[1]+(current[1]-previous[1])*t]);}
      if(currentInside)polygon.push(current);
    }
  }
  return Math.abs(signedArea(polygon));
}
function planeRecord(buffer,offset){
  const p=[];for(let i=0;i<3;i++){const at=offset+i*40;p.push([buffer.readFloatLE(at),buffer.readFloatLE(at+4),buffer.readFloatLE(at+8)]);}
  const ab=[p[1][0]-p[0][0],p[1][1]-p[0][1],p[1][2]-p[0][2]],ac=[p[2][0]-p[0][0],p[2][1]-p[0][1],p[2][2]-p[0][2]],n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],length=Math.hypot(...n);if(length<1e-5)return null;for(let i=0;i<3;i++)n[i]/=length;
  const axis=Math.abs(n[0])>=Math.abs(n[1])&&Math.abs(n[0])>=Math.abs(n[2])?0:Math.abs(n[1])>=Math.abs(n[2])?1:2,facing=n[axis]<0?-1:1;if(facing<0)for(let i=0;i<3;i++)n[i]*=-1;
  const d=n[0]*p[0][0]+n[1]*p[0][1]+n[2]*p[0][2],projected=p.map(v=>axis===0?[v[1],v[2]]:axis===1?[v[0],v[2]]:[v[0],v[1]]),area=Math.abs(signedArea(projected))/Math.max(.0001,Math.abs(n[axis]));if(area<minimumArea)return null;
  const us=projected.map(v=>v[0]),vs=projected.map(v=>v[1]),rawMaterial=buffer.readFloatLE(offset+36),encoded=Math.floor(rawMaterial),kind=Math.floor((encoded&511)/64),side=(encoded>>9)&3,layerPriority=Math.round((rawMaterial-encoded)*262144),color=[0,0,0];for(let i=0;i<3;i++)for(let channel=0;channel<3;channel++)color[channel]+=buffer.readFloatLE(offset+i*40+24+channel*4)/3;const planeKey=`${axis}/${Math.round(n[0]*1000)}/${Math.round(n[1]*1000)}/${Math.round(n[2]*1000)}/${Math.round(d*200)}`;
  return{n,d,axis,facing,p:projected,kind,side,layerPriority,color,planeKey,minU:Math.min(...us),minV:Math.min(...vs),maxU:Math.max(...us),maxV:Math.max(...vs)};
}

const tileNames=fs.readdirSync(worldRoot).filter(name=>name.endsWith('.dtile')).sort(),materialPairs={},samples=[],unresolvedSamples=[];
let trianglesScanned=0,nonDegenerateTriangles=0,candidatePairs=0,coplanarOverlapPairs=0,coplanarOverlapAreaM2=0,visualConflictPairs=0,visualConflictAreaM2=0,sameFacingConflictPairs=0,sameFacingConflictAreaM2=0,oppositeFacingConflictPairs=0,oppositeFacingConflictAreaM2=0,resolvedBySidePolicyPairs=0,resolvedByLayerDepthPairs=0,resolvedByColorDepthPairs=0,unresolvedBlinkRiskPairs=0,unresolvedBlinkRiskAreaM2=0,maxCandidatesPerTriangle=0;
const tileReports=[];
for(const name of tileNames){
  const buffer=fs.readFileSync(path.join(worldRoot,name)),vertices=buffer.readUInt32LE(24),end=64+vertices*40,records=[],grid=new Map();let tileOverlaps=0,tileArea=0,tileCandidates=0,tileUnresolved=0,tileUnresolvedArea=0;
  for(let offset=64;offset+120<=end;offset+=120){
    trianglesScanned++;const record=planeRecord(buffer,offset);if(!record)continue;nonDegenerateTriangles++;
    const minX=Math.floor(record.minU/gridSize),maxX=Math.floor(record.maxU/gridSize),minY=Math.floor(record.minV/gridSize),maxY=Math.floor(record.maxV/gridSize),candidates=new Set();
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(const id of grid.get(`${record.planeKey}/${x}/${y}`)??[])candidates.add(id);
    maxCandidatesPerTriangle=Math.max(maxCandidatesPerTriangle,candidates.size);candidatePairs+=candidates.size;tileCandidates+=candidates.size;
    for(const id of candidates){const other=records[id],dot=record.n[0]*other.n[0]+record.n[1]*other.n[1]+record.n[2]*other.n[2];if(1-dot>parallelTolerance||Math.abs(record.d-other.d)>planeTolerance)continue;const projectedOverlap=overlapArea(record.p,other.p),area=projectedOverlap/Math.max(.0001,Math.abs(record.n[record.axis]));if(area<minimumArea)continue;
      coplanarOverlapPairs++;coplanarOverlapAreaM2+=area;const colorDistance=Math.hypot(record.color[0]-other.color[0],record.color[1]-other.color[1],record.color[2]-other.color[2]);if(record.kind===other.kind&&colorDistance<=colorTolerance)continue;
      visualConflictPairs++;visualConflictAreaM2+=area;tileOverlaps++;tileArea+=area;const facing=record.facing===other.facing?'same':'opposite';if(facing==='same'){sameFacingConflictPairs++;sameFacingConflictAreaM2+=area;}else{oppositeFacingConflictPairs++;oppositeFacingConflictAreaM2+=area;}const effectiveSide=value=>value.facing*(value.side===1?-1:1),sidePolicyResolves=record.side!==2&&other.side!==2&&effectiveSide(record)!==effectiveSide(other),depthPolicyResolves=record.layerPriority!==other.layerPriority,colorPolicyResolves=colorDepthRank(record.color)!==colorDepthRank(other.color);if(sidePolicyResolves)resolvedBySidePolicyPairs++;else if(depthPolicyResolves)resolvedByLayerDepthPairs++;else if(colorPolicyResolves)resolvedByColorDepthPairs++;else{unresolvedBlinkRiskPairs++;unresolvedBlinkRiskAreaM2+=area;tileUnresolved++;tileUnresolvedArea+=area;}const pair=[materialNames[record.kind]??String(record.kind),materialNames[other.kind]??String(other.kind)].sort().join('/');materialPairs[pair]=(materialPairs[pair]??0)+1;
      const center=record.p.reduce((sum,p)=>[sum[0]+p[0]/3,sum[1]+p[1]/3],[0,0]),native=record.axis===0?[record.d/record.n[0],center[0],center[1]]:record.axis===1?[center[0],record.d/record.n[1],center[1]]:[center[0],center[1],record.d/record.n[2]],authored=authoredPoint(native[0],native[2]),sample={tile:name,authored_x:Number(authored[0].toFixed(3)),authored_z:Number(authored[1].toFixed(3)),height_m:Number(native[1].toFixed(3)),area_m2:Number(area.toFixed(6)),materials:pair,facing,resolution:sidePolicyResolves?'side-policy':depthPolicyResolves?'layer-depth':colorPolicyResolves?'color-depth':'unresolved',layer_priorities:[other.layerPriority,record.layerPriority],colors:[other.color.map(value=>Number(value.toFixed(4))),record.color.map(value=>Number(value.toFixed(4)))],color_distance:Number(colorDistance.toFixed(4))};if(samples.length<80)samples.push(sample);else{let smallest=0;for(let i=1;i<samples.length;i++)if(samples[i].area_m2<samples[smallest].area_m2)smallest=i;if(sample.area_m2>samples[smallest].area_m2)samples[smallest]=sample;}if(sample.resolution==='unresolved'){if(unresolvedSamples.length<80)unresolvedSamples.push(sample);else{let smallest=0;for(let i=1;i<unresolvedSamples.length;i++)if(unresolvedSamples[i].area_m2<unresolvedSamples[smallest].area_m2)smallest=i;if(sample.area_m2>unresolvedSamples[smallest].area_m2)unresolvedSamples[smallest]=sample;}}
    }
    const id=records.push(record)-1;for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){const key=`${record.planeKey}/${x}/${y}`,list=grid.get(key)??[];list.push(id);grid.set(key,list);}
  }
  tileReports.push({tile:name,triangles:vertices/3,candidate_pairs:tileCandidates,coplanar_overlap_pairs:tileOverlaps,coplanar_overlap_area_m2:Number(tileArea.toFixed(6)),unresolved_blink_risk_pairs:tileUnresolved,unresolved_blink_risk_area_m2:Number(tileUnresolvedArea.toFixed(6))});
}
samples.sort((a,b)=>b.area_m2-a.area_m2);unresolvedSamples.sort((a,b)=>b.area_m2-a.area_m2);const affectedTiles=tileReports.filter(tile=>tile.coplanar_overlap_pairs>0),unresolvedTiles=tileReports.filter(tile=>tile.unresolved_blink_risk_pairs>0),report={version:'5',world:path.basename(worldRoot),minimum_overlap_area_m2:minimumArea,color_tolerance:colorTolerance,detail_tiles_scanned:tileNames.length,triangles_scanned:trianglesScanned,non_degenerate_triangles:nonDegenerateTriangles,candidate_pairs:candidatePairs,max_candidates_per_triangle:maxCandidatesPerTriangle,coplanar_overlap_pairs:coplanarOverlapPairs,coplanar_overlap_area_m2:Number(coplanarOverlapAreaM2.toFixed(6)),visual_conflict_pairs:visualConflictPairs,visual_conflict_area_m2:Number(visualConflictAreaM2.toFixed(6)),same_facing_conflict_pairs:sameFacingConflictPairs,same_facing_conflict_area_m2:Number(sameFacingConflictAreaM2.toFixed(6)),opposite_facing_conflict_pairs:oppositeFacingConflictPairs,opposite_facing_conflict_area_m2:Number(oppositeFacingConflictAreaM2.toFixed(6)),resolved_by_browser_side_policy_pairs:resolvedBySidePolicyPairs,resolved_by_layer_depth_pairs:resolvedByLayerDepthPairs,resolved_by_color_depth_pairs:resolvedByColorDepthPairs,unresolved_blink_risk_pairs:unresolvedBlinkRiskPairs,unresolved_blink_risk_area_m2:Number(unresolvedBlinkRiskAreaM2.toFixed(6)),affected_tiles:affectedTiles.length,unresolved_tiles:unresolvedTiles.length,material_pairs:materialPairs,samples,unresolved_samples:unresolvedSamples,tiles:tileReports,result:unresolvedBlinkRiskPairs===0?'passed':'failed'};
const text=JSON.stringify(report,null,2)+'\n';if(output)fs.writeFileSync(output,text);else process.stdout.write(text);if(report.result!=='passed')process.exitCode=1;
