import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {LANDMARKS} from './city-layout';

/** Dedicated, compact meshes for the three monuments. Dimensions and references
 * are documented in docs/landmark-references.md. No photo downloads at runtime. */
export function createCentralLandmarks(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
  const white=new T.MeshStandardMaterial({color:'#d4d2c6',roughness:.86});
  const cream=new T.MeshStandardMaterial({color:'#cbc7b7',roughness:.91});
  const stone=new T.MeshStandardMaterial({color:'#9fa49b',roughness:.96});
  const roof=new T.MeshStandardMaterial({color:'#414c49',roughness:.72,metalness:.3});
  const seams=new T.MeshStandardMaterial({color:'#88938a',roughness:.7,metalness:.35});
  const bronze=new T.MeshStandardMaterial({color:'#9d8150',roughness:.43,metalness:.7});
  const glass=new T.MeshStandardMaterial({color:'#34474c',roughness:.28,metalness:.15});
  const door=new T.MeshStandardMaterial({color:'#504737',roughness:.83});
  const plinth=new T.MeshStandardMaterial({color:'#434b49',roughness:.90});
  const materials:T.Material[]=[white,cream,stone,roof,seams,bronze,glass,door,plinth];
  const textures:T.Texture[]=[];
  const monuments:T.Group[]=[],details:T.Group[]=[],collisionObjects:T.Group[]=[];
  function part(root:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,detail=false){
    const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.detail=detail;root.add(mesh);return mesh;
  }
  function box(root:T.Object3D,w:number,h:number,d:number,m:T.Material,x=0,y=0,z=0,detail=false){return part(root,new T.BoxGeometry(w,h,d),m,x,y,z,detail);}
  function cylinder(root:T.Object3D,top:number,bottom:number,h:number,m:T.Material,x=0,y=0,z=0,segments=24,detail=false){return part(root,new T.CylinderGeometry(top,bottom,h,segments),m,x,y,z,detail);}
  function beam(root:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,m:T.Material,detail=false){const delta=b.clone().sub(a);const mesh=cylinder(root,r,r,delta.length(),m,0,0,0,8,detail);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return mesh;}
  function cross(root:T.Object3D,y:number,size:number){box(root,size*.12,size,size*.12,bronze,0,y,0);box(root,size*.62,size*.11,size*.12,bronze,0,y+size*.18,0);box(root,size*.34,size*.08,size*.10,bronze,0,y+size*.35,0);}
  function column(root:T.Object3D,x:number,z:number,base:number,h:number,r:number,corinthian=false){
    cylinder(root,r*1.26,r*1.35,.22,white,x,base+.11,z,24);cylinder(root,r*.85,r,h-.72,white,x,base+.22+(h-.72)/2,z,24);
    cylinder(root,r*1.3,r*.9,.28,white,x,base+h-.4,z,24);box(root,r*2.8,.23,r*2.8,white,x,base+h-.115,z);
    if(corinthian)for(let i=0;i<8;i++){const a=i*Math.PI/4;const leaf=part(root,new T.SphereGeometry(1,8,6),white,x+Math.cos(a)*r*.95,base+h-.48,z+Math.sin(a)*r*.95,true);leaf.scale.set(r*.3,.3,r*.3);}
  }
  function archShape(w:number,spring:number){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,spring);s.absarc(0,spring,w/2,0,Math.PI,false);s.closePath();return s;}
  function windowArch(root:T.Object3D,x:number,y:number,z:number,w:number,h:number,m=glass){
    const frame=part(root,new T.ExtrudeGeometry(archShape(w+.3,h-w/2),{depth:.18,bevelEnabled:false,curveSegments:12}),white,x,y-.12,z,true);
    part(root,new T.ShapeGeometry(archShape(w,h-w/2),12),m,x,y,z+.19,true);
    box(root,.065,h,.05,white,x,y+h*.43,z+.22,true);box(root,w,.07,.05,white,x,y+h*.52,z+.22,true);return frame;
  }
  function pediment(root:T.Object3D,w:number,y:number,z:number,depth:number,rise:number){
    const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,rise);s.closePath();
    part(root,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false}),white,0,y,z-depth);
    const inner=new T.Shape();inner.moveTo(-w/2+.75,.22);inner.lineTo(w/2-.75,.22);inner.lineTo(0,rise-.42);inner.closePath();
    part(root,new T.ShapeGeometry(inner),cream,0,y,z+.015,true);
    beam(root,new T.Vector3(-w/2-.18,y,z+.08),new T.Vector3(0,y+rise+.14,z+.08),.16,white);
    beam(root,new T.Vector3(w/2+.18,y,z+.08),new T.Vector3(0,y+rise+.14,z+.08),.16,white);
  }
  function dome(root:T.Object3D,r:number,y:number,h:number){
    const profile:T.Vector2[]=[];
    for(let i=0;i<=16;i++){const t=i/16;profile.push(new T.Vector2(r*Math.sqrt(Math.max(0,1-t*t)),h*t));}
    part(root,new T.LatheGeometry(profile,48),roof,0,y,0);
    cylinder(root,r*1.025,r*1.025,.25,seams,0,y,0,48);
    for(let k=0;k<24;k++){
      const a=k*Math.PI/12,points=profile.slice(0,-1).map(v=>new T.Vector3(Math.cos(a)*(v.x+.022),y+v.y,Math.sin(a)*(v.x+.022)));
      points.push(new T.Vector3(0,y+h,0));
      part(root,new T.TubeGeometry(new T.CatmullRomCurve3(points),18,.035,4,false),seams,0,0,0,true);
    }
  }
  // A wall with a real open passage, including the curved intrados.
  function portal(root:T.Object3D,w:number,h:number,spring:number,r:number,depth:number,z:number,m:T.Material=white){
    const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(-r,0);s.lineTo(-r,spring);s.absarc(0,spring,r,Math.PI,0,true);s.lineTo(r,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.closePath();
    return part(root,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:20}),m,0,0,z-depth/2);
  }
  function sides(root:T.Object3D,build:(side:T.Group)=>void){for(let i=0;i<4;i++){const side=new T.Group();side.rotation.y=i*Math.PI/2;root.add(side);build(side);}}

  const cathedral=new T.Group();cathedral.name='Catedrala Nașterea Domnului';
  box(cathedral,28.3,.55,28.3,plinth,0,.275);box(cathedral,27,13.45,27,cream,0,7.275);
  for(const [size,y,h]of[[27.8,1.05,.25],[27.8,13.5,.38],[28.4,14,.35],[28.1,14.4,.25]])box(cathedral,size,h,size,white,0,y);
  const hip=cylinder(cathedral,10,19.95,3.15,roof,0,16.02,0,4);hip.rotation.y=Math.PI/4;
  sides(cathedral,side=>{
    for(let step=0;step<4;step++)box(side,18.4-step*.28,.18,6.8-step*.36,plinth,0,.09+step*.18,16.3);
    for(const x of[-6.75,-4.05,-1.35,1.35,4.05,6.75])column(side,x,17.35,.73,12.2,.56);
    box(side,17.4,.7,5.2,white,0,13.28,16.1);box(side,18,.32,5.7,white,0,13.8,16.1);
    pediment(side,18,14.03,19.05,5.7,3.85);
    windowArch(side,0,1,13.54,3.35,7,door);
    for(const x of[-7.4,7.4])windowArch(side,x,4.1,13.55,2.5,6.2);
    for(const x of[-12.9,12.9])box(side,.55,11.6,.26,white,x,7.25,13.6);
    // Subtle panel joints and door leaves give depth at pedestrian distance.
    box(side,.075,5.3,.07,bronze,0,3.65,13.81,true);
  });
  cylinder(cathedral,6.95,7.2,.65,white,0,17.45,0,48);
  cylinder(cathedral,6.5,6.5,6.7,cream,0,21.05,0,48);
  for(let i=0;i<12;i++){
    const face=new T.Group();face.rotation.y=i*Math.PI/6;cathedral.add(face);
    windowArch(face,0,18.2,6.52,1.5,4.9);
    for(const x of[-1.23,1.23])box(face,.24,5.9,.25,white,x,21,6.48,true);
  }
  cylinder(cathedral,6.95,6.65,.35,white,0,24.43,0,48);dome(cathedral,7.02,24.65,7.25);
  cylinder(cathedral,.42,.65,.65,bronze,0,32.15);cross(cathedral,33.8,2.7);

  const tower=new T.Group();tower.name='Clopotnița Catedralei';
  box(tower,10.4,.35,10.4,plinth,0,.175);box(tower,8.1,8.25,8.1,cream,0,4.475);
  sides(tower,side=>{
    for(let i=0;i<3;i++)box(side,6.7-i*.25,.18,2.9-i*.3,plinth,0,.44+i*.18,4.5);
    windowArch(side,0,.8,4.06,2.25,4.85,door);
    for(const x of[-2.45,2.45])column(side,x,5.0,.78,6.85,.41);
    box(side,6.45,.4,2.25,white,0,7.78,4.8);pediment(side,6.5,8.02,5.95,2.3,1.48);
  });
  box(tower,8.8,.45,8.8,white,0,8.72);box(tower,7.8,.3,7.8,plinth,0,9.1);
  for(const [width,base,h,r,spring]of[[6.7,9.25,6.0,1.7,3.2],[5.5,15.65,4.8,1.35,2.55]]){
    const level=new T.Group();level.position.y=base;tower.add(level);
    sides(level,side=>{
      portal(side,width,h,spring,r,.68,width/2-.34,cream);
      for(const x of[-width/2+.48,width/2-.48])box(side,.48,h-.4,.19,white,x,h/2,width/2+.04);
      const points:T.Vector3[]=[];for(let i=0;i<=20;i++){const a=Math.PI*i/20;points.push(new T.Vector3(Math.cos(a)*(r+.12),spring+Math.sin(a)*(r+.12),width/2+.12));}
      part(side,new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.11,6,false),white);
    });
    box(tower,width+.7,.34,width+.7,white,0,base+h+.1);box(tower,width+.35,.16,width+.35,plinth,0,base+h+.35);
  }
  const bellProfile=[[.28,1.7],[.5,1.6],[.56,.95],[.78,.35],[1.1,.1],[1.12,0],[.95,0],[.7,.25]].map(([x,y])=>new T.Vector2(x,y));
  part(tower,new T.LatheGeometry(bellProfile,24),bronze,0,11.7);cylinder(tower,.07,.1,1.1,bronze,0,11.7);
  cylinder(tower,2.7,2.8,.28,white,0,20.85,0,40);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;column(tower,Math.cos(a)*2.25,Math.sin(a)*2.25,20.98,2.6,.23);}
  cylinder(tower,2.75,2.75,.3,white,0,23.6,0,40);dome(tower,2.87,23.77,1.78);
  cylinder(tower,.24,.36,.4,bronze,0,25.7);cross(tower,26.53,1.55);

  const arch=new T.Group();arch.name='Arcul de Triumf';
  // Four open passages, rather than an opaque OSM extrusion.
  sides(arch,side=>{
    portal(side,10,9.15,5.55,2.2,2.55,3.72);
    for(const sign of[-1,1]){
      box(side,2.9,.38,2.9,stone,sign*3.6,.19,3.6);
      for(const x of[sign*2.82,sign*4.32])column(side,x,5.1,.4,6.25,.27,true);
      box(side,2.9,.25,.4,white,sign*3.6,6.78,5.03);
    }
    const points:T.Vector3[]=[];for(let i=0;i<=24;i++){const a=Math.PI*i/24;points.push(new T.Vector3(Math.cos(a)*2.34,5.55+Math.sin(a)*2.34,5.03));}
    part(side,new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.14,6,false),stone,0,0,0,true);
    box(side,.52,.7,.26,white,0,7.95,5.05,true);
    for(let i=-8;i<=8;i++)box(side,.22,.17,.28,white,i*.56,9.29,5.13,true);
  });
  box(arch,10.5,.38,10.5,white,0,9.2);box(arch,10.8,.2,10.8,stone,0,9.48);
  box(arch,9.45,2.65,9.45,white,0,10.92);box(arch,9.95,.22,9.95,stone,0,12.31);box(arch,10.45,.3,10.45,white,0,12.57);box(arch,9.9,.26,9.9,white,0,12.85);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#262d2d';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#e9dfbe';ctx.lineWidth=3;ctx.beginPath();ctx.arc(128,128,119,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#eee8d5';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='18px Georgia';
  ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].forEach((n,i)=>{const a=i*Math.PI/6;ctx.fillText(n,128+Math.sin(a)*97,128-Math.cos(a)*97);});
  ctx.lineCap='round';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(90,91);ctx.moveTo(128,128);ctx.lineTo(179,55);ctx.stroke();
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
  const clock=new T.MeshStandardMaterial({map:texture,roughness:.8});materials.push(clock);
  for(const sign of[-1,1]){
    const face=new T.Group();face.rotation.y=sign===1?0:Math.PI;arch.add(face);
    const rim=cylinder(face,.91,.91,.12,stone,0,10.92,4.8,48);rim.rotation.x=Math.PI/2;
    part(face,new T.CircleGeometry(.78,48),clock,0,10.92,4.88);
  }

  // Merge by material and distance tier: a handful of draws per monument.
  // Match the wider cross-shaped lower footprint in the OSM survey.
  tower.scale.set(1.16,1,1.16);
  const locations=[LANDMARKS.catedrala,LANDMARKS.clopotnita,LANDMARKS.arc];
  for(const [i,root]of[cathedral,tower,arch].entries()){
    root.updateMatrixWorld(true);const batches=new Map<string,{material:T.Material;detail:boolean;geometries:T.BufferGeometry[]}>();
    root.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;const key=`${o.material.uuid}:${!!o.userData.detail}`;
      let batch=batches.get(key);if(!batch){batch={material:o.material,detail:!!o.userData.detail,geometries:[]};batches.set(key,batch);}
      const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);geometry.deleteAttribute('uv');batch.geometries.push(geometry);
      // Keep UVs for the two clock faces only.
      if(o.material===clock)geometry.setAttribute('uv',(o.geometry.index?o.geometry.toNonIndexed():o.geometry).getAttribute('uv').clone());
      o.geometry.dispose();
    });
    root.clear();root.scale.set(1,1,1);const detail=new T.Group();detail.name='Detalii de aproape';root.add(detail);details.push(detail);
    for(const batch of batches.values()){
      const geometry=mergeGeometries(batch.geometries,false)!;batch.geometries.forEach(g=>g.dispose());geometry.computeBoundingSphere();geometry.computeBoundingBox();
      const mesh=new T.Mesh(geometry,batch.material);mesh.castShadow=mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;(batch.detail?detail:root).add(mesh);
    }
    root.position.set(locations[i][0],0,locations[i][1]);root.visible=false;scene.add(root);monuments.push(root);
  }
  // Small physical meshes keep pedestrian probes away from decorative triangles.
  // They are never attached to the render scene, and stay active behind the camera.
  const collisionMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});materials.push(collisionMaterial);
  const cathedralCollision=new T.Group(),towerCollision=new T.Group(),archCollision=new T.Group();
  box(cathedralCollision,27,14.5,27,collisionMaterial,0,7.25);
  cylinder(cathedralCollision,7,7,18,collisionMaterial,0,24,0,12);
  sides(cathedralCollision,side=>{
    for(const x of[-6.75,-4.05,-1.35,1.35,4.05,6.75])cylinder(side,.56,.56,12.2,collisionMaterial,x,6.83,17.35,8);
    box(side,18,1,5.7,collisionMaterial,0,13.5,16.1);
  });
  box(towerCollision,8.1,8.9,8.1,collisionMaterial,0,4.45);
  sides(towerCollision,side=>{for(const x of[-2.45,2.45])cylinder(side,.44,.44,7,collisionMaterial,x,4.25,5,8);});
  for(const [width,base,h,r,spring]of[[6.7,9.25,6,1.7,3.2],[5.5,15.65,4.8,1.35,2.55]]){
    const level=new T.Group();level.position.y=base;towerCollision.add(level);sides(level,side=>portal(side,width,h,spring,r,.68,width/2-.34,collisionMaterial));
  }
  cylinder(towerCollision,2.87,2.87,1.8,collisionMaterial,0,24.67,0,12);towerCollision.scale.set(1.16,1,1.16);
  sides(archCollision,side=>portal(side,10,9.15,5.55,2.2,2.55,3.72,collisionMaterial));
  box(archCollision,10.5,3.8,10.5,collisionMaterial,0,11.05);
  for(const [i,object]of[cathedralCollision,towerCollision,archCollision].entries()){
    object.position.copy(monuments[i].position);object.updateMatrixWorld(true);collisionObjects.push(object);
  }
  const replacements=[{id:25764333,x:locations[0][0],z:locations[0][1],radius:22,ready:false},{id:549387560,x:locations[1][0],z:locations[1][1],radius:7,ready:false},{id:20340431,x:locations[2][0],z:locations[2][1],radius:7,ready:false}];
  let nextGround=0;
  let imported:ReadonlySet<number>=new Set();
  const sphere=new T.Sphere(),frustum=new T.Frustum(),matrix=new T.Matrix4();
  return {objects:monuments,collisionObjects,replacements,
    setImported(ids:ReadonlySet<number>){imported=ids;},
    get ready(){return replacements.every(item=>item.ready);},
    update(camera:T.PerspectiveCamera,now:number){
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      for(let i=0;i<monuments.length;i++){
        const root=monuments[i],location=locations[i];
        if((!root.userData.grounded||now>=nextGround)&&loaded(location[0],location[1])){root.position.y=ground(location[0],location[1]);root.userData.grounded=true;root.updateMatrixWorld(true);collisionObjects[i].position.copy(root.position);collisionObjects[i].userData.grounded=true;collisionObjects[i].updateMatrixWorld(true);replacements[i].ready=true;}
        sphere.center.copy(root.position);sphere.center.y+=i===0?17:i===1?14:6.5;sphere.radius=i===0?30:i===1?16:10;
        const replaced=imported.has(replacements[i].id);
        root.visible=!!root.userData.grounded&&!replaced&&frustum.intersectsSphere(sphere);
        collisionObjects[i].userData.grounded=!!root.userData.grounded&&!replaced;
        const distance=camera.position.distanceTo(root.position);details[i].visible=distance<165;
        root.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=distance<120;});
      }
      if(now>=nextGround)nextGround=now+1000;
    },
    dispose(){for(const root of [...monuments,...collisionObjects]){scene.remove(root);root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  };
}
