import * as T from 'three';
import realm from '../data/bucuresti-bu05.json';
import catalog from '../data/bucuresti-bu05-buildings.json';
import {createPhotoFrontages, type PhotoBuilding} from './central-infill';
import {streetMesh, streetRect} from './street-mesh';
import {landscapeLayer} from './landscape-layer';
import {bucurestiBu05Architecture} from './bucuresti-bu05-architecture';
import type {XY} from './city-layout';

type PhotoStructure={id:string;name:string;p:XY[];holes:XY[][];height:number;roofRise:number;nativeOwnerId?:number};
type ClosedFrontage={name:string;a:XY;b:XY;height:number;color?:string;material?:string;kind?:string};
type SeamTransition={axis:string;start:number;end:number;bounds:number[];pedestrian:number[];kerb:number[];carriageway:number[]};
type NativeDependency={id:number;priorSector:string;priorBodyId:string;point:XY;radius:number};
type HeightProfile={id:string;bounds:number[];rise:number;rampStart:number;rampEnd:number;plateauEnd:number;fadeSouthEnd:number;fadeWest:number[];fadeEast:number[]};

/** Ismail–Lev Tolstoi. Official building polygons remain distinct from the
 * photograph-only kiosk and from parcel/address evidence. Elevation and street
 * furniture dimensions are estimates from the dated views. Native ownership
 * changes only after the complete visible geometry and collider are ready. */
