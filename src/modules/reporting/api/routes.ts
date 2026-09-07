import type { ReportingRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_reports(app:any,ctx:ReportingRouteDependencies){
 const {
  pool,
  Finance,
  hasPerm,
  hasAction,
  dropSessionCache,
  needAuth,
  needPerm
 }=ctx;

 // /api/dashboard/alerts
// /api/reports/sales-summary
// /api/reports/purchases-summary
// /api/dashboard/summary
// /api/reports/inventory-health
// /api/reports/reorder
// /api/reports/top-products
// /api/reports/returns-analysis
// /api/reports/customer-balances
// /api/reports/supplier-performance
// /api/reports/favorites
// /api/reports/favorites/:key
// /api/reports/favorites/:key

app.get('/api/dashboard/alerts',needAuth,async(req,res,next)=>{try{
 const tid=req.auth.tenantId,branch=String(req.query.branchId||'');
 const [low,expired,near30,failed,pendingClaims,overdueCustomers]=await Promise.all([
  pool.query(`SELECT count(*)::int count FROM products_core p JOIN records r ON r.tenant_id=p.tenant_id AND r.store='products' AND r.id=p.id LEFT JOIN LATERAL(SELECT COALESCE(SUM(qty_base) FILTER(WHERE status='available' AND qty_base>0 AND (expiry IS NULL OR expiry>=CURRENT_DATE)),0) stock_base FROM batches_core b WHERE b.tenant_id=p.tenant_id AND b.product_id=p.id AND ($2='' OR b.branch_id IS NULL OR b.branch_id=$2)) st ON true WHERE p.tenant_id=$1 AND p.status<>'inactive' AND (GREATEST(COALESCE(NULLIF(r.data->>'reorderPoint','')::numeric,0),COALESCE(NULLIF(r.data->>'minStock','')::numeric,p.min_stock,0))>0 OR EXISTS(SELECT 1 FROM sale_lines_core sl WHERE sl.tenant_id=p.tenant_id AND sl.product_id=p.id) OR EXISTS(SELECT 1 FROM purchase_receipt_layers pl WHERE pl.tenant_id=p.tenant_id AND pl.product_id=p.id)) AND COALESCE(st.stock_base,0)/GREATEST(1,COALESCE(NULLIF(r.data->>'packToStrip','')::numeric,1)*COALESCE(NULLIF(r.data->>'stripToUnit','')::numeric,1))<=GREATEST(COALESCE(NULLIF(r.data->>'reorderPoint','')::numeric,0),COALESCE(NULLIF(r.data->>'minStock','')::numeric,p.min_stock,0))`,[tid,branch]),
  pool.query(`SELECT count(*)::int count FROM batches_core WHERE tenant_id=$1 AND qty_base>0 AND expiry<CURRENT_DATE AND ($2='' OR branch_id IS NULL OR branch_id=$2)`,[tid,branch]),
  pool.query(`SELECT count(*)::int count FROM batches_core WHERE tenant_id=$1 AND qty_base>0 AND status='available' AND expiry>=CURRENT_DATE AND expiry<=CURRENT_DATE+interval '30 days' AND ($2='' OR branch_id IS NULL OR branch_id=$2)`,[tid,branch]),
  pool.query(`SELECT count(*)::int count FROM integration_outbox WHERE tenant_id=$1 AND status IN('failed','dead')`,[tid]),
  pool.query(`SELECT count(*)::int count FROM records WHERE tenant_id=$1 AND store='claims' AND coalesce(data->>'status','pending')='pending' AND ($2='' OR coalesce(data->>'branchId','')=$2)`,[tid,branch]),
  pool.query(`SELECT count(*)::int count FROM sale_documents_core WHERE tenant_id=$1 AND credit_balance>0 AND at<now()-interval '30 days' AND ($2='' OR branch_id IS NULL OR branch_id=$2)`,[tid,branch])
 ]);
 res.json({lowStock:Number(low.rows[0].count||0),expiredBatches:Number(expired.rows[0].count||0),nearExpiry30:Number(near30.rows[0].count||0),failedIntegrations:Number(failed.rows[0].count||0),pendingClaims:Number(pendingClaims.rows[0].count||0),overdueCustomerInvoices:Number(overdueCustomers.rows[0].count||0)});
}catch(e){next(e)}});

app.get('/api/reports/sales-summary',needAuth,needPerm('sales'),async(req,res,next)=>{try{const from=String(req.query.from||''),to=String(req.query.to||''),branch=String(req.query.branchId||''),payment=String(req.query.payment||''),status=String(req.query.status||'');const args=[req.auth.tenantId],w=[`tenant_id=$1`,`store='sales'`,`COALESCE(data->>'integrityStatus','')<>'quarantine'`];for(const [v,sql] of [[from,`COALESCE((data->>'at')::timestamptz,created_at)::date >= $X::date`],[to,`COALESCE((data->>'at')::timestamptz,created_at)::date <= $X::date`],[branch,`coalesce(data->>'branchId','')=$X`],[payment,`coalesce(data->>'payment','')=$X`],[status,`coalesce(data->>'status','')=$X`]])if(v){args.push(v);w.push(sql.replace('$X',`$${args.length}`))}const r=(await pool.query(`SELECT count(*)::int count,COALESCE(SUM((data->>'total')::numeric-COALESCE(NULLIF(data->>'returnedAmount','')::numeric,0)),0)::numeric net,COALESCE(SUM(COALESCE(NULLIF(data->>'grossProfit','')::numeric,0)-COALESCE(NULLIF(data->>'returnedAmount','')::numeric,0)+COALESCE(NULLIF(data->>'returnedCost','')::numeric,0)),0)::numeric profit FROM records WHERE ${w.join(' AND ')}`,args)).rows[0];res.json({count:Number(r.count||0),net:Number(r.net||0),...(hasAction(req.auth.user,'viewProfit')?{profit:Number(r.profit||0)}:{})})}catch(e){next(e)}});

app.get('/api/reports/purchases-summary',needAuth,needPerm('purchases'),async(req,res,next)=>{try{const from=String(req.query.from||''),to=String(req.query.to||''),branch=String(req.query.branchId||'');const args=[req.auth.tenantId],w=[`tenant_id=$1`,`store='purchases'`,`COALESCE(data->>'integrityStatus','')<>'quarantine'`];if(from){args.push(from);w.push(`COALESCE((data->>'at')::timestamptz,created_at)::date >= $${args.length}::date`)}if(to){args.push(to);w.push(`COALESCE((data->>'at')::timestamptz,created_at)::date <= $${args.length}::date`)}if(branch){args.push(branch);w.push(`coalesce(data->>'branchId','')=$${args.length}`)}const r=(await pool.query(`SELECT count(*)::int count,COALESCE(SUM((data->>'total')::numeric),0)::numeric total,COALESCE(SUM(COALESCE(NULLIF(data->>'balance','')::numeric,0)),0)::numeric balance FROM records WHERE ${w.join(' AND ')}`,args)).rows[0];res.json({count:Number(r.count||0),total:Number(r.total||0),balance:Number(r.balance||0)})}catch(e){next(e)}});

app.get('/api/dashboard/summary',needAuth,async(req,res,next)=>{try{const tid=req.auth.tenantId,branch=String(req.query.branchId||''),today=new Date().toISOString().slice(0,10),args=[tid,branch,today];const [saleQ,payQ]=await Promise.all([pool.query(`SELECT count(*)::int count,COALESCE(SUM((data->>'total')::numeric-COALESCE(NULLIF(data->>'returnedAmount','')::numeric,0)),0)::numeric total,COALESCE(SUM(COALESCE(NULLIF(data->>'grossProfit','')::numeric,0)-COALESCE(NULLIF(data->>'returnedAmount','')::numeric,0)+COALESCE(NULLIF(data->>'returnedCost','')::numeric,0)),0)::numeric profit FROM records WHERE tenant_id=$1 AND store='sales' AND COALESCE(data->>'integrityStatus','')<>'quarantine' AND ($2='' OR coalesce(data->>'branchId','')=$2) AND COALESCE((data->>'at')::timestamptz,created_at)::date=$3::date`,args),pool.query(`SELECT coalesce(data->>'paymentLabel',data->>'payment','غير محدد') label,COALESCE(SUM((data->>'total')::numeric-COALESCE(NULLIF(data->>'returnedAmount','')::numeric,0)),0)::numeric value FROM records WHERE tenant_id=$1 AND store='sales' AND COALESCE(data->>'integrityStatus','')<>'quarantine' AND ($2='' OR coalesce(data->>'branchId','')=$2) AND COALESCE((data->>'at')::timestamptz,created_at)::date=$3::date GROUP BY 1 ORDER BY 1`,args)]),sale=saleQ.rows[0],pay=payQ.rows;const [due,orders,attendance,expiry,stock]=await Promise.all([pool.query(`SELECT count(*)::int count FROM records WHERE tenant_id=$1 AND store='purchases' AND COALESCE(NULLIF(data->>'balance','')::numeric,0)>0 AND NULLIF(data->>'dueDate','')::date<=CURRENT_DATE AND ($2='' OR coalesce(data->>'branchId','')=$2)`,[tid,branch]),pool.query(`SELECT count(*)::int count FROM records WHERE tenant_id=$1 AND store='orders' AND coalesce(data->>'status','new') NOT IN ('completed','cancelled') AND ($2='' OR coalesce(data->>'branchId','')=$2)`,[tid,branch]),pool.query(`SELECT count(*)::int count FROM records WHERE tenant_id=$1 AND store='attendance' AND coalesce(data->>'clockOut','')='' AND ($2='' OR coalesce(data->>'branchId','')=$2)`,[tid,branch]),pool.query(`SELECT count(*)::int count FROM batches_core WHERE tenant_id=$1 AND qty_base>0 AND status='available' AND expiry>=CURRENT_DATE AND expiry<=CURRENT_DATE+interval '90 days' AND ($2='' OR branch_id IS NULL OR branch_id=$2)`,[tid,branch]),pool.query(`SELECT COALESCE(SUM(qty_base*cost_per_base),0)::numeric value FROM batches_core WHERE tenant_id=$1 AND qty_base>0 AND status='available' AND (expiry IS NULL OR expiry>=CURRENT_DATE) AND ($2='' OR branch_id IS NULL OR branch_id=$2)`,[tid,branch])]);const out:any={todaySalesCount:Number(sale.count||0),todaySales:Number(sale.total||0),payments:pay.map(x=>({label:x.label,value:Number(x.value||0)})),duePurchases:Number(due.rows[0].count||0),openOrders:Number(orders.rows[0].count||0),activeAttendance:Number(attendance.rows[0].count||0),nearExpiry:Number(expiry.rows[0].count||0)};if(hasAction(req.auth.user,'viewProfit'))out.todayProfit=Number(sale.profit||0);if(hasAction(req.auth.user,'viewCost'))out.stockValue=Number(stock.rows[0].value||0);res.json(out)}catch(e){next(e)}});

app.get('/api/reports/inventory-health',needAuth,async(req,res,next)=>{try{if(!hasPerm(req.auth.user,'reports')&&!hasPerm(req.auth.user,'inventory')&&!hasPerm(req.auth.user,'reorder'))return res.status(403).json({error:'FORBIDDEN'});const branch=String(req.query.branchId||''),days=Math.min(365,Math.max(30,Number(req.query.deadDays||90)));const q=(await pool.query(`WITH stock AS (SELECT b.product_id,SUM(b.qty_base) FILTER(WHERE b.qty_base>0 AND b.status='available' AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) qty_available,SUM(b.qty_base*b.cost_per_base) FILTER(WHERE b.qty_base>0 AND b.status='available' AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) cost_available,SUM(b.qty_base) FILTER(WHERE b.qty_base>0 AND b.expiry<CURRENT_DATE) qty_expired,SUM(b.qty_base*b.cost_per_base) FILTER(WHERE b.qty_base>0 AND b.expiry<CURRENT_DATE) cost_expired,SUM(b.qty_base) FILTER(WHERE b.qty_base>0 AND b.status='available' AND b.expiry>=CURRENT_DATE AND b.expiry<=CURRENT_DATE+interval '90 days') qty_near,SUM(b.qty_base*b.cost_per_base) FILTER(WHERE b.qty_base>0 AND b.status='available' AND b.expiry>=CURRENT_DATE AND b.expiry<=CURRENT_DATE+interval '90 days') cost_near FROM batches_core b WHERE b.tenant_id=$1 AND ($2='' OR b.branch_id IS NULL OR b.branch_id=$2) GROUP BY b.product_id), sold AS (SELECT l.product_id,MAX(d.at) last_sale_at,SUM(l.qty_base) FILTER(WHERE d.at>=now()-($3||' days')::interval) sold_recent FROM sale_lines_core l JOIN sale_documents_core d ON d.tenant_id=l.tenant_id AND d.id=l.sale_id WHERE l.tenant_id=$1 AND EXISTS(SELECT 1 FROM records ar WHERE ar.tenant_id=d.tenant_id AND ar.store='sales' AND ar.id=d.id AND COALESCE(ar.data->>'integrityStatus','')<>'quarantine') AND ($2='' OR d.branch_id IS NULL OR d.branch_id=$2) GROUP BY l.product_id) SELECT COUNT(*) FILTER(WHERE COALESCE(st.qty_available,0)>0)::int stocked_products,COUNT(*) FILTER(WHERE COALESCE(st.qty_available,0)>0 AND (so.last_sale_at IS NULL OR so.last_sale_at<now()-($3||' days')::interval))::int dead_products,COUNT(*) FILTER(WHERE COALESCE(st.qty_near,0)>0)::int near_expiry_products,COUNT(*) FILTER(WHERE COALESCE(st.qty_expired,0)>0)::int expired_products,COALESCE(SUM(st.cost_available),0)::numeric available_cost,COALESCE(SUM(st.cost_near),0)::numeric near_expiry_cost,COALESCE(SUM(st.cost_expired),0)::numeric expired_cost FROM products_core p LEFT JOIN stock st ON st.product_id=p.id LEFT JOIN sold so ON so.product_id=p.id WHERE p.tenant_id=$1 AND p.status<>'inactive'`,[req.auth.tenantId,branch,String(days)])).rows[0]||{};const out={deadDays:days,stockedProducts:Number(q.stocked_products||0),deadProducts:Number(q.dead_products||0),nearExpiryProducts:Number(q.near_expiry_products||0),expiredProducts:Number(q.expired_products||0)};if(hasAction(req.auth.user,'viewCost'))Object.assign(out,{availableCost:Number(q.available_cost||0),nearExpiryCost:Number(q.near_expiry_cost||0),expiredCost:Number(q.expired_cost||0)});res.json(out)}catch(e){next(e)}});

app.get('/api/reports/reorder',needAuth,async(req,res,next)=>{try{
 if(!hasPerm(req.auth.user,'reorder')&&!hasPerm(req.auth.user,'purchases')&&!hasPerm(req.auth.user,'inventory'))return res.status(403).json({error:'FORBIDDEN'});
 const branch=String(req.query.branchId||''),target=Math.min(90,Math.max(1,Number(req.query.targetDays||14))),safety=Math.min(30,Math.max(0,Number(req.query.safetyDays||3))),page=Math.max(1,Number(req.query.page||1)),size=Math.min(100,Math.max(1,Number(req.query.size||30))),off=(page-1)*size,q=String(req.query.q||'').trim().toLowerCase();
 const args=[req.auth.tenantId,branch,target,safety],where=[];if(q){args.push(`%${q}%`);where.push(`(lower(p.name) LIKE $${args.length} OR lower(coalesce(p.barcode,'')) LIKE $${args.length})`)}const extra=where.length?' AND '+where.join(' AND '):'';
 const sql=`WITH x AS (
  SELECT p.id,p.name,p.barcode,p.sell_price,p.min_stock,p.reorder_point,
   COALESCE(st.stock_base,0) stock_base,
   COALESCE(sa.sold7,0) sold7,COALESCE(sa.sold30,0) sold30,COALESCE(sa.sold90,0) sold90,
   COALESCE(NULLIF(pr.data->>'packToStrip','')::numeric,1)*COALESCE(NULLIF(pr.data->>'stripToUnit','')::numeric,1) pack_size
  FROM products_core p
  JOIN records pr ON pr.tenant_id=p.tenant_id AND pr.store='products' AND pr.id=p.id
  LEFT JOIN LATERAL(SELECT SUM(qty_base) FILTER(WHERE status='available' AND qty_base>0 AND (expiry IS NULL OR expiry>=CURRENT_DATE)) stock_base FROM batches_core b WHERE b.tenant_id=p.tenant_id AND b.product_id=p.id AND ($2='' OR b.branch_id IS NULL OR b.branch_id=$2)) st ON true
  LEFT JOIN LATERAL(SELECT
    SUM(l.qty_base) FILTER(WHERE d.at>=now()-interval '7 days') sold7,
    SUM(l.qty_base) FILTER(WHERE d.at>=now()-interval '30 days') sold30,
    SUM(l.qty_base) FILTER(WHERE d.at>=now()-interval '90 days') sold90
   FROM sale_lines_core l JOIN sale_documents_core d ON d.tenant_id=l.tenant_id AND d.id=l.sale_id
   WHERE l.tenant_id=p.tenant_id AND l.product_id=p.id AND d.at>=now()-interval '90 days' AND ($2='' OR d.branch_id IS NULL OR d.branch_id=$2)) sa ON true
  WHERE p.tenant_id=$1 AND p.status<>'inactive'${extra}
 ), rates AS (
  SELECT *,stock_base/GREATEST(pack_size,1) stock_packs,
   (sold7/GREATEST(pack_size,1))/7 avg7,(sold30/GREATEST(pack_size,1))/30 avg30,(sold90/GREATEST(pack_size,1))/90 avg90
  FROM x
 ), scored AS (
  SELECT *,
   (avg7*0.50+avg30*0.35+avg90*0.15) weighted_daily,
   CASE WHEN avg30>0 AND avg7>avg30*1.25 THEN 1.20 WHEN avg30>0 AND avg7<avg30*0.75 THEN 0.90 ELSE 1.00 END trend_factor,
   CASE WHEN avg30>0 AND avg7>avg30*1.25 THEN 'up' WHEN avg30>0 AND avg7<avg30*0.75 THEN 'down' ELSE 'stable' END trend
  FROM rates
 ), y AS (
  SELECT *,weighted_daily*trend_factor effective_daily,
   GREATEST(COALESCE(NULLIF(reorder_point,0),min_stock,0),(weighted_daily*trend_factor)*(($3::numeric)+($4::numeric))) target_packs
  FROM scored
 )
 SELECT *,GREATEST(0,CEIL(target_packs-stock_packs)) suggest,
  CASE WHEN effective_daily>0 THEN stock_packs/effective_daily ELSE 999 END days_cover,count(*) OVER() total_rows
 FROM y ORDER BY suggest DESC,days_cover ASC,name LIMIT ${size} OFFSET ${off}`;
 const rows=(await pool.query(sql,args)).rows,total=rows.length?Number(rows[0].total_rows||0):0;
 res.json({items:rows.map(r=>({id:r.id,name:r.name,barcode:r.barcode,stockPacks:Number(r.stock_packs||0),avg7:Number(r.avg7||0),avg30:Number(r.avg30||0),avg90:Number(r.avg90||0),avgDailyPacks:Number(r.effective_daily||0),trend:r.trend||'stable',trendFactor:Number(r.trend_factor||1),minStock:Number(r.min_stock||0),reorderPoint:Number(r.reorder_point||0),suggest:Number(r.suggest||0),daysCover:Number(r.days_cover||999)})),total,page,size,pages:Math.max(1,Math.ceil(total/size)),targetDays:target,safetyDays:safety});
 }catch(e){next(e)}});

app.get('/api/reports/top-products',needAuth,async(req,res,next)=>{try{
 if(!hasPerm(req.auth.user,'reports')&&!hasPerm(req.auth.user,'sales'))return res.status(403).json({error:'FORBIDDEN'});
 const from=String(req.query.from||''),to=String(req.query.to||''),branch=String(req.query.branchId||''),limit=Math.min(50,Math.max(5,Number(req.query.limit||10))),args=[req.auth.tenantId,branch,from||null,to||null,limit];
 const q=await pool.query(`WITH sold AS (SELECT l.product_id id,MAX(l.product_name) name,SUM(l.qty_base)::numeric qty_base,SUM(l.net_amount)::numeric net_sales,SUM(l.tax_amount)::numeric tax,SUM(l.cost)::numeric cost FROM sale_lines_core l JOIN sale_documents_core d ON d.tenant_id=l.tenant_id AND d.id=l.sale_id WHERE l.tenant_id=$1 AND EXISTS(SELECT 1 FROM records ar WHERE ar.tenant_id=d.tenant_id AND ar.store='sales' AND ar.id=d.id AND COALESCE(ar.data->>'integrityStatus','')<>'quarantine') AND ($2='' OR d.branch_id IS NULL OR d.branch_id=$2) AND ($3::date IS NULL OR d.at::date >= $3::date) AND ($4::date IS NULL OR d.at::date <= $4::date) GROUP BY l.product_id), returned AS (SELECT i->>'productId' id,SUM(COALESCE(NULLIF(i->>'qty','')::numeric,0)*COALESCE(sl.factor,1)) qty_base,SUM(COALESCE(NULLIF(i->>'net','')::numeric,0)) net_sales,SUM(COALESCE(NULLIF(i->>'tax','')::numeric,0)) tax,SUM(CASE WHEN COALESCE(sl.qty_base,0)>0 THEN COALESCE(NULLIF(i->>'qty','')::numeric,0)*COALESCE(sl.factor,1)*(sl.cost/sl.qty_base) ELSE 0 END)::numeric cost FROM records r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.data->'items')='array' THEN r.data->'items' ELSE '[]'::jsonb END) i LEFT JOIN sale_lines_core sl ON sl.tenant_id=r.tenant_id AND sl.sale_id=r.data->>'saleId' AND sl.line_no=COALESCE(NULLIF(i->>'lineIndex','')::int,0) WHERE r.tenant_id=$1 AND r.store='returns' AND COALESCE(r.data->>'type','')='sale_return' AND ($2='' OR COALESCE(r.data->>'branchId','')=$2) AND ($3::date IS NULL OR COALESCE((r.data->>'at')::timestamptz,r.created_at)::date >= $3::date) AND ($4::date IS NULL OR COALESCE((r.data->>'at')::timestamptz,r.created_at)::date <= $4::date) GROUP BY i->>'productId') SELECT s.id,s.name,(s.qty_base-COALESCE(r.qty_base,0))::numeric qty_base,(s.net_sales-COALESCE(r.net_sales,0))::numeric net_sales,(s.tax-COALESCE(r.tax,0))::numeric tax,(s.cost-COALESCE(r.cost,0))::numeric cost FROM sold s LEFT JOIN returned r ON r.id=s.id ORDER BY (s.net_sales-COALESCE(r.net_sales,0)) DESC LIMIT $5`,args);
 const canProfit=hasAction(req.auth.user,'viewProfit'),canCost=hasAction(req.auth.user,'viewCost');
 res.json(q.rows.map(r=>({id:r.id,name:r.name||'غير مسمى',qtyBase:Number(r.qty_base||0),netSales:Number(r.net_sales||0),tax:Number(r.tax||0),...(canCost?{cost:Number(r.cost||0)}:{}),...(canProfit?{grossProfit:Finance.money(Number(r.net_sales||0)-Number(r.cost||0))}:{})})))
}catch(e){next(e)}});

app.get('/api/reports/returns-analysis',needAuth,async(req,res,next)=>{try{
 if(!hasPerm(req.auth.user,'reports')&&!hasPerm(req.auth.user,'sales'))return res.status(403).json({error:'FORBIDDEN'});
 const from=String(req.query.from||''),to=String(req.query.to||''),branch=String(req.query.branchId||''),args=[req.auth.tenantId],w=[`tenant_id=$1`,`store='returns'`,`COALESCE(data->>'type','')='sale_return'`];
 if(from){args.push(from);w.push(`COALESCE((data->>'at')::timestamptz,created_at)::date >= $${args.length}::date`)}if(to){args.push(to);w.push(`COALESCE((data->>'at')::timestamptz,created_at)::date <= $${args.length}::date`)}if(branch){args.push(branch);w.push(`COALESCE(data->>'branchId','')=$${args.length}`)}
 const rows=(await pool.query(`SELECT data FROM records WHERE ${w.join(' AND ')}`,args)).rows.map(x=>x.data||{}),byReason={},byDisposition={};let total=0,tax=0,cost=0;
 for(const r of rows){total+=Number(r.total||0);tax+=Number(r.tax||0);cost+=Number(r.cost||0);const reason=String(r.reason||'غير محدد'),disp=String(r.disposition||'غير محدد');byReason[reason]=Finance.money((byReason[reason]||0)+Number(r.total||0));byDisposition[disp]=(byDisposition[disp]||0)+1}
 res.json({count:rows.length,total:Finance.money(total),tax:Finance.money(tax),...(hasAction(req.auth.user,'viewCost')?{cost:Finance.money(cost)}:{}),byReason,byDisposition})
}catch(e){next(e)}});

app.get('/api/reports/customer-balances',needAuth,async(req,res,next)=>{try{
 if(!hasPerm(req.auth.user,'reports')&&!hasPerm(req.auth.user,'customers')&&!hasPerm(req.auth.user,'accounting'))return res.status(403).json({error:'FORBIDDEN'});const branch=String(req.query.branchId||''),limit=Math.min(100,Math.max(10,Number(req.query.limit||25)));
 const q=await pool.query(`SELECT c.id,c.data->>'name' name,c.data->>'phone' phone,COALESCE(x.balance,0)::numeric balance,COALESCE(NULLIF(c.data->>'creditBalance','')::numeric,0) credit_balance,x.last_sale_at FROM records c LEFT JOIN LATERAL(SELECT COALESCE(SUM(CASE WHEN d.payment='credit' THEN d.credit_balance ELSE 0 END),0) balance,MAX(d.at) last_sale_at FROM sale_documents_core d WHERE d.tenant_id=c.tenant_id AND d.customer_id=c.id AND ($2='' OR d.branch_id IS NULL OR d.branch_id=$2)) x ON true WHERE c.tenant_id=$1 AND c.store='customers' AND (COALESCE(x.balance,0)>0 OR ($2='' AND COALESCE(NULLIF(c.data->>'creditBalance','')::numeric,0)>0)) ORDER BY COALESCE(x.balance,0) DESC LIMIT $3`,[req.auth.tenantId,branch,limit]);
 res.json(q.rows.map(r=>({id:r.id,name:r.name||'',phone:r.phone||'',balance:Number(r.balance||0),creditBalance:Number(r.credit_balance||0),lastSaleAt:r.last_sale_at||null})))
}catch(e){next(e)}});

app.get('/api/reports/supplier-performance',needAuth,async(req,res,next)=>{try{
 if(!hasPerm(req.auth.user,'reports')&&!hasPerm(req.auth.user,'suppliers')&&!hasPerm(req.auth.user,'purchases'))return res.status(403).json({error:'FORBIDDEN'});const from=String(req.query.from||''),to=String(req.query.to||''),branch=String(req.query.branchId||''),args=[req.auth.tenantId,branch,from||null,to||null];
 const q=await pool.query(`SELECT d.supplier_id id,MAX(COALESCE(r.data->>'name','')) name,COUNT(*)::int invoices,COALESCE(SUM(d.total),0)::numeric total,COALESCE(SUM(d.balance),0)::numeric balance,COALESCE(AVG(CASE WHEN d.due_date IS NOT NULL THEN d.due_date-d.invoice_date END),0)::numeric avg_terms_days,MAX(d.at) last_purchase_at,COALESCE((SELECT SUM(COALESCE(NULLIF(sr.data->>'value','')::numeric,0)) FROM records sr WHERE sr.tenant_id=d.tenant_id AND sr.store='supplierReturns' AND sr.data->>'supplierId'=d.supplier_id AND ($2='' OR COALESCE(sr.data->>'branchId','')=$2) AND ($3::date IS NULL OR COALESCE((sr.data->>'at')::timestamptz,sr.created_at)::date >= $3::date) AND ($4::date IS NULL OR COALESCE((sr.data->>'at')::timestamptz,sr.created_at)::date <= $4::date)),0)::numeric returned FROM purchase_documents_core d LEFT JOIN records r ON r.tenant_id=d.tenant_id AND r.store='suppliers' AND r.id=d.supplier_id WHERE d.tenant_id=$1 AND EXISTS(SELECT 1 FROM records ar WHERE ar.tenant_id=d.tenant_id AND ar.store='purchases' AND ar.id=d.id AND COALESCE(ar.data->>'integrityStatus','')<>'quarantine') AND ($2='' OR d.branch_id IS NULL OR d.branch_id=$2) AND ($3::date IS NULL OR d.at::date >= $3::date) AND ($4::date IS NULL OR d.at::date <= $4::date) GROUP BY d.tenant_id,d.supplier_id ORDER BY (SUM(d.total)-COALESCE((SELECT SUM(COALESCE(NULLIF(sr.data->>'value','')::numeric,0)) FROM records sr WHERE sr.tenant_id=d.tenant_id AND sr.store='supplierReturns' AND sr.data->>'supplierId'=d.supplier_id),0)) DESC NULLS LAST`,args);
 res.json(q.rows.map(r=>({id:r.id,name:r.name||'غير محدد',invoices:Number(r.invoices||0),total:Number(r.total||0),returned:Number(r.returned||0),netPurchases:Finance.money(Number(r.total||0)-Number(r.returned||0)),balance:Number(r.balance||0),avgTermsDays:Number(r.avg_terms_days||0),lastPurchaseAt:r.last_purchase_at||null})))
}catch(e){next(e)}});

app.get('/api/reports/favorites',needAuth,async(req,res,next)=>{try{const q=await pool.query('SELECT report_key FROM report_favorites WHERE tenant_id=$1 AND user_id=$2 ORDER BY created_at',[req.auth.tenantId,req.auth.user.id]);res.json(q.rows.map(x=>x.report_key))}catch(e){next(e)}});

app.put('/api/reports/favorites/:key',needAuth,async(req,res,next)=>{try{const k=String(req.params.key||'').slice(0,80);const q=await pool.query(`INSERT INTO report_favorites(tenant_id,user_id,report_key) SELECT $1,u.id,$3 FROM users u WHERE u.tenant_id=$1 AND u.id=$2 AND u.active=true ON CONFLICT DO NOTHING RETURNING report_key`,[req.auth.tenantId,req.auth.user.id,k]);if(!q.rowCount){dropSessionCache();return res.status(401).json({error:'AUTH_REQUIRED'})}res.json({ok:true})}catch(e){next(e)}});

app.delete('/api/reports/favorites/:key',needAuth,async(req,res,next)=>{try{await pool.query('DELETE FROM report_favorites WHERE tenant_id=$1 AND user_id=$2 AND report_key=$3',[req.auth.tenantId,req.auth.user.id,String(req.params.key||'')]);res.json({ok:true})}catch(e){next(e)}});
};

export {};
