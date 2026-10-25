import * as T from 'three';
import {landscapeLayer} from './landscape-layer';
import {lettering} from './street-mesh';
type Layer=Pick<ReturnType<typeof landscapeLayer>,'box'|'cylinder'|'beam'|'put'>;
/** Mapped positions stay in the caller. Furniture shares the cell's GPU batches. */
export function slattedBin(layer:Layer,x:number,y:number,z:number,rim='#46534a'){
 const {cylinder,box}=layer;
 cylinder(x,y+.40,z,.205,.20,.76,'#303933',true,12);
 for(let i=0;i<14;i++){const a=i*Math.PI*2/14;box(x+Math.sin(a)*.225,y+.41,z+Math.cos(a)*.225,.074,.68,.04,'#82684b',true,false,a);}
 for(const h of[.13,.74])cylinder(x,y+h,z,.25,.25,.055,rim,true,14);
 cylinder(x,y+.774,z,.181,.181,.008,'#202823',true,14);
 for(const dx of[-.18,.18])box(x+dx,y+.055,z,.065,.11,.30,rim,true);
}
export function scrollBench(layer:Layer,x:number,y:number,z:number,angle:number,wood='#856244'){
 const {box,beam,put}=layer,c=Math.cos(angle),s=Math.sin(angle),iron='#303932';
 const at=(u:number,h:number,w:number)=>new T.Vector3(x+u*c+w*s,y+h,z-u*s+w*c);
 const part=(u:number,h:number,w:number,ww:number,hh:number,dd:number,color:string)=>{const p=at(u,h,w);box(p.x,p.y,p.z,ww,hh,dd,color,true,false,angle);};
 for(let i=0;i<5;i++)part(0,.47,-.21+i*.102,1.94,.065,.086,wood);
 for(let i=0;i<4;i++)part(0,.65+i*.105,-.26-i*.023,1.94,.086,.06,wood);
 for(const side of[-1,1]){
  const u=side*.78;for(const w of[-.22,.22])beam(at(u,.025,w),at(u,.47,w*.65),.037,iron);
  for(const pts of[[at(u,.07,-.22),at(u,.45,-.25),at(u,.76,-.34),at(u,1,-.36)],[at(u,.48,.2),at(u,.67,.29),at(u,.77,.12),at(u,.79,-.10),at(u,.83,-.29)]])put(new T.TubeGeometry(new T.CatmullRomCurve3(pts),4,.033,4,false),iron,0,true);
 }
}
/** Black ornamental central shelters, clear glazing and an unobstructed front. */
export function boulevardShelter(layer:Layer,x:number,y:number,z:number,angle:number,name:string){
 const {box,cylinder,put}=layer,c=Math.cos(angle),s=Math.sin(angle),iron='#303632';
 const at=(u:number,h:number,w:number)=>new T.Vector3(x+u*c+w*s,y+h,z-u*s+w*c);
 const part=(u:number,h:number,w:number,ww:number,hh:number,dd:number,color:string,fine=false,kind=0)=>{
  const g=new T.BoxGeometry(ww,hh,dd);g.translate(u,h,w);g.rotateY(angle);g.translate(x,y,z);put(g,color,kind,fine);
 };
 for(const u of[-2.8,-.94,.94,2.8])part(u,1.31,.8,.065,2.62,.065,iron);
 for(const u of[-2.8,2.8])part(u,1.31,-.87,.065,2.62,.065,iron);
 part(0,2.68,0,5.95,.23,2.12,iron);part(0,2.81,0,6.04,.035,2.18,'#656a62');
 for(const h of[.24,2.33])part(0,h,.8,5.65,.04,.035,iron,true);
 for(const u of[-1.87,0,1.87])part(u,1.28,.81,1.78,2.00,.016,'#b4c6c1',false,9);
 // Narrow tall end panel appears in the photographed Costin shelter.
 part(2.79,1.48,-.12,.08,1.93,1.32,'#292f2c');
 part(-2.8,1.30,0,.016,2.07,1.55,'#b4c6c1',false,9);
 for(let i=0;i<16;i++){
  const a=new T.TorusGeometry(.104,.009,4,10);a.scale(1.55,1,1);a.translate(-2.57+i*.343,2.43,-.947);a.rotateY(angle);a.translate(x,y,z);put(a,iron,0,true);
 }
 // Shelters use a straight black-supported wooden seat, not the park armchair.
 for(const u of[-1.6,.9])part(u,.235,.35,.055,.47,.45,iron,true);
 for(let i=0;i<4;i++)part(-.35,.485,.15+i*.105,3.25,.065,.085,'#7d6a50',true);
 const label=lettering(name.replace(/^[Ss]trada /,'').slice(0,35),.11);label.rotateY(Math.PI);label.translate(0,2.66,-1.077);label.rotateY(angle);label.translate(x,y,z);put(label,'#d1d0bf',0,true);
 const pole=at(-3.24,0,-.54);cylinder(pole.x,y+1.63,pole.z,.03,.036,3.26,'#859087',true,7);
 const sign=new T.BoxGeometry(.49,.66,.055);sign.translate(-3.24,2.96,-.54);sign.rotateY(angle);sign.translate(x,y,z);put(sign,'#286591',0,true);
 for(const [u,h,w,ww,hh,dd,col]of [[-3.24,2.99,-.575,.35,.39,.012,'#d4d6c8'],[-3.24,2.99,-.59,.21,.24,.013,'#3d4d4b'],[-3.24,1.89,-.54,.19,.53,.095,'#d4d6c8']] as [number,number,number,number,number,number,string][])part(u,h,w,ww,hh,dd,col,true);
 const bin=at(3.38,0,.5);slattedBin(layer,bin.x,y,bin.z);
}
