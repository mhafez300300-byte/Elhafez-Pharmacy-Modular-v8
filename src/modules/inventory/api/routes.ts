import type { InventoryRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_inventory(app:any,ctx:InventoryRouteDependencies){
 const {
  pool,
  hasPerm,
  hasAction,
  rowValue,
  redactRecordForUser,
  needAuth,
  needPerm
 }=ctx;

 // /api/products/by-ids
// /api/products/:id/alternatives
// /api/inventory/batch-provenance/:id
// /api/products/query
// /api/inventory/query
// /api/inventory/sellable-batches

app.get('/api/products/by-ids',needAuth,async(req,res,next)=>{try{
 const ids=String(req.query.ids||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,100);if(!ids.length)return res.json([]);
 if(!hasPerm(req.auth.user,'pos')&&!hasPerm(req.auth.user,'products')&&!hasPerm(req.auth.user,'inventory'))return res.status(403).json({error:'FORBIDDEN'});
 const q=await pool.query(`SELECT data,revision FROM records WHERE tenant_id=$1 AND store='products' AND id=ANY($2::text[])`,[req.auth.tenantId,ids]);
 const byId=new Map(q.rows.map(x=>{const v=rowValue(x);return[v.id,redactRecordForUser('products',v,req.auth.user)]}));res.json(ids.map(id=>byId.get(id)).filter(Boolean));
}catch(e){next(e)}});

app.get('/api/products/:id/alternatives',needAuth,async(req,res,next)=>{try{
 if(!hasPerm(req.auth.user,'pos')&&!hasPerm(req.auth.user,'products'))return res.status(403).json({error:'FORBIDDEN'});
 const branch=String(req.query.branchId||''),source=(await pool.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='products' AND id=$2`,[req.auth.tenantId,req.params.id])).rows[0]?.data;
 if(!source)return res.status(404).json({error:'PRODUCT_NOT_FOUND'});
 const active=String(source.active||source.activeIngredient||'').trim().toLowerCase(),strength=String(source.strength||'').trim().toLowerCase(),form=String(source.form||source.dosageForm||'').trim().toLowerCase(),manual=(Array.isArray(source.alternatives)?source.alternatives:String(source.alternatives||'').split(/[,،;\n]/)).map(x=>String(x).trim().toLowerCase()).filter(Boolean);
 if(!active&&!manual.length)return res.json([]);
 const q=await pool.query(`SELECT r.data,r.revision,COALESCE(st.stock_base,0) stock_base,st.nearest_expiry
   FROM records r
   LEFT JOIN LATERAL(SELECT SUM(b.qty_base) FILTER(WHERE b.status='available' AND b.qty_base>0 AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) stock_base,MIN(b.expiry) FILTER(WHERE b.status='available' AND b.qty_base>0 AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) nearest_expiry FROM batches_core b WHERE b.tenant_id=r.tenant_id AND b.product_id=r.id AND ($3='' OR b.branch_id IS NULL OR b.branch_id=$3)) st ON true
   WHERE r.tenant_id=$1 AND r.store='products' AND r.id<>$2 AND coalesce(r.data->>'status','active')<>'inactive' AND (
      ($4<>'' AND lower(trim(coalesce(r.data->>'active',r.data->>'activeIngredient','')))=$4)
      OR lower(trim(coalesce(r.data->>'name','')))=ANY($5::text[])
   )
   ORDER BY (COALESCE(st.stock_base,0)>0) DESC,
     (CASE WHEN $6<>'' AND lower(trim(coalesce(r.data->>'strength','')))=$6 THEN 1 ELSE 0 END) DESC,
     (CASE WHEN $7<>'' AND lower(trim(coalesce(r.data->>'form',r.data->>'dosageForm','')))=$7 THEN 1 ELSE 0 END) DESC,
     COALESCE(NULLIF(r.data->>'sellPrice','')::numeric,0),lower(coalesce(r.data->>'name','')) LIMIT 30`,[req.auth.tenantId,req.params.id,branch,active,manual,strength,form]);
 res.json(q.rows.map(x=>({...redactRecordForUser('products',rowValue(x),req.auth.user),stockBase:Number(x.stock_base||0),nearestExpiry:x.nearest_expiry||null,match:{active:!!active&&String(x.data?.active||x.data?.activeIngredient||'').trim().toLowerCase()===active,strength:!!strength&&String(x.data?.strength||'').trim().toLowerCase()===strength,form:!!form&&String(x.data?.form||x.data?.dosageForm||'').trim().toLowerCase()===form}})));
}catch(e){next(e)}});

app.get('/api/inventory/batch-provenance/:id',needAuth,async(req,res,next)=>{try{if(!hasPerm(req.auth.user,'inventory')&&!hasPerm(req.auth.user,'purchases')&&!hasPerm(req.auth.user,'supplier_returns'))return res.status(403).json({error:'FORBIDDEN'});const row=(await pool.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='batches' AND id=$2`,[req.auth.tenantId,req.params.id])).rows[0]?.data;if(!row)return res.status(404).json({error:'BATCH_NOT_FOUND'});const origin=String(row.sourceBatchId||req.params.id);const q=await pool.query(`SELECT l.supplier_id,COALESCE(s.data->>'name','') AS supplier_name,SUM(l.qty_remaining_base)::numeric AS qty_base FROM purchase_receipt_layers l LEFT JOIN records s ON s.tenant_id=l.tenant_id AND s.store='suppliers' AND s.id=l.supplier_id WHERE l.tenant_id=$1 AND l.batch_id=$2 AND l.qty_remaining_base>0 GROUP BY l.supplier_id,s.data->>'name' ORDER BY supplier_name`,[req.auth.tenantId,origin]);let items=q.rows.map(x=>({supplierId:x.supplier_id,supplierName:x.supplier_name,qtyBase:Number(x.qty_base||0)}));if(!items.length&&row.supplierId)items=[{supplierId:row.supplierId,supplierName:'',qtyBase:Number(row.qtyBase||0),legacy:true}];res.json(items)}catch(e){next(e)}});

app.get('/api/products/query',needAuth,needPerm('products'),async(req,res,next)=>{try{
 const page=Math.max(1,Number(req.query.page||1)),size=Math.min(100,Math.max(1,Number(req.query.size||30))),off=(page-1)*size,q=String(req.query.q||'').trim().toLowerCase().slice(0,160),status=String(req.query.status||''),category=String(req.query.category||''),stock=String(req.query.stock||''),control=String(req.query.control||''),branchId=String(req.query.branchId||''),sort=String(req.query.sort||'name');
 const args=[req.auth.tenantId,branchId],where=[`p.tenant_id=$1`,`$2::text IS NOT NULL`];if(q){args.push(`%${q}%`);const x=`$${args.length}`;where.push(`(lower(p.name) LIKE ${x} OR lower(coalesce(p.barcode,'')) LIKE ${x} OR lower(coalesce(p.gtin,'')) LIKE ${x} OR lower(coalesce(p.active_ingredient,'')) LIKE ${x} OR lower(coalesce(p.manufacturer,'')) LIKE ${x} OR lower(coalesce(r.data->>'location','')) LIKE ${x} OR EXISTS(SELECT 1 FROM unnest(p.barcodes) z WHERE lower(z) LIKE ${x}))`)}if(status){args.push(status);where.push(`p.status=$${args.length}`)}if(category){args.push(category);where.push(`p.category=$${args.length}`)}if(control){if(control==='otc')where.push(`COALESCE((r.data->>'rx')::boolean,false)=false AND coalesce(r.data->>'controlClass','normal')='normal'`);else if(control==='rx')where.push(`COALESCE((r.data->>'rx')::boolean,false)=true AND coalesce(r.data->>'controlClass','normal')='normal'`);else{args.push(control);where.push(`coalesce(r.data->>'controlClass','normal')=$${args.length}`)}}
 const coreBase=`FROM products_core p JOIN records r ON r.tenant_id=p.tenant_id AND r.store='products' AND r.id=p.id`,stockJoin=` LEFT JOIN LATERAL (SELECT COALESCE(SUM(b.qty_base) FILTER(WHERE b.status='available' AND b.qty_base>0 AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)),0) stock_base,MIN(b.expiry) FILTER(WHERE b.status='available' AND b.qty_base>0 AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) nearest_expiry FROM batches_core b WHERE b.tenant_id=p.tenant_id AND b.product_id=p.id AND ($2='' OR b.branch_id IS NULL OR b.branch_id=$2)) st ON true`;
 if(stock){const pack=`GREATEST(1,COALESCE(NULLIF(r.data->>'packToStrip','')::numeric,1)*COALESCE(NULLIF(r.data->>'stripToUnit','')::numeric,1))`;if(stock==='available')where.push(`st.stock_base>0`);else if(stock==='out')where.push(`st.stock_base<=0`);else if(stock==='low')where.push(`st.stock_base/${pack}<=COALESCE(NULLIF(r.data->>'minStock','')::numeric,p.min_stock,0)`)}const w=where.join(' AND '),order={name:'p.name ASC',stock_asc:'st.stock_base ASC,p.name ASC',stock_desc:'st.stock_base DESC,p.name ASC',price_asc:'p.sell_price ASC,p.name ASC',price_desc:'p.sell_price DESC,p.name ASC'}[sort]||'p.name ASC';
 const total=Number((await pool.query(`SELECT count(*) ${coreBase}${stock?stockJoin:''} WHERE ${w}`,args)).rows[0].count);let rows;if(!stock&&!sort.startsWith('stock_')){const pageOrder={name:'p.name ASC',price_asc:'p.sell_price ASC,p.name ASC',price_desc:'p.sell_price DESC,p.name ASC'}[sort]||'p.name ASC';rows=(await pool.query(`WITH page_ids AS MATERIALIZED (SELECT p.id ${coreBase} WHERE ${w} ORDER BY ${pageOrder} LIMIT ${size} OFFSET ${off}) SELECT r.data,r.revision,st.stock_base,st.nearest_expiry FROM page_ids x JOIN products_core p ON p.tenant_id=$1 AND p.id=x.id JOIN records r ON r.tenant_id=$1 AND r.store='products' AND r.id=x.id${stockJoin} ORDER BY ${pageOrder}`,args)).rows}else rows=(await pool.query(`SELECT r.data,r.revision,st.stock_base,st.nearest_expiry ${coreBase}${stockJoin} WHERE ${w} ORDER BY ${order} LIMIT ${size} OFFSET ${off}`,args)).rows;rows=rows.map(x=>({...redactRecordForUser('products',rowValue(x),req.auth.user),stockBase:Number(x.stock_base||0),nearestExpiry:x.nearest_expiry||null}));res.json({items:rows,total,page,size,pages:Math.max(1,Math.ceil(total/size))})
}catch(e){next(e)}});

app.get('/api/inventory/query',needAuth,needPerm('inventory'),async(req,res,next)=>{try{
 const page=Math.max(1,Number(req.query.page||1)),size=Math.min(100,Math.max(1,Number(req.query.size||30))),off=(page-1)*size,q=String(req.query.q||'').trim().toLowerCase().slice(0,160),status=String(req.query.status||''),expiry=String(req.query.expiry||''),branchId=String(req.query.branchId||'');const args=[req.auth.tenantId,branchId],where=[`b.tenant_id=$1`,`($2='' OR b.branch_id IS NULL OR b.branch_id=$2)`];if(q){args.push(`%${q}%`);const x=`$${args.length}`;where.push(`(lower(p.name) LIKE ${x} OR lower(coalesce(p.barcode,'')) LIKE ${x} OR lower(coalesce(br.data->>'location','')) LIKE ${x} OR lower(coalesce(b.batch_no,'')) LIKE ${x})`)}if(status){args.push(status);where.push(`b.status=$${args.length}`)}if(expiry==='expired')where.push(`b.expiry<CURRENT_DATE`);else if(['30','90'].includes(expiry)){args.push(Number(expiry));where.push(`b.expiry>=CURRENT_DATE AND b.expiry<=CURRENT_DATE+$${args.length}::int`)}const base=`FROM batches_core b JOIN records r ON r.tenant_id=b.tenant_id AND r.store='batches' AND r.id=b.id JOIN products_core p ON p.tenant_id=b.tenant_id AND p.id=b.product_id JOIN records br ON br.tenant_id=p.tenant_id AND br.store='products' AND br.id=p.id`,w=where.join(' AND ');const agg=(await pool.query(`SELECT count(*)::int count,COALESCE(SUM(b.qty_base*b.cost_per_base) FILTER(WHERE b.status='available' AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)),0)::numeric sell_value,COALESCE(SUM(b.qty_base*b.cost_per_base) FILTER(WHERE b.status<>'available' OR b.expiry<CURRENT_DATE),0)::numeric blocked_value ${base} WHERE ${w}`,args)).rows[0];const rows=(await pool.query(`SELECT r.data,r.revision,p.name product_name,p.barcode,br.data->>'location' location,COALESCE(NULLIF(br.data->>'packToStrip','')::numeric,1)*COALESCE(NULLIF(br.data->>'stripToUnit','')::numeric,1) pack_size ${base} WHERE ${w} ORDER BY b.expiry NULLS LAST,p.name,b.batch_no LIMIT ${size} OFFSET ${off}`,args)).rows.map(x=>({...redactRecordForUser('batches',rowValue(x),req.auth.user),productName:x.product_name,productBarcode:x.barcode,location:x.location||'',packSize:Number(x.pack_size||1)}));const out={items:rows,total:Number(agg.count||0),page,size,pages:Math.max(1,Math.ceil(Number(agg.count||0)/size))};if(hasAction(req.auth.user,'viewCost'))Object.assign(out,{sellValue:Number(agg.sell_value||0),blockedValue:Number(agg.blocked_value||0)});res.json(out)
}catch(e){next(e)}});

app.get('/api/inventory/sellable-batches',needAuth,async(req,res,next)=>{try{if(!hasPerm(req.auth.user,'pos')&&!hasPerm(req.auth.user,'inventory')&&!hasPerm(req.auth.user,'sales'))return res.status(403).json({error:'FORBIDDEN'});const ids=String(req.query.productIds||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,100),branchId=String(req.query.branchId||'').trim();if(!ids.length)return res.json([]);const q=await pool.query(`SELECT r.data,r.revision FROM records r JOIN batches_core b ON b.tenant_id=r.tenant_id AND b.id=r.id WHERE r.tenant_id=$1 AND r.store='batches' AND b.product_id=ANY($2::text[]) AND b.qty_base>0 AND b.status='available' AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE) AND ($3='' OR b.branch_id IS NULL OR b.branch_id=$3) ORDER BY b.product_id,b.expiry NULLS LAST,b.updated_at`,[req.auth.tenantId,ids,branchId]);res.json(q.rows.map(rowValue).map(v=>redactRecordForUser('batches',v,req.auth.user)))}catch(e){next(e)}});
};

export {};
