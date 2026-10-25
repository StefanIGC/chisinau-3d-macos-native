import * as T from 'three';
import realm from '../data/sciusev-iorga.json';
import catalog from '../data/sciusev-iorga-buildings.json';
import {streetMesh,streetRect} from './street-mesh';
import {photoArchitecture} from './photo-architecture';
import {createPhotoFrontages,type PhotoBuilding} from './central-infill';
import {landscapeLayer} from './landscape-layer';
import {pointSegmentDistance,type XY} from './city-layout';

/** Original bounded geometry, informed by independent facade photographs and dated Esri imagery. Unseen elevations and small dimensions remain estimates. */
export function createSciusevIorga(scene:T.Scene,ground:(x:number,z:number)=>number,loaded:(x:number,z:number)=>boolean){
 const m=streetMesh(scene,'Șciusev · Nicolae Iorga–Bănulescu-Bodoni',ground,loaded),a=photoArchitecture(m);
 const custom=catalog.filter(b=>b.style.startsWith('ior')) as unknown as PhotoBuilding[];
 const bodies=createPhotoFrontages(scene,ground,loaded,catalog.filter(b=>!b.style.startsWith('ior')) as PhotoBuilding[],'Șciusev Iorga · curți complete');
 const l=landscapeLayer(scene,'Șciusev Iorga · spațiu public',ground,loaded,{maxEdge:3,residentDistance:650});
 for(const c of realm.cells)l.job(`sol ${c.x}/${c.z}`,c.x,c.z,function*(){for(const p of c.patches)yield* l.surfaceStaged(p.rings,p.color,p.kind,(x,z)=>ground(x,z)+(p.raised?.14:.035),true);},c.coverage);
 type Face=ReturnType<typeof m.facade>;
 const grilles=(f:Face,u:number,yy:number,w=1.15,h=2.0)=>{for(let x=-w/2;x<=w/2;x+=.21)f.panel(u+x,yy,.52,.025,h,.035,'#47584d',true);for(const dh of[-h*.37,h*.37])f.panel(u,yy+dh,.54,w,.028,.035,'#47584d',true);};
 const ac=(f:Face,u:number,yy:number)=>{f.panel(u,yy,.44,.65,.47,.48,'#a9b0a2');for(let d=-.22;d<=.22;d+=.11)f.panel(u+d,yy,.71,.025,.3,.025,'#6a7a6c',true);};
 const stairs=(f:Face,u:number,w:number,rise:number,offset=.2,color='#95988a')=>{
  const n=Math.max(1,Math.ceil(rise/.13)),run=n*.28,foot=f.at(u,run+offset+.1),low=ground(...foot)+.045,top=low+rise,p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  for(let k=0;k<n;k++){const v=offset+(k+.5)*.28,p=f.at(u,v),h=top-k*rise/n;m.box(p[0],h-.11,p[1],w,.22,.30,color,false,true,angle);}return top-f.y;
 };
 // Roof tessellation follows each real footprint, including concavities/holes.
 function* roof(b:PhotoBuilding,y:number){
  const shape=new T.Shape();b.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));for(const r of b.holes){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));shape.holes.push(hole);}
  const src=new T.ShapeGeometry(shape);src.rotateX(-Math.PI/2);const g=src.toNonIndexed(),v=g.attributes.position,out:number[]=[],xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),run=Math.max(2,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2);
  const vertex=(p:XY)=>{let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance(p,r[i-1] as XY,r[i] as XY));return[p[0],y+b.height+.16+b.roofRise*Math.min(1,d/(run)),p[1]];};
  function tri(a:XY,b:XY,c:XY,depth=0){const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);if(depth<10&&Math.max(ab,bc,ca)>2.8){if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,depth+1);tri(p,b,c,depth+1);}else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,depth+1);tri(a,p,c,depth+1);}else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,depth+1);tri(p,b,c,depth+1);}return;}out.push(...vertex(a),...vertex(b),...vertex(c));}
  for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
  src.dispose();g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.computeVertexNormals();m.put(result,b.roof,false,true);
 }
 const barrel=(f:Face,u:number,yy:number,w:number,depth=1.0)=>{const pts:number[]=[];for(let k=0;k<12;k++){const du0=-w/2+k*w/12,du1=-w/2+(k+1)*w/12,h0=yy+.40*Math.sqrt(Math.max(0,1-(du0/(w/2))**2)),h1=yy+.40*Math.sqrt(Math.max(0,1-(du1/(w/2))**2)),p0=f.at(u+du0,.14),p1=f.at(u+du1,.14),p2=f.at(u+du0,depth),p3=f.at(u+du1,depth);pts.push(p0[0],f.y+h0,p0[1],p1[0],f.y+h1,p1[1],p2[0],f.y+h0,p2[1],p1[0],f.y+h1,p1[1],p3[0],f.y+h1,p3[1],p2[0],f.y+h0,p2[1]);m.beam(new T.Vector3(p2[0],f.y+h0,p2[1]),new T.Vector3(p3[0],f.y+h1,p3[1]),.023,'#48554a');}const bottom=pts.slice();for(let i=0;i<bottom.length;i+=9)for(const k of[0,6,3])pts.push(bottom[i+k],bottom[i+k+1]+.035,bottom[i+k+2]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();m.put(g,'#7b8371');};
 const entry=(f:Face,u:number,w:number,rise:number,col='#635649',stepColor='#95988a')=>{const r=stairs(f,u,w,rise,.2,stepColor);a.door(f,u,2.55+r,Math.min(1.5,w-.5),col);return r;};
 const band=(f:Face,h:number,color:string)=>f.panel(f.len/2,h/2,.09,f.len,h,.18,color);
 const ornament=(f:Face,u:number,yy:number,w:number,h:number,frame:string,kind=0)=>{f.window(u,yy,w,h,'#ccc8b5',frame);f.panel(u,yy+h/2+.22,.30,w+.55,.16,.40,'#c9c7b6');if(kind)a.pediment(f,u,yy+h/2+.30,w+.6,.30,f.y,'#c9c7b6');};
 const dormer=(f:Face,u:number,bottom:number,w:number,h:number,col:string,round=false)=>{f.panel(u,bottom+h/2,-.45,w,h,1.2,col);f.window(u,bottom+h*.51,w*.67,h*.60,col,'#725d47');if(round){a.arch(f,u,bottom+h-.05,w,.85,f.y,col,col,0);}else a.pediment(f,u,bottom+h,w+.35,.7,f.y,col);};
 const canopy=(f:Face,u:number,h:number,w:number,color='#40504a')=>{f.panel(u,h,.72,w,.12,1.44,color);for(const d of[-w/2,w/2])f.panel(u+d,h-.22,1.1,.035,.5,.035,color,true);};
 function* build(b:PhotoBuilding):Generator<void>{
  const y=ground(...b.anchor as XY)+.12,h=b.height,s=b.style;
  m.solid(b.p as XY[],h+5,y-5,b.wall,true,b.holes as XY[][]);yield;yield* roof(b,y);
  for(const f of a.faces(b.p as XY[],y)){
   const p=f.at(f.len/2),q=f.at(f.len/2,1),front=(q[1]-p[1])*b.front[1]>.8&&Math.abs(p[1]-b.anchor[1])<2.1;
   const corner=s==='ior17'&&q[0]>p[0]+.8||['ior95','ior18'].includes(s)&&q[0]<p[0]-.8;
   if(f.len<2.7)continue;
   if(s==='iorblock'){
    // Nine mapped residential storeys. Balcony rhythm is taken from background
    // photographs; hidden facade divisions remain estimated, not surveyed.
    band(f,.7,'#909285');const n=Math.max(2,Math.round(f.len/3.5)),storey=h/9;
    for(let r=0;r<9;r++){
     for(let k=0;k<n;k++){
      const u=(k+.5)*f.len/n,yy=(r+.55)*storey;
      if(f.len>18&&k%3===1){f.panel(u,yy-.9,.62,2.55,.92,1.24,r%3===0?'#9c9b88':'#c3c3b5');f.window(u,yy+.18,2.25,1.35,'#c8c9bb','#879185');f.panel(u,yy-.11,.72,2.4,.035,.04,'#718477');}
      else f.window(u,yy,1.4,1.7,'#c4c6b6','#9ca596');
      yield;
     }
     f.panel(f.len/2,(r+1)*storey-.07,.025,f.len,.09,.05,'#90988b',true);
    }
    f.panel(f.len/2,h+.23,.04,f.len,.40,.08,'#b9bbac');
    if(front){entry(f,f.len*.12,2.0,.26,'#5c6a58');canopy(f,f.len*.12,2.8,2.25,'#778073');}
    continue;
   }
   if((!front&&!corner)){yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/4.1)),2.2,b.trim,'#7b7461');continue;}
   a.cornice(f,h,'#c9c6b4');
   if(s==='iortheatre'){
    band(f,1.9,'#a2a493');for(let yy=.45;yy<1.9;yy+=.43)f.panel(f.len/2,yy,.10,f.len,.022,.04,'#838b7b',true);
    f.panel(f.len/2,2.01,.18,f.len,.18,.35,'#c6c9b9');
    const n=13;for(let k=0;k<n;k++){
     const u=(k+.5)*f.len/n;
     if(k===3||k===11){const r=stairs(f,u,2.55,.65,.2,'#959f91');a.door(f,u,4.95+r,1.75,'#584b38');
      for(const du of[-.45,.45])for(const yy of[1.3,2.5,3.6]){const c=f.at(u+du,.52),t=new T.TorusGeometry(.30,.027,4,12);const p0=f.at(0),p1=f.at(1);t.rotateY(Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]));t.translate(c[0],y+yy,c[1]);m.put(t,'#776348',true);}
      canopy(f,u,5.95,2.55,'#454d41');for(const d of[-1.2,1.2]){const a0=f.at(u+d,.25),a1=f.at(u+d,1.78);m.beam(new T.Vector3(a0[0],y+r+1,a0[1]),new T.Vector3(a1[0],ground(...a1)+1,a1[1]),.03,'#3d5144');}f.label('TEATRU',u,4.70,.24,'#c3b28c');
     }else if(k===7){entry(f,u,2.1,.13,'#705939');canopy(f,u,3.25,3.0,'#544d3f');f.window(u,4.60,1.25,1.65,'#c5c8b9','#73776a');}
     else{f.window(u,4.15,1.35,2.75,'#c9cbbd','#7d8678');f.panel(u,.88,.21,1.1,.85,.12,'#785447');f.panel(u,.88,.30,.9,.66,.04,'#344d47',false,1);grilles(f,u,.88,.94,.7);}
     yield;
    }
    for(const u of[f.len*.14,f.len*.55,f.len*.91])f.panel(u,3.3,.27,.10,6.5,.10,'#7d6754');
   }else if(s==='ior95'){
    band(f,.75,'#73534b');const n=corner?5:9;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(front&&k===2||corner&&k===0){entry(f,u,2.2,.65,'#716044');barrel(f,u,3.9,2.5,1.1);if(corner){for(const d of[-1.3,1.3]){const p=f.at(u+d,.9);a.column(...p,y+.6,3.1,.17,b.trim,true);}a.pediment(f,u,4.25,3.3,.65,y,b.trim);}}
     else{ornament(f,u,2.65,1.22,2.65,'#c2c8b7',1);f.panel(u,1.1,.20,1.7,.24,.35,b.trim);for(const du of[-.82,.82])f.panel(u+du,2.7,.19,.20,3.25,.38,b.trim);}
     f.panel(u,5.25,.06,.52,.20,.05,'#49554a',false,1);yield;
    }
    for(let u=.25;u<f.len;u+=.45)f.panel(u,4.77,.24,.18,.23,.38,b.trim,true);
   }else if(s==='ior88'){
    band(f,.55,'#8b9480');const n=7;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(k===3){const n=6,rise=.78,p0=f.at(0),p1=f.at(1),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]),center=f.at(u,.9),top=ground(...f.at(u+3.8,.9))+.045+rise;
      m.box(center[0],top+.01-.45,center[1],3.34,.9,1.6,b.wall,false,true,angle);
      for(const sign of[-1,1])for(let j=0;j<n;j++){const p=f.at(u+sign*(1.65+(j+.5)*.28),.9);m.box(p[0],top-j*rise/n-.11,p[1],.3,.22,1.6,'#939b89',false,true,angle);}
      a.door(f,u,3.5,1.95,'#76583a');a.arch(f,u,.82,3.1,3.3,y,'#6e6954','#cccdba');a.pediment(f,u,4.10,3.9,1.2,y,'#bfbea7');
      f.panel(u,top-y+.25,1.76,3.2,.50,.16,b.wall,false);for(const du of[-1.6,1.6])f.panel(u+du,2.46,.90,.20,3.55,1.8,b.trim);f.panel(u,top-y+.52,1.76,3.3,.10,.24,b.trim);
      for(const sign of[-1,1]){const aa=f.at(u+sign*1.65,1.76),bb=f.at(u+sign*3.3,1.76);m.beam(new T.Vector3(aa[0],top+.74,aa[1]),new T.Vector3(bb[0],top+.1,bb[1]),.05,b.trim);}
     }
     else{ornament(f,u,2.2,1.15,2.25,'#8f9a87');grilles(f,u,2.2,1.18,2.2);f.panel(u,.65,.20,1.45,.28,.10,b.trim);}
     yield;
    }
    ac(f,f.len*.66,3.83);
   }else if(s==='ior86'||s==='ior86wine'){
    band(f,.48,'#929584');const n=s==='ior86wine'?4:5;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;if(s==='ior86wine'&&k===2){entry(f,u,1.75,.13,'#3c483d');f.panel(u,3.30,.30,2.7,.51,.08,'#303e35');f.label('WINE REPUBLIC',u,3.3,.16,'#c5cab9',.36);canopy(f,u,3.72,2.7,'#3d483c');}
     else f.window(u,2.0,1.12,2.12,'#c4c6b5','#715b45');yield;}
   }else if(s==='ior17'){
    band(f,1.05,'#62695e');const n=corner?4:5;
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(corner&&k===3){entry(f,u,2.3,.39,'#664634');for(const d of[-1.2,1.2]){const p=f.at(u+d,.70);a.column(...p,y+.4,3.7,.20,b.trim,true);}a.pediment(f,u,4.35,3.3,.80,y,b.trim);}
     else ornament(f,u,2.75,1.2,2.55,'#76614d',1);yield;}
    for(let u=.3;u<f.len;u+=.55)f.panel(u,h-.43,.23,.18,.25,.4,b.trim,true);
   }else if(s==='ior18'){
    band(f,.46,'#a6997b');const n=corner?5:9;
    f.panel(f.len/2,4.32,.12,f.len,.14,.24,b.trim);
    for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;
     if(corner&&k===1){entry(f,u,2.8,.39,'#76513b');for(const d of[-1.35,1.35]){const pt=f.at(u+d,1.0);a.column(...pt,y+.40,2.9,.13,b.trim,true);}f.panel(u,3.52,.64,3.1,.18,1.28,b.trim);}
     else{f.window(u,2.35,1.15,2.10,b.trim,'#765142');grilles(f,u,2.35,1.1,2.07);}
     f.panel(u,4.75,.12,1.26,.57,.10,b.trim);for(const du of[-.30,.30])f.panel(u+du,4.75,.18,.36,.35,.03,'#626d5b',false,1);yield;
    }
   }else if(s==='iorvilla'){
    band(f,.5,'#a4a58f');const n=Math.max(2,Math.round(f.len/4.3));
    for(let r=0;r<3;r++){for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,(r+.55)*h/3,2.3,1.9,b.trim,'#6d6250');yield;}f.panel(f.len/2,(r+1)*h/3-.05,.2,f.len,.13,.40,b.trim);}
    for(const u of[f.len*.27,f.len*.73])dormer(f,u,h+.05,3.0,1.25,b.wall);
   }else if(s==='ior86modern'){
    band(f,.55,'#949887');for(let r=0;r<2;r++)for(let k=0;k<4;k++){f.window((k+.5)*f.len/4,(r+.55)*h/2,1.6,2.2,b.trim,'#808771');yield;}f.panel(f.len/2,3.5,.15,f.len,.2,.30,b.trim);entry(f,f.len*.63,2.1,.26,'#6a6e59');
   }else if(s==='iorhotel'){
    band(f,.7,'#8b8c7c');const n=Math.max(2,Math.round(f.len/3.1));
    for(let row=0;row<b.levels;row++){for(let k=0;k<n;k++){const u=(k+.5)*f.len/n;f.window(u,(row+.54)*h/b.levels,1.35,2.0,b.trim,'#586358');yield;}f.panel(f.len/2,(row+1)*h/b.levels-.06,.12,f.len,.12,.24,b.trim);}
    if(front)entry(f,f.len*.5,2.5,.26,'#4a5446');
   }else{band(f,.6,'#929784');yield* a.windows(f,b.levels,h,Math.max(1,Math.round(f.len/3.7)),2.2,b.trim,'#78634b');}
  }
 }
 for(const b of custom)m.job(b.title,b.p as XY[],b.id.startsWith('local-')?[]:[Number(b.id.slice(1))],()=>build(b));
 // Boundary masonry around the88 side gate; the opening remains interactive.
 for(const[p,q]of[[[-239.3,610.5],[-237.5,610.5]],[[-232.9,610.5],[-226.3,610.5]]]as [XY,XY][])m.job('zid curte88',[p,q],[],function*(){const x=(p[0]+q[0])/2,z=p[1],y=ground(x,z);m.box(x,y+1.15,z,q[0]-p[0],2.3,.25,'#b4b39e',false,true);yield;});
 // Red bollards documented on the Iorga approach; crossings retain clear gaps.
 for(let z=576;z<610;z+=2.2)m.job('bolard Iorga',streetRect(-273,z,.5,.5),[],function*(){const y=ground(-273,z),g=new T.CylinderGeometry(.14,.14,.83,8);g.translate(-273,y+.415,z);m.put(g,'#775246',false,true);yield;});
 for(const[x,z,h]of realm.trees)m.job('arbore',streetRect(x,z,5,5),[],function*(){const y=ground(x,z),trunk=new T.CylinderGeometry(.19,.29,h*.57,8);trunk.translate(x,y+h*.285,z);m.put(trunk,'#636750',false,true);for(const[dx,dy,dz,r]of[[0,.67,0,2.8],[-1.7,.64,.5,2],[1.5,.76,-.4,2.2],[0,.91,0,1.9]]){const g=new T.IcosahedronGeometry(r,1);g.scale(1,1.2,1);g.translate(x+dx,y+h*dy,z+dz);m.put(g,'#657d4a');yield;}});
 const poles=realm.lamps as XY[];
 for(const[x,z]of poles)m.job('stâlp iluminat cartografiat',streetRect(x,z,1,1),[],function*(){const y=ground(x,z);m.box(x,y+3.7,z,.18,7.4,.18,'#969e8e',false,true);m.beam(new T.Vector3(x,y+7,z),new T.Vector3(x,y+7.3,z+1.3),.04,'#6d7b68');m.box(x,y+7.3,z+1.3,.25,.12,.5,'#b8bda9');yield;});
 const northPoles=poles.filter(p=>p[1]>615&&p[1]<617).sort((p,q)=>p[0]-q[0]);
 for(let i=1;i<northPoles.length;i++)m.job('cabluri',[northPoles[i-1],northPoles[i]],[],function*(){const p=northPoles[i-1],q=northPoles[i];for(let w=0;w<4;w++)for(let k=0;k<4;k++){const pt=(t:number)=>new T.Vector3(p[0]+(q[0]-p[0])*t,ground(...p)*(1-t)+ground(...q)*t+7-.25*Math.sin(t*Math.PI),p[1]+(q[1]-p[1])*t+w*.10);m.beam(pt(k/4),pt((k+1)/4),.012,'#4a5647');yield;}});
 for(const[x,z]of[[-274,609.5],[-284,632],[-268.4,616.9],[-270,627.0]])m.job('indicator trecere',streetRect(x,z,.8,.8),[],function*(){const y=ground(x,z),f=m.facade([x-.33,z],[x+.33,z],y);m.box(x,y+1.35,z,.055,2.7,.055,'#9aa38d',false,true);f.panel(.33,2.43,0,.62,.62,.07,'#46768d');a.pediment(f,.33,2.22,.50,.42,y,'#ccd0b8');yield;});
 for(const[x,z]of[[-242.164,631.511],[-142.409,649.712]])m.job('coș cartografiat',streetRect(x,z,.7,.7),[],function*(){const y=ground(x,z);m.box(x,y+.42,z,.42,.78,.42,'#60755d',false,true);m.box(x,y+.85,z,.47,.10,.47,'#435d49');yield;});
 for(const[x,z]of[[-235.596,625.507],[-196.829,615.824]])m.job('rastel biciclete cartografiat',streetRect(x,z,2,.8),[],function*(){const y=ground(x,z);for(const dx of[-.65,0,.65]){m.box(x+dx,y+.43,z,.045,.86,.045,'#809180',false,true);m.box(x+dx,y+.43,z+.55,.045,.86,.045,'#809180',false,true);m.box(x+dx,y+.88,z+.275,.045,.045,.6,'#809180');}yield;});
 for(const[x,z,txt]of[[-224,610.9,'ALEXEI ȘCIUSEV'],[-268,633,'NICOLAE IORGA']]as const)m.job('plăcuță stradală',streetRect(x,z,2,1),[],function*(){const f=m.facade([x-1,z],[x+1,z],ground(x,z));f.panel(1,2.5,.02,1.9,.42,.05,'#526f86');f.label(txt,1,2.5,.11,'#d0d2bd',.07);yield;});
 const layers=[m,l,bodies];return{objects:layers.flatMap(v=>v.objects),collisionObjects:layers.flatMap(v=>v.collisionObjects),replacements:layers.flatMap(v=>v.replacements),treeOverrides:realm.trees.map(([x,z])=>({x,z,height:0,radius:1.5,texture:0})),get ready(){return layers.every(v=>v.ready);},get residentCount(){return l.residentCount;},readyNear(x:number,z:number,r=420){return layers.every(v=>v.readyNear(x,z,r));},update(camera:T.PerspectiveCamera,now:number){for(const v of layers)v.update(camera,now);},dispose(){for(const v of layers)v.dispose();}};
}
