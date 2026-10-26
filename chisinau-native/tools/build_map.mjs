#!/usr/bin/env node

// Builds the offline 2D travel map from the same native tiles used by Metal.
// No web tiles or internet connection are required at runtime.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';

const worldRoot=path.resolve(process.argv[2]);
const outputFile=path.resolve(process.argv[3]);
const width=1800,height=1800,minX=-3300,maxX=3300,minZ=-3300,maxZ=3300;
const pixels=Buffer.alloc(width*height*3);

function colorPixel(index,color,alpha=1){
  const offset=index*3;
  pixels[offset]=Math.round(pixels[offset]*(1-alpha)+color[0]*alpha);
  pixels[offset+1]=Math.round(pixels[offset+1]*(1-alpha)+color[1]*alpha);
  pixels[offset+2]=Math.round(pixels[offset+2]*(1-alpha)+color[2]*alpha);
}
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const vignette=Math.hypot(x-width/2,y-height/2)/Math.hypot(width/2,height/2);
  const shade=Math.max(0,Math.min(9,Math.round(vignette*7))),offset=(y*width+x)*3;
  pixels[offset]=18-shade;pixels[offset+1]=31-shade;pixels[offset+2]=27-shade;
}
const px=x=>(x-minX)/(maxX-minX)*(width-1);
const py=z=>(z-minZ)/(maxZ-minZ)*(height-1);

function triangle(a,b,c,color,alpha=1){
  const ax=px(a[0]),ay=py(a[1]),bx=px(b[0]),by=py(b[1]),cx=px(c[0]),cy=py(c[1]);
  const left=Math.max(0,Math.floor(Math.min(ax,bx,cx))),right=Math.min(width-1,Math.ceil(Math.max(ax,bx,cx)));
  const top=Math.max(0,Math.floor(Math.min(ay,by,cy))),bottom=Math.min(height-1,Math.ceil(Math.max(ay,by,cy)));
  const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<.001)return;
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
    const w0=((bx-ax)*(y-ay)-(by-ay)*(x-ax))/area;
    const w1=((cx-bx)*(y-by)-(cy-by)*(x-bx))/area;
    const w2=((ax-cx)*(y-cy)-(ay-cy)*(x-cx))/area;
    if((w0>=-.001&&w1>=-.001&&w2>=-.001)||(w0<=.001&&w1<=.001&&w2<=.001))colorPixel(y*width+x,color,alpha);
  }
}

function line(x0,z0,x1,z1,color,alpha=.72){
  let ax=Math.round(px(x0)),ay=Math.round(py(z0)),bx=Math.round(px(x1)),by=Math.round(py(z1));
  let dx=Math.abs(bx-ax),sx=ax<bx?1:-1,dy=-Math.abs(by-ay),sy=ay<by?1:-1,error=dx+dy;
  for(let guard=0;guard<5000;guard++){
    if(ax>=0&&ay>=0&&ax<width&&ay<height){colorPixel(ay*width+ax,color,alpha);if(ax+1<width)colorPixel(ay*width+ax+1,color,alpha*.35);}
    if(ax===bx&&ay===by)break;const twice=2*error;if(twice>=dy){error+=dy;ax+=sx;}if(twice<=dx){error+=dx;ay+=sy;}
  }
}

const collisionLines=[];
for(const name of fs.readdirSync(worldRoot).filter(name=>name.endsWith('.ctile')).sort()){
  const data=fs.readFileSync(path.join(worldRoot,name));
  if(data.length<64||data.readUInt32LE(0)!==0x4c495443)continue;
  const vertexCount=data.readUInt32LE(24),collisionCount=data.readUInt32LE(28),vertexOffset=64;
  for(let i=0;i+2<vertexCount;i+=3){
    const o0=vertexOffset+i*40,o1=o0+40,o2=o1+40;
    const ny=(data.readFloatLE(o0+16)+data.readFloatLE(o1+16)+data.readFloatLE(o2+16))/3;
    if(ny<.72)continue;
    const alpha=data.readFloatLE(o0+36),material=alpha>2?Math.floor((Math.floor(alpha)&511)/64):0;
    const y=(data.readFloatLE(o0+4)+data.readFloatLE(o1+4)+data.readFloatLE(o2+4))/3;
    let color=null,opacity=1;
    if(material===3){color=[80,91,96];opacity=.98;}
    else if(material===4){color=[119,125,119];opacity=.82;}
    else if(material===7){color=[38,104,139];opacity=.9;}
    else if(material===0&&y>2){color=[70,75,70];opacity=.88;}
    if(!color)continue;
    triangle([data.readFloatLE(o0),data.readFloatLE(o0+8)],[data.readFloatLE(o1),data.readFloatLE(o1+8)],[data.readFloatLE(o2),data.readFloatLE(o2+8)],color,opacity);
  }
  let collisionOffset=vertexOffset+vertexCount*40;
  for(let i=0;i<collisionCount;i++,collisionOffset+=24)collisionLines.push([
    data.readFloatLE(collisionOffset),data.readFloatLE(collisionOffset+4),data.readFloatLE(collisionOffset+8),data.readFloatLE(collisionOffset+12)
  ]);
}
for(const segment of collisionLines)line(...segment,[117,126,118],.62);

const temporary=path.join(os.tmpdir(),`chisinau-world-map-${process.pid}.ppm`);
fs.writeFileSync(temporary,Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`),pixels]));
fs.mkdirSync(path.dirname(outputFile),{recursive:true});
execFileSync('/usr/bin/sips',['-s','format','png',temporary,'--out',outputFile],{stdio:'ignore'});
fs.unlinkSync(temporary);
console.log(JSON.stringify({output:outputFile,width,height,bounds:{minX,maxX,minZ,maxZ},collisionSegments:collisionLines.length},null,2));
