import * as T from 'three';
import {photoArchitecture} from './photo-architecture';
import {pointSegmentDistance,type XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import type {PhotoBuilding} from './central-infill';

export const TOLSTOI_CUSTOM=['raised46','ismail44-complex','annex44','ismail42','dese29','bellavita27','flori25','stone23'];
/** Referenced exterior geometry. Unsurveyed dimensions remain estimates. */
export function addTolstoiArchitecture(m:ReturnType<typeof streetMesh>,buildings:PhotoBuilding[]){
 const a=photoArchitecture(m),{ground,box,solid,put,beam}=m;
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
 function* steps(f:Face,u:number,width:number,rise:number,depth:number,color:string){
  const start=f.at(u,depth+.08),low=ground(...start)+.12,top=Math.max(low+.14,f.y+rise),n=Math.ceil((top-low)/.14),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
  for(let k=0;k<n;k++){const p=f.at(u,depth-(k+.5)*depth/n);box(p[0],low+(top-low)*(k+1)/n-.24,p[1],width,.48,depth/n,color,false,true,angle);yield;}
  return top;
 }
 function* sideSteps(f:Face,u:number,rise:number,run:number,color:string,railColor='#6b6454'){
  const start=u+run,depth=.72,width=1.32,q=f.at(start,depth),low=ground(...q)+.12,top=Math.max(low+.14,f.y+rise),n=Math.ceil((top-low)/.14),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
  for(let k=0;k<n;k++){const p=f.at(start-(k+.5)*run/n,depth);box(p[0],low+(top-low)*(k+1)/n-.24,p[1],run/n,.48,width,color,false,true,angle);yield;}
  const p=f.at(u-.45,depth);box(p[0],top-.19,p[1],.9,.38,width,color,false,true,angle);
  for(const d of[.08,1.38]){const p0=f.at(start,d),p1=f.at(u,d);beam(new T.Vector3(p0[0],low+.94,p0[1]),new T.Vector3(p1[0],top+.94,p1[1]),.027,railColor);for(let k=0;k<=6;k++){const pp=f.at(start-run*k/6,d),h=low+(top-low)*k/6;box(pp[0],h+.47,pp[1],.027,.94,.027,railColor,true);}}
  return top;
 }
 function grille(f:Face,u:number,h:number,w:number,hh:number,color='#52594b'){
  for(let v=-w/2;v<=w/2;v+=.23)f.panel(u+v,h,.48,.024,hh,.026,color,true);
  for(const yy of[h-hh*.34,h+hh*.34])f.panel(u,yy,.49,w,.024,.026,color,true);
 }
 function* build(b:PhotoBuilding):Generator<void>{
  if(b.parts?.length){for(const p of b.parts)yield* build({...b,...p,parts:undefined});return;}
  const y=ground(...b.anchor as XY)+.12,h=b.height;
  if(b.passages.length){const d=b.passages[0];for(const r of d.walls)solid(r[0] as XY[],d.clearance+5,y-5,b.wall,true,r.slice(1) as XY[][]);solid(b.p as XY[],h-d.clearance,y+d.clearance,b.wall,true,b.holes as XY[][]);for(const p of b.passages)yield* m.surfaceStaged(p.rings[0] as XY[],(x,z)=>ground(x,z)+.12,'#969d91',true,p.rings.slice(1) as XY[][]);}
  else solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);
  yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),south=q[1]>p[1]+.75,north=q[1]<p[1]-.75,east=q[0]>p[0]+.75,west=q[0]<p[0]-.75;
   if(f.len<1.5)continue;
   if(b.style==='bellavita27'){
    const front=east||north,wide=f.len>40,gold='#b5a16c',glass='#637f80',frame='#a9bcb2';
    // The photographed south-end passage remains open through the full body.
    const passage=(lo:number,hi:number)=>Math.max(f.at(lo)[1],f.at(hi)[1])>382.85&&Math.min(f.at(lo)[1],f.at(hi)[1])<386.25;
    const span=2.65,n=Math.max(1,Math.round(f.len/span)),bw=f.len/n;
    for(let k=0;k<n;k++){
     const u=(k+.5)*bw;if(passage(k*bw,(k+1)*bw))continue;
     f.panel(u,.54,.055,bw,1.08,.11,'#535e55');
     if(front){
      const panel=(bottom:number,top:number,v0:number,v1:number)=>{const a0=f.at(k*bw,v0),a1=f.at((k+1)*bw,v0),b0=f.at(k*bw,v1),b1=f.at((k+1)*bw,v1),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([a0[0],y+bottom,a0[1],a1[0],y+bottom,a1[1],b1[0],y+top,b1[1],a0[0],y+bottom,a0[1],b1[0],y+top,b1[1],b0[0],y+top,b0[1]],3));g.computeVertexNormals();put(g,'#3d5557',false,true,1);for(const pt of[[a0,b0],[a1,b1]])beam(new T.Vector3(pt[0][0]+(q[0]-p[0])*.055,y+bottom,pt[0][1]+(q[1]-p[1])*.055),new T.Vector3(pt[1][0]+(q[0]-p[0])*.055,y+top,pt[1][1]+(q[1]-p[1])*.055),.035,frame);for(let yy=bottom;yy<=top+.01;yy+=.95){const v=v0+(v1-v0)*(yy-bottom)/(top-bottom);f.panel(u,yy,v+.065,bw,.055,.065,frame,true);}};
      panel(1.12,3.70,.28,.28);panel(3.72,6.95,.28,.91);f.panel(u,7.20,.47,bw,.50,1.1,gold);
     }else{f.window(u,2.4,Math.max(1,bw-.6),2.3,frame,'#81968b');f.window(u,5.4,Math.max(1,bw-.6),2.3,frame,'#81968b');}
     yield;
    }
    // Eight upper residential levels, with alternating balcony recess patterns.
    const floors=8,storey=(h-7.5)/floors;
    for(let row=0;row<floors;row++){
     const yy=7.55+row*storey;
     for(let k=0;k<n;k++){
      const u=(k+.5)*bw,stack=front&&(wide?(k>2&&k<n-3):(k>0&&k<n-1)),open=stack&&row<6&&(k+row)%3===0;
      if(!front&&Math.abs(k-(n-1)/2)>1.1){f.window(u,yy+storey/2,Math.min(1.65,bw*.67),1.90,b.wall,frame);yield;continue;}
      f.panel(u,yy+storey/2,.10,bw-.03,storey-.04,.025,glass,false,1);
      f.panel(u,yy,.18,bw,.09,.07,frame,true);for(const d of[-1,1])f.panel(u+d*bw/2,yy+storey/2,.18,.055,storey,.07,frame,true);
      if(stack&&row<6){
       f.panel(u,yy+.25,.49,bw,.55,.98,b.wall);for(const d of[-1,1])f.panel(u+d*bw/2,yy+storey/2,.45,.13,storey,.90,b.wall);
       if(open){f.panel(u,yy+1.5,.26,bw-.2,1.90,.025,'#4e6867',false,1);for(const hh of[yy+.68,yy+1.14])f.panel(u,hh,.94,bw-.15,.025,.04,'#b3c4b8',true);}
      }
      yield;
     }
    }
    for(const u of[.25,f.len-.25])f.panel(u,(h+7.5)/2,.31,.5,h-7.5,.22,gold);
    f.panel(f.len/2,h-.18,.25,f.len,.48,.50,gold);
    continue;
   }
   a.cornice(f,h,b.trim);
   const front=b.style==='raised46'?(south||west):b.style==='dese29'?(south||east||(!north&&!west)):b.style==='annex44'?(north||west):b.style==='ismail42'?west:north;
   if(!front){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.4)),2.0,b.trim);continue;}
   if(b.style==='house44'){
    const n=Math.max(4,Math.round(f.len/3.1)),bw=f.len/n,doors=[f.len*.30,f.len*.77];
    for(let row=0;row<2;row++)for(let i=0;i<n;i++){const u=(i+.5)*bw;if(row===0&&doors.some(d=>Math.abs(d-u)<.85))continue;f.window(u,2.05+row*3.85,1.25,2.55,b.trim,'#bac6b4');yield;}
    for(const yy of[.50,3.84,4.06,7.65])f.panel(f.len/2,yy,.13,f.len,.12,.26,b.trim);
    for(let yy=.9;yy<7.5;yy+=.61){f.panel(f.len/2,yy,.04,f.len,.025,.035,'#9da28f',true);yield;}
    for(const u of[.20,f.len-.20])f.panel(u,h/2,.12,.38,h,.24,b.trim);
    for(const u of doors){const top=yield* steps(f,u,2.85,.56,1.28,'#777b6b');f.window(u,top-y+1.37,1.35,2.72,b.trim,'#bdc8b7');}
    for(const u of[f.len*.08,f.len*.52,f.len*.96]){const p=f.at(u,.23);box(p[0],y+h*.48,p[1],.075,h*.96,.075,'#474e42',true);}
    for(const u of[f.len*.25,f.len*.75])a.pediment(f,u,h+.08,2.4,.45,y,b.trim);
   }else if(b.style==='raised46'){
    const n=west?2:Math.max(2,Math.round(f.len/4.8));f.panel(f.len/2,.77,.04,f.len,1.54,.08,'#a7ad9a');
    for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,3.75,1.48,2.62,b.trim,'#9aa993');grille(f,u,3.75,1.43,2.55);if(west)f.window(u,.74,.87,1.0,b.trim,'#9dad99');yield;}
    for(let u=1;u<f.len;u+=4.8)f.panel(u,5.2,.11,1.94,.10,.22,b.trim,true);
    if(west)f.label('46',.8,2.0,.24,'#50574a');
   }else if(b.style==='annex44'){
    const n=north?4:Math.max(2,Math.round(f.len/4));for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,2.75,1.18,2.08,b.trim,'#bac8b6');grille(f,u,2.75,1.18,2.02);yield;}
    if(west){const u=f.len*.47,top=yield* steps(f,u,2.1,.28,.80,'#969787');f.window(u,top-y+1.32,1.48,2.64,b.trim,'#b6c2b0');}
   }else if(b.style==='ismail42'){
    f.panel(f.len/2,.33,.04,f.len,.66,.08,'#697365');
    for(let k=0;k<3;k++){f.window((k+1)*f.len/4,2.45,1.55,2.30,b.trim,'#715044');yield;}
    for(const hh of[h+.18,h+.86])f.panel(f.len/2,hh,.10,f.len,.14,.35,b.trim);
    for(let u=.1;u<f.len;u+=.40){f.panel(u,h+.52,.10,.09,.65,.13,b.trim,true);yield;}
    f.panel(f.len/2,h-.5,.27,f.len,.045,.055,'#b09b43',true);f.label('42',f.len-.30,2.9,.21,'#4f5b4c');
   }else if(b.style==='dese29'){
    f.panel(f.len/2,1.05,.04,f.len,2.1,.08,'#b7b9a5');
    const corner=!south&&!east;
    if(corner){
     const u=f.len/2;f.panel(u,1.5,.56,f.len-.30,2.80,.04,'#3c4944',false,1);
     for(const side of[-1,1]){const at=f.at(u+side*(f.len/2-.12),.68);box(at[0],y+1.65,at[1],.35,3.3,.90,'#c2bfa8',false,true);f.panel(u+side*(f.len/2-.12),1.65,1.16,.24,2.4,.08,'#aea990',true);}
     for(const hh of[3.0,3.2,3.88])f.panel(u,hh,.70,f.len+.45,.14,1.50,'#c4c2aa');
     f.panel(u,3.55,.69,f.len+.40,.62,1.46,'#bcb695');f.label('DESE',u,3.52,.49,'#354138',1.46);
    }else{
     const n=Math.max(2,Math.round(f.len/3.6));for(let i=0;i<n;i++){const u=(i+.5)*f.len/n;f.window(u,4.27,1.42,2.48,'#b2b49f','#6b6150');f.panel(u,5.83,.24,1.88,.18,.48,'#b8b8a1');f.window(u,.93,1.30,1.23,'#c1c3ad','#647265');grille(f,u,.93,1.25,1.20);yield;}
     for(const u of[.25,f.len-.25])f.panel(u,4.3,.15,.50,4.0,.30,'#b3b29b');
     f.panel(f.len/2,2.03,.12,f.len,.18,.24,'#c0c1a8');
    }
   }else if(['house27','flori25','stone23'].includes(b.style)){
    const n=b.style==='house27'?6:b.style==='stone23'?4:3,bw=f.len/n,entry=b.style==='flori25'?f.len*.21:bw*.45;
    f.panel(f.len/2,1.03,.04,f.len,2.06,.08,b.style==='house27'?'#68746a':'#aaa58e');
    for(let i=0;i<n;i++){const u=(i+.5)*bw;if(Math.abs(u-entry)<1.0)continue;f.window(u,4.08,Math.min(1.6,bw*.60),2.22,b.trim,'#aebba6');f.panel(u,5.38,.25,Math.min(2.04,bw*.78),.18,.50,b.trim);if(b.style!=='house27')f.window(u,.94,1.12,1.15,b.trim,'#6f7866');if(b.style==='house27')a.pediment(f,u,5.54,Math.min(1.98,bw*.8),.25,y,b.trim);yield;}
    // No exterior stair at23: the photographed left doorway starts at pavement level.
    const doorBase=f.at(entry,.6),top=b.style==='stone23'?ground(...doorBase)+.12:yield* sideSteps(f,entry,b.style==='flori25'?1.55:1.65,b.style==='house27'?3.1:3.4,'#a99f87',b.style==='flori25'?'#595b4a':'#655f50');
    f.window(entry,top-y+1.22,1.32,2.44,b.trim,'#63715d');
    if(b.style==='stone23'){
     for(const hh of[h+.14,h+.88])f.panel(entry,hh,.19,2.85,.13,.40,b.trim);
     for(let k=0;k<8;k++)f.panel(entry-1.3+k*.37,h+.50,.19,.09,.67,.18,b.trim,true);
    }else a.pediment(f,entry,5.73,2.3,.50,y,b.trim);
    if(b.style==='flori25'){
     f.label('25',f.len-.42,2.6,.23,'#4f5846');f.panel(f.len/2,6.0,.10,f.len,.055,.055,'#b5a044',true);
     for(const u of[f.len*.50,f.len*.835])f.panel(u,2.62,.18,1.46,.38,.05,'#b6a569',true);
     f.panel(entry,4.61,.67,2.20,.12,1.48,'#4e5948');f.panel(entry-.92,4.03,.91,.49,.58,.055,'#b8a584',true);
     for(let k=0;k<11;k++){const pp=f.at(entry+3.4*k/10,1.40),yy=top-.15-1.55*k/10;const g=new T.IcosahedronGeometry(.13,0);g.translate(pp[0],yy+1.15,pp[1]);put(g,k%2?'#c79893':'#af7581',true);yield;}
    }
    if(b.style==='stone23'){f.label('23',entry+.93,3.3,.22,'#455e6a');for(let yy=2.25;yy<h-.3;yy+=.52){f.panel(f.len/2,yy,.07,f.len,.024,.028,'#8b866e',true);yield;}for(const u of[.18,f.len-.18])f.panel(u,h+.16,.11,.34,.85,.34,b.trim);}
   }
   yield;
  }
 }
 for(const b of buildings.filter(b=>TOLSTOI_CUSTOM.includes(b.style)))m.job(b.title,b.p as XY[],[Number(b.id.slice(1))],()=>build(b));
}
