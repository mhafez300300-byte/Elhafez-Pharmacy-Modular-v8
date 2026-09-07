/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface ReconciliationRouteDependencies {
  readonly auditDb: any;
  readonly buildFinancialReconciliation: any;
  readonly bumpChange: any;
  readonly ensureLicenseWritable: any;
  readonly hasAction: any;
  readonly hasPerm: any;
  readonly needAuth: any;
  readonly nowIso: any;
  readonly pool: any;
  readonly putRecord: any;
}
export interface ReconciliationServiceDependencies {
  readonly nowIso: any;
}
