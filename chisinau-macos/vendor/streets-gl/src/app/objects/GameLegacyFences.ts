import type {Tile3DBuffersHugging} from '~/lib/tile-processing/tile3d/buffers/Tile3DBuffers';
// Old textured fence curtains clash with the photo-authored physical boundaries.
// Keep hedges(12), masonry walls(28/29), roads and every other material intact.
const legacyFenceTextures=new Set([13,14,26,27]);
/** Filter once at tile creation, before GPU upload and shared depth extraction. */
export function withoutLegacyFences(buffers:Tile3DBuffersHugging):Tile3DBuffersHugging{
 const keep:number[]=[];
 for(let i=0;i<buffers.textureIdBuffer.length;i+=3){
  if(!legacyFenceTextures.has(buffers.textureIdBuffer[i]))keep.push(i,i+1,i+2);
 }
 if(keep.length===buffers.textureIdBuffer.length)return buffers;
 const positions=new Float32Array(keep.length*3),normals=new Float32Array(keep.length*3),uv=new Float32Array(keep.length*2),ids=new Uint8Array(keep.length);
 for(let i=0;i<keep.length;i++){const j=keep[i];positions.set(buffers.positionBuffer.subarray(j*3,j*3+3),i*3);normals.set(buffers.normalBuffer.subarray(j*3,j*3+3),i*3);uv.set(buffers.uvBuffer.subarray(j*2,j*2+2),i*2);ids[i]=buffers.textureIdBuffer[j];}
 return{...buffers,positionBuffer:positions,normalBuffer:normals,uvBuffer:uv,textureIdBuffer:ids};
}
