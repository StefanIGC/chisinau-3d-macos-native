import * as T from 'three';
import {photoArchitecture} from './photo-architecture';
import type {streetMesh} from './street-mesh';
import type {XY} from './city-layout';
import {upscHistoricFacade} from './upsc-architecture';

/** Observed elevations only; official cadastral rings stay with their original owner. */
export const ionCreangaDetails:Record<string,{wall:string;roof:string;rise:number;style:string}>={
 'cladiri.1833987/0/0':{wall:'#b3b2a3',roof:'#776d60',rise:1.2,style:'balconies'},
 'cladiri.1834047/0/0':{wall:'#c4baa6',roof:'#817c6e',rise:1.0,style:'shops'},
 'cladiri.1833903/0/0':{wall:'#a49b8d',roof:'#8a5146',rise:1.5,style:'stone-retail'},
 'cladiri.1833902/0/0':{wall:'#d0cbc0',roof:'#88877e',rise:.08,style:'clinic'},
 'cladiri.32125/0/0':{wall:'#c9c2ae',roof:'#65645c',rise:1.7,style:'corner-classic'},
 'cladiri.32165/0/0':{wall:'#c5b99b',roof:'#817466',rise:1.1,style:'corner-classic'},
 'cladiri.1833986/0/0':{wall:'#c0bcad',roof:'#77766d',rise:.9,style:'basic-retail'},
 'cladiri.1833989/0/0':{wall:'#bcb5a6',roof:'#83786b',rise:.9,style:'basic-retail'},
 'cladiri.22116/0/0':{wall:'#c9c1b0',roof:'#877d71',rise:1.0,style:'basic-retail'},
 'cladiri.22117/0/0':{wall:'#c9c1b0',roof:'#877d71',rise:1.0,style:'basic-retail'},
 'cladiri.33819/0/0':{wall:'#d1c7af',roof:'#72796f',rise:2.15,style:'campus'},
};

