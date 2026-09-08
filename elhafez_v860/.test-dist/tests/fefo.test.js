import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateFefo } from '../src/modules/inventory/domain/fefo.js';
test('FEFO allocates earliest non-expired batches first', () => { const result = allocateFefo([{ id: 'late', quantity: 5, expiryDate: '2027-12-01', receivedAt: '2026-01-01' }, { id: 'early', quantity: 2, expiryDate: '2026-12-01', receivedAt: '2026-02-01' }, { id: 'expired', quantity: 99, expiryDate: '2025-01-01', receivedAt: '2024-01-01' }], 4, new Date('2026-09-08T00:00:00Z')); assert.deepEqual(result, [{ batchId: 'early', quantity: 2 }, { batchId: 'late', quantity: 2 }]); });
test('FEFO rejects overselling', () => assert.throws(() => allocateFefo([{ id: 'a', quantity: 1, expiryDate: '2027-01-01', receivedAt: '2026-01-01' }], 2, new Date('2026-09-08T00:00:00Z')), /المخزون المتاح/));
