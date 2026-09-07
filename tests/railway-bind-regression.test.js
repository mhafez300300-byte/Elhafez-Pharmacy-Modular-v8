const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production HTTP server binds explicitly to all interfaces for Railway proxy', () => {
  const source = fs.readFileSync('src/app/server.ts', 'utf8');
  assert.match(source, /app\.listen\(PORT,\s*['\"]0\.0\.0\.0['\"]/);
});
