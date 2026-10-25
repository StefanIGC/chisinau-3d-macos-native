import {groundPartition,groundShape,groundCoverage} from './ground-partition';
import * as T from 'three';
import {canBuildScene,sceneBuildDeadline,sceneBuildFocus,sceneBuildStages} from './scene-build-budget';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITY_DATA,feature,centroid,type XY} from './city-layout';
import {prepareLandmarkCollision} from './landmark-collision';
import {lettering} from './street-mesh';

// Columna, Pușkin → Bodoni only. Photographic evidence and uncertain details:
// docs/columna-references.md. Coordinates are the existing local metre grid.
export const COLUMNA={west:-130.1,east:173,stairs:{x:23.58,start:-335.15,end:-328.67,width:8.2,count:8}};
type Job={root:T.Group;collision:T.Group;points:XY[];run:()=>Generator<void>;iterator?:Generator<void>;done:boolean;ids:number[]};
type Part={g:T.BufferGeometry;fine:boolean;kind:number};
const C={cream:'#c6bda5',trim:'#d0c9b9',yellow:'#cbbc91',brick:'#946447',base:'#777970',pink:'#b3a399',roof:'#66584d',slate:'#48515a',glass:'#425a60',frame:'#4f4940',iron:'#3b4441',paver:'#aaa99b',band:'#656b69',wall:'#85877b',soil:'#68624b',green:'#566e3b'};
const rect=(x:number,z:number,w:number,d:number):XY[]=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2],[x-w/2,z-d/2]];
const noise=(a:number)=>{const n=Math.sin(a*12.9898)*43758.5453;return n-Math.floor(n);};

