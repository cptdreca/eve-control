'use client';
import {useState} from 'react';
type Totals={sales:number;purchases:number;net:number;count:number};
type Trading={name:string;today:Totals;month:Totals;monthLabel:string;oldest:string|null;fetchedAt:string};
type Market={typeId:number;quantity?:number;name:string;buy:number|null;sell:number|null;spread:number|null;buyVolume:number;sellVolume:number;market:string;updatedAt:string|null;fetchedAt:string};
const isk=(value:number|null)=>value===null?'Keine Order':new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(value)+' ISK';
const stamp=(value:string)=>new Date(value).toLocaleString('de-DE');
function TotalsView({label,data}:{label:string;data:Totals}){return <article className="isk-goal"><h3>{label}</h3><div className="isk-stats"><div><span>Verkaufserlöse</span><strong>{isk(data.sales)}</strong></div><div><span>Einkaufsausgaben</span><strong>{isk(data.purchases)}</strong></div><div><span>Netto-Handelsfluss</span><strong>{isk(data.net)}</strong></div><div><span>Handelsbuchungen</span><strong>{data.count}</strong></div></div></article>;}
export function TradingMarket({characterId,name}:{characterId:string;name:string}){
 const [trading,setTrading]=useState<Trading|null>(null),[tradeBusy,setTradeBusy]=useState(false),[tradeError,setTradeError]=useState(''),[reconnect,setReconnect]=useState(false);

 async function loadTrading(){setTradeBusy(true);setTradeError('');setReconnect(false);try{const r=await fetch(`/api/trading?characterId=${encodeURIComponent(characterId)}`,{cache:'no-store'});const data=await r.json() as Trading & {error?:string;reconnect?:boolean};if(!r.ok){setReconnect(Boolean(data.reconnect));throw Error(data.error||'Abruf fehlgeschlagen.');}setTrading(data);}catch(e){setTradeError(e instanceof Error?e.message:'Abruf fehlgeschlagen.');}finally{setTradeBusy(false);}}

 return <><section className="isk-goals" id="trading" aria-labelledby="trading-title"><header><div><p className="section-label">MARKTHANDEL · {name}</p><h2 id="trading-title">Trading-Einnahmen</h2></div><button disabled={tradeBusy} onClick={loadTrading}>{tradeBusy?'Handelsdaten werden geladen…':'Trading aktualisieren'}</button></header><p className="isk-help">Persönliche Marktverkäufe und Einkäufe des ausgewählten Charakters. Netto-Handelsfluss = Erlöse minus Einkäufe, ohne Steuern, Gebühren und Bewertung des Lagerbestands; kein tatsächlicher Handelsgewinn. Ratting, ESS, Donations und Verträge zählen hier nicht.</p>{tradeError&&<p role="alert" className="isk-notice">{tradeError} {reconnect&&<a href="/auth/eve">Mit EVE neu verbinden</a>}</p>}{trading?<><p className="isk-help">Abgerufen: {stamp(trading.fetchedAt)}{tradeError?' · Letzter erfolgreicher Stand':''}</p><TotalsView label="Heute (UTC)" data={trading.today}/><TotalsView label={`Monat ${trading.monthLabel} (UTC)`} data={trading.month}/><p className="isk-help">Nur derzeit über ESI verfügbare Buchungen; ältere Monatsdaten können fehlen. Keine dauerhafte Handelshistorie. {trading.oldest?`Älteste verfügbare Buchung: ${stamp(trading.oldest)}.`:'Keine verfügbaren Handelsbuchungen.'} Neue Buchungen können durch den ESI-Cache verzögert erscheinen.</p></>:<p>Mit „Trading aktualisieren“ deine Handelsbuchungen laden.</p>}</section></>;
}

