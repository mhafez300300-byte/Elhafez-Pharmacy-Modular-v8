import type { IdentityServiceDependencies } from '../contracts/dependencies';
'use strict';
module.exports=function create_auth_service(ctx:IdentityServiceDependencies){
 const {
  pool,
  APP_VERSION,
  APP_SECRET,
  path,
  crypto,
  STORE_PERMISSION,
  READ_DEPS
 }=ctx;
 const sha256=(...args)=>ctx.sha256(...args);
 const randomToken=(...args)=>ctx.randomToken(...args);
const rate=new Map(),RATE_MAX_KEYS=Math.max(1000,Number(process.env.RATE_LIMIT_MAX_KEYS||10000));
let tenantCache=null,tenantCacheAt=0,tenantPromise=null;const TENANT_CACHE_MS=60000;
let providerBrandCache={at:0,data:null};
const sessionCache=new Map(),SESSION_CACHE_MS=4000;

function cookie(req:any,name:any){const raw=req.headers.cookie||'';for(const p of raw.split(';')){const i=p.indexOf('=');if(i>0&&p.slice(0,i).trim()===name)return decodeURIComponent(p.slice(i+1).trim())}return null}

function scryptHash(secret:any){const salt=crypto.randomBytes(16).toString('hex');const key=crypto.scryptSync(String(secret),salt,64).toString('hex');return `scrypt$${salt}$${key}`}

function verifyHash(secret:any,encoded:any){try{if(!encoded)return false;if(!String(encoded).startsWith('scrypt$'))return false;const[,salt,want]=encoded.split('$');if(!salt||!want||want.length!==128)return false;const got=crypto.scryptSync(String(secret),salt,64).toString('hex');return crypto.timingSafeEqual(Buffer.from(got,'hex'),Buffer.from(want,'hex'))}catch{return false}}

function safeUser(r:any){if(!r)return null;return{id:r.id,name:r.name,username:r.username,role:r.role,roleKey:r.role_key,permissions:r.permissions||[],maxDiscountPercent:Number(r.max_discount_percent||0),allowReturns:!!r.allow_returns,allowPriceEdit:!!r.allow_price_edit,allowStockAdjust:!!r.allow_stock_adjust,viewCost:!!r.view_cost,viewProfit:!!r.view_profit,allowRefund:!!r.allow_refund,allowCreditSale:!!r.allow_credit_sale,allowBackupRestore:!!r.allow_backup_restore,allowPeriodClose:!!r.allow_period_close,allowPeriodReopen:!!r.allow_period_reopen,allowSecuritySettings:!!r.allow_security_settings,allowWasteDisposal:!!r.allow_waste_disposal,allowControlledOverride:!!r.allow_controlled_override,active:r.active,totpEnabled:!!r.totp_secret_enc,createdAt:r.created_at}}

function hasPerm(user:any,perm:any){const ps=user?.permissions||[];return ps.includes('*')||ps.includes(perm)||perm==='dashboard'}

function hasAction(user:any,action:any){if(['owner','admin'].includes(String(user?.roleKey||'')))return true;const map={returns:'allowReturns',refund:'allowRefund',priceEdit:'allowPriceEdit',stockAdjust:'allowStockAdjust',viewCost:'viewCost',viewProfit:'viewProfit',creditSale:'allowCreditSale',backupRestore:'allowBackupRestore',periodClose:'allowPeriodClose',periodReopen:'allowPeriodReopen',securitySettings:'allowSecuritySettings',wasteDisposal:'allowWasteDisposal',controlledOverride:'allowControlledOverride'};return !!user?.[map[action]||action]}

function needAction(action:any){return(req,res,next)=>hasAction(req.auth?.user,action)?next():res.status(403).json({error:'FORBIDDEN_ACTION',action})}

function canReadStore(user:any,store:any){if(!user)return ['settings','branches','users'].includes(store);if(user.permissions?.includes('*'))return true;const own=STORE_PERMISSION[store];if(own&&hasPerm(user,own))return true;for(const p of user.permissions||[])if(READ_DEPS[p]?.has(store))return true;return false}

function canWriteStore(user:any,store:any){if(!user)return false;if(user.permissions?.includes('*'))return true;if(store==='shortageNotes'&&(hasPerm(user,'shortage_notebook')||hasPerm(user,'pos')||hasPerm(user,'reorder')))return true;if(store==='pushList'&&(hasPerm(user,'push_list')||hasPerm(user,'offers')))return true;return hasPerm(user,STORE_PERMISSION[store]||store)}

function sanitizeRecord(v:any){const x=JSON.parse(JSON.stringify(v||{}));delete x._serverRevision;delete x.pin;delete x.password;delete x.setupKey;return x}

function rowValue(row:any){return row?{...row.data,_serverRevision:Number(row.revision)}:null}

function redactRecordForUser(store:any,value:any,user:any){
 const x=JSON.parse(JSON.stringify(value||{}));
 const hideCost=!hasAction(user,'viewCost'),hideProfit=!hasAction(user,'viewProfit');
 if(hideCost){
   if(store==='products'){for(const k of ['buyPrice','purchasePrice','averageCost','avgCost','lastPurchasePrice','cost'])delete x[k]}
   if(store==='batches'){for(const k of ['costPerBase','originalCostPerBase','receivedCost','purchaseCost'])delete x[k]}
   if(store==='sales'){
     for(const k of ['cost','returnedCost'])delete x[k];
     for(const l of x.lines||[])for(const a of l.allocations||[])delete a.costPerBase;
   }
   if(store==='returns'){for(const k of ['cost','costRestored'])delete x[k]}
 }
 if(hideProfit){for(const k of ['grossProfit','profit','margin','profitPercent'])delete x[k]}
 return x;
}

function originOkay(req:any){if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return true;const origin=req.headers.origin;if(origin){try{const u=new URL(origin);return u.host===req.headers.host}catch{return false}}const site=String(req.headers['sec-fetch-site']||'').toLowerCase();return !site||site==='same-origin'||site==='same-site'||site==='none'}

function rateLimit(key:any,limit:any=20,windowMs:any=60_000){const n=Date.now();if(rate.size>RATE_MAX_KEYS){for(const [k,v] of rate){if(n>v.reset)rate.delete(k);if(rate.size<=RATE_MAX_KEYS)break}while(rate.size>RATE_MAX_KEYS)rate.delete(rate.keys().next().value)}const v=rate.get(key)||{n:0,reset:n+windowMs};if(n>v.reset){v.n=0;v.reset=n+windowMs}v.n++;rate.set(key,v);return v.n<=limit}

async function firstTenant(client:any=pool){if(client===pool&&tenantCache&&Date.now()-tenantCacheAt<TENANT_CACHE_MS)return tenantCache;if(client===pool&&tenantPromise)return tenantPromise;const load=async()=>{const r=await client.query('SELECT * FROM tenants ORDER BY created_at LIMIT 1');const t=r.rows[0]||null;if(client===pool&&t){tenantCache=t;tenantCacheAt=Date.now()}return t};if(client!==pool)return load();tenantPromise=load().finally(()=>{tenantPromise=null});return tenantPromise}

function standaloneSetupAllowed(){return String(process.env.ALLOW_STANDALONE_SETUP||'').toLowerCase()==='true'}

function ownerSetupMeta(){return{ownerManaged:!!(process.env.LICENSE_SERVER_URL&&process.env.LICENSE_KEY&&process.env.OWNER_CUSTOMER_NAME),ownerCompanyName:process.env.OWNER_CUSTOMER_NAME||'',ownerCompanyCode:process.env.OWNER_CUSTOMER_CODE||'',ownerCenterUrl:process.env.OWNER_CENTER_URL||'',productCode:process.env.OWNER_PRODUCT_CODE||'ELHAFEZ_PHARMACY',standaloneAllowed:standaloneSetupAllowed()}}

function normalizeProviderBrand(x:any={}){const p=x&&typeof x==='object'?x:{};return{enabled:p.enabled!==false,name:String(p.name||'Elhafez Technology').trim().slice(0,180),phone:String(p.phone||'').trim().slice(0,100),whatsapp:String(p.whatsapp||'').trim().slice(0,100),email:String(p.email||'').trim().slice(0,180),website:String(p.website||'').trim().slice(0,250),extra:String(p.extra||'').trim().slice(0,1200)}}

async function ownerProviderBrand(force:any=false){const now=Date.now();if(!force&&providerBrandCache.data&&now-providerBrandCache.at<5*60_000)return providerBrandCache.data;const base=String(process.env.OWNER_CENTER_URL||'').replace(/\/$/,'');let data=null;if(base){try{const r=await fetch(`${base}/api/branding`,{headers:{'user-agent':`Elhafez-Pharmacy/${APP_VERSION}`},signal:AbortSignal.timeout(3000),cache:'no-store'});if(r.ok){const b=await r.json();data=normalizeProviderBrand(b.providerReceipt||{})}}catch{}}if(!data)data=providerBrandCache.data||normalizeProviderBrand({name:process.env.PROVIDER_BRAND_NAME||'Elhafez Technology',phone:process.env.PROVIDER_BRAND_PHONE||'',whatsapp:process.env.PROVIDER_BRAND_WHATSAPP||'',email:process.env.PROVIDER_BRAND_EMAIL||'',website:process.env.PROVIDER_BRAND_WEBSITE||'',extra:process.env.PROVIDER_BRAND_EXTRA||''});providerBrandCache={at:now,data};return data}

async function ownerManagedClaims(){
 const meta=ownerSetupMeta();
 if(!meta.ownerManaged){if(meta.standaloneAllowed)return null;throw Object.assign(new Error('OWNER_ACTIVATION_REQUIRED'),{status:412})}
 const r=await fetch(process.env.LICENSE_SERVER_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({licenseKey:process.env.LICENSE_KEY,instance:process.env.INSTANCE_NAME||'elhafez-pharmacy',version:APP_VERSION,productCode:process.env.OWNER_PRODUCT_CODE||'ELHAFEZ_PHARMACY'}),signal:AbortSignal.timeout(15000)});
 if(!r.ok){let detail='';try{detail=await r.text()}catch{}throw Object.assign(new Error('OWNER_LICENSE_REJECTED'),{status:r.status===403?403:502,detail})}
 const claims=await r.json();
 if(!['active','trial'].includes(String(claims.status||'active').toLowerCase()))throw Object.assign(new Error('OWNER_SUBSCRIPTION_INACTIVE'),{status:403});
 return claims;
}

