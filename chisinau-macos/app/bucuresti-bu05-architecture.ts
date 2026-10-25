import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import {pointSegmentDistance, type XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

export type BucurestiBu05EntryRoute = {
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
  approach: 'normal' | 'lateral';
  evidence: string;
  accessStatus: 'entry' | 'blocked-historical-portal';
  heightSource: 'photographic-dimension-estimate';
};

/** Original shared-material elevations for Ismail–Lev Tolstoi. Metric sizes are
 * photographic estimates; the supplied FNDG polygons remain the source of plan
 * geometry. Dated source differences are recorded in the BUC05 reference folder. */
export function bucurestiBu05Architecture(m: Mesh, ground: (x: number, z: number) => number,
  surfaceGround: (x: number, z: number) => number = ground) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const entries: BucurestiBu05EntryRoute[] = [];
  const thresholds: BucurestiBu05EntryRoute[] = [];
  const routeKeys = new Set<string>();
  const specialDone = new Set<string>();

  function handles(b: Building, f: Facade) {
    if (f.len < .60) return false;
    const n = normal(f), p = f.at(f.len / 2);
    if (['atelier4', 'siopi6', 'classic6East'].includes(b.style)) return n[1] > .82 && p[1] > 456;
    if (b.style === 'flowerCorner') return (n[1] > .50 && p[1] > 457) || (n[0] > .65 && p[0] > 1535.5);
    if (b.style === 'tolstoiRelief') return (n[1] < -.82 && p[1] < 482) || (n[0] > .50 && p[0] > 1553);
    if (['weatheredGreenHouse', 'whiteSalon'].includes(b.style)) return n[1] < -.82 && p[1] < 482;
    if (b.style === 'grayMansard5') return (n[1] < -.82 && p[1] < 482) || (n[0] < -.82 && p[0] < 1487.2);
    if (b.style === 'mua1') return n[1] < -.82 && p[1] < 482;
    if (b.style === 'kareliaCorner') return (n[1] > .82 && p[1] > 457) || (n[0] < -.82 && p[0] < 1580);
    if (b.style === 'tofanMansard') return true;
    if (b.style === 'hotelMixed') return true;
    if (b.style === 'artDental2') return true;
    return false;
  }

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
    points: XY[], approach: 'normal' | 'lateral', evidence: string, target = entries,
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

  function relief(f: Facade, u: number) {
    // Small original geometric relief. Facial, uniform and inscription details
    // cannot be surveyed from these photographs and remain a simplified model.
    const p = f.at(u, .29), orient = angle(f);
    const ellipsoid = (du: number, h: number, v: number, sx: number, sy: number, sz: number, color: string) => {
      const q = f.at(u + du, v), g = new T.SphereGeometry(1, 10, 8);
      g.scale(sx, sy, sz);g.rotateY(orient);g.translate(q[0], f.y + h, q[1]);m.put(g, color, true);
    };
    f.panel(u, 2.22, .18, .95, 1.93, .20, '#d6d6c9');
    ellipsoid(0, 2.18, .39, .40, .53, .17, '#898b7c');
    ellipsoid(0, 2.83, .48, .20, .29, .14, '#b7a18a');
    ellipsoid(0, 3.05, .45, .22, .13, .16, '#645846');
    ellipsoid(.05, 2.82, .61, .055, .08, .06, '#bdad93');
    f.panel(u, 2.39, .57, .15, .29, .055, '#d0c5af', true);
    for (const sign of [-1, 1]) {
      f.panel(u + sign * .29, 2.48, .52, .23, .10, .07, '#ba9f58', true);
      for (let j = 0; j < 3; j++) f.panel(u + sign * .11, 1.96 + j * .17, .57, .045, .045, .03, '#bba964', true);
    }
    m.box(p[0], f.y + 1.35, p[1], .76, .09, .48, '#aaa99a', true, false, orient);
  }

  function curvedBalcony(f: Facade, u: number, yy: number, width: number) {
    const ring: XY[] = [f.at(u - width / 2, .17), f.at(u + width / 2, .17)];
    const railPoints: XY[] = [];
    for (let i = 0; i <= 12; i++) {
      const du = width / 2 - width * i / 12, v = .67 + .46 * Math.sin(Math.PI * i / 12);
      const p = f.at(u + du, v);ring.push(p);railPoints.push(p);
      m.box(p[0], f.y + yy + .56, p[1], .024, .92, .024, '#665842', true);
      if (i % 2 === 0) {const g = new T.TorusGeometry(.115, .013, 4, 10);g.rotateY(angle(f));g.translate(p[0], f.y + yy + .63, p[1]);m.put(g, '#665842', true);}
    }
    ring.push(ring[0]);m.solid(ring, .15, f.y + yy - .15, '#d3d0ba', false);
    for (let i = 1; i < railPoints.length; i++) for (const dh of [.13, .98]) {
      const p = railPoints[i - 1], q = railPoints[i];m.beam(new T.Vector3(p[0], f.y + yy + dh, p[1]), new T.Vector3(q[0], f.y + yy + dh, q[1]), .024, '#665842');
    }
  }

  function gableOnFace(f: Facade, bottom: number, zMid: number, zRun: number, rise: number, color: string) {
    const zs = [f.at(0)[1], f.at(f.len)[1]], points = [{u: 0, z: zs[0]}, {u: f.len, z: zs[1]}];
    const middle = uAt(f, zMid, 1);if (middle !== null && middle > .01 && middle < f.len - .01) points.push({u: middle, z: zMid});
    points.sort((a, b) => a.u - b.u);
    const shape = new T.Shape();shape.moveTo(0, bottom);shape.lineTo(f.len, bottom);
    for (const p of [...points].reverse()) shape.lineTo(p.u, bottom + Math.max(0, rise * (1 - Math.abs(p.z - zMid) / zRun)));
    shape.closePath();const g = new T.ShapeGeometry(shape), origin = f.at(0, .06);g.rotateY(angle(f));g.translate(origin[0], f.y, origin[1]);m.put(g, color);
  }

  function clipAxis(ring: number[][], axis: 0 | 1, value: number, keepAbove: boolean): XY[] {
    const source = ring.slice(0, -1), out: XY[] = [];
    const inside = (p: number[]) => keepAbove ? p[axis] >= value - 1e-7 : p[axis] <= value + 1e-7;
    for (let i = 0; i < source.length; i++) {
      const p = source[i], q = source[(i + 1) % source.length], pi = inside(p), qi = inside(q);
      if (pi) out.push([p[0], p[1]]);
      if (pi !== qi) {const t = (value - p[axis]) / (q[axis] - p[axis]);out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);}
    }
    if (out.length > 2) out.push([...out[0]] as XY);
    return out;
  }

  function* roofSurface(p: XY[], holes: XY[][], y: number, heightAt: (p: XY) => number, color: string): Generator<void> {
    if (p.length < 4) return;
    const shape = new T.Shape();p.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
    for (const ring of holes) {const hole = new T.Path();ring.forEach(([x, z], i) => i ? hole.lineTo(x, -z) : hole.moveTo(x, -z));shape.holes.push(hole);}
    const source = new T.ShapeGeometry(shape);source.rotateX(-Math.PI / 2);const g = source.toNonIndexed(), vertices = g.attributes.position, out: number[] = [];
    const vertex = (p: XY) => [p[0], y + heightAt(p), p[1]];
    function tri(p: XY, q: XY, r: XY, level = 0) {
      const lengths = [Math.hypot(q[0] - p[0], q[1] - p[1]), Math.hypot(r[0] - q[0], r[1] - q[1]), Math.hypot(p[0] - r[0], p[1] - r[1])];
      if (level < 9 && Math.max(...lengths) > 2.3) {
        const edge = lengths.indexOf(Math.max(...lengths));
        if (edge === 0) {const s: XY = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];tri(p, s, r, level + 1);tri(s, q, r, level + 1);}
        else if (edge === 1) {const s: XY = [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2];tri(p, q, s, level + 1);tri(p, s, r, level + 1);}
        else {const s: XY = [(r[0] + p[0]) / 2, (r[1] + p[1]) / 2];tri(p, q, s, level + 1);tri(s, q, r, level + 1);}
      } else out.push(...vertex(p), ...vertex(q), ...vertex(r));
    }
    for (let i = 0; i < vertices.count; i += 3) {
      tri([vertices.getX(i), vertices.getZ(i)], [vertices.getX(i + 1), vertices.getZ(i + 1)], [vertices.getX(i + 2), vertices.getZ(i + 2)]);
      if (i % 18 === 0) yield;
    }
    source.dispose();g.dispose();const result = new T.BufferGeometry();result.setAttribute('position', new T.Float32BufferAttribute(out, 3));result.computeVertexNormals();m.put(result, color, false, true);
  }

  const customRoof = (b: Building) => b.style === 'grayMansard5' || b.style === 'tofanMansard';
  function* detailExtra(b: Building): Generator<void> {
    if ((!customRoof(b) && b.style !== 'hotelMixed') || specialDone.has(b.id)) return;
    specialDone.add(b.id);
    const y = ground(...b.anchor as XY) + .12;
    if (b.style === 'hotelMixed') {
      const rear = b.parts?.find(p => (p.height ?? 0) > 7);
      if (rear?.p) for (const f of a.faces(rear.p as XY[], y)) {
        const n = normal(f), p = f.at(f.len / 2);
        if (n[1] < -.8 && Math.abs(p[1] - 486) < .2) yield* hotelTower(b, f, rear.height ?? 9.7, true);
      }
      // A small pointed roof ornament is visible in the western panorama;
      // placement and dimensions within the rear volume are photographic estimates.
      const turret = new T.ConeGeometry(.82, 1.85, 4);turret.rotateY(Math.PI / 4);turret.translate(1465.65, y + 11.38, 493.45);m.put(turret, '#756d5d');
      return;
    }
    if (b.style === 'grayMansard5') {
      const zs = b.p.map(p => p[1]), lo = Math.min(...zs), hi = Math.max(...zs), mid = (lo + hi) / 2, run = (hi - lo) / 2;
      for (const [min, max] of [[lo, mid], [mid, hi]]) {
        const ring = clipAxis(clipAxis(b.p, 1, min, true), 1, max, false);
        yield* roofSurface(ring, [], y, p => b.height + .20 + b.roofRise * Math.max(0, 1 - Math.abs(p[1] - mid) / run), b.roof);
      }
    } else {
      for (const source of b.parts ?? [b]) {
        const part = {...b, ...source, parts: undefined}, p = part.p as XY[], holes = part.holes as XY[][];
        if (part.height > 5) {
          const lo = 1591.8967, hi = 1603.4245, quarter = (hi - lo) / 4, peaks = [lo + quarter, hi - quarter];
          const xs = p.map(v => v[0]), cuts = [Math.min(...xs), peaks[0], (lo + hi) / 2, peaks[1], hi, Math.max(...xs)].sort((a, b) => a - b);
          for (let i = 1; i < cuts.length; i++) {
            if (cuts[i] - cuts[i - 1] < .001) continue;
            const ring = clipAxis(clipAxis(p, 0, cuts[i - 1], true), 0, cuts[i], false);
            yield* roofSurface(ring, [], y, q => part.height + .20 + part.roofRise * Math.max(0, 1 - Math.min(...peaks.map(x => Math.abs(q[0] - x))) / quarter), part.roof);
          }
        } else {
          const xs = p.map(v => v[0]), zs = p.map(v => v[1]);
          const run = Math.max(2, Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2);
          yield* roofSurface(p, holes, y, q => {
            let distance = Infinity;for (const ring of [p, ...holes]) for (let i = 1; i < ring.length; i++) distance = Math.min(distance, pointSegmentDistance(q, ring[i - 1], ring[i]));
            return part.height + .20 + part.roofRise * Math.min(1, distance / run);
          }, part.roof);
        }
      }
    }
  }

  function* hotelTower(b: Building, f: Facade, height: number, front: boolean): Generator<void> {
    a.cornice(f, height, '#dfdfd3');
    for (const yy of [3.18, 6.35]) band(f, yy, .16, .24, '#dadbcf');
    const bays = front ? 2 : Math.max(1, Math.round(f.len / 4.0));
    for (let i = 0; i < bays; i++) {
      const u = (i + .5) * f.len / bays, width = Math.min(1.18, f.len / bays * .46);
      for (const cy of [1.72, 4.85, 7.95]) {
        window(f, u, cy, width, 1.70, '#d7d9ce', '#a3b0a2');
        if (front) a.arch(f, u, cy + .84, width + .15, .72, f.y, '#dddccf', '#e2e0d2', 0);
      }
      if (i % 2 === 0 && !front) f.panel(u + .89, 5.63, .42, .62, .45, .35, '#c0c9b8');
      yield;
    }
    if (front) for (const u of [.21, f.len - .21]) {
      f.panel(u, height / 2, .13, .35, height, .26, '#deded2');
      for (let yy = .25; yy < height - .3; yy += .47) f.panel(u, yy, .19, .47, .25, .25, '#e0dfd3');
    }
  }

  function* hotelFacade(b: Building, f: Facade): Generator<void> {
    const n = normal(f), p = f.at(f.len / 2);
    if (n[1] < -.82 && p[1] < 481) {
      const h = 3.35;
      band(f, .24, .48, .14, '#8d8b7a');
      f.panel(f.len / 2, 1.67, .17, f.len - .30, 2.64, .05, '#72867a', false, 1);
      const count = 4;
      for (let i = 0; i <= count; i++) f.panel(.15 + (f.len - .30) * i / count, 1.67, .23, .09, 2.68, .10, '#5a5745');
      band(f, h - .22, .62, .24, '#744c4e');
      f.label('BellaDonna', f.len * .5, h - .31, .34, '#c6c4aa', .32);
      const u = uAt(f, 1469.15) ?? f.len / 2;
      threshold(b, f, u, 1.05, '#5f7167',
        'Two September2025 views confirm the glazed BellaDonna pavilion door on21336; no substantial staircase is readable, so model approach ends at a ground-level threshold, with metric placement estimated');
      yield;return;
    }
    const cut = uAt(f, 486, 1), cuts = [0, ...(cut === null ? [] : [cut]), f.len].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] - cuts[i - 1] < .10) continue;
      const ff = m.facade(f.at(cuts[i - 1]), f.at(cuts[i]), f.y);
      if (ff.at(ff.len / 2)[1] >= 486) yield* hotelTower(b, ff, 9.7, false);
      else {
        band(ff, .77, 1.54, .12, '#694e43');
        ff.panel(ff.len / 2, 2.21, .14, Math.max(.35, ff.len - .22), 1.22, .04, '#4c5d51', false, 1);
        for (let u = .1; u < ff.len; u += 1.3) ff.panel(u, 2.21, .21, .07, 1.27, .08, '#bbb9a5');
        band(ff, 3.22, .18, .24, '#b9baa7');
      }
      yield;
    }
  }

  function* detail(b: Building, f: Facade): Generator<void> {
    const h = b.height, n = normal(f);
    if (b.style === 'siopi6') {
      band(f, 1.42, 2.84, .10, '#c7c7b7');band(f, 3.03, .84, .23, '#d5d4c5');
      for (let u = .10; u < f.len; u += 1.15) f.panel(u, 1.48, .15, .025, 2.94, .025, '#858b7c', true);
      for (const x of [1480.98, 1485.53]) {const u = uAt(f, x);if (u !== null) window(f, u, 1.96, .85, .94, '#d9d9ce', '#45524a');}
      const u = uAt(f, 1482.58), c = uAt(f, 1483.17);
      if (u !== null && c !== null) {
        lateralPlatform(b, f, u, c, 3.36, 1.08, 3, .39, [-1, 1], false, '#354740',
          'September2025 mid-north: one glazed SIOPI door served by a broad platform and approximately three lateral risers at each end; no front staircase or railing observed');
      }
      const signU = uAt(f, 1483.18) ?? f.len * .65;
      f.label('CEST CHER  ·  SIOPI', signU, 2.99, .23, '#44483e', .30);
      f.label('MADE IN MOLDOVA', signU, 2.77, .10, '#54584b', .30);
      yield;return;
    }
    if (b.style === 'classic6East') {
      band(f, .37, .74, .14, '#908578');a.cornice(f, h, b.trim);
      band(f, 3.50, .18, .28, b.trim);band(f, 3.76, .16, .40, b.trim);
      const lo = 1486.9214, pitch = (1501.4177 - lo) / 5;
      for (let i = 0; i < 5; i++) {
        const u = uAt(f, lo + (i + .5) * pitch);if (u === null) continue;
        if (i === 1) entry(b, f, u, 1.78, 2, .28, .58, false, '#8a4f47',
          'September2025 mid-north-twostorey: red door in the second axis from west, two frontal steps and small grey landing; dimensions estimated');
        else window(f, u, 1.96, 1.12, 1.86, b.trim, '#7b6555');
        window(f, u, 5.25, 1.10, 1.91, b.trim, '#7b6555');
        for (const sign of [-1, 1]) {
          f.panel(u + sign * pitch * .41, 3.38, .12, .23, 6.42, .24, b.trim);
          for (const yy of [.79, 3.18, 3.92]) f.panel(u + sign * pitch * .41, yy, .23, .36, .17, .36, b.trim);
        }
        if ([0, 1, 4].includes(i)) {
          const rise = i === 1 ? .76 : .44;
          f.panel(u, h + rise / 2, .13, pitch * .92, rise, .27, b.wall);
          f.panel(u, h + rise, .23, pitch, .13, .46, b.trim);
        }
        f.panel(u + pitch * .38, 3.44, .33, .08, 6.70, .08, '#965a4f', true);
        yield;
      }
      return;
    }
    if (b.style === 'weatheredGreenHouse') {
      band(f, .54, 1.08, .11, '#7c8276');band(f, h - .14, .18, .21, '#9ba08d');
      for (let i = 0; i < 3; i++) {
        const u = (i + .5) * f.len / 3;
        window(f, u, 2.20, 1.02, 1.70, '#769169', '#74866b');
        f.panel(u, 2.57, .48, 1.0, .055, .06, '#78916b', true);
      }
      for (const [u, yy, w] of [[f.len * .19, .95, .85], [f.len * .70, .73, 1.22], [f.len * .48, 3.35, 1.08]])
        f.panel(u, yy, .075, w, .23, .035, '#8f9387', true);
      yield;return;
    }
    if (b.style === 'grayMansard5') {
      band(f, .34, .68, .12, '#777e72');
      if (n[1] < -.82) {
        band(f, 1.51, 2.42, .14, '#303b37');
        for (let u = .08; u < f.len; u += .19) f.panel(u, 1.52, .17, .025, 2.4, .025, '#4b5449', true);
        band(f, h - .18, .19, .24, '#a4aa98');
      } else {
        const zMid = 487.92, zRun = 8.15;gableOnFace(f, h, zMid, zRun, b.roofRise, '#e0e3d8');
        for (const z of [485.25, 487.05, 488.85, 490.65]) {
          const u = uAt(f, z, 1);if (u !== null) window(f, u, h + 1.25, .82, 1.70, '#e5e7df', '#a8b6ab');
        }
        for (const z of [482.1, 485.1, 488.3, 491.4]) {
          const u = uAt(f, z, 1);if (u !== null) window(f, u, 2.12, .82, 1.64, '#c7c9b9', '#575f52');
        }
      }
      yield;return;
    }
    if (b.style === 'whiteSalon') {
      band(f, .31, .62, .14, '#424d43');a.cornice(f, h, b.trim);
      const glassU = uAt(f, 1497.65);if (glassU !== null) {
        f.panel(glassU, 1.84, .25, 3.90, 1.79, .055, '#374841', false, 1);
        for (const du of [-2.01, 2.01]) f.panel(glassU + du, 1.84, .31, .15, 2.04, .15, b.trim);
        for (const yy of [.89, 2.79]) f.panel(glassU, yy, .31, 4.15, .14, .15, b.trim);
      }
      const u = uAt(f, 1502.62);if (u !== null) {
        const bottom = entry(b, f, u, 1.55, 4, .52, .46, true, '#c2c9ba',
          'September2025 south-five190: eastern white door, approximately four metal/grey steps with dark railing and a small white curved canopy; sizes estimated');
        curvedCanopy(f, u, bottom + 2.40, 1.76, 1.10, '#d8dbd0');
      }
      const ac = uAt(f, 1496.0);if (ac !== null) {
        f.panel(ac, 3.00, .46, .74, .48, .40, '#c7cec0');
        for (let i = 0; i < 5; i++) f.panel(ac - .25 + i * .125, 3.00, .68, .02, .29, .025, '#7d8878', true);
      }
      yield;return;
    }
    if (b.style === 'kareliaCorner') {
      band(f, h - .08, .30, .36, b.trim);
      if (n[1] > .82) {
        const wood = segment(f, 1579.65, 1587.5);
        if (wood) {
          band(wood, 1.95, 3.40, .12, '#855a42');
          for (let yy = .35; yy < h; yy += .18) band(wood, yy, .019, .15, '#544534');
        }
        const doorU = uAt(f, 1582.75), centerU = uAt(f, 1586.00);
        if (doorU !== null && centerU !== null) lateralPlatform(b, f, doorU, centerU, 9.0, 1.20, 4, .52, [-1], true, '#cbd4c7',
          'Identifiable undated Karelia exterior photograph, facade corroborated by July2025 PhotoSphere: raised long deck, western lateral stair with approximately four risers and white rails; exact persistence and metric sizes estimated');
        for (const x of [1585.62, 1590.50]) {const u = uAt(f, x);if (u !== null) window(f, u, 1.97, 1.60, 2.35, '#dedfd3', '#859789');}
        f.panel(f.len / 2, h - .08, .94, f.len - .30, .18, 1.90, '#dfe1d6');
        const labelU = uAt(f, 1583.8) ?? f.len / 2;f.label('Karelia  SHOWROOM', labelU, h - .04, .24, '#60665b', 1.94);
        for (const x of [1579.46, 1587.72, 1591.60]) {const u = uAt(f, x);if (u !== null) f.panel(u, h / 2, .17, .42, h, .34, b.trim);}
      } else {
        const wood = segment(f, 449.10, 452.65, 1);
        if (wood) {
          band(wood, 1.95, 3.20, .13, '#825c43');
          for (let yy = .40; yy < h; yy += .18) band(wood, yy, .018, .16, '#554c3a');
          window(wood, wood.len / 2, 1.97, 1.45, 2.2, '#d9ddd0', '#7d8b7c');
          wood.panel(wood.len / 2, h - .10, .73, wood.len + .16, .16, 1.50, b.trim);
        }
      }
      yield;return;
    }
    if (b.style === 'tofanMansard') {
      if (n[1] > .82 && f.at(f.len / 2)[1] > 457) {
        const top = 5.8;
        band(f, .38, .76, .16, '#98937f');
        for (let yy = .82; yy < top; yy += .48) band(f, yy, .018, .12, '#afa78f');
        const wu = uAt(f, 1595.25), du = uAt(f, 1600.55);
        if (wu !== null) {window(f, wu, 1.85, 3.22, 2.10, '#c5bda6', '#705744');window(f, wu, 4.65, 2.65, 1.90, '#c5bda6', '#705744');}
        if (du !== null) {
          const bottom = entry(b, f, du, 2.50, 2, .26, .76, false, '#705746',
            'Identifiable undated Tofan exterior photographs, frontage corroborated July2025: low entrance platform and threshold under two columns; two low model risers and dimensions estimated');
          for (const sign of [-1, 1]) {const p = f.at(du + sign * 1.46, 1.12);a.column(p[0], p[1], f.y + bottom, 2.72, .18, '#d5d2bd', true);}
          shared.balcony(f, du, bottom + 2.85, 3.28, 1.36);
          shared.door(f, du, bottom + 3.00, 1.90, 2.30, '#806955');
        }
        for (const x of [1594.77865, 1600.54255]) {const u = uAt(f, x);if (u !== null) a.pediment(f, u, top + .05, 5.67, 1.12, f.y, '#d5d2bd');}
        if (wu !== null) {f.panel(wu, 3.30, .29, 4.20, .51, .25, '#d6cdb4');f.label('TOFAN prim', wu, 3.16, .31, '#426e4d', .45);}
      } else {
        const split = uAt(f, 453.8, 1), cuts = [0, ...(split === null ? [] : [split]), f.len].sort((a, b) => a - b);
        for (let i = 1; i < cuts.length; i++) {
          if (cuts[i] - cuts[i - 1] < .12) continue;
          const ff = m.facade(f.at(cuts[i - 1]), f.at(cuts[i]), f.y), top = ff.at(ff.len / 2)[1] >= 453.8 ? 5.8 : 3.7;
          band(ff, .35, .70, .12, '#98937f');band(ff, top - .12, .20, .25, b.trim);
          if (ff.len > 6) window(ff, ff.len * .48, 1.95, 1.05, 1.50, b.trim, '#766c57');
        }
      }
      yield;return;
    }
    if (b.style === 'mua1') {
      band(f, .46, .92, .12, '#81867a');band(f, h - .13, .18, .24, '#c7d0bd');
      for (const x of [1520.3, 1522.8, 1525.1]) {const u = uAt(f, x);if (u !== null) window(f, u, 2.38, 1.07, 1.64, b.trim, '#8c9c8e', true);}
      const shop = segment(f, 1526.7, 1537.45);
      if (shop) {
        band(shop, 3.81, .69, .36, '#28333d');
        const u = uAt(f, 1528.45), wu = uAt(f, 1531.50), logo = uAt(f, 1534.55);
        if (u !== null) lateralPlatform(b, f, u, u, 1.88, 1.26, 6, .78, [-1], true, '#4d5c50',
          'September2025 south-mua-entry: one raised MUA entrance, approximately six lateral risers from east toward west, pale stone landing and ornamental dark iron rails; sizes estimated', '#3c4b42', '#b5aa91');
        if (wu !== null) window(f, wu, 2.36, 1.46, 1.73, '#343c39', '#755a52');
        if (logo !== null) {f.panel(logo, 2.35, .18, 1.32, 1.73, .08, '#e0e3d7');f.label('mua', logo, 2.20, .34, '#35433e', .25);}
        const labelU = uAt(f, 1528.65) ?? shop.len / 2;f.label('mua', labelU, 3.64, .43, '#d7ded2', .40);
      }
      yield;return;
    }
    if (b.style === 'hotelMixed') {yield* hotelFacade(b, f);return;}
    if (b.style === 'artDental2') {
      if (n[0] > .82 && f.at(f.len / 2)[0] > 1555) {
        const low = segment(f, 424.60, 433.50, 1), clinic = segment(f, 433.50, 441.00, 1), white = segment(f, 441.00, 447.10, 1);
        if (low) {
          band(low, .40, .80, .12, '#7c8374');band(low, 3.50, .16, .20, '#9d9f8c');
          for (const z of [426.2, 428.4, 430.7]) {const u = uAt(low, z, 1);if (u !== null) window(low, u, 1.96, .84, 1.48, '#b0b4a2', '#828b79');}
        }
        if (clinic) {
          band(clinic, 3.30, 6.60, .10, '#c8be83');band(clinic, 6.49, .19, .26, '#dfddc4');
          for (const z of [434.75, 436.55]) {
            const u = uAt(clinic, z, 1);if (u === null) continue;
            for (const yy of [1.96, 5.03]) window(clinic, u, yy, .92, 1.75, '#e4e3d5', '#b5c1af');
          }
          const u = uAt(clinic, 438.92, 1);
          if (u !== null) {
            lateralPlatform(b, clinic, u, u, 2.20, 1.23, 5, .65, [1], true, '#bdcab9',
              'Undated identifiable Art-Dental exterior photographs: two visible levels, south-side entrance and about five lateral steps approached from north. Association, longitudinal divisions and metric dimensions are explicit visual inferences within official1829640.', '#5c5140', '#8d9182');
            shared.door(clinic, u, 3.55, 1.36, 2.35, '#c4cfc0');curvedBalcony(clinic, u, 3.50, 3.02);
          }
          const label = uAt(clinic, 435.75, 1);if (label !== null) clinic.label('ART DENTAL', label, 3.30, .23, '#e3dfcd', .25);
        }
        if (white) {
          band(white, 3.50, 7.0, .10, '#deded0');
          for (let yy = .32; yy < 6.9; yy += .45) band(white, yy, .018, .13, '#c3c4b3');
          for (const z of [442.25, 444.85]) {const u = uAt(white, z, 1);if (u !== null) for (const yy of [2.0, 5.25]) window(white, u, yy, 1.04, 1.76, '#e5e3d1', '#adb9a6');}
          band(white, 3.42, .18, .28, '#cdcdb8');band(white, 6.87, .19, .30, '#d6d5bf');
        }
      } else if (n[1] > .8 && f.at(f.len / 2)[1] > 446) {
        band(f, 3.24, .17, .20, '#9f6654');band(f, 6.88, .18, .22, '#cecdb6');
        if (f.len > 7) window(f, f.len * .30, 1.08, .68, .70, '#d7d9c7', '#7b8875');
      } else {
        const mid = f.at(f.len / 2)[1], top = mid < 433.5 ? 3.7 : mid < 441 ? 6.6 : 7.0;
        band(f, .34, .68, .12, '#929580');band(f, top - .12, .18, .22, b.trim);
      }
      yield;return;
    }
    if (b.style === 'atelier4') {
      band(f, .30, .60, .12, '#7c7f71');a.cornice(f, h, b.trim);
      for (const x of [1505.05, 1510.30]) {const u = uAt(f, x);if (u !== null) window(f, u, 1.96, 1.56, 1.84, '#d6d4c7', '#34403a', true);}
      const u = uAt(f, 1514.90);
      if (u !== null) {
        const bottom = entry(b, f, u, 1.65, 2, .28, .65, true, '#86504c',
          'September2025 east-north: red eastern door at Bucuresti4, approximately two frontal risers and a black-railed landing; dimensions estimated');
        const canopyU = uAt(f, 1511.75) ?? u;
        curvedCanopy(f, canopyU, bottom + 2.64, 7.0, 1.68, '#243b51');
        f.label('ATELIER', canopyU, bottom + 2.83, .44, '#e4e3d8', 1.74);
        f.panel(u - 1.25, 2.16, .27, .66, .36, .08, '#e0dbcd');f.label('4', u - 1.25, 2.06, .20, '#47483e', .34);
      }
      yield;return;
    }
    if (b.style === 'flowerCorner') {
      band(f, .27, .54, .12, '#7e8073');
      band(f, h - .30, .57, .26, '#cdb6a8');
      band(f, h + .06, .16, .34, '#aaa79a');
      if (n[1] > .80 && f.at(f.len / 2)[0] < 1533.1) {
        for (const x of [1527.72, 1528.75, 1529.78]) {const u = uAt(f, x);if (u !== null) window(f, u, 2.62, .78, .34, '#ddd9c9', '#434b40');}
        const u = uAt(f, 1531.65);if (u !== null) window(f, u, 1.87, 1.65, 1.49, '#dbdacb', '#59675b');
      } else if (f.at(f.len / 2)[1] > 454.6) {
        f.panel(f.len / 2, 1.55, .19, Math.max(.4, f.len - .18), 2.5, .045, '#61766d', false, 1);
        for (const u of [.08, f.len / 2, f.len - .08]) f.panel(u, 1.55, .25, .06, 2.52, .08, '#dddcd0');
        for (const yy of [.30, 2.80]) f.panel(f.len / 2, yy, .25, f.len, .08, .08, '#dddcd0');
      }
      if (n[1] > .80 && f.at(f.len / 2)[0] > 1533.1) {
        const u = uAt(f, 1533.72);if (u !== null) threshold(b, f, u, .83, '#8b9a8d',
          'September2025 east-north: narrow glazed entrance beside eastern flower shopfront; exact threshold size not readable, modeled as a low approach without an invented staircase');
      }
      if (n[0] > .65 && f.at(f.len / 2)[1] > 454.8) f.label('FLORI', f.len / 2, 3.05, .22, '#537646', .32);
      yield;return;
    }
    if (b.style === 'tolstoiRelief') {
      band(f, .49, .98, .12, '#797e74');
      band(f, h - .13, .14, .25, '#bdc5b4');
      band(f, h - .43, .04, .28, '#955849');
      if (n[0] > .8 && f.len > 4) {
        for (const u of [f.len * .23, f.len * .66]) window(f, u, 2.36, .94, 1.76, '#dddcd2', '#a3b0a0', true);
      } else if (n[0] > .4 && n[1] < -.4 && f.len < 4) {
        relief(f, f.len * .26);
        const u = f.len * .73;
        f.panel(u, 2.16, .23, 1.02, .72, .13, '#dbdac7');
        f.label('LEV TOLSTOI', u, 2.17, .10, '#666a5e', .31);
        const p = f.at(f.len - .08, .40);m.box(p[0], f.y + h / 2, p[1], .09, h, .09, '#637968', true);
      } else if (n[1] < -.82) {
        for (const x of [1539.0, 1541.38]) {const u = uAt(f, x);if (u !== null) window(f, u, 2.31, 1.22, 1.75, '#e2e2d5', '#a2b0a1');}
        const shop = segment(f, 1542.50, 1551.15);
        if (shop) {band(shop, 2.37, 2.64, .10, '#c5bea5');band(shop, 3.88, .42, .20, '#776d64');shop.label('INTERAVO', shop.len / 2, 3.74, .30, '#ddd9c6', .28);}
        for (const x of [1547.15, 1549.66]) {const u = uAt(f, x);if (u !== null) window(f, u, 2.34, 1.08, 1.75, '#dad8c4', '#738374', true);}
        for (const x of [1552.42, 1554.20]) {const u = uAt(f, x);if (u !== null) window(f, u, 2.30, .74, 1.66, '#dfdfd2', '#9fac9d');}
        const u = uAt(f, 1543.78);
        if (u !== null) {
          const bottom = lateralPlatform(b, f, u, u, 1.84, 1.25, 6, .78, [1], true, '#4c5849',
            'September2025 interavo-entry: western INTERAVO door within12344, lateral stair from west toward east with about five or six risers; six model risers, dimensions and placement estimated', '#3b493e', '#98977e');
          curvedCanopy(f, u, bottom + 2.38, 1.86, 1.22, '#a58953');
        }
      }
      yield;return;
    }
  }

  const cloneRoutes = (routes: BucurestiBu05EntryRoute[]) => routes.map(r => ({...r,
    faceStart: [...r.faceStart] as XY, faceEnd: [...r.faceEnd] as XY, points: r.points.map(p => [...p] as XY)}));
  return {a, normal, angle, handles, detail, customRoof, detailExtra,
    entryRoutes: () => cloneRoutes(entries), thresholdRoutes: () => cloneRoutes(thresholds)};
}
