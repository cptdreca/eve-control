import {NextRequest,NextResponse} from 'next/server';
import {jitaPrices,MarketOrder} from '../../lib/trading';
const headers={'X-Compatibility-Date':'2026-08-23'};
async function get(path:string){const r=await fetch(`https://esi.evetech.net${path}`,{headers,next:{revalidate:300},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('ESI nicht verfügbar. Bitte später erneut versuchen.');return r;}
export async function GET(request:NextRequest){
 const query=(request.nextUrl.searchParams.get('q')||'').trim();
 if(!query||query.length>120)return NextResponse.json({error:'Bitte einen vollständigen Artikelnamen oder eine Type-ID eingeben.'},{status:400});
 try{
  let typeId:number;
  if(/^\d+$/.test(query)){typeId=Number(query);if(!Number.isSafeInteger(typeId)||typeId<=0||typeId>2147483647)return NextResponse.json({error:'Ungültige Type-ID.'},{status:400});}
  else{
   const r=await fetch('https://esi.evetech.net/universe/ids/?language=en',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify([query]),signal:AbortSignal.timeout(15000)});
   if(r.status===404)return NextResponse.json({error:'Artikel nicht gefunden. Bitte den vollständigen englischen Namen oder die Type-ID verwenden.'},{status:404});
   if(!r.ok)throw Error('Artikelsuche derzeit nicht verfügbar.');const data=await r.json() as {inventory_types?:{id:number;name:string}[]};typeId=data.inventory_types?.[0]?.id||0;
   if(!typeId)return NextResponse.json({error:'Artikel nicht gefunden. Bitte den vollständigen englischen Namen oder die Type-ID verwenden.'},{status:404});
  }
  const type=await(await get(`/universe/types/${typeId}/?language=en`)).json() as {name:string};
  if(typeId===44992)return NextResponse.json({error:'PLEX wird im globalen PLEX-Markt gehandelt. Den aktuellen Preis findest du oben im PLEX-Laufband.'},{status:400});
  const orders:MarketOrder[]=[];let updatedAt:string|null=null;
  for(let page=1;page<=30;page++){
   const r=await get(`/markets/10000002/orders/?order_type=all&type_id=${typeId}&page=${page}`);const batch=await r.json();if(!Array.isArray(batch))throw Error('Ungültige Marktdaten.');orders.push(...batch);
   const stamp=r.headers.get('Last-Modified');if(stamp&&Number.isFinite(Date.parse(stamp))&&(!updatedAt||Date.parse(stamp)<Date.parse(updatedAt)))updatedAt=new Date(stamp).toISOString();
   const pages=Number(r.headers.get('X-Pages')||1);if(!Number.isInteger(pages)||pages<1||pages>30)throw Error('Zu viele Marktorders; keine unvollständigen Preise angezeigt.');if(page>=pages)break;
  }
  return NextResponse.json({typeId,name:type.name,...jitaPrices(orders,typeId),updatedAt,fetchedAt:new Date().toISOString(),market:'Jita IV – Moon 4 – Caldari Navy Assembly Plant'},{headers:{'Cache-Control':'public, max-age=60, s-maxage=300'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Marktdaten derzeit nicht verfügbar.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
