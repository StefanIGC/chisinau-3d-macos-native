type Point={x:number;y:number;z:number};
type SpawnWorld={
 ground:(x:number,z:number)=>number;
 surface:(x:number,z:number,ceiling:number)=>number;
 ready:(x:number,z:number,y:number)=>boolean;
 blocked:(from:Point,to:Point)=>boolean;
 occupied:(x:number,z:number,y:number)=>boolean;
};
/** Test the actual supporting surface, including authored paving and roofs.
 * Clearance starts above that surface, never below a newly added sidewalk. */
export function helicopterSpot(world:SpawnWorld,x:number,z:number,ceiling:number){
 if(!world.ready(x,z,ceiling))return null;
 const samples:Point[]=[];
 for(let i=0;i<13;i++){
  const r=i===12?0:5.7,a=i*Math.PI/6,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
  if(!world.ready(px,pz,ceiling))return null;
  samples.push({x:px,y:world.surface(px,pz,ceiling),z:pz});
 }
 const low=Math.min(...samples.map(p=>p.y)),floor=Math.max(...samples.map(p=>p.y));
 if(!Number.isFinite(floor)||floor-low>.65||world.occupied(x,z,floor))return null;
 for(const p of samples){
  if(world.blocked({...p,y:p.y+.22},{...p,y:floor+12}))return null;
 }
 // Chords catch narrow walls/poles between perimeter probes. The skids allow
 // shallow paving seams, but the fuselage and rotor disk need clear airspace.
 for(const height of[.75,1.6,2.65])for(let i=0;i<12;i++){
  const a=samples[i],b=samples[(i+5)%12];
  if(world.blocked({...a,y:floor+height},{...b,y:floor+height}))return null;
 }
 return{x,y:floor,z};
}
