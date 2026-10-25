import * as T from 'three';
import type {landscapeLayer} from './landscape-layer';
type Layer=ReturnType<typeof landscapeLayer>;

/** Curved pale concrete ends and brown timber, photographed on Eugen Doga. */
export function concreteBench(l:Layer,x:number,y:number,z:number,angle:number){
 const part=(g:T.BufferGeometry,color:string,fine=false,collide=false)=>{g.rotateY(angle);g.translate(x,y,z);l.put(g,color,0,fine,collide);};
 for(const side of[-1,1]){
  const s=new T.Shape();s.moveTo(-.37,0);s.lineTo(.42,0);s.lineTo(.42,.13);
  s.bezierCurveTo(.41,.33,.25,.44,.09,.45);s.lineTo(-.05,.46);
  s.bezierCurveTo(-.24,.49,-.23,.85,-.39,.94);s.lineTo(-.52,.91);
  s.bezierCurveTo(-.37,.70,-.47,.27,-.37,0);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:.17,bevelEnabled:false,curveSegments:6});
  // Profile coordinates are depth/height; extrusion runs along the seat.
  g.rotateY(Math.PI/2);g.translate(side*.84-.085,0,0);part(g,'#a8aa9e');
 }
 for(let i=0;i<5;i++){const g=new T.BoxGeometry(1.76,.06,.088);g.translate(0,.475,-.13+i*.097);part(g,'#806248');}
 for(let i=0;i<4;i++){const g=new T.BoxGeometry(1.76,.092,.057);g.rotateX(-.16);g.translate(0,.59+i*.096,-.215-i*.029);part(g,'#806248');}
}

/** No individual lights or transparent materials: one shared opaque cell batch. */
export function historicLamp(l:Layer,x:number,y:number,z:number){
 const iron='#303a35';
 l.cylinder(x,y+.07,z,.27,.34,.14,iron,false,10);
 l.cylinder(x,y+.34,z,.17,.25,.42,iron,false,10);
 l.cylinder(x,y+1.80,z,.052,.10,2.65,iron,false,8);
 for(const h of[.14,.55,.71,2.80,3.09])l.cylinder(x,y+h,z,h<1?.18:.10,h<1?.18:.10,.075,iron,true,8);
 const shade=new T.CylinderGeometry(.255,.14,.48,4);shade.rotateY(Math.PI/4);shade.translate(x,y+3.35,z);l.put(shade,'#bcc5b2');
 for(const sx of[-1,1])for(const sz of[-1,1])l.beam(new T.Vector3(x+sx*.10,y+3.1,z+sz*.10),new T.Vector3(x+sx*.18,y+3.59,z+sz*.18),.018,iron);
 const roof=new T.ConeGeometry(.39,.19,4);roof.rotateY(Math.PI/4);roof.translate(x,y+3.69,z);l.put(roof,iron);
 l.cylinder(x,y+3.82,z,.032,.055,.12,iron,true,6);
}

/** Small reusable sculpture tools; all positions are baked into cell vertices. */
export function sculpture(l:Layer,x:number,y:number,z:number,angle=0){
 const color='#586056';
 const put=(g:T.BufferGeometry,c=color,fine=false,physical=false)=>{g.rotateY(angle);g.translate(x,y,z);l.put(g,c,0,fine,physical);};
 const ball=(u:number,h:number,v:number,rx:number,ry:number,rz:number,c=color,fine=false)=>{const g=new T.SphereGeometry(1,10,7);g.scale(rx,ry,rz);g.translate(u,h,v);put(g,c,fine);};
 const rod=(a:number[],b:number[],r:number,c=color,fine=false)=>{const aa=new T.Vector3(...a as [number,number,number]),bb=new T.Vector3(...b as [number,number,number]),d=bb.clone().sub(aa),g=new T.CylinderGeometry(r*.83,r,d.length(),7);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate((aa.x+bb.x)/2,(aa.y+bb.y)/2,(aa.z+bb.z)/2);put(g,c,fine);};
 const block=(u:number,h:number,v:number,w:number,hh:number,d:number,c=color,physical=false)=>{const g=new T.BoxGeometry(w,hh,d);g.translate(u,h,v);put(g,c,false,physical);};
 return{put,ball,rod,block};
}
