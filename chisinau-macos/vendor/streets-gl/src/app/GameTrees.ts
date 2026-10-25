import type {GameTreeOverride} from './GameBridge';
import {getTreeTextureScaling} from '~/lib/tile-processing/tile3d/utils';

const CELL=128;
let indexedItems:GameTreeOverride[]|null=null;
let grid=new Map<string,GameTreeOverride[]>();
function refreshIndex(items:GameTreeOverride[]){
    if(items===indexedItems)return;
    indexedItems=items;grid=new Map();
    for(const item of items){
        const xs=item.polygon?.map(p=>p[0]),zs=item.polygon?.map(p=>p[1]);
        const minX=xs?.length?Math.min(...xs):item.x-item.radius,maxX=xs?.length?Math.max(...xs):item.x+item.radius;
        const minZ=zs?.length?Math.min(...zs):item.z-item.radius,maxZ=zs?.length?Math.max(...zs):item.z+item.radius;
        for(let x=Math.floor(minX/CELL);x<=Math.floor(maxX/CELL);x++)for(let z=Math.floor(minZ/CELL);z<=Math.floor(maxZ/CELL);z++){
            const key=x+','+z,list=grid.get(key);if(list)list.push(item);else grid.set(key,[item]);
        }
    }
}

/** Correct photographed trees in their existing native instances, retaining both LODs. */
export function applyTreeOverrides(buffer:Float32Array,x:number,z:number,items:GameTreeOverride[]):boolean {
    refreshIndex(items);
    let changed=false;
    for(let i=0;i<buffer.length;i+=6){
        const px=buffer[i]+x,pz=buffer[i+2]+z;
        for(const item of grid.get(Math.floor(px/CELL)+','+Math.floor(pz/CELL))??[]){
            if(Math.abs(px-item.x)>item.radius||Math.abs(pz-item.z)>item.radius)continue;
            if(item.polygon){
                let inside=false;
                for(let a=0,b=item.polygon.length-1;a<item.polygon.length;b=a++){
                    const p=item.polygon[a],q=item.polygon[b];
                    if((p[1]>pz)!==(q[1]>pz)&&px<(q[0]-p[0])*(pz-p[1])/(q[1]-p[1])+p[0])inside=!inside;
                }
                if(!inside)continue;
            }else if((px-item.x)**2+(pz-item.z)**2>item.radius**2)continue;
            buffer[i+3]=item.height*getTreeTextureScaling(item.texture);
            buffer[i+5]=item.texture;changed=true;break;
        }
    }
    return changed;
}
