import type { CompatibilityDataServiceDependencies } from '../contracts/dependencies';
'use strict';
module.exports=function create_data_service(ctx:CompatibilityDataServiceDependencies){
 const {
  pool,
  rootDir,
  fs,
  path,
  Finance,
  runMigrations,
  projectRecord,
  deleteProjection,
  backfillCore,
  accountCode
 }=ctx;
 const sanitizeRecord=(...args)=>ctx.sanitizeRecord(...args);
 const rowValue=(...args)=>ctx.rowValue(...args);
 const branchOf=(...args)=>ctx.branchOf(...args);


async function initDb(){const sql=fs.readFileSync(path.join(rootDir,'db/schema.sql'),'utf8');await pool.query(sql);const applied=await runMigrations(pool,rootDir);if(applied.length)console.log('Applied DB migrations:',applied.join(','));const bf=await backfillCore(pool);if(!bf.skipped)console.log('Commercial core projection backfilled:',bf.count)}

async function getRecord(client:any,tenantId:any,store:any,id:any,lock:any=false){const q=await client.query(`SELECT * FROM records WHERE tenant_id=$1 AND store=$2 AND id=$3 ${lock?'FOR UPDATE':''}`,[tenantId,store,id]);return q.rows[0]||null}

async function revisionConflict(client:any,tenantId:any,store:any,id:any){const q=await client.query('SELECT revision FROM records WHERE tenant_id=$1 AND store=$2 AND id=$3',[tenantId,store,id]);throw Object.assign(new Error('REVISION_CONFLICT'),{status:409,currentRevision:Number(q.rows[0]?.revision||0)})}

async function ensureCoreAccounts(client:any,tenantId:any){
 const rows=[['1000','الخزينة','asset'],['1010','البنوك','asset'],['1020','وسائل التحصيل الإلكترونية','asset'],['1100','العملاء','asset'],['1150','مطالبات التأمين','asset'],['1200','المخزون','asset'],['1210','ضريبة مدخلات قابلة للاسترداد','asset'],['1250','دفعات مقدمة للموردين','asset'],['2000','الموردون','liability'],['2050','أرصدة دائنة للعملاء','liability'],['2100','ضريبة مخرجات مستحقة','liability'],['3000','أرصدة افتتاحية','equity'],['4000','المبيعات','revenue'],['4010','مردودات ومسموحات المبيعات','revenue'],['4100','إيرادات التوصيل','revenue'],['4200','فروق زيادة المخزون','revenue'],['5000','تكلفة البضاعة المباعة','cogs'],['5100','فروق وعجز المخزون','expense'],['6000','المصروفات التشغيلية','expense'],['6100','خسائر التلف والانتهاء','expense']];
 await client.query(`INSERT INTO chart_accounts(tenant_id,code,name,type,active) SELECT $1,x.code,x.name,x.type,true FROM jsonb_to_recordset($2::jsonb) AS x(code text,name text,type text) ON CONFLICT(tenant_id,code) DO UPDATE SET active=true`,[tenantId,JSON.stringify(rows.map(([code,name,type])=>({code,name,type})))]);
}

async function validateJournalRecord(client:any,tenantId:any,clean:any){
 await ensureCoreAccounts(client,tenantId);
 clean.lines=(Array.isArray(clean.lines)?clean.lines:[]).map(x=>({...x,accountCode:accountCode(x)||x.accountCode||null}));
 if(clean.lines.length<2)throw Object.assign(new Error('JOURNAL_LINES_REQUIRED'),{status:422});
 for(const line of clean.lines){const debit=Number(line.debit||0),credit=Number(line.credit||0);if(!Number.isFinite(debit)||!Number.isFinite(credit)||debit<0||credit<0||(debit>0&&credit>0))throw Object.assign(new Error('INVALID_JOURNAL_LINE'),{status:422});}
 const debit=Finance.money(clean.lines.reduce((a,x)=>a+Number(x.debit||0),0)),credit=Finance.money(clean.lines.reduce((a,x)=>a+Number(x.credit||0),0));clean.debit=debit;clean.credit=credit;clean.balanced=Math.abs(debit-credit)<0.01;
 if(!clean.balanced)throw Object.assign(new Error('UNBALANCED_JOURNAL'),{status:422,details:{debit,credit}});
 const missing=clean.lines.find(x=>!x.accountCode);if(missing)throw Object.assign(new Error('ACCOUNT_CODE_REQUIRED'),{status:422,details:{account:missing.account||''}});const codes=[...new Set(clean.lines.map(x=>String(x.accountCode)))];
 if(codes.length){const q=await client.query('SELECT code FROM chart_accounts WHERE tenant_id=$1 AND code=ANY($2::text[]) AND active=true',[tenantId,codes]);const ok=new Set(q.rows.map(r=>String(r.code)));for(const line of clean.lines)if(!line.accountCode||!ok.has(String(line.accountCode)))throw Object.assign(new Error(line.accountCode?'UNKNOWN_ACCOUNT_CODE':'ACCOUNT_CODE_REQUIRED'),{status:422,details:{code:line.accountCode||null,account:line.account||''}})}
 return clean;
}

async function putRecord(client:any,tenantId:any,store:any,id:any,value:any,expectedRevision:any=null){
 const clean=sanitizeRecord(value);
 if(store==='batches'&&Number(clean.qtyBase||0)<-0.000001)throw Object.assign(new Error('NEGATIVE_STOCK'),{status:409});
 if(store==='products'){
   const codes=[['barcode',clean.barcode],['gtin',clean.gtin],...((Array.isArray(clean.barcodes)?clean.barcodes:[]).map(x=>['barcode',x]))];
   for(const [field,raw] of codes){const code=String(raw||'').trim();if(!code)continue;const dup=await client.query(`SELECT id FROM records WHERE tenant_id=$1 AND store='products' AND id<>$2 AND (lower(coalesce(data->>'barcode',''))=lower($3) OR lower(coalesce(data->>'gtin',''))=lower($3) OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(data->'barcodes')='array' THEN data->'barcodes' ELSE '[]'::jsonb END) b WHERE lower(b)=lower($3))) LIMIT 1`,[tenantId,id,code]);if(dup.rowCount)throw Object.assign(new Error(field==='gtin'?'DUPLICATE_GTIN':'DUPLICATE_BARCODE'),{status:409})}
 }
 if(store==='suppliers'){
   const name=String(clean.name||'').trim().replace(/\s+/g,' '),phone=String(clean.phone||'').replace(/\D/g,''),tax=String(clean.taxNumber||'').trim().toLowerCase();
   if(!name)throw Object.assign(new Error('SUPPLIER_NAME_REQUIRED'),{status:422});
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${tenantId}|supplier|${name.toLowerCase()}|${phone}|${tax}`]);
   const dup=await client.query(`SELECT id FROM records WHERE tenant_id=$1 AND store='suppliers' AND id<>$2 AND lower(regexp_replace(btrim(coalesce(data->>'name','')),'\s+',' ','g'))=lower($3) AND ((NULLIF($4,'') IS NOT NULL AND regexp_replace(coalesce(data->>'phone',''),'\D','','g')=$4) OR (NULLIF($5,'') IS NOT NULL AND lower(btrim(coalesce(data->>'taxNumber','')))=$5) OR ($4='' AND $5='' AND regexp_replace(coalesce(data->>'phone',''),'\D','','g')='' AND btrim(coalesce(data->>'taxNumber',''))='')) LIMIT 1`,[tenantId,id,name,phone,tax]);
   if(dup.rowCount)throw Object.assign(new Error('DUPLICATE_SUPPLIER'),{status:409,details:{existingId:dup.rows[0].id}});
   clean.name=name;
 }
 if(store==='purchases'&&String(clean.supplierInvoiceNo||'').trim()){
   const dup=await client.query(`SELECT id FROM records WHERE tenant_id=$1 AND store='purchases' AND id<>$2 AND data->>'supplierId'=$3 AND lower(trim(coalesce(data->>'supplierInvoiceNo','')))=lower(trim($4)) LIMIT 1`,[tenantId,id,String(clean.supplierId||''),String(clean.supplierInvoiceNo)]);
   if(dup.rowCount)throw Object.assign(new Error('DUPLICATE_SUPPLIER_INVOICE'),{status:409});
 }
 if(store==='journal')await validateJournalRecord(client,tenantId,clean);
 const data=JSON.stringify(clean),branch=branchOf(clean);let row;
 if(expectedRevision==null){row=(await client.query(`INSERT INTO records(tenant_id,store,id,branch_id,data,revision) VALUES($1,$2,$3,$4,$5::jsonb,1) ON CONFLICT(tenant_id,store,id) DO UPDATE SET data=EXCLUDED.data,branch_id=EXCLUDED.branch_id,revision=records.revision+1,updated_at=now() RETURNING *`,[tenantId,store,id,branch,data])).rows[0]}
 else {const expected=Number(expectedRevision);if(expected===0){const q=await client.query(`INSERT INTO records(tenant_id,store,id,branch_id,data,revision) VALUES($1,$2,$3,$4,$5::jsonb,1) ON CONFLICT(tenant_id,store,id) DO NOTHING RETURNING *`,[tenantId,store,id,branch,data]);if(!q.rowCount)return revisionConflict(client,tenantId,store,id);row=q.rows[0]}else{const q=await client.query(`UPDATE records SET data=$4::jsonb,branch_id=$5,revision=revision+1,updated_at=now() WHERE tenant_id=$1 AND store=$2 AND id=$3 AND revision=$6 RETURNING *`,[tenantId,store,id,data,branch,expected]);if(!q.rowCount)return revisionConflict(client,tenantId,store,id);row=q.rows[0]}}
 await projectRecord(client,tenantId,store,id,clean);
 return rowValue(row);
}

async function delRecord(client:any,tenantId:any,store:any,id:any,expectedRevision:any=null){
 if(expectedRevision==null){await client.query('DELETE FROM records WHERE tenant_id=$1 AND store=$2 AND id=$3',[tenantId,store,id]);await deleteProjection(client,tenantId,store,id);return}
 const q=await client.query('DELETE FROM records WHERE tenant_id=$1 AND store=$2 AND id=$3 AND revision=$4 RETURNING revision',[tenantId,store,id,Number(expectedRevision)]);if(q.rowCount){await deleteProjection(client,tenantId,store,id);return}const exists=await client.query('SELECT revision FROM records WHERE tenant_id=$1 AND store=$2 AND id=$3',[tenantId,store,id]);if(!exists.rowCount)return;throw Object.assign(new Error('REVISION_CONFLICT'),{status:409,currentRevision:Number(exists.rows[0].revision)})
}

function querySearchFields(store:any){return {products:['name','barcode','gtin','active','activeIngredient','company','manufacturer','category'],customers:['name','phone','code'],suppliers:['name','phone','code'],sales:['no','customerName','note','paymentLabel'],purchases:['no','supplierName','supplierInvoiceNo','note'],batches:['batchNo','productName'],purchaseOrders:['no','supplierName'],orders:['no','customerName','phone'],prescriptions:['no','patientName','customerName','doctorName'],returns:['no','saleNo','customerName','reason'],supplierReturns:['no','supplierName','reason']}[store]||['name','no','ref']}

function safeSortExpr(sort:any){return {at:`COALESCE((data->>'at')::timestamptz,created_at)`,name:`lower(coalesce(data->>'name',''))`,no:`lower(coalesce(data->>'no',''))`,expiry:`NULLIF(data->>'expiry','')::date`,dueDate:`NULLIF(data->>'dueDate','')::date`,created:`created_at`,updated:`updated_at`}[sort]||`created_at`}

 return {initDb,getRecord,revisionConflict,ensureCoreAccounts,validateJournalRecord,putRecord,delRecord,querySearchFields,safeSortExpr};
};

export {};
