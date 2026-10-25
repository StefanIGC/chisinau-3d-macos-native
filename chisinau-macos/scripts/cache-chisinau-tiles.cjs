#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'public', 'streets', 'tiles');
const jobs = [];

function addRange(kind, zoom, minX, maxX, minY, maxY) {
  for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
    if (kind === 'vector') jobs.push({url:`https://tiles.streets.gl/vector/${zoom}/${x}/${y}`,file:path.join(root,kind,String(zoom),String(x),`${y}.pbf`)});
    else jobs.push({url:`https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer/tile/${zoom}/${y}/${x}`,file:path.join(root,kind,String(zoom),String(y),`${x}.lerc`)});
  }
}

// Local authored city plus a generous flight/fog margin.
addRange('vector',16,38009,38023,23036,23051);
addRange('vector',13,4750,4754,2878,2882);
addRange('elevation',13,4749,4754,2877,2882);

async function main() {
  let cursor=0,downloaded=0,reused=0;
  async function worker() {
    while(cursor<jobs.length){
      const job=jobs[cursor++];
      try{await fs.stat(job.file);reused++;continue;}catch{}
      const response=await fetch(job.url,{redirect:'follow'});
      if(!response.ok&&!(response.status===404&&job.file.endsWith('.pbf')))throw new Error(`${response.status} ${job.url}`);
      const bytes=response.ok?Buffer.from(await response.arrayBuffer()):Buffer.alloc(0);
      await fs.mkdir(path.dirname(job.file),{recursive:true});
      await fs.writeFile(`${job.file}.part`,bytes);
      await fs.rename(`${job.file}.part`,job.file);
      downloaded++;
      if((downloaded+reused)%40===0)process.stdout.write(`Dale locale: ${downloaded+reused}/${jobs.length}\n`);
    }
  }
  await Promise.all(Array.from({length:8},worker));
  process.stdout.write(`Gata: ${downloaded} descărcate, ${reused} existente, ${jobs.length} dale locale.\n`);
}

main().catch(error=>{console.error(error);process.exitCode=1;});
