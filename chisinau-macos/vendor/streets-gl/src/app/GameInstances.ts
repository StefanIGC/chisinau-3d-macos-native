import {gameRender,type GameInstanceOverride} from './GameBridge';
import {groundOwners} from './objects/GameGroundMask';

function inRing(x:number,z:number,ring:number[][],tolerance=.35){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
        const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length||1)));
        if(Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<=tolerance)return true;
        if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
}

function inPolygons(x:number,z:number,polygons:number[][][][]){
    return polygons.some(rings=>inRing(x,z,rings[0])&&!rings.slice(1).some(hole=>inRing(x,z,hole,0)));
}

type OwnedArea={bounds:number[];polygons?:number[][][][];circle?:[number,number,number]};
const OWNERSHIP_CELL=256,ownershipGrid=new Map<string,OwnedArea[]>();
let groundRevision=-1,buildingRevision=-1;
function indexArea(area:OwnedArea){
    const b=area.bounds,minX=Math.floor((b[0]-.35)/OWNERSHIP_CELL),maxX=Math.floor((b[2]+.35)/OWNERSHIP_CELL),minZ=Math.floor((b[1]-.35)/OWNERSHIP_CELL),maxZ=Math.floor((b[3]+.35)/OWNERSHIP_CELL);
    for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){const key=x+','+z,list=ownershipGrid.get(key);if(list)list.push(area);else ownershipGrid.set(key,[area]);}
}
function refreshOwnershipIndex(){
    if(groundRevision===groundOwners.revision&&buildingRevision===gameRender.revision)return;
    ownershipGrid.clear();
    for(const owner of groundOwners.items)indexArea({bounds:owner.bounds,polygons:owner.rings});
    for(const replacement of gameRender.replacements){
        const polygons=replacement.polygons??(replacement.rings?[replacement.rings]:[]);
        if(polygons.length&&replacement.bounds)indexArea({bounds:replacement.bounds,polygons});
        if(replacement.radius>0)indexArea({bounds:[replacement.x-replacement.radius,replacement.z-replacement.radius,replacement.x+replacement.radius,replacement.z+replacement.radius],circle:[replacement.x,replacement.z,replacement.radius]});
    }
    groundRevision=groundOwners.revision;buildingRevision=gameRender.revision;
}

/** Authored ground and completed authored buildings own every native instance
 * inside their exact plans. This automatically covers new worked zones without
 * maintaining a list of cranes, poles, furniture or other Streets GL assets. */
export function isAuthoredWorldPoint(x:number,z:number){
    refreshOwnershipIndex();
    const candidates=ownershipGrid.get(Math.floor(x/OWNERSHIP_CELL)+','+Math.floor(z/OWNERSHIP_CELL))??[];
    for(const area of candidates){
        const b=area.bounds;if(x<b[0]-.35||x>b[2]+.35||z<b[1]-.35||z>b[3]+.35)continue;
        if(area.circle&&Math.hypot(x-area.circle[0],z-area.circle[1])<=area.circle[2])return true;
        if(area.polygons&&inPolygons(x,z,area.polygons))return true;
    }
    return false;
}

/** Hide every native instance owned by authored ground/buildings, plus explicit
 * type-specific replacements. The Tile resets from its preserved source buffer
 * before this runs, so revocation restores the exact native geometry.
 */
export function applyInstanceOverrides(buffer:Float32Array,x:number,z:number,items:GameInstanceOverride[],type:string,componentsPerInstance=5,scaleComponents=1):boolean {
    let changed=false;
    for(let i=0;i<buffer.length;i+=componentsPerInstance){
        const px=buffer[i]+x,pz=buffer[i+2]+z;
        const hidden=isAuthoredWorldPoint(px,pz)||items.some(item=>item.type===type&&item.radius>0&&(px-item.x)**2+(pz-item.z)**2<=item.radius**2);
        if(!hidden)continue;
        for(let component=0;component<scaleComponents;component++)if(buffer[i+3+component]!==0){buffer[i+3+component]=0;changed=true;}
    }
    return changed;
}
