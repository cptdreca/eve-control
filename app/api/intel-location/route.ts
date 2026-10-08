import { NextRequest, NextResponse } from 'next/server';
import { refreshCharacter } from '../../lib/eve';
import { readSession, writeSession } from '../../lib/session';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export async function GET(request: NextRequest) {
  try {
    const stored = await readSession(request);
    const session = stored.data;
    if (!session) return NextResponse.json({ error: 'Bitte im Desktop-Dashboard mit EVE anmelden.' }, { status: 401, headers });
    const id = request.nextUrl.searchParams.get('characterId');
    const character = session.characters.find(c => c.characterId === id);
    if (!character) return NextResponse.json({ error: 'Diesen Intel-Charakter zuerst im Desktop-Dashboard verbinden.' }, { status: 404, headers });
    let refreshed;
    try { refreshed = await refreshCharacter(character); }
    catch { return NextResponse.json({ error: 'EVE-Anmeldung abgelaufen oder nicht erreichbar. Bitte erneut versuchen oder den Charakter neu verbinden.' }, { status: 401, headers }); }
    session.characters = session.characters.map(c => c.characterId === id ? refreshed.character : c);
    // Preserve rotated refresh tokens even when the subsequent location request fails.
    let response: NextResponse;
    try {
      const esi = await fetch(`https://esi.evetech.net/characters/${id}/location/`, {
        headers: { Authorization: `Bearer ${refreshed.accessToken}`, 'X-Compatibility-Date': '2026-08-23' },
        cache: 'no-store', signal: AbortSignal.timeout(12000),
      });
      if (esi.status === 401 || esi.status === 403) {
        response = NextResponse.json({ error: 'ESI-Standortberechtigung fehlt oder ist ungültig. Charakter im Dashboard neu verbinden und Standortzugriff erlauben.' }, { status: 403, headers });
      } else if (!esi.ok) {
        response = NextResponse.json({ error: 'ESI-Standort momentan nicht verfügbar. Die Abfrage wird automatisch wiederholt.' }, { status: 502, headers });
      } else {
        const data = await esi.json() as { solar_system_id?: number };
        if (!Number.isSafeInteger(data.solar_system_id) || data.solar_system_id! <= 0) throw Error('Invalid location');
        response = NextResponse.json({ characterId: id, solarSystemId: data.solar_system_id, checkedAt: new Date().toISOString() }, { headers });
      }
    } catch {
      response = NextResponse.json({ error: 'ESI-Standort nicht erreichbar. Die Abfrage wird automatisch wiederholt.' }, { status: 502, headers });
    }
    await writeSession(response, session, stored.id);
    return response;
  } catch {
    return NextResponse.json({ error: 'Standortabfrage fehlgeschlagen. Bitte erneut versuchen.' }, { status: 502, headers });
  }
}
