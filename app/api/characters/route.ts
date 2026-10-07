import { NextRequest, NextResponse } from 'next/server';
import { esi, refreshCharacter } from '../../lib/eve';
import { readSession, writeSession } from '../../lib/session';

export async function GET(request: NextRequest) {
  try {
    const stored = await readSession(request);
    const session = stored.data;
    if (!session) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const refreshed = await Promise.all(session.characters.map((character) => refreshCharacter(character)));
    session.characters = refreshed.map((entry) => entry.character);
    const wallets = await Promise.all(refreshed.map((entry) => esi(`/characters/${entry.character.characterId}/wallet/`, entry.accessToken) as Promise<number>));
    const characters = session.characters.map(({ characterId, name }, index) => ({
      characterId,
      name,
      wallet: wallets[index],
      portrait: `https://images.evetech.net/characters/${characterId}/portrait?size=128`,
    }));
    const response = NextResponse.json({
      activeCharacterId: session.activeCharacterId,
      totalWallet: wallets.reduce((total, wallet) => total + wallet, 0),
      characters,
    });
    await writeSession(response, session, stored.id);
    return response;
  } catch (error) {
    console.error('ESI_CHARACTERS_FAILURE', error instanceof Error ? error.message : 'Unbekannter Übersichtsfehler');
    return NextResponse.json({ error: 'eve_service_error' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const stored = await readSession(request);
  const session = stored.data;
  if (!session) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  const { characterId } = await request.json() as { characterId: string };
  if (!session.characters.some((character) => character.characterId === characterId)) return NextResponse.json({ error: 'unknown_character' }, { status: 404 });
  session.activeCharacterId = characterId;
  const response = NextResponse.json({ ok: true });
  await writeSession(response, session, stored.id);
  return response;
}
