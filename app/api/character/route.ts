import { NextRequest, NextResponse } from 'next/server';
import { characterLocation } from '../../lib/character-location';
import { esi, refreshCharacter } from '../../lib/eve';
import { readSession, writeSession } from '../../lib/session';

type CharacterPublic = { corporation_id: number };
type CorporationPublic = { name: string; ticker: string; member_count: number; alliance_id?: number };
type AlliancePublic = { name: string; ticker: string };

async function corporationSummary(id: string, token: string) {
  try {
    const character = await esi(`/characters/${id}/`, token) as CharacterPublic;
    const corporation = await esi(`/corporations/${character.corporation_id}/`, token) as CorporationPublic;
    const alliance = corporation.alliance_id ? await esi(`/alliances/${corporation.alliance_id}/`, token).catch(() => null) as AlliancePublic | null : null;
    return {
      id: character.corporation_id,
      name: corporation.name,
      ticker: corporation.ticker,
      memberCount: corporation.member_count,
      logo: `https://images.evetech.net/corporations/${character.corporation_id}/logo?size=128`,
      alliance: corporation.alliance_id && alliance ? { id: corporation.alliance_id, name: alliance.name, ticker: alliance.ticker, logo: `https://images.evetech.net/alliances/${corporation.alliance_id}/logo?size=128` } : null,
    };
  } catch {
    return null;
  }
}

async function privateActivitySummary(id: string, token: string) {
  const [contracts, orders] = await Promise.all([
    esi(`/characters/${id}/contracts/`, token).then((value) => ({ authorizationRequired: false, total: (value as Array<{ status: string }>).length, active: (value as Array<{ status: string }>).filter((item) => ['outstanding', 'in_progress'].includes(item.status)).length })).catch(() => ({ authorizationRequired: true, total: 0, active: 0 })),
    esi(`/characters/${id}/orders/`, token).then((value) => ({ authorizationRequired: false, active: (value as unknown[]).length })).catch(() => ({ authorizationRequired: true, active: 0 })),
  ]);
  return { contracts, market: orders };
}

export async function GET(request: NextRequest) {
  try {
    const storedSession = await readSession(request);
    const session = storedSession.data;
    if (!session) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    const requested = request.nextUrl.searchParams.get('characterId') || session.activeCharacterId;
    const stored = session.characters.find((character) => character.characterId === requested);
    if (!stored) return NextResponse.json({ error: 'unknown_character' }, { status: 404 });
    const refreshed = await refreshCharacter(stored);
    session.activeCharacterId = stored.characterId;
    session.characters = session.characters.map((character) => character.characterId === stored.characterId ? refreshed.character : character);
    const id = stored.characterId;
    const [wallet, skillQueue, jobs, location, corporation, privateActivity] = await Promise.all([
      esi(`/characters/${id}/wallet/`, refreshed.accessToken),
      esi(`/characters/${id}/skillqueue/`, refreshed.accessToken),
      esi(`/characters/${id}/industry/jobs/`, refreshed.accessToken),
      characterLocation(id, refreshed.accessToken, esi),
      corporationSummary(id, refreshed.accessToken),
      privateActivitySummary(id, refreshed.accessToken),
    ]) as [number, Array<{ finish_date?: string }>, Array<{ status: string; activity_id?: number; end_date?: string }>, Awaited<ReturnType<typeof characterLocation>>, Awaited<ReturnType<typeof corporationSummary>>, Awaited<ReturnType<typeof privateActivitySummary>>];
    const last = skillQueue.at(-1);
    const remainingMs = last?.finish_date ? Math.max(0, new Date(last.finish_date).getTime() - Date.now()) : 0;
    const activeJobs = jobs.filter((job) => ['active', 'paused'].includes(job.status));
    const response = NextResponse.json({ characterId: id, name: refreshed.character.name, wallet, location, corporation, contracts: privateActivity.contracts, market: privateActivity.market, portrait: `https://images.evetech.net/characters/${id}/portrait?size=256`, skillQueue: { entries: skillQueue.length, remainingMs }, industry: { total: jobs.length, active: activeJobs.length, ready: jobs.filter((job) => job.status === 'ready').length } });
    await writeSession(response, session, storedSession.id);
    return response;
  } catch (error) {
    console.error('ESI_CHARACTER_FAILURE', error instanceof Error ? error.message : 'Unbekannter ESI-Fehler');
    return NextResponse.json({ error: 'eve_service_error' }, { status: 502 });
  }
}
