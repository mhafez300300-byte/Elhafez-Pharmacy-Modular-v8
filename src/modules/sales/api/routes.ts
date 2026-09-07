import type { SalesRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_sales(app:any,ctx:SalesRouteDependencies){
 const {
  pool,
  hasPerm,
  rowValue,
  redactRecordForUser,
  needAuth,
  needPerm
 }=ctx;

 // /api/pos/search
// /api/pos/meta
// /api/sequences/next/:type

app.get('/api/pos/search',needAuth,needPerm('pos'),async(req,res,next)=>{try{
 const term=String(req.query.q||'').trim().slice(0,120),branchId=String(req.query.branchId||'').trim(),category=String(req.query.category||'').trim(),limit=Math.min(60,Math.max(1,Number(req.query.limit||24))),availableOnly=String(req.query.availableOnly||'1')!=='0',pattern=term?`%${term.toLowerCase()}%`:null;
 const mapRows=rows=>rows.map(x=>({...redactRecordForUser('products',rowValue(x),req.auth.user),stockBase:Number(x.stock_base||0),nearestExpiry:x.nearest_expiry||null}));
 if(term&&/^[A-Za-z0-9._-]{3,64}$/.test(term)){const exact=await pool.query(`WITH candidates AS MATERIALIZED (SELECT p.id,p.name FROM products_core p WHERE p.tenant_id=$1 AND p.status<>'inactive' AND ($3='' OR p.category=$3) AND (lower(coalesce(p.barcode,''))=lower($2) OR lower(coalesce(p.gtin,''))=lower($2) OR p.barcodes @> ARRAY[$2]::text[]) ORDER BY p.name LIMIT $4) SELECT r.data,r.revision,COALESCE(st.stock_base,0) AS stock_base,st.nearest_expiry FROM candidates x JOIN records r ON r.tenant_id=$1 AND r.store='products' AND r.id=x.id LEFT JOIN LATERAL (SELECT SUM(b.qty_base) FILTER(WHERE b.status='available' AND b.qty_base>0 AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) AS stock_base,MIN(b.expiry) FILTER(WHERE b.status='available' AND b.qty_base>0 AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) AS nearest_expiry FROM batches_core b WHERE b.tenant_id=$1 AND b.product_id=x.id AND ($5='' OR b.branch_id IS NULL OR b.branch_id=$5)) st ON true ORDER BY x.name`,[req.auth.tenantId,term,category,limit,branchId]);if(exact.rows.length){const rows=mapRows(exact.rows).filter(x=>!availableOnly||Number(x.stockBase||0)>0);if(rows.length||!availableOnly)return res.json(rows)}}
 const q=await pool.query(`WITH candidates AS MATERIALIZED (
   SELECT p.id,p.name,
    CASE WHEN $3::text IS NULL THEN 9
         WHEN lower(coalesce(p.barcode,''))=lower($6) OR lower(coalesce(p.gtin,''))=lower($6) OR p.barcodes @> ARRAY[$6]::text[] THEN 0
         WHEN lower(p.name) LIKE lower($6)||'%' THEN 1
         WHEN lower(p.name) LIKE $3 THEN 2
         WHEN lower(coalesce(p.active_ingredient,'')) LIKE $3 THEN 3
         WHEN lower(coalesce(p.manufacturer,'')) LIKE $3 THEN 4
         ELSE 5 END AS relevance
   FROM products_core p
   WHERE p.tenant_id=$1 AND p.status<>'inactive' AND ($4='' OR p.category=$4) AND ($3::text IS NULL OR lower(p.name) LIKE $3 OR lower(coalesce(p.barcode,'')) LIKE $3 OR lower(coalesce(p.gtin,'')) LIKE $3 OR lower(coalesce(p.active_ingredient,'')) LIKE $3 OR lower(coalesce(p.manufacturer,'')) LIKE $3 OR EXISTS(SELECT 1 FROM unnest(p.barcodes) z WHERE lower(z) LIKE $3)) AND ($7::boolean=false OR EXISTS(SELECT 1 FROM batches_core ab WHERE ab.tenant_id=$1 AND ab.product_id=p.id AND ab.status='available' AND ab.qty_base>0 AND (ab.expiry IS NULL OR ab.expiry>=CURRENT_DATE) AND ($2='' OR ab.branch_id IS NULL OR ab.branch_id=$2)))
   ORDER BY relevance,p.name LIMIT $5
  ), ranked AS (
   SELECT x.id,x.name,x.relevance,r.data,r.revision,COALESCE(st.stock_base,0) stock_base,st.nearest_expiry,COALESCE(sa.recent_qty,0) recent_qty
   FROM candidates x JOIN records r ON r.tenant_id=$1 AND r.store='products' AND r.id=x.id
   LEFT JOIN LATERAL (SELECT SUM(b.qty_base) FILTER(WHERE b.status='available' AND b.qty_base>0 AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) stock_base,MIN(b.expiry) FILTER(WHERE b.status='available' AND b.qty_base>0 AND (b.expiry IS NULL OR b.expiry>=CURRENT_DATE)) nearest_expiry FROM batches_core b WHERE b.tenant_id=$1 AND b.product_id=x.id AND ($2='' OR b.branch_id IS NULL OR b.branch_id=$2)) st ON true
   LEFT JOIN LATERAL (SELECT COALESCE(SUM(l.qty_base),0) recent_qty FROM sale_lines_core l JOIN sale_documents_core d ON d.tenant_id=l.tenant_id AND d.id=l.sale_id WHERE l.tenant_id=$1 AND l.product_id=x.id AND d.at>=now()-interval '60 days' AND ($2='' OR d.branch_id IS NULL OR d.branch_id=$2)) sa ON true
  ) SELECT data,revision,stock_base,nearest_expiry FROM ranked ORDER BY relevance,(stock_base>0) DESC,recent_qty DESC,nearest_expiry NULLS LAST,name LIMIT $5`,[req.auth.tenantId,branchId,pattern,category,limit,term.toLowerCase(),availableOnly]);
 res.json(mapRows(q.rows).filter(x=>!availableOnly||Number(x.stockBase||0)>0));
}catch(e){next(e)}});

app.get('/api/pos/meta',needAuth,needPerm('pos'),async(req,res)=>{const rows=(await pool.query(`SELECT DISTINCT category FROM products_core WHERE tenant_id=$1 AND category IS NOT NULL AND category<>'' ORDER BY category LIMIT 200`,[req.auth.tenantId])).rows;res.json({categories:rows.map(x=>x.category)})});

app.post('/api/sequences/next/:type',needAuth,async(req,res)=>{const type=req.params.type,prefix={sale:'S',purchase:'P',purchase_order:'PO',supplier_return:'SR',transfer:'T',order:'O',manual_journal:'MJ'}[type];if(!prefix)return res.status(400).json({error:'UNKNOWN_SEQUENCE'});const permission={sale:'pos',purchase:'purchases',purchase_order:'purchase_orders',supplier_return:'supplier_returns',transfer:'transfers',order:'orders',manual_journal:'accounting'}[type];if(!hasPerm(req.auth.user,permission))return res.status(403).json({error:'FORBIDDEN',permission});const branch=String(req.body?.branchId||'');const q=await pool.query(`INSERT INTO doc_sequences(tenant_id,branch_id,doc_type,next_value) VALUES($1,$2,$3,2) ON CONFLICT(tenant_id,branch_id,doc_type) DO UPDATE SET next_value=doc_sequences.next_value+1 RETURNING next_value-1 AS value`,[req.auth.tenantId,branch,type]);const n=Number(q.rows[0].value);res.json({number:`${prefix}-${String(n).padStart(4,'0')}`,value:n})});
};

export {};
