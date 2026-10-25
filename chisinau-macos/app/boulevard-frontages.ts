import * as T from 'three';
import {feature,type XY} from './city-layout';
import {streetMesh} from './street-mesh';

/** Photo-guided replacements of seven previously generic extrusions only.
 * Original OSM footprints/courtyards survive; replacement is atomic with the
 * completed mesh+collider. No changes to imported or existing detailed models.
 */
export function createBoulevardFrontages(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const mesh=streetMesh(scene,'Bulevard · fațade',ground,loaded);
 const {job,solid,put,box,facade}=mesh;
 const C={ivory:'#c0bfae',stone:'#b8b19c',base:'#77796f',roof:'#6d7672',glass:'#526968',dark:'#424c47'};
 type Face=ReturnType<typeof facade>;
 function cornice(f:Face,h:number){for(const [dy,hh,depth] of [[-.42,.16,.42],[-.14,.22,.58],[.10,.16,.72]])f.panel(f.len/2,h+dy,.22,f.len+.16,hh,depth,C.ivory);}
 function* windows(f:Face,rows:number,bays:number,floor:number,first:number,w:number,hh:number,trim=C.ivory,frame=C.dark){
  for(let r=0;r<rows;r++){for(let i=0;i<bays;i++){f.window((i+.5)*f.len/bays,first+r*floor,w,hh,trim,frame);if(i%6===5)yield;}yield;}
 }
 function* baseFaces(p:XY[],y:number,h:number,rows:number,id:string){
  const area=p.slice(1).reduce((n,b,i)=>n+p[i][0]*b[1]-b[0]*p[i][1],0);
  for(let i=1;i<p.length;i++){const a=area>0?p[i]:p[i-1],b=area>0?p[i-1]:p[i];if(Math.hypot(b[0]-a[0],b[1]-a[1])<2.5)continue;
   if(id==='w52333839'&&a[0]<999&&b[0]<999)continue;
   const f=facade(a,b,y);f.panel(f.len/2,.35,.12,f.len,.70,.24,C.base);cornice(f,h);
   // Back and side elevations remain restrained; the street-facing elevations
   // below replace their bays rather than stacking a second window pattern.
   const midz=(a[1]+b[1])/2;const nx=-(b[1]-a[1]),nz=b[0]-a[0];
   if(midz*nz<0&&Math.abs(nz)>Math.abs(nx)*2)continue;
   yield* windows(f,rows,Math.max(1,Math.round(f.len/3.5)),(h-.8)/rows,2.15,1.35,2.1);
  }
 }
 function roofRect(x:number,z:number,w:number,d:number,y:number,rise:number,color=C.roof){
  const p=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]];
  const q=[[x-w/2+Math.min(d/2,w/4),y+rise,z],[x+w/2-Math.min(d/2,w/4),y+rise,z]];
  const tris=[[p[0],q[0],p[1]],[p[1],q[0],q[1]],[p[1],q[1],p[2]],[p[2],q[1],p[3]],[p[3],q[1],q[0]],[p[3],q[0],p[0]]];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(tris.flat(2),3));g.computeVertexNormals();put(g,color,false,true);
 }
 function arch(f:Face,u:number,bottom:number,w:number,h:number,y:number){
  const r=w/2,s=new T.Shape();s.moveTo(-r,bottom);s.lineTo(r,bottom);s.lineTo(r,bottom+h-r);s.absarc(0,bottom+h-r,r,0,Math.PI,false);s.closePath();
  const a=f.at(u,.32),b=f.at(u+1),c=f.at(u),angle=Math.atan2(-(b[1]-c[1]),b[0]-c[0]);
  const g=new T.ShapeGeometry(s,8);g.rotateY(angle);g.translate(a[0],y,a[1]);put(g,C.glass,false,false,1);
  const t=new T.TorusGeometry(r+.09,.09,4,12,Math.PI);t.rotateY(angle);const q=f.at(u,.41);t.translate(q[0],y+bottom+h-r,q[1]);put(t,C.ivory,true);
  for(const sign of[-1,1])f.panel(u+sign*(r+.09),bottom+(h-r)/2,.38,.14,h-r,.20,C.ivory,true);
  f.panel(u,bottom+(h-r)/2,.38,.055,h-r,.07,'#a4aea3',true);f.panel(u,bottom-.08,.41,w+.32,.14,.26,C.ivory,true);
 }
 function balcony(f:Face,u:number,h:number,w=2.8,stone=false){
  f.panel(u,h,1.05,w,.18,1.8,C.base);f.panel(u,h+1.06,1.91,w+.10,.11,.18,stone?C.ivory:C.dark,true);
  for(let k=0;k<9;k++)f.panel(u+(k-4)*w/9,h+.58,1.91,stone?.13:.035,.91,stone?.14:.035,stone?C.ivory:C.dark,true);
  for(const s of[-1,1])f.panel(u+s*(w/2-.06),h+.58,1.08,.075,.92,1.7,stone?C.ivory:C.dark,true);
 }
 function steps(f:Face,u:number,y:number,rise:number,width:number){
  const run=Math.max(.6,rise*3.2),a=f.at(u,run+.4),low=ground(...a)+.14,n=Math.ceil(rise/.14),angle=Math.atan2(-(f.at(1)[1]-f.at(0)[1]),f.at(1)[0]-f.at(0)[0]);
  for(let i=0;i<n;i++){const q=f.at(u,.4+run-(i+.5)*run/n),top=low+rise*(i+1)/n;box(q[0],top-.35,q[1],width,.70,run/n+.005,C.base,false,true,angle);}
 }
 function building(title:string,id:string,h:number,color:string,anchor:XY,rows:number,detail:(p:XY[],y:number,h:number)=>Generator<void>){const f=feature(id);job(title,f.p,[Number(id.slice(1))],function*(){
  const y=ground(...anchor)+.14;solid(f.p,h+5,y-5,color,true,f.holes);solid(f.p,.16,y+h,C.roof,true,f.holes);yield;
  yield* baseFaces(f.p,y,h,rows,id);yield* detail(f.p,y,h);
 });}
 // W04: ochre two-storey teaching building, white dressings, red-brown frames.
 building('USMF 165','w42141755',9.0,'#b6a26c',[-1515,35],2,function*(p,y,h){
  for(let i=1;i<=12;i++){const a=p[i-1],b=p[i];if(Math.abs(b[0]-a[0])<4)continue;const f=facade(b,a,y);yield* windows(f,2,Math.max(2,Math.round(f.len/3.5)),4.15,2.30,1.42,2.55,'#c6c4b3','#644b3e');f.panel(f.len/2,4.55,.24,f.len,.21,.43,C.ivory);}
  for(const [x,z,w] of [[-1535,34.27,12.26],[-1499.3,33.63,12.1]]){const f=facade([x+w/2,z],[x-w/2,z],y);f.panel(f.len/2,2.1,.44,2.2,3.5,.09,'#554b3b',false,1);f.panel(f.len/2,4.23,1.04,3.3,.17,2.0,C.roof);steps(f,f.len/2,y,.42,3.6);yield;}
  roofRect(-1516,47,125.3,16.0,y+h,1.8);roofRect(-1570,70,17.7,30,y+h,1.4);roofRect(-1462,70,18.0,29,y+h,1.4);yield;
 });
 // W06–07: renovated morphology block and its copper-red entrance canopy.
 building('USMF 192 · morfologie','w96301035',14.8,'#c0beaa',[-1378,-23.6],4,function*(p,y,h){
  const f=facade([-1406.27,-23.44],[-1351.1,-23.8],y);yield* windows(f,4,15,3.55,2.1,2.03,2.40,'#bcbfad','#49483d');
  for(const u of[3.7,7.4,11.1,44.1,47.8,51.5])f.panel(u,7.5,.24,1.34,13.9,.32,'#b88166');
  for(const u of[19.4,24.4,30.9,35.9])f.panel(u,2.25,1.72,.52,4.5,1.0,'#a16b51');
  f.panel(27.6,4.66,1.35,19.2,1.05,3.15,'#9d6050');f.panel(27.6,2.0,.44,3.4,3.75,.06,C.glass,false,1);f.label('USMF',27.6,4.39,.70,'#d4d1b9',2.95);f.label('NICOLAE TESTEMIȚANU',27.6,4.13,.16,'#c6c5b1',2.95);yield;
 });
 // W08–09: low historic villas, preserving the irregular mapped footprints.
 building('Vila Kligman 113','w98427973',6.8,'#b7b9ab',[-607,27.8],1,function*(p,y,h){
  const f=facade([-591.31,27.68],[-621.95,27.82],y);yield* windows(f,1,8,5,3.1,1.42,3.2,'#c2c3b4','#58625b');
  for(const u of[.5,10.2,20.4,30.1]){f.panel(u,3.48,.44,.65,6.0,.50,C.ivory);f.panel(u,6.15,.52,1,.30,.66,C.ivory);}f.panel(8.3,2.5,.47,1.6,4.5,.08,'#595c4e',false,1);steps(f,8.3,y,.42,2.7);roofRect(-606.6,35.2,30.5,14.5,y+h,1.35);yield;
 });
 building('Vila Herța 115','w98427974',7.5,'#b89e86',[-660,29.8],1,function*(p,y,h){
  const f=facade([-639.4,29.8],[-680.1,29.8],y);cornice(f,h);
  for(let i=0;i<9;i++){const u=(i+.5)*f.len/9;arch(f,u,1.65,2.0,4.25,y);for(const s of[-1,1])f.panel(u+s*1.38,4.0,.52,.25,5.6,.42,'#bca994',true);if(i%3===2)yield;}
  f.panel(f.len/2,7.9,.1,8.2,1.1,1.3,'#b79c84');f.panel(f.len/2,8.45,.35,8.5,.22,.65,C.ivory);
  roofRect(-660,39.0,42,17.6,y+h,1.55,'#6f6d63');
  for(const x of[-642.4,-677.2]){const g=new T.SphereGeometry(2.2,12,8,0,Math.PI*2,0,Math.PI/2);g.scale(1,1.25,1);g.translate(x,y+h+.35,32.5);put(g,'#797567');box(x,y+h+3.45,32.5,.12,1.1,.12,'#6c6659',true);}yield;
 });
 // E04: pale limestone with a darker retail base, balcony balustrades and awnings.
 building('Frontul comercial 132','w46611631',18.9,'#b9b39f',[402,-16.0],5,function*(p,y,h){
  const f=facade([343.48,-15.52],[461.96,-16.49],y);f.panel(f.len/2,1.6,.22,f.len,3.2,.44,'#837b6e');
  // June 2025: the uppermost row is arched; do not leave rectangular glass
  // behind it. The lower three rows keep their existing mapped rhythm.
  yield* windows(f,3,29,3.70,5.25,1.72,2.52,'#c4bfac','#9fa89e');
  for(let i=0;i<29;i++){arch(f,(i+.5)*f.len/29,15.10,1.72,2.52,y);if(i%4===3)yield;}
  for(let u=.8;u<f.len;u+=1.25)f.panel(u,18.20,.37,.23,.42,.54,C.ivory,true);
  for(const yy of[3.15,6.84,10.57,14.23])f.panel(f.len/2,yy,.25,f.len,.22,.5,C.ivory);
  for(let i=0;i<24;i++){const u=(i+.5)*f.len/24;f.panel(u,1.65,.45,3.15,2.84,.04,C.glass,false,1);f.panel(u,3.22,.67,3.65,.28,1.18,i%3?'#5a564c':'#575d60');if(i%4===1){steps(f,u,y,.28,2.5);}if(i%5===4)yield;}
  for(let i=1;i<9;i++){const u=i*f.len/9;balcony(f,u,7.13,2.85,true);if(i%2===0)balcony(f,u,14.5,2.85,true);yield;}
  for(const u of[1,29.6,59.2,88.8,117.4])f.panel(u,11,.33,.57,15.2,.44,C.ivory,true);yield;
 });
 // E Miho: sage-green four-storey corner, arched upper windows and thin balconies.
 building('Frontul verde 71 · Bulgară','w52333839',15.4,'#a6b49a',[1026,23.65],4,function*(p,y,h){
  for(const [a,b,bays]of[[[1052.16,23.74],[1002.44,23.56],13],[[998.65,27.5],[998.54,62.43],9]] as [XY,XY,number][]){const f=facade(a,b,y);f.panel(f.len/2,1.67,.20,f.len,3.34,.4,'#b6ae96');yield* windows(f,2,bays,3.7,5.45,1.40,2.5);
   for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;arch(f,u,11.55,1.45,2.5,y);f.panel(u,1.75,.40,2.30,2.62,.05,C.glass,false,1);if(i%4===1){balcony(f,u,3.92,2.5);balcony(f,u,7.60,2.5);}if(i%4===3)yield;}
   f.panel(f.len/2,3.22,.34,f.len,.68,.48,'#514437');for(let u=.6;u<f.len;u+=.8)f.panel(u,14.7,.37,.22,.27,.44,C.ivory,true);f.panel(f.len/2,15.55,.12,f.len,.24,.50,C.base);yield;
  }
 });
 // E10: long concrete apartment frontage. Neutral finish: the reference is B&W.
 building('Blocul 6 · Ciuflea','w87155334',30.0,'#b1b2a5',[1554,-50],10,function*(p,y,h){
  const f=facade([1476.23,-50.09],[1631.42,-49.71],y),bays=26,pitch=f.len/bays;
  for(let row=0;row<9;row++){for(let i=0;i<bays;i++){const u=(i+.5)*pitch,yy=4.35+row*2.83,closed=(i*5+row*3)%7<3;f.panel(u,yy,.38,pitch-.3,2.12,.06,closed?'#71837d':'#424f4b',false,1);f.panel(u,yy-.67,.79,pitch-.12,.76,.70,i%3?'#a8aca0':'#b9b9a9');f.panel(u,yy-1.15,.82,pitch+.02,.18,1.05,C.ivory);for(const du of[-pitch/2+.16,0,pitch/2-.16])f.panel(u+du,yy+.3,.46,.075,1.58,.12,C.ivory,true);if(i%5===4)yield;}yield;}
  for(let i=0;i<bays;i++){const u=(i+.5)*pitch;f.panel(u,1.58,.38,pitch-.8,2.8,.04,C.glass,false,1);f.panel(u,3.20,.48,pitch-.3,.55,.5,i%4?'#69685c':'#877868');if(i%5===4)yield;}
  for(let i=0;i<=bays;i+=3)f.panel(i*pitch,17.0,.68,.50,26,.80,C.ivory);yield;
 });
 return mesh;
}
