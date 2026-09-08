import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoyaltyRule, earnedPointsForAmount, quoteRedemption } from '../src/modules/loyalty/domain/loyalty-policy.js';
test('loyalty redemption respects available balance and invoice percentage cap', () => {
    const rule = { ...defaultLoyaltyRule('t'), pointValue: 0.1, minRedeemPoints: 10, maxRedeemPercent: 20 };
    const q = quoteRedemption(rule, 1000, 500, 100);
    assert.equal(q.maxPointsBySale, 200);
    assert.equal(q.approvedPoints, 200);
    assert.equal(q.discount, 20);
});
test('loyalty earning is deterministic and disabled rules earn zero', () => {
    const rule = { ...defaultLoyaltyRule('t'), earnPointsPerCurrency: 1.5 };
    assert.equal(earnedPointsForAmount(rule, 99.99), 149);
    assert.equal(earnedPointsForAmount({ ...rule, enabled: false }, 1000), 0);
});
