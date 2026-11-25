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

function scrapboardRecord(id, karat, seller, category = '', date = '2026-11-10') {
  return {
    id,
    date,
    recordedAt: `${date}T00:00:0${id.length}.000Z`,
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

test('matching scrapboard records from two consecutive buying dates share one pool', async () => {
  const api = await loadAutoPoolApi();
  api.setRecords([
    scrapboardRecord('old-a6', 'A6', 'One', '', '2026-11-10'),
    scrapboardRecord('new-a6-one', 'A6', 'Two', '', '2026-11-11')
  ]);

  assert.equal(api.pool(['new-a6-one']), 2);
  const state = api.state();
  assert.equal(state.pools.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(state.pools[0].itemIds.sort())), ['new-a6-one', 'old-a6']);
  assert.equal(new Set(state.stock.map(item => item.inventoryPoolId)).size, 1);
});

test('legacy A3(64) and current A3 records auto-pool across consecutive buying dates', async () => {
  const api = await loadAutoPoolApi();
  api.setRecords([
    scrapboardRecord('old-a3-legacy', 'A3(64)', 'One', '', '2026-11-10'),
    scrapboardRecord('new-a3', 'A3', 'Two', '', '2026-11-11')
  ]);

  assert.equal(api.pool(['new-a3']), 2);
  const state = api.state();
  assert.equal(state.pools.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(state.pools[0].itemIds.sort())), ['new-a3', 'old-a3-legacy']);
});

test('a two-day automatic pool does not expand into a third buying date', async () => {
  const api = await loadAutoPoolApi();
  api.setRecords([
    scrapboardRecord('day-one', 'A6', 'One', '', '2026-11-10'),
    scrapboardRecord('day-two', 'A6', 'Two', '', '2026-11-11')
  ]);
  api.pool(['day-two']);
  let state = api.state();
  state.stock.push(scrapboardRecord('day-three', 'A6', 'Three', '', '2026-11-12'));
  api.setRecords(state.stock, state.pools);

  assert.equal(api.pool(['day-three']), 0);
  state = api.state();
  assert.equal(state.pools.length, 1);
  assert.equal(state.pools[0].itemIds.includes('day-three'), false);
  assert.equal(state.stock.find(item => item.id === 'day-three').inventoryPoolId, undefined);
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
