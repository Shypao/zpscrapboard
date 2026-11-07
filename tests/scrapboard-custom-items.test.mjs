import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadCustomItemApi() {
  const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/initializeAuth\(\);\s*$/, '');
  const context = vm.createContext({ console, Intl, Date, Math });
  vm.runInContext(`${source}
    seedEmptyLedger(); ensureShape();
    let customSaveResult = true;
    let customSaveCalls = 0;
    savePricingDB = async () => { customSaveCalls += 1; return customSaveResult; };
    globalThis.customItemApi = {
      available: () => ({
        catalog: typeof scrapboardItems === 'function',
        addCategory: typeof addScrapboardCategory === 'function',
        addItem: typeof addScrapboardItem === 'function'
      }),
      setAdmin: () => { currentUser = { id: 'admin', role: 'admin', displayName: 'Administrator' }; },
      setStaff: () => { currentUser = { id: 'staff', role: 'staff', displayName: 'Staff' }; },
      setSaveResult: value => { customSaveResult = value; },
      saveCalls: () => customSaveCalls,
      categories: () => Array.from(db.pricing.customScrapboardCategories || []),
      customItems: () => Array.from(db.pricing.customScrapboardItems || [], item => ({ ...item })),
      catalog: () => Array.from(scrapboardItems(), item => ({ ...item })),
      renderRates: () => renderRates(),
      addCategory: value => addScrapboardCategory(value),
      addItem: (category, name, unit, rate) => addScrapboardItem(category, name, unit, rate)
    };`, context);
  return context.customItemApi;
}

test('custom scrapboard catalog interfaces are available', async () => {
  const api = await loadCustomItemApi();
  assert.deepEqual({ ...api.available() }, { catalog: true, addCategory: true, addItem: true });
});

test('admin can add a persistent category and item to the combined catalog', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();

  assert.equal(await api.addCategory('  Charger Boards  '), true);
  assert.equal(await api.addItem('Charger Boards', 'USB-C Board', 'pc', 35), true);

  assert.deepEqual([...api.categories()], ['Charger Boards']);
  const custom = api.customItems()[0];
  assert.equal(custom.label, 'USB-C Board');
  assert.equal(custom.group, 'Charger Boards');
  assert.equal(custom.unit, 'pc');
  assert.equal(custom.rate, 35);
  assert.match(custom.key, /^CUSTOM_[A-Z0-9_]+_[A-Z0-9]+$/);
  assert.equal(api.catalog().some(item => item.key === custom.key), true);
  assert.equal(api.saveCalls(), 2);
});

test('quick add rejects blank duplicate and invalid item values', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();

  assert.equal(await api.addCategory('IC Extras'), true);
  assert.equal(await api.addCategory(' ic extras '), false);
  assert.equal(await api.addCategory('   '), false);
  assert.equal(await api.addItem('IC Extras', 'New Chip', 'pc', 10), true);
  assert.equal(await api.addItem('ic extras', ' new chip ', 'pc', 20), false);
  assert.equal(await api.addItem('Missing Category', 'Chip', 'pc', 10), false);
  assert.equal(await api.addItem('IC Extras', '', 'pc', 10), false);
  assert.equal(await api.addItem('IC Extras', 'Bad Unit', 'box', 10), false);
  assert.equal(await api.addItem('IC Extras', 'Bad Rate', 'kg', 0), false);
  assert.equal(api.customItems().length, 1);
});

test('staff cannot create custom categories or items', async () => {
  const api = await loadCustomItemApi();
  api.setStaff();

  assert.equal(await api.addCategory('Staff Category'), false);
  assert.equal(await api.addItem('Whole boards', 'Staff Item', 'pc', 10), false);
  assert.equal(api.saveCalls(), 0);
});

test('failed shared-state save rolls back a category or item', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  api.setSaveResult(false);

  assert.equal(await api.addCategory('Unsaved Category'), false);
  assert.deepEqual([...api.categories()], []);
  assert.equal(api.customItems().length, 0);
});

test('Daily Rates shows Quick Add only to administrators', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  const adminHtml = api.renderRates();
  assert.match(adminHtml, /Quick add/);
  assert.match(adminHtml, />Add category</);
  assert.match(adminHtml, />Add item</);

  api.setStaff();
  const staffHtml = api.renderRates();
  assert.doesNotMatch(staffHtml, /Quick add|Add category|Add item/);
});

test('new custom item renders as a Daily Rates card in its category', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Charging Parts');
  await api.addItem('Charging Parts', 'Type-C Port', 'pc', 12);

  const html = api.renderRates();
  assert.match(html, /<h3>Charging Parts<\/h3>/);
  assert.match(html, />Type-C Port</);
  assert.match(html, /peso \/ pc/);
  assert.match(html, /value="12"/);
});

test('site palette uses grey white and light green low-contrast colors', async () => {
  const source = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(source, /--paper:#f7f8f7/);
  assert.match(source, /--paper-2:#f1f4f2/);
  assert.match(source, /--brass:#9ab8a5/);
  assert.match(source, /--brass-bright:#c9ddcf/);
  assert.match(source, /--ink:#34413d/);
});
