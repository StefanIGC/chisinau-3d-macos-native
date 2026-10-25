import * as T from 'three';
import type {streetMesh} from './street-mesh';
/** Shared low-cost facade details: thin relief is a plane; silhouettes remain solid. */
export function photoFrontageDetails(mesh:ReturnType<typeof streetMesh>){
 const {facade,put}=mesh;
 const C={wall:'#b8b6a1',trim:'#c6c2af',base:'#7b7d70',roof:'#7b8278',glass:'#506666',frame:'#b4bcad',iron:'#424e45'};
 type Face=ReturnType<typeof facade>;
 // Flat reveals and mortar joints need two triangles, not six box faces.
 // Keep the actual sills, balconies, columns and silhouette in solid geometry.
 function flat(f:Face,u:number,h:number,v:number,w:number,hh:number,color:string,fine=true,twoSided=false){
  const a=f.at(u,v),b=f.at(1),c=f.at(0),angle=Math.atan2(-(b[1]-c[1]),b[0]-c[0]);
  for(const turn of twoSided?[0,Math.PI]:[0]){const g=new T.PlaneGeometry(w,hh);g.rotateY(angle+turn);g.translate(a[0],f.y+h,a[1]);put(g,color,fine);}
 }
 function window(f:Face,u:number,h:number,w:number,hh:number,trim=C.trim,frame=C.frame,offset=0){
  f.panel(u,h,.31+offset,w,hh,.03,C.glass,false,1);
  for(const s of[-1,1])flat(f,u+s*(w/2+.07),h,.36+offset,.13,hh+.21,trim);
  flat(f,u,h+hh/2+.075,.39+offset,w+.3,.13,trim);
  f.panel(u,h-hh/2-.075,.34+offset,w+.3,.13,.28,trim,true);
  flat(f,u,h,.40+offset,.06,hh,frame);flat(f,u,h+hh*.27,.41+offset,w,.055,frame);
 }
 function* windows(f:Face,rows:number,bays:number,first:number,pitch:number,w=1.6,hh=2.35,skip?:(r:number,i:number)=>boolean){
  for(let r=0;r<rows;r++){for(let i=0;i<bays;i++){if(!skip?.(r,i))window(f,(i+.5)*f.len/bays,first+r*pitch,w,hh,C.trim,C.frame);if(i%5===4)yield;}yield;}
 }
 function balcony(f:Face,u:number,y:number,w=2.5,stone=true){
  f.panel(u,y,.87,w+.15,.18,1.72,C.base);
  f.panel(u,y+1.05,1.65,w+.15,.13,.20,stone?C.trim:C.iron,true);
  for(let n=0;n<=8;n++)flat(f,u-w/2+n*w/8,y+.56,1.66,stone?.13:.035,.94,stone?C.trim:C.iron,true,true);
  for(const side of[-1,1])f.panel(u+side*w/2,y+.56,.91,.10,.95,1.55,stone?C.trim:C.iron,true);
 }
 function* parapet(f:Face,y:number){
  f.panel(f.len/2,y+.60,.12,f.len,.17,.40,C.trim);
  for(let u=.20;u<f.len;u+=.42){flat(f,u,y+.28,.23,.11,.56,C.trim,true,true);if(Math.round(u/.42)%20===19)yield;}
  for(let u=0;u<=f.len;u+=4.1)f.panel(u,y+.37,.12,.39,.76,.44,C.trim);yield;
 }
 function* rustication(f:Face,h=3.9,color=C.base){
  f.panel(f.len/2,h/2,.10,f.len,h,.2,color);
  for(let row=0;row<Math.floor(h/.57);row++){
   const yy=.26+row*.57;flat(f,f.len/2,yy,.23,f.len,.035,'#686e63');
   for(let u=(row%2)*.64;u<f.len;u+=1.28)flat(f,u,yy+.27,.23,.026,.5,'#686e63');
   yield;
  }
  f.panel(f.len/2,h+.08,.28,f.len,.22,.55,C.trim);yield;
 }
 function* shopfronts(f:Face,bays:number,color='#586053'){
  for(let i=0;i<bays;i++){
   const u=(i+.5)*f.len/bays,w=Math.min(2.8,f.len/bays-.58);
   f.panel(u,1.66,.31,w,2.85,.03,C.glass,false,1);
   for(const sign of[-1,1])f.panel(u+sign*w/2,1.66,.37,.09,2.95,.14,C.frame,true);
   f.panel(u,1.66,.38,.075,2.85,.09,C.frame,true);f.panel(u,3.38,.40,w+.26,.44,.56,color);
   if(i%4===3)yield;
  }yield;
 }
 return {C,flat,window,windows,balcony,parapet,rustication,shopfronts};
}
