import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadAutoPoolApi() {
  const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/initializeAuth\(\);\s*$/, '');
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  vm.runInContext(`${source}
    seedEmptyLedger(); ensureShape(); currentUser={role:'admin',displayName:'Administrator'};
    globalThis.autoPoolApi={
      setRecords(stock,pools=[]){db.stock=JSON.parse(JSON.stringify(stock));db.inventoryPools=JSON.parse(JSON.stringify(pools));},
      pool(newIds){return autoPoolMatchingScrapboardInventory(newIds);},
      state(){return JSON.parse(JSON.stringify({stock:db.stock,pools:db.inventoryPools}));}
    };`, context);
  return context.autoPoolApi;
}

function scrapboardRecord(id, karat, seller, category = '') {
  return {
    id,
    date: '2026-11-10',
    recordedAt: `2026-11-10T00:00:0${id.length}.000Z`,
    customerName: seller,
    metal: 'Scrapboard',
    itemType: 'Scrapboard',
    karat,
    ...(category ? { scrapboardCategoryKey: category } : {}),
    status: 'Available',
    netWeight: 1000,
    currentWeight: 1000,
    payout: 1500,
    cost: 1500
  };
}

test('same scrapboard category and classification auto-pool across different sellers', async () => {
  const api = await loadAutoPoolApi();
  api.setRecords([
    scrapboardRecord('older-a6', 'A6', 'Seller One'),
    scrapboardRecord('new-a6', 'A6', 'Seller Two')
  ]);

  assert.equal(api.pool(['new-a6']), 2);
  const state = api.state();
  assert.equal(state.pools.length, 1);
  assert.equal(state.pools[0].automatic, true);
  assert.equal(state.pools[0].karat, 'A6');
  assert.equal(state.pools[0].itemIds.sort().join('|'), 'new-a6|older-a6');
  assert.equal(new Set(state.stock.map(item => item.inventoryPoolId)).size, 1);
  assert.equal(state.pools[0].originalWeight, 2000);
  assert.equal(state.pools[0].originalCost, 3000);
});

test('different classifications or categories never auto-pool together', async () => {
  const api = await loadAutoPoolApi();
  api.setRecords([
    scrapboardRecord('a6', 'A6', 'One'),
    scrapboardRecord('a5', 'A5', 'Two'),
    scrapboardRecord('other-a6', 'A6', 'Three', 'IC CHIP • EMCP')
  ]);

  assert.equal(api.pool(['a5', 'other-a6']), 0);
  const state = api.state();
  assert.equal(state.pools.length, 0);
  assert.equal(state.stock.some(item => item.inventoryPoolId), false);
});

test('a later matching purchase is appended to the existing automatic pool', async () => {
  const api = await loadAutoPoolApi();
  api.setRecords([
    scrapboardRecord('first', 'NC512', 'One'),
    scrapboardRecord('second', 'NC512', 'Two')
  ]);
  api.pool(['second']);
  let state = api.state();
  const poolId = state.pools[0].id;

  state.stock.push(scrapboardRecord('third', 'NC512', 'Three'));
  api.setRecords(state.stock, state.pools);
  assert.equal(api.pool(['third']), 1);
  state = api.state();
  assert.equal(state.pools.length, 1);
  assert.equal(state.pools[0].id, poolId);
  assert.equal(state.pools[0].itemIds.sort().join('|'), 'first|second|third');
  assert.equal(state.pools[0].originalWeight, 3000);
});
