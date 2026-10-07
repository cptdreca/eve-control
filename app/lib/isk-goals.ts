export type Goal = { id: string; name: string; target: number; start: string; end: string; characterIds: string[]; characterCount: number; source: 'manual' | 'esi' };
export type Income = { id: string; date: string; amount: number; characterId: string; source: 'manual' | 'esi'; goalId?: string; firstPartyId?: string; secondPartyId?: string; refType?: string };
export type GoalState = { goals: Goal[]; entries: Income[] };
export const day = (date: string) => { const ms=Date.parse(date+'T00:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(ms) && new Date(ms).toISOString().slice(0,10)===date ? ms/86400000 : NaN; };
export const todayUTC = () => new Date().toISOString().slice(0,10);
export const endDate = (start: string, days: number) => new Date((day(start) + days - 1) * 86400000).toISOString().slice(0,10);
export function validateState(value: GoalState) {
  if (!value || !Array.isArray(value.goals) || !Array.isArray(value.entries) || value.goals.length > 30 || value.entries.length > 20000) throw new Error('Ungültige oder zu viele Ziele/Einträge.');
  const ids = new Set<string>();
  for (const g of value.goals) {
    if (!g || typeof g.id !== 'string' || ids.has(g.id) || !g.id || g.id.length > 100 || typeof g.name !== 'string' || !g.name.trim() || g.name.length > 80 || !Number.isFinite(g.target) || g.target <= 0 || g.target > 1e15 || !Number.isFinite(day(g.start)) || !Number.isFinite(day(g.end)) || day(g.end) < day(g.start) || day(g.end)-day(g.start)>3659 || !Array.isArray(g.characterIds) || g.characterIds.some(id=>typeof id !== 'string' || !/^\d+$/.test(id)) || new Set(g.characterIds).size !== g.characterIds.length || !Number.isInteger(g.characterCount) || g.characterCount < 1 || g.characterCount > 1000 || !['manual','esi'].includes(g.source) || (g.source==='esi' && !g.characterIds.length)) throw new Error('Zielbetrag, Zeitraum oder Charaktere sind ungültig.');
    ids.add(g.id);
  }
  const entryIds = new Set<string>();
  for (const e of value.entries) {
    if (!e || typeof e.id !== 'string' || !e.id || e.id.length>150 || entryIds.has(e.id) || !Number.isFinite(day(e.date)) || !Number.isFinite(e.amount) || Math.abs(e.amount)>1e15 || typeof e.characterId !== 'string' || !['manual','esi'].includes(e.source) || (e.source==='manual' && !ids.has(e.goalId || ''))) throw new Error('Ungültiger Einnahmeneintrag.');
    entryIds.add(e.id);
  }
}
export function metrics(goal: Goal, entries: Income[], today = todayUTC()) {
  const start=day(goal.start), end=day(goal.end), now=day(today), days=end-start+1;
  const count=goal.characterIds.length || goal.characterCount;
  const relevant=entries.filter(e=>e.source===goal.source && (e.source==='esi' || e.goalId===goal.id) && (!goal.characterIds.length || goal.characterIds.includes(e.characterId)) && day(e.date)>=start && day(e.date)<=end && day(e.date)<=now);
  const actual=relevant.reduce((sum,e)=>sum+e.amount,0), todayActual=relevant.filter(e=>e.date===today).reduce((sum,e)=>sum+e.amount,0);
  const daily=goal.target/days, elapsed=Math.max(0,Math.min(days,now-start+1)), remainingDays=Math.max(0,end-Math.max(start,now)+1), remaining=Math.max(0,goal.target-actual);
  const todayTarget=now>=start&&now<=end?daily:0;
  return {days,count,daily,perCharacter:daily/count,actual,todayActual,remaining,progress:Math.max(0,Math.min(100,actual/goal.target*100)),todayTarget,todayRemaining:Math.min(remaining,Math.max(0,todayTarget-todayActual)),deviation:actual-daily*elapsed,remainingDays,needed:remaining===0?0:remainingDays?remaining/remainingDays:null};
}
export type Journal = {id:number;date:string;amount?:number;first_party_id?:number;second_party_id?:number;ref_type:string};
// Only explicitly identified bounty and ESS payouts count; unknown legacy entries must be reimported.
const bountyTypes=new Set(['bounty_prize','bounty_prizes','ess_escrow_transfer']);
export function isEarnedIncome(entry: Income, ownIds: string[]) {
  // A transfer between our characters requires two different characters.
  const internalTransfer=entry.firstPartyId && entry.secondPartyId && entry.firstPartyId!==entry.secondPartyId && ownIds.includes(entry.firstPartyId) && ownIds.includes(entry.secondPartyId);
  return entry.amount>0 && !internalTransfer && bountyTypes.has(entry.refType||'');
}
export function journalIncome(rows: Journal[], characterId: string, ownIds: string[]): Income[] {
  return rows.filter(r=>Number.isSafeInteger(r.id) && typeof r.date==='string' && Number.isFinite(day(r.date.slice(0,10))) && Number.isFinite(r.amount))
    .map((r):Income=>({id:`esi:${characterId}:${r.id}`,date:r.date.slice(0,10),amount:r.amount!,characterId,source:'esi',firstPartyId:String(r.first_party_id||''),secondPartyId:String(r.second_party_id||''),refType:r.ref_type}))
    .filter(e=>isEarnedIncome(e,ownIds));
}

export function monthlyRatting(entries:Income[],month:string,today:string,ownIds:string[]){
 const seen=new Set<string>();
 const chars:Record<string,{bounty:number;ess:number;total:number}>={};
 let bounty=0,ess=0;
 for(const e of entries){
  if(seen.has(e.id)||e.source!=='esi'||!e.date.startsWith(month+'-')||e.date>today||!isEarnedIncome(e,ownIds))continue;
  seen.add(e.id);const c=chars[e.characterId]??={bounty:0,ess:0,total:0};
  if(e.refType==='ess_escrow_transfer'){ess+=e.amount;c.ess+=e.amount;}else{bounty+=e.amount;c.bounty+=e.amount;}c.total+=e.amount;
 }
 return {bounty,ess,total:bounty+ess,characters:chars};
}
