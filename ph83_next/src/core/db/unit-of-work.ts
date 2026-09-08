import type { DbTx } from './types.js';
export interface UnitOfWork { withTransaction<T>(work:(tx:DbTx)=>Promise<T>):Promise<T>; }
