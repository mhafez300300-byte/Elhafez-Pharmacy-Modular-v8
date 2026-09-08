import type{DbTx}from'../../../core/db/types.js';
export type PurchaseLineView=Readonly<{id:string;productId:string;quantity:number;unitCost:number;batchId:string|null;batchNo:string|null;expiryDate:string|null}>;
export type PurchaseView=Readonly<{id:string;number:string;tenantId:string;branchId:string;supplierId:string;userId:string;payment:string;total:number;status:'received';createdAt:string;orderId:string|null;lines:ReadonlyArray<PurchaseLineView>}>;
export type PurchaseOrderLineView=Readonly<{id:string;productId:string;orderedQty:number;receivedQty:number;unitCost:number}>;
export type PurchaseOrderView=Readonly<{id:string;number:string;tenantId:string;branchId:string;supplierId:string;userId:string;status:'open'|'partial'|'received'|'cancelled';approvedAt:string|null;approvedBy:string|null;createdAt:string;lines:ReadonlyArray<PurchaseOrderLineView>}>;
export type PurchaseReturnView=Readonly<{id:string;tenantId:string;purchaseId:string;branchId:string;supplierId:string;userId:string;settlement:'reduce_payable'|'cash_refund';total:number;reason:string|null;createdAt:string;lines:ReadonlyArray<{id:string;purchaseLineId:string;productId:string;batchId:string;quantity:number;amount:number}>}>;
export interface PurchaseContract{
 nextNumber(tenantId:string,tx:DbTx):Promise<string>;
 nextOrderNumber(tenantId:string,tx:DbTx):Promise<string>;
 save(input:PurchaseView,tx:DbTx):Promise<void>;
 getReceipt(tenantId:string,id:string,tx?:DbTx):Promise<PurchaseView|null>;
 list(tenantId:string,limit?:number):Promise<PurchaseView[]>;
 listBySupplier(tenantId:string,supplierId:string,limit?:number):Promise<PurchaseView[]>;
 createOrder(input:PurchaseOrderView,tx:DbTx):Promise<void>;
 getOrder(tenantId:string,id:string,tx?:DbTx):Promise<PurchaseOrderView|null>;
 listOrders(tenantId:string,limit?:number):Promise<PurchaseOrderView[]>;approveOrder(tenantId:string,id:string,userId:string,tx:DbTx):Promise<PurchaseOrderView>;
 applyReceiptToOrder(orderId:string,received:ReadonlyArray<{orderLineId:string;quantity:number}>,tx:DbTx):Promise<void>;
 returnedQuantities(tenantId:string,purchaseId:string,tx?:DbTx):Promise<Record<string,number>>;
 saveReturn(input:PurchaseReturnView,tx:DbTx):Promise<void>;
 listReturns(tenantId:string,limit?:number):Promise<PurchaseReturnView[]>;
}
