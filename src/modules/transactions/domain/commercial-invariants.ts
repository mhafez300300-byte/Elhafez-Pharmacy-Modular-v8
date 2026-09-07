'use strict';

const Finance=require('../../../core/money/finance');
const EPS=Finance.EPS;
const finite=(v)=>Number.isFinite(Number(v));
const money=Finance.money;
const close=(a,b)=>Math.abs(Number(a)-Number(b))<=EPS;
const SALE_PAYMENTS=new Set(['cash','card','wallet','bank','credit','insurance','split']);

function httpError(message:any,status:any=422,details?:any){const e:any=new Error(message);e.status=status;if(details)e.details=details;return e}

function salePackSize(p:any){return Math.max(1,(Number(p?.packToStrip)||1)*(Number(p?.stripToUnit)||1))}
function saleUnitFactor(p:any,unit:any){if(unit==='unit')return 1;if(unit==='strip')return Number(p?.stripToUnit)||1;if(unit==='pack')return salePackSize(p);return 0}
function saleBasePrice(p:any,unit:any){if(unit==='unit')return Number(p?.unitPrice)||Number(p?.sellPrice||0)/salePackSize(p);if(unit==='strip')return Number(p?.stripPrice)||Number(p?.sellPrice||0)/(Number(p?.packToStrip)||1);if(unit==='pack')return Number(p?.sellPrice||0);return NaN}
function saleOfferPrice(p:any,unit:any,offers:any=[],day:any=''){
 const base=saleBasePrice(p,unit),eligible=(Array.isArray(offers)?offers:[]).filter(o=>o&&o.active!==false&&(!o.startDate||String(o.startDate).slice(0,10)<=day)&&(!o.endDate||String(o.endDate).slice(0,10)>=day)&&(String(o.productId||'')===String(p?.id||'')||(!o.productId&&(!o.category||String(o.category)===String(p?.category||''))))).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0)),o=eligible[0];
 if(!o)return money(base);if(o.type==='percent')return money(Math.max(0,base*(1-Number(o.value||0)/100)));if(o.type==='fixed'){const pack=Math.max(0,Number(o.value||0));return money(unit==='pack'?pack:unit==='strip'?pack/(Number(p?.packToStrip)||1):pack/salePackSize(p))}return money(base);
}


function contractActiveOn(contract:any={},day:any=''){
 const d=String(day||new Date().toISOString()).slice(0,10);if(contract?.active===false)return false;
 const start=String(contract?.startDate||'').slice(0,10),end=String(contract?.endDate||'').slice(0,10);
 if(start&&d<start)return false;if(end&&d>end)return false;return true;
}

function deriveSaleBenefits({subtotal=0,discount=0,requestedPointsDiscount=0,customerPoints=0,redeemValue=.1,payment='cash',contract=null,hasCustomer=false}:any={}){
 const value=Math.max(0.000001,Number(redeemValue)||.1),requested=Math.max(0,Number(requestedPointsDiscount)||0),base=Math.max(0,Number(subtotal||0)-Number(discount||0)),maxPoints=hasCustomer?Math.min(Math.max(0,Number(customerPoints||0))*value,base):0;
 if(requested>0&&!hasCustomer)throw httpError('LOYALTY_CUSTOMER_REQUIRED');if(requested>maxPoints+EPS)throw httpError('LOYALTY_DISCOUNT_EXCEEDED',409,{available:maxPoints,requested});const pointsDiscount=money(requested),usedPoints=pointsDiscount>0?Math.min(Math.max(0,Number(customerPoints||0)),Math.ceil(pointsDiscount/value)):0;
 let contractDiscount=0;if(payment==='insurance'){if(!hasCustomer||!contract||contract.active===false)throw httpError('INSURANCE_CUSTOMER_CONTRACT_REQUIRED');contractDiscount=money(Math.max(0,base-pointsDiscount)*Math.max(0,Math.min(100,Number(contract.discountPercent||0)))/100)}
 return{pointsDiscount,usedPoints,contractDiscount,redeemValue:value,maxPointsDiscount:maxPoints};
}
function insuranceSettlement(total:any,contract:any={}){const t=Math.max(0,Number(total)||0),share=Math.max(0,Math.min(100,Number(contract.patientSharePercent||0))),covered=Number(contract.coverageLimit||0)>0?Math.min(t,Number(contract.coverageLimit)):t,claimAmount=money(covered*(100-share)/100),customerPay=money(t-claimAmount);return{claimAmount,customerPay,covered,patientSharePercent:share}}

