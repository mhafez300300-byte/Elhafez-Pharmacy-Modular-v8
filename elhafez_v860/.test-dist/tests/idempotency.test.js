import test from 'node:test';
import assert from 'node:assert/strict';
import { requestFingerprint } from '../src/core/security/request-fingerprint.js';
import { SalesService } from '../src/modules/sales/application/sales-service.js';
test('request fingerprint is stable regardless of object key order', () => {
    assert.equal(requestFingerprint({ b: 2, a: { y: 2, x: 1 } }), requestFingerprint({ a: { x: 1, y: 2 }, b: 2 }));
});
test('replayed sale returns original invoice without touching inventory again', async () => {
    let stockCalls = 0;
    const tx = { query: async () => ({ rows: [], rowCount: 0 }), client: {} }, uow = { withTransaction: async (fn) => fn(tx) };
    const existing = { id: 's-existing', number: 'S-000123', tenantId: 't', branchId: 'b', customerId: null, userId: 'u', payment: 'cash', subtotal: 100, discount: 0, invoiceDiscount: 0, loyaltyPointsRedeemed: 0, loyaltyDiscount: 0, loyaltyPointsEarned: 0, tax: 0, total: 100, cost: 60, profit: 40, status: 'posted', createdAt: new Date().toISOString(), lines: [] };
    const sales = { get: async () => existing, nextNumber: async () => { throw new Error('must not allocate number'); } };
    const identity = { findUser: async () => ({ id: 'u', tenantId: 't', name: 'U', username: 'u', role: 'owner', permissions: ['*'], maxDiscountPercent: 100, active: true }) };
    const inventory = { issueFefo: async () => { stockCalls++; return []; } };
    const loyalty = {};
    const idempotency = { claim: async () => ({ state: 'replay', resourceId: 's-existing' }), complete: async () => { throw new Error('must not complete replay'); } };
    const service = new SalesService(uow, sales, {}, inventory, {}, {}, {}, {}, {}, identity, {}, {}, loyalty, idempotency);
    const result = await service.post('t', 'u', { branchId: 'b', payment: 'cash', idempotencyKey: 'sale-attempt-123', lines: [{ productId: 'p1', quantity: 1 }] });
    assert.equal(result.id, 's-existing');
    assert.equal(stockCalls, 0);
});
