/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface PlatformRouteDependencies {
  readonly APP_VERSION: any;
  readonly compareVersions: any;
  readonly crypto: any;
  readonly encryptSecret: any;
  readonly firstTenant: any;
  readonly needAction: any;
  readonly needAuth: any;
  readonly needPerm: any;
  readonly pool: any;
  readonly rateLimit: any;
  readonly sha256: any;
}
export interface PlatformServiceDependencies {
  readonly APP_VERSION: any;
  readonly crypto: any;
  readonly decryptSecret: any;
  readonly pool: any;
  readonly sha256: any;
}
