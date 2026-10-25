import * as T from 'three';
import {CITY_DATA,feature,centroid,pointSegmentDistance,type XY} from './city-layout';
import {streetMesh,streetRect as rect} from './street-mesh';
import realm from '../data/bodoni-ground.json';
import retainedPlans from '../data/bucuresti-bu10-retained-footprints.json';

// Columna → București, 812 m. Sources and reconstruction limits are recorded in
// docs/bodoni-references.md. All geometry stays in the shared world coordinates.
export function createBodoniDistrict(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  const mesh=streetMesh(scene,'Bodoni',ground,loaded),{job,box,put,beam,solid,surface,surfaceStaged,facade}=mesh;
  const C={stone:'#aba591',trim:'#c1c1af',ochre:'#b6a271',cream:'#bebba6',dark:'#424e48',glass:'#536968',roof:'#79786b',base:'#85867a'};
  type Face=ReturnType<typeof facade>;
  type OfficialPlan={sourceId:string;nativeId:number;p:XY[];holes:XY[][]};
  const alignedPlans=retainedPlans.buildings as unknown as Record<string,OfficialPlan>;
  function building(title:string,id:string,h:number,color:string,detail:(p:XY[],y:number,h:number)=>Generator<void>){const f=alignedPlans[id]??feature(id);
    job(title,f.p,[Number(id.slice(1))],function*(){const [x,z]=centroid(f.p),y=ground(x,z);solid(f.p,h+5,y-5,color,true,f.holes);solid(f.p,.14,y+h,C.roof,true,f.holes);yield;yield* detail(f.p,y,h);});
  }
  function cornice(f:Face,h:number){for(const [dy,thick,depth]of[[-.48,.16,.42],[-.13,.24,.66],[.13,.16,.83]])f.panel(f.len/2,h+dy,.25,f.len+.16,thick,depth,C.trim);}
  function arch(f:Face,u:number,bottom:number,w:number,h:number,color=C.glass,trim=C.trim){
    const a=f.at(u,.33),b=f.at(u+1,.33),angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]),r=w/2,shoulder=bottom+h-r,s=new T.Shape();
    s.moveTo(-r,bottom);s.lineTo(r,bottom);s.lineTo(r,shoulder);s.absarc(0,shoulder,r,0,Math.PI,false);s.closePath();
    const g=new T.ShapeGeometry(s,10);g.rotateY(angle);
    g.translate(a[0],(f as Face&{baseY?:number}).baseY??0,a[1]);put(g,color,false,false,1);
    const t=new T.TorusGeometry(r+.085,.085,4,12,Math.PI);t.rotateY(angle);const q=f.at(u,.42);t.translate(q[0],((f as Face&{baseY?:number}).baseY??0)+shoulder,q[1]);put(t,trim,true);
    for(const sign of[-1,1])f.panel(u+sign*(r+.08),bottom+(h-r)/2,.42,.15,h-r,.24,trim,true);
    f.panel(u,bottom-.08,.43,w+.33,.16,.34,trim,true);f.panel(u,bottom+(h-r)/2,.39,.055,h-r,.07,C.dark,true);
  }
  function face(a:XY,b:XY,y:number){return Object.assign(facade(a,b,y),{baseY:y});}
  function* historical(a:XY,b:XY,y:number,h:number,rows:number,bays:number,arched=false){const f=face(a,b,y),step=h/rows;
    f.panel(f.len/2,.65,.19,f.len,1.3,.39,C.base);cornice(f,h);
    for(let row=0;row<rows;row++){for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays,w=Math.min(1.8,f.len/bays*.48),bottom=1.45+row*step,hh=Math.min(2.7,step-1.2);if(arched&&(row===0||rows===1))arch(f,u,bottom,w,hh);else f.window(u,bottom+hh/2,w,hh,C.trim,'#746f5e');if(i%6===5)yield;}if(row<rows-1)f.panel(f.len/2,step*(row+1),.28,f.len,.22,.46,C.trim);yield;}
    for(const u of[.25,f.len-.25])f.panel(u,h/2,.30,.45,h,.46,C.trim);return f;
  }
  function roof(x:number,z:number,w:number,d:number,y:number,rise:number,color=C.roof){
    const p=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2]],inset=Math.min(w,d)*.42;
    const ridge=w<d?[[0,rise,-d/2+inset],[0,rise,d/2-inset]]:[[-w/2+inset,rise,0],[w/2-inset,rise,0]];
    const tris=w<d?[[p[0],p[1],ridge[0]],[p[1],p[2],ridge[1]],[p[1],ridge[1],ridge[0]],[p[2],p[3],ridge[1]],[p[3],p[0],ridge[0]],[p[3],ridge[0],ridge[1]]]:[[p[0],p[1],ridge[1]],[p[0],ridge[1],ridge[0]],[p[1],p[2],ridge[1]],[p[2],p[3],ridge[0]],[p[2],ridge[0],ridge[1]],[p[3],p[0],ridge[0]]];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(tris.map(t=>[t[2],t[1],t[0]]).flat(2),3));g.computeVertexNormals();g.translate(x,y,z);put(g,color,false,true);
  }
  function* roofOnPlan(p:XY[],holes:XY[][],y:number,rise:number,color:string|((x:number,z:number)=>string),run=6):Generator<void>{
    // The photographed hip-profile family is clipped to the exact official
    // body, including recesses. No rectangular roof bridges a courtyard.
    const shape=new T.Shape();p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
    for(const ring of holes){const path=new T.Path();ring.forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));shape.holes.push(path);}
    const source=new T.ShapeGeometry(shape);source.rotateX(-Math.PI/2);const raw=source.toNonIndexed(),v=raw.attributes.position,buckets=new Map<string,number[]>();
    const at=(q:XY)=>{let distance=Infinity;for(const ring of[p,...holes])for(let i=1;i<ring.length;i++)distance=Math.min(distance,pointSegmentDistance(q,ring[i-1],ring[i]));return[q[0],y+.14+rise*Math.min(1,distance/run),q[1]];};
    function tri(a:XY,b:XY,c:XY,depth=0){
      const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);
      if(depth<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const q:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,q,c,depth+1);tri(q,b,c,depth+1);}else if(bc>=ca){const q:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,q,depth+1);tri(a,q,c,depth+1);}else{const q:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,q,depth+1);tri(q,b,c,depth+1);}return;}
      const key=typeof color==='string'?color:color((a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3),out=buckets.get(key)??[];out.push(...at(a),...at(b),...at(c));buckets.set(key,out);
    }
    for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
    source.dispose();raw.dispose();for(const[key,vertices]of buckets){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();put(g,key,false,true);yield;}
  }
  function steps(f:Face,u:number,width:number,rise:number,run=1.5){const count=Math.ceil(rise/.17),a=f.at(u,.44),b=f.at(u,run+.44),low=ground(...b)+.14,angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
    for(let i=0;i<count;i++){const h=rise*(i+1)/count,p=f.at(u,.44+run-(i+.5)*run/count);box(p[0],low+h/2,p[1],width,h,run/count+.008,'#887c6d',false,true,angle);}
    for(const s of[-1,1]){const lo=f.at(u+s*(width/2-.08),run+.44),hi=f.at(u+s*(width/2-.08),.44);beam(new T.Vector3(lo[0],low+.9,lo[1]),new T.Vector3(hi[0],low+rise+.9,hi[1]),.025,'#828e84');}return{a,b};
  }

  building('front Columna · corp nord','w696653320',7.3,'#aaa68f',function*(p,y,h){yield* historical([-142.32,-292.97],[-142.47,-298.4],y,h,2,2);});
  building('front Columna–Dosoftei','w51769221',7.6,'#b1b39f',function*(p,y,h){const f=yield* historical([-142.41,-235.01],[-142.32,-292.97],y,h,2,15);for(let i=0;i<10;i++){const u=(i+.5)*f.len/10;f.panel(u,1.65,.43,3.4,2.7,.03,C.glass,false,1);f.panel(u,3.13,.46,3.6,.45,.18,['#5c685b','#9c8669','#4d5954'][i%3]);if(i%4===0)yield;}roof(-147.7,-264,10.4,57,y+h,1.6);});
  building('colț Dosoftei · piatră ocru','w75517097',8.8,'#af9c76',function*(p,y,h){yield* historical([-140.57,-173.03],[-140.49,-213.83],y,h,2,11);yield* historical([-140.49,-213.83],[-203.4,-213.94],y,h,2,16);roof(-148,-193.5,14.7,40,y+h,2.0,'#837760');roof(-179.8,-207,47,13,y+h,1.7,'#837760');yield;});
  building('Bodoni · frontul comercial median','w75517096',8.7,'#beb79d',function*(p,y,h){yield* historical([-139.11,-144.5],[-139.06,-172.2],y,h,2,7);roof(-147.5,-158,16,27,y+h,1.7);});
  building('Bodoni · front comercial 43','w75517101',9.0,'#b6b39b',function*(p,y,h){const f=yield* historical([-139.64,-100.45],[-139.11,-144.5],y,h,2,11);for(let i=0;i<7;i++){f.panel((i+.5)*f.len/7,1.65,.41,3.8,2.65,.03,C.glass,false,1);f.panel((i+.5)*f.len/7,3.22,.48,4.1,.51,.16,i%2?'#5d5449':'#7d6658');}roof(-145.7,-122.5,12.2,43.8,y+h,1.7);yield;});
  building('Bodoni 41 · vitrine, cafenele și intrări','w75517106',9.4,'#c2b796',function*(p,y,h){const f=yield* historical([-140.02,-42.76],[-139.64,-100.45],y,h,2,16);
    // Geotagged January 2026 sequence: optician and white café portico nearest
    // Hasdeu, dark Pao Pao storefront, then stone-clad exchange shops to the north.
    f.panel(20.1,2.64,.38,12.7,3.28,.24,'#303631');f.panel(20.1,.70,.45,12.7,1.25,.28,'#bcbba7');
    for(const u of[16.5,23.7]){f.panel(u,2.85,.56,3.2,2.35,.03,'#465b55',false,1);f.panel(u,1.55,.69,3.4,.22,.42,'#bdbda9');}
    f.panel(20.1,3.86,.84,3.2,.62,1.12,'#323a35');f.label('PAO PAO',20.1,3.75,.34,'#917296',1.43);steps(f,20.1,1.65,.88,1.42);yield;
    for(let yy=1.65;yy<4.1;yy+=.55)f.panel(20.1,yy,.525,12.7,.035,.025,'#5a615a',true);
    f.panel(8.4,1.55,.44,5.1,2.75,.03,C.glass,false,1);f.panel(8.4,3.3,.5,5.4,.40,.27,'#5b5b4c');f.label('ASTROOPTICA',8.4,3.15,.32,'#d1cfb9',.67);steps(f,8.4,1.7,.61,1.1);
    for(const u of[1.0,3.0,5.0]){const q=f.at(u,1.03),g=new T.CylinderGeometry(.21,.24,6.5,10);g.translate(q[0],y+4.02,q[1]);put(g,'#c2c2ae');}f.panel(3,7.4,.83,6.5,.48,1.6,C.trim);steps(f,3,5.8,.40,.93);yield;
    for(const u of[33,40,47,54]){f.panel(u,1.8,.45,4.5,3.05,.08,u===54?'#805e50':'#a29677');f.panel(u,1.57,.56,2.3,2.70,.03,C.glass,false,1);f.panel(u,3.21,.79,4.5,.54,1.08,u===40?'#a5894e':'#7d6454');f.label('EXCHANGE',u,3.09,.30,'#c4c6ab',1.37);steps(f,u,2.1,.34,.83);yield;}
    roof(-146,-71.6,11.5,57,y+h,1.65,'#827864');
  });
  building('Biblioteca Hasdeu · colțul bulevardului','w27461134',13.2,'#c0b692',function*(p,y,h){
    // Retain the existing footprint, roof and height. The photographed upper
    // storey has shorter windows: three identical storeys erased its character.
    // Each opening is emitted once, rather than adding a skin over historical().
    const trim='#c8c6b4',band='#969a8e';
    for(const [a,b,bays]of[[[-141.68,-16.94],[-141.88,-42.58],6],[[-205.48,-16.44],[-141.68,-16.94],17]] as [XY,XY,number][]){const f=face(a,b,y),pitch=f.len/bays;
      f.panel(f.len/2,.42,.17,f.len,.84,.34,'#999889');
      for(const [hh,thick,depth,col]of[[4.92,.24,.52,trim],[8.74,.30,.65,band],[9.10,.18,.77,trim],[12.68,.25,.56,band],[13.08,.28,.83,trim]] as [number,number,number,string][])f.panel(f.len/2,hh,.27,f.len+.18,thick,depth,col);
      for(let i=0;i<bays;i++){const u=(i+.5)*pitch;
        arch(f,u,.93,1.78,3.42,C.glass,trim);
        f.window(u,6.94,1.67,2.50,trim,'#62695b');
        f.window(u,10.86,1.46,1.68,trim,'#6b7467');
        f.panel(u,8.39,.47,2.17,.18,.58,trim,true);
        f.panel(u,5.46,.40,1.94,.18,.39,trim,true);
        for(const s of[-1,1])f.panel(u+s*.76,5.23,.40,.18,.34,.27,trim,true);
        if(i%4===3)yield;
      }
      for(const u of[.30,f.len-.30]){f.panel(u,6.85,.36,.74,4.08,.55,trim);for(let yy=.5;yy<4.7;yy+=.48)f.panel(u,yy,.47,.76,.30,.30,trim,true);}
      // Fine rustication is restricted to the ground floor, with clear glazing.
      for(let yy=1.0;yy<4.8;yy+=.48)f.panel(f.len/2,yy,.08,f.len,.025,.035,'#aaa994',true);
      yield;
    }
    roof(-173.6,-24.5,63,14.8,y+h,2.1,'#827660');
  });

  // Lightweight florist stalls. One atomic replacement covers both OSM relation
  // polygons so a not-yet-built southern strip never disappears prematurely.
  const market=CITY_DATA.features.filter(f=>f.id==='r12313269');
  job('Piața de flori · copertine și standuri',market.flatMap(f=>f.p),[12313269],function*(){
    for(const [k,f]of market.entries()){const z0=Math.min(...f.p.map(p=>p[1])),z1=Math.max(...f.p.map(p=>p[1])),bays=Math.round((z1-z0)/4.35),pitch=(z1-z0)/bays;
      for(let i=0;i<bays;i++){const z=z0+(i+.5)*pitch,x=T.MathUtils.lerp(f.p[1][0],f.p[2][0],(z-f.p[1][1])/(f.p[2][1]-f.p[1][1])),y=ground(x-1,z)+.12;
        // Front aisle stays open. The backing occupies only the park-side 2 m.
        box(x+4.25,y+1.32,z,1.88,2.64,pitch-.07,'#455953',false,true);
        const front=face([x+3.27,z-pitch/2+.08],[x+3.27,z+pitch/2-.08],y);front.panel(front.len/2,1.46,.08,front.len-.13,2.50,.03,'#455e5a',false,1);
        for(const dz of[-pitch/2,pitch/2]){box(x,y+1.43,z+dz,.09,2.86,.09,'#34554a',false,true);box(x+3.27,y+1.37,z+dz,.055,2.70,.09,'#a3afa1',true);}
        const vertices:number[]=[];for(let s=0;s<8;s++){const a=s/8,b=(s+1)/8,xa=x-.25+a*5.9,xb=x-.25+b*5.9,ya=y+2.80+.70*Math.sin(a*Math.PI),yb=y+2.80+.70*Math.sin(b*Math.PI);vertices.push(xa,ya,z-pitch/2,xa,ya,z+pitch/2,xb,yb,z+pitch/2,xa,ya,z-pitch/2,xb,yb,z+pitch/2,xb,yb,z-pitch/2);}
        const canopy=new T.BufferGeometry();canopy.setAttribute('position',new T.Float32BufferAttribute(vertices,3));canopy.computeVertexNormals();put(canopy,'#89a7a2',false,true);front.label(String(k?bays-i:60-i),.45,2.06,.23,'#becdc0',.17);for(const u of[front.len/3,2*front.len/3])front.panel(u,1.4,.13,.05,2.66,.08,'#acb6a8',true);front.panel(front.len/2,2.0,.14,front.len,.05,.08,'#acb6a8',true);surface(rect(x+1.58,z,3.10,pitch),(xx,zz)=>ground(xx,zz)+.14,'#939b8e');
        for(let pot=0;pot<4;pot++){const xx=x+2.57,zz=z+(pot-1.5)*pitch/5,g=new T.CylinderGeometry(.14,.10,.4,6);g.translate(xx,y+.20,zz);put(g,'#b4b7a5',true);const bouquet=new T.IcosahedronGeometry(.29,0);bouquet.scale(.9,1.1,.9);bouquet.translate(xx,y+.73,zz);put(bouquet,['#a56b7c','#c5b277','#a1565d','#76866a'][(i+pot)%4],true);}yield;
      }
    }
  });

  building('UTM · Blocul 2','w630789736',16.0,'#b9b9a6',function*(p,y,h){
    // The I-shaped footprint leaves both courtyards open. Do not replace it by
    // a bounding rectangle: the northern wing alone fronts the street.
    for(const [a,b]of[[[-118.66,196.88],[-118.38,213.48]],[[-59.79,196.79],[-118.66,196.88]],[[-118.38,213.48],[-91.17,213.46]],[[-100.23,220.88],[-99.69,272.7]]]as[XY,XY][]){const f=face(a,b,y),bays=Math.max(4,Math.round(f.len/3.8));
      f.panel(f.len/2,.8,.26,f.len,1.6,.52,'#816b5c');cornice(f,h);
      for(let row=0;row<4;row++){for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;f.window(u,2.75+row*3.55,1.55,2.48,'#b3b7a2','#394c48');f.panel(u,1.23+row*3.55,.32,1.70,.34,.13,'#afaF9b',true);}yield;}
    }
    const front=face([-59.79,196.79],[-118.66,196.88],y);front.panel(front.len/2,3.31,1.14,4.8,.31,2.30,C.trim);front.panel(front.len/2,1.62,.54,2.05,2.90,.03,C.glass,false,1);steps(front,front.len/2,3.9,.35,1.0);
    for(const u of[front.len/2-1.42,front.len/2+1.42])for(let row=0;row<26;row++){const yy=3.75+row*.44;for(const sign of[-1,1]){const a=front.at(u-sign*.21,.54),b=front.at(u+sign*.21,.54);beam(new T.Vector3(a[0],y+yy,a[1]),new T.Vector3(b[0],y+yy+.4,b[1]),.05,C.trim);}if(row%5===4)yield;}
    front.label('UTM',front.len/2,3.8,.34,'#616d60',2.35);roof(-89.1,205.1,58,15.9,y+h,1.6);roof(-88.4,246.4,21,50,y+h,2.1);yield;
  });
  building('Biblioteca Națională · fostul seminar','w630789735',12.3,'#b7a16b',function*(p,y,h){
    for(const [a,b,bays]of[[[-114.24,276.27],[-114.18,299.01],5],[[-114.18,299.01],[-62.95,298.69],13],[[-62.95,298.69],[-62.98,276.04],5]]as[XY,XY,number][]){const f=face(a,b,y);f.panel(f.len/2,1.05,.25,f.len,2.1,.50,'#b6b29b');cornice(f,h);for(const yy of[2.15,5.38,5.85])f.panel(f.len/2,yy,.31,f.len,.20,.44,C.trim);
      for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;arch(f,u,2.42,1.65,2.54);arch(f,u,6.6,1.7,3.58);f.panel(u,1.07,.34,1.1,.8,.03,'#5d665a',false,1);f.panel(u,6.07,.40,1.74,.35,.17,C.trim,true);const q=f.at(u,.49),ornament=new T.TorusGeometry(.83,.10,4,12,Math.PI);ornament.rotateY(Math.atan2(-(b[1]-a[1]),b[0]-a[0]));ornament.translate(q[0],y+10.25,q[1]);put(ornament,C.trim,true);if(i%4===3)yield;}
      for(const u of[.34,f.len-.34])f.panel(u,7,.37,.66,9.4,.58,C.trim);yield;
    }
    // Raised central bay and three paired upper openings on the long south front.
    const south=face([-114.18,299.01],[-62.95,298.69],y);south.panel(south.len/2,12.8,-.05,18,1.65,1.2,'#b7a16b');south.panel(south.len/2,13.48,.38,18.5,.28,.78,C.trim);south.label('BIBLIOTECA NAȚIONALĂ',south.len/2,5.59,.26,'#58634f',.57);roof(-88.6,286.8,50.6,20.9,y+h,1.8,'#817964');yield;
  });
  building('Conacul Donici · Bodoni 35','w27446424',7.8,'#a09a83',function*(p,y,h){for(const [a,b,bays]of[[[-138.2,379.39],[-138.48,331.23],12],[[-138.48,331.23],[-162.75,330.98],6]]as[XY,XY,number][]){const f=face(a,b,y);f.panel(f.len/2,1.1,.24,f.len,2.2,.49,'#817e6e');cornice(f,h);for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;arch(f,u,2.45,1.45,3.05,'#7c847e','#afa894');f.panel(u,1.12,.41,1.30,.68,.21,'#b8b29e');for(const d of[-.32,.32])f.panel(u+d,1.12,.54,.17,.34,.03,'#5c6559',true);if(i%4===3)yield;}for(let yy=.4;yy<2;yy+=.36)f.panel(f.len/2,yy,.50,f.len,.03,.025,'#aaa38d',true);for(let u=.6;u<f.len;u+=.55)f.panel(u,h-.63,.53,.19,.22,.25,C.trim,true);yield;}roof(-149,346,22,29,y+h,.85,'#858274');});
  building('Liceul Mircea Eliade · fosta școală reală','w41434938',12.6,'#c0c0aa',function*(p,y,h){const f=face([-138.5835,423.8609],[-138.2676,385.5540],y);f.panel(f.len/2,2.64,.25,f.len,5.28,.51,'#baa477');f.panel(f.len/2,.72,.54,f.len,1.43,.22,'#848b82');cornice(f,h);f.panel(f.len/2,5.36,.40,f.len,.31,.63,C.trim);
    for(let i=0;i<10;i++){const u=(i+.5)*f.len/10;f.window(u,3.0,2,2.10,C.trim,'#9aa391',.38);f.window(u,6.5,1.75,2.13,C.trim,'#9aa391');arch(f,u,9.0,1.65,2.55,C.glass);f.panel(u,8.35,.43,1.72,.33,.20,'#b0b29c');if(i%4===3)yield;}f.panel(f.len*.51,2.2,.45,1.6,3.6,.03,'#665244',false,1);steps(f,f.len*.51,2.1,.30,.78);f.label('MIRCEA ELIADE',f.len*.51,4.39,.24,'#565c50',.53);yield* roofOnPlan(p,alignedPlans.w41434938.holes,y+h,1.1,C.roof,5.5);yield;
  });
  // Existing 5.9 m gap between the two wings is a real open school gate.
  job('poarta liceului · pasaj deschis',rect(-141,382.2,6,5.8),[],function*(){const y=ground(-140,382.2),wall=new T.Shape();wall.moveTo(-2.6,0);wall.lineTo(-2.6,4.6);wall.lineTo(2.6,4.6);wall.lineTo(2.6,0);wall.lineTo(1.62,0);wall.lineTo(1.62,2.45);wall.absarc(0,2.45,1.62,0,Math.PI,false);wall.lineTo(-1.62,0);wall.closePath();const g=new T.ExtrudeGeometry(wall,{depth:1.25,bevelEnabled:false,curveSegments:12});g.rotateY(Math.PI/2);g.translate(-140.0,y,382.2);put(g,'#b7a172',false,true);surface(rect(-143.1,382.2,12.8,3.12),(x,z)=>ground(x,z)+.14,'#95988b');yield;});
  building('Bodoni 31 · prăvălii joase','w657259415',5.3,'#bebda9',function*(p,y,h){const f=yield* historical([-138.5112,438.7784],[-138.6318,425.4592],y,h,1,5,true);for(let i=0;i<3;i++){const u=(i+.5)*f.len/3;f.panel(u,2.5,.55,2.2,2.7,.03,'#4e615e',false,1);f.panel(u,4.08,.75,2.5,.28,1.1,'#333b35');steps(f,u,1.7,.48,1.0);}yield* roofOnPlan(p,alignedPlans.w657259415.holes,y+h,.8,C.roof,5.6);yield;});
  building('Bodoni 29 · colț București','w146076907',5.4,'#aaa79b',function*(p,y,h){
    // BUC10: D.S. September2025 capture19 shows a taupe corner, pale frames,
    // dark rusticated plinth and the stair at the NORTH end of the Bodoni face.
    for(const [aa,bb,count]of[[[-138.5213,459.1051],[-138.6744,442.7968],4],[[-162.9191,459.0235],[-138.5213,459.1051],7]]as[XY,XY,number][]){
      const f=face(aa,bb,y),east=Math.abs(bb[0]-aa[0])<1;
      f.panel(f.len/2,.58,.13,f.len,1.16,.26,'#51594f');cornice(f,h);
      for(let yy=.25;yy<1.1;yy+=.38)for(let u=.35;u<f.len;u+=.78){f.panel(u,yy,.29,.64,.29,.12,'#70776a',true);}
      for(let i=0;i<count;i++){
        const u=(i+.5)*f.len/count;if(east&&u>12.4)continue;
        f.window(u,2.94,1.35,2.17,'#dfded1','#d0d4c8');yield;
      }
      for(const u of[.18,f.len-.18])f.panel(u,3.25,.14,.30,3.8,.27,'#d7d8cb');
      if(east){
        const u=f.len-2.15;steps(f,u,2.35,.94,1.8);
        f.panel(u,2.42,.25,1.23,2.86,.05,'#3f4941',false,1);
        const q=f.at(u,.93);box(q[0],y+4.20,q[1],2.55,.12,1.84,'#555c50',false,false,Math.PI/2);
        for(const side of[-1,1]){const q=f.at(u+side*1.13,1.78);box(q[0],y+2.55,q[1],.045,3.18,.045,'#535c50',true,true);}
      }
    }
    yield* roofOnPlan(p,alignedPlans.w146076907.holes,y+h,1.9,'#86877a',7.1);yield;
  });
  building('Muzeul Național · corpul istoric Bodoni 16','r13800176',8.6,'#d0d0c2',function*(p,y,h){
    // The retained owner is corrected in place. July2025 frame16 shows the
    // shallow-headed white street facade and two different roof finishes;
    // September2025 frame20 and6September2026 identify the red end pavilions.
    for(const [aa,bb,bays]of[[[-118.7112,418.6858],[-118.4745,459.3383],10],[[-118.4745,459.3383],[9.2337,459.0298],31]]as[XY,XY,number][]){
      const f=face(aa,bb,y),street=f.len>60;f.panel(f.len/2,1.07,.24,f.len,2.14,.49,'#a9ac9e');cornice(f,h);
      for(let i=0;i<bays;i++){
        const u=(i+.5)*f.len/bays;
        if(street){
          const w=1.66,hh=3.10,bottom=2.45,shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,hh-.24);shape.quadraticCurveTo(0,hh+.20,-w/2,hh-.24);shape.closePath();
          const q=f.at(u,.33),g=new T.ShapeGeometry(shape,8);g.translate(q[0],y+bottom,q[1]);put(g,'#566963',false,false,1);
          for(const side of[-1,1])f.panel(u+side*(w/2+.08),bottom+hh/2,.40,.14,hh+.12,.20,'#d9dacc',true);
          f.panel(u,bottom+hh+.18,.43,w+.43,.18,.32,'#d9dacc');f.panel(u,bottom-.11,.42,w+.36,.16,.32,'#cbd0bd');
          f.panel(u,bottom+hh*.69,.39,w,.055,.055,'#888d7d',true);
        }else arch(f,u,2.45,1.66,3.35,C.glass,'#d6d6c6');
        f.panel(u,1.22,.37,1.02,.48,.05,'#737d6d');
        for(const dx of[-1.19,1.19])f.panel(u+dx,4.5,.43,.22,4.68,.32,'#d3d6c7',true);
        if(i%5===4)yield;
      }
      for(const u of[.70,f.len-.70]){
        f.panel(u,4.6,.47,.93,7.45,.65,'#d0d2c2');for(let yy=1.8;yy<8;yy+=.56)f.panel(u,yy,.78,1.03,.28,.18,'#bfc2b1',true);
        if(f.len<60||u>f.len/2){const q=f.at(u,-.25),spire=new T.ConeGeometry(.91,3.75,4);spire.rotateY(Math.PI/4);spire.translate(q[0],y+h+1.93,q[1]);put(spire,'#874d4d');const needle=new T.CylinderGeometry(.018,.045,1.5,5);needle.translate(q[0],y+h+4.55,q[1]);put(needle,'#6e5451',true);}
      }
      yield;
    }
    // Exact plan and a shared hip profile; the west/east colour boundary
    // remains a photographic estimate, without overlapping roof rectangles.
    yield* roofOnPlan(p,alignedPlans.r13800176.holes,y+h,1.65,(x)=>x<-66?'#8c5049':'#a39a89',5.7);
    // Northern pavilion, photographGPS(-99.07,408.20), is this short wing;
    // it is not the separate two-storey MapMD museum26790058.
    const north=face([-106.1367,418.6616],[-118.7112,418.6858],y);cornice(north,h);
    for(let i=0;i<3;i++)arch(north,(i+.5)*north.len/3,2.35,1.75,3.45,'#c9c8b8','#d5d3c2');
    const tip=new T.ConeGeometry(.91,3.75,4);tip.rotateY(Math.PI/4);tip.translate(-106.8,y+h+1.93,419.0);put(tip,'#874d4d');const needle=new T.CylinderGeometry(.018,.045,1.5,5);needle.translate(-106.8,y+h+4.55,419.0);put(needle,'#6e5451',true);
    // Sparse scaffolding in the two photographed bounded areas. No net hides
    // the retained facade and no second building/collision volume is created.
    // Corner supports follow the protected side of the observed works fence;
    // their approximate registration must not occupy the exterior footway.
    const scaffoldFeet=new Set<string>();
    for(const [aa,bb]of[[[-118.9,448.0],[-118.9,459.7]],[[-118.9,459.7],[-117.7,460.25]],[[-117.7,460.25],[-96.0,460.25]],[[-119.0,418.0],[-105.5,418.0]],[[-105.5,418.0],[-105.5,427.0]]]as[XY,XY][]){
      const dx=bb[0]-aa[0],dz=bb[1]-aa[1],len=Math.hypot(dx,dz),n=Math.ceil(len/2.7),at=(t:number):XY=>[aa[0]+dx*t,aa[1]+dz*t];
      for(let i=0;i<=n;i++){const q=at(i/n),key=q.join('/');if(scaffoldFeet.has(key))continue;scaffoldFeet.add(key);const g=ground(...q);box(q[0],g+4.1,q[1],.045,8.2,.045,'#8f6457',false,true);}
      for(const yy of[2.5,5.0,7.4]){
        beam(new T.Vector3(aa[0],y+yy,aa[1]),new T.Vector3(bb[0],y+yy,bb[1]),.022,'#8f6457');
        const q=at(.5);box(q[0],y+yy-.06,q[1],len,.10,.60,'#737e75',false,true,Math.atan2(-dz,dx));
        for(let i=0;i<n;i+=2){const q=at(i/n),r=at(Math.min(1,(i+1)/n));beam(new T.Vector3(q[0],y+yy, q[1]),new T.Vector3(r[0],y+yy+2.2,r[1]),.016,'#707e73');}
      }
      yield;
    }
  });

  for(const cell of realm.cells)job(`trotuar ${cell.x}/${cell.z}`,rect(cell.x,cell.z,27,27),[],function*(){
    for(const[index,patch]of cell.patches.entries()){
      const override=retainedPlans.groundPatchOverrides.find(o=>o.x===cell.x&&o.z===cell.z&&o.patchIndex===index);
      for(const rings of override?.parts??[patch]){yield* surfaceStaged(rings[0] as XY[],(x,z)=>ground(x,z)+.14,'#979d90',true,rings.slice(1) as XY[][]);yield;}
    }
  });
  // Mapped flights join the pedestrian ground at BOTH ends. No floating step
  // platform, tall invisible kerb, or sloped sidewalk across an entrance.
  for(const id of['w916045867','w856554836','w1327291230']){const f=feature(id);job(`trepte ${id}`,f.p,[],function*(){let a=f.p[0],b=f.p.at(-1)!;if(ground(...a)>ground(...b))[a,b]=[b,a];const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),low=ground(...a)+.16,high=Math.max(low+.14,ground(...b)+.16),count=Math.max(2,Math.ceil((high-low)/.15)),angle=Math.atan2(dx,dz);
    for(let i=0;i<count;i++){const t=(i+.5)/count,top=low+(high-low)*(i+1)/count;box(a[0]+dx*t,(low-.18+top)/2,a[1]+dz*t,3.2,top-low+.18,len/count+.006,'#929181',false,true,angle);}yield;
  });}
  const trees=CITY_DATA.points.filter(p=>p.t.natural==='tree'&&p.p[0]>-170&&p.p[0]<-118&&p.p[1]>-332&&p.p[1]<465&&(p.p[0]<-125||p.p[1]>180));
  // Native trees retain occlusion and exact locations. The whitewashed lower
  // trunks and low borders use the same ground, outside the clear walking line.
  for(const p of trees)job(`arbore ${p.id}`,rect(...p.p,2,2),[],function*(){const [x,z]=p.p,y=ground(x,z),g=new T.CylinderGeometry(.21,.26,1.08,7);g.translate(x,y+.54,z);put(g,'#b0b4a1',true);yield;});
  return Object.assign(mesh,{treeOverrides:trees.map((p,i)=>({x:p.p[0],z:p.p[1],radius:.65,height:Number(p.t.height)||12.8+(i%5)*.65,texture:[0,2,3,4][i%4]}))});
}
