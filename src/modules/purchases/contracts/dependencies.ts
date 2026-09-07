/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface PurchasesServiceDependencies {
  readonly Finance: any;
  readonly accountCode: any;
  readonly consumeReceiptProvenance: any;
  readonly nextDocumentNumber: any;
  readonly nowIso: any;
  readonly sanitizeRecord: any;
  readonly serverId: any;
}
