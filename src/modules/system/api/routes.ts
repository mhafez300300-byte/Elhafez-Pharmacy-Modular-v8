import type { SystemRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_system(app:any,ctx:SystemRouteDependencies){
 const {
  pool,
  APP_VERSION,
  safeUser,
  rowValue,
  nowIso,
  firstTenant,
  ownerSetupMeta,
  ownerProviderBrand
 }=ctx;

 // /api/health
// /api/provider-branding
// /api/bootstrap

app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');const owner=ownerSetupMeta();res.json({ok:true,version:APP_VERSION,time:nowIso(),ownerManaged:owner.ownerManaged,ownerCompanyCode:owner.ownerCompanyCode||''})}catch(e){res.status(503).json({ok:false,error:e.message})}});

app.get('/api/provider-branding',async(req,res)=>{res.json(await ownerProviderBrand(String(req.query.refresh||'')==='1'))});

app.get('/api/bootstrap',async(req,res)=>{
 const t=await firstTenant();
 if(!t)return res.json({setupComplete:false,authenticated:false,setupKeyRequired:!!process.env.SETUP_KEY,version:APP_VERSION,...ownerSetupMeta()});
 const [usersQ,settingsQ,licQ]=await Promise.all([
  pool.query('SELECT * FROM users WHERE tenant_id=$1 AND active=true ORDER BY created_at',[t.id]),
  pool.query(`SELECT data,revision FROM records WHERE tenant_id=$1 AND store='settings' ORDER BY created_at LIMIT 1`,[t.id]),
  pool.query('SELECT plan,status,max_branches,max_users,features,expires_at FROM licenses WHERE tenant_id=$1',[t.id])
 ]);
 const users=usersQ.rows.map(safeUser),settings=settingsQ.rows[0],lic=licQ.rows[0]||null;
 let fullSettings=settings?rowValue(settings):null;
 if(req.auth&&fullSettings){
   const device=String(req.headers['x-device-id']||'');
   const ctx=(await pool.query('SELECT branch_id,cashbox_id FROM user_contexts WHERE tenant_id=$1 AND user_id=$2 AND device_id=$3',[t.id,req.auth.user.id,device])).rows[0];
   if(ctx)fullSettings={...fullSettings,branchId:ctx.branch_id||fullSettings.branchId,cashboxId:ctx.cashbox_id||fullSettings.cashboxId,_contextScoped:true};
 }
 const publicSettings=fullSettings?{id:fullSettings.id,pharmacyName:fullSettings.pharmacyName,branchName:fullSettings.branchName,currency:fullSettings.currency}:null;
 res.json({setupComplete:users.length>0,authenticated:!!req.auth,user:req.auth?.user||null,users:req.auth?users:users.map(u=>({id:u.id,name:u.name,role:u.role,active:u.active,totpEnabled:u.totpEnabled})),settings:req.auth?fullSettings:publicSettings,license:req.auth?lic:null,version:APP_VERSION});
});
};

export {};
