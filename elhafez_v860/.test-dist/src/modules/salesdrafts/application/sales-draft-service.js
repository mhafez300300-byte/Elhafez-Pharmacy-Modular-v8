import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
import { normalizeSuspendedSale } from '../domain/sales-draft.js';
export class SalesDraftService {
    uow;
    repo;
    audit;
    constructor(uow, repo, audit) {
        this.uow = uow;
        this.repo = repo;
        this.audit = audit;
    }
    async suspend(t, u, input) { const n = normalizeSuspendedSale(input), now = new Date().toISOString(), id = newId('drf'); return this.uow.withTransaction(async (tx) => { const v = await this.repo.save({ id, tenantId: t, userId: u, ...n, createdAt: now, updatedAt: now }, tx); await this.audit.record({ tenantId: t, userId: u, action: 'sales.draft.suspended', entity: 'sales_draft', entityId: id, detail: { label: v.label, branchId: v.branchId, lines: v.lines.length } }, tx); return v; }); }
    async remove(t, u, id) { return this.uow.withTransaction(async (tx) => { const before = await this.repo.get(t, id); if (!before)
        throw new AppError('DRAFT_NOT_FOUND', 'الفاتورة المعلقة غير موجودة', 404); await this.repo.delete(t, id, tx); await this.audit.record({ tenantId: t, userId: u, action: 'sales.draft.deleted', entity: 'sales_draft', entityId: id, detail: { label: before.label } }, tx); return { deleted: true }; }); }
}
