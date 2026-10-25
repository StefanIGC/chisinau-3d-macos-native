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
export type BucurestiBu10EntryRoute = {
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

/** Original meshes for București, Alexandr Pușkin–Mitropolit Gavriil Bănulescu-Bodoni. The official polygons
 * supply the plan, photographs supply the visible architectural character.
 * Heights, opening positions and stair dimensions remain explicit estimates. */
export function bucurestiBu10Architecture(m: Mesh, ground: (x: number, z: number) => number,
  surfaceGround: (x: number, z: number) => number = ground) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const entries: BucurestiBu10EntryRoute[] = [];
  const thresholds: BucurestiBu10EntryRoute[] = [];
  let activationReady=()=>false;
  const excavations: GroundExcavation[] = [];
  const keys = new Set<string>();
  const owned = new Set<string>(['unfinishedHotel66','culture68','culture68Core','culture68Podium','historic75','historic77','modern731','modern731Core','modern731Glass','whiteShopEastOf83','yellow83','yellow83West','bay81','dental79East','dental79West','pink81','low87','bodoniSE','bodoniSERear','bodoniSW']);

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
  function* unfinishedHotel(b:Building,f:Facade):Generator<void>{
    if(f.len<2){yield;return;}
    const base=4.8,attic=16.8,pitch=3.0,concrete='#b6b8ac',brick='#9d624a',voidColor='#282a29';
    band(f,base/2,base,.09,'#a7aaa0');band(f,(base+attic)/2,attic-base,.065,brick);
    band(f,(attic+b.height)/2,b.height-attic,.10,'#d1d0c2');
    const bays=Math.max(2,Math.round(f.len/3.65)),bw=f.len/bays;
    for(const yy of[base,base+pitch,base+pitch*2,base+pitch*3,attic,b.height-.12])band(f,yy,.22,.16,concrete);
    for(let i=0;i<bays;i++){
      const u=(i+.5)*bw,w=Math.min(1.65,bw*.50);
      // Unfilled openings are opaque dark voids, without invented glazing.
      for(let row=0;row<4;row++){
        f.panel(u,base+row*pitch+1.65,.115,w,1.96,.035,voidColor);
        f.panel(u,base+row*pitch+.65,.15,w+.15,.10,.18,'#a89b85',true);
        if(i%3===0)f.panel(u-bw*.44,base+(row+.5)*pitch,.10,.23,pitch,.16,concrete);
      }
      if(i%2===1||bays<4)a.arch(f,u,attic+.30,Math.min(bw*.75,2.8),2.42,f.y,voidColor,'#d5d6c9',0);
      else f.panel(u,attic+1.48,.14,w*.77,2.10,.04,voidColor);
      if(i%2===0)a.arch(f,u,.52,Math.min(bw*.73,2.9),3.25,f.y,voidColor,'#aeb2a7',0);
      else f.panel(u,2.20,.14,w,3.25,.04,voidColor);
      yield;
    }
    // One installed lower window is visible in the west-side 2026 photograph.
    const n=normal(f);if(n[0]<-.85&&f.len>20){
      const u=f.len*.14;opening(f,u,base+1.65,1.65,1.96,'#b8bfb7','#d6dcd3','single','#687676');
    }
    for(const u of[.11,f.len-.11])f.panel(u,b.height/2,.14,.24,b.height,.24,concrete);
    yield;
  }
  function* culturalFacade(b:Building,f:Facade):Generator<void>{
    if(f.len<1.2){yield;return;}
    const base=6.7,top=b.height-1.8,rows=5,pitch=(top-base)/rows;
    const n=normal(f),mid=f.at(f.len/2),entry=mid[1]>437&&f.len>4&&f.len<7&&n[1]>.7;
    const stone='#c4c1ad',frame='#b8b091',metal='#a6a18b',glass='#53626c';
    band(f,(base+top)/2,top-base,.075,metal);
    band(f,b.height-.85,1.7,.17,stone);
    const bays=Math.max(1,Math.round(f.len/2.85)),bw=f.len/bays;
    for(let i=0;i<bays;i++){
      const u=(i+.5)*bw,w=bw*.73;
      for(let row=0;row<rows;row++){
        const cy=base+row*pitch+pitch*.65;
        f.panel(u,cy,.115,w,1.38,.03,glass,false,1);
        for(const sign of[-1,1])f.panel(u+sign*w/2,cy,.17,.055,1.46,.065,frame,true);
        f.panel(u,cy,.18,.055,1.39,.065,frame,true);
        f.panel(u,cy+.72,.16,w+.10,.06,.075,frame,true);
        f.panel(u,cy-.71,.16,w+.10,.055,.075,frame,true);
        // Photographs show a mixture of dark lowered blinds and open glazing.
        if((i+row*2)%4!==0)f.panel(u,cy+.29,.20,w-.10,.74,.02,'#4c4d49',false);
        const sp=base+row*pitch+.36;
        f.panel(u,sp,.12,w,.83,.035,(i+row)%3===0?'#8c938d':'#b0a78d');
        for(let k=-2;k<=2;k++)f.panel(u+k*w/6,sp,.15,.024,.83,.025,'#c5beaa',true);
        if((i*3+row)%11===3)ac(f,u+w*.34,cy-.94);
      }
      f.panel(u-bw*.47,(base+top)/2,.16,.12,top-base,.11,frame);
      if(!entry){
        const yy=4.55;opening(f,u,yy,Math.min(1.35,bw*.55),1.92,stone,'#d3d6c9','single','#637571');
        if(f.len>8){f.panel(u,1.45,.09,bw-.35,2.55,.045,'#8e9588');for(let y=.25;y<2.7;y+=.18)f.panel(u,y,.13,bw-.35,.023,.035,'#676f65',true);}
      }
      yield;
    }
    if(!entry){
      for(const yy of[2.96,6.62])band(f,yy,.15,.20,stone);
      for(const u of[.18,f.len-.18])f.panel(u,base/2,.12,.36,base,.18,stone);
    }
    yield;
  }
  function* historic75(b:Building,f:Facade):Generator<void>{
    const n=normal(f);if(n[1]>-.65||f.at(f.len/2)[1]>480){yield* conservativeRear(b,f);return;}
    const stone='#c0b6a1',rough='#969584',dark='#4e3a31';
    band(f,.43,.86,.15,rough);a.cornice(f,b.height,stone);
    for(const yy of[b.height-.68,b.height-.34])band(f,yy,.16,.24,stone);
    const doorU=uAt(f,80.96),windowXs=[77.5,83.95];
    for(const{x,u}of facePositions(f,windowXs)){
      opening(f,u,2.66,1.72,2.31,stone,dark,'wood','#465c5a');
      f.panel(u,4.08,.23,2.28,.37,.20,stone);
      for(const sign of[-1,1]){f.panel(u+sign*.90,4.07,.31,.20,.50,.11,'#b8ad98');}
      f.panel(u,1.23,.20,1.83,.27,.16,rough);yield;
    }
    if(doorU!==null){
      const bottom=frontalEntry(b,f,doorU,2.15,4,.64,.34,'SV Malina, iulie2025,06–08: trei trepte exterioare și prag la București75; cote estimate','#aaa18b',[]);
      a.arch(f,doorU,bottom,1.65,3.06,f.y,'#382d29',stone,0);woodDoor(f,doorU,bottom,1.59,2.38);
      f.panel(doorU,bottom+2.56,.42,1.42,.07,.07,dark);
    }
    for(const u of[.20,f.len-.20]){
      f.panel(u,2.55,.17,.35,3.7,.22,stone);
      for(let yy=.98;yy<4.4;yy+=.26)f.panel(u,yy,.30,.19,.18,.055,rough,true);
    }
    for(let u=.45;u<f.len;u+=.44){a.arch(f,u,b.height-.72,.19,.40,f.y,'#969384',stone,0);}
    // The observed pierced stone parapet is separate from the pitched roof.
    for(let u=.15;u<f.len;u+=.53)f.panel(u,b.height+.20,.16,.16,.49,.22,stone);
    band(f,b.height+.49,.15,.34,stone);
    if(doorU!==null){
      for(const side of[-1,1]){
        const u=doorU+side*1.26;
        f.panel(u,b.height+.17,.15,.44,.96,.25,stone);
        // Diamond inlays stand just clear of the pale pier face.
        const q=f.at(u,.30),diamond=new T.BoxGeometry(.28,.28,.035);diamond.rotateZ(Math.PI/4);diamond.rotateY(angle(f));diamond.translate(q[0],f.y+b.height+.12,q[1]);m.put(diamond,'#428671',true);
      }
      downpipe(f,doorU+1.12,b.height-.18,'#b4b7aa');
    }
    const plaque=uAt(f,84.95);if(plaque!==null)f.label('75',plaque,2.63,.17,'#e4ded0',.45);
    yield;
  }
  function* historic77(b:Building,f:Facade):Generator<void>{
    if(normal(f)[1]>-.65||f.at(f.len/2)[1]>480){yield* conservativeRear(b,f);return;}
    const trim='#d3d0c3';band(f,.42,.84,.12,'#74776e');a.cornice(f,b.height,trim);
    for(const {u}of facePositions(f,[68.7,71.15,73.6])){
      opening(f,u,2.42,1.16,1.94,trim,'#d1d7cf','transom','#627574');
      curvedHead(f,u,3.78,1.80,.44,trim);f.panel(u,3.61,.22,1.68,.15,.27,trim);
      for(const sign of[-1,1])f.panel(u+sign*.87,2.45,.13,.12,3.0,.13,trim);
      yield;
    }
    const u=uAt(f,66.15);
    if(u!==null){
      const bottom=frontalEntry(b,f,u,1.48,1,.16,.32,'Pretura11septembrie2026,03: intrare vestică București77 sub marchiză; înălțimea pragului este estimată','#99978a',[]);
      glassDoor(f,u,bottom,1.08,2.5,'#444b44','#3c4c4b');curvedCanopy(f,u,bottom+2.63,2.3,.95,'#555e54','#454f46');
      curvedHead(f,u,b.height+.08,1.7,.65,trim);
      f.panel(u,b.height+.20,.10,1.7,.3,.15,trim);
      f.label('77',u+1.15,3.07,.25,'#ebead8',.38);
    }
    a.pediment(f,f.len*.58,b.height+.02,f.len*.76,1.68,f.y,'#c6c8bd');
    for(let u=.15;u<f.len;u+=.32)f.panel(u,b.height-.28,.28,.14,.16,.23,trim,true);
    for(const u of[.11,f.len-.11])downpipe(f,u,b.height,'#947966');yield;
  }
  function* culturePodium(b:Building,f:Facade):Generator<void>{
    const n=normal(f),mid=f.at(f.len/2);
    if(n[1]<-.8&&mid[1]<429.1){yield;return;}
    const entry=mid[1]>437&&f.len>4&&f.len<7&&n[1]>.7;
    const pink='#c2afa0',stone='#c8c1ac';
    band(f,5.91,2.58,.10,pink);band(f,7.13,.14,.25,'#96998c');
    for(let u=.25;u<f.len;u+=.52)f.panel(u,5.91,.13,.022,2.55,.035,'#918f80',true);
    if(!entry){
      band(f,2.35,4.7,.08,stone);
      for(let y=.35;y<4.6;y+=.48)f.panel(f.len/2,y,.09,f.len,.018,.028,'#a5a28f',true);
      if(f.len>5&&mid[0]<34){const u=f.len*.57;opening(f,u,2.25,Math.min(2.8,f.len*.54),1.80,stone,'#615d4d','transom');}
      yield;return;
    }
    const u=f.len/2,steps=10,rise=1.70,landing=.82,run=steps*.29+1.05,far=landing+run;
    const foot=f.at(u,far+.45),top=surfaceGround(...foot)+.035+rise;
    for(let k=steps-1;k>=0;k--){
      const reach=landing+k*.29+(k>=5?1.05:0),width=5.65+k*.48;
      const points:XY[]=[f.at(u-2.23,-1.78),f.at(u+2.23,-1.78),f.at(u+2.83,.15),f.at(u+width/2,reach-.28),f.at(u+width/2-.58,reach+.05),f.at(u-width/2+.58,reach+.05),f.at(u-width/2,reach-.28),f.at(u-2.83,.15)];
      const base=Math.min(...points.map(p=>ground(...p)))-.22,yy=top-k*rise/steps;
      m.solid(points,yy-base,base,'#d4d6ca',true);yield;
    }
    // The extra run beginning at tread5 forms the photographed wide landing.
    const doorFace=m.facade(f.at(0,-2.02),f.at(f.len,-2.02),f.y),bottom=top-f.y;
    glassDoor(doorFace,u,bottom,1.79,2.36,'#6e7368','#3f504e');
    for(const sign of[-1,1]){
      const p=f.at(u+sign*2.43,.06);m.box(p[0],top+1.54,p[1],.47,3.08,.56,'#555e58',false,true,angle(f));
      const wall=[f.at(u+sign*4.45,.20),f.at(u+sign*4.88,.20),f.at(u+sign*4.88,3.4),f.at(u+sign*4.45,3.4)];
      const base=ground(...f.at(u+sign*4.65,3.4))+.035;m.solid(wall,1.05,base,pink,true);m.solid(wall,.07,base+1.05,'#b4b3a5',false);
    }
    f.panel(u,4.38,.15,3.1,.60,.07,'#ddded4');f.label('DIRECȚIA GENERALĂ',u,4.49,.115,'#485b55',.20);f.label('CULTURĂ',u,4.25,.15,'#485b55',.20);
    // The two photographed flagstaffs are above the exterior approach.
    for(const sign of[-1,1]){
      const p=f.at(u+sign*2.0,.15),q=f.at(u+sign*2.25,1.20);
      m.beam(new T.Vector3(p[0],f.y+4.52,p[1]),new T.Vector3(q[0],f.y+5.1,q[1]),.017,'#777f70');
      for(let j=0;j<3;j++){const p=f.at(u+sign*2.25+(j-1)*.19,1.21);m.box(p[0],f.y+4.64,p[1],.19,.76,.026,sign<0?['#3f638f','#c4b44f','#ab5748'][j]:'#c6d0c9',true,false,angle(f));}
    }
    register(b,f,u,5.65,rise,landing,steps,[f.at(u,far+.72),f.at(u,-1.55)],'normal','Pretura11septembrie2026,11/15: două porțiuni de scară albă în evantai facetat și palier; numărul/cotele exacte și recesul sunt estimate');
    entries[entries.length-1].run=run;yield;
  }
  function* whiteShopEastOf83(b:Building,f:Facade):Generator<void>{
    if(normal(f)[1]>-.6||f.at(f.len/2)[1]>480){yield* conservativeRear(b,f);return;}
    band(f,.25,.5,.11,'#805548');a.cornice(f,b.height,'#deded5');
    for(let yy=.64;yy<b.height-.34;yy+=.28)f.panel(f.len/2,yy,.08,f.len,.026,.11,'#b7bab3',true);
    const display=uAt(f,-14.08);
    if(display!==null){
      opening(f,display,2.09,3.28,2.39,'#dfdfd5','#3d443f','single','#829493');
      f.panel(display-.98,2.09,.27,.055,2.4,.07,'#3e4843');
    }
    const u=uAt(f,-17.68);
    if(u!==null){
      const bottom=frontalEntry(b,f,u,2.62,3,.48,.54,'Street View Malina iulie2025,12/14: trei trepte placate roșu-brun la vitrina albă din estul83; cote estimate','#986151',[]);
      glassDoor(f,u,bottom,2.02,2.53,'#3b4440','#354b4b');
      f.panel(u,bottom+2.18,.23,2.02,.06,.07,'#2e3733');
      // The photograph shows two narrow wheeled tracks beside the steps,
      // never a full accessible ramp or a replacement for the stair collider.
      for(const shift of[0,.43]){
        const p=f.at(u-1.05-shift,.52),q=f.at(u-2.75-shift,1.72),y0=surfaceGround(...q)+.035;
        const delta=new T.Vector3(q[0]-p[0],-.48,q[1]-p[1]),g=new T.BoxGeometry(.10,.035,delta.length());
        g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize()));g.translate((p[0]+q[0])/2,y0+.24,(p[1]+q[1])/2);m.put(g,'#474b45',false,true);
      }
    }
    const sign=uAt(f,-19.63);
    if(sign!==null){const p=f.at(sign,.22),g=new T.CircleGeometry(.52,24);g.rotateY(angle(f));g.translate(p[0],f.y+3.07,p[1]);m.put(g,'#343e3d');const ring=new T.TorusGeometry(.50,.018,4,24);ring.rotateY(angle(f));ring.translate(p[0],f.y+3.07,p[1]);m.put(ring,'#d0d7d0',true);f.label('IRINA',sign,3.21,.11,'#e2e4db',.24);f.label('PAVLOVSKAYA',sign,3.04,.075,'#e2e4db',.24);}
    yield;
  }
  function carvedDoor83(f:Facade,u:number,bottom:number){
    const w=1.52,h=3.05,wood='#69412b',light='#926342';
    f.panel(u,bottom+h/2,.19,w,h,.12,wood);
    for(const sign of[-1,1]){
      const uu=u+sign*w*.245;
      opening(f,uu,bottom+2.03,.37,.98,light,wood,'single','#394837');
      curvedHead(f,uu,bottom+2.58,.54,.19,light);
      for(const yy of[.37,.84]){
        f.panel(uu,bottom+yy,.28,.58,.39,.075,light,true);
        f.panel(uu,bottom+yy,.33,.44,.27,.035,wood,true);
        const pp=f.at(uu,.37),g=new T.SphereGeometry(.07,8,5);g.scale(1,1,.45);g.rotateY(angle(f));g.translate(pp[0],f.y+bottom+yy,pp[1]);m.put(g,light,true);
      }
      f.panel(uu,bottom+1.27,.29,.65,.15,.11,light,true);
    }
    for(const du of[-w/2,0,w/2])f.panel(u+du,bottom+h/2,.30,.075,h,.11,light,true);
    for(const yy of[0,1.12,2.83,3.04])f.panel(u,bottom+yy,.30,w,.11,.11,light,true);
    for(let du=-.58;du<=.58;du+=.14){const pp=f.at(u+du,.38),g=new T.SphereGeometry(.038,6,4);g.translate(pp[0],f.y+bottom+2.88,pp[1]);m.put(g,light,true);}
    f.panel(u,bottom+3.36,.15,1.58,.49,.06,'#4c5848',false,1);
    f.panel(u,bottom+3.36,.23,.06,.49,.06,light);
  }
  function roundedEntry83(b:Building,f:Facade,u:number,ramp=true,color='#a9ab9a'){
    const rise=.48,landing=.40,steps=3,far=1.45;
    const top=surfaceGround(...f.at(u,far+.35))+.035+rise;
    // Rounded photographed stone treads, with a separate narrow side incline.
    for(let k=0;k<steps;k++){
      const depth=landing+(k+1)*.33,width=2.06+k*.18,round=.30;
      const p:XY[]=[f.at(u-width/2,.10),f.at(u+width/2,.10),f.at(u+width/2,depth-round)];
      for(let i=0;i<=5;i++){const t=i/5*Math.PI/2;p.push(f.at(u+width/2-round+round*Math.cos(t),depth-round+round*Math.sin(t)));}
      p.push(f.at(u-width/2+round,depth));
      for(let i=0;i<=5;i++){const t=Math.PI/2+i/5*Math.PI/2;p.push(f.at(u-width/2+round+round*Math.cos(t),depth-round+round*Math.sin(t)));}
      const low=surfaceGround(...f.at(u,depth))-.06;m.solid(p,top-k*rise/steps-low,low,color,true);
    }
    if(!ramp){register(b,f,u,2.06,rise,landing,steps,[f.at(u,far+.7),f.at(u,.50)],'normal','Malina July2025,34: three broad stone/tiled treads with rounded corners at western83 entry; metric dimensions estimated');return top-f.y;}
    const rampPath=[f.at(u-3.10,1.70),f.at(u-2.78,.65),f.at(u-.78,.50)],half=.35;
    const lengths=[0];for(let i=1;i<rampPath.length;i++)lengths.push(lengths[i-1]+Math.hypot(rampPath[i][0]-rampPath[i-1][0],rampPath[i][1]-rampPath[i-1][1]));
    const total=lengths.at(-1)!,bottom=surfaceGround(...rampPath[0])+.035,normals:XY[]=[];
    for(let i=1;i<rampPath.length;i++){const p=rampPath[i-1],q=rampPath[i],len=lengths[i]-lengths[i-1];normals.push([-(q[1]-p[1])/len,(q[0]-p[0])/len]);}
    const sections=rampPath.map((p,i)=>{
      const before=normals[Math.max(0,i-1)],after=normals[Math.min(normals.length-1,i)],sum:XY=[before[0]+after[0],before[1]+after[1]],len=Math.hypot(...sum),nx=sum[0]/len,nz=sum[1]/len;
      const y=bottom+(top-bottom)*lengths[i]/total;
      return[[p[0]+nx*half,y,p[1]+nz*half],[p[0]-nx*half,y,p[1]-nz*half]];
    });
    const verts:number[]=[];
    for(let i=1;i<sections.length;i++){
      const[aa,bb]=sections[i-1],[dd,cc]=sections[i];verts.push(...aa,...cc,...bb,...aa,...dd,...cc);
      for(const[p,q]of[[aa,dd],[cc,bb]]){const py=surfaceGround(p[0],p[2])+.02,qy=surfaceGround(q[0],q[2])+.02;verts.push(...p,q[0],qy,q[2],...q,...p,p[0],py,p[2],q[0],qy,q[2]);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();m.put(g,'#b1b2a1',false,true);
    register(b,f,u,2.06,rise,landing,steps,[f.at(u,far+.7),f.at(u,.50)],'normal','Malina July2025,33: three rounded stone treads and upper landing at numbered83; dimensions estimated');
    register(b,f,u,.70,rise,landing,0,[...rampPath,f.at(u,.50)],'ramp','Malina July2025,32/33: narrow lateral concrete incline at east side of stair83. Width/slope estimated; no claim of accessibility compliance',entries,'east-incline');
    return top-f.y;
  }
  function* yellow83(b:Building,f:Facade):Generator<void>{
    if(normal(f)[1]>-.65||f.at(f.len/2)[1]>480.1){yield* conservativeRear(b,f);return;}
    const trim='#e2dfcb';band(f,.36,.72,.14,'#8a8b77');a.cornice(f,b.height,trim);
    for(let yy=.95;yy<5.2;yy+=.47)f.panel(f.len/2,yy,.025,f.len,.016,.04,'#aeb194',true);
    for(const{x,u}of facePositions(f,[-22.15,-24.15,-26.1,-30.32,-32.55])){
      opening(f,u,2.88,1.13,2.23,trim,'#d0d4c8','transom','#829a94');
      if(x<-28)curvedHead(f,u,4.30,1.60,.28,trim);else f.panel(u,4.30,.22,1.65,.18,.35,trim);
      f.panel(u,1.48,.17,1.48,.19,.27,trim);reliefPanel(f,u,1.13,1.31,.29);yield;
    }
    const u=uAt(f,-27.74);
    if(u!==null){
      const bottom=roundedEntry83(b,f,u);carvedDoor83(f,u,bottom);
      for(const sign of[-1,1]){f.panel(u+sign*.94,2.56,.20,.37,4.22,.35,'#d4d1bb');for(let yy=.65;yy<4.7;yy+=.38)f.panel(u+sign*.94,yy,.40,.40,.025,.055,'#9b9e87',true);}
      curvedHead(f,u,4.72,2.30,.31,trim);curvedCanopy(f,u,4.48,2.62,1.24,'#bdbfa9','#777b69');
    }
    const number=uAt(f,-24.86);if(number!==null){f.panel(number,4.18,.16,.50,.33,.045,'#dddfd0');f.label('83',number,4.17,.20,'#3c5c64',.195);}
    for(const yy of[5.18,5.48,5.90])band(f,yy,.16,.32,trim);yield;
  }
  function* archway83(b:Building):Generator<void>{
    const f=m.facade([-34.20,479.05],[-37.75,479.05],ground(-35.95,479.05)+.12),w=f.len,spring=3.0,top=6.1;
    const shape=new T.Shape();shape.moveTo(-w/2,spring);shape.lineTo(-w/2,top);shape.lineTo(w/2,top);shape.lineTo(w/2,spring);
    for(let i=0;i<=20;i++){const t=i/20*Math.PI;shape.lineTo(Math.cos(t)*w/2,spring+Math.sin(t)*1.32);}shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.50,bevelEnabled:false,steps:1}),at=f.at(w/2,-.34);g.rotateY(angle(f));g.translate(at[0],f.y,at[1]);m.put(g,'#c8c39d',false,true);
    for(const yy of[5.48,5.90])band(f,yy,.16,.31,'#e2dfcb');
    // This is a thin portal linking two independent official buildings. No
    // ground-level prism, door or roof is invented across the open alley.
    yield;
  }
  function* yellow83West(b:Building,f:Facade):Generator<void>{
    if(normal(f)[1]>-.65||f.at(f.len/2)[1]>480.1){yield* conservativeRear(b,f);return;}
    const trim='#e0decf';band(f,.45,.9,.14,'#858a7b');a.cornice(f,b.height,trim);
    const center=-44.50,door=uAt(f,center);
    for(const {u}of facePositions(f,[-39.5,-41.6,-49.9])){
      opening(f,u,3.0,1.12,2.45,trim,'#c9cfc6','transom','#7d918e');
      curvedHead(f,u,4.48,1.64,.24,trim);f.panel(u,1.58,.24,1.52,.18,.37,trim);grille(f,u,3.0,1.12,2.45);
      for(const sign of[-1,1])f.panel(u+sign*.57,4.2,.18,.16,.28,.19,trim,true);yield;
    }
    if(door!==null){
      const bottom=roundedEntry83(b,f,door,false,'#ad7d60');
      carvedDoor83(f,door,bottom);curvedCanopy(f,door,bottom+3.34,2.7,1.24,'#aeb3a0','#596b5c');
      for(const sign of[-1,1])f.panel(door+sign*1.05,3.1,.22,.36,4.8,.34,trim);
    }
    for(const u of[.18,f.len-.18]){f.panel(u,3.2,.15,.38,5.2,.26,trim);for(let y=.95;y<5.7;y+=.42)f.panel(u,y,.30,.43,.025,.05,'#a9ad9d',true);}
    for(const yy of[b.height-.65,b.height-.21])band(f,yy,.18,.35,trim);yield;
  }
  function* bay81(b:Building,f:Facade):Generator<void>{
    const n=normal(f);if(n[1]>-.65||f.at(f.len/2)[1]>481){yield* conservativeRear(b,f);return;}
    const trim='#d6d0bc',cream='#c5bda7';band(f,.45,.9,.14,'#796253');a.cornice(f,b.height,trim);
    for(const yy of[3.9,7.25]){band(f,yy,.18,.28,trim);band(f,yy+.22,.13,.20,trim);}
    const center=-4.30,bay=segment(f,-10.5,1.0);
    if(bay){
      const width=bay.len,front:XY[]=[bay.at(0,.04),bay.at(width*.12,.65),bay.at(width*.88,.65),bay.at(width,.04)];
      m.solid([...front,bay.at(width,-.03),bay.at(0,-.03)],6.35,f.y+3.86,cream,false);
      for(const ff of a.faces([...front,bay.at(width,-.03),bay.at(0,-.03)],f.y))if(normal(ff)[1]<-.3&&ff.len>1){
        for(const yy of[5.63,8.70])for(let j=0;j<Math.max(1,Math.round(ff.len/2.2));j++)opening(ff,(j+.5)*ff.len/Math.max(1,Math.round(ff.len/2.2)),yy,1.15,2.05,trim,'#8c785c','transom','#71837e');
        for(const yy of[4.02,7.34,10.22])band(ff,yy,.18,.26,trim);yield;
      }
    }
    for(const {x,u}of facePositions(f,[-11.25,-8.7,-6.2,-1.1,1.6])){
      if(Math.abs(x-center)>3.0)opening(f,u,2.25,1.22,2.35,trim,'#8d7457','transom','#61736b');
      if(x<-10.55||x>1.05)for(const yy of[5.65,8.7])opening(f,u,yy,1.14,2.08,trim,'#8d7457','transom','#73837d');yield;
    }
    const door=uAt(f,center);
    if(door!==null){const bottom=frontalEntry(b,f,door,2.0,4,.62,.40,'Street View Malina iulie2025,12/13: intrare sub bovindou cu trepte și balustradă; cote estimate','#796356',[-1,1]);woodDoor(f,door,bottom,1.3,2.55);}
    for(const yy of[.9,3.4])band(f,yy,.08,.15,trim);yield;
  }
  function* modern731(b:Building,f:Facade):Generator<void>{
    if(f.len<1.3){yield;return;}
    const front=normal(f)[1]<-.65,base=6.45,levels=b.style==='modern731'?7:9,pitch=(22.4-base)/5,bays=Math.max(1,Math.round(f.len/3.2)),bw=f.len/bays;
    band(f,base/2,base,.11,'#465354');band(f,base+.12,.24,.22,'#d0cbb9');
    for(let row=0;row<levels;row++){
      const cy=row<2?1.65+row*3.2:base+(row-1.45)*pitch;
      if(cy+1.2>b.height||(b.style==='modern731Glass'&&cy>17))continue;
      for(let i=0;i<bays;i++){
        const u=(i+.5)*bw,w=(i===2&&front)?1.72:1.10;
        opening(f,u,cy,w,row<2?1.85:1.63,row<2?'#4d5b59':'#d4d1c1','#b9c3b8','single',row%3===1?'#829692':'#607b7c');
        if(row>1&&(i+row)%4===0)ac(f,u+.7,cy-.72);
      }
      yield;
    }
    if(b.style==='modern731Glass'){
      const n=normal(f),u=f.len/2,w=f.len,low=17.25,h=b.height-low-.08;
      if(n[1]<-.65||n[0]>.65){
        const depth=n[1]<-.65?1.12:.12;
        f.panel(u,low+h/2,depth/2,w,h,depth,'#4d6875');
        const projecting=m.facade(f.at(0,depth+.025),f.at(f.len,depth+.025),f.y);
        projecting.panel(u,low+h/2,.025,w-.10,h-.10,.03,'#7197aa',false,1);
        for(let yy=low+.06;yy<b.height;yy+=h/6)projecting.panel(u,yy,.06,w,.048,.055,'#344f5e');
        for(let du=-w/2;du<=w/2+.01;du+=w/4)projecting.panel(u+du,low+h/2,.06,.048,h,.055,'#344f5e');
      }
    }
    if(front&&b.style==='modern731')f.panel(f.len*.70,base+.05,.60,f.len*.50,.25,1.12,'#c9c6b6');
    band(f,b.height-.10,.18,.20,'#d6d1bf');yield;
  }
  function* modern731Upper(b:Building):Generator<void>{
    const y=ground(...b.anchor as XY)+.12,roof=22.4;
    // The open terrace between the glazed upper corner and narrow white core
    // is visible in panorama27. Its plan and metric elevations are estimates.
    for(const [aa,bb]of [[[96.5,484.05],[101.05,484.05]],[[96.5,484.05],[96.5,489.6]]]as[XY,XY][]){
      const f=m.facade(aa,bb,y);f.panel(f.len/2,roof+1.02,0,f.len,.045,.065,'#565b50');
      for(let u=.10;u<f.len;u+=.20)f.panel(u,roof+.54,0,.025,.96,.035,'#565b50',true);
      f.panel(f.len/2,roof+.08,0,f.len,.14,.20,'#cac7b7');yield;
    }
    for(const x of[92.1,95.8])m.box(x,y+29.15,495.0,.22,.22,5.4,'#c6c5b8');
    m.box(93.95,y+29.15,492.4,3.9,.22,.22,'#c6c5b8');yield;
  }
  function* dental79(b:Building,f:Facade):Generator<void>{
    if(normal(f)[1]>-.6||f.at(f.len/2)[1]>480){yield* conservativeRear(b,f);return;}
    const east=b.style==='dental79East',trim='#bbbdb1',burgundy='#775069';
    band(f,.22,.44,.12,'#626d61');band(f,b.height-.25,.40,.19,burgundy);
    for(const {u}of facePositions(f,east?[55.8,52.5,49.2,45.9]:[39.7,36.4,33.1])){
      opening(f,u,2.35,1.78,1.77,trim,'#444d46','transom','#62726b');
      f.panel(u,1.23,.17,1.85,.30,.10,'#9b9f91');yield;
    }
    if(east){
      const u=uAt(f,60.27);
      if(u!==null){
        const bottom=frontalEntry(b,f,u,2.72,2,.30,.38,'D.S. septembrie2025,26/28/29: intrare esticăStomatologie79, două trepte puțin înalte; cote estimate','#a2a498',[]);
        glassDoor(f,u,bottom,2.32,2.85,'#3b4740','#2c3d37');
        for(const sign of[-1,1]){f.panel(u+sign*1.46,2.55,.20,.48,5.1,.35,'#b9bdae');for(let y=.5;y<4.8;y+=.46)f.panel(u+sign*1.46,y,.39,.49,.018,.025,'#929d8c',true);}
        f.panel(u,5.11,.15,3.65,.78,.22,burgundy);a.pediment(f,u,5.46,4.0,.82,f.y,burgundy);f.label('STOMATOLOGIE',u,4.98,.24,'#deded0',.31);
        const q=f.at(u,.32),oval=new T.TorusGeometry(.30,.045,4,18);oval.scale(1.25,1,1);oval.rotateY(angle(f));oval.translate(q[0],f.y+3.84,q[1]);m.put(oval,'#d1cdbc');
      }
    }else{
      const u=uAt(f,29.68);
      if(u!==null){const bottom=lateralEntry(b,f,u,u-.25,2.1,1.12,5,.78,[-1],'D.S. septembrie2025,29: intrare vesticăStomatologie79 cu scară laterală și balustradă argintie; cote estimate','#969e90','#b7c2b5');glassDoor(f,u,bottom,1.08,2.40,'#8e9a8d','#465b50');}
    }
    for(let y=.75;y<b.height-.5;y+=.48)f.panel(f.len/2,y,.025,f.len,.017,.035,'#959e8e',true);yield;
  }
  function* pink81(b:Building,f:Facade):Generator<void>{
    if(normal(f)[1]>-.6||f.at(f.len/2)[1]>480){yield* conservativeRear(b,f);return;}
    band(f,.44,.88,.12,'#8b8174');a.cornice(f,b.height,'#d3ccc0');
    for(const {u}of facePositions(f,[12.0,15.2,18.3,21.7])){
      opening(f,u,2.45,1.19,2.10,'#d1c9bd','#bac2b6','transom','#768b80');
      f.panel(u,1.22,.17,1.47,.19,.25,'#c2b7a7');yield;
    }
    for(let u=1.0;u<f.len;u+=2.5){const p=f.at(u,.10),g=new T.CircleGeometry(.12,12);g.rotateY(angle(f));g.translate(p[0],f.y+b.height-.45,p[1]);m.put(g,'#586959',true);}
    band(f,3.82,.10,.18,'#cabeb0');yield;
  }
  function* low87(b:Building,f:Facade):Generator<void>{
    if(normal(f)[1]>-.6||f.at(f.len/2)[1]>481){yield* conservativeRear(b,f);return;}
    band(f,.38,.76,.12,'#737b6b');a.cornice(f,b.height,'#bbc5b5');
    for(const {u}of facePositions(f,[-68.3,-71.0,-73.8,-79.4,-82.2,-84.0])){
      opening(f,u,2.05,.93,1.66,'#cbd0bd','#9eaa98','single','#687e71');yield;
    }
    const u=uAt(f,-76.6);
    if(u!==null){const bottom=frontalEntry(b,f,u,1.70,4,.57,.35,'Malina iulie2025,25: corp jos87 cu ușă brună și trepte din piatră; cote estimate','#9ea28e',[]);woodDoor(f,u,bottom,.99,2.12);}
    yield;
  }
  function* bodoniSE(b:Building,f:Facade):Generator<void>{
    const n=normal(f),mid=f.at(f.len/2);if(!(n[1]<-.7&&mid[1]<482||n[0]<-.7&&mid[0]<-116)){yield* conservativeRear(b,f);return;}
    const north=n[1]<-.7,trim='#c6c1ac';band(f,1.0,2.0,.12,'#9f9e8b');a.cornice(f,b.height,trim);
    for(let y=.30;y<2.2;y+=.42){f.panel(f.len/2,y,.09,f.len,.022,.035,'#777f6e',true);for(let u=.55;u<f.len;u+=1.1)f.panel(u,y+.20,.09,.023,.37,.035,'#7c8272',true);}
    const bays=Math.max(3,Math.round(f.len/3.2));
    for(let i=0;i<bays;i++){
      const u=(i+.5)*f.len/bays;opening(f,u,4.62,1.42,2.68,trim,'#737d6b','transom','#536c61');
      curvedHead(f,u,6.14,1.80,.19,trim);f.panel(u,3.05,.18,1.72,.23,.26,trim);
      if(north){f.panel(u,1.03,.17,Math.min(2.15,f.len/bays-.55),1.58,.03,'#354c43',false,1);f.panel(u,2.03,.67,f.len/bays-.16,.12,1.2,'#8d5a47');}
      yield;
    }
    if(!north){const u=uAt(f,494.65,1);if(u!==null){const bottom=frontalEntry(b,f,u,1.85,3,.48,.42,'D.S. septembrie2025,21: intrare pe laturaBodoni a colțuluiSE; trepte și cote estimate','#a19f8b',[]);woodDoor(f,u,bottom,1.16,2.87);}}
    for(const yy of[2.21,b.height-.54])band(f,yy,.22,.31,trim);yield;
  }
  function* bodoniSERear(b:Building,f:Facade):Generator<void>{
    const n=normal(f);if(n[0]>-.7){yield* conservativeRear(b,f);return;}
    const bays=3;
    for(let row=0;row<3;row++)for(let i=0;i<bays;i++){
      const u=(i+.5)*f.len/bays,cy=1.8+row*3.15;opening(f,u,cy,1.08,2.02,'#d1d0bf','#677d6d','transom','#677b71');
      if(i===1&&row>0)balustrade(f,u,cy-1.15,2.25,.65,'#bec5b3');yield;
    }
    a.cornice(f,b.height,'#d5d2c0');yield;
  }
  function* bodoniSW(b:Building,f:Facade):Generator<void>{
    const n=normal(f),mid=f.at(f.len/2),north=n[1]<-.65&&mid[1]<482,east=n[0]>.65&&mid[0]>-140;
    if(!(north||east)||f.len<1.1){yield* conservativeRear(b,f);return;}
    const trim='#d5ceba',h=b.height,storey=h/4;band(f,.41,.82,.14,'#a0917c');a.cornice(f,h,trim);
    const places=north?facePositions(f,[-144,-147,-151,-154.3,-157,-162,-165.2,-168.4,-172]):facePositions(f,[484.5,487.8,490.7],1);
    for(const {u}of places){
      for(let row=0;row<4;row++){const cy=storey*(row+.52);opening(f,u,cy,1.15,row===0?1.67:2.14,trim,'#b9c4b1','transom','#91a49a');}
      yield;
    }
    for(let row=1;row<4;row++)band(f,row*storey,.14,.22,trim);
    if(north){const u=uAt(f,-149.4);if(u!==null){const bottom=lateralEntry(b,f,u,u,2.35,1.18,4,.57,[-1],'D.S. septembrie2025,22: intrare sub steaguri cu palier, balustradă și scară laterală dinspre colț; poziție și cote estimate','#aa8a75','#66775f');woodDoor(f,u,bottom,1.5,2.65);}}
    yield;
  }
  function* hotelAnnex(b:Building):Generator<void>{
    // Photograph/ortho-derived extension, explicitly not a cadastral polygon.
    // It belongs to the hotel detail job, so the whole assembly commits at once.
    const p:XY[]=[[91.6,449.9],[103.6,449.8],[105,451],[105,456.9],[91.5,457],[90.8,455.8],[90.8,451],[91.6,449.9]],y=ground(98,453.4)+.12,h=7.5;
    m.solid(p,h+2,y-2,'#b7b9ae',true);m.solid(p,.17,y+h,'#93998e',false);yield;
    for(const f of a.faces(p,y)){
      if(normal(f)[1]<-.60||f.len<1.5)continue;
      const bays=Math.max(1,Math.round(f.len/2.8)),bw=f.len/bays;
      for(let i=0;i<bays;i++)for(let row=0;row<2;row++){
        f.panel((i+.5)*bw,1.9+row*3.42,.06,bw-.44,2.64,.05,'#2e3632');
        if(row===1)for(const yy of[4.3,5.2,6.1])f.panel((i+.5)*bw,yy,.11,bw-.49,.045,.05,'#71786d',true);
        yield;
      }
      for(const yy of[.35,3.78,7.15])band(f,yy,.29,.18,'#c1c4b9');
      for(let i=0;i<=bays;i++)f.panel(i*bw,h/2,.14,.25,h,.23,'#c2c5bb');
    }
    yield;
  }
  function* hotelRoof(b:Building):Generator<void>{
    const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),xmin=Math.min(...xs)+.10,xmax=Math.max(...xs)-.10,zmin=Math.min(...zs)+.10,zmax=Math.max(...zs)-.10;
    const y=ground(...b.anchor as XY)+.12+b.height,center=(xmin+xmax)/2,run=(xmax-xmin)/2,rise=4.1;
    const profile=[[-run,0],[-run*.73,rise*.63],[-run*.37,rise*.95],[0,rise], [run*.37,rise*.95],[run*.73,rise*.63],[run,0]];
    const sections=Math.max(3,Math.ceil((zmax-zmin)/2.25));
    for(let k=0;k<=sections;k++){
      const z=zmin+(zmax-zmin)*k/sections;
      for(let i=1;i<profile.length;i++)m.beam(new T.Vector3(center+profile[i-1][0],y+profile[i-1][1],z),new T.Vector3(center+profile[i][0],y+profile[i][1],z),.055,'#67655b',false);
      yield;
    }
    for(const[x,dy]of profile)m.beam(new T.Vector3(center+x,y+dy,zmin),new T.Vector3(center+x,y+dy,zmax),.042,'#777266',false);
    for(const sign of[-1,1])for(const fraction of[.20,.43,.70]){
      const xx=center+sign*run*(1-fraction),yy=y+rise*Math.min(.97,fraction*1.6);
      m.beam(new T.Vector3(xx,yy,zmin),new T.Vector3(xx,yy,zmax),.028,'#8c8273');
    }
    // The single central west-side round dormer survives in the exposed frame.
    const f=m.facade([xmin,zmin],[xmin,zmax],ground(...b.anchor as XY)+.12),u=f.len*.53;
    f.panel(u,b.height+.65,.15,2.15,1.75,.25,'#c5c6ba');
    const p=f.at(u,.32),disc=new T.CircleGeometry(.46,16);disc.rotateY(angle(f));disc.translate(p[0],y+.74,p[1]);m.put(disc,'#282b29');
    const ring=new T.TorusGeometry(.51,.09,4,20);ring.rotateY(angle(f));ring.translate(p[0],y+.74,p[1]);m.put(ring,'#d0d0c2');
    a.pediment(f,u,b.height+1.51,2.45,.75,f.y,'#b8b8aa');yield;
  }
  function* detail(b: Building, f: Facade): Generator<void> {
    if(b.style==='unfinishedHotel66')yield* unfinishedHotel(b,f);
    else if(b.style==='culture68'||b.style==='culture68Core')yield* culturalFacade(b,f);
    else if(b.style==='culture68Podium')yield* culturePodium(b,f);
    else if(b.style==='historic75')yield* historic75(b,f);
    else if(b.style==='historic77')yield* historic77(b,f);
    else if(b.style==='whiteShopEastOf83')yield* whiteShopEastOf83(b,f);
    else if(b.style==='yellow83')yield* yellow83(b,f);
    else if(b.style==='yellow83West')yield* yellow83West(b,f);
    else if(b.style==='bay81')yield* bay81(b,f);
    else if(['modern731','modern731Core','modern731Glass'].includes(b.style))yield* modern731(b,f);
    else if(b.style==='dental79East'||b.style==='dental79West')yield* dental79(b,f);
    else if(b.style==='pink81')yield* pink81(b,f);
    else if(b.style==='low87')yield* low87(b,f);
    else if(b.style==='bodoniSE')yield* bodoniSE(b,f);
    else if(b.style==='bodoniSERear')yield* bodoniSERear(b,f);
    else if(b.style==='bodoniSW')yield* bodoniSW(b,f);
    else yield* conservativeRear(b,f);
  }
  function* detailExtra(b: Building): Generator<void> {
    if(b.style==='unfinishedHotel66'){yield* hotelRoof(b);yield* hotelAnnex(b);}
    if(b.style==='modern731')yield* modern731Upper(b);
    if(b.style==='yellow83')yield* archway83(b);
    if(b.style==='bodoniSW'){
      const y=ground(...b.anchor as XY)+.12,f=m.facade([-138.2437,482.2766],[-140.7931,479.7638],y),u=f.len/2;
      const bottom=frontalEntry(b,f,u,2.0,3,.43,.34,'D.S. septembrie2025,22: intrare pe colțul teșit al clădirii sud-vest; cote estimate','#a98d76',[]);
      woodDoor(f,u,bottom,1.48,2.62);curvedCanopy(f,u,bottom+2.8,2.1,1.05,'#929b87','#606d5d');yield;
    }

  }
  const cloneRoutes = (routes: BucurestiBu10EntryRoute[]) => routes.map(r => ({...r, points:r.points.map(p=>[...p] as XY), route:r.route.map(p=>[...p] as XY)}));
  return {a,normal,angle,handles,detail,detailExtra,customRoof:(b:Building)=>b.style==='unfinishedHotel66',excavations,setActivationReady:(fn:()=>boolean)=>{activationReady=fn;},entryRoutes:()=>cloneRoutes(entries),thresholdRoutes:()=>cloneRoutes(thresholds),get entrances(){return cloneRoutes([...entries,...thresholds]);}};
}
