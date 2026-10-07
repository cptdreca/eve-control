import type {Journal} from './isk-goals';

export class WalletError extends Error {
  reconnect:boolean;
  constructor(message:string, reconnect=false) { super(message); this.reconnect=reconnect; }
}

export async function readWalletJournal(characterId:string, token:string, fetcher:typeof fetch=fetch):Promise<Journal[]> {
  if(!token) throw new WalletError('Anmeldung fehlt. Bitte diesen Charakter erneut mit EVE verbinden.',true);
  const result:Journal[]=[];
  for(let page=1;page<=100;page++) {
    let response:Response;
    try {
      response=await fetcher(`https://esi.evetech.net/characters/${characterId}/wallet/journal/?page=${page}`,{
        headers:{Authorization:`Bearer ${token}`,'X-Compatibility-Date':'2026-08-23'},cache:'no-store',signal:AbortSignal.timeout(20000)
      });
    } catch { throw new WalletError('ESI antwortet nicht. Bitte später erneut versuchen.'); }
    if(response.status===401) throw new WalletError('Anmeldung abgelaufen oder ungültig. Bitte diesen Charakter erneut mit EVE verbinden.',true);
    if(response.status===403) throw new WalletError('Wallet-Zugriff fehlt oder wurde abgelehnt. Bitte diesen Charakter erneut mit EVE verbinden und den Wallet-Scope freigeben.',true);
    if(response.status===420||response.status===429) throw new WalletError('ESI-Abfragelimit erreicht. Bitte später erneut versuchen.');
    if(!response.ok) throw new WalletError(`ESI vorübergehend nicht verfügbar (HTTP ${response.status}). Bitte erneut versuchen.`);
    const rows:unknown=await response.json();
    if(!Array.isArray(rows)) throw new WalletError('Ungültige ESI-Antwort. Bitte erneut versuchen.');
    result.push(...rows as Journal[]);
    const pages=Number(response.headers.get('X-Pages')||1);
    if(!Number.isInteger(pages)||pages<1||pages>100) throw new WalletError('Journal zu umfangreich oder Seitenzahl ungültig. Es wurden keine unvollständigen Daten übernommen.');
    if(page>=pages) return result;
  }
  return result;
}
