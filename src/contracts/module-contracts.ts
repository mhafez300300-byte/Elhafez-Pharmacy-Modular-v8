export interface AuthorizationContract {
  hasPerm(user: any, permission: string): boolean;
  needPerm(permission: string): any;
  hasAction(user: any, action: string): boolean;
}

export interface CashShiftContract {
  currentOpenShiftForPayment(client: any, tenantId: string, userId: string, branchId?: string | null, cashboxId?: string | null): Promise<any>;
}

export interface InventoryProvenanceContract {
  consumeReceiptProvenance(client: any, tenantId: string, batchId: string, batch: any, qty: number, options?: any): Promise<any>;
  restoreReceiptProvenance(client: any, tenantId: string, batchId: string, allocations: any[]): Promise<any>;
}

export interface AuditContract {
  auditDb(tenantId: string, userId: string | null, action: string, entity: string, entityId: string | null, beforeValue?: any, afterValue?: any, req?: any): Promise<void>;
}

export interface EventBusContract {
  publish(event: { type: string; tenantId?: string; payload?: any }): Promise<void>;
}
