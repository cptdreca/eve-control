import {NextRequest,NextResponse} from 'next/server';
import {readSession,writeSession} from '../../lib/session';
import {refreshCharacter} from '../../lib/eve';
import {readTransactions,tradingTotals,TradingError} from '../../lib/trading';
export async function GET(request:NextRequest){
 const headers={'Cache-Control':'private, no-store'};
 try{
  const stored=await readSession(request);if(!stored.data)return NextResponse.json({error:'Bitte zuerst mit EVE anmelden.',reconnect:true},{status:401,headers});
  const id=request.nextUrl.searchParams.get('characterId')||stored.data.activeCharacterId;
  const character=stored.data.characters.find(c=>c.characterId===id);if(!character)return NextResponse.json({error:'Charakter nicht verbunden.'},{status:404,headers});
  let refreshed;try{refreshed=await refreshCharacter(character);}catch{return NextResponse.json({error:'EVE-Anmeldung nicht verfügbar. Bitte erneut versuchen oder den Charakter neu verbinden.',reconnect:true},{status:401,headers});}
  stored.data.characters=stored.data.characters.map(c=>c.characterId===id?refreshed.character:c);
  let response:NextResponse;
  try{
   const rows=await readTransactions(id,refreshed.accessToken);const today=new Date().toISOString().slice(0,10);
   response=NextResponse.json({characterId:id,name:character.name,today:tradingTotals(rows,today),month:tradingTotals(rows,today.slice(0,7)),monthLabel:today.slice(0,7),oldest:rows.length?rows.reduce((a,b)=>a.date<b.date?a:b).date:null,fetchedAt:new Date().toISOString()},{headers});
  }catch(error){response=NextResponse.json({error:error instanceof TradingError?error.message:'Handelsdaten konnten nicht geladen werden. Bitte erneut versuchen.',reconnect:error instanceof TradingError&&error.reconnect},{status:502,headers});}
  await writeSession(response,stored.data,stored.id);return response;
 }catch{return NextResponse.json({error:'Handelsdaten derzeit nicht verfügbar.'},{status:503,headers});}
}
