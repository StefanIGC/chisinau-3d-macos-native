/** Arcade gameplay values, deliberately independent of real weapon ballistics. */
export const WEAPON={magazine:30,reserve:90,reloadSeconds:2.0,shotInterval:.11,projectileSpeed:115,gravity:9.8,lifetime:2.5};
export type GunState={equipped:boolean;ammo:number;reserve:number;cooldown:number;reload:number;shots:number};
export type Point3={x:number;y:number;z:number};
export type HitBox={min:Point3;max:Point3};
export const makeGunState=():GunState=>({equipped:false,ammo:WEAPON.magazine,reserve:WEAPON.reserve,cooldown:0,reload:0,shots:0});
export function reloadGun(s:GunState){if(!s.equipped||s.reload>0||s.ammo>=WEAPON.magazine||s.reserve===0)return false;s.reload=WEAPON.reloadSeconds;return true;}
export function advanceGun(s:GunState,dt:number){s.cooldown=Math.max(-Math.min(dt,.05),s.cooldown-dt);if(s.reload===0)return false;s.reload=Math.max(0,s.reload-dt);if(s.reload>1e-8)return false;const amount=Math.min(WEAPON.magazine-s.ammo,s.reserve);s.ammo+=amount;s.reserve-=amount;s.reload=0;return true;}
export function fireGun(s:GunState){if(!s.equipped||s.reload>0||s.cooldown>1e-8||s.ammo===0)return false;s.ammo--;s.shots++;s.cooldown+=WEAPON.shotInterval;return true;}
/** Return the first contact fraction on a swept segment, including starts inside. */
export function segmentBox(a:Point3,b:Point3,box:HitBox):number|null {
  let enter=0,leave=1;
  for(const key of ['x','y','z'] as const){const d=b[key]-a[key];if(Math.abs(d)<1e-10){if(a[key]<box.min[key]||a[key]>box.max[key])return null;continue;}
    let t0=(box.min[key]-a[key])/d,t1=(box.max[key]-a[key])/d;if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);leave=Math.min(leave,t1);if(enter>leave)return null;
  }
  return enter;
}
