import test from'node:test';import assert from'node:assert/strict';import{ReconciliationService}from'../src/modules/reconciliation/application/reconciliation-service.js';
const sale:any={id:'s1',number:'S-1',tenantId:'t',branchId:'b',customerId:'c',userId:'u',payment:'cash',subtotal:50,discount:0,invoiceDiscount:0,loyaltyPointsRedeemed:0,loyaltyDiscount:0,loyaltyPointsEarned:0,tax:0,total:50,cost:20,profit:30,status:'posted',createdAt:new Date().toISOString(),lines:[{id:'l1',productId:'p',quantity:2,unitPrice:25,discount:0,tax:0,net:50,cost:20,allocations:[]}]};
const purchase:any={id:'p1',number:'P-1',tenantId:'t',branchId:'b',supplierId:'sup',userId:'u',payment:'credit',total:30,status:'received',createdAt:new Date().toISOString(),orderId:null,lines:[{id:'pl1',productId:'p',quantity:3,unitCost:10,batchId:'bat',batchNo:null,expiryDate:null}]};
function svc(overrides:any={}){return new ReconciliationService(
  {list:async()=>[sale],...overrides.sales} as any,
  {list:async()=>[purchase],...overrides.purchases} as any,
  {hasReference:async()=>true,...overrides.accounting} as any,
  {referenceAmount:async()=>50,...overrides.cash} as any,
  {sourceQuantity:async(_t:string,_b:string,type:string)=>type==='sale'?2:3,...overrides.inventory} as any,
  {obligationByReference:async()=>({id:'o'}),...overrides.settlements} as any,
);}
test('reconciliation accepts complete sale and purchase projections',async()=>{const result=await svc().scan('t','b');assert.equal(result.ok,true);assert.equal(result.issues.length,0);assert.equal(result.scannedSales,1);assert.equal(result.scannedPurchases,1);});
test('reconciliation exposes missing financial and stock side effects',async()=>{const result=await svc({accounting:{hasReference:async(_t:string,type:string)=>type!=='sale'},cash:{referenceAmount:async()=>0},inventory:{sourceQuantity:async()=>0},settlements:{obligationByReference:async()=>null}}).scan('t','b');const codes=new Set(result.issues.map(x=>x.code));assert.equal(result.ok,false);assert.ok(codes.has('sale_missing_journal'));assert.ok(codes.has('sale_inventory_mismatch'));assert.ok(codes.has('sale_cash_mismatch'));assert.ok(codes.has('purchase_inventory_mismatch'));assert.ok(codes.has('purchase_missing_payable'));});
