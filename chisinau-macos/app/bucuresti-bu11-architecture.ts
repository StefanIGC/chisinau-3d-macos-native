import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import {pointSegmentDistance, type XY} from './city-layout';
import type {GroundExcavation} from './ground-excavations';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

/** Exterior approach only. A photographed door does not assert a traversable interior. */
export type BucurestiBu11EntryRoute = {
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

/** Original meshes for București, Mitropolit Gavriil Bănulescu-Bodoni–Nicolae Iorga. The official polygons
 * supply the plan, photographs supply the visible architectural character.
 * Heights, opening positions and stair dimensions remain explicit estimates. */
export function bucurestiBu11Architecture(m: Mesh, ground: (x: number, z: number) => number,
  surfaceGround: (x: number, z: number) => number = ground) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const entries: BucurestiBu11EntryRoute[] = [];
  const thresholds: BucurestiBu11EntryRoute[] = [];
  let activationReady=()=>false;
  const excavations: GroundExcavation[] = [];
  const keys = new Set<string>();
  const owned = new Set<string>(['villa72','villa72Terrace','cream74','office76','office91','heritage93','iorga24','iorga21','iorga21Portico','iorga21Rear','palaceRepublic']);

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
    target.push({name: `${b.title} · ${kind === 'stair' ? 'scară' : kind === 'ramp' ? 'rampă' : 'prag exterior'}`,
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
    register(b, f, u, width, rise, landing, steps, approachOffset?[f.at(u+approachOffset,far+.72),f.at(u+approachOffset,far+.13),f.at(u,far+.13),f.at(u,.50)]:[f.at(u,far+.72),f.at(u,.50)], 'normal', evidence,
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

  function shutter(f:Facade,u:number,center:number,width:number,height:number){
    f.panel(u,center,.18,width,height,.045,'#c8c9c0');
    for(let yy=center-height/2+.08;yy<center+height/2;yy+=.105)f.panel(u,yy,.209,width-.055,.014,.018,'#a7aca3',true);
    for(const sign of[-1,1])f.panel(u+sign*(width/2+.04),center,.23,.075,height+.13,.09,'#d8d9ce',true);
    f.panel(u,center+height/2+.12,.22,width+.19,.22,.15,'#d7d8cd');
  }
  function dentils(f:Facade,h:number,trim:string,spacing=.43){
    for(let u=.18;u<f.len-.08;u+=spacing)f.panel(u,h,.19,.17,.19,.30,trim,true);
  }
  function stoneBase(f:Facade,h:number,color:string,rough=false){
    band(f,h/2,h,.10,color);
    for(let yy=.12;yy<h;yy+=.31){
      f.panel(f.len/2,yy,.112,f.len,.025,.032,rough?'#817f70':'#a5a18f',true);
      for(let u=.18+(.31*Math.round(yy/.31)%2);u<f.len;u+=.67)f.panel(u,yy+.14,.114,.024,.27,.034,rough?'#827f71':'#a5a18f',true);
    }
  }
  function lowRelief(f:Facade,u:number,y:number,w:number,trim:string){
    f.panel(u,y,.19,w,.34,.12,trim,true);
    rosette(f,u,y+.18,.14,trim);
    for(const sign of[-1,1])for(let i=0;i<3;i++){
      const p=f.at(u+sign*(.22+i*.17),.28),g=new T.SphereGeometry(.11,6,4);g.scale(1.7,.48,.30);g.rotateZ(sign*(.26+i*.12));g.rotateY(angle(f));g.translate(p[0],f.y+y+.10+i*.018,p[1]);m.put(g,trim,true);
    }
  }
  function classicWindow(f:Facade,u:number,y:number,w:number,h:number,trim:string,closed=false,withGrille=false){
    opening(f,u,y,w,h,trim,'#b7b7aa','transom');
    if(closed)shutter(f,u,y,w-.10,h-.10);
    lowRelief(f,u,y+h/2+.32,w+.36,trim);
    f.panel(u,y-h/2-.42,.13,w+.25,.48,.10,trim,true);
    f.panel(u,y-h/2-.42,.20,w-.03,.30,.06,'#c4baa5',true);
    if(withGrille)grille(f,u,y,w-.08,h-.10,'#4c514b');
  }
  function shapePanel(f:Facade,u:number,bottom:number,w:number,h:number,color:string,offset=.12,rounded=true){
    const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);
    if(rounded){s.lineTo(w/2,h*.15);s.quadraticCurveTo(w*.36,h*.15,w*.30,h*.62);s.quadraticCurveTo(0,h*1.36,-w*.30,h*.62);s.quadraticCurveTo(-w*.36,h*.15,-w/2,h*.15);}else{s.lineTo(0,h);}
    s.closePath();const p=f.at(u,offset),g=new T.ShapeGeometry(s,14);g.rotateY(angle(f));g.translate(p[0],f.y+bottom,p[1]);m.put(g,color);
  }
  function* villa72(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),trim=b.trim;
    if(b.style==='villa72Terrace'){
      if(n[1]<-.7)return;
      const top=b.height+.23;
      f.panel(f.len/2,top+.87,.08,f.len+.12,.17,.26,trim);
      f.panel(f.len/2,top+.12,.03,f.len,.15,.20,trim);
      for(let u=.16;u<f.len;u+=.29){
        const q=f.at(u,.05),v=new T.CylinderGeometry(.058,.075,.58,7);v.translate(q[0],f.y+top+.47,q[1]);m.put(v,trim,false,true);
        const bulb=new T.SphereGeometry(.10,7,5);bulb.scale(1,1.30,1);bulb.translate(q[0],f.y+top+.48,q[1]);m.put(bulb,trim,true);
      }
      for(const u of[.04,f.len-.04])f.panel(u,top+.47,.06,.17,.85,.22,trim);yield;return;
    }
    // Partitioning the low terrace leaves short collinear edges. The single
    // observed triforium is authored once in detailExtra, never per micro-edge.
    if(n[1]>.75&&p[1]>455.8){yield;return;}
    if(n[0]>.65&&n[1]>.45&&p[0]>-194.8&&p[0]<-191.9&&p[1]>449&&p[1]<452.6){
      // The brown carved door is visible on this small angled return in SV12/13.
      // Its court-side steps are occluded; no public route or staircase is inferred.
      band(f,1.30,2.6,.04,'#cfc5b0');band(f,4.10,3.0,.04,'#8a806c');
      woodDoor(f,f.len*.50,.28,1.25,3.16);
      lowRelief(f,f.len*.50,3.80,1.70,trim);yield;return;
    }
    if(n[1]>.65&&p[1]>449&&f.len>2.5){
      band(f,1.30,2.6,.04,'#cfc5b0');band(f,4.10,3.0,.04,'#8a806c');
      opening(f,f.len*.5,2.9,Math.min(1.3,f.len*.45),2.6,trim,'#c8ccc0','transom');
      for(const yy of[2.65,5.45])band(f,yy,.15,.31,'#a67c60');yield;return;
    }
    yield* conservativeRear(b,f);
  }
  function* villa72Front(b:Building):Generator<void>{
    const y=ground(...b.anchor as XY)+.12,trim=b.trim;
    const f=m.facade([-199.488,456.676],[-194.368,456.680],y);
      band(f,1.35,2.70,.05,'#d0c7b0');band(f,4.21,3.02,.05,'#817766');
      for(const u of[.31,f.len-.31]){
        f.panel(u,2.75,.17,.55,5.50,.26,trim);
        for(const yy of[.5,2.52,2.74,4.55,5.17])f.panel(u,yy,.23,.73,.19,.38,yy===2.74?'#a4775c':trim);
        for(const du of[-.16,.16])f.panel(u+du,3.55,.31,.045,1.36,.06,'#aba08c',true);
      }
      const center=f.len/2;
      for(const[du,w,h]of[[-1.00,.85,3.2],[0,1.00,3.9],[1.00,.85,3.2]]){
        highArchedWindow(f,center+du,1.02,w,h,trim,'#cdd0c2');
        for(let xx=-w/2+.10;xx<w/2;xx+=.13)f.panel(center+du+xx,2.25,.50,.018,2.15,.03,'#626f65',true);
      }
      for(const yy of[2.65,5.45])band(f,yy,.15,.32,'#a67c60');
      dentils(f,5.56,trim,.39);    yield;
  }
  function* villa72Roof(b:Building):Generator<void>{
    // The source has a substantial hipped tile roof over the narrow front bay.
    // A local 2.8m hip run prevents the long rear wing from flattening that bay.
    for(const part of b.parts?.length?b.parts:[b]){
      const piece={...b,...part,parts:undefined};if(piece.style==='villa72Terrace')continue;
      const shape=new T.Shape();piece.p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
      for(const r of piece.holes){const hole=new T.Path();r.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();shape.holes.push(hole);}
      const source=new T.ShapeGeometry(shape);source.rotateX(-Math.PI/2);const flat=source.toNonIndexed(),v=flat.attributes.position,out:number[]=[],y=ground(...b.anchor as XY)+.12;
      const at=(p:XY)=>{let d=Infinity;for(const ring of[piece.p,...piece.holes])for(let i=1;i<ring.length;i++)d=Math.min(d,pointSegmentDistance(p,ring[i-1] as XY,ring[i] as XY));return[p[0],y+piece.height+.15+b.roofRise*Math.min(1,d/2.8),p[1]];};
      function tri(a:XY,b:XY,c:XY,depth=0){
        const ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]);
        if(depth<10&&Math.max(ab,bc,ca)>1.8){
          if(ab>=bc&&ab>=ca){const p:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2];tri(a,p,c,depth+1);tri(p,b,c,depth+1);}
          else if(bc>=ca){const p:XY=[(b[0]+c[0])/2,(b[1]+c[1])/2];tri(a,b,p,depth+1);tri(a,p,c,depth+1);}
          else{const p:XY=[(c[0]+a[0])/2,(c[1]+a[1])/2];tri(a,b,p,depth+1);tri(p,b,c,depth+1);}return;
        }
        out.push(...at(a),...at(b),...at(c));
      }
      for(let i=0;i<v.count;i+=3){tri([v.getX(i),v.getZ(i)],[v.getX(i+1),v.getZ(i+1)],[v.getX(i+2),v.getZ(i+2)]);yield;}
      flat.dispose();source.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();m.put(g,b.roof,false,true);
    }
  }
  function* cream74(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);
    if(n[1]<.7||p[1]<458){yield* conservativeRear(b,f);return;}
    stoneBase(f,.48,'#898d81');a.cornice(f,b.height,b.trim);
    const positions=[-216.2,-213.4,-207.6,-205.8];
    for(const {u}of facePositions(f,positions)){opening(f,u,2.2,1.10,2.05,b.trim,'#d5d8ce','transom');grille(f,u,2.2,1.00,1.94,'#666c60');yield;}
    const u=uAt(f,-210.6);
    if(u!==null){
      f.panel(u,2.3,.075,1.50,3.8,.10,'#af9d78');glassDoor(f,u,.06,1.05,2.5,'#dddccd','#777b68');
      for(const sign of[-1,1])f.panel(u+sign*.92,2.6,.14,.26,4.7,.26,b.trim);
      band(f,b.height+.20,.38,.28,b.trim);
      register(b,f,u,1.2,.06,.2,1,[f.at(u,1.25),f.at(u,.45)],'normal','September2025 SV and identified2021 context: recessed exterior entry, low threshold estimated',thresholds);
    }
    for(const u of[.13,f.len-.13]){f.panel(u,2.55,.15,.28,5.1,.29,b.trim);f.panel(u,5.15,.20,.56,.17,.38,b.trim);}
    yield;
  }
  function* office76(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),trim=b.trim;
    if(n[1]<.8||p[1]<459){yield* conservativeRear(b,f);return;}
    stoneBase(f,.64,'#aaa58d');
    const xs=[-238.9,-237.35,-234.35,-232.80,-227.25,-225.70];
    for(const {u}of facePositions(f,xs)){
      opening(f,u,2.20,1.10,1.95,trim,'#d4d6ca');shutter(f,u,2.20,1.01,1.87);
      f.panel(u,.94,.17,1.13,.26,.15,trim,true);f.panel(u,.94,.25,.88,.12,.055,'#bda270',true);yield;
    }
    for(const x of[-240.5,-235.85,-224.8]){const u=uAt(f,x);if(u!==null)flutedPilaster(f,u,.66,3.72,.32,trim);}
    band(f,4.42,.22,.30,trim);dentils(f,4.31,trim,.37);band(f,4.76,.18,.42,trim);
    const panels=6;
    for(let i=0;i<panels;i++){const u=(i+.5)*f.len/panels;f.panel(u,5.03,.16,f.len/panels-.22,.46,.18,'#c5ad7a');f.panel(u,5.03,.28,f.len/panels-.58,.22,.10,trim,true);}
    for(let i=0;i<=panels;i++)f.panel(i*f.len/panels,5.04,.20,.23,.62,.26,trim);
    const u=uAt(f,-230.5);
    if(u!==null){
      const bottom=frontalEntry(b,f,u,1.47,3,.39,.36,'Commons September2021 and SV01 September2025: columned shuttered entry; short rise estimated','#9b9d8f',[],1.50);
      shutter(f,u,bottom+1.37,1.26,2.70);
      for(const sign of[-1,1]){const q=f.at(u+sign*.96,.60);a.column(q[0],q[1],f.y+bottom,2.93,.22,trim,true);}
      f.panel(u,bottom+3.04,.44,2.80,.25,.92,trim);
      a.pediment(f,u,bottom+3.22,3.15,.88,f.y,trim);
      shapePanel(f,u,bottom+3.32,2.60,.58,'#c0ad88',.54,false);
    }
    for(const x of[-240.25,-229.35,-224.95]){const u=uAt(f,x);if(u!==null)downpipe(f,u,5.35,'#a95a4b');}
    f.label('CONSULTANTA',f.len*.57,4.04,.17,'#524f43',.40);yield;
  }
  function* office76Roof(b:Building):Generator<void>{
    const y=ground(...b.anchor as XY)+.12,f=m.facade([-240.65,457.0],[-224.55,457.0],y);
    for(const x of[-233.4,-228.4]){
      const u=uAt(f,x);if(u===null)continue;
      f.panel(u,5.53,-.60,2.35,.52,2.05,'#d8d5c7');
      a.pediment(f,u,5.78,2.70,1.43,y,'#dad8ca');
      shapePanel(f,u,5.91,2.24,1.10,'#7e979a',.55,false);
      f.panel(u,6.45,.60,.065,1.02,.065,'#d0d6ce',true);
      for(const sign of[-1,1]){
        const p=f.at(u+sign*1.38,.44),q=f.at(u,.44);
        m.beam(new T.Vector3(p[0],y+5.76,p[1]),new T.Vector3(q[0],y+7.22,q[1]),.115,'#a75b4e');
      }
      yield;
    }
    for(const[x,z]of[[-239.0,447.0],[-231.0,444.7]])m.box(x,y+6.45,z,.60,1.15,.55,'#a76c54');yield;
  }
  function* office91(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);
    if(n[0]>.75&&p[0]>-220.7){
      // SV17 resolves two main levels and a low attic band on the east side.
      // The fence hides most ground openings, so no new door is asserted.
      stoneBase(f,.50,'#4f5e54');
      for(const yy of[3.35,7.16,9.18])band(f,yy,.20,.27,b.trim);
      for(const {x:z,u}of facePositions(f,[483.0,487.1,491.1,495.0],1)){
        opening(f,u,5.15,z===483.0?1.45:1.38,2.18,b.trim,'#e0e2d8','transom');
        if(z>484)opening(f,u,8.19,1.06,1.12,b.trim,'#e0e2d8');
        yield;
      }
      for(const {u}of facePositions(f,[484.7,489.1,493.1],1))ac(f,u,6.21);
      yield;return;
    }
    if(n[1]>-.8||p[1]>481){yield* conservativeRear(b,f);return;}
    stoneBase(f,.50,'#4f5e54');
    for(let yy=.77;yy<3.35;yy+=.43)f.panel(f.len/2,yy,.055,f.len,.024,.05,'#a9a995',true);
    const west=uAt(f,-228.9),east=uAt(f,-221.0),center=uAt(f,-225.1);
    for(const u of[west,east])if(u!==null)shutter(f,u,1.98,1.30,2.44);
    if(center!==null){
      f.panel(center,2.12,.10,3.50,1.67,.13,'#bcbcae');
      for(const sign of[-1,1]){f.panel(center+sign*1.79,2.12,.19,.12,1.90,.13,b.trim);f.panel(center,2.12+sign*.87,.19,3.70,.12,.13,b.trim);}
      f.panel(center,6.05,.13,4.48,5.05,.035,'#7f969c',false,1);
      for(let i=0;i<=4;i++)f.panel(center-2.24+i*1.12,6.05,.22,.075,5.13,.085,'#d1d5cb',true);
      for(let i=0;i<=4;i++)f.panel(center,3.53+i*1.27,.23,4.56,.085,.09,'#d1d5cb',true);
      for(const sign of[-1,1])f.panel(center+sign*2.37,6.10,.20,.17,5.30,.21,b.trim);
      shapePanel(f,center,b.height-.04,f.len+0.18,1.93,b.wall,.11);
      a.arch(f,center,b.height+.12,2.55,1.02,f.y,'#6d7e80',b.trim);
      f.panel(center,b.height+.48,.43,.075,.70,.06,'#c5ccc4');
      for(const yy of[3.40,8.75,9.03]){
        // Each side has the same observed shallow undulation, separate from the central glazing.
        for(const sign of[-1,1]){
          const start=center+sign*2.55,end=sign<0?.08:f.len-.08,points:T.Vector3[]=[];
          for(let i=0;i<=20;i++){const u=start+(end-start)*i/20,q=f.at(u,.24);points.push(new T.Vector3(q[0],f.y+yy+.12*Math.sin(i/20*Math.PI*2),q[1]));}
          m.put(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.07,4,false),b.trim,true);
        }
      }
    }
    band(f,3.36,.20,.28,b.trim);band(f,b.height-.21,.19,.34,b.trim);
    if(west!==null)f.label('PADURARU & ASOCIATII',west,3.15,.13,'#554c3c',.27);
    // Closed shutters do not prove doors or an exterior stair. Access to the
    // photographed eastern courtyard is represented by its open ground route.
    yield;
  }
  function roundedEntry93(b:Building,f:Facade,u:number){
    const rise=.54,steps=3,near=.12,far=1.22,half=1.02,run=.96;
    const topAt=(uu:number)=>surfaceGround(...f.at(uu,far+.45))+.035+rise;
    // The photographed platform is a thin deck on metal supports. Its underside
    // remains open; the lateral flights have three real, flared curved treads.
    const deck=new T.BoxGeometry(half*2,.09,far-near,4,1,1),dv=deck.attributes.position;
    for(let i=0;i<dv.count;i++){
      const uu=u+dv.getX(i),q=f.at(uu,(near+far)/2+dv.getZ(i));
      dv.setXYZ(i,q[0],topAt(uu)+dv.getY(i)-.045,q[1]);
    }
    deck.computeVertexNormals();m.put(deck,'#a4a79d',false,true);
    for(const du of[-half+.10,0,half-.10])for(const vv of[near+.10,far-.12]){
      const q=f.at(u+du,vv),floor=surfaceGround(...q)+.035,h=topAt(u+du)-floor-.09;
      m.box(q[0],floor+h/2,q[1],.045,h,.045,'#737d76',true,true);
    }
    function curvedTread(sign:number,k:number){
      const a=half+k*.32-.008,bb=half+(k+1)*.32+.008,front=far+.11*(k+1),points:XY[]=[];
      points.push([sign*a,near],[sign*bb,near]);
      for(let j=0;j<=8;j++){const t=j/8;points.push([sign*(bb-(bb-a)*t),front+.07*Math.sin(t*Math.PI)]);}
      const shape=new T.Shape();points.forEach((q,i)=>i?shape.lineTo(q[0],-q[1]):shape.moveTo(q[0],-q[1]));shape.closePath();
      const g=new T.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:false,steps:1,curveSegments:6});g.rotateX(-Math.PI/2);
      const v=g.attributes.position;
      for(let i=0;i<v.count;i++){
        const uu=u+v.getX(i),q=f.at(uu,v.getZ(i)),top=topAt(uu)-k*rise/steps-(k===0?.002:0);
        v.setXYZ(i,q[0],top+v.getY(i)-.10,q[1]);
      }
      g.computeVertexNormals();m.put(g,'#a4a69b',false,true);
    }
    const rail='#9ba79f';
    for(const du of[-half,0,half]){
      const q=f.at(u+du,far+.15);m.box(q[0],topAt(u+du)+.45,q[1],.033,.90,.033,rail,true,true);
    }
    for(const dh of[.17,.51,.88]){
      const p=f.at(u-half,far+.15),q=f.at(u+half,far+.15);
      physicalBeam(new T.Vector3(p[0],topAt(u-half)+dh,p[1]),new T.Vector3(q[0],topAt(u+half)+dh,q[1]),.018,rail);
    }
    for(const sign of[-1,1]){
      for(let k=0;k<steps;k++)curvedTread(sign,k);
      const p=f.at(u+sign*half,far+.15),q=f.at(u+sign*(half+run),far+.25);
      physicalBeam(new T.Vector3(p[0],topAt(u+sign*half)+.88,p[1]),new T.Vector3(q[0],topAt(u+sign*(half+run))-rise+.88,q[1]),.020,rail);
      register(b,f,u,far-near,rise,half*2,steps,
        [f.at(u+sign*(half+run+.72),.68),f.at(u+sign*(half-.20),.68),f.at(u,.68)],
        'lateral','SV18/19 September2025: metal supported platform with U rail and two curved lateral flights of three visible treads; metric dimensions estimated',entries,sign<0?'north-left-flight':'north-right-flight');
    }
    return topAt(u)-f.y;
  }
  function corinthianColumn(x:number,z:number,y:number,h:number,r:number,trim:string){
    a.column(x,z,y,h,r,trim,true);
    for(let i=0;i<12;i++){
      const t=i*Math.PI/6,dx=Math.cos(t)*r*.89,dz=Math.sin(t)*r*.89;
      m.box(x+dx,y+h*.48,z+dz,.025,h*.76,.025,'#c0bbaa',true);
      const g=new T.SphereGeometry(.09,6,4);g.scale(1,.68,.48);g.rotateY(-t);g.translate(x+dx*1.25,y+h-.24,z+dz*1.25);m.put(g,trim,true);
    }
  }
  function* heritage93(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),trim=b.trim;
    const north=n[1]<-.8&&p[1]<481,west=n[0]<-.8&&p[0]<-267.5;
    if(!north&&!west){yield* conservativeRear(b,f);return;}
    stoneBase(f,north?.94:.82,'#9b9987',!north);a.cornice(f,b.height,trim);dentils(f,b.height-.39,trim,.46);
    if(north){
      for(const {x,u}of facePositions(f,[-266.3,-263.65,-261.0,-255.8])){
        if(x===-261.0){
          f.panel(u,3.22,.15,1.27,2.50,.05,b.wall);
          for(const sign of[-1,1])f.panel(u+sign*.72,3.22,.18,.14,2.70,.20,trim);
          f.panel(u,4.55,.18,1.63,.13,.20,trim);lowRelief(f,u,4.80,1.70,trim);
        }else{
          classicWindow(f,u,3.22,1.27,2.50,trim);
          opening(f,u,3.22,1.27,2.50,trim,'#e4e6df','transom');
        }
        yield;
      }
      const plain=uAt(f,-252.95);if(plain!==null){opening(f,plain,3.12,1.30,2.45,trim,'#e4e6df','transom');f.panel(plain,1.50,.17,1.56,.46,.12,trim,true);f.panel(plain,1.50,.25,1.25,.25,.045,b.wall,true);}
      for(const u of[.20,uAt(f,-254.4)??f.len-.20])for(let yy=1.1;yy<5.65;yy+=.55)f.panel(u,yy,.17,.64,.29,.27,trim,true);
      const u=uAt(f,-258.3);
      if(u!==null){
        const bottom=roundedEntry93(b,f,u);glassDoor(f,u,bottom,1.45,3.25,'#e4e6df','#627376');
        lowRelief(f,u,bottom+3.40,1.85,trim);
        curvedCanopy(f,u,bottom+3.65,2.10,.80,'#414844','#3c443e');
        f.panel(u+1.04,bottom+2.05,.26,.27,.30,.03,'#9a8c5f',true);
      }
      f.label('93',f.len-.57,2.42,.22,'#ddd9c7',.41);yield;return;
    }
    for(const {x:z,u}of facePositions(f,[483.2,487.0,495.3,498.2,501.2,508.1,514.0],1)){
      classicWindow(f,u,3.15,1.30,2.50,trim,false,z===495.3||z===498.2);yield;
    }
    const main=uAt(f,491.8,1);
    if(main!==null){
      const bottom=frontalEntry(b,f,main,1.95,5,.74,.50,'Commons September2023: west Iorga portico, five stone risers and ornate double wood door; dimensions estimated','#98988b',[]);
      woodDoor(f,main,bottom,1.62,3.25);
      for(const sign of[-1,1]){const q=f.at(main+sign*1.10,.75);corinthianColumn(q[0],q[1],f.y+bottom,3.96,.27,trim);}
      f.panel(main,bottom+4.10,.47,2.96,.32,1.03,trim);
      shapePanel(f,main,bottom+4.23,3.60,.91,trim,.54);
      curvedHead(f,main,bottom+4.24,2.67,.69,trim);lowRelief(f,main,bottom+4.46,1.3,trim);
    }
    const secondary=uAt(f,506.5,1);
    if(secondary!==null){
      const bottom=frontalEntry(b,f,secondary,1.78,3,.39,.28,'Commons September2023 frame05: smaller southern west entry with three ochre tiled treads; dimensions estimated','#b28d65',[]);
      woodDoor(f,secondary,bottom,1.05,2.76);
      for(const sign of[-1,1])flutedPilaster(f,secondary+sign*.88,.31,3.93,.28,trim);
      f.label('ALDA',secondary-.91,2.0,.11,'#52665b');
    }
    const blind=uAt(f,511.0,1);if(blind!==null){f.panel(blind,3.16,.05,1.28,2.50,.04,b.wall);lowRelief(f,blind,4.68,1.70,trim);}
    yield;
  }
  function* iorga24(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2),trim=b.trim;
    if(n[0]>-.7||p[0]>-266.8){yield* conservativeRear(b,f);return;}
    stoneBase(f,.46,'#8a7066');a.cornice(f,b.height,trim);band(f,1.05,.25,.30,trim);band(f,4.91,.24,.26,trim);
    const windowZ=[407.2,410.2,413.3,416.3,425.8,429.1,432.3,435.6];
    for(const{x:z,u}of facePositions(f,windowZ,1)){
      if(z>=429)highArchedWindow(f,u,1.38,1.25,2.74,trim,'#715a47');
      else{opening(f,u,2.81,1.29,2.50,trim,'#705a47','transom');lowRelief(f,u,4.25,1.6,trim);}
      f.panel(u,.84,.17,1.68,.39,.18,trim,true);f.panel(u,.84,.27,1.35,.18,.06,b.wall,true);yield;
    }
    for(const{x:z,u}of facePositions(f,[405.4,408.6,411.7,414.8,417.9,420.3,423.3,427.6,430.8,434.0,437.6],1))flutedPilaster(f,u,.45,4.48,.37,trim);
    const u=uAt(f,421.80,1);
    if(u!==null){
      woodDoor(f,u,.02,1.44,3.10);shapePanel(f,u,3.10,1.83,1.12,b.wall,.12);curvedHead(f,u,3.14,1.88,.90,trim);lowRelief(f,u,3.53,1.60,trim);
      for(const sign of[-1,1])flutedPilaster(f,u+sign*1.10,.47,4.49,.42,trim);
      register(b,f,u,1.60,.02,.20,1,[f.at(u,1.3),f.at(u,.43)],'normal','Official DGACG door detail and Commons May2023: near-level exterior threshold, height/registration estimated',thresholds);
    }
    yield;
  }
  function* palace(b:Building,f:Facade):Generator<void>{
    const n=normal(f),p=f.at(f.len/2);
    // Deliberately avoid repeating windows on the many mapped narrow pier
    // returns. Those source vertices remain separate physical outline edges.
    if(f.len<2.0){yield;return;}
    if(n[1]>.7&&p[1]>452||n[0]<-.7&&p[0]<-413){yield;return;}
    stoneBase(f,.85,'#6d5c52');
    if(p[0]>-299&&(n[0]>.45||n[1]>.45)){
      f.panel(f.len/2,7.3,.12,f.len-.18,12.8,.08,'#c0a8a4');
      if(f.len>3.0)for(let u=1.3;u<f.len;u+=2.5)f.window(u,12.7,1.2,1.35,b.trim,'#81776a');
      for(const u of[.10,f.len-.10])f.panel(u,7.7,.25,.40,14.1,.31,b.trim);
      if(f.len>2.1)archCap(f,f.len/2,f.len-.40,12.65,1.63,b.height,.6);
    }else if(f.len>5.0){yield* a.windows(f,3,b.height,Math.max(2,Math.round(f.len/4.2)),2.2,b.trim,'#82877b');}
    band(f,b.height-.46,.9,.14,b.trim);yield;
  }
  function archCap(f:Facade,u:number,w:number,bottom:number,rise:number,top:number,depth:number,physical=false){
    const shape=new T.Shape();shape.moveTo(-w/2,top);shape.lineTo(w/2,top);shape.lineTo(w/2,bottom);
    for(let i=0;i<=24;i++){const t=i/24;shape.lineTo(w/2-w*t,bottom+rise*Math.sin(t*Math.PI));}shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:12}),p=f.at(u,.10-depth);
    g.rotateY(angle(f));g.translate(p[0],f.y,p[1]);m.put(g,'#d8d2bc',false,physical);
  }
  function* palaceExtra(b:Building):Generator<void>{
    const y=ground(...b.anchor as XY)+.12,h=b.height;
    const southZ=(x:number)=>{
      const zz:number[]=[];for(let k=1;k<b.p.length;k++){const p=b.p[k-1],q=b.p[k];if((p[0]<=x&&q[0]>x)||(q[0]<=x&&p[0]>x))zz.push(p[1]+(q[1]-p[1])*(x-p[0])/(q[0]-p[0]));}return Math.max(...zz);
    };
    for(const[x0,x1]of[[-417.7,-381.9],[-381.9,-297.5]]){
      const bays=Math.max(1,Math.round((x1-x0)/5.7)),pitch=(x1-x0)/bays;
      for(let i=0;i<bays;i++){
        const mid=x0+(i+.5)*pitch,z=Math.max(southZ(mid),...b.p.filter(q=>q[0]>=mid-pitch/2&&q[0]<=mid+pitch/2&&q[1]>447).map(q=>q[1]))+.035,f=m.facade([mid-pitch/2,z],[mid+pitch/2,z],y),u=pitch/2;
        stoneBase(f,.87,'#65594f');
        f.panel(u,7.50,.02,pitch-.62,13.2,.025,'#c0a7a5');
        // Narrow dark strips, opaque pale-pink panels and shallow arch soffits
        // are specific to the photographed southern elevation.
        for(const sign of[-1,1]){
          f.panel(u+sign*(pitch/2-.50),7.48,.04,.20,13.1,.04,'#766b62');
          f.panel(u+sign*(pitch/2-.26),7.66,.30,.50,13.7,.47,b.trim);
        }
        f.panel(u,13.55,.045,pitch-.80,.55,.025,'#978475');
        archCap(f,u,pitch-.50,12.65,1.63,h,.50);
        band(f,h-.32,.65,.28,b.trim);yield;
      }
    }
    // The eight western bays are real open recesses in the production body
    // partition. Their glazed rear wall does not add a hidden frontal collider.
    const westX=(z:number)=>{
      const xx:number[]=[];
      for(let k=1;k<b.p.length;k++){const p=b.p[k-1],q=b.p[k];if((p[1]<=z&&q[1]>z)||(q[1]<=z&&p[1]>z))xx.push(p[0]+(q[0]-p[0])*(z-p[1])/(q[1]-p[1]));}
      return Math.min(...xx);
    };
    const bays=8,pitch=43/bays;
    for(let i=0;i<bays;i++){
      const z0=411+i*pitch,z1=z0+pitch,x=westX((z0+z1)/2),f=m.facade([x,z0],[x,z1],y),u=pitch/2;
      const rear=-(-413.95-x);
      f.panel(u,7.1,rear,pitch-1.04,12.9,.05,'#9d7950',false,1);
      for(let k=0;k<=5;k++)f.panel(u,1.0+k*2.40,rear+.04,pitch-1.05,.06,.08,'#6e6753',true);
      for(const sign of[-1,1])f.panel(u+sign*(pitch*.25),7.1,rear+.05,.06,12.9,.08,'#716953',true);
      archCap(f,u,pitch-1.04,11.65,2.35,h,Math.max(2.0,-rear),true);
      yield;
    }
    // This principal entrance belongs to Maria Cebotari, on the complete
    // western body. It is not copied to the București/Iorga corner.
    const entry=m.facade([-418.6,423.0],[-418.6,437.0],y),u=6.8125,steps=8,rise=.865,middle=.80;
    const stepTop=(uu:number,v:number,offset:number)=>surfaceGround(...entry.at(uu,v))+offset;
    for(let k=0;k<steps;k++){
      const near=.05+k*.31+(k>=5?middle:0),far=near+.315,offset=.90-k*.108125;
      tread(entry,u,k<5?9.0:13.8,near,far,uu=>stepTop(uu,(near+far)/2,offset),'#86756b',true);yield;
    }
    // The official photograph resolves a broad lower sequence/podium and a
    // narrower upper sequence beneath the canopy. Their dimensions are estimates.
    tread(entry,u,13.8,1.60,2.405,uu=>stepTop(uu,2.0,.90-5*.108125),'#86756b',true);
    for(const sign of[-1,1])tread(entry,u+sign*5.7,2.4,.05,1.605,uu=>stepTop(uu,.8,.90),'#8e8174',true);
    // Elevated structure is clipped to the exterior of the official western
    // edge. It neither duplicates the portico floor nor claims street paving.
    function raised(p:XY[],top:(x:number,z:number)=>number,color:string){
      const shape=new T.Shape();p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
      const g=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);const v=g.attributes.position;
      for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getZ(i);v.setY(i,v.getY(i)>.5?top(x,z):surfaceGround(x,z)+.03);}
      g.computeVertexNormals();m.put(g,color,false,true);
    }
    function outsideLanding(outer:number,z0:number,z1:number){
      const zz=[z0,z1,...b.p.map(q=>q[1]).filter(z=>z>z0&&z<z1)].sort((a,b)=>a-b);
      for(let i=1;i<zz.length;i++){
        const lo=zz[i-1],hi=zz[i];if(hi-lo<.0001)continue;
        const xa=westX(lo+.00001),xb=westX(hi-.00001);
        raised([[outer,lo],[xa,lo],[xb,hi],[outer,hi]],(x,z)=>surfaceGround(x,z)+.90,'#8e8174');
      }
    }
    outsideLanding(-418.65,423.0,436.8);yield;
    register(b,entry,u,9.0,rise,middle,steps,[entry.at(u,4.05),entry.at(u,-4.15)],'normal','Institutional Palace main photo: western entrance has a broad lower flight/podium and a narrower upper flight below the canopy. Modeled3lower+5upper treads, widths13.8m/9.0m, intermediate landing0.80m and podium0.90m are photographic estimates; no corresponding stair is asserted on Iorga',entries,'west-main');
    const canopy=m.facade([-413.99,425.5],[-413.99,434.1],y);
    canopy.panel(canopy.len/2,4.55,1.10,8.6,.62,2.1,'#4b5149');
    for(const du of[-2.8,0,2.8])canopy.panel(canopy.len/2+du,4.55,2.17,2.54,.43,.025,'#b8a675');
    canopy.label('PALATUL REPUBLICII',canopy.len/2,4.55,.19,'#423f34',2.21);
    // The visible west ramp rises along the frontage, with actual sloping
    // collision and its open metal rails; a top landing connects to a bay.
    const rx0=-421.25,rx1=-419.82,z0=437.8,z1=445.85;
    const rampHeight=(x:number,z:number)=>surfaceGround(x,z)+.035+.865*T.MathUtils.clamp((z-z0)/(z1-z0),0,1);
    raised([[rx0,z0],[rx1,z0],[rx1,z1],[rx0,z1]],rampHeight,'#8d7d70');
    outsideLanding(rx0,z1,z1+1.20);yield;
    for(const side of[0,1]){
      const x=side?rx1-.035:rx0+.035,endZ=side?z1-.42:z1;
      // The inside rail ends before the turn into the portico. Its open
      // termination is estimated; no bar crosses the lateral landing exit.
      for(const dh of[.38,.90])physicalBeam(new T.Vector3(x,rampHeight(x,z0)+dh,z0),new T.Vector3(x,rampHeight(x,endZ)+dh,endZ),.022,'#9da79d');
      for(let z=z0;z<endZ-.06;z+=1.15)m.box(x,rampHeight(x,z)+.45,z,.035,.90,.035,'#9da79d',true,true);
      m.box(x,rampHeight(x,endZ)+.45,endZ,.035,.90,.035,'#9da79d',true,true);
    }
    const westMainEntry=entries.at(-1)!.sharedEntranceId;
    register(b,entry,22.85,rx1-rx0,rise,1.2,1,[[(rx0+rx1)/2,z0-.65],[(rx0+rx1)/2,z1+.56],[-414.75,z1+.56],[-414.75,429.8125]],'ramp','Institutional Palace main photo: lateral ramp at western Maria Cebotari entrance, with lower end beside and south of the broad staircase and upper end toward the southern corner. Visible rails and podium; widths, slope and exact alignment estimated. Independent source review corrects the earlier overlapping stair/ramp registration',entries,'west-ramp');
    entries.at(-1)!.sharedEntranceId=westMainEntry;
    for(const[x,z]of[[-300.8,447.5],[-311.8,448.0],[-324.5,449.5]]){
      m.box(x,y+h+1.2,z,.055,2.4,.055,'#9fa79d');
      for(const dx of[-.40,.40])m.box(x+dx,y+h+1.7,z,.20,1.35,.13,'#c4c9bc');yield;
    }
  }
  function* iorga21(b:Building,f:Facade):Generator<void>{
    if(b.style==='iorga21Portico'){yield;return;}
    const n=normal(f),p=f.at(f.len/2),trim=b.trim;
    if(n[0]<.55||p[0]<-295.0){yield* conservativeRear(b,f);return;}
    stoneBase(f,.84,'#8d675b');
    for(let yy=1.0;yy<b.height;yy+=.52)f.panel(f.len/2,yy,.05,f.len,.014,.03,'#bbb2a1',true);
    if(f.len>2.0){
      const u=f.len/2,w=Math.min(3.80,f.len-.55);
      for(const[center,hh]of[[3.00,3.78],[7.45,3.08]]){
        f.panel(u,center,.12,w,hh,.035,'#777b6d',false,1);
        for(let k=0;k<=3;k++)f.panel(u-w/2+k*w/3,center,.19,.055,hh+.08,.07,'#605c50',true);
        for(const yy of[center-hh/2,center,center+hh/2])f.panel(u,yy,.20,w,.06,.075,'#645f52',true);
      }
      band(f,5.45,.22,.22,trim);
    }
    band(f,b.height-.15,.30,.25,trim);yield;
  }
  function ministryStair(b:Building,f:Facade,u:number){
    const rise=.96,steps=8,near=.12,landing=.66,middle=.70,run=steps*.29,total=near+landing+middle+run;
    const topAt=(uu:number)=>surfaceGround(...f.at(uu,total+.45))+.035+rise;
    tread(f,u,2.45,near,near+landing,topAt,'#515a54',true);
    for(let k=0;k<steps;k++){
      const vv=near+landing+k*.29+(k>=4?middle:0),w=k<4?2.45:3.85;
      tread(f,u,w,vv,vv+.295,uu=>topAt(uu)-k*rise/steps,'#4b5650',true);
    }
    tread(f,u,3.85,near+landing+4*.29,near+landing+4*.29+middle,uu=>topAt(uu)-4*rise/steps,'#515a54',true);
    register(b,f,u,2.45,rise,landing,steps,[f.at(u,total+.7),f.at(u,.45)],'normal','Official10October2026 Ministry event photo: black stone two-flight staircase and intermediate landing; approximately7–9risers, eight modeled at estimated0.96m rise',entries,'ministry');
    return topAt(u)-f.y;
  }
  function* iorga21Extra(b:Building):Generator<void>{
    const y=ground(...b.anchor as XY)+.12,trim=b.trim;
    // The black canopy and entry are the southern identified east-front bay.
    const ministry=m.facade([-293.596,429.4],[-293.596,424.5],y),u=2.4;
    const bottom=ministryStair(b,ministry,u);
    glassDoor(ministry,u,bottom,1.70,3.15,'#615c4c','#576666');
    for(const du of[-1.67,1.67])opening(ministry,u+du,bottom+1.66,1.31,3.25,trim,'#615b4e','transom');
    ministry.panel(u,bottom+3.72,1.25,4.85,.66,2.52,'#303a36');
    ministry.panel(u,bottom+3.36,1.25,4.70,.06,2.38,'#8a7b56');
    ministry.label('MINISTERUL CULTURII',u,bottom+3.73,.21,'#dedbd0',2.54);
    ministry.label('GUVERNUL REPUBLICII MOLDOVA',u,bottom+3.99,.105,'#d6d4c8',2.54);
    for(const sign of[-1,1]){
      const q=ministry.at(u+sign*1.68,.71),pot=new T.CylinderGeometry(.20,.14,.28,10);pot.translate(q[0],y+bottom+.14,q[1]);m.put(pot,'#af8052',false,true);
      const shrub=new T.IcosahedronGeometry(.25,1);shrub.scale(1,.65,1);shrub.translate(q[0],y+bottom+.38,q[1]);m.put(shrub,'#678153');
      for(const dx of[-.13,.05,.15]){const flower=new T.IcosahedronGeometry(.09,0);flower.translate(q[0]+dx,y+bottom+.50,q[1]);m.put(flower,'#a94d45');}
    }
    yield;
    // The separate white side door is legible beside the Philharmonic plaques.
    const side=m.facade([-293.67,411.57],[-293.67,409.44],y),su=1.07;
    const sideBottom=frontalEntry(b,side,su,1.42,5,.65,.43,'Official10October2026 Philharmonic access photo: white side door and its own dark stair, distinct from central portico; exact registration±2–3m and dimensions estimated','#505a52',[]);
    glassDoor(side,su,sideBottom,1.06,2.86,'#dce0d8','#737d73');
    side.panel(su,sideBottom+2.40,.23,.48,.42,.03,'#3e4d46');
    side.panel(su-1.6,3.43,.24,2.30,.42,.035,'#526183');side.label('FILARMONICA NATIONALA',su-1.6,3.43,.12,'#e1dfd6',.27);
    for(const[du,color]of[[.63,'#b49f67'],[.06,'#6d9a9b']]as[number,string][])side.panel(su+du,2.96,.26,.42,.57,.035,color);
    yield;
    // Central double door under the open oval canopy. Its two columns are the
    // only ground-level solids in the official projection; no opaque room fills it.
    const oval=m.facade([-293.79,409.35],[-293.79,405.55],y),ou=1.95;
    const ovalBottom=frontalEntry(b,oval,ou,2.32,6,.78,.42,'DGACG exterior photograph corroborated by10October2026 context: central double door under oval canopy with two columns and dark steps; metric position/height estimated','#4d5951',[]);
    oval.panel(ou,ovalBottom+1.81,.11,3.55,3.62,.035,'#3f514d',false,1);
    woodDoor(oval,ou,ovalBottom,1.55,2.88);
    for(const du of[-1.72,1.72])oval.panel(ou+du,ovalBottom+1.81,.20,.07,3.70,.08,'#5c6256');
    oval.panel(ou,ovalBottom+3.33,.22,3.55,.07,.08,'#5c6256');
    for(const z of[406.04,408.65]){
      const x=-290.65,base=surfaceGround(x,z)+.035;a.column(x,z,base,3.47,.19,'#8e968a',true);
    }
    const top=m.facade([-293.80,412.0],[-293.80,402.8],y);
    top.panel(4.6,7.34,.11,3.2,2.15,.03,'#69766c',false,1);
    for(const du of[-1.2,-.4,.4,1.2])top.panel(4.6+du,7.34,.17,.05,2.20,.06,'#606653',true);
    shapePanel(top,4.6,9.35,8.3,1.03,b.wall,.18);curvedHead(top,4.6,9.35,8.4,.82,trim);
    yield;
  }
  function* detail(b:Building,f:Facade):Generator<void>{
    if(b.style==='villa72'||b.style==='villa72Terrace')yield* villa72(b,f);
    else if(b.style==='cream74')yield* cream74(b,f);
    else if(b.style==='office76')yield* office76(b,f);
    else if(b.style==='office91')yield* office91(b,f);
    else if(b.style==='heritage93')yield* heritage93(b,f);
    else if(b.style==='iorga24')yield* iorga24(b,f);
    else if(b.style==='iorga21'||b.style==='iorga21Portico')yield* iorga21(b,f);
    else if(b.style==='palaceRepublic')yield* palace(b,f);
    else yield* conservativeRear(b,f);
  }
  function* office91Roof(b:Building):Generator<void>{
    // The three east-slope skylights are visible in SV17. Their registered
    // metre positions are estimates on the same production roof surface.
    const y=ground(...b.anchor as XY)+.12,xs=b.p.map(q=>q[0]),zs=b.p.map(q=>q[1]);
    const run=Math.max(2,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2);
    const at=(x:number,z:number)=>{
      let d=Infinity;for(const r of[b.p,...b.holes])for(let i=1;i<r.length;i++)d=Math.min(d,pointSegmentDistance([x,z],r[i-1] as XY,r[i] as XY));
      return y+b.height+.15+b.roofRise*Math.min(1,d/run);
    };
    for(const z of[484.0,488.4,492.8]){
      const x=-222.1,vertices:number[]=[],corners=[[-.57,-.52],[.57,-.52],[.57,.52],[-.57,.52]];
      const pts=corners.map(([dx,dz])=>[x+dx,at(x+dx,z+dz)+.04,z+dz]);
      vertices.push(...pts[0],...pts[2],...pts[1],...pts[0],...pts[3],...pts[2]);
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();m.put(g,'#698184',false,false);
      for(let i=0;i<4;i++)m.beam(new T.Vector3(...pts[i]),new T.Vector3(...pts[(i+1)%4]),.035,'#a0a498');yield;
    }
  }
  function* detailExtra(b:Building):Generator<void>{
    if(b.style==='villa72'){yield* villa72Front(b);yield* villa72Roof(b);}
    if(b.style==='office76')yield* office76Roof(b);
    if(b.style==='office91')yield* office91Roof(b);
    if(b.style==='palaceRepublic')yield* palaceExtra(b);
    if(b.style==='iorga21')yield* iorga21Extra(b);
  }
  const cloneRoutes=(routes:BucurestiBu11EntryRoute[])=>routes.map(r=>({...r,points:r.points.map(p=>[...p] as XY),route:r.route.map(p=>[...p] as XY)}));
  return {a,normal,angle,handles,detail,detailExtra,customRoof:(b:Building)=>b.style==='villa72',excavations,setActivationReady:(fn:()=>boolean)=>{activationReady=fn;},entryRoutes:()=>cloneRoutes(entries),thresholdRoutes:()=>cloneRoutes(thresholds),get entrances(){return cloneRoutes([...entries,...thresholds]);}};
}
