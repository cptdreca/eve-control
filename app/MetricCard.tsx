'use client';
import {ReactNode,useEffect,useState} from 'react';
type Category='wallet'|'skills'|'industry'|'clones'|'corporation'|'contracts'|'market';
const money=(value:number)=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(value);
const date=(value?:string)=>value?new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'–';
async function loadDetails(characterId:string,category:Category){const response=await fetch(`/api/character/details?characterId=${characterId}&category=${category}`,{cache:'no-store'});if(!response.ok)throw new Error();return((await response.json()) as {data:any}).data}

export function MetricCard({category,characterId,heading,icon,children}:{category:Exclude<Category,'clones'>;characterId:string;heading:string;icon:string;children:ReactNode}){
  const[open,setOpen]=useState(false);const[loading,setLoading]=useState(false);const[data,setData]=useState<any>(null);
  const toggle=async()=>{const next=!open;setOpen(next);if(next&&!data){setLoading(true);try{setData(await loadDetails(characterId,category))}catch{setData({error:true})}finally{setLoading(false)}}};
  return <article className={`metric-card expandable ${open?'open':''}`}><button className="metric-toggle" onClick={toggle} aria-expanded={open}><div className="metric-heading"><span className="metric-icon">{icon}</span><span>{heading}</span><span className="chevron">⌄</span></div>{children}</button>{open&&<div className="metric-details">{loading?<p>Lade Live-Daten…</p>:data?.error?<p>Details konnten nicht geladen werden.</p>:<Details category={category} data={data}/>}</div>}</article>;
}

export function JumpCloneCard({characterId}:{characterId:string}){
  const[open,setOpen]=useState(false);const[loading,setLoading]=useState(true);const[data,setData]=useState<any>(null);
  useEffect(()=>{loadDetails(characterId,'clones').then(setData).catch(()=>setData({error:true})).finally(()=>setLoading(false))},[characterId]);
  return <article className={`metric-card expandable clone-card ${open?'open':''}`}><button className="metric-toggle" onClick={()=>setOpen(!open)} aria-expanded={open}><div className="metric-heading"><span className="metric-icon">◎</span><span>JUMP CLONES</span><span className="chevron">⌄</span></div><strong>{loading?'…':data?.authorizationRequired?'—':data?.clones?.length||0} <small>CLONES</small></strong><p>{data?.authorizationRequired?'Leseberechtigung erforderlich':data?.lastCloneJumpDate?`Letzter Jump: ${date(data.lastCloneJumpDate)}`:'Strukturen, Standorte und Implantate'}</p></button>{open&&<div className="metric-details">{loading?<p>Lade Live-Daten…</p>:data?.error?<p>Details konnten nicht geladen werden.</p>:<Details category="clones" data={data}/>}</div>}</article>;
}

function CloneLocation({location,home=false}:{location:any;home?:boolean}){
  return <div className="detail-row clone-row"><div className="structure-info">{location.icon?<img src={location.icon} alt=""/>:<span className="structure-fallback">⌂</span>}<span><b>{location.locationName}</b><small>{location.structureType}{location.systemName?` · ${location.systemName}`:''}</small><small>ID {location.locationId}{home?' · Heimatstation':''}</small></span></div>{location.implants?.length>0&&<div className="implant-icons" aria-label="Implantate">{location.implants.map((implant:any)=><span key={implant.id} title={implant.name}><img src={implant.icon} alt=""/><small>{implant.name}</small></span>)}</div>}</div>;
}

