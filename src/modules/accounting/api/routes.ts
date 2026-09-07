import type { AccountingRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_accounting(app:any,ctx:AccountingRouteDependencies){
 const {
  pool,
  Finance,
  validatePeriodRange,
  accountCode,
  serverId,
  hasPerm,
  needAction,
  nowIso,
  needAuth,
  needPerm,
  bumpChange,
  auditDb,
  ensureLicenseWritable,
  getRecord,
  putRecord,
  periodLocked,
  accountingRows,
  currentDeviceContext,
  currentOpenShiftForPayment,
  paymentAccount
 }=ctx;

 // /api/accounting/tax-reconciliation
// /api/accounting/chart
// /api/accounting/trial-balance
// /api/accounting/pnl
// /api/accounting/balance-sheet
// /api/accounting/tax-summary
// /api/accounting/cash-flow
// /api/accounting/aging
// /api/accounting/supplier-payment
// /api/accounting/customer-payment
// /api/accounting/periods/close
// /api/accounting/periods/reopen

app.get('/api/accounting/tax-reconciliation',needAuth,needPerm('accounting'),async(req,res,next)=>{try{
 const from=req.query.from||null,to=req.query.to||null,branch=String(req.query.branchId||''),args=[req.auth.tenantId,branch,from,to];
 const docs=(await pool.query(`SELECT COALESCE(SUM(tax_total),0)::numeric output_vat FROM sale_documents_core d WHERE d.tenant_id=$1 AND EXISTS(SELECT 1 FROM records ar WHERE ar.tenant_id=d.tenant_id AND ar.store='sales' AND ar.id=d.id AND COALESCE(ar.data->>'integrityStatus','')<>'quarantine') AND ($2='' OR d.branch_id IS NULL OR d.branch_id=$2) AND ($3::date IS NULL OR at::date >= $3::date) AND ($4::date IS NULL OR at::date <= $4::date)`,args)).rows[0],saleReturns=(await pool.query(`SELECT COALESCE(SUM(COALESCE(NULLIF(data->>'tax','')::numeric,0)),0)::numeric tax FROM records WHERE tenant_id=$1 AND store='returns' AND COALESCE(data->>'type','')='sale_return' AND ($2='' OR COALESCE(data->>'branchId','')=$2) AND ($3::date IS NULL OR COALESCE((data->>'at')::timestamptz,created_at)::date >= $3::date) AND ($4::date IS NULL OR COALESCE((data->>'at')::timestamptz,created_at)::date <= $4::date)`,args)).rows[0];
 const pur=(await pool.query(`SELECT COALESCE(SUM(tax_total),0)::numeric input_vat FROM purchase_documents_core d WHERE d.tenant_id=$1 AND EXISTS(SELECT 1 FROM records ar WHERE ar.tenant_id=d.tenant_id AND ar.store='purchases' AND ar.id=d.id AND COALESCE(ar.data->>'integrityStatus','')<>'quarantine') AND ($2='' OR d.branch_id IS NULL OR d.branch_id=$2) AND ($3::date IS NULL OR at::date >= $3::date) AND ($4::date IS NULL OR at::date <= $4::date)`,args)).rows[0],supplierReturns=(await pool.query(`SELECT COALESCE(SUM(COALESCE(NULLIF(data->>'taxAmount','')::numeric,0)),0)::numeric tax FROM records WHERE tenant_id=$1 AND store='supplierReturns' AND ($2='' OR COALESCE(data->>'branchId','')=$2) AND ($3::date IS NULL OR COALESCE((data->>'at')::timestamptz,created_at)::date >= $3::date) AND ($4::date IS NULL OR COALESCE((data->>'at')::timestamptz,created_at)::date <= $4::date)`,args)).rows[0];
 const rows=await accountingRows(req.auth.tenantId,from,to,branch),out=rows.find(r=>r.code==='2100'),inp=rows.find(r=>r.code==='1210'),ledgerOutput=Finance.money(Number(out?.credit||0)-Number(out?.debit||0)),ledgerInput=Finance.money(Number(inp?.debit||0)-Number(inp?.credit||0)),docOutput=Finance.money(Number(docs?.output_vat||0)-Number(saleReturns?.tax||0)),docInput=Finance.money(Number(pur?.input_vat||0)-Number(supplierReturns?.tax||0));
 const outputDifference=Finance.money(ledgerOutput-docOutput),inputDifference=Finance.money(ledgerInput-docInput);res.json({from,to,documents:{outputVat:docOutput,inputVat:docInput},ledger:{outputVat:ledgerOutput,inputVat:ledgerInput},outputDifference,inputDifference,balanced:Math.abs(outputDifference)<0.01&&Math.abs(inputDifference)<0.01})
}catch(e){next(e)}});

app.get('/api/accounting/chart',needAuth,needPerm('accounting'),async(req,res)=>{const q=await pool.query('SELECT code,name,type,parent_code,active FROM chart_accounts WHERE tenant_id=$1 ORDER BY code',[req.auth.tenantId]);res.json(q.rows)});

app.get('/api/accounting/trial-balance',needAuth,needPerm('accounting'),async(req,res)=>{const rows=await accountingRows(req.auth.tenantId,req.query.from,req.query.to,req.query.branchId||'');const out=rows.map(r=>({...r,balance:Finance.money(r.debit-r.credit)}));res.json({from:req.query.from||null,to:req.query.to||null,rows:out,totalDebit:Finance.money(rows.reduce((a,r)=>a+r.debit,0)),totalCredit:Finance.money(rows.reduce((a,r)=>a+r.credit,0))})});

app.get('/api/accounting/pnl',needAuth,needPerm('accounting'),async(req,res)=>{const rows=await accountingRows(req.auth.tenantId,req.query.from,req.query.to,req.query.branchId||'');let revenue=0,cogs=0,expenses=0;for(const r of rows){if(r.type==='revenue')revenue+=r.credit-r.debit;else if(r.type==='cogs')cogs+=r.debit-r.credit;else if(r.type==='expense')expenses+=r.debit-r.credit}revenue=Finance.money(revenue);cogs=Finance.money(cogs);expenses=Finance.money(expenses);res.json({from:req.query.from||null,to:req.query.to||null,revenue,cogs,expenses,grossProfit:Finance.money(revenue-cogs),netProfit:Finance.money(revenue-cogs-expenses),accounts:rows})});

app.get('/api/accounting/balance-sheet',needAuth,needPerm('accounting'),async(req,res)=>{const rows=await accountingRows(req.auth.tenantId,null,req.query.at,req.query.branchId||'');const groups={assets:[],liabilities:[],equity:[]};let currentEarnings=0;for(const r of rows){if(r.type==='asset')groups.assets.push({...r,balance:Finance.money(r.debit-r.credit)});else if(r.type==='liability')groups.liabilities.push({...r,balance:Finance.money(r.credit-r.debit)});else if(r.type==='equity')groups.equity.push({...r,balance:Finance.money(r.credit-r.debit)});else if(r.type==='revenue')currentEarnings+=r.credit-r.debit;else if(r.type==='cogs'||r.type==='expense')currentEarnings-=r.debit-r.credit}currentEarnings=Finance.money(currentEarnings);if(Math.abs(currentEarnings)>.0001)groups.equity.push({code:'CURRENT_EARNINGS',name:'نتيجة النشاط حتى التاريخ',type:'equity',debit:0,credit:0,balance:currentEarnings,virtual:true});const total=k=>Finance.money(groups[k].reduce((a,r)=>a+r.balance,0)),totalAssets=total('assets'),totalLiabilities=total('liabilities'),totalEquity=total('equity');res.json({asOf:req.query.at||new Date().toISOString().slice(0,10),...groups,currentEarnings,totalAssets,totalLiabilities,totalEquity,balanceDifference:Finance.money(totalAssets-totalLiabilities-totalEquity)})});

app.get('/api/accounting/tax-summary',needAuth,needPerm('accounting'),async(req,res)=>{const rows=await accountingRows(req.auth.tenantId,req.query.from||null,req.query.to||null,req.query.branchId||''),out=rows.find(r=>r.code==='2100'),inp=rows.find(r=>r.code==='1210'),outputVat=Finance.money(Number(out?.credit||0)-Number(out?.debit||0)),inputVat=Finance.money(Number(inp?.debit||0)-Number(inp?.credit||0));res.json({from:req.query.from||null,to:req.query.to||null,outputVat,inputVat,netVat:Finance.money(outputVat-inputVat)})});

app.get('/api/accounting/cash-flow',needAuth,needPerm('accounting'),async(req,res)=>{const from=req.query.from||null,to=req.query.to||null,branchId=String(req.query.branchId||''),q=await pool.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='cashMoves' AND ($2::date IS NULL OR COALESCE((data->>'at')::timestamptz,created_at)::date >= $2::date) AND ($3::date IS NULL OR COALESCE((data->>'at')::timestamptz,created_at)::date <= $3::date) AND ($4='' OR COALESCE(data->>'branchId','')=$4)`,[req.auth.tenantId,from,to,branchId]);const byType={},byMethod={};let inflows=0,outflows=0;for(const r of q.rows.map(x=>x.data)){const a=Number(r.amount||0),sign=r.direction==='out'?-1:1;if(sign>0)inflows+=a;else outflows+=a;byType[r.type||'other']=(byType[r.type||'other']||0)+sign*a;byMethod[r.method||'other']=(byMethod[r.method||'other']||0)+sign*a}res.json({from,to,inflows:Finance.money(inflows),outflows:Finance.money(outflows),net:Finance.money(inflows-outflows),byType,byMethod})});

app.get('/api/accounting/aging',needAuth,needPerm('accounting'),async(req,res)=>{
 const tid=req.auth.tenantId,today=Date.now(),bucket=d=>{if(!d)return'current';const days=Math.floor((today-new Date(d).getTime())/86400000);return days<=0?'current':days<=30?'1-30':days<=60?'31-60':days<=90?'61-90':'90+'};
 const branchId=String(req.query.branchId||''),supplierRows=(await pool.query(`SELECT supplier_id,due_date,balance FROM purchase_documents_core WHERE tenant_id=$1 AND balance>0 AND ($2='' OR branch_id=$2)`,[tid,branchId])).rows,customerRows=(await pool.query(`SELECT customer_id,at,credit_balance FROM sale_documents_core WHERE tenant_id=$1 AND credit_balance>0 AND ($2='' OR branch_id=$2)`,[tid,branchId])).rows;
 const group=rows=>{const out={current:0,'1-30':0,'31-60':0,'61-90':0,'90+':0};for(const r of rows){const k=bucket(r.due_date||r.at);out[k]=Finance.money(out[k]+Number(r.balance??r.credit_balance??0))}return out};
 res.json({suppliers:group(supplierRows),customers:group(customerRows),supplierTotal:Finance.money(supplierRows.reduce((a,r)=>a+Number(r.balance||0),0)),customerTotal:Finance.money(customerRows.reduce((a,r)=>a+Number(r.credit_balance||0),0))});
});

app.post('/api/accounting/supplier-payment',needAuth,needPerm('suppliers'),async(req,res,next)=>{
 if(!hasPerm(req.auth.user,'suppliers')||!hasPerm(req.auth.user,'accounting')||!hasPerm(req.auth.user,'cash'))return res.status(403).json({error:'FORBIDDEN'});
 const supplierId=String(req.body?.supplierId||''),amount=Finance.money(req.body?.amount),method=String(req.body?.method||'cash'),ref=String(req.body?.ref||'').trim();if(!supplierId||amount<=0)return res.status(422).json({error:'INVALID_PAYMENT'});
 const c=await pool.connect();try{await c.query('BEGIN');await ensureLicenseWritable(c,req.auth.tenantId);if(await periodLocked(c,req.auth.tenantId,new Date()))throw Object.assign(new Error('ACCOUNTING_PERIOD_CLOSED'),{status:409});
   const sr=await getRecord(c,req.auth.tenantId,'suppliers',supplierId,true);if(!sr)throw Object.assign(new Error('SUPPLIER_NOT_FOUND'),{status:404});const supplier=sr.data,balance=Finance.money(supplier.balance);if(amount>balance+0.01)throw Object.assign(new Error('PAYMENT_EXCEEDS_SUPPLIER_BALANCE'),{status:422});
   let remaining=amount;const pur=(await c.query(`SELECT * FROM records WHERE tenant_id=$1 AND store='purchases' AND data->>'supplierId'=$2 AND COALESCE((data->>'balance')::numeric,0)>0 ORDER BY COALESCE((data->>'dueDate')::date,(data->>'invoiceDate')::date,created_at::date),created_at FOR UPDATE`,[req.auth.tenantId,supplierId])).rows;const allocations=[];
   const paymentId=serverId('spp');for(const row of pur){if(remaining<=0)break;const doc=row.data,open=Finance.money(doc.balance),take=Math.min(open,remaining);if(take<=0)continue;doc.balance=Finance.money(open-take);await putRecord(c,req.auth.tenantId,'purchases',row.id,doc,Number(row.revision));allocations.push({documentId:row.id,amount:take});remaining=Finance.money(remaining-take);await c.query(`INSERT INTO payment_allocations(tenant_id,payment_kind,payment_id,counterparty_id,document_store,document_id,amount) VALUES($1,'supplier',$2,$3,'purchases',$4,$5)`,[req.auth.tenantId,paymentId,supplierId,row.id,take])}
   supplier.balance=Finance.money(balance-amount);await putRecord(c,req.auth.tenantId,'suppliers',supplierId,supplier,Number(sr.revision));const ctx=await currentDeviceContext(c,req),shift=await currentOpenShiftForPayment(c,req,ctx,method),at=nowIso(),pay={id:paymentId,supplierId,at,amount,method,ref,allocations,branchId:ctx.branch_id||null,cashboxId:ctx.cashbox_id||'cash_main',shiftId:shift?.id||null,userId:req.auth.user.id,userName:req.auth.user.name};await putRecord(c,req.auth.tenantId,'supplierPayments',paymentId,pay,0);
   const cm={id:serverId('csh'),at,type:'supplier_payment',amount,ref:ref||paymentId,note:`سداد ${supplier.name||''}`,method,direction:'out',branchId:ctx.branch_id||null,cashboxId:ctx.cashbox_id||'cash_main',shiftId:shift?.id||null};await putRecord(c,req.auth.tenantId,'cashMoves',cm.id,cm,0);const [code,name]=paymentAccount(method),j={id:serverId('jrn'),at,ref:ref||paymentId,type:'supplier_payment',note:`سداد ${supplier.name||''}`,lines:[{accountCode:'2000',account:'دائنون - موردون',debit:amount,credit:0},{accountCode:code,account:name,debit:0,credit:amount}],debit:amount,credit:amount,balanced:true,branchId:ctx.branch_id||null};await putRecord(c,req.auth.tenantId,'journal',j.id,j,0);await auditDb(c,req.auth.tenantId,req,'سداد مورد',`${supplier.name||supplierId} • ${amount}`,paymentId,pay);await bumpChange(c);await c.query('COMMIT');res.json({ok:true,payment:pay,supplier,unallocated:remaining})
 }catch(e){await c.query('ROLLBACK');next(e)}finally{c.release()}
});

app.post('/api/accounting/customer-payment',needAuth,needPerm('customers'),async(req,res,next)=>{
 if(!hasPerm(req.auth.user,'customers')||!hasPerm(req.auth.user,'accounting')||!hasPerm(req.auth.user,'cash'))return res.status(403).json({error:'FORBIDDEN'});
 const customerId=String(req.body?.customerId||''),amount=Finance.money(req.body?.amount),method=String(req.body?.method||'cash'),note=String(req.body?.note||'').trim();if(!customerId||amount<=0)return res.status(422).json({error:'INVALID_PAYMENT'});
 const c=await pool.connect();try{await c.query('BEGIN');await ensureLicenseWritable(c,req.auth.tenantId);if(await periodLocked(c,req.auth.tenantId,new Date()))throw Object.assign(new Error('ACCOUNTING_PERIOD_CLOSED'),{status:409});const cr=await getRecord(c,req.auth.tenantId,'customers',customerId,true);if(!cr)throw Object.assign(new Error('CUSTOMER_NOT_FOUND'),{status:404});const customer=cr.data,balance=Finance.money(customer.balance);if(amount>balance+0.01)throw Object.assign(new Error('PAYMENT_EXCEEDS_CUSTOMER_BALANCE'),{status:422});
   let remaining=amount;const sales=(await c.query(`SELECT * FROM records WHERE tenant_id=$1 AND store='sales' AND data->>'customerId'=$2 AND data->>'payment'='credit' ORDER BY COALESCE((data->>'at')::timestamptz,created_at) FOR UPDATE`,[req.auth.tenantId,customerId])).rows;const allocations=[],paymentId=serverId('cpm');for(const row of sales){if(remaining<=0)break;const doc=row.data,open=Finance.money(doc.creditBalance??Math.max(0,Number(doc.total||0)-Number(doc.returnedAmount||0)));if(open<=0)continue;const take=Math.min(open,remaining);doc.creditBalance=Finance.money(open-take);await putRecord(c,req.auth.tenantId,'sales',row.id,doc,Number(row.revision));allocations.push({documentId:row.id,amount:take});remaining=Finance.money(remaining-take);await c.query(`INSERT INTO payment_allocations(tenant_id,payment_kind,payment_id,counterparty_id,document_store,document_id,amount) VALUES($1,'customer',$2,$3,'sales',$4,$5)`,[req.auth.tenantId,paymentId,customerId,row.id,take])}
   customer.balance=Finance.money(balance-amount);await putRecord(c,req.auth.tenantId,'customers',customerId,customer,Number(cr.revision));const ctx=await currentDeviceContext(c,req),shift=await currentOpenShiftForPayment(c,req,ctx,method),at=nowIso(),pay={id:paymentId,customerId,at,amount,method,note,allocations,branchId:ctx.branch_id||null,cashboxId:ctx.cashbox_id||'cash_main',shiftId:shift?.id||null,userId:req.auth.user.id,userName:req.auth.user.name};await putRecord(c,req.auth.tenantId,'customerPayments',paymentId,pay,0);const cm={id:serverId('csh'),at,type:'customer_collection',amount,ref:paymentId,note:`تحصيل من ${customer.name||''}`,method,direction:'in',branchId:ctx.branch_id||null,cashboxId:ctx.cashbox_id||'cash_main',shiftId:shift?.id||null};await putRecord(c,req.auth.tenantId,'cashMoves',cm.id,cm,0);const [code,name]=paymentAccount(method),j={id:serverId('jrn'),at,ref:paymentId,type:'customer_collection',note:`تحصيل من ${customer.name||''}`,lines:[{accountCode:code,account:name,debit:amount,credit:0},{accountCode:'1100',account:'عملاء',debit:0,credit:amount}],debit:amount,credit:amount,balanced:true,branchId:ctx.branch_id||null};await putRecord(c,req.auth.tenantId,'journal',j.id,j,0);await auditDb(c,req.auth.tenantId,req,'تحصيل عميل',`${customer.name||customerId} • ${amount}`,paymentId,pay);await bumpChange(c);await c.query('COMMIT');res.json({ok:true,payment:pay,customer,unallocated:remaining})
 }catch(e){await c.query('ROLLBACK');next(e)}finally{c.release()}
});

app.post('/api/accounting/periods/close',needAuth,needPerm('accounting'),needAction('periodClose'),async(req,res,next)=>{const c=await pool.connect();try{const {from,to}=validatePeriodRange(req.body?.from,req.body?.to);if(to>new Date().toISOString().slice(0,10))throw Object.assign(new Error('CANNOT_CLOSE_FUTURE_PERIOD'),{status:422});await c.query('BEGIN');await ensureLicenseWritable(c,req.auth.tenantId);const overlap=await c.query(`SELECT from_date,to_date FROM accounting_periods WHERE tenant_id=$1 AND status='closed' AND daterange(from_date,to_date,'[]') && daterange($2::date,$3::date,'[]') AND NOT(from_date=$2::date AND to_date=$3::date) LIMIT 1`,[req.auth.tenantId,from,to]);if(overlap.rowCount){await c.query('ROLLBACK');return res.status(409).json({error:'ACCOUNTING_PERIOD_OVERLAP',period:overlap.rows[0]})}await c.query(`INSERT INTO accounting_periods(tenant_id,from_date,to_date,status,closed_by,closed_at) VALUES($1,$2,$3,'closed',$4,now()) ON CONFLICT(tenant_id,from_date,to_date) DO UPDATE SET status='closed',closed_by=$4,closed_at=now()`,[req.auth.tenantId,from,to,req.auth.user.name]);await auditDb(c,req.auth.tenantId,req,'إغلاق فترة محاسبية',`${from} → ${to}`);await c.query('COMMIT');res.json({ok:true})}catch(e){await c.query('ROLLBACK').catch(()=>{});next(e)}finally{c.release()}});

app.post('/api/accounting/periods/reopen',needAuth,needPerm('accounting'),needAction('periodReopen'),async(req,res,next)=>{const c=await pool.connect();try{const {from,to}=validatePeriodRange(req.body?.from,req.body?.to);await c.query('BEGIN');await ensureLicenseWritable(c,req.auth.tenantId);const q=await c.query(`UPDATE accounting_periods SET status='open',reopened_by=$4,reopened_at=now() WHERE tenant_id=$1 AND from_date=$2::date AND to_date=$3::date AND status='closed' RETURNING *`,[req.auth.tenantId,from,to,req.auth.user.name]);if(!q.rowCount){await c.query('ROLLBACK');return res.status(404).json({error:'ACCOUNTING_PERIOD_NOT_FOUND_OR_OPEN'})}await auditDb(c,req.auth.tenantId,req,'إعادة فتح فترة محاسبية',`${from} → ${to}`);await c.query('COMMIT');res.json({ok:true,period:q.rows[0]})}catch(e){await c.query('ROLLBACK').catch(()=>{});next(e)}finally{c.release()}});
};

export {};
