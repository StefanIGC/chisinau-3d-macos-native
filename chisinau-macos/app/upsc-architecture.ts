import * as T from 'three';
import {photoArchitecture} from './photo-architecture';
import type {streetMesh} from './street-mesh';
import type {XY} from './city-layout';
import {streetRect} from './street-mesh';
type Mesh=ReturnType<typeof streetMesh>;
type Face=ReturnType<ReturnType<typeof photoArchitecture>['faces']>[number];

/** Photo dimensions are estimates; cadastral outlines are never replaced. */
export function* upscHistoricFacade(m:Mesh,p:XY[],y:number,height:number,levels:number,block:number){
 const a=photoArchitecture(m);
 for(const f of a.faces(p,y)){
  const mid=f.at(f.len/2),out=f.at(f.len/2,1),front=block===5?out[0]<mid[0]-.8:out[1]>mid[1]+.8;
  const n=Math.max(1,Math.round(f.len/3.6));
  f.panel(f.len/2,.30,.12,f.len,.6,.24,'#777b70');
  f.panel(f.len/2,height-.10,.17,f.len+.2,.22,.34,'#d7cfb8');
  for(let row=0;row<levels;row++){
   const hh=row===0?1.12:3.55+(row-1)*3.1;
   for(let i=0;i<n;i++){
    const u=(i+.5)*f.len/n;
    if(front&&Math.abs(u-f.len*.52)<2&&row<2)continue;
    f.window(u,hh,1.30,row===0?1.40:1.85,'#d3d8d0','#5f737a');
    f.panel(u,hh-.95,.25,1.50,.075,.32,'#afa891');
    if(row<2&&front)for(let v=-.55;v<.6;v+=.22)f.panel(u+v,hh,.32,.025,row===0?1.35:1.80,.025,'#9da7a1',true);
   }yield;
  }
  if(block===5)for(let hh=.85;hh<height-.2;hh+=.55){f.panel(f.len/2,hh,.045,f.len,.015,.02,'#b5b4a4',true);yield;}
  if(front){yield* upscEntry(m,f,f.len*.52,block===5?.75:1.05,false);}
 }
}

function* upscEntry(m:Mesh,f:Face,u:number,rise:number,modern:boolean){
 const q=f.at(u,2.75),base=m.ground(q[0],q[1])+.035,n=Math.ceil(rise/.15),depth=.32;
 const a=f.at(0),b=f.at(1),angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);
 for(let i=0;i<n;i++){
  const v=1.0+(n-i-.5)*depth,p=f.at(u,v),top=base+(i+1)*rise/n;
  m.box(p[0],top-.20,p[1],modern?4.5:2.4,.4,depth,'#777b74',false,true,angle);yield;
 }
 const landing=f.at(u,.55);m.box(landing[0],base+rise-.20,landing[1],modern?4.5:2.4,.4,1,'#86897e',false,true,angle);
 f.panel(u,rise+1.35,.24,modern?3.2:1.65,2.5,.025,'#4d686b',false,1);
 f.panel(u,rise+1.35,.31,.065,2.5,.06,'#cdd4cb');
 for(const side of[-1,1]){
  f.panel(u+side*(modern?1.7:.90),rise+1.4,.25,.13,2.8,.23,'#c8d0c6');
  const lo=f.at(u+side*(modern?2.2:1.16),1+n*depth),hi=f.at(u+side*(modern?2.2:1.16),.3);
  m.beam(new T.Vector3(lo[0],base+.80,lo[1]),new T.Vector3(hi[0],base+rise+.80,hi[1]),.035,'#a3ada5');
 }
 if(!modern){
  const c=f.at(u,.85),alongZ=Math.abs(b[0]-a[0])<.5;photoArchitecture(m).roof(c[0],c[1],alongZ?2.3:3.2,alongZ?3.2:2.3,base+rise+2.65,.72,'#92534b');
  for(const side of[-1,1])f.panel(u+side*1.15,rise+1.35,1.60,.045,2.7,.045,'#657169');
 }else f.panel(u,rise+2.9,.65,4.9,.24,1.30,'#7e8780');
 yield;
}

