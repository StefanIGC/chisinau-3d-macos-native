// Preserve the real DEM slope. Only the entrance landings and the photographed
// inner stair flight receive bounded local corrections (never one park-wide slab).
export const PARK_SCALE=(20037508.34/180/111195)/Math.cos(47.02473049780068*Math.PI/180);
export const PARK_NORTH=Math.log(Math.tan((90+47.02473049780068)*Math.PI/360))*20037508.34/Math.PI;
export const PARK_EAST=28.832596947039136*20037508.34/180;
export const PARK_C=Math.cos(.7793683518335637),PARK_S=Math.sin(.7793683518335637);
export function parkLocal(n:number,e:number):[number,number]{const x=(e-PARK_EAST)/PARK_SCALE,z=(n-PARK_NORTH)/PARK_SCALE;return[24+PARK_C*x-PARK_S*z,-15-PARK_S*x-PARK_C*z];}
export function parkStepEdge(x:number){const u=Math.min(1,Math.abs(x-24)/24);return -112+6*(1-u*u);}
export type ParkEntrances=[number,number,number]; // west, central café, east: street elevation
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export function parkTerrace(x:number,z:number){return Math.min(6,Math.max(0,Math.floor((z-parkStepEdge(x))/.75)+1))*.12;}
export function parkStepWeight(x:number,z:number){return(1-smooth(20,36,Math.abs(x-24)))*(1-smooth(-85,-35,z));}
export function parkStreet(x:number,levels:ParkEntrances){return x<12?levels[0]+(levels[1]-levels[0])*clamp((x+115.8)/127.8):x>36?levels[1]+(levels[2]-levels[1])*clamp((x-36)/124.9):levels[1];}
export function parkWeight(x:number,z:number){
  return smooth(0,8,Math.min(x+129,178-x))*smooth(-338,-335.15,z)*(1-smooth(-85,-35,z));
}
export function cathedralGrade(x:number,z:number,raw:number,levels:ParkEntrances){
  const side=smooth(0,8,Math.min(x+129,178-x));
  const north=side*smooth(-338,-335.15,z)*(1-smooth(-299,-263,z));
  const landing=parkStreet(x,levels)+1.2*clamp((z+335.15)/6.48);
  return raw+(landing-raw)*north+parkTerrace(x,z)*parkStepWeight(x,z);
}
