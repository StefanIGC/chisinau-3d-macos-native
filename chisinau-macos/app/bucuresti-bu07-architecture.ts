import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import type {XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

/** Exterior approach only. A photographed door does not assert a traversable interior. */
export type BucurestiBu07EntryRoute = {
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

/** Original meshes for București, Alecsandri–Eminescu. The official polygons
 * supply the plan, photographs supply the visible architectural character.
 * Heights, opening positions and stair dimensions remain explicit estimates. */
export function bucurestiBu07Architecture(m: Mesh, ground: (x: number, z: number) => number,
  surfaceGround: (x: number, z: number) => number = ground) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const entries: BucurestiBu07EntryRoute[] = [];
  const thresholds: BucurestiBu07EntryRoute[] = [];
  const keys = new Set<string>();
  const owned = new Set(['plamadeala52', 'expertDent50', 'casaCurataCorner',
    'choreographyCollege', 'eminescu29', 'eminescu40', 'bucuresti49Raised',
    'bucuresti47Covered', 'bucuresti47EastCovered']);

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
    topAt: (u: number) => number, color: string) {
    // The transverse slope follows the same DEM as the sidewalk, including
    // the first riser. No hidden inclined collision plane covers the treads.
    const g = new T.BoxGeometry(width, .24, far - near, Math.max(1, Math.ceil(width)), 1, 1);
    const v = g.attributes.position;
    for (let i = 0; i < v.count; i++) {
      const uu = u + v.getX(i), p = f.at(uu, (near + far) / 2 + v.getZ(i));
      v.setXYZ(i, p[0], topAt(uu) + v.getY(i) - .12, p[1]);
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
    color = '#919183', railColor = '#545b57', opaqueRail = false, customRails = false) {
    const near = .12, far = near + depth, routeV = near + depth * .61, run = steps * .29;
    const topAt = (uu: number) => surfaceGround(...f.at(uu, far + .40)) + .035 + rise;
    tread(f, centerU, length, near, far, topAt, color);
    for (const sign of sides) {
      for (let k = 0; k < steps; k++) {
        const uu = centerU + sign * (length / 2 + (k + .5) * .29);
        tread(f, uu, .295, near, far, at => topAt(at) - k * rise / steps, color);
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
    // The photographed Casa Curata cover is a half barrel along the facade.
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

  function* plamadeala(b: Building, f: Facade): Generator<void> {
    const n = normal(f), p = f.at(f.len / 2);
    if (n[1] < .8 || p[1] < 458 || f.len < 7) { yield; return; }
    band(f, .52, 1.04, .13, '#8a8d80');band(f, 1.16, .18, .27, '#c4c1ae');a.cornice(f, b.height, '#cac6b3');
    // The July2025 oblique shows substantially more missing plaster than
    // the2016 detail. These bounded patches follow those visible wall areas.
    for (const [u, cy, w, h] of [[.04,2.9,.75,2.1],[.289,3.24,.83,2.2],[.419,3.20,.78,2.3],
      [.669,2.90,.82,2.6],[.779,3.29,.68,1.9],[.904,3.31,.74,2.0]])
      wornPlaster(f, u * f.len, cy, w, h, '#868b7e');
    wornPlaster(f, f.len * .48, b.height - .34, f.len * .62, .56, '#999584');
    const centers = [.105, .230, .355, .480, .605, .825, .940];
    for (let i = 0; i < centers.length; i++) {
      const u = centers[i] * f.len, width = Math.min(1.13, f.len * .075);
      opening(f, u, 2.78, width, 2.02, '#d2cbb8', i < 2 ? '#8c654b' : '#9da79b', i < 2 ? 'wood' : 'single', '#4d5754');
      reliefPanel(f, u, 1.43, Math.min(1.45, f.len * .09), .49);
      f.panel(u, 3.99, .17, .30, .32, .21, '#c5bda4', true);
      f.panel(u, 4.18, .22, .43, .10, .30, '#d0c5ae', true);
      // Bounded patches reproduce only the observed uneven finish, not a
      // procedural mottling pattern across unrelated walls or properties.
      if ([1, 2, 5].includes(i)) f.panel(u - width * .47, 3.64, .035, .34, .36, .025, '#b5a88b', true);
      yield;
    }
    const doorU = f.len * .715;
    const bottom = lateralEntry(b, f, doorU, doorU, 1.63, 1.02, 7, .98, [-1],
      'București52: identifiable exterior photographs published2016/2020/2022 show the timber door, narrow raised landing and stair approached from the west. Seven risers and metric positions are visual estimates, current persistence is recorded in Street View observations.',
      '#969584', '#805f45', true);
    woodDoor(f, doorU, bottom, 1.43, 2.48);historicCanopy(f, doorU, bottom, 1.94, 1.27);
    downpipe(f, .14, b.height, '#838d88');downpipe(f, f.len - .12, b.height, '#8d9794');
    for (const yy of [b.height - .18, b.height - .52]) f.panel(f.len / 2, yy, .34, f.len, .022, .025, '#545951', true);
    const plaqueU = f.len * .292;
    f.panel(plaqueU, 2.82, .24, .56, .91, .07, '#8a7165');
    const plaque = f.at(plaqueU, .29), disc = new T.CircleGeometry(.115, 16);
    disc.rotateY(angle(f));disc.translate(plaque[0], f.y + 3.10, plaque[1]);m.put(disc, '#7f8a7c', true);
    f.label('A. PLĂMĂDEALĂ', plaqueU, 2.73, .066, '#cec8b7', .30);
    f.panel(.45, 2.76, .23, .42, .62, .06, '#b49670');
    f.label('MONUMENT', .45, 2.73, .055, '#5b5547', .28);
    f.label('52', f.len - .48, 3.93, .17, '#484c43', .28);
    yield;
  }
  function* expertDent(b: Building, f: Facade): Generator<void> {
    const n = normal(f), p = f.at(f.len / 2);
    if (n[1] < .8 || p[1] < 458 || f.len < 7) { yield; return; }
    band(f, .38, .76, .13, '#445c6c');a.cornice(f, b.height, '#dcdfd2');
    for (let k = 0; k < 5; k++) {
      const u = f.len * (.070 + k * .125), w = Math.min(1.19, f.len * .072);
      opening(f, u, 2.14, w, 1.86, '#e2e1d5', '#d5ddd4', 'single', k < 2 ? '#697b79' : '#337d9a');
      if (k < 2) for (let yy = 1.29; yy < 3.03; yy += .14)
        f.panel(u, yy, .29, w - .10, .09, .035, '#939e93', true);
      if (k >= 2) f.label('EXPERT DENT', u, 2.36, .075, '#d4e1dc', .28);
      // The scalloped lower apron is observed in the exterior close-up.
      f.panel(u, 1.10, .23, w + .30, .17, .17, '#d8ded2', true);
      for (const du of [-w * .31, w * .31]) {
        const pp = f.at(u + du, .30), g = new T.CircleGeometry(.10, 10);
        g.rotateY(angle(f));g.translate(pp[0], f.y + 1.03, pp[1]);m.put(g, '#d8ded2', true);
      }
      if (k >= 2) {
        const p = f.at(u - .18, .12), q = f.at(u, .52);
        m.beam(new T.Vector3(p[0], f.y + 3.54, p[1]), new T.Vector3(q[0], f.y + 3.18, q[1]), .018, '#6f756d');
        f.panel(u, 3.17, .53, .19, .10, .12, '#9a9e90', true);
      }
      yield;
    }
    const u = f.len * .797;
    const bottom = frontalEntry(b, f, u, 1.88, 4, .56, .47,
      'București50: identifiable Expert Dent exterior photographs show one white glazed door, four visible riser levels, a left-hand rail and the blue entrance gable. Dimensions estimated, photo capture date unavailable.', '#697c87', [-1]);
    glassDoor(f, u, bottom, 1.22, 2.38, '#dbe0d5', '#52666a', '#347b99');
    f.label('EXPERT DENT', u + .12, bottom + 1.56, .085, '#d9e6de', .29);
    for (const sign of [-1, 1]) {
      const uu = u + sign * 1.12;
      f.panel(uu, bottom + 1.51, .22, .25, 3.02, .28, '#dedfd0');
      for (const offset of [-.07, 0, .07]) f.panel(uu + offset, bottom + 1.50, .38, .018, 2.75, .035, '#bec5b7', true);
      for (const yy of [bottom + .06, bottom + 3.01]) f.panel(uu, yy, .27, .44, .16, .39, '#e3e3d6');
    }
    f.panel(u, bottom + 3.33, .27, 3.20, .57, .31, '#247397');
    a.pediment(f, u, bottom + 3.63, 3.65, .84, f.y, '#cdd2c3');
    for (const sign of [-1, 1]) {
      const p0 = f.at(u + sign * 1.90, .48), p1 = f.at(u, .48);
      m.beam(new T.Vector3(p0[0], f.y + bottom + 3.62, p0[1]), new T.Vector3(p1[0], f.y + bottom + 4.50, p1[1]), .055, '#276786');
    }
    // A compact tooth silhouette is original geometry, not an image texture.
    const pp = f.at(u, .56), shape = new T.Shape();
    shape.moveTo(-.18, .18);shape.quadraticCurveTo(-.30, .43, -.09, .46);shape.quadraticCurveTo(0, .38, .10, .46);
    shape.quadraticCurveTo(.30, .44, .18, .18);shape.lineTo(.08, -.26);shape.lineTo(0, -.06);shape.lineTo(-.08, -.26);shape.closePath();
    const g = new T.ShapeGeometry(shape, 8);g.rotateY(angle(f));g.translate(pp[0], f.y + bottom + 3.99, pp[1]);m.put(g, '#d8e3d8', true);
    ac(f, f.len - .70, 2.99);ac(f, f.len * .055, 3.03);
    f.panel(f.len - .62, 1.50, .26, .76, 1.04, .38, '#bbb69a');
    downpipe(f, f.len * .59, b.height);downpipe(f, f.len - .10, b.height);
    yield;
  }

  function* casaCurata(b: Building, f: Facade): Generator<void> {
    const n = normal(f), mid = f.at(f.len / 2);
    if (n[1] > -.85 || mid[1] > 481 || f.len < 15) { yield; return; }
    band(f, .60, 1.20, .13, '#747f79');a.cornice(f, b.height, '#c8c9be');
    const west = segment(f, 490, 496.3);
    if (west) {
      west.panel(west.len / 2, 3.0, .045, west.len, 3.45, .08, '#d0cdb7');
      for (let yy = 1.42; yy < 4.50; yy += .25) {
        west.panel(west.len / 2, yy, .093, west.len, .012, .018, '#a9aa96', true);
        for (let u = ((Math.round(yy / .25) % 2) ? .21 : .48); u < west.len; u += .55)
          west.panel(u, yy + .12, .094, .012, .23, .018, '#a9aa96', true);
      }
    }
    // The address point for București49 belongs to another building. This
    // entrance is placed by the photographed storefront and its map entrance.
    const doorU = uAt(f, 500.441)!, deckU = doorU + 1.35;
    const bottom = lateralEntry(b, f, doorU, deckU, 3.50, 1.18, 8, 1.12, [-1],
      'Casa Curată at the official Eminescu38 body: undated exterior photographs and Street View July2025 show eight stair levels approached from the east, the side landing and barrel canopy. The entrance map point is independent of the cadastral address. Dimensions estimated.',
      '#7f8984', '#657c82');
    glassDoor(f, doorU, bottom, .98, 2.32, '#99a398', '#697e72');
    opening(f, doorU + 2.27, bottom + 1.25, 1.35, 2.10, '#a5aca0', '#aab0a1', 'single');
    grille(f, doorU + 2.27, bottom + 1.25, 1.35, 2.10, '#c1c6b5');
    f.panel(deckU, bottom + .55, 1.30, 3.40, .78, .035, '#268fa6');
    f.label('Livrare gratuită', deckU, bottom + .56, .20, '#e0e6d3', 1.33);
    curvedCanopy(f, deckU, bottom + 2.75, 4.40, 1.43, '#c8cbb2', '#6f827e');
    for (const u of [deckU - 2.04, deckU, deckU + 2.04]) {
      const p = f.at(u, 1.36);m.box(p[0], f.y + bottom + 1.42, p[1], .045, 2.84, .045, '#6b807d', true, true);
    }
    f.panel(deckU + .10, bottom + 2.69, 1.47, 4.25, .70, .055, '#2988a1');
    f.label('Casa Curată', deckU + .10, bottom + 2.68, .37, '#e2e3cd', 1.52);
    for (const x of [508.3, 505.3]) {
      const u = uAt(f, x)!;f.panel(u, .47, .115, .47, .33, .035, '#4f5a54', true);
      for (let k = -2; k <= 2; k++) f.panel(u + k * .075, .47, .14, .016, .30, .02, '#8f978a', true);
    }
    // The separate eastern entry and closed shutters persist in July2025.
    // Its business name is unreadable and is not supplied by inference.
    for (const x of [511.40, 508.95]) {
      const u = uAt(f, x)!;opening(f, u, 2.72, 1.24, 2.24, '#c8cdc1', '#cdd2c5');
      f.panel(u, 2.72, .30, 1.17, 2.15, .045, '#b8bfb5');
      for (let yy = 1.72; yy < 3.79; yy += .10) f.panel(u, yy, .33, 1.16, .016, .018, '#9ca69b', true);
    }
    const sideU = uAt(f, 506.40)!;
    const sideBottom = frontalEntry(b, f, sideU, 1.55, 4, .58, .47,
      'A separate white entrance and frontal exterior stair east of Casa Curată are visible in Street View July2025. Position, width and four riser interpretation are estimates. The business is not legible.', '#7f8982', [1]);
    glassDoor(f, sideU, sideBottom, 1.02, 2.28, '#c3c9bd', '#bbc1b6');
    for (const x of [494.4]) {
      const u = uAt(f, x)!;opening(f, u, 2.56, 1.12, 1.94, '#bebfaf', '#d0d2c3', 'wood');
      grille(f, u, 2.56, 1.08, 1.88);
    }
    const westDoor = uAt(f, 492.80)!, westDeck = uAt(f, 493.90)!;
    const westBottom = lateralEntry(b, f, westDoor, westDeck, 3.15, 1.04, 8, 1.15, [1],
      'Eminescu38 western white-brick frontage: the separate barred door, raised platform and western descending stair with black rail are visible in Casa Curată exterior photos and the July2025 close-up. Eight risers, position and dimensions are estimates. Its business function is not inferred.',
      '#788273', '#3e5043');
    glassDoor(f, westDoor, westBottom, .91, 2.20, '#6c7e69', '#485e4e');
    grille(f, westDoor, westBottom + 1.13, .88, 2.15, '#3b4b3e');
    ac(f, uAt(f, 491.1)!, 3.64);
    for (const x of [512.90, 496.3]) downpipe(f, uAt(f, x)!, b.height, '#858f83');
    yield;
  }

  function collegeWindow(f: Facade, u: number, center: number, width = 1.23, height = 2.18, barred = false) {
    opening(f, u, center, width, height, '#d4d3be', '#d0d8ce', 'wood', '#657671');
    if (barred) grille(f, u, center, width, height, '#50594f');
  }
  function* choreography(b: Building, f: Facade): Generator<void> {
    const n = normal(f), mid = f.at(f.len / 2), cream = '#dedaca';
    const streetSouth = n[1] > .85 && mid[1] > 457;
    const streetEast = n[0] > .85 && mid[0] > 467;
    const courtSouth = n[1] < -.85 && mid[1] > 440 && mid[1] < 442;
    const courtNorth = n[1] > .85 && mid[1] > 429 && mid[1] < 432;
    const courtBack = n[0] > .85 && mid[0] > 453 && mid[0] < 457 && mid[1] > 430 && mid[1] < 442;
    if (!(streetSouth || streetEast || courtSouth || courtNorth || courtBack)) { yield; return; }
    const twoLevels = mid[1] < 441.0 || courtNorth || courtBack;
    const height = twoLevels ? 7.8 : 6.2;
    if (streetSouth) band(f, 3.55, 5.1, .045, '#874f54');
    band(f, .50, 1.0, .11, '#636e6d');a.cornice(f, height, cream);
    for (const u of [.19, f.len - .19]) f.panel(u, (height + .6) / 2, .10, .38, height - .6, .17, cream);
    const entranceFace = courtBack && mid[0] > 455.8 && f.len > 1.5;
    if (entranceFace) {
      const u = f.len / 2;
      const bottom = frontalEntry(b, f, u, 2.05, 5, .70, .58,
        'College entrance in the surveyed courtyard recess: five stair levels and white double door with a high glazed transom are visible in identifiable exterior photographs. The geometry follows the official entrance projection. Dimensions estimated.', '#b6b5a0', [-1, 1]);
      glassDoor(f, u, bottom, 1.58, 2.78, '#d5dcd0', '#6c8179', '#d1d7cd');
      f.panel(u, bottom + 2.92, .20, 1.64, .53, .04, '#647b71', false, 1);
      const p = f.at(u, .72);m.box(p[0], f.y + bottom + 3.30, p[1], 2.65, .09, 1.55, '#7a8d84', false, false, angle(f));
      f.panel(u, bottom + 3.28, 1.48, .22, .16, .10, '#d8ded1', true);
      f.panel(u, 4.65, .20, 2.15, .67, .08, '#d5dbd1');
      f.label('COLEGIUL NAȚIONAL', u, 4.72, .115, '#59676a', .25);
      f.label('DE COREGRAFIE', u, 4.50, .13, '#59676a', .25);
      collegeWindow(f, u, 6.18, 1.13, 1.75);
      yield;return;
    }
    if (streetSouth) {
      // July2025 shows fourteen windows and a door: five visible windows
      // west of the door, nine east. The far western edge is slightly cut
      // off, so fitting those bays to the official39.64m edge is an estimate.
      const count = 15, doorIndex = 5;
      for (let i = 0; i < count; i++) {
        const u = (i + .5) * f.len / count;
        if (i === doorIndex) {
          const bottom = frontalEntry(b, f, u, 1.42, 1, .14, .38,
            'College Bucuresti frontage, Street View July2025: a real door under a half-barrel canopy is visible after five western windows. The lower approach is partly hidden by a tree and fence. One low threshold of0.14m and the bay position are conservative estimates, not confirmed stair measurements.', '#9b9e91', []);
          glassDoor(f, u, bottom, 1.04, 2.85, '#c8ccbc', '#4c5e53');
          curvedCanopy(f, u, bottom + 2.98, 2.09, 1.30, '#8a9682', '#5b6a58');
        } else {
          collegeWindow(f, u, 3.17, 1.23, 2.08);
          f.panel(u, 1.69, .20, 1.66, .55, .13, cream, true);
          f.panel(u, 1.69, .28, 1.34, .31, .04, '#874f54', true);
        }
        if (i < count - 1) f.panel((i + 1) * f.len / count, 3.48, .09, .39, 5.30, .15, cream);
        yield;
      }
      for (const u of [f.len * .205, f.len * .405, f.len * .677, f.len - .12]) downpipe(f, u, height, '#777d70');
      return;
    }
    const spacing = streetSouth ? 3.25 : (twoLevels ? 3.65 : 3.50);
    const count = Math.max(1, Math.round(f.len / spacing));
    for (let i = 0; i < count; i++) {
      const u = (i + .5) * f.len / count;
      if (twoLevels) {
        collegeWindow(f, u, 1.86, 1.22, 1.80);
        collegeWindow(f, u, 5.62, 1.22, 2.18);
      } else {
        collegeWindow(f, u, 3.40, 1.26, 2.40, streetEast || courtSouth);
        f.panel(u, 1.77, .20, 1.62, .50, .13, cream, true);
        f.panel(u, 1.77, .28, 1.33, .30, .04, '#aa6c63', true);
      }
      if (i < count - 1) f.panel((i + 1) * f.len / count, (height + .75) / 2, .09, .34, height - .75, .15, cream);
      yield;
    }
    // The metal external stair belongs to the northern courtyard wing.
    // It stops at the photographed upper doorway and does not enter a room.
    if (courtNorth && f.len > 10) {
      const u = uAt(f, 460.9)!;
      const bottom = lateralEntry(b, f, u, u, 1.20, .91, 21, 3.36, [1],
        'A red-brown external metal stair to the upper northern courtyard door is visible in the college exterior photograph. Twenty-one risers, its rise and the along-wall position are estimates. Interior access is not asserted.', '#7b5d51', '#795649');
      glassDoor(f, u, bottom, .88, 2.20, '#cbd4c7', '#6e8177');
    }
    downpipe(f, f.len - .10, height, '#877c70');
    if (streetEast && mid[1] > 441) {
      f.label('M. EMINESCU 31', f.len * .34, 2.45, .14, '#e7e3d0', .29);
      ac(f, f.len * .58, 4.78);
    }
    yield;
  }

  function* brothersPub(b: Building, f: Facade): Generator<void> {
    const n = normal(f), mid = f.at(f.len / 2);
    if (n[1] < -.85 && mid[1] < 481 && f.len > 1) {
      // The two shallow entrance projections are separate segments of the
      // official polygon. July2025 shows two doors and seven tall windows.
      band(f, .42, .84, .13, '#69736d');a.cornice(f, b.height, '#d8d0b9');
      for (let u = .28; u < f.len - .10; u += .64) {
        for (const yy of [.18, .48, .72]) f.panel(u + (yy > .4 ? .11 : 0), yy, .18, .48, .20, .055, '#7b8375', true);
      }
      const westDoorFace = mid[0] > 452.2 && mid[0] < 455.1 && f.len < 3.1;
      const middleDoorFace = mid[0] > 461.0 && mid[0] < 464.0 && f.len < 3.1;
      if (westDoorFace || middleDoorFace) {
        const u = f.len / 2, steps = middleDoorFace ? 4 : 3, rise = middleDoorFace ? .60 : .45;
        const bottom = frontalEntry(b, f, u, middleDoorFace ? 2.60 : 2.36, steps, rise, .39,
          middleDoorFace ? 'Eminescu29 București frontage: July2025 east and full facade images show the central closed dark-red timber doorway between fluted pilasters and four principal frontal risers. A low irregular base is not counted as an additional full riser. Position follows the official projection; dimensions and0.60m rise estimated.' :
            'Eminescu29 București frontage: July2025 photos show the western timber-and-glass entrance, three stair levels plus landing, thin handrails and a glass canopy. Positions follow the official western projection, dimensions estimated.',
          '#a9ada0', middleDoorFace ? [] : [-1, 1]);
        const width = middleDoorFace ? 1.65 : 1.18, color = middleDoorFace ? '#60413c' : '#775b40';
        f.panel(u, bottom + 1.46, .17, width, 2.92, .11, color);
        for (const sign of [-1, 1]) {
          const uu = u + sign * (f.len / 2 - .25);
          f.panel(uu, 2.36, .16, .32, 3.90, .27, '#d8d3bb');
          for (const du of [-.085, 0, .085]) f.panel(uu + du, 2.34, .31, .027, 3.58, .035, '#b6b8a2', true);
          f.panel(uu, .56, .20, .52, .26, .35, '#d7d1b7');
        }
        for (const sign of [-1, 1]) f.panel(u + sign * (width / 2 + .06), bottom + 1.47, .24, .12, 3.06, .14, '#d0cab2');
        if (middleDoorFace) {
          for (let du = -width / 2 + .13; du < width / 2; du += .15) f.panel(u + du, bottom + 1.44, .24, .015, 2.83, .025, '#4d3836', true);
          f.panel(u, bottom + 1.46, .26, .045, 2.86, .045, '#734b42', true);
        } else {
          f.panel(u, bottom + 2.29, .25, .92, 1.01, .035, '#677267', false, 1);
          f.panel(u, bottom + 1.04, .25, .83, 1.12, .055, '#8b6f4b', true);
          const p = f.at(u, .95);m.box(p[0], f.y + bottom + 3.16, p[1], 2.78, .045, 1.82, '#b3bfae', false, false, angle(f));
          for (const sign of [-1, 1]) {
            const pp = f.at(u + sign * 1.30, .13), qq = f.at(u + sign * 1.30, 1.79);
            m.beam(new T.Vector3(pp[0], f.y + bottom + 3.55, pp[1]), new T.Vector3(qq[0], f.y + bottom + 3.15, qq[1]), .018, '#65776b');
            m.beam(new T.Vector3(pp[0], f.y + bottom + 2.78, pp[1]), new T.Vector3(qq[0], f.y + bottom + 3.15, qq[1]), .018, '#65776b');
          }
        }
        f.panel(u, b.height + .12, .16, f.len + .08, .29, .28, '#d4cfb8');
        f.panel(u, b.height + .36, .13, f.len * .64, .23, .24, '#d4cfb8');
        downpipe(f, f.len - .10, b.height, '#969d8e');yield;return;
      }
      const xs = [467.22, 465.02, 460.12, 458.10, 456.12, 451.14, 448.92];
      for (const x of xs) {
        const u = uAt(f, x);if (u === null) continue;
        opening(f, u, 2.45, 1.20, 2.22, '#d9d1b9', '#735b41', 'wood', '#4c635a');
        grille(f, u, 2.45, 1.18, 2.18, '#475c4d');
        f.panel(u, 3.74, .23, 1.73, .18, .35, '#d9d3bc');
        f.panel(u, 1.08, .22, 1.60, .43, .20, '#d8d2b9');
        f.panel(u, 1.08, .33, 1.27, .24, .04, '#b89c86');
        f.panel(u, .40, .23, 1.12, .50, .035, '#3c5144', true);
        grille(f, u, .40, 1.10, .49, '#6a7563');
        if (x === 458.10) ac(f, u + .95, 3.70);
        if (x === 448.92) ac(f, u - .79, 3.40);
        if (x === 460.12 || x === 465.02) {
          ac(f, u, .46);
          if (x === 465.02) {
            grille(f, u, .51, 1.26, .94, '#4c5b4e');
            f.panel(u, 1.02, .50, 1.34, .025, .62, '#4c5b4e', true);
          }
        }
        if (x === 467.22) {
          f.panel(u, 4.09, .19, 1.80, .28, .035, '#d8dbcb');
          f.label('M. EMINESCU 29', u, 4.08, .15, '#637b83', .23);
        }
        yield;
      }
      return;
    }
    if (n[0] < .85 || mid[0] < 468 || f.len < 10) { yield; return; }
    band(f, .44, .88, .13, '#737568');a.cornice(f, b.height, '#d8d0b9');
    for (const u of [3.03, 5.96, 8.87, 11.73]) {
      opening(f, u, 2.46, 1.18, 2.26, '#d6cfb8', '#82694b', 'wood');
      grille(f, u, 2.46, 1.16, 2.23, '#465449');
      f.panel(u, 3.77, .20, 1.72, .15, .34, '#ded7c0');
      f.panel(u, 1.10, .23, 1.54, .15, .32, '#ded7c0');
      yield;
    }
    for (const u of [6.89, 9.80]) ac(f, u, 3.60);
    // The timber enclosure is the photographed covered cellar approach.
    // A closed, visible door bounds it: no invisible stairs through terrain.
    const start = .42, end = 6.14, depth = 1.24;
    for (let u = start; u < end; u += .20) {
      const top = 2.25 - 1.22 * (u - start) / (end - start), p = f.at(u, depth);
      m.box(p[0], f.y + top / 2 + .10, p[1], .18, top, .075, '#765539', true, true, angle(f));
    }
    const roof = new T.BoxGeometry(end - start + .16, .09, depth + .20);
    const v = roof.attributes.position;
    for (let i = 0; i < v.count; i++) {
      const u = (start + end) / 2 + v.getX(i), p = f.at(u, depth / 2 + v.getZ(i));
      const y = 2.25 - 1.22 * (u - start) / (end - start) + .17 + v.getY(i);
      v.setXYZ(i, p[0], f.y + y, p[1]);
    }
    roof.computeVertexNormals();m.put(roof, '#654936', false, true);
    const doorU = .72, gate = f.at(doorU, .76), base = surfaceGround(...gate) - f.y + .08;
    f.panel(doorU, base + .83, 1.25, .94, 1.66, .10, '#795735');
    for (const u of [.21, 1.25]) {
      f.panel(u, 1.78, .25, .30, 3.56, .45, '#96947e');
      f.panel(u, 3.55, .28, .56, .20, .54, '#b8b19a');
    }
    f.panel(.65, 2.67, .36, .79, 1.03, .05, '#40483e');
    f.label('EMINESCU', .65, 2.93, .12, '#d1d0bb', .41);
    f.label('29', .65, 2.53, .41, '#d1d0bb', .41);
    f.panel(1.60, 3.09, .35, .60, 2.04, .09, '#344b43');
    for (const [letter, yy] of [['P', 3.73], ['U', 3.15], ['B', 2.57]] as const) f.label(letter, 1.60, yy, .47, '#a9473e', .41);
    downpipe(f, 1.95, b.height, '#8d9386');
    const exterior = [f.at(doorU, 2.35), f.at(doorU, 1.72)];
    register(b, f, doorU, .94, .08, .35, 0, exterior, 'normal',
      'Brother’s Pub Eminescu29: exterior photographs show the wooden covered cellar entrance and closed gate29. The route reaches the visible gate only, basement and interior are not modelled.', thresholds, 'closed-cellar-approach');
    yield;
  }

  function bayWindow(f: Facade, u: number, bottom: number, width: number, height: number, depth: number) {
    const lip = .10, trim = '#c9cfc6', poly: XY[] = [f.at(u - width / 2, .11), f.at(u - width / 2, depth * .53),
      f.at(u - width * .30, depth), f.at(u + width * .30, depth), f.at(u + width / 2, depth * .53), f.at(u + width / 2, .11)];
    m.solid(poly, .18, f.y + bottom, '#a5ada8', false);
    const windowPoly: XY[] = [poly[1], poly[2], poly[3], poly[4]];
    for (let k = 1; k < windowPoly.length; k++) {
      const sf = m.facade(windowPoly[k - 1], windowPoly[k], f.y);
      sf.panel(sf.len / 2, bottom + height * .60, .02, sf.len, height * .72, .025, '#72868b', false, 1);
      for (const edge of [0, sf.len]) sf.panel(edge, bottom + height * .57, .045, .065, height * .91, .08, trim, true);
      for (const yy of [bottom + .20, bottom + height * .93]) sf.panel(sf.len / 2, yy, .05, sf.len + lip, .08, .10, trim, true);
      sf.panel(sf.len / 2, bottom + .13, .055, sf.len, .22, .11, '#abb1aa');
    }
    m.solid(poly, .16, f.y + bottom + height, '#b2b7ae', false);
  }
  function stoneBase(f: Facade, height = 6.10) {
    band(f, height / 2, height, .09, '#b6b8a6');band(f, .17, .34, .14, '#a17e6b');
    for (let y = .55; y < height; y += .34) {
      f.panel(f.len / 2, y, .105, f.len, .014, .025, '#989f91', true);
      for (let u = Math.round(y / .34) % 2 ? .20 : .55; u < f.len; u += .77)
        f.panel(u, y + .16, .11, .013, .31, .02, '#9da394', true);
    }
    band(f, height + .10, .20, .23, '#929c94');
  }
  function* eminescu40(b: Building, f: Facade): Generator<void> {
    const n = normal(f), mid = f.at(f.len / 2);
    const diagonal = n[0] < -.60 && n[1] > .60;
    const streetSouth = n[1] > .95 && mid[1] > 457;
    const streetWest = n[0] < -.95 && mid[0] < 491;
    if (!(diagonal || streetSouth || streetWest)) { yield; return; }
    if (diagonal && f.len < 20) { yield; return; }
    // The official diagonal contains one collinear cadastral vertex. One
    // continuous facade avoids duplicating shopfronts at that artificial split.
    const ff = diagonal ? m.facade([490.2006, 428.5902], [519.9868, 458.2617], f.y) : f;
    stoneBase(ff);a.cornice(ff, b.height, '#b7bcb2');
    const storey = (b.height - 6.25) / 5;
    band(ff, b.height - storey * .56, storey * .91, .06, '#ae837c');
    if (diagonal) {
      const bays = [5.60, 21.20, 37.30];
      for (let row = 0; row < 5; row++) {
        const bottom = 6.35 + row * storey;
        for (const u of bays) bayWindow(ff, u, bottom + .11, 2.70, storey - .20, .87);
        for (const u of [11.80, 15.10, 27.30, 30.60]) opening(ff, u, bottom + storey * .54, 1.22, 1.71, '#bcc3b7', '#d1d7cb', 'wood', '#788c8d');
        if ([0, 2].includes(row)) ac(ff, 22.44, bottom + .48);
        yield;
      }
      for (const u of [2.15, 12.20, 17.05, 25.30, 30.10, 38.10]) {
        opening(ff, u, 4.45, 1.50, 1.86, '#b5bcae', '#d5d9cb', 'wood');
        if (u > 30) grille(ff, u, 4.45, 1.47, 1.80);
      }
      // DB Schenker is placed by its entrance point at local517.16,457.07,
      // which lies against the southeastern end of the diagonal facade.
      const dbCenter = 37.96, dbDoor = 40.68;
      opening(ff, dbCenter, 1.56, 3.67, 2.45, '#ced4c9', '#dce1d4', 'wood', '#728c8b');
      const dbBottom = frontalEntry(b, ff, dbDoor, 1.50, 1, .15, .42,
        'DB Schenker at Eminescu40: storefront and recessed white door visible in identifiable photographs and Street View July2025. One low threshold is visible. Metric fit to the official diagonal is estimated.', '#9ba394', []);
      glassDoor(ff, dbDoor, dbBottom, .98, 2.30);
      ff.panel(38.80, 2.99, .34, 5.75, .64, .22, '#d0d6cb');
      ff.label('DB SCHENKER', 38.35, 2.99, .30, '#52635b', .48);
      // The opposite storefront shows Vee Nail Salon on glass and an older
      // Basavin panel above. The undated sources do not establish change date.
      opening(ff, 2.25, 1.54, 4.02, 2.48, '#c9d1c3', '#d4dcce', 'wood', '#799086');
      const veeBottom = frontalEntry(b, ff, 2.25, 3.82, 1, .16, .48,
        'Eminescu40 northwestern storefront: identifiable undated photographs show Vee Nail Salon glazing below a retained Basavin sign. One low exterior threshold is visible. The trade-name change date is unknown.', '#8f9b8d', []);
      glassDoor(ff, 2.25, veeBottom, 1.18, 2.32);
      ff.label('Vee Nail Salon', 1.17, 1.72, .14, '#e0e4d6', .32);
      ff.panel(1.10, 4.72, .30, .85, 1.43, .08, '#34443c');
      ff.label('BASAVIN', 1.10, 4.58, .15, '#c5b37e', .36);
      ac(ff, 2.80, 3.42);
      const entryU = 32.68;
      const bottom = lateralEntry(b, ff, entryU, entryU, 2.12, 1.37, 9, 1.35, [-1],
        'Eminescu40 southeast residential entrance: photographs beside DB Schenker show the grey arched portal and lateral stair with black rail. Nine risers and dimensions estimated.', '#969c8d', '#46584b');
      glassDoor(ff, entryU, bottom, 1.42, 2.55, '#899b8d', '#384d42');
      for (const u of [entryU - 1.06, entryU + 1.06]) ff.panel(u, bottom + 2.04, .48, .34, 4.08, .75, '#7c8b80');
      a.arch(ff, entryU, bottom + 2.65, 1.80, 1.12, ff.y, '#4b6053', '#849286');
      ff.panel(entryU, bottom + 2.65, .48, 2.40, .20, .75, '#7c8b80');
      // Only the visible second portal frame is represented. Its concealed
      // approach is not invented or added to the traversal verification list.
      for (const u of [7.0, 9.0]) ff.panel(u, 2.80, .27, .34, 5.30, .45, '#7c8b80');
      a.arch(ff, 8.0, 3.70, 1.66, 1.08, ff.y, '#586d61', '#849286');
      downpipe(ff, 35.10, 6.05, '#929d8d');
    } else {
      // July2025 shows the broad upper end wall largely blind. The bottom
      // stone openings and upper roof band are modelled, without a window grid.
      const count = Math.max(2, Math.round(ff.len / 3.8));
      for (let i = 0; i < count; i++) {
        const u = (i + .5) * ff.len / count;
        opening(ff, u, 1.65, 1.32, 1.68, '#bcc3b5', '#d2d9ca', 'wood');
        grille(ff, u, 1.65, 1.29, 1.61);
        if (streetWest) opening(ff, u, 4.40, 1.32, 1.70, '#bbc3b5', '#d2d9ca', 'wood');
      }
      if (streetSouth) {
        for (let row = 0; row < 5; row++) {
          const bottom = 6.35 + row * storey;
          bayWindow(ff, 1.24, bottom + .11, 2.14, storey - .20, .78);
          opening(ff, 3.34, bottom + storey * .54, 1.00, 1.70, '#bcc3b7', '#d1d7cb', 'wood', '#788c8d');
          yield;
        }
        opening(ff, ff.len * .72, b.height - 1.20, 3.30, 1.25, '#bcc4b5', '#d0d7ca', 'wood');
      }
    }
    yield;
  }

  function* raisedHouse49(b: Building, f: Facade): Generator<void> {
    const n = normal(f), mid = f.at(f.len / 2);
    if (n[1] > -.85 || mid[1] > 481 || f.len < 10) { yield; return; }
    band(f, 1.02, 2.04, .15, '#798383');a.cornice(f, b.height, '#aeb4a4');
    for (const x of [554.7, 551.7, 548.7, 545.7]) {
      const u = uAt(f, x);if (u === null) continue;
      opening(f, u, 3.57, 1.05, 1.78, '#c0c6b8', '#c2cdc1', 'single', '#687a72');
      yield;
    }
    // The dark-red lower frontage is visible in2019. Its current business
    // text is unreadable, so the shop is represented without an invented name.
    const low = segment(f, 545.15, 551.65);
    if (low) {
      low.panel(low.len / 2, 1.05, .19, low.len, 1.84, .10, '#784348');
      for (let i = 0; i < 4; i++) {
        const u = (i + .5) * low.len / 4;
        opening(low, u, 1.03, low.len / 4 - .12, 1.52, '#884d51', '#96585b', 'single', '#714749');
        grille(low, u, 1.03, low.len / 4 - .16, 1.49, '#884d51');
      }
      low.panel(low.len / 2, 2.13, .28, low.len, .42, .14, '#b9bdb0');
    }
    const u = uAt(f, 544.15)!;
    const bottom = lateralEntry(b, f, u, u, 1.73, 1.36, 12, 1.98, [1],
      'Official București49 body: Street View April2019 and July2025 show the tall raised ground floor, westward external stair, black treads, grey side wall and three white railing bands. Twelve risers and metric positions are visual estimates.', '#3f4947', '#dadfd0', false, true);
    glassDoor(f, u, bottom, 1.08, 2.36, '#b4c2b5', '#4e6158');
    // The stair parapet is solid below the white horizontal strips.
    const landingOuter = 1.43;
    f.panel(u, bottom - .91, landingOuter, 1.73, 1.82, .12, '#7f8988');
    for (const dh of [.18, .49, .82]) f.panel(u, bottom + dh, landingOuter + .03, 1.68, .09, .10, '#d4dccd');
    const railStart = u + .865, railEnd = railStart + 12 * .29;
    for (const dh of [.18, .49, .82]) {
      const p = f.at(railStart, landingOuter), q = f.at(railEnd, landingOuter);
      physicalBeam(new T.Vector3(p[0], f.y + bottom + dh, p[1]),
        new T.Vector3(q[0], surfaceGround(...f.at(railEnd, landingOuter + .4)) + .035 + dh, q[1]), .038, '#d4dccd');
    }
    const canopy = f.at(u, .83);
    m.box(canopy[0], f.y + bottom + 2.75, canopy[1], 2.63, .09, 1.80, '#869189', false, false, angle(f));
    for (const s of [-1, 1]) {
      const p = f.at(u + s * 1.19, 1.58);m.box(p[0], f.y + bottom + 1.39, p[1], .038, 2.78, .038, '#7d8b80', true, true);
    }
    f.label('49', Math.min(f.len - .38, u + .97), bottom + 2.16, .18, '#d4ddcf', .32);
    downpipe(f, f.len - .10, b.height, '#77867c');
    yield;
  }

  function* coveredHouse47(b: Building, f: Facade): Generator<void> {
    const n = normal(f), mid = f.at(f.len / 2);
    if (n[1] > -.85 || mid[1] > 480.3) { yield;return; }
    // The July2025 grey surface is a temporary printed protective sheet.
    // Its decorative outlines stay flat and have no opening or collision:
    // they must not be confused with surveyed windows or masonry relief.
    const cover = segment(f, 563.55, 596.0);
    if (cover) {
      band(cover, b.height / 2, b.height, .055, '#b7b5b5');
      for (const [yy, hh, col] of [[1.10, .035, '#858689'], [1.19, .035, '#d2d0cd'],
        [1.52, .032, '#8b8b8d'], [4.38, .050, '#8f9092'], [4.51, .042, '#d6d2ce']] as const)
        cover.panel(cover.len / 2, yy, .095, cover.len, hh, .008, col, true);
      for (let u = .10; u < cover.len; u += 1.15) {
        cover.panel(u, 2.36, .102, .018, 4.66, .008, '#c4c0be', true);
        cover.panel(u + .055, .52, .105, .025, .92, .008, '#a4a3a5', true);
      }
      // Two window drawings are identifiable beside the real western bay.
      // Other folds and occluded drawings remain subdued plain covering.
      for (const x of [565.30, 568.05]) {
        const u = uAt(cover, x);if (u === null) continue;
        cover.panel(u, 2.75, .115, 1.53, 2.02, .006, '#aba9ab', true);
        for (const sign of [-1, 1]) {
          cover.panel(u + sign * .83, 2.78, .125, .07, 2.23, .006, '#ded9d1', true);
          cover.panel(u + sign * .70, 2.77, .126, .025, 2.06, .006, '#87868b', true);
          cover.panel(u, 2.75 + sign * 1.02, .128, 1.52, .035, .006, '#85838a', true);
        }
        cover.panel(u, 1.38, .13, 1.70, .29, .006, '#ded9d1', true);
        cover.panel(u, 1.38, .14, 1.48, .18, .006, '#969499', true);
        cover.panel(u, 3.97, .13, 1.90, .045, .006, '#dbd6cf', true);
        yield;
      }
    }
    if (b.style === 'bucuresti47Covered') {
      const yellow = segment(f, 560.35, 563.55);
      if (yellow) {
        band(yellow, .55, 1.10, .10, '#9a9b93');
        a.cornice(yellow, b.height, '#d0c6a6');
        const u = uAt(yellow, 561.85);
        if (u !== null) {
          opening(yellow, u, 2.66, 1.18, 2.08, '#dfd9cd', '#bcc8c2', 'wood', '#6c8180');
          grille(yellow, u, 2.69, 1.24, 2.17, '#424b47');
          yellow.panel(u, 1.26, .20, 1.55, .40, .20, '#ded7c9');
          yellow.panel(u, 1.26, .32, 1.23, .21, .035, '#c4b67f');
          yellow.panel(u, 4.05, .22, 1.84, .15, .27, '#ddd7c9');
          const num = uAt(yellow, 560.77);
          if (num !== null) {yellow.panel(num, 3.55, .21, .28, .32, .035, '#d6dacf');yellow.label('47', num, 3.54, .16, '#58645d', .25);}
        }
      }
      // The shallow central projection is present in the official polygon.
      // Four dark risers and the real door remain visible through the sheet.
      if (mid[0] > 569.5 && mid[0] < 573.8 && f.len > 3.8 && f.len < 4.3) {
        const u = uAt(f, 571.60)!;
        const bottom = frontalEntry(b, f, u, 1.60, 4, .60, .58,
          'Bucuresti47 retained VA05 body8887: July2025 Street View shows a real timber door cut through temporary printed protective sheeting, four dark frontal risers, thin metal handrail and curved canopy. Door position is fitted to the official shallow projection; metric dimensions estimated. The printed facade is not treated as real architectural geometry.', '#424c4e', [-1]);
        woodDoor(f, u, bottom, 1.01, 2.82);
        curvedCanopy(f, u, bottom + 2.96, 2.24, 1.40, '#7e8e82', '#4f5d54');
        // Low landing cheek is visible beside the metal rail.
        f.panel(u - .73, bottom - .23, .43, .17, .49, .62, '#9a9e93');
      }
    }
    yield;
  }

  function* detail(b: Building, f: Facade): Generator<void> {
    if (b.style === 'plamadeala52') { yield* plamadeala(b, f); return; }
    if (b.style === 'expertDent50') { yield* expertDent(b, f); return; }
    if (b.style === 'casaCurataCorner') { yield* casaCurata(b, f); return; }
    if (b.style === 'choreographyCollege') { yield* choreography(b, f); return; }
    if (b.style === 'eminescu29') { yield* brothersPub(b, f); return; }
    if (b.style === 'eminescu40') { yield* eminescu40(b, f); return; }
    if (b.style === 'bucuresti49Raised') { yield* raisedHouse49(b, f); return; }
    if (b.style === 'bucuresti47Covered' || b.style === 'bucuresti47EastCovered') { yield* coveredHouse47(b, f); return; }
    // Additional styles are completed only after their facade associations
    // are checked against the official body and the dated Street View images.
    yield;
  }
  function* detailExtra(b: Building): Generator<void> {
    if (b.style === 'casaCurataCorner') {
      // The green light structure is visible in Street View July2025, but
      // absent from the official building layer. It is a separately recorded
      // photographic estimate, never an alteration of the cadastral polygon.
      const p: XY[] = [[513.25, 480.10], [519.40, 480.10], [519.40, 486.10], [513.25, 486.10]];
      const y = ground(516.325, 483.10) + .035;
      m.solid(p, 2.35, y, '#829f3e', true);
      m.box(516.325, y + 2.43, 483.10, 6.35, .16, 6.19, '#637b43', false, false);
      const f = m.facade([519.40, 480.10], [513.25, 480.10], y);
      for (let u = .18; u < f.len; u += .44) f.panel(u, 1.22, .075, .06, 2.30, .08, '#617e35', true);
      f.panel(3.03, 1.21, .13, 1.51, 2.28, .04, '#3d4c32');
      for (const u of [2.24, 3.82]) f.panel(u, 1.22, .16, .09, 2.36, .13, '#7c8252');
      f.panel(3.03, 2.36, .17, 1.68, .12, .15, '#69734c');
      yield;return;
    }
    if (b.style === 'eminescu29') {
      // Photographed pub furniture, placed individually on the facade side
      // and kerb side. These positions are visual estimates, not a tree grid.
      for (const [x, z] of [[470.35, 488.80], [470.35, 484.80]]) {
        const y = surfaceGround(x, z) + .035;
        for (const zz of [z - .62, z + .62]) m.box(x, y + .24, zz, .47, .48, .055, '#46574a', false, true);
        for (const xx of [x - .16, x, x + .16]) m.box(xx, y + .48, z, .13, .065, 1.83, '#817455', false, true);
        for (const yy of [.68, .87]) m.box(x - .24, y + yy, z, .065, .14, 1.83, '#817455', false, true);
        yield;
      }
      // Three additional benches are visible on the Bucuresti frontage in
      // July2025, separated from both real doorways and the public footway.
      for (const [x, z] of [[466.15, 478.92], [456.40, 478.92], [450.50, 478.92]]) {
        const y = surfaceGround(x, z) + .035;
        for (const xx of [x - .62, x + .62]) m.box(xx, y + .24, z, .055, .48, .47, '#46574a', false, true);
        for (const zz of [z - .16, z, z + .16]) m.box(x, y + .48, zz, 1.83, .065, .13, '#817455', false, true);
        for (const yy of [.68, .87]) m.box(x, y + yy, z + .24, 1.83, .14, .065, '#817455', false, true);
        yield;
      }
      for (const [x, z, h] of [[474.10, 492.0, 1.72], [474.15, 488.65, 1.89],
        [474.00, 485.55, 1.48], [474.18, 481.85, 1.57], [470.52, 480.45, 1.38]]) {
        const y = surfaceGround(x, z) + .035;
        m.box(x, y + .29, z, .65, .58, .65, '#8a7f65', false, true);
        for (const yy of [.13, .29, .45]) {
          m.box(x, y + yy, z, .67, .022, .67, '#5d6454', true);
        }
        for (let k = 0; k < 4; k++) {
          const cone = new T.ConeGeometry(.36 - k * .067, h * .56, 8);
          cone.rotateY(k * .47 + z);cone.translate(x + Math.sin(k * 1.7) * .025, y + .65 + h * (.22 + .16 * k), z);
          m.put(cone, k % 2 ? '#738354' : '#687a50');
        }
        yield;
      }
      return;
    }
    if (b.style !== 'choreographyCollege') { yield;return; }
    // The visible college court has two low railings and a clear central
    // opening. No collision bar is placed across that pedestrian access.
    for (const [za, zb] of [[430.65, 434.35], [437.0, 441.0]]) {
      const x = 468.72, length = zb - za, count = Math.ceil(length / 1.30);
      for (let i = 0; i < count; i++) {
        const p: XY = [x, za + length * i / count], q: XY = [x, za + length * (i + 1) / count];
        const centerZ = (p[1] + q[1]) / 2, y = surfaceGround(x, centerZ) + .035;
        m.box(x, y + .12, centerZ, .22, .24, length / count + .01, '#a6ab9b', false, true);
        for (const yy of [.35, 1.04]) m.box(x, y + yy, centerZ, .038, .035, length / count, '#795e50', true, true);
        for (const z of [p[1], q[1]]) m.box(x, surfaceGround(x, z) + .57, z, .038, 1.08, .038, '#795e50', true, true);
        for (let z = p[1] + .22; z < q[1] - .10; z += .27) {
          m.box(x, y + .68, z, .026, .70, .026, '#795e50', true, true);
          const g = new T.TorusGeometry(.12, .013, 4, 12);g.rotateY(Math.PI / 2);g.translate(x + .025, y + .66, z);m.put(g, '#795e50', true);
        }
        yield;
      }
    }
  }
  const cloneRoutes = (routes: BucurestiBu07EntryRoute[]) => routes.map(r => ({...r,
    faceStart: [...r.faceStart] as XY, faceEnd: [...r.faceEnd] as XY,
    points: r.points.map(p => [...p] as XY), route: r.route.map(p => [...p] as XY)}));
  return {a, normal, angle, handles, detail, detailExtra,
    entryRoutes: () => cloneRoutes(entries), thresholdRoutes: () => cloneRoutes(thresholds),
    get entrances() { return cloneRoutes([...entries, ...thresholds]); }};
}
