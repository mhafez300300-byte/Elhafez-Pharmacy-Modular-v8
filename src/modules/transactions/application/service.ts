import type { TransactionsServiceDependencies } from '../contracts/dependencies';
'use strict';
module.exports=function create_transactions_service(ctx:TransactionsServiceDependencies){
 const {
  projectRecord
 }=ctx;
 const sanitizeRecord=(...args)=>ctx.sanitizeRecord(...args);
 const branchOf=(...args)=>ctx.branchOf(...args);
 const validateJournalRecord=(...args)=>ctx.validateJournalRecord(...args);
 const putRecord=(...args)=>ctx.putRecord(...args);
 const delRecord=(...args)=>ctx.delRecord(...args);


async function periodLocked(client:any,tenantId:any,date:any=new Date()){const d=date.toISOString().slice(0,10);const q=await client.query(`SELECT 1 FROM accounting_periods WHERE tenant_id=$1 AND status='closed' AND $2::date BETWEEN from_date AND to_date LIMIT 1`,[tenantId,d]);return q.rowCount>0}

async function applySalePutBatch(client:any,tenantId:any,ops:any){
 const prepared=[];
 for(const op of ops){const clean=sanitizeRecord(op.value);if(op.store==='batches'&&Number(clean.qtyBase||0)<-0.000001)throw Object.assign(new Error('NEGATIVE_STOCK'),{status:409});if(op.store==='journal')await validateJournalRecord(client,tenantId,clean);prepared.push({store:op.store,id:op.id,branch_id:branchOf(clean),data:clean,expected:Number(op.expectedRevision??op.value?._serverRevision??0)})}
 if(!prepared.length)return[];
 const q=await client.query(`WITH input AS (
   SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(store text,id text,branch_id text,data jsonb,expected bigint)
 ), updated AS (
   UPDATE records r SET data=i.data,branch_id=i.branch_id,revision=r.revision+1,updated_at=now()
   FROM input i WHERE r.tenant_id=$1 AND r.store=i.store AND r.id=i.id AND i.expected>0 AND r.revision=i.expected
   RETURNING r.store,r.id,r.data,r.revision
 ), inserted AS (
   INSERT INTO records(tenant_id,store,id,branch_id,data,revision)
   SELECT $1,i.store,i.id,i.branch_id,i.data,1 FROM input i WHERE i.expected=0
   ON CONFLICT(tenant_id,store,id) DO NOTHING
   RETURNING store,id,data,revision
 ) SELECT * FROM updated UNION ALL SELECT * FROM inserted`,[tenantId,JSON.stringify(prepared)]);
 const map=new Map(q.rows.map(r=>[`${r.store}:${r.id}`,{...r.data,_serverRevision:Number(r.revision)}]));
 for(const x of prepared){const saved=map.get(`${x.store}:${x.id}`);if(saved)await projectRecord(client,tenantId,x.store,x.id,saved)}
 if(map.size!==prepared.length){const missing=prepared.filter(x=>!map.has(`${x.store}:${x.id}`));const detail=missing[0];const cur=await client.query('SELECT revision FROM records WHERE tenant_id=$1 AND store=$2 AND id=$3',[tenantId,detail.store,detail.id]);throw Object.assign(new Error('REVISION_CONFLICT'),{status:409,currentRevision:Number(cur.rows[0]?.revision||0)})}
 return ops.map(op=>({store:op.store,id:op.id,value:map.get(`${op.store}:${op.id}`)}))
}

async function applyAtomicOp(client:any,tenantId:any,op:any){if(op.op==='put')return putRecord(client,tenantId,op.store,op.id,op.value,op.expectedRevision??op.value?._serverRevision??null);if(op.op==='del')return delRecord(client,tenantId,op.store,op.id,op.expectedRevision??null);throw Object.assign(new Error('BAD_OPERATION'),{status:400})}

 return {periodLocked,applySalePutBatch,applyAtomicOp};
};

export {};
