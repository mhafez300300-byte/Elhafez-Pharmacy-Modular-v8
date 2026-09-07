/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface SystemRouteDependencies {
  readonly APP_VERSION: any;
  readonly firstTenant: any;
  readonly nowIso: any;
  readonly ownerProviderBrand: any;
  readonly ownerSetupMeta: any;
  readonly pool: any;
  readonly rowValue: any;
  readonly safeUser: any;
}
export interface SystemServiceDependencies {
  readonly fs: any;
}
