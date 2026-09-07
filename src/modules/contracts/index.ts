import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "contracts",
  ownsStores: ["contracts", "claims"],
  description: "contracts"
});
