import * as T from 'three';
import type {PhotoBuilding} from './central-infill';
import type {XY} from './city-layout';
import type {streetMesh} from './street-mesh';
import {bucurestiArchitecture} from './bucuresti-architecture';

type Mesh = ReturnType<typeof streetMesh>;
type Facade = ReturnType<Mesh['facade']>;
type Building = PhotoBuilding;

export type BucurestiBu03EntryRoute = {
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

/** Original facade geometry for București, Bulgară–Tighina. The selected
 * cadastral polygons and split roof volumes belong to the data/body builder.
 * September 2025 observations supersede undated photographs; 2020 Tighina14
 * stair counts are a documented persistence estimate, not a 2025 measurement. */
export function bucurestiBu03Architecture(m: Mesh, ground: (x: number, z: number) => number) {
  const shared = bucurestiArchitecture(m, ground);
  const {a, normal, angle} = shared;
  const routes: BucurestiBu03EntryRoute[] = [];
  const routeKeys = new Set<string>();
  const south = new Set(['historic23', 'house21', 'packing19', 'historic17', 'historic15', 'vivoClinic', 'blockedPortal']);
  const north = new Set(['long32', 'longNorth']);

  function handles(b: Building, f: Facade) {
    const n = normal(f), p = f.at(f.len / 2);
    if (b.style === 'tighina14') return f.len > 1.2 && ((n[1] > .85 && p[1] > 456) || (n[0] < -.85 && p[0] < 1215) || (n[0] < -.3 && n[1] > .3 && p[1] > 455));
    if (b.style === 'paleCorner') return f.len > 1.5 && ((n[1] > .85 && p[1] > 455) || (n[0] > .85 && p[0] > 1190));
    if (b.style === 'rehabCorner') return f.len > 1.5 && ((n[1] < -.85 && p[1] < 481) || (n[0] > .85 && p[0] > 1190));
    if (f.len < (b.style === 'vivoClinic' ? .4 : 1.5)) return false;
    if (south.has(b.style)) return n[1] < -.70 && p[1] < 482;
    if (north.has(b.style)) return n[1] > .85 && p[1] > 455;
    return false;
  }

  function frontRange(b: Building): [number, number] {
    const ps = b.p.filter(p => b.style === 'tighina14' ? p[1] > 457.4 : north.has(b.style) || b.style === 'paleCorner' ? p[1] > 456 : p[1] < 482);
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

  function band(f: Facade, y: number, thickness: number, depth: number, color: string) {
    f.panel(f.len / 2, y, depth / 2 + .025, f.len, thickness, depth, color);
  }

  function segment(f: Facade, x0: number, x1: number): Facade | null {
    const p = f.at(0), q = f.at(f.len), lo = Math.max(Math.min(p[0], q[0]), x0), hi = Math.min(Math.max(p[0], q[0]), x1);
    if (hi - lo < .025) return null;
    const uu = [uAtX(f, lo), uAtX(f, hi)];
    if (uu.some(u => u === null)) return null;
    const u0 = Math.min(uu[0]!, uu[1]!), u1 = Math.max(uu[0]!, uu[1]!);
    return m.facade(f.at(u0), f.at(u1), f.y);
  }

  function pilaster(f: Facade, u: number, height: number, color: string, width = .30) {
    f.panel(u, height / 2, .17, width, height, .34, color);
    for (const y of [.2, height - .19]) f.panel(u, y, .23, width + .16, .22, .46, color);
  }

  function grille(f: Facade, u: number, center: number, width: number, height: number, color = '#414641') {
    const count = Math.max(3, Math.round(width / .22));
    for (let i = 0; i <= count; i++) f.panel(u - width / 2 + width * i / count, center, .55, .023, height, .032, color, true);
    for (const dy of [-height * .35, height * .35]) f.panel(u, center + dy, .56, width, .027, .035, color, true);
  }

  function window(f: Facade, u: number, center: number, width: number, height: number, trim: string, frame = '#6b7168', bars = false) {
    f.window(u, center, width, height, trim, frame);
    f.panel(u, center + height / 2 + .24, .28, width + .44, .16, .42, trim);
    if (bars) grille(f, u, center, width, height);
  }

  function registerEntry(b: Building, f: Facade, u: number, width: number, rise: number, landing: number, points: XY[], approach: 'normal' | 'lateral-west', evidence: string, accessStatus: 'entry' | 'blocked-historical-portal' = 'entry') {
    const key = `${b.id}/${f.at(u).map(v => v.toFixed(3)).join('/')}/${approach}`;
    if (routeKeys.has(key)) return;
    routeKeys.add(key);
    const steps = Math.max(1, Math.ceil(rise / .13)), run = steps * .29;
    routes.push({name: `${b.title} · intrare ${routes.length + 1}`, buildingId: b.id, style: b.style,
      faceStart: f.at(0), faceEnd: f.at(f.len), u, width, rise, landing, steps, run, points, approach, evidence, accessStatus,
      heightSource: 'photographic-dimension-estimate'});
  }

  function entry(b: Building, f: Facade, u: number, width: number, rise: number, landing = .45, rail = false, doorWidth = 1.05, doorHeight = 2.45, color = '#655244', evidence = 'September2025 StreetView; metric dimensions estimated', stairColor?: string) {
    let bottom: number;
    if (stairColor && !rail) {
      const steps = Math.max(1, Math.ceil(rise / .13)), run = steps * .29, foot = f.at(u, run + landing + .35);
      const top = ground(...foot) + .035 + rise, p = f.at(u, landing / 2 + .16);
      m.box(p[0], top - .12, p[1], width, .24, landing + .04, stairColor, false, true, angle(f));
      for (let k = 0; k < steps; k++) {
        const p = f.at(u, landing + .18 + (k + .5) * .29);
        m.box(p[0], top - k * rise / steps - .12, p[1], width, .24, .295, stairColor, false, true, angle(f));
      }
      bottom = top - f.y;
    } else bottom = shared.stairs(f, u, width, rise, landing, rail);
    shared.door(f, u, bottom, doorWidth, doorHeight, color);
    const run = Math.max(1, Math.ceil(rise / .13)) * .29;
    registerEntry(b, f, u, width, rise, landing, [f.at(u, run + landing + .8), f.at(u, .50)], 'normal', evidence);
    return bottom;
  }

  function twoStepShopPlatform15(f: Facade) {
    // The broad shared platform follows the real transverse terrain slope.
    // Each tread is one continuous mesh: subdivisions share the same sampled
    // elevation, so there are no artificial sideways risers between strips.
    const width = f.len - .06, center = f.len / 2, footV = .42 + .58 + .35;
    const base = (u: number) => ground(...f.at(u, footV)) + .035;
    for (const [near, far, rise] of [[.14, .89, .26], [.89, 1.18, .13]]) {
      const depth = far - near, g = new T.BoxGeometry(width, .24, depth, Math.ceil(width), 1, 1);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = center + pos.getX(i), p = f.at(u, (near + far) / 2 + pos.getZ(i));
        pos.setXYZ(i, p[0], base(u) + rise + pos.getY(i) - .12, p[1]);
      }
      g.computeVertexNormals();m.put(g, '#a3a295', false, true);
    }
    return (u: number) => base(u) + .26 - f.y;
  }

  function lateralEntry23(b: Building, f: Facade, u: number) {
    // September2025: the flight runs parallel to the facade, west of the
    // raised platform. It must not become a normal flight across the sidewalk.
    const width = 1.35, rise = .91, landing = 2.5, steps = 7, run = steps * .29;
    const direction = f.at(1)[0] < f.at(0)[0] ? 1 : -1, v = .84;
    const foot = f.at(u + direction * (landing / 2 + run + .40), v), top = ground(...foot) + .035 + rise;
    const q = f.at(u, v); m.box(q[0], top - .12, q[1], landing, .24, width, '#937661', false, true, angle(f));
    for (let k = 0; k < steps; k++) {
      const p = f.at(u + direction * (landing / 2 + (k + .5) * .29), v);
      m.box(p[0], top - k * rise / steps - .12, p[1], .295, .24, width, '#92745f', false, true, angle(f));
    }
    // Stainless rails are physical only at their visible uprights.
    for (const vv of [v - width / 2 + .055, v + width / 2 - .055]) {
      const pa = f.at(u + direction * landing / 2, vv), pb = f.at(u + direction * (landing / 2 + run), vv);
      m.beam(new T.Vector3(pa[0], top + .92, pa[1]), new T.Vector3(pb[0], top - rise + .92, pb[1]), .027, '#b9c1bb');
      for (const [uu, yy] of [[u + direction * landing / 2, top], [u + direction * (landing / 2 + run), top - rise]]) {
        const p = f.at(uu, vv);m.box(p[0], yy + .46, p[1], .035, .92, .035, '#b9c1bb', true, true);
      }
    }
    for (const vv of [v + width / 2 - .055]) {
      const pa = f.at(u - landing / 2, vv), pb = f.at(u + landing / 2, vv);
      m.beam(new T.Vector3(pa[0], top + .92, pa[1]), new T.Vector3(pb[0], top + .92, pb[1]), .027, '#b9c1bb');
    }
    shared.door(f, u, top - f.y, 1.15, 2.45, '#685b4b');
    registerEntry(b, f, u, width, rise, landing, [f.at(u + direction * (landing / 2 + run + .85), v), f.at(u + direction * (landing / 2 + .2), v), f.at(u, v)], 'lateral-west', 'September2025: raised platform and westward lateral stair; seven steps and metric dimensions estimated');
    return top - f.y;
  }

  function pedimentPortal(f: Facade, u: number, height: number, width: number, trim: string) {
    for (const side of [-1, 1]) pilaster(f, u + side * width * .40, height + .12, trim, .34);
    a.pediment(f, u, height + .14, width, .70, f.y, trim);
    for (const side of [-1, 1]) {
      f.panel(u + side * width * .38, height + .58, .28, .34, .55, .48, trim);
      const p = f.at(u + side * width * .38, .28), cap = new T.ConeGeometry(.34, .34, 4);
      cap.rotateY(angle(f) + Math.PI / 4); cap.translate(p[0], f.y + height + 1.02, p[1]);m.put(cap, '#9a5144');
    }
  }

  function* detail(b: Building, f: Facade): Generator<void> {
    const k = b.style, h = b.height, trim = b.trim;
    if (k === 'vivoClinic') {yield* vivoClinic(b, f);return;}
    band(f, .34, .68, .13, k === 'rehabCorner' ? '#6f7774' : '#91948b');
    if (k === 'longNorth' || k === 'rehabCorner') band(f, h - .07, .17, .26, trim);
    else a.cornice(f, h, trim);
    const [left, right] = frontRange(b), span = right - left;

    if (k === 'historic23') {
      for (const yy of [.78, 3.65]) band(f, yy, .13, .25, trim);
      for (const {i, u, pitch} of axes(b, f, 10)) {
        if (i === 2 || i === 9) continue;
        window(f, u, 2.35, Math.min(1.18, pitch * .63), 2.10, trim, '#6e6c5e');
        yield;
      }
      for (const fraction of [.02, .38, .68, .98]) {
        const u = uAtX(f, left + span * fraction);if (u !== null) pilaster(f, u, h - .2, trim, .27);
      }
      const u = uAtX(f, 1030.50);
      if (u !== null) {
        lateralEntry23(b, f, u);
        f.panel(u, 4.02, .25, 5.25, .53, .14, '#ded7bd');f.label('MAGELLAN-TUR', u, 3.91, .25, '#4e5d4d');
      }
      const blocked = uAtX(f, right - .85);if (blocked !== null) f.panel(blocked, 1.95, .09, 1.26, 2.70, .13, b.wall);
    } else if (k === 'house21') {
      const lower = Math.min(3.15, h * .47);
      band(f, lower / 2, lower, .14, '#926b59');band(f, lower, .20, .28, '#ddd9c9');
      for (let y = .18; y < lower; y += .23) {
        band(f, y, .025, .18, '#b4987c');
        for (let u = .35 + (Math.round(y / .23) % 2) * .35; u < f.len; u += .70) f.panel(u, y + .11, .20, .021, .19, .035, '#ae8e74', true);
      }
      for (const fraction of [.25, .75]) {
        const u = uAtX(f, left + span * fraction);if (u === null) continue;
        window(f, u, h - 1.75, 2.45, 1.87, '#ecece2', '#dedfd7');
        for (const sign of [-1, 1]) f.panel(u + sign * .41, h - 1.75, .43, .055, 1.87, .06, '#e3e5dc', true);
      }
      for (const fraction of [.19, .50]) {
        const u = uAtX(f, left + span * fraction);if (u !== null) f.window(u, 1.58, 1.70, 2.08, '#e4e4d9', '#e5e6de');
      }
      const door = uAtX(f, left + span * .84);if (door !== null) shared.door(f, door, .02, 1.16, 2.50, '#cbd3cb');
      const center = uAtX(f, (left + right) / 2);if (center !== null) a.pediment(f, center, h + .05, span * .54, .78, f.y, '#e7ded4');
    } else if (k === 'historic17') {
      const brown = segment(f, left, left + span * .33);
      if (brown) {band(brown, h / 2, h - .18, .08, '#897367');a.cornice(brown, h, '#d4c8bd');}
      for (let i = 0; i < 8; i++) {
        const u = uAtX(f, left + span * (.20 + i * .09));if (u === null) continue;
        window(f, u, 2.25, 1.10, 1.90, trim, '#7b7466');
        if (i < 2) {
          f.panel(u, 2.25, .48, 1.07, 1.86, .06, '#898d84');
          for (let y = 1.40; y < 3.15; y += .16) f.panel(u, y, .53, 1.04, .026, .035, '#5d665c', true);
        }
        if (i === 1 || i === 4) pilaster(f, u + .83, h - .20, trim, .18);
        yield;
      }
      const door = uAtX(f, left + 1.30);
      if (door !== null) {
        const bottom = entry(b, f, door, 1.70, .26, .48, false, 1.10, 2.48, '#69503e', 'September2025 intermediate225: western beauty-salon portal with two visible reddish steps', '#956e5d');
        f.panel(door, bottom + 1.60, .41, .73, 1.30, .035, '#61746c', false, 1);
        a.pediment(f, door, h + .06, 2.35, .63, f.y, '#75434a');
        f.panel(door, bottom + 2.70, .28, 1.65, .19, .42, trim);
        f.panel(door, 3.40, .27, 1.90, .43, .16, '#d6c5b7');f.label('DG BEAUTY', door, 3.30, .18, '#5b4943');
      }
      const blocked = uAtX(f, right - span * .045);if (blocked !== null) {f.panel(blocked, 1.74, .09, 1.18, 2.85, .12, b.wall);a.pediment(f, blocked, h + .04, 2.30, .58, f.y, trim);}
    } else if (k === 'historic15') {
      band(f, 1.75, 3.50, .11, '#e7e8df');band(f, 3.58, .24, .32, trim);
      for (let yy = .42; yy < 3.45; yy += .39) band(f, yy, .028, .17, '#c0c7bd');
      for (const {i, u, pitch} of axes(b, f, 7)) {
        if (i === 3) {
          const bottom = entry(b, f, u, 1.75, .26, .40, false, 1.24, 2.58, '#514334');
          a.arch(f, u, bottom, 1.52, 3.02, f.y, '#514334', trim);shared.door(f, u, bottom, 1.22, 2.45, '#514334');
          shared.door(f, u, 4.12, 1.18, 2.27, '#645647');a.pediment(f, u, h + .13, 4.30, .82, f.y, trim);
          shared.balcony(f, u, 3.77, 6.10, 1.0);
          for (const sign of [-1, 1]) {
            const p = f.at(u + sign * 2.74, 1.35), q = f.at(u + sign * 2.82, .92);
            const start = new T.Vector3(p[0], ground(...p) + .05, p[1]), end = new T.Vector3(q[0], f.y + 3.78, q[1]);
            const delta = end.clone().sub(start), brace = new T.CylinderGeometry(.055, .055, delta.length(), 6);
            brace.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()));
            brace.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);m.put(brace, '#d9ddd4', false, true);
          }
        } else {
          window(f, u, 5.63, Math.min(1.30, pitch * .56), 2.18, trim, '#656e60', false);
          if (i < 3) window(f, u, 1.75, 1.22, 1.90, trim, '#56695c', true);
          else f.window(u, 1.76, Math.min(1.72, pitch * .72), 2.15, '#74604a', '#4d493d');
        }
        yield;
      }
      for (const fraction of [.02, .98]) {const u = uAtX(f, left + span * fraction);if (u !== null) pilaster(f, u, h, trim, .38);}
      const shop = segment(f, left + span * 4 / 7, right - .1);
      if (shop) {
        const center = shop.len / 2, bottomAt = twoStepShopPlatform15(shop);
        shop.panel(center, 3.14, .25, shop.len - .1, .62, .20, '#a64035');shop.label('LOMBARD', center, 3.00, .38, '#e6e1cc');
        for (const fraction of [1 / 6, 5 / 6]) {
          const door = shop.len * fraction;shared.door(shop, door, bottomAt(door), 1.12, 2.35, '#554a3e');
          const run = .58, approach = fraction > .5 ? door - .72 : door;
          const points = fraction > .5 ? [shop.at(approach, run + .42 + .8), shop.at(approach, .60), shop.at(door, .50)] : [shop.at(door, run + .42 + .8), shop.at(door, .50)];
          registerEntry(b, shop, door, shop.len - .06, .26, .42, points, 'normal', 'September2025: two outer doors on the shared two-step commercial platform; central glazed axis is a display window because its function is unclear. Western approach passes beside the visible inclined balcony support.');
        }
      }
    } else if (k === 'paleCorner') {
      const front = normal(f)[1] > .85, count = front ? 6 : Math.max(1, Math.round(f.len / 3.2));
      band(f, .42, .84, .14, '#6d7773');
      for (let i = 0; i < count; i++) {
        const u = (i + .5) * f.len / count;f.window(u, 2.05, 1.22, 1.80, '#bac9bd', '#71827b');
        if (front && i === count - 1) f.panel(u, 3.08, .14, 1.28, .42, .13, '#4f5954');
        yield;
      }
    } else if (k === 'tighina14') {
      yield* tighina14(b, f);
    } else if (k === 'rehabCorner') {
      yield* rehabCorner(b, f);
    } else if (k === 'long32' || k === 'longNorth') {
      yield* longNorth(b, f);
    } else if (k === 'packing19') {
      band(f, h / 2, h - .25, .09, '#636b69');band(f, .30, .60, .18, '#444c48');
      for (const {i, u} of axes(b, f, 3)) {
        if (i === 1) entry(b, f, u, 1.65, .26, .40, false, 1.12, 2.38, '#725540', 'September2025 intermediate225: central opaque brown door, two low grey steps');
        else {f.window(u, 1.70, 1.38, 1.92, '#dedfd6', '#d8dfd6');grille(f, u, 1.70, 1.34, 1.87, '#dce1d7');}
        yield;
      }
      f.panel(f.len / 2, h - .60, .24, f.len - .20, .72, .18, '#3e4542');f.label('PACKING YARD AMBALAJ', f.len / 2, h - .75, .21, '#e3e6dc');
      f.panel(f.len - .42, 2.57, .30, .32, .30, .06, '#d7d9cd');f.label('19', f.len - .42, 2.49, .14, '#555c50');
    } else if (k === 'blockedPortal') {
      const u = f.len / 2, width = Math.min(2.25, f.len - .50), rise = .26, landing = .36;
      const bottom = shared.stairs(f, u, width, rise, landing, false);
      a.arch(f, u, bottom + .10, Math.min(1.68, f.len * .57), 2.85, f.y, '#a6a69b', trim, 0);
      for (const sign of [-1, 1]) pilaster(f, u + sign * Math.min(1.28, f.len * .38), h - .08, trim, .31);
      a.pediment(f, u, h + .05, Math.max(2.35, f.len + .05), .82, f.y, trim);
      f.panel(u, bottom + 1.25, .40, Math.min(1.48, f.len * .51), 2.32, .055, '#a5a599');
      registerEntry(b, f, u, width, rise, landing, [f.at(u, .58 + landing + .8), f.at(u, .50)], 'normal', 'September2025: two old steps in front of a completely infilled historical arch; not a usable door', 'blocked-historical-portal');
    }
    yield;
  }

  function* tighina14(b: Building, f: Facade): Generator<void> {
    const h = b.height, trim = b.trim, n = normal(f);
    if (n[0] < -.30 && n[1] > .30) {
      const bottom = entry(b, f, f.len / 2, 2.20, .39, .45, false, 1.24, 2.72, '#333b38', '15February2020 identified photograph: approximately three corner steps; persistence into2025 estimated');
      pedimentPortal(f, f.len / 2, h, 2.90, trim);f.panel(f.len / 2, bottom + 2.92, .28, 1.82, .18, .48, trim);
      yield;return;
    }
    if (n[1] > .85) {
      const [left, right] = frontRange(b), span = right - left, doorX = right - 1.45;
      for (let i = 0; i < 5; i++) {
        const u = uAtX(f, left + 1.65 + i * (span - 5.0) / 5);if (u === null) continue;
        window(f, u, 2.39, 1.22, 2.11, trim, '#303a36');f.panel(u, .91, .25, 1.52, .46, .20, '#deded2');
        f.panel(u, .91, .37, 1.20, .25, .08, '#bfc4ba');yield;
      }
      const door = uAtX(f, doorX);
      if (door !== null) {entry(b, f, door, 2.38, .65, .54, false, 1.20, 2.63, '#374039', '15February2020 identified photograph: approximately five lateral steps; persistence into2025 estimated');pedimentPortal(f, door, h, 3.18, trim);}
    } else {
      const street = segmentOnZ(f, 446.6, 455.7);
      if (street) for (let i = 0; i < 3; i++) {
        const u = (i + .5) * street.len / 3;
        if (i === 1) {street.panel(u, 2.38, .10, 1.18, 2.12, .12, b.wall);window(street, u, 2.38, 1.20, 2.14, trim, '#cbd0c4');street.panel(u, 2.38, .46, 1.17, 2.10, .06, b.wall);}
        else window(street, u, 2.38, 1.18, 2.10, trim, '#343d37');
        street.panel(u, .91, .24, 1.48, .40, .20, trim);yield;
      }
    }
    for (let y = .9; y < h - .5; y += .48) for (const u of [.18, f.len - .18]) f.panel(u, y, .17, .42, .055, .16, '#bfc6ba', true);
  }

  function segmentOnZ(f: Facade, z0: number, z1: number): Facade | null {
    const p = f.at(0), q = f.at(f.len), dz = q[1] - p[1];if (Math.abs(dz) < .05) return null;
    const lo = Math.max(Math.min(p[1], q[1]), z0), hi = Math.min(Math.max(p[1], q[1]), z1);if (hi - lo < .05) return null;
    const uu = [(lo - p[1]) / dz * f.len, (hi - p[1]) / dz * f.len].sort((a, b) => a - b);
    return m.facade(f.at(uu[0]), f.at(uu[1]), f.y);
  }

  function* rehabCorner(b: Building, f: Facade): Generator<void> {
    const h = b.height, n = normal(f);
    if (n[1] < -.85) {
      const grey = segment(f, 1151, 1163.3), yellow = segment(f, 1163.3, 1177.1), white = segment(f, 1177.1, 1193.0);
      if (grey) band(grey, h / 2, h - .16, .09, '#a6aaa3');
      if (yellow) band(yellow, h / 2, h - .16, .09, '#d5bc63');
      if (white) {
        band(white, h / 2, h - .15, .09, '#d5dbd4');
        for (let yy = .80; yy < h - .15; yy += .23) band(white, yy, .026, .16, '#aeb8b1');
      }
      const westDoor = uAtX(f, 1153.55);
      if (westDoor !== null) {
        const bottom = entry(b, f, westDoor, 2.05, .26, .42, false, 1.14, 2.51, '#604839', 'September2025 East225: projected western portal, two reddish steps, brown door', '#9a7561');
        for (const sign of [-1, 1]) pilaster(f, westDoor + sign * 1.14, h - .05, '#d6d5c9', .29);
        a.pediment(f, westDoor, h + .04, 3.25, .68, f.y, '#d6d5c9');
        f.panel(westDoor, bottom + 2.72, .28, 1.80, .19, .36, '#d6d5c9');
        shared.canopy(f, westDoor, bottom + 2.93, 1.70);
      }
      for (const x of [1157.7, 1161.1]) {
        const u = uAtX(f, x);if (u !== null) {f.window(u, 2.05, 1.28, 1.86, '#d1d4ca', '#424b45');yield;}
      }
      for (const x of [1165.5, 1173.3, 1176.0]) {
        const u = uAtX(f, x);if (u !== null) {f.window(u, 1.75, 1.76, 2.12, '#ddd9bb', '#544f3d');yield;}
      }
      const sportDoor = uAtX(f, 1168.7);
      if (sportDoor !== null) entry(b, f, sportDoor, 1.55, .13, .38, false, 1.12, 2.43, '#67634e', 'September2025: DeltaSport entrance within the yellow storefront; small threshold dimensions estimated');
      if (yellow) {
        const p = yellow.at(yellow.len / 2, .70);m.box(p[0], yellow.y + 3.24, p[1], yellow.len + .10, .10, 1.45, '#a3aa9d', false, false, angle(yellow));
        for (const u of [.35, yellow.len - .35]) {
          const p = yellow.at(u, .15), q = yellow.at(u, 1.28);m.beam(new T.Vector3(p[0], yellow.y + 2.83, p[1]), new T.Vector3(q[0], yellow.y + 3.22, q[1]), .023, '#777f72');
        }
        yellow.label('DELTA SPORT', yellow.len / 2, 3.55, .28, '#685d38');
      }
      for (const x of [1179.4]) {
        const u = uAtX(f, x);if (u !== null) {f.window(u, 2.18, 2.45, .84, '#e6e9df', '#e3e9e1');yield;}
      }
      for (const x of [1183.4, 1188.7]) {
        const u = uAtX(f, x);if (u !== null) {entry(b, f, u, 1.65, .26, .42, false, 1.15, 2.42, '#d8e0da', 'September2025: two entry axes near Tighina corner; small stair dimensions estimated');shared.canopy(f, u, 2.91, 1.9);yield;}
      }
      const sign = uAtX(f, 1186.0);if (sign !== null) {f.panel(sign, h - .41, .24, 10.8, .58, .14, '#e0e5df');f.label('REABILITOLOG', sign, h - .57, .44, '#50957f');}
    } else {
      // The large painted panel is visibly present. Its finer figurative
      // content cannot be resolved from the current source angle.
      f.panel(f.len / 2, 2.10, .17, f.len - .40, 2.48, .08, '#a3b9b1');
      for (let i = 0; i < 7; i++) {
        const u = (i + .5) * f.len / 7;f.panel(u, 1.72 + .23 * Math.sin(i), .22, f.len / 7 + .04, .65 + .18 * (i % 3), .04, ['#91aaa2', '#c6d2c5', '#739a95'][i % 3]);
      }
      f.label('REABILITOLOG', f.len / 2, 3.32, .25, '#527c72');yield;
    }
  }

  function* longNorth(b: Building, f: Facade): Generator<void> {
    const h = b.height, trim = b.trim;
    if (b.style === 'longNorth') {
      // The neighbouring cadastral body is one storey. Thirteen axes are
      // visible in the middle panorama; distributing them on the full mapped
      // street edge is an estimate, with no invented functioning entrance.
      for (const {i, u, pitch} of axes(b, f, 13)) {
        const width = Math.min(1.52, pitch * .52), height = Math.min(2.45, h - 1.25), center = .88 + height / 2;
        window(f, u, center, width, height, '#c9d1c4', '#52615a');
        if (![3, 9].includes(i)) {
          const full = [1, 4, 6, 10].includes(i), panelHeight = height - (full ? .03 : .50);
          f.panel(u, .88 + panelHeight / 2, .48, width - .04, panelHeight, .055, i % 2 ? '#c1c6bb' : '#b2bab0');
          if (!full && i % 3 === 0) grille(f, u, .88 + height - .24, width - .08, .45, '#56645a');
        }
        if (i % 2 === 0) {
          f.panel(u + pitch * .29, .60 + (i % 3) * .18, .14, .72 + (i % 3) * .18, .56, .07, '#a6aa98');
          for (let j = 0; j < 3; j++) f.panel(u + pitch * .29 + (j - 1) * .16, .78 + j * .08, .19, .035, .40, .025, '#87988c', true);
        }
        yield;
      }
      return;
    }
    // About fourteen total axes across overlapping September2025 views;
    // the full count and spacing remain estimates because of tree occlusion.
    const count = 14;
    const storey = h / 2;
    band(f, storey, .22, .30, trim);band(f, .34, .68, .18, '#8d9389');
    for (const {i, u, pitch} of axes(b, f, count)) {
      for (let row = 0; row < 2; row++) {
        const center = row * storey + 1.92, width = Math.min(1.25, pitch * .56), height = Math.min(2.15, storey * .61);
        window(f, u, center, width, height, trim, '#697a70');
        if ((row === 0 && [0, 1, 4, 5, 9, 10].includes(i)) || (row === 1 && [3, 6].includes(i))) {
          f.panel(u, center - .13, .48, width - .03, height - .25, .05, '#b5b9ae');
          if (row === 0) f.panel(u, center + height / 2 - .10, .49, width - .06, .21, .05, '#394740');
        } else if (i >= 9) {
          f.panel(u, center, .40, width - .03, height - .03, .04, '#35433d');
          if (row === 1) f.panel(u + (i % 2 ? .18 : -.18), center - height * .32, .43, width * .55, height * .27, .04, '#a2aa9c');
        }
      }
      if (i === 0 || i === 2 || i >= 9) pilaster(f, u - pitch * .47, h - .20, trim, i < 9 ? .28 : .21);
      if (i % 3 === 1) f.panel(u + pitch * .33, .78, .14, .58, .40, .07, '#a3a992');
      yield;
    }
    for (let u = .25; u < f.len; u += .54) f.panel(u, h - .50, .27, .18, .21, .24, trim, true);
  }

  function* vivoClinic(b: Building, f: Facade): Generator<void> {
    const split = 1118.30, west = segment(f, 1113.0, split), east = segment(f, split, 1133.6);
    if (west) {
      const h = b.parts?.find(p => Math.max(...(p.p ?? []).map(p => p[0])) <= split + .02)?.height ?? 5.6;
      band(west, .22, .44, .12, '#89928b');a.cornice(west, h, '#e9eae2');
      const door = uAtX(west, 1115.10);
      if (door !== null) {shared.door(west, door, .035, 1.32, 2.75, '#81948c');west.window(door, 4.14, 2.40, .70, '#e8e9e1', '#687f76');west.label('VIVOSCAN', door, 3.26, .29, '#4a8f83');}
      yield;
    }
    if (east) {
      const h = b.height;
      band(east, .24, .48, .13, '#969b92');band(east, 3.48, .18, .28, '#e7e9df');a.cornice(east, h, '#e6e9df');
      const middle = east.at(east.len / 2), curved = middle[0] > 1120.10 && middle[0] < 1123.44 && east.len < 1.2;
      if (curved) {
        for (const center of [1.86, 5.20]) {
          east.panel(east.len / 2, center, .25, Math.max(.20, east.len - .10), 2.13, .035, '#6c8581', false, 1);
          for (const u of [.02, east.len - .02]) east.panel(u, center, .31, .065, 2.26, .08, '#e5e9df', true);
          east.panel(east.len / 2, center + .57, .32, east.len, .06, .07, '#e5e9df', true);
        }
      }
      for (const x of [1120.4, 1123.8, 1127.2, 1130.6]) {
        const u = uAtX(east, x);if (u === null) continue;
        if (!curved) for (const center of [1.86, 5.20]) east.window(u, center, 1.72, 2.13, '#e8eae1', '#71887f');
        const y = h + .28;east.panel(u, y + .85, .12, 2.46, 1.80, .22, '#e7e9e1');east.window(u, y + .85, 1.72, 1.36, '#e6e8df', '#70857c');
        a.pediment(east, u, y + 1.78, 2.62, .54, east.y, '#864e42');yield;
      }
      const sign = uAtX(east, 1125.0);if (sign !== null) east.label('VIVOCLINIC', sign, h - .67, .42, '#5b9d89');
      const door = uAtX(east, 1132.08);if (door !== null) shared.door(east, door, .035, 1.16, 2.52, '#7c958c');
      const turret = uAtX(east, 1131.75);
      if (turret !== null) {
        // September2025 East270 resolves the roof as red-brown and a small
        // domed eastern turret. Position/radius/heights are photo estimates.
        const x = 1131.75, z = 482.03, base = east.y + h + 1.00;
        const drum = new T.CylinderGeometry(1.03, 1.03, 1.20, 12);drum.translate(x, base + .60, z);m.put(drum, '#e4e7dd');
        const dome = new T.LatheGeometry([new T.Vector2(1.14, 0), new T.Vector2(1.08, .28), new T.Vector2(.84, .72), new T.Vector2(.48, 1.04), new T.Vector2(.12, 1.20), new T.Vector2(0, 1.24)], 12);
        dome.translate(x, base + 1.20, z);m.put(dome, '#864d42');
        const tip = new T.ConeGeometry(.065, .48, 6);tip.translate(x, base + 2.68, z);m.put(tip, '#777e72', true);yield;
      }
    }
  }

  return {a, normal, angle, handles, detail, entryRoutes: () => routes.map(r => ({...r, points: r.points.map(p => [...p] as XY)}))};
}