function dropSessionCache(tokenHash:any=''){for(const k of sessionCache.keys())if(!tokenHash||k.startsWith(tokenHash+'|'))sessionCache.delete(k)}

async function loadSession(req:any){const tok=cookie(req,'pf_session');if(!tok)return null;const h=sha256(tok),requestDevice=String(req.headers['x-device-id']||''),ck=`${h}|${requestDevice}`,hit=sessionCache.get(ck);if(hit&&Date.now()-hit.at<SESSION_CACHE_MS)return hit.value instanceof Promise?await hit.value:hit.value;const work=(async()=>{const q=await pool.query(`SELECT s.*,u.name,u.username,u.role,u.role_key,u.permissions,u.max_discount_percent,u.allow_returns,u.allow_price_edit,u.allow_stock_adjust,u.view_cost,u.view_profit,u.allow_refund,u.allow_credit_sale,u.allow_backup_restore,u.allow_period_close,u.allow_period_reopen,u.allow_security_settings,u.allow_waste_disposal,u.allow_controlled_override,u.active,u.totp_secret_enc
FROM sessions s JOIN users u ON u.id=s.user_id AND u.tenant_id=s.tenant_id
WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active=true AND NOT EXISTS (SELECT 1 FROM devices d WHERE d.tenant_id=s.tenant_id AND d.id=s.device_id AND d.disabled=true)`,[h]);if(!q.rowCount)return null;const r=q.rows[0];if(r.device_id&&requestDevice&&r.device_id!==requestDevice)return null;pool.query('UPDATE sessions SET last_seen_at=now() WHERE id=$1',[r.id]).catch(()=>{});return{sessionId:r.id,tenantId:r.tenant_id,user:safeUser(r)}})();sessionCache.set(ck,{at:Date.now(),value:work});const out=await work;sessionCache.set(ck,{at:Date.now(),value:out});return out}

