import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "organization",
  ownsStores: ["settings", "branches", "cashboxes"],
  description: "organization"
});
