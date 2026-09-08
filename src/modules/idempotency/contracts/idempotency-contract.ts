import type { DbTx } from '../../../core/db/types.js';
export type IdempotencyClaim=Readonly<{state:'new'}|{state:'replay';resourceId:string}>;
export interface IdempotencyContract{
  claim(input:{tenantId:string;scope:string;key:string;requestHash:string},tx:DbTx):Promise<IdempotencyClaim>;
  complete(input:{tenantId:string;scope:string;key:string;resourceId:string},tx:DbTx):Promise<void>;
}
