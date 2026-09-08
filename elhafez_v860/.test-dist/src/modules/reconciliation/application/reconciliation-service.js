const moneyEq = (a, b) => Math.abs(a - b) < 0.011;
const qtyEq = (a, b) => Math.abs(a - b) < 1e-6;
const sumQty = (lines) => lines.reduce((s, x) => s + Number(x.quantity || 0), 0);
export class ReconciliationService {
    sales;
    purchases;
    accounting;
    cash;
    inventory;
    settlements;
    constructor(sales, purchases, accounting, cash, inventory, settlements) {
        this.sales = sales;
        this.purchases = purchases;
        this.accounting = accounting;
        this.cash = cash;
        this.inventory = inventory;
        this.settlements = settlements;
    }
    async scan(tenantId, branchId, limit = 100) {
        const safeLimit = Math.max(1, Math.min(250, Math.trunc(limit || 100)));
        const [sales, purchases] = await Promise.all([this.sales.list(tenantId, safeLimit), this.purchases.list(tenantId, safeLimit)]);
        const saleDocs = sales.filter(x => !branchId || x.branchId === branchId), purchaseDocs = purchases.filter(x => !branchId || x.branchId === branchId);
        const issueGroups = await Promise.all([
            ...saleDocs.map(x => this.checkSale(tenantId, x)),
            ...purchaseDocs.map(x => this.checkPurchase(tenantId, x)),
        ]);
        const issues = issueGroups.flat(), critical = issues.filter(x => x.severity === 'critical').length, warnings = issues.length - critical;
        return { scannedSales: saleDocs.length, scannedPurchases: purchaseDocs.length, issues, critical, warnings, ok: issues.length === 0, generatedAt: new Date().toISOString() };
    }
    async checkSale(t, sale) {
        const issues = [];
        const expectedQty = sumQty(sale.lines);
        const [journal, inventoryQty, cashAmount, obligation] = await Promise.all([
            this.accounting.hasReference(t, 'sale', sale.id),
            this.inventory.sourceQuantity(t, sale.branchId, 'sale', sale.id, 'issue'),
            sale.payment === 'cash' ? this.cash.referenceAmount(t, sale.branchId, 'sale', sale.id, 'sale') : Promise.resolve(0),
            sale.payment === 'credit' ? this.settlements.obligationByReference(t, 'sale', sale.id) : Promise.resolve(null),
        ]);
        if (!journal)
            issues.push(this.issue('sale_missing_journal', 'sale', sale, 'فاتورة بيع بدون قيد محاسبي.'));
        if (!qtyEq(inventoryQty, expectedQty))
            issues.push(this.issue('sale_inventory_mismatch', 'sale', sale, 'كمية خصم المخزون لا تطابق كمية الفاتورة.', expectedQty, inventoryQty));
        if (sale.payment === 'cash' && !moneyEq(cashAmount, sale.total))
            issues.push(this.issue('sale_cash_mismatch', 'sale', sale, 'الحركة النقدية لا تطابق إجمالي فاتورة البيع.', sale.total, cashAmount));
        if (sale.payment === 'credit' && !obligation)
            issues.push(this.issue('sale_missing_receivable', 'sale', sale, 'فاتورة بيع آجلة بدون ذمة عميل مرتبطة.'));
        return issues;
    }
    async checkPurchase(t, purchase) {
        const issues = [];
        const expectedQty = sumQty(purchase.lines);
        const [journal, inventoryQty, cashAmount, obligation] = await Promise.all([
            this.accounting.hasReference(t, 'purchase', purchase.id),
            this.inventory.sourceQuantity(t, purchase.branchId, 'purchase', purchase.id, 'receipt'),
            purchase.payment === 'cash' ? this.cash.referenceAmount(t, purchase.branchId, 'purchase', purchase.id, 'purchase') : Promise.resolve(0),
            purchase.payment === 'credit' ? this.settlements.obligationByReference(t, 'purchase', purchase.id) : Promise.resolve(null),
        ]);
        if (!journal)
            issues.push(this.issue('purchase_missing_journal', 'purchase', purchase, 'فاتورة شراء بدون قيد محاسبي.'));
        if (!qtyEq(inventoryQty, expectedQty))
            issues.push(this.issue('purchase_inventory_mismatch', 'purchase', purchase, 'كمية استلام المخزون لا تطابق كمية فاتورة الشراء.', expectedQty, inventoryQty));
        if (purchase.payment === 'cash' && !moneyEq(cashAmount, -purchase.total))
            issues.push(this.issue('purchase_cash_mismatch', 'purchase', purchase, 'الحركة النقدية لا تطابق إجمالي الشراء النقدي.', -purchase.total, cashAmount));
        if (purchase.payment === 'credit' && !obligation)
            issues.push(this.issue('purchase_missing_payable', 'purchase', purchase, 'فاتورة شراء آجلة بدون ذمة مورد مرتبطة.'));
        return issues;
    }
    issue(code, type, doc, message, expected, actual) {
        const out = { code, severity: 'critical', documentType: type, documentId: doc.id, documentNumber: doc.number, branchId: doc.branchId, message, ...(expected === undefined ? {} : { expected }), ...(actual === undefined ? {} : { actual }) };
        return out;
    }
}
