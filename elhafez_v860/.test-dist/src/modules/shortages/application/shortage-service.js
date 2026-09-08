import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
export class ShortageService {
    uow;
    repo;
    audit;
    constructor(uow, repo, audit) {
        this.uow = uow;
        this.repo = repo;
        this.audit = audit;
    }
    async create(t, u, i) { const free = i.freeText?.trim() || null, product = i.productId?.trim() || null; if (!i.branchId || (!product && !free) || !Number.isFinite(i.quantity) || i.quantity <= 0)
        throw new AppError('SHORTAGE_INVALID', 'بيانات كشكول النواقص غير صحيحة', 422); return this.uow.withTransaction(async (tx) => { const now = new Date().toISOString(), v = await this.repo.create({ id: newId('shr'), tenantId: t, branchId: i.branchId, productId: product, freeText: free, quantity: i.quantity, customerId: i.customerId?.trim() || null, customerName: i.customerName?.trim() || null, customerPhone: i.customerPhone?.trim() || null, reason: i.reason?.trim() || null, note: i.note?.trim() || null, status: 'open', source: i.source?.trim() || 'manual', createdBy: u, createdAt: now, updatedAt: now }, tx); await this.audit.record({ tenantId: t, userId: u, action: 'shortage.created', entity: 'shortage', entityId: v.id, detail: { branchId: v.branchId, productId: v.productId, freeText: v.freeText, quantity: v.quantity } }, tx); return v; }); }
    async status(t, u, id, status) { return this.uow.withTransaction(async (tx) => { const old = await this.repo.get(t, id, tx); if (!old)
        throw new AppError('SHORTAGE_NOT_FOUND', 'سطر النواقص غير موجود', 404); const v = await this.repo.updateStatus(t, id, status, tx); await this.audit.record({ tenantId: t, userId: u, action: 'shortage.status', entity: 'shortage', entityId: id, detail: { from: old.status, to: status } }, tx); return v; }); }
}
