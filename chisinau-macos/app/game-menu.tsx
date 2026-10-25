'use client';

import {CarFront, Fan, Map, Volume2, VolumeX, Expand, X, RotateCcw, Eye, EyeOff} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {GameCredits} from './game-credits';
import type {VehicleHud} from './prius';
import type {HelicopterHud} from './helicopter';

type Props = {
  open:boolean; firstPerson:boolean; sound:boolean; streets:boolean; vehicle:VehicleHud; flight:HelicopterHud;
  onClose:()=>void; onCar:()=>void; onHelicopter:()=>void; onCamera:()=>void;
  onMap:()=>void; onSound:()=>void; onStreets:()=>void; onReset:()=>void;
};

export function GameMenu({open,firstPerson,sound,streets,vehicle,flight,onClose,onCar,onHelicopter,onCamera,onMap,onSound,onStreets,onReset}:Props){
  const inVehicle=vehicle.driving||flight.piloting;
  return <Dialog open={open} onOpenChange={value=>{if(!value)onClose();}}>
    <DialogContent className="game-menu" showCloseButton={false} aria-describedby={undefined} onCloseAutoFocus={event=>event.preventDefault()}>
      <div className="game-menu-heading"><DialogTitle>Meniu</DialogTitle><button aria-label="Închide meniul" title="Esc · Închide" onClick={onClose}><X size={20}/></button></div>
      <div className="spawn-actions">
        <button onClick={onCar} disabled={!vehicle.loaded||inVehicle}><CarFront size={22}/><span>{vehicle.failed?'Mașină indisponibilă':!vehicle.loaded?'Se încarcă mașina…':'Generează mașină'}</span></button>
        <button onClick={onHelicopter} disabled={!flight.loaded||inVehicle}><Fan size={22}/><span>{flight.failed?'Elicopter indisponibil':!flight.loaded?'Se încarcă elicopterul…':'Generează elicopter'}</span></button>
        {inVehicle&&<p>Coboară pentru a genera un vehicul.</p>}
      </div>
      <div className="menu-section-label">Setări</div>
      <div className="camera-choice" role="group" aria-label="Perspectiva camerei"><span>Perspectivă</span><div><button aria-pressed={firstPerson} onClick={()=>{if(!firstPerson)onCamera();}}>Persoana I</button><button aria-pressed={!firstPerson} onClick={()=>{if(firstPerson)onCamera();}}>Persoana III</button></div></div>
      <div className="menu-tools">
        <button onClick={onMap}><Map size={18}/> Hartă <kbd>M</kbd></button>
        <button onClick={onSound} aria-pressed={sound}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>} Sunet <span>{sound?'Pornit':'Oprit'}</span></button>
        <button onClick={onStreets} aria-pressed={streets}>{streets?<Eye size={18}/>:<EyeOff size={18}/>} Fundal Streets GL <span>{streets?'Pornit':'Oprit'}</span></button>
        <button onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen?.().catch(()=>{});else void document.documentElement.requestFullscreen?.().catch(()=>{});}}><Expand size={18}/> Ecran complet</button>
        <button onClick={onReset}><RotateCcw size={18}/> Înapoi la Catedrală</button>
      </div>
      <p className="streets-setting-note">Oprit ascunde fundalul și oprește randarea Streets GL. Datele de teren și coliziunile rămân active pentru joc.</p>
      <details className="menu-details"><summary>Comenzi</summary><dl>
        <div><dt>W A S D</dt><dd>{flight.piloting?'Zbor și rotire':vehicle.driving?'Accelerație, frână și direcție':'Deplasare'}</dd></div>
        <div><dt>Mouse</dt><dd>Privește în jur</dd></div>
        <div><dt>E</dt><dd>Interacțiune / urcare / coborâre</dd></div>
        <div><dt>Spațiu{flight.piloting?' / C':''}</dt><dd>{flight.piloting?'Urcă / coboară':vehicle.driving?'Frână de mână':'Sari'}</dd></div>
        {!vehicle.driving&&<div><dt>Shift</dt><dd>{flight.piloting?'Zboară mai repede':'Aleargă'}</dd></div>}
        {vehicle.driving&&<div><dt>P / L / H</dt><dd>Parcare / faruri / claxon</dd></div>}
        <div><dt>V / M</dt><dd>Cameră / hartă</dd></div>
        <div><dt>Tab / Esc</dt><dd>Meniu / pauză</dd></div>
        {!inVehicle&&<><div><dt>Click / dreapta</dt><dd>Trage / țintește</dd></div><div><dt>R / G</dt><dd>Reîncarcă / lasă arma</dd></div></>}
      </dl></details>
      <details className="menu-details"><summary>Surse și licențe</summary><GameCredits/></details>
      <button className="continue-button" onClick={onClose}>Continuă <kbd>Esc</kbd></button>
    </DialogContent>
  </Dialog>;
}
