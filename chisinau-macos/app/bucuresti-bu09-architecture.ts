import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import type {XY} from './city-layout';
import type {GroundExcavation} from './ground-excavations';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

/** Exterior approach only. A photographed door does not assert a traversable interior. */
export type BucurestiBu09EntryRoute = {
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

/** Original meshes for București, Vlaicu Pârcălab–Alexandr Pușkin. The official polygons
 * supply the plan, photographs supply the visible architectural character.
 * Heights, opening positions and stair dimensions remain explicit estimates. */
export function bucurestiBu09Architecture(m: Mesh, ground: (x: number, z: number) => number,
  surfaceGround: (x: number, z: number) => number = ground) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const entries: BucurestiBu09EntryRoute[] = [];
  const thresholds: BucurestiBu09EntryRoute[] = [];
  let activationReady=()=>false;
  const basementCut:GroundExcavation={a:[189.2,430.4],axis:[0,-1],size:[4.1,1.7],bottom:0,ready:()=>activationReady()};
  const keys = new Set<string>();
  const owned = new Set(['gamburd63','bucuresti65Low','bucuresti67Rental','bucuresti67LowWing','asachiHistoric','asachiModern','semigradov66','puskin15Block','puskin20Office']);

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
    rise: number, landing: number, evidence: string, color: string, railSides = [-1],approachOffset=0) {
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
    register(b, f, u, width, rise, landing, steps, [f.at(u+approachOffset, far + .72), f.at(u+approachOffset, .50),...(approachOffset?[f.at(u,.50)]:[])], 'normal', evidence,
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
  function curvedHead(f:Facade,u:number,base:number,w:number,rise:number,color:string){
    const points:T.Vector3[]=[];
    for(let k=0;k<=20;k++){const t=k/20,pp=f.at(u+(t-.5)*w,.32);points.push(new T.Vector3(pp[0],f.y+base+rise*Math.sin(t*Math.PI),pp[1]));}
    m.put(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.065,5,false),color,true);
  }
  function rosette(f:Facade,u:number,y:number,r:number,color:string){
    const p=f.at(u,.35),g=new T.TorusGeometry(r,.035,5,12);g.rotateY(angle(f));g.translate(p[0],f.y+y,p[1]);m.put(g,color,true);
    for(let i=0;i<6;i++){const t=i*Math.PI/3,q=f.at(u+Math.cos(t)*r*.62,.37),v=new T.IcosahedronGeometry(r*.38,0);v.scale(1,1,.38);v.rotateY(angle(f));v.translate(q[0],f.y+y+Math.sin(t)*r*.62,q[1]);m.put(v,color,true);}
  }
  function ornateWindow(f:Facade,u:number,cy:number,w:number,h:number,trim:string,pediment:'triangle'|'curve'|'flat'='triangle'){
    opening(f,u,cy,w,h,trim,'#d4d8cf','transom');
    const top=cy+h/2+.24;
    if(pediment==='triangle')a.pediment(f,u,top,w+.62,.44,f.y,trim);
    else if(pediment==='curve')curvedHead(f,u,top,w+.66,.40,trim);
    else f.panel(u,top,.25,w+.55,.16,.33,trim,true);
    rosette(f,u,top+.18,.10,trim);
  }
  function rusticated(f:Facade,bottom:number,top:number,wall:string,trim:string){
    for(let yy=bottom;yy<top;yy+=.46){
      f.panel(f.len/2,yy,.055,f.len,.024,.08,trim,true);
      if(f.len<3)continue;
      for(let u=.55+((Math.round(yy/.46)%2)*.55);u<f.len;u+=1.1)f.panel(u,yy+.22,.052,.023,.41,.075,trim,true);
    }
  }
  function highArchedWindow(f:Facade,u:number,bottom:number,w:number,h:number,trim:string,frame='#aeb7ad'){
    a.arch(f,u,bottom,w,h,f.y,'#53656a',trim);
    f.panel(u,bottom+(h-w/2)*.50,.40,.06,h-w/2,.065,frame,true);
    f.panel(u,bottom+h-w/2,.40,w,.055,.065,frame,true);
    f.panel(u,bottom+h-w/2-.35,.40,w,.055,.065,frame,true);
    f.panel(u,bottom-.13,.31,w+.40,.17,.42,trim,true);
  }
  function* conservativeRear(b:Building,f:Facade):Generator<void>{
    if(f.len<2.4){yield;return;}
    a.cornice(f,b.height,b.trim);
    // Opening count on unobserved inner elevations is an explicit estimate.
    if(f.len>5.5)yield* a.windows(f,b.levels,b.height,Math.max(1,Math.round(f.len/5.8)),1.8,b.trim,'#a3ada2');
    yield;
  }
  function* gamburd(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);
    if(!(n[1]<-.8&&p[1]<481.5&&f.len>12)){yield* conservativeRear(b,f);return;}
    band(f,.38,.76,.16,'#8d8c80');a.cornice(f,b.height,b.trim);
    for(const t of[.08,.215,.35,.65,.785,.92]){
      const u=f.len*t;ornateWindow(f,u,2.70,1.42,2.44,b.trim,'triangle');
      // July2025 windows carry children's-play graphics. Use original simple
      // coloured shapes rather than copying the photographed characters.
      f.panel(u,2.66,.135,1.29,2.26,.015,'#709cb2');
      f.panel(u,1.76,.148,1.29,.45,.012,'#9db970');
      for(const[du,dy,r,color]of[[-.30,2.08,.16,'#cf9d68'],[.25,2.48,.13,'#cc7365'],[-.10,3.28,.17,'#d5c77c'],[.34,3.50,.10,'#bdd4ca']]as const){const q=f.at(u+du,.158),g=new T.CircleGeometry(r,10);g.rotateY(angle(f));g.translate(q[0],f.y+dy,q[1]);m.put(g,color,true);}
      f.panel(u,1.33,.31,1.70,.20,.42,'#97988b');
      opening(f,u,5.0,.55,.29,b.trim,'#92978d','single','#344c4c');yield;
    }
    for(const t of[.015,.15,.285,.435,.565,.715,.85,.985]){
      const u=f.len*t;flutedPilaster(f,u,.72,3.65,.35,b.trim);rosette(f,u,4.49,.21,b.trim);yield;
    }
    const u=f.len/2,entry=frontalEntry(b,f,u,2.48,5,.69,.48,'Gikü29Oct2021 / Gamburd63: central white door, two columns and five estimated exterior risers.','#97988c',[]);
    glassDoor(f,u,entry,1.45,2.67,'#dfdfd1','#4d6263');
    f.panel(u,entry+3.0,.17,1.90,.49,.07,'#629c35');f.label('LOC DE JOACA',u,entry+3.0,.16,'#e4dca5',.23);
    for(const sign of[-1,1]){
      const pp=f.at(u+sign*1.34,.65);a.column(pp[0],pp[1],f.y+entry,3.62,.30,b.trim,true);
      for(let k=0;k<10;k++){const t=k*Math.PI*2/10;const q=new T.Vector3(pp[0]+Math.cos(t)*.26,f.y+entry+1.82,pp[1]+Math.sin(t)*.26);m.box(q.x,q.y,q.z,.025,3.10,.025,'#bcbba9',true);}
      rosette(f,u+sign*1.34,4.46,.22,b.trim);
    }
    f.panel(u,4.65,.65,3.53,.22,1.26,b.trim);
    const shape=new T.Shape();shape.moveTo(-1.8,0);shape.lineTo(1.8,0);shape.lineTo(1.8,.64);shape.quadraticCurveTo(.8,.68,0,1.07);shape.quadraticCurveTo(-.8,.68,-1.8,.64);shape.closePath();
    const q=f.at(u,.67),g=new T.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:false});g.rotateY(angle(f));g.translate(q[0],f.y+4.76,q[1]);m.put(g,b.wall);
    curvedHead(f,u,5.38,3.65,.44,b.trim);curvedHead(f,u,5.48,3.83,.47,b.trim);
    f.panel(u,5.03,.86,.60,.64,.07,b.trim,true);rosette(f,u,5.13,.23,'#b5b19c');
    f.panel(f.len*.285,2.92,.33,.73,.63,.07,'#876d57');f.label('MOISEI',f.len*.285,3.0,.12,'#dfdac4',.40);f.label('GAMBURD',f.len*.285,2.80,.12,'#dfdac4',.40);
    f.panel(u-2.05,2.65,.30,.34,.34,.04,'#d9d6c7');f.label('63',u-2.05,2.65,.16,'#505d51',.35);yield;
  }
  function* low65(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);
    if(!(n[1]<-.8&&p[1]<481.5&&f.len>12)){yield* conservativeRear(b,f);return;}
    band(f,.45,.90,.12,'#777e77');a.cornice(f,b.height,b.trim);
    const doorU=uAt(f,263.3)??f.len*.14;
    for(const x of[257.75,260.75]){const u=uAt(f,x);if(u===null)continue;opening(f,u,2.5,1.38,2.03,b.trim,'#c5cabe','transom');grille(f,u,2.50,1.32,1.98);yield;}
    const green=segment(f,247.2,256.5);if(green){green.panel(green.len/2,2.66,.07,green.len,3.52,.09,'#b0c2b7');for(const{u}of facePositions(green,[248.8,251.6,254.4])){opening(green,u,2.51,1.35,2.08,'#cad3c2','#c2cebb','transom');green.panel(u,3.74,.20,1.73,.14,.30,'#c5cfbc');}const plate=uAt(green,255.6);if(plate!==null){green.panel(plate,3.34,.27,.35,.30,.045,'#d6d9ce');green.label('67',plate,3.34,.16,'#3c5147',.30);}}
    for(const{u}of facePositions(f,[256.7,259.25,262.2])){f.panel(u,2.72,.11,.31,3.42,.13,'#6f7e78');for(let yy=1.2;yy<4.4;yy+=.36)f.panel(u,yy,.19,.32,.024,.035,'#d3d8cb',true);}
    const rise=frontalEntry(b,f,doorU,1.85,4,.58,.42,'Gikü29Oct2021 shows four exterior dark stone steps and a white door under the east65 canopy.','#646f68',[]);
    glassDoor(f,doorU,rise,1.0,2.42,'#e2e2d7','#6d7b73');
    const q=f.at(doorU,.86);m.box(q[0],f.y+rise+2.89,q[1],2.70,.10,1.72,'#515b59',false,false,angle(f));
    f.panel(doorU,rise+3.08,.88,2.72,.43,.06,'#4b5554');
    for(const du of[-.93,.93]){const q=f.at(doorU+du,1.05);a.column(q[0],q[1],f.y+rise,2.86,.09,'#e1e2d8',true);}
    yield;
  }
  function* low67(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);
    if(!(n[1]<-.8&&p[1]<480.5)){yield* conservativeRear(b,f);return;}
    band(f,.40,.80,.12,'#949a90');a.cornice(f,b.height,b.trim);
    const bays=Math.max(1,Math.round(f.len/3.1));
    for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;opening(f,u,2.65,1.25,2.12,b.trim,'#bdc4bb','transom');f.panel(u,3.87,.22,1.68,.16,.31,b.trim,true);yield;}
    for(const u of[.12,f.len-.12])flutedPilaster(f,u,.62,3.70,.23,b.trim);yield;
  }
  function* corner67(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),street=n[1]<-.8&&p[1]<480.5,side=n[0]<-.8&&p[0]<194,diagonal=n[0]<-.55&&n[1]<-.55&&f.len>3.5;
    if(!(street||side||diagonal)){yield* conservativeRear(b,f);return;}
    band(f,.45,.90,.13,'#a8aa99');a.cornice(f,b.height,b.trim);band(f,4.35,.25,.40,b.trim);band(f,4.65,.15,.23,b.trim);
    rusticated(f,1.0,4.15,'#cbd1b7','#b7c0a8');
    if(diagonal){
      const u=f.len/2,rise=frontalEntry(b,f,u,2.50,4,.52,.38,'StreetViewJuly2025 and InteroTillen03Mar2024: red Rockovoy door in the diagonal corner, exterior shallow stone staircase.','#9a9b8a',[]);
      glassDoor(f,u,rise,1.50,3.2,'#a7372d','#3e4e48','#8c362f');
      f.panel(u,rise+3.74,.22,2.43,.91,.12,'#344b43');f.label('ROCKOVOY',u,rise+3.86,.23,'#d6c99e',.31);f.label('BAR',u,rise+3.56,.17,'#d6c99e',.31);
      ornateWindow(f,u,7.15,1.55,2.70,b.trim,'curve');roundedSlab(f,u,5.22,f.len+.25,1.07,.22,b.trim);
      for(let i=0;i<16;i++){const t0=i*Math.PI/16,t1=(i+1)*Math.PI/16,q=f.at(u+Math.cos((t0+t1)/2)*(f.len+.25)/2,.08+Math.sin((t0+t1)/2)*1.07);m.box(q[0],f.y+5.70,q[1],Math.max(.22,f.len/16),.80,.08,b.trim,false,false,angle(f)-(t0+t1)/2+Math.PI/2);}
      yield;return;
    }
    const bay=Math.max(1,Math.round(f.len/3.1));
    for(let i=0;i<bay;i++){
      const u=(i+.5)*f.len/bay,pt=f.at(u),upper=i%4===2?'curve':'triangle';
      ornateWindow(f,u,7.15,1.32,2.50,b.trim,upper);
      if((street&&pt[0]<205)||(side&&pt[1]<491)){
        opening(f,u,2.47,1.71,2.68,b.trim,'#405b4e','single','#486058');
        const pp=f.at(u,.42);m.box(pp[0],f.y+4.04,pp[1],2.30,.13,.72,'#295448',false,false,angle(f));f.panel(u,3.87,.79,2.31,.24,.05,'#295448');f.label('ROCKOVOY',u,3.87,.13,'#dcd9c9',.83);
      }else opening(f,u,2.46,1.38,2.04,b.trim,'#9ba99b','transom');
      if(i%3===1)ac(f,u+.75,4.06);
      yield;
    }
    for(let u=.3;u<f.len;u+=.45)f.panel(u,b.height-.48,.26,.15,.18,.19,b.trim,true);
    for(const u of[.16,f.len-.16])flutedPilaster(f,u,4.77,4.55,.25,b.trim);
    if(street&&p[0]>229.5&&p[0]<238.5&&f.len>6){
      const u=uAt(f,234.0)??f.len/2,r=frontalEntry(b,f,u,2.1,3,.40,.44,'July2025StreetView13: timber-glazed București67 entrance beneath the projecting curved balcony, three exterior risers.','#9b9b89',[]);
      glassDoor(f,u,r,1.24,2.63,'#967448','#536b5b');roundedSlab(f,u,5.18,3.9,1.10,.23,b.trim);f.panel(u,5.69,1.02,3.55,.80,.10,b.trim);
      const shade=segment(f,229.9,232.3);if(shade){const q=shade.at(shade.len/2,.86);m.box(q[0],f.y+2.3,q[1],shade.len,.10,1.7,'#5b493a',false,false,angle(f));for(const v of[.12,1.60]){const q=shade.at(shade.len/2,v);m.box(q[0],f.y+1.04,q[1],shade.len,1.8,.055,'#3c4540',false,true,angle(f));}}
    }
    if(side){
      for(const z of[499.0,512.5]){const u=uAt(f,z,1);if(u!==null&&u>1.3&&u<f.len-1.3){roundedSlab(f,u,5.16,3.5,.8,.20,b.trim);f.panel(u,5.65,.84,3.3,.78,.09,b.trim);}}
      const entrance=uAt(f,498.1,1);
      if(entrance!==null&&entrance>1.2&&entrance<f.len-1.2){const r=frontalEntry(b,f,entrance,2.25,3,.39,.42,'July2025StreetView frame04: separate tall exterior entrance to the right/south of the low LaTaifas enclosure. The photographed door and shallow steps are retained without assigning it to the restaurant.','#9c9e89',[]);glassDoor(f,entrance,r,1.30,2.45,'#795b38','#4b5649');
        const q=f.at(entrance,.62);m.box(q[0],f.y+r+2.99,q[1],2.55,.10,1.22,'#51574d',false,false,angle(f));
      }
    }
    yield;
  }
  function* asachiOld(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),street=n[1]>.8&&p[1]>457,west=n[0]<-.8&&p[0]<193,diagonal=n[0]<-.55&&n[1]>.55&&p[1]>449&&f.len>8;
    if(!(street||west||diagonal)){yield* conservativeRear(b,f);return;}
    band(f,.60,1.2,.14,'#9b5945');a.cornice(f,b.height,b.trim);band(f,5.18,.28,.42,b.trim);band(f,5.43,.14,.25,b.trim);
    rusticated(f,1.2,5.0,b.wall,'#b38d75');
    if(diagonal){
      const u=f.len/2;
      for(const du of[-f.len*.30,0,f.len*.30])highArchedWindow(f,u+du,5.95,2.30,3.57,b.trim,'#7c918a');
      for(const du of[-f.len*.30,f.len*.30])highArchedWindow(f,u+du,1.57,2.25,3.1,b.trim,'#d4dbce');
      const r=frontalEntry(b,f,u,3.05,3,.42,.46,'Gikü30Sep2021 and July2025corner view: main historical school entrance has a low external staircase between two columns.','#a38e7a',[]);
      glassDoor(f,u,r,2.15,3.64,'#d7dfd4','#687f78');
      for(const du of[-1.81,1.81]){const q=f.at(u+du,.84);a.column(q[0],q[1],f.y+r,4.53,.39,b.trim,true);}
      balustrade(f,u,5.24,f.len+.22,1.24,b.trim);
      for(const du of[-f.len*.45,-f.len*.15,f.len*.15,f.len*.45]){const q=f.at(u+du,.53);a.column(q[0],q[1],f.y+5.56,4.35,.21,b.trim);}
      f.panel(u,10.84,.33,f.len+.12,.88,.38,b.wall);
      const pp=f.at(u,.51),circle=new T.CircleGeometry(1.47,32);circle.rotateY(angle(f));circle.translate(pp[0],f.y+11.17,pp[1]);m.put(circle,b.wall);
      const ring=new T.TorusGeometry(1.42,.12,6,28);ring.rotateY(angle(f));ring.translate(pp[0],f.y+11.17,pp[1]);m.put(ring,b.trim,true);
      const ring2=new T.TorusGeometry(1.15,.055,4,28);ring2.rotateY(angle(f));ring2.translate(pp[0],f.y+11.17,pp[1]);m.put(ring2,'#c4c8bb',true);yield;return;
    }
    if(west){const ochre=segment(f,415.3,431.5,1);if(ochre)band(ochre,.61,1.22,.16,'#b28c4f');}
    if(f.len<4){yield;return;}
    const count=Math.max(1,Math.round(f.len/3.5));
    for(let i=0;i<count;i++){
      const u=(i+.5)*f.len/count;
      highArchedWindow(f,u,1.60,1.52,3.02,b.trim,'#aebeb4');highArchedWindow(f,u,6.05,1.53,3.07,b.trim,'#a4b6ac');
      for(const du of[-1.1,1.1])f.panel(u+du,7.56,.16,.20,4.3,.26,b.trim,true);yield;
    }
    if(west){const u=uAt(f,433.6,1);if(u!==null&&u>2&&u<f.len-2){
      const r=frontalEntry(b,f,u,2.80,6,.80,.50,'September2021 photographed secondaryPușkin portico: exterior door and raised entry, exact six-riser count and rise estimated. The public approach passes beside the observed curb tree.','#a49d89',[],.85);
      glassDoor(f,u,r,1.55,3.15,'#d4ddcf','#677f78');
      for(const du of[-1.7,1.7]){const q=f.at(u+du,.85);a.column(q[0],q[1],f.y+r,3.95,.31,b.trim,true);}
      balustrade(f,u,5.25,4.05,1.20,b.trim);
    }}
    yield;
  }
  function modernRelief(f:Facade,u:number,cy:number,w:number,h:number){
    f.panel(u,cy,.18,w,h,.12,'#d8ddcf');
    for(const s of[-1,1]){f.panel(u+s*(w/2-.07),cy,.28,.07,h-.08,.08,'#e5e6d9',true);f.panel(u,cy+s*(h/2-.06),.28,w-.08,.07,.08,'#e5e6d9',true);}
    // Simplified straight reliefs reproduce the white geometric panel rhythm.
    for(let k=-1;k<=1;k++)f.panel(u+k*.08,cy+k*h*.24,.29,w*.78,.045,.055,'#e8e8dc',true);
    for(const sign of[-1,1]){const a0=f.at(u-w*.34,.30),a1=f.at(u+w*.34,.30);m.beam(new T.Vector3(a0[0],f.y+cy+sign*h*.33,a0[1]),new T.Vector3(a1[0],f.y+cy-sign*h*.33,a1[1]),.027,'#e9eadf');}
  }
  function* asachiNew(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),west=n[0]<-.85&&p[0]<230;
    if(!west){if(f.len>4.5){a.cornice(f,b.height,b.trim);yield* a.windows(f,b.levels,b.height,Math.max(1,Math.round(f.len/4.0)),1.85,b.trim,'#b9c5bc');}yield;return;}
    const levels=4,storey=3.13,base=4.30,count=Math.max(1,Math.round(f.len/4.05));
    for(let row=0;row<levels;row++){
      const cy=base+row*storey+1.15;
      for(let i=0;i<count;i++){
        const u=(i+.5)*f.len/count,w=Math.min(2.50,f.len/count*.58);
        opening(f,u,cy,w,2.04,'#d6dcd1','#d8ded4','single','#8caaa5');
        const panelU=u+f.len/count*.41;if(panelU<f.len-.30)modernRelief(f,panelU,cy,Math.min(1.43,f.len/count*.34),2.14);
        if(row===0&&i%4===1)ac(f,u+.62,cy+.77);yield;
      }
      band(f,base+row*storey-.22,.30,.15,'#b2c4c3');
    }
    for(let u=.12;u<f.len;u+=4.10){f.panel(u,10.60,.24,.19,13.2,.41,'#cbd3c7');f.panel(u,18.21,.24,.26,2.15,.44,'#b7c4bc');}
    for(const yy of[17.22,18.65])f.panel(f.len/2,yy,.08,f.len,.60,.26,'#b5c6c0');
    if(p[1]>358){
      const bays=Math.max(1,Math.round(f.len/2.65));for(let i=0;i<bays;i++){const u=(i+.5)*f.len/bays;opening(f,u,1.86,Math.min(2.35,f.len/bays-.12),3.22,'#596d67','#455d55','single','#587975');yield;}
      f.panel(f.len/2,3.70,.13,f.len,.78,.23,'#829ca3');
      const medical=segment(f,378.0,384.2,1);if(medical&&medical.len>3.0){medical.panel(medical.len/2,3.69,.28,medical.len,.63,.08,'#315982');medical.label('CENTRUL MEDICAL FLUID',medical.len/2,3.7,.20,'#dfcb7c',.34);}
    }else if(f.len>10){
      const u=uAt(f,351.1,1)??f.len*.48;
      const r=frontalEntry(b,f,u,9.0,5,.66,.52,'Z thomas06Apr2025front entry: five visible stone risers below a broad glass entrance and right side accessibility ramp. Exact metric rise and position are photographic estimates.','#a4aaa3',[]);
      for(const du of[-3.5,-1.75,0,1.75,3.5])glassDoor(f,u+du,r,1.62,2.55,'#dce4d8','#78938a');
      for(const du of[-3.0,3.0])f.panel(u+du,r+1.52,.34,.58,3.04,.38,'#21604e');
      f.panel(u,r+3.14,.75,10.5,.54,1.50,'#b8ad80');f.label('LICEUL GHEORGHE ASACHI',u,r+3.15,.24,'#41675a',1.53);
      f.panel(u-5.5,1.99,.23,1.86,3.91,.34,'#b5ad91');f.panel(u+5.5,1.99,.23,.77,3.91,.34,'#899b99');
      for(let yy=.37;yy<3.91;yy+=.59){f.panel(u-5.5,yy,.413,1.84,.035,.025,'#9d957e',true);f.panel(u-5.5+(Math.round(yy/.59)%2?.28:-.28),yy+.29,.414,.035,.57,.025,'#a49c84',true);}
      // Original low-relief silhouette after Z thomas06Apr2025photo38: the
      // bronze bust is attached to the left stone pier, outside the doorway.
      const reliefU=u-5.50,relief=m.facade(f.at(reliefU-.5),f.at(reliefU+.5),f.y),coat=new T.Shape();
      coat.moveTo(-.43,0);coat.lineTo(.43,0);coat.lineTo(.39,.85);coat.lineTo(.22,1.12);coat.lineTo(-.22,1.12);coat.lineTo(-.41,.82);coat.closePath();
      const coatG=new T.ExtrudeGeometry(coat,{depth:.14,bevelEnabled:false}),coatP=f.at(reliefU,.44);coatG.rotateY(angle(f));coatG.translate(coatP[0],f.y+1.23,coatP[1]);m.put(coatG,'#5e695a',true);
      const head=new T.SphereGeometry(1,10,8);head.scale(.15,.22,.075);head.rotateY(angle(f));const headP=f.at(reliefU,.59);head.translate(headP[0],f.y+2.56,headP[1]);m.put(head,'#65705e',true);
      for(const sign of[-1,1]){relief.panel(.5+sign*.12,2.08,.60,.055,.60,.05,'#89917b',true);relief.panel(.5+sign*.29,1.54,.59,.24,.10,.10,'#78816c',true);}
      relief.panel(.5,1.42,.62,.62,.28,.10,'#4c5b50',true);
      // A ramp follows the observed southern side of this same entry.
      const startU=u+5.95,endU=u+3.35,v=5.28,depth=1.28;
      const foot=f.at(startU+2.4,v),landing=f.at(endU,v),rampLength=startU+2.4-endU;
      const low=surfaceGround(...foot)+.035,high=surfaceGround(...f.at(u,2.35))+.035+.66;
      const verts:number[]=[];const top=(uu:number)=>low+(high-low)*(startU+2.4-uu)/rampLength;
      const A=f.at(startU+2.4,v-depth/2),B=f.at(startU+2.4,v+depth/2),C=f.at(endU,v+depth/2),D=f.at(endU,v-depth/2);
      verts.push(A[0],low,A[1],C[0],high,C[1],B[0],low,B[1],A[0],low,A[1],D[0],high,D[1],C[0],high,C[1]);
      const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(verts,3));gg.computeVertexNormals();m.put(gg,'#9ea59d',false,true);
      for(const dv of[-depth/2,depth/2]){
        for(const yy of[.47,.92]){const q=f.at(startU+2.4,v+dv),p=f.at(endU,v+dv);physicalBeam(new T.Vector3(q[0],low+yy,q[1]),new T.Vector3(p[0],high+yy,p[1]),.022,'#b6c0b4');}
        for(let k=0;k<=4;k++){const uu=startU+2.4-(rampLength*k/4),p=f.at(uu,v+dv);m.box(p[0],top(uu)+.47,p[1],.032,.94,.032,'#b6c0b4',true,true);}
      }
      const connector:XY[]=[f.at(endU-1.0,.12),f.at(endU+.65,.12),f.at(endU+.65,v+.64),f.at(endU-1.0,v+.64)];
      m.solid(connector,.24,high-.24,'#9ea59d',true);
      // Join only the existing top landing. Extending this connector over the
      // descending central treads would turn two visible risers into one jump.
      const entryConnector:XY[]=[f.at(u-.65,.12),f.at(endU+.65,.12),f.at(endU+.65,.64),f.at(u-.65,.64)];
      m.solid(entryConnector,.24,high-.24,'#9ea59d',true);
      register(b,f,u,depth,.66,9,0,[f.at(startU+3.05,v),f.at(endU-.55,v),f.at(endU-.55,.40),f.at(u,.40)],'ramp','Z thomas06Apr2025 visible metal-railed ramp to the south of the Asachi modern front entrance.',entries,'side-ramp');
    }else{yield* a.windows(f,1,3.8,Math.max(1,Math.round(f.len/3.1)),1.85,'#697e70','#486252');}
    yield;
  }
  function* semigradov(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),east=n[0]>.8&&p[0]>170,street=n[1]>.8&&p[1]>457,corner=p[0]>169&&p[1]>455;
    if(!(east||street||corner)){yield* conservativeRear(b,f);return;}
    a.cornice(f,b.height,b.trim);band(f,.45,.90,.16,'#9e9d87');band(f,4.76,.25,.32,b.trim);band(f,5.0,.14,.23,b.trim);
    if(corner&&f.len>1.1){const u=f.len/2;opening(f,u,2.66,Math.min(.95,f.len*.65),2.62,b.trim,'#b8c4b4','transom');grille(f,u,2.65,Math.min(.88,f.len*.61),2.58);highArchedWindow(f,u,5.73,Math.min(1.1,f.len*.70),3.40,b.trim,'#ccd4c5');yield;return;}
    if(f.len<1.0){yield;return;}
    const coords=east?[437.7,441.0,444.2,447.4,450.7,453.9]:[152.7,155.1,163.9,166.5,168.3];
    for(const{u}of facePositions(f,coords,east?1:0)){
      ornateWindow(f,u,7.12,1.25,2.60,b.trim,'flat');opening(f,u,2.62,1.20,2.53,b.trim,'#c2ccbd','transom');grille(f,u,2.64,1.14,2.48);rosette(f,u,1.11,.15,b.trim);yield;
    }
    rusticated(f,1.10,4.60,b.wall,'#d4c6b6');
    if(street){
      const u=uAt(f,160.55);if(u!==null&&f.len>2){const r=frontalEntry(b,f,u,2.10,3,.42,.40,'Gikü04Sep2022: photographed public-facing entry beneath the Semigradov south portico. Shallow exterior steps and dimensions estimated.','#af9a84',[]);glassDoor(f,u,r,1.21,3.17,'#d2d8c8','#5b7263');}
    }
    yield;
  }
  function* puskin15(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),east=n[0]>.8,street=n[1]<-.8&&p[1]<480;
    if(!(east||street)){yield* conservativeRear(b,f);return;}
    const h=b.height;band(f,.45,.9,.12,'#969987');a.cornice(f,h,b.trim);
    for(let yy=.8;yy<h-.2;yy+=.34)f.panel(f.len/2,yy,.045,f.len,.018,.06,'#a7a58e',true);
    const bays=Math.max(1,Math.round(f.len/3.05));
    for(let i=0;i<bays;i++){
      const u=(i+.5)*f.len/bays;
      for(let row=1;row<=4;row++){
        const cy=5.25+(row-1)*3.05;opening(f,u,cy,1.40,1.65,'#d2d6c7','#dbe1d4','single','#8faaa3');
        if(east&&i%4===1){
          const enclosed=(row+i)%3!==0;f.panel(u,cy-1.0,.60,2.65,.18,1.20,'#c1bda6');f.panel(u,cy-.48,1.15,2.47,.87,.10,enclosed?'#bec5bc':'#c9c8b5');
          if(enclosed){f.panel(u,cy+.58,1.14,2.47,1.25,.04,'#8fa7a0',false,1);for(const du of[-1.23,0,1.23])f.panel(u+du,cy+.51,1.2,.045,1.5,.06,'#d4d9cd');}
          else for(let du=-1.18;du<1.18;du+=.23)f.panel(u+du,cy-.48,1.22,.025,.84,.03,'#a29f8e',true);
        }
      }
      opening(f,u,1.80,Math.min(2.5,f.len/bays-.12),2.7,'#c0bda6','#465e50','single','#5b7766');
      if(i%4===2)ac(f,u+.86,3.5);yield;
    }
    if(east){
      const cafe=segment(f,479.2,490.8,1);if(cafe){
        cafe.panel(cafe.len/2,3.31,.20,cafe.len,.68,.24,'#443d3c');cafe.label('TUCANO COFFEE',cafe.len/2,3.32,.36,'#e3e0ce',.35);
        const q=cafe.at(cafe.len/2,1.0);m.box(q[0],f.y+2.83,q[1],cafe.len,.08,2.0,'#696b5e',false,false,angle(f));
      }
      for(const z of[484.0,501.5,518.9]){const u=uAt(f,z,1);if(u===null||u<1||u>f.len-1)continue;const r=frontalEntry(b,f,u,1.35,1,.12,.30,'July2025Pușkin15: glazed street shop entrances with low exterior threshold. Exact location and height estimated.','#b0a58f',[]);glassDoor(f,u,r,1.06,2.47,'#736e58','#4f6c5b');}
    }
    yield;
  }
  function* puskin20(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);
    if(!(n[0]<-.8&&p[0]<194)){yield* conservativeRear(b,f);return;}
    a.cornice(f,b.height,b.trim);
    // Photographed stone panels stop at the recessed entry. The lower body is
    // cut by the reviewed passage polygon, while its official plan is intact.
    for(const[lo,hi]of[[520,535.15],[537.85,551]]){
      const stone=segment(f,lo,hi,1);if(!stone)continue;
      stone.panel(stone.len/2,1.47,.065,stone.len,2.94,.10,'#b59870');
      for(let yy=.22;yy<2.94;yy+=.43){
        stone.panel(stone.len/2,yy,.126,stone.len,.018,.016,'#96846a',true);
        for(let u=.35+(Math.round(yy/.43)%2)*.34;u<stone.len;u+=.69)stone.panel(u,yy+.21,.128,.015,.42,.016,'#aa8c67',true);
      }
      yield;
    }
    f.panel(f.len/2,3.30,.13,f.len,.59,.14,'#325e50');
    for(let u=.15;u<f.len;u+=2.3)f.panel(u,3.30,.23,.07,.59,.08,'#647e68',true);
    // The two upper rows remain the explicitly estimated v111/OSM storeys;
    // July2025 foliage conceals them and does not verify their dimensions.
    const count=Math.max(1,Math.round(f.len/3.5));
    for(let i=0;i<count;i++)for(const yy of[4.95,7.83]){opening(f,(i+.5)*f.len/count,yy,1.5,1.75,'#c8cec1','#aab7a7','single','#708d7e');yield;}
    const globeU=uAt(f,533.0,1);
    if(globeU!==null){
      const q=f.at(globeU,.21),g=new T.TorusGeometry(.36,.023,5,24);g.rotateY(angle(f));g.translate(q[0],f.y+2.1,q[1]);m.put(g,'#dbdeca',true);
      for(const scale of[.45,.78]){const e=new T.TorusGeometry(.36,.016,4,22);e.scale(scale,1,1);e.rotateY(angle(f));e.translate(q[0],f.y+2.1,q[1]);m.put(e,'#dbdeca',true);}
      for(const yy of[-.16,.16])f.panel(globeU,2.1+yy,.23,.61,.018,.025,'#dbdeca',true);
    }
    yield;
  }
  function* detail(b:Building,f:Facade):Generator<void>{
    if(b.style==='gamburd63'){yield* gamburd(b,f);return;}
    if(b.style==='bucuresti65Low'){yield* low65(b,f);return;}
    if(b.style==='bucuresti67Rental'){yield* corner67(b,f);return;}
    if(b.style==='bucuresti67LowWing'){yield* low67(b,f);return;}
    if(b.style==='asachiHistoric'){yield* asachiOld(b,f);return;}
    if(b.style==='asachiModern'){yield* asachiNew(b,f);return;}
    if(b.style==='semigradov66'){yield* semigradov(b,f);return;}
    if(b.style==='puskin15Block'){yield* puskin15(b,f);return;}
    if(b.style==='puskin20Office'){yield* puskin20(b,f);return;}
    yield;
  }
  function* detailExtra(b:Building):Generator<void>{
    const y=ground(...b.anchor as XY)+.12;
    if(b.style==='puskin20Office'){
      const f=m.facade([195.50,535.15],[195.50,537.85],y),u=1.35;
      const r=frontalEntry(b,f,u,1.60,6,.84,.42,'July2025StreetView23–24: World Bank office recessed exterior entrance with about six visible risers; exact dimensions and recess position estimated and intersected with the official body.','#777b69',[]);
      glassDoor(f,u,r,1.38,2.15,'#aab79f','#3d5949');
      f.panel(u,r+2.55,.17,2.50,.44,.10,'#285343');f.label('WORLD BANK',u,r+2.56,.15,'#d8e1ca',.24);
      const x=192.25,z0=543.7,z1=537.4,low=surfaceGround(x,z0)+.035,high=f.y+r,width=1.0;
      const verts=[x-width/2,low,z0,x+width/2,low,z0,x+width/2,high,z1,x-width/2,low,z0,x+width/2,high,z1,x-width/2,high,z1];
      const ramp=new T.BufferGeometry();ramp.setAttribute('position',new T.Float32BufferAttribute(verts,3));ramp.computeVertexNormals();m.put(ramp,'#969989',false,true);
      // This side connector stays entirely inside the reviewed entry void;
      // it never opens the solid wall south of z537.85.
      m.solid([[191.75,536.95],[195.30,536.95],[195.30,537.82],[191.75,537.82]],.18,high-.18,'#9c9f8e',true);
      for(const dx of[-width/2,width/2]){
        // Leave the inner rail open at the turn into the upper landing.
        const endZ=dx>0?z1+.70:z1,endT=(z0-endZ)/(z0-z1),endY=low+(high-low)*endT;
        for(const dy of[.20,.52,.93])physicalBeam(new T.Vector3(x+dx,low+dy,z0),new T.Vector3(x+dx,endY+dy,endZ),.022,'#aab3a1');
        for(let k=0;k<=5;k++){const t=k/5*endT,zz=z0+(z1-z0)*t,yy=low+(high-low)*t;m.box(x+dx,yy+.47,zz,.035,.94,.035,'#9fa995',true,true);}
      }
      register(b,f,u,width,.84,.87,0,[[x,544.32],[x,537.4],[195.0,537.4],[195.0,536.5]],'ramp','July2025StreetView24 confirms the ramp and metal rails to the south/right of the office stair. Its6.3m run and0.84m rise are estimated; footprint remains outside the official wall and the top connector stays in the approved recess.',entries,'south-ramp');
      const fence=m.facade([193.3,539.9],[193.3,545.0],surfaceGround(193.3,542.45)+.035);
      const railPanel=(u:number,h:number,v:number,w:number,height:number,depth:number,color:string)=>{const q=fence.at(u,v);m.box(q[0],fence.y+h,q[1],w,height,depth,color,false,true,angle(fence));};
      railPanel(fence.len/2,.30,0,fence.len,.60,.20,'#b6ad92');
      for(let uu=.08;uu<fence.len;uu+=.18)railPanel(uu,1.39,.02,.025,1.62,.035,'#71816c');
      for(const yy of[.69,1.25,2.14])railPanel(fence.len/2,yy,.02,fence.len,.035,.05,'#71816c');
      for(const uu of[0,2.55,5.1])railPanel(uu,1.10,0,.065,2.20,.065,'#71816c');
      yield;
    }
    if(b.style==='asachiHistoric'){
      const p:XY[]=[[189.2,430.4],[190.9,430.4],[190.9,426.3],[189.2,426.3],[189.2,430.4]];
      const top=surfaceGround(190.05,430.7)+.035,low=top-.64;basementCut.bottom=low-.10;
      yield* m.surfaceStaged(p,()=>low-.10,'#737f71',true);
      for(let k=0;k<4;k++)m.box(190.05,top-(k+1)*.16-.11,430.4-(k+.5)*.32,1.70,.22,.325,'#9da38d',false,true);
      m.box(190.05,low-.12,427.71,1.70,.24,2.82,'#9da38d',false,true);
      m.box(189.12,low+.60,428.35,.16,1.20,4.14,'#b7b29c',false,true);
      m.box(190.06,low+.61,426.22,1.86,1.22,.16,'#b7b29c',false,true);
      const front=m.facade([191.15,425.9],[191.29,430.7],y),du=front.len*.36;
      glassDoor(front,du,low-y,1.02,1.98,'#a8b6a3','#3e5548');
      const q=front.at(front.len/2,.90);m.box(q[0],y+2.38,q[1],front.len+.35,.08,1.8,'#747e71',false,false,angle(front));
      front.panel(front.len/2,2.06,1.80,front.len,.56,.06,'#c8c3b0');front.label('SFANTA TEODORA',front.len/2,2.07,.23,'#6c8a78',1.85);
      front.panel(.40,2.06,1.85,.24,.07,.035,'#a64b41',true);front.panel(.40,2.06,1.85,.07,.24,.035,'#a64b41',true);
      for(const u of[.17,front.len-.17]){const q=front.at(u,1.72);m.box(q[0],top+1.13,q[1],.035,2.26,.035,'#686e61',false,true);}
      register(b,front,du,1.70,-.64,2.82,4,[[190.05,431.10],[190.05,429.0],[190.05,427.4]],'lateral','September2025 StreetView19 confirms basement doorway and retaining parapet. Four steps,0.64m depth and metric placement estimated; interior remains closed.',entries,'basement-descent');
      yield;
    }
    if(b.style==='semigradov66'){
      const f=m.facade([155.9,458.35],[165.8,458.25],y),u=uAt(f,160.55)??f.len/2;
      for(const du of[-1.45,1.45]){const q=f.at(u+du,1.0);a.column(q[0],q[1],ground(...q)+.18,4.15,.25,b.trim,true);}
      balustrade(f,u,4.91,3.8,1.40,b.trim);curvedHead(f,u,10.32,4.3,1.1,b.trim);
      f.panel(u,10.10,.16,4.45,.67,.25,b.wall);yield;
    }
    if(b.style==='bucuresti67Rental'){
      const enclosure:XY[]=[[190,493.5],[192.6322,493.5],[192.651,494.3105],[191.0892,494.3515],[191.1764,497],[190,497]],ey=surfaceGround(190,495.25)+.035;
      const front=m.facade([190,493.5],[190,497],ey);
      // July2025frame04 shows this low timber enclosure separately from the
      // tall door to its south. Its hidden stair direction is not modelled.
      m.box(190,ey+.64,495.25,.10,1.28,3.5,'#936b3f',false,true);
      for(const[z,backX]of[[493.5,192.6322],[497,191.1764]])m.box((190+backX)/2,ey+.64,z,backX-190,1.28,.10,'#986f40',false,true);
      for(let u=.12;u<front.len;u+=.16)front.panel(u,.65,.065,.025,1.23,.025,'#b88c51',true);
      for(const yy of[.12,1.26])front.panel(front.len/2,yy,.11,front.len,.09,.12,'#6e5237');
      front.panel(1.75,.89,.14,1.6,.52,.06,'#354d43');front.label('LA TAIFAS',1.75,.89,.20,'#d5c994',.20);
      for(const z of[493.5,497])m.box(190,ey+1.26,z,.11,2.52,.11,'#785a3c',false,true);
      m.solid(enclosure,.10,ey+2.48,'#80573e',false);
      front.panel(front.len/2,2.46,.12,front.len+.12,.20,.10,'#8b5e40');
      frontalEntry(b,front,1.75,1.25,1,.12,.25,'July2025StreetView04: exterior low gray threshold at the timber LaTaifas enclosure. Exact0.12m rise and position estimated. The closed enclosure retains the unobserved interior and no descending stair is invented.','#a49d89',[]);
      yield;
      // The July2025 western Rockovoy facade carries a long exterior bench.
      const f=m.facade([192.55,483.4],[192.64,492.0],y),len=f.len;
      for(const v of[.36,.72]){const q=f.at(len/2,v);m.box(q[0],ground(...q)+.54,q[1],len-.55,.08,.25,'#35574a',false,true,angle(f));}
      for(let u=.35;u<len-.2;u+=1.8){const q=f.at(u,.64);m.box(q[0],ground(...q)+.26,q[1],.06,.52,.06,'#394c40',false,true);}
      for(const u of[1.1,3.2,5.4,7.5]){const q=f.at(u,1.0);m.box(q[0],ground(...q)+.85,q[1],.47,.06,.47,'#3e6655',false,true);m.box(q[0],ground(...q)+.43,q[1],.045,.86,.045,'#31473b',false,true);}
      yield;
    }
  }
  const cloneRoutes=(routes:BucurestiBu09EntryRoute[])=>routes.map(e=>({...e,faceStart:[...e.faceStart]as XY,faceEnd:[...e.faceEnd]as XY,points:e.points.map(p=>[...p]as XY),route:e.route.map(p=>[...p]as XY)}));
  return {a,normal,angle,handles,detail,detailExtra,excavations:[basementCut],setActivationReady:(fn:()=>boolean)=>{activationReady=fn;},entryRoutes:()=>cloneRoutes(entries),thresholdRoutes:()=>cloneRoutes(thresholds),get entrances(){return cloneRoutes([...entries,...thresholds]);}};
}
