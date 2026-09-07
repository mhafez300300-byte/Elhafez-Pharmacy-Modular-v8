/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface ClinicalRouteDependencies {
  readonly auditDb: any;
  readonly clinicalAlertsForProducts: any;
  readonly needAuth: any;
  readonly needPerm: any;
  readonly pool: any;
}
