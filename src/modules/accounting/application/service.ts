import type { AccountingServiceDependencies } from '../contracts/dependencies';
'use strict';
module.exports=function create_accounting_service(ctx:AccountingServiceDependencies){
 const {
  pool
 }=ctx;



async function accountingRows(tenantId:any,from:any=null,to:any=null,branchId:any=''){
 const q=await pool.query(`SELECT l.account_code,c.name,c.type,SUM(l.debit)::numeric AS debit,SUM(l.credit)::numeric AS credit FROM journal_lines_core l JOIN journal_entries_core e ON e.tenant_id=l.tenant_id AND e.id=l.journal_id LEFT JOIN chart_accounts c ON c.tenant_id=l.tenant_id AND c.code=l.account_code WHERE l.tenant_id=$1 AND ($2::date IS NULL OR e.at::date >= $2::date) AND ($3::date IS NULL OR e.at::date <= $3::date) AND ($4='' OR e.branch_id=$4) GROUP BY l.account_code,c.name,c.type ORDER BY l.account_code`,[tenantId,from||null,to||null,String(branchId||'')]);return q.rows.map(r=>({code:r.account_code,name:r.name||r.account_code,type:r.type||'unknown',debit:Number(r.debit||0),credit:Number(r.credit||0)}))}

function paymentAccount(method:any){return method==='cash'?['1000','الخزينة']:method==='bank'?['1010','البنك']:['1020','وسائل التحصيل']}

 return {accountingRows,paymentAccount};
};

export {};
