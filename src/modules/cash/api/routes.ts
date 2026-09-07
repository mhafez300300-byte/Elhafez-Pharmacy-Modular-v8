import type { CashRouteDependencies } from '../contracts/dependencies';
'use strict';

module.exports=function register_cash(app:any,ctx:CashRouteDependencies){
 const {
  pool,
  Finance,
  nowIso,
  needAuth,
  putRecord
 }=ctx;

 // /api/cash/current-shift
// /api/cash/recover-shift

app.get('/api/cash/current-shift',needAuth,async(req,res,next)=>{try{
 const tid=req.auth.tenantId,branch=String(req.query.branchId||''),cashbox=String(req.query.cashboxId||'cash_main'),uid=String(req.auth.user.id||'');
 const q=await pool.query(`SELECT id,data,created_at FROM records WHERE tenant_id=$1 AND store='shifts' AND COALESCE(data->>'status','')='open' AND ($2='' OR COALESCE(data->>'branchId','')=$2) AND COALESCE(data->>'cashboxId','cash_main')=$3 ORDER BY COALESCE((data->>'openedAt')::timestamptz,created_at) DESC`,[tid,branch,cashbox]);
 const rows=q.rows.map(r=>({id:r.id,...(r.data||{})})),mine=rows.filter(x=>String(x.userId||'')===uid),others=rows.filter(x=>String(x.userId||'')!==uid),sameName=others.filter(x=>String(x.userName||'').trim()&&String(x.userName||'').trim()===String(req.auth.user.name||'').trim());
 res.json({current:mine.length===1?mine[0]:null,currentCount:mine.length,mineOpen:mine.slice(0,20),otherOpen:others.slice(0,20),staleSameName:sameName.slice(0,20),hasConflict:mine.length>1});
}catch(e){next(e)}});

app.post('/api/cash/recover-shift',needAuth,async(req,res,next)=>{try{
 if(!['owner','admin','manager'].includes(String(req.auth.user.roleKey||'')))return res.status(403).json({error:'FORBIDDEN'});
 const tid=req.auth.tenantId,shiftId=String(req.body?.shiftId||''),actualCash=Number(req.body?.actualCash);if(!shiftId||!Number.isFinite(actualCash)||actualCash<0)return res.status(422).json({error:'SHIFT_RECOVERY_DATA_INVALID'});
 const c=await pool.connect();try{await c.query('BEGIN');const row=(await c.query(`SELECT data,revision FROM records WHERE tenant_id=$1 AND store='shifts' AND id=$2 FOR UPDATE`,[tid,shiftId])).rows[0];if(!row)throw Object.assign(new Error('SHIFT_NOT_FOUND'),{status:404});const cur=row.data||{};if(String(cur.status||'')!=='open')throw Object.assign(new Error('SHIFT_ALREADY_CLOSED'),{status:409});const mq=await c.query(`SELECT data FROM records WHERE tenant_id=$1 AND store='cashMoves' AND data->>'shiftId'=$2`,[tid,shiftId]);const cashNet=Finance.money(mq.rows.filter(r=>String(r.data?.method||'cash')==='cash').reduce((a,r)=>a+(String(r.data?.direction||'in')==='in'?Number(r.data?.amount||0):-Number(r.data?.amount||0)),0));const expectedCash=Finance.money(Number(cur.openingCash||0)+cashNet),closedAt=nowIso(),next={...cur,status:'closed',closedAt,expectedCash,actualCash:Finance.money(actualCash),difference:Finance.money(actualCash-expectedCash),closeNote:String(req.body?.note||'تسوية وردية قديمة بواسطة المدير'),recoveredBy:req.auth.user.id,recoveredByName:req.auth.user.name};await putRecord(c,tid,'shifts',shiftId,next,Number(row.revision||0));await c.query(`INSERT INTO audit_logs(tenant_id,user_id,user_name,device_id,action,detail) VALUES($1,$2,$3,$4,'تسوية وردية قديمة',$5)`,[tid,req.auth.user.id,req.auth.user.name,req.headers['x-device-id']||null,`${shiftId} • المتوقع ${expectedCash} • الفعلي ${actualCash}`]);await c.query('COMMIT');res.json({ok:true,shift:next})}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}catch(e){next(e)}});
};

export {};
