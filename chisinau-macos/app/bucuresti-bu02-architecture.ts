import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import type {XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

export type BucurestiBu02EntryRoute = {
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
  heightSource: 'photographic-dimension-estimate';
};

/** Original opaque facade meshes for BUC02. See docs/bucuresti-bu02-references.
 * Footprints and roof volumes remain with the cadastral body builder. July /
 * September 2025 observations take precedence over undated photographs. All
 * metric elevation and stair dimensions are estimates, not cadastral heights. */
export function bucurestiBu02Architecture(m: Mesh, ground: (x: number, z: number) => number) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const routes: BucurestiBu02EntryRoute[] = [];
  const routeKeys = new Set<string>();
  const north = new Set(['house38', 'historic36a', 'mint36', 'historic34West', 'historic34']);
  const south = new Set(['historic35', 'house37', 'charcoal33', 'gray33', 'mansard31west', 'mansard31east', 'house29', 'house27']);

  function rearPassage35(b: Building, f: Facade) {
    const p = f.at(f.len / 2), n = normal(f);
    return b.style === 'historic35' && n[1] > .8 && p[0] > 861 && p[0] < 864.6 && p[1] > 489.7 && p[1] < 490.6;
  }

  function handles(b: Building, f: Facade) {
    if (b.style === 'openRuin') return true;
    if (rearPassage35(b, f)) return true;
    const p = f.at(f.len / 2), n = normal(f);
    if (b.style === 'blueCorner') {
      return (n[1] > .65 && p[1] > 455) || (n[0] > .65 && p[0] > 977)
        || (p[0] > 974.5 && p[1] > 451.6 && n[0] > .08 && n[1] > .08);
    }
    if (f.len < 1.5) return false;
    if (b.style === 'corner25') return (n[1] < -.85 && p[1] < 481) || (n[0] > .85 && p[0] > 978);
    if (b.style === 'greenOffice') return (n[1] < -.85 && p[1] < 482) || (n[0] < -.85 && p[0] < 1004);
    if (north.has(b.style)) return n[1] > .85 && p[1] > 455;
    if (south.has(b.style)) return n[1] < -.85 && p[1] < 482;
    return false;
  }

  // Facade projections divide several official outlines into short edges. Bays
  // are placed across the complete street frontage, then assigned to an edge;
  // a five-window house must not acquire five windows on every projection.
  function frontRange(b: Building): [number, number] {
    const points = b.p.filter(p => north.has(b.style) ? p[1] > 455 : p[1] < 482);
    const xs = (points.length > 1 ? points : b.p).map(p => p[0]);
    return [Math.min(...xs), Math.max(...xs)];
  }

  function uAtX(f: Facade, x: number): number | null {
    const p = f.at(0), q = f.at(f.len), dx = q[0] - p[0];
    if (Math.abs(dx) < .2) return null;
    const u = (x - p[0]) / dx * f.len;
    return u >= -.015 && u < f.len + .015 ? Math.max(0, Math.min(f.len, u)) : null;
  }

  function axes(b: Building, f: Facade, count: number) {
    const [left, right] = frontRange(b), pitch = (right - left) / count;
    return Array.from({length: count}, (_, i) => ({i, x: left + (i + .5) * pitch, pitch}))
      .map(v => ({...v, u: uAtX(f, v.x)})).filter((v): v is typeof v & {u: number} => v.u !== null);
  }

  function band(f: Facade, height: number, thickness: number, depth: number, color: string, exclude35 = false) {
    let intervals: [number, number][] = [[0, f.len]];
    if (exclude35 && height - thickness / 2 < 3.2) {
      const p = f.at(0), q = f.at(f.len), dx = q[0] - p[0];
      if (Math.abs(dx) > .2) {
        const v = [861.22, 864.29].map(x => (x - p[0]) / dx * f.len).sort((x, y) => x - y);
        intervals = [[0, Math.max(0, Math.min(f.len, v[0]))], [Math.max(0, Math.min(f.len, v[1])), f.len]];
      }
    }
    for (const [start, end] of intervals) if (end - start > .03) {
      f.panel((start + end) / 2, height, depth / 2 + .025, end - start, thickness, depth, color);
    }
  }

  function plinth(b: Building, f: Facade, height = .65, color = '#929087') {
    band(f, height / 2, height, .14, color, b.style === 'historic35');
  }

  function grille(f: Facade, u: number, center: number, width: number, height: number) {
    const count = Math.max(3, Math.round(width / .19));
    for (let i = 0; i <= count; i++) f.panel(u - width / 2 + width * i / count, center, .57, .023, height, .027, '#3c4643', true);
    for (const dy of [-height * .36, height * .36]) f.panel(u, center + dy, .58, width, .027, .035, '#3c4643', true);
  }

  function pilaster(f: Facade, u: number, h: number, color: string, width = .34) {
    f.panel(u, h / 2, .19, width, h, .38, color);
    for (const y of [.19, h - .18]) f.panel(u, y, .26, width + .16, .22, .52, color);
    for (const offset of [-width * .24, width * .24]) f.panel(u + offset, h / 2, .39, .027, Math.max(.2, h - .8), .04, '#b6b5ab', true);
  }

  function frontShape(f: Facade, u: number, bottom: number, width: number, height: number, color: string, depth = .34) {
    const half = width / 2, shoulder = height * .72, shape = new T.Shape();
    shape.moveTo(-half, 0); shape.lineTo(half, 0); shape.lineTo(half, shoulder);
    shape.quadraticCurveTo(0, height * 1.28, -half, shoulder); shape.closePath();
    const p = f.at(u, depth), geometry = new T.ShapeGeometry(shape, 12);
    geometry.rotateY(angle(f)); geometry.translate(p[0], f.y + bottom, p[1]);
    m.put(geometry, color);
  }

  function curvedCrown(f: Facade, u: number, base: number, width: number, rise: number, color: string, filled = true) {
    if (filled) frontShape(f, u, base, width, rise, color, .36);
    const samples = 12;
    for (let i = 0; i < samples; i++) {
      const x0 = -width / 2 + i * width / samples, x1 = -width / 2 + (i + 1) * width / samples;
      const h0 = base + rise * (.72 + .28 * (1 - 4 * x0 * x0 / (width * width)));
      const h1 = base + rise * (.72 + .28 * (1 - 4 * x1 * x1 / (width * width)));
      const p = f.at(u + x0, .44), q = f.at(u + x1, .44);
      m.beam(new T.Vector3(p[0], f.y + h0, p[1]), new T.Vector3(q[0], f.y + h1, q[1]), .055, color);
    }
  }

  function flatCanopy(f: Facade, u: number, bottom: number, width: number, color: string) {
    const p = f.at(u, .75);
    m.box(p[0], f.y + bottom, p[1], width, .12, 1.5, color, false, false, angle(f));
    for (const side of [-1, 1]) {
      const p = f.at(u + side * width * .39, .17), q = f.at(u + side * width * .39, 1.32);
      m.beam(new T.Vector3(p[0], f.y + bottom - .42, p[1]), new T.Vector3(q[0], f.y + bottom - .06, q[1]), .025, '#70746a');
    }
  }

  function curvedCanopy(f: Facade, u: number, bottom: number, width: number, depth: number) {
    const vertices: number[] = [], count = 12;
    for (let i = 0; i < count; i++) {
      const x0 = -width / 2 + width * i / count, x1 = -width / 2 + width * (i + 1) / count;
      const y0 = f.y + bottom + .38 * (1 - 4 * x0 * x0 / (width * width));
      const y1 = f.y + bottom + .38 * (1 - 4 * x1 * x1 / (width * width));
      const p = f.at(u + x0, .14), q = f.at(u + x1, .14), r = f.at(u + x1, depth), s = f.at(u + x0, depth);
      const aa = [p[0], y0, p[1]], bb = [q[0], y1, q[1]], cc = [r[0], y1, r[1]], dd = [s[0], y0, s[1]];
      vertices.push(...aa, ...cc, ...bb, ...aa, ...dd, ...cc);
      m.beam(new T.Vector3(...dd as [number, number, number]), new T.Vector3(...cc as [number, number, number]), .035, '#b4bcb2');
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
    m.put(geometry, '#839c88');
    for (const sign of [-1, 1]) {
      const p = f.at(u + sign * width * .42, .16), q = f.at(u + sign * width * .42, depth - .05);
      m.beam(new T.Vector3(p[0], f.y + bottom - .55, p[1]), new T.Vector3(q[0], f.y + bottom + .06, q[1]), .03, '#aab6b0');
    }
  }

  function entry(b: Building, f: Facade, u: number, width: number, rise: number, landing = .45, rail = false, doorWidth = 1.0, doorHeight = 2.4, color = '#625042', railColor?: string) {
    const bottom = shared.stairs(f, u, width, rise, landing, rail && !railColor);
    shared.door(f, u, bottom, doorWidth, doorHeight, color);
    const steps = Math.max(1, Math.ceil(rise / .13)), run = steps * .29;
    if (rail && railColor) for (const side of [-1, 1]) {
      const p = f.at(u + side * (width / 2 - .05), .30), q = f.at(u + side * (width / 2 - .05), run + landing + .20);
      m.beam(new T.Vector3(p[0], f.y + bottom + .91, p[1]), new T.Vector3(q[0], f.y + bottom - rise + .91, q[1]), .028, railColor);
      for (const [v, y] of [[.35, f.y + bottom], [run + landing, f.y + bottom - rise]]) {
        const pos = f.at(u + side * (width / 2 - .05), v);
        m.box(pos[0], y + .45, pos[1], .04, .90, .04, railColor, true, true);
      }
    }
    const key = `${b.id}/${f.at(u).map(v => v.toFixed(3)).join('/')}`;
    if (!routeKeys.has(key)) {
      routeKeys.add(key);
      routes.push({name: `${b.title} · intrare ${routes.length + 1}`, buildingId: b.id, style: b.style,
        faceStart: f.at(0), faceEnd: f.at(f.len), u, width, rise, landing, steps, run,
        points: [f.at(u, run + landing + .8), f.at(u, .5)], heightSource: 'photographic-dimension-estimate'});
    }
    return bottom;
  }

  function* ornate34(b: Building, f: Facade) {
    const west = b.style === 'historic34West', h = b.height, trim = b.trim;
    const [left, right] = frontRange(b);
    const positions = west
      ? [left + 2.14, left + 5.22, (left + right) / 2, right - 5.22, right - 2.14]
      : Array.from({length: 10}, (_, i) => left + (i + .5) * (right - left) / 10);
    const ends = west ? [0, 4] : [0, 4, 9];
    for (let i = 0; i < positions.length; i++) {
      const u = uAtX(f, positions[i]); if (u === null) continue;
      const windowHeight = Math.min(2.55, h - 1.4), bottom = .93, width = ends.includes(i) ? 1.46 : 1.24;
      if (ends.includes(i)) {
        a.arch(f, u, bottom, width, windowHeight, f.y, '#617576', trim);
        for (const sign of [-1, 1]) pilaster(f, u + sign * 1.21, h - .25, trim, .34);
        a.pediment(f, u, h + .11, 3.7, .83, f.y, trim);
        curvedCrown(f, u, h + .12, 3.85, 1.02, trim);
        // A smaller inset triangle preserves the pediment inside the curved attic.
        a.pediment(f, u, h + .14, 3.25, .68, f.y, '#adafa6');
      } else {
        f.window(u, bottom + windowHeight / 2, width, windowHeight, trim, '#4c5149');
        curvedCrown(f, u, bottom + windowHeight + .11, width + .50, .34, trim);
      }
      grille(f, u, bottom + windowHeight / 2, width - .03, windowHeight - .06);
      f.panel(u, .71, .25, width + .34, .16, .42, trim);
      f.panel(u, h - .78, .22, .42, .16, .12, '#3f4640');
      yield;
    }
  }

  function* detail(b: Building, f: Facade): Generator<void> {
    const k = b.style, h = b.height, trim = b.trim;
    if (k === 'openRuin') {
      // No glass, complete cornice, roof or invented intact elevation on the ruin.
      const n = normal(f), p = f.at(f.len / 2);
      const streetFront = n[1] > .85 && p[1] > 456;
      const westFront = n[0] < -.85 && p[0] < 1004;
      if (westFront) f.panel(f.len / 2, h * .49, .025, Math.max(.2, f.len - .12), h * .92, .035, '#d0d1c8', true);
      for (let i = 0; i < Math.floor(f.len / 4.4); i++) {
        const u = (i + .5) * f.len / Math.floor(f.len / 4.4);
        f.panel(u, h * (.28 + (i % 3) * .15), .035, 1.0 + (i % 2) * .65, h * .30, .045, i % 3 ? '#b9b7a7' : '#dddccf', true);
        if (i % 3 === 0) f.panel(u + .5, Math.max(.25, h - .10), .035, .5, .26, .08, '#8c8d7e', true);
        yield;
      }
      // July 2025 heading 45 shows three openings along București and two
      // narrower openings on Bulgară. Dark opaque recess panels preserve the
      // observed void pattern without adding glass or altering wall collision.
      // Their exact offsets and metric dimensions are photographic estimates.
      if (streetFront || westFront) {
        const fractions = streetFront ? [.20, .50, .80] : [.32, .68];
        for (const fraction of fractions) {
          f.panel(f.len * fraction, streetFront ? 1.91 : 1.78, .115,
            streetFront ? 1.05 : .65, streetFront ? 1.55 : 1.35, .045, '#3e4541', true);
          yield;
        }
      }
      return;
    }
    if (rearPassage35(b, f)) {
      // The rear exit is as open as the street entrance. Everything begins above clearance.
      band(f, 3.47, .22, .32, trim); a.cornice(f, h, trim);
      f.window(f.len / 2, Math.max(4.8, h - 1.65), 1.25, 1.9, trim, '#595f54');
      yield; return;
    }

    plinth(b, f, k === 'corner25' ? 1.0 : .65, k === 'corner25' ? '#77796e' : '#96958b');
    a.cornice(f, h, trim);

    if (k === 'historic35') {
      band(f, 3.55, .25, .42, trim);
      for (let yy = .45; yy < 3.2; yy += .43) band(f, yy, .13, .23, trim, true);
      for (const {i, u, x, pitch} of axes(b, f, 10)) {
        const upper = h - 1.95, width = Math.min(1.26, pitch * .59);
        f.window(u, upper, width, 2.28, trim, '#443f36');
        a.pediment(f, u, upper + 1.30, width + .48, .39, f.y, trim);
        f.panel(u, upper - 1.26, .27, width + .45, .18, .48, trim);
        if (i % 2 === 0) {
          const p = f.at(u - pitch * .39, .36);
          a.column(p[0], p[1], f.y + 3.83, Math.max(1, h - 4.25), .15, trim);
        }
        if (i === 3 || i === 6) {
          const bottom = entry(b, f, u, 1.70, .39, .48, true, 1.08, 2.43, '#775847', '#b2bdb8');
          flatCanopy(f, u, bottom + 2.69, 2.05, '#cfb332');
        } else if (x < 861.0 || x > 864.5) {
          f.window(u, 1.99, width, 2.18, trim, '#4b4e43');
          grille(f, u, 1.99, width - .04, 2.10);
        }
        yield;
      }
      // These two posts flank the clear opening, never cover it.
      for (const x of [861.04, 864.48]) {
        const u = uAtX(f, x); if (u !== null) pilaster(f, u, 3.18, trim, .25);
      }
      const portal = uAtX(f, 862.75);
      if (portal !== null) {
        f.panel(portal, 3.43, .22, 3.12, .38, .43, trim);
        f.label('35', portal - 1.78, 2.76, .18, '#4f5750');
      }
    } else if (k === 'house37') {
      for (const {i, u} of axes(b, f, 5)) {
        if (i !== 3) f.window(u, 2.12, 1.14, 1.90, trim, '#5d6359');
        else f.panel(u, 2.12, .08, 1.20, 1.96, .12, b.wall);
        if (i === 0 || i === 2 || i === 4) pilaster(f, u - 1.03, h - .25, trim, .34);
        yield;
      }
      // No unsupported central street door on this photographed four-window facade.
    } else if (k === 'house38') {
      const [left, right] = frontRange(b), span = right - left;
      for (const fraction of [.35, .61, .87]) {
        const u = uAtX(f, left + span * fraction); if (u === null) continue;
        f.window(u, 1.81, 1.40, 2.62, trim, '#6b5949');
        curvedCrown(f, u, 3.22, 1.74, .30, trim); yield;
      }
      const u = uAtX(f, left + span * .105);
      if (u !== null) {
        const bottom = entry(b, f, u, 1.55, .26, .42, false, 1.23, 2.77, '#616959');
        for (const sign of [-1, 1]) pilaster(f, u + sign * .95, h + .50, trim, .26);
        f.panel(u, bottom + 3.12, .26, 2.18, .35, .52, trim);
        curvedCrown(f, u, h + .16, 2.45, .72, trim);
      }
      // The remaining curved parapet is separate from the higher entrance portal.
      curvedCrown(f, f.len * .63, h + .08, f.len * .68, .43, trim);
    } else if (k === 'historic36a') {
      band(f, h * .48, .21, .40, trim);
      for (const {i, u, pitch} of axes(b, f, 6)) {
        const upperBottom = h * .53, width = Math.min(1.28, pitch * .55), upperHeight = Math.min(2.35, h * .35);
        if (i === 0 || i === 5) {
          a.arch(f, u, upperBottom, width, upperHeight, f.y, '#637777', trim);
          const bottom = entry(b, f, u, 1.48, .26, .42, false, 1.10, 2.36);
          a.arch(f, u, bottom, 1.35, 2.90, f.y, '#594d40', trim);
          // Door leaf is brought in front of the arch's lower fill.
          shared.door(f, u, bottom, 1.08, 2.34, '#6d594b');
          if (i === 0) f.label('WOWBROWS', u, bottom + 2.70, .15, '#55495b');
        } else {
          f.window(u, upperBottom + upperHeight / 2, width, upperHeight, trim, '#5c6258');
          f.window(u, 1.98, width, 2.03, trim, '#5c6258');
        }
        if (i === 1 || i === 4) pilaster(f, u - pitch * .48, h - .20, trim, .31);
        if (i === 3) {f.panel(u, h * .39, .38, 1.68, 1.02, .045, '#775078'); f.label('PDCM', u, h * .39 - .08, .23, '#e5e1d4');}
        yield;
      }
    } else if (k === 'mint36') {
      const [left, right] = frontRange(b), span = right - left;
      for (const fraction of [.28, .46, .75, .91]) {
        const u = uAtX(f, left + span * fraction); if (u === null) continue;
        f.window(u, 2.43, 1.14, 1.96, trim, '#718172');
        if (fraction < .5) f.window(u, .46, .85, .49, '#a5a69c', '#535e54');
        yield;
      }
      const door = uAtX(f, left + span * .105);
      if (door !== null) {
        const bottom = entry(b, f, door, 1.9, .65, .52, true, 1.35, 2.48, '#66705f');
        shared.canopy(f, door, bottom + 2.70, 2.13);
      }
      const center = uAtX(f, left + span * .60);
      if (center !== null) {
        const p = f.at(center, .35), ring = new T.TorusGeometry(.30, .065, 4, 16);
        ring.rotateY(angle(f)); ring.translate(p[0], f.y + h - .70, p[1]); m.put(ring, trim, true);
        f.panel(center, 1.49, .08, 2.07, 2.05, .13, '#d4d6cd');
      }
    } else if (k === 'historic34West' || k === 'historic34') {
      yield* ornate34(b, f);
    } else if (k === 'charcoal33' || k === 'gray33') {
      const [left, right] = frontRange(b), span = right - left;
      const fractions = k === 'charcoal33' ? [.31, .54, .77] : [.12, .29, .71, .88];
      for (const fraction of fractions) {
        const u = uAtX(f, left + span * fraction); if (u === null) continue;
        f.window(u, 2.10, 1.16, 2.22, trim, '#655b4d'); yield;
      }
      // The former BAXI photo faces the frontage from the street: its right-hand
      // entrance is the western end in the local coordinate frame.
      const u = uAtX(f, left + span * (k === 'charcoal33' ? .075 : .50));
      if (u !== null) entry(b, f, u, 1.35, .26, .38, false, .95, 2.40, '#655040');
    } else if (k === 'mansard31west' || k === 'mansard31east') {
      const [left, right] = frontRange(b), span = right - left;
      const west = k === 'mansard31west', doorFraction = west ? .86 : .14;
      for (const fraction of (west ? [.16, .39, .62] : [.38, .61, .84])) {
        const u = uAtX(f, left + span * fraction); if (u === null) continue;
        f.window(u, 2.07, 1.28, 2.16, trim, '#7b5540');
        curvedCrown(f, u, 3.28, 1.75, .32, trim);
        for (const sign of [-1, 1]) pilaster(f, u + sign * .90, h - .22, trim, .24);
        yield;
      }
      const door = uAtX(f, left + span * doorFraction);
      if (door !== null) {
        const bottom = entry(b, f, door, 1.65, .39, .46, false, 1.18, 2.50, '#77513e');
        a.arch(f, door, bottom, 1.43, 2.92, f.y, '#795a45', trim);
        shared.door(f, door, bottom, 1.14, 2.46, '#77513e'); shared.canopy(f, door, bottom + 3.10, 1.95);
      }
      const dormer = uAtX(f, (left + right) / 2);
      if (dormer !== null) {
        const width = span * .69, rise = Math.min(2.7, Math.max(1.85, b.roofRise * .82));
        frontShape(f, dormer, h + .05, width, rise, trim, .23);
        frontShape(f, dormer, h + .23, width - .65, rise - .36, '#60777b', .28);
        curvedCrown(f, dormer, h + .04, width + .18, rise + .12, '#86534b', false);
        // Glazing sits in front of the solid dormer, below the narrow red cap.
        frontShape(f, dormer, h + .27, width - .71, rise - .43, '#657a7b', .48);
        for (const du of [-width * .32, 0, width * .32]) f.panel(dormer + du, h + rise * .44, .52, .09, rise * .78, .09, '#8a6751', true);
        f.panel(dormer, h + rise * .55, .53, width - .70, .08, .08, '#8a6751', true);
      }
    } else if (k === 'house29') {
      const [left, right] = frontRange(b), span = right - left;
      const ornateEnd = left + Math.min(5.0, span * .31), segment = [uAtX(f, left + .05), uAtX(f, ornateEnd)];
      if (segment.every(u => u !== null)) f.panel((segment[0]! + segment[1]!) / 2, h / 2, .07, Math.abs(segment[1]! - segment[0]!), h - .2, .14, '#d8d6ce');
      for (const fraction of [.44, .66, .87]) {
        const u = uAtX(f, left + span * fraction); if (u !== null) {f.window(u, 2.02, 1.30, 2.17, '#bcbab2', '#65574b'); yield;}
      }
      const window = uAtX(f, left + 1.30), door = uAtX(f, left + 3.70);
      if (window !== null) {f.window(window, 2.05, 1.23, 2.18, trim, '#735340'); pilaster(f, window - .92, h - .2, trim, .24);}
      if (door !== null) {entry(b, f, door, 1.45, .26, .40, false, 1.02, 2.44, '#70503e'); pilaster(f, door + .87, h - .2, trim, .24);}
      const number = uAtX(f, right - .48); if (number !== null) {f.panel(number, 2.66, .26, .34, .34, .06, '#e3e0d7'); f.label('29', number, 2.57, .15, '#4c524c');}
    } else if (k === 'corner25') {
      const n = normal(f);
      if (n[1] < -.85) {
        for (const {i, u, pitch} of axes(b, f, 6)) {
          if (i === 0) {
            const bottom = entry(b, f, u, 1.90, .65, .52, true, 1.16, 2.65, '#827d68');
            for (const side of [-1, 1]) pilaster(f, u + side * .91, h + .59, trim, .25);
            curvedCrown(f, u, h + .10, 2.34, .85, trim);
            f.panel(u, bottom + 2.90, .29, 2.12, .22, .52, trim);
          } else {
            const width = Math.min(1.16, pitch * .58); f.window(u, 2.37, width, 2.18, trim, '#806b57');
            curvedCrown(f, u, 3.56, width + .42, .29, trim);
          }
          yield;
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const u = (i + .5) * f.len / 5;
          if (i !== 2) {f.window(u, 2.37, 1.10, 2.16, trim, '#806b57'); curvedCrown(f, u, 3.55, 1.52, .29, trim);}
          else f.panel(u, 2.10, .08, 1.20, 2.65, .10, b.wall); // historically blocked side entry
          yield;
        }
      }
      band(f, h - .48, .24, .20, '#b18d86');
    } else if (k === 'blueCorner') {
      const p = f.at(f.len / 2), curved = p[0] > 974.5 && p[1] > 451.6;
      const storey = h / 3;
      if (curved) {
        // Short mapped edges form the actual curved corner. A continuous blue
        // two-storey bay with mullions avoids a repeated tiny window on each edge.
        f.panel(f.len / 2, storey * 2, .20, f.len + .015, storey * 2 - .34, .04, '#4384a4', false, 1);
        for (const u of [.02, f.len - .02]) f.panel(u, storey * 2, .26, .055, storey * 2 - .24, .08, '#cbd8d6', true);
        for (const yy of [storey + .06, storey * 2, h - .08]) band(f, yy, .12, .33, '#dce0d5');
        f.panel(f.len / 2, 1.65, .21, Math.max(.20, f.len - .15), 2.65, .04, '#486c7d', false, 1);
        if (p[0] > 979.3 && p[0] < 979.9 && p[1] > 455.8 && p[1] < 456.8) entry(b, f, f.len / 2, 1.85, .26, .52, false, 1.20, 2.65, '#587780');
      } else {
        const count = Math.max(1, Math.round(f.len / 2.7));
        for (let i = 0; i < count; i++) {
          const u = (i + .5) * f.len / count;
          for (let row = 0; row < 3; row++) f.window(u, storey * row + storey * .51, 1.12, Math.min(1.95, storey * .62), '#dfe2d8', '#839591');
          yield;
        }
      }
    } else if (k === 'greenOffice') {
      const storey = h / 4, west = normal(f)[0] < -.85;
      if (!west) {
        // The short București return is visible context. No unsupported north door or sign.
        const count = Math.max(2, Math.round(f.len / 3.3));
        for (let i = 0; i < count; i++) {
          for (let row = 0; row < 4; row++) f.window((i + .5) * f.len / count, (row + .5) * storey, 1.45, 2.15, trim, '#7e9184');
          yield;
        }
      } else {
        const count = 8, pitch = f.len / count, width = Math.min(3.75, pitch * .75);
        const start = f.at(0), end = f.at(f.len);
        const uAtZ = (z: number) => (z - start[1]) / (end[1] - start[1]) * f.len;
        const entrances = [484, 491, 501].map(z => ({z, u: uAtZ(z), width: z === 501 ? 2.35 : 1.35}));
        for (let i = 0; i < count; i++) {
          const u = (i + .5) * pitch;
          let glass: [number, number][] = [[u - width / 2, u + width / 2]];
          for (const door of entrances) glass = glass.flatMap(([lo, hi]) => {
            const dl = door.u - door.width / 2 - .16, dr = door.u + door.width / 2 + .16;
            if (dr <= lo || dl >= hi) return [[lo, hi] as [number, number]];
            return [[lo, Math.max(lo, dl)], [Math.min(hi, dr), hi]].filter(([a, b]) => b - a > .20) as [number, number][];
          });
          for (const [lo, hi] of glass) f.window((lo + hi) / 2, 1.70, hi - lo, 2.48, trim, '#7b9184');
          for (let row = 1; row < 4; row++) {
            const bottom = row * storey + (row === 3 ? .44 : 1.02), height = row === 3 ? 2.43 : 2.13;
            if (row < 3) f.panel(u, row * storey + .43, .12, pitch - .25, 1.10, .24, '#589b62');
            if (row === 3) a.arch(f, u, bottom, width, height, f.y, '#74958b', trim);
            else f.window(u, bottom + height / 2, width, height, trim, '#819589');
            // The photographed facade has white vertical screening in all three upper rows.
            for (let j = 1; j <= 9; j++) {
              const offset = (j / 10 - .5) * width;
              const louverHeight = row === 3 ? height - width / 2 + Math.sqrt(Math.max(0, (width / 2) ** 2 - offset ** 2)) : height;
              f.panel(u + offset, bottom + louverHeight / 2, .57, .058, louverHeight, .18, '#e1e5d9', true);
            }
          }
          pilaster(f, i * pitch + .12, h - .15, '#e1e3d7', .31);
          yield;
        }
        pilaster(f, f.len - .12, h - .15, '#e1e3d7', .31);
        for (const door of entrances) {
          const large = door.z === 501;
          const bottom = entry(b, f, door.u, large ? 3.15 : 2.10, .52, large ? .65 : .52, true, door.width, 2.54, '#718b7c', '#b2bdb8');
          if (large) {
            curvedCanopy(f, door.u, bottom + 2.95, 3.55, 1.65);
            curvedCrown(f, door.u, h + .07, 5.5, .94, trim);
            a.arch(f, door.u, bottom, 2.60, 2.99, f.y, '#7f9688', trim);
            shared.door(f, door.u, bottom, 2.31, 2.53, '#718b7c');
          } else flatCanopy(f, door.u, bottom + 2.79, 2.44, '#8ba98b');
          yield;
        }
        const signU = uAtZ(487.5);
        f.panel(signU, 3.14, .27, 10.6, .64, .22, '#566c59');
        f.label('REFURB.MD', signU - 2.8, 3.03, .29, '#e0e7d8');
        f.label('COMPUTERS & ELECTRONICS', signU + 2.1, 3.05, .15, '#e0e7d8');
      }
    }
    yield;
  }

  return {a, normal, angle, handles, detail, entryRoutes: () => routes.map(r => ({...r, points: r.points.map(p => [...p] as XY)}))};
}
