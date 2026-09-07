'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const {Pool}=require('pg');
const {runMigrations}=require('../dist/core/database/migrations');

const url=process.env.TEST_DATABASE_URL;
if(!url)throw new Error('TEST_DATABASE_URL is required');
if(process.env.PILOT_DB_ALLOW_WRITE!=='YES')throw new Error('PILOT_DB_ALLOW_WRITE=YES is required because this test writes and cleans disposable data');
if(process.env.DATABASE_URL&&process.env.DATABASE_URL===url)throw new Error('TEST_DATABASE_URL must not be the production DATABASE_URL');

const pool=new Pool({connectionString:url,ssl:process.env.TEST_PGSSL==='require'?{rejectUnauthorized:false}:undefined,max:20,connectionTimeoutMillis:5000});
const root=path.join(__dirname,'..');
const money=n=>Math.round(Number(n)*10000)/10000;

async function sequenceConcurrency(tenantId){
 const jobs=Array.from({length:80},()=>pool.query(`INSERT INTO doc_sequences(tenant_id,branch_id,doc_type,next_value) VALUES($1,'pilot','sale',2) ON CONFLICT(tenant_id,branch_id,doc_type) DO UPDATE SET next_value=doc_sequences.next_value+1 RETURNING next_value-1 AS value`,[tenantId]));
 const values=(await Promise.all(jobs)).map(x=>Number(x.rows[0].value)).sort((a,b)=>a-b);
 assert.equal(new Set(values).size,80,'sequence values must be unique');
 assert.deepEqual(values,Array.from({length:80},(_,i)=>i+1),'sequence values must be gap-free in the committed test run');
 return 80;
}

async function sellLastUnit(tenantId,batchId){
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const q=await c.query(`SELECT data,revision FROM records WHERE tenant_id=$1 AND store='batches' AND id=$2 FOR UPDATE`,[tenantId,batchId]);
  const row=q.rows[0];
  if(!row||Number(row.data.qtyBase||0)<1){await c.query('ROLLBACK');return false}
  const next={...row.data,qtyBase:money(Number(row.data.qtyBase)-1)};
  await c.query(`UPDATE records SET data=$3::jsonb,revision=revision+1,updated_at=now() WHERE tenant_id=$1 AND store='batches' AND id=$2`,[tenantId,batchId,JSON.stringify(next)]);
  await c.query(`UPDATE batches_core SET qty_base=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2`,[tenantId,batchId,next.qtyBase]);
  await c.query('COMMIT');return true;
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

async function duplicateSupplierInvoiceAttempt(tenantId,id,value){
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const supplier='supplier-pilot',normalized=value.trim();
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${tenantId}|supplier-invoice|${supplier}|${normalized.toLowerCase()}`]);
  const dup=await c.query(`SELECT id FROM purchase_documents_core WHERE tenant_id=$1 AND supplier_id=$2 AND lower(btrim(coalesce(supplier_invoice_no,'')))=lower($3) LIMIT 1`,[tenantId,supplier,normalized]);
  if(dup.rowCount){await c.query('ROLLBACK');return false}
  await c.query(`INSERT INTO purchase_documents_core(tenant_id,id,no,supplier_invoice_no,supplier_id,total) VALUES($1,$2,$3,$4,$5,1)`,[tenantId,id,id,value,supplier]);
  await c.query('COMMIT');return true;
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

async function expectDbReject(fn,label){let rejected=false;try{await fn()}catch{rejected=true}assert.equal(rejected,true,`${label} must be rejected by PostgreSQL`)}

(async()=>{
 const schema=fs.readFileSync(path.join(root,'db','schema.sql'),'utf8');
 await pool.query(schema);
 const migrations=await runMigrations(pool,root);
 const maxMigration=Number((await pool.query('SELECT max(version) AS v FROM schema_migrations')).rows[0].v||0);
 assert.ok(maxMigration>=8,'all database migrations through v8 must apply');
 const tenant=(await pool.query(`INSERT INTO tenants(name,status) VALUES('Postgres Pilot','active') RETURNING id`)).rows[0].id;
 try{
  await pool.query(`INSERT INTO products_core(tenant_id,id,name,status) VALUES($1,'prod-pilot','Pilot Product','active')`,[tenant]);
  await pool.query(`INSERT INTO records(tenant_id,store,id,data) VALUES($1,'batches','batch-last',$2::jsonb)`,[tenant,JSON.stringify({id:'batch-last',productId:'prod-pilot',qtyBase:1,status:'available',expiry:'2030-01-01'})]);
  await pool.query(`INSERT INTO batches_core(tenant_id,id,product_id,qty_base,status,expiry) VALUES($1,'batch-last','prod-pilot',1,'available','2030-01-01')`,[tenant]);

  const sequenceCount=await sequenceConcurrency(tenant);
  const sold=await Promise.all([sellLastUnit(tenant,'batch-last'),sellLastUnit(tenant,'batch-last')]);
  assert.equal(sold.filter(Boolean).length,1,'only one concurrent cashier may sell the last unit');
  const stock=Number((await pool.query(`SELECT qty_base FROM batches_core WHERE tenant_id=$1 AND id='batch-last'`,[tenant])).rows[0].qty_base);
  assert.equal(stock,0,'last-unit stock must finish at zero');

  const supplierInvoice=await Promise.all([
   duplicateSupplierInvoiceAttempt(tenant,'pur-a',' INV-900 '),
   duplicateSupplierInvoiceAttempt(tenant,'pur-b','inv-900')
  ]);
  assert.equal(supplierInvoice.filter(Boolean).length,1,'normalized supplier invoice must be accepted once under concurrency');

  await expectDbReject(()=>pool.query(`INSERT INTO batches_core(tenant_id,id,product_id,qty_base) VALUES($1,'orphan','missing-product',1)`,[tenant]),'orphan batch');
  await expectDbReject(()=>pool.query(`INSERT INTO batches_core(tenant_id,id,product_id,qty_base) VALUES($1,'negative','prod-pilot',-1)`,[tenant]),'negative stock');
  await expectDbReject(()=>pool.query(`INSERT INTO journal_entries_core(tenant_id,id,debit,credit) VALUES($1,'unbalanced',10,0)`,[tenant]),'unbalanced journal');

  console.log(JSON.stringify({ok:true,postgres:true,migrationsApplied:migrations,maxMigration,sequenceConcurrency:sequenceCount,lastUnitConcurrentAttempts:2,lastUnitSuccessfulSales:1,duplicateSupplierInvoiceAccepted:1,dbConstraintsVerified:['foreign-key','nonnegative-stock','balanced-journal']},null,2));
 }finally{
  await pool.query('DELETE FROM tenants WHERE id=$1',[tenant]);
 }
 await pool.end();
})().catch(async e=>{console.error(e.stack||e);try{await pool.end()}catch{}process.exit(1)});
