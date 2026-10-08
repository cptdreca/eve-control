const fs=require('node:fs/promises'),path=require('node:path');
const {decoder,parseLine,entities}=require('./intel-core.cjs');
const systems=require('./system-catalog.json'),ships=require('./ship-names.json');
function folders({documents,home,env={},saved=''}){
 const roots=[documents,path.join(home,'Documents'),...[env.OneDrive,env.OneDriveConsumer,env.OneDriveCommercial].filter(Boolean).map(p=>path.join(p,'Documents'))];
 return [...new Map([saved,...roots.map(p=>path.join(p,'EVE','logs','Chatlogs'))].filter(Boolean).map(p=>[path.resolve(p).toLowerCase(),path.resolve(p)])).values()];
}
async function discover(dirs,pilot,now=Date.now()){
 if(typeof pilot!=='string'||!pilot.trim()||pilot.length>100)throw Error('Bitte zuerst deinen EVE-Charakter eintragen.');
 const found=new Map();let readable=0;const errors=[];
 for(const folder of dirs){
  let files;try{files=await fs.readdir(folder,{withFileTypes:true});readable++;}catch(e){if(e.code!=='ENOENT')errors.push(folder);continue;}
  const recent=[];
  const entries=files.filter(e=>e.isFile()&&/\.txt$/i.test(e.name));
  for(let i=0;i<entries.length;i+=32)await Promise.all(entries.slice(i,i+32).map(async entry=>{
   try{const stat=await fs.stat(path.join(folder,entry.name));if(now-stat.mtimeMs<86400000)recent.push({name:entry.name,mtime:stat.mtimeMs,size:stat.size});}catch{}
  }));
  for(const file of recent.sort((a,b)=>b.mtime-a.mtime)){
   let handle;try{
    handle=await fs.open(path.join(folder,file.name),'r');const head=Buffer.alloc(Math.min(8192,file.size));await handle.read(head,0,head.length,0);const header=decoder(head).write(head);
    const listener=header.match(/^\s*Listener\s*:\s*([^\r\n]+)/im)?.[1]?.trim();
    if(listener?.toLowerCase()!==pilot.trim().toLowerCase())continue;
    const channel=header.match(/^\s*Channel Name\s*:\s*([^\r\n]+)/im)?.[1]?.trim();
    const prefix=file.name.replace(/_\d{8}_\d{6}.*\.txt$/i,'');
    if(!channel||prefix===file.name||/^(local|lokal)$/i.test(channel)||prefix.length>200)continue;
    let reason=/intel/i.test(channel)?'Intel-Kanalname erkannt':'';
    if(!reason){
     const utf16=head[0]===255&&head[1]===254;let start=Math.max(0,file.size-8192);if(utf16&&start%2)start++;
     const tail=Buffer.alloc(file.size-start);await handle.read(tail,0,tail.length,start);
     const lines=tail.toString(utf16?'utf16le':'utf8').split(/\r?\n/).slice(-8).map(parseLine).filter(Boolean);
     // Resolve names only against local catalogs, never send discovery text to ESI.
     for(const line of lines){if(!/\b[A-Z0-9]{1,6}-[A-Z0-9]{1,6}\b/.test(line.text))continue;const parsed=entities(line.text,systems,ships);if(parsed.systems.length===1&&(parsed.names.length||parsed.ids.length)){reason='Intel-Meldung im Log erkannt';break;}}
    }
    const key=folder.toLowerCase()+'|'+prefix.toLowerCase();if(!found.has(key))found.set(key,{folder,channel,prefix,pilot:listener,lastWrite:new Date(file.mtime).toISOString(),recommended:Boolean(reason),reason:reason||'Kanal dieses Charakters'});
   }catch{errors.push(file.name);}finally{await handle?.close();}
  }
 }
 return {candidates:[...found.values()].sort((a,b)=>Number(b.recommended)-Number(a.recommended)||b.lastWrite.localeCompare(a.lastWrite)),readable,errors:errors.length};
}
function choose(candidates,config){
 const selected=config.channels.split(/[\n,;]/).map(n=>n.trim().toLowerCase()).filter(Boolean);
 const existing=candidates.filter(c=>c.folder.toLowerCase()===config.folder.toLowerCase()&&selected.includes(c.prefix.toLowerCase()));
 if(selected.length&&existing.length===selected.length)return {folder:config.folder,channels:config.channels};
 const likely=candidates.filter(c=>c.recommended);return likely.length===1?{folder:likely[0].folder,channels:likely[0].prefix}:null;
}
function selectChannels(candidates,indices,pilot){
 if(!Array.isArray(indices)||!indices.length||indices.length>100||indices.some(i=>!Number.isInteger(i)||!candidates[i]))throw Error('Bitte mindestens einen verfügbaren Kanal auswählen.');
 const chosen=[...new Set(indices)].map(i=>candidates[i]);
 if(chosen.some(c=>c.pilot.toLowerCase()!==pilot.toLowerCase()))throw Error('Charakter geändert. Bitte erneut suchen.');
 if(chosen.some(c=>c.folder.toLowerCase()!==chosen[0].folder.toLowerCase()))throw Error('Bitte Kanäle aus demselben Chatlog-Ordner auswählen.');
 const channels=[...new Set(chosen.map(c=>c.prefix))].join(', ');if(channels.length>500)throw Error('Zu viele Kanäle ausgewählt.');
 return {folder:chosen[0].folder,channels};
}
module.exports={folders,discover,choose,selectChannels};
