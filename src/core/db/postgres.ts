import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import type { DbExecutor, DbTx } from './types.js';

class Transaction implements DbTx {
  constructor(public readonly client: PoolClient) {}
  query<R extends QueryResultRow = QueryResultRow>(text: string, params?: readonly unknown[]): Promise<QueryResult<R>> {
    return this.client.query<R>(text, params ? [...params] : undefined);
  }
}

export class PostgresDatabase implements DbExecutor {
  readonly pool: Pool;
  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl, max: 15, idleTimeoutMillis: 30_000 });
  }

  query<R extends QueryResultRow = QueryResultRow>(text: string, params?: readonly unknown[]): Promise<QueryResult<R>> {
    return this.pool.query<R>(text, params ? [...params] : undefined);
  }

  async withTransaction<T>(work: (tx: DbTx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await work(new Transaction(client));
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
