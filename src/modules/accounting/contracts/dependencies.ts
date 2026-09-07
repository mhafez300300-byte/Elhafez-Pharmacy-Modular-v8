/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface AccountingRouteDependencies {
  readonly Finance: any;
  readonly accountCode: any;
  readonly accountingRows: any;
  readonly auditDb: any;
  readonly bumpChange: any;
  readonly currentDeviceContext: any;
  readonly currentOpenShiftForPayment: any;
  readonly ensureLicenseWritable: any;
  readonly getRecord: any;
  readonly hasPerm: any;
  readonly needAction: any;
  readonly needAuth: any;
  readonly needPerm: any;
  readonly nowIso: any;
  readonly paymentAccount: any;
  readonly periodLocked: any;
  readonly pool: any;
  readonly putRecord: any;
  readonly serverId: any;
  readonly validatePeriodRange: any;
}
export interface AccountingServiceDependencies {
  readonly pool: any;
}
