export interface ReportContract {
  dashboard(tenantId:string,branchId:string):Promise<unknown>;
  salesSummary(tenantId:string,from?:string,to?:string):Promise<unknown>;
  stockAlerts(tenantId:string,branchId:string):Promise<unknown[]>;
  stockHealth(tenantId:string,branchId:string):Promise<unknown[]>;
  supplierPerformance(tenantId:string):Promise<unknown[]>;
  partyBalances(tenantId:string):Promise<unknown>;
  returnAnalysis(tenantId:string,from?:string,to?:string):Promise<unknown>;
}
