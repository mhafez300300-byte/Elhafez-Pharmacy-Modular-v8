import { AppError } from '../../../core/errors/app-error.js';

export type FefoBatch = Readonly<{ id: string; quantity: number; expiryDate: string | null; receivedAt: string }>;
export type FefoAllocation = Readonly<{ batchId: string; quantity: number }>;

export function allocateFefo(batches: readonly FefoBatch[], requestedQuantity: number, now = new Date()): FefoAllocation[] {
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) throw new AppError('SALE_QTY_INVALID', 'الكمية المطلوبة غير صحيحة', 422);
  const today = now.toISOString().slice(0,10);
  const available = batches
    .filter(b => b.quantity > 0 && (!b.expiryDate || b.expiryDate >= today))
    .slice()
    .sort((a,b) => {
      const ea=a.expiryDate??'9999-12-31', eb=b.expiryDate??'9999-12-31';
      return ea.localeCompare(eb) || a.receivedAt.localeCompare(b.receivedAt) || a.id.localeCompare(b.id);
    });
  let remaining=requestedQuantity;
  const out:FefoAllocation[]=[];
  for(const batch of available){if(remaining<=0)break;const quantity=Math.min(remaining,batch.quantity);if(quantity>0){out.push({batchId:batch.id,quantity});remaining-=quantity;}}
  if(remaining>1e-9)throw new AppError('STOCK_INSUFFICIENT','المخزون المتاح لا يكفي لإتمام العملية',409,{requestedQuantity,availableQuantity:requestedQuantity-remaining});
  return out;
}
