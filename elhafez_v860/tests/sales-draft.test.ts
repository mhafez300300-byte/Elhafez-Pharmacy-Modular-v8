import test from 'node:test';import assert from 'node:assert/strict';import { normalizeSuspendedSale } from '../src/modules/salesdrafts/domain/sales-draft.js';
test('suspended cart is non-financial snapshot with validated lines',()=>{const x=normalizeSuspendedSale({branchId:'b1',lines:[{productId:'p1',quantity:2}],payment:'cash'});assert.equal(x.lines.length,1);assert.equal(x.payment,'cash');assert.ok(x.label.length>0);});
test('empty suspended cart is rejected',()=>assert.throws(()=>normalizeSuspendedSale({branchId:'b1',lines:[]})));
