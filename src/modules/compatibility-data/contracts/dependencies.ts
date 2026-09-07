/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface CompatibilityDataRouteDependencies {
  readonly BULK_CLEAR_SAFE_STORES: any;
  readonly DIRECT_WRITE_BLOCKED_STORES: any;
  readonly POSTED_IMMUTABLE_STORES: any;
  readonly STORES: any;
  readonly assertUserGrant: any;
  readonly auditDb: any;
  readonly bumpChange: any;
  readonly canReadStore: any;
  readonly canWriteStore: any;
  readonly checkLicenseLimit: any;
  readonly delRecord: any;
  readonly deleteStoreProjections: any;
  readonly dropSessionCache: any;
  readonly encryptSecret: any;
  readonly ensureLicenseWritable: any;
  readonly firstTenant: any;
  readonly getRecord: any;
  readonly issueSession: any;
  readonly needAction: any;
  readonly needAuth: any;
  readonly needPerm: any;
  readonly ownerManagedClaims: any;
  readonly ownerOfStore: any;
  readonly pool: any;
  readonly putRecord: any;
  readonly querySearchFields: any;
  readonly redactRecordForUser: any;
  readonly rowValue: any;
  readonly safeSortExpr: any;
  readonly safeUser: any;
  readonly scryptHash: any;
  readonly sha256: any;
  readonly standaloneSetupAllowed: any;
}
export interface CompatibilityDataServiceDependencies {
  readonly Finance: any;
  readonly accountCode: any;
  readonly backfillCore: any;
  readonly branchOf: any;
  readonly deleteProjection: any;
  readonly fs: any;
  readonly path: any;
  readonly pool: any;
  readonly projectRecord: any;
  readonly rootDir: any;
  readonly rowValue: any;
  readonly runMigrations: any;
  readonly sanitizeRecord: any;
}
