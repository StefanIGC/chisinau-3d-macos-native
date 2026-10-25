'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RasterMap, START, START_HASH, type GeoPoint } from './geo-map';

type Camera = { camera: GeoPoint; target: GeoPoint; bearing: number; distance: number; hash: string };
type Status = 'loading' | 'ready' | 'unsupported' | 'error';
const validPoint = (p: GeoPoint | undefined) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

export default function StreetsExplorer() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [progress, setProgress] = useState(0);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [fallback, setFallback] = useState(START);
  const [zoom, setZoom] = useState(15);
  const [worldZoom, setWorldZoom] = useState(14);
  const [collapsed, setCollapsed] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [hash, setHash] = useState(START_HASH);
  const isFallback = status === 'unsupported' || status === 'error';

  useEffect(() => {
    const supplied = window.location.hash.slice(1).split(',').map(Number);
    if (supplied.length === 5 && supplied.every(Number.isFinite) && validPoint({lat: supplied[0], lon: supplied[1]})) {
      setHash(supplied.join(','));
      setFallback({lat: supplied[0], lon: supplied[1]});
    }
  }, []);

  useEffect(() => {
    let lastAddressUpdate = 0;
    const requestStatus = () => frame.current?.contentWindow?.postMessage({type: 'streets-request-status'}, window.location.origin);
    const handshake = window.setInterval(requestStatus, 500);
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (data?.type === 'streets-status' && ['loading', 'ready', 'unsupported', 'error'].includes(data.status)) {
        window.clearInterval(handshake);
        setStatus(data.status);
        if (Number.isFinite(data.progress)) setProgress(Math.max(0, Math.min(1, data.progress)));
      }
      if (data?.type === 'streets-camera' && validPoint(data.camera) && validPoint(data.target) && Number.isFinite(data.bearing) && Number.isFinite(data.distance) && typeof data.hash === 'string' && /^[-\d.,]+$/.test(data.hash)) {
        setCamera(data);
        setFallback(data.camera);
        if (Date.now() - lastAddressUpdate > 1000) {
          history.replaceState(null, '', `#${data.hash}`);
          lastAddressUpdate = Date.now();
        }
      }
    };
    window.addEventListener('message', listener);
    requestStatus();
    const timeout = window.setTimeout(() => { window.clearInterval(handshake); setStatus(current => current === 'loading' ? 'error' : current); }, 90000);
    return () => { window.removeEventListener('message', listener); window.clearTimeout(timeout); window.clearInterval(handshake); };
  }, [frameKey]);

  const navigate = useCallback((point: GeoPoint) => {
    if (isFallback) {
      setFallback(point);
      history.replaceState(null, '', `#${point.lat.toFixed(5)},${point.lon.toFixed(5)},45.00,0.00,1206.19`);
      return;
    }
    frame.current?.contentWindow?.postMessage({ type: 'streets-navigate', ...point, pitch: 45, yaw: camera?.bearing ?? 0, distance: camera?.distance ?? 1206.19 }, window.location.origin);
  }, [camera?.bearing, camera?.distance, isFallback]);

  const current = isFallback ? fallback : camera?.camera ?? fallback;
  const externalHash = isFallback ? `${current.lat.toFixed(5)},${current.lon.toFixed(5)},45,0,1206.19` : camera?.hash ?? hash;
  function retry() { setHash(externalHash); setStatus('loading'); setProgress(0); setFrameKey(k => k + 1); }

  return <main className={`streets-view${isFallback ? ' streets-fallback' : ''}`} aria-label="Harta mondială Streets GL">
    <iframe key={frameKey} ref={frame} className="streets-frame" src={`/streets/index.html#${hash}`}
      title="Streets GL — harta 3D completă" allow="fullscreen" allowFullScreen loading="eager" />
    {isFallback && <div className="world-map"><RasterMap full center={fallback} zoom={worldZoom} onNavigate={navigate} onZoom={setWorldZoom}/>
      <div className="world-zoom"><button aria-label="Mărește harta" onClick={() => setWorldZoom(z => Math.min(19, z + 1))}>+</button><button aria-label="Micșorează harta" onClick={() => setWorldZoom(z => Math.max(2, z - 1))}>−</button></div>
    </div>}
    <nav className="streets-links" aria-label="Opțiuni hartă">
      <button onClick={() => navigate(START)}>Chișinău</button><span aria-hidden="true"/>
      <a href="/joc">Joc anterior</a><span aria-hidden="true"/>
      <a href={`https://streets.gl/#${externalHash}`} target="_blank" rel="noopener noreferrer">Streets GL ↗</a>
    </nav>
    {status === 'loading' && <div className="streets-loading" role="status"><span className="streets-spinner"/>Se încarcă Streets GL{progress > 0 ? ` · ${Math.round(progress * 100)}%` : '…'}</div>}
    {isFallback && <section className="streets-notice" aria-live="polite">
      <strong>{status === 'unsupported' ? '3D nu este disponibil în acest browser' : 'Vizualizarea 3D nu s-a putut încărca'}</strong>
      <p>Poți naviga pe întreaga hartă 2D. Pentru 3D, folosește un browser cu WebGL2 și accelerare grafică.</p>
      <button onClick={retry}>Reîncearcă 3D</button>
    </section>}
    <aside className={`geo-minimap${collapsed ? ' geo-collapsed' : ''}`} aria-label="Mini-hartă de orientare">
      <header><span><i/>{isFallback ? 'Poziție pe hartă' : camera ? 'Ești aici · cameră' : 'Poziție de pornire'}</span>
        <button onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Arată mini-harta' : 'Ascunde mini-harta'} aria-expanded={!collapsed}>{collapsed ? '⌃' : '⌄'}</button></header>
      {!collapsed && <><RasterMap center={current} zoom={zoom} bearing={isFallback ? 0 : camera?.bearing ?? 0} target={isFallback ? undefined : camera?.target} onNavigate={navigate} onZoom={setZoom}/>
        <div className="geo-map-tools"><button onClick={() => setZoom(z => Math.max(2, z - 1))} aria-label="Micșorează mini-harta">−</button><span>{current.lat.toFixed(5)}, {current.lon.toFixed(5)}</span><button onClick={() => setZoom(z => Math.min(19, z + 1))} aria-label="Mărește mini-harta">+</button></div>
        <footer><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></footer></>}
    </aside>
    {isFallback && <div className="fallback-credit">Hartă © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · Motor 3D <a href="https://streets.gl" target="_blank" rel="noopener noreferrer">Streets GL</a></div>}
  </main>;
}
