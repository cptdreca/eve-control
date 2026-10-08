function routeUrl(from,to){return `https://evemaps.dotlan.net/route/1:${encodeURIComponent(from.name.replaceAll(' ','_'))}:${encodeURIComponent(to.name.replaceAll(' ','_'))}`;}
function parseRoute(html,from,to){
 if(!/<input\b[^>]*id="wp_type1"[^>]*checked="checked"/i.test(html))throw Error('DOTLAN bestätigt keine kürzeste Route.');
 const table=html.match(/<h2>Route:[\s\S]*?<\/h2>\s*<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];
 if(!table)throw Error('DOTLAN liefert keine auswertbare Route.');
 const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m=>/link-5-\d+/.test(m[1]));
 const ids=rows.map((row,i)=>{const number=row[1].match(/<td\b[^>]*>\s*(\d+)\.\s*<\/td>/i);const ids=[...row[1].matchAll(/\blink-5-(\d+)\b/g)].map(m=>Number(m[1]));if(Number(number?.[1])!==i+1||new Set(ids).size!==1)throw Error('DOTLAN-Routenformat unbekannt.');return ids[0];});
 if(ids.length<2||ids[0]!==from.id||ids.at(-1)!==to.id||new Set(ids).size!==ids.length)throw Error('DOTLAN-Route stimmt nicht mit Start und Ziel überein.');
 return ids.length-1;
}
class DotlanDistance{
 constructor(request=fetch){this.request=request;this.cache=new Map();this.queue=Promise.resolve();this.last=0;this.blockedUntil=0;}
 async distance(from,to){
  if(from.id===to.id)return {distance:0,source:'Gleiches System',url:null};
  const key=`${from.id}:${to.id}`,cached=this.cache.get(key);if(cached&&Date.now()-cached.time<600000)return cached.value;
  const pending=this.queue.catch(()=>{}).then(async()=>{
   const cached=this.cache.get(key);if(cached&&Date.now()-cached.time<600000)return cached.value;
   if(Date.now()<this.blockedUntil)throw Error('DOTLAN vorübergehend nicht verfügbar; erneuter Versuch in einer Minute.');
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,1000-(Date.now()-this.last))));this.last=Date.now();
   try{
    const url=routeUrl(from,to);const response=await this.request(url,{headers:{'User-Agent':'EVE-Control/1.5.0 https://github.com/cptdreca/eve-control','Accept':'text/html'},redirect:'error',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error(`DOTLAN: HTTP ${response.status}`);
    const html=await response.text();if(html.length>2000000)throw Error('DOTLAN-Antwort zu groß.');
    const value={distance:parseRoute(html,from,to),source:'DOTLAN · Fastest Route',url};
    if(this.cache.size>=500)this.cache.clear();this.cache.set(key,{time:Date.now(),value});return value;
   }catch(e){this.blockedUntil=Date.now()+60000;throw e;}
  });this.queue=pending;return pending;
 }
}
module.exports={DotlanDistance,parseRoute,routeUrl};
