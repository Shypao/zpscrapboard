import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('inventory total quantity aggregates by unit instead of listing every classification', async () => {
  const [app, index] = await Promise.all([
    readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /function inventoryQuantityTotalsText\(entries/);
  assert.match(app, /inventoryQuantityTotalsText\(breakdown\)/);
  assert.match(app, /class="stat inventory-total-quantity"/);
  assert.match(index, /\.inventory-total-quantity \.value\{/);
  assert.match(index, /overflow-wrap:anywhere/);
});
