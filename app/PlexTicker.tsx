'use client';
import {useEffect,useState} from 'react';
import './plex-ticker.css';
type Price={sell:number|null;buy:number|null;updatedAt:string|null;fetchedAt:string};
const isk=(n:number|null)=>n===null?'kein Angebot':new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)+' ISK';
export function PlexTicker(){
 const [price,setPrice]=useState<Price|null>(null),[failed,setFailed]=useState(false),[paused,setPaused]=useState(false);
 useEffect(()=>{const controller=new AbortController();let active=true;const update=async()=>{try{const r=await fetch('/api/plex-price',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const data:Price=await r.json();if(active){setPrice(data);setFailed(false);}}catch{if(active)setFailed(true);}};void update();const timer=setInterval(()=>void update(),300000);return()=>{active=false;controller.abort();clearInterval(timer);};},[]);
 const text=price?`PLEX · Globaler Markt · Günstigster Verkauf: ${isk(price.sell)} / PLEX · Höchstes Kaufgebot: ${isk(price.buy)} / PLEX · ${price.updatedAt?'ESI-Stand':'Abgerufen'}: ${new Date(price.updatedAt||price.fetchedAt).toLocaleString('de-DE',{timeZone:'UTC'})} UTC${failed?' · Aktualisierung fehlgeschlagen – letzter bekannter Preis':''}`:failed?'PLEX · Preis derzeit nicht verfügbar · Erneuter Versuch in fünf Minuten':'PLEX · Marktpreis wird geladen…';
 return <section className={`plex-ticker ${paused?'is-paused':''}`} aria-label="PLEX-Marktpreis"><div className="plex-window"><div className="plex-track"><span>{text}</span><span aria-hidden="true">{text}</span></div></div><button type="button" onClick={()=>setPaused(p=>!p)} aria-pressed={paused} aria-label={paused?'Laufbanner fortsetzen':'Laufbanner pausieren'}>{paused?'▶':'Ⅱ'}</button></section>;
}
