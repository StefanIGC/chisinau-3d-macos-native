#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

const sourceRoot=path.resolve(process.argv[2]),outputRoot=path.resolve(process.argv[3]);
fs.mkdirSync(outputRoot,{recursive:true});

const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function multiply(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function nodeMatrix(n){if(n.matrix)return n.matrix;const t=n.translation??[0,0,0],s=n.scale??[1,1,1],q=n.rotation??[0,0,0,1],x=q[0],y=q[1],z=q[2],w=q[3],x2=x+x,y2=y+y,z2=z+z;
 return[(1-(y*y2+z*z2))*s[0],(x*y2+z*w*2)*s[0],(x*z2-y*w*2)*s[0],0,(x*y2-z*w*2)*s[1],(1-(x*x2+z*z2))*s[1],(y*z2+x*w*2)*s[1],0,(x*z2+y*w*2)*s[2],(y*z2-x*w*2)*s[2],(1-(x*x2+y*y2))*s[2],0,t[0],t[1],t[2],1];}
function transformPoint(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
function transformNormal(m,n){const p=[m[0]*n[0]+m[4]*n[1]+m[8]*n[2],m[1]*n[0]+m[5]*n[1]+m[9]*n[2],m[2]*n[0]+m[6]*n[1]+m[10]*n[2]],l=Math.hypot(...p)||1;return p.map(v=>v/l);}
function blendMatrices(matrices,weights){const out=new Array(16).fill(0);let total=0;for(let i=0;i<Math.min(matrices.length,weights.length);i++){const w=weights[i];if(w<=0)continue;total+=w;for(let k=0;k<16;k++)out[k]+=matrices[i][k]*w;}if(total>0&&Math.abs(total-1)>.0001)for(let k=0;k<16;k++)out[k]/=total;return total>0?out:identity();}
function slerpQuaternion(a,b,t){let dot=a.reduce((sum,value,i)=>sum+value*b[i],0),end=[...b];if(dot<0){dot=-dot;end=end.map(v=>-v);}if(dot>.9995){const q=a.map((v,i)=>v+(end[i]-v)*t),length=Math.hypot(...q)||1;return q.map(v=>v/length);}const theta=Math.acos(Math.max(-1,Math.min(1,dot))),sin=Math.sin(theta),wa=Math.sin((1-t)*theta)/sin,wb=Math.sin(t*theta)/sin;return a.map((v,i)=>v*wa+end[i]*wb);}
function applyAnimationPose(glb,name,progress){const animation=glb.json.animations?.find(item=>item.name===name);if(!animation)return;for(const channel of animation.channels){const sampler=animation.samplers[channel.sampler],times=accessorData(glb,sampler.input).map(row=>row[0]),values=accessorData(glb,sampler.output);if(!times.length||!values.length)continue;const time=times.at(-1)*progress;let lo=0;while(lo+1<times.length&&times[lo+1]<time)lo++;const hi=Math.min(lo+1,times.length-1),span=times[hi]-times[lo],t=span>1e-6?(time-times[lo])/span:0,path=channel.target.path,node=glb.json.nodes[channel.target.node];let value;if(sampler.interpolation==='STEP'||lo===hi)value=[...values[lo]];else if(path==='rotation')value=slerpQuaternion(values[lo],values[hi],t);else value=values[lo].map((v,i)=>v+(values[hi][i]-v)*t);node[path]=value;delete node.matrix;}}

function readGlb(file){const buffer=fs.readFileSync(file);if(buffer.readUInt32LE(0)!==0x46546c67)throw new Error(`Not GLB: ${file}`);let offset=12,json,bin;
 while(offset<buffer.length){const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4),data=buffer.subarray(offset+8,offset+8+length);if(type===0x4e4f534a)json=JSON.parse(data.toString());else if(type===0x004e4942)bin=data;offset+=8+length;}return{json,bin};}
const componentReaders={5120:['getInt8',1],5121:['getUint8',1],5122:['getInt16',2],5123:['getUint16',2],5125:['getUint32',4],5126:['getFloat32',4]};
const typeSize={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function accessorData(glb,index){const a=glb.json.accessors[index],view=glb.json.bufferViews[a.bufferView],components=typeSize[a.type],reader=componentReaders[a.componentType],stride=view.byteStride??components*reader[1],start=(view.byteOffset??0)+(a.byteOffset??0),data=new DataView(glb.bin.buffer,glb.bin.byteOffset,glb.bin.byteLength),out=[];
 for(let i=0;i<a.count;i++){const row=[];for(let c=0;c<components;c++)row.push(data[reader[0]](start+i*stride+c*reader[1],true));out.push(row);}return out;}
function materialColor(json,index,name){const mat=json.materials?.[index],factor=mat?.pbrMetallicRoughness?.baseColorFactor;if(factor)return factor;const n=(mat?.name??name??'').toLowerCase();if(n.includes('glass')||n.includes('visor'))return[.28,.43,.48,1];if(n.includes('tire')||n.includes('black'))return[.035,.04,.045,1];if(n.includes('chrome')||n.includes('metal'))return[.58,.61,.62,1];return[.68,.68,.65,1];}
function materialCode(json,index,name){const mat=json.materials?.[index],pbr=mat?.pbrMetallicRoughness,n=(mat?.name??name??'').toLowerCase();let kind=0;if(/glass|visor|window/.test(n))kind=1;else if(/tire|rubber/.test(n))kind=0;else if(/metal|chrome|steel|alloy/.test(n))kind=6;const rough=Math.max(0,Math.min(7,Math.round((pbr?.roughnessFactor??.78)*7))),metal=Math.max(0,Math.min(7,Math.round((pbr?.metallicFactor??0)*7)));return kind*64+rough*8+metal;}
const srgbToLinear=value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4;

function readBmp(file){
 const b=fs.readFileSync(file);if(b.toString('ascii',0,2)!=='BM')throw new Error(`Invalid BMP: ${file}`);
 const offset=b.readUInt32LE(10),width=b.readInt32LE(18),signedHeight=b.readInt32LE(22),height=Math.abs(signedHeight),bits=b.readUInt16LE(28),compression=b.readUInt32LE(30);
 if(bits!==24||compression!==0||width<=0||!height)throw new Error(`Unsupported BMP layout: ${width}x${signedHeight}x${bits}`);
 const stride=Math.ceil(width*3/4)*4,topDown=signedHeight<0;
 return{width,height,pixel(x,y){x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(height-1,y));const row=topDown?y:height-1-y,p=offset+row*stride+x*3;return[b[p+2]/255,b[p+1]/255,b[p]/255,1];}};
}

function decodeImage(glb,imageIndex,label){
 glb.images??=new Map();if(glb.images.has(imageIndex))return glb.images.get(imageIndex);
 const image=glb.json.images?.[imageIndex],view=image&&glb.json.bufferViews?.[image.bufferView];if(!image||!view)return null;
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'chisinau-model-texture-')),extension=image.mimeType==='image/png'?'.png':'.jpg',source=path.join(temp,`source${extension}`),bmp=path.join(temp,'decoded.bmp');
 try{
  fs.writeFileSync(source,glb.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength));
  const result=spawnSync('/usr/bin/sips',['-s','format','bmp',source,'--out',bmp],{stdio:'ignore'});if(result.status!==0)throw new Error(`sips could not decode ${label}`);
  const decoded=readBmp(bmp);glb.images.set(imageIndex,decoded);return decoded;
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}

