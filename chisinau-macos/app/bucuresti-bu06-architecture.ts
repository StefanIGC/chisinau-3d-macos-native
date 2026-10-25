import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import {pointSegmentDistance, type XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

export type BucurestiBu06EntryRoute = {
  name: string;
  buildingId: string;
  sharedEntranceId: string;
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
  approach: 'normal' | 'lateral' | 'ramp';
  evidence: string;
  accessStatus: 'entry' | 'blocked-historical-portal';
  heightSource: 'photographic-dimension-estimate';
};

/** Original elevations for București, Lev Tolstoi–Ciuflea/Dacia. The supplied
 * official polygons define plan geometry; source photographs define the visible
 * facade character. Every height, split and stair dimension remains estimated. */
export function bucurestiBu06Architecture(m: Mesh, ground: (x: number, z: number) => number,
  surfaceGround: (x: number, z: number) => number = ground) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const entries: BucurestiBu06EntryRoute[] = [];
  const thresholds: BucurestiBu06EntryRoute[] = [];
  const routeKeys = new Set<string>();
  const extrasDone = new Set<string>();
  const owned = new Set(['midtownOfficial', 'nr1WestTower', 'nr1Residential', 'nr1ResidentialContext',
    'nr1PodiumCourt', 'milesti12Commercial', 'beautyPink', 'radma6', 'ciuflea4Tower']);

  function handles(b: Building, f: Facade) { return f.len >= .60 && owned.has(b.style); }
  function band(f: Facade, center: number, height: number, depth: number, color: string) {
    f.panel(f.len / 2, center, depth / 2 + .025, f.len, height, depth, color);
  }

  function uAt(f: Facade, value: number, axis: 0 | 1 = 0): number | null {
    const p = f.at(0), q = f.at(f.len), delta = q[axis] - p[axis];
    if (Math.abs(delta) < .05) return null;
    const u = (value - p[axis]) / delta * f.len;
    return u >= -.01 && u <= f.len + .01 ? Math.max(0, Math.min(f.len, u)) : null;
  }

  function segment(f: Facade, lo: number, hi: number, axis: 0 | 1 = 0): Facade | null {
    const p = f.at(0), q = f.at(f.len), low = Math.max(lo, Math.min(p[axis], q[axis])), high = Math.min(hi, Math.max(p[axis], q[axis]));
    if (high - low < .03) return null;
    const u0 = uAt(f, low, axis), u1 = uAt(f, high, axis);if (u0 === null || u1 === null) return null;
    return m.facade(f.at(Math.min(u0, u1)), f.at(Math.max(u0, u1)), f.y);
  }

  function grille(f: Facade, u: number, center: number, width: number, height: number, color = '#3b403b') {
    const count = Math.max(3, Math.round(width / .22));
    for (let i = 0; i <= count; i++) f.panel(u - width / 2 + width * i / count, center, .55, .022, height, .032, color, true);
    for (const dy of [-height * .35, height * .35]) f.panel(u, center + dy, .56, width, .025, .035, color, true);
  }

  function window(f: Facade, u: number, center: number, width: number, height: number, trim: string, frame = '#52625b', bars = false) {
    f.window(u, center, width, height, trim, frame);
    if (bars) grille(f, u, center, width, height);
  }

  function register(b: Building, f: Facade, u: number, width: number, rise: number, landing: number, steps: number,
    points: XY[], approach: 'normal' | 'lateral' | 'ramp', evidence: string, target = entries,
    accessStatus: 'entry' | 'blocked-historical-portal' = 'entry', variant = 'main') {
    const sharedEntranceId = `${b.id}/${f.at(u).map(v => v.toFixed(3)).join('/')}`;
    const key = `${sharedEntranceId}/${approach}/${variant}`;
    if (routeKeys.has(key)) return;
    routeKeys.add(key);
    target.push({name: `${b.title} · ${steps ? 'scară' : 'prag'} ${target.length + 1}`, buildingId: b.id, sharedEntranceId, style: b.style,
      faceStart: f.at(0), faceEnd: f.at(f.len), u, width, rise, landing, steps, run: steps * .29,
      points, approach, evidence, accessStatus, heightSource: 'photographic-dimension-estimate'});
  }

  function stairTread(f: Facade, u: number, width: number, near: number, far: number, topAt: (u: number) => number, color: string) {
    // A continuous tread follows the transverse DEM. Its joins do not create
    // narrow artificial steps on the naturally sloping street.
    const g = new T.BoxGeometry(width, .24, far - near, Math.max(1, Math.ceil(width)), 1, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const uu = u + pos.getX(i), p = f.at(uu, (near + far) / 2 + pos.getZ(i));
      pos.setXYZ(i, p[0], topAt(uu) + pos.getY(i) - .12, p[1]);
    }
    g.computeVertexNormals();m.put(g, color, false, true);
  }

  function entry(b: Building, f: Facade, u: number, width: number, steps: number, rise: number, landing: number,
    rail: boolean, doorColor: string, evidence: string, stairColor = '#92968c') {
    const run = steps * .29, footV = run + landing + .35;
    const topAt = (uu: number) => surfaceGround(...f.at(uu, footV)) + .035 + rise;
    stairTread(f, u, width, .14, landing + .18, topAt, stairColor);
    for (let k = 0; k < steps; k++) stairTread(f, u, width, landing + .18 + k * .29, landing + .18 + (k + 1) * .29,
      uu => topAt(uu) - k * rise / steps, stairColor);
    if (rail) for (const sign of [-1, 1]) {
      const uu = u + sign * (width / 2 - .055), p = f.at(uu, .28), q = f.at(uu, run + landing + .16);
      m.beam(new T.Vector3(p[0], topAt(uu) + .91, p[1]), new T.Vector3(q[0], topAt(uu) - rise + .91, q[1]), .026, '#40493f');
      for (const [v, top] of [[.30, topAt(uu)], [run + landing + .10, topAt(uu) - rise]]) {
        const r = f.at(uu, v);m.box(r[0], top + .45, r[1], .035, .90, .035, '#40493f', true, true);
      }
    }
    const bottom = topAt(u) - f.y;shared.door(f, u, bottom, Math.min(1.24, width - .36), 2.32, doorColor);
    register(b, f, u, width, rise, landing, steps, [f.at(u, run + landing + .80), f.at(u, .50)], 'normal', evidence);
    return bottom;
  }

  function threshold(b: Building, f: Facade, u: number, width: number, color: string, evidence: string) {
    const bottom = surfaceGround(...f.at(u, .60)) + .035 - f.y;
    shared.door(f, u, bottom, width, 2.38, color);
    register(b, f, u, width, 0, 0, 0, [f.at(u, 1.65), f.at(u, .50)], 'normal', evidence, thresholds);
    return bottom;
  }

  function lateralPlatform(b: Building, f: Facade, doorU: number, centerU: number, length: number,
    depth: number, steps: number, rise: number, sides: number[], rail: boolean, doorColor: string, evidence: string,
    railColor = '#deded2', stairColor = '#969b90') {
    const near = .16, far = near + depth, v = near + depth * .67, run = steps * .29;
    const topAt = (uu: number) => surfaceGround(...f.at(uu, far + .40)) + .035 + rise;
    stairTread(f, centerU, length, near, far, topAt, stairColor);
    for (const sign of sides) {
      for (let k = 0; k < steps; k++) {
        const center = centerU + sign * (length / 2 + (k + .5) * .29);
        stairTread(f, center, .295, near, far, uu => topAt(uu) - k * rise / steps, stairColor);
      }
      if (rail) for (const vv of [near + .04, far - .04]) {
        const uu0 = centerU + sign * length / 2, uu1 = centerU + sign * (length / 2 + run);
        const p = f.at(uu0, vv), q = f.at(uu1, vv);
        m.beam(new T.Vector3(p[0], topAt(uu0) + .91, p[1]), new T.Vector3(q[0], topAt(uu1) - rise + .91, q[1]), .026, railColor);
      }
      register(b, f, doorU, depth, rise, length, steps,
        [f.at(centerU + sign * (length / 2 + run + .75), v), f.at(centerU + sign * (length / 2 - .15), v), f.at(doorU, v)],
        'lateral', evidence, entries, 'entry', sign < 0 ? 'first-end' : 'second-end');
    }
    if (rail) {
      for (let uu = centerU - length / 2; uu <= centerU + length / 2 + .01; uu += Math.max(.5, length / 5)) {
        const p = f.at(uu, far - .04);m.box(p[0], topAt(uu) + .46, p[1], .045, .92, .045, railColor, true, true);
      }
      for (const dh of [.16, .91]) {
        const p = f.at(centerU - length / 2, far - .04), q = f.at(centerU + length / 2, far - .04);
        m.beam(new T.Vector3(p[0], topAt(centerU - length / 2) + dh, p[1]), new T.Vector3(q[0], topAt(centerU + length / 2) + dh, q[1]), .025, railColor);
      }
    }
    const bottom = topAt(doorU) - f.y;shared.door(f, doorU, bottom, 1.12, 2.38, doorColor);
    return bottom;
  }

  function curvedCanopy(f: Facade, u: number, bottom: number, width: number, depth: number, color: string) {
    const verts: number[] = [], count = 16;
    const heightAt = (du: number) => bottom + .55 * Math.sqrt(Math.max(0, 1 - (du * 2 / width) ** 2));
    for (let i = 0; i < count; i++) {
      const du0 = -width / 2 + width * i / count, du1 = -width / 2 + width * (i + 1) / count;
      const p0 = f.at(u + du0, .12), p1 = f.at(u + du1, .12), q0 = f.at(u + du0, depth), q1 = f.at(u + du1, depth);
      const aa = [p0[0], f.y + heightAt(du0), p0[1]], bb = [p1[0], f.y + heightAt(du1), p1[1]], cc = [q1[0], f.y + heightAt(du1), q1[1]], dd = [q0[0], f.y + heightAt(du0), q0[1]];
      verts.push(...aa, ...bb, ...cc, ...aa, ...cc, ...dd);
      const tops = [aa, bb, cc, dd].map(v => [v[0], v[1] + .03, v[2]]);
      verts.push(...tops[0], ...tops[2], ...tops[1], ...tops[0], ...tops[3], ...tops[2]);
    }
    const g = new T.BufferGeometry();g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));g.computeVertexNormals();m.put(g, color);
    for (const sign of [-1, 1]) {
      const p = f.at(u + sign * width * .43, .15), q = f.at(u + sign * width * .43, depth - .06);
      m.beam(new T.Vector3(p[0], f.y + bottom - .35, p[1]), new T.Vector3(q[0], f.y + bottom, q[1]), .025, '#444c42');
    }
  }


  function contains(point: XY, ring: number[][]) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > point[1]) !== (b[1] > point[1]) &&
        point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  function within(point: XY, b: Building) {
    return contains(point, b.p) && !(b.holes ?? []).some(ring => contains(point, ring));
  }

  function outlineFaces(ring: number[][], y: number, minimum = .60) {
    const area = ring.slice(1).reduce((sum, p, i) => sum + ring[i][0] * p[1] - p[0] * ring[i][1], 0);
    const result: Facade[] = [];
    for (let i = 1; i < ring.length; i++) {
      const p = (area > 0 ? ring[i] : ring[i - 1]) as XY, q = (area > 0 ? ring[i - 1] : ring[i]) as XY;
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= minimum) result.push(m.facade(p, q, y));
    }
    return result;
  }

  function* exposedFaces(b: Building): Generator<{f: Facade; part: Building; base: number}> {
    const y = ground(...b.anchor as XY) + .12;
    const parts = b.parts?.length ? b.parts.map(part => ({...b, ...part, parts: undefined}) as Building) : [b];
    for (const part of parts) for (const ring of [part.p, ...(part.holes ?? [])]) {
      // Hole normals are reversed so the wall faces the open court.
      // The official Midtown arc has 14–39 cm edges. Keeping them avoids
      // replacing its curved curtain wall with an undecorated blank surface.
      const faces = outlineFaces(ring, y, b.style === 'midtownOfficial' ? .04 : .60);
      for (const source of faces) {
        const f = ring === part.p ? source : m.facade(source.at(source.len), source.at(0), y);
        const probe = f.at(f.len / 2, .04);
        let base = 0;
        for (const other of parts) if (other !== part && within(probe, other)) base = Math.max(base, other.height);
        if (base >= part.height - .03) continue;
        yield {f, part, base};
      }
    }
  }

  function glazing(f: Facade, u: number, bottom: number, width: number, height: number,
    frame = '#434b4d', glass = '#587b89') {
    f.panel(u, bottom + height / 2, .10, width, height, .025, glass, false, 1);
    for (const side of [-1, 1]) f.panel(u + side * width / 2, bottom + height / 2, .16, .065, height + .06, .095, frame, true);
    for (const yy of [bottom, bottom + height]) f.panel(u, yy, .16, width + .06, .065, .095, frame, true);
    f.panel(u, bottom + height / 2, .17, .05, height, .06, frame, true);
  }

  function ironBalcony(f: Facade, u: number, bottom: number, width: number, depth: number,
    parapet = false, rounded = false) {
    const points: XY[] = [f.at(u - width / 2, .12), f.at(u + width / 2, .12)];
    const rail: XY[] = [];
    for (let i = 0; i <= (rounded ? 8 : 1); i++) {
      const t = i / (rounded ? 8 : 1), du = width / 2 - width * t;
      const v = rounded ? depth - .25 + .25 * Math.sin(t * Math.PI) : depth;
      const p = f.at(u + du, v);points.push(p);rail.push(p);
    }
    points.push(points[0]);m.solid(points, .17, f.y + bottom - .17, '#d7d3c5', false);
    if (parapet) {
      f.panel(u, bottom + .36, depth - .07, width, .72, .15, '#c3c2b7');
      f.panel(u, bottom + .75, depth - .07, width + .08, .08, .23, '#e3ded2');
    }
    const lower = parapet ? .77 : .12;
    for (let i = 1; i < rail.length; i++) for (const h of [lower, 1.02]) {
      const p = rail[i - 1], q = rail[i];m.beam(new T.Vector3(p[0], f.y + bottom + h, p[1]), new T.Vector3(q[0], f.y + bottom + h, q[1]), .024, '#42443e');
    }
    const count = Math.max(3, Math.ceil(width / .29));
    for (let i = 0; i <= count; i++) {
      const du = -width / 2 + width * i / count, v = rounded ? depth - .25 + .25 * Math.sin(i / count * Math.PI) : depth;
      const p = f.at(u + du, v);m.box(p[0], f.y + bottom + (1.02 + lower) / 2, p[1], .022, 1.02 - lower, .022, '#42443e', true);
    }
    for (const sign of [-1, 1]) f.panel(u + sign * width / 2, bottom + .56, depth / 2, .025, .92, depth, '#42443e', true);
  }

  function* midtownFace(b: Building, f: Facade, base = 0) {
    const h = b.height, n = normal(f), low = h < 16, west = n[0] < -.45;
    const rows = Math.max(1, b.levels), bays = Math.max(1, Math.round(f.len / 2.65)), bw = f.len / bays;
    const glass = low ? '#314953' : '#3e779f', trim = '#d1d8d2';
    if (f.len < .65) {
      const lo = Math.max(base + .025, .16), mid = f.at(f.len / 2);
      f.panel(f.len / 2, (h + lo) / 2, .08, f.len + .004, h - lo, .025, glass, false, 1);
      for (let row = 1; row < rows; row++) {
        const yy = 4.1 + (row - 1) * (h - 4.1) / Math.max(1, rows - 1);
        if (yy > lo) f.panel(f.len / 2, yy, .13, f.len + .004, .045, .06, '#8399a1', true);
      }
      // One fin per architectural bay, not one per cadastral arc segment.
      const aa = f.at(0), bb = f.at(f.len), radius = Math.hypot(mid[0] - 1634.18, mid[1] - 381.25);
      const start = Math.atan2(aa[1] - 381.25, aa[0] - 1634.18) * radius;
      const end = Math.atan2(bb[1] - 381.25, bb[0] - 1634.18) * radius;
      if (Math.floor((start + .6) / 2.2) !== Math.floor((end + .6) / 2.2))
        f.panel(f.len / 2, (h + lo) / 2, .27, .18, h - lo, .52, trim);
      band(f, h + .06, .17, .38, '#b9c3be');
      yield;return;
    }
    if (base < 3.8) {
      glazing(f, f.len / 2, Math.max(.18, base), f.len - .06, 3.80 - Math.max(.18, base), '#6f7779', '#3d5964');
      band(f, 3.98, .25, .42, '#aeb7b0');
    }
    for (let k = 0; k < bays; k++) {
      const u = (k + .5) * bw, lo = Math.max(4.12, base + .025);
      if (h > lo) {
        f.panel(u, (h + lo) / 2, .09, bw - .025, h - lo, .025, glass, false, 1);
        for (let row = 1; row < rows; row++) {
          const yy = 4.1 + (h - 4.1) * (row - 1) / Math.max(1, rows - 1);
          if (yy > lo) f.panel(u, yy, .16, bw, .045, .045, '#7d949d', true);
        }
        f.panel(u, (h + lo) / 2, .18, .045, h - lo, .065, '#82a0ab', true);
      }
      // White fins on the faceted glazed frontage; the western stepped wing
      // has wider charcoal piers and small dark opening strips in the photo.
      f.panel(k * bw, (h + base) / 2, .26, west || low ? .41 : .20, h - base, .51, west || low ? '#3e474b' : trim);
      if (west && !low) for (let row = 1; row < rows; row++) {
        const yy = 4.1 + (row - .5) * (h - 4.1) / Math.max(1, rows - 1);
        if (yy > base + .9 && yy < h - .5) f.panel(u - bw * .20, yy, .23, Math.min(.72, bw * .34), 1.28, .035, '#293d4e', false, 1);
      }
      yield;
    }
    f.panel(f.len, (h + base) / 2, .26, .20, h - base, .51, trim);
    band(f, h + .06, .17, .40, low || west ? '#454c4d' : '#b9c3be');
    const p = f.at(f.len / 2);
    if (base < .2 && n[1] > .45 && p[1] > 389 && f.len > 4) f.label('MIDTOWN', f.len / 2, 4.45, Math.min(.45, f.len / 12), '#c6ae65', .55);
  }

  function* nr1Face(b: Building, f: Facade, base = 0) {
    const h = b.height, n = normal(f), p = f.at(f.len / 2);
    const courtOnly = b.style === 'nr1PodiumCourt', contextual = b.style === 'nr1ResidentialContext';
    const street = n[1] < -.42 || (b.style === 'nr1WestTower' && n[0] < -.65);
    const podium = Math.min(4.85, h), bays = Math.max(1, Math.round(f.len / (street ? 3.15 : 3.9))), bw = f.len / bays;
    if (base < podium && !courtOnly && street) {
      const lo = Math.max(base, .10);
      f.panel(f.len / 2, (podium + lo) / 2, .045, f.len, podium - lo, .09, '#c8c6bc');
      for (let k = 0; k < bays; k++) {
        const u = (k + .5) * bw;
        glazing(f, u, Math.max(lo, .82), bw - .42, Math.max(.5, podium - Math.max(lo, .82) - .75), '#43484a', '#5c7e8b');
        f.panel(k * bw, podium / 2, .18, .38, podium, .28, '#d3d0c4');yield;
      }
      for (let yy = .25; yy < podium; yy += .46) f.panel(f.len / 2, yy, .20, f.len, .015, .026, '#b2b2a9', true);
      band(f, podium + .04, .17, .40, '#414c4b');
    }
    if (courtOnly || h < 6) { yield; return; }
    const topLevel = Math.max(podium + 3, h - 2.85), rows = Math.max(1, b.levels - 2);
    const redTower = b.style === 'nr1WestTower' && p[0] > 1570.5 && p[0] < 1583.9 && p[1] < 555.2;
    if (redTower) {
      // The semicircular western tower has a vertical terracotta face, rather
      // than the balcony stacks on the lower residential wings.
      const lo = Math.max(base, podium);
      f.panel(f.len / 2, (h + lo) / 2, .065, f.len + .01, h - lo, .13, '#b36d60');
      const count = Math.max(1, Math.round(f.len / 2.4));
      for (let row = 0; row < rows; row++) {
        const yy = podium + (row + .52) * (topLevel - podium) / rows;
        if (yy > base + .9) for (let k = 0; k < count; k++)
          window(f, (k + .5) * f.len / count, yy, Math.min(1.16, f.len / count * .66), 1.62, '#deddd1', '#6e817e');
        yield;
      }
      band(f, h - 2.78, .22, .48, '#e1dfd1');
      glazing(f, f.len / 2, h - 2.42, Math.max(.45, f.len - .20), 1.60, '#e4e1d3', '#668184');
      band(f, h + .03, .23, .54, '#e4e1d3');
      return;
    }
    if (topLevel > base) f.panel(f.len / 2, (h + Math.max(topLevel, base)) / 2, .075, f.len, h - Math.max(topLevel, base), .15, '#a75b52');
    for (let row = 0; row < rows; row++) {
      const step = (topLevel - podium) / rows, yy = podium + (row + .52) * step;
      if (yy < base + .95) continue;
      for (let k = 0; k < bays; k++) {
        const u = (k + .5) * bw, w = Math.max(.65, Math.min(1.55, bw * .53));
        window(f, u, yy, w, Math.min(1.83, step * .68), '#e7e4db', '#798888');
        if (street && !contextual && f.len > 4) {
          const projected = bays <= 2 || k % 3 === 1;
          if (projected) {
            ironBalcony(f, u, yy - step * .43, Math.min(bw + .24, 3.25), 1.16, true, true);
            if ((row + k) % 5 === 2) glazing(f, u, yy - step * .40 + .78, Math.min(bw - .08, 2.87), Math.min(1.7, step * .62), '#d9ddd5', '#718b90');
          } else ironBalcony(f, u, yy - step * .39, Math.min(bw * .80, 2.35), .34, false, true);
        }
        yield;
      }
    }
    if (h - base > 2.0) {
      const yy = h - 1.32;
      for (let k = 0; k < bays; k++) window(f, (k + .5) * bw, yy, Math.min(1.5, bw * .52), 1.67, '#e4e1d5', '#737f7b');
      band(f, h - .13, .18, .42, '#dbd8cc');
      if (street && f.len > 4 && f.len < 13) {
        const shape = new T.Shape();shape.moveTo(-f.len / 2, 0);shape.lineTo(f.len / 2, 0);
        shape.quadraticCurveTo(f.len * .31, .95, 0, 1.0);shape.quadraticCurveTo(-f.len * .31, .95, -f.len / 2, 0);shape.closePath();
        const g = new T.ShapeGeometry(shape, 12), pt = f.at(f.len / 2, .06);g.rotateY(angle(f));g.translate(pt[0], f.y + h - .08, pt[1]);m.put(g, '#a65b50');
      }
    }
    yield;
  }

  function* milestiFace(b: Building, f: Facade) {
    const n = normal(f), street = n[0] < -.82, h = b.height;
    if (!street) {
      a.cornice(f, h, b.trim);
      if (f.len > 3) yield* a.windows(f, 3, h, Math.max(1, Math.round(f.len / 4.5)), 1.3, b.trim, '#a9b0a6');
      return;
    }
    const main = f.len > 7, base = 2.16;
    f.panel(f.len / 2, base / 2, .07, f.len, base, .14, '#4a6659');
    band(f, base + .04, .17, .40, '#c5ae69');
    if (!main) { yield; return; }
    const rowHeight = Math.max(2.65, (h - base) / 2), middle = f.len * .52;
    for (const row of [0, 1]) {
      const bottom = base + row * rowHeight;
      for (const u of [f.len * .18, f.len * .50, f.len * .82]) {
        if (Math.abs(u - middle) < .5) a.arch(f, u, bottom + .70, 1.35, 2.02, f.y, '#58717a', '#e5e3d5');
        else window(f, u, bottom + 1.72, 1.48, 1.91, '#e4e4d8', '#b3beb8');
      }
      if (row) ironBalcony(f, f.len / 2, bottom + .08, f.len + .12, 1.05, false, false);
      else {
        // The approach at the southern end interrupts the lower balcony rail.
        for (const hh of [.16, .99]) f.panel(f.len * .36, bottom + hh, 1.05, f.len * .72, .033, .035, '#45483c', true);
        for (let u = .08; u < f.len * .72; u += .25) f.panel(u, bottom + .56, 1.05, .025, .88, .035, '#45483c', true);
      }
      for (let yy = bottom + .30; yy < bottom + rowHeight - .2; yy += .22) f.panel(f.len / 2, yy, .035, f.len, .014, .022, '#d2d4c8', true);
      yield;
    }
    a.arch(f, f.len * .46, .12, 1.56, 1.62, f.y, '#48574b', '#c8ae61');
    grille(f, f.len * .46, .83, 1.36, 1.35, '#454b40');
    for (const u of [f.len * .24, f.len * .77]) {
      f.panel(u, h + .88, -.12, 2.08, 1.78, .25, '#e3e4d9');
      window(f, u, h + .82, 1.48, 1.40, '#e8e7dc', '#a4ada6');
      a.pediment(f, u, h + 1.77, 2.45, .66, f.y, '#d8dcce');
      const q = f.at(u, -.77);a.roof(q[0], q[1], 2.55, 2.05, f.y + h + 1.77, .68, '#8d7464');
    }
    f.label('MILEȘTI 12/2', f.len * .17, 4.46, .12, '#4d5d57');
    yield;
  }

  function conditioner(f: Facade, u: number, y: number) {
    f.panel(u, y, .60, .68, .45, .38, '#c0c3b7', true);
    for (let k = 0; k < 5; k++) f.panel(u, y - .16 + k * .08, .81, .54, .018, .026, '#727c77', true);
  }

  function* beautyFace(b: Building, f: Facade) {
    const west = normal(f)[0] < -.82, bays = Math.max(1, Math.round(f.len / 2.65));
    band(f, .40, .80, .12, '#565955');
    band(f, 3.68, .19, .25, '#8e8985');
    band(f, b.height - .08, .23, .32, '#98928e');
    if (!west) {
      if (f.len > 3) yield* a.windows(f, 2, b.height, Math.max(1, Math.round(f.len / 4)), 2.0, '#a4a19a', '#66736e');
      return;
    }
    for (let k = 0; k < bays; k++) {
      const u = (k + .5) * f.len / bays, w = Math.min(2.13, f.len / bays - .35);
      glazing(f, u, .76, w, 2.36, '#4f5654', '#536b69');
      window(f, u, 5.35, w * .83, 1.92, '#99958e', '#65706b');
      yield;
    }
    for (let yy = .95; yy < b.height - .4; yy += .40) f.panel(f.len / 2, yy, .031, f.len, .018, .027, '#6d6d67', true);
    const p = f.at(f.len / 2);
    if (p[1] > 472.8 && f.len > 3.2) {
      f.panel(f.len / 2, 3.51, .30, f.len, .65, .30, '#68656c');
      f.label(p[1] < 477.3 ? 'BEAUTY' : 'PRODUCTS', f.len / 2, 3.42, .27, '#e0dfdc', .48);
    }
    // The pink upper wall/mansard is visible above the commercial frontage;
    // its exact roof profile and concealed rear remain estimates.
    f.panel(f.len / 2, b.height + .47, -.05, f.len, .94, .22, '#bf80aa');
    if (f.len > 3.4) {
      window(f, f.len * .52, b.height + .52, 1.25, .76, '#b784a1', '#61676b');
      f.panel(f.len * .12, b.height + .70, .09, .48, 1.40, .45, '#be7ca5');
    }
    yield;
  }

  function* ciufleaResidentialFace(b: Building, f: Facade) {
    const n = normal(f), west = n[0] < -.82, radma = b.style === 'radma6';
    const groundTop = radma ? 4.5 : 3.8, upper = Math.max(1, b.levels - 1), step = (b.height - groundTop) / upper;
    const bays = Math.max(1, Math.round(f.len / (west ? 2.65 : 3.85))), bw = f.len / bays;
    band(f, .75, 1.50, .14, '#717974');
    for (let yy = .17; yy < 1.45; yy += .24) f.panel(f.len / 2, yy, .09, f.len, .018, .035, '#a2a69c', true);
    if (west) {
      const p = f.at(f.len / 2), radmaEntranceFace = radma && p[1] < 490 && f.len > 6;
      if (radmaEntranceFace) {
        const u = f.len * .64;
        glazing(f, u, 1.50, Math.min(4.65, f.len * .62), 2.60, '#e2e2d7', '#536d73');
        glazing(f, f.len * .73, .16, Math.min(2.0, f.len * .27), .82, '#e2e2d9', '#92a5a6');
        f.panel(f.len / 2, 4.52, .28, f.len + .08, .70, .41, '#5b5553');
        f.label('RADMA', f.len * .62, 2.0, .40, '#dadfd6', .23);
        f.label('COVOARE · PARCHET', f.len / 2, 4.45, .19, '#dddcd3', .52);
      } else {
        for (let k = 0; k < bays; k++) glazing(f, (k + .5) * bw, .80, Math.max(.7, bw - .44), groundTop - 1.30, '#747a74', '#4e6261');
      }
    }
    for (let row = 0; row < upper; row++) {
      const bottom = groundTop + row * step, yy = bottom + step * .55;
      if (west && (radma || row % 2 === 0)) {
        f.panel(f.len / 2, bottom + .35, .09, f.len, .70, .18, '#b46f56');
        band(f, bottom + .78, .095, .28, '#dddcd0');
      }
      for (let k = 0; k < bays; k++) {
        const u = (k + .5) * bw, broad = west && (radma || k % 3 === 0), width = Math.min(broad ? 2.15 : 1.45, bw * (broad ? .84 : .60));
        window(f, u, yy, width, Math.min(1.85, step * .65), '#e2e5dd', '#bdc6c0');
        if (west && !radma && k % 3 === 0) {
          ironBalcony(f, u, bottom + .1, Math.min(bw, 2.85), .63, false, false);
          if (row % 4 === 1) glazing(f, u, bottom + .36, Math.min(bw - .10, 2.65), step - .40, '#d4dad4', '#78959b');
        }
        if (west && (row * bays + k) % 5 === 3) conditioner(f, u + width * .37, bottom + .25);
        yield;
      }
    }
    for (const u of [0, f.len]) f.panel(u, b.height / 2, .12, .23, b.height, .24, '#c5c7bd');
    band(f, b.height - .14, .22, .45, '#d9dbcf');
    if (west) band(f, b.height + .35, .70, .18, '#b6b6aa');
    yield;
  }

  function physicalSlab(ring: XY[], heightAt: (x: number, z: number) => number, color: string, thickness = .24) {
    const shape = new T.Shape();ring.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));shape.closePath();
    const g = new T.ExtrudeGeometry(shape, {depth: thickness, bevelEnabled: false, steps: 1});g.rotateX(-Math.PI / 2);
    const vertices = g.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i);
      vertices.setY(i, heightAt(x, z) + vertices.getY(i) - thickness);
    }
    g.computeVertexNormals();m.put(g, color, false, true);
  }

  function originalFace(b: Building, target: XY, test: (f: Facade) => boolean) {
    const y = ground(...b.anchor as XY) + .12;
    const fs = a.faces(b.p as XY[], y).filter(test);
    return fs.sort((a, b) => pointSegmentDistance(target, a.at(0), a.at(a.len)) - pointSegmentDistance(target, b.at(0), b.at(b.len)))[0];
  }

  function nr1Stair(b: Building) {
    const west = b.id.startsWith('cladiri.37544/'), target: XY = west ? [1630.7, 557.5] : [1637.3, 560.8];
    const f = originalFace(b, target, f => normal(f)[1] < -.75 && f.len > 5);
    if (!f) return;
    const u = f.len / 2, steps = 7, rise = .98, landing = 1.55, run = steps * .29;
    const point = (uu: number, v: number): XY => {
      const p = f.at(uu), nearJoin = Math.hypot(p[0] - 1633.90, p[1] - 559.05) < .1;
      // Matching miter at the two independently mapped curved-front bodies.
      return nearJoin ? [p[0] + .4460 * v, p[1] - .8951 * v] : f.at(uu, v);
    };
    const tread = (near: number, far: number, offset: number) => {
      const ring = [point(0, near), point(f.len, near), point(f.len, far), point(0, far)];
      physicalSlab(ring, (x, z) => surfaceGround(x, z) + .035 + offset, '#929a9a');
    };
    tread(.14, landing + .18, rise);
    for (let k = 0; k < steps; k++) tread(landing + .18 + k * .29, landing + .18 + (k + 1) * .29, rise - k * rise / steps);
    const bottom = surfaceGround(...f.at(u, .70)) + .035 + rise - f.y;
    glazing(f, u, bottom, 4.25, 2.72, '#414b50', '#557d90');
    for (const du of [-1.0, 1.0]) f.panel(u + du, bottom + 1.35, .24, .065, 2.65, .08, '#bcc4c2', true);
    f.panel(u, bottom + 2.93, .39, 4.67, .25, .62, '#424d53');
    f.label('HYPERMARKET', u, bottom + 3.35, .30, '#f0ede2', .48);
    if (west) f.label('Nr1', .23, 5.86, 1.12, '#d7d7cb', .43);
    const railUs = west ? [0] : [f.len];
    for (const uu of railUs) {
      const p = point(uu + (west ? .07 : -.07), .28), q = point(uu + (west ? .07 : -.07), run + landing + .16);
      const topP = surfaceGround(...p) + .035 + rise, topQ = surfaceGround(...q) + .035;
      for (const hh of [.45, .94]) m.beam(new T.Vector3(p[0], topP + hh, p[1]), new T.Vector3(q[0], topQ + hh, q[1]), .025, '#a4afad');
      for (const [xy, top] of [[p, topP], [q, topQ]] as [XY, number][]) m.box(xy[0], top + .47, xy[1], .034, .94, .034, '#a4afad', true, true);
    }
    register(b, f, u, f.len, rise, landing, steps, [f.at(u, run + landing + .85), f.at(u, .55)], 'normal',
      'Two glazed Nr1 portals and shared broad stair in In The Capital Jul2025 sv18;7risers and .98m rise are dimensional estimates.');
    if (!west) nr1Ramp(b, f, u, rise);
  }

  function nr1Ramp(b: Building, doorFace: Facade, doorU: number, rise: number) {
    // The photographed ramp follows the frontage toward Dacia. Its start/end
    // and slope are estimates within the observed retail apron.
    const path: XY[] = [[1640.57, 562.41], [1647.64, 566.54], [1652.37, 569.80]];
    const y = ground(...b.anchor as XY) + .12, lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0), cumulative = [0];lengths.forEach(v => cumulative.push(cumulative.at(-1)! + v));
    const normals = path.slice(1).map((p, i) => {const dx = p[0] - path[i][0], dz = p[1] - path[i][1], l = Math.hypot(dx, dz);return [dz / l, -dx / l] as XY;});
    const offset = (index: number, v: number): XY => {
      let n = normals[Math.min(index, normals.length - 1)];
      if (index > 0 && index < path.length - 1) {
        const a = normals[index - 1], b = normals[index], nx = a[0] + b[0], nz = a[1] + b[1], len = Math.hypot(nx, nz), dot = (nx * a[0] + nz * a[1]) / len;
        n = [nx / len / dot, nz / len / dot];
      }
      return [path[index][0] + n[0] * v, path[index][1] + n[1] * v];
    };
    // The ramp turns onto the stair landing. Use that landing's actual end
    // edge for the upper rim, rather than a second perpendicular through the
    // approximate path anchor: the latter leaves a narrow, full-height gap.
    // The reviewed approach coordinates remain unchanged.
    const rim = (index: number, v: number): XY => index === 0 ? doorFace.at(0, v) : offset(index, v);
    for (let i = 1; i < path.length; i++) {
      const p = path[i - 1], q = path[i], dx = q[0] - p[0], dz = q[1] - p[1], l2 = dx * dx + dz * dz;
      const height = (x: number, z: number) => surfaceGround(x, z) + .035 + rise * (1 - (cumulative[i - 1] + Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / l2)) * lengths[i - 1]) / total);
      physicalSlab([rim(i - 1, .18), rim(i, .18), rim(i, 1.68), rim(i - 1, 1.68)], height, '#929a9a');
      for (const v of [.22, 1.64]) {
        const pa = rim(i - 1, v), pb = rim(i, v);
        for (const h of [.42, .93]) m.beam(new T.Vector3(pa[0], height(...pa) + h, pa[1]), new T.Vector3(pb[0], height(...pb) + h, pb[1]), .024, '#a7b1af');
        const count = Math.max(1, Math.ceil(lengths[i - 1] / 2));
        for (let k = 0; k <= count; k++) {const x = pa[0] + (pb[0] - pa[0]) * k / count, z = pa[1] + (pb[1] - pa[1]) * k / count;m.box(x, height(x, z) + .46, z, .032, .92, .032, '#a7b1af', true, true);}
      }
    }
    const lower = offset(path.length - 1, .92), last = path.at(-1)!, before = path.at(-2)!, dx = last[0] - before[0], dz = last[1] - before[1], len = Math.hypot(dx, dz);
    register(b, doorFace, doorU, 1.50, rise, 1.55, 0, [[lower[0] + dx / len * .75, lower[1] + dz / len * .75], lower, offset(1, .92), offset(0, .92), doorFace.at(doorU, .92)], 'ramp',
      'Continuous lateral Nr1 ramp toward Dacia is visible in Jul2025 sv16/sv17 and nr1-09; length and slope are estimates.');
    entries.at(-1)!.run = total;
  }

  function milestiEntrances(b: Building) {
    const faces = a.faces(b.p as XY[], ground(...b.anchor as XY) + .12).filter(f => normal(f)[0] < -.82);
    const main = faces.find(f => f.len > 7), small = faces.find(f => f.len > 1.5 && f.len < 3.2);
    if (main) {
      const door = main.len * .84, center = main.len * .85, rise = 2.08, steps = 14, length = 1.70, run = steps * .29;
      const topAt = (u: number) => surfaceGround(...main.at(u, 2.75)) + .035 + rise;
      stairTread(main, main.len / 2, main.len, .12, 1.12, topAt, '#858c80');
      stairTread(main, center, length, .12, 2.36, topAt, '#858c80');
      for (let k = 0; k < steps; k++) stairTread(main, center - length / 2 - (k + .5) * .29, .295, 1.20, 2.36,
        u => topAt(u) - k * rise / steps, '#858c80');
      for (const v of [1.22, 2.33]) {
        const startU = center - length / 2 - run, endU = center - length / 2, start = main.at(startU, v), end = main.at(endU, v);
        for (const hh of [.18, .93]) m.beam(new T.Vector3(start[0], topAt(startU) - rise + hh, start[1]), new T.Vector3(end[0], topAt(endU) + hh, end[1]), .026, '#474d40');
        for (let k = 0; k <= steps; k += 2) {
          const u = startU + run * k / steps, p = main.at(u, v), top = topAt(u) - rise + rise * k / steps;
          m.box(p[0], top + .46, p[1], .028, .92, .028, '#474d40', true, true);
        }
      }
      const bottom = topAt(door) - main.y;shared.door(main, door, bottom, 1.13, 2.35, '#b6c3b8');
      register(b, main, door, 1.16, rise, length, steps,
        [main.at(center - length / 2 - run - .75, 1.80), main.at(center - length / 2 + .15, 1.80), main.at(door, 1.80), main.at(door, .55)], 'lateral',
        'Milești12/2 original imperial-01/fahitas-04 and Sep2025 sv11/sv14 confirm a raised balcony entrance and lateral iron stair;14risers and2.08m rise are estimates.');
    }
    if (small) {
      const bottom = threshold(b, small, small.len / 2, Math.min(1.30, small.len - .35), '#3e504d',
        'Fahitas ground-level arched portal is directly visible in identified Milești12/2 photographs; no stair is visible at this threshold.');
      a.arch(small, small.len / 2, bottom, Math.min(1.43, small.len - .20), 2.45, small.y, '#405251', '#d2c295');
      small.panel(small.len / 2, bottom + 2.88, .28, small.len + .12, .80, .36, '#364641');
      small.label('FAHITAS KEBAB', small.len / 2, bottom + 2.80, .15, '#c2cb63', .49);
    }
  }

  function radmaEntrance(b: Building) {
    const f = originalFace(b, [1733.1, 483.3], f => normal(f)[0] < -.82 && f.len > 6);
    if (!f) return;
    const u = f.len * .21, width = 1.64, steps = 11, rise = 1.65, landing = .90;
    const bottom = entry(b, f, u, width, steps, rise, landing, true, '#c9d1c7',
      'Undated original radma-entrance-undated.jpg visibly shows a raised white door, approximately10–11 cream risers and wrought-iron rail; visual body association confirmed against Sep2025 sv10.11risers/1.65m rise and placement are estimates.', '#cec4ac');
    glazing(f, u, bottom, 1.13, 2.54, '#e0e3d7', '#657871');
    // In the source the side of the landing projects over a basement window.
    const outer = u - width / 2 + .03;
    for (let k = 0; k < 6; k++) {
      const v = .25 + k * (landing - .16) / 5, p = f.at(outer, v);
      const yy = surfaceGround(...f.at(u, steps * .29 + landing + .35)) + .035 + rise;
      m.box(p[0], yy + .44, p[1], .024, .85, .024, '#4b5149', true);
    }
  }

  function* detail(b: Building, f: Facade): Generator<void> {
    if (b.parts?.length) { yield; return; }
    if (b.style === 'midtownOfficial') yield* midtownFace(b, f);
    else if (b.style.startsWith('nr1')) yield* nr1Face(b, f);
    else if (b.style === 'milesti12Commercial') yield* milestiFace(b, f);
    else if (b.style === 'beautyPink') yield* beautyFace(b, f);
    else if (b.style === 'radma6' || b.style === 'ciuflea4Tower') yield* ciufleaResidentialFace(b, f);
    else yield;
  }

  function* detailExtra(b: Building): Generator<void> {
    if (extrasDone.has(b.id)) return;
    extrasDone.add(b.id);
    if (b.parts?.length) for (const {f, part, base} of exposedFaces(b)) {
      if (b.style === 'midtownOfficial') yield* midtownFace(part, f, base);
      else if (b.style.startsWith('nr1')) yield* nr1Face(part, f, base);
      else yield;
    }
    if (b.id.startsWith('cladiri.37544/') || b.id.startsWith('cladiri.12706/')) nr1Stair(b);
    if (b.style === 'milesti12Commercial') milestiEntrances(b);
    if (b.style === 'radma6') radmaEntrance(b);
    yield;
  }

  return {a, normal, handles, detail, detailExtra, entryRoutes: () => entries,
    thresholdRoutes: () => thresholds, customRoof: (_b: Building) => false};
}
