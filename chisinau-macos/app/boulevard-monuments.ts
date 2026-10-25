import * as T from 'three';
import {landscapeLayer} from './landscape-layer';
import {lettering} from './street-mesh';
import {slattedBin} from './street-furniture';
/** Photo-guided silhouettes at exact OSM nodes; dimensions are estimates.
 * See docs/central-streets-reference-audit.md. Sculptures are not 3D scans. */
export const boulevardMonumentIds=[3159094971,1759418276,8400788478];
export function createBoulevardMonuments(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const layer=landscapeLayer(scene,'Repere de pe bulevard',ground,loaded,{residentDistance:630});
 const {job,box,cylinder,put}=layer;
 const bronze='#526057',darkBronze='#424e49';
 function local(x:number,y:number,z:number,angle=0,flip=false){
  const shape=(g:T.BufferGeometry,color:string,fine=false,collide=false,mirror=flip)=>{if(mirror){g.scale(-1,1,1);if(g.index){for(let i=0;i<g.index.count;i+=3){const a=g.index.getX(i);g.index.setX(i,g.index.getX(i+2));g.index.setX(i+2,a);}}else{for(const attr of Object.values(g.attributes)){for(let i=0;i<attr.count;i+=3)for(let k=0;k<attr.itemSize;k++){const values=attr.array,a=values[i*attr.itemSize+k];values[i*attr.itemSize+k]=values[(i+2)*attr.itemSize+k];values[(i+2)*attr.itemSize+k]=a;}}}}g.rotateY(angle);g.translate(x,y,z);put(g,color,0,fine,collide);};
  const ball=(u:number,h:number,w:number,rx:number,ry:number,rz:number,color:string,fine=false)=>{const g=new T.SphereGeometry(1,12,8);g.scale(rx,ry,rz);g.translate(u,h,w);shape(g,color,fine);};
  const rod=(a:number[],b:number[],r:number,col:string,fine=false)=>{const aa=new T.Vector3(...a as [number,number,number]),bb=new T.Vector3(...b as [number,number,number]),d=bb.clone().sub(aa),g=new T.CylinderGeometry(r,r,d.length(),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate((aa.x+bb.x)/2,(aa.y+bb.y)/2,(aa.z+bb.z)/2);shape(g,col,fine);};
  const block=(u:number,h:number,w:number,ww:number,hh:number,dd:number,col:string,fine=false,physical=false)=>{const g=new T.BoxGeometry(ww,hh,dd);g.translate(u,h,w);shape(g,col,fine,physical);};
  const panel=(points:number[][],depth:number,z0:number,col:string)=>{const s=new T.Shape();points.forEach(([u,h],i)=>i?s.lineTo(u,h):s.moveTo(u,h));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false});g.translate(0,0,z0);shape(g,col);};
  function face(u:number,h:number,w:number,scale:number,col:string){
   ball(u,h,w,.175*scale,.265*scale,.19*scale,col);
   ball(u,h-.035*scale,w-.172*scale,.032*scale,.073*scale,.058*scale,col,true);
   for(const sign of[-1,1]){ball(u+sign*.07*scale,h+.035*scale,w-.168*scale,.026*scale,.012*scale,.011*scale,'#455148',true);rod([u+sign*.024*scale,h+.075*scale,w-.18*scale],[u+sign*.115*scale,h+.065*scale,w-.159*scale],.012*scale,col,true);}
   rod([u-.055*scale,h-.12*scale,w-.162*scale],[u+.055*scale,h-.12*scale,w-.162*scale],.012*scale,'#455046',true);
  }
  return{shape,ball,rod,block,panel,face};
 }
 job('Mihai Eminescu · sculptură ajurată',402.2,56.02,function*(){
  const x=402.2,z=56.02,y=ground(x,z)+.14,s=local(x,y,z);
  for(let i=0;i<2;i++)box(x,y+.07+i*.14,z,2.9-i*.28,.14,4.8-i*.34,'#747974',false,true);
  // Long sloping dark stone pedestal, low toward the boulevard.
  const wedge=new T.BufferGeometry(),p=[[-1.16,.28,-2.06],[1.16,.28,-2.06],[1.16,.28,2.06],[-1.16,.28,2.06],[-1.16,.43,-2.06],[1.16,.43,-2.06],[1.16,1.13,2.06],[-1.16,1.13,2.06]],faces=[0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,6,4,6,7];
  wedge.setAttribute('position',new T.Float32BufferAttribute(faces.flatMap(i=>p[i]),3));wedge.computeVertexNormals();s.shape(wedge,'#626a65',false,true);yield;
  // The split vertical drape and open ribbed wing are the defining silhouette.
  s.panel([[-.47,.87],[-.22,2.48],[-.44,3.54],[-.18,4.18],[.15,4.22],[.39,3.46],[.13,2.38],[.46,.87],[.13,.87],[-.02,2.16],[-.18,.87]],.26,-.10,bronze);
  s.panel([[-.47,.87],[-.36,1.64],[-.21,2.11],[-.32,2.87],[-.42,3.36],[-.54,3.61],[-.68,2.93],[-.59,2.05]],.16,-.17,'#5e685b');
  s.rod([.20,1.20,.17],[.92,3.74,.47],.07,bronze);
  for(let i=0;i<10;i++){const h=1.27+i*.274,t=i/9;s.rod([.09,h,.11],[.40+t*.53,h+.22,.47],.047,bronze);if(i%4===0)yield;}
  s.rod([-.24,3.74,-.19],[-.33,2.53,-.32],.09,bronze);s.ball(-.33,2.48,-.34,.105,.17,.085,bronze);
  s.face(-.06,4.31,-.08,1.28,bronze);
  // Long swept hair; several broad locks keep it readable without dense mesh.
  for(let i=0;i<8;i++){const a=(i/7)*Math.PI;s.ball(Math.cos(a)*.21-.06,4.32,Math.sin(a)*.20+.01,.088,.27,.087,'#46574c');}
  s.ball(-.13,4.55,-.07,.20,.09,.17,bronze);
  const text=lettering('MIHAI EMINESCU',.075);text.rotateY(Math.PI);text.translate(x,y+.35,z-2.068);put(text,'#adb1a3',0,true);yield;
 });
 job('Emil Loteanu · bust cu eșarfă',-403.32,38.19,function*(){
  const x=-403.32,z=38.19,y=ground(x,z)+.14,s=local(x,y,z),stone='#92968e';
  s.block(0,.09,0,1.18,.18,1.12,stone,false,true);s.block(0,1.02,0,.70,1.70,.66,stone,false,true);s.block(0,1.92,0,.78,.13,.73,stone);
  s.panel([[-.32,1.97],[-.43,2.25],[-.33,2.67],[-.1,2.80],[.28,2.68],[.35,2.18],[.13,1.97]],.23,-.11,darkBronze);
  // Deep scarf loop and its hanging end distinguish the photographed bust.
  const scarf=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.19,2.73,-.15),new T.Vector3(.13,2.70,-.18),new T.Vector3(.19,2.47,-.25),new T.Vector3(.01,2.24,-.29),new T.Vector3(-.22,2.40,-.30),new T.Vector3(-.19,2.73,-.15)]),22,.065,7,false);s.shape(scarf,'#59615a');
  s.panel([[-.20,2.39],[-.37,2.42],[-.48,2.18],[-.44,1.91],[-.28,2.02],[-.27,2.22]],.11,-.23,'#5b635b');
  s.rod([.23,2.14,-.15],[.27,2.45,-.13],.08,darkBronze);
  s.face(0,2.94,-.04,1.20,darkBronze);
  for(let row=0;row<3;row++)for(let i=0;i<9;i++){const a=i/9*Math.PI*2;s.ball(Math.cos(a)*(.21-row*.035),3.05+row*.078,Math.sin(a)*.18,.085,.072,.07,'#424e48',true);}
  const text=lettering('EMIL LOTEANU',.09);text.rotateY(Math.PI);text.translate(x,y+1.25,z-.334);put(text,'#b7a16b',0,true);
  const dates=lettering('1936 — 2003',.056);dates.rotateY(Math.PI);dates.translate(x,y+1.08,z-.335);put(dates,'#b7a16b',0,true);yield;
 });
 job('Bănulescu-Bodoni · relief pe Bibliotecă',-141.73,-23.02,function*(){
  // East-facing facade of the authored Hașdeu library. Never a freestanding statue.
  const x=-141.33,z=-23.02,y=ground(-142,-23.02)+1.05,s=local(x,y,z,-Math.PI/2,true),stone='#bcb5a2',metal='#646c5b';
  s.block(0,1.325,.04,1.65,2.65,.07,stone);
  s.panel([[-.70,.05],[-.76,.43],[-.6,1.37],[-.38,1.66],[-.10,1.67],[.13,1.38],[.17,.09]],.13,-.13,metal);
  s.face(-.22,1.61,-.16,.90,metal);s.ball(-.22,1.37,-.26,.12,.26,.045,metal);
  s.block(-.22,1.91,-.07,.31,.33,.18,metal);s.block(-.22,1.95,-.167,.032,.16,.023,'#424b3f',true);s.block(-.22,1.97,-.17,.11,.025,.024,'#424b3f',true);
  for(let ring=0;ring<3;ring++){
   const pts=[];for(let i=0;i<=22;i++){const u=-.64+i*1.28/22,h=2.10+Math.exp(-Math.pow(u/.36,2))*.32+ring*.12;pts.push(new T.Vector3(u,h,-.12));}
   s.shape(new T.TubeGeometry(new T.CatmullRomCurve3(pts),22,.051,5,false),metal);
  }
  s.block(.63,1.52,-.12,.15,1.1,.17,metal);
  for(let i=0;i<7;i++)s.rod([.57,1.02+i*.147,-.22],[.69,1.13+i*.147,-.22],.028,'#7a806b',true);
  s.rod([.31,.54,-.17],[.31,1.80,-.17],.028,metal);s.block(.31,1.84,-.17,.15,.027,.028,metal);s.block(.31,1.84,-.17,.027,.16,.028,metal);
  s.block(.20,.42,-.21,1.04,.43,.10,metal);
  for(const [words,h,size]of [['BĂNULESCU-BODONI',.46,.059],['1746 — 1821',.31,.062]] as const){const text=lettering(words,size);text.rotateY(Math.PI);text.translate(-.20,h,-.268);s.shape(text,'#a3a58d',true,false,false);}
  yield;
 });
 const bins=[[14065770961,483.81,26.47],[14065830284,489.55,21.72],[14065841260,330.63,25.17],[1138863940,-949.88,-52.25],[12762866409,-752.6,-6.2]];
 for(const [id,x,z]of bins)job(`Coș stradal ${id}`,x,z,function*(){slattedBin(layer,x,ground(x,z)+.14,z);yield;});
 return layer;
}
