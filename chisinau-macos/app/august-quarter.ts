import * as T from 'three';
import realm from '../data/august-quarter.json';
import {streetMesh,streetRect as rect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {landscapeLayer} from './landscape-layer';
import {feature,type XY} from './city-layout';

/** 31 August / Vlaicu. Mapped plans, photographed materials and entrances.
 * Elevation estimates and evidence limits: docs/august-quarter-references.md. */
export function createAugustQuarter(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'31 August · arhitectură',ground,loaded),a=photoArchitecture(m);
 const l=landscapeLayer(scene,'31 August · spațiu public',ground,loaded,{maxEdge:2.5,residentDistance:650});
 const {solid,box,put,beam,facade}=m,stone='#c4bea6',trim='#d0cbb7',glass='#4f666b',iron='#3b4642';
 type Face=ReturnType<typeof facade>;
 const low=(i:number)=>ground(...realm.stairs[i].start as XY)+.12;
 function door(f:Face,u:number,bottom:number,w:number,h:number,color='#626454'){
  f.panel(u,bottom+h/2,.38,w,h,.02,glass,false,1);
  for(const d of[-.5,0,.5])f.panel(u+d*w,bottom+h/2,.43,.065,h,.07,color);
  for(const y of[bottom,bottom+h*.72,bottom+h])f.panel(u,y,.43,w,.065,.07,color);
  f.panel(u+.17,bottom+1.02,.48,.045,.42,.06,'#afa990',true);
 }
 function* rail(f:Face,u:number,w:number,y:number,h=.90,v=.85){
  for(const hh of[y,y+h])f.panel(u,hh,v,w,.045,.045,iron,true);
  for(let x=-w/2;x<=w/2;x+=.21){f.panel(u+x,y+h/2,v+.12*Math.sin(Math.PI*(x/w+.5)),.025,h,.03,iron,true);if(Math.round((x+w/2)/.21)%15===14)yield;}
 }
 const palat=feature('w27446239');
 m.job('Palatul Național Nicolae Sulac',palat.p,[27446239],function*(){
  const y=low(0),h=17.9;
  solid(palat.p,h+5,y-5,'#c8c8b8',true,palat.holes);solid(palat.p,.20,y+h,'#7f897d');
  // Auditorium behind the lower glazed foyer, all within the mapped footprint.
  solid(rect(105.5,226.2,50,42),6.5,y+h,'#bcbfaf');box(105.5,y+h+6.6,226.2,50.2,.20,42.2,'#8b9283');yield;
  for(const f of a.faces(palat.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[0]>p[0]+.9;
   if(front){
    const bays=19,step=f.len/bays;
    f.panel(f.len/2,2.5,.08,f.len,4.4,.16,'#3b443e');
    f.panel(f.len/2,5.04,1.02,f.len+1.3,1.15,2.04,'#c8c8b8');
    for(let i=0;i<bays;i++){
     const u=(i+.5)*step;
     f.panel(u,10.15,.32,step-.48,8.95,.02,glass,false,1);
     f.panel(u,16.32,.32,step-.48,1.24,.02,'#637975',false,1);
     for(const yy of[5.76,10.18,14.63,15.70,16.94])f.panel(u,yy,.38,step-.45,.07,.075,'#687566',true);
     f.panel(i*step,11.66,.46,.40,12.55,.92,'#cecebf');
     for(const d of[-.36,.36])f.panel(u+d*step,10.2,.37,.04,8.8,.045,'#929a83',true);
     door(f,u,.70,step-.6,3.65,'#8a8060');
     if(i%3===0)f.panel(i*step,2.55,.30,.62,3.7,.60,'#343f3b');yield;
    }
    f.panel(f.len-.08,11.66,.46,.40,12.55,.92,'#cecebf');
    f.label('PALATUL NAȚIONAL',f.len/2,4.93,.86,'#6c6244',2.06);
    f.label('NICOLAE SULAC',f.len/2,4.39,.36,'#72684c',2.06);
   }else if(f.len>12){
    f.panel(f.len/2,1.8,.07,f.len,3.6,.14,'#aaa999');
    yield* a.windows(f,2,12,Math.max(3,Math.round(f.len/6)),6.1,'#bcbfac','#606e66');
   }
   yield;
  }
 });

 const vlaicu=feature('w46331618');
 m.job('Vlaicu Pârcălab 45 · fațada cu reliefuri',vlaicu.p,[46331618],function*(){
  // Original P+4E documented by the Ministry of Culture; no unverified proposed
  // rooftop extension. The 2024 inspection still shows the original reliefs.
  const y=ground(322,266)+.12,h=18.6;
  solid(vlaicu.p,h+5,y-5,'#a6aa9f',true,vlaicu.holes);solid(vlaicu.p,.2,y+h,'#788176');yield;
  for(const f of a.faces(vlaicu.p,y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[0]>p[0]+.90;
   if(front&&f.len>60){
    f.panel(f.len/2,2.05,.08,f.len,4.10,.16,'#333e3b');
    for(let u=1.1;u<f.len;u+=2.25){door(f,u,.08,2.04,3.35,'#454e46');yield;}
    for(let yy=3.55;yy<4.2;yy+=.17)f.panel(f.len/2,yy,.30,f.len,.10,.34,'#75604a');
    for(let row=0;row<4;row++){
     const yy=4.5+row*3.5,bays=Math.round(f.len/1.45),w=f.len/bays;
     f.panel(f.len/2,yy+1.2,.18,f.len,2.05,.03,glass,false,1);
     for(let j=0;j<bays;j++){
      const u=(j+.5)*w;
      f.panel(j*w,yy+1.2,.25,.075,2.10,.08,'#727f7a',true);
      const left=f.at(u-w/2,.22),right=f.at(u+w/2,.22),tip=f.at(u,.64),v:number[]=[];
      const A=[left[0],y+yy+2.25,left[1]],B=[right[0],y+yy+2.25,right[1]],C=[right[0],y+yy+3.49,right[1]],D=[left[0],y+yy+3.49,left[1]],E=[tip[0],y+yy+2.89,tip[1]];
      for(const tri of[[A,B,E],[B,C,E],[C,D,E],[D,A,E]])v.push(...tri.flat());
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();put(g,'#b0b4ab');
      // Slight weathering differences keep the four relief facets legible even
      // when the street-facing wall receives only diffuse sky illumination.
      const colors=g.attributes.color;for(let k=0;k<colors.count;k++){const shade=[1,.88,1.07,.95][Math.floor(k/3)%4];colors.setXYZ(k,colors.getX(k)*shade,colors.getY(k)*shade,colors.getZ(k)*shade);}
      if(j%10===9)yield;
     }
     yield;
    }
   }else if(f.len>4)yield* a.windows(f,5,h,Math.max(1,Math.round(f.len/3.4)),2.4,'#b0b3a5','#6b756d');
   yield;
  }
 });

 const clinic=feature('w70117734');
 m.job('31 August 70 · Policlinica de Stat',clinic.p,[70117734],function*(){
  const y=low(1),h=14.8,red='#a6664a';
  for(const p of realm.clinicMain){solid(p[0] as XY[],h+5,y-5,stone,true,p.slice(1) as XY[][]);solid(p[0] as XY[],.18,y+h,'#848b79');}
  for(const p of realm.clinicEntry){solid(p[0] as XY[],9.1+5,y-5,stone,true,p.slice(1) as XY[][]);solid(p[0] as XY[],.18,y+9.1,'#87907f');}yield;
  for(const f of realm.clinicMain.flatMap(p=>a.faces(p[0] as XY[],y))){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]>p[1]+.85,entry=front&&p[0]>396&&p[0]<407;
   if(entry)continue;
   f.panel(f.len/2,.45,.05,f.len,.90,.10,'#a6a48f');
   if(front&&f.len>7){
    f.panel(f.len/2,h-.92,.16,f.len,1.84,.32,red);
    for(let yy=h-1.7;yy<h;yy+=.24)f.panel(f.len/2,yy,.34,f.len,.025,.024,'#85543f',true);
    const bays=Math.max(1,Math.round(f.len/3.7));
    for(let i=0;i<bays;i++){
     const u=(i+.5)*f.len/bays;
     for(let row=0;row<3;row++)f.window(u,4.0+row*3.3,1.38,2.45,trim,'#c3c7b6');
     if(i%3===0)f.panel(u+1.15,8.4,.4,.5,11.6,.8,stone);yield;
    }
   }else if(f.len>3)yield* a.windows(f,4,h,Math.max(1,Math.round(f.len/4)),2.65,trim,'#adb5a6');
   yield;
  }
  const f=facade([395.78,301.54],[407.87,301.31],y),u=f.len/2;
  f.panel(u,8.3,.20,f.len,1.7,.40,red);
  for(let yy=7.55;yy<9.16;yy+=.23)f.panel(u,yy,.42,f.len,.03,.04,'#864f3c',true);
  for(const d of[-1,1]){
   const t=u+d*2.7;
   a.arch(f,t,1.82,3.1,5.85,y,'#4d6160',trim);
   door(f,t,1.82,2.65,3.16,'#c9cabb');
   f.panel(t,6.7,.45,.065,1.18,.07,'#c9cabb');f.panel(t,5.95,.45,2.76,.08,.075,'#c9cabb');
   f.panel(t,5.43,.46,.82,.39,.05,'#a69356',true);yield;
  }
  for(const t of[.24,u,f.len-.24]){f.panel(t,4.15,.32,.55,4.62,.64,trim);f.panel(t,6.38,.37,1.02,.32,.74,trim);}
  const pharmacy=facade([408.1,295.02],[413.2,295.02],y);
  pharmacy.panel(2.0,3.64,.45,.29,1.15,.07,'#3f8b75');pharmacy.panel(2.0,3.64,.45,1.14,.30,.07,'#3f8b75');
  pharmacy.label('FARMACIE',2,2.70,.28,'#438b78',.5);
 });

 const apartments=feature('w140494858');
 m.job('31 August 105 · piatră și mansardă',apartments.p,[140494858],function*(){
  const y=ground(357,329)+.12,h=10.5,red='#956247';
  solid(apartments.p,h+5,y-5,'#c2b795',true,apartments.holes);
  solid(apartments.p,3.25,y+h,red);a.roof(357.2,339.1,26.8,14.3,y+13.75,1.20,red);yield;
  for(const f of a.faces(apartments.p,y)){
   if(f.len<2)continue;
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=q[1]<p[1]-.85;
   f.panel(f.len/2,.48,.06,f.len,.96,.12,'#928d73');
   if(front&&f.len>20){
    const bays=6,w=f.len/bays;
    for(let row=0;row<3;row++){
     for(let i=0;i<bays;i++){
      const u=(i+.5)*w,yy=2.25+row*3.22;
      f.window(u,yy,1.43,2.05,'#c9c2a7','#c2c7b8');
      if(row<2){const g=new T.TorusGeometry(.83,.085,4,12,Math.PI),pa=f.at(u,.42),pb=f.at(1),pc=f.at(0);g.rotateY(Math.atan2(-(pb[1]-pc[1]),pb[0]-pc[0]));g.translate(pa[0],y+yy+1.02,pa[1]);put(g,trim,true);}
      if((i===2||i===3)&&row>0){f.panel(u,yy-1.1,.66,2.42,.18,1.32,trim);yield* rail(f,u,2.3,yy-1.0,.90,1.28);}
      yield;
     }
    }
    for(let yy=1;yy<10.4;yy+=.59)f.panel(f.len/2,yy,.085,f.len,.02,.03,'#9f997d',true);
    for(let i=0;i<3;i++){
     const u=(i+.5)*f.len/3;
     f.panel(u,12.0,.20,3.8,2.6,.035,'#5c6661',false,1);
     for(const d of[-2.05,2.05])f.panel(u+d,12.1,.27,.34,3.35,.54,trim);
     f.panel(u,13.60,.30,4.45,.3,.60,trim);f.window(u,12.1,1.6,2.1,trim,'#bcc3b6');yield* rail(f,u,3.5,10.95,.95,.61);
    }
    for(let yy=10.66;yy<13.7;yy+=.26)f.panel(f.len/2,yy,.08,f.len,.023,.025,'#79513d',true);
    f.label('105',f.len-.60,2.64,.22,'#3f6170',.44);
   }else{yield* a.windows(f,3,h,Math.max(1,Math.round(f.len/3.7)),2.2,trim,'#b5bbaa');}
   yield;
  }
 });

 realm.stairs.forEach((s,i)=>m.job(s.name+' · scara de acces',rect((s.start[0]+s.end[0])/2,(s.start[1]+s.end[1])/2,i===0?9:16,i===0?47:14),[],function*(){
  const base=low(i),dx=s.end[0]-s.start[0],dz=s.end[1]-s.start[1],len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),tread=(len-s.landing)/s.count,split=7;
  for(let k=0;k<s.count;k++){
   const d=(k+.5)*tread+(s.landing&&k>=split?s.landing:0),t=d/len,top=base+(k+1)*s.rise/s.count;
   box(s.start[0]+dx*t,(top+base-.35)/2,s.start[1]+dz*t,s.width,top-base+.35,tread,s.color,false,true,angle);
   if(i===1)for(const side of[-1,1]){const x=s.start[0]+dx*t+side*s.width/2*dz/len,z=s.start[1]+dz*t-side*s.width/2*dx/len;box(x,(top+base)/2+.18,z,.22,top-base+.36,tread,'#4d5955',false,true,angle);}
   yield;
  }
  if(s.landing){const d=split*tread+s.landing/2,t=d/len,top=base+split*s.rise/s.count;box(s.start[0]+dx*t,(top+base-.35)/2,s.start[1]+dz*t,s.width,top-base+.35,s.landing,s.color,false,true,angle);}
  if(i===1){
   // Silver tubular rail follows both flights and their level intermediate landing.
   const edge=406.9,points=[[edge,base+.14,310.5],[edge,base+split*s.rise/s.count,310.8-split*tread],[edge,base+split*s.rise/s.count,310.8-split*tread-s.landing],[edge,base+s.rise,301.65]];
   for(const p of points)beam(new T.Vector3(...p),new T.Vector3(p[0],p[1]+.94,p[2]),.037,'#9da99f');
   for(let j=1;j<points.length;j++)for(const h of[.30,.62,.94])beam(new T.Vector3(points[j-1][0],points[j-1][1]+h,points[j-1][2]),new T.Vector3(points[j][0],points[j][1]+h,points[j][2]),.034,'#9da99f');
  }
 }));
 const pavement=(x:number,z:number)=>{
  let y=ground(x,z)+.12;
  for(let i=0;i<realm.stairs.length;i++){
   const s=realm.stairs[i],dx=s.end[0]-s.start[0],dz=s.end[1]-s.start[1],len=Math.hypot(dx,dz),forward=((x-s.start[0])*dx+(z-s.start[1])*dz)/len,across=Math.abs(((x-s.start[0])*dz-(z-s.start[1])*dx)/len),w=Math.max(0,1-Math.max(0,across-s.width/2)/1.0)*Math.max(0,1-Math.abs(forward)/1.1);
   y+=(low(i)-y)*w;
  }
  return y;
 };
 for(const cell of realm.cells)l.job(`sol ${cell.x}/${cell.z}`,cell.x,cell.z,function*(){for(const p of cell.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,p.raised?pavement:(x,z)=>ground(x,z)+.035,true);},cell.coverage);
 for(let k=0;k<realm.separators.length;k+=12){
  const group=realm.separators.slice(k,k+12);
  m.job('Pistă de biciclete · separatoare '+k,group as XY[],[],function*(){
   for(const[x,z]of group){const y=ground(x,z)+.035;box(x,y+.038,z,.33,.075,.32,'#39453e');box(x,y+.22,z,.065,.40,.065,'#354039',true);for(const h of[.18,.32])box(x,y+h,z,.07,.065,.07,'#b6a04a',true);yield;}
  });
 }
 return{objects:[...m.objects,...l.objects],collisionObjects:[...m.collisionObjects,...l.collisionObjects],replacements:m.replacements,
  get ready(){return m.ready&&l.ready;},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return m.readyNear(x,z,r)&&l.readyNear(x,z,r);},update(camera:T.PerspectiveCamera,now:number){m.update(camera,now);l.update(camera,now);},dispose(){m.dispose();l.dispose();}};
}
