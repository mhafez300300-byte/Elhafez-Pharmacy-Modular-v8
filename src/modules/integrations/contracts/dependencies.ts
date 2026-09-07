/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface IntegrationsRouteDependencies {
  readonly auditDb: any;
  readonly bumpChange: any;
  readonly crypto: any;
  readonly hasAction: any;
  readonly licenseFeature: any;
  readonly needAuth: any;
  readonly needPerm: any;
  readonly nowIso: any;
  readonly pool: any;
  readonly putRecord: any;
}