export function MarketCheck(){
 const [query,setQuery]=useState(''),[markets,setMarkets]=useState<Market[]>([]),[marketBusy,setMarketBusy]=useState(false),[marketError,setMarketError]=useState(''),[marketProgress,setMarketProgress]=useState('');
 async function checkMarket(){
  if(marketBusy)return;
  const items=Array.from(new Map(query.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(item=>[item.toLowerCase(),item])).values());
  if(!items.length)return;
  if(items.length>50||items.some(item=>item.length>120)){setMarketError('Bitte maximal 50 Items und höchstens 120 Zeichen je Zeile eingeben.');return;}
  setMarketBusy(true);setMarketError('');setMarketProgress('Preise werden geladen…');
  const errors:string[]=[];const failed:string[]=[];let loaded=0;
  try{for(const [index,item] of items.entries()){
    setMarketProgress(`Item ${index+1} von ${items.length}: ${item}`);
    try{const r=await fetch(`/api/market-check?q=${encodeURIComponent(item)}`,{signal:AbortSignal.timeout(45000)});
      const data=await r.json() as Market & {error?:string};if(!r.ok)throw Error(data.error||'Abruf fehlgeschlagen.');
      setMarkets(previous=>[...previous.filter(entry=>entry.typeId!==data.typeId),data]);loaded++;
    }catch(e){failed.push(item);errors.push(`${item}: ${e instanceof Error?e.message:'Abruf fehlgeschlagen.'}`);}
  }
  setQuery(failed.join('\n'));setMarketError(errors.join('\n'));
  setMarketProgress(`${loaded} von ${items.length} Items geladen.${failed.length?' Fehlgeschlagene Items stehen zum erneuten Abruf im Feld.':''}`);
  }finally{setMarketBusy(false);}
 }

 return <section className="isk-goals" id="marktcheck" aria-labelledby="market-title"><header><h2 id="market-title">Marktcheck · Jita</h2></header><p className="isk-help">Eine ganze Liste einfügen: ein englischer Artikelname oder eine Type-ID pro Zeile, maximal 50 Items. Eine Menge nach dem Namen wird erkannt, z. B. ElectroPunch Ultra L 6361. Auch mit Tabulator getrennte Inventarzeilen sind möglich. Doppelte Zeilen werden einmal abgefragt. Vorhandene Artikel werden aktualisiert.</p><form onSubmit={e=>{e.preventDefault();void checkMarket();}}><label htmlFor="market-query">Item-Liste<textarea id="market-query" value={query} onChange={e=>setQuery(e.target.value)} disabled={marketBusy} rows={6} maxLength={6050} required placeholder={"Tritanium\nPyerite\nIsogen"}/></label><div className="isk-actions"><button disabled={marketBusy||!query.trim()}>{marketBusy?'Preise werden geladen…':'Alle Items hinzufügen'}</button></div></form><p role="status" aria-live="polite" className="isk-help">{marketProgress}</p>{marketError&&<p role="alert" className="isk-notice">{marketError}</p>}{markets.map(market=><article className="isk-goal" key={market.typeId}><header><h3>{market.name}</h3><button type="button" onClick={()=>setMarkets(previous=>previous.filter(item=>item.typeId!==market.typeId))} aria-label={`${market.name} entfernen`}>Entfernen</button></header><p>{market.market}</p>{market.quantity!==undefined&&<p className="isk-help">Importierte Menge: {market.quantity.toLocaleString('de-DE')} Stück · Preise unten je Stück</p>}<div className="isk-stats"><div><span>Höchste Kauforder · Verkauf an Käufer</span><strong>{isk(market.buy)}</strong></div><div><span>Günstigste Verkaufsorder · Einkauf</span><strong>{isk(market.sell)}</strong></div><div><span>Preisspanne je Stück</span><strong>{market.spread===null?'Nicht berechenbar':isk(market.spread)}</strong></div><div><span>Offene Menge · Kauf / Verkauf</span><strong>{market.buyVolume.toLocaleString('de-DE')} / {market.sellVolume.toLocaleString('de-DE')}</strong></div></div><p className="isk-help">{market.buy===null&&market.sell===null?'Für diesen Artikel liegen hier keine Orders vor. ':''}Preise je Stück, ohne Gebühren; die Preisspanne ist kein zugesicherter Gewinn. Nur Orders an dieser Station, keine regionalen Kauforders anderer Standorte. ESI-Stand: {market.updatedAt?stamp(market.updatedAt):'nicht angegeben'} · Abruf: {stamp(market.fetchedAt)}. Marktdaten können zwischengespeichert sein.</p></article>)}</section>;
}
