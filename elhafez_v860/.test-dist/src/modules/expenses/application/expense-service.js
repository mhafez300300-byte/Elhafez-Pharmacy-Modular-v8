import { AppError } from '../../../core/errors/app-error.js';
import { newId } from '../../../core/types/id.js';
const bank = (m) => m === 'cash' ? '1100' : m === 'card' ? '1110' : '1120';
export class ExpenseService {
    uow;
    repo;
    cash;
    accounting;
    audit;
    constructor(uow, repo, cash, accounting, audit) {
        this.uow = uow;
        this.repo = repo;
        this.cash = cash;
        this.accounting = accounting;
        this.audit = audit;
    }
    async create(t, u, i) { if (!i.branchId || !i.category.trim() || !i.description.trim() || i.amount <= 0)
        throw new AppError('EXPENSE_INVALID', 'بيانات المصروف غير مكتملة', 422); return this.uow.withTransaction(async (tx) => { const v = { id: newId('exp'), tenantId: t, branchId: i.branchId, userId: u, category: i.category.trim(), description: i.description.trim(), amount: Math.round(i.amount * 100) / 100, method: i.method, occurredAt: new Date().toISOString() }; if (i.method === 'cash') {
        const shift = await this.cash.getOpenShift(t, i.branchId, undefined, tx);
        if (!shift)
            throw new AppError('OPEN_SHIFT_REQUIRED', 'يلزم وردية مفتوحة لتسجيل مصروف نقدي', 409);
        await this.cash.recordMovement({ id: newId('cmv'), tenantId: t, branchId: i.branchId, shiftId: shift.id, kind: 'expense', amount: -v.amount, referenceType: 'expense', referenceId: v.id, note: v.description }, tx);
    } await this.repo.save(v, tx); await this.accounting.post({ id: newId('jrn'), tenantId: t, branchId: i.branchId, referenceType: 'expense', referenceId: v.id, description: v.description, lines: [{ accountCode: '6100', debit: v.amount, credit: 0 }, { accountCode: bank(i.method), debit: 0, credit: v.amount }] }, tx); await this.audit.record({ tenantId: t, userId: u, action: 'expense.created', entity: 'expense', entityId: v.id, detail: { amount: v.amount, category: v.category, method: v.method } }, tx); return v; }); }
}
