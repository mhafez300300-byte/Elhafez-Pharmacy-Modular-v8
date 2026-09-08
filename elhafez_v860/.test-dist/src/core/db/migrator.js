export async function runMigrations(db, migrations) {
    await db.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
    for (const migration of migrations) {
        const hit = await db.query('SELECT id FROM app_migrations WHERE id=$1', [migration.id]);
        if (hit.rowCount)
            continue;
        await db.withTransaction(async (tx) => {
            await tx.query(migration.sql);
            await tx.query('INSERT INTO app_migrations(id) VALUES($1)', [migration.id]);
        });
    }
}
