import { AppError } from '../../../core/errors/app-error.js';
import { newId } from '../../../core/types/id.js';
export class TrackTraceService {
    repo;
    inventory;
    audit;
    settings;
    constructor(repo, inventory, audit, settings) {
        this.repo = repo;
        this.inventory = inventory;
        this.audit = audit;
        this.settings = settings;
    }
    async manual(t, u, i) { const prefs = this.settings ? await this.settings.get(t) : null; if (prefs?.preferences.trackTraceEnabled === false)
        throw new AppError('TRACE_DISABLED', 'التتبع الدوائي غير مفعّل من الإعدادات', 409); if (prefs?.preferences.traceRequireBatchNo && !i.batchId)
        throw new AppError('TRACE_BATCH_REQUIRED', 'الإعدادات تشترط اختيار تشغيلة لحدث التتبع', 422); let batchNo = null; if (i.batchId) {
        const b = await this.inventory.getBatch(t, i.batchId);
        if (!b)
            throw new AppError('TRACE_BATCH_NOT_FOUND', 'التشغيلة غير موجودة', 404);
        if (b.productId !== i.productId || b.branchId !== i.branchId)
            throw new AppError('TRACE_BATCH_MISMATCH', 'التشغيلة لا تطابق الصنف أو الفرع', 409);
        batchNo = b.batchNo;
    } if (!(i.quantity > 0))
        throw new AppError('TRACE_QTY_INVALID', 'كمية التتبع يجب أن تكون أكبر من صفر', 422); const x = await this.repo.record({ id: newId('trc'), tenantId: t, branchId: i.branchId, productId: i.productId, batchId: i.batchId ?? null, batchNo, gtin: i.gtin?.trim() || null, serialNumber: i.serialNumber?.trim() || null, eventType: i.eventType, quantity: i.quantity, sourceType: i.sourceType?.trim() || 'manual', sourceId: i.sourceId?.trim() || null, note: i.note?.trim() || null, userId: u, createdAt: new Date().toISOString() }); await this.audit.record({ tenantId: t, userId: u, action: `trace.${i.eventType}`, entity: 'trace_event', entityId: x.id, detail: { productId: i.productId, batchId: i.batchId, sourceId: i.sourceId } }); return x; }
    async recordDispense(t, u, i, tx) { if (await this.repo.existsSource(t, 'dispensed', 'sale', i.saleId, i.batchId, tx))
        return; await this.repo.record({ id: newId('trc'), tenantId: t, branchId: i.branchId, productId: i.productId, batchId: i.batchId, batchNo: i.batchNo ?? null, gtin: null, serialNumber: null, eventType: 'dispensed', quantity: i.quantity, sourceType: 'sale', sourceId: i.saleId, note: 'auto from POS', userId: u, createdAt: new Date().toISOString() }, tx); }
}
