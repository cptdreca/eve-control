import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const iskGoals = sqliteTable('isk_goals', {
  owner: text('owner').primaryKey(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull().default(0),
});

export const eveSessions = sqliteTable('eve_sessions', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
