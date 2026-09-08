import { AppError } from '../../../core/errors/app-error.js';
export function validatePurchase(input) { if (!input.branchId)
    throw new AppError('BRANCH_REQUIRED', 'الفرع مطلوب', 422); if (!input.supplierId)
    throw new AppError('SUPPLIER_REQUIRED', 'المورد مطلوب', 422); if (!input.lines.length)
    throw new AppError('PURCHASE_LINES_REQUIRED', 'أضف صنفاً واحداً على الأقل', 422); for (const l of input.lines)
    if (!l.productId || l.quantity <= 0 || l.unitCost < 0)
        throw new AppError('PURCHASE_LINE_INVALID', 'سطر الشراء غير صحيح', 422); return input; }
export function validateOrderReceiptAllocation(order, receiptLines, allocations) {
    if (!allocations.length)
        throw new AppError('PURCHASE_ORDER_ALLOCATION_REQUIRED', 'يجب تحديد كميات الاستلام لكل سطر أمر شراء', 422);
    const byId = new Map(order.lines.map(l => [l.id, l])), allocByProduct = new Map(), receiptByProduct = new Map(), seen = new Map();
    for (const a of allocations) {
        const line = byId.get(a.orderLineId);
        if (!line)
            throw new AppError('PURCHASE_ORDER_LINE_NOT_FOUND', 'سطر أمر الشراء المحدد غير موجود', 409, { orderLineId: a.orderLineId });
        if (!Number.isFinite(a.quantity) || a.quantity <= 0)
            throw new AppError('PURCHASE_ORDER_ALLOCATION_INVALID', 'كمية الربط مع أمر الشراء غير صحيحة', 422);
        const total = (seen.get(a.orderLineId) ?? 0) + a.quantity, remaining = line.orderedQty - line.receivedQty;
        if (total > remaining + 1e-9)
            throw new AppError('PURCHASE_ORDER_OVER_RECEIPT', 'كمية الاستلام تتجاوز المتبقي في سطر أمر الشراء', 409, { orderLineId: a.orderLineId, remaining, requested: total });
        seen.set(a.orderLineId, total);
        allocByProduct.set(line.productId, (allocByProduct.get(line.productId) ?? 0) + a.quantity);
    }
    for (const l of receiptLines) {
        if (!Number.isFinite(l.quantity) || l.quantity <= 0)
            continue;
        receiptByProduct.set(l.productId, (receiptByProduct.get(l.productId) ?? 0) + l.quantity);
    }
    const products = new Set([...allocByProduct.keys(), ...receiptByProduct.keys()]);
    for (const productId of products) {
        const allocated = allocByProduct.get(productId) ?? 0, received = receiptByProduct.get(productId) ?? 0;
        if (Math.abs(allocated - received) > 1e-9)
            throw new AppError('PURCHASE_ORDER_ALLOCATION_MISMATCH', 'كميات ربط أمر الشراء لا تطابق كميات الاستلام الفعلية', 409, { productId, allocated, received });
    }
    return true;
}
