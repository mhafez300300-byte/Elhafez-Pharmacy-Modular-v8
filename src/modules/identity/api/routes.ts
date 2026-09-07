import type { IdentityRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_auth(app:any,ctx:IdentityRouteDependencies){
 const {
  pool,
  path,
  crypto,
  cookie,
  sha256,
  scryptHash,
  verifyHash,
  safeUser,
  rateLimit,
  firstTenant,
  dropSessionCache,
  needAuth,
  auditDb,
  base32Encode,
  encryptSecret,
  decryptSecret,
  verifyTotp,
  issueSession,
  verifyCurrentCredential
 }=ctx;

 // /api/auth/login
// /api/auth/logout
// /api/auth/totp/setup
// /api/auth/totp/enable
// /api/auth/totp/disable
// /api/auth/change-secret

app.post('/api/auth/login',async(req,res)=>{if(!rateLimit(`login:${req.ip}`,12,5*60_000))return res.status(429).json({error:'TOO_MANY_ATTEMPTS'});const t=await firstTenant();if(!t)return res.status(400).json({error:'SETUP_REQUIRED'});const {userId,username,secret,pin,password,totp}=req.body||{};const q=await pool.query('SELECT * FROM users WHERE tenant_id=$1 AND (id=$2 OR lower(username)=lower($3)) LIMIT 1',[t.id,userId||'',username||'']);const u=q.rows[0];if(!u||!u.active)return res.status(401).json({error:'INVALID_CREDENTIALS'});if(u.locked_until&&new Date(u.locked_until)>new Date())return res.status(423).json({error:'ACCOUNT_LOCKED'});const s=String(secret??pin??password??'');const ok=(u.pin_hash&&verifyHash(s,u.pin_hash))||(u.password_hash&&verifyHash(s,u.password_hash));if(!ok){const n=Number(u.failed_attempts||0)+1;await pool.query(`UPDATE users SET failed_attempts=$2,locked_until=CASE WHEN $2>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=$1`,[u.id,n]);return res.status(401).json({error:'INVALID_CREDENTIALS'})}if(u.totp_secret_enc&&!verifyTotp(decryptSecret(u.totp_secret_enc),totp))return res.status(401).json({error:'TOTP_REQUIRED'});const c=await pool.connect();try{await c.query('BEGIN');await c.query('UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=$1',[u.id]);await issueSession(c,res,req,t.id,u.id);await auditDb(c,t.id,req,'تسجيل دخول',u.name,null,null,safeUser(u));await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}res.json({ok:true,user:safeUser(u)})});

app.post('/api/auth/logout',needAuth,async(req,res)=>{const tok=cookie(req,'pf_session');await pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[req.auth.sessionId]);if(tok)dropSessionCache(sha256(tok));res.clearCookie('pf_session',{path:'/'});res.json({ok:true})});

app.post('/api/auth/totp/setup',needAuth,async(req,res)=>{const secret=base32Encode(crypto.randomBytes(20));const t=await firstTenant();const label=encodeURIComponent(`${t?.name||'Elhafez Pharmacy'}:${req.auth.user.username||req.auth.user.name}`),issuer=encodeURIComponent(t?.name||'Elhafez Pharmacy');res.json({secret,otpauth:`otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`})});

app.post('/api/auth/totp/enable',needAuth,async(req,res)=>{const secret=String(req.body?.secret||''),code=String(req.body?.code||''),current=String(req.body?.currentSecret||'');if(!await verifyCurrentCredential(req.auth.tenantId,req.auth.user.id,current))return res.status(401).json({error:'CURRENT_CREDENTIAL_INVALID'});if(!verifyTotp(secret,code))return res.status(400).json({error:'INVALID_TOTP'});await pool.query('UPDATE users SET totp_secret_enc=$2,updated_at=now() WHERE tenant_id=$1 AND id=$3',[req.auth.tenantId,encryptSecret(secret),req.auth.user.id]);res.json({ok:true})});

app.post('/api/auth/totp/disable',needAuth,async(req,res)=>{const current=String(req.body?.currentSecret||''),code=String(req.body?.code||'');if(!await verifyCurrentCredential(req.auth.tenantId,req.auth.user.id,current))return res.status(401).json({error:'CURRENT_CREDENTIAL_INVALID'});const u=(await pool.query('SELECT totp_secret_enc FROM users WHERE tenant_id=$1 AND id=$2',[req.auth.tenantId,req.auth.user.id])).rows[0];if(u?.totp_secret_enc&&!verifyTotp(decryptSecret(u.totp_secret_enc),code))return res.status(400).json({error:'INVALID_TOTP'});await pool.query('UPDATE users SET totp_secret_enc=NULL,updated_at=now() WHERE tenant_id=$1 AND id=$2',[req.auth.tenantId,req.auth.user.id]);res.json({ok:true})});

app.post('/api/auth/change-secret',needAuth,async(req,res)=>{const kind=req.body?.kind==='password'?'password_hash':'pin_hash',value=String(req.body?.value||''),current=String(req.body?.currentSecret||'');if(!await verifyCurrentCredential(req.auth.tenantId,req.auth.user.id,current))return res.status(401).json({error:'CURRENT_CREDENTIAL_INVALID'});if(kind==='pin_hash'&&!/^\d{4,8}$/.test(value))return res.status(400).json({error:'PIN_INVALID'});if(kind==='password_hash'&&value.length<10)return res.status(400).json({error:'PASSWORD_TOO_SHORT'});await pool.query(`UPDATE users SET ${kind}=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2`,[req.auth.tenantId,req.auth.user.id,scryptHash(value)]);await pool.query('UPDATE sessions SET revoked_at=now() WHERE tenant_id=$1 AND user_id=$2 AND id<>$3',[req.auth.tenantId,req.auth.user.id,req.auth.sessionId]);dropSessionCache();res.json({ok:true})});
};

export {};
