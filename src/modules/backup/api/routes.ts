import type { BackupRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_backup(app:any,ctx:BackupRouteDependencies){
 const {
  pool,
  express,
  fs,
  path,
  crypto,
  os,
  execFileAsync,
  backfillCore,
  chromiumBin,
  salePdfHtml,
  sha256,
  needAction,
  ownerProviderBrand,
  dropSessionCache,
  needAuth,
  backupKey,
  makeBackup
 }=ctx;

 // /api/print/sales/:id/pdf
// /api/admin/backup
// /api/admin/backups
// /api/admin/backups/:id/download
// /api/admin/restore

app.get('/api/print/sales/:id/pdf',needAuth,async(req,res,next)=>{let dir='';try{const q=await pool.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='sales' AND id=$2 LIMIT 1`,[req.auth.tenantId,req.params.id]);const sale=q.rows[0]?.data;if(!sale)return res.status(404).json({error:'SALE_NOT_FOUND'});const stq=await pool.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='settings' ORDER BY updated_at DESC LIMIT 1`,[req.auth.tenantId]),settings=stq.rows[0]?.data||{},provider=await ownerProviderBrand();const bin=chromiumBin();if(!bin)return res.status(503).json({error:'PDF_ENGINE_UNAVAILABLE'});dir=fs.mkdtempSync(path.join(os.tmpdir(),'elhafez-pdf-'));const htmlFile=path.join(dir,'invoice.html'),pdfFile=path.join(dir,'invoice.pdf');fs.writeFileSync(htmlFile,salePdfHtml(sale,settings,provider));await execFileAsync(bin,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--print-to-pdf-no-header',`--print-to-pdf=${pdfFile}`,`file://${htmlFile}`],{timeout:30000,maxBuffer:1024*1024});if(!fs.existsSync(pdfFile)||fs.statSync(pdfFile).size<500)throw new Error('PDF_RENDER_FAILED');const filename=`Elhafez-Pharmacy-${String(sale.no||'invoice').replace(/[^A-Za-z0-9._-]/g,'-')}.pdf`;res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);res.setHeader('Cache-Control','no-store');const stream=fs.createReadStream(pdfFile);stream.on('close',()=>fs.rm(dir,{recursive:true,force:true},()=>{}));stream.pipe(res)}catch(e){if(dir)fs.rm(dir,{recursive:true,force:true},()=>{});next(e)}});

app.post('/api/admin/backup',needAuth,needAction('backupRestore'),async(req,res)=>{const b=await makeBackup(req.auth.tenantId),{file,...safe}=b;res.json({ok:true,...safe,filename:path.basename(file),durability:b.cloudUploaded?'external+local':'local',warning:(!b.cloudUploaded&&process.env.NODE_ENV==='production')?'BACKUP_EXTERNAL_STORAGE_NOT_CONFIGURED':null})});

app.get('/api/admin/backups',needAuth,needAction('backupRestore'),async(req,res)=>{const q=await pool.query('SELECT id,sha256,bytes,encrypted,status,error,created_at FROM backup_runs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50',[req.auth.tenantId]);res.json(q.rows)});

app.get('/api/admin/backups/:id/download',needAuth,needAction('backupRestore'),async(req,res)=>{const q=await pool.query('SELECT * FROM backup_runs WHERE tenant_id=$1 AND id=$2 AND status=\'ok\'',[req.auth.tenantId,req.params.id]);const b=q.rows[0];if(!b||!b.path||!fs.existsSync(b.path))return res.status(404).json({error:'BACKUP_NOT_FOUND'});res.download(b.path,path.basename(b.path))});

app.post('/api/admin/restore',express.raw({type:'application/octet-stream',limit:'200mb'}),needAuth,needAction('backupRestore'),async(req,res,next)=>{try{
 const buf=Buffer.isBuffer(req.body)?req.body:Buffer.from(req.body||''),magic=buf.slice(0,8).toString();if(!['PFV5BKP1','PFV6BKP1','EHP7BKP1'].includes(magic))return res.status(400).json({error:'INVALID_BACKUP'});
 const iv=buf.slice(8,20),tag=buf.slice(20,36),enc=buf.slice(36),d=crypto.createDecipheriv('aes-256-gcm',backupKey(req.auth.tenantId),iv);d.setAuthTag(tag);const data=JSON.parse(Buffer.concat([d.update(enc),d.final()]).toString());if(data.tenant?.id!==req.auth.tenantId)return res.status(400).json({error:'BACKUP_TENANT_MISMATCH'});if(!Array.isArray(data.users)||!Array.isArray(data.records)||!Array.isArray(data.chartAccounts)||!Array.isArray(data.accountingPeriods))return res.status(400).json({error:'BACKUP_STRUCTURE_INVALID'});if(!(data.users||[]).some(u=>u.active!==false&&(u.pin_hash||u.password_hash)))return res.status(400).json({error:'BACKUP_HAS_NO_ACTIVE_CREDENTIAL'});if(!(data.records||[]).some(r=>r.store==='settings'))return res.status(400).json({error:'BACKUP_SETTINGS_MISSING'});
 const safety=await makeBackup(req.auth.tenantId);
 const c=await pool.connect();try{
  await c.query('BEGIN');await c.query(`SET LOCAL elhafez.audit_restore='on'`);
  for(const table of ['return_inspections','sale_batch_allocations_core','sale_lines_core','sale_documents_core','purchase_receipt_layers','purchase_lines_core','purchase_documents_core','stock_ledger_core','journal_lines_core','journal_entries_core','batches_core','products_core'])await c.query(`DELETE FROM ${table} WHERE tenant_id=$1`,[req.auth.tenantId]);
  await c.query('DELETE FROM sessions WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM report_favorites WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM user_contexts WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM payment_allocations WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM controlled_dispenses WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM integration_outbox WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM doc_sequences WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM devices WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM records WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM accounting_periods WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM chart_accounts WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM audit_logs WHERE tenant_id=$1',[req.auth.tenantId]);await c.query('DELETE FROM users WHERE tenant_id=$1',[req.auth.tenantId]);
  for(const u of data.users||[])await c.query(`INSERT INTO users(id,tenant_id,name,username,role,role_key,password_hash,pin_hash,permissions,max_discount_percent,allow_returns,allow_price_edit,allow_stock_adjust,view_cost,view_profit,allow_refund,allow_credit_sale,allow_backup_restore,allow_period_close,allow_period_reopen,allow_security_settings,allow_waste_disposal,allow_controlled_override,active,totp_secret_enc,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,[u.id,req.auth.tenantId,u.name,u.username,u.role,u.role_key,u.password_hash,u.pin_hash,JSON.stringify(u.permissions||[]),u.max_discount_percent||0,!!u.allow_returns,!!u.allow_price_edit,!!u.allow_stock_adjust,!!u.view_cost,!!u.view_profit,!!u.allow_refund,!!u.allow_credit_sale,!!u.allow_backup_restore,!!u.allow_period_close,!!u.allow_period_reopen,!!u.allow_security_settings,!!u.allow_waste_disposal,!!u.allow_controlled_override,u.active!==false,u.totp_secret_enc||null,u.created_at||new Date(),u.updated_at||new Date()]);
  for(const r of data.records||[])await c.query(`INSERT INTO records(tenant_id,store,id,branch_id,data,revision,created_at,updated_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8)`,[req.auth.tenantId,r.store,r.id,r.branch_id,JSON.stringify(r.data),r.revision||1,r.created_at||new Date(),r.updated_at||new Date()]);
  for(const p of data.accountingPeriods||[])await c.query(`INSERT INTO accounting_periods(tenant_id,from_date,to_date,status,closed_by,closed_at,created_at,reopened_by,reopened_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[req.auth.tenantId,p.from_date,p.to_date,p.status||'open',p.closed_by||null,p.closed_at||null,p.created_at||new Date(),p.reopened_by||null,p.reopened_at||null]);
  for(const a of data.chartAccounts||[])await c.query(`INSERT INTO chart_accounts(tenant_id,code,name,type,parent_code,active) VALUES($1,$2,$3,$4,$5,$6)`,[req.auth.tenantId,a.code,a.name,a.type||a.account_type||'asset',a.parent_code||null,a.active!==false]);
  for(const x of data.userContexts||[])await c.query(`INSERT INTO user_contexts(tenant_id,user_id,device_id,branch_id,cashbox_id,updated_at) VALUES($1,$2,$3,$4,$5,$6)`,[req.auth.tenantId,x.user_id,x.device_id||'',x.branch_id||null,x.cashbox_id||null,x.updated_at||new Date()]);
  for(const x of data.paymentAllocations||[])await c.query(`INSERT INTO payment_allocations(tenant_id,payment_kind,payment_id,counterparty_id,document_store,document_id,amount,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[req.auth.tenantId,x.payment_kind,x.payment_id,x.counterparty_id||null,x.document_store,x.document_id,x.amount,x.created_at||new Date()]);
  for(const x of data.controlledDispenses||[])await c.query(`INSERT INTO controlled_dispenses(tenant_id,sale_id,sale_no,product_id,product_name,batch_id,batch_no,serial_code,qty_base,patient_name,patient_id_no,prescription_no,prescription_date,doctor_name,doctor_license_no,compliance_document,user_id,user_name,branch_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,[req.auth.tenantId,x.sale_id,x.sale_no,x.product_id,x.product_name,x.batch_id,x.batch_no,x.serial_code,x.qty_base,x.patient_name,x.patient_id_no,x.prescription_no,x.prescription_date,x.doctor_name,x.doctor_license_no,x.compliance_document,x.user_id,x.user_name,x.branch_id,x.created_at||new Date()]);
  for(const x of data.devices||[])await c.query(`INSERT INTO devices(id,tenant_id,name,first_seen_at,last_seen_at,last_ip,user_agent,trusted,disabled) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[x.id,req.auth.tenantId,x.name,x.first_seen_at||new Date(),x.last_seen_at||new Date(),x.last_ip,x.user_agent,!!x.trusted,!!x.disabled]);
  for(const x of data.docSequences||[])await c.query(`INSERT INTO doc_sequences(tenant_id,branch_id,doc_type,next_value) VALUES($1,$2,$3,$4)`,[req.auth.tenantId,x.branch_id||'',x.doc_type,x.next_value||1]);
  for(const x of data.integrationOutbox||[])await c.query(`INSERT INTO integration_outbox(tenant_id,kind,ref,payload,status,attempts,next_attempt_at,external_id,last_error,created_at,updated_at) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11)`,[req.auth.tenantId,x.kind,x.ref,JSON.stringify(x.payload||{}),x.status||'pending',x.attempts||0,x.next_attempt_at||new Date(),x.external_id,x.last_error,x.created_at||new Date(),x.updated_at||new Date()]);
  for(const x of data.reportFavorites||[])await c.query(`INSERT INTO report_favorites(tenant_id,user_id,report_key,created_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[req.auth.tenantId,x.user_id,x.report_key,x.created_at||new Date()]);
  for(const x of data.auditLogs||[])await c.query(`INSERT INTO audit_logs(tenant_id,branch_id,user_id,user_name,device_id,action,detail,ref,payload,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,[req.auth.tenantId,x.branch_id,x.user_id,x.user_name,x.device_id,x.action,x.detail,x.ref,JSON.stringify(x.payload||null),x.created_at||new Date()]);
  await c.query(`INSERT INTO audit_logs(tenant_id,user_id,user_name,device_id,action,detail,ref,payload) VALUES($1,$2,$3,$4,'استعادة نسخة احتياطية',$5,$6,$7::jsonb)`,[req.auth.tenantId,req.auth.user.id,req.auth.user.name,req.headers['x-device-id']||null,`تمت الاستعادة بعد إنشاء نسخة أمان ${safety.id}`,String(safety.id),JSON.stringify({safetyBackupId:safety.id,safetyBackupSha256:safety.sha256,restoredBackupVersion:data.version||null})]);
  if(data.tenant?.name)await c.query('UPDATE tenants SET name=$2,updated_at=now() WHERE id=$1',[req.auth.tenantId,data.tenant.name]);
  await c.query('COMMIT');
  dropSessionCache();await backfillCore(pool,{force:true});res.clearCookie('pf_session',{path:'/'});res.json({ok:true,restoredAt:new Date().toISOString(),requiresLogin:true,safetyBackupId:safety.id,safetyBackupSha256:safety.sha256});
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}catch(e){next(e)}});
};

export {};
