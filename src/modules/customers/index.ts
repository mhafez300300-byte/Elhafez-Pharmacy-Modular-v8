import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "customers",
  ownsStores: ["customers", "customerPayments"],
  description: "customers"
});
