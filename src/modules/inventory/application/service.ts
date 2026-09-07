import type { InventoryServiceDependencies } from '../contracts/dependencies';
'use strict';
module.exports=function create_inventory_service(ctx:InventoryServiceDependencies){
 const {
  Finance,
  accountCode
 }=ctx;


async function prepareInventoryCommercial(c:any,tenantId:any,operations:any){
 const moves=operations.filter(o=>o.op==='put'&&o.store==='stockMoves').map(o=>o.value||{}).filter(m=>['adjustment','count_adjustment','opening','opening_import','waste','disposal','cost_adjustment'].includes(String(m.type||'')));
 if(!moves.length)return;
 const totals=new Map();
 for(const move of moves){
   const batchId=String(move.batchId||'');if(!batchId)throw Object.assign(new Error('BATCH_REQUIRED'),{status:422});
   const bop=operations.find(o=>o.op==='put'&&o.store==='batches'&&String(o.id)===batchId);if(!bop)throw Object.assign(new Error('BATCH_WRITE_REQUIRED'),{status:409});
   const oldRow=(await c.query(`SELECT data,revision FROM records WHERE tenant_id=$1 AND store='batches' AND id=$2 FOR UPDATE`,[tenantId,batchId])).rows[0]||null;
   const before=oldRow?.data||{},after=bop.value||{},qty=Number(move.qtyBase||0),type=String(move.type||'');
   if(type==='cost_adjustment'){
     if(!oldRow)throw Object.assign(new Error('BATCH_NOT_FOUND'),{status:404});
     const oldCost=Number(before.costPerBase||0),newCost=Number(after.costPerBase),remainingQty=Number(after.qtyBase||0);
     if(!Number.isFinite(newCost)||newCost<0)throw Object.assign(new Error('INVALID_BATCH_COST'),{status:422});
     if(Math.abs(Number(before.qtyBase||0)-remainingQty)>0.0001)throw Object.assign(new Error('COST_ADJUSTMENT_QUANTITY_CHANGED'),{status:409});
     const difference=Finance.money((newCost-oldCost)*remainingQty);if(Math.abs(difference)<0.005)throw Object.assign(new Error('COST_ADJUSTMENT_NO_CHANGE'),{status:422});
     move.qtyBase=0;move.oldCostPerBase=oldCost;move.newCostPerBase=newCost;move.costDifference=Finance.money(newCost-oldCost);move.inventoryValue=Math.abs(difference);move.valueDelta=difference;
     const key=`${String(move.ref||'')||type}|${type}`,t=totals.get(key)||{ref:String(move.ref||''),type,gain:0,loss:0};if(difference>0)t.gain=Finance.money(t.gain+difference);else t.loss=Finance.money(t.loss+Math.abs(difference));totals.set(key,t);continue;
   }
   if(Math.abs(qty)<0.000001)continue;
   const expected=Finance.money(Number(before.qtyBase||0)+qty);if(oldRow&&Math.abs(Number(after.qtyBase||0)-expected)>0.0001)throw Object.assign(new Error('BATCH_QUANTITY_MISMATCH'),{status:409,details:{batchId,expected,actual:Number(after.qtyBase||0)}});
   if(!oldRow&&qty<0)throw Object.assign(new Error('BATCH_NOT_FOUND'),{status:404});
   const cost=Number(oldRow?.data?.costPerBase??after.costPerBase??0);if(cost<0)throw Object.assign(new Error('INVALID_BATCH_COST'),{status:422});
   const value=Finance.money(Math.abs(qty)*cost);move.inventoryValue=value;move.costPerBase=cost;
   if(qty<0){const prov=await consumeReceiptProvenance(c,tenantId,batchId,before,Math.abs(qty));if(prov.allocations.length)move.receiptLayers=prov.allocations}
   const key=`${String(move.ref||'')||String(move.type||'')}|${String(move.type||'')}`;const t=totals.get(key)||{ref:String(move.ref||''),type:String(move.type||''),gain:0,loss:0};if(qty>0)t.gain=Finance.money(t.gain+value);else t.loss=Finance.money(t.loss+value);totals.set(key,t);
   if(['waste','disposal'].includes(String(move.type||''))){const ret=operations.find(o=>o.op==='put'&&o.store==='returns'&&String(o.value?.batchId||'')===batchId&&['waste','disposal'].includes(String(o.value?.type||'')));if(ret){ret.value.value=value;ret.value.cost=value;ret.value.qtyBase=Math.abs(qty);ret.value.disposition='disposed'}}
 }
 for(const t of totals.values()){
   const expectedJournalType=('opening'===t.type||'opening_import'===t.type)?'opening_inventory':t.type==='waste'||t.type==='disposal'?'waste':'stock_adjustment';
   const j=operations.find(o=>o.op==='put'&&o.store==='journal'&&((t.ref&&String(o.value?.ref||'')===t.ref)||String(o.value?.type||'')===expectedJournalType));
   if(!j&&Finance.money(t.gain+t.loss)>0)throw Object.assign(new Error('INVENTORY_JOURNAL_REQUIRED'),{status:409,details:{ref:t.ref,type:t.type}});if(!j)continue;
   j.value.type=expectedJournalType;if(t.ref)j.value.ref=t.ref;
   let lines=[];
   if(['opening','opening_import'].includes(t.type)){const v=Finance.money(t.gain-t.loss);if(v>0)lines=[{accountCode:'1200',account:'المخزون',debit:v,credit:0},{accountCode:'3000',account:'أرصدة افتتاحية',debit:0,credit:v}]}
   else if(['waste','disposal'].includes(t.type)){const v=t.loss;lines=[{accountCode:'6100',account:'خسائر التلف والانتهاء',debit:v,credit:0},{accountCode:'1200',account:'المخزون',debit:0,credit:v}]}
   else {if(t.gain>0)lines.push({accountCode:'1200',account:'المخزون',debit:t.gain,credit:0},{accountCode:'4200',account:'فروق زيادة المخزون',debit:0,credit:t.gain});if(t.loss>0)lines.push({accountCode:'5100',account:'فروق وعجز المخزون',debit:t.loss,credit:0},{accountCode:'1200',account:'المخزون',debit:0,credit:t.loss})}
   j.value.lines=lines;j.value.debit=Finance.money(lines.reduce((a,l)=>a+Number(l.debit||0),0));j.value.credit=Finance.money(lines.reduce((a,l)=>a+Number(l.credit||0),0));j.value.balanced=Math.abs(j.value.debit-j.value.credit)<0.01;
 }
}


async function consumeReceiptProvenance(c:any,tenantId:any,batchId:any,batch:any,qty:any,{supplierId=null,strict=false}:any={}){
 const originId=String(batch?.sourceBatchId||batchId||'');if(!originId||!(Number(qty)>0))return {allocations:[],net:0,tax:0,missing:Number(qty)||0};
 const args=[tenantId,originId],supplierSql=supplierId?` AND supplier_id=$3`:'';if(supplierId)args.push(String(supplierId));
 const rows=(await c.query(`SELECT * FROM purchase_receipt_layers WHERE tenant_id=$1 AND batch_id=$2${supplierSql} AND qty_remaining_base>0 ORDER BY created_at,id FOR UPDATE`,args)).rows;
 let need=Number(qty),net=0,tax=0;const allocations:any[]=[];
 for(const r of rows){if(need<=0.000001)break;const take=Math.min(need,Number(r.qty_remaining_base||0));if(take<=0)continue;await c.query('UPDATE purchase_receipt_layers SET qty_remaining_base=qty_remaining_base-$1 WHERE tenant_id=$2 AND id=$3',[take,tenantId,r.id]);allocations.push({layerId:r.id,purchaseId:r.purchase_id,supplierId:r.supplier_id,qtyBase:take,unitCost:Number(r.unit_cost||0),taxPerBase:Number(r.tax_per_base||0)});net+=take*Number(r.unit_cost||0);tax+=take*Number(r.tax_per_base||0);need-=take}
 if(strict&&need>0.0001)throw Object.assign(new Error('SUPPLIER_PROVENANCE_INSUFFICIENT'),{status:409,details:{batchId:originId,supplierId,missing:need}});
 return {allocations,net:Finance.money(net),tax:Finance.money(tax),missing:Math.max(0,need)};
}

async function restoreReceiptProvenance(c:any,tenantId:any,allocations:any=[]){for(const a of allocations){const qty=Number(a.qtyBase||0);if(qty<=0||!a.layerId)continue;await c.query('UPDATE purchase_receipt_layers SET qty_remaining_base=LEAST(qty_received_base,qty_remaining_base+$1) WHERE tenant_id=$2 AND id=$3',[qty,tenantId,String(a.layerId)])}}

 return {consumeReceiptProvenance,restoreReceiptProvenance,prepareInventoryCommercial};
};

export {};
