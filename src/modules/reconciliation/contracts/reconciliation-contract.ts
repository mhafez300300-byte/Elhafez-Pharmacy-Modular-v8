export type IntegrityIssue=Readonly<{
  code:string;
  severity:'critical'|'warning';
  documentType:'sale'|'purchase';
  documentId:string;
  documentNumber:string;
  branchId:string;
  message:string;
  expected?:number;
  actual?:number;
}>;

export type ReconciliationResult=Readonly<{
  scannedSales:number;
  scannedPurchases:number;
  issues:readonly IntegrityIssue[];
  critical:number;
  warnings:number;
  ok:boolean;
  generatedAt:string;
}>;

export interface ReconciliationContract{
  scan(tenantId:string,branchId?:string,limit?:number):Promise<ReconciliationResult>;
}
