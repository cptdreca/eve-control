import { env } from 'cloudflare:workers';
export function goalDatabase() {
  const db=(env as unknown as { DB?: D1Database }).DB;
  if(!db) throw new Error('Datenbankspeicher nicht verfügbar');
  return db;
}
