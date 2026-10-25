import * as T from 'three';
import {CITY_DATA,CUSTOM_IDS,ROAD_TYPES,roadWidth,buildingHeight,centroid,featureContains,polygonContains,type XY,type MapFeature} from './city-layout';
type Materials={grass:T.Material;pavement:T.Material;road:T.Material;stone:T.Material;trim:T.Material;darkStone:T.Material;roof:T.Material;black:T.Material;glass:T.Material;water:T.Material;white:T.Material;wood:T.Material;gold:T.Material};
export function buildMapGeometry(root:T.Group,m:Materials){
 const boxGeo=new T.BoxGeometry(1,1,1),planeGeo=new T.PlaneGeometry(1,1),materials:T.Material[]=[],textures:T.Texture[]=[];
 const paint=(color:string,metalness=0)=>{const mat=new T.MeshStandardMaterial({color,roughness:metalness?.3:.85,metalness});materials.push(mat);return mat;};
 const layer=(material:T.Material,depth:number)=>{const copy=material.clone();copy.polygonOffset=true;copy.polygonOffsetFactor=-depth;copy.polygonOffsetUnits=-depth*2;materials.push(copy);return copy;};
 const surface={grass:layer(m.grass,1),paving:layer(m.pavement,2),road:layer(m.road,3),path:layer(m.pavement,4),water:layer(m.water,4),marking:layer(m.white,5),roof:layer(m.roof,1)};
 const walls=['#d6cdbb','#ded6c6','#cfc4ae','#c6bbb0','#e0d6c0','#c5c8c0'].map(c=>paint(c));
 const pink=paint('#bca59a'),red=paint('#aa6551'),blueGlass=paint('#397b9b',.48),bronzeGlass=paint('#8a7960',.6),white=paint('#eee7d6'),dark=paint('#384c51'),sage=paint('#94a59a');
 function mesh(g:T.BufferGeometry,mat:T.Material,parent:T.Object3D=root){const o=new T.Mesh(g,mat);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function box(w:number,h:number,d:number,mat:T.Material,x:number,y:number,z:number,parent:T.Object3D=root){const o=mesh(boxGeo,mat,parent);o.scale.set(w,h,d);o.position.set(x,y,z);return o;}
 function plane(w:number,h:number,mat:T.Material,x:number,y:number,z:number,parent:T.Object3D=root){const o=mesh(planeGeo,mat,parent);o.scale.set(w,h,1);o.position.set(x,y,z);o.castShadow=false;return o;}
 function shape(f:MapFeature){const out=new T.Shape(f.p.map(p=>new T.Vector2(p[0],-p[1])));for(const ring of f.holes){if(!polygonContains(ring[0],f.p))continue;out.holes.push(new T.Path(ring.map(p=>new T.Vector2(p[0],-p[1]))));}return out;}
 function flat(f:MapFeature,mat:T.Material,y:number){const g=new T.ShapeGeometry(shape(f));g.rotateX(-Math.PI/2);const pos=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/1200,pos.getZ(i)/1200);const o=mesh(g,mat);o.position.y=y;o.castShadow=false;return o;}
 function ribbon(p:XY[],width:number,mat:T.Material,y:number){const v:number[]=[],uv:number[]=[];for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)continue;const nx=-dz/len*width/2,nz=dx/len*width/2;const points=[[a[0]-nx,a[1]-nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz],[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz]];for(const [x,z]of points){v.push(x,y,z);uv.push(x/1200,z/1200);}}if(!v.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();const o=mesh(g,mat);o.castShadow=false;return o;}
 function text(label:string,w:number,x:number,y:number,z:number,rotation=0){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,1024,128);ctx.font='bold 48px Arial';ctx.fillStyle='#d7c394';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,512,64,1000);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide});materials.push(material);const o=plane(w,w/8,material,x,y,z);o.rotation.y=rotation;return o;}
 const areas=CITY_DATA.features.filter(f=>!f.t.building&&f.p.length>3&&f.p[0][0]===f.p.at(-1)![0]&&f.p[0][1]===f.p.at(-1)![1]);
 for(const f of areas){const t=f.t;if(t.leisure==='park'||t.landuse==='grass'||t.landuse==='flowerbed'||t.landuse==='forest'||t.natural==='wood'||t.natural==='scrub'||t.leisure==='garden')flat(f,surface.grass,.022);else if(t.natural==='water'||t.water||t.amenity==='fountain')flat(f,surface.water,.073);else if(t.amenity==='parking')flat(f,surface.road,.027);else if(t.highway==='pedestrian'||t.highway==='footway'&&t.area==='yes')flat(f,surface.paving,.043);}
 const roads=CITY_DATA.features.filter(f=>f.t.highway&&f.t.area!=='yes');
 // Exact surveyed polylines, including diagonal park alleys and irregular intersections.
 for(const f of roads){const road=ROAD_TYPES.has(f.t.highway),w=roadWidth(f);if(road)ribbon(f.p,w+3.7,surface.paving,.041);ribbon(f.p,w,road?surface.road:surface.path,road?.052:.057);
  if(road&&w>8){let carried=0;for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);for(let d=carried;d<len;d+=12){const end=Math.min(len,d+5);ribbon([[a[0]+dx*d/len,a[1]+dz*d/len],[a[0]+dx*end/len,a[1]+dz*end/len]],.12,surface.marking,.064);}carried=(12-(len-carried)%12)%12;}}
 }
 const official:Record<string,{wall:T.Material;glass?:T.Material;floors:number;name:string;historic?:boolean}>={
  w762704772:{wall:white,glass:blueGlass,floors:5,name:'GUVERNUL REPUBLICII MOLDOVA'},
  r17536997:{wall:pink,floors:9,name:'PARLAMENTUL REPUBLICII MOLDOVA'},
  w27616508:{wall:white,glass:bronzeGlass,floors:6,name:'PREȘEDINȚIA REPUBLICII MOLDOVA'},
  w25525257:{wall:white,glass:dark,floors:2,name:'TEATRUL NAȚIONAL DE OPERĂ ȘI BALET'},
  w26790058:{wall:white,floors:2,name:'MUZEUL NAȚIONAL DE ISTORIE',historic:true},
  w75517098:{wall:red,floors:2,name:'MUZEUL NAȚIONAL DE ARTĂ',historic:true},
  w25187121:{wall:walls[0],floors:2,name:'PRIMĂRIA MUNICIPIULUI CHIȘINĂU',historic:true},
  w25192896:{wall:white,floors:2,name:'SALA CU ORGĂ',historic:true},
  w25194183:{wall:white,floors:3,name:'TEATRUL NAȚIONAL MIHAI EMINESCU',historic:true},
  w32820460:{wall:white,glass:dark,floors:8,name:'RADISSON BLU LEOGRAND'},
  w1396207389:{wall:blueGlass,glass:blueGlass,floors:10,name:'BRISTOL CENTRAL PARK HOTEL'},
  w32977885:{wall:white,glass:blueGlass,floors:4,name:'SUN CITY'},
  w27446239:{wall:white,glass:dark,floors:3,name:'PALATUL NAȚIONAL NICOLAE SULAC'},
  w26790041:{wall:walls[2],floors:4,name:'BIBLIOTECA NAȚIONALĂ'},
  w630789736:{wall:white,floors:3,name:'UNIVERSITATEA TEHNICĂ A MOLDOVEI'},
  w41434940:{wall:white,glass:dark,floors:2,name:'PALATUL REPUBLICII'},
  w991056896:{wall:walls[4],glass:blueGlass,floors:4,name:'GEMENI'}
 };
 for(const f of CITY_DATA.features){if(!f.t.building||CUSTOM_IDS.has(f.id))continue;const style=official[f.id],h=buildingHeight(f),center=centroid(f.p),seed=parseInt(f.id.slice(1))||1,wall=style?.wall??walls[seed%walls.length],floors=style?.floors??Math.max(1,Math.round(h/3.2));
  const g=new T.ExtrudeGeometry(shape(f),{depth:h,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);const o=mesh(g,wall);o.name=f.t.name||`Clădire OSM ${f.id}`;
  flat(f,f.id==='w1396207389'?blueGlass:surface.roof,h+.025);
  let signArea=0;for(let i=1;i<f.p.length;i++)signArea+=f.p[i-1][0]*f.p[i][1]-f.p[i][0]*f.p[i-1][1];
  const maxX=Math.max(...f.p.map(p=>p[0])),minX=Math.min(...f.p.map(p=>p[0])),minZ=Math.min(...f.p.map(p=>p[1])),maxZ=Math.max(...f.p.map(p=>p[1]));
  for(const ring of[f.p,...f.holes])for(let edge=1;edge<ring.length;edge++){const a=ring[edge-1],b=ring[edge],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1.5)continue;let nx=dz/length,nz=-dx/length;if(signArea<0){nx=-nx;nz=-nz;}if(ring!==f.p){nx=-nx;nz=-nz;}const angle=Math.atan2(nx,nz);
   const mid:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];const ledge=box(length,.24,.24,style?.historic?m.trim:wall,mid[0]+nx*.07,h,mid[1]+nz*.07);ledge.rotation.y=angle;
   if(style?.historic){const band=box(length,.18,.19,m.trim,mid[0]+nx*.09,h/2,mid[1]+nz*.09);band.rotation.y=angle;}
   const step=f.id==='w1396207389'?2.8:f.id==='w762704772'?3.35:style?.historic?4:3.6,columns=Math.floor((length-1)/step);if(columns<1)continue;
   for(let i=0;i<columns;i++){const t=(i+.5)/columns,x=a[0]+dx*t+nx*.04,z=a[1]+dz*t+nz*.04;
    if(f.id==='w762704772'){const pilaster=box(.43,h-.4,.34,m.trim,x-.5*step*dx/length, h/2,z-.5*step*dz/length);pilaster.rotation.y=angle;}
    for(let floor=0;floor<floors;floor++){const height=Math.min(2.8,h/floors*.61),y=(floor+.53)*h/floors,width=Math.min(step*.53,length/columns*.66);const panel=plane(width,height,style?.glass??m.glass,x+nx*.03,y,z+nz*.03);panel.rotation.y=angle;
     if(style?.historic||center[0]*center[0]+center[1]*center[1]<180000){const sill=box(width+.22,.13,.24,m.trim,x+nx*.1,y-height/2,z+nz*.1);sill.rotation.y=angle;const divider=box(.055,height,.045,m.trim,x+nx*.09,y,z+nz*.09);divider.rotation.y=angle;}
     if(style?.historic){const arc=new T.Mesh(new T.TorusGeometry(width/2,.1,4,12,Math.PI),m.trim);arc.position.set(x+nx*.06,y+height/2-width/2,z+nz*.06);arc.rotation.y=angle;root.add(arc);}
    }
   }
  }
  if(!style&&h<10&&f.p.length<=6&&maxX-minX<50&&maxZ-minZ<50){const vertices:number[]=[];for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i];vertices.push(a[0],h,a[1],center[0],h+Math.min(3,(maxX-minX)/7),center[1],b[0],h,b[1]);}const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(vertices,3));roof.computeVertexNormals();mesh(roof,m.roof);}
  if(!style)continue;
  const front=f.id==='w25525257'||f.id==='w27616508'||f.id==='w32820460'?maxZ:minZ;
  const frontSign=front===minZ?Math.PI:0,frontOut=front===minZ?-1:1,w=maxX-minX;
  if(f.id!=='w1396207389')text(style.name,Math.min(w*.64,53),(minX+maxX)/2,Math.min(h-.8,style.historic?9.1:12.3),front+frontOut*.3,frontSign);
  if(['w762704772','w25525257','r17536997','w26790058','w25192896','w25194183'].includes(f.id)){
   const entranceWidth=Math.min(w*.36,30),count=f.id==='r17536997'?4:6,baseY=style.historic?5.8:0.6,top=style.historic?11.8:Math.min(h,13.5);
   for(let k=0;k<count;k++){const x=(minX+maxX)/2+(k-(count-1)/2)*entranceWidth/(count-1);const column=mesh(new T.CylinderGeometry(style.historic?.45:.55,style.historic?.48:.55,top-baseY,12),f.id==='w25192896'?sage:m.trim);column.position.set(x,(baseY+top)/2,front+frontOut*.65);}
   box(entranceWidth+2,.55,2.1,m.trim,(minX+maxX)/2,top,front+frontOut*.6);
   for(let i=0;i<5;i++)box(entranceWidth+4+i*.5,.17,2+i*.9,m.darkStone,(minX+maxX)/2,.08+i*.17,front+frontOut*2.7);
  }
  if(f.id==='w762704772'||f.id==='r17536997'){const cx=(minX+maxX)/2;const pole=mesh(new T.CylinderGeometry(.05,.065,9,7),m.black);pole.position.set(cx,h+4.5,front);['#246cb0','#f5ca36','#b84336'].forEach((c,i)=>box(.65,1.3,.025,paint(c),cx+.4+i*.65,h+7,front));const emblem=mesh(new T.SphereGeometry(.65,12,8),m.gold);emblem.scale.set(1,1.3,.14);emblem.position.set(cx,h-.5,front+frontOut*.35);}
  if(f.id==='w25525257'){box(w*.64,11,(maxZ-minZ)*.42,white,center[0],h+5.5,minZ+(maxZ-minZ)*.35);for(let i=0;i<20;i++){const relief=box(1.1,2.2,.5,pink,minX+3+i*(w-6)/20,11,front+.5);relief.rotation.z=Math.sin(i*2.1)*.32;}}
  if(f.id==='w27616508'){box(w*.44,7,(maxZ-minZ)*.72,bronzeGlass,center[0],33.5,center[1]);for(const sign of[-1,1])box(1.3,35,1.9,m.trim,center[0]+sign*w*.24,17.5,front+.45);}
  if(f.id==='w32820460'){box(w*.90,2.2,(maxZ-minZ)*.82,m.roof,center[0],h+.9,center[1]);box(w*.66,3.1,(maxZ-minZ)*.61,blueGlass,center[0],h+2.5,center[1]);}
  if(f.id==='w1396207389'){text('BRISTOL',18,minX-.12,25,center[1],-Math.PI/2);for(let y=3;y<h;y+=2.8)box(w,.07,.05,m.trim,center[0],y,minZ-.045);}
  if(f.id==='w25187121'){const tx=maxX-5,tz=minZ+4;box(6,11,6,m.trim,tx,h+4.8,tz);const clock=document.createElement('canvas');clock.width=clock.height=128;const ctx=clock.getContext('2d')!;ctx.fillStyle='#e9e4d6';ctx.beginPath();ctx.arc(64,64,59,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#34403c';ctx.lineWidth=4;for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(64+Math.sin(a)*48,64+Math.cos(a)*48);ctx.lineTo(64+Math.sin(a)*54,64+Math.cos(a)*54);ctx.stroke();}ctx.beginPath();ctx.moveTo(64,34);ctx.lineTo(64,64);ctx.lineTo(89,79);ctx.stroke();const tex=new T.CanvasTexture(clock);tex.colorSpace=T.SRGBColorSpace;textures.push(tex);const cm=new T.MeshBasicMaterial({map:tex});materials.push(cm);for(let i=0;i<4;i++){const a=i*Math.PI/2;const c=mesh(new T.CircleGeometry(1.65,24),cm);c.position.set(tx+Math.sin(a)*3.01,h+6,tz+Math.cos(a)*3.01);c.rotation.y=a;}const cap=mesh(new T.ConeGeometry(4.5,3,4),m.roof);cap.rotation.y=Math.PI/4;cap.position.set(tx,h+11.5,tz);}
  if(f.id==='w25192896'){const dome=mesh(new T.SphereGeometry(5.5,20,12,0,Math.PI*2,0,Math.PI/2),m.roof);dome.position.set(center[0],h+2,front+10);const ped=new T.Shape([new T.Vector2(-11,0),new T.Vector2(11,0),new T.Vector2(0,5)]);const o=mesh(new T.ExtrudeGeometry(ped,{depth:1,bevelEnabled:false}),m.trim);o.position.set(center[0],h,front-.6);o.rotation.y=Math.PI;}
  if(f.id==='w26790058'){const cx=(minX+maxX)/2;box(14,3.6,4,m.trim,cx,h+1.8,front+2);const e=mesh(new T.SphereGeometry(1.1,14,8),m.gold);e.scale.z=.15;e.position.set(cx,h+2,front-.1);const cap=mesh(new T.ConeGeometry(8,3,4),m.roof);cap.rotation.y=Math.PI/4;cap.scale.z=.4;cap.position.set(cx,h+5,front+2);}
  if(f.id==='w75517098'){for(const x of[minX+7,(minX+maxX)/2,maxX-7]){box(5,3,2,m.trim,x,h+1.3,front+.9);for(let i=0;i<5;i++){const arc=mesh(new T.TorusGeometry(.3,.065,4,8,Math.PI),m.trim);arc.position.set(x-1.65+i*.82,h-.7,front-.06);arc.rotation.y=Math.PI;}}}
 }
 // Crosswalks are located at mapped crossings and orient to their nearest street.
 for(const p of CITY_DATA.points){if(p.t.highway!=='crossing')continue;let best=15,street:MapFeature|undefined,heading=0;for(const r of roads){if(!ROAD_TYPES.has(r.t.highway))continue;for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((p.p[0]-a[0])*dx+(p.p[1]-a[1])*dz)/(len*len))),d=Math.hypot(p.p[0]-a[0]-dx*t,p.p[1]-a[1]-dz*t);if(d<best){best=d;street=r;heading=Math.atan2(dx,dz);}}}if(!street)continue;const width=roadWidth(street);for(let offset=-width/2+.6;offset<width/2;offset+=1.6){const x=p.p[0]+Math.cos(heading)*offset,z=p.p[1]-Math.sin(heading)*offset;const stripe=plane(.8,3.8,surface.marking,x,.071,z);stripe.rotation.set(-Math.PI/2,0,-heading);}}
 return{roads,materials,textures,ribbon};
}
