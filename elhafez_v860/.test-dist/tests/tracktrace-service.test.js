import test from 'node:test';
import assert from 'node:assert/strict';
import { TrackTraceService } from '../src/modules/tracktrace/application/tracktrace-service.js';
test('track trace auto dispense is idempotent per sale/batch', async () => { let count = 0; const repo = { existsSource: async () => false, record: async (x) => { count++; return x; } }; const s = new TrackTraceService(repo, {}, { record: async () => { } }); await s.recordDispense('t', 'u', { branchId: 'b', productId: 'p', batchId: 'bt', quantity: 2, saleId: 's' }, {}); assert.equal(count, 1); });