/** Deferred, fixed-world architecture; nothing is parented to the moving camera. */
export function createColumnaDistrict(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  const matte=new T.MeshStandardMaterial({name:'Columna · piatră și tencuială',vertexColors:true,roughness:.91});
  const glass=new T.MeshStandardMaterial({name:'Columna · geamuri',vertexColors:true,roughness:.36,metalness:.12});
  const paving=new T.MeshStandardMaterial({name:'Columna · pavaj',vertexColors:true,roughness:.96});
  // World-space paver joints, with no image downloads or hundreds of tile meshes.
  paving.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 pavingPosition;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npavingPosition = position;');
    s.fragmentShader='varying vec3 pavingPosition;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 q = pavingPosition.xz / vec2(.24,.12);
      q.x += mod(floor(q.y),2.)*.5;
      vec2 f=fract(q), aa=fwidth(q);
      vec2 seam=smoothstep(vec2(.026)-aa,vec2(.026)+aa,min(f,1.-f));
      float variation=fract(sin(dot(floor(q),vec2(12.9898,78.233)))*43758.5453);
      diffuseColor.rgb *= (.94+variation*.09)*mix(.69,1.,min(seam.x,seam.y));`);
  };
  const slabs=paving.clone();slabs.name='Columna · dalele aleii';
  slabs.onBeforeCompile=(s,r)=>{paving.onBeforeCompile(s,r);s.fragmentShader=s.fragmentShader.replace('vec2(.24,.12)','vec2(.6,.6)').replace('mod(floor(q.y),2.)*.5','0.');};
  slabs.customProgramCacheKey=()=> 'columna-square-slabs';
  const collisionMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  const materials=[matte,glass,paving,slabs],collisionObjects:T.Group[]=[],objects:T.Group[]=[],jobs:Job[]=[],visuals:{mesh:T.Mesh;root:T.Group;fine:boolean}[]=[];
  const replacements:{id:number;x:number;z:number;radius:number;ready:boolean}[]=[];
  let target:T.Group,physical:T.Group,parts:Part[]=[];
  const colors=new Map<string,T.Color>(),unitBox=new T.BoxGeometry(1,1,1).toNonIndexed();unitBox.deleteAttribute('uv');
  function put(g:T.BufferGeometry,color:string,fine=false,kind=0,collide=false){
    if(collide)physical.add(new T.Mesh(g.clone(),collisionMaterial));
    const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();flat.deleteAttribute('uv');
    let c=colors.get(color);if(!c){c=new T.Color(color);colors.set(color,c);}
    const values=new Float32Array(flat.attributes.position.count*3);for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}
    flat.setAttribute('color',new T.BufferAttribute(values,3));parts.push({g:flat,fine,kind});
  }
  function* flush(){
    for(const fine of[false,true])for(let kind=0;kind<materials.length;kind++){
      const selected=parts.filter(p=>p.fine===fine&&p.kind===kind);if(!selected.length)continue;
      const g=mergeGeometries(selected.map(p=>p.g))!;selected.forEach(p=>p.g.dispose());g.computeBoundingSphere();g.computeBoundingBox();
      const mesh=new T.Mesh(g,materials[kind]);mesh.name=`${target.name} · ${fine?'ornamente':'volum'}`;mesh.receiveShadow=true;target.add(mesh);visuals.push({mesh,root:target,fine});
      yield;
    }
    parts=[];
    physical.updateMatrixWorld(true);yield* prepareLandmarkCollision(physical);target.userData.groundRings=groundRings;groundRings=[];
  }
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,fine=false,collide=false,angle=0,kind=0){const g=unitBox.clone();g.scale(w,h,d);g.rotateY(angle);g.translate(x,y,z);put(g,color,fine,kind,collide);}
  function line(a:T.Vector3,b:T.Vector3,r:number,color:string,fine=true){const delta=b.clone().sub(a),g=new T.CylinderGeometry(r,r,delta.length(),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);put(g,color,fine);}
  function shape(p:XY[]){const s=new T.Shape();p.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s;}
  function solid(p:XY[],h:number,y:number,color:string,collide=true){const g=new T.ExtrudeGeometry(shape(p),{depth:h,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);g.translate(0,y,0);put(g,color,false,0,collide);}
  function edge(a:XY,b:XY,y:number,w:number,h:number,color:string,fine=false,collide=false){const dx=b[0]-a[0],dz=b[1]-a[1];box((a[0]+b[0])/2,y,(a[1]+b[1])/2,Math.hypot(dx,dz),h,w,color,fine,collide,Math.atan2(-dz,dx));}
  function ribbon(p:XY[],y:number,w:number,h:number,color:string,fine=false){for(let i=1;i<p.length;i++)edge(p[i-1],p[i],y,w,h,color,fine);}
  function roof(x:number,z:number,w:number,d:number,y:number,rise:number,color=C.roof){
    const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],r1=[x-w/2+d*.4,y+rise,z],r2=[x+w/2-d*.4,y+rise,z];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...a,...r1,...b,...b,...r1,...r2,...b,...r2,...c,...c,...r2,...e,...e,...r2,...r1,...e,...r1,...a],3));g.computeVertexNormals();put(g,color,false,0,true);
  }
  function facade(a:XY,b:XY){
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,angle=Math.atan2(-dz,dx);
    const at=(u:number,v=0)=>[a[0]+u*ux-v*uz,a[1]+u*uz+v*ux] as XY;
    const panel=(u:number,y:number,v:number,w:number,h:number,d:number,color:string,fine=false,kind=0)=>{const p=at(u,v);if(kind===1){const g=new T.PlaneGeometry(w,h);g.rotateY(angle);g.translate(p[0],y,p[1]);put(g,color,fine,kind);}else box(p[0],y,p[1],w,h,d,color,fine,false,angle,kind);};
    function modernWindow(u:number,y:number,w:number,h:number){
      const p=at(u,.19),g=new T.PlaneGeometry(w+.23,h+.22);g.rotateY(angle);g.translate(p[0],y,p[1]);put(g,C.trim);
      panel(u,y,.31,w,h,.01,C.glass,false,1);panel(u,y,.35,.052,h,.05,C.frame,true);
    }
    function arch(u:number,y:number,r:number,color=C.trim){
      const curve=new T.EllipseCurve(0,0,r,r*.72,0,Math.PI,false,0),p=curve.getPoints(10);
      for(let i=1;i<p.length;i++){const aa=at(u+p[i-1].x,.44),bb=at(u+p[i].x,.44);line(new T.Vector3(aa[0],y+p[i-1].y,aa[1]),new T.Vector3(bb[0],y+p[i].y,bb[1]),.085,color,true);}
    }
    function pediment(u:number,y:number,w:number,h:number){
      const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();const g=new T.ShapeGeometry(s);g.rotateY(angle);const p=at(u,.28);g.translate(p[0],y,p[1]);put(g,C.yellow);
    }
    function window(u:number,y:number,w:number,h:number,arched=false,bars=false){
      panel(u,y,.29,w,h,.07,C.glass,false,1);
      for(const s of[-1,1])panel(u+s*(w/2+.085),y,.34,.14,h+.25,.22,C.trim,true);
      panel(u,y-h/2-.1,.43,w+.42,.17,.4,C.trim,true);panel(u,y+h/2+.10,.37,w+.36,.16,.27,C.trim,true);
      panel(u,y,.39,.055,h,.04,C.frame,true);panel(u,y+h*.22,.40,w,.055,.04,C.frame,true);
      if(arched)arch(u,y+h/2+.16,w*.61);
      if(bars){for(let t=-w/2+.1;t<w/2;t+=.22)panel(u+t,y,.52,.025,h,.028,C.iron,true);for(const s of[-.3,.3])panel(u,y+s*h,.53,w,.028,.03,C.iron,true);}
    }
    return{len,at,panel,window,modernWindow,arch,pediment};
  }
  function balcony(f:ReturnType<typeof facade>,u:number,y:number,w:number,stone=true){
    f.panel(u,y,1.00,w,.3,2.05,C.base);f.panel(u,y+1.08,1.89,w,.15,.2,stone?C.trim:C.iron,true);
    for(let k=-w/2;k<=w/2;k+=stone?.38:.26)f.panel(u+k,y+.59,1.88,stone?.13:.032,.96,.13,stone?C.trim:C.iron,true);
    for(const s of[-1,1])f.panel(u+s*w/2,y+.58,1.02,.16,1.16,1.9,stone?C.trim:C.iron,true);
  }
  function addJob(name:string,points:XY[],ids:number[],run:()=>Generator<void>){
    const root=new T.Group(),collision=new T.Group();root.name=`Columna · ${name}`;root.visible=false;collision.name=root.name+' · coliziune';scene.add(root);objects.push(root);collisionObjects.push(collision);
    jobs.push({root,collision,points,ids,run,done:false});const [x,z]=centroid(points);for(const id of ids)replacements.push({id,x,z,radius:0,ready:false});return root;
  }
  function building(name:string,id:string,extraIds:number[],height:number,color:string,details:(p:XY[],y:number)=>Generator<void>){
    const p=feature(id).p;
    const root=addJob(name,p,[Number(id.slice(1)),...extraIds],function*(){
      // Anchor once to real terrain; thick foundations absorb courtyard slopes.
      const front=p.reduce((a,b)=>a[1]>b[1]?a:b);target.position.y=physical.position.y=ground(...front);
      solid(p,height+5,-5,color);ribbon(p,.5,.25,1,C.base);ribbon(p,height-.25,.42,.28,C.trim);solid(p,.14,height,C.slate);
      yield;yield* details(p,height);
    });return root;
  }

  building('Vila Nazarov · 110','w51769230',[],7.9,C.brick,function*(p,h){
    const f=facade([-121.09,-354.93],[-89.99,-355.27]);
    for(let i=0;i<12;i++){const u=(i+.5)*f.len/12;if(i===6){f.panel(u,3.15,.3,2.8,4.6,.12,C.frame);f.arch(u,5.45,1.55);continue;}f.window(u,4.25,1.36,3.25,true);f.panel(u,1,.33,1.1,.55,.08,C.frame,true);}
    for(let i=0;i<=12;i++){f.panel(i*f.len/12,4.75,.39,.52,5.2,.46,C.trim);for(let y=2;y<7.4;y+=.55)f.panel(i*f.len/12,y,.64,.58,.04,.04,C.base,true);}
    f.panel(f.len/2,7.65,.28,f.len+.55,.52,.64,C.trim);const portal=f.len*6.5/12;f.panel(portal,8.6,.06,3.7,1.9,.6,C.base);for(let i=-1;i<=1;i++)f.panel(portal+i*.68,8.6,.41,.35,.67,.1,C.frame,true);
    yield;
    const side=facade([-121.19,-367.93],[-121.09,-354.93]);for(let i=0;i<4;i++)side.window((i+.5)*side.len/4,4.25,1.35,3.25,true);
    roof(-105.6,-361.7,32.1,14.4,h,1.7,'#75594a');
  });
  building('Casa joasă lângă Nazarov','w51769229',[],5.3,C.pink,function*(p,h){
    const f=facade([-82.04,-357.68],[-57.96,-357.68]);for(let i=0;i<7;i++){f.window((i+.5)*f.len/7,2.85,1.45,2.75,false,i!==1);f.panel(i*f.len/7,2.9,.3,.25,4.1,.28,C.trim,true);}yield;
    roof(-70,-364.15,25.1,14.6,h,1.7,'#766060');
  });
  building('Corpul Catargi · 106B','w51769228',[],9.3,'#bdb6a3',function*(p,h){
    const f=facade([-58.01,-354.27],[-36.15,-354.2]);for(let floor=0;floor<2;floor++){for(let i=0;i<7;i++)f.window((i+.5)*f.len/7,2.2+floor*3.65,1.25,2.15,false,floor===0);f.panel(f.len/2,4.08+floor*3.7,.3,f.len,.19,.3,C.trim);yield;}
    roof(-47.1,-361.3,22.8,14.5,8.1,3.0,C.slate);for(let i=0;i<5;i++){const u=(i+.5)*f.len/5;f.panel(u,9.05,-.3,2,1.85,1.1,C.pink);f.window(u,9.05,1.15,1.25);}yield;
  });
  building('Conacul Catargi · 106A','w51769227',[386325108],10.65,C.yellow,function*(p,h){
    const f=facade([-20.89,-354.43],[13.19,-354.94]);
    for(let row=0;row<2;row++){for(let i=0;i<9;i++)f.window((i+.5)*f.len/9,row?7.1:2.0,row?1.58:1.5,row?3.55:2.45,row===1&&(i===0||i===4||i===8),row===0);yield;}
    for(const u of[0,f.len/3,f.len*2/3,f.len]){f.panel(u,5.25,.42,.67,10.5,.64,C.trim);f.panel(u,10.8,.46,1.15,.34,.85,C.trim);f.panel(u,11.45,.43,.73,1.08,.67,C.yellow);const q=f.at(u,.43),g=new T.SphereGeometry(.29,8,6);g.scale(1,1.45,1);g.translate(q[0],12.10,q[1]);put(g,C.trim,true);}
    for(const y of[.6,3.73,4.15,9.55,10.17])f.panel(f.len/2,y,.39,f.len+.4,.22,.58,C.trim);
    balcony(f,f.len/2,4.04,10.8,true);
    // Open balustrade silhouette, corner pedestals and the photographed central pediment.
    for(const sign of[-1,1]){const mid=f.len/2+sign*11.9;f.panel(mid,11.53,.12,8.15,.17,.4,C.trim);for(let u=mid-3.9;u<mid+4;u+=.53)f.panel(u,11.03,.12,.15,.85,.24,C.trim,true);}
    const m=f.len/2;f.pediment(m,10.2,11.8,2.05);for(const sign of[-1,1]){const a=f.at(m, .52),b=f.at(m+sign*5.9,.52);line(new T.Vector3(a[0],12.25,a[1]),new T.Vector3(b[0],10.2,b[1]),.15,C.trim,false);}
    f.panel(m,12.30,.1,2.4,1.6,.48,C.yellow);f.arch(m,13.04,1.25);f.arch(m-2.1,11.65,1);f.arch(m+2.1,11.65,1);yield;
    const side=facade([13.19,-354.94],[12.9,-374.2]);for(let row=0;row<2;row++)for(let i=0;i<5;i++)side.window((i+.5)*side.len/5,row?7.1:2,row?1.58:1.5,row?3.55:2.45,row===1,row===0);
  });
  building('Colț Eugen Doga · 104','w51769218',[],19.2,'#a7a698',function*(p,h){
    // Upper rear wing is retained; ground-floor restaurants are a separate frontage.
    const f=facade([36.34,-354.85],[71.33,-354.65]);
    for(let floor=0;floor<5;floor++){for(let i=0;i<10;i++)f.window((i+.5)*f.len/10,1.8+floor*3.18,1.9,2.0,false,false);f.panel(f.len/2,3.15+floor*3.18,.24,f.len,.19,.28,C.trim);yield;}
    // Restrained dark roof avoids claiming an intact post-2025 restaurant roof.
    f.panel(f.len/2,3.05,1.0,f.len,.24,2.2,C.frame);for(let i=0;i<9;i++)f.panel((i+.5)*f.len/9,1.45,.55,3,2.8,.14,C.glass,false,1);
    const side=facade([36.7,-414.8],[36.34,-354.85]);for(let floor=0;floor<6;floor++){for(let i=0;i<16;i++)side.window((i+.5)*side.len/16,1.8+floor*3.0,1.5,1.8);yield;}
  });
  building('Crown Plaza · fațada istorică','w97820693',[],6.35,'#c3b596',function*(p,h){
    const f=facade([78.12,-354.14],[131.91,-353.95]),center=f.len/2;
    solid(rect(105,-359.7,19,11.5),10.9,0,'#c3b596');
    for(let i=0;i<17;i++){const u=(i+.5)*f.len/17;if(i!==8)f.window(u,3.3,1.55,3.2,false,false);f.panel(u-f.len/34,3.3,.31,.42,4.9,.32,C.trim);}
    f.panel(center,5.65,.39,19.5,.32,.68,C.trim);yield;
    for(let i=0;i<9;i++){const u=center+(i-4)*1.95;f.window(u,8,1.18,2.9,true);}
    balcony(f,center,6.05,6.7,false);f.panel(center,2.45,.61,3.9,4.5,.12,C.glass,false,1);
    f.panel(center,10.77,.42,19.7,.5,.86,C.trim);f.arch(center,10.1,2.3);yield;
    roof(87.8,-360.2,20.5,13.2,6.35,2.9,C.slate);roof(122.15,-360.2,20.4,13.2,6.35,2.9,C.slate);
    // Stone rustication on the exposed basement and low side wings.
    for(let y=.3;y<1.4;y+=.27)f.panel(center,y,.38,f.len,.025,.04,C.band,true);
  });
  building('Crown Plaza · turn','w51769219',[],44.9,'#bdbdb0',function*(p,h){
    for(let floor=0;floor<14;floor++){
      for(let i=1;i<p.length;i++){
        const f=facade(p[i-1],p[i]),n=Math.max(1,Math.floor(f.len/2.6)),y=1.85+floor*3.12;
        for(let j=0;j<n;j++)f.modernWindow((j+.5)*f.len/n,y,Math.min(1.72,f.len/n-.5),2.12);
        if(i<=8&&floor>1){f.panel(f.len/2,y-1.19,.88,f.len,.19,1.76,C.band);f.panel(f.len/2,y-.64,1.66,f.len,.89,.1,'#677d82',false,1);}
        yield;
      }
      yield;
    }
    ribbon(p,45.3,.55,.74,C.trim);
  });

  // Terrain-following public realm. Each small cell is built/culled independently.
  let groundRings:number[][][][]=[];
  function surface(p:XY[],color:string,elevation:(x:number,z:number)=>number,kind=0,collide=false){
    const partition=groundPartition(target.name,[p]);if(!partition.length)return;groundRings.push(...partition);
    const source=new T.ShapeGeometry(partition.map(groundShape));source.rotateX(-Math.PI/2);const flat=source.index?source.toNonIndexed():source.clone(),v=flat.attributes.position,vertices:number[]=[];
    function tri(a:XY,b:XY,c:XY,depth=0){
      const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),ca=Math.hypot(a[0]-c[0],a[1]-c[1]);
      if(depth<12&&Math.max(ab,bc,ca)>3){if(ab>=bc&&ab>=ca){const m:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,m,c,depth+1);tri(m,b,c,depth+1);}else if(bc>=ca){const m:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,m,depth+1);tri(a,m,c,depth+1);}else{const m:XY=[(a[0]+c[0])/2,(a[1]+c[1])/2];tri(a,b,m,depth+1);tri(m,b,c,depth+1);}return;}
      for(const [x,z]of[a,b,c])vertices.push(x,elevation(x,z),z);
    }
    for(let i=0;i<v.count;i+=3)tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);
    source.dispose();flat.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();put(g,color,false,kind,collide);
  }
  const roadZ=(x:number)=>x<23.6?-343.4-(x+130.1)*.5/153.7:-343.9-(x-23.6)*2/149.4;
  const treePoints=CITY_DATA.points.filter(p=>p.t.natural==='tree'&&p.p[0]>-123&&p.p[0]<168&&p.p[1]>-354&&p.p[1]<-314);
  const treeOverrides=treePoints.map((p,i)=>({x:p.p[0],z:p.p[1],radius:1.2,height:Number(p.t.height)||14,texture:[0,2,3,4][i%4]}));
  function pavementCell(x0:number,x1:number){addJob(`trotuar ${x0}`,rect((x0+x1)/2,-345,x1-x0,31),[],function*(){
    const north:XY[]=[[x0,-354.0],[x1,-354.0],[x1,roadZ(x1)-5.4],[x0,roadZ(x0)-5.4]];
    surface(north,C.paver,(x,z)=>ground(x,z)+.10,2);
    surface([[x0,roadZ(x0)-7.75],[x1,roadZ(x1)-7.75],[x1,roadZ(x1)-7.28],[x0,roadZ(x0)-7.28]],C.band,(x,z)=>ground(x,z)+.112);
    surface([[x0,roadZ(x0)+5.6],[x1,roadZ(x1)+5.6],[x1,-335.2],[x0,-335.2]],'#93968b',(x,z)=>ground(x,z)+.10,2);
    for(let x=x0;x<x1;x+=2){const xx=Math.min(x+2,x1);for(const side of[-1,1]){const z=roadZ((x+xx)/2)+side*5.45;edge([x,roadZ(x)+side*5.45],[xx,roadZ(xx)+side*5.45],ground((x+xx)/2,z)+.115,.18,.23,C.trim,true);}}
    yield;
    const beds=CITY_DATA.features.filter(f=>f.t.leisure==='garden'&&f.p.every(([x,z])=>x>=x0-25&&x<=x1+25&&z<-348&&z>-354));
    for(const f of beds){const lo=Math.max(x0,Math.min(...f.p.map(p=>p[0]))),hi=Math.min(x1,Math.max(...f.p.map(p=>p[0])));if(hi<=lo)continue;surface(rect((lo+hi)/2,-350.8,hi-lo,2),C.soil,(x,z)=>ground(x,z)+.14);}
    for(const tree of treePoints){const [x,z]=tree.p;if(x<x0||x>=x1||z>-348)continue;const g=new T.CylinderGeometry(.21,.29,1.35,8);g.translate(x,ground(x,z)+.675,z);put(g,'#b8b8a6',true);}
  });}
  for(let x=-123;x<166;x+=24)pavementCell(x,Math.min(x+24,166));

  for(const [a,b]of[[-111.9,11.4],[28.2,156.1]])for(let x=a;x<b;x+=18){const end=Math.min(x+18,b);addJob(`zidul parcului ${x}`,rect((x+end)/2,-332.3,end-x,6),[],function*(){
    // Low rough limestone retaining wall, pale cap, uninterrupted mapped trees.
    for(let xx=x;xx<end;xx+=1.05){const w=Math.min(1.05,end-xx),z=-334.55,y=ground(xx+w/2,z);box(xx+w/2,y+.42,z,w,.72,.44,C.wall,false,true);box(xx+w/2,y+.81,z,w+.02,.12,.62,C.trim);
      for(let row=0;row<3;row++)for(let k=0;k<2;k++){const c=new T.Color(C.wall).multiplyScalar(.85+noise(xx*2+k+row)*.25);box(xx+(k+.5)*w/2,y+.16+row*.23,z-.242,w/2-.026,.2,.035,'#'+c.getHexString(),true);}}
    surface(rect((x+end)/2,-332.5,end-x,3.6),C.soil,(xx,z)=>ground(xx,z)+.1);
    surface(rect((x+end)/2,-328.55,end-x,3.0),C.paver,(xx,z)=>ground(xx,z)+.12,3);
    yield;
    // Pale square paving with the charcoal borders seen on Aleea Pictorilor.
    for(const zz of[-330.0,-327.1])surface(rect((x+end)/2,zz,end-x,.32),C.band,(xx,z)=>ground(xx,z)+.137);
    for(let xx=Math.ceil(x/4.2)*4.2;xx<end;xx+=4.2)surface(rect(xx,-328.55,.26,2.8),C.band,(xx,z)=>ground(xx,z)+.139);

  });}
  const standLocations=[-102,-78,-54,-30,-6,43,68,93,118,143];
  for(const [row,dir]of [[0,1],[1,-1]])for(const x0 of standLocations){
    let x=x0+row*5;const z=row?-325.4:-331.6;
    if(treePoints.some(t=>Math.hypot(t.p[0]-x,t.p[1]-z)<1.55))x+=2.3;
    addJob(`Aleea Pictorilor · ${row}/${x}`,rect(x,z,3.3,3.5),[],function*(){
      const y=ground(x,z)+.1;
      // Three broad, curved concrete slabs per 3 m bay (official tourism photo).
      // Each bends forward overhead and curls out into the attached wooden seat.
      for(let slab=-1;slab<=1;slab++){
        const s=new T.Shape();s.moveTo(-.04,.12);s.lineTo(.14,.12);s.bezierCurveTo(.86,.12,.96,.44,.58,.63);s.lineTo(.14,.71);s.lineTo(.14,2.62);s.bezierCurveTo(.14,2.98,.47,3.19,.81,3.19);s.lineTo(1.6,3.19);s.lineTo(1.6,3.35);s.lineTo(.81,3.35);s.bezierCurveTo(.3,3.35,-.04,3.0,-.04,2.62);s.closePath();
        const g=new T.ExtrudeGeometry(s,{depth:.94,bevelEnabled:false,curveSegments:6});g.rotateY(-dir*Math.PI/2);g.translate(x+slab+dir*.47,y,z);put(g,'#737971');
      }
      for(const yy of[1.2,1.9,2.55])box(x,y+yy,z+dir*.17,3.07,.055,.06,C.iron,true);
      for(let slat=0;slat<5;slat++)box(x,y+.66,z+dir*(.33+slat*.14),3.05,.09,.115,'#886448',true);
      box(x,y+.53,z+dir*1.0,3.05,.12,.09,'#886448',true);
      yield;
    });
  }
  addJob('pavaj Eugen Doga',rect(24,-345,25,15),[],function*(){
    surface([[12,-354],[36,-354],[36,-337],[12,-337]],'#777b72',(x,z)=>ground(x,z)+.11,2);
    yield;
  });
  function stairs(x:number,start:number,end:number,width:number,minimumCount:number,landingLength=4,level?:number){
    const low=ground(x,start< -328&&start> -337?-336.1:start)+.04,high=level??Math.max(ground(x,end)+.12,low+minimumCount*.15),count=Math.max(minimumCount,Math.ceil((high-low)/.17)),step=(end-start)/count,sign=Math.sign(step);
    for(let i=0;i<count;i++){
      const z=start+(i+.5)*step,top=level===undefined?Math.max(low+(high-low)*(i+1)/count,ground(x,z)+.12):low+(high-low)*(i+1)/count,bottom=Math.min(low-.3,ground(x,z)-.3);
      box(x,(bottom+top)/2,z,width,top-bottom,Math.abs(step)+.018,'#94998d',false,true);box(x,top+.008,start+i*step+sign*.065,width,.02,.1,C.trim,true);
    }
    if(landingLength>0)surface(rect(x,end+sign*landingLength/2,width,landingLength+.1),C.paver,(xx,z)=>Math.max(ground(xx,z)+.12,T.MathUtils.lerp(high,ground(xx,end+sign*landingLength)+.12,T.MathUtils.clamp((z-end)*sign/landingLength,0,1))),2,true);
    return{low,high};
  }
  addJob('intrarea Eugen Doga',rect(22,-329,25,23),[],function*(){
    const s=COLUMNA.stairs;
    // A single flat café apron, not the former four-metre return ramp.
    const level=ground(24,-325.4)+.115;
    const {low,high}=stairs(s.x,s.start,s.end,s.width,s.count,0,level);yield;
    surface(rect(24,-325.385,24,6.57),C.paver,()=>high,3,true);
    // Adjacent dog-leg access follows OSM w1489630866, not a fictitious straight ramp.
    const route=feature('w1489630866').p.slice().reverse(),total=route.slice(1).reduce((v,p,i)=>v+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0);let done=0;
    for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*.73,nz=dx/len*.73,begin=done;surface([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]],C.paver,(x,z)=>Math.max(ground(x,z)+.12,low+(high-low)*(begin+T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/len,0,len))/total),2,true);done+=len;}
    // The café apron and all of the upper landing share the park terrace.
    surface(rect(24,-310.55,24,23.1),C.paver,()=>high,3,true);
    // Low retaining cheeks join the existing wall; no floating slab edges.
    for(const x of[12,36]){const base=ground(x,-325.3)-.2;box(x,(base+high)/2,-325.3,.35,high-base,6.7,C.wall,false,true);}
    yield;
    // Waze listing point 47.0267455,28.8354135; dimensions from exterior photos.
    const cx=18.39,cz=-324.44,y=high,green='#216451',cream='#c6b27c',wood='#ab8851';
    box(cx,y+1.36,cz,3.25,2.72,2.72,green,false,true);
    box(cx,y+2.70,cz,3.62,.22,3.08,cream);box(cx,y+2.94,cz,3.8,.16,3.24,green);
    box(cx,y+2.82,cz-1.555,3.20,.25,.04,cream);
    const sign=lettering('BONJOUR CAFÉ',.245);sign.rotateY(Math.PI);sign.translate(cx,y+2.738,cz-1.581);put(sign,'#856137',true);
    // Front faces Columna (-Z), serving opening, warm wood panels, louvres.
    box(cx,y+.69,cz-1.40,2.65,1.15,.13,wood);box(cx,y+1.78,cz-1.402,2.63,1.09,.035,C.glass,false,false,0,1);
    for(const xx of[-1.22,0,1.22])box(cx+xx,y+1.78,cz-1.44,.06,1.16,.10,cream,true);
    for(const yy of[1.25,1.78,2.34])box(cx,y+yy,cz-1.45,2.68,.06,.14,cream,true);
    box(cx,y+1.25,cz-1.57,2.8,.08,.41,wood);
    for(let i=0;i<3;i++)box(cx+(i-1)*.87,y+.7,cz-1.475,.75,.82,.04,cream,true);
    for(const sx of[-1,1]){box(cx+sx*1.53,y+1.4,cz-1.43,.24,2.55,.14,green);for(let i=0;i<23;i++)box(cx+sx*1.644,y+.25+i*.101,cz,.04,.044,2.50,green,true);}
    for(const x of[cx-1.7,cx+1.7]){box(x,y+1.35,cz-1.64,.28,2.44,.07,C.frame);for(let i=0;i<8;i++)box(x,y+1.88-i*.16,cz-1.686,.19,.018,.008,cream,true);}
    for(const x of[cx-1.42,cx+1.42]){box(x,y+3.03,cz,.50,.18,2.3,wood);for(let k=0;k<8;k++){const g=new T.SphereGeometry(.14,6,4);g.translate(x,y+3.16,cz-.95+k*.27);put(g,k%3?'#63794e':'#b3a48a',true);}}
    yield;
    for(const [tx,tz]of[[27,-325.6],[32.6,-323.7],[14.6,-324.3],[28,-316.4],[33,-317]]){
      const ty=high;box(tx,ty+.73,tz,.85,.065,.7,wood,true);for(const dx of[-.29,.29])for(const dz of[-.24,.24])box(tx+dx,ty+.36,tz+dz,.035,.72,.035,C.iron,true);
      for(const dx of[-.90,.90]){box(tx+dx,ty+.45,tz,.40,.055,.4,'#486e78',true);for(const dz of[-.16,.16])box(tx+dx,ty+.23,tz+dz,.035,.46,.035,wood,true);box(tx+dx*1.14,ty+.72,tz,.035,.52,.40,wood,true);}
    }
    // Low stone cheeks outside the clear walking width.
    for(const side of[-1,1]){const x=s.x+side*(s.width/2+.25);for(let i=0;i<8;i++){const z=s.start+(i+.5)*(s.end-s.start)/8,y=low+(high-low)*(i+1)/8;box(x,y-.05,z,.36,.4,(s.end-s.start)/8+.02,C.wall,false,true);}}
  });
  for(const x of[-115.8,160.9])addJob(`intrarea de colț ${x}`,rect(x,-332,9,13),[],function*(){const {low,high}=stairs(x,-335.8,-329.1,5.1,8,4,ground(x,-325.4)+.115);yield;
    if(x<0){const rx=x+3.22;surface(rect(rx,-332.45,1.15,6.7),C.paver,(xx,z)=>Math.max(ground(xx,z)+.1,T.MathUtils.lerp(low,high,T.MathUtils.clamp((z+335.8)/6.7,0,1))),2,true);
      surface(rect(rx,-327.1,1.5,4.1),C.paver,(xx,z)=>Math.max(ground(xx,z)+.12,T.MathUtils.lerp(high,ground(xx,-325.1)+.12,T.MathUtils.clamp((z+329.1)/4,0,1))),2,true);}
  });
  for(const [x,start,end,width,count]of[[105,-351.25,-353.50,4.6,6],[-104.24,-352.0,-354.65,2.8,8],[47,-351.65,-354.25,8,8]])addJob(`treptele clădirii ${x}`,rect(x,(start+end)/2,width,4),[],function*(){stairs(x,start,end,width,count,.4);yield;});
  for(const x of[-115.9,167.4])addJob(`trecere pietonală ${x}`,rect(x,roadZ(x),5,12),[],function*(){
    for(let i=-5;i<=5;i++){const z=roadZ(x)+i*.92;surface(rect(x,z,3.8,.43),'#c6c5b5',(xx,zz)=>ground(xx,zz)+.115);}
    yield;
  });
  addJob('semisfere Eugen Doga',rect(23,-351,24,8),[],function*(){
    for(const x of[14,18,22,26,30,34]){const z=-350.65,y=ground(x,z);const g=new T.SphereGeometry(.34,10,5,0,Math.PI*2,0,Math.PI/2);g.translate(x,y+.11,z);put(g,'#9d9b88',true,0,true);}
    yield;
  });

  addJob('portalul curții Catargi',rect(-29.5,-355,12,2),[],function*(){
    const y=ground(-29.5,-355);for(const x of[-34.0,-25.0]){box(x,y+2.6,-355,1.05,5.2,1.3,C.cream,false,true);box(x,y+5.25,-355,1.4,.3,1.5,C.trim);}
    box(-29.5,y+5.7,-355,9.4,1.0,1.1,C.cream,false,true);box(-29.5,y+6.25,-355,10.1,.24,1.45,C.trim);yield;
  });
  const frustum=new T.Frustum(),matrix=new T.Matrix4(),sphere=new T.Sphere();let active:Job|undefined;
  return{objects,collisionObjects,replacements,treeOverrides,
    get ready(){return jobs.every(j=>j.done);},
    readyNear(x:number,z:number,r=420){return jobs.every(j=>{const [cx,cz]=centroid(j.points);return Math.hypot(x-cx,z-cz)>r||j.done;});},
    update(camera:T.PerspectiveCamera,_now:number){
      const focus=sceneBuildFocus(camera);
      if(!active){let best=520;for(const job of jobs){if(job.done)continue;const [x,z]=centroid(job.points),d=Math.hypot(focus.x-x,focus.z-z);if(d<best&&job.points.every(p=>loaded(...p))){best=d;active=job;}}
        if(active){target=active.root;physical=active.collision;const selected=active;active.iterator=(function*(){yield* selected.run();yield* flush();})();}}
      if(active&&canBuildScene()){target=active.root;physical=active.collision;const deadline=sceneBuildDeadline(1.4);let n=0;
        do{const result=active.iterator!.next();n++;if(result.done){active.done=true;active.root.visible=true;active.root.updateMatrixWorld(true);physical.userData.grounded=true;physical.userData.revision=1;physical.updateMatrixWorld(true);for(const r of replacements)if(active.ids.includes(r.id))r.ready=true;active=undefined;break;}}while(n<sceneBuildStages(2)&&performance.now()<deadline);
      }
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      for(const v of visuals){sphere.copy(v.mesh.geometry.boundingSphere!).applyMatrix4(v.root.matrixWorld);const distance=camera.position.distanceTo(sphere.center)-sphere.radius;v.mesh.visible=distance<(v.fine?115:camera.far)&&frustum.intersectsSphere(sphere);v.mesh.castShadow=v.mesh.visible&&distance<75;}
    },
    dispose(){unitBox.dispose();for(const root of[...objects,...collisionObjects]){scene.remove(root);root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}parts.forEach(p=>p.g.dispose());[...materials,collisionMaterial].forEach(m=>m.dispose());}
  };
}
