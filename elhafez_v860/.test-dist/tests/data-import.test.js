import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportRow } from '../src/modules/dataimport/domain/import-normalizer.js';
test('Excel import normalizes Arabic product headers', () => { const r = normalizeImportRow('products', { 'اسم الصنف': 'Panadol', 'باركود': '6221', 'سعر البيع': '55.5', 'سعر الشراء': '40', 'ضريبة': '0', 'حد إعادة الطلب': '3', 'روشتة': 'لا' }, 2); assert.equal(r.errors.length, 0); assert.equal(r.values.name, 'Panadol'); assert.equal(r.values.barcode, '6221'); assert.equal(r.values.sellingPrice, 55.5); });
test('opening stock import rejects invalid quantity and date', () => { const r = normalizeImportRow('opening-stock', { barcode: '123', quantity: '0', unitCost: '4', expiry: '09/2027' }, 2); assert.equal(r.errors.length, 2); });
