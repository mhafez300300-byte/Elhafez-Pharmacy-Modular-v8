import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const raw=String(process.env.INTEGRATION_DATABASE_URL||'').trim();
if(!raw){console.error('INTEGRATION_DATABASE_URL is required. Use the disposable integration PostgreSQL service.');process.exit(2);}
if(process.env.DATABASE_URL&&process.env.DATABASE_URL===raw){console.error('Performance drill refuses to use DATABASE_URL.');process.exit(2);}
if(process.env.NODE_ENV==='production'&&process.env.ALLOW_INTEGRATION_DRILL!=='true'){console.error('Production environment requires ALLOW_INTEGRATION_DRILL=true with a distinct disposable DB.');process.exit(2);}
const schema=`elhafez_perf_${Date.now()}_${randomBytes(3).toString('hex')}`.replace(/[^a-z0-9_]/g,'');
const admin=new Pool({connectionString:raw,max:1});let db;
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const elapsed=async(fn)=>{const s=performance.now();const value=await fn();return{ms:performance.now()-s,value};};
const percentile=(xs,p)=>{const a=[...xs].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor((a.length-1)*p))]??0;};
try{
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const u=new URL(raw);u.searchParams.set('options',`-c search_path=${schema}`);
  const [{PostgresDatabase},{runMigrations},{migrations},{createCompositionRoot},{seedReferenceDrugMaster}]=await Promise.all([
    import('../dist/core/db/postgres.js'),import('../dist/core/db/migrator.js'),import('../dist/app/migrations.js'),import('../dist/app/composition-root.js'),import('../dist/modules/drugmaster/infrastructure/seed-reference.js')
  ]);
  db=new PostgresDatabase(u.toString());await runMigrations(db,migrations);
  const config={env:'test',port:3000,host:'127.0.0.1',databaseUrl:u.toString(),appSecret:'performance-app-secret-32-characters-min',backupSecret:'performance-backup-secret-32-characters-min',sessionHours:12,allowStandaloneSetup:true,ownerProductCode:'PHARMAFLOW',drugMasterAutoSeed:false,drugMasterSeedFile:'data/drug-master-egypt-reference.csv.br',alertRefreshMinutes:15,cleanupHours:6};
  const root=createCompositionRoot(db,config);
  const setup=await root.setupService.setup({pharmacyName:'Performance Pharmacy',branchName:'Main',currency:'EGP',adminName:'Admin',adminUsername:'perfadmin',adminPin:'1234'});const t='default',b=setup.branch.id,uid=setup.user.id;

  const fixture=await elapsed(async()=>{
    await db.query(`INSERT INTO cat_products(id,tenant_id,name,barcode,sku,selling_price,cost_price,tax_rate,reorder_level,active)
      SELECT 'perf_p_'||g,$1,'دواء اختبار الأداء '||g,'PERF-'||lpad(g::text,7,'0'),'SKU-'||g,10+(g%400),5+(g%180),0,5,true FROM generate_series(1,5000) g`,[t]);
    await db.query(`INSERT INTO inv_batches(id,tenant_id,branch_id,product_id,batch_no,expiry_date,quantity,unit_cost,status)
      SELECT 'perf_b_'||g,$1,$2,'perf_p_'||g,'B-'||g,(current_date+((g%900)+30)*interval '1 day')::date,20+(g%80),5+(g%180),'sellable' FROM generate_series(1,5000) g`,[t,b]);
    await db.query(`INSERT INTO sales_invoices(id,number,tenant_id,branch_id,customer_id,user_id,payment,subtotal,discount,tax,total,cost,profit,status,created_at)
      SELECT 'perf_s_'||g,'PERF-S-'||lpad(g::text,6,'0'),$1,$2,NULL,$3,'cash',100,0,0,100,50,50,'posted',now()-(g%29)*interval '1 day' FROM generate_series(1,1000) g`,[t,b,uid]);
    await db.query(`INSERT INTO sales_lines(id,sale_id,product_id,quantity,unit_price,discount,tax,net,cost,allocations)
      SELECT 'perf_sl_'||s||'_'||l,'perf_s_'||s,'perf_p_'||(((s*5+l-1)%5000)+1),1,20,0,0,20,10,'[]'::jsonb
      FROM generate_series(1,1000) s CROSS JOIN generate_series(1,5) l`);
  });
  const count=Number((await db.query(`SELECT count(*)::int c FROM cat_products WHERE tenant_id=$1`,[t])).rows[0]?.c??0);assert(count>=5000,'Performance fixture products missing');

  const seed=await elapsed(()=>seedReferenceDrugMaster(db,config.drugMasterSeedFile));assert(seed.value.count===25065,`Expected 25,065 master drugs, got ${seed.value.count}`);
  const catalogTimes=[];for(const q of['دواء','اختبار','PERF-0001000','SKU-25','الأداء'])for(let i=0;i<10;i++){const r=await elapsed(()=>root.catalog.list(t,q,50));catalogTimes.push(r.ms);assert(Array.isArray(r.value),'Catalog search failed');}
  const drugTimes=[];for(const q of['pan','para','amox','vit','622'])for(let i=0;i<10;i++){const r=await elapsed(()=>root.drugMaster.search(q,25));drugTimes.push(r.ms);assert(Array.isArray(r.value),'Drug master search failed');}
  const balanceTimes=[];for(let i=1;i<=50;i++){const r=await elapsed(()=>root.inventory.balance(t,b,`perf_p_${i*50}`));balanceTimes.push(r.ms);assert(r.value>0,'Inventory balance fixture failed');}
  const dashTimes=[];for(let i=0;i<20;i++){const r=await elapsed(()=>root.reports.dashboard(t,b));dashTimes.push(r.ms);assert(r.value.stockValue>0,'Dashboard stock value missing');}
  const stockHealth=await elapsed(()=>root.reports.stockHealth(t,b));assert(stockHealth.value.length>=5000,'Stock health result incomplete');
  const salesListTimes=[];for(let i=0;i<20;i++){const r=await elapsed(()=>root.sales.list(t,100));salesListTimes.push(r.ms);assert(r.value.length===100,'Sales list fixture incomplete');}

  const metrics={fixtureMs:fixture.ms,seedMs:seed.ms,catalogP95:percentile(catalogTimes,.95),drugP95:percentile(drugTimes,.95),balanceP95:percentile(balanceTimes,.95),dashboardP95:percentile(dashTimes,.95),salesListP95:percentile(salesListTimes,.95),stockHealthMs:stockHealth.ms};
  assert(metrics.catalogP95<800,`Catalog search p95 too slow: ${metrics.catalogP95.toFixed(0)}ms`);
  assert(metrics.drugP95<1200,`Drug search p95 too slow: ${metrics.drugP95.toFixed(0)}ms`);
  assert(metrics.balanceP95<500,`Inventory balance p95 too slow: ${metrics.balanceP95.toFixed(0)}ms`);
  assert(metrics.dashboardP95<800,`Dashboard p95 too slow: ${metrics.dashboardP95.toFixed(0)}ms`);
  assert(metrics.salesListP95<800,`Sales list p95 too slow: ${metrics.salesListP95.toFixed(0)}ms`);
  assert(metrics.stockHealthMs<8000,`Stock health too slow: ${metrics.stockHealthMs.toFixed(0)}ms`);
  console.log(`Performance drill PASS — 5,000 products/batches + 1,000 invoices/5,000 lines + 25,065 master drugs. Fixture ${metrics.fixtureMs.toFixed(0)}ms; seed ${metrics.seedMs.toFixed(0)}ms; p95 catalog ${metrics.catalogP95.toFixed(0)}ms; drug ${metrics.drugP95.toFixed(0)}ms; balance ${metrics.balanceP95.toFixed(0)}ms; dashboard ${metrics.dashboardP95.toFixed(0)}ms; sales list ${metrics.salesListP95.toFixed(0)}ms; stock-health ${metrics.stockHealthMs.toFixed(0)}ms.`);
}finally{if(db)await db.close().catch(()=>{});await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(()=>{});await admin.end().catch(()=>{});}
