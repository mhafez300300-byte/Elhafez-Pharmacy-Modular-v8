import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
export class InventoryService {
    uow;
    inv;
    audit;
    constructor(uow, inv, audit) {
        this.uow = uow;
        this.inv = inv;
        this.audit = audit;
    }
    async transfer(t, u, i) { if (!i.fromBranchId || !i.toBranchId || i.fromBranchId === i.toBranchId || !i.lines.length)
        throw new AppError('TRANSFER_INVALID', 'بيانات التحويل غير صحيحة', 422); return this.uow.withTransaction(async (tx) => { const id = newId('trf'), lines = []; for (const l of i.lines) {
        if (!l.productId || l.quantity <= 0)
            throw new AppError('TRANSFER_LINE_INVALID', 'سطر التحويل غير صحيح', 422);
        const allocations = await this.inv.issueFefo({ tenantId: t, branchId: i.fromBranchId, productId: l.productId, quantity: l.quantity, sourceType: 'transfer_out', sourceId: id }, tx);
        for (const a of allocations)
            await this.inv.receiveBatch({ id: newId('bat'), tenantId: t, branchId: i.toBranchId, productId: l.productId, batchNo: a.batchNo ?? null, expiryDate: a.expiryDate ?? null, quantity: a.quantity, unitCost: a.unitCost, sourceType: 'transfer_in', sourceId: id }, tx);
        lines.push({ productId: l.productId, quantity: l.quantity });
    } const v = { id, tenantId: t, fromBranchId: i.fromBranchId, toBranchId: i.toBranchId, userId: u, status: 'posted', createdAt: new Date().toISOString(), lines }; await this.inv.saveTransfer(v, tx); await this.audit.record({ tenantId: t, userId: u, action: 'inventory.transfer', entity: 'stock_transfer', entityId: id, detail: { from: i.fromBranchId, to: i.toBranchId, lines } }, tx); return v; }); }
    async count(t, u, i) { if (!i.branchId || !i.lines.length)
        throw new AppError('COUNT_INVALID', 'بيانات الجرد غير صحيحة', 422); return this.uow.withTransaction(async (tx) => { const id = newId('cnt'), lines = []; for (const l of i.lines) {
        if (!l.batchId || l.counted < 0)
            throw new AppError('COUNT_LINE_INVALID', 'سطر الجرد غير صحيح', 422);
        const b = await this.inv.getBatch(t, l.batchId, tx);
        if (!b || b.branchId !== i.branchId)
            throw new AppError('BATCH_NOT_FOUND', 'التشغيلة غير موجودة في الفرع', 404);
        const a = await this.inv.adjustBatch({ tenantId: t, batchId: l.batchId, counted: l.counted, sourceId: id }, tx);
        lines.push({ batchId: b.id, productId: b.productId, expected: a.expected, counted: l.counted, difference: a.difference });
    } const v = { id, tenantId: t, branchId: i.branchId, userId: u, status: 'posted', createdAt: new Date().toISOString(), lines }; await this.inv.saveCount(v, tx); await this.audit.record({ tenantId: t, userId: u, action: 'inventory.count', entity: 'stock_count', entityId: id, detail: { branchId: i.branchId, lines } }, tx); return v; }); }
}
