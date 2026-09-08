import test from 'node:test';
import assert from 'node:assert/strict';
import { SalesService } from '../src/modules/sales/application/sales-service.js';

const tx:any={query:async()=>({rows:[],rowCount:0}),client:{}};
function postFixture(){
  const saved:any[]=[];const calls:string[]=[];
  const uow:any={withTransaction:async(fn:any)=>fn(tx)};
  const sales:any={nextNumber:async()=> 'S-000001',savePosted:async(s:any)=>{saved.push(s);calls.push('sale')},get:async()=>null,list:async()=>[],saveReturn:async()=>{},returnedQuantities:async()=>({}),returnedAmount:async()=>0};
  const catalog:any={get:async()=>({id:'p1',tenantId:'t',name:'دواء',barcode:null,sku:null,sellingPrice:100,costPrice:60,taxRate:0,reorderLevel:0,requiresPrescription:false,active:true})};
  const inventory:any={issueFefo:async()=>[{batchId:'b1',quantity:1,unitCost:60,batchNo:'B1',expiryDate:null}]};
  const cash:any={getOpenShift:async()=>({id:'sh1'}),recordMovement:async()=>{}};const accounting:any={post:async()=>{}};
  const customers:any={get:async()=>({id:'c1',active:true})};const audit:any={record:async()=>{}};const settlements:any={createObligation:async()=>{}};
  const identity:any={findUser:async()=>({id:'u',tenantId:'t',name:'User',username:'u',role:'cashier',permissions:['sales.post','loyalty.redeem'],maxDiscountPercent:100,active:true})};
  const clinical:any={safetyCheck:async()=>({blocked:false,warnings:[]}),getPrescription:async()=>null};const pricing:any={calculateDiscount:async()=>({amount:0,offerId:null})};
  const loyalty:any={redeemForSale:async(i:any,_tx:any)=>{calls.push('redeem');assert.equal(i.requestedPoints,100);return{requestedPoints:100,approvedPoints:100,availablePoints:1000,maxPointsBySale:200,discount:10,pointValue:.1,minRedeemPoints:10,maxRedeemPercent:20}},earnForAmount:async(i:any,_tx:any)=>{calls.push('earn');assert.equal(i.amount,90);return 90},reverseForReturn:async()=>({restoredRedeemedPoints:0,reversedEarnedPoints:0})};
  const idempotency:any={claim:async()=>({state:'new'}),complete:async()=>{}};return{saved,calls,service:new SalesService(uow,sales,catalog,inventory,cash,accounting,customers,audit,settlements,identity,clinical,pricing,loyalty,idempotency)};
}

test('sale redeems loyalty atomically and earns on the actually paid amount',async()=>{
  const f=postFixture();const sale=await f.service.post('t','u',{branchId:'b',customerId:'c1',payment:'cash',loyaltyPointsToRedeem:100,lines:[{productId:'p1',quantity:1}]});
  assert.equal(sale.loyaltyDiscount,10);assert.equal(sale.loyaltyPointsRedeemed,100);assert.equal(sale.loyaltyPointsEarned,90);assert.equal(sale.total,90);assert.deepEqual(f.calls,['redeem','earn','sale']);
});

