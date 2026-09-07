import type { PlatformRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_platform(app:any,ctx:PlatformRouteDependencies){
 const {
  pool,
  APP_VERSION,
  crypto,
  sha256,
  needAction,
  rateLimit,
  firstTenant,
  needAuth,
  needPerm,
  encryptSecret,
  compareVersions
 }=ctx;

 // /api/license
// /api/license/activate
// /api/system/update
// /api/system/update/apply
// /api/diagnostics/client-error
// /api/diagnostics/errors
// /api/diagnostics/performance
// /api/diagnostics/pilot/concurrency

app.get('/api/license',needAuth,async(req,res)=>{const q=await pool.query('SELECT plan,status,max_branches,max_users,features,expires_at,last_checked_at FROM licenses WHERE tenant_id=$1',[req.auth.tenantId]);res.json(q.rows[0]||{})});

app.post('/api/license/activate',needAuth,needPerm('settings'),needAction('securitySettings'),async(req,res)=>{const key=String(req.body?.licenseKey||process.env.LICENSE_KEY||'');if(!key)return res.status(400).json({error:'LICENSE_KEY_REQUIRED'});let claims=null;if(process.env.LICENSE_SERVER_URL){const r=await fetch(process.env.LICENSE_SERVER_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({licenseKey:key,instance:req.headers.host,version:APP_VERSION})});if(!r.ok)return res.status(502).json({error:'LICENSE_SERVER_REJECTED',detail:await r.text()});claims=await r.json()}else if(process.env.LICENSE_KEY&&crypto.timingSafeEqual(Buffer.from(sha256(key)),Buffer.from(sha256(process.env.LICENSE_KEY))))claims={plan:'professional',status:'active',maxBranches:10,maxUsers:50,features:{cloud:true,offline:true,eta:true,eptts:true}};else return res.status(503).json({error:'LICENSE_SERVER_NOT_CONFIGURED'});await pool.query(`UPDATE licenses SET license_key_hash=$2,license_key_enc=$10,plan=$3,status=$4,max_branches=$5,max_users=$6,features=$7::jsonb,expires_at=$8,last_checked_at=now(),raw_claims=$9::jsonb WHERE tenant_id=$1`,[req.auth.tenantId,sha256(key),claims.plan||'professional',claims.status||'active',Number(claims.maxBranches||10),Number(claims.maxUsers||50),JSON.stringify(claims.features||{}),claims.expiresAt||null,JSON.stringify(claims),encryptSecret(key)]);res.json({ok:true,claims})});

app.get('/api/system/update',needAuth,async(req,res)=>{if(!process.env.UPDATE_MANIFEST_URL)return res.json({current:APP_VERSION,channel:process.env.RELEASE_CHANNEL||'stable',configured:false});try{const r=await fetch(process.env.UPDATE_MANIFEST_URL,{headers:{'user-agent':`Elhafez-Pharmacy/${APP_VERSION}`}});const m=await r.json(),newer=!!m.version&&compareVersions(m.version,APP_VERSION)>0;res.json({current:APP_VERSION,channel:process.env.RELEASE_CHANNEL||'stable',configured:true,updateAvailable:newer,manifest:newer?m:null,latestSeen:m.version||null})}catch(e){res.status(502).json({error:'UPDATE_CHECK_FAILED',detail:e.message,current:APP_VERSION})}});

app.post('/api/system/update/apply',needAuth,needPerm('settings'),needAction('securitySettings'),async(req,res)=>{if(!process.env.UPDATE_MANIFEST_URL||!process.env.UPDATE_DEPLOY_WEBHOOK_URL)return res.status(400).json({error:'UPDATE_APPLY_NOT_CONFIGURED'});const mr=await fetch(process.env.UPDATE_MANIFEST_URL,{headers:{'user-agent':`Elhafez-Pharmacy/${APP_VERSION}`}});if(!mr.ok)return res.status(502).json({error:'MANIFEST_UNAVAILABLE'});const m=await mr.json();if(!m.version)return res.status(400).json({error:'INVALID_MANIFEST'});if(compareVersions(m.version,APP_VERSION)<=0)return res.status(409).json({error:'UPDATE_NOT_NEWER',current:APP_VERSION,target:m.version});if(process.env.UPDATE_SIGNING_SECRET){const msg=`${m.version}|${m.artifact||m.image||''}`,sig=crypto.createHmac('sha256',process.env.UPDATE_SIGNING_SECRET).update(msg).digest('hex');const ms=String(m.signature||'');if(ms.length!==sig.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(ms)))return res.status(400).json({error:'UPDATE_SIGNATURE_INVALID'})}else if(process.env.NODE_ENV==='production')return res.status(400).json({error:'UPDATE_SIGNING_SECRET_REQUIRED'});const r=await fetch(process.env.UPDATE_DEPLOY_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:m.version,artifact:m.artifact||m.image||null,channel:process.env.RELEASE_CHANNEL||'stable',instance:req.headers.host})});if(!r.ok)return res.status(502).json({error:'DEPLOY_TRIGGER_FAILED',detail:(await r.text()).slice(0,1000)});await pool.query(`INSERT INTO audit_logs(tenant_id,user_id,user_name,device_id,action,detail) VALUES($1,$2,$3,$4,'طلب تحديث مركزي',$5)`,[req.auth.tenantId,req.auth.user.id,req.auth.user.name,req.headers['x-device-id']||null,`إلى ${m.version}`]);res.json({ok:true,targetVersion:m.version})});

