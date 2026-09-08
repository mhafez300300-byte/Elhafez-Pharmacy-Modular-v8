import { Pool } from 'pg';
class Transaction {
    client;
    constructor(client) {
        this.client = client;
    }
    query(text, params) {
        return this.client.query(text, params ? [...params] : undefined);
    }
}
export class PostgresDatabase {
    pool;
    constructor(databaseUrl) {
        this.pool = new Pool({ connectionString: databaseUrl, max: 15, idleTimeoutMillis: 30_000 });
    }
    query(text, params) {
        return this.pool.query(text, params ? [...params] : undefined);
    }
    async withTransaction(work) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const value = await work(new Transaction(client));
            await client.query('COMMIT');
            return value;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async close() {
        await this.pool.end();
    }
}
