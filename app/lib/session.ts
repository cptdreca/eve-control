import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { MultiSession, normalizeSession, seal, unseal } from './eve';

const COOKIE_NAME = 'eve_sid';
const LEGACY_COOKIE_NAME = 'eve_session';
const MAX_AGE = 2_592_000;
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: MAX_AGE, path: '/' };

export type SessionRecord = { id: string | null; data: MultiSession | null };

function database() {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new Error('Datenbankspeicher nicht verfügbar');
  return db;
}

function validId(value?: string) {
  return value && /^[A-Za-z0-9_-]{32,64}$/.test(value) ? value : null;
}

function newId() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}

export async function readSession(request: NextRequest): Promise<SessionRecord> {
  const id = validId(request.cookies.get(COOKIE_NAME)?.value);
  if (id) {
    const row = await database().prepare('SELECT payload, expires_at FROM eve_sessions WHERE id = ?').bind(id).first<{payload:string;expires_at:number}>();
    if (row && row.expires_at > Date.now()) return { id, data: normalizeSession(await unseal<MultiSession>(row.payload)) };
    if (row) await database().prepare('DELETE FROM eve_sessions WHERE id = ?').bind(id).run();
  }

  const legacy = normalizeSession(await unseal<MultiSession>(request.cookies.get(LEGACY_COOKIE_NAME)?.value));
  return { id: null, data: legacy };
}

export async function writeSession(response: NextResponse, data: MultiSession, existingId?: string | null) {
  const id = existingId || newId();
  const expiresAt = Date.now() + MAX_AGE * 1000;
  const payload = await seal(data);
  await database().prepare(`
    INSERT INTO eve_sessions (id, payload, expires_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, payload, expiresAt).run();
  response.cookies.set(COOKIE_NAME, id, cookieOptions);
  response.cookies.delete(LEGACY_COOKIE_NAME);
  return id;
}

export async function clearSession(response: NextResponse, id?: string | null) {
  if (id) await database().prepare('DELETE FROM eve_sessions WHERE id = ?').bind(id).run();
  response.cookies.delete(COOKIE_NAME);
  response.cookies.delete(LEGACY_COOKIE_NAME);
}
