import type { IntegrationsRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_integrations(app:any,ctx:IntegrationsRouteDependencies){
 const {
  pool,
  crypto,
  hasAction,
  nowIso,
  needAuth,
  needPerm,
  bumpChange,
  auditDb,
  licenseFeature,
  putRecord
 }=ctx;

 // /api/integrations/status
// /api/integrations/retry
// /api/eptts/events

app.get('/api/integrations/status',needAuth,async(req,res)=>{const q=await pool.query(`SELECT kind,status,count(*)::int count FROM integration_outbox WHERE tenant_id=$1 GROUP BY kind,status ORDER BY kind,status`,[req.auth.tenantId]);const queue=q.rows.map(r=>({kind:r.kind,status:r.status,count:Number(r.count||0)}));res.json({etaEnabled:String(process.env.ETA_ENABLED).toLowerCase()==='true'&&!!process.env.ETA_TOOLKIT_URL,epttsEnabled:String(process.env.EPTTS_ENABLED).toLowerCase()==='true'&&!!process.env.EPTTS_ENDPOINT,queue});});

app.post('/api/integrations/retry',needAuth,async(req,res)=>{if(!hasAction(req.auth.user,'securitySettings')&&!['owner','admin'].includes(String(req.auth.user?.roleKey||'')))return res.status(403).json({error:'FORBIDDEN'});const q=await pool.query(`UPDATE integration_outbox SET status='pending',next_attempt_at=now(),last_error=NULL,updated_at=now() WHERE tenant_id=$1 AND status IN('failed','dead') RETURNING id`,[req.auth.tenantId]);res.json({ok:true,requeued:q.rowCount});});

app.post('/api/eptts/events',needAuth,needPerm('inventory'),async(req,res)=>{if(!await licenseFeature(pool,req.auth.tenantId,'eptts'))return res.status(402).json({error:'FEATURE_NOT_LICENSED'});const ev=req.body||{};if(!ev.eventType||!ev.code)return res.status(400).json({error:'EVENT_TYPE_AND_CODE_REQUIRED'});const id=`trk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;const rec={id,eventType:ev.eventType,code:ev.code,gtin:ev.gtin||null,serial:ev.serial||null,batchNo:ev.batchNo||null,expiry:ev.expiry||null,fromLocation:ev.fromLocation||null,toLocation:ev.toLocation||null,at:nowIso(),branchId:ev.branchId||null,userId:req.auth.user.id,userName:req.auth.user.name,status:'pending'};const c=await pool.connect();try{await c.query('BEGIN');await putRecord(c,req.auth.tenantId,'trackEvents',id,rec,0);await c.query(`INSERT INTO integration_outbox(tenant_id,kind,ref,payload) VALUES($1,'eptts_event',$2,$3::jsonb)`,[req.auth.tenantId,id,JSON.stringify(rec)]);await auditDb(c,req.auth.tenantId,req,'حدث تتبع دوائي',`${ev.eventType} • ${ev.code}`,id,rec);await bumpChange(c);await c.query('COMMIT');res.json({ok:true,event:rec})}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}});
};

export {};
