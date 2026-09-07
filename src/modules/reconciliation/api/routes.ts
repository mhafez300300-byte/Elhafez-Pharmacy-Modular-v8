import type { ReconciliationRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_reconciliation(app:any,ctx:ReconciliationRouteDependencies){
 const {
  pool,
  hasPerm,
  hasAction,
  nowIso,
  needAuth,
  bumpChange,
  auditDb,
  ensureLicenseWritable,
  putRecord,
  buildFinancialReconciliation
 }=ctx;

 // /api/reconciliation/financial
// /api/reconciliation/repair

app.get('/api/reconciliation/financial',needAuth,async(req,res,next)=>{try{
 if(!hasPerm(req.auth.user,'reports')&&!hasPerm(req.auth.user,'accounting')&&!hasPerm(req.auth.user,'purchases'))return res.status(403).json({error:'FORBIDDEN'});
 res.json(await buildFinancialReconciliation(pool,req.auth.tenantId,String(req.query.branchId||'')));
}catch(e){next(e)}});

app.post('/api/reconciliation/repair',needAuth,async(req,res,next)=>{const c=await pool.connect();try{
 if(!['owner','admin','manager'].includes(String(req.auth.user.roleKey||''))&&!hasAction(req.auth.user,'controlledOverride'))return res.status(403).json({error:'RECONCILIATION_REPAIR_FORBIDDEN'});
 const action=String(req.body?.action||''),store=String(req.body?.store||''),id=String(req.body?.id||''),reason=String(req.body?.reason||'').trim().slice(0,1000);if(!action||!id)return res.status(422).json({error:'REPAIR_DATA_REQUIRED'});
 await c.query('BEGIN');await ensureLicenseWritable(c,req.auth.tenantId);
 if(action==='clear_orphan_projection'){
  let q;if(store==='sale_documents_core')q=await c.query(`DELETE FROM sale_documents_core d WHERE d.tenant_id=$1 AND d.id=$2 AND NOT EXISTS(SELECT 1 FROM records r WHERE r.tenant_id=d.tenant_id AND r.store='sales' AND r.id=d.id) AND NOT EXISTS(SELECT 1 FROM records x WHERE x.tenant_id=d.tenant_id AND x.store IN('stockMoves','cashMoves','journal','returns') AND (x.data->>'ref'=d.no OR x.data->>'saleId'=d.id)) RETURNING d.no`,[req.auth.tenantId,id]);else if(store==='purchase_documents_core')q=await c.query(`DELETE FROM purchase_documents_core d WHERE d.tenant_id=$1 AND d.id=$2 AND NOT EXISTS(SELECT 1 FROM records r WHERE r.tenant_id=d.tenant_id AND r.store='purchases' AND r.id=d.id) AND NOT EXISTS(SELECT 1 FROM records x WHERE x.tenant_id=d.tenant_id AND x.store IN('stockMoves','cashMoves','journal') AND x.data->>'ref'=d.no) RETURNING d.no`,[req.auth.tenantId,id]);else throw Object.assign(new Error('UNSUPPORTED_ORPHAN_PROJECTION'),{status:422});if(!q.rowCount)throw Object.assign(new Error('ORPHAN_REPAIR_NOT_SAFE'),{status:409});await auditDb(c,req.auth.tenantId,req,'Reconciliation: إزالة Projection يتيم',`${store} • ${id}${reason?` • ${reason}`:''}`,id,{action,store,id,result:'success',branchId:req.body?.branchId||null});
 }else if(action==='quarantine'){
  if(!['sales','purchases','returns','batches'].includes(store))throw Object.assign(new Error('QUARANTINE_STORE_NOT_ALLOWED'),{status:422});const row=(await c.query(`SELECT data,revision FROM records WHERE tenant_id=$1 AND store=$2 AND id=$3 FOR UPDATE`,[req.auth.tenantId,store,id])).rows[0];if(!row)throw Object.assign(new Error('REPAIR_ENTITY_NOT_FOUND'),{status:404});const before=row.data||{},after={...before,integrityStatus:'quarantine',integrityReason:reason||'تم العزل بواسطة Reconciliation للمراجعة',integrityQuarantinedAt:nowIso(),integrityQuarantinedBy:req.auth.user.name};await putRecord(c,req.auth.tenantId,store,id,after,Number(row.revision));await auditDb(c,req.auth.tenantId,req,'Reconciliation: عزل للمراجعة',`${store} • ${before.no||id} • ${after.integrityReason}`,id,{action,store,id,result:'success',before:{integrityStatus:before.integrityStatus||null},after:{integrityStatus:'quarantine'},branchId:before.branchId||null});
 }else throw Object.assign(new Error('UNKNOWN_REPAIR_ACTION'),{status:422});
 await bumpChange(c);await c.query('COMMIT');res.json({ok:true,action,store,id});
 }catch(e){await c.query('ROLLBACK').catch(()=>{});next(e)}finally{c.release()}});
};

export {};
