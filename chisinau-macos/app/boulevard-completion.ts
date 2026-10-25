import * as T from 'three';
import data from '../data/boulevard-completion.json';
import type {XY} from './city-layout';
import {streetMesh} from './street-mesh';
import {photoArchitecture} from './photo-architecture';

/** Completes the entire audited first row and secondary boulevard bodies. Photo
 * elevations are explicit styles; unseen courtyard faces stay conservative.
 * All parts share a replacement transaction and a world-anchored collision mesh. */
export function createBoulevardCompletion(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Ștefan cel Mare · clădiri completate',ground,loaded);
 const {job,solid,facade,box,put}=mesh;
 const {C,faces,street,cornice,roof,pediment,door,steps,arch}=photoArchitecture(mesh);
 for(const r of data.buildings){if(r.ids.includes(945958721))continue; // Replaced by the open Cantemir passage portal.
const polygons=r.rings as XY[][][],anchor=r.anchor as XY;
  job(`${r.segment} · ${r.title} · ${r.id}`,polygons[0][0],r.ids,function*(){
   const y=ground(...anchor)+.14,h=r.height,modern=['avenue','presidency-wing','135','167'].includes(r.style);let entranceDone=false;
   for(const [p,...holes]of polygons){solid(p,h+4,y-4,r.wall,true,holes,modern?1:0);solid(p,.12,y+h,r.roof,true,holes);yield;
    for(const f of faces(p,y)){
     if(f.len<1)continue;const front=street(f),bays=Math.max(1,Math.round(f.len/(r.style==='159'?3.4:3.1))),ww=Math.min(1.65,f.len/bays*.6),storey=h/r.floors;
     f.panel(f.len/2,.26,.12,f.len,.52,.24,C.base);cornice(f,h,r.trim);
     if(front&&['133','123','119','137'].includes(r.style))f.panel(f.len/2,1.85,.10,f.len,3.7,.20,r.style==='133'?'#90988c':r.style==='137'?'#b5a087':'#aeb0a0');
     if(modern||r.style==='bands'||r.style==='artico'){
      if(!modern)for(let row=0;row<r.floors;row++){f.panel(f.len/2,1.75+row*storey,.21,f.len-.25,Math.min(1.85,storey*.55),.03,C.glass,false,1);yield;}
      for(let row=1;row<r.floors;row++)f.panel(f.len/2,row*storey,.25,f.len,.21,.32,r.trim);
      for(let u=1.6;u<f.len;u+=modern?2.6:4){f.panel(u,h/2,.28,.075,h-.3,.10,r.trim,true);if(Math.round(u/2.6)%6===0)yield;}
      if(r.style==='avenue'){for(let u=1.8;u<f.len;u+=2.35)f.panel(u,h*.61,.65,.32,h*.75,1.02,'#354851');f.panel(f.len/2,h+.2,.28,f.len+1.3,.4,.75,'#5d695f');if(front){f.panel(f.len*.73,2,.43,7,3.7,.42,'#38483e');door(f,f.len*.73,3.05,2.5,'#3e4f49');steps(f,f.len*.73,5.2,.56);}}
     }else{
      for(let row=0;row<r.floors;row++){const hh=Math.min(h-1.3,storey*(row+.5)+.18);
       for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;
        // 159 has a distinct tall arched rusticated base, not another generic
        // window row underneath a decorative plane.
        if(r.style==='cna-wing')continue;
        if(r.style==='159'&&front&&row===0)arch(f,u,.23,Math.min(2.35,f.len/bays*.77),3.25,y,'#4b615d','#aaaE9c');
        else if(r.style==='131'&&front&&Math.abs(u-f.len/2)<1.2&&row===0){}
        else if(front&&row===0&&['133','123','119','shops'].includes(r.style)){
         f.panel(u,1.9,.31,Math.min(2.4,f.len/bays*.8),2.85,.03,'#4c6662',false,1);
         for(const sign of[-1,1])f.panel(u+sign*Math.min(1.26,f.len/bays*.42),1.9,.40,.13,3.0,.22,'#717f77',true);
        }else f.window(u,hh,ww,Math.min(2.3,storey*.61),r.trim,'#718178');
        if(i%5===4)yield;
       }yield;
      }
      if(r.floors>1)for(let row=1;row<r.floors;row++)f.panel(f.len/2,storey*row,.20,f.len,.15,.33,r.trim);
     }
     if(r.style==='159'&&front){
      for(let hh=.60;hh<3.2;hh+=.47)f.panel(f.len/2,hh,.14,f.len,.043,.05,'#838c80',true);
      for(const u of[f.len*.22,f.len*.74]){for(let row=1;row<4;row++){const hh=row*storey+.05;f.panel(u,hh,.83,2.6,.17,1.4,'#a0a492');f.panel(u,hh+.59,1.46,2.6,1.04,.035,'#4b554b',true);for(let k=-3;k<=3;k++)f.panel(u+k*.32,hh+.59,1.42,.035,.95,.04,r.trim,true);}yield;}
      for(let u=.5;u<f.len;u+=.61)f.panel(u,h+.42,.19,.14,.66,.18,r.trim,true);
      f.panel(f.len/2,h+.82,.16,f.len,.17,.4,r.trim);
     }
     if(r.style==='131'&&front&&f.len>15){const mid=f.len/2;
      door(f,mid,3.05,1.8,'#634a31');steps(f,mid,3.4,.42);f.panel(mid,4.65,.97,3.15,.25,1.7,r.trim);
      for(let i=-4;i<=4;i++)f.panel(mid+i*.31,5.23,1.72,.08,.95,.12,C.iron,true);f.panel(mid,5.76,1.72,3.4,.13,.20,C.iron);
      for(const u of[.35,f.len-.35])f.panel(u,5.1,.30,.44,9.0,.45,r.trim);pediment(f,mid,h+.12,6.2,1.3,y,r.trim);yield;
     }
     if(r.style==='133'&&front){
      for(let u=.3;u<f.len;u+=.55)f.panel(u,h-.36,.42,.24,.38,.48,r.trim,true);
      for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;f.panel(u,3.4,.47,f.len/bays-.16,.5,.32,i<bays/2?'#426d82':'#77657b');if(i%4===0)yield;}
      for(let i=1;i<bays;i+=4){const u=(i+.5)*f.len/bays;for(let row=1;row<r.floors;row++){const yy=storey*row+.22;
       f.panel(u,yy,.83,2.2,.23,1.42,'#aaaA95');for(const side of[-1,1])f.panel(u+side*1.03,yy+.60,1.48,.16,1.10,.17,r.trim);
       f.panel(u,yy+1.14,1.48,2.3,.12,.20,r.trim);for(let k=-3;k<=3;k++)f.panel(u+k*.26,yy+.66,1.46,.035,.93,.04,C.iron,true);
      }yield;}
     }
     if(r.style==='137'&&front&&f.len>8){
      for(let yy=.6;yy<3.7;yy+=.5)f.panel(f.len/2,yy,.23,f.len,.04,.05,'#958873',true);
      for(const u of[1.8,f.len-1.8]){
       f.panel(u,h*.74,.30,3.6,h*.47,.44,r.trim);f.window(u,h*.74,1.36,2.35,r.trim,'#634b3a',.30);
       f.panel(u,4.83,.89,2.4,.18,1.5,C.base);for(let i=-3;i<=3;i++)f.panel(u+i*.27,5.4,1.57,.035,.95,.04,C.iron,true);f.panel(u,5.9,1.57,2.55,.10,.12,C.iron);
       pediment(f,u,h+.2,3.9,1.1,y,r.trim);door(f,u,3.55,1.45,'#76583a');steps(f,u,2.7,.56);yield;
      }
     }
     if(r.style==='shops'&&front){f.panel(f.len/2,h-.56,.30,f.len,.9,.42,'#56605a');if(f.len>7&&!entranceDone){entranceDone=true;door(f,f.len*.30,2.9,1.5,'#686c55');steps(f,f.len*.30,3.0,.42);}yield;}
     if(r.style==='194b'&&front){
      for(let hh=.5;hh<h-.3;hh+=.55)f.panel(f.len/2,hh,.21,f.len,.035,.025,'#928e75',true);
      for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;pediment(f,u,storey*1.5+1.5,2.5,.54,y,'#a5795f');for(const s of[-1,1])f.panel(u+s*1.02,storey*1.5+.1,.45,.19,2.90,.32,'#ad8268',true);if(i%3===2)yield;}
      for(let u=.4;u<f.len;u+=.60)f.panel(u,h-.34,.38,.22,.34,.47,'#8d8c77',true);
     }
     if(r.style==='145'&&front&&f.len>8){
      for(let hh=.6;hh<storey-.15;hh+=.53)f.panel(f.len/2,hh,.20,f.len,.045,.05,'#9a9783',true);
      f.panel(f.len/2,3.45,.46,f.len-.5,.57,.58,'#877158');for(const u of[f.len*.25,f.len*.72]){f.panel(u,3.1,.85,3.0,.14,1.6,'#46564a');door(f,u,2.7,1.45,'#655744');}yield;
     }
     if(r.style==='167'&&front&&f.len>8&&!entranceDone){entranceDone=true;const u=f.len/2;
      for(let uu=.3;uu<f.len;uu+=2.8)f.panel(uu,h/2,.23,.20,h,.31,'#507d7b');f.panel(u,3.7,1.55,8.4,.90,3.0,'#a4825d');
      for(const side of[-1,1]){const q=f.at(u+side*3.45,2.8),g=new T.CylinderGeometry(.19,.19,3.3,10);g.translate(q[0],y+1.65,q[1]);put(g,'#5d9993');}
      door(f,u,2.95,3.3,'#517c77');steps(f,u,7.5,.42);yield;
     }
     if(r.style==='deluxe'&&f.len>7){const u=f.len*.52;
      f.panel(u,h*.50,.46,f.len*.34,h-.8,.035,'#4e8293',false,1);for(let row=1;row<r.floors;row++)f.panel(u,row*storey,.49,f.len*.34,.075,.08,'#7d9e9c',true);
      for(const s of[-1,1])f.panel(u+s*f.len*.185,h*.50,.66,.48,h,.70,'#c1b998');yield;
     }
     if(r.style==='135'&&front&&f.len>10&&!entranceDone){entranceDone=true;const u=f.len/2,w=Math.min(15,f.len-.4),hh=h*.55;
      // Rounded projecting shop bay from the exact Papermax address photo.
      for(let i=0;i<12;i++){const t0=i*Math.PI/12,t1=(i+1)*Math.PI/12,a=f.at(u-w/2+Math.cos(t0)*w/2+w/2,.15+Math.sin(t0)*1.4),b=f.at(u+Math.cos(t1)*w/2,.15+Math.sin(t1)*1.4),face=facade(b,a,y);
       face.panel(face.len/2,hh+1.9,.03,face.len+.01,3.7,.03,'#557b83',false,1);face.panel(face.len/2,hh-.1,.05,face.len+.03,.45,.42,'#ad7655');face.panel(0,hh+1.9,.12,.06,3.7,.10,'#71857c',true);if(i%4===3)yield;
      }
      for(const dx of[-w*.35,0,w*.35])f.panel(u+dx,2.1,1.1,.42,4.2,.58,'#3f5149');door(f,u,3.65,3.1,'#42564f');steps(f,u,9.3,.56);yield;
     }
     if(r.style==='123'&&front&&f.len>10&&!entranceDone){entranceDone=true;const u=f.len*.65;
      f.panel(u,3.6,.86,6.9,.42,1.6,'#496e8a');door(f,u,2.8,1.8,'#50718a');steps(f,u,3.4,.42);
      f.panel(u,storey+.22,.86,2.5,.20,1.6,C.base);for(let k=-4;k<=4;k++)f.panel(u+k*.26,storey+.86,1.61,.035,1.05,.04,'#465e46',true);f.panel(u,storey+1.41,1.61,2.6,.08,.12,'#465e46');
     }
     if(r.style==='119'&&front){
      for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;for(const sign of[-1,1]){f.panel(u+sign*1.02,h*.69,.39,.19,h*.48,.20,'#aba88e',true);for(let k=0;k<5;k++)f.panel(u+sign*1.02,storey+1+k*.52,.51,.27,.10,.13,r.trim,true);}if(i%3===2)yield;}
      if(f.len>12&&!entranceDone){entranceDone=true;const u=4.7;
       f.panel(u,1.95,1.48,5.0,3.15,.035,'#4b665c',false,1);for(const dx of[-2.4,0,2.4])f.panel(u+dx,1.95,1.56,.085,3.25,.10,'#a48d60');
       for(const dx of[-2.44,2.44]){const a=f.at(u+dx,.04),b=f.at(u+dx,1.5),side=facade(dx<0?b:a,dx<0?a:b,y);side.panel(side.len/2,1.95,.04,side.len,3.10,.03,'#4c665e',false,1);}
       f.panel(u,3.70,.88,5.4,.45,1.85,'#9a9c87');steps(f,u,5.1,.56);yield;
      }
     }
     if(r.style==='campus'&&front){for(let u=.3;u<f.len;u+=3.5)f.panel(u,h*.5,.37,.30,h-.2,.55,r.trim,true);yield;}
     if(r.style==='cna-wing'&&front){
      // The low wing's small hexagonal lights are inset above the sill.
      for(let u=2;u<f.len;u+=3){const shape=new T.Shape();for(let j=0;j<6;j++){const a=j*Math.PI/3,x=Math.cos(a)*.55,z=Math.sin(a)*.55;j?shape.lineTo(x,z):shape.moveTo(x,z);}shape.closePath();const g=new T.ShapeGeometry(shape),p=f.at(u,.39),a=f.at(0),b=f.at(1);g.rotateY(Math.atan2(-(b[1]-a[1]),b[0]-a[0]));g.translate(p[0],y+3.8,p[1]);put(g,C.glass,false,false,1);yield;}
     }
     yield;
    }
    if(['131','campus'].includes(r.style)){
     const xs=p.map(a=>a[0]),zs=p.map(a=>a[1]),lo=Math.min(...xs),hi=Math.max(...xs),back=Math.max(...zs),front=Math.min(...zs);
     // Roof only on the rectangular photographed street bar; never bridge a
     // U-shaped courtyard with a rectangular roof.
     if(p.length<=8)roof((lo+hi)/2,(back+front)/2,hi-lo,back-front,y+h,1.65,r.roof);
    }
   }
   yield;
  });
 }
 return mesh;
}
