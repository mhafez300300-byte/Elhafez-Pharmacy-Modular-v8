import test from 'node:test';
import assert from 'node:assert/strict';
import { validateJournal } from '../src/modules/accounting/domain/journal.js';
test('balanced journal is accepted', () => assert.doesNotThrow(() => validateJournal([{ accountCode: '1100', debit: 100, credit: 0 }, { accountCode: '4100', debit: 0, credit: 100 }])));
test('unbalanced journal is rejected', () => assert.throws(() => validateJournal([{ accountCode: '1100', debit: 100, credit: 0 }, { accountCode: '4100', debit: 0, credit: 90 }]), /غير متوازن/));
