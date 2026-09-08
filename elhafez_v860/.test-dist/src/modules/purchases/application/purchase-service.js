import { newId } from '../../../core/types/id.js';
import { AppError } from '../../../core/errors/app-error.js';
import { validatePurchase, validateOrderReceiptAllocation } from '../domain/purchase.js';
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export class PurchaseService {
    uow;
    purchases;
    suppliers;
    catalog;
    inventory;
    cash;
    accounting;
    audit;
    settlements;
    constructor(uow, purchases, suppliers, catalog, inventory, cash, accounting, audit, settlements) {
        this.uow = uow;
        this.purchases = purchases;
        this.suppliers = suppliers;
        this.catalog = catalog;
        this.inventory = inventory;
        this.cash = cash;
        this.accounting = accounting;
        this.audit = audit;
        this.settlements = settlements;
    }
    async createOrder(tenantId, userId, input) { if (!input.branchId || !input.supplierId || !input.lines.length)
        throw new AppError('PURCHASE_ORDER_INVALID', 'بيانات أمر الشراء غير مكتملة', 422); return this.uow.withTransaction(async (tx) => { const supplier = await this.suppliers.get(tenantId, input.supplierId, tx); if (!supplier || !supplier.active)
        throw new AppError('SUPPLIER_NOT_FOUND', 'المورد غير موجود أو غير نشط', 404); const lines = []; for (const raw of input.lines) {
        if (raw.quantity <= 0 || raw.unitCost < 0)
            throw new AppError('PURCHASE_ORDER_LINE_INVALID', 'سطر أمر الشراء غير صحيح', 422);
        const product = await this.catalog.get(tenantId, raw.productId, tx);
        if (!product || !product.active)
            throw new AppError('PRODUCT_NOT_FOUND', 'الصنف غير موجود أو غير نشط', 404);
        lines.push({ id: newId('pol'), productId: raw.productId, orderedQty: raw.quantity, receivedQty: 0, unitCost: raw.unitCost });
    } const order = { id: newId('po'), number: await this.purchases.nextOrderNumber(tenantId, tx), tenantId, branchId: input.branchId, supplierId: input.supplierId, userId, status: 'open', createdAt: new Date().toISOString(), lines }; await this.purchases.createOrder(order, tx); await this.audit.record({ tenantId, userId, action: 'purchase_order.created', entity: 'purchase_order', entityId: order.id, detail: { number: order.number } }, tx); return order; }); }
    async receive(tenantId, userId, input) { validatePurchase(input); return this.uow.withTransaction(async (tx) => { const supplier = await this.suppliers.get(tenantId, input.supplierId, tx); if (!supplier || !supplier.active)
        throw new AppError('SUPPLIER_NOT_FOUND', 'المورد غير موجود أو غير نشط', 404); let order = null; if (input.orderId) {
        order = await this.purchases.getOrder(tenantId, input.orderId, tx);
        if (!order)
            throw new AppError('PURCHASE_ORDER_NOT_FOUND', 'أمر الشراء غير موجود', 404);
        if (order.status === 'cancelled' || order.status === 'received')
            throw new AppError('PURCHASE_ORDER_CLOSED', 'أمر الشراء مغلق', 409);
        if (order.branchId !== input.branchId || order.supplierId !== input.supplierId)
            throw new AppError('PURCHASE_ORDER_CONTEXT_MISMATCH', 'الفرع أو المورد لا يطابق أمر الشراء', 409);
        validateOrderReceiptAllocation(order, input.lines, input.orderAllocations ?? []);
    } const id = newId('pur'), number = await this.purchases.nextNumber(tenantId, tx); let total = 0; const lines = []; for (const raw of input.lines) {
        const product = await this.catalog.get(tenantId, raw.productId, tx);
        if (!product || !product.active)
            throw new AppError('PRODUCT_NOT_FOUND', 'الصنف غير موجود أو غير نشط', 404);
        const lineTotal = round2(raw.quantity * raw.unitCost);
        total = round2(total + lineTotal);
        const batchNo = raw.batchNo?.trim() || null, expiryDate = raw.expiryDate?.trim() || null;
        const batch = await this.inventory.receiveBatch({ id: newId('bat'), tenantId, branchId: input.branchId, productId: raw.productId, batchNo, expiryDate, quantity: raw.quantity, unitCost: raw.unitCost, sourceType: 'purchase', sourceId: id }, tx);
        const line = { id: newId('pln'), productId: raw.productId, quantity: raw.quantity, unitCost: raw.unitCost, batchId: batch.id, batchNo, expiryDate };
        lines.push(line);
    } const purchase = { id, number, tenantId, branchId: input.branchId, supplierId: input.supplierId, userId, payment: input.payment, total, status: 'received', createdAt: new Date().toISOString(), orderId: input.orderId ?? null, lines }; let shift = null; if (input.payment === 'cash') {
        shift = await this.cash.getOpenShift(tenantId, input.branchId, undefined, tx);
        if (!shift)
            throw new AppError('OPEN_SHIFT_REQUIRED', 'يجب فتح وردية قبل شراء نقدي', 409);
    } await this.purchases.save(purchase, tx); if (input.payment === 'credit')
        await this.settlements.createObligation({ id: newId('obl'), tenantId, partyType: 'supplier', partyId: input.supplierId, referenceType: 'purchase', referenceId: id, amount: total }, tx); if (order)
        await this.purchases.applyReceiptToOrder(order.id, input.orderAllocations ?? [], tx); if (shift)
        await this.cash.recordMovement({ id: newId('cmv'), tenantId, branchId: input.branchId, shiftId: shift.id, kind: 'purchase', amount: -total, referenceType: 'purchase', referenceId: id }, tx); await this.accounting.post({ id: newId('jrn'), tenantId, branchId: input.branchId, referenceType: 'purchase', referenceId: id, description: `استلام شراء ${number}`, lines: [{ accountCode: '1300', debit: total, credit: 0 }, { accountCode: input.payment === 'cash' ? '1100' : '2100', debit: 0, credit: total }] }, tx); await this.audit.record({ tenantId, userId, action: 'purchase.received', entity: 'purchase', entityId: id, detail: { number, total, orderId: input.orderId ?? null } }, tx); return purchase; }); }
    async returnToSupplier(tenantId, userId, input) { if (!input.lines.length)
        throw new AppError('PURCHASE_RETURN_LINES_REQUIRED', 'أضف صنفاً واحداً على الأقل للمرتجع', 422); return this.uow.withTransaction(async (tx) => { const purchase = await this.purchases.getReceipt(tenantId, input.purchaseId, tx); if (!purchase)
        throw new AppError('PURCHASE_NOT_FOUND', 'فاتورة الشراء غير موجودة', 404); const returned = await this.purchases.returnedQuantities(tenantId, purchase.id, tx), id = newId('prt'); let total = 0; const lines = []; for (const item of input.lines) {
        const line = purchase.lines.find(x => x.id === item.purchaseLineId);
        if (!line)
            throw new AppError('PURCHASE_LINE_NOT_FOUND', 'سطر الشراء غير موجود', 404);
        const already = returned[line.id] ?? 0, available = line.quantity - already;
        if (item.quantity <= 0 || item.quantity > available + 1e-9)
            throw new AppError('PURCHASE_RETURN_QTY_INVALID', 'كمية مرتجع المورد تتجاوز الكمية المتاحة للمرتجع', 422, { purchased: line.quantity, alreadyReturned: already });
        if (!line.batchId)
            throw new AppError('PURCHASE_BATCH_REFERENCE_REQUIRED', 'لا يمكن إرجاع هذا السطر قبل ربطه بتشغيلة المخزون', 409);
        const alloc = await this.inventory.issueSpecificBatch({ tenantId, branchId: purchase.branchId, productId: line.productId, batchId: line.batchId, quantity: item.quantity, sourceType: 'purchase_return', sourceId: id }, tx);
        const amount = round2(item.quantity * line.unitCost);
        total = round2(total + amount);
        lines.push({ id: newId('prl'), purchaseLineId: line.id, productId: line.productId, batchId: alloc.batchId, quantity: item.quantity, amount });
    } if (total <= 0)
        throw new AppError('PURCHASE_RETURN_TOTAL_INVALID', 'قيمة مرتجع المورد غير صحيحة', 422); const payableReduction = input.settlement === 'reduce_payable' ? await this.settlements.reduceObligationByReference({ tenantId, partyType: 'supplier', partyId: purchase.supplierId, referenceType: 'purchase', referenceId: purchase.id, amount: total, creditReferenceType: 'purchase_return', creditReferenceId: id }, tx) : null; if (input.settlement !== 'reduce_payable') {
        const shift = await this.cash.getOpenShift(tenantId, purchase.branchId, undefined, tx);
        if (!shift)
            throw new AppError('OPEN_SHIFT_REQUIRED', 'يلزم وردية مفتوحة لاستلام رد نقدي من المورد', 409);
        await this.cash.recordMovement({ id: newId('cmv'), tenantId, branchId: purchase.branchId, shiftId: shift.id, kind: 'income', amount: total, referenceType: 'purchase_return', referenceId: id, note: 'رد نقدي من المورد' }, tx);
    } const ret = { id, tenantId, purchaseId: purchase.id, branchId: purchase.branchId, supplierId: purchase.supplierId, userId, settlement: input.settlement, total, reason: input.reason?.trim() || null, createdAt: new Date().toISOString(), lines }; await this.purchases.saveReturn(ret, tx); await this.accounting.post({ id: newId('jrn'), tenantId, branchId: purchase.branchId, referenceType: 'purchase_return', referenceId: id, description: `مرتجع مورد ${purchase.number}`, lines: input.settlement === 'reduce_payable' ? [...(payableReduction && payableReduction.applied > 0 ? [{ accountCode: '2100', debit: payableReduction.applied, credit: 0 }] : []), ...(payableReduction && payableReduction.excess > 0 ? [{ accountCode: '1210', debit: payableReduction.excess, credit: 0 }] : []), { accountCode: '1300', debit: 0, credit: total }] : [{ accountCode: '1100', debit: total, credit: 0 }, { accountCode: '1300', debit: 0, credit: total }] }, tx); await this.audit.record({ tenantId, userId, action: 'purchase.returned', entity: 'purchase_return', entityId: id, detail: { purchaseId: purchase.id, total, settlement: input.settlement } }, tx); return ret; }); }
}
