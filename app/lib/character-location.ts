type Esi = (path: string, token: string) => Promise<unknown>;
type Location = { solar_system_id: number; station_id?: number; structure_id?: number };
type Named = { name?: string; type_id?: number };

export async function characterLocation(id: string, token: string, esi: Esi) {
  let location: Location;
  try {
    location = await esi(`/characters/${id}/location/`, token) as Location;
  } catch {
    return { solarSystem: 'Standort nicht verfügbar', detail: '', authorizationRequired: true, structureAuthorizationRequired: false };
  }
  const system = await esi(`/universe/systems/${location.solar_system_id}/`, token).catch(() => null) as Named | null;
  let detail = '';
  let structureAuthorizationRequired = false;
  const placeId = location.structure_id || location.station_id;
  if (placeId) {
    const isStructure = Boolean(location.structure_id);
    try {
      const place = await esi(`/universe/${isStructure ? 'structures' : 'stations'}/${placeId}/`, token) as Named;
      detail = place.name || `${isStructure ? 'Struktur' : 'Station'} ${placeId} · Name nicht verfügbar`;
      if (isStructure && place.type_id) {
        const type = await esi(`/universe/types/${place.type_id}/`, token).catch(() => null) as Named | null;
        if (type?.name) detail += ` (${type.name})`;
      }
    } catch (error) {
      const denied = error instanceof Error && /ESI Fehler (401|403)\b/.test(error.message);
      structureAuthorizationRequired = isStructure && denied;
      detail = `${isStructure ? 'Struktur' : 'Station'} ${placeId} · ${denied ? 'Namenszugriff nicht freigegeben' : 'Name derzeit nicht abrufbar'}`;
    }
  }
  return { solarSystem: system?.name || `System ${location.solar_system_id}`, detail, authorizationRequired: false, structureAuthorizationRequired };
}
