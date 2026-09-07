'use strict';

const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const text=(v:any)=>v==null?'':String(v).trim();
const dateOrNull=(v:any)=>{const s=text(v);return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):null};
const tsOrNull=(v:any)=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?null:d.toISOString()};

const LEGACY_ACCOUNT_CODES=new Map([
 ['الخزينة','1000'],['بنك','1010'],['البنوك','1010'],['وسيلة دفع','1020'],['وسائل تحصيل','1020'],['وسائل التحصيل الإلكترونية','1020'],
 ['العملاء','1100'],['مدينون - عملاء','1100'],['مطالبات التأمين','1150'],['المخزون','1200'],['ضريبة مدخلات قابلة للاسترداد','1210'],['دفعات مقدمة للموردين','1250'],['أرصدة لدى الموردين','1250'],
 ['دائنون - موردون','2000'],['الموردون','2000'],['أرصدة دائنة للعملاء','2050'],['ضريبة مخرجات مستحقة','2100'],['حقوق الملكية / أرصدة افتتاحية','3000'],['أرصدة افتتاحية','3000'],
 ['المبيعات','4000'],['مردودات المبيعات','4010'],['إيرادات التوصيل','4100'],['فروق زيادة المخزون','4200'],['تكلفة البضاعة المباعة','5000'],
 ['فروق المخزون','5100'],['فروق وتسويات المخزون','5100'],['المصروفات','6000'],['خسائر التلف والانتهاء','6100']
]);
function accountCode(line:any={}){
 const direct=text(line.accountCode||line.code);if(direct)return direct;
 const name=text(line.account||line.accountName);
 if(!name)return null;
 // Specific contra/variance accounts must be resolved before broad substring matches.
 if(/مردودات?\s*المبيعات|مرتجع\s*مبيعات/.test(name))return '4010';
 if(/^مصروف|مصروفات/.test(name))return '6000';
 if(/خسائر|تالف|تلف|صلاحية|منتهي/.test(name))return '6100';
 if(/فروق?.*(جرد|مخزون)|(جرد|مخزون).*فروق?/.test(name))return '5100';
 if(/مطالبات?\s*التأمين|تأمين/.test(name))return '1150';
 if(/عملاء|مدينون/.test(name))return '1100';
 if(/موردون|دائنون/.test(name))return '2000';
 if(/ضريبة.*مخرجات/.test(name))return '2100';
 if(/ضريبة.*مدخلات/.test(name))return '1210';
 if(/بنك|البنك/.test(name))return '1010';
 if(/محفظة|بطاقة|وسيلة دفع|وسيلة تحصيل|وسائل التحصيل/.test(name))return '1020';
 if(LEGACY_ACCOUNT_CODES.has(name))return LEGACY_ACCOUNT_CODES.get(name);
 for(const [k,v] of LEGACY_ACCOUNT_CODES)if(name.includes(k))return v;
 return null;
}
function arrayBarcodes(v:any){if(Array.isArray(v))return [...new Set(v.map(text).filter(Boolean))];return text(v).split(/[\s,;|]+/).map(text).filter(Boolean)}