function Details({category,data}:{category:Category;data:any}){
  if(category==='clones'){
    if(data.authorizationRequired)return <div className="clone-authorization"><p>Dieser Charakter wurde noch nicht für Jump-Clone- und Strukturdaten freigegeben.</p><a className="primary-login" href="/auth/eve">Jump Clones & Strukturen freigeben</a></div>;
    return <><h4>MEDICAL CLONE</h4>{data.homeLocation?<div className="detail-list"><CloneLocation location={data.homeLocation} home/></div>:<p>Keine Heimatstation gemeldet.</p>}<h4>JUMP CLONES</h4><div className="detail-list">{data.clones.length?data.clones.map((clone:any)=><CloneLocation location={clone} key={clone.jump_clone_id}/>):<p>Keine Jump Clones vorhanden.</p>}</div></>;
  }
  if(category==='skills')return <div className="detail-list">{data.length?data.map((item:any)=><div className="detail-row" key={item.queue_position}><span><b>{item.queue_position+1}. {item.name}</b><small>Level {item.finished_level}</small></span><time>{date(item.finish_date)}</time></div>):<p>Die Skill Queue ist leer.</p>}</div>;
  if(category==='wallet')return <><h4>Letzte Buchungen</h4><div className="detail-list">{data.journal.map((item:any)=><div className="detail-row" key={item.id}><span><b>{item.description||item.reference_type}</b><small>{date(item.date)}</small></span><em className={item.amount>=0?'positive':'negative'}>{item.amount>=0?'+':''}{money(item.amount)} ISK</em></div>)}</div><h4>Transaktionen</h4><div className="detail-list">{data.transactions.map((item:any,index:number)=><div className="detail-row" key={`${item.date}-${index}`}><span><b>{item.name}</b><small>{item.quantity} × {money(item.unit_price)} ISK</small></span><em>{item.is_buy?'Kauf':'Verkauf'}</em></div>)}</div></>;
  if(category==='corporation')return <div className="corporation-details"><div className="corporation-identity"><img src={data.logo} alt={`Logo von ${data.name}`}/><div><span>CORPORATION</span><h4>{data.name}</h4><p>[{data.ticker}] · Corporation ID {data.id}</p></div></div>{data.alliance&&<div className="alliance-identity"><img src={data.alliance.logo} alt={`Logo von ${data.alliance.name}`}/><div><span>ALLIANCE</span><b>{data.alliance.name}</b><small>[{data.alliance.ticker}] · gegründet {date(data.alliance.founded)}</small></div></div>}<div className="corporation-stats"><div><span>MITGLIEDER</span><b>{data.memberCount}</b></div><div><span>STEUERQUOTE</span><b>{money(data.taxRate*100)} %</b></div><div><span>HAUPTQUARTIER</span><b>{data.headquarters}</b></div><div><span>CEO</span><b>{data.ceo}</b></div></div><h4>ÖFFENTLICHE INFORMATIONEN</h4><div className="corporation-public"><p><b>Gründung:</b> {date(data.founded)}</p><p><b>Erstellt von:</b> {data.creator}</p>{data.faction&&<p><b>Fraktion:</b> {data.faction}</p>}<p><b>Kriegsberechtigt:</b> {data.warEligible?'Ja':'Nein'}</p>{typeof data.shares==='number'&&<p><b>Anteile:</b> {money(data.shares)}</p>}{data.url&&<p><b>Website:</b> <a href={data.url} target="_blank" rel="noreferrer">{data.url}</a></p>}</div><h4>BESCHREIBUNG</h4><p className="corporation-description">{data.description||'Keine öffentliche Beschreibung hinterlegt.'}</p></div>;
  if(category==='contracts'){
    if(data.authorizationRequired)return <Authorization title="Verträge"/>;
    return <div className="detail-list">{data.contracts.length?data.contracts.map((item:any)=><div className="detail-row" key={item.contract_id}><span><b>{item.title||item.type}</b><small>{item.status} · {item.issuer} → {item.assignee}</small><small>Ablauf: {date(item.date_expired)}</small></span><em>{item.price?`${money(item.price)} ISK`:item.reward?`${money(item.reward)} ISK Belohnung`:'—'}</em></div>):<p>Keine Verträge vorhanden.</p>}</div>;
  }
  if(category==='market'){
    if(data.authorizationRequired)return <Authorization title="Marktaufträge"/>;
    return <div className="detail-list">{data.orders.length?data.orders.map((item:any)=><div className="detail-row" key={`${item.order_id}-${item.state}`}><span><b>{item.name}</b><small>{item.is_buy_order?'Kauf':'Verkauf'} · {item.volume_remain}/{item.volume_total} · {item.state}</small><small>{item.location}</small></span><em>{money(item.price)} ISK</em></div>):<p>Keine Marktaufträge vorhanden.</p>}</div>;
  }
  return <div className="detail-list">{data.length?data.map((item:any)=><div className="detail-row" key={item.job_id}><span><b>{item.name}</b><small>{item.activity} · {item.runs} Runs · {item.status}</small></span><time>{date(item.end_date)}</time></div>):<p>Keine Industrie- oder Reaktionsaufträge vorhanden.</p>}</div>;
}

function Authorization({title}:{title:string}){return <div className="clone-authorization"><p>Für {title} fehlt diesem Charakter noch die EVE-Leseberechtigung.</p><a className="primary-login" href="/auth/eve">Charakter neu autorisieren</a></div>}
