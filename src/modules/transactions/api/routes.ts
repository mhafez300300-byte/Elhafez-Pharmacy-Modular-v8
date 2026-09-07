import type { TransactionsRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_transactions(app:any,ctx:TransactionsRouteDependencies){
 const {
  pool,
  STORES,
  POSTED_IMMUTABLE_STORES,
  INTENT_STORES,
  validateFinancialBundle,
  coalesceAtomicOperations,
  operationDates,
  serverId,
  hasPerm,
  hasAction,
  canWriteStore,
  sanitizeRecord,
  redactRecordForUser,
  prepareSaleCommercial,
  prepareInventoryCommercial,
  prepareInsuranceClaimsCommercial,
  prepareShiftCommercial,
  prepareExpenseCommercial,
  preparePurchaseCommercial,
  prepareSupplierReturnCommercial,
  prepareReturnCommercial,
  nowIso,
  needAuth,
  bumpChange,
  auditDb,
  ensureLicenseWritable,
  licenseFeature,
  periodLocked,
  applySalePutBatch,
  applyAtomicOp,
  validateOperationalCashMoveShifts
 }=ctx;

 // /api/atomic

app.post('/api/atomic',needAuth,async(req,res,next)=>{const {intent='sync'}=req.body||{},operations=coalesceAtomicOperations(req.body?.operations||[]),idempotencyKey=String(req.headers['x-idempotency-key']||req.body?.idempotencyKey||'').trim().slice(0,160);const allowed=INTENT_STORES[intent];if(!allowed)return res.status(400).json({error:'UNKNOWN_INTENT'});const need=intent==='sale'||intent==='sale_return'?'pos':intent==='purchase'?'purchases':intent==='supplier_return'?'supplier_returns':null;if(need&&!hasPerm(req.auth.user,need)&&!hasPerm(req.auth.user,need==='supplier_returns'?'supplier_return':need))return res.status(403).json({error:'FORBIDDEN'});if(intent==='sale_return'&&!hasAction(req.auth.user,'returns'))return res.status(403).json({error:'RETURN_PERMISSION_REQUIRED'});if(intent==='sync'){const moves=operations.filter(o=>o.op==='put'&&o.store==='stockMoves').map(o=>o.value||{});if(moves.some(m=>['adjustment','count_adjustment','opening','opening_import','cost_adjustment'].includes(String(m.type||'')))&&!hasAction(req.auth.user,'stockAdjust'))return res.status(403).json({error:'STOCK_ADJUST_PERMISSION_REQUIRED'});if(moves.some(m=>['waste','disposal'].includes(String(m.type||'')))&&!hasAction(req.auth.user,'wasteDisposal'))return res.status(403).json({error:'WASTE_PERMISSION_REQUIRED'})}if(!Array.isArray(operations)||operations.length>5000)return res.status(400).json({error:'INVALID_OPERATIONS'});for(const o of operations){if(!STORES.has(o.store)||!allowed.has(o.store))return res.status(403).json({error:'STORE_NOT_ALLOWED',store:o.store});if(o.op==='del'&&POSTED_IMMUTABLE_STORES.has(o.store))return res.status(405).json({error:'POSTED_DOCUMENT_IMMUTABLE',store:o.store});if(o.op==='del'&&['products','customers','suppliers','branches','cashboxes'].includes(o.store))return res.status(409).json({error:'MASTER_DELETE_REQUIRES_VALIDATED_ENDPOINT',store:o.store})}if(intent==='sync'){const ss=new Set(operations.map(o=>o.store).filter(x=>x!=='audit')),subset=a=>[...ss].every(x=>a.has(x));const patterns=[[new Set(['customers','customerPayments','cashMoves','journal']),'customers'],[new Set(['suppliers','supplierPayments','cashMoves','journal']),'suppliers'],[new Set(['expenses','cashMoves','journal']),'expenses'],[new Set(['shifts','attendance']),'cash'],[new Set(['batches','stockMoves','transfers']),'transfers'],[new Set(['batches','stockMoves','journal']),'inventory'],[new Set(['batches','stockMoves','journal','counts']),'inventory'],[new Set(['batches','stockMoves','journal','returns']),'inventory'],[new Set(['claims','cashMoves','journal']),'contracts'],[new Set(['journal']),'accounting'],[new Set(['products','batches','stockMoves','journal','priceHistory','importRuns']),'products'],[new Set(['products','priceHistory','priceUpdates']),'price_center'],[new Set(['orders']),'orders']];const patternOk=patterns.some(([set,perm])=>subset(set)&&hasPerm(req.auth.user,perm));if(!patternOk)for(const st of ss)if(!canWriteStore(req.auth.user,st))return res.status(403).json({error:'FORBIDDEN',store:st});if(ss.has('sales')||ss.has('purchases')||ss.has('supplierReturns'))return res.status(409).json({error:'DEDICATED_INTENT_REQUIRED'});if(ss.has('returns')&&!ss.has('batches'))return res.status(409).json({error:'DEDICATED_INTENT_REQUIRED'})}const financial=['sale','sale_return','purchase','supplier_return'].includes(intent)||operations.some(o=>['journal','cashMoves','expenses','customerPayments','supplierPayments'].includes(o.store));const c=await pool.connect();try{await c.query('BEGIN');await ensureLicenseWritable(c,req.auth.tenantId);if(idempotencyKey){if(!/^[A-Za-z0-9._:-]{8,160}$/.test(idempotencyKey))throw Object.assign(new Error('INVALID_IDEMPOTENCY_KEY'),{status:400});await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${req.auth.tenantId}|atomic|${idempotencyKey}`]);const prior=(await c.query('SELECT intent,response FROM atomic_requests WHERE tenant_id=$1 AND idempotency_key=$2',[req.auth.tenantId,idempotencyKey])).rows[0];if(prior){if(String(prior.intent)!==String(intent))throw Object.assign(new Error('IDEMPOTENCY_INTENT_MISMATCH'),{status:409});await c.query('COMMIT');return res.json({...prior.response,idempotentReplay:true})}}
 if(intent==='sale')await prepareSaleCommercial(c,req.auth.tenantId,req.auth.user,operations);
 if(intent==='sale_return')await prepareReturnCommercial(c,req.auth.tenantId,req.auth.user,operations);
 if(intent==='purchase')await preparePurchaseCommercial(c,req.auth.tenantId,req.auth.user,operations);
 if(intent==='supplier_return')await prepareSupplierReturnCommercial(c,req.auth.tenantId,operations);
 if(['sale','sale_return','purchase','supplier_return'].includes(intent))validateFinancialBundle(intent,operations);
 if(intent==='sync'){await prepareInsuranceClaimsCommercial(c,req.auth.tenantId,operations);await prepareShiftCommercial(c,req.auth.tenantId,req.auth.user,operations);await prepareInventoryCommercial(c,req.auth.tenantId,operations);await prepareExpenseCommercial(c,req.auth.tenantId,req.auth.user,operations);}
 if(operations.some(o=>o.op==='put'&&o.store==='cashMoves'))await validateOperationalCashMoveShifts(c,req.auth.tenantId,req.auth.user,operations);
 if(intent==='sale'){
   const saleOp=operations.filter(o=>o.op==='put'&&o.store==='sales').at(-1),sale=sanitizeRecord(saleOp?.value||{});
   const settings=(await c.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='settings' ORDER BY created_at LIMIT 1`,[req.auth.tenantId])).rows[0]?.data||{};
   if(settings.requireOpenShift!==false){
     if(!sale.shiftId)throw Object.assign(new Error('SHIFT_REQUIRED'),{status:409});
     const qr=await c.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='shifts' AND id=$2 LIMIT 1`,[req.auth.tenantId,String(sale.shiftId)]);
     const sh=qr.rows[0]?.data;
     if(!sh||sh.status!=='open')throw Object.assign(new Error('SHIFT_NOT_OPEN'),{status:409});
     if(String(sh.userId||'')!==String(req.auth.user.id||''))throw Object.assign(new Error('SHIFT_USER_MISMATCH'),{status:403});
     if(sale.branchId&&sh.branchId&&String(sh.branchId)!==String(sale.branchId))throw Object.assign(new Error('SHIFT_BRANCH_MISMATCH'),{status:409});
     const saleCash=operations.filter(o=>o.op==='put'&&o.store==='cashMoves'&&String(o.value?.type||'')==='sale'&&String(o.value?.ref||'')===String(sale.no||''));
     if(saleCash.some(o=>String(o.value?.shiftId||'')!==String(sale.shiftId||'')))throw Object.assign(new Error('SALE_CASH_SHIFT_MISMATCH'),{status:409});
   }
 }
 if(financial){for(const d of operationDates(operations))if(await periodLocked(c,req.auth.tenantId,d))throw Object.assign(new Error('ACCOUNTING_PERIOD_CLOSED'),{status:409})}const criticalAudit={sale:'بيع',purchase:'استلام فاتورة مشتريات',sale_return:'مرتجع بيع',supplier_return:'مرتجع مورد'}[intent];if(criticalAudit&&!operations.some(o=>o.op==='put'&&o.store==='audit')){const doc=operations.find(o=>o.op==='put'&&(['sale','sale_return'].includes(intent)?['sales','returns']:intent==='purchase'?['purchases']:['supplierReturns']).includes(o.store))?.value||{};operations.push({op:'put',store:'audit',id:serverId('aud'),value:{action:criticalAudit,entity:intent,entityId:doc.id||null,ref:doc.id||doc.no||null,at:nowIso(),userId:req.auth.user.id,userName:req.auth.user.name,branchId:doc.branchId||null,result:'success',detail:`${criticalAudit} ${doc.no||doc.saleNo||doc.id||''}`}})}if(intent==='sync'&&!operations.some(o=>o.op==='put'&&o.store==='audit')){const shift=operations.find(o=>o.op==='put'&&o.store==='shifts')?.value,mv=operations.find(o=>o.op==='put'&&o.store==='stockMoves'&&['opening','opening_import'].includes(String(o.value?.type||'')))?.value;if(shift||mv){const x=shift||mv;operations.push({op:'put',store:'audit',id:serverId('aud'),value:{action:shift?(String(shift.status)==='closed'?'إغلاق وردية':'فتح وردية'):'رصيد افتتاحي',entity:shift?'shift':'stock',entityId:x.id||x.batchId||null,ref:x.id||x.ref||null,at:nowIso(),userId:req.auth.user.id,userName:req.auth.user.name,branchId:x.branchId||null,result:'success',detail:shift?`وردية ${x.id||''}`:`رصيد افتتاحي ${x.ref||x.batchId||''}`}})}}const results=[];const auditOps=operations.filter(op=>op.store==='audit'&&op.op==='put'),recordOps=operations.filter(op=>!(op.store==='audit'&&op.op==='put'));
 if((intent==='sale'||intent==='sale_return')&&recordOps.every(op=>op.op==='put'))results.push(...await applySalePutBatch(c,req.auth.tenantId,recordOps));else for(const op of recordOps)results.push({store:op.store,id:op.id,value:await applyAtomicOp(c,req.auth.tenantId,op)});
 for(const op of auditOps){await auditDb(c,req.auth.tenantId,req,op.value?.action||intent,op.value?.detail||'',op.value?.ref||null,op.value);results.push({store:'audit',id:op.id})}
 const saleOp=operations.filter(o=>o.op==='put'&&o.store==='sales').at(-1);if(saleOp){const sale=sanitizeRecord(saleOp.value),settings=(await c.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='settings' ORDER BY created_at LIMIT 1`,[req.auth.tenantId])).rows[0]?.data||{};if((String(settings.taxIntegrationMode||'disabled')!=='disabled'||String(process.env.ETA_ENABLED).toLowerCase()==='true')&&await licenseFeature(c,req.auth.tenantId,'eta')){await c.query(`INSERT INTO integration_outbox(tenant_id,kind,ref,payload) VALUES($1,$2,$3,$4::jsonb)`,[req.auth.tenantId,intent==='sale_return'?'eta_return':'eta_receipt',sale.no||sale.id,JSON.stringify({sale,settings})])}
   const pids=[...new Set((sale.lines||[]).map(x=>x.productId).filter(Boolean))];if(pids.length){const q=await c.query(`SELECT id,data FROM records WHERE tenant_id=$1 AND store='products' AND id=ANY($2::text[])`,[req.auth.tenantId,pids]);const cd=sale.complianceData||{},rx=q.rows.filter(r=>r.data.rx===true||String(r.data.rx).toLowerCase()==='true'),ctrl=new Map(q.rows.filter(r=>['controlled','restricted'].includes(r.data.controlClass)).map(r=>[r.id,r.data]));if(rx.length&&!String(cd.prescriptionNo||'').trim())throw Object.assign(new Error('RX_PRESCRIPTION_REQUIRED'),{status:422,details:{products:rx.map(r=>r.data.name||r.id)}});if(ctrl.size){if(!cd.patientName||!cd.prescriptionNo)throw Object.assign(new Error('CONTROLLED_DRUG_DOCUMENT_REQUIRED'),{status:422});for(const line of sale.lines||[]){if(!ctrl.has(line.productId))continue;for(const a of line.allocations||[]){await c.query(`INSERT INTO controlled_dispenses(tenant_id,sale_id,sale_no,product_id,product_name,batch_id,batch_no,serial_code,qty_base,patient_name,patient_id_no,prescription_no,prescription_date,doctor_name,doctor_license_no,compliance_document,user_id,user_name,branch_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,[req.auth.tenantId,sale.id,sale.no,line.productId,line.name,a.batchId,a.batchNo,(Array.isArray(cd.serialCodes)?cd.serialCodes.join('\n'):(cd.serials||{})[line.productId])||null,Number(a.qtyBase||0),cd.patientName,cd.patientIdNo||null,cd.prescriptionNo,cd.prescriptionDate||null,cd.doctorName||null,cd.doctorLicenseNo||null,cd.complianceDocument||null,req.auth.user.id,req.auth.user.name,sale.branchId||null])}}}}
 }
 if(['sale','sale_return','purchase','supplier_return'].includes(intent)&&String(process.env.EPTTS_ENABLED).toLowerCase()==='true'&&await licenseFeature(c,req.auth.tenantId,'eptts')){await c.query(`INSERT INTO integration_outbox(tenant_id,kind,ref,payload) VALUES($1,'eptts_event',$2,$3::jsonb)`,[req.auth.tenantId,intent,JSON.stringify({intent,operations:operations.filter(o=>['serialItems','trackEvents','sales','purchases','supplierReturns'].includes(o.store)).map(o=>({store:o.store,id:o.id,value:sanitizeRecord(o.value)}))})])}
 const response={ok:true,results:results.map(r=>r.value?{...r,value:redactRecordForUser(r.store,r.value,req.auth.user)}:r)};if(idempotencyKey)await c.query('INSERT INTO atomic_requests(tenant_id,idempotency_key,intent,response) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(tenant_id,idempotency_key) DO NOTHING',[req.auth.tenantId,idempotencyKey,intent,JSON.stringify(response)]);await bumpChange(c);await c.query('COMMIT');res.json(response)}catch(e){await c.query('ROLLBACK');if(['sale','sale_return','purchase','supplier_return'].includes(intent)){const doc=operations.find(o=>o.op==='put'&&['sales','returns','purchases','supplierReturns'].includes(o.store))?.value||{};await pool.query(`INSERT INTO audit_logs(tenant_id,branch_id,user_id,user_name,device_id,action,detail,ref,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,[req.auth.tenantId,doc.branchId||null,req.auth.user.id,req.auth.user.name,req.headers['x-device-id']||null,`${intent}: rollback`,String(e.message||'ATOMIC_FAILED').slice(0,500),doc.id||doc.no||null,JSON.stringify({entity:intent,entityId:doc.id||null,result:'failed',failureReason:String(e.message||'ATOMIC_FAILED'),details:e.details||null,idempotencyKey:idempotencyKey||null})]).catch(()=>{})}next(e)}finally{c.release()}});
};

export {};
