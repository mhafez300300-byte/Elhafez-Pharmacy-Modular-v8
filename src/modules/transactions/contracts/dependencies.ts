/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface TransactionsRouteDependencies {
  readonly INTENT_STORES: any;
  readonly POSTED_IMMUTABLE_STORES: any;
  readonly STORES: any;
  readonly applyAtomicOp: any;
  readonly applySalePutBatch: any;
  readonly auditDb: any;
  readonly bumpChange: any;
  readonly canWriteStore: any;
  readonly coalesceAtomicOperations: any;
  readonly ensureLicenseWritable: any;
  readonly hasAction: any;
  readonly hasPerm: any;
  readonly licenseFeature: any;
  readonly needAuth: any;
  readonly nowIso: any;
  readonly operationDates: any;
  readonly periodLocked: any;
  readonly pool: any;
  readonly prepareExpenseCommercial: any;
  readonly prepareInsuranceClaimsCommercial: any;
  readonly prepareInventoryCommercial: any;
  readonly preparePurchaseCommercial: any;
  readonly prepareReturnCommercial: any;
  readonly prepareSaleCommercial: any;
  readonly prepareShiftCommercial: any;
  readonly prepareSupplierReturnCommercial: any;
  readonly redactRecordForUser: any;
  readonly sanitizeRecord: any;
  readonly serverId: any;
  readonly validateFinancialBundle: any;
  readonly validateOperationalCashMoveShifts: any;
}
export interface TransactionsServiceDependencies {
  readonly branchOf: any;
  readonly delRecord: any;
  readonly projectRecord: any;
  readonly putRecord: any;
  readonly sanitizeRecord: any;
  readonly validateJournalRecord: any;
}
