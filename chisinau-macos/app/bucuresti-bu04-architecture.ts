import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import {pointSegmentDistance, type XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

export type BucurestiBu04EntryRoute = {
  name: string;
  buildingId: string;
  style: string;
  faceStart: XY;
  faceEnd: XY;
  u: number;
  width: number;
  rise: number;
  landing: number;
  steps: number;
  run: number;
  points: XY[];
  approach: 'normal' | 'lateral-west';
  evidence: string;
  accessStatus: 'entry' | 'blocked-historical-portal';
  heightSource: 'photographic-dimension-estimate';
};

/** Original, shared-material elevations for Tighina–Ismail. Official footprint
 * polygons are supplied by the catalogue; photographed level counts do not
 * turn estimated metric heights into official measurements. */
export function bucurestiBu04Architecture(m: Mesh, ground: (x: number, z: number) => number) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const routes: BucurestiBu04EntryRoute[] = [];
  const thresholds: BucurestiBu04EntryRoute[] = [];
  const routeKeys = new Set<string>();
  const modernDone = new Set<string>();
  const roofWindowsDone = new Set<string>();
  const north = new Set(['house24', 'house22', 'dental18West', 'house18', 'mansard18East', 'historic16Five', 'historic16Curved', 'house14']);

  function handles(b: Building, f: Facade) {
    if (f.len < .65) return false;
    const n = normal(f), p = f.at(f.len / 2);
    if (b.style === 'modern26') return true;
    if (b.style === 'house24' && n[0] > .82 && p[0] > 1286.5 && p[1] > 455.8) return true;
    if (north.has(b.style)) return n[1] > .82 && p[1] > 456;
    if (b.style === 'ismail9') return (n[1] > .75 && p[1] > 455) || (n[0] > .75 && p[0] > 1406)
      || (n[1] < -.75 && p[0] > 1392.2 && p[0] < 1394.9 && Math.abs(p[1] - 451.09) < .25);
    if (b.style === 'corner10') return (n[1] > .75 && p[1] > 455) || (n[0] < -.75 && p[0] < 1431)
      || (n[0] < -.3 && n[1] > .3 && p[1] > 454);
    if (b.style === 'ismail38') return (n[1] < -.75 && p[1] < 482) || (n[0] < -.75 && p[0] < 1432);
    if (b.style === 'house8') return n[1] > .82 && p[1] > 456;
    if (b.style === 'house9') return n[1] < -.82 && p[1] < 482;
    if (b.style === 'stadiumCorner') return (n[1] < -.75 && p[1] < 482) || (n[0] > .75 && p[0] > 1406);
    return false;
  }

  function band(f: Facade, center: number, height: number, depth: number, color: string) {
    f.panel(f.len / 2, center, depth / 2 + .025, f.len, height, depth, color);
  }

  function frontRange(b: Building): [number, number] {
    const ps = b.p.filter(p => p[1] > 456 && p[1] < 460);
    const xs = (ps.length > 1 ? ps : b.p).map(p => p[0]);
    return [Math.min(...xs), Math.max(...xs)];
  }

  function uAtX(f: Facade, x: number): number | null {
    const p = f.at(0), q = f.at(f.len), dx = q[0] - p[0];
    if (Math.abs(dx) < .05) return null;
    const u = (x - p[0]) / dx * f.len;
    return u >= -.012 && u < f.len + .012 ? Math.max(0, Math.min(f.len, u)) : null;
  }

  function axes(b: Building, f: Facade, count: number) {
    const [left, right] = frontRange(b), pitch = (right - left) / count;
    return Array.from({length: count}, (_, i) => ({i, x: left + (i + .5) * pitch, pitch}))
      .map(v => ({...v, u: uAtX(f, v.x)})).filter((v): v is typeof v & {u: number} => v.u !== null);
  }

  function segmentX(f: Facade, x0: number, x1: number): Facade | null {
    const p = f.at(0), q = f.at(f.len), lo = Math.max(Math.min(p[0], q[0]), x0), hi = Math.min(Math.max(p[0], q[0]), x1);
    if (hi - lo < .03) return null;
    const u0 = uAtX(f, lo), u1 = uAtX(f, hi);if (u0 === null || u1 === null) return null;
    return m.facade(f.at(Math.min(u0, u1)), f.at(Math.max(u0, u1)), f.y);
  }

  function segmentZ(f: Facade, z0: number, z1: number): Facade | null {
    const p = f.at(0), q = f.at(f.len), dz = q[1] - p[1];if (Math.abs(dz) < .05) return null;
    const lo = Math.max(Math.min(p[1], q[1]), z0), hi = Math.min(Math.max(p[1], q[1]), z1);if (hi - lo < .03) return null;
    const us = [(lo - p[1]) / dz * f.len, (hi - p[1]) / dz * f.len].sort((a, b) => a - b);
    return m.facade(f.at(us[0]), f.at(us[1]), f.y);
  }

  function pilaster(f: Facade, u: number, h: number, color: string, width = .28) {
    f.panel(u, h / 2, .16, width, h, .32, color);
    for (const y of [.18, h - .16]) f.panel(u, y, .22, width + .16, .22, .44, color);
  }

  function grille(f: Facade, u: number, center: number, width: number, height: number, color = '#3c403b') {
    const count = Math.max(3, Math.round(width / .22));
    for (let i = 0; i <= count; i++) f.panel(u - width / 2 + width * i / count, center, .55, .022, height, .032, color, true);
    for (const dy of [-height * .35, height * .35]) f.panel(u, center + dy, .56, width, .025, .035, color, true);
  }

  function window(f: Facade, u: number, center: number, width: number, height: number, trim: string, frame = '#616c65', bars = false) {
    f.window(u, center, width, height, trim, frame);
    f.panel(u, center + height / 2 + .20, .25, width + .42, .13, .36, trim);
    if (bars) grille(f, u, center, width, height);
  }

  function register(b: Building, f: Facade, u: number, width: number, rise: number, landing: number, steps: number,
    points: XY[], approach: 'normal' | 'lateral-west', evidence: string, accessStatus: 'entry' | 'blocked-historical-portal' = 'entry') {
    const key = `${b.id}/${f.at(u).map(v => v.toFixed(3)).join('/')}/${approach}`;
    if (routeKeys.has(key)) return;
    routeKeys.add(key);
    routes.push({name: `${b.title} · intrare ${routes.length + 1}`, buildingId: b.id, style: b.style,
      faceStart: f.at(0), faceEnd: f.at(f.len), u, width, rise, landing, steps, run: steps * .29,
      points, approach, evidence, accessStatus, heightSource: 'photographic-dimension-estimate'});
  }

  function stairTread(f: Facade, u: number, width: number, near: number, far: number, topAt: (u: number) => number, color: string) {
    // One continuous tread with transverse DEM sampling, rather than separate
    // strips whose joins could become invisible sideways steps.
    const g = new T.BoxGeometry(width, .24, far - near, Math.max(1, Math.ceil(width)), 1, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const uu = u + pos.getX(i), p = f.at(uu, (near + far) / 2 + pos.getZ(i));
      pos.setXYZ(i, p[0], topAt(uu) + pos.getY(i) - .12, p[1]);
    }
    g.computeVertexNormals();m.put(g, color, false, true);
  }

  function threshold(b: Building, f: Facade, u: number, width: number, color: string, evidence: string) {
    const bottom = ground(...f.at(u, .60)) + .035 - f.y;
    shared.door(f, u, bottom, width, 2.46, color);
    const key = `${b.id}/${f.at(u).map(v => v.toFixed(3)).join('/')}/threshold`;
    if (routeKeys.has(key)) return;
    routeKeys.add(key);
    thresholds.push({name: `${b.title} · prag fără scară ${thresholds.length + 1}`, buildingId: b.id, style: b.style,
      faceStart: f.at(0), faceEnd: f.at(f.len), u, width, rise: 0, landing: 0, steps: 0, run: 0,
      points: [f.at(u, 1.65), f.at(u, .50)], approach: 'normal', evidence, accessStatus: 'entry',
      heightSource: 'photographic-dimension-estimate'});
  }

  function entry(b: Building, f: Facade, u: number, width: number, steps: number, rise: number, landing = .48,
    rail = false, color = '#55584e', evidence = 'Dated StreetView: visible entrance; stair count and dimensions estimated', stairColor = '#96998c') {
    const run = steps * .29, footV = run + landing + .35;
    const topAt = (uu: number) => ground(...f.at(uu, footV)) + .035 + rise;
    stairTread(f, u, width, .14, landing + .18, topAt, stairColor);
    for (let k = 0; k < steps; k++) stairTread(f, u, width, landing + .18 + k * .29, landing + .18 + (k + 1) * .29,
      uu => topAt(uu) - k * rise / steps, stairColor);
    if (rail) for (const sign of [-1, 1]) {
      const uu = u + sign * (width / 2 - .055), p = f.at(uu, .28), q = f.at(uu, run + landing + .16);
      m.beam(new T.Vector3(p[0], topAt(uu) + .91, p[1]), new T.Vector3(q[0], topAt(uu) - rise + .91, q[1]), .026, '#b7beb7');
      for (const [v, top] of [[.30, topAt(uu)], [run + landing + .10, topAt(uu) - rise]]) {
        const r = f.at(uu, v);m.box(r[0], top + .45, r[1], .035, .90, .035, '#b7beb7', true, true);
      }
    }
    const bottom = topAt(u) - f.y;shared.door(f, u, bottom, Math.min(1.24, width - .40), 2.42, color);
    register(b, f, u, width, rise, landing, steps, [f.at(u, run + landing + .8), f.at(u, .50)], 'normal', evidence);
    return bottom;
  }

  function lateralEntry(b: Building, f: Facade, u: number, width: number, steps: number, rise: number, landing: number, evidence: string) {
    const sign = f.at(1)[0] < f.at(0)[0] ? 1 : -1, v = .82, run = steps * .29;
    const foot = f.at(u + sign * (landing / 2 + run + .38), v), top = ground(...foot) + .035 + rise;
    const p = f.at(u, v);m.box(p[0], top - .12, p[1], landing, .24, width, '#96988a', false, true, angle(f));
    for (let k = 0; k < steps; k++) {
      const q = f.at(u + sign * (landing / 2 + (k + .5) * .29), v);
      m.box(q[0], top - k * rise / steps - .12, q[1], .295, .24, width, '#96988a', false, true, angle(f));
    }
    for (const vv of [v - width / 2 + .05, v + width / 2 - .05]) {
      const p = f.at(u + sign * landing / 2, vv), q = f.at(u + sign * (landing / 2 + run), vv);
      m.beam(new T.Vector3(p[0], top + .93, p[1]), new T.Vector3(q[0], top - rise + .93, q[1]), .025, '#464c42');
      for (const [uu, yy] of [[u + sign * landing / 2, top], [u + sign * (landing / 2 + run), top - rise]]) {
        const r = f.at(uu, vv);m.box(r[0], yy + .46, r[1], .032, .92, .032, '#464c42', true, true);
      }
    }
    const pa = f.at(u - landing / 2, v + width / 2), pb = f.at(u + landing / 2, v + width / 2);
    m.beam(new T.Vector3(pa[0], top + .93, pa[1]), new T.Vector3(pb[0], top + .93, pb[1]), .025, '#464c42');
    shared.door(f, u, top - f.y, 1.14, 2.45, '#d2d6ca');
    register(b, f, u, width, rise, landing, steps,
      [f.at(u + sign * (landing / 2 + run + .8), v), f.at(u + sign * (landing / 2 + .15), v), f.at(u, v)], 'lateral-west', evidence);
    return top - f.y;
  }

  function roundEntry16(b: Building, f: Facade, u: number) {
    const steps = 3, rise = .39, landing = .48, radius = 1.38;
    const foot = f.at(u, radius + .40), base = ground(...foot) + .035;
    for (let k = 0; k < steps; k++) {
      const rr = radius - k * .29, ring: XY[] = [];
      for (let i = 0; i <= 20; i++) {const t = Math.PI * i / 20;ring.push(f.at(u + rr * Math.cos(t), .12 + rr * Math.sin(t)));}
      ring.push(ring[0]);m.solid(ring, .24, base + (k + 1) * .13 - .24, '#64695e', true);
    }
    for (const sign of [-1, 1]) {
      const p = f.at(u + sign * .69, .28), q = f.at(u + sign * 1.12, .94);
      m.beam(new T.Vector3(p[0], base + rise + .86, p[1]), new T.Vector3(q[0], base + .98, q[1]), .025, '#4f584b');
      m.box(p[0], base + rise + .42, p[1], .032, .84, .032, '#4f584b', true, true);
    }
    shared.door(f, u, base + rise - f.y, 1.13, 2.44, '#d8dbd0');
    register(b, f, u, radius * 2, rise, landing, steps, [f.at(u, radius + .8), f.at(u, .50)], 'normal',
      'September2025 east-middle85: central white closed roller door with approximately three semicircular dark steps and small iron rails; metric sizes estimated');
    return base + rise - f.y;
  }

  function roller(f: Facade, u: number, center: number, width: number, height: number) {
    f.panel(u, center, .49, width, height, .055, '#d3d7cb');
    for (let yy = center - height / 2 + .08; yy < center + height / 2; yy += .14) f.panel(u, yy, .53, width - .035, .022, .025, '#b7c0b0', true);
  }

  function curvedCanopy(f: Facade, u: number, bottom: number, width: number, depth = 1.28) {
    const verts: number[] = [], count = 12, heightAt = (du: number) => bottom + .32 * Math.sqrt(Math.max(0, 1 - (du * 2 / width) ** 2));
    for (let i = 0; i < count; i++) {
      const du0 = -width / 2 + width * i / count, du1 = -width / 2 + width * (i + 1) / count;
      const p0 = f.at(u + du0, .12), p1 = f.at(u + du1, .12), q0 = f.at(u + du0, depth), q1 = f.at(u + du1, depth);
      const a = [p0[0], f.y + heightAt(du0), p0[1]], b = [p1[0], f.y + heightAt(du1), p1[1]], c = [q1[0], f.y + heightAt(du1), q1[1]], d = [q0[0], f.y + heightAt(du0), q0[1]];
      verts.push(...a, ...b, ...c, ...a, ...c, ...d);
      const top = [a, b, c, d].map(v => [v[0], v[1] + .025, v[2]]);
      verts.push(...top[0], ...top[2], ...top[1], ...top[0], ...top[3], ...top[2]);
      m.beam(new T.Vector3(q0[0], f.y + heightAt(du0), q0[1]), new T.Vector3(q1[0], f.y + heightAt(du1), q1[1]), .025, '#343d33');
    }
    const g = new T.BufferGeometry();g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));g.computeVertexNormals();m.put(g, '#4c5748');
    for (const sign of [-1, 1]) {
      const p = f.at(u + sign * width * .46, .15), q = f.at(u + sign * width * .46, depth - .06);
      m.beam(new T.Vector3(p[0], f.y + bottom - .45, p[1]), new T.Vector3(q[0], f.y + bottom, q[1]), .024, '#394335');
    }
  }

  function curvedPediment(f: Facade, u: number, base: number, width: number, rise: number, color: string) {
    const r = width / 2, shape = new T.Shape();shape.moveTo(-r, 0);shape.lineTo(r, 0);shape.lineTo(r, .14);
    shape.quadraticCurveTo(0, rise * 1.9, -r, .14);shape.closePath();
    const p = f.at(u, .38), g = new T.ShapeGeometry(shape, 12);g.rotateY(angle(f));g.translate(p[0], f.y + base, p[1]);m.put(g, color);
    for (let i = 0; i < 12; i++) {
      const t0 = i / 12, t1 = (i + 1) / 12;
      const x0 = -r + 2 * r * t0, x1 = -r + 2 * r * t1;
      const y0 = .14 + 4 * rise * .88 * t0 * (1 - t0), y1 = .14 + 4 * rise * .88 * t1 * (1 - t1);
      const p = f.at(u + x0, .47), q = f.at(u + x1, .47);
      m.beam(new T.Vector3(p[0], f.y + base + y0, p[1]), new T.Vector3(q[0], f.y + base + y1, q[1]), .075, color);
    }
    f.panel(u, base + .02, .25, width + .16, .15, .50, color);
  }

  function attic(f: Facade, u: number, base: number, width: number, trim: string, wall: string) {
    f.panel(u, base + .48, .15, width, .95, .30, wall);
    for (const sign of [-1, 1]) f.panel(u + sign * width * .39, base + .30, .23, .23, .76, .46, trim);
    a.pediment(f, u, base + .86, width + .16, .36, f.y, trim);
    f.panel(u, base + .12, .26, width + .44, .18, .48, trim);
  }

  function* detail(b: Building, f: Facade): Generator<void> {
    if (b.style === 'modern26') {yield* modern26(b, f.y);return;}
    if (b.style === 'ismail9') {yield* ismail9(b, f);return;}
    if (b.style === 'corner10') {yield* twoStoreyCorner10(b, f);return;}
    if (b.style === 'ismail38') {yield* wornCorner38(b, f);return;}
    if (b.style === 'stadiumCorner') {yield* stadiumCorner(b, f);return;}
    const k = b.style, h = b.height, trim = b.trim, [left, right] = frontRange(b), span = right - left;
    band(f, .34, .68, .13, '#8b8d80');a.cornice(f, h, trim);
    if (k === 'house24' && normal(f)[0] > .82) {
      band(f, .34, .68, .17, '#91584c');
      const u = f.len / 2;
      f.panel(u, 1.63, .16, Math.min(1.81, f.len - .12), 3.25, .23, '#9b6355');
      const bottom = entry(b, f, u, 1.45, 2, .26, .38, false, '#874f43',
        'July2025 frontal panorama: red eastern side entrance towards the blue gate; exactly one side doorway confirmed, two steps and metric placement estimated', '#8b8779');
      for (const sign of [-1, 1]) f.panel(u + sign * .61, bottom + 1.23, .54, .15, 2.55, .10, '#a27460');
      const p = f.at(u, .51), canopy = new T.BoxGeometry(1.74, .08, 1.04);
      canopy.rotateX(.18);canopy.rotateY(angle(f));canopy.translate(p[0], f.y + bottom + 2.84, p[1]);m.put(canopy, '#825748');
      yield;return;
    }
    if (k === 'house22') {
      for (const {u} of axes(b, f, 2)) {
        f.window(u, 2.03, 1.38, 1.90, '#d6d8cc', '#555d53');
        f.panel(u, 2.03, .48, 1.36, 1.87, .06, '#787b6c');
        for (let dx = -.45; dx < .65; dx += .28) f.panel(u + dx, 2.03, .52, .024, 1.86, .025, '#676c5f', true);
        yield;
      }
      a.pediment(f, f.len / 2, h + .04, f.len + .12, 1.03, f.y, '#c8cabc');
      for (let y = .75; y < h - .5; y += .52) f.panel(.31 + (Math.floor(y * 2) % 2) * .15, y, .17, .04, .46, .03, '#777e6d', true);
    } else if (k === 'house24') {
      // The only observed door is on the short eastern return, towards the
      // blue gate; the street face retains just its two grilled windows.
      band(f, .34, .68, .17, '#91584c');
      for (const {u} of axes(b, f, 2)) {window(f, u, 2.00, 1.30, 1.78, trim, '#6b7062', true);yield;}
    } else if (k === 'house18') {
      // The close oblique view resolves only one large eastern window and
      // a narrow western door, not a regularly repeated window rhythm.
      band(f, .35, .70, .17, '#3c4539');
      for (let yy = .13; yy < .70; yy += .16) {
        band(f, yy, .021, .20, '#b9bfac');
        for (let u = .15 + (Math.round(yy * 6) % 2) * .26; u < f.len; u += .53) f.panel(u, yy + .07, .23, .018, .12, .025, '#b9bfac', true);
      }
      const door = uAtX(f, left + span * .19), opening = uAtX(f, left + span * .76);
      if (door !== null) entry(b, f, door, 1.45, 1, .13, .30, false, '#333d32',
        'September2025 east-middle0: narrow western dark doorway with one low visible step; position and metric dimensions estimated', '#6b7365');
      if (opening !== null) f.window(opening, 2.06, 2.38, 1.69, '#c9d1bc', '#343d31');
      yield;
    } else if (k === 'dental18West') {
      const mainFront = f.at(f.len / 2)[1] > 458.30 && f.len > 6;
      band(f, 1.63, 3.26, .12, '#333c32');
      band(f, 3.42, .66, .22, '#454237');band(f, 3.82, .16, .23, '#e3e6d9');
      if (mainFront) {
        const pitch = f.len / 3;
        for (let i = 0; i < 3; i++) {
          const u = (i + .5) * pitch;
          if (i === 0) threshold(b, f, u, 1.03, '#252e26',
            'September2025 east-middle0: dental frontage black ground-level door; no stair is sufficiently visible, and doorway position is estimated from an oblique view');
          else f.window(u, 1.73, Math.min(1.36, pitch * .65), 2.35, '#414a3d', '#263229');
          f.window(u, 5.41, .94, 1.82, '#e4e6dc', '#71816d');
          yield;
        }
        f.label('GOLDEN', f.len / 2, 3.25, .30, '#b9a86d');
        // The following lettering and logo are not fully legible in the
        // observed frame, so only the confirmed word is reproduced.
      } else {
        // The narrow western setback is not an additional confirmed bay.
        yield;
      }
    } else if (k === 'historic16Five') {
      const green = segmentX(f, left, left + span * .4), pink = segmentX(f, left + span * .4, right);
      if (green) band(green, h / 2, h - .18, .08, '#aebca7');
      if (pink) band(pink, h / 2, h - .18, .08, '#ba8e88');
      for (const {i, u} of axes(b, f, 5)) {
        if (i === 2) {
          const bottom = roundEntry16(b, f, u);roller(f, u, bottom + 1.21, 1.08, 2.37);
          for (const sign of [-1, 1]) pilaster(f, u + sign * .88, h - .04, trim, .30);
          f.panel(u, h + .28, .14, 2.54, .55, .29, trim);f.panel(u, h + .58, .24, 2.78, .16, .45, trim);
        } else {window(f, u, 2.27, 1.22, 1.98, trim, '#788171');if (i > 2) roller(f, u, 2.27, 1.18, 1.94);}
        yield;
      }
      for (const u of [.16, f.len - .16]) pilaster(f, u, h - .10, trim, .24);
    } else if (k === 'historic16Curved') {
      const door = uAtX(f, left + span * .16);
      if (door !== null) {
        const bottom = entry(b, f, door, 2.06, 4, .52, .48, true, '#353d35', 'September2025 nearby view and June2026 report identify the restored western portal; stair count and dimensions estimated');
        for (const sign of [-1, 1]) {
          pilaster(f, door + sign * 1.05, h, trim, .38);
          for (let yy = .46; yy < h - .12; yy += .39) f.panel(door + sign * 1.05, yy, .34, .46, .045, .13, '#c3bba9', true);
        }
        curvedPediment(f, door, h + .02, 3.23, 1.08, trim);grille(f, door, bottom + 1.25, 1.10, 2.36);
      }
      for (const fraction of [.47, .84]) {
        const u = uAtX(f, left + span * fraction);if (u !== null) {window(f, u, 2.30, 1.40, 1.94, trim, '#363f37', true);yield;}
      }
      const medallion = uAtX(f, left + span * .65);
      if (medallion !== null) {
        a.arch(f, medallion, 1.23, .93, 2.07, f.y, b.wall, trim, 0);
        f.panel(medallion, h + .70, .12, span * .64, 1.38, .25, b.wall);
        f.panel(medallion, h + 1.39, .23, span * .66, .15, .46, trim);
        const p = f.at(medallion, .45), circle = new T.CircleGeometry(.65, 24), ring = new T.TorusGeometry(.68, .065, 4, 24);
        for (const g of [circle, ring]) {g.rotateY(angle(f));g.translate(p[0], f.y + h + .67, p[1]);m.put(g, g === circle ? b.wall : trim, true);}
      }
    } else if (k === 'house14') {
      for (const {i, u} of axes(b, f, 6)) {
        if (i === 4) {
          const bottom = lateralEntry(b, f, u, 1.28, 4, .52, 2.0, 'September2025 close view: white glazed door at second axis from east, wide raised landing and westward lateral steps; count/dimensions estimated');
          curvedCanopy(f, u, bottom + 2.77, 2.10);
        } else window(f, u, 2.31, 1.19, 1.97, trim, '#636c5d', true);
        yield;
      }
      for (const fraction of [.03, .50, .97]) {const u = uAtX(f, left + span * fraction);if (u !== null) pilaster(f, u, h - .12, trim, .27);}
      for (const fraction of [.26, .74]) {const u = uAtX(f, left + span * fraction);if (u !== null) attic(f, u, h + .02, 3.15, trim, b.wall);}
      for (let u = .22; u < f.len; u += .54) f.panel(u, h - .56, .28, .20, .20, .24, trim, true);
    } else if (k === 'mansard18East') {
      // The two large street windows and yellow eastern doorway are visible;
      // adjacent frontage associations are resolved before final validation.
      for (const fraction of [.23, .55]) {const u = uAtX(f, left + span * fraction);if (u !== null) window(f, u, 2.03, 1.62, 1.83, '#b5b6a8', '#343d34', true);}
      const door = uAtX(f, right - 1.07);if (door !== null) entry(b, f, door, 1.55, 2, .26, .38, false, '#c4b75c', 'September2025: yellow eastern door with approximately two low dark steps; metric sizes estimated', '#64695c');
      a.pediment(f, f.len / 2, h + .04, f.len + .10, Math.max(1.65, b.roofRise), f.y, b.wall);
      const atticCenter = uAtX(f, left + span * .54);
      if (atticCenter !== null) {f.window(atticCenter, h + 1.18, 1.12, 1.16, '#c5c7b8', '#5c685b');shared.balcony(f, atticCenter, h + .56, 1.65, .36);}
      const small = uAtX(f, left + span * .27);if (small !== null) f.window(small, h + .98, .62, .72, '#c5c7b8', '#5c685b');
      yield;
    } else if (k === 'house8' || k === 'house9') {
      // Side-street context is only partially visible. These restrained
      // openings remain explicitly estimated, with no invented doorway.
      const count = Math.max(2, Math.round(f.len / 3.25));
      for (let i = 0; i < count; i++) {f.window((i + .5) * f.len / count, 2.10, 1.17, 1.82, trim, '#7a8574');yield;}
    }
    yield;
  }

  function* ismail9(b: Building, f: Facade): Generator<void> {
    const h = b.height, trim = b.trim, n = normal(f);
    if (n[1] < -.75) {
      const clearance = b.passages?.[0]?.clearance ?? 2.6;
      band(f, (clearance + h) / 2, h - clearance, .12, b.wall);a.cornice(f, h, trim);
      yield;return;
    }
    if (n[1] > .75) {
      // The apparent gate gap belongs to the official western tab of9632.
      // Preserve its physical passage; never lay a plinth or window over it.
      const passage = b.passages?.[0], passageXs = passage?.rings.flat(1).map(p => p[0]) ?? [1392.43, 1394.72];
      const passageLeft = Math.min(...passageXs), passageRight = Math.max(...passageXs), clearance = passage?.clearance ?? 2.6;
      const body = segmentX(f, passageRight + .015, 1399.50), shop = segmentX(f, 1399.50, 1408.70), portal = segmentX(f, passageLeft, passageRight);
      if (portal) {
        const high = Math.max(.1, h - clearance);band(portal, clearance + high / 2, high, .13, b.wall);
        band(portal, clearance + .18, .22, .33, trim);a.cornice(portal, h, trim);
      }
      if (body) {
        band(body, .37, .74, .15, '#8c8c7d');a.cornice(body, h, trim);
        const pitch = body.len / 3;
        for (let i = 0; i < 3; i++) {
          const u = (i + .5) * pitch;
          if (i === 1) {
            const bottom = entry(b, body, u, 1.88, 4, .52, .46, true, '#d0d4c8', 'September2025 close view: pale glazed entrance east of the arched gate, black canopy and approximately three-to-four straight steps; four modelled as an estimate');
            curvedCanopy(body, u, bottom + 2.77, 1.94);
          } else window(body, u, 2.43, Math.min(1.10, pitch * .63), 2.04, trim, '#6c7866', true);
          yield;
        }
        attic(body, body.len / 2, h + .02, 2.75, trim, b.wall);
        for (const fraction of [.02, .98]) pilaster(body, body.len * fraction, h - .13, trim, .25);
        for (let u = .24; u < body.len; u += .55) body.panel(u, h - .54, .27, .18, .20, .25, trim, true);
      }
      if (shop) yield* showroom(b, shop);
    } else {
      const near = segmentZ(f, 446.1, 458.4), rear = segmentZ(f, 423.5, 446.1);
      band(f, h / 2, h - .18, .07, '#d4d8ce');band(f, .30, .60, .15, '#929b8e');band(f, h - .48, .58, .20, '#343d34');band(f, h - .05, .15, .27, b.trim);
      if (near) {
        for (const fraction of [.27, .71]) {const u = near.len * fraction;near.window(u, 2.25, .96, 1.77, '#dce0d4', '#667462');yield;}
        const ac = near.len * .52;near.panel(ac, 3.15, .42, .68, .44, .40, '#b9c0b2');
        for (let i = 0; i < 5; i++) near.panel(ac - .22 + i * .11, 3.15, .65, .018, .28, .025, '#7d8a75', true);
        near.panel(near.len * .87, 2.53, .19, .34, .26, .04, '#3f6c89');near.panel(near.len * .87, 2.18, .19, .31, .22, .04, '#7a9aaa');
      }
      if (rear) {
        yield* a.windows(rear, 1, h, Math.max(1, Math.round(rear.len / 5.2)), 2.12, b.trim, '#7e8879');
      }
    }
  }

  function* showroom(b: Building, f: Facade): Generator<void> {
    const h = b.height, fascia = '#706050', count = Math.max(2, Math.round(f.len / 3.15));
    band(f, .20, .40, .18, '#969a8d');band(f, h - .54, .88, .21, fascia);band(f, h - .04, .16, .28, '#918777');
    for (let i = 0; i < count; i++) {
      const u = (i + .5) * f.len / count;
      f.window(u, 1.86, f.len / count - .38, 2.65, '#5f655b', '#3d4840');
      f.panel(i * f.len / count + .08, 1.91, .26, .19, 3.48, .34, '#bcb9a5');
      for (let yy = .36; yy < 3.6; yy += .32) f.panel(i * f.len / count + .08, yy, .44, .21, .024, .035, '#9b9e89', true);
      yield;
    }
    f.label(f.len > 15 ? 'SHOWROOM MOBILA ACCESORII DESIGN' : 'SHOWROOM', f.len / 2, h - .71, f.len > 15 ? .28 : .38, '#ddd8c5');
    // The inspected Ismail side has narrow windows. An entrance somewhere
    // in this display glass is plausible but remains unconfirmed.
  }

  function* wornCorner38(b: Building, f: Facade): Generator<void> {
    const h = b.height, count = Math.max(1, Math.round(f.len / 3.40));
    band(f, .53, 1.06, .18, '#989a8d');band(f, h - .08, .18, .28, '#bec5b9');
    for (let y = .18; y < 1.0; y += .24) {
      band(f, y, .025, .22, '#7f8978');
      for (let u = .28 + (Math.round(y * 4) % 2) * .38; u < f.len; u += .76) f.panel(u, y + .10, .25, .025, .19, .035, '#87907f', true);
    }
    for (let i = 0; i < count; i++) {
      const u = (i + .5) * f.len / count;
      f.panel(u, 2.54, .12, Math.min(1.88, f.len / count * .73), 2.57, .15, '#a6b0a2');
      window(f, u, 2.55, Math.min(1.34, f.len / count * .55), 2.07, '#bfc4b6', '#a6ac9a');
      yield;
    }
    // The high stone base and pale weathered walls are observed; no
    // functioning street entrance is inferred from the window rhythm.
  }

  function* stadiumCorner(b: Building, f: Facade): Generator<void> {
    const h = b.height, count = Math.max(1, Math.round(f.len / 4.8));
    band(f, .26, .52, .14, '#898d7d');band(f, h - .08, .17, .25, '#b5b8aa');
    for (let i = 0; i < count; i++) {
      const u = (i + .5) * f.len / count;
      f.window(u, h - 1.25, Math.min(2.15, f.len / count * .60), .84, '#bfc3b3', '#576250');
      grille(f, u, h - 1.25, Math.min(2.10, f.len / count * .58), .78);
      if (i % 3 === 1) {
        f.panel(u + .9, h - .62, .42, .70, .44, .39, '#bec2b5');
        for (let j = 0; j < 5; j++) f.panel(u + .67 + j * .11, h - .62, .64, .022, .29, .025, '#7b8673', true);
      }
      f.panel(u, 1.08, .15, Math.max(.7, f.len / count - .24), 1.22, .055, ['#91a49b', '#bcaa8d', '#a0b3a6', '#9b9892'][i % 4]);
      for (let j = 0; j < 3; j++) f.panel(u + (j - 1) * .43, .97 + .13 * ((i + j) % 3), .19, .30, .48, .025, ['#859a91', '#b6b696', '#829990'][j], true);
      yield;
    }
  }

  function* twoStoreyCorner10(b: Building, f: Facade): Generator<void> {
    const h = b.height, storey = h / 2, n = normal(f), count = n[1] > .85 ? 4 : n[0] < -.85 ? 6 : 1;
    band(f, .30, .60, .16, '#92998b');band(f, storey, .18, .26, '#dedfd5');band(f, h - .06, .18, .29, '#e0e2d9');
    for (let i = 0; i < count; i++) {
      const u = (i + .5) * f.len / count;
      for (let row = 0; row < 2; row++) f.window(u, 1.95 + row * storey, Math.min(1.33, f.len / count * .57), 1.94, '#e2e4db', '#d3d9cd');
      yield;
    }
    if (n[1] > .85 && !roofWindowsDone.has(b.id)) {
      roofWindowsDone.add(b.id);
      const xs = b.p.map(p => p[0]), zs = b.p.map(p => p[1]);
      const run = Math.max(2, Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2);
      const roofPoint = (p: XY) => {
        let distance = Infinity;
        for (const ring of [b.p, ...b.holes]) for (let i = 1; i < ring.length; i++) distance = Math.min(distance, pointSegmentDistance(p, ring[i - 1] as XY, ring[i] as XY));
        return new T.Vector3(p[0], f.y + h + .215 + b.roofRise * Math.min(1, distance / run), p[1]);
      };
      for (const fraction of [.30, .70]) {
        // Two small roof lights are visible; their placement and dimensions
        // are estimated on the same roof surface used by the volume builder.
        const u = f.len * fraction, ps = [f.at(u - .40, -3.10), f.at(u + .40, -3.10), f.at(u + .40, -2.10), f.at(u - .40, -2.10)].map(roofPoint);
        const g = new T.BufferGeometry();g.setAttribute('position', new T.Float32BufferAttribute([ps[0], ps[3], ps[2], ps[0], ps[2], ps[1]].flatMap(p => p.toArray()), 3));g.computeVertexNormals();m.put(g, '#667b7c', false, false, 1);
        for (let i = 0; i < 4; i++) m.beam(ps[i], ps[(i + 1) % 4], .055, '#a7aea0');
      }
      yield;
    }
  }

  function inside(p: XY, ring: number[][]) {
    let result = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  }

  function* modern26(b: Building, y: number): Generator<void> {
    if (modernDone.has(b.id)) return;
    modernDone.add(b.id);
    const parts: Building[] = b.parts?.length ? b.parts.map(p => ({...b, ...p, parts: undefined})) : [b];
    for (const part of parts) for (const f of a.faces(part.p as XY[], y)) {
      if (f.len < .8) continue;
      const adjacent = parts.find(p => p !== part && inside(f.at(f.len / 2, .055), p.p));
      const low = adjacent?.height ?? 0, h = part.height;
      if (low >= h - .10) continue;
      const n = normal(f), p = f.at(f.len / 2), streetPodium = n[1] > .80 && p[1] > 456;
      const white = '#e2e4dc', dark = '#545c58';
      band(f, h - .16, .28, .26, white);
      const lower = Math.max(low, 0), visibleHeight = h - lower;
      if (streetPodium) {
        const count = 5, pitch = f.len / count;
        band(f, .26, .52, .18, '#8b9187');band(f, h / 2, .22, .38, white);
        for (let i = 0; i < count; i++) {
          const u = (i + .5) * pitch;
          f.window(u, h * .74, Math.min(2.1, pitch * .63), h * .28, white, '#3f4942');
          if (i === count - 1) {
            const bottom = entry(b, f, u, 2.0, 4, .52, .55, true, '#35453e', 'July2025 frontal26: far-eastern black glazed entry, approximately four dark steps and stainless rails', '#626b61');
            shared.canopy(f, u, bottom + 2.84, 2.16);
          } else {
            f.window(u, h * .26, Math.min(2.5, pitch * .76), h * .43, white, '#3e4943');
            if (i < 3) f.panel(u, h * .26, .43, Math.min(2.4, pitch * .73), h * .41, .03, ['#cdb652', '#dad2a4', '#b3b9a4'][i]);
          }
          pilaster(f, i * pitch + .13, h - .10, white, .38);yield;
        }
        pilaster(f, f.len - .13, h - .10, white, .38);
        for (const fraction of [.31, .70]) {
          const p = f.at(f.len * fraction, .66), base = ground(...p) + .035;
          m.box(p[0], base + .27, p[1], 1.35, .54, .64, '#4a534a', false, true, angle(f));
          m.box(p[0], base + .55, p[1], 1.19, .035, .49, '#686451', false, false, angle(f));
        }
      } else if (n[0] < -.80 && h < 7 && low === 0) {
        // The observed western podium wall is largely blank, with four
        // low air-conditioning units, rather than a repeated window grid.
        for (let i = 0; i < 4; i++) {
          const u = (i + .5) * f.len / 4;
          f.panel(u, 1.53, .40, .72, .46, .38, '#b9c0b3');
          for (let j = 0; j < 5; j++) f.panel(u - .24 + j * .12, 1.53, .62, .022, .30, .025, '#798773', true);
        }
        yield;
      } else {
        // The estimated split volumes own the silhouettes. Every exposed
        // inset face receives openings only above the neighbouring roof.
        const rows = Math.max(1, Math.round(visibleHeight / 3.45)), count = Math.max(1, Math.round(f.len / 3.25));
        for (let row = 0; row < rows; row++) {
          const center = lower + (row + .5) * visibleHeight / rows;
          for (let i = 0; i < count; i++) {
            const u = (i + .5) * f.len / count, upper = center > b.height - 6.8;
            if (upper) f.panel(u, center, .11, f.len / count - .12, visibleHeight / rows, .16, '#a3a6a0');
            f.window(u, center, Math.min(1.86, f.len / count * .67), Math.min(2.25, visibleHeight / rows * .72), upper ? '#777e76' : white, dark);
            if (n[1] > .75 && !upper && i % 2 === 1) shared.balcony(f, u, center - 1.16, Math.min(1.85, f.len / count * .70), .20);
          }
          yield;
        }
      }
    }
  }

  const cloneRoutes = (list: BucurestiBu04EntryRoute[]) => list.map(r => ({...r, points: r.points.map(p => [...p] as XY)}));
  return {a, normal, angle, handles, detail, entryRoutes: () => cloneRoutes(routes), thresholdRoutes: () => cloneRoutes(thresholds)};
}
