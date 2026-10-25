export type DriveGuardState={x:number;z:number;heading:number;speed:number;gear:string};
export type DriveGuardPoint={x:number;z:number;distance:number;direction:number};

/**
 * Keep the probe farther away than the physical braking distance. At city
 * speeds this leaves time for a smooth stop; at the vehicle's maximum speed
 * the bounded 260 m look-ahead still exceeds its emergency stopping distance.
 */
export function driveGuardPoint(state:DriveGuardState):DriveGuardPoint{
  const speed=Math.abs(state.speed);
  const direction=speed>.2?Math.sign(state.speed):state.gear==='R'?-1:1;
  const distance=Math.min(260,65+speed*1.4+speed*speed/13);
  return{x:state.x-Math.sin(state.heading)*direction*distance,z:state.z-Math.cos(state.heading)*direction*distance,distance,direction};
}

export function updateDriveLoadTarget(
  current:DriveGuardPoint|null,
  candidate:DriveGuardPoint|null,
  ready:(point:DriveGuardPoint)=>boolean
):DriveGuardPoint|null{
  if(current&&candidate&&candidate.direction!==current.direction)current=null;
  if(current&&ready(current))current=null;
  if(!current&&candidate&&!ready(candidate))current=candidate;
  return current;
}
