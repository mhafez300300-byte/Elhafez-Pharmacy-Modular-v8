import { AppError } from '../../../core/errors/app-error.js';
import { newId } from '../../../core/types/id.js';
import { validateSale } from '../domain/sale.js';
import { requestFingerprint } from '../../../core/security/request-fingerprint.js';
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const has = (permissions, permission) => permissions.includes('*') || permissions.includes(permission);
export class SalesService {
    uow;
    sales;
    catalog;
    inventory;
    cash;
    accounting;
    customers;
    audit;
    settlements;
    identity;
    clinical;
    pricing;
    loyalty;
    idempotency;
    trackTrace;
    settings;
    constructor(uow, sales, catalog, inventory, cash, accounting, customers, audit, settlements, identity, clinical, pricing, loyalty, idempotency, trackTrace, settings) {
        this.uow = uow;
        this.sales = sales;
        this.catalog = catalog;
        this.inventory = inventory;
        this.cash = cash;
        this.accounting = accounting;
        this.customers = customers;
        this.audit = audit;
        this.settlements = settlements;
        this.identity = identity;
        this.clinical = clinical;
        this.pricing = pricing;
        this.loyalty = loyalty;
        this.idempotency = idempotency;
        this.trackTrace = trackTrace;
        this.settings = settings;
    }
    async post(tenantId, userId, input) {
        validateSale(input);
        const actor = await this.identity.findUser(tenantId, userId);
        if (!actor || !actor.active)
            throw new AppError('USER_NOT_FOUND', 'المستخدم غير موجود أو غير نشط', 401);
        const loyaltyRequested = Math.floor(input.loyaltyPointsToRedeem ?? 0);
        if (loyaltyRequested > 0 && !has(actor.permissions, 'loyalty.redeem'))
            throw new AppError('FORBIDDEN', 'ليس لديك صلاحية استبدال نقاط الولاء', 403, { permission: 'loyalty.redeem' });
        return this.uow.withTransaction(async (tx) => {
            const idemKey = input.idempotencyKey?.trim();
            if (idemKey) {
                const claim = await this.idempotency.claim({ tenantId, scope: 'sales.post', key: idemKey, requestHash: requestFingerprint({ ...input, idempotencyKey: undefined }) }, tx);
                if (claim.state === 'replay') {
                    const existing = await this.sales.get(tenantId, claim.resourceId, tx);
                    if (!existing)
                        throw new AppError('IDEMPOTENCY_RESOURCE_MISSING', 'تعذر استرجاع نتيجة العملية السابقة', 409);
                    return existing;
                }
            }
            const customer = input.customerId ? await this.customers.get(tenantId, input.customerId, tx) : null;
            if (input.customerId && (!customer || !customer.active))
                throw new AppError('CUSTOMER_NOT_FOUND', 'العميل غير موجود أو غير نشط', 404);
            const id = newId('sal'), number = await this.sales.nextNumber(tenantId, tx);
            let subtotal = 0, lineDiscount = 0, manualLineDiscount = 0, tax = 0, totalCost = 0;
            const lines = [];
            for (const raw of input.lines) {
                const product = await this.catalog.get(tenantId, raw.productId, tx);
                if (!product || !product.active)
                    throw new AppError('PRODUCT_NOT_FOUND', 'الصنف غير موجود أو غير نشط', 404, { productId: raw.productId });
                if (product.requiresPrescription && !input.prescriptionId)
                    throw new AppError('PRESCRIPTION_REQUIRED', 'هذا الصنف يتطلب روشتة مسجلة', 422, { productId: product.id });
                const unitPrice = raw.unitPrice ?? product.sellingPrice;
                if (unitPrice < 0)
                    throw new AppError('PRICE_INVALID', 'سعر البيع غير صحيح', 422);
                const gross = round2(unitPrice * raw.quantity), manualDiscount = round2(Math.min(gross, raw.discount ?? 0)), offer = await this.pricing.calculateDiscount(tenantId, product.id, raw.quantity, unitPrice, new Date(), tx), discount = round2(Math.min(gross, Math.max(manualDiscount, offer.amount))), beforeTax = round2(gross - discount), lineTax = round2(beforeTax * (product.taxRate / 100)), net = round2(beforeTax + lineTax);
                const allocations = await this.inventory.issueFefo({ tenantId, branchId: input.branchId, productId: product.id, quantity: raw.quantity, sourceType: 'sale', sourceId: id }, tx);
                const cost = round2(allocations.reduce((s, a) => s + a.quantity * a.unitCost, 0));
                subtotal = round2(subtotal + gross);
                lineDiscount = round2(lineDiscount + discount);
                manualLineDiscount = round2(manualLineDiscount + manualDiscount);
                tax = round2(tax + lineTax);
                totalCost = round2(totalCost + cost);
                lines.push({ id: newId('sln'), productId: product.id, quantity: raw.quantity, unitPrice, discount, tax: lineTax, net, cost, allocations });
            }
            if (input.prescriptionId) {
                const rx = await this.clinical.getPrescription(tenantId, input.prescriptionId, tx);
                if (!rx || rx.status !== 'active' || (rx.expiresAt && new Date(rx.expiresAt).getTime() < Date.now()))
                    throw new AppError('PRESCRIPTION_INVALID', 'الروشتة غير صالحة أو منتهية', 422);
            }
            const safety = await this.clinical.safetyCheck(tenantId, lines.map(l => ({ productId: l.productId, batchNos: l.allocations.map(a => a.batchNo ?? null) })), tx);
            if (safety.blocked)
                throw new AppError('CLINICAL_SAFETY_BLOCK', 'تم منع البيع بسبب تنبيه سلامة دوائية حرج', 409, { warnings: safety.warnings });
            const lineNetTotal = round2(lines.reduce((s, l) => s + l.net, 0));
            const invoiceDiscount = round2(Math.min(Math.max(0, lineNetTotal), input.invoiceDiscount ?? 0));
            const permissionDiscount = round2(manualLineDiscount + invoiceDiscount), discountPct = subtotal > 0 ? (permissionDiscount / subtotal) * 100 : 0;
            if (discountPct > actor.maxDiscountPercent + 1e-9)
                throw new AppError('DISCOUNT_LIMIT_EXCEEDED', 'نسبة الخصم تتجاوز صلاحية المستخدم', 403, { allowed: actor.maxDiscountPercent, requested: Math.round(discountPct * 100) / 100 });
            const preLoyaltyTotal = round2(Math.max(0, lineNetTotal - invoiceDiscount));
            if (input.payment === 'credit' && !input.customerId)
                throw new AppError('CREDIT_REQUIRES_CUSTOMER', 'البيع الآجل يتطلب اختيار عميل', 422);
            let creditOverride = false;
            if (input.payment === 'credit' && input.customerId && customer) {
                const currentBalance = await this.settlements.balance(tenantId, 'customer', input.customerId, tx), after = round2(currentBalance + preLoyaltyTotal);
                if (after > customer.creditLimit + 1e-9) {
                    const reason = input.creditOverrideReason?.trim() ?? '';
                    if (!has(actor.permissions, 'sales.credit.override') || reason.length < 5)
                        throw new AppError('CUSTOMER_CREDIT_LIMIT_EXCEEDED', 'قيمة البيع الآجل تتجاوز حد ائتمان العميل', 409, { creditLimit: customer.creditLimit, currentBalance, requested: preLoyaltyTotal, after });
                    creditOverride = true;
                }
            }
            let shift = null;
            if (input.payment === 'cash') {
                shift = await this.cash.getOpenShift(tenantId, input.branchId, undefined, tx);
                if (!shift)
                    throw new AppError('OPEN_SHIFT_REQUIRED', 'يجب فتح وردية قبل البيع النقدي', 409);
            }
            let loyaltyPointsRedeemed = 0, loyaltyDiscount = 0;
            if (loyaltyRequested > 0 && input.customerId) {
                const redemption = await this.loyalty.redeemForSale({ tenantId, customerId: input.customerId, requestedPoints: loyaltyRequested, saleAmount: preLoyaltyTotal, referenceId: id }, tx);
                loyaltyPointsRedeemed = redemption.approvedPoints;
                loyaltyDiscount = redemption.discount;
            }
            const total = round2(Math.max(0, preLoyaltyTotal - loyaltyDiscount));
            let loyaltyPointsEarned = 0;
            if (input.customerId)
                loyaltyPointsEarned = await this.loyalty.earnForAmount({ tenantId, customerId: input.customerId, amount: total, referenceId: id }, tx);
            const totalDiscount = round2(lineDiscount + invoiceDiscount + loyaltyDiscount);
            const sale = { id, number, tenantId, branchId: input.branchId, customerId: input.customerId ?? null, userId, payment: input.payment, subtotal, discount: totalDiscount, invoiceDiscount, loyaltyPointsRedeemed, loyaltyDiscount, loyaltyPointsEarned, tax, total, cost: totalCost, profit: round2(total - tax - totalCost), status: 'posted', createdAt: new Date().toISOString(), lines };
            await this.sales.savePosted(sale, tx);
            const salePrefs = this.settings ? await this.settings.get(tenantId, tx) : null;
            if (this.trackTrace && salePrefs?.preferences.trackTraceEnabled !== false && salePrefs?.preferences.trackTraceAutoSales !== false)
                for (const line of lines)
                    for (const a of line.allocations)
                        await this.trackTrace.recordDispense(tenantId, userId, { branchId: input.branchId, productId: line.productId, batchId: a.batchId, batchNo: a.batchNo ?? null, quantity: a.quantity, saleId: id }, tx);
            if (input.payment === 'credit' && input.customerId)
                await this.settlements.createObligation({ id: newId('obl'), tenantId, partyType: 'customer', partyId: input.customerId, referenceType: 'sale', referenceId: id, amount: total }, tx);
            if (shift)
                await this.cash.recordMovement({ id: newId('cmv'), tenantId, branchId: input.branchId, shiftId: shift.id, kind: 'sale', amount: total, referenceType: 'sale', referenceId: id }, tx);
            const receivable = input.payment === 'credit' ? '1200' : '1100';
            await this.accounting.post({ id: newId('jrn'), tenantId, branchId: input.branchId, referenceType: 'sale', referenceId: id, description: `فاتورة بيع ${number}`, lines: [{ accountCode: receivable, debit: total, credit: 0 }, { accountCode: '4100', debit: 0, credit: round2(total - tax) }, { accountCode: '2130', debit: 0, credit: tax }, ...(totalCost > 0 ? [{ accountCode: '5100', debit: totalCost, credit: 0 }, { accountCode: '1300', debit: 0, credit: totalCost }] : [])] }, tx);
            await this.audit.record({ tenantId, userId, action: 'sale.posted', entity: 'sale', entityId: id, detail: { number, total, payment: input.payment, loyaltyPointsRedeemed, loyaltyPointsEarned, loyaltyDiscount, creditOverride, ...(creditOverride ? { creditOverrideReason: input.creditOverrideReason?.trim() } : {}) } }, tx);
            if (idemKey)
                await this.idempotency.complete({ tenantId, scope: 'sales.post', key: idemKey, resourceId: id }, tx);
            return sale;
        });
    }
    async returnSale(tenantId, userId, input) {
        return this.uow.withTransaction(async (tx) => {
            const sale = await this.sales.get(tenantId, input.saleId, tx);
            if (!sale)
                throw new AppError('SALE_NOT_FOUND', 'فاتورة البيع غير موجودة', 404);
            if (!input.lines.length)
                throw new AppError('RETURN_LINES_REQUIRED', 'أضف صنفاً للمرتجع', 422);
            const returned = await this.sales.returnedQuantities(tenantId, sale.id, tx), previousReturnedAmount = await this.sales.returnedAmount(tenantId, sale.id, tx), returnId = newId('ret');
            const lineNetTotal = sale.lines.reduce((s, l) => s + l.net, 0);
            let total = 0, cost = 0, remainingAfter = 0;
            const rows = [];
            const requestedByLine = new Map(input.lines.map(x => [x.saleLineId, x.quantity]));
            for (const saleLine of sale.lines) {
                const already = returned[saleLine.id] ?? 0, current = requestedByLine.get(saleLine.id) ?? 0;
                remainingAfter += Math.max(0, saleLine.quantity - already - current);
            }
            for (const item of input.lines) {
                const line = sale.lines.find(x => x.id === item.saleLineId);
                if (!line)
                    throw new AppError('SALE_LINE_NOT_FOUND', 'سطر البيع غير موجود', 404);
                const already = returned[line.id] ?? 0;
                if (item.quantity <= 0 || item.quantity > line.quantity - already + 1e-9)
                    throw new AppError('RETURN_QTY_INVALID', 'كمية المرتجع تتجاوز الكمية المتبقية القابلة للمرتجع', 422, { sold: line.quantity, alreadyReturned: already });
                const ratio = item.quantity / line.quantity, lineShare = lineNetTotal > 0 ? line.net / lineNetTotal : 0, amount = round2(sale.total * lineShare * ratio), lineCost = round2(line.cost * ratio);
                total = round2(total + amount);
                cost = round2(cost + lineCost);
                let remaining = item.quantity;
                for (const alloc of line.allocations) {
                    if (remaining <= 0)
                        break;
                    const qty = Math.min(remaining, alloc.quantity);
                    await this.inventory.returnStock({ id: newId('hold'), tenantId, branchId: sale.branchId, productId: line.productId, batchId: alloc.batchId, quantity: qty, unitCost: alloc.unitCost, classification: item.classification, sourceId: returnId }, tx);
                    remaining -= qty;
                }
                rows.push({ id: newId('rtl'), saleLineId: line.id, productId: line.productId, quantity: item.quantity, amount, classification: item.classification });
            }
            if (remainingAfter <= 1e-9 && rows.length) {
                const exactRemaining = round2(Math.max(0, sale.total - previousReturnedAmount)), delta = round2(exactRemaining - total);
                rows[rows.length - 1].amount = round2(rows[rows.length - 1].amount + delta);
                total = exactRemaining;
            }
            const remainingRefundable = round2(Math.max(0, sale.total - previousReturnedAmount));
            if (total > remainingRefundable + 0.01)
                throw new AppError('RETURN_AMOUNT_INVALID', 'قيمة المرتجع تتجاوز المتبقي القابل للرد', 409, { remainingRefundable, total });
            await this.sales.saveReturn({ id: returnId, tenantId, saleId: sale.id, branchId: sale.branchId, userId, total, ...(input.reason ? { reason: input.reason } : {}), lines: rows }, tx);
            const creditReduction = sale.payment === 'credit' && sale.customerId ? await this.settlements.reduceObligationByReference({ tenantId, partyType: 'customer', partyId: sale.customerId, referenceType: 'sale', referenceId: sale.id, amount: total, creditReferenceType: 'sale_return', creditReferenceId: returnId }, tx) : null;
            if (sale.payment === 'cash') {
                const shift = await this.cash.getOpenShift(tenantId, sale.branchId, undefined, tx);
                if (!shift)
                    throw new AppError('OPEN_SHIFT_REQUIRED', 'يلزم وردية مفتوحة لإتمام رد نقدي', 409);
                await this.cash.recordMovement({ id: newId('cmv'), tenantId, branchId: sale.branchId, shiftId: shift.id, kind: 'refund', amount: -total, referenceType: 'sale_return', referenceId: returnId }, tx);
            }
            const proportion = sale.total > 0 ? Math.max(0, Math.min(1, total / sale.total)) : 0;
            const loyaltyAdjustment = sale.customerId ? await this.loyalty.reverseForReturn({ tenantId, customerId: sale.customerId, earnedPoints: sale.loyaltyPointsEarned, redeemedPoints: sale.loyaltyPointsRedeemed, proportion, referenceId: returnId }, tx) : { restoredRedeemedPoints: 0, reversedEarnedPoints: 0 };
            const taxReturn = round2(sale.tax * proportion), preTaxReturn = round2(Math.max(0, total - taxReturn));
            await this.accounting.post({ id: newId('jrn'), tenantId, branchId: sale.branchId, referenceType: 'sale_return', referenceId: returnId, description: `مرتجع ${sale.number}`, lines: [{ accountCode: '4190', debit: preTaxReturn, credit: 0 }, { accountCode: '2130', debit: taxReturn, credit: 0 }, ...(sale.payment === 'credit' ? [...(creditReduction && creditReduction.applied > 0 ? [{ accountCode: '1200', debit: 0, credit: creditReduction.applied }] : []), ...(creditReduction && creditReduction.excess > 0 ? [{ accountCode: '2140', debit: 0, credit: creditReduction.excess }] : [])] : [{ accountCode: '1100', debit: 0, credit: total }]), ...(cost > 0 ? [{ accountCode: '1300', debit: cost, credit: 0 }, { accountCode: '5100', debit: 0, credit: cost }] : [])] }, tx);
            await this.audit.record({ tenantId, userId, action: 'sale.returned', entity: 'sale_return', entityId: returnId, detail: { saleId: sale.id, total, loyaltyAdjustment, creditReduction } }, tx);
            return { id: returnId, total, loyaltyAdjustment };
        });
    }
}
