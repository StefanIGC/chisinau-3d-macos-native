import * as T from 'three';
import realm from '../data/bucuresti-bu04.json';
import catalog from '../data/bucuresti-bu04-buildings.json';
import {createPhotoFrontages, type PhotoBuilding} from './central-infill';
import {streetMesh, streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {bucurestiBu04Architecture} from './bucuresti-bu04-architecture';
import type {XY} from './city-layout';

type CorrectedSportsOutline={id:number;pitchIds:number[];p:XY[];holes:XY[][];requiredNewCells:XY[];requiredPreviousCells:XY[];evidence:string};

/** Tighina–Ismail: official complete bodies and dated observations. Heights,
 * small object positions and hidden elevations remain estimates. The prior
 * BUC03 layer retains ownership; one misclassified native tennis outline is
 * retired only when its full replacement ground, including BUC03, is ready. */
export function createBucurestiBu04(scene:T.Scene, ground:(x:number,z:number)=>number, loaded:(x:number,z:number)=>boolean, priorReady:(x:number,z:number,r:number)=>boolean=()=>false) {
  const buildings=catalog as unknown as (PhotoBuilding & {nativeIds:number[]})[];
  const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false})),'București BUC04 · corpuri cadastrale');
  const m=streetMesh(scene,'București BUC04 · detalii',ground,loaded);
  const d=bucurestiBu04Architecture(m,ground),a=d.a;
  const l=landscapeLayer(scene,'București BUC04 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
  const sportsMarks=streetMesh(scene,'București BUC04 · marcaje sportive pe solul păstrat',ground,loaded);
  const sports=(realm as unknown as {correctedNativeSportsOutline?:CorrectedSportsOutline}).correctedNativeSportsOutline;
  const sportsCells=sports?.requiredNewCells.map(([x,z])=>realm.cells.findIndex(c=>c.x===x&&c.z===z))??[];
  const sportsDecals=(realm as unknown as {sportsLineDecals?:{rings:number[][][];color:string}[]}).sportsLineDecals??[];
  const sportsCoverageReady=()=>!!sports&&sportsCells.length>0&&sportsCells.every(i=>i>=0&&l.objects[i].visible&&l.collisionObjects[i].userData.grounded===true)
    &&sports.requiredPreviousCells.length>0&&sports.requiredPreviousCells.every(([x,z])=>priorReady(x,z,1));
  for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
    for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);
  },c.coverage);
  // These are only the independently sourced portions of court lines above
  // BUC03's retained floor. They do not take ground ownership or add collision.
  for(const [i,paint]of sportsDecals.entries())sportsMarks.job('linie '+i,paint.rings[0] as XY[],[],function*(){
    const shape=new T.Shape();paint.rings[0].forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    for(const ring of paint.rings.slice(1)){const hole=new T.Path();ring.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();shape.holes.push(hole);}
    const source=new T.ShapeGeometry(shape);source.rotateX(-Math.PI/2);const flat=source.index?source.toNonIndexed():source.clone(),v=flat.attributes.position,out:number[]=[];
    function triangle(a:XY,b:XY,c:XY,depth=0){
      const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);
      if(depth<12&&Math.max(ab,bc,ca)>2.5){
        if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];triangle(a,p,c,depth+1);triangle(p,b,c,depth+1);}
        else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];triangle(a,b,p,depth+1);triangle(a,p,c,depth+1);}
        else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];triangle(a,b,p,depth+1);triangle(p,b,c,depth+1);}return;
      }
      for(const[x,z]of[a,b,c])out.push(x,0,z);
    }
    for(let k=0;k<v.count;k+=3)triangle([v.getX(k),v.getZ(k)],[v.getX(k+1),v.getZ(k+1)],[v.getX(k+2),v.getZ(k+2)]);
    source.dispose();flat.dispose();
    for(let k=0;k<out.length;k+=3){out[k+1]=ground(out[k],out[k+2])+.055;if(k%192===189)yield;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();sportsMarks.put(g,paint.color,false,false);
  });

  for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
    const y=ground(...b.anchor as XY)+.12;
    for(const f of a.faces(b.p as XY[],y)){
      if(f.len<.65)continue;
      if(d.handles(b,f)){yield* d.detail(b,f);continue;}
      a.cornice(f,b.height,b.trim);
      if(b.style==='annex'){
        if(b.height>2&&f.len>9){f.window(f.len*.5,1.65,.8,1.0,b.trim,'#737c71');yield;}
      }else{
        // Unseen side/rear openings are limited estimates, not additional
        // photographed street entrances. Courtyard functions remain intact.
        yield* a.windows(f,b.levels,b.height,Math.max(1,Math.round(f.len/5.4)),1.55,b.trim,'#788178');
      }
      yield;
    }
  });

  const crown=new T.IcosahedronGeometry(1,1),trunk=new T.CylinderGeometry(.52,1,1,7);
  const treeForms=new Map(realm.treeForms.map(t=>[t.point.join('/'),t.form]));
  for(const [index,[x,z,h,r]] of realm.trees.entries())m.job('arbore individual',streetRect(x,z,r*2,r*2),[],function*(){
    const y=ground(x,z),pollarded=treeForms.get([x,z].join('/'))==='pollarded';
    const stem=pollarded?.23:h<5?.12:.29,stemHeight=pollarded?h*.79:h*.52;
    const g=trunk.clone();g.scale(stem,stemHeight,stem);g.translate(x,y+stemHeight/2,z);m.put(g,'#77796c',false,true);
    if(pollarded){
      // Two recorded heavily pruned trunks: short branch stubs, no invented
      // full crown. Their shapes and metric dimensions remain estimates.
      for(const [dx,dz,dy]of[[-.48,.20,.95],[.42,-.24,1],[-.13,-.42,.91]]){
        m.beam(new T.Vector3(x,y+h*.61,z),new T.Vector3(x+dx,y+h*dy,z+dz),.085,'#77796c',false);yield;
      }
      return;
    }
    const lobes=h<5?[[0,0,.70,r],[.15,-.1,.86,r*.72]]:[[0,0,.62,r],[r*.43,.2,.76,r*.70],[-r*.31,-.35,.83,r*.64],[.2,-.1,.94,r*.43]];
    for(const [dx,dz,dy,rr]of lobes){const g=crown.clone();g.scale(rr,rr*(.95+(index%3)*.12),rr*.96);g.rotateY(index*.47);g.translate(x+dx,y+h*dy,z+dz);m.put(g,['#6e8457','#7b8b59','#657c51','#7c8758'][index%4]);yield;}
  });

  // OSM lamp positions plus the close north-side pair seen in the 2025 view.
  // Pole profiles, arm sizes and cable elevations are photographic estimates.
  for(const [x,z]of realm.poles)m.job('stâlp și iluminat',streetRect(x,z,2,2),[],function*(){
    const y=ground(x,z),direction=z>469?-1:1;
    const pole=new T.CylinderGeometry(.105,.18,8.2,9);pole.translate(x,y+4.1,z);m.put(pole,'#a6aaa0',false,true);
    m.beam(new T.Vector3(x,y+7.65,z),new T.Vector3(x,y+8.0,z+direction*1.9),.04,'#879084');
    m.box(x,y+7.98,z+direction*1.9,.27,.12,.75,'#d1d3c9');
    const loop=new T.TorusGeometry(.25,.018,4,14);loop.translate(x,y+5.2,z);m.put(loop,'#454d45',true);yield;
  });
  for(let x=1241;x<1468;x+=12)m.job('București · fire de contact',[[x,466],[Math.min(1468,x+12),470]],[],function*(){
    for(const z of[466.1,469.1])m.beam(new T.Vector3(x,ground(x,z)+6.3,z),new T.Vector3(Math.min(1468,x+12),ground(Math.min(1468,x+12),z)+6.3,z),.014,'#505950');yield;
  });
  for(const[x,z]of realm.poles.filter(p=>p[0]<1409))m.job('București · cablu transversal',[[x,z],[x,477]],[],function*(){
    m.beam(new T.Vector3(x,ground(x,z)+6.8,z),new T.Vector3(x,ground(x,477)+6.3,477),.012,'#505950');yield;
  });
  for(let z=426;z<515;z+=12)m.job('Ismail · cabluri și racorduri',[[1417.5,z],[1420.5,Math.min(515,z+12)]],[],function*(){
    for(const x of[1417.5,1420.5])m.beam(new T.Vector3(x,ground(x,z)+6.45,z),new T.Vector3(x,ground(x,Math.min(515,z+12))+6.45,Math.min(515,z+12)),.014,'#505950');yield;
  });

  // Eight plates and four road signal heads correspond to the four observed
  // crossing arms. Supports stay off the route axes; their exact offsets are
  // estimates. Decorative light lenses do not alter existing vehicle logic.
  const signPositions:[number,number,number][]=[
    [1406.4,460.2,Math.PI/2],[1406.4,476.8,-Math.PI/2],
    [1434.5,460.9,-Math.PI/2],[1434.6,476.7,Math.PI/2],
    [1410.7,454.8,0],[1427.3,454.8,Math.PI],
    [1410.2,482.1,0],[1430.0,482.1,Math.PI]
  ];
  for(const[x,z,rotation]of signPositions)m.job('Ismail · semnalizarea trecerii',streetRect(x,z,1,1),[],function*(){
    const y=ground(x,z);m.box(x,y+1.70,z,.075,3.4,.075,'#879184',false,true);
    const f=m.facade([x-.42*Math.cos(rotation),z+.42*Math.sin(rotation)],[x+.42*Math.cos(rotation),z-.42*Math.sin(rotation)],y);
    f.panel(.42,2.85,.04,.74,.80,.045,'#c9ce48');f.panel(.42,2.85,.075,.57,.63,.035,'#357a9c');
    const pts=[[-.23,-.23],[.23,-.23],[0,.25]].map(([u,v])=>{const p=f.at(.42+u,.10);return[p[0],y+2.85+v,p[1]];});
    const tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute(pts.flat(),3));tri.computeVertexNormals();m.put(tri,'#e6e8db',true);
    f.panel(.42,2.82,.12,.045,.25,.02,'#3e5360',true);f.panel(.42,2.70,.12,.24,.035,.02,'#3e5360',true);
    const p=f.at(.42,.13);m.box(p[0],y+2.05,p[1],.19,.43,.17,'#252c29',false,false,-rotation);
    for(const[dy,col]of[[.10,'#993c36'],[-.10,'#4c7453']]as[number,string][]){const q=f.at(.42,.23),g=new T.CircleGeometry(.055,8);g.rotateY(rotation);g.translate(q[0],y+2.05+dy,q[1]);m.put(g,col,true);}
    yield;
  });
  for(const[x,z,rotation]of[[1408.6,459.4,0],[1430.5,459.4,Math.PI],[1409.4,477.7,Math.PI/2],[1430.3,477.0,-Math.PI/2]])m.job('Ismail · semafor rutier',streetRect(x,z,1,1),[],function*(){
    const y=ground(x,z);m.box(x,y+2.15,z,.10,4.3,.10,'#6b766c',false,true);
    const f=m.facade([x-.2*Math.cos(rotation),z+.2*Math.sin(rotation)],[x+.2*Math.cos(rotation),z-.2*Math.sin(rotation)],y);
    f.panel(.2,3.65,.16,.30,.95,.23,'#292e2b');
    for(const[dy,col]of[[.30,'#984a3c'],[0,'#9b8d46'],[-.30,'#5d7d55']]as[number,string][]){const p=f.at(.2,.29),g=new T.CircleGeometry(.095,10);g.rotateY(rotation);g.translate(p[0],y+3.65+dy,p[1]);m.put(g,col,true);}
    yield;
  });

  // The observed enclosure is continuous. Gate leaves, where confirmed, are
  // supplied only by courtyard-gates. The mural is represented by broad muted
  // colour fields; no unseen figurative artwork or wording is invented.
  for(const wall of realm.closedFrontages){
    const p=wall.a as XY,q=wall.b as XY,len=Math.hypot(q[0]-p[0],q[1]-p[1]),count=Math.ceil(len/5.6);
    const ux=(q[0]-p[0])/len,uz=(q[1]-p[1])/len,angle=-Math.atan2(uz,ux);
    for(let k=0;k<count;k++){
      const start:XY=[p[0]+ux*len*k/count,p[1]+uz*len*k/count],end:XY=[p[0]+ux*len*(k+1)/count,p[1]+uz*len*(k+1)/count];
      m.job(wall.name+' · travee '+(k+1),[start,end],[],function*(){
        const x=(start[0]+end[0])/2,z=(start[1]+end[1])/2,y=ground(x,z),w=len/count,h=wall.height;
        if(!/mural/i.test(wall.name)){
          m.box(x,y+h/2+.035,z,w,h,.28,'#c5c4af',false,true,angle);
          m.box(x,y+h+.085,z,w,.12,.38,'#b4b49e',false,true,angle);
          const face=m.facade(start,end,y);
          for(const[j,height]of[.62,1.22,1.65].entries())face.panel(w*(.22+j*.28),height,.155,w*(j===1?.26:.19),.24,.028,['#b2b39e','#d0cbb6','#bcbba5'][j],true);
          // Four irregular ivy masses only on the independently observed
          // north wall, never on the short estimated gate connections.
          const ivyWall=len>9&&Math.min(p[0],q[0])>1304.7&&Math.max(p[0],q[0])<1316.4&&Math.abs(z-458.4)<.2;
          if(ivyWall)for(const fraction of[.24,.76]){
              const xx=start[0]+(end[0]-start[0])*fraction,zz=start[1]+(end[1]-start[1])*fraction,g=crown.clone();
              g.scale(.96+(k%2)*.24,.36+(fraction-.2)*.16,.44);g.rotateY(k*.71+fraction);g.translate(xx,ground(xx,zz)+h+.20,zz+.03);m.put(g,k%2?'#687b51':'#5d744c');
            }
          yield;return;
        }
        m.box(x,y+.75,z,w,1.5,.30,'#aaa999',false,true,angle);
        m.box(x,y+.17,z,w,.30,.34,'#898d7d',false,true,angle);
        const front=m.facade(end,start,y);
        const colors=['#ad9b76','#7e9c92','#ae8575','#99977e','#719296','#a4a584'];
        for(let panel=0;panel<3;panel++)front.panel(w*(panel+.5)/3,.88,.17,w/3-.06,1.05,.028,colors[(k+panel)%colors.length]);
        m.box(x,y+1.54,z,w,.10,.39,'#c1bfac',false,true,angle);
        for(const fraction of[.68,.95])m.box(x,y+h*fraction,z,w,.055,.065,'#5a6257',false,true,angle);
        const bars=Math.max(2,Math.floor(w/.24));
        for(let j=1;j<bars;j++){
          const xx=start[0]+(end[0]-start[0])*j/bars,zz=start[1]+(end[1]-start[1])*j/bars,yy=ground(xx,zz);
          m.box(xx,yy+1.99,zz,.026,.77,.026,'#5a6257',true,true);if(j%5===0)yield;
        }
        for(const point of k===count-1?[start,end]:[start]){
          const yy=ground(...point);m.box(point[0],yy+h/2+.035,point[1],.37,h,.43,'#a8aa9a',false,true,angle);
          m.box(point[0],yy+h+.085,point[1],.47,.10,.51,'#c7c4af',false,true,angle);
        }
        yield;
      });
    }
  }

  m.job('Ismail sud-vest · panou publicitar observat',streetRect(1409.2,478.0,5.0,.50),[],function*(){
    const x=1409.2,z=478.0,y=ground(x,z);
    for(const dx of[-2.05,2.05])m.box(x+dx,y+2.75,z,.13,5.5,.15,'#646c60',false,true);
    m.box(x,y+5.1,z,5.0,2.2,.18,'#646e61');
    m.box(x,y+5.1,z-.105,4.81,2.01,.035,'#a8b09c');yield;
  });
  // Two round covers are visible in the Ismail 315° panorama. Their metric
  // positions and diameters are estimates; they do not imply a utility grid.
  for(const[x,z,r]of[[1407.9,477.6,.30],[1410.5,479.2,.35]])m.job('Ismail sud-vest · capac rotund fotografiat',streetRect(x,z,1,1),[],function*(){
    const y=ground(x,z)+.055,g=new T.CylinderGeometry(r,r,.02,16);g.translate(x,y,z);m.put(g,'#6c7467');
    for(let dz=-r*.6;dz<=r*.6;dz+=.10)m.box(x,y+.012,z+dz,Math.sqrt(r*r-dz*dz)*1.7,.008,.016,'#959b8a',true);
    yield;
  });

  // Public retirement follows completed real geometry. The two photographed
  // open tennis courts are not a new FNDG building; their misclassified native
  // volume waits for both the new and the retained BUC03 ground owners.
  const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true;
  const retainedNative=new Set([...realm.preservedNativeOSMIds,...(sports?.pitchIds??[])]);
  const ids=[...new Set(buildings.flatMap(b=>b.nativeIds))].filter(id=>!retainedNative.has(id)&&id!==sports?.id);
  const replacements=[
    ...ids.map(id=>({id,x:1334,z:469,radius:0,get ready(){return buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i));}})),
    ...buildings.map((b,i)=>({id:-5300000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i);}})),
    ...(sports?[{id:sports.id,x:1249,z:506,radius:0,get ready(){
      return sportsCoverageReady()&&sportsMarks.ready;
    }}]:[])
  ];
  const treeOverrides:{x:number;z:number;height:number;radius:number;texture:number;readonly ready:boolean}[]=[];
  // Tree jobs stay resident while the ground cells can evict. Their actual
  // completion, rather than ground residency, controls native tree removal.
  for(let x=1241;x<1468;x+=5.5)for(const z of[461.4,475.7])treeOverrides.push({x,z,height:0,radius:3.3,texture:0,get ready(){return m.readyNear(x,z,16);}});
  for(const[x,z,,r]of realm.trees)treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,16);}});
  const instanceOverrides:never[]=[];
  const layers=[bodies,m,l];
  return{
    objects:[...layers.flatMap(v=>v.objects),...sportsMarks.objects],collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,instanceOverrides,
    entryRoutes:()=>d.entryRoutes(),
    thresholdRoutes:()=>d.thresholdRoutes(),
    get ready(){return layers.every(v=>v.ready)&&sportsMarks.ready;},
    readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r))&&sportsMarks.readyNear(x,z,r);},
    update(camera:T.PerspectiveCamera,now:number){
      for(const v of layers)v.update(camera,now);
      const show=sportsCoverageReady();
      if(show)sportsMarks.update(camera,now);
      for(const[i,object]of sportsMarks.objects.entries())object.visible=show&&sportsMarks.collisionObjects[i].userData.grounded===true;
    },
    dispose(){for(const v of layers)v.dispose();sportsMarks.dispose();crown.dispose();trunk.dispose();}
  };
}
