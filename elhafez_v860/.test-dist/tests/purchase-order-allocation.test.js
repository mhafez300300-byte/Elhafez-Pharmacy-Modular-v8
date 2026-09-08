import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOrderReceiptAllocation } from '../src/modules/purchases/domain/purchase.js';
const order = { lines: [{ id: 'ol1', productId: 'p1', orderedQty: 10, receivedQty: 2 }, { id: 'ol2', productId: 'p2', orderedQty: 5, receivedQty: 0 }] };
test('purchase order allocation requires exact product quantities', () => { assert.equal(validateOrderReceiptAllocation(order, [{ productId: 'p1', quantity: 3 }], [{ orderLineId: 'ol1', quantity: 3 }]), true); assert.throws(() => validateOrderReceiptAllocation(order, [{ productId: 'p1', quantity: 3 }], [{ orderLineId: 'ol1', quantity: 2 }])); });
test('purchase order allocation blocks over receipt', () => { assert.throws(() => validateOrderReceiptAllocation(order, [{ productId: 'p1', quantity: 9 }], [{ orderLineId: 'ol1', quantity: 9 }])); });
