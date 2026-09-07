import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "cash",
  ownsStores: ["cashMoves", "shifts", "expenses"],
  description: "cash"
});
