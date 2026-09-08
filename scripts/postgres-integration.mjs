import{Pool}from'pg';import{randomBytes}from'node:crypto';
const raw=String(process.env.INTEGRATION_DATABASE_URL||'').trim();
if(!raw){console.error('INTEGRATION_DATABASE_URL is required. Use a disposable PostgreSQL database, never production.');process.exit(2);}
if(process.env.NODE_ENV==='production'){console.error('PostgreSQL integration drill refuses NODE_ENV=production.');process.exit(2);}
if(process.env.DATABASE_URL&&process.env.DATABASE_URL===raw){console.error('INTEGRATION_DATABASE_URL must not equal DATABASE_URL.');process.exit(2);}
const schema=`elhafez_it_${Date.now()}_${randomBytes(3).toString('hex')}`.replace(/[^a-z0-9_]/g,'');
const admin=new Pool({connectionString:raw,max:1});
let db;
try{
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const u=new URL(raw);u.searchParams.set('options',`-c search_path=${schema}`);
  const[{PostgresDatabase},{runMigrations},{migrations},{createCompositionRoot}]=await Promise.all([
    import('../dist/core/db/postgres.js'),import('../dist/core/db/migrator.js'),import('../dist/app/migrations.js'),import('../dist/app/composition-root.js'),
  ]);
  db=new PostgresDatabase(u.toString());
  await runMigrations(db,migrations);
  const applied=Number((await db.query('SELECT count(*)::int count FROM app_migrations')).rows[0]?.count??0);
  if(applied!==migrations.length)throw new Error(`Migration count mismatch ${applied}/${migrations.length}`);
  const client=await db.pool.connect();
  try{
    await client.query('BEGIN');await client.query('CREATE TABLE integration_tx_probe(id int primary key)');await client.query('INSERT INTO integration_tx_probe VALUES(1)');await client.query('ROLLBACK');
    const probe=await client.query("SELECT to_regclass('integration_tx_probe') as name");if(probe.rows[0]?.name!==null)throw new Error('Transaction rollback probe failed');
  }finally{client.release();}
  const config={env:'test',port:3000,host:'127.0.0.1',databaseUrl:u.toString(),appSecret:'integration-app-secret-32-characters-minimum',backupSecret:'integration-backup-secret-32-characters-min',sessionHours:12,allowStandaloneSetup:true,ownerProductCode:'PHARMAFLOW',drugMasterAutoSeed:false,drugMasterSeedFile:'data/drug-master-egypt-reference.csv.gz'};
  const root=createCompositionRoot(db,config);
  const branches=await root.organization.listActiveTenantBranches();
  if(branches.length!==0)throw new Error('Disposable schema should start without tenants');
  console.log(`PostgreSQL integration PASS — ${applied} migrations + transaction rollback + composition root.`);
}finally{
  if(db)await db.close().catch(()=>{});
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(()=>{});await admin.end().catch(()=>{});
}