function validateSaleDocument(input:any,maxDiscountPercent:any=0){
  const sale=input&&typeof input==='object'?input:null;
  if(!sale)throw httpError('SALE_DOCUMENT_REQUIRED');
  if(!Array.isArray(sale.lines)||!sale.lines.length)throw httpError('SALE_LINES_REQUIRED');
  if(!SALE_PAYMENTS.has(String(sale.payment||'')))throw httpError('INVALID_PAYMENT_METHOD');
  for(const [index,line] of sale.lines.entries()){
    const qty=Number(line?.qty),unitPrice=Number(line?.unitPrice),factor=Number(line?.factor??1);
    if(!finite(qty)||qty<=0)throw httpError('INVALID_SALE_LINE_QTY',422,{index});
    if(!finite(unitPrice)||unitPrice<0)throw httpError('INVALID_SALE_LINE_PRICE',422,{index});
    if(!finite(factor)||factor<=0)throw httpError('INVALID_SALE_LINE_FACTOR',422,{index});
    const expectedQtyBase=qty*factor;if(line.qtyBase!=null&&(!finite(line.qtyBase)||!close(Number(line.qtyBase),expectedQtyBase)))throw httpError('INVALID_SALE_LINE_BASE_QTY',422,{index,expected:expectedQtyBase});
    const expected=money(qty*unitPrice);
    if(line.lineTotal!=null&&!close(Number(line.lineTotal),expected))throw httpError('INVALID_SALE_LINE_TOTAL',422,{index,expected});
  }
  const values=['subtotal','discount','pointsDiscount','contractDiscount','deliveryFee','total','cost','taxTotal'].map(k=>Number(sale[k]||0));
  if(values.some(v=>!finite(v)||v<0))throw httpError('INVALID_SALE_TOTALS');
  const max=Math.max(0,Math.min(100,Number(maxDiscountPercent)||0));
  if(Number(sale.subtotal)>0&&Number(sale.discount||0)/Number(sale.subtotal)*100>max+0.001)throw httpError('DISCOUNT_LIMIT_EXCEEDED',403,{maxDiscountPercent:max});
  const computed=Finance.computeSale(sale.lines,{discount:sale.discount,pointsDiscount:sale.pointsDiscount,contractDiscount:sale.contractDiscount,deliveryFee:sale.deliveryFee,pricesIncludeTax:sale.pricesIncludeTax!==false,taxRegistered:sale.taxRegistered!==false});
  if(!close(Number(sale.subtotal),computed.subtotal))throw httpError('SALE_SUBTOTAL_MISMATCH',422,{expected:computed.subtotal});
  if(!close(Number(sale.total),computed.total))throw httpError('SALE_TOTAL_MISMATCH',422,{expected:computed.total});
  if(!close(Number(sale.taxTotal||0),computed.taxTotal))throw httpError('SALE_TAX_MISMATCH',422,{expected:computed.taxTotal});
  for(const [index,line] of sale.lines.entries()){
    const c=computed.lines[index];
    for(const k of ['discountShare','taxAmount','netAmount','grossAmount'])if(line[k]!=null&&!close(Number(line[k]),Number(c[k])))throw httpError('SALE_LINE_FINANCE_MISMATCH',422,{index,field:k,expected:c[k]});
  }
  if(sale.payment==='insurance'){
    const customerPay=Number(sale.customerPay||0),claimAmount=Number(sale.claimAmount||0);
    if(!finite(customerPay)||customerPay<0||!finite(claimAmount)||claimAmount<0||!close(customerPay+claimAmount,computed.total))throw httpError('INVALID_INSURANCE_SPLIT');
  }
  if(sale.payment==='split'){
    if(!sale.splitPayments||typeof sale.splitPayments!=='object')throw httpError('SPLIT_PAYMENT_REQUIRED');
    const allowed=new Set(['cash','card','wallet','bank']),entries=Object.entries(sale.splitPayments);
    if(!entries.length||entries.some(([k,v])=>!allowed.has(k)||!finite(v)||Number(v)<0)||!close(entries.reduce((a,[,v])=>a+Number(v),0),computed.total))throw httpError('INVALID_SPLIT_PAYMENT');
  }
  return{computedSubtotal:computed.subtotal,expectedTotal:computed.total,taxTotal:computed.taxTotal,maxDiscountPercent:max};
}