export function createBucurestiBu05(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean,priorReady:(x:number,z:number,r:number)=>boolean=()=>false){
  const buildings=catalog as unknown as (PhotoBuilding & {nativeIds:number[]})[];
  const extra=realm as unknown as {photoOnlyStructures?:PhotoStructure[];closedFrontages:ClosedFrontage[];treeForms?:{point:number[];form:string}[];nativeReplacementDependencies?:NativeDependency[];heightProfiles?:HeightProfile[];photoPoles?:{point:XY;height:number}[]};
  const clamp=(n:number)=>T.MathUtils.clamp(n,0,1);
  function surfaceGround(x:number,z:number){
    let rise=0;
    for(const p of extra.heightProfiles??[]){
      if(x<p.bounds[0]||x>p.bounds[2]||z<p.bounds[1]||z>p.bounds[3])continue;
      rise+=p.rise*clamp((z-p.rampStart)/(p.rampEnd-p.rampStart))*clamp((p.fadeSouthEnd-z)/(p.fadeSouthEnd-p.plateauEnd))*clamp((x-p.fadeWest[0])/(p.fadeWest[1]-p.fadeWest[0]))*clamp((p.fadeEast[1]-x)/(p.fadeEast[1]-p.fadeEast[0]));
    }
    return ground(x,z)+rise;
  }
  const m=streetMesh(scene,'București BUC05 · detalii',ground,loaded);
  const architecture=bucurestiBu05Architecture as (mesh:typeof m,ground:(x:number,z:number)=>number,surface?:(x:number,z:number)=>number)=>ReturnType<typeof bucurestiBu05Architecture>&{customRoof?:(b:PhotoBuilding)=>boolean;detailExtra?:(b:PhotoBuilding)=>Generator<void>};
  const d=architecture(m,ground,surfaceGround),a=d.a;
  const customRoof=(b:PhotoBuilding)=>d.customRoof?.(b)??false;
  const bodies=createPhotoFrontages(scene,ground,loaded,buildings.map(b=>({...b,facades:false,roofRise:customRoof(b)?0:b.roofRise,parts:customRoof(b)?b.parts?.map(part=>({...part,roofRise:0})):b.parts})),'București BUC05 · corpuri cadastrale');
  const l=landscapeLayer(scene,'București BUC05 · spațiu public',ground,loaded,{maxEdge:3,residentDistance:700});
  const transition=realm.seamHeightTransition as SeamTransition;
  function offset(p:{raised:boolean;role:string},x:number,z:number){
    const basic=p.raised?.14:.035,[minX,minZ,maxX,maxZ]=transition.bounds;
    if(x<minX-.001||x>maxX+.001||z<minZ-.001||z>maxZ+.001)return basic;
    const pair=p.role==='pedestrian'?transition.pedestrian:p.role==='kerb'?transition.kerb:transition.carriageway;
    const t=T.MathUtils.clamp((z-transition.start)/(transition.end-transition.start),0,1);
    return pair[0]+(pair[1]-pair[0])*t;
  }
  for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){
    for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>surfaceGround(x,z)+offset(p,x,z),true);
  },c.coverage);

  for(const b of buildings)m.job(b.title,b.p as XY[],[],function*(){
    const y=ground(...b.anchor as XY)+.12;
    for(const f of a.faces(b.p as XY[],y)){
      if(f.len<.65)continue;
      const p=f.at(0),q=f.at(f.len);
      // This official outline contacts the complete retained BUC04 body.
      // The volume's parts are partitioned upstream; no estimated detail is
      // placed over the shared western face (0.30314 square metres in plan).
      if(b.id.startsWith('cladiri.12340/')&&Math.max(p[0],q[0])<1473.5&&Math.max(p[1],q[1])>500.52&&Math.min(p[1],q[1])<508.31)continue;
      if(d.handles(b,f)){yield* d.detail(b,f);continue;}
      if(b.style==='unconfirmedFront'){yield;continue;}
      a.cornice(f,b.height,b.trim);
      if(b.style==='annex'){
        if(b.height>2&&f.len>9){f.window(f.len*.5,1.65,.8,1.0,b.trim,'#737c71');yield;}
      }else{
        // Unseen side/rear openings are limited estimates. They are never
        // registered as a photographed public entrance or an interior route.
        yield* a.windows(f,b.levels,b.height,Math.max(1,Math.round(f.len/5.4)),1.55,b.trim,'#788178');
      }
      yield;
    }
    if(d.detailExtra)yield* d.detailExtra(b);
  });

  const photoOwners=new Map<string,number>();
  for(const kiosk of extra.photoOnlyStructures??[]){
    photoOwners.set(kiosk.id,m.objects.length);
    m.job(kiosk.name,kiosk.p,[],function*(){
      const xs=kiosk.p.map(p=>p[0]),zs=kiosk.p.map(p=>p[1]);
      const left=Math.min(...xs),right=Math.max(...xs),front=Math.max(...zs),back=Math.min(...zs);
      const x=(left+right)/2,z=(front+back)/2,y=surfaceGround(x,z)+.035,w=right-left,depth=front-back;
      // Estimated photographed structure, not an official cadastral record.
      m.solid(kiosk.p,kiosk.height+1.5,y-1.5,'#d9dacf',true,kiosk.holes);yield;
      m.box(x,y+.24,front+.04,w,.48,.11,'#929487',false,true);
      const f=m.facade([left,front],[right,front],y);
      for(let u=.12;u<w;u+=.10){f.panel(u,1.76,.065,.018,2.49,.026,'#bfc4b9',true);if(Math.round(u/.10)%10===0)yield;}
      // One brown-framed window and a blank raised metal fascia are visible.
      // No unobserved entrance, sign wording or utility function is invented.
      f.panel(w*.59,1.55,.12,1.54,1.08,.055,'#59665f',false,1);
      for(const u of[w*.59-.79,w*.59+.79])f.panel(u,1.55,.16,.075,1.20,.09,'#54463b');
      for(const h of[.97,2.13])f.panel(w*.59,h,.16,1.66,.075,.09,'#54463b');
      f.panel(w*.59,1.55,.18,.07,1.13,.07,'#54463b');
      m.box(x,y+kiosk.height+kiosk.roofRise/2,z,w+.12,kiosk.roofRise,depth+.12,'#909b8c');
      m.box(x+w*.19,y+kiosk.height+.36,front-.05,w*.58,.69,.16,'#d2d5cb');
      for(let u=.10;u<w*.58;u+=.09){
        m.box(x-w*.10+u,y+kiosk.height+.36,front+.045,.012,.64,.020,'#b5bdb2',true);if(Math.round(u/.09)%10===0)yield;
      }
      for(let u=.20;u<w;u+=.48)f.panel(u,.23,.108,.31,.13,.035,u%1>.5?'#a8a997':'#818b7c',true);
      yield;
    });
  }

  const crown=new T.IcosahedronGeometry(1,1),trunk=new T.CylinderGeometry(.52,1,1,7);
  const treeForms=new Map((extra.treeForms??[]).map(t=>[t.point.join('/'),t.form]));
  for(const[index,[x,z,h,r]]of realm.trees.entries())m.job('arbore individual',streetRect(x,z,r*2,r*2),[],function*(){
    const y=surfaceGround(x,z),pollarded=treeForms.get([x,z].join('/'))==='pollarded';
    const stem=pollarded?.23:h<5?.12:.29,stemHeight=pollarded?h*.79:h*.52;
    const g=trunk.clone();g.scale(stem,stemHeight,stem);g.translate(x,y+stemHeight/2,z);m.put(g,'#77796c',false,true);
    if(pollarded){
      for(const[dx,dz,dy]of[[-.48,.20,.95],[.42,-.24,1],[-.13,-.42,.91]]){m.beam(new T.Vector3(x,y+h*.61,z),new T.Vector3(x+dx,y+h*dy,z+dz),.085,'#77796c',false);yield;}
      return;
    }
    const lobes=h<5?[[0,0,.70,r],[.15,-.1,.86,r*.72]]:[[0,0,.62,r],[r*.43,.2,.76,r*.70],[-r*.31,-.35,.83,r*.64],[.2,-.1,.94,r*.43]];
    for(const[dx,dz,dy,rr]of lobes){const g=crown.clone();g.scale(rr,rr*(.95+(index%3)*.12),rr*.96);g.rotateY(index*.47);g.translate(x+dx,y+h*dy,z+dz);m.put(g,['#6e8457','#7b8b59','#657c51','#7c8758'][index%4]);yield;}
  });

  // Mapped positions have been checked against the carriageway. The five
  // unconfirmed nodes inside it remain provenance only, not invisible posts.
  for(const[x,z]of realm.poles)m.job('stâlp și iluminat',streetRect(x,z,2,2),[],function*(){
    const y=surfaceGround(x,z),direction=z>469?-1:1;
    const pole=new T.CylinderGeometry(.105,.18,8.2,9);pole.translate(x,y+4.1,z);m.put(pole,'#a7aaa4',false,true);
    const arm=[new T.Vector3(x,y+7.60,z),new T.Vector3(x,y+8.08,z+direction*.55),new T.Vector3(x,y+8.18,z+direction*1.35),new T.Vector3(x,y+8.08,z+direction*2.05)];
    const curved=new T.TubeGeometry(new T.CatmullRomCurve3(arm),10,.038,5,false);m.put(curved,'#9da49b');
    m.box(x,y+8.02,z+direction*2.05,.26,.12,.73,'#c7d0c2');
    // The horizontal trolley-wire console is visible on the large gray poles.
    m.beam(new T.Vector3(x,y+6.94,z),new T.Vector3(x,y+6.91,z+direction*5.1),.055,'#7b857a',false);
    for(const t of[2.0,3.7,4.9])m.beam(new T.Vector3(x,y+6.92,z+direction*t),new T.Vector3(x,y+6.30,z+direction*t),.019,'#566151');
    yield;
  });
  for(const pole of extra.photoPoles??[])m.job('Lev Tolstoi · stâlp subțire fotografiat',streetRect(...pole.point,1,1),[],function*(){
    const[x,z]=pole.point,y=surfaceGround(x,z),h=pole.height;
    const g=new T.CylinderGeometry(.055,.085,h,8);g.translate(x,y+h/2,z);m.put(g,'#929d90',false,true);
    m.beam(new T.Vector3(x,y+h-.15,z),new T.Vector3(x+.85,y+h+.10,z),.025,'#879481',false);
    m.box(x+.87,y+h+.05,z,.48,.10,.24,'#c5cebd');yield;
  });
  // Contact wires follow the reconstructed axis. Their western endpoints are
  // identical to BUC04, so a sector boundary is not a break in the wire.
  const axis=realm.roadAxes.bucuresti;
  function roadCenter(x:number){
    for(let i=1;i<axis.length;i++)if(x<=axis[i][0]){const p=axis[i-1],q=axis[i],t=(x-p[0])/(q[0]-p[0]);return p[1]+(q[1]-p[1])*t;}
    return axis.at(-1)![1];
  }
  function wireZ(x:number,v:number){return v+(roadCenter(x)-roadCenter(1468));}
  for(let x=1468;x<1615;x+=12)m.job('București · fire de contact',[[x,465],[Math.min(1615,x+12),477]],[],function*(){
    const end=Math.min(1615,x+12);
    for(const v of[466.1,469.1]){const z=wireZ(x,v),zz=wireZ(end,v);m.beam(new T.Vector3(x,ground(x,z)+6.3,z),new T.Vector3(end,ground(end,zz)+6.3,zz),.014,'#505950');}
    yield;
  });
  for(const[x,z]of realm.poles)m.job('București · fir de susținere',[[x,z],[x,roadCenter(x)]],[],function*(){
    const zz=roadCenter(x);m.beam(new T.Vector3(x,surfaceGround(x,z)+6.96,z),new T.Vector3(x,ground(x,zz)+6.3,zz),.012,'#505950');yield;
  });

  function crossingPlate(x:number,z:number,rotation:number,ownPost:boolean){
    m.job('Lev Tolstoi · indicator de trecere observat',streetRect(x,z,1,1),[],function*(){
      const y=surfaceGround(x,z);if(ownPost)m.box(x,y+1.65,z,.075,3.3,.075,'#868f82',false,true);
      const f=m.facade([x-.4*Math.cos(rotation),z+.4*Math.sin(rotation)],[x+.4*Math.cos(rotation),z-.4*Math.sin(rotation)],y);
      f.panel(.4,2.75,.09,.77,.82,.05,'#d6d754');f.panel(.4,2.75,.13,.57,.65,.035,'#286c99');
      const vertices=[[-.22,-.21],[.22,-.21],[0,.24]].flatMap(([u,v])=>{const p=f.at(.4+u,.16);return[p[0],y+2.75+v,p[1]];});
      const tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute(vertices,3));tri.computeVertexNormals();m.put(tri,'#e5e9db',true);
      f.panel(.4,2.73,.18,.04,.24,.02,'#384e5d',true);f.panel(.4,2.62,.18,.23,.035,.02,'#384e5d',true);yield;
    });
  }
  // Only independently visible signs are authored; the three zebras do
  // not imply an invented pair of signposts at every crossing.
  crossingPlate(1549.1564,476.3272,Math.PI/2,false);
  crossingPlate(1555.9,462.6,-Math.PI/2,true);
  crossingPlate(1561.35,481.05,0,true);
  m.job('București sud · prioritate pe stâlpul existent',streetRect(1524.43181,476.03248,1,1),[],function*(){
    const x=1524.43181,z=476.03248,y=surfaceGround(x,z);
    for(const[size,dx,color]of[[.67,-.19,'#59665b'],[.61,-.215,'#e5e7d9'],[.46,-.24,'#dbb94e']]as[number,number,string][]){
      const g=new T.BoxGeometry(size,size,.024);g.rotateZ(Math.PI/4);g.rotateY(-Math.PI/2);g.translate(x+dx,y+2.72,z);m.put(g,color);
    }
    yield;
  });
  m.job('Lev Tolstoi sud-vest · acces interzis observat',streetRect(1560.7,480.15,1,1),[],function*(){
    const x=1560.7,z=480.15,y=surfaceGround(x,z);m.box(x,y+1.67,z,.075,3.34,.075,'#8b9387',false,true);
    const g=new T.CylinderGeometry(.33,.33,.045,20);g.rotateX(Math.PI/2);g.translate(x,y+2.90,z);m.put(g,'#bc4d42');
    m.box(x,y+2.90,z+.034,.48,.11,.026,'#eeeadd');yield;
  });
  m.job('Lev Tolstoi sud-vest · plăcuță stradală',streetRect(1558.85,478.70,1.4,1),[],function*(){
    const x=1558.85,z=478.70,y=surfaceGround(x,z),pole=new T.CylinderGeometry(.045,.055,3.5,8);pole.translate(x,y+1.75,z);m.put(pole,'#7a857b',false,true);
    const cap=new T.SphereGeometry(.085,8,6);cap.translate(x,y+3.56,z);m.put(cap,'#ba9f52');
    const f=m.facade([x-.63,z],[x+.63,z],y);f.panel(.63,3.03,.04,1.22,.40,.065,'#596c5b');f.label('STR. BUCUREȘTI',.63,2.98,.095,'#e4e1d1',.085);yield;
  });

  // Square beige planters with rounded clipped shrubs are visible in the
  // July2025 forecourt. Their dimensions and exact centres are estimated.
  for(const[x,z]of[[1537.85,459.75],[1541.85,459.80],[1546.20,459.80],[1550.30,459.65],[1554.25,459.20]])m.job('București2/1 · jardinieră observată',streetRect(x,z,1.0,1.0),[],function*(){
    const y=surfaceGround(x,z)+.035;m.box(x,y+.30,z,.75,.60,.75,'#c3b092',false,true);
    m.box(x,y+.605,z,.64,.025,.64,'#5f6550');
    const plant=crown.clone();plant.scale(.48,.45,.46);plant.rotateY(x*.31);plant.translate(x,y+1.00,z);m.put(plant,'#71824f');yield;
  });
  // The two small pots sit against the Siopi facade, on its raised landing.
  // They leave the independently recorded lateral approaches unobstructed.
  for(const[x,z]of[[1483.40,458.91],[1483.95,458.91]])m.job('Siopi · jardinieră mică pe platformă',streetRect(x,z,.34,.34),[],function*(){
    const y=surfaceGround(x,460.1)+.425;m.box(x,y+.16,z,.32,.32,.32,'#c7b99d',false,true);
    m.box(x,y+.325,z,.27,.015,.27,'#58644b');const plant=crown.clone();plant.scale(.18,.23,.18);plant.translate(x,y+.52,z);m.put(plant,'#6d8054');yield;
  });

  for(const wall of extra.closedFrontages){
    const p=wall.a,q=wall.b,len=Math.hypot(q[0]-p[0],q[1]-p[1]),count=Math.max(1,Math.ceil(len/3.6));
    const ux=(q[0]-p[0])/len,uz=(q[1]-p[1])/len,angle=-Math.atan2(uz,ux);
    for(let k=0;k<count;k++){
      const start:XY=[p[0]+ux*len*k/count,p[1]+uz*len*k/count],end:XY=[p[0]+ux*len*(k+1)/count,p[1]+uz*len*(k+1)/count];
      m.job(wall.name+' · segment '+(k+1),[start,end],[],function*(){
        const x=(start[0]+end[0])/2,z=(start[1]+end[1])/2,y=surfaceGround(x,z),w=len/count,h=wall.height,color=wall.color??'#b9baa9';
        const metal=(wall.kind??wall.material)==='metal-panel',depth=metal?.065:.26;
        const wallBox=(height:number,bottom:number,thickness:number,col:string,physical:boolean)=>{
          const g=new T.BoxGeometry(w,height,thickness,Math.max(1,Math.ceil(w)),1,1),v=g.attributes.position;
          for(let i=0;i<v.count;i++){
            const u=v.getX(i),across=v.getZ(i),xx=x+ux*u-uz*across,zz=z+uz*u+ux*across;
            v.setXYZ(i,xx,surfaceGround(xx,zz)+bottom+v.getY(i)+height/2,zz);
          }
          g.computeVertexNormals();m.put(g,col,false,physical);
        };
        wallBox(h,.035,depth,color,true);
        if(metal){
          // Photographed brown/red metal sheets use thin corrugations and a
          // plain frame, not the stone cap of the separately observed plinth.
          const f=m.facade(start,end,y+.035),rib=new T.Color(color).multiplyScalar(.83).getStyle();
          for(let u=.09;u<w;u+=.16){const p=f.at(u);f.panel(u,h/2+surfaceGround(...p)-y,.045,.018,h-.06,.023,rib,true);if(Math.round(u/.16)%8===0)yield;}
          wallBox(.045,h-.005,.085,color,false);
        }else{
          wallBox(.08,h+.035,.32,'#a4ad9d',false);
        }
        yield;
      });
    }
  }

  // The two covers and the rectangular drain are visible in the Tolstoi
  // views; exact centres, diameters and grille spacing are estimated.
  for(const[x,z,r]of[[1565.85,470.35,.31],[1561.45,474.45,.33]])m.job('Lev Tolstoi · capac circular observat',streetRect(x,z,1,1),[],function*(){
    const y=surfaceGround(x,z)+.055,g=new T.CylinderGeometry(r,r,.018,18);g.translate(x,y,z);m.put(g,'#697468');
    for(let dz=-r*.55;dz<=r*.55;dz+=.10)m.box(x,y+.011,z+dz,Math.sqrt(r*r-dz*dz)*1.65,.008,.016,'#8b9586',true);yield;
  });
  m.job('Lev Tolstoi sud-vest · grătar de scurgere observat',streetRect(1562.25,480.45,.65,.45),[],function*(){
    const x=1562.25,z=480.45,y=surfaceGround(x,z)+.055;m.box(x,y,z,.54,.025,.34,'#4c5b4e');
    for(let dx=-.21;dx<=.21;dx+=.07)m.box(x+dx,y+.017,z,.028,.012,.29,'#8a9586',true);yield;
  });

  const owner=(i:number)=>bodies.collisionObjects[i]?.userData.grounded===true&&(!customRoof(buildings[i])||m.collisionObjects[i]?.userData.grounded===true);
  const photoReady=(id:string)=>{const i=photoOwners.get(id);return i!==undefined&&m.objects[i].visible&&m.collisionObjects[i].userData.grounded===true;};
  const photographicNativeOwners=new Map<number,string[]>();
  for(const kiosk of extra.photoOnlyStructures??[]){
    const id=kiosk.nativeOwnerId??(kiosk.id==='photo-kiosk-east4'?741702736:undefined);
    if(id!==undefined)photographicNativeOwners.set(id,[...(photographicNativeOwners.get(id)??[]),kiosk.id]);
  }
  const retainedNative=new Set<number>(realm.preservedNativeOSMIds);
  const ids=[...new Set(buildings.flatMap(b=>b.nativeIds))].filter(id=>!retainedNative.has(id));
  const nativeReady=(id:number)=>buildings.every((b,i)=>!b.nativeIds.includes(id)||owner(i))&&(photographicNativeOwners.get(id)??[]).every(photoReady)&&(extra.nativeReplacementDependencies??[]).every(dep=>dep.id!==id||priorReady(...dep.point,dep.radius));
  const replacements=[
    ...ids.map(id=>({id,x:1540,z:469,radius:0,get ready(){return nativeReady(id);}})),
    // Footprint-union retirement must obey the same shared-owner dependency as
    // the explicit ID; otherwise it could hide a large native shell early.
    ...buildings.map((b,i)=>({id:-5400000-i,x:b.anchor[0],z:b.anchor[1],radius:0,footprints:[[b.p,...b.holes]],get ready(){return owner(i)&&b.nativeIds.every(nativeReady);}}))
  ];
  const treeOverrides:{x:number;z:number;height:number;radius:number;texture:number;readonly ready:boolean}[]=[];
  // Detail jobs remain resident when distant ground cells evict. Native trees
  // therefore stay retired while their actual authored replacements survive.
  for(let x=1468;x<1615;x+=5.5)for(const z of[461.4,476.5])treeOverrides.push({x,z,height:0,radius:3.2,texture:0,get ready(){return m.readyNear(x,z,16);}});
  for(const[x,z,,r]of realm.trees)treeOverrides.push({x,z,height:0,radius:r,texture:0,get ready(){return m.readyNear(x,z,16);}});
  // The surveyed2026 bus-stop node postdates the available2025 views. Its
  // native function stays active; an unconfirmed shelter is not substituted.
  const instanceOverrides:{type:'busStop';x:number;z:number;radius:number;readonly ready:boolean}[]=[];
  const layers=[bodies,m,l];
  return{
    objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements,treeOverrides,instanceOverrides,
    entryRoutes:()=>d.entryRoutes(),thresholdRoutes:()=>d.thresholdRoutes(),
    get ready(){return layers.every(v=>v.ready);},
    readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},
    update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},
    dispose(){for(const v of layers)v.dispose();crown.dispose();trunk.dispose();}
  };
}
