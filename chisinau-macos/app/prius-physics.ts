/** Lightweight, deterministic driving model, in metres and seconds.
 * XW20 reference: Toyota's 2003 press pack (10.9 s to 100 km/h, 170 km/h).
 * Grip, energy use and suspension are tuned for this game's compact streets.
 */
export type Gear = 'P' | 'D' | 'R';
export type HybridMode = 'READY' | 'EV' | 'HYBRID' | 'CHARGE';
export type Obstacle = {x:number; z:number; w:number; d:number};
export type DriveInput = {throttle:number; brake:number; steer:number; handbrake:boolean; offroad:boolean};
export type CarState = {x:number; z:number; heading:number; speed:number; steer:number; acceleration:number; gear:Gear; energy:number; mode:HybridMode; braking:boolean; distance:number; impact:number};
export const PRIUS = {wheelbase:2.7, wheelRadius:.302, halfWidth:.87, halfLength:2.22, topSpeed:170/3.6, reverseSpeed:22/3.6, mass:1325};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function makeCarState(x=23.2,z=-5.7,heading=0):CarState {
  return {x,z,heading,speed:0,steer:0,acceleration:0,gear:'P',energy:.64,mode:'READY',braking:false,distance:0,impact:0};
}
export function selectGear(s:CarState, gear:Gear):boolean {
  if(Math.abs(s.speed)>.35)return false;
  s.gear=gear;s.speed=0;s.braking=gear==='P';return true;
}
/** Four separating axes: an oriented vehicle footprint against an axis-aligned obstacle. */
export function overlapsCar(x:number,z:number,heading:number,b:Obstacle,padding=0):boolean {
  const dx=b.x-x,dz=b.z-z,c=Math.cos(heading),s=Math.sin(heading);
  const hw=PRIUS.halfWidth+padding,hl=PRIUS.halfLength+padding,bw=b.w/2,bd=b.d/2;
  if(Math.abs(dx)>Math.abs(c)*hw+Math.abs(s)*hl+bw)return false;
  if(Math.abs(dz)>Math.abs(s)*hw+Math.abs(c)*hl+bd)return false;
  if(Math.abs(dx*c-dz*s)>hw+bw*Math.abs(c)+bd*Math.abs(s))return false;
  if(Math.abs(dx*s+dz*c)>hl+bw*Math.abs(s)+bd*Math.abs(c))return false;
  return true;
}
export function advanceCar(s:CarState,input:DriveInput,dt:number,blocked:(x:number,z:number,heading:number)=>boolean):void {
  // Substeps cap travel below 40 cm even at top speed, preventing tunnelling.
  let remaining=clamp(dt,0,.1);s.impact=0;
  while(remaining>1e-8){const h=Math.min(remaining,1/120);remaining-=h;step(s,input,h,blocked);}
}
function step(s:CarState,input:DriveInput,dt:number,blocked:(x:number,z:number,heading:number)=>boolean){
  const throttle=clamp(input.throttle,0,1),brake=clamp(input.brake,0,1),v=Math.abs(s.speed),direction=s.gear==='R'?-1:1;
  // Stronger city-speed response, with a smooth taper for fast driving.
  const grip=input.offroad?5.0:9.2;
  const steerLimit=Math.min(.62,Math.atan(grip*PRIUS.wheelbase/(v*v+4)));
  s.steer+=(-clamp(input.steer,-1,1)*steerLimit-s.steer)*(1-Math.exp(-14*dt));
  s.braking=brake>.05||input.handbrake;
  if(s.gear==='P'){s.speed=0;s.acceleration=0;s.mode='READY';return;}
  // Continuous power delivery; there are no artificial stepped gear shifts.
  const limit=s.gear==='R'?PRIUS.reverseSpeed:PRIUS.topSpeed;
  const traction=s.gear==='R'?1.75:Math.min(3.3,65500/(PRIUS.mass*Math.max(v,5)));
  const creep=throttle<.02&&brake<.01&&!input.handbrake?Math.max(0,1.3-v)*.8:0;
  const power=throttle*traction*Math.min(1,Math.max(0,(limit-v)*1.4))*(input.offroad?.7:1);
  const drag=v>.015?(.10+.00027*v*v+(input.offroad?.9:0)):0;
  const regen=throttle<.03&&v>.8?.28:0;
  const braking=brake*(input.offroad?5:8.2)+(input.handbrake?6.3:0);
  const oldSpeed=s.speed;
  const nextV=clamp(v+(power+creep-drag-regen-braking)*dt,0,limit);
  s.speed=nextV*direction;
  const turn=s.speed*Math.tan(s.steer)/PRIUS.wheelbase*dt;
  const heading=s.heading+turn;
  const nx=s.x-Math.sin(s.heading+turn*.5)*s.speed*dt,nz=s.z-Math.cos(s.heading+turn*.5)*s.speed*dt;
  if(blocked(nx,nz,heading)){s.impact=Math.max(s.impact,v);s.speed=0;}
  else{s.x=nx;s.z=nz;s.heading=heading;s.distance+=Math.abs(s.speed)*dt;}
  s.acceleration=clamp((s.speed-oldSpeed)/dt,-9,4);
  const charging=v>1&&(brake>.02||throttle<.02)&&!input.handbrake;
  const electric=(v<11&&throttle<.48&&s.energy>.43)||s.gear==='R';
  s.mode=charging?'CHARGE':electric?'EV':'HYBRID';
  // A bounded, illustrative hybrid buffer, not a fuel-consumption prediction.
  s.energy=clamp(s.energy+dt*(charging?.007*Math.min(v/12,1):electric?-.0008-throttle*.003:.0012-throttle*.0014),.4,.8);
  if(v<.05&&throttle<.01)s.mode='READY';
}
