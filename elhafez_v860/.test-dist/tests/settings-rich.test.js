import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettingsPreferences } from '../src/modules/settings/contracts/settings-contract.js';
test('rich pharmacy settings preserve legacy-grade controls with clean defaults', () => {
    assert.equal(defaultSettingsPreferences.appearance, 'light');
    assert.equal(defaultSettingsPreferences.sidebarMode, 'fixed');
    assert.equal(defaultSettingsPreferences.receiptWidth, '80');
    assert.equal(defaultSettingsPreferences.requireOpenShift, true);
    assert.equal(defaultSettingsPreferences.blindShiftClose, true);
    assert.equal(defaultSettingsPreferences.shortageNotebookEnabled, true);
    assert.equal(defaultSettingsPreferences.autoCreateShortageFromPos, true);
    assert.ok(defaultSettingsPreferences.expiryWarningDays >= 30);
});
