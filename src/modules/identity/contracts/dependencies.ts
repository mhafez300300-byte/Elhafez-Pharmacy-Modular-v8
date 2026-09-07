/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface IdentityRouteDependencies {
  readonly auditDb: any;
  readonly base32Encode: any;
  readonly cookie: any;
  readonly crypto: any;
  readonly decryptSecret: any;
  readonly dropSessionCache: any;
  readonly encryptSecret: any;
  readonly firstTenant: any;
  readonly issueSession: any;
  readonly needAuth: any;
  readonly path: any;
  readonly pool: any;
  readonly rateLimit: any;
  readonly safeUser: any;
  readonly scryptHash: any;
  readonly sha256: any;
  readonly verifyCurrentCredential: any;
  readonly verifyHash: any;
  readonly verifyTotp: any;
}
export interface IdentityServiceDependencies {
  readonly APP_SECRET: any;
  readonly APP_VERSION: any;
  readonly READ_DEPS: any;
  readonly STORE_PERMISSION: any;
  readonly crypto: any;
  readonly path: any;
  readonly pool: any;
  readonly randomToken: any;
  readonly sha256: any;
}
