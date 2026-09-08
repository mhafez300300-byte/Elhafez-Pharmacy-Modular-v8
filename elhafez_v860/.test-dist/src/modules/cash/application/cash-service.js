import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
export class CashService {
    uow;
    cash;
    audit;
    constructor(uow, cash, audit) {
        this.uow = uow;
        this.cash = cash;
        this.audit = audit;
    }
    async open(t, u, i) { if (!i.branchId || !Number.isFinite(i.openingCash) || i.openingCash < 0)
        throw new AppError('SHIFT_OPEN_INVALID', 'بيانات فتح الوردية غير صحيحة', 422); return this.uow.withTransaction(async (tx) => { const v = await this.cash.openShift({ id: newId('shf'), tenantId: t, branchId: i.branchId, userId: u, openingCash: i.openingCash }, tx); await this.audit.record({ tenantId: t, userId: u, action: 'shift.opened', entity: 'cash_shift', entityId: v.id, detail: { branchId: v.branchId, openingCash: v.openingCash } }, tx); return v; }); }
    async close(t, u, i) { if (!i.shiftId || !Number.isFinite(i.closingCash) || i.closingCash < 0)
        throw new AppError('SHIFT_CLOSE_INVALID', 'الرصيد الفعلي عند الإغلاق غير صحيح', 422); return this.uow.withTransaction(async (tx) => { const before = await this.cash.getShift(t, i.shiftId, tx); if (!before)
        throw new AppError('SHIFT_NOT_FOUND', 'الوردية غير موجودة', 404); const v = await this.cash.closeShift({ tenantId: t, shiftId: i.shiftId, closingCash: i.closingCash }, tx); await this.audit.record({ tenantId: t, userId: u, action: 'shift.closed', entity: 'cash_shift', entityId: v.id, detail: { branchId: v.branchId, openingCash: v.openingCash, closingCash: v.closingCash, expectedCash: v.expectedCash, variance: v.variance } }, tx); return v; }); }
}
