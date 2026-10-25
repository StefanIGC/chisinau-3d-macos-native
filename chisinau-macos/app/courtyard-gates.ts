import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import catalog from '../data/courtyard-gates.json';
import {streetMesh,streetRect,lettering} from './street-mesh';
import {prepareLandmarkCollision} from './landmark-collision';

export type GateHud={near:boolean;open:boolean;name:string};
type Point={x:number;y:number;z:number};
/** Gate BVHs are prepared once. A fixed swept bounds keeps the spatial index
 * valid while the two hinges rotate; opening does not rebuild the city index. */
export function createCourtyardGates(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const posts=streetMesh(scene,'Porți și accese',ground,loaded),material=new T.MeshStandardMaterial({vertexColors:true,roughness:.82});
 const gates=catalog.map(data=>{
  const singleLeaf='singleLeaf' in data&&data.singleLeaf===true,leafCount=singleLeaf?1:2;
  const x=(data.a[0]+data.b[0])/2,z=(data.a[1]+data.b[1])/2,w=Math.hypot(data.b[0]-data.a[0],data.b[1]-data.a[1]),angle=Math.atan2(-(data.b[1]-data.a[1]),data.b[0]-data.a[0]),root=new T.Group(),pivots=Array.from({length:leafCount},()=>new T.Group());
  root.name=data.name;root.visible=false;root.position.set(x,0,z);root.rotation.y=angle;pivots.forEach(p=>root.add(p));scene.add(root);
  const initiallyOpen='initialOpen' in data&&data.initialOpen===true;
  const openDirection='openDirection' in data&&data.openDirection===-1?-1:1;
  const g={data,x,z,w,angle,root,pivots,openDirection,singleLeaf,ready:false,open:initiallyOpen,value:initiallyOpen?1:0};
  posts.job(data.name,streetRect(x,z,w+1,2),[],function*(){
   const baseOffset='baseOffset' in data?Number(data.baseOffset):0,y=ground(x,z)+.12+baseOffset;root.position.y=y;
   const geometry=(geo:T.BufferGeometry,color:string,parts:T.BufferGeometry[])=>{const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();flat.deleteAttribute('uv');const col=new T.Color(color),v=new Float32Array(flat.attributes.position.count*3);for(let i=0;i<v.length;i+=3){v[i]=col.r;v[i+1]=col.g;v[i+2]=col.b;}flat.setAttribute('color',new T.BufferAttribute(v,3));parts.push(flat);};
   for(let i=0;i<leafCount;i++){
    const sign=i===0?1:-1,parts:T.BufferGeometry[]=[],length=w/leafCount-.055,pivot=pivots[i];pivot.position.x=i===0?-w/2:w/2;
    const box=(u:number,h:number,ww:number,hh:number,depth:number,col=data.color)=>{const geo=new T.BoxGeometry(ww,hh,depth);geo.translate(sign*u,h,0);geometry(geo,col,parts);};
    const solidTop='solidHeight' in data?Number(data.solidHeight):.54;
    if('pattern' in data&&(data.pattern==='painted-panel'||data.pattern==='timber-planks')){
     // Observed VA09 solid metal/wood leaves. Only the mesh changes: hinges,
     // prepared collision, selection and anti-crush remain shared.
     if(data.arch){
      // Solid arched leaves at Alecsandri131, with the same shared hinges/BVH.
      const top=(u:number)=>data.height-.36*(1-u/length)**2,shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(sign*length,0);
      for(let k=12;k>=0;k--){const u=length*k/12;shape.lineTo(sign*u,top(u));}shape.closePath();
      const panel=new T.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:false,steps:1});panel.translate(0,0,-.0425);geometry(panel,data.color,parts);
      const curve=[];for(let k=0;k<=12;k++){const u=length*k/12;curve.push(new T.Vector3(sign*u,top(u),.025));}
      geometry(new T.TubeGeometry(new T.CatmullRomCurve3(curve),12,.035,5,false),data.color,parts);
      for(let u=.18;u<length;u+=.23){box(u,top(u)/2,.018,top(u)-.12,.11,'#85928b');yield;}
      for(let u=.30;u<length;u+=.62){const hoop=new T.TorusGeometry(.15,.018,4,12);hoop.translate(sign*u,data.height*.47,.06);geometry(hoop,'#76867c',parts);}
     }else box(length/2,data.height/2,length,data.height,.085);
     for(const u of[.04,length-.04])box(u,data.height/2,.08,data.height,.12);
     for(const hh of data.arch?[.055]:[.055,data.height-.055])box(length/2,hh,length,.11,.12);
     if(data.pattern==='timber-planks')for(let u=.12;u<length;u+=.18){box(u,data.height/2,.022,data.height-.12,.115,'#75564b');yield;}
     box(length-.13,data.height*.48,.045,.22,.16,'#675d4d');yield;
    }else if('pattern' in data&&data.pattern==='solid-panel'){
     box(length/2,data.height/2,length,data.height,.09);
     box(length/2,data.height/2,length-.14,data.height-.18,.11,'#b7c1b5');
     for(const u of[.045,length-.045])box(u,data.height/2,.09,data.height,.15);
     for(const h of[.055,data.height-.055])box(length/2,h,length,.11,.15);
     box(length-.16,data.height*.48,.055,.25,.20,'#435a50');yield;
    }else if('pattern' in data&&(data.pattern==='vertical-bars'||data.pattern==='panel-bars')){
     if(data.pattern==='panel-bars'&&'topProfile' in data&&data.topProfile==='peaked'){
      // BUC05 nr1: straight triangular rise toward the meeting of the two
      // leaves. Only this photographed leaf profile differs; hinges/BVH stay.
      const rise=.32,top=(u:number)=>data.height-rise*(1-u/length),bottom=Math.min(solidTop,data.height-rise-.15);
      box(length/2,bottom/2,length-.10,bottom,.075);
      for(const hh of[.055,bottom])box(length/2,hh,length,.08,.09);
      for(const u of[.04,length-.04])box(u,top(u)/2,.08,top(u),.09);
      const rail=new T.BoxGeometry(Math.hypot(length,rise),.08,.09);rail.rotateZ(Math.atan2(rise,sign*length));rail.translate(sign*length/2,data.height-rise/2,0);geometry(rail,data.color,parts);
      const bars=Math.max(2,Math.round((length-.16)/.145));
      for(let j=1;j<bars;j++){const u=.08+(length-.16)*j/bars,h=top(u)-.06;box(u,(bottom+h)/2,.03,h-bottom,.055);if(j%5===0)yield;}
      box(length-.15,data.height*.48,.045,.22,.13);yield;
     }else{
     // BUC04 modern courtyard gates: straight steel bars and a plain frame,
     // without the ornamental spikes/hoops used by the older gate styles.
     for(const u of[.04,length-.04])box(u,data.height/2,.08,data.height,.085);
     for(const h of[.06,data.height-.06])box(length/2,h,length,.09,.085);
     // BUC05 nr5 has a plain opaque lower panel and straight bars above.
     // The original vertical-bars branch retains exactly its prior geometry.
     const bottom=data.pattern==='panel-bars'?Math.min(solidTop,data.height-.20):.07;
     if(data.pattern==='panel-bars'){
      box(length/2,bottom/2,length-.12,bottom,.075);
      box(length/2,bottom,length-.12,.075,.085);
     }
     const bars=Math.max(2,Math.round((length-.16)/.145));
     const barMid=data.pattern==='panel-bars'?(bottom+data.height-.07)/2:data.height/2;
     const barHeight=data.pattern==='panel-bars'?data.height-.07-bottom:data.height-.14;
     for(let j=1;j<bars;j++){box(.08+(length-.16)*j/bars,barMid,.035,barHeight,.055);if(j%5===0)yield;}
     box(length-.15,data.height*.48,.045,.22,.13);yield;
     }
    }else if('pattern' in data&&data.pattern==='horizontal-slats'){
     // BUC04 black gate beside nr20: close horizontal slats. The same leaf
     // mesh supplies the existing moving collision and hinge behaviour.
     for(const u of[.04,length-.04])box(u,data.height/2,.08,data.height,.09);
     for(const h of[.055,data.height-.055])box(length/2,h,length,.10,.09);
     const rows=Math.max(3,Math.ceil((data.height-.16)/.16)),pitch=(data.height-.16)/rows;
     for(let j=0;j<rows;j++){box(length/2,.08+pitch*(j+.5),length-.12,pitch-.018,.075);if(j%5===0)yield;}
     box(length-.15,data.height*.48,.045,.24,.14);yield;
    }else if('pattern' in data&&data.pattern==='stepped'){
     // Oliva Verde courtyard: nested right-angle steel slats, observed2025.
     // Reuse the same hinges/BVH/anti-crush logic as all existing gates.
     for(const hh of[.08,data.height-.08])box(length/2,hh,length,.09,.075);
     for(const u of[.045,length-.045])box(u,data.height/2,.09,data.height,.075);
     for(let inset=.19;inset<Math.min(length,data.height)-.15;inset+=.24){
      box((inset+length-.12)/2,data.height-inset,length-.12-inset,.075,.075);
      box(inset,(.13+data.height-inset)/2,.075,data.height-inset-.13,.075);
      yield;
     }
    }else{
    box(length/2,(.06+solidTop)/2,length,solidTop-.06,.075);for(const h of[.06,solidTop+.03,Math.min(1.78,data.height-.25),data.height-.30])box(length/2,h,length,.055,.065);
    for(let u=.04;u<length;u+=.16){
     const h=data.height-(data.arch?.48*(1-u/length)**2:.1);box(u,(h+solidTop+.04)/2,.024,h-solidTop-.04,.033);
     const spike=new T.ConeGeometry(.045,.12,4);spike.translate(sign*u,h+.03,0);geometry(spike,data.color,parts);
     if(Math.round(u/.16)%5===0)yield;
    }
    for(let u=.24;u<length;u+=.42){const hoop=new T.TorusGeometry(.105,.014,4,12);hoop.translate(sign*u,solidTop+.22,.005);geometry(hoop,data.color,parts);}
    for(const u of[.035,length-.035])box(u,data.height/2,.07,data.height,.075);
    if(data.arch){const points=[];for(let j=0;j<=12;j++){const u=j/12*length;points.push(new T.Vector3(sign*u,data.height-.48*(1-u/length)**2,0));}geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.036,5,false),data.color,parts);}
    }
    // Photographed inserts belong to each hinged leaf, including their
    // collision geometry. They must never remain across an opened passage.
    if('centralPanelColor' in data&&typeof data.centralPanelColor==='string'){
     const half=Math.min(length-.1,'centralPanelWidth' in data?Number(data.centralPanelWidth)/2:.4);
     if(half>0)box(length-half/2,data.height/2,half,data.height-.22,.105,data.centralPanelColor);
    }
    if(i===leafCount-1&&'label' in data&&typeof data.label==='string'){
     const label=lettering(data.label,.18);label.translate(sign*length*.5,data.height*.69,.069);geometry(label,'#d7d4c5',parts);
    }
    const geo=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());geo.computeBoundingBox();geo.computeBoundingSphere();const mesh=new T.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;pivot.add(mesh);yield;
   }
   // Commit the observed initial pose before collision preparation and reveal.
   // Gates without initialOpen retain the existing closed starting state.
   pivots[0].rotation.y=-g.value*Math.PI/2*g.openDirection;if(pivots[1])pivots[1].rotation.y=g.value*Math.PI/2*g.openDirection;
   root.updateMatrixWorld(true);yield* prepareLandmarkCollision(root);
   // A static box covering every hinge angle. Detailed raycasts still use the
   // actual moving triangles, so an open gate is an open passage.
   const reach=w/leafCount,swept=new T.Box3(new T.Vector3(-w/2-.1,-.1,-reach-.1),new T.Vector3(w/2+.1,data.height+.2,reach+.1));swept.applyMatrix4(root.matrixWorld);root.userData.worldCollisionBounds=swept;root.userData.grounded=true;root.userData.revision=1;
   const postWidth='postWidth' in data?Number(data.postWidth):.27;
   for(const point of[data.a,data.b]){const yy=ground(point[0],point[1])+.12+baseOffset;posts.box(point[0],yy+(data.height+.25)/2,point[1],postWidth,data.height+.25,.34,data.post,false,true,angle);posts.box(point[0],yy+data.height+.22,point[1],postWidth+.13,.13,.47,data.post,true,false,angle);}
   g.ready=true;root.visible=true;
  });
  return g;
 });
 function near(p:Point){let chosen:typeof gates[number]|undefined,best=3.25;for(const g of gates){if(!g.ready||Math.abs(p.y-g.root.position.y)>2.2)continue;const d=Math.hypot(p.x-g.x,p.z-g.z);if(d<best){best=d;chosen=g;}}return chosen;}
 function toggle(p:Point){const g=near(p);if(!g)return false;g.open=!g.open;return true;}
 function advance(dt:number,p:Point){for(const g of gates){if(!g.ready)continue;const target=g.open?1:0;if(Math.abs(g.value-target)<.00001)continue;
   // Stop a closing leaf while someone stands in its swept footprint.
   const dx=p.x-g.x,dz=p.z-g.z,c=Math.cos(g.angle),s=Math.sin(g.angle),u=dx*c-dz*s,v=dx*s+dz*c;
   const sweptV=v*g.openDirection;
   if(!g.open&&Math.abs(u)<g.w/2+.28&&sweptV>-.32&&sweptV<g.w/(g.singleLeaf?1:2)+.3&&Math.abs(p.y-g.root.position.y)<2.2){g.open=true;continue;}
   g.value=T.MathUtils.clamp(g.value+Math.sign(target-g.value)*Math.min(Math.abs(target-g.value),dt*1.5),0,1);
   g.pivots[0].rotation.y=-g.value*Math.PI/2*g.openDirection;if(g.pivots[1])g.pivots[1].rotation.y=g.value*Math.PI/2*g.openDirection;g.root.updateMatrixWorld(true);
  }}
 return{objects:[...posts.objects,...gates.map(g=>g.root)],collisionObjects:[...posts.collisionObjects,...gates.map(g=>g.root)],replacements:posts.replacements,
  get ready(){return posts.ready;},readyNear:posts.readyNear,toggle,advance,hud(p:Point):GateHud{const g=near(p);return{near:!!g,open:g?.open??false,name:g?.data.name??''};},
  update(camera:T.PerspectiveCamera,now:number){posts.update(camera,now);for(const g of gates)g.root.visible=g.ready&&Math.hypot(camera.position.x-g.x,camera.position.z-g.z)<180;},
  dispose(){posts.dispose();for(const g of gates){scene.remove(g.root);g.root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}material.dispose();}};
}
