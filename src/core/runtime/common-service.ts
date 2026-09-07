export interface CommonServiceDependencies { readonly crypto: any; }
'use strict';
module.exports=function create_common_service(ctx:CommonServiceDependencies){
 const {
  crypto
 }=ctx;



function sha256(v:any){return crypto.createHash('sha256').update(String(v)).digest('hex')}

function randomToken(){return crypto.randomBytes(32).toString('base64url')}

function serverId(prefix:any){return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`}

async function nextDocumentNumber(c:any,tenantId:any,branchId:any,type:any){const prefix={sale:'S',purchase:'P'}[type];if(!prefix)throw new Error('UNKNOWN_SEQUENCE');const q=await c.query(`INSERT INTO doc_sequences(tenant_id,branch_id,doc_type,next_value) VALUES($1,$2,$3,2) ON CONFLICT(tenant_id,branch_id,doc_type) DO UPDATE SET next_value=doc_sequences.next_value+1 RETURNING next_value-1 AS value`,[tenantId,String(branchId||''),type]);return `${prefix}-${String(Number(q.rows[0].value)).padStart(4,'0')}`}

function nowIso(){return new Date().toISOString()}

function branchOf(v:any){return v?.branchId||v?.branch_id||null}

 return {sha256,randomToken,serverId,nextDocumentNumber,nowIso,branchOf};
};

export {};
