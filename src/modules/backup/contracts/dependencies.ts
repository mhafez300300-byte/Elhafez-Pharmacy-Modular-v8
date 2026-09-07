/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface BackupRouteDependencies {
  readonly backfillCore: any;
  readonly backupKey: any;
  readonly chromiumBin: any;
  readonly crypto: any;
  readonly dropSessionCache: any;
  readonly execFileAsync: any;
  readonly express: any;
  readonly fs: any;
  readonly makeBackup: any;
  readonly needAction: any;
  readonly needAuth: any;
  readonly os: any;
  readonly ownerProviderBrand: any;
  readonly path: any;
  readonly pool: any;
  readonly salePdfHtml: any;
  readonly sha256: any;
}
export interface BackupServiceDependencies {
  readonly APP_SECRET: any;
  readonly APP_VERSION: any;
  readonly crypto: any;
  readonly fs: any;
  readonly nowIso: any;
  readonly path: any;
  readonly pool: any;
  readonly rootDir: any;
  readonly sha256: any;
}
