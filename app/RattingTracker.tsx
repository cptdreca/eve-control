'use client';
import {useEffect,useRef,useState} from 'react';
import type {Income} from './lib/isk-goals';
import {monthlyRatting} from './lib/ratting';
const isk=(n:number)=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)+' ISK';
export function RattingTracker({entries,characters,today,busy,onSync}:{entries:Income[];characters:{characterId:string;name:string}[];today:string;busy:boolean;onSync:()=>void}){
 const latest=useRef({onSync,busy});
 useEffect(()=>{latest.current={onSync,busy};},[onSync,busy]);
 useEffect(()=>{let lastRun=Date.now();const refresh=()=>{if(document.visibilityState==='hidden'||latest.current.busy||Date.now()-lastRun<300000)return;lastRun=Date.now();latest.current.onSync();};const timer=setInterval(refresh,300000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[]);
 const [selection,setSelection]=useState('');const month=selection||today.slice(0,7);
 const m=monthlyRatting(entries,month,today,characters.map(c=>c.characterId));
 return <article className="isk-goal" id="ratting-monat" aria-labelledby="ratting-title"><header><h3 id="ratting-title">Ratting · Monats-Tracker</h3><label>Monat (UTC)<input type="month" max={today.slice(0,7)} value={month} onChange={e=>setSelection(e.target.value)}/></label></header><strong className="isk-total">{isk(m.total)}<span>Kopfgelder + ESS im ausgewählten Monat</span></strong><div className="isk-actions"><button disabled={busy} onClick={onSync}>{busy?'Bitte warten…':'Ratting-Einnahmen aktualisieren'}</button></div><p className="isk-help">Alle verbundenen Charaktere, unabhängig von deinen ISK-Zielen. Gezählt wird das Auszahlungsdatum in EVE-Zeit (UTC). Donations und Marktverkäufe zählen nicht. Automatische Aktualisierung alle 5 Minuten bei geöffneter, sichtbarer App; nach Rückkehr werden fällige Abrufe nachgeholt. ESI kann neue Auszahlungen verzögert liefern. Bereits importierte Monate bleiben in diesem Speicher erhalten; frühere Monate können unvollständig sein.</p>{Object.keys(m.characters).length===0?<p>Noch keine importierten Ratting-Einnahmen für diesen Monat.</p>:<details open><summary>Einnahmen je Charakter</summary>{Object.entries(m.characters).sort((a,b)=>b[1].total-a[1].total).map(([id,c])=><div className="isk-entry-row" key={id}><span>{characters.find(x=>x.characterId===id)?.name||`Charakter ${id}`}</span><strong>{isk(c.total)}</strong></div>)}</details>}</article>;
}
