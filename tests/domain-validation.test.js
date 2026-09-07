'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateSaleDocument,operationDates,validatePeriodRange}=require('../dist/modules/transactions/domain/commercial-invariants');

function sale(overrides={}){return{lines:[{productId:'p1',qty:2,unitPrice:10,factor:1,lineTotal:20}],subtotal:20,discount:2,pointsDiscount:1,contractDiscount:0,deliveryFee:3,total:20,cost:8,payment:'cash',...overrides}}

test('valid sale totals are accepted',()=>assert.equal(validateSaleDocument(sale(),20).expectedTotal,20));
test('tampered sale subtotal is rejected',()=>assert.throws(()=>validateSaleDocument(sale({subtotal:25}),20),/SALE_SUBTOTAL_MISMATCH/));
test('tampered line total is rejected',()=>assert.throws(()=>validateSaleDocument(sale({lines:[{qty:2,unitPrice:10,factor:1,lineTotal:19}]}),20),/INVALID_SALE_LINE_TOTAL/));
test('negative sale values are rejected',()=>assert.throws(()=>validateSaleDocument(sale({cost:-1}),20),/INVALID_SALE_TOTALS/));
test('discount permission is enforced',()=>assert.throws(()=>validateSaleDocument(sale({discount:10,pointsDiscount:0,deliveryFee:0,total:10}),10),/DISCOUNT_LIMIT_EXCEEDED/));
test('insurance split must equal total',()=>assert.throws(()=>validateSaleDocument(sale({payment:'insurance',customerPay:4,claimAmount:15}),20),/INVALID_INSURANCE_SPLIT/));
test('split payment must equal total',()=>assert.throws(()=>validateSaleDocument(sale({payment:'split',splitPayments:{cash:5,card:10}}),20),/INVALID_SPLIT_PAYMENT/));
test('financial operation dates are extracted from document dates',()=>{const ds=operationDates([{op:'put',store:'sales',value:{at:'2026-08-30T10:00:00Z'}},{op:'put',store:'products',value:{at:'2026-08-01'}}]);assert.equal(ds.length,1);assert.equal(ds[0].toISOString().slice(0,10),'2026-08-30')});
test('accounting period range rejects reversed dates',()=>assert.throws(()=>validatePeriodRange('2026-09-01','2026-08-01'),/INVALID_PERIOD_RANGE/));
test('accounting period range normalizes valid dates',()=>assert.deepEqual(validatePeriodRange('2026-08-01','2026-08-31'),{from:'2026-08-01',to:'2026-08-31'}));

test('unsupported sale payment method is rejected',()=>assert.throws(()=>validateSaleDocument(sale({payment:'crypto'}),20),/INVALID_PAYMENT_METHOD/));
test('split sale requires explicit payment allocation',()=>assert.throws(()=>validateSaleDocument(sale({payment:'split'}),20),/SPLIT_PAYMENT_REQUIRED/));
test('sale base quantity cannot disagree with quantity and factor',()=>assert.throws(()=>validateSaleDocument(sale({lines:[{productId:'p1',qty:2,unitPrice:10,factor:3,qtyBase:5,lineTotal:20}]}),20),/INVALID_SALE_LINE_BASE_QTY/));

test('duplicate puts in one atomic transaction are coalesced to the last value while preserving first revision',()=>{
 const {coalesceAtomicOperations}=require('../dist/modules/transactions/domain/commercial-invariants');
 const out=coalesceAtomicOperations([{op:'put',store:'sales',id:'s1',value:{id:'s1',total:10},expectedRevision:0},{op:'put',store:'sales',id:'s1',value:{id:'s1',total:20},expectedRevision:99},{op:'put',store:'audit',id:'a1',value:{id:'a1'}}]);
 assert.equal(out.length,2);assert.equal(out[0].value.total,20);assert.equal(out[0].expectedRevision,0);
});

test('commercial sale bundle requires allocations, stock movement and journal to agree',()=>{
 const {validateFinancialBundle}=require('../dist/modules/transactions/domain/commercial-invariants');
 const operations=[
  {op:'put',store:'sales',id:'s1',value:{id:'s1',no:'S-0001',payment:'cash',total:20,lines:[{productId:'p1',qty:2,factor:1,allocations:[{batchId:'b1',qtyBase:2}]}]}},
  {op:'put',store:'stockMoves',id:'m1',value:{id:'m1',type:'sale',ref:'S-0001',productId:'p1',batchId:'b1',qtyBase:-2}},
  {op:'put',store:'cashMoves',id:'c1',value:{id:'c1',type:'sale',ref:'S-0001',direction:'in',amount:20}},
  {op:'put',store:'journal',id:'j1',value:{id:'j1',type:'sale',ref:'S-0001'}}
 ];
 assert.equal(validateFinancialBundle('sale',operations),true);
 const bad=structuredClone(operations);bad[0].value.lines[0].allocations[0].qtyBase=1;
 assert.throws(()=>validateFinancialBundle('sale',bad),/SALE_ALLOCATION_MISMATCH/);
});

