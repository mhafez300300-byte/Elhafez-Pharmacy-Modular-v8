import type { DbTx } from '../../../core/db/types.js';

export type SuspendedSaleCart = Readonly<{
  id:string;
  tenantId:string;
  branchId:string;
  userId:string;
  label:string;
  customerId:string|null;
  payment:'cash'|'card'|'credit';
  invoiceDiscount:number;
  loyaltyPointsToRedeem:number;
  lines:ReadonlyArray<{productId:string;quantity:number;unitPrice?:number;discount?:number}>;
  createdAt:string;
  updatedAt:string;
}>;

export interface SalesDraftContract{
  save(input:SuspendedSaleCart,tx?:DbTx):Promise<SuspendedSaleCart>;
  get(tenantId:string,id:string):Promise<SuspendedSaleCart|null>;
  list(tenantId:string,branchId?:string):Promise<SuspendedSaleCart[]>;
  delete(tenantId:string,id:string,tx?:DbTx):Promise<boolean>;
}