export function upscMainParts(ring:XY[]){
 function clip(p:XY[],x:number,greater:boolean){const out:XY[]=[];for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],ia=greater?a[0]>=x:a[0]<=x,ib=greater?b[0]>=x:b[0]<=x;
  if(ia)out.push(a);if(ia!==ib)out.push([x,a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])]);
 }if(out.length)out.push(out[0]);return out;}
 const p=ring.slice(0,-1);
 return[{p:clip(clip(p,-2004.5,true).slice(0,-1),-1989.6,false),height:27.2,levels:8,main:true},
 {p:clip(p,-2004.5,false),height:5.0,levels:1,main:false},
 {p:clip(p,-1989.6,true),height:6.0,levels:2,main:false}];
}

export function* buildUpscMain(m:Mesh,ring:XY[],y:number){
 const a=photoArchitecture(m);
 for(const part of upscMainParts(ring)){
  m.solid(part.p,part.height+2,y-2,part.main?'#bebba7':'#b9b294',true);
  m.solid(part.p,.15,y+part.height,'#737a73',false);yield;
  for(const f of a.faces(part.p,y)){
   if(f.len<3)continue;
   const mid=f.at(f.len/2),out=f.at(f.len/2,1),east=out[0]>mid[0]+.8;
   if(part.main){
    for(let row=0;row<8;row++){
     const hh=2.35+row*3.25,n=Math.max(1,Math.round(f.len/1.8));
     // Broad blank stair tower at the northern end, visible in the official photo.
     const blank=east&&mid[1]<211;
     if(!blank){f.panel(f.len/2,hh,.08,f.len-.5,1.62,.02,'#6d8384',false,1);
      for(let k=0;k<=n;k++)f.panel(k*f.len/n,hh,.15,.055,1.7,.07,'#d2d9d3',true);}
     f.panel(f.len/2,hh-.98,.11,f.len,.075,.20,'#8e9388');yield;
    }
    f.panel(f.len/2,27.12,.15,f.len,.34,.30,'#96978a');
    if(east&&mid[1]<206){yield* upscEntry(m,f,f.len*.5,1.05,true);}
   }else{
    const n=Math.max(1,Math.floor(f.len/3.1));for(let k=0;k<n;k++)f.window((k+.5)*f.len/n,3.4,1.8,1.2,'#c3ccc4','#6e8584');yield;
    for(let hh=.7;hh<part.height;hh+=.65)f.panel(f.len/2,hh,.055,f.len,.02,.035,'#a5a18d',true);
    if(east&&f.len>10)f.label('UPSC · ION CREANGA',f.len/2,4.6,.28,'#335b7c',.18);
   }
  }
 }
}

export function addUpscCourtyard(m:Mesh){
 m.job('UPSC · aleile curții',streetRect(-1975,174,42,70),[],function*(){
  // Satellite-visible courtyard connections. New ground starts beyond the
  // existing rondo floor and east of the previously rebuilt road-side strip.
  for(const p of [streetRect(-1962,169.5,3.4,59),streetRect(-1983.5,192.5,3.4,11),streetRect(-1987.5,198,8,3.4),streetRect(-1974.5,187,28,3.4)])
   yield* m.surfaceStaged(p,(x,z)=>m.ground(x,z)+.035,'#a4a294',true);
 });
 const trees=[[-1998,147,11],[-1989,148,12],[-1980,150,10],[-1968,179,12]];
 for(const [x,z,h]of trees)m.job('UPSC · conifer din curte',streetRect(x,z,5,5),[],function*(){
  const y=m.ground(x,z),trunk=new T.CylinderGeometry(.13,.24,h*.6,6);trunk.translate(x,y+h*.3,z);m.put(trunk,'#786f5e',false,true);
  for(let k=0;k<4;k++){const crown=new T.IcosahedronGeometry(2.4-k*.42,1);crown.scale(1,.58,1);crown.translate(x,y+h*(.44+k*.14),z);m.put(crown,k%2?'#58734a':'#496941');yield;}
 });
 return {x:-1975,z:205,radius:90,height:0,texture:0,polygon:[[-2010,135],[-1940,135],[-1940,275],[-2010,275]]};
}
