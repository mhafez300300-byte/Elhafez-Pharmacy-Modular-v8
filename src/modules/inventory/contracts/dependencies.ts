/** Module boundary dependencies. Keep this list explicit; do not replace with a service locator. */
export interface InventoryRouteDependencies {
  readonly hasAction: any;
  readonly hasPerm: any;
  readonly needAuth: any;
  readonly needPerm: any;
  readonly pool: any;
  readonly redactRecordForUser: any;
  readonly rowValue: any;
}
export interface InventoryServiceDependencies {
  readonly Finance: any;
  readonly accountCode: any;
}