function validatePurchaseDocument(input:any){
 const p=input&&typeof input==='object'?input:null;if(!p)throw httpError('PURCHASE_DOCUMENT_REQUIRED');if(!Array.isArray(p.lines)||!p.lines.length)throw httpError('PURCHASE_LINES_REQUIRED');
 let total=0,taxTotal=0,inventoryNet=0;const inclusive=p.pricesIncludeTax!==false,taxRegistered=p.taxRegistered!==false;
 for(const [index,l] of p.lines.entries()){
  const packs=Number(l.packs),bonus=Number(l.bonusPacks||0),cost=Number(l.packCost),discount=Number(l.discount||0),rate=Math.max(0,Math.min(100,Number(l.taxRate||0)));
  if(!finite(packs)||packs<=0||!finite(bonus)||bonus<0||!finite(cost)||cost<0||!finite(discount)||discount<0||discount>packs*cost+EPS)throw httpError('INVALID_PURCHASE_LINE',422,{index});
  const after=money(Math.max(0,packs*cost-discount)),tax=taxRegistered&&rate>0?money(inclusive?after*rate/(100+rate):after*rate/100):0,net=money(taxRegistered?(inclusive?after-tax:after):after),gross=money(inclusive?after:after+tax);
  if(l.taxAmount!=null&&!close(l.taxAmount,tax))throw httpError('PURCHASE_LINE_TAX_MISMATCH',422,{index,expected:tax});
  if(l.netAmount!=null&&!close(l.netAmount,net))throw httpError('PURCHASE_LINE_NET_MISMATCH',422,{index,expected:net});
  if(l.total!=null&&!close(l.total,gross))throw httpError('PURCHASE_LINE_TOTAL_MISMATCH',422,{index,expected:gross});
  total=money(total+gross);taxTotal=money(taxTotal+tax);inventoryNet=money(inventoryNet+net);
 }
 if(!close(Number(p.total||0),total)||!close(Number(p.taxTotal||0),taxTotal)||!close(Number(p.inventoryNet??inventoryNet),inventoryNet))throw httpError('PURCHASE_TOTALS_MISMATCH',422,{total,taxTotal,inventoryNet});
 const paid=Number(p.paidNow||0),balance=Number(p.balance||0);if(!finite(paid)||paid<0||paid>total+EPS||!close(balance,total-paid))throw httpError('PURCHASE_BALANCE_MISMATCH',422,{expected:money(total-paid)});
 return{total,taxTotal,inventoryNet};
}



