import test from 'node:test';
import assert from 'node:assert/strict';
import { PurchaseService } from '../src/modules/purchases/application/purchase-service.js';
const tx:any={query:async()=>({rows:[],rowCount:0}),client:{}};
function service(order:any){
 const uow:any={withTransaction:async(fn:any)=>fn(tx)};const auditCalls:any[]=[];
 const purchases:any={getOrder:async()=>order,approveOrder:async()=>({...order,approvedAt:new Date().toISOString(),approvedBy:'u1'}),nextOrderNumber:async()=> 'PO-1'};
 const audit:any={record:async(i:any)=>auditCalls.push(i)};
 return {auditCalls,service:new PurchaseService(uow,purchases,{} as any,{} as any,{} as any,{} as any,{} as any,audit,{} as any)};
}
test('purchase order approval is explicit and audited',async()=>{const order={id:'po1',number:'PO-1',tenantId:'t1',branchId:'b1',supplierId:'s1',userId:'u1',status:'open',approvedAt:null,approvedBy:null,createdAt:new Date().toISOString(),lines:[]};const f=service(order);const out=await f.service.approveOrder('t1','u1','po1');assert.equal(out.approvedBy,'u1');assert.equal(f.auditCalls[0].action,'purchase_order.approved');});
test('receiving an unapproved purchase order is blocked before stock mutation',async()=>{const order={id:'po1',number:'PO-1',tenantId:'t1',branchId:'b1',supplierId:'s1',userId:'u1',status:'open',approvedAt:null,approvedBy:null,createdAt:new Date().toISOString(),lines:[{id:'ol1',productId:'p1',orderedQty:1,receivedQty:0,unitCost:5}]};const uow:any={withTransaction:async(fn:any)=>fn(tx)};let stockTouched=false;const purchases:any={getOrder:async()=>order};const suppliers:any={get:async()=>({id:'s1',active:true})};const inventory:any={receiveBatch:async()=>{stockTouched=true;}};const svc=new PurchaseService(uow,purchases,suppliers,{} as any,inventory,{} as any,{} as any,{} as any,{} as any);await assert.rejects(()=>svc.receive('t1','u1',{branchId:'b1',supplierId:'s1',payment:'credit',orderId:'po1',orderAllocations:[{orderLineId:'ol1',quantity:1}],lines:[{productId:'p1',quantity:1,unitCost:5}]}),(e:any)=>e?.code==='PURCHASE_ORDER_APPROVAL_REQUIRED');assert.equal(stockTouched,false);});
