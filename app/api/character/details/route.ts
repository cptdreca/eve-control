import { NextRequest, NextResponse } from 'next/server';
import { esi, refreshCharacter } from '../../../lib/eve';
import { readSession, writeSession } from '../../../lib/session';

type TypeInfo = { name?: string };
type CloneResponse = { home_location?: { location_id: number; location_type: string }; jump_clones: Array<{ jump_clone_id: number; location_id: number; location_type: string; name?: string; implants: number[] }>; last_clone_jump_date?: string; last_station_change_date?: string };
type StructureInfo = { name?: string; type_id?: number; solar_system_id?: number; system_id?: number };
type CorporationPublic = { alliance_id?: number; ceo_id: number; creator_id: number; date_founded?: string; description?: string; faction_id?: number; home_station_id?: number; member_count: number; name: string; shares?: number; tax_rate: number; ticker: string; url?: string; war_eligible?: boolean };
type AlliancePublic = { creator_corporation_id: number; creator_id: number; date_founded: string; executor_corporation_id?: number; name: string; ticker: string };

function safePublicUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

async function typeName(id: number, token: string) {
  try {
    const value = (await esi(`/universe/types/${id}/`, token)) as TypeInfo;
    return value.name || `Type ${id}`;
  } catch {
    return `Type ${id}`;
  }
}

