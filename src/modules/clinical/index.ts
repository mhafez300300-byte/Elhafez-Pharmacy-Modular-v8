import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "clinical",
  ownsStores: ["prescriptions", "doctors", "recalls"],
  description: "clinical"
});
