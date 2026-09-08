import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('public shell identifies the clean v8 application', async () => { const html = await readFile('public/index.html', 'utf8'); assert.match(html, /Elhafez Pharmacy v8/); assert.doesNotMatch(html, /v7\./); });
