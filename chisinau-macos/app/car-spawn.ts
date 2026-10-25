type Point={x:number;y:number;z:number};
type SpawnWorld={
  ground:(x:number,z:number)=>number;
  surface:(x:number,z:number,ceiling:number)=>number;
  ready:(x:number,z:number,y:number)=>boolean;
  blocked:(x:number,z:number,heading:number)=>boolean;
};

export function findCarSpawn(player:Point,heading:number,world:SpawnWorld):Point|null{
  const c=Math.cos(heading),s=Math.sin(heading);
  for(const radius of [3.6,6,10,16])for(let i=0;i<12;i++){
    const angle=heading-Math.PI/3+i*Math.PI/6;
    const x=player.x-Math.sin(angle)*radius,z=player.z-Math.cos(angle)*radius,y=world.ground(x,z);
    if(Math.abs(y-player.y)>2||world.blocked(x,z,heading))continue;
    let clear=true;
    for(const [dx,dz] of [[0,0],[-1,-2.3],[1,-2.3],[-1,2.3],[1,2.3]]){
      const px=x+dx*c+dz*s,pz=z-dx*s+dz*c,floor=world.ground(px,pz);
      if(!world.ready(px,pz,floor)||Math.abs(floor-y)>.35||Math.abs(world.surface(px,pz,floor+2)-floor)>.35){clear=false;break;}
    }
    if(clear)return{x,y,z};
  }
  return null;
}
