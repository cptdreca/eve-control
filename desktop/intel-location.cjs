const {HOME}=require('./navigation.cjs');
// Only this fixed authenticated endpoint is accessible; no token or cookie crosses IPC.
async function readLocation(session,characterId){
 if(!Number.isSafeInteger(characterId)||characterId<=0)throw Error('Ungültiger Intel-Charakter.');
 const response=await session.fetch(new URL(`api/intel-location?characterId=${characterId}`,HOME).href,{
  credentials:'include',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000),
 });
 let data;try{data=await response.json();}catch{throw Error('Standortdienst nicht verfügbar. Bitte im Desktop-Dashboard anmelden.');}
 if(!response.ok)throw Error(typeof data.error==='string'?data.error.slice(0,300):'ESI-Standort nicht verfügbar.');
 if(String(data.characterId)!==String(characterId)||!Number.isSafeInteger(data.solarSystemId)||data.solarSystemId<=0)throw Error('Ungültige Standortantwort.');
 return {id:data.solarSystemId};
}
module.exports={readLocation};
