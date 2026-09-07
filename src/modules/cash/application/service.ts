import type { CashServiceDependencies } from '../contracts/dependencies';
'use strict';
module.exports=function create_cash_service(ctx:CashServiceDependencies){
 const { Finance }=ctx;
 const sanitizeRecord=(...args)=>ctx.sanitizeRecord(...args);
 const nowIso=(...args)=>ctx.nowIso(...args);


async function currentDeviceContext(client:any,req:any){const device=String(req.headers['x-device-id']||'');return (await client.query('SELECT branch_id,cashbox_id FROM user_contexts WHERE tenant_id=$1 AND user_id=$2 AND device_id=$3',[req.auth.tenantId,req.auth.user.id,device])).rows[0]||{}}

async function currentOpenShiftForPayment(client:any,req:any,ctx:any,method:any){if(method==='bank')return null;const branchId=String(ctx.branch_id||''),cashboxId=String(ctx.cashbox_id||'cash_main');if(!branchId)throw Object.assign(new Error('PAYMENT_BRANCH_CONTEXT_REQUIRED'),{status:409});const q=await client.query(`SELECT id,data FROM records WHERE tenant_id=$1 AND store='shifts' AND COALESCE(data->>'status','')='open' AND COALESCE(data->>'userId','')=$2 AND COALESCE(data->>'branchId','')=$3 AND COALESCE(data->>'cashboxId','cash_main')=$4 ORDER BY created_at DESC LIMIT 2 FOR UPDATE`,[req.auth.tenantId,req.auth.user.id,branchId,cashboxId]);if(!q.rowCount)throw Object.assign(new Error('SHIFT_REQUIRED'),{status:409});if(q.rowCount>1)throw Object.assign(new Error('MULTIPLE_OPEN_SHIFTS'),{status:409});return{id:q.rows[0].id,data:q.rows[0].data||{}}}

async function validateOperationalCashMoveShifts(client:any,tenantId:any,user:any,operations:any){const moves=operations.filter(o=>o.op==='put'&&o.store==='cashMoves').map(o=>o.value||{});if(!moves.length)return;const settings=(await client.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='settings' ORDER BY created_at LIMIT 1`,[tenantId])).rows[0]?.data||{};if(settings.requireOpenShift===false)return;const relevant=moves.filter(m=>String(m.method||'cash')!=='bank');if(!relevant.length)return;const ids=[...new Set(relevant.map(m=>String(m.shiftId||'')).filter(Boolean))];if(relevant.some(m=>!String(m.shiftId||'')))throw Object.assign(new Error('CASH_MOVE_SHIFT_REQUIRED'),{status:409});const rows=ids.length?(await client.query(`SELECT id,data FROM records WHERE tenant_id=$1 AND store='shifts' AND id=ANY($2::text[]) FOR UPDATE`,[tenantId,ids])).rows:[];const map=new Map<string,any>(rows.map(r=>[String(r.id),r.data||{}]));for(const m of relevant){const id=String(m.shiftId),sh=map.get(id);if(!sh||String(sh.status||'')!=='open')throw Object.assign(new Error('CASH_MOVE_SHIFT_NOT_OPEN'),{status:409,details:{shiftId:id,ref:m.ref||null}});if(String(sh.userId||'')!==String(user?.id||''))throw Object.assign(new Error('CASH_MOVE_SHIFT_USER_MISMATCH'),{status:403});if(m.branchId&&sh.branchId&&String(m.branchId)!==String(sh.branchId))throw Object.assign(new Error('CASH_MOVE_SHIFT_BRANCH_MISMATCH'),{status:409});if(m.cashboxId&&sh.cashboxId&&String(m.cashboxId)!==String(sh.cashboxId))throw Object.assign(new Error('CASH_MOVE_SHIFT_CASHBOX_MISMATCH'),{status:409});m.branchId=sh.branchId||m.branchId||null;m.cashboxId=sh.cashboxId||m.cashboxId||'cash_main'}}


async function prepareShiftCommercial(c:any,tenantId:any,user:any,operations:any){
 const shiftOps=operations.filter(o=>o.op==='put'&&o.store==='shifts');if(!shiftOps.length)return;
 for(const op of shiftOps){const incoming=sanitizeRecord(op.value||{}),shiftId=String(op.id||incoming.id||'');if(!shiftId)throw Object.assign(new Error('SHIFT_ID_REQUIRED'),{status:422});
   const branchId=String(incoming.branchId||''),cashboxId=String(incoming.cashboxId||'cash_main'),requestedUserId=String(incoming.userId||''),authUserId=String(user?.id||''),userId=authUserId;
   if(!branchId||!cashboxId||!userId)throw Object.assign(new Error('SHIFT_CONTEXT_REQUIRED'),{status:422});
   const row=(await c.query(`SELECT data,revision FROM records WHERE tenant_id=$1 AND store='shifts' AND id=$2 FOR UPDATE`,[tenantId,shiftId])).rows[0]||null;
   if(!row){
     if(String(incoming.status||'open')!=='open')throw Object.assign(new Error('SHIFT_OPEN_REQUIRED'),{status:422});
     const opening=Number(incoming.openingCash||0);if(!Number.isFinite(opening)||opening<0)throw Object.assign(new Error('SHIFT_OPENING_CASH_INVALID'),{status:422});
     await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${tenantId}|shift|${branchId}|${cashboxId}|${userId}`]);
     const q=await c.query(`SELECT id FROM records WHERE tenant_id=$1 AND store='shifts' AND COALESCE(data->>'status','')='open' AND COALESCE(data->>'branchId','')=$2 AND COALESCE(data->>'cashboxId','cash_main')=$3 AND COALESCE(data->>'userId','')=$4 ORDER BY created_at DESC`,[tenantId,branchId,cashboxId,userId]);
     if(q.rowCount>1)throw Object.assign(new Error('MULTIPLE_OPEN_SHIFTS'),{status:409,details:{existingIds:q.rows.map(x=>x.id)}});if(q.rowCount===1)throw Object.assign(new Error('SHIFT_ALREADY_OPEN'),{status:409,details:{existingId:q.rows[0].id}});
     op.value={...incoming,id:shiftId,userId,userName:incoming.userName||user?.name||'',branchId,cashboxId,openingCash:Finance.money(opening),openedAt:incoming.openedAt||nowIso(),status:'open'};if(!operations.some(x=>x.op==='put'&&x.store==='audit'&&String(x.value?.action||'')==='فتح وردية'))operations.push({op:'put',store:'audit',id:`aud_shift_${shiftId}`,value:{id:`aud_shift_${shiftId}`,at:nowIso(),userId,userName:user?.name||incoming.userName||'',action:'فتح وردية',detail:`${shiftId} • افتتاحي ${Finance.money(opening)}`,entityId:shiftId,branchId}});continue;
   }
   const current=row.data||{};if(String(current.status||'')!=='open')throw Object.assign(new Error('SHIFT_ALREADY_CLOSED'),{status:409});
   const closingOther=String(current.userId||'')!==authUserId;if(closingOther&&!['owner','admin','manager'].includes(String(user?.roleKey||'')))throw Object.assign(new Error('SHIFT_USER_MISMATCH'),{status:403});if(String(current.branchId||'')!==branchId||String(current.cashboxId||'cash_main')!==cashboxId)throw Object.assign(new Error('SHIFT_CONTEXT_MISMATCH'),{status:409});
   if(String(incoming.status||'')!=='closed')throw Object.assign(new Error('SHIFT_STATUS_INVALID'),{status:422});
   const mq=await c.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='cashMoves' AND data->>'shiftId'=$2`,[tenantId,shiftId]);
   const net=method=>Finance.money(mq.rows.filter(r=>String(r.data?.method||'cash')===method).reduce((a,r)=>a+(String(r.data?.direction||'in')==='in'?Number(r.data?.amount||0):-Number(r.data?.amount||0)),0));
   const expectedCash=Finance.money(Number(current.openingCash||0)+net('cash')),expectedCard=net('card'),expectedWallet=net('wallet'),expectedBank=net('bank');
   const actualCash=Number(incoming.actualCash),actualCard=Number(incoming.actualCard??expectedCard),actualWallet=Number(incoming.actualWallet??expectedWallet),actualBank=Number(incoming.actualBank??expectedBank);
   if([actualCash,actualCard,actualWallet,actualBank].some(x=>!Number.isFinite(x)||x<0))throw Object.assign(new Error('SHIFT_ACTUAL_TOTAL_INVALID'),{status:422});
   const sq=await c.query(`SELECT count(*)::int AS n FROM records WHERE tenant_id=$1 AND store='sales' AND data->>'shiftId'=$2`,[tenantId,shiftId]);
   op.value={...current,_serverRevision:incoming._serverRevision,id:shiftId,expectedCash,actualCash:Finance.money(actualCash),difference:Finance.money(actualCash-expectedCash),expectedCard,actualCard:Finance.money(actualCard),cardDifference:Finance.money(actualCard-expectedCard),expectedWallet,actualWallet:Finance.money(actualWallet),walletDifference:Finance.money(actualWallet-expectedWallet),expectedBank,actualBank:Finance.money(actualBank),bankDifference:Finance.money(actualBank-expectedBank),closedAt:incoming.closedAt||nowIso(),closeNote:String(incoming.closeNote||''),status:'closed',salesCount:Number(sq.rows[0]?.n||0)};
 }
}



async function prepareExpenseCommercial(c:any,tenantId:any,user:any,operations:any){
 const expenseOps=operations.filter(o=>o.op==='put'&&o.store==='expenses');if(!expenseOps.length)return;
 const cashOps=operations.filter(o=>o.op==='put'&&o.store==='cashMoves'),journalOps=operations.filter(o=>o.op==='put'&&o.store==='journal');if(cashOps.length!==expenseOps.length||journalOps.length!==expenseOps.length)throw Object.assign(new Error('EXPENSE_FINANCIAL_BUNDLE_REQUIRED'),{status:409});
 for(const op of expenseOps){const raw=sanitizeRecord(op.value||{}),amount=Finance.money(raw.amount),method=String(raw.method||'cash');if(!(amount>0)||!['cash','bank','wallet','card'].includes(method)||!String(raw.category||'').trim())throw Object.assign(new Error('EXPENSE_DATA_INVALID'),{status:422});const ref=String(raw.id||op.id||'');if(!ref)throw Object.assign(new Error('EXPENSE_ID_REQUIRED'),{status:422});raw.id=ref;raw.amount=amount;raw.method=method;raw.userId=user?.id||null;raw.userName=user?.name||'';raw.at=raw.at||nowIso();op.value=raw;
  const cash=cashOps.find(x=>String(x.value?.ref||'')===ref);if(!cash)throw Object.assign(new Error('EXPENSE_CASH_MOVE_REQUIRED'),{status:409});cash.value={...cash.value,type:'expense',amount,ref,note:String(raw.note||raw.category||''),method,direction:'out',branchId:raw.branchId||cash.value?.branchId||null};
  const journal=journalOps.find(x=>String(x.value?.ref||'')===ref&&String(x.value?.type||'')==='expense');if(!journal)throw Object.assign(new Error('EXPENSE_JOURNAL_REQUIRED'),{status:409});const payCode=Finance.accountForPayment(method);journal.value.lines=[{accountCode:'6000',account:`مصروف - ${String(raw.category).slice(0,120)}`,debit:amount,credit:0},{accountCode:payCode,account:payCode==='1000'?'الخزينة':payCode==='1010'?'البنك':'وسائل دفع',debit:0,credit:amount}];journal.value.debit=amount;journal.value.credit=amount;journal.value.balanced=true;journal.value.ref=ref;journal.value.type='expense';
 }
 for(const cash of cashOps)if(!expenseOps.some(o=>String(o.value?.id||o.id||'')===String(cash.value?.ref||'')))throw Object.assign(new Error('EXPENSE_EXTRA_CASH_MOVE'),{status:409});for(const journal of journalOps)if(!expenseOps.some(o=>String(o.value?.id||o.id||'')===String(journal.value?.ref||'')))throw Object.assign(new Error('EXPENSE_EXTRA_JOURNAL'),{status:409});
}

 return {prepareShiftCommercial,prepareExpenseCommercial,currentDeviceContext,currentOpenShiftForPayment,validateOperationalCashMoveShifts};
};

export {};
