/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface CashRouteDependencies {
  readonly Finance: any;
  readonly needAuth: any;
  readonly nowIso: any;
  readonly pool: any;
  readonly putRecord: any;
}
export interface CashServiceDependencies {
  readonly Finance: any;
  readonly nowIso: any;
  readonly sanitizeRecord: any;
}
