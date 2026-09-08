import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
const account = (m) => m === 'cash' ? '1100' : m === 'card' ? '1110' : '1120';
export class SettlementService {
    uow;
    repo;
    customers;
    suppliers;
    cash;
    accounting;
    audit;
    constructor(uow, repo, customers, suppliers, cash, accounting, audit) {
        this.uow = uow;
        this.repo = repo;
        this.customers = customers;
        this.suppliers = suppliers;
        this.cash = cash;
        this.accounting = accounting;
        this.audit = audit;
    }
    async pay(tenantId, userId, input) { return this.uow.withTransaction(async (tx) => { if (input.partyType === 'customer') {
        const p = await this.customers.get(tenantId, input.partyId, tx);
        if (!p || !p.active)
            throw new AppError('CUSTOMER_NOT_FOUND', 'العميل غير موجود', 404);
    }
    else {
        const p = await this.suppliers.get(tenantId, input.partyId, tx);
        if (!p || !p.active)
            throw new AppError('SUPPLIER_NOT_FOUND', 'المورد غير موجود', 404);
    } const direction = input.partyType === 'customer' ? 'receive' : 'pay'; const pmt = await this.repo.allocatePayment({ id: newId('pmt'), tenantId, branchId: input.branchId, partyType: input.partyType, partyId: input.partyId, direction, method: input.method, amount: input.amount, reference: input.reference ?? null }, tx); if (input.method === 'cash') {
        const shift = await this.cash.getOpenShift(tenantId, input.branchId, undefined, tx);
        if (!shift)
            throw new AppError('OPEN_SHIFT_REQUIRED', 'يلزم وردية مفتوحة للسداد النقدي', 409);
        await this.cash.recordMovement({ id: newId('cmv'), tenantId, branchId: input.branchId, shiftId: shift.id, kind: direction === 'receive' ? 'income' : 'expense', amount: direction === 'receive' ? pmt.amount : -pmt.amount, referenceType: 'party_payment', referenceId: pmt.id }, tx);
    } const bank = account(input.method); await this.accounting.post({ id: newId('jrn'), tenantId, branchId: input.branchId, referenceType: 'party_payment', referenceId: pmt.id, description: input.partyType === 'customer' ? 'تحصيل عميل' : 'سداد مورد', lines: input.partyType === 'customer' ? [{ accountCode: bank, debit: pmt.amount, credit: 0 }, { accountCode: '1200', debit: 0, credit: pmt.amount }] : [{ accountCode: '2100', debit: pmt.amount, credit: 0 }, { accountCode: bank, debit: 0, credit: pmt.amount }] }, tx); await this.audit.record({ tenantId, userId, action: 'settlement.payment', entity: 'payment', entityId: pmt.id, detail: { partyType: input.partyType, partyId: input.partyId, amount: pmt.amount, method: input.method, unallocated: pmt.unallocated } }, tx); return pmt; }); }
}