function validateFefoAllocation(lines:any=[],batches:any=[],usageByBatch:any={}){
 const usage=usageByBatch instanceof Map?usageByBatch:new Map(Object.entries(usageByBatch||{})),productIds=[...new Set((lines||[]).map(x=>String(x.productId||'')).filter(Boolean))];
 for(const productId of productIds){const required=(lines||[]).filter(l=>String(l.productId||'')===productId).reduce((a,l)=>a+Number(l.qty||0)*Number(l.factor||1),0),rows=(batches||[]).filter(r=>String(r.productId||r.product_id||'')===productId).sort((a,b)=>String(a.expiry||'9999-12-31').localeCompare(String(b.expiry||'9999-12-31'))||String(a.id).localeCompare(String(b.id))),groups=[];for(const r of rows){const expiry=r.expiry?String(r.expiry).slice(0,10):'9999-12-31',last=groups.at(-1);if(last&&last.expiry===expiry)last.rows.push(r);else groups.push({expiry,rows:[r]})}const available=groups.reduce((a,g)=>a+g.rows.reduce((z,r)=>z+Number(r.qtyBase??r.qty_base??0),0),0);if(available+0.0001<required)throw httpError('INSUFFICIENT_STOCK',409,{productId,required,available});let remaining=required;for(const g of groups){if(remaining<=0.0001)break;const groupAvailable=g.rows.reduce((a,r)=>a+Number(r.qtyBase??r.qty_base??0),0),expected=Math.min(remaining,groupAvailable),actual=g.rows.reduce((a,r)=>a+Number(usage.get(String(r.id))||0),0);if(Math.abs(actual-expected)>0.0001)throw httpError('FEFO_ALLOCATION_REQUIRED',409,{productId,expiry:g.expiry,expected,actual});remaining-=expected}}
 return true;
}

function coalesceAtomicOperations(operations:any=[]){
 const out=[],lastPut=new Map();
 for(const op of Array.isArray(operations)?operations:[]){const k=`${String(op?.store||'')}\0${String(op?.id||'')}`;if(op?.op==='put'){
   const idx=lastPut.get(k);if(idx!=null&&out[idx]?.op==='put'){const first=out[idx];out[idx]={...op,expectedRevision:first.expectedRevision??first.value?._serverRevision??op.expectedRevision??op.value?._serverRevision??0};continue}
   lastPut.set(k,out.length);out.push(op);continue
  }
  lastPut.delete(k);out.push(op)
 }
 return out;
}


function deriveSaleReturn(sale:any,items:any=[]){
 if(!sale||!Array.isArray(sale.lines))throw httpError('SALE_NOT_FOUND',404);
 const returned={...(sale.returnedQtyByLine||{})},clean=[];let gross=0,net=0,tax=0;
 for(const raw of Array.isArray(items)?items:[]){
  const index=Number(raw?.lineIndex),line=sale.lines[index],qty=Number(raw?.qty);if(!Number.isInteger(index)||!line||!finite(qty)||qty<=0)throw httpError('INVALID_RETURN_LINE',422,{index});
  const sold=Math.max(0,Number(line.qty||0)),already=Math.max(0,Number(returned[index]||0)),remain=Math.max(0,sold-already);if(qty>remain+EPS)throw httpError('RETURN_EXCEEDS_SOLD_QTY',409,{index,sold,already,requested:qty});
  const ratio=sold>0?qty/sold:0,lineGross=money(Number(line.grossAmount??(Number(line.lineTotal||0)-Number(line.discountShare||0)))*ratio),lineTax=money(Number(line.taxAmount||0)*ratio),lineNet=money(Number(line.netAmount??(Number(line.lineTotal||0)-Number(line.discountShare||0)-Number(line.taxAmount||0)))*ratio);
  returned[index]=money(already+qty);gross=money(gross+lineGross);net=money(net+lineNet);tax=money(tax+lineTax);clean.push({lineIndex:index,productId:line.productId,name:line.name,qty,unit:line.unit,gross:lineGross,net:lineNet,tax:lineTax});
 }
 if(!clean.length)throw httpError('RETURN_ITEMS_REQUIRED',422);
 const fully=sale.lines.every((l,i)=>Number(returned[i]||0)>=Number(l.qty||0)-EPS),deliveryRefund=fully&&!Number(sale.returnedDeliveryFee||0)?money(sale.deliveryFee||0):0,total=money(gross+deliveryRefund);
 return{items:clean,returnedQtyByLine:returned,gross,net,tax,deliveryRefund,total,fully};
}

