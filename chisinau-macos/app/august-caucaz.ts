import * as T from 'three';
import realm from '../data/august-caucaz.json';
import catalog from '../data/august-caucaz-buildings.json';
import details from '../data/august-caucaz-details.json';
import map from '../data/august-caucaz-map.json';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import type {XY} from './city-layout';

/** Whole mapped bodies, plus the photographed shop missing from the map. */
export function createAugustCaucaz(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'31 August · Caucaz detalii',ground,loaded),a=photoArchitecture(m);
 const buildings=createPhotoFrontages(scene,ground,loaded,catalog as PhotoBuilding[],'31 August · Caucaz corpuri');
 const l=landscapeLayer(scene,'31 August · Caucaz spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const road=map.features.find(f=>f.id==='w33079437')!.p;
 const clamp=(v:number)=>Math.max(0,Math.min(1,v));
 function bankLift(x:number,z:number){
  let center=270;for(let i=1;i<road.length;i++){const a=road[i-1],b=road[i];if(x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0])){center=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);break;}}
  const d=z-center;
  return .80*clamp((x-1818)/8)*clamp((1905-x)/6)*clamp((d-3.84)/8)*clamp((17.5-d)/3);
 }
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+bankLift(x,z)+(p.raised?.12:.035),true);},c.coverage);
 const shop=details.shop;
 m.job(shop.title,shop.p as XY[],[],function*(){
  const y=ground(...shop.anchor as XY)+.04,h=shop.height,wall='#bbb9a7',trim='#cac7b4';
  m.solid(shop.p as XY[],h+4,y-4,wall,true);
  m.solid(shop.p as XY[],.17,y+h,'#888b7c',false);yield;
  for(const f of a.faces(shop.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1);
   f.panel(f.len/2,.28,.055,f.len,.56,.11,'#a6a797');
   f.panel(f.len/2,h-.18,.32,f.len+.12,.14,.64,trim);
   if(q[1]<p[1]+.8)continue;
   // Photo: two dark display windows, central glazed door, orange wordmark,
   // cream horizontal courses and wide light soffit. No tall invented steps.
   const u=f.len*.53;
   for(const [center,width]of[[f.len*.30,3.8],[f.len*.77,3.6]]){
    f.panel(center,1.65,.08,width,2.12,.035,'#364b45',false,1);
    for(const side of[-1,1])f.panel(center+side*(width/2+.13),1.65,.12,.22,2.48,.18,trim);
    for(const hh of[.47,2.83])f.panel(center,hh,.12,width+.46,.20,.18,trim);
    f.panel(center,.78,.15,width-.15,.32,.05,'#9d8b63');
    yield;
   }
   f.panel(u,1.40,.13,1.5,2.8,.04,'#3e5149',false,1);
   for(const side of[-1,1])f.panel(u+side*.86,1.45,.19,.22,2.96,.25,trim);
   f.panel(u,2.94,.22,1.96,.18,.43,trim);
   f.panel(u+.51,1.43,.25,.055,.65,.085,'#777f72');
   for(const yy of[.55,3.02,3.18])f.panel(f.len/2,yy,.06,f.len,.032,.055,'#a4a592',true);
   for(const edge of[.2,f.len-.2])for(let yy=.5;yy<3.85;yy+=.43)f.panel(edge,yy,.055,.35,.028,.06,'#929883',true);
   f.label('potaki',u,3.20,.67,'#b94c12',.19);
   const logo=f.at(f.len*.075,.14),disc=new T.CylinderGeometry(.56,.56,.055,24);disc.rotateX(Math.PI/2);disc.translate(logo[0],y+3.07,logo[1]);m.put(disc,'#b94c12',true);
   f.panel(f.len-.2,1.9,.13,.08,3.7,.09,'#a0a693',true);
   f.panel(f.len-.48,3.02,.13,.78,.32,.06,'#ded3b4');f.label('20',f.len-.49,2.94,.17,'#804d3e',.19);
   yield;
  }
  // Small terrace objects visible in the reference, kept against the facade.
  const x=1777.9,z=265.05,yy=ground(x,z)+.035;
  const top=new T.CylinderGeometry(.48,.48,.065,16);top.translate(x,yy+.75,z);m.put(top,'#c6c8b9');
  const stem=new T.CylinderGeometry(.065,.08,.71,10);stem.translate(x,yy+.36,z);m.put(stem,'#b85524');
  const base=new T.CylinderGeometry(.30,.30,.045,14);base.translate(x,yy+.035,z);m.put(base,'#b85524');
  for(const xx of[x-.80,x+.80]){
   m.box(xx,yy+.45,z,.44,.045,.44,'#c3c9bd');
   for(const dx of[-.19,.19])for(const dz of[-.19,.19])m.box(xx+dx,yy+.23,z+dz,.028,.46,.028,'#9ba994',true);
   for(let i=0;i<4;i++)m.box(xx,yy+.65+i*.065,z-.21,.44,.037,.025,'#c3c9bd',true);
  }
  m.box(1777.9,yy+.92,264.82,2.5,.19,.20,'#706347');
  for(let i=0;i<10;i++){const g=new T.IcosahedronGeometry(.095,0);g.translate(1776.82+i*.24,yy+1.1,264.83);m.put(g,i%3?'#854f67':'#6f8661');}yield;
  const bin=new T.CylinderGeometry(.17,.16,.63,10);bin.translate(1785.1,ground(1785.1,264.8)+.36,264.8);m.put(bin,'#929d8f');yield;
 });
 const wing=details.wing;
 m.job(wing.title,wing.p as XY[],[],function*(){
  const y=ground(...wing.anchor as XY)+.08,h=wing.height,wall='#bdbbaa',trim='#d0cbb8';
  m.solid(wing.p as XY[],h+4,y-4,wall,true);m.solid(wing.p as XY[],.18,y+h,'#7b8175',false);yield;
  for(const f of a.faces(wing.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),west=q[0]<p[0]-.8,south=q[1]>p[1]+.8;
   a.cornice(f,h,trim);
   if(west){
    f.panel(f.len/2,1.95,.07,f.len,3.9,.14,'#424b45');
    const bays=Math.max(2,Math.round(f.len/3.0));
    for(let i=0;i<bays;i++){
     const u=(i+.5)*f.len/bays;a.arch(f,u,.85,f.len/bays-.25,2.6,y,'#3b5851',trim,1);
     for(const yy of[5.3,8.45])f.panel(u,yy,.15,f.len/bays-.12,3.05,.04,'#628080',false,1);
     f.panel(u-f.len/bays/2,7.02,.22,.055,6.5,.075,'#a9b7ab',true);yield;
    }
    for(const yy of[3.91,7.01])f.panel(f.len/2,yy,.23,f.len,.055,.08,'#99ab9f',true);
    f.panel(f.len*.50,3.65,.26,7.1,.60,.20,'#6b7268');f.label('INSIDE',f.len*.50,3.47,.39,'#c4c9b8',.39);
   }else if(south){
    for(const yy of[3.55,6.91])for(const d of[0,.16])f.panel(f.len/2,yy+d,.11,f.len,.055,.14,trim);
    for(const u of[f.len*.18,f.len*.50,f.len*.82])for(const yy of[5.10,8.45])f.window(u,yy,1.65,2.55,trim,'#394a41');
    for(const edge of[.24,f.len-.24])for(let yy=.4;yy<h-.4;yy+=.52)f.panel(edge,yy,.07,.45,.035,.14,'#aaa992',true);
    const u=f.len*.46,depth=1.8,start=f.at(u,depth+.05),low=ground(...start)+.035,top=Math.max(low+.40,y+.48),n=Math.ceil((top-low)/.13),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
    for(let k=0;k<n;k++){const pt=f.at(u,depth-(k+.5)*depth/n);m.box(pt[0],low+(top-low)*(k+1)/n-.20,pt[1],3,.4,depth/n,'#575f50',false,true,angle);yield;}
    f.panel(u,top-y+1.45,.13,2.25,2.9,.05,'#3c4e45',false,1);
    f.panel(u,top-y+3.2,1.04,4.05,.13,2.08,'#344539');
    for(const side of[-1,1])f.panel(u+side*1.95,top-y+1.58,1.89,.085,3.16,.085,'#3b4c3f',true);
   }yield;
  }
  // Raised west terrace and its actual-direction entrance stairs. Riser count
  // follows the sampled terrain, so walking works on the real street slope.
  const x=1764.5,z0=249,z1=260.2,top=Math.max(ground(x,z0),ground(x,z1))+.55;
  m.box(x,top-.22,(z0+z1)/2,2,.44,z1-z0,'#74796c',false,true);
  const depth=2.55,low=ground(x,z1+depth)+.035,n=Math.ceil((top-low)/.13);
  for(let k=0;k<n;k++){const z=z1+depth-(k+.5)*depth/n;m.box(x,low+(top-low)*(k+1)/n-.20,z,2,.4,depth/n,'#515b50',false,true);yield;}
  for(const hh of[.30,.65,1.0])m.beam(new T.Vector3(x-1,top+hh,z0),new T.Vector3(x-1,top+hh,z1),.027,'#adb8a6');
  for(let z=z0;z<=z1;z+=1.25)m.box(x-1,top+.52,z,.05,1.08,.05,'#a2af9b',true);
  for(const hh of[.34,.98])m.beam(new T.Vector3(x-1,top+hh,z1),new T.Vector3(x-1,low+hh,z1+depth),.027,'#adb8a6');yield;
 });
 // Mapped lamp positions; simple fittings are estimates, merged into local jobs.
 for(const p of details.lamps)m.job(`stâlp ${p.id}`,streetRect(p.p[0],p.p[1],2,2),[],function*(){
  const[x,z]=p.p,y=ground(x,z),side=z<272?1:-1;
  m.box(x,y+3.75,z,.19,7.5,.19,'#a0a28e',false,true);
  m.beam(new T.Vector3(x,y+7.1,z),new T.Vector3(x,y+7.45,z+side*2),.045,'#788373');
  const head=new T.SphereGeometry(1,10,6);head.scale(.20,.10,.42);head.translate(x,y+7.40,z+side*2);m.put(head,'#b1b7a3',true);yield;
 });
 const northPoles=details.lamps.filter(p=>p.p[1]<273).sort((a,b)=>a.p[0]-b.p[0]);
 for(let i=1;i<northPoles.length;i++){
  const aa=northPoles[i-1].p as XY,bb=northPoles[i].p as XY;
  m.job(`cabluri ${i}`,[aa,bb],[],function*(){
   for(let wire=0;wire<3;wire++)for(let j=0;j<6;j++){
    const at=(t:number)=>new T.Vector3(aa[0]+(bb[0]-aa[0])*t,ground(...aa)*(1-t)+ground(...bb)*t+6.9+wire*.12-.65*Math.sin(Math.PI*t),aa[1]+(bb[1]-aa[1])*t+.15*wire);
    m.beam(at(j/6),at((j+1)/6),.018,'#414d40');yield;
   }
  });
 }
 // Tree pattern is observed in the dated street sequence; individual trunk
 // offsets and crowns are approximations, kept off the continuous high footway.
 for(const[x,z]of[[1820,279.0],[1839.3,278.1],[1864.2,278.0],[1882.2,278.4]])m.job(`arbore taluz ${x}`,streetRect(x,z,5,5),[],function*(){
  const y=ground(x,z)+bankLift(x,z);
  const trunk=new T.CylinderGeometry(.18,.28,5.8,8);trunk.translate(x,y+2.9,z);m.put(trunk,'#766f57',false,true);
  const base=new T.CylinderGeometry(.279,.29,1.1,8);base.translate(x,y+.55,z);m.put(base,'#b6b9a4');
  for(const[dx,dy,dz,r]of[[0,6.7,0,2.5],[-1.5,5.8,.5,1.9],[1.1,6.2,-.6,2.0],[.1,8.2,.2,1.8]]){const crown=new T.IcosahedronGeometry(r,1);crown.scale(1,1.35,1);crown.translate(x+dx,y+dy,z+dz);m.put(crown,'#5f7850');yield;}
 });
 const layers=[m,l,buildings];
 return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),
  get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
