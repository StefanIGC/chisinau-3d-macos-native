'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';

export type GeoPoint = { lat: number; lon: number };
export const START: GeoPoint = { lat: 47.02843, lon: 28.82546 };
export const START_HASH = '47.02843,28.82546,45.00,0.00,1206.19';

export function worldPixel(point: GeoPoint, zoom: number) {
  const size = 256 * 2 ** zoom;
  const latitude = Math.max(-85.05112878, Math.min(85.05112878, point.lat)) * Math.PI / 180;
  return { x: (point.lon + 180) / 360 * size, y: (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * size };
}

export function pixelPoint(x: number, y: number, zoom: number): GeoPoint {
  const size = 256 * 2 ** zoom;
  const n = Math.PI - 2 * Math.PI * Math.max(0, Math.min(size, y)) / size;
  return { lat: Math.atan(Math.sinh(n)) * 180 / Math.PI, lon: ((x / size * 360) % 360 + 360) % 360 - 180 };
}

export function RasterMap({ center, zoom, bearing = 0, target, player, targetLabel, onSelect, disabled = false, onNavigate, onZoom, full = false }: {
  center: GeoPoint; zoom: number; bearing?: number; target?: GeoPoint; player?: GeoPoint; targetLabel?: string; onSelect?:(point:GeoPoint)=>void; disabled?:boolean;
  onNavigate: (point: GeoPoint) => void; onZoom: (zoom: number) => void; full?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id:number; x: number; y: number; origin: GeoPoint; moved: boolean } | null>(null);
  const lastWheel=useRef(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState({ width: full ? 1024 : 280, height: full ? 768 : 184 });
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const position = worldPixel(center, zoom);
  const tileX = Math.floor(position.x / 256), tileY = Math.floor(position.y / 256), count = 2 ** zoom;
  const radiusX = Math.ceil(size.width / 512), radiusY = Math.ceil(size.height / 512);
  const tiles = [];
  for (let dy = -radiusY; dy <= radiusY; dy++) for (let dx = -radiusX; dx <= radiusX; dx++) {
    const x = tileX + dx, y = tileY + dy;
    if (y < 0 || y >= count) continue;
    const wrappedX = ((x % count) + count) % count;
    tiles.push(<img key={`${zoom}/${x}/${y}`} src={`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`}
      alt="" draggable={false} width={256} height={256} loading="eager" decoding="async"
      onError={() => setFailed(true)} onLoad={() => setFailed(false)}
      style={{ left: `calc(50% + ${x * 256 - position.x + offset.x}px)`, top: `calc(50% + ${y * 256 - position.y + offset.y}px)` }} />);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0 || drag.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id:event.pointerId, x: event.clientX, y: event.clientY, origin: center, moved: false };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !drag.current || drag.current.id!==event.pointerId) return;
    const x = event.clientX - drag.current.x, y = event.clientY - drag.current.y;
    if (Math.hypot(x, y) > 4) drag.current.moved = true;
    setOffset({ x, y });
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (disabled || !start || start.id!==event.pointerId || !root.current) return;
    const origin = worldPixel(start.origin, zoom);
    const rect = root.current.getBoundingClientRect();
    const x = start.moved ? start.x - event.clientX : event.clientX - rect.left - rect.width / 2;
    const y = start.moved ? start.y - event.clientY : event.clientY - rect.top - rect.height / 2;
    drag.current = null;
    setOffset({ x: 0, y: 0 });
    (start.moved ? onNavigate : onSelect ?? onNavigate)(pixelPoint(origin.x + x, origin.y + y, zoom));
  }
  const playerPixel = player ? worldPixel(player,zoom) : position;
  const wrapOffset=(x:number)=>((x+count*128)%(count*256)+count*256)%(count*256)-count*128;
  const targetPixel = target ? worldPixel(target, zoom) : null;
  return <div ref={root} className={`geo-raster${full ? ' geo-raster-full' : ''}`} role="application"
    aria-label={onSelect ? 'Hartă pentru teleportare. Trage sau folosește săgețile pentru deplasare. Clic sau Enter pentru a selecta, plus și minus pentru zoom.' : full ? 'Hartă mondială 2D. Trage pentru deplasare, folosește plus și minus pentru zoom.' : 'Mini-hartă cu poziția și direcția camerei. Apasă pe hartă pentru navigare.'}
    tabIndex={0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
    onPointerCancel={() => { drag.current = null; setOffset({ x: 0, y: 0 }); }}
    onWheel={event => {if(disabled||drag.current||performance.now()-lastWheel.current<160)return;lastWheel.current=performance.now();onZoom(Math.max(2,Math.min(19,zoom+(event.deltaY<0?1:-1))));}}
    onKeyDown={event => {
      if(disabled)return;
      if(onSelect&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onSelect(center);}
      const delta = ({ ArrowLeft: [-90, 0], ArrowRight: [90, 0], ArrowUp: [0, -90], ArrowDown: [0, 90] } as Record<string, number[]>)[event.key];
      if (delta) { event.preventDefault(); onNavigate(pixelPoint(position.x + delta[0], position.y + delta[1], zoom)); }
      if (event.key === '+' || event.key === '=') onZoom(Math.min(19, zoom + 1));
      if (event.key === '-') onZoom(Math.max(2, zoom - 1));
    }}>
    {tiles}
    {targetPixel && <span className={`geo-target${onSelect ? ' geo-selected' : ''}`} title={targetLabel??"Punctul spre care privești"} style={{ left: `calc(50% + ${wrapOffset(targetPixel.x - position.x) + offset.x}px)`, top: `calc(50% + ${targetPixel.y - position.y + offset.y}px)` }} />}
    <span className="geo-position" title={player?"Poziția ta":"Poziția camerei"} style={{ transform: `translate(-50%, -50%) translate(${wrapOffset(playerPixel.x-position.x)+offset.x}px,${playerPixel.y-position.y+offset.y}px) rotate(${bearing}deg)` }}>
      <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 30L8 1Q30 -8 52 1Z" fill="#2587ed" opacity=".2"/><path d="M30 17L39 40L30 35L21 40Z" fill="#1677e8" stroke="white" strokeWidth="3" strokeLinejoin="round"/></svg>
    </span>
    <span className="geo-north" aria-hidden="true">N ↑</span>
    {failed && <span className="geo-tile-error">Unele zone nu s-au încărcat.</span>}
  </div>;
}
