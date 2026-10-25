import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import type {XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

/** Exterior approach only. A photographed door does not assert a traversable interior. */
export type BucurestiBu08EntryRoute = {
  name: string;
  bodyId: string;
  buildingId: string;
  sharedEntranceId: string;
  style: string;
  faceStart: XY;
  faceEnd: XY;
  u: number;
  width: number;
  rise: number;
  estimatedElevation: number;
  landing: number;
  steps: number;
  run: number;
  points: XY[];
  route: XY[];
  kind: 'stair' | 'ramp' | 'threshold';
  approach: 'normal' | 'lateral' | 'ramp';
  evidence: string;
  accessStatus: 'exterior-approach';
  heightSource: 'photographic-dimension-estimate';
};

/** Original meshes for București, Eminescu–Vlaicu Pârcălab. The official polygons
 * supply the plan, photographs supply the visible architectural character.
 * Heights, opening positions and stair dimensions remain explicit estimates. */
export function bucurestiBu08Architecture(m: Mesh, ground: (x: number, z: number) => number,
  surfaceGround: (x: number, z: number) => number = ground) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const entries: BucurestiBu08EntryRoute[] = [];
  const thresholds: BucurestiBu08EntryRoute[] = [];
  const keys = new Set<string>();
  const owned = new Set(['bucuresti60Historic','bucuresti58Wing','bucuresti57Yellow','bucuresti59Gabled','bucuresti59Samaltis','bucuresti55House','bucuresti53Shop','vlaicu32Corner','bucuresti62Historic','vlaicu35Corner','vlaicu37Tower','vlaicu38Block']);

  function handles(b: Building, f: Facade) { return f.len >= .60 && owned.has(b.style); }
  function band(f: Facade, center: number, height: number, depth: number, color: string) {
    f.panel(f.len / 2, center, depth / 2 + .025, f.len, height, depth, color);
  }
  function uAt(f: Facade, value: number, axis: 0 | 1 = 0): number | null {
    const p = f.at(0), q = f.at(f.len), delta = q[axis] - p[axis];
    if (Math.abs(delta) < .02) return null;
    const u = (value - p[axis]) / delta * f.len;
    return u >= -.005 && u <= f.len + .005 ? Math.max(0, Math.min(f.len, u)) : null;
  }
  function segment(f: Facade, lo: number, hi: number, axis: 0 | 1 = 0): Facade | null {
    const p = f.at(0), q = f.at(f.len);
    const low = Math.max(lo, Math.min(p[axis], q[axis])), high = Math.min(hi, Math.max(p[axis], q[axis]));
    if (high - low < .04) return null;
    const u0 = uAt(f, low, axis), u1 = uAt(f, high, axis);
    if (u0 === null || u1 === null) return null;
    return m.facade(f.at(Math.min(u0, u1)), f.at(Math.max(u0, u1)), f.y);
  }
  function register(b: Building, f: Facade, u: number, width: number, rise: number, landing: number,
    steps: number, points: XY[], approach: 'normal' | 'lateral' | 'ramp', evidence: string,
    target = entries, variant = 'main') {
    const sharedEntranceId = `${b.id}/${f.at(u).map(v => v.toFixed(3)).join('/')}`;
    const key = `${sharedEntranceId}/${variant}/${approach}`;
    if (keys.has(key)) return;
    keys.add(key);
    const kind = approach === 'ramp' ? 'ramp' : steps > 1 ? 'stair' : 'threshold';
    target.push({name: `${b.title} · ${kind === 'stair' ? 'scară' : 'prag exterior'}`,
      bodyId: b.id, buildingId: b.id, sharedEntranceId, style: b.style,
      faceStart: f.at(0), faceEnd: f.at(f.len), u, width, rise, estimatedElevation: rise,
      landing, steps, run: steps * .29, points, route: points.map(p => [...p] as XY), kind, approach, evidence,
      accessStatus: 'exterior-approach', heightSource: 'photographic-dimension-estimate'});
  }
  function physicalBeam(p: T.Vector3, q: T.Vector3, radius: number, color: string) {
    const d = q.clone().sub(p), g = new T.CylinderGeometry(radius, radius, d.length(), 6);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()));
    g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);m.put(g, color, true, true);
  }
  function tread(f: Facade, u: number, width: number, near: number, far: number,
    topAt: (u: number) => number, color: string, solidBase=false) {
    // The transverse slope follows the same DEM as the sidewalk, including
    // the first riser. No hidden inclined collision plane covers the treads.
    const g = new T.BoxGeometry(width, .24, far - near, Math.max(1, Math.ceil(width)), 1, 1);
    const v = g.attributes.position;
    for (let i = 0; i < v.count; i++) {
      const uu = u + v.getX(i), p = f.at(uu, (near + far) / 2 + v.getZ(i));
      const y=solidBase&&v.getY(i)<0?surfaceGround(...p)+.035:topAt(uu)+v.getY(i)-.12;
      v.setXYZ(i, p[0], y, p[1]);
    }
    g.computeVertexNormals();m.put(g, color, false, true);
  }
  function glassDoor(f: Facade, u: number, bottom: number, width = 1.10, height = 2.34,
    frame = '#d4d8d0', glass = '#52656a', panelColor?: string) {
    f.panel(u, bottom + height / 2, .14, width, height, .035, glass, false, 1);
    for (const sign of [-1, 1]) f.panel(u + sign * width / 2, bottom + height / 2, .20, .07, height + .08, .09, frame);
    for (const yy of [bottom, bottom + height]) f.panel(u, yy, .20, width + .08, .07, .09, frame);
    f.panel(u - width * .28, bottom + height / 2, .22, .07, height, .09, frame);
    f.panel(u, bottom + .56, .22, width, .07, .09, frame);
    if (panelColor) f.panel(u + width * .12, bottom + height * .63, .18, width * .69, height * .48, .025, panelColor);
    f.panel(u + width * .29, bottom + 1.03, .28, .03, .28, .045, '#68726a', true);
  }
  function frontalEntry(b: Building, f: Facade, u: number, width: number, steps: number,
    rise: number, landing: number, evidence: string, color: string, railSides = [-1]) {
    const near = .12, run = steps * .29, far = near + landing + run;
    const topAt = (uu: number) => surfaceGround(...f.at(uu, far + .38)) + .035 + rise;
    tread(f, u, width, near, near + landing, topAt, color);
    for (let k = 0; k < steps; k++) {
      // The landing itself is the top tread. Each following tread drops by one
      // real riser, ending one riser above the adjacent sidewalk.
      const low = near + landing + k * .29;
      tread(f, u, width + k * .09, low, low + .295, uu => topAt(uu) - k * rise / steps, color);
    }
    for (const sign of railSides) {
      const uu = u + sign * (width / 2 - .07), p = f.at(uu, near + .16), q = f.at(uu, far - .08);
      physicalBeam(new T.Vector3(p[0], topAt(uu) + .90, p[1]), new T.Vector3(q[0], topAt(uu) - rise + .90, q[1]), .025, '#454b47');
      for (const [v, yy] of [[near + .16, topAt(uu)], [far - .08, topAt(uu) - rise]]) {
        const pp = f.at(uu, v);m.box(pp[0], yy + .45, pp[1], .035, .90, .035, '#454b47', true, true);
      }
    }
    register(b, f, u, width, rise, landing, steps, [f.at(u, far + .72), f.at(u, .50)], 'normal', evidence,
      steps <= 1 ? thresholds : entries);
    return topAt(u) - f.y;
  }
  function lateralEntry(b: Building, f: Facade, doorU: number, centerU: number, length: number,
    depth: number, steps: number, rise: number, sides: number[], evidence: string,
    color = '#919183', railColor = '#545b57', opaqueRail = false, customRails = false, solidBase=false) {
    const near = .12, far = near + depth, routeV = near + depth * .61, run = steps * .29;
    const topAt = (uu: number) => surfaceGround(...f.at(uu, far + .40)) + .035 + rise;
    tread(f, centerU, length, near, far, topAt, color,solidBase);
    for (const sign of sides) {
      for (let k = 0; k < steps; k++) {
        const uu = centerU + sign * (length / 2 + (k + .5) * .29);
        tread(f, uu, .295, near, far, at => topAt(at) - k * rise / steps, color,solidBase);
      }
      const u0 = centerU + sign * length / 2, u1 = centerU + sign * (length / 2 + run);
      for (const vv of [far - .045]) {
        const p = f.at(u0, vv), q = f.at(u1, vv);
        if (!customRails) physicalBeam(new T.Vector3(p[0], topAt(u0) + .90, p[1]), new T.Vector3(q[0], topAt(u1) - rise + .90, q[1]), .023, railColor);
        for (const [uu, yy] of [[u0, topAt(u0)], [u1, topAt(u1) - rise]]) {
          const pp = f.at(uu, vv);m.box(pp[0], yy + .45, pp[1], .035, .90, .035, railColor, true, true);
        }
      }
      register(b, f, doorU, depth, rise, length, steps,
        [f.at(centerU + sign * (length / 2 + run + .72), routeV),
          f.at(centerU + sign * (length / 2 - .18), routeV), f.at(doorU, routeV)],
        'lateral', evidence, entries, sign < 0 ? 'left-stair' : 'right-stair');
    }
    for (let i = 0; i <= 3; i++) {
      const uu = centerU - length / 2 + length * i / 3, p = f.at(uu, far - .045);
      m.box(p[0], topAt(uu) + .46, p[1], .035, .92, .035, railColor, true, true);
    }
    for (const dh of customRails ? [] : [.14, .91]) {
      const p = f.at(centerU - length / 2, far - .045), q = f.at(centerU + length / 2, far - .045);
      physicalBeam(new T.Vector3(p[0], topAt(centerU - length / 2) + dh, p[1]),
        new T.Vector3(q[0], topAt(centerU + length / 2) + dh, q[1]), .022, railColor);
    }
    if (opaqueRail) f.panel(centerU, topAt(centerU) - f.y + .55, far - .055, length - .10, .48, .025, '#b6b9ac', true);
    return topAt(doorU) - f.y;
  }
  function opening(f: Facade, u: number, center: number, width: number, height: number,
    trim: string, frame: string, divisions: 'single' | 'wood' | 'transom' = 'single', glass = '#4d5c5e') {
    f.panel(u, center, .12, width, height, .025, glass, false, 1);
    for (const side of [-1, 1]) {
      f.panel(u + side * (width / 2 + .065), center, .17, .13, height + .20, .20, trim, true);
      f.panel(u + side * (width / 2 - .035), center, .25, .065, height, .055, frame, true);
      f.panel(u, center + side * (height / 2 + .075), .20, width + .28, .13, .27, trim, true);
      f.panel(u, center + side * (height / 2 - .025), .25, width, .055, .055, frame, true);
    }
    if (divisions === 'wood') f.panel(u, center - height * .10, .25, .055, height * .79, .065, frame, true);
    if (divisions !== 'single') f.panel(u, center + height * .27, .26, width, .065, .065, frame, true);
    f.panel(u, center - height / 2 - .16, .25, width + .42, .11, .38, trim, true);
  }
  function grille(f: Facade, u: number, center: number, width: number, height: number, color = '#515750') {
    const n = Math.max(4, Math.round(width / .20));
    for (let i = 0; i <= n; i++) f.panel(u - width / 2 + width * i / n, center, .34, .022, height, .028, color, true);
    for (const sign of [-1, 1]) f.panel(u, center + sign * height * .34, .35, width, .025, .03, color, true);
  }
  function downpipe(f: Facade, u: number, height: number, color = '#89918c') {
    f.panel(u, height / 2, .28, .085, height, .085, color, true);
    for (const yy of [.7, height * .55, height - .35]) f.panel(u, yy, .29, .12, .035, .12, '#767f79', true);
  }
  function ac(f: Facade, u: number, center: number) {
    f.panel(u, center, .39, .72, .49, .38, '#c9cfc7');
    const p = f.at(u, .60), g = new T.TorusGeometry(.16, .016, 4, 16);
    g.rotateY(angle(f));g.translate(p[0], f.y + center, p[1]);m.put(g, '#6d7771', true);
    for (let i = -2; i <= 2; i++) f.panel(u + i * .05, center, .60, .012, .28, .018, '#858e87', true);
  }
  function curvedCanopy(f: Facade, u: number, bottom: number, width: number, depth: number,
    color = '#c2c6b2', railColor = '#656f67') {
    const verts: number[] = [], count = 12;
    // Observed curved covers use a half barrel along the facade.
    // Two opaque faces avoid depth sorting and coplanar transparency shimmer.
    const heightAt = (v: number) => bottom + .39 * Math.sin(Math.PI * v / depth);
    for (let i = 0; i < count; i++) {
      const v0 = depth * i / count, v1 = depth * (i + 1) / count;
      const p0 = f.at(u - width / 2, v0), p1 = f.at(u - width / 2, v1);
      const q0 = f.at(u + width / 2, v0), q1 = f.at(u + width / 2, v1);
      const aa = [p0[0], f.y + heightAt(v0), p0[1]], bb = [p1[0], f.y + heightAt(v1), p1[1]];
      const cc = [q1[0], f.y + heightAt(v1), q1[1]], dd = [q0[0], f.y + heightAt(v0), q0[1]];
      verts.push(...aa, ...bb, ...cc, ...aa, ...cc, ...dd);
      for (const p of [aa, dd, cc, aa, cc, bb]) verts.push(p[0], p[1] + .025, p[2]);
    }
    const g = new T.BufferGeometry();g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));g.computeVertexNormals();m.put(g, color);
    for (const sign of [-1, 1]) {
      const points: T.Vector3[] = [];
      for (let i = 0; i <= count; i++) {const v = depth * i / count, p = f.at(u + sign * width / 2, v);points.push(new T.Vector3(p[0], f.y + heightAt(v) + .035, p[1]));}
      m.put(new T.TubeGeometry(new T.CatmullRomCurve3(points), 12, .018, 4, false), railColor, true);
    }
  }
  function woodDoor(f: Facade, u: number, bottom: number, width: number, height: number) {
    f.panel(u, bottom + height / 2, .16, width, height, .10, '#684c36');
    for (const sign of [-1, 1]) {
      f.panel(u + sign * (width / 2 + .05), bottom + height / 2, .24, .10, height + .12, .16, '#795a3f');
      for (const [center, h] of [[.30, .39], [1.15, 1.0], [2.12, .48]]) {
        f.panel(u + sign * width * .245, bottom + center, .23, width * .38, h, .08, '#805e42', true);
        f.panel(u + sign * width * .245, bottom + center, .28, width * .29, h - .11, .025, '#715139', true);
      }
    }
    f.panel(u, bottom + height / 2, .29, .065, height, .08, '#8c694b', true);
    f.panel(u, bottom + height + .04, .25, width + .22, .13, .19, '#8c6c4c', true);
    f.panel(u + .12, bottom + 1.10, .32, .035, .24, .05, '#4e4d43', true);
  }
  function historicCanopy(f: Facade, u: number, bottom: number, width: number, depth: number) {
    const p = f.at(u, depth / 2), color = '#816046';
    m.box(p[0], f.y + bottom + 2.75, p[1], width, .065, depth, '#877b60', false, false, angle(f));
    for (const sign of [-1, 1]) {
      const uu = u + sign * width / 2, p = f.at(uu, depth - .04);
      m.box(p[0], f.y + bottom + 1.39, p[1], .035, 2.78, .035, color, true, true);
      const q = f.at(uu, .18);
      m.beam(new T.Vector3(q[0], f.y + bottom + 2.25, q[1]), new T.Vector3(p[0], f.y + bottom + 2.72, p[1]), .02, color);
      for (const [v, yy, r] of [[depth * .36, 2.49, .13], [depth * .64, 2.59, .11]]) {
        const pp = f.at(uu, v), g = new T.TorusGeometry(r, .014, 4, 14, Math.PI * 1.55);
        g.rotateY(angle(f) + Math.PI / 2);g.translate(pp[0], f.y + bottom + yy, pp[1]);m.put(g, color, true);
      }
    }
    for (let i = 0; i < 6; i++) {
      const pp = f.at(u - width / 2 + width * (i + .5) / 6, depth - .02);
      const g = new T.TorusGeometry(.09, .013, 4, 12, Math.PI * 1.55);
      g.rotateY(angle(f));g.translate(pp[0], f.y + bottom + 2.88, pp[1]);m.put(g, color, true);
    }
  }
  function reliefPanel(f: Facade, u: number, center: number, width: number, height: number) {
    f.panel(u, center, .19, width, height, .11, '#c7c2af', true);
    f.panel(u, center, .26, width - .12, height - .12, .055, '#a7a28f', true);
    const p = f.at(u, .31), g = new T.CircleGeometry(Math.min(height * .39, width * .22), 14);
    g.rotateY(angle(f));g.translate(p[0], f.y + center, p[1]);m.put(g, '#c9c4b1', true);
  }
  function wornPlaster(f: Facade, u: number, center: number, width: number, height: number, color: string) {
    const s = new T.Shape(), outline = [[-.48,-.50],[-.32,-.42],[-.44,-.16],[-.31,.01],[-.47,.30],[-.22,.47],
      [.03,.39],[.24,.50],[.47,.29],[.35,.03],[.49,-.20],[.27,-.46],[.04,-.38]];
    outline.forEach((p, i) => i ? s.lineTo(p[0] * width, p[1] * height) : s.moveTo(p[0] * width, p[1] * height));
    s.closePath();const pp = f.at(u, .052), g = new T.ShapeGeometry(s);
    g.rotateY(angle(f));g.translate(pp[0], f.y + center, pp[1]);m.put(g, color, true);
  }

  function flutedPilaster(f: Facade, u: number, bottom: number, height: number, width: number, color: string) {
    f.panel(u,bottom+height/2,.15,width,height,.24,color);
    for(const du of[-width*.25,0,width*.25])f.panel(u+du,bottom+height/2,.285,.018,height-.28,.025,'#b7b8a9',true);
    for(const yy of[bottom+.06,bottom+height-.04])f.panel(u,yy,.21,width+.19,.16,.37,color,true);
    f.panel(u,bottom+height-.23,.23,width+.08,.12,.35,color,true);
  }
  function upperWindow(f: Facade,u:number,cy:number,w:number,h:number,trim:string,ornate=true) {
    opening(f,u,cy,w,h,trim,'#a7a79b','transom','#53666a');
    if(ornate){
      f.panel(u,cy+h/2+.22,.22,w+.50,.15,.34,trim,true);
      for(const sign of[-1,1]){const p=f.at(u+sign*w*.40,.29),g=new T.TorusGeometry(.13,.03,4,10,Math.PI*1.65);g.rotateY(angle(f));g.translate(p[0],f.y+cy+h/2+.39,p[1]);m.put(g,trim,true);}
      f.panel(u,cy-h/2-.31,.17,w+.18,.23,.16,trim,true);
    }
  }
  function facePositions(f: Facade,xs:number[],axis:0|1=0) {
    return xs.map(x=>({x,u:uAt(f,x,axis)})).filter((v):v is {x:number;u:number}=>v.u!==null&&v.u>.12&&v.u<f.len-.12);
  }
  function baseRustication(f:Facade,h:number,color:string,base:string){
    band(f,.42,.84,.14,base);
    for(let yy=1.0;yy<h;yy+=.42)f.panel(f.len/2,yy,.05,f.len,.025,.07,color,true);
  }
  function balustrade(f:Facade,u:number,y:number,w:number,depth:number,color:string){
    f.panel(u,y,depth/2,w,.20,depth,color);
    f.panel(u,y+.86,depth,w,.15,.23,color);
    f.panel(u,y+.15,depth,w,.16,.19,color);
    for(let dx=-w/2+.18;dx<w/2;dx+=.27){
      f.panel(u+dx,y+.48,depth,.07,.62,.11,color,true);
      f.panel(u+dx,y+.48,depth,.13,.19,.14,color,true);
    }
    for(const sign of[-1,1])f.panel(u+sign*w/2,y+.51,depth/2,.14,.88,depth,color);
  }
  function roundedSlab(f:Facade,u:number,y:number,width:number,depth:number,thickness:number,color:string,physical=false){
    const points:XY[]=[f.at(u-width/2,.08),f.at(u+width/2,.08)];
    for(let i=0;i<=18;i++){const t=i*Math.PI/18;points.push(f.at(u+Math.cos(t)*width/2,.08+Math.sin(t)*depth));}
    points.push(points[0]);m.solid(points,thickness,f.y+y-thickness,color,physical);
  }
  function roundedLandingLip(f:Facade,u:number,width:number,far:number,bulge:number,rise:number,color:string){
    // Only the photographed curved front projects beyond the rectangular
    // landing. It has the same DEM-following top and a visible stone base;
    // no second coplanar slab covers the tested platform or stair flight.
    const shape=new T.Shape();shape.moveTo(-width/2,-far);shape.lineTo(width/2,-far);
    for(let i=1;i<=18;i++){const t=i*Math.PI/18;shape.lineTo(Math.cos(t)*width/2,-far-Math.sin(t)*bulge);}shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:rise,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);
    const v=g.attributes.position;
    for(let i=0;i<v.count;i++){
      const uu=u+v.getX(i),p=f.at(uu,v.getZ(i)),top=surfaceGround(...f.at(uu,far+.40))+.035+rise;
      v.setXYZ(i,p[0],top+v.getY(i)-rise,p[1]);
    }
    g.computeVertexNormals();m.put(g,color,false,true);
  }
  function curvedBalconyFascia(f:Facade,u:number,y:number,width:number,depth:number,height:number,color:string){
    for(let i=0;i<18;i++){
      const t0=i*Math.PI/18,t1=(i+1)*Math.PI/18;
      const p=f.at(u+Math.cos(t0)*width/2,.08+Math.sin(t0)*depth),q=f.at(u+Math.cos(t1)*width/2,.08+Math.sin(t1)*depth);
      m.box((p[0]+q[0])/2,f.y+y+height/2,(p[1]+q[1])/2,Math.hypot(p[0]-q[0],p[1]-q[1])+.006,height,.065,color,false,false,Math.atan2(-(q[1]-p[1]),q[0]-p[0]));
    }
  }
  function wavyRail(f:Facade,u:number,y:number,width:number,depth:number,color:string){
    for(let dx=-width/2+.1;dx<width/2;dx+=.24){
      const points:T.Vector3[]=[];
      for(let i=0;i<=8;i++){const hh=i/8*.85,q=f.at(u+dx+.10*Math.sin(hh/.85*Math.PI*2),depth);points.push(new T.Vector3(q[0],f.y+y+hh+.10,q[1]));}
      m.put(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.014,4,false),color,true);
    }
  }
  function* house60(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);
    const street=n[1]>.84&&p[1]>457,west=n[0]<-.84&&p[0]<344;
    if(!(street||west)){yield;return;}
    const h=b.height,renewed=p[0]>380,trim=b.trim;
    band(f,.42,.84,.15,renewed?'#725f54':'#969381');
    if(renewed)band(f,2.35,3.82,.035,'#d6d6ca');
    baseRustication(f,3.9,'#9d9e91',renewed?'#725f54':'#969381');
    for(const yy of[4.0,4.18])band(f,yy,.16,.31,trim);
    a.cornice(f,h,trim);
    if(west){
      for(let u=1.3;u<f.len;u+=3.1){upperWindow(f,u,6.12,1.05,2.12,trim);opening(f,u,2.20,1.08,2.0,trim,'#82867a','transom');yield;}
      return;
    }
    const xs=[346.4,348.2,352.0,355.0,358.0,361.0,364.0,367.0,372.0,375.0,377.5,381.0,384.0,387.0,390.55,392.2,394.45,396.5,398.45,400.65,402.5];
    for(const{x,u}of facePositions(f,xs)){
      upperWindow(f,u,6.05,1.13,2.15,trim);
      if(!(x>389.3&&x<393.3)&&![358,361,372,381,384,387].includes(x)){
        opening(f,u,2.20,1.15,2.03,trim,renewed?'#b7bcb1':'#777f75','transom');
        if(renewed)grille(f,u,2.20,1.15,2.02,'#444c45');
      }
      if(x<381&&Math.round(x)%3===0){
        const pp=f.at(u,.42),g=new T.CylinderGeometry(.43,.43,1.20,8,1,false,0,Math.PI);g.rotateZ(Math.PI/2);g.rotateY(angle(f));g.translate(pp[0],f.y+.48,pp[1]);m.put(g,'#9d9b8c',true);
      }
      if([355,375,384,398.45].includes(x))ac(f,u+.7,3.47);
      if([361,396.5].includes(x))ac(f,u+.65,7.15);
      for(const[yy,w,hh]of[[7.88,.65,.30],[5.00,.32,.27]])wornPlaster(f,u+.28,yy,w,hh,'#aaa99a');
      yield;
    }
    if(p[0]>389.3&&p[0]<393.4&&f.len>2){
      const u=f.len*.48,low=frontalEntry(b,f,u,1.65,2,.28,.55,'Sep2025 Street View shows the doorway beneath the enclosed balcony and two low exterior levels. Metric dimensions estimated.','#797b6f',[]);
      glassDoor(f,u,low,1.25,2.45,'#4c5149','#3d4e49');
      balustrade(f,u,4.15,Math.min(f.len-.15,3.25),1.10,'#b6b6a6');
      f.panel(u,5.80,1.02,Math.min(f.len-.35,3.0),2.23,.05,'#85918c',false,1);
      for(let du=-1.2;du<=1.2;du+=.60)f.panel(u+du,5.80,1.08,.055,2.30,.06,'#a4aa9e',true);
      f.panel(u,6.95,.56,Math.min(f.len-.12,3.3),.12,1.30,'#92988a');
    }
    const historicWest=uAt(f,359.15);
    if(historicWest!==null){
      const low=frontalEntry(b,f,historicWest,1.82,3,.42,.46,'July2025 frame27 shows the shadowed older entrance under a white stone balcony, beside climbing vegetation. Three shallow risers and exact opening coordinates are estimates; the doorway is identified from facade adjacency, not an address point.','#9c9984',[]);
      woodDoor(f,historicWest,low,1.34,2.83);for(const sign of[-1,1])flutedPilaster(f,historicWest+sign*.97,low,3.48,.36,'#b7b4a0');
      balustrade(f,historicWest,4.14,4.38,1.40,'#b8b7a3');
      glassDoor(f,historicWest,4.24,1.20,2.61,'#767a6d','#475d54');
    }
    const westShop=uAt(f,371.80);
    if(westShop!==null){
      const low=frontalEntry(b,f,westShop,1.63,3,.42,.42,'July2025 frame27 shows a dark glazed entrance with shallow steps and a light cover supported by slender pale posts, east of the ornate white balcony. Position and three riser interpretation are estimated.','#747e6e',[-1,1]);
      glassDoor(f,westShop,low,1.20,2.65,'#455044','#334c43');shared.canopy(f,westShop,low+2.93,1.98);
      for(const sign of[-1,1]){const q=f.at(westShop+sign*.91,1.39);m.box(q[0],f.y+low+1.44,q[1],.035,2.88,.035,'#bcc6b3',true,true);}
    }
    const arched=uAt(f,383.1);
    if(arched!==null){
      const low=frontalEntry(b,f,arched,1.75,3,.42,.46,'Jul2025 north60-central shows an arched shop entrance with a shallow raised approach. Three risers and dimensions are estimated where a van partly masks the base.','#8e8d7b',[-1,1]);
      glassDoor(f,arched,low,1.18,2.49,'#49544a','#334d45');a.arch(f,arched,low+2.1,1.85,.96,f.y,'#4d5048','#868b79');
      f.label('60',arched,low+2.60,.13,'#cbc9ae',.53);
    }
    const shop=uAt(f,387.15);
    if(shop!==null){
      const low=frontalEntry(b,f,shop,2.24,1,.14,.30,'Jul2025 north60-central identifies a dark glazed shopfront beside the arched entrance. Ground threshold is partly hidden by a van; one low level is an explicit estimate.','#8a8e7f',[]);
      glassDoor(f,shop,low,1.15,2.64,'#3f4c43','#354a46');f.panel(shop,3.55,.24,3.25,.67,.20,'#424b43');
      for(const sign of[-1,1]){const u=shop+sign*1.00;if(u>.1&&u<f.len-.1)f.panel(u,low+1.34,.15,.72,2.54,.04,'#3c514d',false,1);}
    }
    const openBalcony=uAt(f,374.55);
    if(openBalcony!==null){
      f.panel(openBalcony,4.12,.78,4.30,.21,1.56,'#bfb9a4');
      for(const sign of[-1,1])f.panel(openBalcony+sign*2.07,4.70,.78,.16,1.10,1.56,'#be9580');
      f.panel(openBalcony,4.70,1.51,4.27,1.10,.14,'#c69d87');
      f.panel(openBalcony,5.29,1.51,4.45,.12,.20,'#c5bea8');
      glassDoor(f,openBalcony,4.22,1.24,2.61,'#777b6c','#465c54');
    }
    if(f.len>4){
      for(const u of[.13,f.len-.13])flutedPilaster(f,u,4.34,3.42,.28,trim);
      for(const yy of[4.46,7.12,7.31])f.panel(f.len/2,yy,.31,f.len,.018,.025,'#59615a',true);
    }
    for(const x of[349.9,370.5,379.0,393.2,403.3]){const u=uAt(f,x);if(u!==null)downpipe(f,u,h,'#716f61');}
    yield;
  }
  function* pink58(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);if(n[1]<.85||p[1]<458||f.len<1){yield;return;}
    const h=b.height;band(f,.39,.78,.12,'#8d8e7c');
    band(f,2.05,3.32,.035,p[0]<416?'#d6d6c8':'#d4c7a2');
    for(let yy=.9;yy<3.7;yy+=.36)f.panel(f.len/2,yy,.067,f.len,.025,.07,'#a9a996',true);
    for(const yy of[3.88,4.14])band(f,yy,.18,.37,b.trim);a.cornice(f,h,b.trim);
    for(const{x,u}of facePositions(f,[408.4,410.6,412.7,417.5,420.0,422.5,424.0])){
      opening(f,u,2.15,1.04,1.85,b.trim,'#989d90','transom');if(x<416)grille(f,u,2.15,1.05,1.85,'#687366');
      if([410.6,412.7].includes(x))ac(f,u+.42,3.32);yield;
    }
    for(const{x,u}of facePositions(f,[408.8,411.8,414.8,417.8,420.8,423.8,427.2])){
      upperWindow(f,u,6.24,1.18,2.45,b.trim);flutedPilaster(f,u-1.05,4.40,3.35,.21,b.trim);yield;
    }
    const central=uAt(f,415.25);
    if(central!==null){const low=frontalEntry(b,f,central,1.5,2,.28,.48,'Jul2025 north9230-and-college shows a dark central entrance beneath the balcony and a shallow frontal step. Dimensions and two riser reading estimated.','#969789',[]);glassDoor(f,central,low,.98,2.55,'#4b5148','#3b4943');}
    const east=uAt(f,427.2);
    if(east!==null){const low=frontalEntry(b,f,east,2.1,4,.56,.55,'Jul2025 panorama shows eastern timber double door, four estimated riser levels, curved glazed canopy and black side rails.','#b5aa91',[-1,1]);woodDoor(f,east,low,1.6,2.72);curvedCanopy(f,east,low+3.01,2.9,1.55,'#b4c0ad','#737f70');
      f.label('ETION',east,low+2.94,.17,'#726347',.48);
      a.pediment(f,east,h+.16,4.9,1.55,f.y,b.trim);a.pediment(f,east,h+.10,3.65,.98,f.y,'#b8a58c');
      for(const dx of[-1.65,1.65])flutedPilaster(f,east+dx,4.45,4.1,.30,b.trim);
    }
    const balcony=uAt(f,414.7);
    if(balcony!==null){balustrade(f,balcony,4.16,5.35,1.24,'#c1c3b1');curvedCanopy(f,balcony,6.85,5.8,1.65,'#b7b196','#8b816b');
      for(const du of[-2.60,2.60]){const p=f.at(balcony+du,1.18);m.box(p[0],f.y+5.55,p[1],.055,2.8,.055,'#877e65',true);}
    }
    for(const x of[407.4,424.9,428.8]){const u=uAt(f,x);if(u!==null)downpipe(f,u,h,'#858e7e');}
    yield;
  }
  function* yellow57(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);if(n[1]>-.85||p[1]>481||f.len<1){yield;return;}
    band(f,.56,1.12,.12,'#92917d');a.cornice(f,b.height,b.trim);
    for(const{x,u}of facePositions(f,[389.55,392.15,398.1,400.1,401.55])){
      opening(f,u,2.69,1.22,1.94,b.trim,'#d5d9cd','transom');
      f.panel(u,3.89,.18,1.66,.17,.28,b.trim,true);
      for(const sign of[-1,1]){const q=f.at(u+sign*.74,.21),g=new T.TorusGeometry(.11,.032,4,10,Math.PI*1.6);g.rotateY(angle(f));g.translate(q[0],f.y+3.76,q[1]);m.put(g,b.trim,true);}
      f.panel(u,1.39,.13,1.58,.36,.16,b.trim,true);f.panel(u,1.39,.23,1.28,.16,.03,'#bbbba6',true);
      if([392.15,398.1,401.05].includes(x))ac(f,u+.83,3.58);yield;
    }
    const u=uAt(f,395.05);if(u!==null){
      const low=lateralEntry(b,f,u,u,2.26,1.1,7,.98,[-1],'Jul2025 close-up south57-stair-59-arch shows one eastern stair flight with approximately seven risers, a rounded landing and a white door. Narrow horizontal courses at the other end are decorative, not a second usable flight. Metric dimensions estimated.','#aca48c','#80745c',false,false,true);
      roundedLandingLip(f,u,2.26,1.22,.30,.98,'#aca48c');
      glassDoor(f,u,low,1.04,2.44,'#d4dacf','#526b69');
      roundedSlab(f,u,low+2.96,3.18,1.51,.35,'#dadccf');
      wavyRail(f,u,low,2.10,1.18,'#80745c');
      for(const sign of[-1,1])flutedPilaster(f,u+sign*1.20,low,2.75,.20,b.trim);
    }
    const eastern=uAt(f,405.1);
    if(eastern!==null){
      const low=lateralEntry(b,f,eastern,eastern,1.86,1.13,6,.96,[1],'Jul2025 south55-57-gate-context shows an additional eastern57 business entrance with a raised stone-faced platform, a single western flight, black wavy rail and flower boxes. Six risers are estimated.','#a69b82','#56594a');
      glassDoor(f,eastern,low,1.36,2.43,'#493d31','#3b504a');shared.canopy(f,eastern,low+2.70,2.2);
      f.panel(eastern,low+2.66,.19,2.38,.59,.18,'#554333');f.label('COSMETOLOGIE',eastern,low+2.64,.115,'#d2c3a4',.30);
      for(const du of[-.52,.52]){const p=f.at(eastern+du,1.14);m.box(p[0],f.y+low+1.0,p[1],.68,.18,.28,'#81765a');m.box(p[0],f.y+low+1.12,p[1],.58,.08,.24,'#888e57',true);}
      wavyRail(f,eastern,low,1.80,1.22,'#56594a');
    }
    for(const u of[.13,f.len-.13])f.panel(u,2.84,.13,.24,3.40,.24,b.trim);
    yield;
  }
  function* gabled59(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);if(n[1]>-.85||p[1]>481||f.len<3){yield;return;}
    band(f,.48,.96,.13,'#968b78');a.cornice(f,b.height,b.trim);band(f,4.1,.20,.32,b.trim);
    const u=uAt(f,379.0);if(u!==null){
      const low=lateralEntry(b,f,u,u,1.95,1.35,8,1.28,[-1],'Jul2025 close-up frame16/17 shows the separate shop door under the white rounded balcony. One eastern flight has approximately eight risers, with a black stone-faced high platform and brown rails. Metric dimensions remain estimates.','#b6a181','#715442');
      // The platform side, risers and landing are visible physical geometry.
      f.panel(u,low/2,1.40,1.95,Math.max(.30,low),.10,'#3d4540');
      glassDoor(f,u,low,1.62,2.61,'#5f675b','#344e49');
      opening(f,u,5.88,1.18,2.02,b.trim,'#827b6d','transom');
      roundedSlab(f,u,4.18,3.32,1.72,.17,'#d0d1c3');
      curvedBalconyFascia(f,u,4.18,3.32,1.72,1.05,'#d4d7cb');
      f.label('CaRosco Home',u,4.77,.18,'#7c8c86',1.82);
      f.label('MOBILA & DESIGN',u,4.47,.09,'#7c8c86',1.82);
    }
    for(const u of[.14,f.len-.14])flutedPilaster(f,u,.85,b.height-.95,.29,b.trim);
    for(const x of[376.95,382.95]){const u=uAt(f,x);if(u!==null)downpipe(f,u,b.height,'#8e9588');}
    yield;
  }
  function* samaltis(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);if(n[1]>-.85||p[1]>481||f.len<1){yield;return;}
    baseRustication(f,4.3,'#85937d','#8b6f59');a.cornice(f,b.height,b.trim);band(f,4.40,.22,.34,b.trim);
    for(const{x,u}of facePositions(f,[370.1,372.0,374.63])){a.arch(f,u,x>373?4.18:4.76,1.28,x>373?3.14:2.56,f.y,'#617366',b.trim);f.panel(u,5.81,.47,.05,2.28,.055,'#9eaa93',true);flutedPilaster(f,u-.89,4.48,3.53,.27,b.trim);yield;}
    for(const{x,u}of facePositions(f,[370.1,372.0])){opening(f,u,2.65,1.17,2.05,b.trim,'#a5ab94','transom');grille(f,u,2.65,1.15,2.02,'#4d5d4d');ac(f,u+.53,4.04);yield;}
    const u=uAt(f,374.63);if(u!==null){const low=frontalEntry(b,f,u,1.68,5,.70,.60,'Identifiable Samaltis59 frontage photographs show carved timber double door, five steps with metal nosings and ornamental black rails. Date unknown, exact dimensions estimated.','#a79776',[-1,1]);
      woodDoor(f,u,low,1.18,2.78);a.arch(f,u,low+2.44,1.35,.68,f.y,'#65503b',b.trim);
      f.panel(u-.97,low+1.90,.44,.50,1.75,.055,'#3e4539');f.label('LOMBARD',u-.97,low+1.90,.082,'#c4b582',.49);
    }
    yield;
  }
  function* historic62(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),south=n[1]>.85&&p[1]>457,east=n[0]>.85&&p[0]>320;
    if(!(south||east)){yield;return;}const h=b.height;
    band(f,.48,.96,.14,'#545a50');band(f,1.13,.35,.22,b.trim);baseRustication(f,4.75,'#b6b6a5','#545a50');
    for(const yy of[4.55,4.83,5.04])band(f,yy,.16,.34,b.trim);a.cornice(f,h,b.trim);
    const values=south?[261.2,264.1,267.0,271.5,274.4,278.4,281.3,284.2,287.2,290.1,293.0,296.0,299.0,303.3,306.4,310.1,313.0,316.0,319.0]:[443.0,447.0,451.0,455.0];
    for(const{x,u}of facePositions(f,values,south?0:1)){
      upperWindow(f,u,7.90,1.24,4.45,b.trim);flutedPilaster(f,u-1.26,5.30,5.35,.30,b.trim);
      if(south&&x>285&&x<295){a.arch(f,u,1.18,1.42,3.05,f.y,'#73847f',b.trim);}
      else opening(f,u,2.84,1.20,2.52,b.trim,'#a1a69b','single');
      f.panel(u,1.07,.21,1.60,.28,.25,b.trim,true);yield;
    }
    if(east){f.label('BUCUREȘTI 62',f.len*.76,3.86,.16,'#4d554a',.28);}
    yield;
  }
  function* corner32(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),street=n[1]<-.84&&p[1]<481,west=n[0]<-.84&&p[0]<345;
    if(!(street||west)){yield;return;}
    band(f,.66,1.32,.16,'#bab9a3');band(f,1.46,.25,.27,b.trim);a.cornice(f,b.height,b.trim);
    // Source photos distinguish the high arched end bays from the straight
    // central windows, above the existing basement windows and metal cage.
    const values=street?[345.1,347.6,351.5,354.0,356.5,359.0,362.55,364.3,366.15]:[482.0,485.0,488.0,491.0,494.0];
    for(const{x,u}of facePositions(f,values,street?0:1)){
      const arched=street&&(x<350||x>361);
      if(arched){a.arch(f,u,1.79,1.16,2.87,f.y,'#a4b2a8',b.trim);f.panel(u,3.07,.47,.055,2.2,.05,'#d2d7c8',true);f.panel(u,3.86,.48,1.04,.055,.05,'#d2d7c8',true);}
      else opening(f,u,3.13,1.18,2.65,b.trim,'#cad0c0','transom');
      f.panel(u,1.58,.22,1.49,.24,.28,b.trim,true);f.panel(u,1.58,.39,1.2,.09,.04,'#d5d2bc',true);
      opening(f,u,.65,.92,.71,'#bdbba5','#7f8877','single','#4e5c4e');grille(f,u,.65,.88,.65);
      if(street&&x>365){const q=f.at(u,.48);m.box(q[0],f.y+1.05,q[1],1.2,.09,.78,'#95998c',true,false,angle(f));}
      yield;
    }
    if(street){
      for(const x of[344.1,350.0,361.6,366.5,368.0]){const u=uAt(f,x);if(u!==null)flutedPilaster(f,u,1.55,b.height-1.58,.30,b.trim);}
      for(const x of[347.1,364.0]){const u=uAt(f,x);if(u!==null){f.panel(u,b.height+.59,.10,5.0,1.18,.25,b.wall);for(const dx of[-2.35,0,2.35])f.panel(u+dx,b.height+.61,.21,.38,1.39,.42,b.trim);a.pediment(f,u,b.height+1.23,2.4,.68,f.y,b.trim);}}
    }
    yield;
  }
  function* gray53(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),street=n[1]<-.8&&p[1]<481,west=n[0]<-.8&&p[0]<440;
    if(!(street||west)){yield;return;}
    band(f,.22,.44,.07,'#949688');
    if(street){
      f.panel(f.len*.66,3.09,.07,1.02,.22,.04,'#d0d2c4');f.label('BUCURESTI',f.len*.66,3.09,.095,'#6c776c',.11);f.label('53/1',f.len*.66,2.83,.21,'#6c776c',.11);
      for(const[u,yy,w,hh]of[[.9,1.1,1.3,.6],[2.5,1.9,1.1,.9],[4.9,2.1,1.6,1.0],[6.4,.8,.9,.6]])if(u<f.len-.3)wornPlaster(f,u,yy,w,hh,'#96988b');
      downpipe(f,f.len-.15,b.height,'#727c72');
    }else if(f.len>4){opening(f,f.len*.33,1.65,.78,1.07,'#8d9588','#4d594b','single');grille(f,f.len*.33,1.65,.80,1.10);}
    yield;
  }
  function* corner35(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),north=n[1]<-.84&&p[1]<481,east=n[0]>.84&&p[0]>322;
    if(!(north||east)){yield;return;}
    band(f,.57,1.14,.10,'#b4b0a0');a.cornice(f,b.height,b.trim);
    if(east){for(const{x,u}of facePositions(f,[482.3,485.5,488.5],1)){opening(f,u,2.68,1.03,1.81,b.trim,'#ced2c7','transom');if(x<486)ac(f,u-.68,3.75);yield;}return;}
    const yellow=segment(f,294.0,308.15);if(yellow){band(yellow,2.78,3.25,.025,'#c8c66c');band(yellow,.61,1.22,.05,'#c0b2a1');}
    const portalWall=segment(f,308.15,312.05);if(portalWall)band(portalWall,2.3,4.6,.035,'#c1baa2');
    for(const{x,u}of facePositions(f,[295.1,297.0,302.6,305.25,308.1,314.1,316.9,319.65,321.4])){
      opening(f,u,2.67,x<308?1.24:1.03,1.96,b.trim,x<308?'#776752':'#c6cec2','transom');
      if(x>312&&x<321)ac(f,u-.70,3.58);
      if(x<308&&x!==305.25){opening(f,u,.64,1.06,.87,'#b2a397','#504f43','single','#364237');grille(f,u,.64,1.05,.82);}
      yield;
    }
    const grand=uAt(f,300.0);if(grand!==null){
      const low=frontalEntry(b,f,grand,2.9,5,.70,.54,'July2025 frame32/33 shows the western yellow-front formal doorway approached by approximately five broad stone risers. Dark entry and rusticated cream surround are visible; dimensions estimated.','#8b7967',[]);
      f.panel(grand,low+1.55,.15,1.61,3.1,.12,'#473c32');
      for(const sign of[-1,1]){f.panel(grand+sign*1.04,low+1.70,.15,.42,3.40,.26,'#c5bea4');for(let yy=low+.28;yy<low+3.25;yy+=.46)f.panel(grand+sign*1.04,yy,.31,.43,.028,.045,'#685d4a',true);}
      f.panel(grand,low+3.42,.19,2.48,.23,.35,'#c9c2a7');
    }
    const ornate=uAt(f,310.5);if(ornate!==null){
      const low=frontalEntry(b,f,ornate,1.76,3,.42,.42,'July2025 frame33 shows a worn ornate wooden doorway in the cream portal between the red and yellow finishes. Approximately three shallow exterior levels are visible; dimensions estimated.','#a29c85',[]);
      woodDoor(f,ornate,low,1.18,2.86);for(const sign of[-1,1])flutedPilaster(f,ornate+sign*.85,.32,3.90,.33,'#c8c2ab');
      f.panel(ornate,4.48,.28,2.32,.42,.44,'#bdb79c');a.pediment(f,ornate,4.73,2.79,.93,f.y,'#c7c0a5');
      for(let dx=-.95;dx<1;dx+=.23)f.panel(ornate+dx,4.40,.53,.11,.20,.15,'#aaa68e',true);
    }
    const cellar=uAt(f,305.25);if(cellar!==null){
      f.panel(cellar,.62,.18,1.06,1.24,.09,'#5a4635');
      for(const sign of[-1,1]){const side=m.facade(f.at(cellar+sign*.66,.22),f.at(cellar+sign*.66,1.54),f.y);for(let u=.12;u<side.len;u+=.24){const q=side.at(u);m.box(q[0],f.y+.15,q[1],.14,.30,.25,'#8e7d66',true,true,angle(f));}}
      register(b,f,cellar,1.05,0,.32,0,[f.at(cellar,2.10),f.at(cellar,1.70)],'normal','July2025 frame33 shows a small closed basement doorway below the yellow frontage with side cheeks. The exterior route stops at the visible approach lip. The concealed descending stair and interior are not reconstructed.',thresholds,'closed-basement-approach');
    }
    for(const x of[294.3,301.4,312.2,322.7]){const u=uAt(f,x);if(u!==null)downpipe(f,u,b.height,'#616c5d');}
    yield;
  }
  function* tower37(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);if(f.len<4){yield;return;}
    const publicSide=n[1]>.8||n[0]>.8; if(!publicSide){yield;return;}
    const rows=Math.max(1,b.levels),storey=b.height/rows,bays=Math.max(1,Math.round(f.len/4.3)),bay=f.len/bays;
    for(let row=0;row<rows;row++){
      const cy=storey*(row+.53);
      for(let i=0;i<bays;i++){
        const u=(i+.5)*bay,glazed=(i%5===1||i%5===2),w=glazed?bay-.18:Math.min(1.6,bay*.55);
        f.window(u,cy,w,glazed?storey-.16:2.05,'#b6bdb3','#425d66');
        if(glazed){f.panel(u,cy,.17,w,.035,.04,'#5b7279',true);f.panel(u,cy,.18,.045,storey-.18,.045,'#5b7279',true);}
        if((i===0||i===bays-1)&&bays>3&&row>2&&row<rows-1){shared.balcony(f,u,cy-1.10,2.60,1.10);}
      }
      yield;
    }
    a.cornice(f,b.height,b.trim);
    for(let u=0;u<f.len;u+=bay)f.panel(u,b.height*.5,.11,.16,b.height,.14,'#a5ada2',true);
    yield;
  }
  function* block38(b:Building,f:Facade):Generator<void>{
    if(f.len<3){yield;return;}const n=normal(f),p=f.at(f.len/2),publicSide=n[0]<-.8||n[1]>.8;
    if(!publicSide){yield;return;}
    band(f,3.25,6.50,.025,'#d1d1c1');band(f,.32,.64,.12,'#7f8274');band(f,6.62,.24,.28,'#d6d7c7');a.cornice(f,b.height,b.trim);
    const bays=Math.max(2,Math.round(f.len/3.9)),pitch=f.len/bays;
    for(let row=0;row<7;row++){
      const cy=row<2?1.95+row*3.14:8.45+(row-2)*3.02;
      for(let i=0;i<bays;i++){
        const u=pitch*(i+.5);opening(f,u,cy,1.72,1.90,'#d9ddce','#d5dbcf','transom','#61776d');
        if(row>1&&(i+row)%3===1)ac(f,u-.85,cy-1.02);
      }
      yield;
    }
    for(let i=0;i<=bays;i++)f.panel(i*pitch,b.height/2,.04,.20,b.height-.30,.10,'#cbd2c0',true);
    yield;
  }
  function* pink55(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);if(n[1]>-.85||p[1]>481||f.len<1){yield;return;}
    band(f,.45,.90,.13,'#7b7f76');a.cornice(f,b.height,b.trim);
    for(const{x,u}of facePositions(f,[416.9,419.3,425.55,428.25,430.3])){
      opening(f,u,2.62,1.12,2.15,b.trim,'#907c64','transom');f.panel(u,1.37,.18,1.43,.22,.20,b.trim,true);
      if([419.3,425.55,430.3].includes(x))ac(f,u+.83,3.79);yield;
    }
    for(const{x,u}of facePositions(f,[414.15,422.55,433.35])){
      const eastern=x>431;
      const low=eastern?lateralEntry(b,f,u,u,2.10,1.18,5,.70,[1],'Jul2025 east-front image shows raised eastern white double door and landing with a stair on its western side, wrought black rail and flat dark canopy. Five risers and dimensions estimated.','#969185','#4d5148'):
        frontalEntry(b,f,u,1.90,x<418?4:5,x<418?.56:.70,.55,'Jul2025 București55 frontage shows separate white exterior door with its frontal raised stair and black rails. Riser count and metric dimensions estimated.','#a39b85',[-1,1]);
      glassDoor(f,u,low,1.30,2.50,'#d1d8cd','#516762');shared.canopy(f,u,low+2.86,2.12);
      if(eastern)for(let dx=-.85;dx<.9;dx+=.26){
        const points=[];for(let i=0;i<=7;i++){const hh=i/7*.86,vv=1.20+.13*Math.sin(Math.PI*hh/.86),q=f.at(u+dx,vv);points.push(new T.Vector3(q[0],f.y+low+hh+.10,q[1]));}
        m.put(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.012,4,false),'#4d5148',true);
      }
      yield;
    }
    for(const u of[.12,f.len-.12])downpipe(f,u,b.height,'#929e96');yield;
  }
  function* detail(b:Building,f:Facade):Generator<void>{
    if(b.style==='bucuresti60Historic'){yield* house60(b,f);return;}
    if(b.style==='bucuresti58Wing'){yield* pink58(b,f);return;}
    if(b.style==='bucuresti57Yellow'){yield* yellow57(b,f);return;}
    if(b.style==='bucuresti59Gabled'){yield* gabled59(b,f);return;}
    if(b.style==='bucuresti59Samaltis'){yield* samaltis(b,f);return;}
    if(b.style==='bucuresti55House'){yield* pink55(b,f);return;}
    if(b.style==='vlaicu32Corner'){yield* corner32(b,f);return;}
    if(b.style==='bucuresti53Shop'){yield* gray53(b,f);return;}
    if(b.style==='bucuresti62Historic'){yield* historic62(b,f);return;}
    if(b.style==='vlaicu37Tower'){yield* tower37(b,f);return;}
    if(b.style==='vlaicu35Corner'){yield* corner35(b,f);return;}
    if(b.style==='vlaicu38Block'){yield* block38(b,f);return;}
    yield;
  }
  function* detailExtra(b:Building):Generator<void>{
    if(b.style==='vlaicu38Block'){
      const y=ground(...b.anchor as XY)+.12;
      for(const z of[414.1,418.8,423.5,428.0]){
        const f=m.facade([342.5,z-1.0],[342.5,z+1.0],y);
        f.panel(1,b.height+.98,.07,1.85,1.96,.25,'#a5aea0');opening(f,1,b.height+.95,.85,1.16,'#c6d0bf','#a2b0a1','single');a.pediment(f,1,b.height+1.99,2.18,.54,y,'#8d9b8b');yield;
      }
      m.box(349.3,y+b.height+1.94,414.2,1.08,3.88,1.42,'#987562');m.box(349.3,y+b.height+3.91,414.2,1.29,.18,1.63,'#8d6a57');yield;
    }
    if(b.style==='bucuresti59Samaltis'){
      const y=ground(...b.anchor as XY)+.12,f=m.facade([376.38,479.57],[368.48,480.37],y),u=f.len/2;
      const pp=f.at(u,.86);m.box(pp[0],y+4.13,pp[1],f.len,.18,1.72,'#9b9c87',false,false,angle(f));
      for(const yy of[4.32,5.19])f.panel(u,yy,1.71,f.len,.045,.06,'#56634d',true);
      for(let dx=.08;dx<f.len;dx+=.24){f.panel(dx,4.72,1.71,.025,.93,.035,'#56634d',true);if(Math.round(dx/.24)%2===0){const p=f.at(dx,1.72),g=new T.TorusGeometry(.09,.012,4,10);g.rotateY(angle(f));g.translate(p[0],y+4.73,p[1]);m.put(g,'#56634d',true);}}
      for(const uu of[.10,f.len-.10])f.panel(uu,4.72,.86,.035,.93,1.70,'#56634d',true);
      for(const uu of[.55,1.55,3.15,5.35,6.60]){const p=f.at(uu,1.48);m.box(p[0],y+4.39,p[1],.44,.40,.38,'#84745c',true);const g=new T.IcosahedronGeometry(.31,1);g.scale(.65,1.8,.65);g.translate(p[0],y+4.94,p[1]);m.put(g,uu<3?'#8e8560':'#876f56',true);}
      yield;
    }
    if(b.style==='bucuresti60Historic'){
      const base=ground(...b.anchor as XY)+.12;
      for(const[x,z,h,r]of[[352.5,459.55,3.2,1.1],[353.8,459.6,5.0,1.05],[355.6,459.6,3.8,.95],[354.2,459.45,6.5,.90]]){
        const g=new T.IcosahedronGeometry(1,1);g.scale(r,h*.42,.52);g.translate(x,base+h*.66,z);m.put(g,'#63754e',true);
      }
      const p:XY[]=[[404.23,455.6],[406.95,455.6],[407.05,459.0],[404.23,459.0],[404.23,455.6]],y=ground(405.65,457.3)+.12;
      m.solid(p,.21,y+3.44,'#c6c9b7',true);
      const front=m.facade([404.23,459.0],[407.05,459.0],y),u=front.len/2;
      front.panel(u,3.44,.06,front.len,.50,.18,'#b8beb0');front.label('ZIMBET32',u,3.46,.15,'#d7dacc',.18);
      for(const uu of[.11,front.len-.11]){const q=front.at(uu);m.box(q[0],y+4.19,q[1],.035,1.03,.035,'#7d8a7c',true,true);}
      for(const yy of[3.89,4.65])front.panel(u,yy,.04,front.len,.035,.045,'#879286',true);
      for(let uu=.18;uu<front.len;uu+=.48)front.panel(uu,4.26,.04,.024,.76,.035,'#879286',true);
      const rear=m.facade([404.27,456.5],[406.95,456.5],y),doorU=1.38;
      m.box(405.61,y+1.62,456.43,2.68,3.24,.16,'#c3c4b3',false,true);
      const low=frontalEntry(b,rear,doorU,1.72,1,.14,.36,'Sep2025 north-mid-front shows the recessed ZIMBET32 doorway under a light canopy/terrace between60 and58. One low exterior threshold and all dimensions are estimates. The terrace is separately photo-only geometry.','#b0a38d',[]);
      glassDoor(rear,doorU,low,1.22,2.62,'#444f44','#354b43');rear.panel(.28,1.10,.12,.50,1.30,.14,'#c5cabf');
      // Open terrace frame: visible posts and a sloping translucent-looking
      // opaque pale cover above the doorway, with no enclosing upper room.
      for(const x of[404.35,406.88]){m.box(x,y+5.65,457.4,.035,2.0,.035,'#786d58',true);}
      m.box(405.61,y+6.70,457.5,2.63,.055,3.35,'#b7ac91',false,false);
      yield;
    }
    if(b.style==='vlaicu32Corner'){
      const y=ground(...b.anchor as XY)+.12,f=m.facade([365.3,480.21],[361.6,480.21],y),depth=1.30;
      // The observed basement enclosure is a visible diamond grille, not
      // an invented solid room. Its actual bars carry collision.
      for(const u of[0,f.len/2,f.len]){const p=f.at(u,depth);m.box(p[0],y+.83,p[1],.045,1.66,.045,'#565d50',false,true);}
      for(const yy of[.17,1.65]){const p=f.at(f.len/2,depth);m.box(p[0],y+yy,p[1],f.len,.05,.05,'#555e50',false,true,angle(f));}
      for(const direction of[-1,1])for(let start=-1.7;start<f.len+1.7;start+=.35){
        const low=Math.max(0,-start/direction),high=Math.min(1.48,(f.len-start)/direction);let a=low,b=high;
        if(direction<0){a=Math.max(0,start-f.len);b=Math.min(1.48,start);}if(b<=a)continue;
        const p=f.at(start+direction*a,depth),q=f.at(start+direction*b,depth);
        physicalBeam(new T.Vector3(p[0],y+.17+a,p[1]),new T.Vector3(q[0],y+.17+b,q[1]),.012,'#555e50');
      }
      for(const u of[0,f.len])for(let v=.15;v<depth;v+=.20){const p=f.at(u,v);m.box(p[0],y+.82,p[1],.022,1.45,.025,'#555e50',true,true);}
      const p=f.at(f.len/2,depth);m.box(p[0],y+.07,p[1],f.len+.15,.14,.15,'#b8b8a4',false,true,angle(f));yield;
    }
    if(b.style==='bucuresti58Wing'){
      const y=ground(...b.anchor as XY)+.12;
      for(const x of[412.8,418.3]){
        const f=m.facade([x-1.12,452.4],[x+1.12,452.4],y);
        f.panel(f.len/2,b.height+1.25,.10,2.24,2.5,.18,'#b89183');
        f.window(f.len/2,b.height+1.30,.88,1.35,'#bdbda9','#5e706a');a.pediment(f,f.len/2,b.height+2.51,2.65,.81,y,'#b5b29c');
        yield;
      }
    }
    if(b.style==='bucuresti59Gabled'){
      const y=ground(...b.anchor as XY)+.12;
      // The photographed covered gang lies in the official gap. The upper
      // bridge is separately identified photographic geometry, never another
      // cadastral footprint or a fabricated hole cut from body8869.
      const bridge:XY[]=[[383.6194,480.6653],[387.1852,480.6653],[387.1211,491.0],[383.6335,490.995],[383.6194,480.6653]];
      const yy=ground(385.4,480.7)+.12;
      const rear:XY[]=[[383.6201,481.15],[387.1822,481.15],[387.1211,491.0],[383.6335,490.995],[383.6201,481.15]];
      m.solid(rear,b.height-3.35,yy+3.35,b.wall,true);
      const front=m.facade([387.1852,480.6653],[383.6194,480.6653],yy),u=front.len/2;
      // Front spandrel spans above a real arched opening. No opaque panel or
      // collider crosses the passage below its observed overhead clearance.
      const arch=new T.Shape(),half=1.565,spring=2.84,top=b.height;
      arch.moveTo(-front.len/2,0);arch.lineTo(-half,0);arch.lineTo(-half,spring);
      for(let k=0;k<=16;k++){const t=Math.PI-Math.PI*k/16;arch.lineTo(half*Math.cos(t),spring+half*Math.sin(t));}
      arch.lineTo(half,0);arch.lineTo(front.len/2,0);arch.lineTo(front.len/2,top);arch.lineTo(-front.len/2,top);arch.closePath();
      const geom=new T.ExtrudeGeometry(arch,{depth:.27,bevelEnabled:false,curveSegments:8});geom.rotateY(angle(front));const pp=front.at(u,.03);geom.translate(pp[0],yy,pp[1]);m.put(geom,b.wall,false,true);
      const torus=new T.TorusGeometry(half+.06,.075,4,20,Math.PI);torus.rotateY(angle(front));torus.translate(pp[0],yy+spring,pp[1]);m.put(torus,'#a39077',true);
      front.panel(u,3.43,.13,3.06,.54,.08,'#278cae');front.label('BirouDeTraduceri.md',u,3.43,.18,'#e4e6cf',.19);
      front.panel(front.len-.16,2.75,.14,.26,.33,.05,'#d9d4ba');front.label('59',front.len-.16,2.75,.12,'#676d64',.20);
      a.arch(front,u,4.85,1.22,2.10,yy,'#556b6a',b.trim);
      m.solid(bridge,.16,yy+b.height,b.roof,false);
      a.pediment(front,u,b.height,front.len+.16,2.82,yy,b.wall);
      opening(front,u,b.height+.91,.72,.55,b.trim,'#6b6252','single','#3e4942');
      for(const du of[-front.len/2+.14,front.len/2-.14])flutedPilaster(front,u+du,4.46,3.65,.22,b.trim);
      const eastern=m.facade([387.1852,480.6653],[387.1211,491.0],yy);
      for(const vv of[.27,.55])ac(eastern,eastern.len*vv,6.75);
      // Thin photographed ceiling strips and side pipe remain above head
      // height, preserving the entire clear ground lane under the bridge.
      for(let z=481.3;z<490.8;z+=.28)m.box(385.4,yy+3.34,z,3.30,.025,.035,'#b7b5a4',true);
      m.box(383.74,yy+1.70,486.2,.075,3.25,.075,'#adb6ad',true,true);
      yield;
    }
  }
  const cloneRoutes=(routes:BucurestiBu08EntryRoute[])=>routes.map(e=>({...e,faceStart:[...e.faceStart]as XY,faceEnd:[...e.faceEnd]as XY,points:e.points.map(p=>[...p]as XY),route:e.route.map(p=>[...p]as XY)}));
  return {a,normal,angle,handles,detail,detailExtra,entryRoutes:()=>cloneRoutes(entries),thresholdRoutes:()=>cloneRoutes(thresholds),get entrances(){return cloneRoutes([...entries,...thresholds]);}};
}
