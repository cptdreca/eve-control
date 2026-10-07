import {NextRequest,NextResponse} from 'next/server';
import {readSession,writeSession} from '../../lib/session';
import {seal,unseal,refreshCharacter} from '../../lib/eve';
import {goalDatabase} from '../../lib/goal-store';
import {GoalState,journalIncome,isEarnedIncome,validateState,todayUTC} from '../../lib/isk-goals';
import {readWalletJournal,WalletError} from '../../lib/wallet-journal';

const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request:NextRequest,write:boolean) {
  try {
    if(write && request.headers.get('origin')!==request.nextUrl.origin) return reply({error:'Ungültiger Ursprung.'},403);
    const stored=await readSession(request), session=stored.data;
    if(!session) return reply({error:'Bitte mit EVE anmelden.'},401);
    const owner=request.nextUrl.searchParams.get('owner') || session.characters[0].characterId;
    if(!session.characters.some(c=>c.characterId===owner)) return reply({error:'Charakter nicht verbunden.'},403);
    const db=goalDatabase();
    const row=await db.prepare('SELECT payload, revision FROM isk_goals WHERE owner = ?').bind(owner).first<{payload:string;revision:number}>();
    const old:GoalState=row ? (await unseal<GoalState>(row.payload))! : {goals:[],entries:[]};
    if(!old) throw new Error('Ziele konnten nicht gelesen werden.');
    old.entries=old.entries.filter(e=>e.source!=='esi'||isEarnedIncome(e,session.characters.map(c=>c.characterId)));
    if(!write) return reply({state:old,revision:row?.revision||0,owner});
    const raw=await request.text();
    if(raw.length>4000000) return reply({error:'Zu viele Daten.'},413);
    const body=JSON.parse(raw);
    if(body.revision!==(row?.revision||0)) return reply({error:'Ziele wurden andernorts geändert. Bitte neu laden.'},409);
    let state:GoalState; let note='Gespeichert.';
    const failures:{characterId:string;name:string;message:string;reconnect:boolean}[]=[];
    let synced=0;
    if((body.action==='sync'||body.action==='sync-month')) {
      state={goals:old.goals,entries:[...old.entries]};
      const ids=body.action==='sync-month'?session.characters.map(c=>c.characterId):[...new Set(old.goals.filter(g=>g.source==='esi').flatMap(g=>g.characterIds))];
      if(!ids.length) return reply({error:'Zuerst ein Ziel mit ESI-Einnahmen speichern.'},400);
      const ownIds=session.characters.map(c=>c.characterId);
      const imported=new Map(state.entries.filter(e=>e.source!=='esi'||isEarnedIncome(e,ownIds)).map(e=>[e.id,e]));
      // Sequential character refresh avoids bursts and preserves successful token rotations.
      for(const id of ids) {
        const character=session.characters.find(c=>c.characterId===id);
        if(!character){failures.push({characterId:id,name:id,message:'Charakter nicht verbunden. Bitte erneut mit EVE anmelden.',reconnect:true});continue;}
        try {
          const refreshed=await refreshCharacter(character).catch(()=>{throw new WalletError('EVE-Anmeldung konnte nicht erneuert werden. Bitte erneut versuchen oder diesen Charakter neu verbinden.',true);});
          session.characters=session.characters.map(c=>c.characterId===id?refreshed.character:c);
          // Commit a character's journal only after every page succeeded.
          const rows=await readWalletJournal(id,refreshed.accessToken);
          for(const r of rows) imported.delete(`esi:${id}:${r.id}`);
          for(const entry of journalIncome(rows,id,ownIds)) imported.set(entry.id,entry);
          synced++;
        } catch(error) {failures.push({characterId:id,name:character.name,message:error instanceof WalletError?error.message:'Journal konnte nicht gelesen werden. Bitte erneut versuchen.',reconnect:error instanceof WalletError&&error.reconnect});}
      }
      state.entries=[...imported.values()];
      const todayEntries=state.entries.filter(e=>e.source==='esi'&&e.date===todayUTC()&&ids.includes(e.characterId));
      const todayAmount=new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(todayEntries.reduce((sum,e)=>sum+e.amount,0));
      note=failures.length?(synced?`Teilimport: ${synced} von ${ids.length} Charakteren aktualisiert. Bisherige Daten der übrigen Chars bleiben erhalten.`:'Keine Charaktere aktualisiert. Bisherige Einnahmen bleiben erhalten.'):`ESI-Einnahmen für ${synced} Charaktere aktualisiert. Ältere, nicht mehr verfügbare Journale fehlen möglicherweise.`;
      note+=` Heute (UTC) im Einnahmenspeicher: ${todayAmount} ISK aus ${todayEntries.length} Buchungen. Im Ziel zählen die ausgewählten Charaktere und der Zielzeitraum.`;
    } else {
      state=body.state;
      validateState(state);
      // Imported entries are authoritative server data; browsers can only edit manual entries.
      state={goals:state.goals,entries:[...old.entries.filter(e=>e.source==='esi'),...state.entries.filter(e=>e.source==='manual')]};
    }
    validateState(state);
    const payload=await seal(state),revision=(row?.revision||0)+1;
    const result=row?await db.prepare('UPDATE isk_goals SET payload = ?, revision = ? WHERE owner = ? AND revision = ?').bind(payload,revision,owner,body.revision).run():await db.prepare('INSERT OR IGNORE INTO isk_goals (owner, payload, revision) VALUES (?, ?, ?)').bind(owner,payload,revision).run();
    const response=result.meta.changes?reply({state,revision,owner,note,failures}):reply({error:'Gleichzeitige Änderung. Bitte neu laden.'},409);
    if((body.action==='sync'||body.action==='sync-month')) await writeSession(response,session,stored.id);
    return response;
  } catch(error) {return reply({error:error instanceof Error?error.message:'Ziele konnten nicht gespeichert werden.'},400);}
}
export const GET=(request:NextRequest)=>handle(request,false);
export const POST=(request:NextRequest)=>handle(request,true);