function materialSampler(glb,index,label){
 const mat=glb.json.materials?.[index],pbr=mat?.pbrMetallicRoughness,info=pbr?.baseColorTexture,texture=info&&glb.json.textures?.[info.index],factor=pbr?.baseColorFactor??[1,1,1,1];
 if(!texture)return null;const image=decodeImage(glb,texture.source,label);if(!image)return null;
 return{texCoord:info.texCoord??0,sample(uv){
  const wrap=v=>v-Math.floor(v),u=wrap(uv[0]),v=wrap(uv[1]),fx=u*(image.width-1),fy=v*(image.height-1),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(x0+1,image.width-1),y1=Math.min(y0+1,image.height-1),tx=fx-x0,ty=fy-y0;
  const a=image.pixel(x0,y0),b=image.pixel(x1,y0),c=image.pixel(x0,y1),d=image.pixel(x1,y1),sample=a.map((_,i)=>((a[i]*(1-tx)+b[i]*tx)*(1-ty)+(c[i]*(1-tx)+d[i]*tx)*ty));return[srgbToLinear(sample[0])*factor[0],srgbToLinear(sample[1])*factor[1],srgbToLinear(sample[2])*factor[2],sample[3]*(factor[3]??1)];
 }};
}

function compile(spec){const glb=readGlb(path.join(sourceRoot,spec.file)),vertices=[];if(spec.animation)applyAnimationPose(glb,spec.animation,spec.animationProgress??.23);const sceneIndex=glb.json.scene??0,roots=glb.json.scenes[sceneIndex]?.nodes??[],worldMatrices=new Array(glb.json.nodes.length);
 function mapWorld(index,parent){const world=multiply(parent,nodeMatrix(glb.json.nodes[index]));worldMatrices[index]=world;for(const child of glb.json.nodes[index].children??[])mapWorld(child,world);}
 for(const root of roots)mapWorld(root,identity());
 function visit(index){const node=glb.json.nodes[index],world=worldMatrices[index];if(node.mesh!==undefined&&(spec.meshIndex===undefined||node.mesh===spec.meshIndex)){const mesh=glb.json.meshes[node.mesh],skin=node.skin!==undefined?glb.json.skins?.[node.skin]:null,inverseBind=skin?.inverseBindMatrices!==undefined?accessorData(glb,skin.inverseBindMatrices):null,jointMatrices=skin?skin.joints.map((joint,i)=>multiply(worldMatrices[joint],inverseBind?.[i]??identity())):null;
   for(const primitive of mesh.primitives){if((primitive.mode??4)!==4||primitive.attributes.POSITION===undefined)continue;const positions=accessorData(glb,primitive.attributes.POSITION),normals=primitive.attributes.NORMAL!==undefined?accessorData(glb,primitive.attributes.NORMAL):null,indices=primitive.indices!==undefined?accessorData(glb,primitive.indices).map(x=>x[0]):positions.map((_,i)=>i),color=materialColor(glb.json,primitive.material,spec.name),code=materialCode(glb.json,primitive.material,spec.name),sampler=materialSampler(glb,primitive.material,spec.name),uvs=sampler&&primitive.attributes[`TEXCOORD_${sampler.texCoord}`]!==undefined?accessorData(glb,primitive.attributes[`TEXCOORD_${sampler.texCoord}`]):null,joints=jointMatrices&&primitive.attributes.JOINTS_0!==undefined?accessorData(glb,primitive.attributes.JOINTS_0):null,weights=joints&&primitive.attributes.WEIGHTS_0!==undefined?accessorData(glb,primitive.attributes.WEIGHTS_0):null,vertexMatrices=positions.map((_,i)=>joints&&weights?blendMatrices(joints[i].map(j=>jointMatrices[j]),weights[i]):world),worldPositions=positions.map((p,i)=>transformPoint(vertexMatrices[i],p)),worldNormals=normals?normals.map((n,i)=>transformNormal(vertexMatrices[i],n)):null;
    for(let k=0;k+2<indices.length;k+=3){const ids=[indices[k],indices[k+1],indices[k+2]],p=ids.map(i=>worldPositions[i]);let fallback;const ab=p[1].map((v,i)=>v-p[0][i]),ac=p[2].map((v,i)=>v-p[0][i]);fallback=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const fl=Math.hypot(...fallback)||1;fallback=fallback.map(v=>v/fl);
     for(let j=0;j<3;j++){const n=worldNormals?worldNormals[ids[j]]:fallback,c=[...(sampler&&uvs?sampler.sample(uvs[ids[j]]):color)];c[3]=code;vertices.push({p:p[j],n,c});}
    }
   }
  }for(const child of node.children??[])visit(child);}
 for(const root of roots)visit(root);
 if(!vertices.length)throw new Error(`No triangles in ${spec.file}`);
 let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];const bounds=()=>{min=[Infinity,Infinity,Infinity];max=[-Infinity,-Infinity,-Infinity];for(const v of vertices)for(let i=0;i<3;i++){min[i]=Math.min(min[i],v.p[i]);max[i]=Math.max(max[i],v.p[i]);}};bounds();
 if(spec.name==='helicopter'){for(const v of vertices){const[x,y,z]=v.p,[nx,ny,nz]=v.n;v.p=[-z,y,x];v.n=[-nz,ny,nx];}bounds();const scale=10.6/(max[2]-min[2]),cx=(min[0]+max[0])/2,cz=(min[2]+max[2])/2,my=min[1];for(const v of vertices)v.p=[(v.p[0]-cx)*scale,(v.p[1]-my)*scale,(v.p[2]-cz)*scale];}
 if(spec.name.startsWith('walker')){bounds();const scale=1.83/(max[1]-min[1]),cx=(min[0]+max[0])/2,cz=(min[2]+max[2])/2,my=min[1];for(const v of vertices){v.p=[-(v.p[0]-cx)*scale,(v.p[1]-my)*scale,-(v.p[2]-cz)*scale];v.n=[-v.n[0],v.n[1],-v.n[2]];}}
 bounds();const header=Buffer.alloc(64);header.writeUInt32LE(0x48534d43,0);header.writeUInt32LE(1,4);header.writeUInt32LE(vertices.length,8);for(let i=0;i<3;i++){header.writeFloatLE(min[i],16+i*4);header.writeFloatLE(max[i],28+i*4);}const body=Buffer.allocUnsafe(vertices.length*40);let o=0;for(const v of vertices){for(const x of[...v.p,...v.n,...v.c]){body.writeFloatLE(x,o);o+=4;}}
 fs.writeFileSync(path.join(outputRoot,`${spec.name}.cmesh`),Buffer.concat([header,body]));console.log(spec.name,{triangles:vertices.length/3,bounds:[min,max],bytes:header.length+body.length});}

for(const spec of[{name:'helicopter',file:'public/helicopter-playable.glb'},{name:'prius',file:'public/prius-playable.glb'},{name:'walker',file:'public/walker.glb',animation:'Idle',animationProgress:.23}])compile(spec);
// Bake compact skinned poses once at build time. The native runtime can then
// animate the exact online walker with simple buffer selection—no JavaScript,
// skeleton evaluator or per-frame CPU skinning is shipped in the game.
for(const animation of['Walk','Run'])for(let frame=0;frame<8;frame++)compile({
 name:`walker_${animation.toLowerCase()}_${frame}`,
 file:'public/walker.glb',animation,animationProgress:(frame+.5)/8,
});