function validateFinancialBundle(intent:any,operations:any=[]){
 const puts=(store)=>operations.filter(o=>o?.op==='put'&&o.store===store).map(o=>o.value||{}),last=(store)=>puts(store).at(-1),fail=(m:any,d?:any):never=>{throw httpError(m,409,d)};
 const journal=puts('journal'),moves=puts('stockMoves'),cash=puts('cashMoves');
 if(intent==='sale'){
  const sale=last('sales');if(!sale)fail('SALE_DOCUMENT_REQUIRED');
  const ref=String(sale.no||sale.id||'');if(!journal.some(j=>String(j.ref||'')===ref&&String(j.type||'').startsWith('sale')))fail('SALE_JOURNAL_REQUIRED');
  const usage=new Map();for(const [index,line] of (sale.lines||[]).entries()){const expected=Number(line.qty||0)*Number(line.factor||1),actual=(line.allocations||[]).reduce((a,x)=>a+Number(x.qtyBase||0),0);if(!close(expected,actual))fail('SALE_ALLOCATION_MISMATCH',{index,expected,actual});for(const a of line.allocations||[]){const k=`${line.productId}|${a.batchId}`;usage.set(k,(usage.get(k)||0)+Number(a.qtyBase||0))}}
  for(const [k,qty] of usage){const [productId,batchId]=k.split('|'),moved=-moves.filter(m=>String(m.ref||'')===ref&&String(m.productId||'')===productId&&String(m.batchId||'')===batchId&&String(m.type||'')==='sale').reduce((a,m)=>a+Number(m.qtyBase||0),0);if(!close(qty,moved))fail('SALE_STOCK_MOVE_MISMATCH',{productId,batchId,expected:qty,actual:moved})}
  if(sale.payment==='split'){const paid=cash.filter(x=>String(x.type||'')==='sale'&&String(x.ref||'')===ref&&String(x.direction||'in')==='in').reduce((a,x)=>a+Number(x.amount||0),0);if(!close(paid,Number(sale.total||0)))fail('SALE_CASH_SPLIT_MISMATCH',{expected:Number(sale.total||0),actual:paid})}
  if(['cash','card','wallet','bank'].includes(String(sale.payment||''))){const paid=cash.filter(x=>String(x.type||'')==='sale'&&String(x.ref||'')===ref&&String(x.direction||'in')==='in').reduce((a,x)=>a+Number(x.amount||0),0);if(!close(paid,Number(sale.total||0)))fail('SALE_CASH_MOVE_MISMATCH',{expected:Number(sale.total||0),actual:paid})}
 }
 if(intent==='purchase'){
  const p=last('purchases');if(!p)fail('PURCHASE_DOCUMENT_REQUIRED');const ref=String(p.no||p.id||'');if(!journal.some(j=>String(j.ref||'')===ref&&String(j.type||'')==='purchase'))fail('PURCHASE_JOURNAL_REQUIRED');
  const receiptUsage=new Map();for(const [index,line] of (p.lines||[]).entries()){const expected=Number(line.qtyBase||0);if(!(expected>0))fail('PURCHASE_STOCK_MOVE_MISMATCH',{index,expected,actual:0});const k=`${String(line.productId||'')}|${String(line.batchId||'')}`;receiptUsage.set(k,(receiptUsage.get(k)||0)+expected)}for(const [k,expected] of receiptUsage){const [productId,batchId]=k.split('|'),actual=moves.filter(m=>String(m.ref||'')===ref&&String(m.productId||'')===productId&&String(m.batchId||'')===batchId&&String(m.type||'')==='purchase').reduce((a,m)=>a+Number(m.qtyBase||0),0);if(!close(expected,actual))fail('PURCHASE_STOCK_MOVE_MISMATCH',{productId,batchId,expected,actual})}
  if(Number(p.paidNow||0)>EPS){const paid=cash.filter(x=>String(x.type||'')==='supplier_payment'&&String(x.ref||'')===ref&&String(x.direction||'')==='out').reduce((a,x)=>a+Number(x.amount||0),0);if(!close(paid,Number(p.paidNow||0)))fail('PURCHASE_PAYMENT_MOVE_MISMATCH',{expected:Number(p.paidNow||0),actual:paid});if(!journal.some(j=>String(j.ref||'')===`${ref}-PAY`&&String(j.type||'')==='supplier_payment'))fail('PURCHASE_PAYMENT_JOURNAL_REQUIRED')}
 }
 if(intent==='supplier_return'){
  const r=last('supplierReturns');if(!r)fail('SUPPLIER_RETURN_DOCUMENT_REQUIRED');const ref=String(r.no||r.id||'');if(!journal.some(j=>String(j.ref||'')===ref&&String(j.type||'')==='supplier_return'))fail('SUPPLIER_RETURN_JOURNAL_REQUIRED');const moved=-moves.filter(m=>String(m.ref||'')===ref&&String(m.productId||'')===String(r.productId||'')&&String(m.batchId||'')===String(r.batchId||'')&&String(m.type||'')==='supplier_return').reduce((a,m)=>a+Number(m.qtyBase||0),0);if(!close(moved,Number(r.qtyBase||0)))fail('SUPPLIER_RETURN_STOCK_MOVE_MISMATCH',{expected:Number(r.qtyBase||0),actual:moved})
 }
 if(intent==='sale_return'){
  const r=last('returns');if(!r)fail('RETURN_DOCUMENT_REQUIRED');if(!journal.some(j=>String(j.type||'')==='sale_return'))fail('RETURN_JOURNAL_REQUIRED');const returnUsage=new Map();for(const x of (r.inspections||[])){const k=`${String(x.productId||'')}|${String(x.batchId||'')}`;returnUsage.set(k,(returnUsage.get(k)||0)+Number(x.qtyBase||0))}for(const [k,expected] of returnUsage){const [productId,batchId]=k.split('|'),actual=moves.filter(m=>String(m.productId||'')===productId&&String(m.batchId||'')===batchId&&String(m.type||'')==='sale_return').reduce((a,m)=>a+Number(m.qtyBase||0),0);if(!close(actual,expected))fail('RETURN_STOCK_MOVE_MISMATCH',{productId,batchId,expected,actual})}
 }
 return true;
}

