import type { DbExecutor } from './types.js';
import type { UnitOfWork } from './unit-of-work.js';

export type Migration = Readonly<{ id: string; sql: string }>;

export async function runMigrations(db: DbExecutor & UnitOfWork, migrations: readonly Migration[]): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  for (const migration of migrations) {
    const hit = await db.query<{ id: string }>('SELECT id FROM app_migrations WHERE id=$1', [migration.id]);
    if (hit.rowCount) continue;
    await db.withTransaction(async tx => {
      await tx.query(migration.sql);
      await tx.query('INSERT INTO app_migrations(id) VALUES($1)', [migration.id]);
    });
  }
}
