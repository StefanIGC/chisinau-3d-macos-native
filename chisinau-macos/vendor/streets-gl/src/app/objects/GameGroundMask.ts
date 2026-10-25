import AbstractRenderer from '~/lib/renderer/abstract-renderer/AbstractRenderer';
import AbstractTexture2D from '~/lib/renderer/abstract-renderer/AbstractTexture2D';
import {RendererTypes as R} from '~/lib/renderer/RendererTypes';
export type GroundOwner={id:string;rings:number[][][][];bounds:number[]};
export const groundOwners={items:[] as GroundOwner[],revision:0};
const SIZE=40075016.68/65536;
export const MASK_SIZE=1024;
/** Even/odd scan conversion retains courtyards and cut-outs. Union coverage is
 * binary, without transparent blending, mipmaps, temporal noise or layer order.
 * Called on a completed ground-owner change, never for camera/frustum changes. */
function groundSpans(owners:GroundOwner[],north:number,east:number,size=SIZE,resolution=MASK_SIZE){
 const spans:number[]=[],scale=resolution/size;
 for(const owner of owners)for(const poly of owner.rings){
  const rings=poly.map(ring=>ring.map(p=>[(p[0]-north)*scale,(p[1]-east)*scale]));
  const all=rings.flat(),from=Math.max(0,Math.floor(Math.min(...all.map(p=>p[1])))),to=Math.min(resolution-1,Math.ceil(Math.max(...all.map(p=>p[1]))));
  for(let row=from;row<=to;row++){
   const y=row+.5,edges:number[]=[];
   for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i];if((a[1]>y)!==(b[1]>y))edges.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
   }
   edges.sort((a,b)=>a-b);for(let i=0;i+1<edges.length;i+=2){const left=Math.max(0,Math.ceil(edges[i]-.5)),right=Math.min(resolution,Math.ceil(edges[i+1]-.5));if(right>left)spans.push(row*resolution+left,row*resolution+right);}
  }
 }
 return new Uint32Array(spans);
}
function paint(pixels:Uint8Array,spans:Uint32Array){for(let i=0;i<spans.length;i+=2)pixels.fill(255,spans[i],spans[i+1]);}
export function rasterGround(owners:GroundOwner[],north:number,east:number,size=SIZE,resolution=MASK_SIZE){
 const pixels=new Uint8Array(resolution*resolution);paint(pixels,groundSpans(owners,north,east,size,resolution));return pixels;
}
export default class GameGroundMask{
 private texture:AbstractTexture2D=null;private revision=-1;private key='';public enabled=false;
 private data:Uint8Array=null;private spans=new Map<string,Uint32Array>();
 get(renderer:AbstractRenderer,north:number,east:number){
  if(this.revision!==groundOwners.revision){
   const owners=groundOwners.items.filter(o=>o.bounds[0]<north+SIZE&&o.bounds[2]>north&&o.bounds[1]<east+SIZE&&o.bounds[3]>east),key=owners.map(o=>o.id).join('|');
   if(key!==this.key){this.key=key;this.enabled=owners.length>0;
    const ids=new Set(owners.map(o=>o.id));let removed=false;
    for(const id of this.spans.keys())if(!ids.has(id)){this.spans.delete(id);removed=true;}
    if(this.enabled){
     // Scan-convert only the newly completed cells. During travel, old cells
     // reuse compact cached spans; even eviction needs no polygon conversion.
     if(!this.data)this.data=new Uint8Array(MASK_SIZE*MASK_SIZE);
     if(removed){this.data.fill(0);for(const spans of this.spans.values())paint(this.data,spans);}
     for(const owner of owners)if(!this.spans.has(owner.id)){const spans=groundSpans([owner],north,east);this.spans.set(owner.id,spans);paint(this.data,spans);}
     if(!this.texture)this.texture=renderer.createTexture2D({width:MASK_SIZE,height:MASK_SIZE,data:this.data,format:R.TextureFormat.R8Unorm,minFilter:R.MinFilter.Nearest,magFilter:R.MagFilter.Nearest,wrap:R.TextureWrap.ClampToEdge,mipmaps:false,flipY:false});else{this.texture.data=this.data;this.texture.updateFromData();}
    }else if(this.data)this.data.fill(0);
   }
   this.revision=groundOwners.revision;
  }
  return this.texture;
 }
 dispose(){this.texture?.delete();this.texture=null;this.data=null;this.spans.clear();}
}
