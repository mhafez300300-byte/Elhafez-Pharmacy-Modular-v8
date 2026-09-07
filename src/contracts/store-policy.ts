'use strict';
const STORES=new Set(['settings','branches','products','batches','customers','suppliers','sales','purchases','expenses','shifts','audit','prescriptions','recalls','counts','transfers','orders','loyalty','users','roles','journal','cashMoves','stockMoves','priceHistory','returns','supplierPayments','customerPayments','purchaseOrders','contracts','claims','heldSales','doctors','offers','cashboxes','supplierReturns','attendance','priceUpdates','importRuns','serialItems','trackEvents','pushList','shortageNotes','deliveryAgents']);
const POSTED_IMMUTABLE_STORES=new Set(['sales','purchases','journal','stockMoves','returns','supplierReturns','cashMoves','customerPayments','supplierPayments','expenses']);
const DIRECT_WRITE_BLOCKED_STORES=new Set(['sales','purchases','journal','stockMoves','returns','supplierReturns','cashMoves','customerPayments','supplierPayments','expenses']);
const BULK_CLEAR_SAFE_STORES=new Set(['heldSales','shortageNotes','pushList','priceUpdates','importRuns']);
const INTENT_STORES={
  sale:new Set(['batches','stockMoves','sales','customers','cashMoves','claims','journal','orders','prescriptions','audit','loyalty','serialItems','trackEvents']),
  sale_return:new Set(['batches','stockMoves','sales','customers','cashMoves','claims','journal','returns','audit','loyalty','serialItems','trackEvents']),
  purchase:new Set(['batches','stockMoves','products','purchases','suppliers','cashMoves','journal','purchaseOrders','audit','serialItems','trackEvents']),
  supplier_return:new Set(['batches','stockMoves','suppliers','supplierReturns','purchases','journal','audit','serialItems','trackEvents']),
  sync:new Set([...STORES].filter(x=>!['users','settings','branches','roles'].includes(x)))
};
const STORE_PERMISSION={
 settings:'settings',branches:'settings',cashboxes:'settings',users:'users',roles:'users',products:'products',priceHistory:'price_center',priceUpdates:'price_center',importRuns:'products',batches:'inventory',stockMoves:'inventory',recalls:'recalls',counts:'counts',transfers:'transfers',sales:'sales',returns:'sales',heldSales:'pos',orders:'orders',customers:'customers',customerPayments:'customers',prescriptions:'prescriptions',doctors:'doctors',contracts:'contracts',claims:'contracts',loyalty:'loyalty',offers:'offers',purchases:'purchases',purchaseOrders:'purchase_orders',suppliers:'suppliers',supplierPayments:'suppliers',supplierReturns:'supplier_returns',cashMoves:'cash',shifts:'cash',expenses:'expenses',journal:'accounting',attendance:'attendance',serialItems:'inventory',trackEvents:'inventory',pushList:'push_list',shortageNotes:'shortage_notebook',deliveryAgents:'orders',audit:'audit'
};
const READ_DEPS={
 pos:new Set(['products','batches','sales','heldSales','customers','contracts','shifts','offers','cashboxes','prescriptions','orders','pushList','shortageNotes']),
 purchases:new Set(['products','batches','suppliers','purchases','purchaseOrders','cashMoves']),
 inventory:new Set(['products','batches','stockMoves','suppliers','serialItems','trackEvents']),
 reports:new Set([...STORES]),
 dashboard:new Set([...STORES]),
 orders:new Set(['orders','customers','deliveryAgents','sales']),
 push_list:new Set(['pushList','products','sales','batches']),
 shortage_notebook:new Set(['shortageNotes','products','customers','suppliers','purchases','purchaseOrders','sales','batches']),
 cash:new Set(['shifts','cashMoves','sales','expenses','cashboxes']),
 accounting:new Set(['journal','cashMoves','sales','purchases','expenses','customers','suppliers']),
 customers:new Set(['customers','customerPayments','sales']),
 suppliers:new Set(['suppliers','supplierPayments','purchases','supplierReturns']),
 prescriptions:new Set(['prescriptions','doctors','customers','products']),
 contracts:new Set(['contracts','claims','customers','sales']),
 loyalty:new Set(['loyalty','customers','sales']),
 clinical_safety:new Set(['products','customers']),
 reorder:new Set(['products','batches','sales','purchases','shortageNotes']),
 expiry:new Set(['products','batches','returns']),
 users:new Set(['users','attendance']),
 settings:new Set(['settings','branches','cashboxes'])
};
module.exports={STORES,POSTED_IMMUTABLE_STORES,DIRECT_WRITE_BLOCKED_STORES,BULK_CLEAR_SAFE_STORES,INTENT_STORES,STORE_PERMISSION,READ_DEPS};

export {};
