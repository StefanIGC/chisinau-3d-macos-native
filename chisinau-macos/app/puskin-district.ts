import * as T from 'three';
import {CITY_DATA,feature,type XY} from './city-layout';
import {streetMesh,streetRect as rect} from './street-mesh';
import realm from '../data/puskin-ground.json';

// Columna → 31 August. Exact OSM footprints; photo-derived architectural detail.
// Dates, views and the limits of this reconstruction: docs/puskin-references.md.
export function createPuskinDistrict(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  const mesh=streetMesh(scene,'Pușkin',ground,loaded),{job,box,put,beam,solid,surface,surfaceStaged,facade}=mesh;
  const C={stone:'#b4b09f',trim:'#c5c2b1',base:'#777b72',glass:'#587580',frame:'#555c56',iron:'#46544e',pink:'#a47b70',cream:'#c3c3b2',aggregate:'#7d837a'};
  function building(title:string,id:string,h:number,color:string,detail:(p:XY[],y:number,h:number)=>Generator<void>,extra:number[]=[],minHeight=0){const p=feature(id).p;
    job(title,p,[Number(id.slice(1)),...extra],function*(){const west=p.reduce((a,b)=>a[0]<b[0]?a:b),y=ground(...west),bottom=minHeight||-5;solid(p,h-bottom,y+bottom,color);solid(p,.16,y+h,'#747d77');yield;yield* detail(p,y,h);});
  }
  function* banded(a:XY,b:XY,y:number,h:number,rows:number,bays:number,stone=C.cream){const f=facade(a,b,y);
    for(let row=0;row<rows;row++){const top=(row+1)*h/rows;f.panel(f.len/2,top-.36,.24,f.len,.74,.5,stone);for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;f.panel(u,top-h/rows/2-.28,.32,f.len/bays-.16,h/rows-.94,.03,C.glass,false,1);f.panel(u-f.len/bays/2,top-h/rows/2,.38,.062,h/rows-.7,.07,C.frame,true);if(i%8===7)yield;}yield;}
  }
  function rail(a:XY,b:XY,y:number){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.2);for(let i=0;i<=n;i++){const x=T.MathUtils.lerp(a[0],b[0],i/n),z=T.MathUtils.lerp(a[1],b[1],i/n);beam(new T.Vector3(x,y,z),new T.Vector3(x,y+.92,z),.027,'#9baba4');}for(const h of[.46,.92])beam(new T.Vector3(a[0],y+h,a[1]),new T.Vector3(b[0],y+h,b[1]),.027,'#9baba4');}
  function entrance(x:number,z:number,width:number,rise:number,count:number,color=C.pink){
    const y=ground(x-2,z)+.12,run=count*.31;
    for(let i=0;i<count;i++){const h=rise*(i+1)/count;box(x-run+(i+.5)*.31,y+h/2,z,.31,h,width,color,false,true);}
    box(x+.25,y+rise/2,z,.52,rise,width,color,false,true);for(const side of[-1,1]){const zz=z+side*(width/2-.1);beam(new T.Vector3(x-run,y+.9,zz),new T.Vector3(x,y+rise+.9,zz),.028,'#a8b6af');for(let i=0;i<3;i++){const xx=x-run+i*run/2,h=rise*i/2;beam(new T.Vector3(xx,y+h,zz),new T.Vector3(xx,y+h+.9,zz),.024,'#a8b6af');}}
  }
  building('Sun City · podium','w32977885',15,C.cream,function*(p,y,h){
    yield* banded([189.61,-306.39],[188.45,-260.91],y,h,4,22);
    const f=facade([189.61,-306.39],[188.45,-260.91],y);
    // Low street shops, then the raised glazed public terrace.
    for(let i=0;i<11;i++){const u=(i+.5)*f.len/11;f.panel(u,1.37,.44,3.66,2.62,.03,C.glass,false,1);f.panel(u,2.84,.54,3.96,.49,.13,['#454a45','#66584a','#414b48'][i%3]);f.panel(u,1.4,.50,.065,2.6,.08,'#c1c2ac',true);}
    f.label('SUN CITY',f.len*.53,6.20,.63,'#bac3ba',.59);
    const a=f.at(1,2.05),b=f.at(f.len-1,2.05);box((a[0]+b[0])/2,y+3.20,(a[1]+b[1])/2,2.4,.26,f.len-2,'#686f67',false,true);rail(a,b,y+3.34);yield;
    const north=facade([227.99,-324.98],[206.43,-325.01],y);for(let r=1;r<4;r++){north.panel(north.len/2,2.1+r*3.15,.33,north.len-.5,2.32,.02,C.glass,false,1);north.panel(north.len/2,3.54+r*3.15,.25,north.len,.51,.5,C.cream);yield;}
    north.panel(13,1.62,.32,10,2.9,.02,C.glass,false,1);north.panel(13,3.38,.36,10,.72,.16,'#c7c7b5');north.label('BULKA',13,3.18,.51,'#555853',.46);
  });
  building('Sun City · corp sud','w50147999',15,C.cream,function*(p,y,h){yield* banded([188.5,-260.69],[188.55,-237.37],y,h,4,11);yield* banded([188.55,-237.37],[249.85,-237.37],y,h,4,24);});
  building('Sun City · turn vitrat','w1396207389',35,'#506e78',function*(p,y,h){
    for(let i=1;i<p.length;i++){yield* banded(p[i-1],p[i],y+15,h-15,7,Math.max(2,Math.round(Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1])/1.75)),'#54666a');}
  },[],15);
  building('Sun City · volum superior','w1396207390',40,'#546e77',function*(p,y,h){for(let i=1;i<p.length;i++)yield* banded(p[i-1],p[i],y+35,h-35,2,Math.max(2,Math.round(Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1])/1.7)),'#586d70');},[],35);
  // The mapped rectangle crosses the road: it is an elevated enclosed bridge.
  job('pasarela Sun City',feature('w1123839946').p,[1123839946],function*(){const y=ground(181,-310.15),p=feature('w1123839946').p;solid(p,.36,y+5.55,'#555e58');solid(p,.19,y+8.65,'#68706a');
    for(const z of[-313.96,-306.38])box(181.27,y+7.23,z,36.38,2.76,.07,'#486661',false,true);
    for(const z of[-313.96,-306.38]){const f=facade(z<-310?[199.46,z]:[163.08,z],z<-310?[163.08,z]:[199.46,z],y);f.panel(f.len/2,7.22,.06,f.len,2.64,.035,'#486661',false,1);for(let u=0;u<f.len;u+=1.38)f.panel(u,7.21,.11,.07,2.7,.10,C.iron,true);}
    for(const x of[164.2,191.1])box(x,y+2.80,-310.15,.55,5.6,.55,C.iron,false,true);yield;
    const base=ground(160.6,-291.34)+.13,rise=Math.max(.8,y+5.74-base),count=Math.ceil(rise/.17),run=18.84;
    for(let i=0;i<count;i++){const top=base+rise*(i+1)/count;box(161.15,(base-.2+top)/2,-291.34-(i+.5)*run/count,2.7,top-base+.2,run/count+.01,C.base,false,true);}yield;
  });
  building('Pușkin 30 · piatră și intrări','w51812373',11.9,C.stone,function*(p,y,h){const f=facade([183.06,-214.97],[184.57,-160.28],y);
    for(let row=0;row<3;row++){for(let i=0;i<15;i++){const u=(i+.5)*f.len/15;f.window(u,2.0+row*3.7,1.42,2.3,C.trim,'#a6aea1');}f.panel(f.len/2,3.48+row*3.7,.29,f.len,.19,.40,C.trim);yield;}
    for(let u=0;u<f.len;u+=7.3){f.panel(u,7.3,.43,.55,7.9,.45,C.trim,true);yield;}
    f.panel(11,3.86,.50,9,.44,.40,'#c6c2ac');f.panel(11,4.08,.52,9,.08,.44,'#884a49');f.label('ORIENT',11,3.70,.38,'#44625a',.75);
    f.panel(14.8,4.8,.57,.82,.30,.18,'#4e865b');f.panel(14.8,4.8,.58,.29,.84,.19,'#4e865b');
    const door=f.at(11,-.05);entrance(door[0]-.50,door[1],3.5,1.24,8);yield;
    // Adjacent recessed basement entrance with its own return wall/canopy.
    const entry=f.at(18,.55);box(entry[0],ground(...entry)+.50,entry[1],.20,.9,1.65,'#354a45');box(entry[0]-.48,ground(...entry)+.12,entry[1],1.12,.24,1.9,C.base,false,true);box(entry[0]-.45,ground(...entry)+1.25,entry[1],1.35,.13,2.05,'#854a46');
  });
  building('Pușkin 28 · fațadă','w51812371',11.4,'#b4b1a0',function*(p,y,h){const f=facade([184.96,-143.71],[186.19,-91.89],y);for(let row=0;row<3;row++){for(let i=0;i<14;i++)f.window((i+.5)*f.len/14,1.85+row*3.5,1.48,2.25);f.panel(f.len/2,3.32+row*3.5,.25,f.len,.18,.38,C.trim);yield;}});
  building('Gemeni · colțul bulevardului','w991056896',10.5,'#b4b09b',function*(p,y,h){
    solid(rect(195.8,-28.8,17.8,21.0),20.2,y,'#b4b09b');yield;
    const west=facade([185.78,-79.04],[186.6,-18.27],y);for(let row=0;row<3;row++){for(let i=0;i<17;i++)west.window((i+.5)*west.len/17,1.65+row*3.3,1.40,2.10);yield;}
    for(let row=3;row<6;row++){for(let i=0;i<5;i++)west.window(west.len-18+(i+.5)*3.4,1.65+row*3.3,1.65,2.05);yield;}
    const south=facade([186.6,-18.27],[243.6,-18.27],y);for(let i=0;i<17;i++){const u=(i+.5)*south.len/17;south.window(u,1.65,1.7,2.7);if(i>=6){south.window(u,6.18,1.8,4.1);const a=south.at(u,.42),g=new T.TorusGeometry(.91,.085,4,12,Math.PI);g.scale(1,.9,1);g.translate(a[0],y+8.30,a[1]);put(g,C.trim,true);}}
    for(let row=1;row<6;row++)for(let i=0;i<5;i++)south.window((i+.5)*3.4,1.65+row*3.3,1.65,2.05);yield;
    south.panel(8.7,19.9,.39,18.2,.39,.65,C.trim);for(let i=0;i<16;i++)south.panel((i+.5)*1.08,20.58,.34,.45,.87,.42,C.trim,true);south.panel(8.7,21.05,.34,18,.18,.57,C.trim);
    south.panel(11.4,3.23,.44,7.9,.57,.14,'#454b44');south.label('GEMENI',11.4,3.05,.45,'#cdc6b0',.54);for(const u of[9.5,13.3])south.window(u,1.4,3.0,2.75,'#ab9560','#ab9560');yield;
  });
  function* bankFacade(a:XY,b:XY,y:number,h:number){const f=facade(a,b,y),bays=Math.max(3,Math.round(f.len/4.65));
    for(let row=0;row<3;row++){for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;f.window(u,2.15+row*4.0,1.85,row?2.9:3.3,C.trim,'#514640');if(i%4===3)yield;}yield;}
    // Rusticated base; pilasters with leaf-like capitals and medallion frieze.
    for(let h=.45;h<3.8;h+=.47)f.panel(f.len/2,h,.22,f.len,.045,.07,'#929487',true);
    for(let i=0;i<=bays;i++){const u=i*f.len/bays;f.panel(u,8.0,.43,.52,7.7,.39,C.trim);f.panel(u,11.55,.47,.82,.23,.54,C.trim);for(const side of[-1,1]){const p=f.at(u+side*.20,.63),g=new T.SphereGeometry(.19,7,5);g.scale(1,1.5,.32);g.translate(p[0],y+11.32,p[1]);put(g,'#b9bbac',true);}if(i%4===0)yield;}
    for(const [yy,hh,dd]of[[12.25,.24,.55],[12.62,.34,.70],[13.07,.20,.93]])f.panel(f.len/2,yy,.37,f.len+.3,hh,dd,C.trim);
    for(let u=1;u<f.len;u+=1.1)f.panel(u,12.91,.54,.17,.19,.31,C.trim,true);
    for(let i=0;i<bays;i++){const p=f.at((i+.5)*f.len/bays,.65),g=new T.CylinderGeometry(.19,.19,.07,12);g.rotateX(Math.PI/2);g.rotateY(-Math.PI/2);g.translate(p[0],y+12.01,p[1]);put(g,C.trim,true);}yield;
    for(const u of[f.len*.19,f.len*.71]){const p=f.at(u,-.08);entrance(p[0]-.35,p[1],3.7,.60,4,'#77776c');}
    f.panel(f.len/2,13.95,.24,f.len,1.55,.37,C.stone);for(let u=0;u<f.len;u+=9.3)f.panel(u,14.10,.36,.68,1.82,.65,C.trim);
  }
  building('Pușkin 26 · corp istoric','w51812370',14.9,C.stone,function*(p,y,h){yield* bankFacade([186.43,45.09],[188.44,109.78],y,h);});
  building('Pușkin 26 · colț','w96427772',20.1,C.stone,function*(p,y,h){yield* bankFacade([185.87,24.65],[186.43,45.09],y,h);const f=facade([185.87,24.65],[186.43,45.09],y);for(let row=0;row<2;row++){for(let i=0;i<5;i++)f.window((i+.5)*f.len/5,15.6+row*2.9,1.8,2.1);yield;}});
  building('Pușkin 24 · frontul spre Veronica Micle','w51812372',14.5,'#aaa89a',function*(p,y,h){const f=facade([188.44,109.78],[188.27,159.42],y);for(let row=0;row<4;row++){for(let i=0;i<13;i++)f.window((i+.5)*f.len/13,1.7+row*3.3,1.68,2.05);f.panel(f.len/2,3.12+row*3.3,.22,f.len,.17,.3,C.trim);yield;}});
  building('Casa Presei · 22','w46331616',21.3,C.aggregate,function*(p,y,h){
    const west=p.filter(q=>q[0]<198),z0=Math.min(...p.map(q=>q[1])),z1=Math.max(...p.map(q=>q[1]));
    const f=facade([191.97,180.08],[192.7,296.97],y),bays=34;
    for(let row=0;row<6;row++){const yy=1.85+row*3.4;f.panel(f.len/2,yy+1.37,.22,f.len,.82,.46,C.aggregate);for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;f.panel(u,yy,.32,f.len/bays-.28,2.46,.03,'#667b7d',false,1);for(const dx of[-1.28,-.43,.43,1.28])f.panel(u+dx,yy,.37,.044,2.46,.07,'#bdc6ba',true);f.panel(u,yy+.5,.38,3.15,.055,.08,'#b8c4ba',true);f.panel(u+1.53,yy,.39,.24,2.49,.1,'#897064');if(i%4===3)yield;}yield;}
    for(let i=0;i<20;i++){const u=(i+.5)*f.len/20;f.panel(u,3.10,.5,f.len/20-.12,.70,.14,['#555e54','#8e4c43','#846e52','#bbb8a8'][i%4]);const p=f.at(u,-.03);entrance(p[0]-.35,p[1],4.5,.30,2,'#8b8073');if(i%3===0)yield;}
    f.label('CASA PRESEI',f.len-18,3.06,.56,'#d5d5c5',.6);yield;
    yield* banded([195.43,296.85],[195.51,309.59],y,h,6,4,C.aggregate);
    const south=facade([195.51,z1],[225.85,z1],y);for(let row=0;row<6;row++){for(let i=0;i<9;i++)south.window((i+.5)*south.len/9,1.85+row*3.4,2.6,2.3,'#a8b1a4');yield;}
    // Actual open concrete screen: staggered rectangular links, not a solid decal.
    for(let row=0;row<23;row++){const yy=4.3+row*.70;for(let col=0;col<5;col++){const u=1.0+col*1.50+(row%2)*.75;south.panel(u,yy,.70,1.42,.14,.22,'#c5c8b9',true);south.panel(u-.64,yy+.30,.70,.14,.66,.22,'#c5c8b9',true);}if(row%3===0)yield;}
  });
  for(const cell of realm.cells)job(`trotuar ${cell.x}/${cell.z}`,rect(cell.x,cell.z,28,28),[],function*(){for(const patch of cell.patches){yield* surfaceStaged(patch[0] as XY[],(x,z)=>ground(x,z)+.14,'#989d94',true,patch.slice(1) as XY[][]);yield;}});
  // Trees keep their exact native locations; stone benches alternate in the clear bays.
  for(let z=185;z<310;z+=16)job(`mobilier Casa Presei ${z}`,rect(186.4,z,4,7),[],function*(){const x=186.4,y=ground(x,z)+.14;for(const dz of[-.72,.72])box(x,y+.25,z+dz,.50,.5,.40,'#b5b9aa',true);for(let i=0;i<5;i++)box(x-.28+i*.14,y+.52,z,.115,.07,1.94,'#bcb8a1',true);yield;});
  const trees=CITY_DATA.points.filter(p=>p.t.natural==='tree'&&p.p[0]>164&&p.p[0]<199&&p.p[1]>-335&&p.p[1]<314);
  for(const p of trees){const [x,z]=p.p;job(`copac ${p.id}`,rect(x,z,2,2),[],function*(){const y=ground(x,z),g=new T.CylinderGeometry(.22,.27,1.14,7);g.translate(x,y+.57,z);put(g,'#b3b4a4',true);for(const side of[-1,1])box(x+side*.77,y+.11,z,.12,.22,1.64,'#a2a69b',true);yield;});}
  for(const z of[31,70,150,206,277])job(`lampadar ${z}`,rect(169,z,2,2),[],function*(){const x=z<170?169:170,y=ground(x,z);beam(new T.Vector3(x,y,z),new T.Vector3(x,y+7.7,z),.065,'#7c8780');beam(new T.Vector3(x,y+7.7,z),new T.Vector3(x+2,y+8,z),.045,'#7c8780');box(x+2,y+8,z,.8,.12,.27,'#bcc2b6',true);yield;});
  return Object.assign(mesh,{treeOverrides:trees.map((p,i)=>({x:p.p[0],z:p.p[1],radius:.65,height:Number(p.t.height)||13.5+(i%5)*.7,texture:[0,2,3,4][i%4]}))});
}
