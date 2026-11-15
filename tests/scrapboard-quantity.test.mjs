import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function quantityApi() {
  const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/initializeAuth\(\);\s*$/, '');
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  vm.runInContext(`${source}\n globalThis.quantityApi={scrapboardQuantityConversion};`, context);
  return context.quantityApi;
}

test('kg-priced quantity accepts grams and calculates the kg-based payout', async () => {
  const api = await quantityApi();
  assert.deepEqual(JSON.parse(JSON.stringify(api.scrapboardQuantityConversion('kg', 260, 1280))), {
    inputQuantity: 260,
    purchaseQuantity: 0.26,
    inventoryWeight: 260,
    suggestedAmount: 332.8,
    inputUnit: 'g',
    storedUnit: 'kg',
  });
});

test('pc-priced quantity remains whole pieces', async () => {
  const api = await quantityApi();
  assert.deepEqual(JSON.parse(JSON.stringify(api.scrapboardQuantityConversion('pc', 2, 475))), {
    inputQuantity: 2,
    purchaseQuantity: 2,
    inventoryWeight: 2,
    suggestedAmount: 950,
    inputUnit: 'pc',
    storedUnit: 'pc',
  });
});
