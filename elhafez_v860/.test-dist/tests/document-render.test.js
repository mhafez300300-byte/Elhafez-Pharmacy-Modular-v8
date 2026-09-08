import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeXml, safeFilename } from '../src/modules/documents/domain/render-utils.js';
test('document renderer escapes untrusted invoice text', () => { assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;'); assert.equal(escapeXml('A&B'), 'A&amp;B'); });
test('document filenames are safe for downloads', () => assert.equal(safeFilename('فاتورة: S/001?'), 'فاتورة- S-001-'));
import { DocumentService } from '../src/modules/documents/application/document-service.js';
test('native PDF document path delegates clean Arabic HTML to renderer', async () => {
    const sale = { id: 'sale1', number: 'S-1', tenantId: 't', branchId: 'b', customerId: null, userId: 'u', payment: 'cash', subtotal: 100, discount: 0, invoiceDiscount: 0, loyaltyPointsRedeemed: 0, loyaltyDiscount: 0, loyaltyPointsEarned: 10, tax: 0, total: 100, cost: 50, profit: 50, status: 'posted', createdAt: '2026-09-08T00:00:00.000Z', lines: [{ id: 'l1', productId: 'p1', quantity: 1, unitPrice: 100, discount: 0, tax: 0, net: 100, cost: 50, allocations: [] }] };
    let htmlSeen = '';
    const svc = new DocumentService({ get: async () => sale }, {}, { get: async () => ({ id: 'p1', tenantId: 't', name: 'باراسيتامول', barcode: null, sku: null, sellingPrice: 100, costPrice: 50, taxRate: 0, reorderLevel: 0, requiresPrescription: false, controlledClass: null, active: true }) }, {}, {}, { get: async () => ({ tenantId: 't', pharmacyName: 'صيدلية الاختبار', phone: null, address: null, invoiceFooter: null }) }, { getTenant: async () => ({ id: 't', name: 'صيدلية الاختبار', status: 'trial', currency: 'EGP' }), listBranches: async () => [{ id: 'b', tenantId: 't', name: 'الرئيسي', active: true }] }, { renderHtml: async (html) => { htmlSeen = html; return new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]); } });
    const pdf = await svc.salePdf('t', 'sale1');
    assert.equal(pdf.contentType, 'application/pdf');
    assert.ok(pdf.filename.endsWith('.pdf'));
    assert.deepEqual(Array.from(pdf.content).slice(0, 4), [37, 80, 68, 70]);
    assert.match(htmlSeen, /صيدلية الاختبار/);
    assert.match(htmlSeen, /باراسيتامول/);
});
