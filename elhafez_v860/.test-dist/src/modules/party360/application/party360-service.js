import { AppError } from '../../../core/errors/app-error.js';
export class Party360Service {
    customers;
    suppliers;
    sales;
    purchases;
    settlements;
    constructor(customers, suppliers, sales, purchases, settlements) {
        this.customers = customers;
        this.suppliers = suppliers;
        this.sales = sales;
        this.purchases = purchases;
        this.settlements = settlements;
    }
    async customer(tenantId, customerId) {
        const party = await this.customers.get(tenantId, customerId);
        if (!party)
            throw new AppError('CUSTOMER_NOT_FOUND', 'العميل غير موجود', 404);
        const [outstanding, obligations, payments, sales] = await Promise.all([
            this.settlements.balance(tenantId, 'customer', customerId),
            this.settlements.listObligations(tenantId, 'customer', customerId),
            this.settlements.listPayments(tenantId, 'customer', customerId),
            this.sales.listByCustomer(tenantId, customerId, 100),
        ]);
        const salesTotal = sales.reduce((n, x) => n + x.total, 0), receivedTotal = payments.filter(x => x.direction === 'receive').reduce((n, x) => n + x.amount, 0);
        return { kind: 'customer', party, outstanding, availableCredit: Math.max(0, party.creditLimit - outstanding), salesTotal, receivedTotal, lastActivityAt: maxDate([...sales.map(x => x.createdAt), ...payments.map(x => x.createdAt)]), obligations, payments, sales };
    }
    async supplier(tenantId, supplierId) {
        const party = await this.suppliers.get(tenantId, supplierId);
        if (!party)
            throw new AppError('SUPPLIER_NOT_FOUND', 'المورد غير موجود', 404);
        const [outstanding, obligations, payments, purchases] = await Promise.all([
            this.settlements.balance(tenantId, 'supplier', supplierId),
            this.settlements.listObligations(tenantId, 'supplier', supplierId),
            this.settlements.listPayments(tenantId, 'supplier', supplierId),
            this.purchases.listBySupplier(tenantId, supplierId, 100),
        ]);
        const purchasesTotal = purchases.reduce((n, x) => n + x.total, 0), paidTotal = payments.filter(x => x.direction === 'pay').reduce((n, x) => n + x.amount, 0);
        return { kind: 'supplier', party, outstanding, purchasesTotal, paidTotal, lastActivityAt: maxDate([...purchases.map(x => x.createdAt), ...payments.map(x => x.createdAt)]), obligations, payments, purchases };
    }
}
function maxDate(values) { if (!values.length)
    return null; return values.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null; }
