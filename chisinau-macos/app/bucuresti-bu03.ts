import * as T from 'three';
import realm from '../data/bucuresti-bu03.json';
import catalog from '../data/bucuresti-bu03-buildings.json';
import {createPhotoFrontages, type PhotoBuilding} from './central-infill';
import {streetMesh, streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {bucurestiBu03Architecture} from './bucuresti-bu03-architecture';
import type {XY} from './city-layout';

/** Bulgară–Tighina: complete official building bodies and dated street
 * observations. Metric heights, hidden elevations and small furniture sizes
 * remain photographic estimates. Existing BUC02 geometry owns the west seam. */
export function createBucurestiBu03(scene:T.Scene, ground:(x:number,z:number)=>number, loaded:(x:number,z:number)=>boolean) {
  const buildings=catalog as unknown as (PhotoBuilding & {nativeIds:number[]})[];
  const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'București BUC03 · corpuri cadastrale');
  const m=streetMesh(scene,'București BUC03 · detalii',ground,loaded);
  const d=bucurestiBu03Architecture(m,ground),a=d.a;
  const l=landscapeLayer(scene,'București BUC03 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
  for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
    for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);
  },c.coverage);

  for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
    const y=ground(...b.anchor as XY)+.12;
    for(const f of a.faces(b.p as XY[],y)){
      if(f.len<(b.style==='vivoClinic'?.4:1.5))continue;
      if(d.handles(b,f)){yield* d.detail(b,f);continue;}
      // Do not extend the main clinic cornice across its lower west wing.
      const h=b.style==='vivoClinic'&&f.at(f.len/2)[0]<1118.3?5.6:b.height;
      a.cornice(f,h,b.trim);
      if(b.style==='annex'){
        if(b.height>2&&f.len>9){f.window(f.len*.5,1.65,.8,1.0,b.trim,'#727b70');yield;}
      }else{
        // Rear openings are conservative estimates, separately marked in data.
        yield* a.windows(f,b.style==='vivoClinic'?2:b.levels,h,b.style==='vivoClinic'?Math.min(2,Math.max(1,Math.round(f.len/6))):Math.max(1,Math.round(f.len/4.8)),1.55,b.trim,'#788178');
      }
      yield;
    }
  });

  const crown=new T.IcosahedronGeometry(1,1),ball=new T.SphereGeometry(1,10,7),trunk=new T.CylinderGeometry(.52,1,1,7);
  for(const [index,[x,z,h,r]] of realm.trees.entries())m.job('arbore individual',streetRect(x,z,r*2,r*2),[],function*(){
    const y=ground(x,z),g=trunk.clone(),stem=h<5?.12:.29;
    const pruned=x>1116&&x<1131&&z>475&&z<478;
    const stemHeight=pruned?h-r*.6:h*.52;
    g.scale(stem,stemHeight,stem);g.translate(x,y+stemHeight/2,z);m.put(g,'#77796c',false,true);
    if(h>5||pruned){const paint=new T.CylinderGeometry(stem*.92,stem*1.04,1.0,7);paint.translate(x,y+.52,z);m.put(paint,'#d5d7c7');}
    if(pruned){const g=ball.clone();g.scale(r,r*.91,r);g.translate(x,y+h-r*.7,z);m.put(g,'#68834e');yield;return;}
    const lobes=h<5?[[0,0,.70,r],[.15,-.1,.86,r*.72]]:[[0,0,.62,r],[r*.43,.2,.76,r*.70],[-r*.31,-.35,.83,r*.64],[.2,-.1,.94,r*.43]];
    for(const [dx,dz,dy,rr]of lobes){const g=crown.clone();g.scale(rr,rr*(.95+(index%3)*.12),rr*.96);g.rotateY(index*.47);g.translate(x+dx,y+h*dy,z+dz);m.put(g,['#6e8457','#7b8b59','#657c51','#7c8758'][index%4]);yield;}
  });

  // Mapped lamp nodes plus the two south-side concrete poles seen in the
  // September 2025 panoramas. Additional metric locations are estimates.
  const poles=[...realm.poles,[1107.0,475.5],[1161.0,475.6]];
  for(const [x,z]of poles)m.job('stâlp și iluminat',streetRect(x,z,2,2),[],function*(){
    const y=ground(x,z),direction=z>468?-1:1;
    const pole=new T.CylinderGeometry(.105,.18,8.2,9);pole.translate(x,y+4.1,z);m.put(pole,'#a6aaa0',false,true);
    m.beam(new T.Vector3(x,y+7.65,z),new T.Vector3(x,y+8.0,z+direction*1.9),.04,'#879084');
    m.box(x,y+7.98,z+direction*1.9,.27,.12,.75,'#d1d3c9');
    const loop=new T.TorusGeometry(.25,.018,4,14);loop.translate(x,y+5.2,z);m.put(loop,'#454d45',true);yield;
  });
  for(let x=1026;x<1241;x+=12)m.job('București · fire de contact',[[x,466],[Math.min(1241,x+12),470]],[],function*(){
    for(const z of[466.1,469.1])m.beam(new T.Vector3(x,ground(x,z)+6.3,z),new T.Vector3(Math.min(1241,x+12),ground(Math.min(1241,x+12),z)+6.3,z),.014,'#505950');yield;
  });
  for(const [x,z]of poles)m.job('cablu transversal de susținere',[[x,z],[x,475]],[],function*(){
    m.beam(new T.Vector3(x,ground(x,z)+6.8,z),new T.Vector3(x,ground(x,475)+6.3,475),.012,'#505950');yield;
  });
  for(let z=408;z<538;z+=12)m.job('Tighina · cabluri și racorduri',[[1200,z],[1205,Math.min(538,z+12)]],[],function*(){
    for(const x of[1200.5,1203.2])m.beam(new T.Vector3(x,ground(x,z)+6.45,z),new T.Vector3(x,ground(x,Math.min(538,z+12))+6.45,Math.min(538,z+12)),.014,'#505950');yield;
  });

  // All four crossing arms are visible in the 2025 panorama. Signs and signal
  // housings use estimated metric sizes and sit clear of the walking routes.
  const signPositions=[[1193.2,460.5,Math.PI/2],[1193.2,475.6,-Math.PI/2],[1214.2,460.6,-Math.PI/2],[1214.2,475.6,Math.PI/2],[1194.3,450.5,0],[1209.6,450.5,Math.PI],[1194.5,480.0,0],[1209.9,480.0,Math.PI]];
  for(const[x,z,rotation]of signPositions)m.job('Tighina · semnalizarea trecerii',streetRect(x,z,1,1),[],function*(){
    const y=ground(x,z);m.box(x,y+1.70,z,.075,3.4,.075,'#879184',false,true);
    const f=m.facade([x-.42*Math.cos(rotation),z+.42*Math.sin(rotation)],[x+.42*Math.cos(rotation),z-.42*Math.sin(rotation)],y);
    f.panel(.42,2.85,.04,.74,.80,.045,'#c9ce48');f.panel(.42,2.85,.075,.57,.63,.035,'#357a9c');
    const pts=[[-.23,-.23],[.23,-.23],[0,.25]].map(([u,v])=>{const p=f.at(.42+u,.10);return[p[0],y+2.85+v,p[1]];});
    const tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute(pts.flat(),3));tri.computeVertexNormals();m.put(tri,'#e6e8db',true);
    f.panel(.42,2.82,.12,.045,.25,.02,'#3e5360',true);f.panel(.42,2.70,.12,.24,.035,.02,'#3e5360',true);
    // Small pedestrian heads, seen on the corner posts; decorative lights do
    // not alter the game's existing interactive traffic logic.
    const p=f.at(.42,.13);m.box(p[0],y+2.05,p[1],.19,.43,.17,'#252c29',false,false,-rotation);
    for(const[dy,col]of[[.10,'#993c36'],[-.10,'#4c7453']]as[number,string][]){const q=f.at(.42,.23);const g=new T.CircleGeometry(.055,8);g.rotateY(rotation);g.translate(q[0],y+2.05+dy,q[1]);m.put(g,col,true);}
    yield;
  });
  for(const[x,z,rotation]of[[1193.6,457.9,0],[1209.8,459.4,Math.PI],[1194.6,478.7,Math.PI/2],[1211.1,478.7,-Math.PI/2]])m.job('Tighina · semafor rutier',streetRect(x,z,1,1),[],function*(){
    const y=ground(x,z);m.box(x,y+2.15,z,.10,4.3,.10,'#6b766c',false,true);
    const f=m.facade([x-.2*Math.cos(rotation),z+.2*Math.sin(rotation)],[x+.2*Math.cos(rotation),z-.2*Math.sin(rotation)],y);
    f.panel(.2,3.65,.16,.30,.95,.23,'#292e2b');
    for(const[dy,col]of[[.30,'#984a3c'],[0,'#9b8d46'],[-.30,'#5d7d55']]as[number,string][]){const p=f.at(.2,.29);const g=new T.CircleGeometry(.095,10);g.rotateY(rotation);g.translate(p[0],y+3.65+dy,p[1]);m.put(g,col,true);}
    yield;
  });
  m.job('Tighina · sens unic și acces interzis',[[1194.6,458.2],[1209.2,478.7]],[],function*(){
    // Both signs are observed; supports reuse the authored corner poles.
    const x=1209.2054,z=458.1828,y=ground(x,z),g=new T.CircleGeometry(.36,20);g.translate(x,y+3.15,z+.19);m.put(g,'#b54d44');m.box(x,y+3.15,z+.20,.52,.12,.025,'#e8e7da');
    const xx=1194.6,zz=478.7,yy=ground(xx,zz),f=m.facade([xx+.30,zz-.15],[xx-.30,zz-.15],yy);
    f.panel(.3,3.05,.025,.59,.71,.04,'#377994');f.panel(.3,3.02,.06,.08,.37,.025,'#e7e7d9');
    const pts=[[-.18,-.02],[.18,-.02],[0,.22]].map(([u,v])=>{const p=f.at(.3+u,.08);return[p[0],yy+3.20+v,p[1]];});
    const arrow=new T.BufferGeometry();arrow.setAttribute('position',new T.Float32BufferAttribute(pts.flat(),3));arrow.computeVertexNormals();m.put(arrow,'#e7e7d9');yield;
  });

  // Opaque courtyard boundaries seen from the street; interactive gate leaves
  // are created exclusively by courtyard-gates, never duplicated here.
  m.job('32 · zid continuu spre ruina păstrată',[[1037.6,457.8],[1045.0,457.8]],[],function*(){
    const x=1041.3,z=457.8,y=ground(x,z);m.box(x,y+1.53,z,7.4,3.0,.25,'#b7bcb0',false,true);m.box(x,y+.32,z+.02,7.4,.58,.28,'#838d7e');m.box(x,y+3.08,z,7.44,.12,.34,'#9da68f');yield;
  });
  m.job('Curtea nordică · zid continuu fotografiat',[[1150.3,457.77],[1167.4,457.77]],[],function*(){
    const x=1158.85,z=457.77,y=ground(x,z);
    m.box(x,y+1.55,z,17.1,3.0,.25,'#bac3b6',false,true);
    m.box(x,y+.35,z+.02,17.1,.62,.28,'#868f83');
    m.box(x,y+3.10,z,17.3,.16,.43,'#8e9689');
    for(const[xx,rr]of[[1153.0,1.8],[1160.3,2.2],[1165.0,1.5]]){const g=crown.clone();g.scale(rr,.52,.8);g.translate(xx,ground(xx,z)+3.27,z-.1);m.put(g,'#5a704b');yield;}
  });
  for(const[x1,x2,z,h,col]of[[1133.35,1139.30,479.5,2.10,'#5a5147'],[1145.70,1146.95,479.5,2.10,'#5a5147']]as[number,number,number,number,string][])m.job('13 · zid de incintă',[[x1,z],[x2,z]],[],function*(){
    const x=(x1+x2)/2,y=ground(x,z);m.box(x,y+h/2+.035,z,x2-x1,h,.20,col,false,true);m.box(x,y+h+.10,z,x2-x1+.04,.12,.28,'#6d7461');
    const g=crown.clone();g.scale((x2-x1)*.47,.45,.43);g.translate(x,y+h+.23,z);m.put(g,'#596e49');yield;
  });
  // Southeast Tighina corner is an enclosure, not an invented corner building.
  for(const[p,q]of[[[1213.3,478.5],[1241.0,478.5]],[[1213.3,478.5],[1213.3,511.0]]]as[XY,XY][])m.job('Tighina · gardul colțului sud-est',[p,q],[],function*(){
    const len=Math.hypot(q[0]-p[0],q[1]-p[1]),count=Math.ceil(len/2.7);
    for(let k=0;k<count;k++){
      const u0=k/count,u1=(k+1)/count,x=(p[0]+(q[0]-p[0])*(u0+u1)/2),z=(p[1]+(q[1]-p[1])*(u0+u1)/2),y=ground(x,z),rot=-Math.atan2(q[1]-p[1],q[0]-p[0]);
      m.box(x,y+.49,z,len/count,.9,.22,'#b9b9a8',false,true,rot);
      m.box(x,y+1.62,z,len/count,1.40,.11,'#b8bba8',false,true,rot);
      const xx=p[0]+(q[0]-p[0])*u0,zz=p[1]+(q[1]-p[1])*u0;
      m.box(xx,ground(xx,zz)+1.17,zz,.24,2.3,.24,'#a8ad9b',false,true);yield;
    }
  });

  // Two circular covers are visible in the 2025 imagery. Their locations and
  // diameters are photographic estimates; no unobserved utility grid is added.
  for(const[x,z,r]of[[1106.5,477.6,.30],[1193.6,480.0,.34]])m.job('capac rotund fotografiat',streetRect(x,z,1,1),[],function*(){
    const y=ground(x,z)+.049,g=new T.CylinderGeometry(r,r,.02,16);g.translate(x,y,z);m.put(g,'#687365');
    for(let dz=-r*.65;dz<=r*.65;dz+=.10)m.box(x,y+.013,z+dz,Math.sqrt(r*r-dz*dz)*1.7,.012,.018,'#91998b',true);yield;
  });
  m.job('21 · jardinieră și coș observate',streetRect(1047.7,476.6,2,1),[],function*(){
    const x=1047.6,z=476.6,y=ground(x,z);m.box(x,y+.29,z,.85,.50,.44,'#aa746e',false,true);m.box(x,y+.55,z,.74,.035,.35,'#737258');
    m.box(x-1.0,y+.45,z,.36,.78,.37,'#747b71',false,true);m.box(x-1.0,y+.86,z,.4,.07,.41,'#535e53');yield;
  });

  const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true;
  const ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
  const replacements=[
    ...ids.map(id=>({id,x:1114,z:469,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),
    ...buildings.map((b,i)=>({id:-5200000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))
  ];
  const treeOverrides:{x:number;z:number;height:number;radius:number;texture:number;readonly ready:boolean}[]=[];
  // BUC02 retains the two west-seam trees. Readiness follows the resident tree
  // jobs, so ground eviction cannot reveal an old procedural row underneath.
  for(let x=1030;x<1241;x+=5.5)for(const z of[461.4,475.7])treeOverrides.push({x,z,height:0,radius:3.3,texture:0,get ready(){return m.readyNear(x,z,16);}});
  for(const[x,z,h,r]of realm.trees)treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,16);}});
  const instanceOverrides:never[]=[];
  const layers=[bodies,m,l];
  return{
    objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,instanceOverrides,
    get ready(){return layers.every(v=>v.ready);},
    readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},
    update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},
    dispose(){for(const v of layers)v.dispose();crown.dispose();ball.dispose();trunk.dispose();}
  };
}
