import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyFromDecimal, moneyToDecimal, addMoney } from '../src/core/money/money.js';
test('money rounds half up to minor units', () => { assert.equal(moneyFromDecimal('12.345').minor, 1235n); assert.equal(moneyToDecimal(moneyFromDecimal('12.345')), '12.35'); });
test('money addition preserves currency', () => assert.equal(addMoney(moneyFromDecimal('1.10'), moneyFromDecimal('2.20')).minor, 330n));
