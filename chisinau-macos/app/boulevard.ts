import * as T from 'three';
import layout from '../data/boulevard.json';
import segments from '../data/boulevard-segments.json';
import {landscapeLayer} from './landscape-layer';
import {boulevardMaterial} from './boulevard-material';
import {slattedBin} from './street-furniture';

const palette:Record<string,string>={asphalt:'#656968',white:'#d1d0ba',yellow:'#b6a04c',paver:'#a0a298',red_paver:'#906c60',bike:'#8a5c57',bike_edge:'#c8c7b3',soil:'#64604a',edge:'#959d92',tactile:'#b8a568',curb:'#a9ada1',grass:'#597646',square:'#b1ad94',square_band:'#636e68'};
const style:Record<string,number>={asphalt:3,white:0,yellow:0,paver:2,red_paver:2,bike:7,bike_edge:0,soil:0,edge:0,tactile:8,curb:0,grass:4,square:1,square_band:0};
const smooth=(a:number,b:number,v:number)=>{const t=T.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};

/** Only the photographed USMF promenade has an additional local terrace.
 * It rejoins the original DEM on four sides. Boulevard and other frontages
 * use the shared native smoothed grade and remain connected to the existing city.
 */
export function boulevardProfile(raw:(x:number,z:number)=>number){
 return(x:number,z:number)=>{
  const g=raw(x,z);if(x< -1578||x> -1453||z<24||z>39)return g;
  const ends=smooth(-1578,-1572,x)*(1-smooth(-1460,-1453,x));
  const raised=.70*smooth(24,26.8,z)*(1-smooth(30.5,39,z));
  return g+raised*ends;
 };
}

