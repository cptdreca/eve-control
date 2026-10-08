export type Transaction = { transaction_id:number; date:string; is_buy:boolean; is_personal:boolean; quantity:number; unit_price:number; type_id:number };
export class TradingError extends Error { reconnect:boolean; constructor(message:string,reconnect=false){super(message);this.reconnect=reconnect;} }
export async function readTransactions(characterId:string,token:string,fetcher:typeof fetch=fetch){
 const rows=new Map<number,Transaction>();let from:number|undefined;
 for(let page=0;page<100;page++){
  const response=await fetcher(`https://esi.evetech.net/characters/${characterId}/wallet/transactions/${from?`?from_id=${from}`:''}`,{headers:{Authorization:`Bearer ${token}`,'X-Compatibility-Date':'2026-08-23'},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new TradingError([401,403].includes(response.status)?'Wallet-Zugriff fehlt oder Anmeldung abgelaufen. Bitte den Charakter neu verbinden.':`Handelsdaten derzeit nicht verfügbar (ESI ${response.status}).`,[401,403].includes(response.status));
  const batch=await response.json() as Transaction[];
  if(!Array.isArray(batch))throw new TradingError('Ungültige Handelsdaten.');
  if(!batch.length)return [...rows.values()];
  let oldest=Infinity;
  for(const row of batch){if(!Number.isSafeInteger(row.transaction_id)||row.transaction_id<=0||!Number.isFinite(Date.parse(row.date))||typeof row.is_buy!=='boolean'||typeof row.is_personal!=='boolean'||!Number.isFinite(row.quantity)||row.quantity<=0||!Number.isFinite(row.unit_price)||row.unit_price<0)throw new TradingError('Ungültige Handelsbuchung.');oldest=Math.min(oldest,row.transaction_id);rows.set(row.transaction_id,row);}
  if(from!==undefined&&oldest===from&&batch.length===1)return [...rows.values()];
  if(from!==undefined&&oldest>=from)throw new TradingError('Handelsdaten konnten nicht vollständig geladen werden.');
  from=oldest;
 }
 throw new TradingError('Zu viele Handelsbuchungen. Es werden keine unvollständigen Summen angezeigt.');
}
export function tradingTotals(rows:Transaction[],prefix:string){
 let sales=0,purchases=0,count=0;const seen=new Set<number>();
 for(const row of rows){if(seen.has(row.transaction_id))continue;seen.add(row.transaction_id);if(!row.is_personal||!row.date.startsWith(prefix))continue;const value=row.quantity*row.unit_price;if(!Number.isFinite(value))throw new TradingError('Ungültiger Handelsbetrag.');if(row.is_buy)purchases+=value;else sales+=value;count++;}
 return {sales,purchases,net:sales-purchases,count};
}
export type MarketOrder={price:number;is_buy_order:boolean;volume_remain:number;location_id:number;type_id:number};
export function jitaPrices(rows:MarketOrder[],typeId:number){
 let buy:number|null=null,sell:number|null=null,buyVolume=0,sellVolume=0;
 for(const row of rows){if(row.location_id!==60003760||row.type_id!==typeId||!Number.isFinite(row.price)||row.price<=0||!Number.isFinite(row.volume_remain)||row.volume_remain<=0)continue;if(row.is_buy_order){buy=Math.max(buy??0,row.price);buyVolume+=row.volume_remain;}else{sell=Math.min(sell??Infinity,row.price);sellVolume+=row.volume_remain;}}
 return {buy,sell,buyVolume,sellVolume,spread:buy!==null&&sell!==null?sell-buy:null};
}