test('purchase bundle rejects receiving stock without a matching ledger movement',()=>{
 const {validateFinancialBundle}=require('../dist/modules/transactions/domain/commercial-invariants');
 const ops=[{op:'put',store:'purchases',id:'p1',value:{id:'p1',no:'P-0001',lines:[{productId:'x',batchId:'b',qtyBase:10}],paidNow:0}},{op:'put',store:'journal',id:'j',value:{id:'j',type:'purchase',ref:'P-0001'}}];
 assert.throws(()=>validateFinancialBundle('purchase',ops),/PURCHASE_STOCK_MOVE_MISMATCH/);
});

test('server catalog pricing mirrors pack strip and unit pricing including active offers',()=>{
 const {saleUnitFactor,saleBasePrice,saleOfferPrice}=require('../dist/modules/transactions/domain/commercial-invariants');
 const p={id:'p1',category:'c',sellPrice:120,packToStrip:2,stripToUnit:10,stripPrice:55,unitPrice:5};
 assert.equal(saleUnitFactor(p,'pack'),20);assert.equal(saleUnitFactor(p,'strip'),10);assert.equal(saleUnitFactor(p,'unit'),1);
 assert.equal(saleBasePrice(p,'strip'),55);assert.equal(saleBasePrice(p,'unit'),5);
 assert.equal(saleOfferPrice(p,'pack',[{productId:'p1',type:'percent',value:10,active:true,startDate:'2026-09-01',endDate:'2026-09-30'}],'2026-09-02'),108);
 assert.equal(saleOfferPrice(p,'strip',[{category:'c',type:'fixed',value:100,priority:1,active:true}],'2026-09-02'),50);
});

test('FEFO validation rejects taking a later expiry while an earlier batch can satisfy the sale',()=>{
 const {validateFefoAllocation}=require('../dist/modules/transactions/domain/commercial-invariants');
 const lines=[{productId:'p1',qty:5,factor:1}],batches=[{id:'early',productId:'p1',expiry:'2026-10-01',qtyBase:5},{id:'late',productId:'p1',expiry:'2026-11-01',qtyBase:10}];
 assert.equal(validateFefoAllocation(lines,batches,{early:5}),true);
 assert.throws(()=>validateFefoAllocation(lines,batches,{late:5}),/FEFO_ALLOCATION_REQUIRED/);
});
test('FEFO validation allows spilling only after the earlier expiry is exhausted',()=>{
 const {validateFefoAllocation}=require('../dist/modules/transactions/domain/commercial-invariants');
 const lines=[{productId:'p1',qty:7,factor:1}],batches=[{id:'early',productId:'p1',expiry:'2026-10-01',qtyBase:5},{id:'late',productId:'p1',expiry:'2026-11-01',qtyBase:10}];
 assert.equal(validateFefoAllocation(lines,batches,{early:5,late:2}),true);
});

test('loyalty and contract discounts are derived from server-side balances and contract rules',()=>{
 const {deriveSaleBenefits}=require('../dist/modules/transactions/domain/commercial-invariants');
 const x=deriveSaleBenefits({subtotal:100,discount:10,requestedPointsDiscount:5,customerPoints:100,redeemValue:.1,payment:'insurance',contract:{active:true,discountPercent:20},hasCustomer:true});
 assert.deepEqual({points:x.pointsDiscount,used:x.usedPoints,contract:x.contractDiscount},{points:5,used:50,contract:17});
 assert.throws(()=>deriveSaleBenefits({subtotal:100,requestedPointsDiscount:20,customerPoints:10,redeemValue:.1,hasCustomer:true}),/LOYALTY_DISCOUNT_EXCEEDED/);
});
test('insurance settlement respects patient share and coverage limit',()=>{
 const {insuranceSettlement}=require('../dist/modules/transactions/domain/commercial-invariants');
 assert.deepEqual(insuranceSettlement(200,{patientSharePercent:20,coverageLimit:100}),{claimAmount:80,customerPay:120,covered:100,patientSharePercent:20});
});
