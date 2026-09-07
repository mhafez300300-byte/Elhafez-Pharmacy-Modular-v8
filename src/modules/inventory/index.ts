import type { ModuleDescriptor } from '../../core/types/contracts';

export const descriptor: ModuleDescriptor = Object.freeze({
  name: "inventory",
  ownsStores: ["batches", "stockMoves", "counts", "transfers", "serialItems", "trackEvents", "pushList", "shortageNotes"],
  description: "inventory"
});
