import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Assign finishes to the existing architectural surfaces, without coplanar skins.
 * Coordinates below are in the original Maya asset, before footprint alignment. */
export function finishOpera(model:T.Group){
  const stone=new T.MeshStandardMaterial({name:'Opera · calcar deschis',color:'#d7d4c7',roughness:.86});
  const bronze=new T.MeshStandardMaterial({name:'Opera · friză de bronz',color:'#444039',roughness:.73,metalness:.32});
  const glass=new T.MeshStandardMaterial({name:'Opera · geamuri ambrate',color:'#aa9770',roughness:.28,metalness:.24});
  const sideGlass=new T.MeshStandardMaterial({name:'Opera · geamuri laterale',color:'#758e87',roughness:.31,metalness:.2});
  const stairs=new T.MeshStandardMaterial({name:'Opera · trepte de piatră',color:'#93958e',roughness:.95});
  const roof=new T.MeshStandardMaterial({name:'Opera · acoperiș',color:'#a1a49e',roughness:.98});
  const doors=new T.MeshStandardMaterial({name:'Opera · uși și tâmplărie',color:'#5e4b37',roughness:.66,metalness:.13});
  const palette=[stone,bronze,glass,sideGlass,stairs,roof,doors];
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3(),edge=new T.Vector3();
  model.traverse(object=>{
    if(!(object instanceof T.Mesh))return;
    const geometry=object.geometry,position=geometry.getAttribute('position'),index=geometry.getIndex();
    const batches:number[][]=palette.map(()=>[]),count=index?.count??position.count;
    for(let i=0;i<count;i+=3){
      const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
      a.fromBufferAttribute(position,ids[0]);b.fromBufferAttribute(position,ids[1]);c.fromBufferAttribute(position,ids[2]);
      normal.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();
      const x=(a.x+b.x+c.x)/3,y=(a.y+b.y+c.y)/3,z=(a.z+b.z+c.z)/3;
      const minY=Math.min(a.y,b.y,c.y),maxY=Math.max(a.y,b.y,c.y);
      let material=0;
      // The original front frieze already contains its relief geometry.
      if(minY>9.42&&maxY<10.52&&(x>9.29||z>7.18||z<-13.07))material=1;
      else if(x>4.30&&x<4.48&&y>6.19&&y<8.95&&Math.abs(normal.x)>.9)material=2;
      else if(x>4.51&&x<4.60&&y>3.36&&y<5.27&&Math.abs(normal.x)>.9)material=z>-3.73&&z<-1.59?6:3;
      else if(Math.abs(normal.z)>.9&&x<-9.7&&x>-33.3&&y>4.63&&y<8.91&&(Math.abs(z-7.244)<.035||Math.abs(z+12.966)<.035))material=3;
      else if(x>9.25&&y<3.4&&z>-9.075&&z<3.78&&(Math.abs(normal.x)>.9||normal.y>.8))material=4;
      else if(normal.y>.7&&y>10)material=5;
      batches[material].push(...ids);
    }
    geometry.clearGroups();let start=0;const indices:number[]=[];
    batches.forEach((batch,i)=>{if(batch.length){indices.push(...batch);geometry.addGroup(start,batch.length,i);start+=batch.length;}});
    geometry.setIndex(indices);object.material=palette;
  });
  // Narrow frames subdivide the source's single large upper window opening.
  const frames:T.BufferGeometry[]=[];
  const bar=(y:number,z:number,h:number,w:number)=>{const g=new T.BoxGeometry(.035,h,w);g.translate(4.435,y,z);frames.push(g);};
  for(let i=0;i<=18;i++)bar(7.569,-7.032+8.89*i/18,2.726,.022);
  for(const y of[6.22,7.06,8.04,8.92])bar(y,-2.587,.023,8.89);
  const geometry=mergeGeometries(frames)!;frames.forEach(g=>g.dispose());
  const mesh=new T.Mesh(geometry,doors);mesh.name='Opera · ramele ferestrelor';model.add(mesh);
  return palette;
}
