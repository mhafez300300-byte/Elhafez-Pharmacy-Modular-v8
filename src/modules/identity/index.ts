import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "identity",
  ownsStores: ["users", "roles", "attendance"],
  description: "identity"
});
