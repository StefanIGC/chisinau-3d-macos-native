'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {Menu, RotateCcw, Lightbulb, ParkingCircle, Bell, LogOut} from 'lucide-react';
import {TeleportMap, type MapPosition} from './teleport-map';
import {ORIGIN} from './streets-coordinates';
import type {GateHud} from './courtyard-gates';
import type {VehicleHud, VehicleAction} from './prius';
import type {WeaponHud} from './weapon';
import type {HelicopterHud} from './helicopter';
import type {createCity} from './world';
import {HelicopterControls} from './helicopter-controls';
import {GameMenu} from './game-menu';
import './game-hud.css';

type CityApi=ReturnType<typeof createCity>;
type Overlay='none'|'menu'|'map';
const STREETS_VISIBILITY_KEY='chisinau-streets-gl-visible';

export default function Home(){
  const host=useRef<HTMLDivElement>(null),map=useRef<HTMLCanvasElement>(null);
  const api=useRef<CityApi|null>(null),overlayRef=useRef<Overlay>('none'),streetsRef=useRef(true);
  const [overlay,setOverlay]=useState<Overlay>('none');
  const [mapPosition,setMapPosition]=useState<MapPosition>({...ORIGIN,bearing:0});
  const [ready,setReady]=useState(false),[preparing,setPreparing]=useState(false);
  const [started,setStarted]=useState(false),[paused,setPaused]=useState(false);
  const [error,setError]=useState(''),[sound,setSound]=useState(false),[firstPerson,setFirstPerson]=useState(false),[streetsEnabled,setStreetsEnabled]=useState(true);
  const [gate,setGate]=useState<GateHud>({near:false,open:false,name:''});
  const [vehicle,setVehicle]=useState<VehicleHud>({loaded:false,failed:false,driving:false,loading:false,near:false,nearTraffic:false,speed:0,gear:'P',mode:'READY',battery:.64,lights:false,message:''});
  const [weapon,setWeapon]=useState<WeaponHud>({loaded:false,failed:false,equipped:false,near:false,atTable:false,ammo:30,reserve:90,reloading:0,aiming:false,hit:false,message:''});
  const [flight,setFlight]=useState<HelicopterHud>({loaded:false,failed:false,piloting:false,near:false,speed:0,altitude:0,rotor:0,grounded:true,landing:false,message:''});
  const firePointer=useRef<{id:number;x:number;y:number}|null>(null);

  const begin=useCallback(()=>{if(ready&&!preparing&&!error)api.current?.start();},[ready,preparing,error]);
  const changeMenu=useCallback((open:boolean,resume=true)=>{
    if(open&&(!ready||preparing||overlayRef.current==='map'))return;
    overlayRef.current=open?'menu':'none';setOverlay(overlayRef.current);
    api.current?.setMenuOpen(open);
    if(!open&&resume)api.current?.start();
  },[ready,preparing]);
  const changeMap=useCallback((open:boolean)=>{
    if(open){
      api.current?.setMenuOpen(false);
      setMapPosition(api.current?.getMapPosition()??{...ORIGIN,bearing:0});
    }
    overlayRef.current=open?'map':'none';setOverlay(overlayRef.current);
    api.current?.setMapOpen(open);
    if(!open)api.current?.start();
  },[]);
  const carAction=(action:VehicleAction)=>api.current?.vehicle(action);
  const toggleStreets=useCallback(()=>{
    const next=!streetsRef.current;streetsRef.current=next;setStreetsEnabled(next);api.current?.streets(next);
    try{localStorage.setItem(STREETS_VISIBILITY_KEY,next?'on':'off');}catch{}
  },[]);
  const pedalEvents=(name:string)=>({
    onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);api.current?.pedal(name,true);},
    onPointerUp:()=>api.current?.pedal(name,false),onPointerCancel:()=>api.current?.pedal(name,false),onLostPointerCapture:()=>api.current?.pedal(name,false)
  });

  useEffect(()=>{
    let cancelled=false;
    try{streetsRef.current=localStorage.getItem(STREETS_VISIBILITY_KEY)!=='off';setStreetsEnabled(streetsRef.current);}catch{}
    import('./world').then(({createCity})=>{
      if(cancelled||!host.current||!map.current)return;
      api.current=createCity(host.current,map.current,{gate:setGate,preparing:setPreparing,ready:()=>setReady(true),location:()=>{},paused:setPaused,camera:setFirstPerson,started:()=>setStarted(true),error:setError,vehicle:setVehicle,helicopter:setFlight,sound:setSound,weapon:setWeapon});
      api.current.streets(streetsRef.current);
    }).catch(()=>setError('Orașul nu s-a putut încărca.'));
    return()=>{cancelled=true;api.current?.dispose();api.current=null;};
  },[]);

  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(event.code==='Tab'&&started&&overlayRef.current==='none'){
        event.preventDefault();event.stopImmediatePropagation();changeMenu(true);
      }else if(event.code==='Enter'&&overlayRef.current==='none'&&(!started||paused)){
        event.preventDefault();event.stopImmediatePropagation();begin();
      }else if(event.code==='KeyM'&&started){
        event.preventDefault();event.stopImmediatePropagation();changeMap(overlayRef.current!=='map');
      }
    };
    document.addEventListener('keydown',key,true);
    return()=>document.removeEventListener('keydown',key,true);
  },[started,paused,begin,changeMenu,changeMap]);

  const playing=started&&ready&&!preparing&&!error&&overlay==='none';
  const onFoot=!vehicle.driving&&!flight.piloting;
  const weaponNearby=weapon.near||(weapon.equipped&&weapon.atTable);
  const message=flight.message||vehicle.message||weapon.message;
  return <main className={`city-app compact-game ${!ready||preparing?'scene-preparing':''} ${flight.piloting?'is-flying':vehicle.driving?'is-driving':weapon.equipped?'is-armed':''}`}>
    <div className="world" ref={host} aria-label="Chișinău 3D"/>
    {!started&&!error&&<div className="mac-game-brand" aria-label="Chișinău 3D, ediția macOS"><strong>CHIȘINĂU 3D</strong><span>EDIȚIA macOS · CENTRU</span></div>}
    {(!ready||preparing)&&!error&&overlay!=='map'&&<div className="quiet-loading" role="status"><span className="load-spinner"/>Se încarcă…</div>}
    {error&&<div className="error-card"><p>{error}</p><button onClick={()=>window.location.reload()}>Reîncearcă</button></div>}
    {!started&&ready&&!preparing&&!error&&<button className="start-prompt" onClick={begin}>Apasă <kbd>Enter</kbd> pentru a începe</button>}
    {playing&&<>
      <button className="menu-trigger" aria-label="Deschide meniul" aria-keyshortcuts="Tab" onClick={()=>changeMenu(true)}><Menu size={18}/><kbd>Tab</kbd></button>
      {paused&&<button className="start-prompt resume-prompt" onClick={begin}>Apasă <kbd>Enter</kbd> pentru a continua</button>}
      {!paused&&onFoot&&<span className={`crosshair ${weapon.equipped?'weapon-crosshair':''} ${weapon.hit?'hit':''}`} aria-hidden="true"/>}
      {!paused&&<HelicopterControls flight={flight} driving={vehicle.driving} onAction={action=>api.current?.helicopter(action)} onPedal={(name,value)=>api.current?.pedal(name,value)}/>}
      {!paused&&onFoot&&!flight.near&&<>
        {weaponNearby&&weapon.loaded?<button className="context-action" onClick={()=>api.current?.weapon('interact')}><kbd>E</kbd>{weapon.equipped?'Muniție':'Ridică arma'}</button>
          :gate.near?<button className="context-action" onClick={()=>api.current?.gate()}><kbd>E</kbd>{gate.open?'Închide poarta':'Deschide poarta'}</button>
          :vehicle.near&&vehicle.loaded?<button className="context-action" onClick={()=>carAction('interact')}><kbd>E</kbd>Urcă în mașină</button>:null}
      </>}
      {vehicle.driving&&<section className="vehicle-readout" aria-label="Bord mașină">
        <div className="readout-values"><span><strong>{vehicle.speed}</strong> km/h</span><b className="readout-gear" aria-label="Treaptă">{vehicle.gear}</b></div>
        {vehicle.loading&&<div className="drive-loading" role="status"><span/>Se încarcă zona din față…</div>}
        <div className="readout-actions">
          <button aria-label="Parcare" aria-pressed={vehicle.gear==='P'} title="P · Parcare" onClick={()=>carAction('park')}><ParkingCircle size={18}/></button>
          <button aria-label="Faruri" aria-pressed={vehicle.lights} title="L · Faruri" onClick={()=>carAction('lights')}><Lightbulb size={18}/></button>
          <button aria-label="Claxon" title="H · Claxon" onClick={()=>carAction('horn')}><Bell size={18}/></button>
          <button aria-label="Coboară din mașină" title="E · Coboară" onClick={()=>carAction('interact')}><LogOut size={18}/></button>
        </div>
      </section>}
      {onFoot&&weapon.equipped&&<section className="vehicle-readout ammo-readout" aria-label="Muniție">
        <span><strong>{weapon.ammo}</strong> / {weapon.reserve}</span>
        <button onClick={()=>api.current?.weapon('reload')} disabled={weapon.reloading>0||weapon.ammo===30||weapon.reserve===0} aria-label="Reîncarcă arma" title="R · Reîncarcă"><RotateCcw size={18}/></button>
        <button onClick={()=>api.current?.weapon('drop')} aria-label="Lasă arma" title="G · Lasă arma"><LogOut size={18}/></button>
        {weapon.reloading>0&&<progress aria-label="Reîncărcare" max={1} value={weapon.reloading}/>}
      </section>}
      {message&&<div className="game-toast" role="status">{message}</div>}
    </>}
    <aside className="compact-minimap" hidden={!started||preparing||!!error} aria-label="Mini-hartă">
      <button onClick={()=>changeMap(true)} aria-label="Deschide harta" aria-keyshortcuts="M" title="M · Hartă"><canvas ref={map} width="360" height="290"/></button>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
    </aside>
    <div id="touch-controls" className={playing?'touch-controls active':'touch-controls'}><div id="joystick" aria-label="Joystick pentru deplasare"><span id="joystick-knob"/></div><button id="touch-jump" aria-label="Sari">↑</button></div>
    {playing&&!vehicle.driving&&!flight.piloting&&weapon.equipped&&<div className="weapon-touch"><button className="aim-button" aria-label="Țintește" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);api.current?.weapon('aim',true);}} onPointerUp={()=>api.current?.weapon('aim',false)} onPointerCancel={()=>api.current?.weapon('aim',false)} onLostPointerCapture={()=>api.current?.weapon('aim',false)}>◎</button><button className="fire-button" aria-label="Trage" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);firePointer.current={id:e.pointerId,x:e.clientX,y:e.clientY};api.current?.weapon('fire',true);}} onPointerMove={e=>{const p=firePointer.current;if(!p||p.id!==e.pointerId)return;api.current?.look((e.clientX-p.x)*.004,(e.clientY-p.y)*.004);p.x=e.clientX;p.y=e.clientY;}} onPointerUp={()=>{api.current?.weapon('fire',false);firePointer.current=null;}} onPointerCancel={()=>{api.current?.weapon('fire',false);firePointer.current=null;}} onLostPointerCapture={()=>{api.current?.weapon('fire',false);firePointer.current=null;}}>TRAGE</button><button className="reload-button" aria-label="Reîncarcă" onClick={()=>api.current?.weapon('reload')}><RotateCcw size={20}/></button></div>}
    {playing&&vehicle.driving&&<div className="drive-touch"><div className="steer-buttons"><button aria-label="Virează la stânga" {...pedalEvents('left')}>←</button><button aria-label="Virează la dreapta" {...pedalEvents('right')}>→</button></div><div className="pedal-buttons"><button className="brake-pedal" {...pedalEvents('brake')}>FRÂNĂ</button><button className="gas-pedal" {...pedalEvents('throttle')}>ACCEL.</button></div></div>}
    <GameMenu open={overlay==='menu'} firstPerson={firstPerson} sound={sound} streets={streetsEnabled} vehicle={vehicle} flight={flight}
      onClose={()=>changeMenu(false)} onCar={()=>{changeMenu(false);carAction('spawn');}}
      onHelicopter={()=>{changeMenu(false);api.current?.helicopter('spawn');}}
      onCamera={()=>api.current?.camera()} onMap={()=>changeMap(true)} onSound={()=>api.current?.sound()} onStreets={toggleStreets}
      onReset={()=>{changeMenu(false,false);api.current?.reset();}}/>
    {overlay==='map'&&<TeleportMap player={mapPosition} ready={ready&&!error} onClose={()=>changeMap(false)} onTeleport={(point,signal)=>api.current?.teleportTo(point,signal)??Promise.reject(new Error('Jocul încă se încarcă.'))}/>}
  </main>;
}
