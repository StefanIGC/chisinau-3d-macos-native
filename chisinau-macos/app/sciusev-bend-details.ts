import * as T from 'three';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
/** Visible July2025 details. Local footprint inferred from the roof and neighbouring plans. */
export function createSciusevBendDetails(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · completări acces',ground,loaded),a=photoArchitecture(m);
 m.job('125 · pavilion acces',streetRect(-955.0,639.1,9.2,6.2),[],function*(){
  const y=ground(-954.9,636)+.12,h=3.15;
  // Two solid side bays and a 4.6m open-through lane. The pale doors use the
  // shared interactive gate; no invisible full-footprint collider closes it.
  m.box(-958.15,y+h/2-2.5,639.1,2.9,h+5,6.2,'#969e92',false,true);
  m.box(-951.1,y+h/2-2.5,639.1,1.5,h+5,6.2,'#969e92',false,true);
  m.box(-955,y+3.05,639.1,9.2,.20,6.2,'#58675f',false,true);
  a.roof(-955,639.1,9.65,6.65,y+h,1.3,'#58655e');yield;
  const f=m.facade([-950.4,636],[-959.6,636],y);
  for(const u of[.12,1.55,6.15,9.08])f.panel(u,1.55,.12,.15,3.1,.19,'#485b55');
  for(const yy of[.15,2.9])f.panel(4.6,yy,.12,9.2,.12,.22,'#485b55');
  f.window(7.75,1.8,1.85,1.25,'#a8b1a4','#566b64');
  for(const u of[7.30,8.20])f.panel(u,1.8,.43,.055,1.24,.06,'#bac1b3',true);
  f.panel(.73,1.28,.18,.95,2.4,.07,'#74897f');
  f.panel(.73,2.45,.20,1.10,.16,.10,'#b8c0b2');yield;
 });
 // At129 the visible street-side boundary continues to a metal gate.
 m.job('129 · zid și cutie utilități',streetRect(-1005.6,600.1,3.4,2.4),[],function*(){
  const y=ground(-1005.6,600.1);m.box(-1005.45,y+1.0,598.45,2.2,2.0,.22,'#9d9f8e',false,true,Math.atan2(1.1,-1.9));
  m.box(-1004.9,y+1.32,598.9,.44,.55,.18,'#b0b6a7',false,false);yield;
 });
 // Photographed road-hump warning and30km/h sign, original simple meshes.
 m.job('Șciusev129 · limită30',streetRect(-1005,597,1,1),[],function*(){
  const y=ground(-1005,597),f=m.facade([-1004.5,597.32],[-1005.5,596.68],y),angle=Math.atan2(.64,-1);
  const q=f.at(.5,.18),disk=new T.CircleGeometry(.30,20);disk.rotateY(angle);disk.translate(q[0],y+2.28,q[1]);m.put(disk,'#ddd9b4');
  const ring=new T.TorusGeometry(.272,.029,4,20);ring.rotateY(angle);ring.translate(q[0]+.015,y+2.28,q[1]-.023);m.put(ring,'#a25245');
  f.label('30',.5,2.28,.24,'#35433b',.22);
  const tri=new T.BufferGeometry(),pts=[f.at(.12,.18),f.at(.88,.18),f.at(.5,.18)];tri.setAttribute('position',new T.Float32BufferAttribute([pts[0][0],y+2.76,pts[0][1],pts[1][0],y+2.76,pts[1][1],pts[2][0],y+3.42,pts[2][1]],3));tri.computeVertexNormals();m.put(tri,'#b45c4d');
  const inner=new T.BufferGeometry(),pp=[f.at(.23,.20),f.at(.77,.20),f.at(.5,.20)];inner.setAttribute('position',new T.Float32BufferAttribute([pp[0][0],y+2.83,pp[0][1],pp[1][0],y+2.83,pp[1][1],pp[2][0],y+3.30,pp[2][1]],3));inner.computeVertexNormals();m.put(inner,'#d6d6b8');
  for(let i=0;i<7;i++){const u=.32+i*.06,h=.04+.12*Math.sin(i/6*Math.PI);f.panel(u,2.89+h/2,.235,.065,h,.024,'#414b3f',true);}yield;
 });
 return m;
}