test('full return refunds the paid amount after invoice and loyalty discounts and reverses loyalty proportionally',async()=>{
  let savedReturn:any=null,reverseInput:any=null;
  const sale:any={id:'s1',number:'S-1',tenantId:'t',branchId:'b',customerId:'c1',userId:'u',payment:'cash',subtotal:100,discount:20,invoiceDiscount:10,loyaltyPointsRedeemed:100,loyaltyDiscount:10,loyaltyPointsEarned:80,tax:0,total:80,cost:60,profit:20,status:'posted',createdAt:new Date().toISOString(),lines:[{id:'l1',productId:'p1',quantity:1,unitPrice:100,discount:0,tax:0,net:100,cost:60,allocations:[{batchId:'bt1',quantity:1,unitCost:60}]}]};
  const uow:any={withTransaction:async(fn:any)=>fn(tx)};
  const sales:any={get:async()=>sale,returnedQuantities:async()=>({}),returnedAmount:async()=>0,saveReturn:async(i:any)=>{savedReturn=i}};
  const inventory:any={returnStock:async()=>{}};const cash:any={getOpenShift:async()=>({id:'sh'}),recordMovement:async()=>{}};const accounting:any={post:async()=>{}};const audit:any={record:async()=>{}};
  const loyalty:any={reverseForReturn:async(i:any)=>{reverseInput=i;return{restoredRedeemedPoints:100,reversedEarnedPoints:80}}};
  const idempotency:any={claim:async()=>({state:'new'}),complete:async()=>{}};const service=new SalesService(uow,sales,{} as any,inventory,cash,accounting,{} as any,audit,{} as any,{} as any,{} as any,{} as any,loyalty,idempotency);
  const result=await service.returnSale('t','u',{saleId:'s1',lines:[{saleLineId:'l1',quantity:1,classification:'sellable'}]});
  assert.equal(result.total,80);assert.equal(savedReturn.total,80);assert.equal(savedReturn.lines[0].amount,80);assert.equal(reverseInput.proportion,1);assert.equal(reverseInput.earnedPoints,80);assert.equal(reverseInput.redeemedPoints,100);
});


test('sequential partial returns restore the original FEFO batches without repeating the first batch',async()=>{
  const returnedCalls:any[]=[];let returnedQty=0;let savedReturn:any=null;let journal:any=null;
  const sale:any={id:'s2',number:'S-2',tenantId:'t',branchId:'b',customerId:null,userId:'u',payment:'card',subtotal:40,discount:0,invoiceDiscount:0,loyaltyPointsRedeemed:0,loyaltyDiscount:0,loyaltyPointsEarned:0,tax:0,total:40,cost:50,profit:-10,status:'posted',createdAt:new Date().toISOString(),lines:[{id:'l2',productId:'p2',quantity:4,unitPrice:10,discount:0,tax:0,net:40,cost:50,allocations:[{batchId:'A',quantity:2,unitCost:10},{batchId:'B',quantity:2,unitCost:15}]}]};
  const uow:any={withTransaction:async(fn:any)=>fn(tx)};
  const sales:any={get:async()=>sale,returnedQuantities:async()=>({l2:returnedQty}),returnedAmount:async()=>returnedQty*10,saveReturn:async(i:any)=>{savedReturn=i;returnedQty+=i.lines[0].quantity;}};
  const inventory:any={returnStock:async(i:any)=>returnedCalls.push(i)};
  const accounting:any={post:async(i:any)=>{journal=i}};const audit:any={record:async()=>{}};
  const loyalty:any={reverseForReturn:async()=>({restoredRedeemedPoints:0,reversedEarnedPoints:0})};
  const service=new SalesService(uow,sales,{} as any,inventory,{} as any,accounting,{} as any,audit,{} as any,{} as any,{} as any,{} as any,loyalty,{} as any);
  await service.returnSale('t','u',{saleId:'s2',lines:[{saleLineId:'l2',quantity:2,classification:'sellable'}]});
  assert.deepEqual(returnedCalls.map(x=>[x.batchId,x.quantity,x.unitCost]),[['A',2,10]]);
  const firstCost=journal.lines.find((x:any)=>x.accountCode==='1300')?.debit;assert.equal(firstCost,20);
  returnedCalls.length=0;
  await service.returnSale('t','u',{saleId:'s2',lines:[{saleLineId:'l2',quantity:2,classification:'sellable'}]});
  assert.deepEqual(returnedCalls.map(x=>[x.batchId,x.quantity,x.unitCost]),[['B',2,15]]);
  const secondCost=journal.lines.find((x:any)=>x.accountCode==='1300')?.debit;assert.equal(secondCost,30);
  assert.equal(savedReturn.total,20);
});
