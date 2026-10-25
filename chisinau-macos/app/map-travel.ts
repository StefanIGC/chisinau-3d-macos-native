import {geoToLocal} from './streets-coordinates';
export type MapPoint={lat:number;lon:number};
type Destination={x:number;z:number};
type Hooks={begin:()=>void;restore:()=>void;loaded:(x:number,z:number)=>boolean;prepared?:(x:number,z:number)=>boolean;clear:(x:number,z:number)=>boolean;commit:(x:number,z:number)=>void};

/** Stage streamed destinations without moving the player until the landing is ready. */
export function createMapTravel(hooks:Hooks,clock=()=>performance.now()){
  let pending:{target:Destination;points:Destination[];index:number;missing:boolean;retryAt:number;deadline:number;resolve:()=>void;reject:(e:Error)=>void;cleanup:()=>void}|null=null;
  function cancel(error:Error=new DOMException('Teleportarea a fost anulată.','AbortError')){
    if(!pending)return;const task=pending;pending=null;task.cleanup();hooks.restore();task.reject(error);
  }
  function request(point:MapPoint,signal?:AbortSignal):Promise<void>{
    if(!Number.isFinite(point.lat)||!Number.isFinite(point.lon)||Math.abs(point.lat)>85.05112878||Math.abs(point.lon)>180)return Promise.reject(new Error('Alege un punct valid pe hartă.'));
    if(signal?.aborted)return Promise.reject(new DOMException('Teleportarea a fost anulată.','AbortError'));
    cancel();
    const [x,,z]=geoToLocal(point.lat,point.lon),points:Destination[]=[{x,z}];
    // If a roof covers the selected point, look for open ground nearby.
    for(const radius of[3,8,16,28,45,70])for(let i=0;i<12;i++)points.push({x:x+Math.cos(i*Math.PI/6)*radius,z:z+Math.sin(i*Math.PI/6)*radius});
    return new Promise((resolve,reject)=>{
      const abort=()=>cancel();
      pending={target:{x,z},points,index:0,missing:false,retryAt:0,deadline:clock()+45000,resolve,reject,cleanup:()=>signal?.removeEventListener('abort',abort)};
      signal?.addEventListener('abort',abort,{once:true});hooks.begin();
    });
  }
  function step(){
    const task=pending;if(!task)return;const now=clock();
    if(now>task.deadline){cancel(new Error('Destinația nu s-a încărcat. Poți reîncerca sau alege alt punct.'));return;}
    if(now<task.retryAt)return;
    if(hooks.prepared&&!hooks.prepared(task.target.x,task.target.z))return;
    // Keep the exact selection first even when streaming takes several frames.
    if(task.index===0&&!hooks.loaded(task.target.x,task.target.z))return;
    const budget=clock()+3;
    for(let checked=0;checked<6&&clock()<=budget;checked++){
      const point=task.points[task.index++];
      if(!hooks.loaded(point.x,point.z))task.missing=true;
      else if(hooks.clear(point.x,point.z)){
        pending=null;task.cleanup();hooks.commit(point.x,point.z);task.resolve();return;
      }
      if(task.index===task.points.length){
        if(!task.missing){cancel(new Error('Punctul este ocupat de clădiri. Alege o stradă sau un spațiu deschis în apropiere.'));return;}
        task.index=0;task.missing=false;task.retryAt=now+750;return;
      }
    }
  }
  return{request,step,cancel,get target(){return pending?.target??null;}};
}
