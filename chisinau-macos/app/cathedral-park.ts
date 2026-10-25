import {scrollBench} from './street-furniture';
import {detailInRange} from './detail-visibility';
import {groundPartition,groundShape,groundCoverage} from './ground-partition';
import * as T from 'three';
import {canBuildScene,sceneBuildDeadline,sceneBuildFocus,sceneBuildStages} from './scene-build-budget';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import layout from '../data/cathedral-park.json';
import {CITY_DATA,type XY} from './city-layout';
import {parkMaterial} from './park-materials';
import {prepareLandmarkCollision} from './landmark-collision';
import {parkTerrace,parkStepWeight} from '../vendor/streets-gl/src/app/terrain/CathedralGrade';

// Photo/sphere audit: docs/cathedral-park-references.md. All buildings retain
// their original geometry. This layer is only planting, paths and park furniture.
type Patch={kind:string;rings:number[][][];rise:number};
type Job={root:T.Group;collision:T.Group;x:number;z:number;run:()=>Generator<void>;done:boolean;iterator?:Generator<void>};
type Part={geometry:T.BufferGeometry;kind:number;fine:boolean;physical:boolean};
const C={stone:'#929994',slab:'#9b9f99',paver:'#a3a69e',asphalt:'#626967',edge:'#aaaDa4',band:'#59615e',grass:'#577347',soil:'#665c48',green:'#3f5d37',wood:'#816147',iron:'#323e3b',granite:'#343d3b',water:'#345b5d',flower:'#92433e',white:'#b9b9a5'};
const kinds:Record<string,number>={edge:0,band:0,stone:0,slab:1,paver:2,asphalt:3,grass:4,flowers:5,water:6};
const rect=(x:number,z:number,w:number,d:number):XY[]=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
const variation=(x:number,z:number)=>{const n=Math.sin(x*12.9898+z*78.233)*43758.5453;return n-Math.floor(n);};

