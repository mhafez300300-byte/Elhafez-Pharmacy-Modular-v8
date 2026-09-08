import type { DbExecutor, DbTx } from '../../../core/db/types.js';
import { AppError } from '../../../core/errors/app-error.js';
import type { IdempotencyClaim, IdempotencyContract } from '../contracts/idempotency-contract.js';
export class PostgresIdempotencyRepository implements IdempotencyContract{
  constructor(private readonly db:DbExecutor){}
  async claim(input:{tenantId:string;scope:string;key:string;requestHash:string},tx:DbTx):Promise<IdempotencyClaim>{
    const inserted=await tx.query(`INSERT INTO idem_keys(tenant_id,scope,key,request_hash,status) VALUES($1,$2,$3,$4,'processing') ON CONFLICT(tenant_id,scope,key) DO NOTHING`,[input.tenantId,input.scope,input.key,input.requestHash]);
    if(inserted.rowCount)return{state:'new'};
    const q=await tx.query<{requestHash:string;status:string;resourceId:string|null}>(`SELECT request_hash as "requestHash",status,resource_id as "resourceId" FROM idem_keys WHERE tenant_id=$1 AND scope=$2 AND key=$3 FOR UPDATE`,[input.tenantId,input.scope,input.key]);
    const row=q.rows[0];if(!row)throw new AppError('IDEMPOTENCY_STATE_MISSING','تعذر التحقق من تكرار العملية',409);
    if(row.requestHash!==input.requestHash)throw new AppError('IDEMPOTENCY_KEY_REUSED','تم استخدام مفتاح العملية سابقاً مع بيانات مختلفة',409);
    if(row.status==='completed'&&row.resourceId)return{state:'replay',resourceId:row.resourceId};
    throw new AppError('IDEMPOTENCY_IN_PROGRESS','العملية نفسها قيد التنفيذ بالفعل',409);
  }
  async complete(input:{tenantId:string;scope:string;key:string;resourceId:string},tx:DbTx){await tx.query(`UPDATE idem_keys SET status='completed',resource_id=$4,completed_at=now() WHERE tenant_id=$1 AND scope=$2 AND key=$3`,[input.tenantId,input.scope,input.key,input.resourceId]);}
}
