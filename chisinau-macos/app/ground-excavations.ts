import * as T from 'three';

/** Small authored exterior stairwells. Their terrain openings activate only
 * after the complete stairs, retaining walls and collider are ready. */
export type GroundExcavation={a:number[];axis:number[];size:number[];bottom:number;ready:()=>boolean;hideGround?:boolean};
const MASK_LIMIT=24;
export function groundExcavations(){
 let cuts:GroundExcavation[]=[];
 const count={value:0};
 const frames=Array.from({length:MASK_LIMIT},()=>new T.Vector4()),sizes=Array.from({length:MASK_LIMIT},()=>new T.Vector2());
 function contains(c:GroundExcavation,x:number,z:number){const dx=x-c.a[0],dz=z-c.a[1],u=dx*c.axis[0]+dz*c.axis[1],v=-dx*c.axis[1]+dz*c.axis[0];return c.ready()&&u>=-.001&&u<=c.size[0]+.001&&v>=-.001&&v<=c.size[1]+.001;}
 return{
  set(items:GroundExcavation[]){if(items.filter(c=>c.hideGround!==false).length>MASK_LIMIT)throw new Error('Too many local terrain excavations');cuts=items;},
  floor(x:number,z:number,raw:number){for(const c of cuts)if(contains(c,x,z))return Math.min(raw,c.bottom);return raw;},
  contains(x:number,z:number){return cuts.some(c=>c.hideGround!==false&&contains(c,x,z));},
  update(x=NaN,z=NaN){let i=0;for(const c of cuts)if(c.hideGround!==false&&c.ready()&&(!Number.isFinite(x)||Math.hypot(c.a[0]-x,c.a[1]-z)<380)){frames[i].set(c.a[0],c.a[1],c.axis[0],c.axis[1]);sizes[i].set(c.size[0],c.size[1]);i++;}count.value=i;},
  mask(material:T.Material){
   material.onBeforeCompile=s=>{
    s.uniforms.excavationCount=count;s.uniforms.excavationFrames={value:frames};s.uniforms.excavationSizes={value:sizes};
    s.vertexShader='varying vec2 excavationPosition;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nexcavationPosition=(modelMatrix*vec4(position,1.)).xz;');
    s.fragmentShader=`varying vec2 excavationPosition;uniform int excavationCount;uniform vec4 excavationFrames[${MASK_LIMIT}];uniform vec2 excavationSizes[${MASK_LIMIT}];\n`+s.fragmentShader.replace('void main() {',`void main() {\nfor(int i=0;i<${MASK_LIMIT};i++){if(i>=excavationCount)break;vec2 d=excavationPosition-excavationFrames[i].xy;vec2 p=vec2(dot(d,excavationFrames[i].zw),dot(d,vec2(-excavationFrames[i].w,excavationFrames[i].z)));if(all(greaterThanEqual(p,vec2(0.)))&&all(lessThanEqual(p,excavationSizes[i])))discard;}`);
   };
   material.customProgramCacheKey=()=> 'exterior-stairwell-mask-v2';
  }
 };
}