async function locationNames(ids: number[], token: string) {
  if (!ids.length) return new Map<number, string>();
  try {
    const response = await fetch('https://esi.evetech.net/universe/names/', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Compatibility-Date': '2026-08-23' }, body: JSON.stringify([...new Set(ids)]), cache: 'no-store' });
    if (!response.ok) throw new Error();
    const values = await response.json() as Array<{ id: number; name: string }>;
    return new Map(values.map((value) => [value.id, value.name]));
  } catch { return new Map<number, string>(); }
}

async function locationDetails(locationId: number, locationType: string, token: string, fallbackName: string) {
  try {
    const path = locationType === 'structure' ? `/universe/structures/${locationId}/` : `/universe/stations/${locationId}/`;
    const value = await esi(path, token) as StructureInfo;
    const typeId = value.type_id;
    const systemId = value.solar_system_id || value.system_id;
    const [structureType, system] = await Promise.all([
      typeId ? typeName(typeId, token) : Promise.resolve(locationType === 'structure' ? 'Spielerstruktur' : 'NPC-Station'),
      systemId ? esi(`/universe/systems/${systemId}/`, token).catch(() => null) as Promise<TypeInfo | null> : Promise.resolve(null),
    ]);
    return { locationName: value.name || fallbackName, structureType, systemName: system?.name || '', typeId: typeId || null, icon: typeId ? `https://images.evetech.net/types/${typeId}/icon?size=64` : null, locationId, locationType };
  } catch {
    return { locationName: fallbackName, structureType: locationType === 'structure' ? 'Nicht zugängliche Spielerstruktur' : 'Station', systemName: '', typeId: null, icon: null, locationId, locationType };
  }
}

export async function GET(request: NextRequest) {
  try {
    const storedSession = await readSession(request);
    const session = storedSession.data;
    if (!session) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('characterId') || session.activeCharacterId;
    const category = request.nextUrl.searchParams.get('category');
    const stored = session.characters.find((character) => character.characterId === id);
    if (!stored) return NextResponse.json({ error: 'unknown_character' }, { status: 404 });

    const refreshed = await refreshCharacter(stored);
    session.characters = session.characters.map((character) => character.characterId === id ? refreshed.character : character);
    const token = refreshed.accessToken;
    let data: unknown;

    if (category === 'skills') {
      const queue = (await esi(`/characters/${id}/skillqueue/`, token)) as Array<{ skill_id: number; finished_level: number; queue_position: number; start_date?: string; finish_date?: string }>;
      data = await Promise.all(queue.map(async (item) => ({ ...item, name: await typeName(item.skill_id, token) })));
    } else if (category === 'wallet') {
      const [journal, transactions] = (await Promise.all([
        esi(`/characters/${id}/wallet/journal/`, token),
        esi(`/characters/${id}/wallet/transactions/`, token),
      ])) as [Array<Record<string, unknown>>, Array<{ type_id: number; date: string; is_buy: boolean; quantity: number; unit_price: number }>];
      data = {
        journal: journal.slice(0, 15).map((item) => ({ id: item.id, date: item.date, amount: item.amount, balance: item.balance, description: item.description, reference_type: item.ref_type })),
        transactions: await Promise.all(transactions.slice(0, 15).map(async (item) => ({ ...item, name: await typeName(item.type_id, token) }))),
      };
    } else if (category === 'clones') {
      try {
        const clones = await esi(`/characters/${id}/clones/`, token) as CloneResponse;
        const names = await locationNames([...(clones.home_location ? [clones.home_location.location_id] : []), ...clones.jump_clones.map((clone) => clone.location_id)], token);
        const homeLocation = clones.home_location ? await locationDetails(clones.home_location.location_id, clones.home_location.location_type, token, names.get(clones.home_location.location_id) || `${clones.home_location.location_type} ${clones.home_location.location_id}`) : null;
        data = {
          authorizationRequired: false,
          lastCloneJumpDate: clones.last_clone_jump_date,
          homeLocation,
          clones: await Promise.all(clones.jump_clones.map(async (clone) => ({ ...clone, ...await locationDetails(clone.location_id, clone.location_type, token, names.get(clone.location_id) || `${clone.location_type} ${clone.location_id}`), implants: await Promise.all(clone.implants.map(async (implant) => ({ id: implant, name: await typeName(implant, token), icon: `https://images.evetech.net/types/${implant}/icon?size=32` }))) }))),
        };
      } catch { data = { authorizationRequired: true, clones: [] }; }
    } else if (category === 'corporation') {
      const character = await esi(`/characters/${id}/`, token) as { corporation_id: number };
      const corporation = await esi(`/corporations/${character.corporation_id}/`, token) as CorporationPublic;
      const [alliance, names, headquarters] = await Promise.all([
        corporation.alliance_id ? esi(`/alliances/${corporation.alliance_id}/`, token).catch(() => null) as Promise<AlliancePublic | null> : Promise.resolve(null),
        locationNames([corporation.ceo_id, corporation.creator_id, ...(corporation.faction_id ? [corporation.faction_id] : [])], token),
        corporation.home_station_id ? esi(`/universe/stations/${corporation.home_station_id}/`, token).catch(() => null) as Promise<StructureInfo | null> : Promise.resolve(null),
      ]);
      data = {
        id: character.corporation_id,
        name: corporation.name,
        ticker: corporation.ticker,
        logo: `https://images.evetech.net/corporations/${character.corporation_id}/logo?size=256`,
        memberCount: corporation.member_count,
        taxRate: corporation.tax_rate,
        description: (corporation.description || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
        headquarters: headquarters?.name || (corporation.home_station_id ? `Station ${corporation.home_station_id}` : 'Nicht angegeben'),
        ceo: names.get(corporation.ceo_id) || `Character ${corporation.ceo_id}`,
        creator: names.get(corporation.creator_id) || `Character ${corporation.creator_id}`,
        founded: corporation.date_founded,
        shares: corporation.shares,
        url: safePublicUrl(corporation.url),
        warEligible: corporation.war_eligible,
        faction: corporation.faction_id ? names.get(corporation.faction_id) || `Faction ${corporation.faction_id}` : null,
        alliance: corporation.alliance_id && alliance ? { id: corporation.alliance_id, name: alliance.name, ticker: alliance.ticker, founded: alliance.date_founded, logo: `https://images.evetech.net/alliances/${corporation.alliance_id}/logo?size=256` } : null,
      };
    } else if (category === 'contracts') {
      try {
        const contracts = await esi(`/characters/${id}/contracts/`, token) as Array<{ acceptor_id: number; assignee_id: number; availability: string; collateral?: number; contract_id: number; date_accepted?: string; date_completed?: string; date_expired: string; date_issued: string; days_to_complete?: number; end_location_id?: number; for_corporation: boolean; issuer_corporation_id: number; issuer_id: number; price?: number; reward?: number; start_location_id?: number; status: string; title?: string; type: string; volume?: number }>;
        const names = await locationNames(contracts.flatMap((item) => [item.issuer_id, item.issuer_corporation_id, item.assignee_id]).filter(Boolean), token);
        data = { authorizationRequired: false, contracts: contracts.slice(0, 30).map((item) => ({ ...item, issuer: names.get(item.issuer_id) || `ID ${item.issuer_id}`, assignee: names.get(item.assignee_id) || (item.assignee_id ? `ID ${item.assignee_id}` : 'Öffentlich') })) };
      } catch { data = { authorizationRequired: true, contracts: [] }; }
    } else if (category === 'market') {
      try {
        const [active, history] = await Promise.all([
          esi(`/characters/${id}/orders/`, token),
          esi(`/characters/${id}/orders/history/`, token),
        ]) as [Array<{ duration: number; escrow?: number; is_buy_order?: boolean; issued: string; location_id: number; order_id: number; price: number; range: string; region_id: number; type_id: number; volume_remain: number; volume_total: number }>, Array<{ duration: number; is_buy_order?: boolean; issued: string; location_id: number; order_id: number; price: number; state: string; type_id: number; volume_remain: number; volume_total: number }>];
        const selected = [...active.map((item) => ({ ...item, state: 'active' })), ...history.slice(0, 15)];
        const places = await locationNames(selected.map((item) => item.location_id), token);
        data = { authorizationRequired: false, active: active.length, orders: await Promise.all(selected.slice(0, 30).map(async (item) => ({ ...item, name: await typeName(item.type_id, token), location: places.get(item.location_id) || `Location ${item.location_id}` }))) };
      } catch { data = { authorizationRequired: true, active: 0, orders: [] }; }
    } else if (category === 'industry') {
      const jobs = (await esi(`/characters/${id}/industry/jobs/?include_completed=true`, token)) as Array<{ job_id: number; activity_id: number; product_type_id: number; status: string; runs: number; start_date: string; end_date: string }>;
      data = await Promise.all(jobs.slice(0, 25).map(async (job) => ({ ...job, activity: job.activity_id === 11 ? 'Reaktion' : 'Industrie', name: await typeName(job.product_type_id, token) })));
    } else {
      return NextResponse.json({ error: 'unknown_category' }, { status: 400 });
    }

    const response = NextResponse.json({ category, data });
    await writeSession(response, session, storedSession.id);
    return response;
  } catch (error) {
    console.error('ESI_DETAILS_FAILURE', error instanceof Error ? error.message : 'Unbekannter Detailfehler');
    return NextResponse.json({ error: 'detail_service_error' }, { status: 502 });
  }
}
