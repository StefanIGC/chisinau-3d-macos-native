import type {GroundOwner} from './objects/GameGroundMask';
import type {BuildingReplacement} from './objects/GameBuildingReplacement';
// The host game owns input and frame timing; Streets GL remains the world renderer.
export const gameMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('game') === '1';
export interface GameTreeOverride {x:number;z:number;radius:number;height:number;texture:number;polygon?:number[][];}
export interface GameInstanceOverride {type:'busStop'|'statueSmall'|'statueBig';x:number;z:number;radius:number;}
export const gameRender = {sunDirection:[-1,-1,-1] satisfies [number,number,number],distance:1500,scale:1,visible:true,revision:0,prepareRadius:0,streamFocus:null as [number,number]|null,streamVelocity:[0,0] as [number,number],replacements:[] as BuildingReplacement[],treeOverrides:[] as GameTreeOverride[],instanceOverrides:[] as GameInstanceOverride[]};

// The same exact tile set drives prefetch and the reveal gate, including tiles
// behind the opening camera. It is independent of its initial bearing.
export function preparationTiles(focus:[number,number],radius:number):[number,number][]{
    const size=40075016.68/65536,cx=(focus[1]+20037508.34)/size,cy=(20037508.34-focus[0])/size;
    const r=Math.max(0,Math.min(1800,radius))/size,result:[number,number][]=[];
    for(let x=Math.floor(cx-r);x<=Math.floor(cx+r);x++)for(let y=Math.floor(cy-r);y<=Math.floor(cy+r);y++){
        const dx=Math.max(x-cx,0,cx-x-1),dy=Math.max(y-cy,0,cy-y-1);
        if(dx*dx+dy*dy<=r*r)result.push([x,y]);
    }
    return result;
}

// A narrow corridor warms the tiles needed during a fast flight. TileSystem only
// expands the current point; future points stay single-tile hints so prediction
// does not flood the workers with 3x3 neighborhoods that may never be visited.
export function streamCenters(focus:[number,number],velocity:[number,number]):[number,number][]{
    const speed=Math.hypot(...velocity),factor=speed>90?90/speed:1;
    return [0,5,11,17].map(t=>[focus[0]+velocity[0]*factor*t,focus[1]+velocity[1]*factor*t]);
}

export interface GameCamera {
    sunDirection: [number, number, number];
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
    aspect: number;
    near: number;
    distance: number;
    scale: number;
    visible?: boolean;
    streamFocus?: [number,number];
    streamVelocity?: [number,number];
    prepareRadius?: number;
}

export interface GameTile {
    id: string;
    x: number;
    z: number;
    positions: Float32Array;
    parts: {start:number;count:number;min:number[];max:number[]}[];
}

declare global {
    interface Window {
        streetsGame?: {
            readonly ready: boolean;
            render(camera: GameCamera): void;
            occlusion(): ReturnType<typeof import('./GameOcclusion').getGameOcclusion> | null;
            height(x: number, z: number): number | null;
            tiles(x: number, z: number, radius: number): GameTile[];
            hasTile(x: number, z: number): boolean;
            areaReady(x: number, z: number, radius:number): boolean;
            tileId(x: number, z: number): string | null;
            replaceBuildings(items: BuildingReplacement[]): void;
            replaceGround(items: GroundOwner[]):void;
            replaceTrees(items: GameTreeOverride[]): void;
            replaceInstances(items: GameInstanceOverride[]): void;
        };
    }
}
