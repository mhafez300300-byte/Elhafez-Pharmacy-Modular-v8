import { AppError } from '../../../core/errors/app-error.js';
import { newId } from '../../../core/types/id.js';
import { isImportKind, normalizeHeaderMap, normalizeImportRow } from '../domain/import-normalizer.js';
export class DataImportService {
    uow;
    catalog;
    customers;
    suppliers;
    inventory;
    org;
    audit;
    constructor(uow, catalog, customers, suppliers, inventory, org, audit) {
        this.uow = uow;
        this.catalog = catalog;
        this.customers = customers;
        this.suppliers = suppliers;
        this.inventory = inventory;
        this.org = org;
        this.audit = audit;
    }
    async preview(t, kindRaw, fileName, buffer, branchId) { const kind = this.kind(kindRaw), raw = await parseFile(fileName, buffer); if (raw.length > 5000)
        throw new AppError('IMPORT_TOO_MANY_ROWS', 'الحد الأقصى 5000 صف في عملية الاستيراد الواحدة', 422); const rows = raw.map((r, i) => normalizeImportRow(kind, r, i + 2)); await this.crossValidate(t, kind, rows, branchId); const invalid = rows.filter(x => x.errors.length).length; return { kind, fileName, total: rows.length, valid: rows.length - invalid, invalid, rows: rows.slice(0, 200), truncated: rows.length > 200 }; }
    async commit(t, u, kindRaw, fileName, buffer, branchId) {
        const kind = this.kind(kindRaw), raw = await parseFile(fileName, buffer);
        if (raw.length > 5000)
            throw new AppError('IMPORT_TOO_MANY_ROWS', 'الحد الأقصى 5000 صف في عملية الاستيراد الواحدة', 422);
        const rows = raw.map((r, i) => normalizeImportRow(kind, r, i + 2));
        await this.crossValidate(t, kind, rows, branchId);
        const bad = rows.filter(x => x.errors.length);
        if (bad.length)
            throw new AppError('IMPORT_HAS_ERRORS', 'لا يمكن اعتماد الملف قبل إصلاح كل الأخطاء', 422, { invalid: bad.length, examples: bad.slice(0, 20) });
        const importId = newId('imp');
        return this.uow.withTransaction(async (tx) => {
            let count = 0;
            if (kind === 'products')
                for (const r of rows) {
                    const v = r.values;
                    await this.catalog.create({ id: newId('prd'), tenantId: t, name: String(v.name), barcode: v.barcode ? String(v.barcode) : null, sku: v.sku ? String(v.sku) : null, sellingPrice: Number(v.sellingPrice), costPrice: Number(v.costPrice), taxRate: Number(v.taxRate), reorderLevel: Number(v.reorderLevel), requiresPrescription: v.requiresPrescription === true, controlledClass: v.controlledClass ? String(v.controlledClass) : null, active: true }, tx);
                    count++;
                }
            else if (kind === 'customers')
                for (const r of rows) {
                    const v = r.values;
                    await this.customers.create({ id: newId('cus'), tenantId: t, name: String(v.name), phone: v.phone ? String(v.phone) : null, creditLimit: Number(v.creditLimit), active: true }, tx);
                    count++;
                }
            else if (kind === 'suppliers')
                for (const r of rows) {
                    const v = r.values;
                    await this.suppliers.create({ id: newId('sup'), tenantId: t, name: String(v.name), phone: v.phone ? String(v.phone) : null, active: true }, tx);
                    count++;
                }
            else {
                if (!branchId)
                    throw new AppError('IMPORT_BRANCH_REQUIRED', 'اختر الفرع قبل استيراد الرصيد الافتتاحي', 422);
                for (const r of rows) {
                    const v = r.values, p = await this.catalog.findByBarcode(t, String(v.barcode), tx);
                    if (!p)
                        throw new AppError('IMPORT_PRODUCT_MISSING', 'الصنف غير موجود أثناء اعتماد الملف', 409, { row: r.rowNumber, barcode: v.barcode });
                    await this.inventory.receiveBatch({ id: newId('bat'), tenantId: t, branchId, productId: p.id, batchNo: v.batchNo ? String(v.batchNo) : null, expiryDate: v.expiryDate ? String(v.expiryDate) : null, quantity: Number(v.quantity), unitCost: Number(v.unitCost), sourceType: 'opening_stock_import', sourceId: importId }, tx);
                    count++;
                }
            }
            await this.audit.record({ tenantId: t, userId: u, action: 'data.import.committed', entity: 'data_import', entityId: importId, detail: { kind, fileName, count, branchId: branchId ?? null } }, tx);
            return { id: importId, kind, count };
        });
    }
    kind(x) { if (!isImportKind(x))
        throw new AppError('IMPORT_KIND_INVALID', 'نوع الاستيراد غير مدعوم', 422); return x; }
    async crossValidate(t, kind, rows, branchId) { if (kind === 'products') {
        const seen = new Set();
        for (const r of rows) {
            const bc = r.values.barcode ? String(r.values.barcode) : '';
            if (!bc)
                continue;
            if (seen.has(bc))
                r.errors.push('الباركود مكرر داخل الملف');
            seen.add(bc);
            if (await this.catalog.findByBarcode(t, bc))
                r.errors.push('الباركود موجود بالفعل في الأصناف');
        }
    }
    else if (kind === 'opening-stock') {
        if (!branchId) {
            for (const r of rows)
                r.errors.push('اختر الفرع');
            return;
        }
        const branches = await this.org.listBranches(t);
        if (!branches.some(b => b.id === branchId && b.active)) {
            for (const r of rows)
                r.errors.push('الفرع غير موجود أو غير نشط');
            return;
        }
        for (const r of rows) {
            const bc = String(r.values.barcode ?? '');
            if (bc && !(await this.catalog.findByBarcode(t, bc)))
                r.errors.push('لا يوجد صنف بهذا الباركود');
        }
    } }
}
async function parseFile(fileName, buffer) { if (!buffer?.length)
    throw new AppError('IMPORT_FILE_REQUIRED', 'اختر ملفًا للاستيراد', 422); if (buffer.length > 12 * 1024 * 1024)
    throw new AppError('IMPORT_FILE_TOO_LARGE', 'حجم الملف أكبر من 12MB', 413); const name = fileName.toLowerCase(); if (name.endsWith('.csv'))
    return parseCsv(Buffer.from(buffer).toString('utf8')); if (!name.endsWith('.xlsx'))
    throw new AppError('IMPORT_FILE_TYPE', 'الملفات المدعومة هي XLSX و CSV', 422); try {
    const mod = await import('exceljs');
    const Workbook = mod.Workbook ?? mod.default?.Workbook, wb = new Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws)
        throw new Error('sheet');
    const headerRow = ws.getRow(1).values;
    const headers = normalizeHeaderMap(headerRow.slice(1));
    const out = [];
    ws.eachRow((row, no) => { if (no === 1)
        return; const vals = row.values.slice(1), obj = {}; headers.forEach((key, i) => obj[key] = cellValue(vals[i])); if (Object.values(obj).some(v => String(v ?? '').trim()))
        out.push(obj); });
    return out;
}
catch (e) {
    if (e instanceof AppError)
        throw e;
    throw new AppError('IMPORT_XLSX_INVALID', 'تعذر قراءة ملف Excel؛ تأكد أنه XLSX سليم', 422);
} }
function cellValue(v) { if (v && typeof v === 'object') {
    if ('text' in v)
        return v.text;
    if ('result' in v)
        return v.result;
    if (v instanceof Date)
        return v.toISOString().slice(0, 10);
} return v ?? ''; }
function parseCsv(text) { const matrix = []; let row = [], cell = '', q = false; const s = text.replace(/^\uFEFF/, ''); for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
        if (c === '"' && s[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else if (c === '"')
            q = false;
        else
            cell += c;
    }
    else if (c === '"')
        q = true;
    else if (c === ',') {
        row.push(cell);
        cell = '';
    }
    else if (c === '\n') {
        row.push(cell.replace(/\r$/, ''));
        matrix.push(row);
        row = [];
        cell = '';
    }
    else
        cell += c;
} row.push(cell.replace(/\r$/, '')); if (row.some(Boolean))
    matrix.push(row); const headers = normalizeHeaderMap(matrix[0] ?? []); return matrix.slice(1).filter(r => r.some(v => v.trim())).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']))); }
