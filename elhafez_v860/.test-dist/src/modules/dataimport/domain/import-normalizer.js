const h = (v) => v.trim().toLowerCase().replace(/[\s_\-./]+/g, '');
const aliases = {
    products: { name: ['name', 'product', 'productname', 'اسم', 'الصنف', 'اسمالصنف', 'اسمالدواء'], barcode: ['barcode', 'باركود', 'gtin'], sku: ['sku', 'كود', 'كودالصنف'], sellingPrice: ['sellingprice', 'saleprice', 'sellprice', 'سعرالبيع', 'السعر'], costPrice: ['costprice', 'buyprice', 'purchaseprice', 'التكلفة', 'سعرالشراء'], taxRate: ['tax', 'taxrate', 'vat', 'ضريبة', 'نسبةالضريبة'], reorderLevel: ['reorderlevel', 'minstock', 'حدالطلب', 'حداعادةالطلب', 'حدإعادةالطلب'], requiresPrescription: ['rx', 'requiresprescription', 'روشتة', 'وصفة'], controlledClass: ['controlledclass', 'جدول', 'تصنيفالجدول'] },
    'opening-stock': { barcode: ['barcode', 'باركود', 'gtin'], quantity: ['quantity', 'qty', 'كمية', 'الكمية'], unitCost: ['unitcost', 'costprice', 'buyprice', 'التكلفة', 'سعرالشراء'], batchNo: ['batch', 'batchno', 'lot', 'التشغيلة', 'رقمالتشغيلة'], expiryDate: ['expiry', 'expirydate', 'expiration', 'الصلاحية', 'تاريخالصلاحية'] },
    customers: { name: ['name', 'customer', 'customername', 'اسم', 'العميل', 'اسمالعميل'], phone: ['phone', 'mobile', 'tel', 'هاتف', 'موبايل', 'تليفون'], creditLimit: ['creditlimit', 'limit', 'حدالائتمان', 'الحدالائتماني'] },
    suppliers: { name: ['name', 'supplier', 'suppliername', 'اسم', 'المورد', 'اسمالمورد'], phone: ['phone', 'mobile', 'tel', 'هاتف', 'موبايل', 'تليفون'] }
};
function value(row, kind, key) { const map = aliases[kind][key] ?? [key]; for (const [k, v] of Object.entries(row))
    if (map.some(a => h(a) === h(k)))
        return v; return undefined; }
const s = (v) => String(v ?? '').trim();
const n = (v) => { if (v == null || v === '')
    return 0; const x = Number(String(v).replace(/,/g, '')); return Number.isFinite(x) ? x : NaN; };
const b = (v) => ['1', 'true', 'yes', 'y', 'نعم', 'rx', 'وصفة'].includes(s(v).toLowerCase());
export function normalizeImportRow(kind, row, rowNumber) {
    const errors = [];
    let values = {};
    if (kind === 'products') {
        const name = s(value(row, kind, 'name')), barcode = s(value(row, kind, 'barcode')) || null, sku = s(value(row, kind, 'sku')) || null, sellingPrice = n(value(row, kind, 'sellingPrice')), costPrice = n(value(row, kind, 'costPrice')), taxRate = n(value(row, kind, 'taxRate')), reorderLevel = n(value(row, kind, 'reorderLevel'));
        if (name.length < 2)
            errors.push('اسم الصنف مطلوب');
        if (!Number.isFinite(sellingPrice) || sellingPrice < 0)
            errors.push('سعر البيع غير صحيح');
        if (!Number.isFinite(costPrice) || costPrice < 0)
            errors.push('التكلفة غير صحيحة');
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
            errors.push('الضريبة غير صحيحة');
        if (!Number.isFinite(reorderLevel) || reorderLevel < 0)
            errors.push('حد إعادة الطلب غير صحيح');
        values = { name, barcode, sku, sellingPrice, costPrice, taxRate, reorderLevel, requiresPrescription: b(value(row, kind, 'requiresPrescription')), controlledClass: s(value(row, kind, 'controlledClass')) || null };
    }
    else if (kind === 'opening-stock') {
        const barcode = s(value(row, kind, 'barcode')), quantity = n(value(row, kind, 'quantity')), unitCost = n(value(row, kind, 'unitCost')), expiryDate = s(value(row, kind, 'expiryDate')) || null, batchNo = s(value(row, kind, 'batchNo')) || null;
        if (!barcode)
            errors.push('الباركود مطلوب');
        if (!Number.isFinite(quantity) || quantity <= 0)
            errors.push('الكمية يجب أن تكون أكبر من صفر');
        if (!Number.isFinite(unitCost) || unitCost < 0)
            errors.push('التكلفة غير صحيحة');
        if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate))
            errors.push('الصلاحية يجب أن تكون YYYY-MM-DD');
        values = { barcode, quantity, unitCost, batchNo, expiryDate };
    }
    else if (kind === 'customers') {
        const name = s(value(row, kind, 'name')), phone = s(value(row, kind, 'phone')) || null, creditLimit = n(value(row, kind, 'creditLimit'));
        if (name.length < 2)
            errors.push('اسم العميل مطلوب');
        if (!Number.isFinite(creditLimit) || creditLimit < 0)
            errors.push('حد الائتمان غير صحيح');
        values = { name, phone, creditLimit };
    }
    else {
        const name = s(value(row, kind, 'name')), phone = s(value(row, kind, 'phone')) || null;
        if (name.length < 2)
            errors.push('اسم المورد مطلوب');
        values = { name, phone };
    }
    return { rowNumber, values, errors };
}
export function normalizeHeaderMap(headers) { return headers.map(x => String(x ?? '').trim()); }
export function isImportKind(x) { return ['products', 'opening-stock', 'customers', 'suppliers'].includes(x); }
