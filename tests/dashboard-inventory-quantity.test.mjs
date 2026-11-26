import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('dashboard remaining quantity uses the same pc/kg totals as inventory', async () => {
  const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8'))
    .replace(/initializeAuth\(\);\s*$/, '');
  const context = vm.createContext({ console, Intl, Date });
  vm.runInContext(`${source}\n;globalThis.quantityTestApi = { breakdown: inventoryQuantityBreakdown, format: inventoryQuantityTotalsText };`, context);

  const rows = [
    { metal: 'Gold', karat: '18K', itemType: 'Jewelry', currentWeight: 2, cost: 200 },
    { metal: 'Gold', karat: '18K', itemType: 'Jewelry', currentWeight: 3, cost: 300 },
    { metal: 'Scrapboard', karat: 'A3(64)', itemType: 'Scrap', currentWeight: 1500, cost: 600 }
  ];
  const api = context.quantityTestApi;
  const breakdown = api.breakdown(rows);

  assert.equal(api.format(breakdown), '5.00 pc · 1.50 kg');
});
