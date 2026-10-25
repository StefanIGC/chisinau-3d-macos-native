import * as T from 'three';
import {streetRect,type streetMesh} from './street-mesh';
// Street View + satellite alignment, photo estimates rather than survey dimensions.
const axis=[[-2059.627,119.814],[-2055.3,183],[-2052.1,284],[-2049.31,394.68],[-2043.29,576.56],[-2042.7,595]];
export function approachX(z:number){for(let i=1;i<axis.length;i++)if(z<=axis[i][1]){const a=axis[i-1],b=axis[i],t=(z-a[1])/(b[1]-a[1]);return a[0]+t*(b[0]-a[0]);}return axis.at(-1)![0];}
const ornamentalTrees=[[-2018,-40],[-2013,-27],[-2009,-13],[-2021,-42],[-2017,-32],[-2013,-21],[-2009,-10]];
export function addCantemirApproach(m:ReturnType<typeof streetMesh>){
 for(let start=135;start<595;start+=24){const end=Math.min(595,start+24),mid=(start+end)/2;
  m.job('Ion Creangă · borduri continue',streetRect(approachX(mid),mid,48,end-start),[],function*(){
   for(let z=start+.5;z<end;z+=2){const x=approachX(z);
    for(const offset of[-9.1,9.1,z<340?15.9:z<360?15.9+(z-340)/20*5.2:21.1]){
     // Keep photographed courtyard opening and Petru Ștefănucă junction flush.
     if(offset<0&&((z>389&&z<410)||(z>567&&z<590)))continue;
     m.box(x+offset,m.ground(x+offset,z)+.075,z,.12,.08,1.97,'#adb0a4');
    }
    // Observed white road markings, elevated clear of the shared asphalt surface.
    if(z<178||z>186){
     m.box(x,m.ground(x,z)+.065,z,.11,.006,1.97,'#d9d9ce');
     m.box(x+3.6,m.ground(x+3.6,z)+.065,z,.11,.006,1.97,'#d9d9ce');
     if(Math.floor(z/4)%2===0)m.box(x+3.85,m.ground(x+3.85,z)+.065,z,.10,.006,1.97,'#d9d9ce');
    }
    yield;
   }
  });
 }
 m.job('universitate · marcaj trecere',streetRect(-2055.3,182,19,5),[],function*(){
  for(let i=0;i<17;i++){const x=-2055.3-8+i,z=182;m.box(x,m.ground(x,z)+.065,z,.52,.006,3.5,'#d9d9ce');yield;}
 });
 for(const z of[226,280,340,480,548])m.job('Ion Creangă · iluminat',streetRect(approachX(z)+12,z,3,3),[],function*(){
  const x=approachX(z)+(z<348?9.65:12),y=m.ground(x,z);
  m.box(x,y+4.25,z,.16,8.5,.16,'#989b92',false,true);
  m.beam(new T.Vector3(x,y+8.32,z),new T.Vector3(x-2,y+8.48,z),.045,'#90988f',false);
  m.box(x-2,y+8.45,z,.57,.12,.25,'#adb2a6');yield;
 });
 for(let start=135;start<578;start+=48){const end=Math.min(578,start+48),mid=(start+end)/2;
  m.job('Ion Creangă · fire de troleibuz',streetRect(approachX(mid),mid,14,end-start),[],function*(){
   for(const offset of[-3,3])m.beam(new T.Vector3(approachX(start)+offset,m.ground(approachX(start),start)+8.9,start),new T.Vector3(approachX(end)+offset,m.ground(approachX(end),end)+8.9,end),.012,'#50564e',false);
   yield;
  });
 }
 for(const [i,[x,z]]of ornamentalTrees.entries())m.job('Cantemir · plantare ornamentală 2026',streetRect(x,z,4,4),[],function*(){
  const y=m.ground(x,z),column=i>=3,h=column?3.8:5.2;
  const trunk=new T.CylinderGeometry(.04,.065,column?2.0:3.8,6);trunk.translate(x,y+(column?1:1.9),z);m.put(trunk,'#9b8b65',false,true);yield;
  for(let k=0;k<3;k++){
   const g=new T.IcosahedronGeometry(column?.60:1.2,1);g.scale(column?.72:1.1,column?1.7:.60,column?.72:1);
   g.translate(x+(column?0:Math.sin(k*2)*.50),y+(column?1.1+k*.85:h-.6+k*.25),z+(column?0:Math.cos(k*2)*.45));m.put(g,column?'#4d713f':'#73874b');yield;
  }
 });
 m.job('Petru Ștefănucă · indicator parcare',streetRect(-2054,550,2,2),[],function*(){
  const x=approachX(550)-9.7,z=550,y=m.ground(x,z);m.box(x,y+1.25,z,.055,2.5,.055,'#879087',false,true);
  const f=m.facade([x-.32,z],[x+.32,z],y);f.panel(.32,2.5,0,.64,.78,.06,'#d6d8c9');f.panel(.32,2.5,.04,.55,.69,.018,'#365b7d');f.label('P',.32,2.5,.47,'#e1e2d3',.07);yield;
 });
 return ornamentalTrees.map(([x,z])=>({x,z,height:0,radius:2,texture:0}));
}
