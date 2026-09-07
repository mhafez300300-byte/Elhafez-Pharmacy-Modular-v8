import type { ClinicalRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_clinical(app:any,ctx:ClinicalRouteDependencies){
 const {
  pool,
  clinicalAlertsForProducts,
  needAuth,
  needPerm,
  auditDb
 }=ctx;

 // /api/clinical/check
// /api/catalog/search
// /api/catalog/import

app.post('/api/clinical/check',needAuth,async(req,res,next)=>{try{const ids=Array.isArray(req.body?.productIds)?req.body.productIds:[],customerId=String(req.body?.customerId||''),alerts=await clinicalAlertsForProducts(pool,req.auth.tenantId,ids,customerId,req.body?.allergies||'');res.json({alerts,requiresReview:alerts.some(x=>String(x.severity||'').toLowerCase()==='danger'),disclaimer:'النتيجة مساعدة قرار فقط وتعتمد على بيانات مسجلة وقواعد مستوردة من مصدر موثوق؛ لا تستبدل حكم الصيدلي.'})}catch(e){next(e)}});

app.get('/api/catalog/search',needAuth,async(req,res)=>{const q=String(req.query.q||'').trim();if(q.length<2)return res.json([]);const r=await pool.query(`SELECT gtin,barcode,name_ar,name_en,active_ingredients,strength,dosage_form,manufacturer,rx,controlled_class,official_price,source,source_updated_at FROM drug_catalog WHERE lower(name_ar) LIKE lower($1) OR lower(coalesce(name_en,'')) LIKE lower($1) OR barcode=$2 OR gtin=$2 ORDER BY CASE WHEN barcode=$2 OR gtin=$2 THEN 0 ELSE 1 END,name_ar LIMIT 50`,[`%${q}%`,q]);res.json(r.rows)});

app.post('/api/catalog/import',needAuth,needPerm('products'),async(req,res)=>{const rows=Array.isArray(req.body?.rows)?req.body.rows:[];if(rows.length>10000)return res.status(400).json({error:'TOO_MANY_ROWS'});const c=await pool.connect();try{await c.query('BEGIN');let n=0;for(const x of rows){if(!x.name_ar&&!x.nameAr)continue;await c.query(`INSERT INTO drug_catalog(gtin,barcode,name_ar,name_en,active_ingredients,strength,dosage_form,manufacturer,rx,controlled_class,official_price,source,source_updated_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(gtin) DO UPDATE SET barcode=EXCLUDED.barcode,name_ar=EXCLUDED.name_ar,name_en=EXCLUDED.name_en,active_ingredients=EXCLUDED.active_ingredients,strength=EXCLUDED.strength,dosage_form=EXCLUDED.dosage_form,manufacturer=EXCLUDED.manufacturer,rx=EXCLUDED.rx,controlled_class=EXCLUDED.controlled_class,official_price=EXCLUDED.official_price,source=EXCLUDED.source,source_updated_at=EXCLUDED.source_updated_at,updated_at=now()`,[x.gtin||null,x.barcode||null,x.name_ar||x.nameAr,x.name_en||x.nameEn||null,JSON.stringify(x.active_ingredients||x.activeIngredients||[]),x.strength||null,x.dosage_form||x.dosageForm||null,x.manufacturer||null,x.rx??null,x.controlled_class||x.controlledClass||null,x.official_price||x.officialPrice||null,x.source||'import',x.source_updated_at||x.sourceUpdatedAt||null]);n++}await auditDb(c,req.auth.tenantId,req,'استيراد قاعدة أدوية',`${n} سجل`);await c.query('COMMIT');res.json({ok:true,count:n})}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}});
};

export {};
