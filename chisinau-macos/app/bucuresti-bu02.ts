import * as T from 'three';
import realm from '../data/bucuresti-bu02.json';
import catalog from '../data/bucuresti-bu02-buildings.json';
import {createPhotoFrontages, type PhotoBuilding} from './central-infill';
import {streetMesh, streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {bucurestiBu02Architecture} from './bucuresti-bu02-architecture';
import type {XY} from './city-layout';

/** Armenească–Bulgară. Official footprints and complete attached bodies, with
 * dated 2025 street elevations. Heights, small dimensions and hidden courts
 * are estimates. Ground and native replacements become active per ready job. */
export function createBucurestiBu02(scene:T.Scene, ground:(x:number,z:number)=>number, loaded:(x:number,z:number)=>boolean) {
  const buildings=catalog as unknown as (PhotoBuilding & {nativeIds:number[]})[];
  const bodies=createPhotoFrontages(scene, ground, loaded, buildings.map(b=>({...b,facades:false})), 'București BUC02 · corpuri cadastrale');
  const m=streetMesh(scene, 'București BUC02 · detalii', ground, loaded);
  const d=bucurestiBu02Architecture(m,ground), a=d.a;
  const l=landscapeLayer(scene, 'București BUC02 · spațiu public', ground, loaded, {maxEdge:3,residentDistance:700});
  for (const c of realm.cells) l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
    for (const p of c.patches) yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);
  },c.coverage);

  for (const b of buildings) m.job(b.title,b.p as XY[],[],function*(){
    const y=ground(...b.anchor as XY)+.12;
    for (const f of a.faces(b.p as XY[],y)) {
      if (f.len<(b.style==='blueCorner'?.4:1.5)) continue;
      if (d.handles(b,f)) {yield* d.detail(b,f);continue;}
      a.cornice(f,b.height,b.trim);
      if (b.style==='annex') {
        if (b.height>2&&f.len>9) {f.window(f.len*.5,1.65,.8,1.0,b.trim,'#727c72');yield;}
      } else {
        // Unseen courtyard elevations are explicitly estimated in the catalog.
        const rows=b.style==='blueCorner'?3:b.style.startsWith('mansard31')?1:b.levels;
        yield* a.windows(f,rows,b.height,Math.max(1,Math.round(f.len/4.2)),1.65,b.trim,'#78837b');
      }
      yield;
    }
    if (b.style==='blueCorner') {
      // Rounded corner, glazed drum and blue cupola visible in July 2025.
      // Its plan position follows the official curved corner; radius and height
      // are photographic estimates, not official height measurements.
      const x=977.15,z=454.75,r=2.8;
      const drum=new T.CylinderGeometry(r,r,2.1,20);drum.translate(x,y+11.55,z);m.put(drum,'#dce0d9');
      for(let k=0;k<20;k++) {
        const t=k*Math.PI/10,xx=x+Math.cos(t)*r,zz=z+Math.sin(t)*r;
        m.box(xx,y+11.6,zz,.055,1.45,.055,'#f0eee4',true);
        if(k%3===0)yield;
      }
      const glass=new T.CylinderGeometry(r+.012,r+.012,1.45,20,1,true);glass.translate(x,y+11.6,z);m.put(glass,'#598393',false,false,1);
      for(const [yy,rr,hh] of [[10.55,2.94,.18],[12.62,2.94,.20]] as number[][]) {
        const rim=new T.CylinderGeometry(rr,rr,hh,20);rim.translate(x,y+yy,z);m.put(rim,'#e4e5dc');
      }
      const dome=new T.LatheGeometry([new T.Vector2(2.94,0),new T.Vector2(2.73,.48),new T.Vector2(2.15,1.18),new T.Vector2(1.35,1.75),new T.Vector2(.53,2.05),new T.Vector2(0,2.15)],20);
      dome.translate(x,y+12.7,z);m.put(dome,'#367591');
      const finial=new T.ConeGeometry(.10,.56,8);finial.translate(x,y+15.08,z);m.put(finial,'#628492',true);
      yield;
    }
  });

  // Each tree has an individually observed position and crown estimate.
  const crown=new T.IcosahedronGeometry(1,1), trunk=new T.CylinderGeometry(.52,1,1,7);
  for (const [index,[x,z,h,r]] of realm.trees.entries()) m.job('arbore individual',streetRect(x,z,r*2,r*2),[],function*(){
    const y=ground(x,z),g=trunk.clone(),stem=h<5?.12:.29;
    g.scale(stem,h*.52,stem);g.translate(x,y+h*.26,z);m.put(g,'#77796c',false,true);
    if(h>5){const paint=new T.CylinderGeometry(stem*.92,stem*1.04,.9,7);paint.translate(x,y+.47,z);m.put(paint,'#d2d4bf');}
    const lobes=h<5?[[0,0,.70,r],[.15,-.1,.86,r*.72]]:[[0,0,.62,r],[r*.43,.2,.76,r*.7],[-r*.31,-.35,.83,r*.64],[.2,-.1,.94,r*.43]];
    for (const [dx,dz,dy,rr] of lobes) {
      const g=crown.clone();g.scale(rr,rr*(.95+(index%3)*.12),rr*.96);g.rotateY(index*.47);g.translate(x+dx,y+h*dy,z+dz);
      m.put(g,['#6f8558','#7b8d5a','#657e50','#7a8657'][index%4]);yield;
    }
  });

  // Concrete poles, overhanging lamps and bundled trolley/utility wires are
  // observed infrastructure. No traffic signals were confirmed at Bulgară.
  for(const [x,z] of realm.poles) m.job('stâlp cartografiat și iluminat',streetRect(x,z,2,2),[],function*(){
    const y=ground(x,z),direction=z>468?-1:1;
    const pole=new T.CylinderGeometry(.105,.18,8.2,9);pole.translate(x,y+4.1,z);m.put(pole,'#a5aa9e',false,true);
    m.beam(new T.Vector3(x,y+7.65,z),new T.Vector3(x,y+8.0,z+direction*1.9),.04,'#899589');
    m.box(x,y+7.98,z+direction*1.9,.27,.12,.75,'#d0d3c7');
    const loop=new T.TorusGeometry(.25,.018,4,14);loop.translate(x,y+5.2,z);m.put(loop,'#465149',true);
    yield;
  });
  for(let x=805;x<1026;x+=12) m.job('București · fire aeriene',[[x,466],[Math.min(1026,x+12),470]],[],function*(){
    for(const z of[466.1,469.1])m.beam(new T.Vector3(x,ground(x,z)+6.3,z),new T.Vector3(Math.min(1026,x+12),ground(Math.min(1026,x+12),z)+6.3,z),.014,'#505c50');
    yield;
  });
  for(const [x,z] of realm.poles) m.job('cablu transversal de susținere',[[x,z],[x,475]],[],function*(){
    m.beam(new T.Vector3(x,ground(x,z)+6.8,z),new T.Vector3(x,ground(x,475)+6.3,475),.012,'#505c50');yield;
  });

  // Three marked crossings and the unmarked northern connection follow the
  // ground data. Signs are kept outside the continuous pedestrian corridor.
  for(const [x,z,rotation] of [[979.3,459.2,Math.PI/2],[979.6,477.1,-Math.PI/2],[1002,460.4,-Math.PI/2],[999.6,475.5,Math.PI/2],[982.5,478.5,0],[999.5,479,Math.PI]] as number[][]) {
    m.job('Bulgară · indicator de traversare',streetRect(x,z,1,1),[],function*(){
      const y=ground(x,z);m.box(x,y+1.65,z,.075,3.3,.075,'#8b978a',false,true);
      const f=m.facade([x-.42*Math.cos(rotation),z+.42*Math.sin(rotation)],[x+.42*Math.cos(rotation),z-.42*Math.sin(rotation)],y);
      f.panel(.42,2.8,.04,.72,.78,.045,'#c6cc43');f.panel(.42,2.8,.075,.56,.62,.035,'#367d9b');
      const points=[[-.23,-.23],[.23,-.23],[0,.25]].map(([u,v])=>{const p=f.at(.42+u,.10);return[p[0],y+2.8+v,p[1]];});
      const triangle=new T.BufferGeometry();triangle.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));triangle.computeVertexNormals();m.put(triangle,'#e1e5d7',true);
      f.panel(.42,2.77,.12,.045,.25,.02,'#3e5565',true);f.panel(.42,2.65,.12,.24,.035,.02,'#3e5565',true);yield;
    });
  }
  // July2025 panorama: transverse drain at the south Bulgară crossing.
  m.job('Bulgară · rigolă transversală cu grătare',streetRect(991.4,480.1,8.3,.5),[],function*(){
    for(let k=0;k<9;k++) {
      const x=987.7+k*.92,z=480.1,y=ground(x,z)+.047;
      m.box(x,y,z,.85,.021,.32,'#576055');
      for(let dx=-.32;dx<=.32;dx+=.09)m.box(x+dx,y+.013,z,.026,.013,.27,'#92998a',true);
      yield;
    }
  });
  // A small rectangular cover is visible in the September2025 westward view.
  // Metric location and dimensions are estimated from that photograph.
  m.job('capac dreptunghiular fotografiat',streetRect(928.7,468.5,.6,.6),[],function*(){
    const x=928.7,z=468.5,y=ground(x,z)+.047;
    m.box(x,y,z,.42,.018,.36,'#707b6d');
    for(const dz of[-.16,.16])m.box(x,y+.011,z+dz,.38,.012,.018,'#92998b',true);
    yield;
  });
  m.job('Bulgară · coș stradal',streetRect(1000.0,480.5,.6,.6),[],function*(){
    const x=1000.0,z=480.5,y=ground(x,z);m.box(x,y+.44,z,.38,.78,.39,'#46584e',false,true);m.box(x,y+.85,z,.42,.07,.43,'#32493e');yield;
  });

  // Only the visibly enclosed frontage at27 is drawn. The known accesses to
  // 29 and27 stay clear, and all interactive leaves are owned by courtyard-gates.
  for(const [x1,x2] of [[937.9,943.6],[948.0,963.9]]) m.job('27 · zid de incintă fotografiat',[[x1,479.45],[x2,479.45]],[],function*(){
    const x=(x1+x2)/2,z=479.45,y=ground(x,z);
    m.box(x,y+.86,z,x2-x1,1.65,.20,'#a9aaa0',false,true);
    m.box(x,y+1.72,z,x2-x1+.04,.11,.28,'#c2c2b4');yield;
  });

  // Masonry arches above the two courtyard gates. The shape has an open bottom
  // and begins above pedestrian headroom, with no static leaf behind a gate.
  for(const [x1,x2,z,facing,title] of [[904.6,907.3,479,-1,'31'],[934.4,936.8,458,1,'34']] as [number,number,number,number,string][]) {
    m.job(`${title} · arc deasupra pasajului`,[[x1,z],[x2,z]],[],function*(){
      const width=x2-x1,x=(x1+x2)/2,y=ground(x,z)+.12;
      const shape=new T.Shape();shape.moveTo(-width/2,2.85);shape.lineTo(-width/2,4.05);shape.lineTo(width/2,4.05);shape.lineTo(width/2,2.85);
      for(let k=0;k<=16;k++){const u=width/2-width*k/16;shape.lineTo(u,2.85+.48*Math.sqrt(Math.max(0,1-(u/(width/2))**2)));}
      shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:false,steps:1});g.translate(x,y,z-.16);m.put(g,'#d6d7ca',false,true);
      const f=facing>0?m.facade([x1,z+.18],[x2,z+.18],y):m.facade([x2,z-.18],[x1,z-.18],y);
      f.panel(width/2,4.05,.02,width+.16,.13,.45,'#e5e4d7');
      if(title==='34')f.label('I.S. EDITURA STATISTICA',width/2,3.66,.135,'#345674');
      yield;
    });
  }

  // No legacy body disappears before the replacement volume AND collider exist.
  const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true;
  const ids=[...new Set(buildings.flatMap(b=>b.nativeIds))];
  const replacements=[
    ...ids.map(id=>({id,x:915,z:469,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),
    ...buildings.map((b,i)=>({id:-5100000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}}))
  ];
  const treeOverrides:{x:number;z:number;height:number;radius:number;texture:number;readonly ready:boolean}[]=[];
  // Retire the old procedural street row only after its local tree/detail jobs
  // are ready. Trees remain resident, so a later ground-cell eviction must not
  // reactivate the old row underneath them.
  for(let x=806;x<1026;x+=5.5)for(const z of[461.4,475.7])treeOverrides.push({x,z,height:0,radius:3.3,texture:0,get ready(){return m.readyNear(x,z,16);}});
  for(const [x,z,h,r] of realm.trees)treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,16);}});
  const layers=[bodies,m,l];
  return {
    objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,
    get ready(){return layers.every(v=>v.ready);},
    readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},
    update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},
    dispose(){for(const v of layers)v.dispose();crown.dispose();trunk.dispose();}
  };
}
