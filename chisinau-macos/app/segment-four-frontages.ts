import * as T from 'three';
import {feature,type XY} from './city-layout';
import {streetMesh} from './street-mesh';
import {photoArchitecture} from './photo-architecture';

/** Maria Cebotari → Pușkin. Only previously plain bodies are replaced here.
 * The Opera, civic landmarks, parks and shared boulevard grade retain their
 * existing owners. Photographic evidence: docs/boulevard-references/segment-four.md.
 */
export function createSegmentFourFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Bulevard · segmentul 4',ground,loaded);
 const {job,solid,box,put,facade}=mesh;
 const {faces,cornice,arch,roof}=photoArchitecture(mesh);
 const C={stone:'#b7b29d',trim:'#c8c5b3',base:'#87877b',glass:'#495c5b',roof:'#7c8277'};

 // Loteanu: the lower entrance wing and the taller hall share one replacement.
 // The permanent cornices/arches are photographed; advertising posters and
 // temporary terraces are deliberately not baked into the architecture.
 const cinema=feature('r11739050');
 job('103 · cinematograful Loteanu',cinema.p,[11739050],function*(){
  const y=ground(-359,25.7)+.14,cream='#c7c5b4',yellow='#c8bd8d',burgundy='#756054';
  solid(cinema.p,15.2,y-5,cream,true,cinema.holes);
  const lowWing:XY[]=[[-371.02,26.42],[-346.07,26.14],[-346.67,55.54],[-372.03,56.23],[-371.02,26.42]];
  solid(lowWing,.14,y+10.2,C.roof,true);yield;
  const hall:XY[]=[[-393.14,22.47],[-371.35,22.76],[-371.02,26.42],[-372.03,56.23],[-372.06,71.19],[-393.65,71.21],[-393.14,22.47]];
  solid(hall,3.25,y+10.2,cream,true);solid(hall,.15,y+13.45,C.roof,true);yield;
  for(const f of faces(cinema.p,y)){
   f.panel(f.len/2,.52,.12,f.len,1.04,.24,burgundy);
   f.panel(f.len/2,2.48,.105,f.len,2.88,.21,yellow);
   for(const hh of[1.06,3.93])f.panel(f.len/2,hh,.20,f.len,.17,.40,C.trim);
   for(let yy=1.45;yy<3.9;yy+=.49)f.panel(f.len/2,yy,.225,f.len,.032,.03,'#99977f',true);
   if(f.at(f.len/2)[0]>-371.05)cornice(f,10.2,cream);yield;
  }
  const front=facade([-346.07,26.14],[-371.02,26.42],y);
  for(const u of[8.4,12.2,16,19.8]){
   arch(front,u,5.15,1.52,3.17,y,'#554e42',C.trim);
   front.panel(u,5.0,.44,2.15,.20,.48,C.trim,true);
   front.panel(u,4.55,.28,2.48,.56,.35,yellow,true);
   front.panel(u,8.65,.45,2.45,.20,.54,C.trim,true);
   const q=front.at(u,.49),disc=new T.CircleGeometry(.20,12);disc.rotateY(Math.atan2(-.28,-24.95));disc.translate(q[0],y+4.58,q[1]);put(disc,C.trim,true);
   front.panel(u,6.34,.40,.055,2.2,.05,'#674d43',true);front.panel(u,7.12,.42,1.4,.055,.055,'#674d43',true);
   yield;
  }
  for(const u of[8.4,12.2,16,19.8,23.4])front.window(u,2.48,1.40,1.86,yellow,'#6f5144');
  const entry=3.0;
  for(const side of[-1,1]){
   front.panel(entry+side*1.61,2.71,.52,.70,4.38,.92,yellow);
   for(let yy=1.2;yy<4.7;yy+=.55)front.panel(entry+side*1.61,yy,1.00,.78,.20,.10,C.trim,true);
  }
  front.panel(entry,4.88,.56,4.33,.45,1.14,C.trim);
  front.panel(entry,4.10,.56,2.50,.58,1.1,yellow);
  front.panel(entry,1.78,.71,1.98,2.96,.03,'#5c4540',false,1);
  for(const sign of[-1,1]){front.panel(entry+sign*.46,2.1,.76,.82,1.96,.03,'#405654',false,1);front.panel(entry+sign*.14,1.96,.82,.034,.52,.045,C.trim,true);}
  front.panel(entry,1.78,.81,.08,2.96,.08,'#614e42',true);
  front.label('CINEPLEX',entry,4.08,.27,'#635d4d',1.14);
  arch(front,entry,5.34,3.25,1.625,y,'#4c5b56',yellow);
  // Three shallow rounded treads. Their lowest edge meets the existing walk.
  const low=ground(...front.at(entry,1.8))+.02;
  for(let i=0;i<3;i++){
   const width=2.85-i*.22,depth=1.6-i*.39,p:XY[]=[];
   for(let k=0;k<=18;k++){const t=k/18*Math.PI;p.push(front.at(entry+Math.cos(t)*width,Math.sin(t)*depth+.10));}
   p.push(p[0]);solid(p,(i+1)*.14+.12,low-.12,burgundy,true);yield;
  }
  // Taller auditorium: seven blind arched bays and a short stone balustrade.
  const main=facade([-371.35,22.76],[-393.14,22.47],y);
  for(let i=0;i<7;i++){
   const u=(i+.5)*main.len/7;arch(main,u,4.65,2.38,6.15,y,cream,yellow,0);
   main.panel(u,4.43,.48,2.5,.16,.46,C.trim);
   main.panel(u,5.24,.49,2.5,.14,.46,C.trim);
   for(let n=-3;n<=3;n++)main.panel(u+n*.29,4.84,.48,.10,.65,.16,C.trim,true);
   yield;
  }
  for(let i=0;i<=7;i++)main.panel(i*main.len/7,7.44,.42,.38,5.97,.52,C.trim);
  // Low gabled roof of the hall, rather than a flat generic extrusion.
  const a=[-393.14,y+13.60,22.47],b=[-371.35,y+13.60,22.76],c=[-372.06,y+13.60,71.19],d=[-393.65,y+13.60,71.21],r=[-382.245,y+15.75,22.615],s=[-382.855,y+15.75,71.20];
  const gable=new T.BufferGeometry();gable.setAttribute('position',new T.Float32BufferAttribute([a,r,b,c,s,d].flat(),3));gable.computeVertexNormals();put(gable,cream);
  const roofGeometry=new T.BufferGeometry();roofGeometry.setAttribute('position',new T.Float32BufferAttribute([s,r,a,d,s,a,c,b,r,s,c,r].flat(),3));roofGeometry.computeVertexNormals();put(roofGeometry,'#838778',false,true);
  for(const [aa,bb]of[[a,r],[r,b]])mesh.beam(new T.Vector3(...aa as [number,number,number]),new T.Vector3(...bb as [number,number,number]),.14,C.trim,false);
  for(const f of faces(hall,y)){
   cornice(f,13.45,C.trim);
   for(let u=.6;u<f.len;u+=1.2)f.panel(u,12.95,.25,.25,.24,.47,C.trim,true);
   yield;
  }
  // The east side is visible from the park approach. Keep its distinct narrow
  // five-arch group instead of repeating the entire boulevard front.
  const side=facade([-346.67,55.54],[-346.07,26.14],y);
  for(let i=0;i<5;i++){arch(side,8.5+i*2.15,4.70,1.23,3.75,y,'#655646',yellow);yield;}
  for(let u=3;u<side.len;u+=3.45)if(Math.abs(u-12.8)>2.5)side.window(u,2.42,1.26,1.90,yellow,'#6f5144');
  side.panel(12.8,1.95,.38,2.20,3.08,.03,'#5e4a40',false,1);
  for(const u of[10.85,14.75])side.panel(u,1.83,1.32,.28,3.66,.28,C.trim);
  side.panel(12.8,3.74,1.05,4.60,.22,2.15,C.trim);
  const portico=new T.Shape();portico.moveTo(-2.3,0);portico.lineTo(2.3,0);portico.lineTo(0,.82);portico.closePath();
  const canopy=new T.ExtrudeGeometry(portico,{depth:2.15,bevelEnabled:false}),q=side.at(12.8);canopy.rotateY(Math.atan2(29.4,.6));canopy.translate(q[0],y+3.86,q[1]);put(canopy,'#8b7464',false,true);
  roof(-358.7,40.5,23.9,27.0,y+10.37,.70,'#868477');yield;
 });

 // The mapped rear auditorium is separate from the historic street facade.
 // Unseen back elevations stay restrained; courtyard circulation remains open.
 const annex=feature('r11739054');
 job('103 · sala din spate',annex.p,[11739054],function*(){
  const y=ground(-362,74)+.14;solid(annex.p,13.1,y-5,'#b2b2a1',true,annex.holes);solid(annex.p,.16,y+8.1,C.roof,true);
  for(const f of faces(annex.p,y)){cornice(f,8.1,'#bfc0ae');f.panel(f.len/2,.5,.14,f.len,1,.28,'#858779');yield;}
 });

 // No.150 is a nine-storey group, not a stack of independent default and
 // authored buildings. Rear bodies keep their mapped gaps and footprints.
 for(const [id,h,front]of[['w435423399',31.5,true],['w924966423',29.3,false],['w924966427',29.3,false],['w924966424',7.0,false]] as [string,number,boolean][]){
  const f=feature(id);
  job(`150 · ${front?'frontul bulevardului':id}`,f.p,[Number(id.slice(1))],function*(){
   const y=ground(-246.5,-16.0)+.14;
   solid(f.p,h+5,y-5,C.stone,true,f.holes);solid(f.p,.16,y+h,C.roof,true,f.holes);yield;
   for(const face of faces(f.p,y)){
    if(face.len<3.4)continue;
    const isFront=front&&face.at(face.len/2)[1]>-19,rows=h<10?2:9,bays=Math.max(1,Math.round(face.len/3.6)),pitch=face.len/bays;
    face.panel(face.len/2,.70,.14,face.len,1.40,.28,C.base);
    for(let row=0;row<rows;row++){
     const bottom=1.1+row*3.22;
     for(let i=0;i<bays;i++){
      const u=(i+.5)*pitch,w=Math.min(2.08,pitch*.64);
      if(isFront&&row===8){
       // The photographed top openings form small triplets, not broad arches.
       for(const du of[-.73,0,.73])arch(face,u+du,bottom,.58,2.10,y,'#555c51',C.stone,0);
      }else{
       // Bare openings in the documented unfinished shell. Keep them matte;
       // there is no photographic basis for completed reflective hotel glass.
       face.panel(u,bottom+1.17,.24,w,2.34,.025,'#566052');
       face.panel(u,bottom-.12,.29,w+.18,.16,.34,'#a6aa98',true);
      }
      if(i%4===3)yield;
     }
     if(h>10)face.panel(face.len/2,bottom+2.75,.22,face.len,.18,.44,'#9fA18f');
     yield;
    }
    cornice(face,h,C.trim);yield;
   }
   if(front){
    // Distinct raised central crown and round attic opening, visible above the
    // scaffolding in the 2019/2021 photographs. No speculative completed hotel.
    const f=facade([-271.88,-15.85],[-221.21,-15.98],y),u=f.len/2,p=f.at(u,.05),shape=new T.Shape();
    shape.moveTo(-8,0);shape.lineTo(8,0);shape.lineTo(8,1.05);shape.lineTo(3.2,2.3);shape.lineTo(-3.2,2.3);shape.lineTo(-8,1.05);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.8,bevelEnabled:false});g.rotateY(Math.atan2(.13,50.67));g.translate(p[0],y+h,p[1]);put(g,C.stone,false,true);
    const q=f.at(u,.90),opening=new T.CircleGeometry(.59,20);opening.rotateY(Math.atan2(.13,50.67));opening.translate(q[0],y+h+.99,q[1]);put(opening,'#4c5650');
    yield;
   }
  });
 }
 return mesh;
}
