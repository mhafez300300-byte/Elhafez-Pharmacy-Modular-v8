import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "purchases",
  ownsStores: ["purchases", "purchaseOrders", "supplierReturns"],
  description: "purchases"
});