app.post('/api/diagnostics/client-error',async(req,res)=>{if(!rateLimit(`client-error:${req.ip}`,30,10*60_000))return res.status(429).json({error:'TOO_MANY_ERRORS'});const t=req.auth?{id:req.auth.tenantId}:await firstTenant();const msg=String(req.body?.message||'Client error').slice(0,4000),ctx=req.body?.context||{};await pool.query(`INSERT INTO client_errors(tenant_id,user_id,device_id,message,stack,page,context) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,[t?.id||null,req.auth?.user?.id||null,req.headers['x-device-id']||null,msg,String(req.body?.stack||'').slice(0,16000),String(req.body?.page||'').slice(0,500),JSON.stringify(ctx)]);if(process.env.VENDOR_TELEMETRY_URL)fetch(process.env.VENDOR_TELEMETRY_URL,{method:'POST',headers:{'content-type':'application/json',...(process.env.VENDOR_TELEMETRY_TOKEN?{'x-telemetry-token':process.env.VENDOR_TELEMETRY_TOKEN}:{})},body:JSON.stringify({instance:req.headers.host,level:'error',message:msg,payload:{page:req.body?.page,context:ctx,version:APP_VERSION}})}).catch(()=>{});res.json({ok:true})});

app.get('/api/diagnostics/errors',needAuth,needPerm('settings'),async(req,res)=>{const q=await pool.query('SELECT * FROM client_errors WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 200',[req.auth.tenantId]);res.json(q.rows)});

app.get('/api/diagnostics/performance',needAuth,needPerm('settings'),async(req,res)=>{const started=Date.now(),t0=Date.now();await pool.query('SELECT 1');const dbMs=Date.now()-t0,t1=Date.now();await firstTenant();const tenantMs=Date.now()-t1;res.json({ok:true,totalMs:Date.now()-started,dbMs,tenantLookupMs:tenantMs,pool:{total:pool.totalCount,idle:pool.idleCount,waiting:pool.waitingCount},version:APP_VERSION})});

app.post('/api/diagnostics/pilot/concurrency',needAuth,needPerm('settings'),async(req,res)=>{const requests=Math.max(5,Math.min(100,Number(req.body?.requests||40))),started=Date.now();try{await Promise.all(Array.from({length:requests},(_,i)=>pool.query('SELECT $1::int AS n',[i])));const elapsedMs=Date.now()-started;res.json({ok:true,requests,elapsedMs,poolMax:Number(process.env.PGPOOL_MAX||20)})}catch(e){res.status(500).json({ok:false,error:e.message,requests,elapsedMs:Date.now()-started,poolMax:Number(process.env.PGPOOL_MAX||20)})}});
};

export {};
