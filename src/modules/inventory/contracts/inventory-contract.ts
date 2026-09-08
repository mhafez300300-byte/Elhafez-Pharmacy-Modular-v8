import type{DbTx}from'../../../core/db/types.js';
export type StockBatchView=Readonly<{id:string;tenantId:string;branchId:string;productId:string;batchNo:string|null;expiryDate:string|null;quantity:number;unitCost:number;receivedAt:string;status:string}>;
export type StockBalanceView=Readonly<{productId:string;quantity:number;nearestExpiry:string|null}>;
export type StockAllocation=Readonly<{batchId:string;quantity:number;unitCost:number;batchNo?:string|null;expiryDate?:string|null}>;
export type TransferView=Readonly<{id:string;tenantId:string;fromBranchId:string;toBranchId:string;userId:string;status:'posted';createdAt:string;lines:ReadonlyArray<{productId:string;quantity:number}>}>;
export type CountView=Readonly<{id:string;tenantId:string;branchId:string;userId:string;status:'posted';createdAt:string;lines:ReadonlyArray<{batchId:string;productId:string;expected:number;counted:number;difference:number}>}>;
export interface InventoryContract{
 receiveBatch(input:{id:string;tenantId:string;branchId:string;productId:string;batchNo?:string|null;expiryDate?:string|null;quantity:number;unitCost:number;sourceType:string;sourceId:string},tx:DbTx):Promise<StockBatchView>;
 issueFefo(input:{tenantId:string;branchId:string;productId:string;quantity:number;sourceType:string;sourceId:string},tx:DbTx):Promise<ReadonlyArray<StockAllocation>>;
 issueSpecificBatch(input:{tenantId:string;branchId:string;productId:string;batchId:string;quantity:number;sourceType:string;sourceId:string},tx:DbTx):Promise<StockAllocation>;
 returnStock(input:{id:string;tenantId:string;branchId:string;productId:string;batchId?:string|null;quantity:number;unitCost:number;classification:'sellable'|'quarantine'|'damaged'|'expired';sourceId:string},tx:DbTx):Promise<void>;
 getBatch(tenantId:string,batchId:string,tx?:DbTx):Promise<StockBatchView|null>;
 adjustBatch(input:{tenantId:string;batchId:string;counted:number;sourceId:string},tx:DbTx):Promise<{batch:StockBatchView;expected:number;difference:number}>;
 saveTransfer(view:TransferView,tx:DbTx):Promise<void>;
 saveCount(view:CountView,tx:DbTx):Promise<void>;
 listTransfers(tenantId:string,limit?:number):Promise<TransferView[]>;
 listCounts(tenantId:string,limit?:number):Promise<CountView[]>;
 balance(tenantId:string,branchId:string,productId:string,tx?:DbTx):Promise<number>;
 balances(tenantId:string,branchId:string):Promise<StockBalanceView[]>;
 listBatches(tenantId:string,branchId:string,productId?:string):Promise<StockBatchView[]>;
 sourceQuantity(tenantId:string,branchId:string,sourceType:string,sourceId:string,kind?:'receipt'|'issue'|'return'|'adjustment'):Promise<number>;
}
