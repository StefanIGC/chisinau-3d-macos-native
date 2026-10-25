import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const buildings=JSON.parse(fs.readFileSync(new URL('data/columna-ismail-tighina-buildings.json',root),'utf8'));
const realm=JSON.parse(fs.readFileSync(new URL('data/columna-ismail-tighina.json',root),'utf8'));
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message);};
const eps=1e-6;

function same(a,b){return Math.abs(a[0]-b[0])<eps&&Math.abs(a[1]-b[1])<eps;}
function area(ring){let value=0;for(let i=0;i<ring.length-1;i++)value+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];return value/2;}
function orient(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function between(a,b,c){return Math.min(a,b)-eps<=c&&c<=Math.max(a,b)+eps;}
function intersects(a,b,c,d){
 const ab1=orient(a,b,c),ab2=orient(a,b,d),cd1=orient(c,d,a),cd2=orient(c,d,b);
 if(((ab1>eps&&ab2<-eps)||(ab1<-eps&&ab2>eps))&&((cd1>eps&&cd2<-eps)||(cd1<-eps&&cd2>eps)))return true;
 for(const [o,p,q,r]of[[ab1,a,b,c],[ab2,a,b,d],[cd1,c,d,a],[cd2,c,d,b]])if(Math.abs(o)<=eps&&between(p[0],q[0],r[0])&&between(p[1],q[1],r[1]))return true;
 return false;
}
function selfIntersects(ring){
 for(let i=0;i<ring.length-1;i++)for(let j=i+1;j<ring.length-1;j++){
  if(Math.abs(i-j)<=1||(i===0&&j===ring.length-2))continue;
  if(intersects(ring[i],ring[i+1],ring[j],ring[j+1]))return true;
 }
 return false;
}
function pointInPolygon(point,ring){
 let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if(((a[1]>point[1])!==(b[1]>point[1]))&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function polygonsOverlap(a,b){
 for(let i=0;i<a.length-1;i++)for(let j=0;j<b.length-1;j++)if(intersects(a[i],a[i+1],b[j],b[j+1]))return true;
 return a.some(p=>pointInPolygon(p,b))||b.some(p=>pointInPolygon(p,a));
}
function roadZ(x){const [a,b]=realm.road.axis;return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}

check(realm.sector==='COL-IT-01','identificatorul sectorului s-a schimbat');
check(buildings.length===66,`sunt ${buildings.length} corpuri, nu 66`);
check(buildings.filter(b=>b.streetFront).length===15,'numărul fronturilor stradale nu este 15');

const ids=new Set(),nativeIds=new Set();
for(const b of buildings){
 check(!ids.has(b.id),`ID duplicat: ${b.id}`);ids.add(b.id);
 check(b.p.length>=4&&same(b.p[0],b.p.at(-1)),`${b.id}: amprentă neînchisă`);
 check(Math.abs(area(b.p))>3,`${b.id}: amprentă degenerată`);
 check(!selfIntersects(b.p),`${b.id}: amprentă auto-intersectată`);
 check(b.height>2.4&&b.levels>=1,`${b.id}: înălțime invalidă`);
 check(b.estimatedHeight===true&&typeof b.heightSource==='string',`${b.id}: estimarea verticală nu este declarată`);
 check(Array.isArray(b.sourceIds)&&b.sourceIds.length>0,`${b.id}: lipsește proveniența geometrică`);
 for(const id of b.nativeIds){check(!nativeIds.has(id),`${b.id}: ID nativ duplicat ${id}`);nativeIds.add(id);}
 for(const p of b.p)check(Math.abs(p[1]-roadZ(p[0]))>realm.road.width/2-.15,`${b.id}: intră în carosabil`);
}

for(const [index,sidewalk]of realm.sidewalks.entries()){
 check(sidewalk.length===5&&same(sidewalk[0],sidewalk.at(-1)),`trotuarul ${index+1} nu este închis`);
 check(Math.abs(area(sidewalk))>700,`trotuarul ${index+1} nu este continuu pe segment`);
 for(const b of buildings)check(!polygonsOverlap(b.p,sidewalk),`${b.id}: se suprapune cu trotuarul ${index+1}`);
}

for(let x=1215;x<=1405;x+=10){
 const z=roadZ(x);
 check(pointInPolygon([x,z+6.7],realm.sidewalks[0]),`gol pe trotuarul nord la x=${x}`);
 check(pointInPolygon([x,z-7.2],realm.sidewalks[1]),`gol pe trotuarul sud la x=${x}`);
}
for(const [x,z]of realm.trees)check(Math.abs(z-roadZ(x))>realm.road.width/2+.6,`arbore în carosabil la ${x},${z}`);
for(const [x,z]of realm.gates)check(Math.abs(z-roadZ(x))>realm.road.width/2+.6,`poartă în carosabil la ${x},${z}`);
for(const [name,[a,b]]of Object.entries(realm.crossings)){
 check(Math.hypot(b[0]-a[0],b[1]-a[1])>=10,`${name}: trecere prea scurtă`);
}

check(nativeIds.size===buildings.length,'lista de înlocuire nativă nu acoperă fiecare corp exact o dată');
if(failures.length){console.error(`COL-IT-01: ${failures.length} verificări eșuate`);for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log(`COL-IT-01 OK: ${buildings.length} corpuri, ${buildings.filter(b=>b.streetFront).length} fronturi, 2 trotuare continue, ${Object.keys(realm.crossings).length} traversări, ${realm.trees.length} arbori; ${nativeIds.size} ID-uri vechi înlocuite fără duplicate.`);
