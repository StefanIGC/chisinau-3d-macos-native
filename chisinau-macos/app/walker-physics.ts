type Point={x:number;y:number;z:number};
export type WalkerState=Point&{vx:number;vy:number;vz:number;grounded:boolean;recovery:number;roll:number;impact:number;heading:number};
export type WalkWorld={surface:(x:number,z:number,ceiling:number)=>number;clear:(x:number,z:number,fromX:number,fromZ:number,y:number)=>boolean;ready:(x:number,z:number)=>boolean;ceiling?:(from:Point,to:Point)=>boolean};
export function makeWalkerState(p:Point):WalkerState{return{...p,vx:0,vy:0,vz:0,grounded:true,recovery:0,roll:0,impact:0,heading:0};}
export function ejectWalker(s:WalkerState,p:Point,velocity:Point){
  Object.assign(s,makeWalkerState(p));s.vx=velocity.x;s.vy=velocity.y;s.vz=velocity.z;s.grounded=false;
  const speed=Math.hypot(s.vx,s.vz);s.heading=speed>.1?Math.atan2(s.vx,s.vz):0;
  if(speed>4){s.recovery=1.1+Math.min(speed*.055,1.6);s.impact=speed;s.vy=Math.max(2,s.vy);}
}
export function jumpWalker(s:WalkerState){if(s.grounded&&s.recovery===0){s.vy=5.3;s.grounded=false;}}
/** Feet stay in world coordinates: roofs, ledges, airborne exits and terrain share gravity. */
export function advanceWalker(s:WalkerState,input:{x:number;z:number},dt:number,world:WalkWorld){
  let remaining=Math.min(.1,Math.max(0,dt));
  while(remaining>1e-8){
    const step=Math.min(remaining,1/90);remaining-=step;
    if(!world.ready(s.x,s.z))return;
    if(s.recovery<=0){
      const blend=s.grounded?1:1-Math.exp(-2*step);
      s.vx+=(input.x-s.vx)*blend;s.vz+=(input.z-s.vz)*blend;
    }else if(s.grounded){
      const drag=Math.exp(-3.2*step);s.vx*=drag;s.vz*=drag;s.recovery=Math.max(0,s.recovery-step);
      s.roll+=Math.hypot(s.vx,s.vz)*step/1.3;
    }
    const nx=s.x+s.vx*step,nz=s.z+s.vz*step;
    if(world.ready(nx,s.z)&&world.clear(nx,s.z,s.x,s.z,s.y))s.x=nx;else s.vx=0;
    if(world.ready(s.x,nz)&&world.clear(s.x,nz,s.x,s.z,s.y))s.z=nz;else s.vz=0;
    // Only surfaces below the feet (plus a small walking step) can catch a fall.
    const floor=world.surface(s.x,s.z,s.y+(s.grounded?.4:.06));
    const oldY=s.y,impactSpeed=-s.vy;
    s.vy=Math.max(-55,s.vy-16*step);const nextY=s.y+s.vy*step;
    if(s.vy>0&&world.ceiling?.({x:s.x,y:oldY+1.75,z:s.z},{x:s.x,y:nextY+1.75,z:s.z})){s.vy=0;}
    else s.y=nextY;
    if(s.y<=floor&&s.vy<=0){
      s.y=floor;s.vy=0;
      if(!s.grounded&&impactSpeed>8){s.recovery=Math.max(s.recovery,Math.min(2.8,.8+impactSpeed*.065));s.impact=Math.max(s.impact,impactSpeed);}
      s.grounded=true;
    }else s.grounded=false;
    if(s.recovery===0){s.roll=0;s.impact=0;}
  }
}
