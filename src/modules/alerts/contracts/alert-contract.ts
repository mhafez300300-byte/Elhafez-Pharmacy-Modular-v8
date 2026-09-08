export type AlertRefreshResult=Readonly<{outOfStock:number;lowStock:number;expiredBatches:number;expiringSoonBatches:number;staleOpenShifts:number;shiftVariances:number;agedReceivables:number;agedPayables:number;integrityIssues:number;generatedAt:string}>;
export interface AlertContract{refresh(tenantId:string,branchId:string):Promise<AlertRefreshResult>;}
