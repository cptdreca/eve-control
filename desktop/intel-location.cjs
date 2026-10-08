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
async function readCharacters(session){
 const response=await session.fetch(new URL('api/characters',HOME).href,{credentials:'include',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
 if(response.status===401)throw Error('Bitte zuerst im Desktop-Dashboard mit EVE anmelden.');
 if(!response.ok)throw Error('Verknüpfte Charaktere derzeit nicht erreichbar. Bitte erneut laden.');
 const data=await response.json();
 if(!Array.isArray(data.characters))throw Error('Ungültige Charakterliste.');
 return data.characters.filter(c=>/^\d+$/.test(String(c.characterId))&&typeof c.name==='string'&&c.name.length<=100).map(c=>({id:String(c.characterId),name:c.name}));
}
module.exports={readLocation,readCharacters};
