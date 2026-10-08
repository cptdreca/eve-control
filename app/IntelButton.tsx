'use client';
import {useRef,useState} from 'react';
type DesktopWindow = Window & {eveDesktop?:{openIntel:(pilot:string)=>Promise<{ok:boolean;error?:string}>}};
export function IntelButton({pilot}:{pilot?:string}){
 const dialog=useRef<HTMLDialogElement>(null);const[error,setError]=useState('');
 async function open(){
  const desktop=(window as DesktopWindow).eveDesktop;
  if(!desktop){dialog.current?.showModal();return;}
  try{const result=await desktop.openIntel(pilot||'');setError(result.ok?'':result.error||'Intel-Fenster konnte nicht geöffnet werden.');}catch{setError('Intel-Fenster konnte nicht geöffnet werden. Bitte die Windows-App neu starten.');}
 }
 return <><button className="install-app" onClick={open}>INTEL-ALARM</button>{error&&<span role="alert">{error}</span>}<dialog ref={dialog} className="intel-info"><h2>Intel-Alarm für Windows</h2><p>Der Intel-Alarm liest deine lokalen EVE-Chatlogs. Dafür benötigst du die Windows-Version ab 1.3.0.</p><p>Dort öffnet dieser Button den Alarm und sucht passende Logs für deinen ausgewählten Charakter. Im Browser und auf dem Handy stehen lokale Chatlogs nicht zur Verfügung.</p><a className="install-app" href="https://github.com/cptdreca/eve-control/releases/latest" target="_blank" rel="noreferrer">Windows-Version herunterladen</a><button className="install-app" onClick={()=>dialog.current?.close()}>Schließen</button></dialog></>;
}
