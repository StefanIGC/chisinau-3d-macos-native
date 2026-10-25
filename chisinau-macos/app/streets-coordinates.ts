// A single conformal transform is shared by the camera, native geometry and minimap.
// Streets GL uses X=northing, Z=easting in spherical Mercator metres.
export const ORIGIN = {lat:47.02473049780068,lon:28.832596947039136};
export const ROTATION = .7793683518335637;
export const HALF_WORLD = 20037508.34;
export const WORLD_SCALE = (HALF_WORLD / 180 / 111195) / Math.cos(ORIGIN.lat * Math.PI / 180);
const c=Math.cos(ROTATION),s=Math.sin(ROTATION);
const north=Math.log(Math.tan((90+ORIGIN.lat)*Math.PI/360))*HALF_WORLD/Math.PI;
const east=ORIGIN.lon*HALF_WORLD/180;

export function localToMercator(x:number,y:number,z:number):[number,number,number] {
  const dx=x-24,dz=z+15;
  return [north+(-s*dx-c*dz)*WORLD_SCALE,y*WORLD_SCALE,east+(c*dx-s*dz)*WORLD_SCALE];
}

export function mercatorToLocal(x:number,y:number,z:number):[number,number,number] {
  const n=(x-north)/WORLD_SCALE,e=(z-east)/WORLD_SCALE;
  return [24+c*e-s*n,y/WORLD_SCALE,-15-s*e-c*n];
}

export function localToGeo(x:number,z:number) {
  const [n,,e]=localToMercator(x,0,z);
  return {lat:Math.atan(Math.exp(n*Math.PI/HALF_WORLD))*360/Math.PI-90,lon:e*180/HALF_WORLD};
}

export function geoToLocal(lat:number,lon:number) {
  return mercatorToLocal(Math.log(Math.tan((90+lat)*Math.PI/360))*HALF_WORLD/Math.PI,0,lon*HALF_WORLD/180);
}

export function localBearing(yaw:number) {
  const dx=-Math.sin(yaw),dz=-Math.cos(yaw);
  return Math.atan2(c*dx-s*dz,-s*dx-c*dz);
}
