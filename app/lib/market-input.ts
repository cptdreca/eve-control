// Clipboard quantities are only used after an exact-name lookup misses.
export function quantityCandidate(input:string):{name:string;quantity:number}|null{
 const columns=input.trim().split(/\t+/);
 const match=columns.length>1?[columns[0].trim(),columns[1].trim()]:null;
 const suffix=match?null:input.trim().match(/^(.+?)\s+(\d+|\d{1,3}(?:[.,\u00a0\u202f]\d{3})+)$/);
 const name=match?.[0]||suffix?.[1];const raw=match?.[1]||suffix?.[2];
 if(!name||!raw||!/^([0-9]+|[0-9]{1,3}(?:[.,\u00a0\u202f][0-9]{3})+)$/.test(raw))return null;
 const quantity=Number(raw.replace(/[.,\u00a0\u202f]/g,''));
 return Number.isSafeInteger(quantity)&&quantity>0?{name,quantity}:null;
}