function operationDates(operations:any=[]){
  const dates=[];
  const financialStores=new Set(['sales','returns','purchases','supplierReturns','journal','cashMoves','expenses','customerPayments','supplierPayments']);
  for(const op of operations){if(op?.op!=='put'||!financialStores.has(op.store))continue;const v=op.value||{},raw=v.at||v.invoiceDate||v.date||v.createdAt;if(!raw)continue;const d=new Date(raw);if(!Number.isNaN(d.getTime()))dates.push(d)}
  return dates;
}
function validatePeriodRange(from:any,to:any){if(!from||!to)throw httpError('FROM_TO_REQUIRED',400);const a=new Date(`${from}T00:00:00Z`),b=new Date(`${to}T00:00:00Z`);if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime()))throw httpError('INVALID_PERIOD_DATE',400);if(a>b)throw httpError('INVALID_PERIOD_RANGE',400);return{from:String(from).slice(0,10),to:String(to).slice(0,10)}}
module.exports={validateSaleDocument,validatePurchaseDocument,validateFinancialBundle,validateFefoAllocation,coalesceAtomicOperations,salePackSize,saleUnitFactor,saleBasePrice,saleOfferPrice,contractActiveOn,deriveSaleBenefits,insuranceSettlement,deriveSaleReturn,operationDates,validatePeriodRange};

export {};
