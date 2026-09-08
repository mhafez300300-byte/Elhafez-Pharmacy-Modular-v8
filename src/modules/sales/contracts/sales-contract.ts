import type { DbTx } from '../../../core/db/types.js';

export type SaleLineView=Readonly<{
  id:string;
  productId:string;
  quantity:number;
  unitPrice:number;
  discount:number;
  tax:number;
  net:number;
  cost:number;
  allocations:ReadonlyArray<{batchId:string;quantity:number;unitCost:number;batchNo?:string|null;expiryDate?:string|null}>;
}>;

export type ProductDemandView=Readonly<{productId:string;soldQuantity:number;returnedQuantity:number;netQuantity:number}>;

export type SaleView=Readonly<{
  id:string;
  number:string;
  tenantId:string;
  branchId:string;
  customerId:string|null;
  userId:string;
  payment:string;
  subtotal:number;
  discount:number;
  invoiceDiscount:number;
  loyaltyPointsRedeemed:number;
  loyaltyDiscount:number;
  loyaltyPointsEarned:number;
  tax:number;
  total:number;
  cost:number;
  profit:number;
  status:'posted'|'returned'|'partially_returned';
  createdAt:string;
  lines:readonly SaleLineView[];
}>;

export interface SalesContract{
  nextNumber(tenantId:string,tx:DbTx):Promise<string>;
  savePosted(input:SaleView,tx:DbTx):Promise<void>;
  get(tenantId:string,id:string,tx?:DbTx):Promise<SaleView|null>;
  list(tenantId:string,limit?:number):Promise<SaleView[]>;
  listByCustomer(tenantId:string,customerId:string,limit?:number):Promise<SaleView[]>;
  demandSummary(tenantId:string,branchId:string,days:number):Promise<ProductDemandView[]>;
  returnedQuantities(tenantId:string,saleId:string,tx?:DbTx):Promise<Record<string,number>>;
  returnedAmount(tenantId:string,saleId:string,tx?:DbTx):Promise<number>;
  saveReturn(input:{id:string;tenantId:string;saleId:string;branchId:string;userId:string;total:number;reason?:string;lines:ReadonlyArray<{id:string;saleLineId:string;productId:string;quantity:number;amount:number;classification:string}>},tx:DbTx):Promise<void>;
}
