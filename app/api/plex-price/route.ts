import {NextResponse} from 'next/server';
type Order={price:number;is_buy_order:boolean;volume_remain:number;type_id:number};
export async function GET(){
 try{
  let sell:number|null=null,buy:number|null=null,updatedAt:string|null=null;
  for(let page=1;page<=20;page++){
   const r=await fetch(`https://esi.evetech.net/markets/19000001/orders/?order_type=all&type_id=44992&page=${page}`,{headers:{'X-Compatibility-Date':'2026-08-23'},next:{revalidate:300},signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw Error('ESI unavailable');
   const rows:Order[]=await r.json();if(!Array.isArray(rows))throw Error('Invalid orders');
   const stamp=r.headers.get('Last-Modified');if(stamp&&Number.isFinite(Date.parse(stamp))&&(!updatedAt||Date.parse(stamp)<Date.parse(updatedAt)))updatedAt=new Date(stamp).toISOString();
   for(const o of rows){if(o.type_id!==44992||!Number.isFinite(o.price)||o.price<=0||o.volume_remain<=0)continue;if(o.is_buy_order)buy=Math.max(buy??0,o.price);else sell=Math.min(sell??Infinity,o.price);}
   const pages=Number(r.headers.get('X-Pages')||1);if(!Number.isInteger(pages)||pages<1||pages>20)throw Error('Invalid pagination');if(page>=pages)break;
  }
  if(sell===null&&buy===null)throw Error('No orders');
  return NextResponse.json({sell,buy,updatedAt,fetchedAt:new Date().toISOString(),market:'Globaler PLEX-Markt'},{headers:{'Cache-Control':'public, max-age=60, s-maxage=300'}});
 }catch{return NextResponse.json({error:'PLEX-Preis derzeit nicht verfügbar'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
