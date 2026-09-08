import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReorder } from '../src/modules/replenishment/domain/reorder-policy.js';

test('replenishment marks zero stock with demand as critical',()=>{
  const r=calculateReorder({currentStock:0,reorderLevel:2,net7:7,net30:30,targetDays:21});
  assert.equal(r.priority,'critical');
  assert.ok(r.suggestedQuantity>=23);
});

test('replenishment does not invent demand when there are no sales and stock is above reorder level',()=>{
  const r=calculateReorder({currentStock:10,reorderLevel:2,net7:0,net30:0,targetDays:21});
  assert.equal(r.dailyDemand,0);
  assert.equal(r.suggestedQuantity,0);
  assert.equal(r.priority,'none');
});
