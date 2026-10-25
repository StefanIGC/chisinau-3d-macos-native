import * as T from 'three';
import realm from '../data/eugen-doga.json';
import {landscapeLayer} from './landscape-layer';
import {parkMaterial} from './park-materials';
import {concreteBench,historicLamp,sculpture} from './pedestrian-furniture';
import {slattedBin} from './street-furniture';

export const DOGA={south:-354,north:-626,crossing:-464.2};
export const dogaPointIds=realm.nativePointIds;
/** 272 m pedestrian route, interrupted by the real Alexandru cel Bun road. */
export function createEugenDoga(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const material=parkMaterial('ground'),baseCompile=material.onBeforeCompile.bind(material);
 material.customProgramCacheKey=()=> 'eugen-doga-cobble-drain-v1';
 material.onBeforeCompile=(s,r)=>{baseCompile(s,r);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  if(parkUp>.65&&parkStyleV>9.5){
    if(parkStyleV<10.5){
      float q=parkPosition.z*12.;float aa=fwidth(q);
      float slit=1.-smoothstep(.13-aa,.13+aa,abs(fract(q)-.5));
      diffuseColor.rgb*=mix(1.,.32,slit*(1.-smoothstep(.3,1.,aa)));
    }else{
      vec2 q=parkPosition.xz/vec2(.12,.15);q.x+=mod(floor(q.y),2.)*.5;
      vec2 aa=fwidth(q),f=fract(q);float fade=1.-smoothstep(.35,1.,max(aa.x,aa.y));
      float edge=min(min(f.x,1.-f.x),min(f.y,1.-f.y));
      float grain=fract(sin(dot(floor(q),vec2(12.9898,78.233)))*43758.5453);
      diffuseColor.rgb*=mix(1.,mix(.62,.89+grain*.18,smoothstep(.025,.075,edge)),fade);
    }
  }`);};
 const l=landscapeLayer(scene,'Eugen Doga',ground,loaded,{material,maxEdge:3,residentDistance:640});
 const floor=(x:number,z:number)=>ground(x,z)+.12;
 for(const cell of realm.cells){
  const low=cell.z-8.5,high=cell.z+8.5;
  l.job(`pietonală ${cell.z}`,cell.x,cell.z,function*(){
   for(const p of cell.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,floor,true);
   for(const p of realm.lamps)if(p.p[1]>=low&&p.p[1]<high){historicLamp(l,p.p[0],floor(...p.p as [number,number]),p.p[1]);yield;}
   for(const p of realm.benches)if(p.p[1]>=low&&p.p[1]<high){
    const [x,z]=p.p,angle=x<25?Math.PI/2:-Math.PI/2;concreteBench(l,x,floor(x,z),z,angle);
    slattedBin(l,x,floor(x,z+1.3),z+1.3,'#586057');yield;
   }
  },cell.coverage);
 }
 // Threshold markings sit on the real traffic road, which is not repaved.
 l.job('trecerea Alexandru cel Bun',24.8,DOGA.crossing,function*(){
  for(let z=-468.8;z<-459.7;z+=1.08){const x=24.8,p=[[[x-2.2,z],[x+2.2,z],[x+2.2,z+.48],[x-2.2,z+.48]]];yield* l.surfaceStaged(p,'#bdbeb0',0,(x,z)=>ground(x,z)+.11);}
 });
 l.job('Cheia sol · intrarea dinspre Columna',33.3,-355.4,function*(){
  // The photographed low oval plinth is behind the existing hemisphere row.
  const x=33.3,z=-355.4,y=floor(x,z),s=sculpture(l,x,y,z),bronze='#605941';
  const base=new T.CylinderGeometry(.70,.76,.12,24);base.scale(1,1,.71);base.translate(0,.06,0);s.put(base,'#394841',false,true);
  const plinth=new T.CylinderGeometry(.32,.61,.57,10);plinth.translate(0,.405,0);s.put(plinth,bronze,false,true);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;const g=new T.PlaneGeometry(.20,.35);g.rotateY(a);g.translate(Math.sin(a)*.476,.39,Math.cos(a)*.476);s.put(g,'#5d7564',true);}
  const curve=new T.CatmullRomCurve3([[-.05,.69,0],[-.35,.90,0],[-.40,1.22,0],[-.18,1.40,0],[.18,1.22,0],[.04,.96,0],[-.03,1.55,0],[.09,2.36,0],[.29,3.08,0],[.11,3.65,0],[-.20,3.39,0],[-.19,3.01,0],[.25,2.58,0],[.51,2.24,0],[.47,1.88,0],[.15,1.64,0],[-.25,1.72,0],[-.46,2.05,0],[-.31,2.32,0],[.02,2.35,0],[.20,2.11,0]].map(p=>new T.Vector3(...p as [number,number,number])));
  s.put(new T.TubeGeometry(curve,78,.072,6,false),bronze);yield;
  for(const radius of[.65,.73,.81]){const g=new T.TorusGeometry(radius,.009,4,42);g.translate(0,2.20,.035);s.put(g,'#9b8c54',true);}
  for(let i=0;i<26;i++){const a=i/26*Math.PI*2,u=Math.cos(a)*.73,h=2.2+Math.sin(a)*.73;s.ball(u,h,.07,.044,.027,.026,'#a09050',true);s.rod([u+.025,h,.07],[u+.025,h+.13,.07],.008,'#a09050',true);}
 });
 l.job('Îndrăgostiții · siluete din bronz',29.49,-386.84,function*(){
  // OSM maps the composition at one point. Offsets/poses are photo estimates.
  const x=27.68,z=-388.72,y=floor(x,z),s=sculpture(l,x,y,z,-.45),b='#545b50';
  // Waiting figure, one crossed leg, wrist raised, bouquet held behind the body.
  s.rod([-.10,.10,.10],[-.13,.86,0],.071);s.rod([.24,.12,.04],[.08,.85,0],.071);
  s.ball(-.10,.065,.15,.085,.052,.19);s.ball(.24,.065,.11,.09,.052,.17);
  s.ball(0,1.20,0,.24,.38,.15);s.ball(0,1.73,.015,.145,.19,.135);
  s.ball(0,1.86,-.025,.15,.07,.14,b);s.rod([-.23,1.42,0],[-.36,1.14,.05],.06);
  s.rod([-.36,1.14,.05],[-.08,1.28,.22],.051);s.rod([.23,1.41,0],[.31,1.05,-.11],.06);
  s.rod([.31,1.05,-.11],[.26,.84,-.23],.043);s.block(-.10,1.28,.22,.08,.037,.06,'#897b4e');
  for(let i=0;i<7;i++){const dx=(i%3-1)*.06,dz=Math.floor(i/3)*.06;s.rod([.26,.87,-.22],[.21+dx,1.35,-.30-dz],.008,b,true);s.ball(.21+dx,1.35,-.30-dz,.05,.035,.05,'#6b7059',true);}yield;
  const q=sculpture(l,29.49,floor(29.49,-383.4),-383.4,Math.PI+.15);
  q.ball(0,1.23,0,.19,.29,.125);const skirt=new T.CylinderGeometry(.16,.31,.45,11);skirt.translate(0,.90,0);q.put(skirt);
  q.rod([-.10,.69,0],[-.17,.33,.17],.051);q.rod([-.17,.33,.17],[-.23,.055,.02],.045);
  q.rod([.10,.69,0],[.18,.35,-.17],.05);q.rod([.18,.35,-.17],[.29,.10,-.32],.04);
  q.ball(-.23,.05,.10,.07,.044,.15);q.ball(.30,.075,-.28,.063,.04,.12);
  q.ball(0,1.70,.015,.132,.18,.127);q.ball(0,1.79,-.04,.14,.12,.14,'#49554c');
  q.ball(-.05,1.55,-.13,.13,.22,.08,'#49554c');q.rod([-.18,1.38,0],[-.32,1.58,.09],.043);q.rod([-.32,1.58,.09],[-.11,1.67,.17],.035);
  q.rod([.18,1.39,0],[.31,1.08,.11],.043);q.rod([.31,1.08,.11],[.45,1.13,.22],.034);
  for(const off of[-.055,.055]){q.rod([.44,1.13,.22],[.44+off,.94,.24],.011,b,true);q.ball(.44+off,.91,.29,.04,.042,.11,b);}
  yield;
 });
 return l;
}
