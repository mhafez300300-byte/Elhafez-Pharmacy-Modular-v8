import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "suppliers",
  ownsStores: ["suppliers", "supplierPayments"],
  description: "suppliers"
});
