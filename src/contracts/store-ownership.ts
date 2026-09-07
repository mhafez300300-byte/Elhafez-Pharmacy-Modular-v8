export const STORE_OWNERS = Object.freeze({
  settings:'organization', branches:'organization', cashboxes:'organization',
  users:'identity', roles:'identity', attendance:'identity',
  products:'catalog', priceHistory:'catalog', priceUpdates:'catalog', importRuns:'catalog', offers:'catalog',
  batches:'inventory', stockMoves:'inventory', counts:'inventory', transfers:'inventory', serialItems:'inventory', trackEvents:'inventory', recalls:'clinical', pushList:'inventory', shortageNotes:'inventory',
  customers:'customers', customerPayments:'customers',
  suppliers:'suppliers', supplierPayments:'suppliers',
  sales:'sales', returns:'sales', heldSales:'sales', orders:'sales', deliveryAgents:'sales',
  purchases:'purchases', purchaseOrders:'purchases', supplierReturns:'purchases',
  cashMoves:'cash', shifts:'cash', expenses:'cash',
  journal:'accounting',
  prescriptions:'clinical', doctors:'clinical',
  contracts:'contracts', claims:'contracts',
  loyalty:'loyalty',
  audit:'system'
} as const);

export type StoreName = keyof typeof STORE_OWNERS;
export type ModuleName = typeof STORE_OWNERS[StoreName];

export function ownerOfStore(store: string): string | null {
  return (STORE_OWNERS as Record<string,string>)[store] || null;
}