export function createBoulevard(scene:T.Scene,raw:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const ground=boulevardProfile(raw);
 const layer=landscapeLayer(scene,'Bulevardul Ștefan cel Mare',ground,loaded,{material:boulevardMaterial(),maxEdge:3.5,residentDistance:630});
 const {job,box,cylinder,beam,put,surfaceStaged}=layer;
 const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 function base(x:number,z:number){return ground(x,z)+.14;}
 function bench(x:number,z:number,angle:number){
  const y=base(x,z),c=Math.cos(angle),s=Math.sin(angle);
  const part=(u:number,h:number,w:number,ww:number,hh:number,dd:number,col:string)=>box(x+u*c+w*s,y+h,z-u*s+w*c,ww,hh,dd,col,true,false,angle);
  for(const u of[-.78,.78]){part(u,.25,0,.25,.5,.51,'#92998e');part(u,.72,-.20,.065,.65,.065,'#39423a');}
  for(let i=0;i<5;i++){part(0,.51,-.23+i*.105,1.95,.075,.09,'#8e7858');part(0,.69+i*.075,-.25,1.95,.064,.064,'#8e7858');}
 }
 function lamp(x:number,z:number,angle:number){
  const y=base(x,z),sign=angle===0?-1:1;
  cylinder(x,y+.23,z,.15,.22,.46,'#959e96',true,8);
  cylinder(x,y+4.32,z,.055,.105,8.5,'#909c96',false,7);
  beam(v(x,y+8.45,z),v(x,y+8.80,z+sign*1.9),.045,'#9ba69c');
  box(x,y+8.79,z+sign*2.05,.32,.13,.95,'#aab5aa',true);
  box(x,y+8.713,z+sign*2.09,.24,.017,.69,'#d6d8c4',true);
 }
 function bin(x:number,z:number){slattedBin(layer,x,base(x,z),z);}
 function bollard(x:number,z:number){const y=base(x,z);cylinder(x,y+.06,z,.13,.15,.12,'#3b443e',true,8);cylinder(x,y+.36,z,.049,.082,.60,'#343d37',true,8);const g=new T.SphereGeometry(.082,8,5);g.translate(x,y+.70,z);put(g,'#343d37',0,true);}
 function treeSupport(x:number,z:number){
  const y=base(x,z),col='#958262';
  for(const dx of[-.55,.55])for(const dz of[-.55,.55]){box(x+dx,y+.98,z+dz,.07,1.96,.07,col,true);}
  for(const sign of[-1,1]){box(x,y+1.51,z+sign*.55,1.17,.075,.065,col,true);box(x+sign*.55,y+1.51,z,.065,.075,1.17,col,true);}
  for(const dz of[-.52,.52])beam(v(x-.52,y+1.43,z+dz),v(x+.52,y+.80,z+dz),.022,col);
 }
 function crossingSign(x:number,z:number,angle:number){
  const y=base(x,z);cylinder(x,y+1.55,z,.028,.036,3.1,'#939e94',true,6);
  box(x,y+2.67,z,.60,.61,.046,'#3d6890',true,false,angle);
  const tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-.24,0,0,.24,0,0,0,.42,0],3));tri.computeVertexNormals();tri.translate(0,2.45,.027);tri.rotateY(angle);tri.translate(x,y,z);put(tri,'#c1c8b7',0,true);
  const q=new T.BoxGeometry(.045,.22,.010);q.translate(0,2.63,.034);q.rotateY(angle);q.translate(x,y,z);put(q,'#344941',0,true);
 }
 function planter(x:number,z:number){const y=base(x,z);cylinder(x,y+.29,z,.52,.39,.58,'#ab8f81',true,10);cylinder(x,y+.54,z,.45,.45,.07,'#5b5c41',true,10);layer.shrub(x,y+.56,z,.44,.20,.43,'#456537');for(let i=0;i<6;i++){const a=i/6*Math.PI*2;layer.shrub(x+Math.cos(a)*.25,y+.74,z+Math.sin(a)*.25,.12,.06,.12,i%2?'#b7b395':'#9e524e');}}
 function morphologySteps(x:number,z:number){
  const low=raw(x,-20.6)+.14,high=Math.max(low+.42,raw(x,-23.5)+.14),rise=Math.min(.84,high-low),n=Math.ceil(rise/.14);
  for(let i=0;i<n;i++)box(x,low+rise*(i+1)/n-.40,-20.7-(i+.5)*3/n,9.3,.8,3/n+.006,'#687371',false,true);
  for(const xx of[x-4.4,x,x+4.4]){
   beam(v(xx,low+.95,-20.7),v(xx,low+rise+.95,-23.6),.023,'#b3beb3');
   for(const zz of[-20.8,-23.4]){const yy=low+rise*(-zz-20.7)/3;cylinder(xx,yy+.46,zz,.024,.024,.92,'#b3beb3',true,6);}
  }
 }
 function squareProp(kind:string,x:number,z:number){
  const y=base(x,z);
  if(kind==='square_lamp'){box(x,y+1.65,z,.24,3.30,.24,'#a5ada1',true);box(x,y+2.30,z-.127,.07,.7,.014,'#d1d3b8',true);}
  else if(kind==='square_bench'){for(const dx of[-.9,.9])box(x+dx,y+.27,z,.35,.54,.60,'#828d83',true);for(let i=0;i<5;i++)box(x,y+.58,z-.25+i*.125,2.1,.08,.105,'#968264',true);}
  else{box(x,y+.38,z,.88,.76,.88,'#8f988d',true);layer.shrub(x,y+.76,z,.36,.30,.36,'#53733e',true);}
 }
 function underpassCanopy(x:number,z:number){
  const y=base(x,z),dark='#414e4b';
  // Repeated angular frames and orange panels from the municipal gallery.
  // The central opening stays clear; the underground passage is native terrain.
  for(const side of[-1,1]){
   const zz=z+side*1.8;
   box(x,y+.44,zz,6.6,.88,.25,'#828c81',false);
   const points=[v(x-3.6,y+1.05,zz),v(x-1.6,y+3.2,zz),v(x+2.8,y+3.25,zz),v(x+3.4,y+1.25,zz)];
   for(let i=1;i<points.length;i++)beam(points[i-1],points[i],.09,dark,0,false);
   box(x+.3,y+1.63,zz,4.9,1.02,.035,'#af693d',false);
   for(const xx of[-1.6,.5,2.8])box(x+xx,y+1.93,zz,.065,2.02,.065,dark,true);
  }
  box(x+.35,y+3.20,z,4.95,.10,3.7,'#985e3c');
  for(const dx of[-1.6,.6,2.8])box(x+dx,y+3.28,z,.075,.09,3.8,dark,true);
 }
 for(const cell of layout.cells)job(`${segments.segments.find(s=>cell.x>=s.start&&cell.x<s.end)?.name??'racord'} · ${cell.x}/${cell.z}`,cell.x,cell.z,function*(){
  for(const patch of cell.patches){
   const k=patch.kind;
   const step=k.startsWith('usmf_step_')?Number(k.slice(-1)):-1;
   yield* surfaceStaged(patch.rings,palette[k]??'#a3a497',style[k]??0,(x,z)=>{
    if(step>=0)return raw(x,z)+.14+.70*((step+1)/5)*smooth(-1578,-1572,x)*(1-smooth(-1460,-1453,x));
    const road=k==='asphalt'||k==='white'||k==='yellow';
    // Wheelchair-friendly low curbs at each mapped crossing; shared road profile
    // is sampled consistently by geometry and collision at all cell boundaries.
    let lift=road?.075:k==='grass'?.115:k==='soil'?.12:k==='curb'?.17:.14;
    if(!road&&k!=='grass'&&k!=='soil')for(const [cx,cz]of layout.crossings){if(Math.abs(x-cx)<3.8&&Math.abs(Math.abs(z-cz)-9)<3)lift=T.MathUtils.lerp(.083,lift,smooth(2.2,3.8,Math.abs(x-cx)));}
    return ground(x,z)+lift;
   },true);
   if(step>=0){
    const front=24+step*.56,values:number[]=[];
    for(const ring of patch.rings)for(let i=1;i<ring.length;i++){
     let a=ring[i-1],b=ring[i];if(Math.abs(a[1]-front)>.002||Math.abs(b[1]-front)>.002)continue;if(a[0]>b[0])[a,b]=[b,a];
     const ends=(x:number)=>smooth(-1578,-1572,x)*(1-smooth(-1460,-1453,x));
     const a0=raw(a[0],front)+.14+.14*step*ends(a[0]),a1=a0+.14*ends(a[0]),b0=raw(b[0],front)+.14+.14*step*ends(b[0]),b1=b0+.14*ends(b[0]);
     values.push(a[0],a0,front,b[0],b1,front,b[0],b0,front,a[0],a0,front,a[0],a1,front,b[0],b1,front);
    }
    if(values.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(values,3));g.computeVertexNormals();put(g,'#90988b');}
   }
   yield;
  }
  for(const p of cell.props){
   const angle=('angle' in p?p.angle:0) as number;
   if(p.kind==='lamp')lamp(p.x,p.z,angle);
   else if(p.kind==='bench')bench(p.x,p.z,angle);
   else if(p.kind==='bin')bin(p.x,p.z);
   else if(p.kind==='bollard')bollard(p.x,p.z);
   else if(p.kind==='tree_support')treeSupport(p.x,p.z);
   else if(p.kind==='crossing_sign')crossingSign(p.x,p.z,angle);
   else if(p.kind==='bus_stop')continue;
   else if(p.kind==='planter')planter(p.x,p.z);
   else if(p.kind==='garden_hedge')layer.shrub(p.x,base(p.x,p.z),p.z,.56,.24,.56,'#496c39',true);
   else if(p.kind==='low_hedge')layer.shrub(p.x,base(p.x,p.z),p.z,.8,.23,.7,'#4e6b3d',true);
   else if(p.kind==='morphology_steps')morphologySteps(p.x,p.z);
   else if(p.kind==='rose_bed'){for(let i=0;i<8;i++){layer.shrub(p.x+i*.40-1.4,base(p.x,p.z),p.z,.30,.24,.45,'#527341',true);layer.shrub(p.x+i*.40-1.4,base(p.x,p.z)+.40,p.z,.22,.085,.28,'#a45658');}}
   else if(p.kind.startsWith('square_'))squareProp(p.kind,p.x,p.z);
   else if(p.kind==='underpass_canopy')underpassCanopy(p.x,p.z);
   yield;
  }
 },cell.coverage);
 // Four thin contact wires follow the full boulevard with sag, visible only
 // nearby; no physics, animation or per-frame spline allocation is needed.
 for(let x=-1950;x<1660;x+=36)job(`fire troleibuz ${x}`,x+18,4,function*(){
  const end=Math.min(1685,x+36),f=layout.route.find(r=>r.p.some(p=>p[0]<=x+18)&&r.p.some(p=>p[0]>=x+18)),z=f?f.p.reduce((n,p)=>n+p[1],0)/f.p.length:4;
  for(const offset of[-5.75,-5.20,5.20,5.75]){
   let a=v(x,raw(x,z+offset)+6.3,z+offset);
   for(let i=1;i<=4;i++){const xx=x+(end-x)*i/4,b=v(xx,raw(xx,z+offset)+6.3-.12*Math.sin(i*Math.PI/4),z+offset);beam(a,b,.009,'#46534a',0,true);a=b;}yield;
  }
 });
 return{...layer,get ready(){return layer.ready;},get residentCount(){return layer.residentCount;},ground};
}