export function* buildIonCreangaDetails(m:ReturnType<typeof streetMesh>,b:{id:string;rings:number[][][];height:number;levels:number},y:number){
 const detail=ionCreangaDetails[b.id],a=photoArchitecture(m),p=b.rings[0]as XY[];
 const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]),x0=Math.min(...xs)-.18,x1=Math.max(...xs)+.18,z0=Math.min(...zs)-.18,z1=Math.max(...zs)+.18,h=y+b.height+.08,rise=detail.rise;
 const corner=[[x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1]],inset=Math.min(x1-x0,z1-z0)*.23;
 const r=(z1-z0>x1-x0)?[(x0+x1)/2,h+rise,z0+inset]:[x0+inset,h+rise,(z0+z1)/2];
 const s=(z1-z0>x1-x0)?[(x0+x1)/2,h+rise,z1-inset]:[x1-inset,h+rise,(z0+z1)/2];
 const faces=z1-z0>x1-x0?[[corner[0],corner[1],r],[corner[1],corner[2],s],[corner[1],s,r],[corner[2],corner[3],s],[corner[3],corner[0],r],[corner[3],r,s]]:[[corner[0],r,corner[1]],[corner[1],r,s],[corner[1],s,corner[2]],[corner[2],s,corner[3]],[corner[3],s,r],[corner[3],r,corner[0]]];
 const upward=faces.map(([a,b,c])=>((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]))<0?[a,c,b]:[a,b,c]);
 const endpoint=b.id==='cladiri.32125/0/0';
 // Satellite confirms a hipped roof behind the low edge visible from the street.
 const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(upward.flat(2),3));roof.computeVertexNormals();m.put(roof,detail.roof);
 yield;
 if(detail.style==='campus'){yield* upscHistoricFacade(m,p,y,b.height,b.levels,4);return;}
 for(const f of a.faces(p,y)){
  const mid=f.at(f.len/2),out=f.at(f.len/2,1),front=out[0]-mid[0]>.8;
  f.panel(f.len/2,b.height-.13,.12,f.len,.23,.24,'#d3cdbc');
  if(detail.style==='campus'){
   const bays=Math.max(1,Math.round(f.len/3.0));
   for(let row=0;row<b.levels;row++){for(let k=0;k<bays;k++)f.window((k+.5)*f.len/bays,(row+.58)*b.height/b.levels,1.35,1.72,'#deded0','#758582');yield;}
   continue;
  }
  if(detail.style==='corner-classic'||detail.style==='basic-retail'){
   if(!front)continue;
   const classic=detail.style==='corner-classic',n=Math.max(1,Math.round(f.len/(classic?3.2:3.7)));
   f.panel(f.len/2,1.25,.10,f.len,2.5,.20,endpoint?'#99857c':classic?'#92817b':'#9f9d91');
   f.panel(f.len/2,2.60,.16,f.len,.20,.32,classic?'#c2b39b':'#b6b0a0');
   for(let k=0;k<n;k++){
    const u=(k+.5)*f.len/n;
    f.window(u,4.7,1.22,1.80,classic?'#dfd5c0':'#d5d3c4','#667570');
    f.window(u,endpoint?.92:1.2,classic?.95:2.25,endpoint?1.05:classic?1.2:2.1,'#b9b4a7','#59645e');yield;
   }
   if(classic){
    for(let hh=.4;hh<2.5;hh+=.45)f.panel(f.len/2,hh,.22,f.len,.045,.06,'#c0b1a0',true);
    if(!endpoint)for(let u=1;u<f.len;u+=3.2)f.panel(u,4.65,.14,.22,3.75,.25,'#d3c4aa');
    else{
     // Fine horizontal masonry joints visible above the pink-brown rusticated base.
     for(let hh=2.95;hh<b.height-.3;hh+=.43)f.panel(f.len/2,hh,.14,f.len,.025,.03,'#a9a28f',true);
     f.panel(.17,4.3,.24,.07,4.4,.08,'#76766b');
     f.panel(f.len/2,b.height+.08,.14,f.len,.12,.28,'#b7b09e');
    }
    f.panel(f.len/2,b.height-.12,.22,f.len+.2,.25,.45,'#c9bda6');
   }
   yield;continue;
  }
  if(detail.style==='stone-retail'||detail.style==='clinic'){
   // Only the visible street elevation and the south-facing side are refined.
   const south=out[1]-mid[1]>.8;
   if(!front&&!south)continue;
   const stone=detail.style==='stone-retail',bays=Math.max(1,Math.round(f.len/(stone?3.2:3.0)));
   for(let row=0;row<b.levels;row++){
    for(let k=0;k<bays;k++)f.window((k+.5)*f.len/bays,(row+.52)*b.height/b.levels,Math.min(1.55,f.len/bays*.65),stone?1.8:2.1,'#d1d0c8','#667570');
    yield;
   }
   if(front){
    f.panel(f.len/2,1.5,.12,f.len,3.0,.24,stone?'#514d48':'#b9b8ae');
    for(let k=0;k<bays;k++)f.window((k+.5)*f.len/bays,1.45,Math.min(2.5,f.len/bays-.3),2.45,'#dddcd0','#68817e');
    f.panel(f.len/2,3.12,.23,f.len,.66,.46,stone?'#4e5253':'#b399aa');
    if(stone){
     for(const u of[.12,.30,.48,.66,.84])f.panel(f.len*u,b.height*.66,.25,.55,b.height*.73,.50,'#bbb1a0');
     f.panel(f.len/2,b.height-.15,.35,f.len+.6,.24,.7,'#6f645a');
     // Differentiated ground-floor units seen in September 2025.
     f.panel(f.len*.77,3.12,.50,f.len*.40,.60,.06,'#79b9b7');
     if(f.len>10)for(const fraction of[.28,.64]){
      const q=f.at(f.len*fraction,1.8),base=m.ground(q[0],q[1])+.12;
      const canopy=new T.ConeGeometry(1.45,.36,8);canopy.translate(q[0],base+2.55,q[1]);m.put(canopy,'#c1a8a7');
      const pole=new T.CylinderGeometry(.025,.025,2.5,6);pole.translate(q[0],base+1.25,q[1]);m.put(pole,'#928880',true,true);
      const table=new T.CylinderGeometry(.42,.42,.08,10);table.translate(q[0],base+.76,q[1]);m.put(table,'#675952');
      for(const side of[-1,1]){
       const seat=f.at(f.len*fraction+side*.68,1.8);
       m.box(seat[0],base+.44,seat[1],.42,.07,.42,'#655d55',true);
       m.box(seat[0],base+.22,seat[1],.06,.44,.06,'#4e4b46',true);
      }
      yield;
     }

    }
   }
   continue;
  }
  // Occluded rear/side openings are not reconstructed as observed detail.
  if(!front)continue;
  const n=Math.max(1,Math.round(f.len/3.7)),bw=f.len/n;
  f.panel(f.len/2,1.55,.055,f.len,3.1,.11,detail.style==='shops'&&mid[1]<280?'#405979':'#bec3b8');
  if(detail.style==='balconies'){
   for(let u=.4;u<f.len;u+=.6){f.panel(u,5.0,.065,.013,3.0,.014,'#97998b',true);yield;}
   for(const hh of[3.5,4.1,4.7,5.3,5.9,6.5])f.panel(f.len/2,hh,.075,f.len,.012,.015,'#97998b',true);
  }
  for(let k=0;k<n;k++){
   const u=(k+.5)*bw;f.window(u,1.48,Math.min(2.6,bw-.45),2.55,'#d6d9cd','#61716b');
   f.window(u,4.95,Math.min(1.5,bw-.5),1.85,'#dadbce','#70736a');yield;
  }
  if(detail.style==='balconies'&&f.len>15){
   for(const [fraction,color]of[[.29,'#588374'],[.68,'#695a48']]as const){
    const u=f.len*fraction;f.panel(u,3.52,.55,2.8,.24,1.1,color);
    f.panel(u,4.75,1.02,2.65,2.10,.035,'#789394',false,1);
    for(const du of[-1.34,0,1.34])f.panel(u+du,4.75,1.07,.075,2.23,.10,color);
    for(const hh of[3.66,5.85])f.panel(u,hh,1.07,2.83,.12,.12,color);
    f.panel(u,5.97,.58,3.15,.13,1.30,color);yield;
   }
  }else if(detail.style==='shops'){
   const fascia=mid[1]<280?'#385b85':mid[1]>286?'#925361':'#365680';
   f.panel(f.len/2,3.06,.16,f.len,.54,.30,fascia);
   if(f.len>5&&f.len<8)f.label('NOTAR',f.len/2,3.02,.39,'#e0e3d3',.33);
   if(mid[1]>286)for(let k=0;k<n;k++)f.panel((k+.5)*bw,.72,.38,Math.min(1.6,bw-.5),1.1,.045,'#ad6a82');
  }
 }
}
