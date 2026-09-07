import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "sales",
  ownsStores: ["sales", "returns", "heldSales", "orders", "deliveryAgents"],
  description: "sales"
});