async function projectRecord(client:any,tenantId:any,store:any,id:any,value:any){
 const v=value||{};
 if(store==='products'){
   const bars=[...new Set([text(v.barcode),...arrayBarcodes(v.barcodes)].filter(Boolean))];
   await client.query(`INSERT INTO products_core(tenant_id,id,name,barcode,barcodes,gtin,active_ingredient,manufacturer,category,status,sell_price,buy_price,last_purchase_price,average_cost,min_stock,reorder_point,updated_at)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
   ON CONFLICT(tenant_id,id) DO UPDATE SET name=EXCLUDED.name,barcode=EXCLUDED.barcode,barcodes=EXCLUDED.barcodes,gtin=EXCLUDED.gtin,active_ingredient=EXCLUDED.active_ingredient,manufacturer=EXCLUDED.manufacturer,category=EXCLUDED.category,status=EXCLUDED.status,sell_price=EXCLUDED.sell_price,buy_price=EXCLUDED.buy_price,last_purchase_price=EXCLUDED.last_purchase_price,average_cost=EXCLUDED.average_cost,min_stock=EXCLUDED.min_stock,reorder_point=EXCLUDED.reorder_point,updated_at=now()`,
   [tenantId,id,text(v.name),text(v.barcode)||null,bars,text(v.gtin)||null,text(v.active||v.activeIngredient)||null,text(v.company||v.manufacturer)||null,text(v.category)||null,text(v.status||'active'),n(v.sellPrice),n(v.buyPrice),n(v.lastPurchasePrice||v.buyPrice),n(v.averageCost||v.avgCost||v.buyPrice),n(v.minStock),n(v.reorderPoint??v.minStock)]);
   return;
 }
 if(store==='batches'){
   await client.query(`INSERT INTO batches_core(tenant_id,id,product_id,branch_id,batch_no,expiry,qty_base,cost_per_base,supplier_id,status,source_batch_id,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()) ON CONFLICT(tenant_id,id) DO UPDATE SET product_id=EXCLUDED.product_id,branch_id=EXCLUDED.branch_id,batch_no=EXCLUDED.batch_no,expiry=EXCLUDED.expiry,qty_base=EXCLUDED.qty_base,cost_per_base=EXCLUDED.cost_per_base,supplier_id=EXCLUDED.supplier_id,status=EXCLUDED.status,source_batch_id=EXCLUDED.source_batch_id,updated_at=now()`,
   [tenantId,id,text(v.productId),text(v.branchId)||null,text(v.batchNo)||null,dateOrNull(v.expiry),n(v.qtyBase),n(v.costPerBase),text(v.supplierId)||null,text(v.status||'available'),text(v.sourceBatchId)||null]);return;
 }
 if(store==='sales'){
   await client.query(`INSERT INTO sale_documents_core(tenant_id,id,no,at,branch_id,customer_id,status,payment,subtotal,discount,tax_total,total,cost,gross_profit,credit_balance,returned_amount,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now()) ON CONFLICT(tenant_id,id) DO UPDATE SET no=EXCLUDED.no,at=EXCLUDED.at,branch_id=EXCLUDED.branch_id,customer_id=EXCLUDED.customer_id,status=EXCLUDED.status,payment=EXCLUDED.payment,subtotal=EXCLUDED.subtotal,discount=EXCLUDED.discount,tax_total=EXCLUDED.tax_total,total=EXCLUDED.total,cost=EXCLUDED.cost,gross_profit=EXCLUDED.gross_profit,credit_balance=EXCLUDED.credit_balance,returned_amount=EXCLUDED.returned_amount,updated_at=now()`,
   [tenantId,id,text(v.no)||null,tsOrNull(v.at),text(v.branchId)||null,text(v.customerId)||null,text(v.status)||null,text(v.payment)||null,n(v.subtotal),n(v.discount)+n(v.pointsDiscount)+n(v.contractDiscount),n(v.taxTotal),n(v.total),n(v.cost),n(v.grossProfit),n(v.creditBalance),n(v.returnedAmount)]);
   await client.query('DELETE FROM sale_lines_core WHERE tenant_id=$1 AND sale_id=$2',[tenantId,id]);
   await client.query('DELETE FROM sale_batch_allocations_core WHERE tenant_id=$1 AND sale_id=$2',[tenantId,id]);
   for(const [i,l] of (Array.isArray(v.lines)?v.lines:[]).entries()){
     const qtyBase=n(l.qtyBase)||n(l.qty)*Math.max(1,n(l.factor)||1),allocs=Array.isArray(l.allocations)?l.allocations:[];
     const cost=n(l.cost)||allocs.reduce((a,x)=>a+n(x.qtyBase)*n(x.costPerBase),0);
     await client.query(`INSERT INTO sale_lines_core(tenant_id,sale_id,line_no,product_id,product_name,qty,factor,qty_base,unit_price,line_total,discount_share,tax_rate,tax_amount,net_amount,cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,[tenantId,id,i,text(l.productId)||null,text(l.name||l.productName)||null,n(l.qty),Math.max(1,n(l.factor)||1),qtyBase,n(l.unitPrice),n(l.lineTotal),n(l.discountShare),n(l.taxRate),n(l.taxAmount),n(l.netAmount||l.lineTotal-l.discountShare),cost]);
     for(const [j,a] of allocs.entries())await client.query(`INSERT INTO sale_batch_allocations_core(tenant_id,sale_id,line_no,allocation_no,batch_id,qty_base,cost_per_base) VALUES($1,$2,$3,$4,$5,$6,$7)`,[tenantId,id,i,j,text(a.batchId),n(a.qtyBase),n(a.costPerBase)]);
   }
   return;
 }
 if(store==='purchases'){
   await client.query(`INSERT INTO purchase_documents_core(tenant_id,id,no,supplier_invoice_no,at,invoice_date,due_date,branch_id,supplier_id,purchase_order_id,status,total,tax_total,paid_now,balance,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now()) ON CONFLICT(tenant_id,id) DO UPDATE SET no=EXCLUDED.no,supplier_invoice_no=EXCLUDED.supplier_invoice_no,at=EXCLUDED.at,invoice_date=EXCLUDED.invoice_date,due_date=EXCLUDED.due_date,branch_id=EXCLUDED.branch_id,supplier_id=EXCLUDED.supplier_id,purchase_order_id=EXCLUDED.purchase_order_id,status=EXCLUDED.status,total=EXCLUDED.total,tax_total=EXCLUDED.tax_total,paid_now=EXCLUDED.paid_now,balance=EXCLUDED.balance,updated_at=now()`,
   [tenantId,id,text(v.no)||null,text(v.supplierInvoiceNo)||null,tsOrNull(v.at),dateOrNull(v.invoiceDate),dateOrNull(v.dueDate),text(v.branchId)||null,text(v.supplierId)||null,text(v.purchaseOrderId)||null,text(v.status||'posted'),n(v.total),n(v.taxTotal),n(v.paidNow),n(v.balance)]);
   const previousLayers=(await client.query('SELECT line_no,qty_received_base,qty_remaining_base FROM purchase_receipt_layers WHERE tenant_id=$1 AND purchase_id=$2',[tenantId,id])).rows;
   const remainingByLine=new Map<number,any>(previousLayers.map(x=>[Number(x.line_no),{received:n(x.qty_received_base),remaining:n(x.qty_remaining_base)}]));
   await client.query('DELETE FROM purchase_lines_core WHERE tenant_id=$1 AND purchase_id=$2',[tenantId,id]);
   await client.query('DELETE FROM purchase_receipt_layers WHERE tenant_id=$1 AND purchase_id=$2',[tenantId,id]);
   for(const [i,l] of (Array.isArray(v.lines)?v.lines:[v]).entries()){
     const qtyBase=n(l.qtyBase)||((n(l.packs)+n(l.bonusPacks))*Math.max(1,n(l.packSize)||n(l.factor)||1));
     const batchId=text(l.batchId)||null,prev=remainingByLine.get(i),preservedRemaining=prev?Math.max(0,Math.min(qtyBase,prev.remaining+Math.max(0,qtyBase-prev.received))):Math.max(0,n(l.qtyRemainingBase??qtyBase));
     await client.query(`INSERT INTO purchase_lines_core(tenant_id,purchase_id,line_no,product_id,batch_id,batch_no,expiry,packs,bonus_packs,qty_base,unit_cost,tax_rate,tax_amount,line_total) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[tenantId,id,i,text(l.productId)||null,batchId,text(l.batchNo)||null,dateOrNull(l.expiry),n(l.packs),n(l.bonusPacks),qtyBase,n(l.costPerBase||l.unitCost||l.packCost),n(l.taxRate),n(l.taxAmount),n(l.total||l.lineTotal)]);
     await client.query(`INSERT INTO purchase_receipt_layers(tenant_id,id,purchase_id,line_no,product_id,batch_id,batch_no,expiry,supplier_id,branch_id,qty_received_base,qty_remaining_base,unit_cost,tax_per_base) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[tenantId,`${id}:${i}`,id,i,text(l.productId),batchId,text(l.batchNo)||null,dateOrNull(l.expiry),text(v.supplierId)||null,text(v.branchId)||null,qtyBase,preservedRemaining,n(l.costPerBase||l.unitCost||l.packCost),qtyBase? n(l.taxAmount)/qtyBase:0]);
   }
   return;
 }
 if(store==='returns'&&String(v.type||'')==='sale_return'){
   await client.query('DELETE FROM return_inspections WHERE tenant_id=$1 AND return_id=$2',[tenantId,id]);
   const inspections=Array.isArray(v.inspections)?v.inspections:[];
   for(const [i,x] of inspections.entries())await client.query(`INSERT INTO return_inspections(tenant_id,return_id,sale_id,line_no,product_id,batch_id,qty_base,disposition,reason,inspected_by,inspected_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[tenantId,id,text(v.saleId),i,text(x.productId)||null,text(x.batchId)||null,n(x.qtyBase),text(x.disposition||v.disposition||'quarantine'),text(x.reason||v.reason||'غير محدد'),text(x.inspectedBy||v.inspectedBy)||null,tsOrNull(x.inspectedAt||v.inspectedAt)||new Date().toISOString()]);
   return;
 }
 if(store==='stockMoves'){
   const qty=n(v.qtyBase);
   if(Math.abs(qty)<0.0000001){await client.query('DELETE FROM stock_ledger_core WHERE tenant_id=$1 AND id=$2',[tenantId,id]);return;}
   await client.query(`INSERT INTO stock_ledger_core(tenant_id,id,at,branch_id,product_id,batch_id,qty_base,type,ref) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(tenant_id,id) DO UPDATE SET at=EXCLUDED.at,branch_id=EXCLUDED.branch_id,product_id=EXCLUDED.product_id,batch_id=EXCLUDED.batch_id,qty_base=EXCLUDED.qty_base,type=EXCLUDED.type,ref=EXCLUDED.ref`,[tenantId,id,tsOrNull(v.at),text(v.branchId)||null,text(v.productId)||null,text(v.batchId)||null,qty,text(v.type)||null,text(v.ref)||null]);return;
 }
 if(store==='journal'){
   await client.query(`INSERT INTO journal_entries_core(tenant_id,id,at,branch_id,ref,entry_type,note,debit,credit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(tenant_id,id) DO UPDATE SET at=EXCLUDED.at,branch_id=EXCLUDED.branch_id,ref=EXCLUDED.ref,entry_type=EXCLUDED.entry_type,note=EXCLUDED.note,debit=EXCLUDED.debit,credit=EXCLUDED.credit`,[tenantId,id,tsOrNull(v.at),text(v.branchId)||null,text(v.ref)||null,text(v.type)||null,text(v.note)||null,n(v.debit),n(v.credit)]);
   await client.query('DELETE FROM journal_lines_core WHERE tenant_id=$1 AND journal_id=$2',[tenantId,id]);
   for(const [i,l] of (Array.isArray(v.lines)?v.lines:[]).entries())await client.query(`INSERT INTO journal_lines_core(tenant_id,journal_id,line_no,account_code,account_name,debit,credit) VALUES($1,$2,$3,$4,$5,$6,$7)`,[tenantId,id,i,accountCode(l),text(l.account||l.accountName||l.accountCode||'غير مصنف'),n(l.debit),n(l.credit)]);
 }
}

async function deleteProjection(client:any,tenantId:any,store:any,id:any){
 const map={products:'products_core',batches:'batches_core',sales:'sale_documents_core',purchases:'purchase_documents_core',stockMoves:'stock_ledger_core',journal:'journal_entries_core'};
 if(store==='sales'){await client.query('DELETE FROM sale_batch_allocations_core WHERE tenant_id=$1 AND sale_id=$2',[tenantId,id]);await client.query('DELETE FROM sale_lines_core WHERE tenant_id=$1 AND sale_id=$2',[tenantId,id])}
 if(store==='purchases'){await client.query('DELETE FROM purchase_receipt_layers WHERE tenant_id=$1 AND purchase_id=$2',[tenantId,id]);await client.query('DELETE FROM purchase_lines_core WHERE tenant_id=$1 AND purchase_id=$2',[tenantId,id])}
 if(store==='journal')await client.query('DELETE FROM journal_lines_core WHERE tenant_id=$1 AND journal_id=$2',[tenantId,id]);
 if(store==='returns')await client.query('DELETE FROM return_inspections WHERE tenant_id=$1 AND return_id=$2',[tenantId,id]);
 if(map[store])await client.query(`DELETE FROM ${map[store]} WHERE tenant_id=$1 AND id=$2`,[tenantId,id]);
}

async function deleteStoreProjections(client:any,tenantId:any,store:any){
 // Full-store maintenance must keep typed projections consistent with the compatibility records table.
 if(store==='returns')return client.query('DELETE FROM return_inspections WHERE tenant_id=$1',[tenantId]);
 if(store==='sales')return client.query('DELETE FROM sale_documents_core WHERE tenant_id=$1',[tenantId]);
 if(store==='purchases')return client.query('DELETE FROM purchase_documents_core WHERE tenant_id=$1',[tenantId]);
 if(store==='stockMoves')return client.query('DELETE FROM stock_ledger_core WHERE tenant_id=$1',[tenantId]);
 if(store==='journal')return client.query('DELETE FROM journal_entries_core WHERE tenant_id=$1',[tenantId]);
 if(store==='batches')return client.query('DELETE FROM batches_core WHERE tenant_id=$1',[tenantId]);
 if(store==='products')return client.query('DELETE FROM products_core WHERE tenant_id=$1',[tenantId]);
}

async function backfillCore(pool:any,{force=false}:any={}){
 const key='commercial_core_projection_v2';
 const state=(await pool.query('SELECT value FROM system_state WHERE key=$1',[key])).rows[0]?.value;
 if(state?.complete&&!force)return {skipped:true,count:Number(state.count||0)};
 const q=await pool.query(`SELECT tenant_id,store,id,data FROM records WHERE store=ANY($1::text[]) ORDER BY tenant_id,store,created_at`,[['products','batches','sales','purchases','stockMoves','journal','returns']]);
 const c=await pool.connect();let count=0;
 try{await c.query('BEGIN');for(const r of q.rows){await projectRecord(c,r.tenant_id,r.store,r.id,r.data);count++}await c.query(`INSERT INTO system_state(key,value,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`,[key,JSON.stringify({complete:true,count,at:new Date().toISOString()})]);await c.query('COMMIT');return{count}}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
module.exports={projectRecord,deleteProjection,deleteStoreProjections,backfillCore,accountCode};

export {};
