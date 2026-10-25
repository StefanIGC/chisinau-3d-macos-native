'use client';
import {ArrowUp,ArrowDown,ArrowUpRight,Navigation,Pause,LogOut} from 'lucide-react';
import type {HelicopterAction,HelicopterHud} from './helicopter';

export function HelicopterControls({flight,driving,onAction,onPedal}:{flight:HelicopterHud;driving:boolean;onAction:(action:HelicopterAction)=>void;onPedal:(name:string,value:boolean)=>void}){
  const hold=(name:string)=>({onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);onPedal(name,true);},onPointerUp:()=>onPedal(name,false),onPointerCancel:()=>onPedal(name,false),onLostPointerCapture:()=>onPedal(name,false)});
  return <>
    {!driving&&!flight.piloting&&flight.near&&<button className="context-action" onClick={()=>onAction('interact')}><kbd>E</kbd>Urcă în elicopter</button>}
    {flight.piloting&&<>
      <section className="vehicle-readout" aria-label="Bord elicopter">
        <div className="readout-values"><span><strong>{flight.speed}</strong> km/h</span><span aria-label="Altitudine"><strong>{flight.altitude}</strong> m</span></div>
        <div className="readout-actions">
          <button aria-label="Staționează" title="Staționează" onClick={()=>onAction('hover')}><Pause size={18}/></button>
          <button aria-label="Aterizează" title="Aterizează" aria-pressed={flight.landing} disabled={flight.grounded} onClick={()=>onAction('land')}><Navigation size={18}/></button>
          <button aria-label={flight.grounded?'Coboară din elicopter':'Sari din elicopter'} title={flight.grounded?'E · Coboară':'E · Sari din elicopter'} onClick={()=>onAction('interact')}><LogOut size={18}/></button>
        </div>
      </section>
      <div className="flight-touch" aria-label="Comenzi tactile pentru zbor"><div className="flight-vertical"><button aria-label="Urcă elicopterul" {...hold('up')}><ArrowUp size={24}/></button><button aria-label="Coboară elicopterul" {...hold('down')}><ArrowDown size={24}/></button></div><button className="flight-boost" aria-label="Zboară mai repede" {...hold('boost')}><ArrowUpRight size={20}/></button></div>
    </>}
  </>;
}