export function createCathedralPark(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean,plazaReady:()=>boolean,plazaLevel:(x:number,z:number)=>number){
  // Retain the DEM's gentle rise, while each clipped tread owns its boundary.
  const patchLevel=(x:number,z:number,rise:number)=>ground(x,z)+(rise-parkTerrace(x,z))*parkStepWeight(x,z);
  // One ground shader per cell carries its surface family as a vertex attribute.
  // Different paving/grass appearances do not multiply draw calls.
  const materials=[parkMaterial('ground'),parkMaterial('water')];
  const physicalMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  const objects:T.Group[]=[],collisionObjects:T.Group[]=[],jobs:Job[]=[],visuals:{mesh:T.Mesh;fine:boolean}[]=[];
  let target:T.Group,physical:T.Group,parts:Part[]=[],disposed=false;
  let groundRings:number[][][][]=[];
  const colors=new Map<string,T.Color>(),unitBox=new T.BoxGeometry(1,1,1).toNonIndexed();unitBox.deleteAttribute('uv');
  function put(g:T.BufferGeometry,color:string,kind=0,fine=false,collide=false){
    const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();flat.deleteAttribute('uv');
    let c=colors.get(color);if(!c){c=new T.Color(color);colors.set(color,c);}
    const values=new Float32Array(flat.attributes.position.count*3);for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}
    flat.setAttribute('color',new T.BufferAttribute(values,3));flat.setAttribute('parkStyle',new T.BufferAttribute(new Float32Array(flat.attributes.position.count).fill(kind),1));parts.push({geometry:flat,kind,fine,physical:collide});
  }
  function* flush(){
    for(const fine of[false,true])for(let kind=0;kind<materials.length;kind++){
      const selected=parts.filter(p=>(p.kind===6?1:0)===kind&&p.fine===fine);if(!selected.length)continue;
      const g=mergeGeometries(selected.map(p=>p.geometry))!;g.computeBoundingBox();g.computeBoundingSphere();
      const mesh=new T.Mesh(g,materials[kind]);mesh.name=target.name+(fine?' · detalii':' · suprafețe');mesh.receiveShadow=true;target.add(mesh);visuals.push({mesh,fine});
      const solid=selected.filter(p=>p.physical);if(solid.length){const g=mergeGeometries(solid.map(p=>p.geometry))!;physical.add(new T.Mesh(g,physicalMaterial));}
      selected.forEach(p=>p.geometry.dispose());yield;
    }
    parts=[];physical.updateMatrixWorld(true);yield* prepareLandmarkCollision(physical);
    target.userData.groundRings=groundRings;groundRings=[];
  }
  function job(name:string,x:number,z:number,run:()=>Generator<void>){const root=new T.Group(),collision=new T.Group();root.name=`Parcul Catedralei · ${name}`;root.visible=false;collision.name=root.name+' · coliziune';scene.add(root);objects.push(root);collisionObjects.push(collision);jobs.push({root,collision,x,z,run,done:false});}
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,fine=false,collide=false,angle=0){const g=unitBox.clone();g.scale(w,h,d);g.rotateY(angle);g.translate(x,y,z);put(g,color,0,fine,collide);}
  function cylinder(x:number,y:number,z:number,rt:number,rb:number,h:number,color:string,fine=false,sides=10,collide=false){const g=new T.CylinderGeometry(rt,rb,h,sides);g.translate(x,y,z);put(g,color,0,fine,collide);}
  function shrub(x:number,y:number,z:number,rx:number,ry:number,rz:number,color=C.green,clipped=false){const g=new T.SphereGeometry(1,clipped?6:8,clipped?4:5);g.scale(rx,ry,rz);g.translate(x,y+ry,z);put(g,color,0,true);}
  function beam(a:T.Vector3,b:T.Vector3,r:number,color:string,kind=0,fine=true){const d=b.clone().sub(a),g=new T.CylinderGeometry(r,r,d.length(),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);put(g,color,kind,fine);}
  function polygon(rings:number[][][]){const shape=new T.Shape();rings[0].forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();for(const ring of rings.slice(1)){const hole=new T.Path();ring.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();shape.holes.push(hole);}return shape;}
  function* surface(rings:number[][][],color:string,kind:number,height:(x:number,z:number)=>number,collide=false){
    const partition=groundPartition(target.name,rings);if(!partition.length)return;groundRings.push(...partition);
    const source=new T.ShapeGeometry(partition.map(groundShape));source.rotateX(-Math.PI/2);const flat=source.index?source.toNonIndexed():source.clone(),v=flat.attributes.position,out:number[]=[];
    function triangle(a:XY,b:XY,c:XY,depth=0){
      const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),ca=Math.hypot(a[0]-c[0],a[1]-c[1]);
      if(depth<12&&Math.max(ab,bc,ca)>5){
        // Bisect the longest edge: a long, narrow footpath must not subdivide
        // like a square lawn into thousands of nearly degenerate triangles.
        if(ab>=bc&&ab>=ca){const m:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];triangle(a,m,c,depth+1);triangle(m,b,c,depth+1);}
        else if(bc>=ca){const m:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];triangle(a,b,m,depth+1);triangle(a,m,c,depth+1);}
        else{const m:XY=[(a[0]+c[0])/2,(a[1]+c[1])/2];triangle(a,b,m,depth+1);triangle(m,b,c,depth+1);}return;
      }
      for(const [x,z]of[a,b,c])out.push(x,0,z);
    }
    for(let i=0;i<v.count;i+=3)triangle([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);
    source.dispose();flat.dispose();
    for(let i=0;i<out.length;i+=3){out[i+1]=height(out[i],out[i+2]);if(i%192===189)yield;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();put(g,color,kind,false,collide);
  }
  function edging(ring:number[][],height:number,width=.15,color=C.stone){
    for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),n=Math.max(1,Math.ceil(len/2.5));for(let k=0;k<n;k++){const t=(k+.5)/n,x=a[0]+dx*t,z=a[1]+dz*t;box(x,ground(x,z)+height/2+.08,z,len/n+.015,height,width,color,false,false,Math.atan2(-dz,dx));}}
  }
  function bench(x:number,z:number,angle:number){scrollBench({box,cylinder,beam,put},x,plazaLevel(x,z),z,angle,C.wood);}
  function lamp(x:number,z:number){
    const y=plazaLevel(x,z);const globe=x>3&&x<46&&z>-172;
    cylinder(x,y+.14,z,.15,.23,.28,C.iron,true);cylinder(x,y+1.75,z,.049,.067,3.15,C.iron,true);
    cylinder(x,y+3.30,z,.12,.08,.10,C.iron,true);
    if(globe){const g=new T.SphereGeometry(.19,10,7);g.translate(x,y+3.51,z);put(g,C.white,0,true);cylinder(x,y+3.71,z,.12,.2,.12,C.iron,true);}
    else{cylinder(x,y+3.53,z,.22,.12,.40,C.white,true,4);cylinder(x,y+3.79,z,.04,.30,.21,C.iron,true,4);for(const dx of[-.15,.15])for(const dz of[-.15,.15])box(x+dx,y+3.54,z+dz,.022,.43,.022,C.iron,true);cylinder(x,y+3.94,z,0,.054,.12,C.iron,true,6);}
  }
  job('Monumentul celor Trei Martiri',58.51,-185.38,function*(){
    const x=58.51,z=-185.38,y=plazaLevel(x,z)+.08,stone='#c1c0ad',trim='#cfcdbb',bronze='#51483b';
    // Local OSM memorial 5962810507. Reconstructed stone composition, not a figure.
    for(let i=0;i<4;i++)box(x,y+(i+.5)*.16,z,5.2-i*.54,.16,3.85-i*.52,stone,false,true);
    box(x,y+1.96,z-.3,3.36,2.64,.51,stone,false,true);
    box(x,y+3.30,z-.30,3.45,.17,.65,trim);
    for(const sign of[-1,1]){box(x+sign*1.60,y+2.00,z-.30,.30,2.9,.69,trim);box(x+sign*1.91,y+.98,z+.45,.70,.68,.76,stone,false,true);box(x+sign*1.91,y+1.35,z+.45,.80,.13,.83,trim);const g=new T.SphereGeometry(.20,8,6);g.scale(1,1.55,1);g.translate(x+sign*1.91,y+1.65,z+.45);put(g,stone);}
    for(let i=-1;i<=1;i++){
      box(x+i*.88,y+2.55,z+.011,.68,.85,.15,trim);box(x+i*.88,y+2.55,z+.105,.52,.68,.048,bronze);
      // Low-relief portrait volumes remain restrained; no invented photo textures.
      const head=new T.SphereGeometry(.105,8,6);head.scale(.77,1.14,.31);head.translate(x+i*.88,y+2.66,z+.153);put(head,'#71644f',0,true);
      const shoulders=new T.SphereGeometry(.18,8,5);shoulders.scale(1,.61,.2);shoulders.translate(x+i*.88,y+2.39,z+.15);put(shoulders,'#71644f',0,true);
      for(let line=0;line<2;line++)box(x+i*.88,y+2.02-line*.072,z-.018,.45,.018,.013,bronze,true);
    }
    yield;
    // Shaped crown of the stele, central shield, small apex crown.
    const top=new T.Shape();top.moveTo(-1.52,0);top.lineTo(-1.52,.15);top.lineTo(-.70,.35);top.quadraticCurveTo(0,.04,.70,.35);top.lineTo(1.52,.15);top.lineTo(1.52,0);top.closePath();const crest=new T.ExtrudeGeometry(top,{depth:.5,bevelEnabled:false,curveSegments:8});crest.translate(x,y+3.38,z-.55);put(crest,stone);
    const shield=new T.SphereGeometry(.31,10,6);shield.scale(1,1.1,.12);shield.translate(x,y+3.43,z+.015);put(shield,trim,0,true);
    for(let i=-2;i<=2;i++)box(x+i*.07,y+3.85+(2-Math.abs(i))*.025,z-.31,.045,.14,.08,bronze,true);
    box(x,y+1.06,z+1.0,1.05,.61,.85,stone,false,true);
    const body=new T.SphereGeometry(.24,10,7);body.scale(.9,1.65,.7);body.translate(x,y+1.70,z+1.04);put(body,bronze);
    const head=new T.SphereGeometry(.14,8,6);head.translate(x+.04,y+2.12,z+1.09);put(head,bronze);
    // Swept, asymmetric wings and separate tapered feather tips.
    const wings=[[[0,1.9],[-.25,2.12],[-.55,2.14],[-.82,1.99],[-1.05,1.6],[-1.14,1.28],[-.93,1.44],[-.83,1.34],[-.73,1.62],[-.62,1.52],[-.50,1.80],[-.24,1.75]],[[0,1.92],[.28,2.15],[.59,2.24],[1.16,2.23],[1.09,2.08],[.99,2.13],[.96,1.98],[.84,2.06],[.79,1.90],[.67,1.99],[.55,1.83],[.27,1.82]]];
    for(const points of wings){const shape=new T.Shape();points.forEach(([xx,yy],i)=>i?shape.lineTo(xx,yy):shape.moveTo(xx,yy));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.095,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1});g.translate(x,y,z+1.02);put(g,bronze);}
    const beak=new T.ConeGeometry(.065,.20,5);beak.rotateZ(-Math.PI/2);beak.translate(x+.19,y+2.10,z+1.12);put(beak,bronze);
    for(const dx of[-.13,.13])beam(new T.Vector3(x+dx,y+1.46,z+1.05),new T.Vector3(x+dx,y+1.29,z+1.15),.035,bronze);
    yield;
  });
  job('Agheasmatar · pavilionul cu sferă',23.66,-167.40,function*(){
    const x=23.66,z=-167.40,y=plazaLevel(x,z)+.08,stone='#aeb5aa',bronze='#8c7d5b';
    for(let i=0;i<4;i++)cylinder(x,y+(i+.5)*.15,z,3.50-i*.37,3.50-i*.37,.15,stone,false,48,true);
    for(const dx of[-1.51,1.51])for(const dz of[-1.51,1.51]){box(x+dx,y+2.44,z+dz,.27,3.66,.27,stone,false,true);box(x+dx,y+.72,z+dz,.43,.24,.43,'#bcc1b7');box(x+dx,y+4.19,z+dz,.41,.2,.41,'#bbc1b7');}
    cylinder(x,y+4.42,z,2.35,1.88,.30,'#7e8881',false,48);cylinder(x,y+4.60,z,2.37,2.37,.10,stone,false,48);
    yield;
    const source=new T.IcosahedronGeometry(1.52,2),wire=new T.WireframeGeometry(source),p=wire.attributes.position;
    for(let i=0;i<p.count;i+=2){beam(new T.Vector3(p.getX(i)+x,p.getY(i)+y+4.57,p.getZ(i)+z),new T.Vector3(p.getX(i+1)+x,p.getY(i+1)+y+4.57,p.getZ(i+1)+z),.023,bronze,0,false);if(i%100===0)yield;}
    source.dispose();wire.dispose();
    cylinder(x,y+6.12,z,.12,.46,.31,'#9da59c',false,24);box(x,y+6.72,z,.10,.92,.10,bronze);box(x,y+6.82,z,.58,.10,.10,bronze);
    cylinder(x,y+1.42,z,.20,.27,1.53,stone,false,16,true);cylinder(x,y+2.12,z,.68,.23,.43,'#b8c0b4',false,24,true);
    yield;
  });
  for(const cell of layout.cells){job(`sector ${cell.x}/${cell.z}`,cell.x,cell.z,function*(){
    for(const patch of cell.surfaces as Patch[]){const k=patch.kind;yield* surface(patch.rings,C[k as keyof typeof C],kinds[k],(x,z)=>patchLevel(x,z,patch.rise)+(k==='grass'?.095:.115),true);yield;}
    for(const p of layout.props){if(p.x<cell.x-19||p.x>=cell.x+19||p.z<cell.z-19||p.z>=cell.z+19)continue;
      if(p.kind==='bench')bench(p.x,p.z,p.angle);else if(p.kind==='lamp')lamp(p.x,p.z);else{const y=plazaLevel(p.x,p.z);cylinder(p.x,y+.38,p.z,.21,.19,.68,C.iron,true,12);cylinder(p.x,y+.72,p.z,.23,.23,.045,'#4f5e50',true,12);cylinder(p.x,y+.746,p.z,.175,.175,.006,'#222c24',true,12);for(const dx of[-.27,.27])box(p.x+dx,y+.37,p.z,.035,.74,.035,C.iron,true);}yield;
    }
  });}
  for(const bed of layout.beds){const [cx,cz]=bed.center;job(`grădină ${bed.id}`,cx,cz,function*(){
    yield* surface(bed.rings,C.flower,5,(x,z)=>patchLevel(x,z,bed.rise)+.18);edging(bed.rings[0],.14,.16);yield;
    // A narrow clipped border, inside the mapped bed; keep all path corridors free.
    const ring=bed.rings[0];
    for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],len=Math.hypot(a[0]-b[0],a[1]-b[1]),count=Math.ceil(len/1.15);for(let k=0;k<count;k++){const t=(k+.5)/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,dx=cx-x,dz=cz-z,l=Math.hypot(dx,dz)||1;shrub(x+dx/l*.30,ground(x,z)+.13,z+dz/l*.30,.59,.22,.59,C.green,true);}yield;}
    if(!bed.fan){
      const bounds=new T.Box2().setFromPoints(ring.map(p=>new T.Vector2(p[0],p[1]))),w=bounds.max.x-bounds.min.x,d=bounds.max.y-bounds.min.y;
      if(w>8&&d>4){yield* surface([rect(cx,cz,w*.60,d*.16)],'#bcac69',5,(x,z)=>ground(x,z)+.20);yield* surface([rect(cx,cz,w*.06,d*.68)],'#bcac69',5,(x,z)=>ground(x,z)+.203);}
    }
  });}
  job('treptele curbe dintre terase',24,-108,function*(){
    for(const riser of layout.risers){
      const p=riser.points;
      for(let i=1;i<p.length;i++){
        const a=p[i-1],b=p[i],wa=parkStepWeight(a[0],a[1]),wb=parkStepWeight(b[0],b[1]);
        if(wa+wb<.001)continue;
        const ya=patchLevel(a[0],a[1],riser.rise)+.115,yb=patchLevel(b[0],b[1],riser.rise)+.115,ba=ya-.12*wa-.005,bb=yb-.12*wb-.005,g=new T.BufferGeometry();
        g.setAttribute('position',new T.Float32BufferAttribute([a[0],ba,a[1],b[0],bb,b[1],b[0],yb,b[1],a[0],ba,a[1],b[0],yb,b[1],a[0],ya,a[1]],3));g.computeVertexNormals();put(g,C.stone,0,false,true);
        if(i%32===0)yield;
      }
      yield;
    }
  });
  job('havuz circular',24,-127.25,function*(){
    const x=24,z=-127.25,y=plazaLevel(x,z)+.06,segments=48,r=3.9;
    const shape=new T.Shape();shape.absarc(0,0,r,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,r-.34,0,Math.PI*2,true);shape.holes.push(hole);
    const wall=new T.ExtrudeGeometry(shape,{depth:.46,bevelEnabled:false,curveSegments:segments/4});wall.rotateX(-Math.PI/2);wall.translate(x,y,z);put(wall,C.granite,0,false,true);
    const cap=new T.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:false,curveSegments:segments/4});cap.rotateX(-Math.PI/2);cap.translate(x,y+.46,z);put(cap,'#737e79');
    const disk=new T.CircleGeometry(r-.35,48);disk.rotateX(-Math.PI/2);disk.translate(x,y+.16,z);put(disk,C.water,6);
    box(x,y+.3,z,1.18,.60,1.18,C.granite,false,true);yield;
    for(const dx of[-.40,.40]){box(x+dx,y+1.7,z,.11,2.65,.12,'#8c9690');box(x+dx,y+1.7,z+.36,.11,2.65,.12,'#8c9690');}
    box(x,y+3.0,z+.18,1.14,.12,.63,'#a29375');box(x,y+2.62,z+.18,1.06,.12,.57,'#947e61');
    for(let i=0;i<20;i++){const angle=i*Math.PI*2/20,points:T.Vector3[]=[];for(let k=0;k<=12;k++){const t=k/12,rr=2.88*(1-t);points.push(new T.Vector3(x+Math.cos(angle)*rr,y+.21+Math.sin(Math.PI*t)*1.85,z+Math.sin(angle)*rr));}const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.018,4,false);put(g,'#b4c5c2',6,true);if(i%5===0)yield;}
  });
  job('havuz de pe axa Pușkin',119.3,-224,function*(){
    const x=119.3,z=-224,y=plazaLevel(x,z)+.06,w=23.6,d=7.9;
    for(const sign of[-1,1]){box(x,y+.21,z+sign*(d/2-.19),w,.42,.38,C.stone,false,true);box(x+sign*(w/2-.19),y+.21,z,.38,.42,d,C.stone,false,true);}
    yield* surface([rect(x,z,w-.77,d-.77)],'#344e50',6,()=>y+.10);yield;
    for(let row=0;row<3;row++)for(let i=0;i<9;i++){const xx=x-9.5+i*2.38,zz=z+(row-1)*2.35,h=1.3+Math.sin((i+1)*.67)*.8+(row===1?.75:0);cylinder(xx,y+.13,zz,.07,.07,.04,'#abb6ad',true,8);beam(new T.Vector3(xx,y+.14,zz),new T.Vector3(xx+.035,y+h,zz),.024,'#b7cdca',6);}
  });
  // Low evergreen accents on the lawn islands flank, rather than obstruct, the axis.
  for(const [x,z]of[[-1,-91],[49,-91],[-4,-120],[53,-120],[-4,-159],[53,-159]])job(`arbuști ${x}/${z}`,x,z,function*(){for(let i=0;i<7;i++){const dx=(i%3-1)*1.2,dz=Math.floor(i/3)*.9;shrub(x+dx,ground(x+dx,z+dz)+.08,z+dz,1.05,.35+.13*variation(x+i,z),.8,'#496448');}yield;});
  const treeOverrides=CITY_DATA.points.filter(p=>p.t.natural==='tree'&&p.p[1]>-314&&p.p[1]<-12&&p.p[0]>-110&&p.p[0]<159&&((p.p[0]>-15&&p.p[0]<64&&p.p[1]>-177)||p.t.leaf_type==='needleleaved')).map(p=>{
    const [x,z]=p.p,r=variation(x,z),conifer=p.t.leaf_type==='needleleaved'||z>-176&&z<-139&&Math.abs(x-24)>18;
    return{x,z,radius:.8,height:Number(p.t.height)||(conifer?8+r*3:z>-73?5.2+r*1.8:10+r*4),texture:conifer?1:[0,2,3,4][Math.floor(r*4)]};
  });
  const frustum=new T.Frustum(),matrix=new T.Matrix4(),sphere=new T.Sphere();let active:Job|undefined;
  return{objects,collisionObjects,treeOverrides,replacements:[],get ready(){return jobs.every(j=>j.done);},
    readyNear(x:number,z:number,r=420){return jobs.every(j=>Math.hypot(x-j.x,z-j.z)>r||j.done);},
    update(camera:T.PerspectiveCamera,_now:number){
      if(disposed)return;
      const focus=sceneBuildFocus(camera);
      materials[1].userData.parkTime.value=_now*.001;
      if(!active&&plazaReady()){let best=490;for(const j of jobs){if(j.done)continue;const d=Math.hypot(focus.x-j.x,focus.z-j.z);if(d<best&&loaded(j.x,j.z)&&loaded(j.x-19,j.z-19)&&loaded(j.x+19,j.z+19)){best=d;active=j;}}
        if(active){const selected=active;active.iterator=(function*(){yield* selected.run();yield* flush();})();}}
      if(active&&canBuildScene()){target=active.root;physical=active.collision;const deadline=sceneBuildDeadline(1.25);let stages=0;do{const result=active.iterator!.next();stages++;if(result.done){active.done=true;active.root.visible=true;active.root.updateMatrixWorld(true);physical.userData.grounded=true;physical.userData.revision=1;physical.updateMatrixWorld(true);active=undefined;break;}}while(stages<sceneBuildStages(3)&&performance.now()<deadline);}
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      for(const item of visuals){sphere.copy(item.mesh.geometry.boundingSphere!);const distance=camera.position.distanceTo(sphere.center)-sphere.radius;item.mesh.visible=(item.fine?detailInRange(item.mesh,distance,115):distance<camera.far)&&frustum.intersectsSphere(sphere);item.mesh.castShadow=item.fine&&item.mesh.visible&&distance<65;}
    },
    dispose(){unitBox.dispose();disposed=true;for(const root of[...objects,...collisionObjects]){scene.remove(root);root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}parts.forEach(p=>p.geometry.dispose());[...materials,physicalMaterial].forEach(m=>m.dispose());}
  };
}
