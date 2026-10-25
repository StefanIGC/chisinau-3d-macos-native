'use client';
import {useEffect,useRef,useState} from 'react';
import {Crosshair,MapPin,Minus,Plus,X,ArrowUpRight} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle} from '@/components/ui/dialog';
import {RasterMap,type GeoPoint} from './geo-map';
import {localToGeo} from './streets-coordinates';

export type MapPosition=GeoPoint&{bearing:number};
export function TeleportMap({player,ready,onClose,onTeleport}:{player:MapPosition;ready:boolean;onClose:()=>void;onTeleport:(point:GeoPoint,signal:AbortSignal)=>Promise<void>}){
  const [center,setCenter]=useState<GeoPoint>(player),[zoom,setZoom]=useState(16);
  const [selected,setSelected]=useState<GeoPoint>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const request=useRef<AbortController|null>(null),mounted=useRef(true),mapArea=useRef<HTMLDivElement>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
  const select=(point:GeoPoint)=>{if(busy)return;setSelected(point);setError('');};
  async function confirm(){
    if(!selected||!ready||busy)return;
    const controller=new AbortController();request.current=controller;setBusy(true);setError('');
    try{await onTeleport(selected,controller.signal);if(mounted.current)onClose();}
    catch(e){if(mounted.current&&(e as Error).name!=='AbortError')setError((e as Error).message||'Teleportarea nu a reușit. Încearcă din nou.');}
    finally{if(mounted.current)setBusy(false);request.current=null;}
  }
  return <Dialog open onOpenChange={open=>{if(!open){request.current?.abort();onClose();}}}>
    <DialogContent className="teleport-dialog" showCloseButton={false} aria-describedby={undefined} onCloseAutoFocus={e=>e.preventDefault()} onOpenAutoFocus={e=>{e.preventDefault();mapArea.current?.querySelector<HTMLElement>('.geo-raster')?.focus();}}>
      <header className="teleport-header"><div><DialogTitle>Hartă</DialogTitle></div><div className="teleport-sectors"><button className="teleport-sector" disabled={busy} onClick={()=>{const p=localToGeo(1310,-355.5);select(p);setCenter(p);setZoom(18);}} aria-label="Arată strada Columna între Tighina și Ismail">Columna · Ismail</button><button className="teleport-sector" disabled={busy} onClick={()=>{const p=localToGeo(-215,478);select(p);setCenter(p);setZoom(18);}} aria-label="Arată strada București între Bănulescu-Bodoni și Nicolae Iorga">București · Iorga</button></div><button className="teleport-close" onClick={()=>{request.current?.abort();onClose();}} aria-label="Închide harta"><X size={22}/></button></header>
      <div className="teleport-map-area" ref={mapArea}>
        <RasterMap full center={center} zoom={zoom} player={player} bearing={player.bearing} target={selected} targetLabel="Destinația selectată" onNavigate={setCenter} onSelect={select} onZoom={setZoom} disabled={busy}/>
        <div className="teleport-map-tools" aria-label="Controalele hărții"><button onClick={()=>setZoom(z=>Math.min(19,z+1))} disabled={busy||zoom===19} aria-label="Mărește harta"><Plus size={21}/></button><button onClick={()=>setZoom(z=>Math.max(2,z-1))} disabled={busy||zoom===2} aria-label="Micșorează harta"><Minus size={21}/></button><button onClick={()=>{setCenter(player);setZoom(16);}} disabled={busy} aria-label="Arată poziția mea" title="Poziția mea"><Crosshair size={21}/></button></div>
        <div className="teleport-legend"><span className="teleport-player-dot"/> Poziția ta <span className="teleport-destination-dot"/> Destinație</div>
        <a className="teleport-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
      <footer className="teleport-footer">
        <div className="teleport-selection" aria-live="polite"><MapPin size={21}/><strong>{busy?'Se încarcă destinația…':selected?'Destinație selectată':'Alege un loc pe hartă'}</strong></div>
        {!ready&&<p className="teleport-feedback">Jocul 3D trebuie încărcat pentru teleportare.</p>}
        {error&&<p className="teleport-feedback teleport-error" role="alert">{error}</p>}
        <div className="teleport-actions"><button className="teleport-cancel" onClick={()=>{request.current?.abort();onClose();}}>Anulează</button><button className="teleport-confirm" onClick={confirm} disabled={!selected||!ready||busy}>{busy?<><span className="streets-spinner"/> Se încarcă…</>:<>Mergi aici <ArrowUpRight size={19}/></>}</button></div>
      </footer>
    </DialogContent>
  </Dialog>;
}
