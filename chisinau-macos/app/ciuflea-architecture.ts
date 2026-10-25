import * as T from 'three';
import {photoArchitecture} from './photo-architecture';
import {pointSegmentDistance,type XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import type {PhotoBuilding} from './central-infill';

export const CIUFLEA_CUSTOM=['manhattan','midtown','stepanov15','heritage24','tolstoi40','tolstoi42'];
/** Photo-supported elevations on complete mapped plans. Dimensions estimated. */
export function addCiufleaArchitecture(m:ReturnType<typeof streetMesh>,buildings:PhotoBuilding[]){
 const a=photoArchitecture(m),{ground,solid,box,put,beam}=m;
 type Face=ReturnType<typeof m.facade>;
 function* roof(b:PhotoBuilding,y:number){
  if(!b.roofRise){solid(b.p as XY[],.16,y+b.height,b.roof,false,b.holes as XY[][]);return;}
  const shape=new T.Shape();b.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
  for(const r of b.holes){const h=new T.Path();r.forEach(([x,z],i)=>i?h.lineTo(x,-z):h.moveTo(x,-z));shape.holes.push(h);}
  const src=new T.ShapeGeometry(shape);src.rotateX(-Math.PI/2);const flat=src.toNonIndexed(),v=flat.attributes.position,out:number[]=[];
  const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),run=Math.max(2,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2);
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.12+b.roofRise*Math.min(1,d/run),p[1]];};
  function tri(a:XY,b:XY,c:XY,n=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(n<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,n+1);tri(p,b,c,n+1);}else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,n+1);tri(a,p,c,n+1);}else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,n+1);tri(p,b,c,n+1);}return;}out.push(...vertex(a),...vertex(b),...vertex(c));}
  for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
  flat.dispose();src.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();put(g,b.roof,false,true);
 }
 function* steps(f:Face,u:number,width:number,rise:number,depth:number,color:string,rail=false){
  const start=f.at(u,depth+.15),low=ground(...start)+.12,top=Math.max(low+.14,f.y+rise),n=Math.ceil((top-low)/.135),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
  for(let k=0;k<n;k++){const p=f.at(u,depth-(k+.5)*depth/n);box(p[0],low+(top-low)*(k+1)/n-.23,p[1],width,.46,depth/n,color,false,true,angle);yield;}
  if(rail)for(const side of[-1,1]){const u0=u+side*(width/2-.07),p=f.at(u0,depth),q=f.at(u0,.10);beam(new T.Vector3(p[0],low+.93,p[1]),new T.Vector3(q[0],top+.93,q[1]),.028,'#465048');for(let k=0;k<=8;k++){const pt=f.at(u0,depth*(1-k/8)),yy=low+(top-low)*k/8;box(pt[0],yy+.43,pt[1],.028,.86,.028,'#465048',true);}}
  return top-f.y;
 }
 function outline(f:Face,u:number,bottom:number,w:number,h:number,c:string){
  // Bounded pointed mouldings; decorative sculptural relief is simplified.
  const pts=[[-w/2,0],[-w/2,h*.55],[-w*.32,h*.83],[0,h],[w*.32,h*.83],[w/2,h*.55],[w/2,0]];
  for(let k=1;k<pts.length;k++){const p=f.at(u+pts[k-1][0],.48),q=f.at(u+pts[k][0],.48);beam(new T.Vector3(p[0],f.y+bottom+pts[k-1][1],p[1]),new T.Vector3(q[0],f.y+bottom+pts[k][1],q[1]),.065,c);}
 }
 function balcony(f:Face,u:number,y:number,w:number,c:string){
  f.panel(u,y,.57,w,.17,1.14,c);for(const h of[y+.25,y+.95])f.panel(u,h,1.13,w,.035,.04,'#9c9873',true);
  for(let v=-w/2;v<=w/2;v+=.55)f.panel(u+v,y+.55,1.13,.028,.94,.035,'#9c9873',true);
 }
 function bow(f:Face,u:number,bottom:number,w:number,straight:number,rise:number,color:string,trim:string){
  const r=w/2,s=new T.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,straight);s.absellipse(0,straight,r,rise,0,Math.PI,false,0);s.lineTo(-r,0);
  const p=f.at(u,.35),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]),g=new T.ShapeGeometry(s,14);g.rotateY(angle);g.translate(p[0],f.y+bottom,p[1]);put(g,color,false,false,1);
  for(let k=1;k<=16;k++){const t0=(k-1)/16*Math.PI,t1=k/16*Math.PI,p=f.at(u+r*Math.cos(t0),.46),q=f.at(u+r*Math.cos(t1),.46);beam(new T.Vector3(p[0],f.y+bottom+straight+rise*Math.sin(t0),p[1]),new T.Vector3(q[0],f.y+bottom+straight+rise*Math.sin(t1),q[1]),.075,trim);}
 }
 function* build(b:PhotoBuilding,outer=b.p):Generator<void>{
  if(b.parts?.length){for(const part of b.parts)yield* build({...b,...part,parts:undefined},outer);return;}
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),north=q[1]<p[1]-.75,south=q[1]>p[1]+.75,west=q[0]<p[0]-.75,east=q[0]>p[0]+.75;
   if(f.len<1.0)continue;
   if(['manhattan','midtown'].includes(b.style)&&!outer.slice(1).some((v,i)=>pointSegmentDistance(p,outer[i] as XY,v as XY)<.025))continue;
   if(b.style==='midtown'){
    const low=h<15,glass=low?'#405a61':'#456e85',n=Math.max(1,Math.round(f.len/2.6)),bw=f.len/n,base=4.1;
    f.panel(f.len/2,2.0,.08,f.len,3.85,.025,'#425f65',false,1);
    for(let k=0;k<=n;k++){f.panel(k*bw,2.0,.17,.055,3.9,.09,'#b9c4b9',true);yield;}
    f.panel(f.len/2,4.08,.28,f.len+.08,.26,.56,'#aeb5a6');f.panel(f.len/2,3.72,.16,f.len+.1,.14,.36,'#929d90');
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw;f.panel(u,(h+base)/2,.09,bw-.02,h-base,.025,glass,false,1);
     for(let row=0;row<b.levels-1;row++){const yy=base+(h-base)*row/(b.levels-1);f.panel(u,yy,.16,bw,.045,.045,'#809791',true);yield;}
     const fin=low?.38:.23;f.panel(k*bw,h/2+.05,.28,fin,h+.1,.54,low?'#48534e':b.trim);
     // Narrow inner mullions retain the continuous glazing visible in photos.
     f.panel(u,(h+base)/2,.17,.035,h-base,.065,'#809993',true);yield;
    }
    f.panel(f.len,h/2+.05,.28,.23,h+.1,.54,b.trim);
    if(low)for(let u=.35;u<f.len;u+=2.0)f.panel(u,h/2+2,.20,1.20,h-4,.30,'#424c48');
    if(south&&f.len>5)f.label('MIDTOWN',f.len/2,4.65,.48,'#b9a253',.58);
    continue;
   }
   if(b.style==='manhattan'){
    const front=east||north,base=4.5,n=Math.max(2,Math.round(f.len/2.8)),bw=f.len/n;
    f.panel(f.len/2,2.25,.07,f.len,4.5,.14,'#68494b');
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw;f.panel(u,2.55,.18,bw-.55,2.85,.025,'#658182',false,1);for(const side of[-1,1])f.panel(u+side*(bw-.55)/2,2.55,.21,.05,2.9,.065,'#aea375',true);
     for(let row=0;row<b.levels-1;row++){const yy=base+(row+.5)*(h-base)/(b.levels-1);f.window(u,yy,Math.max(.9,bw*.57),(h-base)/(b.levels-1)-.30,b.trim,'#a69a67');yield;}
     const hh=h+(k%2===0?.8:0);f.panel(k*bw,hh/2,.24,.52,hh,.48,b.wall);
     if(front&&k%2===0&&b.levels>3)for(let row=1;row<b.levels-1;row+=2)balcony(f,u,base+row*(h-base)/(b.levels-1),bw+1.0,b.trim);
     yield;
    }
    f.panel(f.len,h/2+.4,.24,.52,h+.8,.48,b.wall);
    f.panel(f.len/2,4.50,.32,f.len,.27,.64,'#755658');
    for(let yy=5;yy<h;yy+=2.6)f.panel(f.len/2,yy,.018,f.len,.022,.028,'#c1b38b',true);
    if(east&&h>19){const u=f.len*.52,top=yield* steps(f,u,2.7,.96,2.45,'#866b5c',true);f.panel(u,top+1.55,.32,2.4,3.10,.025,'#334d4d',false,1);f.panel(u,4.27,.65,4.9,.92,1.35,b.wall);f.label('MANHATTAN',u,4.05,.49,'#a24738',1.37);}
    continue;
   }
   const front=b.style==='stepanov15'?north:b.style==='heritage24'?south:west;
   a.cornice(f,h,b.trim);
   if(!front){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.4)),b.levels>1?2.0:3.0,b.trim);continue;}
   if(b.style==='stepanov15'){
    const n=5,bw=f.len/n,entry=bw*4.5;
    f.panel(f.len/2,.92,.045,f.len,1.84,.09,'#989e91');
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw,isDoor=k===4;
     if(isDoor){const top=yield* steps(f,u,1.75,1.48,2.8,'#a2aa9b',true);f.panel(u,top+1.56,.34,1.52,3.12,.04,'#78533a');for(const d of[-.39,.39]){f.panel(u+d,top+1.56,.42,.045,3.10,.06,'#ad8556',true);for(const yy of[top+.65,top+2.18])f.panel(u+d,yy,.44,.54,.74,.045,'#896342',true);}}
     else{f.window(u,3.68,1.36,2.61,b.trim,'#875e3e');f.window(u,.82,.97,1.03,b.trim,'#646f5e');}
     for(const off of[0,.18])outline(f,u,4.95,1.58+off,1.30+off*.25,b.trim);
     f.panel(u,6.36,.22,bw-.15,.065,.20,'#a7ac9b',true);
     if(k===0||k===4){
      f.panel(u,7.82,.16,bw-.14,1.06,.34,b.trim);a.pediment(f,u,8.35,bw-.10,.57,y,b.trim);
      for(const d of[-1,1]){f.panel(u+d*bw*.43,7.45,.28,.23,2.50,.45,b.trim);for(const hh of[6.5,8.45])f.panel(u+d*bw*.43,hh,.28,.37,.19,.58,b.trim);}
      const pt=f.at(u,.38),g=new T.TorusGeometry(.32,.045,4,20);g.rotateY(Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]));g.translate(pt[0],y+7.5,pt[1]);put(g,'#a5ab99',true);
     }yield;
    }
    for(let u=.30;u<f.len;u+=.50){f.panel(u,6.97,.26,.15,.22,.16,'#afb6a4',true);yield;}
    for(const u of[bw*.92,bw*4.1]){const pt=f.at(u,.58);box(pt[0],y+5.24,pt[1],.18,.40,.18,'#39483d',true);beam(new T.Vector3(pt[0],y+5.0,pt[1]),new T.Vector3(...[f.at(u,.1)[0],y+4.9,f.at(u,.1)[1]] as [number,number,number]),.026,'#39483d');}
    f.label('15',entry+1.05,3.40,.24,'#496679');
   }else if(b.style==='heritage24'){
    const n=6,bw=f.len/n;
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw,door=k===0||k===5;
     if(door){const top=yield* steps(f,u,1.82,.62,1.24,'#a5a58f',true);f.panel(u,top+1.40,.33,1.23,2.8,.04,k===0?'#99764d':'#3f5147');for(const hh of[top+.75,top+2.1])f.panel(u,hh,.37,.90,.60,.04,'#a99369',true);f.panel(u,h+.46,.15,bw,.85,.40,b.trim);f.panel(u,h+.96,.27,bw+.25,.16,.60,b.trim);}
     else{f.window(u,2.83,1.32,2.0,b.trim,'#805f48');f.panel(u,1.39,.22,1.60,.35,.43,b.trim);f.window(u,.43,.64,.44,b.trim,'#6b755f');}
     for(const d of[-1,1])f.panel(u+d*(bw/2-.09),h/2,.13,.18,h,.26,b.trim);yield;
    }
    for(let yy=.7;yy<h-.3;yy+=.49){f.panel(f.len/2,yy,.035,f.len,.025,.036,'#a0a18a',true);yield;}
    f.label('24',f.len-.24,2.40,.22,'#4d645c');
   }else if(b.style==='tolstoi42'){
    const n=7,bw=f.len/n;
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw;
     if(k===3){const top=yield* steps(f,u,1.6,.35,.9,'#9d9e88');f.panel(u,top+1.28,.33,1.1,2.56,.04,'#705a41');}
     else f.window(u,2.41,Math.min(1.1,bw*.62),2.15,b.trim,'#927858');
     if(k===0||k===6)a.pediment(f,u,h+.12,bw+1.0,.75,y,b.trim);yield;
    }
    a.arch(f,f.len/2,h+.05,bw+1.35,.98,y,b.wall,b.trim,0);
    for(const u of[.24,f.len-.24,f.len*.40,f.len*.60])f.panel(u,h/2,.15,.30,h,.30,b.trim);
   }else if(b.style==='tolstoi40'){
    const n=Math.max(5,Math.round(f.len/3.25)),bw=f.len/n,entry=f.len/2;
    f.panel(f.len/2,.8,.045,f.len,1.6,.09,'#424c47');
    for(let yy=1.2;yy<8.1;yy+=.46){f.panel(f.len/2,yy,.045,f.len,.025,.036,'#a7a28c',true);yield;}
    for(let row=0;row<4;row++){
     const yy=9.3+row*3.0;
     for(let k=0;k<n;k++){const u=(k+.5)*bw;f.window(u,yy,1.44,2.10,b.trim,'#514e43');if(k===0||k===n-1)balcony(f,u,yy-1.17,1.93,b.trim);yield;}
    }
    for(const u of[f.len*.14,f.len*.86])f.window(u,4.7,2.1,5.2,b.trim,'#564f43');
    bow(f,entry,3.55,f.len*.45,3.45,.94,'#657e7c',b.trim);
    for(let u=entry-f.len*.21;u<entry+f.len*.22;u+=1.65)f.panel(u,5.60,.47,.065,3.9,.06,'#6a6656',true);
    const top=yield* steps(f,entry,3.2,1.04,1.94,'#a5a389',true);f.panel(entry,top+1.1,.33,2.6,2.2,.04,'#455b52');
    f.panel(entry,3.45,.45,f.len*.57,.26,.90,b.trim);f.label('40',entry+2.2,2.50,.23,'#515b49');
   }
   yield;
  }
 }
 for(const b of buildings.filter(b=>CIUFLEA_CUSTOM.includes(b.style)))m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],()=>build(b));
}
