import type { OrganizationRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_context(app:any,ctx:OrganizationRouteDependencies){
 const {
  pool,
  needAuth
 }=ctx;

 // /api/context
// /api/context

app.get('/api/context',needAuth,async(req,res)=>{const device=String(req.headers['x-device-id']||'');const row=(await pool.query('SELECT branch_id,cashbox_id,updated_at FROM user_contexts WHERE tenant_id=$1 AND user_id=$2 AND device_id=$3',[req.auth.tenantId,req.auth.user.id,device])).rows[0]||null;res.json(row?{branchId:row.branch_id,cashboxId:row.cashbox_id,updatedAt:row.updated_at}:{branchId:null,cashboxId:null})});

app.put('/api/context',needAuth,async(req,res)=>{const device=String(req.headers['x-device-id']||''),branchId=String(req.body?.branchId||''),cashboxId=String(req.body?.cashboxId||'');if(branchId){const b=await pool.query(`SELECT 1 FROM records WHERE tenant_id=$1 AND store='branches' AND id=$2 AND COALESCE((data->>'active')::boolean,true)=true`,[req.auth.tenantId,branchId]);if(!b.rowCount)return res.status(422).json({error:'INVALID_BRANCH'})}if(cashboxId){const cb=await pool.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='cashboxes' AND id=$2`,[req.auth.tenantId,cashboxId]);if(!cb.rowCount)return res.status(422).json({error:'INVALID_CASHBOX'});const cbBranch=String(cb.rows[0].data?.branchId||'');if(branchId&&cbBranch&&cbBranch!==branchId)return res.status(422).json({error:'CASHBOX_BRANCH_MISMATCH'})}await pool.query(`INSERT INTO user_contexts(tenant_id,user_id,device_id,branch_id,cashbox_id,updated_at) VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(tenant_id,user_id,device_id) DO UPDATE SET branch_id=EXCLUDED.branch_id,cashbox_id=EXCLUDED.cashbox_id,updated_at=now()`,[req.auth.tenantId,req.auth.user.id,device,branchId||null,cashboxId||null]);res.json({ok:true,branchId:branchId||null,cashboxId:cashboxId||null})});
};

export {};
