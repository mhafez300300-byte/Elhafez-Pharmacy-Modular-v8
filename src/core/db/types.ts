import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DbExecutor {
  query<R extends QueryResultRow = QueryResultRow>(text: string, params?: readonly unknown[]): Promise<QueryResult<R>>;
}

export interface DbTx extends DbExecutor {
  readonly client: PoolClient;
}
