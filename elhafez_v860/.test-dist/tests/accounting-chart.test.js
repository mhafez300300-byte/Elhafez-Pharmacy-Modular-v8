import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CHART, assertPeriodRange, statementBucket } from '../src/modules/accounting/domain/chart.js';
test('default chart contains every account used by commercial workflows', () => { for (const code of ['1100', '1110', '1120', '1200', '1300', '2100', '2130', '3100', '4100', '4190', '5100', '6100'])
    assert.ok(DEFAULT_CHART.some(x => x.code === code), `missing ${code}`); });
test('accounting period range rejects reversed dates', () => assert.throws(() => assertPeriodRange('2026-09-30', '2026-09-01'), /الفترة المحاسبية/));
test('statement buckets separate income accounts from balance sheet accounts', () => { assert.equal(statementBucket('revenue'), 'income'); assert.equal(statementBucket('expense'), 'income'); assert.equal(statementBucket('asset'), 'balance'); assert.equal(statementBucket('equity'), 'balance'); });
