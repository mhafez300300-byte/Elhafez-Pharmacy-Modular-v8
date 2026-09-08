import test from 'node:test';
import assert from 'node:assert/strict';
import { ShortageService } from '../src/modules/shortages/application/shortage-service.js';
const tx = { query: async () => ({ rows: [], rowCount: 0 }), client: {} };
test('shortage notebook creation and status change are audited atomically', async () => {
    const calls = [];
    let current = null;
    const uow = { withTransaction: async (fn) => fn(tx) };
    const repo = {
        create: async (v) => { current = v; calls.push('create'); return v; },
        get: async () => current,
        updateStatus: async (_t, _id, status) => { current = { ...current, status }; calls.push('status'); return current; },
        list: async () => [],
    };
    const audit = { record: async (i) => calls.push(i.action) };
    const s = new ShortageService(uow, repo, audit);
    const created = await s.create('t1', 'u1', { branchId: 'b1', freeText: 'دواء غير موجود', quantity: 2, customerName: 'عميل', source: 'pos_not_found' });
    assert.equal(created.status, 'open');
    const fulfilled = await s.status('t1', 'u1', created.id, 'fulfilled');
    assert.equal(fulfilled.status, 'fulfilled');
    assert.deepEqual(calls, ['create', 'shortage.created', 'status', 'shortage.status']);
});
