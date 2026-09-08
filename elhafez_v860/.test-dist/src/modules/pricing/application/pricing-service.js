import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
export class PricingService {
    uow;
    repo;
    catalog;
    audit;
    constructor(uow, repo, catalog, audit) {
        this.uow = uow;
        this.repo = repo;
        this.catalog = catalog;
        this.audit = audit;
    }
    async offer(t, u, i) { if (i.name.trim().length < 2 || i.value <= 0 || i.minQty <= 0)
        throw new AppError('OFFER_INVALID', 'بيانات العرض غير صحيحة', 422); if (i.kind === 'percent' && i.value > 100)
        throw new AppError('OFFER_PERCENT_INVALID', 'نسبة العرض لا يمكن أن تتجاوز 100%', 422); const v = { id: newId('off'), tenantId: t, name: i.name.trim(), productId: i.productId ?? null, kind: i.kind, value: i.value, minQty: i.minQty, startsAt: i.startsAt ?? new Date().toISOString(), endsAt: i.endsAt ?? null, active: true }; const out = await this.repo.createOffer(v); await this.audit.record({ tenantId: t, userId: u, action: 'pricing.offer.created', entity: 'offer', entityId: v.id, detail: { name: v.name } }); return out; }
    async priceUpdate(t, u, i) { if (!i.productId || i.newPrice < 0)
        throw new AppError('PRICE_UPDATE_INVALID', 'بيانات تحديث السعر غير صحيحة', 422); const p = await this.catalog.get(t, i.productId); if (!p)
        throw new AppError('PRODUCT_NOT_FOUND', 'الصنف غير موجود', 404); const v = { id: newId('pru'), tenantId: t, productId: i.productId, oldPrice: p.sellingPrice, newPrice: i.newPrice, source: i.source?.trim() || null, note: i.note?.trim() || null, status: 'pending', createdAt: new Date().toISOString(), appliedAt: null }; const out = await this.repo.createPriceUpdate(v); await this.audit.record({ tenantId: t, userId: u, action: 'pricing.update.created', entity: 'price_update', entityId: v.id, detail: { old: p.sellingPrice, new: i.newPrice } }); return out; }
    async apply(t, u, id) { return this.uow.withTransaction(async (tx) => { const v = await this.repo.getPriceUpdate(t, id, tx); if (!v)
        throw new AppError('PRICE_UPDATE_NOT_FOUND', 'تحديث السعر غير موجود', 404); if (v.status !== 'pending')
        throw new AppError('PRICE_UPDATE_CLOSED', 'تحديث السعر غير قابل للتطبيق', 409); await this.catalog.updateSellingPrice(t, v.productId, v.newPrice, tx); await this.repo.markApplied(t, id, tx); await this.audit.record({ tenantId: t, userId: u, action: 'pricing.update.applied', entity: 'price_update', entityId: id, detail: { productId: v.productId, newPrice: v.newPrice } }, tx); return { ...v, status: 'applied', appliedAt: new Date().toISOString() }; }); }
}
