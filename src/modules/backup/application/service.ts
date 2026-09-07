import type { BackupServiceDependencies } from '../contracts/dependencies';
'use strict';
module.exports=function create_backup_service(ctx:BackupServiceDependencies){
 const {
  pool,
  rootDir,
  APP_VERSION,
  APP_SECRET,
  fs,
  path,
  crypto
 }=ctx;
 const sha256=(...args)=>ctx.sha256(...args);
 const nowIso=(...args)=>ctx.nowIso(...args);


function backupKey(tenantId:any){return crypto.createHash('sha256').update((process.env.BACKUP_SECRET||APP_SECRET)+tenantId).digest()}

async function makeBackup(tenantId:any){
 const c=await pool.connect();let id;
 try{
  const run=await c.query(`INSERT INTO backup_runs(tenant_id,status) VALUES($1,'running') RETURNING id`,[tenantId]);id=run.rows[0].id;
  const qs=await Promise.all([
   c.query('SELECT * FROM tenants WHERE id=$1',[tenantId]),c.query('SELECT * FROM users WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM records WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM accounting_periods WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM chart_accounts WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM audit_logs WHERE tenant_id=$1 ORDER BY seq',[tenantId]),c.query('SELECT * FROM controlled_dispenses WHERE tenant_id=$1 ORDER BY id',[tenantId]),c.query('SELECT * FROM user_contexts WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM payment_allocations WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM devices WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM doc_sequences WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM integration_outbox WHERE tenant_id=$1',[tenantId]),c.query('SELECT * FROM report_favorites WHERE tenant_id=$1',[tenantId])
  ]);
  const [tenant,users,records,periods,coa,audit,controlled,contexts,allocations,devices,sequences,outbox,reportFavorites]=qs;
  const payload={app:'Elhafez Pharmacy',format:7,version:APP_VERSION,exportedAt:nowIso(),tenant:tenant.rows[0],users:users.rows,records:records.rows,accountingPeriods:periods.rows,chartAccounts:coa.rows,auditLogs:audit.rows,controlledDispenses:controlled.rows,userContexts:contexts.rows,paymentAllocations:allocations.rows,devices:devices.rows,docSequences:sequences.rows,integrationOutbox:outbox.rows,reportFavorites:reportFavorites.rows};
  const data=Buffer.from(JSON.stringify(payload)),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',backupKey(tenantId),iv),enc=Buffer.concat([cipher.update(data),cipher.final()]),tag=cipher.getAuthTag(),out=Buffer.concat([Buffer.from('EHP7BKP1'),iv,tag,enc]);
  const dir=process.env.BACKUP_DIR||path.join(rootDir,'backups');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`elhafez-pharmacy-${tenantId}-${new Date().toISOString().replace(/[:.]/g,'-')}.ehpb`);fs.writeFileSync(file,out);const sum=sha256(out);let cloudUploaded=false;
  if(process.env.BACKUP_UPLOAD_URL){const base=process.env.BACKUP_UPLOAD_URL,uploadUrl=base.endsWith('/')?base+encodeURIComponent(path.basename(file)):base,hh:any={'content-type':'application/octet-stream','x-elhafez-sha256':sum};if(process.env.BACKUP_UPLOAD_TOKEN)hh.authorization=`Bearer ${process.env.BACKUP_UPLOAD_TOKEN}`;const ur=await fetch(uploadUrl,{method:'PUT',headers:hh,body:out,signal:AbortSignal.timeout(60000)});if(!ur.ok)throw new Error(`Cloud backup upload failed: ${ur.status}`);cloudUploaded=true}
  await c.query(`UPDATE backup_runs SET path=$2,sha256=$3,bytes=$4,encrypted=true,status='ok' WHERE id=$1`,[id,file,sum,out.length]);return{id,file,sha256:sum,bytes:out.length,cloudUploaded}
 }catch(e){if(id)await c.query(`UPDATE backup_runs SET status='failed',error=$2 WHERE id=$1`,[id,e.message]).catch(()=>{});throw e}finally{c.release()}
}

 return {backupKey,makeBackup};
};

export {};
