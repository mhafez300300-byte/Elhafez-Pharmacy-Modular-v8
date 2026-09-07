import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "catalog",
  ownsStores: ["products", "priceHistory", "priceUpdates", "importRuns", "offers"],
  description: "catalog"
});