async function authOptional(req:any,res:any,next:any){try{req.auth=await loadSession(req);next()}catch(e){next(e)}}

function needAuth(req:any,res:any,next:any){if(!req.auth)return res.status(401).json({error:'AUTH_REQUIRED'});next()}

function needPerm(p:any){return(req,res,next)=>hasPerm(req.auth?.user,p)?next():res.status(403).json({error:'FORBIDDEN',permission:p})}

async function bumpChange(client:any){await client.query(`UPDATE system_state SET value=jsonb_build_object('value',COALESCE((value->>'value')::bigint,0)+1),updated_at=now() WHERE key='change_seq'`)}

async function auditDb(client:any,tenantId:any,req:any,action:any,detail:any,ref:any=null,payload:any=null,userOverride:any=null){const u=userOverride||req.auth?.user;await client.query(`INSERT INTO audit_logs(tenant_id,branch_id,user_id,user_name,device_id,action,detail,ref,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[tenantId,payload?.branchId||null,u?.id||null,u?.name||'SYSTEM',req.headers['x-device-id']||null,action,detail||'',ref,payload?JSON.stringify(payload):null])}

async function checkLicenseLimit(client:any,tenantId:any,kind:any){const l=(await client.query('SELECT * FROM licenses WHERE tenant_id=$1',[tenantId])).rows[0];if(!l)return;const field=kind==='users'?'max_users':'max_branches';const max=Number(l[field]||0);if(max<=0)return;const count=kind==='users'?(await client.query('SELECT count(*) FROM users WHERE tenant_id=$1 AND active=true',[tenantId])).rows[0].count:(await client.query(`SELECT count(*) FROM records WHERE tenant_id=$1 AND store='branches' AND COALESCE((data->>'active')::boolean,true)=true`,[tenantId])).rows[0].count;if(Number(count)>=max)throw Object.assign(new Error(`LICENSE_${kind.toUpperCase()}_LIMIT`),{status:402})}

function base32Decode(s:any){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of String(s||'').replace(/=+$/,'').toUpperCase()){const n=a.indexOf(c);if(n<0)continue;bits+=n.toString(2).padStart(5,'0')}const out=[];for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(out)}

function base32Encode(buf:any){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=[...buf].map(b=>b.toString(2).padStart(8,'0')).join(''),out='';for(let i=0;i<bits.length;i+=5)out+=a[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];return out}

function encryptSecret(secret:any){const key=crypto.createHash('sha256').update(APP_SECRET).digest(),iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([c.update(String(secret)),c.final()]),tag=c.getAuthTag();return [iv,tag,data].map(x=>x.toString('base64url')).join('.')}

function decryptSecret(enc:any){if(!enc)return null;try{const [iv,tag,data]=enc.split('.');const key=crypto.createHash('sha256').update(APP_SECRET).digest();const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));d.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([d.update(Buffer.from(data,'base64url')),d.final()]).toString()}catch{return null}}

function verifyTotp(secret:any,code:any){if(!secret||!code)return false;const key=base32Decode(secret),step=Math.floor(Date.now()/30000);for(let d=-1;d<=1;d++){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(step+d));const h=crypto.createHmac('sha1',key).update(b).digest(),o=h[h.length-1]&15,n=(h.readUInt32BE(o)&0x7fffffff)%1_000_000;if(String(n).padStart(6,'0')===String(code).padStart(6,'0'))return true}return false}

async function issueSession(client:any,res:any,req:any,tenantId:any,userId:any){const token=randomToken(),hours=Math.max(1,Number(process.env.SESSION_HOURS||12));await client.query(`INSERT INTO sessions(tenant_id,user_id,token_hash,device_id,ip,user_agent,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+($7||' hours')::interval)`,[tenantId,userId,sha256(token),req.headers['x-device-id']||null,req.ip||null,req.headers['user-agent']||null,String(hours)]);res.cookie('pf_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:hours*3600_000,path:'/'});return token}

async function ensureLicenseWritable(client:any,tenantId:any){const l=(await client.query('SELECT status,expires_at FROM licenses WHERE tenant_id=$1',[tenantId])).rows[0];if(!l)return;if(['suspended','expired'].includes(l.status)||(l.expires_at&&new Date(l.expires_at)<new Date()))throw Object.assign(new Error('LICENSE_READ_ONLY'),{status:402})}

async function licenseFeature(client:any,tenantId:any,feature:any){const l=(await client.query('SELECT features FROM licenses WHERE tenant_id=$1',[tenantId])).rows[0];return !!l?.features?.[feature]}

async function verifyCurrentCredential(tenantId:any,userId:any,secret:any){const u=(await pool.query('SELECT pin_hash,password_hash FROM users WHERE tenant_id=$1 AND id=$2',[tenantId,userId])).rows[0];const x=String(secret||'');return !!u&&((u.pin_hash&&verifyHash(x,u.pin_hash))||(u.password_hash&&verifyHash(x,u.password_hash)))}

 return {cookie,scryptHash,verifyHash,safeUser,hasPerm,hasAction,needAction,canReadStore,canWriteStore,sanitizeRecord,rowValue,redactRecordForUser,originOkay,rateLimit,firstTenant,standaloneSetupAllowed,ownerSetupMeta,normalizeProviderBrand,ownerProviderBrand,ownerManagedClaims,dropSessionCache,loadSession,authOptional,needAuth,needPerm,bumpChange,auditDb,checkLicenseLimit,base32Decode,base32Encode,encryptSecret,decryptSecret,verifyTotp,issueSession,ensureLicenseWritable,licenseFeature,verifyCurrentCredential};
};

export {};
