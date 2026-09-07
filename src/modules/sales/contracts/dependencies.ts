/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface SalesRouteDependencies {
  readonly hasPerm: any;
  readonly needAuth: any;
  readonly needPerm: any;
  readonly pool: any;
  readonly redactRecordForUser: any;
  readonly rowValue: any;
}
export interface SalesServiceDependencies {
  readonly Finance: any;
  readonly accountCode: any;
  readonly clinicalAlertsForProducts: any;
  readonly consumeReceiptProvenance: any;
  readonly contractActiveOn: any;
  readonly deriveSaleBenefits: any;
  readonly deriveSaleReturn: any;
  readonly hasAction: any;
  readonly insuranceSettlement: any;
  readonly nextDocumentNumber: any;
  readonly nowIso: any;
  readonly restoreReceiptProvenance: any;
  readonly saleBasePrice: any;
  readonly saleOfferPrice: any;
  readonly saleUnitFactor: any;
  readonly sanitizeRecord: any;
  readonly serverId: any;
  readonly validateFefoAllocation: any;
  readonly validateSaleDocument: any;
}
