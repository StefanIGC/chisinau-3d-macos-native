import {GAME_SPAWN} from './game-spawn';
export const HELICOPTER={home:GAME_SPAWN.helicopter,maxHeight:240,cruiseSpeed:25,boostSpeed:38,climbSpeed:8,descentSpeed:5};
export type FlightState={x:number;y:number;z:number;heading:number;vx:number;vy:number;vz:number;rotor:number;pitch:number;bank:number;grounded:boolean;contact:boolean;waiting:boolean};
export type FlightInput={forward:number;turn:number;lift:number;boost:boolean;land:boolean};
export type FlightWorld={ground:(x:number,z:number)=>number;surface?:(x:number,z:number,ceiling:number,heading:number)=>number;ready:(x:number,z:number,y?:number)=>boolean;blocked:(from:FlightState,to:{x:number;y:number;z:number;heading:number})=>boolean};
export const IDLE_FLIGHT:FlightInput={forward:0,turn:0,lift:0,boost:false,land:false};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const damp=(a:number,b:number,k:number,dt:number)=>b+(a-b)*Math.exp(-k*dt);
export function makeFlightState(x=HELICOPTER.home.x,y=0,z=HELICOPTER.home.z,heading=0):FlightState{return{x,y,z,heading,vx:0,vy:0,vz:0,rotor:0,pitch:0,bank:0,grounded:true,contact:false,waiting:false};}

/** Assisted arcade flight, substepped for stable landings and swept collisions. */
export function advanceHelicopter(s:FlightState,input:FlightInput,dt:number,piloting:boolean,world:FlightWorld){
  if(dt<=0)return;
  const count=Math.ceil(Math.min(dt,.1)/(.02)),step=Math.min(dt,.1)/count;
  s.contact=false;s.waiting=false;
  for(let i=0;i<count;i++){
    s.rotor=damp(s.rotor,piloting||!s.grounded?1:0,1.8,step);
    const ready=world.ready(s.x,s.z,s.y);
    const terrain=world.ground(s.x,s.z);
    // A missing streaming tile must never behave like an invisible wall. While
    // airborne, keep the existing altitude and momentum until its terrain and
    // collision mesh arrive. Landing still requires a fully synchronized tile.
    const floor=ready?(world.surface?.(s.x,s.z,s.y+.25,s.heading)??terrain):terrain;
    if(s.grounded&&Math.abs(s.y-floor)<.5)s.y=floor;
    else if(s.y>floor+.5)s.grounded=false;
    const land=input.land||!piloting,forward=land?0:clamp(input.forward,-1,1),turn=land?0:clamp(input.turn,-1,1);
    const lift=land?-0.55:clamp(input.lift,-1,1),power=s.rotor>.72;
    const heading=s.heading-turn*1.15*step;
    const speed=(input.boost?HELICOPTER.boostSpeed:HELICOPTER.cruiseSpeed)*forward*(forward<0?.45:1);
    const flying=!s.grounded||(lift>0&&power);
    s.vx=damp(s.vx,flying&&power?-Math.sin(heading)*speed:0,forward?1.4:3.4,step);
    s.vz=damp(s.vz,flying&&power?-Math.cos(heading)*speed:0,forward?1.4:3.4,step);
    s.vy=damp(s.vy,power?lift*(lift>0?HELICOPTER.climbSpeed:HELICOPTER.descentSpeed):0,3,step);
    const next={x:s.x+s.vx*step,y:s.y+s.vy*step,z:s.z+s.vz*step,heading};
    const nextReady=world.ready(next.x,next.z,next.y),nextTerrain=world.ground(next.x,next.z);
    if(!ready||!nextReady)s.waiting=true;
    const nextFloor=nextReady?(world.surface?.(next.x,next.z,s.y+.25,heading)??nextTerrain):nextTerrain;
    // Do not descend toward terrain whose exact height/colliders are still in
    // transit. Horizontal flight and climbing continue without interruption.
    if(!nextReady&&next.y<s.y){next.y=s.y;s.vy=Math.max(0,s.vy);}
    next.y=clamp(next.y,nextFloor,Math.max(nextFloor,nextTerrain+HELICOPTER.maxHeight));
    if(nextReady&&world.blocked(s,next)){
      s.vx=s.vz=0;s.contact=true;
      // Still allow climbing away from a wall when horizontal movement is blocked.
      const vertical={x:s.x,y:clamp(s.y+s.vy*step,floor,terrain+HELICOPTER.maxHeight),z:s.z,heading:s.heading};
      if(!world.blocked(s,vertical))s.y=vertical.y;else s.vy=0;
    }else{s.x=next.x;s.y=next.y;s.z=next.z;s.heading=heading;}
    const localTerrain=world.ground(s.x,s.z),localReady=world.ready(s.x,s.z,s.y);
    const localFloor=localReady?(world.surface?.(s.x,s.z,s.y+.25,s.heading)??localTerrain):localTerrain;
    s.grounded=localReady&&s.y<=localFloor+.025&&s.vy<=0;
    if(s.grounded){s.y=localFloor;s.vx=s.vy=s.vz=0;}
    if(s.y>=localTerrain+HELICOPTER.maxHeight&&s.vy>0)s.vy=0;
    s.pitch=damp(s.pitch,flying?-.17*forward:0,4,step);
    s.bank=damp(s.bank,flying?-.15*turn:0,4,step);
  }
}
