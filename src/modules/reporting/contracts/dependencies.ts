/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface ReportingRouteDependencies {
  readonly Finance: any;
  readonly dropSessionCache: any;
  readonly hasAction: any;
  readonly hasPerm: any;
  readonly needAuth: any;
  readonly needPerm: any;
  readonly pool: any;
}
