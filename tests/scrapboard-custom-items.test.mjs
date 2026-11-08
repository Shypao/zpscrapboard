import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadCustomItemApi() {
  const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/initializeAuth\(\);\s*$/, '');
  const context = vm.createContext({ console, Intl, Date, Math, document: { getElementById: () => null } });
  vm.runInContext(`${source}
    seedEmptyLedger(); ensureShape();
    let customSaveResult = true;
    let customSaveCalls = 0;
    const customSaveQueue = [];
    savePricingDB = async () => { customSaveCalls += 1; return customSaveQueue.length ? customSaveQueue.shift().promise : customSaveResult; };
    globalThis.customItemApi = {
      available: () => ({
        catalog: typeof scrapboardItems === 'function',
        addCategory: typeof addScrapboardCategory === 'function',
        addItem: typeof addScrapboardItem === 'function',
        editCategory: typeof editScrapboardCategory === 'function',
        editItem: typeof editScrapboardItem === 'function',
        deleteCategory: typeof deleteScrapboardCategory === 'function',
        deleteItem: typeof deleteScrapboardItem === 'function'
      }),
      setAdmin: () => { currentUser = { id: 'admin', role: 'admin', displayName: 'Administrator' }; },
      setStaff: () => { currentUser = { id: 'staff', role: 'staff', displayName: 'Staff' }; },
      setSaveResult: value => { customSaveResult = value; },
      queueSave: () => { let resolve; const promise = new Promise(done => { resolve = done; }); customSaveQueue.push({ promise }); return resolve; },
      saveCalls: () => customSaveCalls,
      categories: () => Array.from(db.pricing.customScrapboardCategories || []),
      customItems: () => Array.from(db.pricing.customScrapboardItems || [], item => ({ ...item })),
      catalog: (includeInactive = false) => Array.from(scrapboardItems(includeInactive), item => ({ ...item })),
      categoryEntries: (includeInactive = false) => Array.from(scrapboardCategoryEntries(includeInactive), category => ({ ...category })),
      actionToken: value => catalogActionToken(value),
      renderRates: () => renderRates(),
      renderBuying: () => renderBuying(),
      categoryEditor: key => scrapboardCategoryEditorMarkup(key),
      itemEditor: key => scrapboardItemEditorMarkup(key),
      lookup: key => ({ ...scrapboardItem(key) }),
      label: key => gradeLabel('Scrapboard', key),
      activeRate: key => ({ ...activeRate('Scrapboard', key) }),
      exportRowsAvailable: () => typeof scrapboardRateExportRows === 'function',
      exportRows: () => Array.from(scrapboardRateExportRows(), row => ({ ...row })),
      addCategory: value => addScrapboardCategory(value),
      addItem: (category, name, unit, rate) => addScrapboardItem(category, name, unit, rate),
      editCategory: (key, changes) => editScrapboardCategory(key, changes),
      editItem: (key, changes) => editScrapboardItem(key, changes),
      deleteCategory: key => deleteScrapboardCategory(key),
      deleteItem: key => deleteScrapboardItem(key),
      referenceItem: key => { db.stock.push({ id: 'stock-reference', metal: 'Scrapboard', karat: key }); }
    };`, context);
  return context.customItemApi;
}

test('custom scrapboard catalog and management interfaces are available', async () => {
  const api = await loadCustomItemApi();
  assert.deepEqual({ ...api.available() }, {
    catalog: true, addCategory: true, addItem: true,
    editCategory: true, editItem: true, deleteCategory: true, deleteItem: true
  });
});

test('admin can rename and deactivate a built-in category without losing historical item labels', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();

  assert.equal(await api.editCategory('IC chips · A series', { label: 'A-Series IC', active: true }), true);
  assert.equal(api.catalog().find(item => item.key === 'A6').group, 'A-Series IC');
  assert.equal(await api.editCategory('IC chips · A series', { label: 'A-Series IC', active: false }), true);
  assert.equal(api.catalog().some(item => item.key === 'A6'), false);
  assert.equal(api.catalog(true).find(item => item.key === 'A6').label, 'A6');
  assert.equal(api.label('A6'), 'A6');
});

test('admin can override a built-in item label category unit and active state', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();

  assert.equal(await api.editItem('A6', { label: 'Premium A6', group: 'Whole boards', unit: 'pc', active: false }), true);
  const item = api.catalog(true).find(entry => entry.key === 'A6');
  assert.deepEqual(
    { label: item.label, group: item.group, unit: item.unit, active: item.active },
    { label: 'Premium A6', group: 'Whole boards', unit: 'pc', active: false }
  );
  assert.equal(api.catalog().some(entry => entry.key === 'A6'), false);
  assert.equal(api.label('A6'), 'Premium A6');
});

test('catalog management rejects duplicate normalized category and item labels', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();

  assert.equal(await api.editCategory('Whole boards', { label: ' IC chips · A series ', active: true }), false);
  assert.equal(await api.editItem('A6', { label: ' A5 ', group: 'IC chips · A series', unit: 'kg', active: true }), false);
});

test('only unused custom entries can be permanently deleted', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Temporary Parts');
  await api.addItem('Temporary Parts', 'Temporary Chip', 'pc', 20);
  const key = api.customItems()[0].key;

  assert.equal(await api.deleteCategory('Temporary Parts'), false);
  api.referenceItem(key);
  assert.equal(await api.deleteItem(key), false);
  assert.equal(await api.editItem(key, { label: 'Temporary Chip', group: 'Temporary Parts', unit: 'pc', active: false }), true);
  assert.equal(api.catalog().some(item => item.key === key), false);
});

test('unused custom item and then its empty category can be permanently deleted', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Disposable Parts');
  await api.addItem('Disposable Parts', 'Disposable Chip', 'pc', 20);
  const key = api.customItems()[0].key;

  assert.equal(await api.deleteItem(key), true);
  assert.equal(await api.deleteCategory('Disposable Parts'), true);
  assert.equal(api.catalog(true).some(item => item.key === key), false);
  assert.equal(api.categoryEntries(true).some(category => category.key === 'Disposable Parts'), false);
});

test('staff cannot edit deactivate or delete catalog definitions', async () => {
  const api = await loadCustomItemApi();
  api.setStaff();

  assert.equal(await api.editCategory('Whole boards', { label: 'Changed', active: false }), false);
  assert.equal(await api.editItem('A6', { label: 'Changed', group: 'Whole boards', unit: 'kg', active: false }), false);
  assert.equal(await api.deleteCategory('Whole boards'), false);
  assert.equal(await api.deleteItem('A6'), false);
  assert.equal(api.saveCalls(), 0);
});

test('failed catalog-management save rolls back a built-in item edit', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  api.setSaveResult(false);

  assert.equal(await api.editItem('A6', { label: 'Unsaved A6', group: 'Whole boards', unit: 'pc', active: false }), false);
  const item = api.catalog(true).find(entry => entry.key === 'A6');
  assert.deepEqual({ label: item.label, group: item.group, unit: item.unit, active: item.active }, { label: 'A6', group: 'IC chips · A series', unit: 'kg', active: true });
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

test('Daily Rates renders compact category and item management only for administrators', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  const adminHtml = api.renderRates();
  assert.match(adminHtml, /Catalog management/);
  assert.match(adminHtml, /Manage category/);
  assert.match(adminHtml, /Edit item/);
  assert.match(adminHtml, /openScrapboardCategoryEditor/);
  assert.match(adminHtml, /openScrapboardItemEditor/);

  api.setStaff();
  const staffHtml = api.renderRates();
  assert.doesNotMatch(staffHtml, /Catalog management|Manage category|Edit item/);
});

test('category editor exposes rename deactivate and conditional permanent delete actions', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Empty Custom');

  const builtIn = api.categoryEditor('Whole boards');
  assert.match(builtIn, /Edit category/);
  assert.match(builtIn, /value="Whole boards"/);
  assert.match(builtIn, />Deactivate</);
  assert.doesNotMatch(builtIn, /Delete permanently/);

  const custom = api.categoryEditor('Empty Custom');
  assert.match(custom, /Delete permanently/);
  await api.editCategory('Empty Custom', { label: 'Empty Custom', active: false });
  assert.match(api.categoryEditor('Empty Custom'), />Activate</);
});

test('item editor exposes label category unit active state and safe delete rules', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Editable Parts');
  await api.addItem('Editable Parts', 'Editable Chip', 'pc', 40);
  const key = api.customItems()[0].key;

  const builtIn = api.itemEditor('A6');
  assert.match(builtIn, /Edit item/);
  assert.match(builtIn, /value="A6"/);
  assert.match(builtIn, /value="kg" selected/);
  assert.match(builtIn, />Deactivate</);
  assert.doesNotMatch(builtIn, /Delete permanently/);

  assert.match(api.itemEditor(key), /Delete permanently/);
  api.referenceItem(key);
  assert.doesNotMatch(api.itemEditor(key), /Delete permanently/);
  await api.editItem(key, { label: 'Editable Chip', group: 'Editable Parts', unit: 'pc', active: false });
  assert.match(api.itemEditor(key), />Activate</);
});

test('inactive definitions remain visible in management while disappearing from rates buying and export', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.editItem('A6', { label: 'A6', group: 'IC chips · A series', unit: 'kg', active: false });

  const rates = api.renderRates();
  assert.match(rates, /Catalog management/);
  assert.match(rates, /A6[^]*Inactive/);
  assert.doesNotMatch(rates, /id="scrap_rate_A6"/);
  assert.doesNotMatch(api.renderBuying(), /option value="A6"/);
  assert.equal(api.exportRows().some(row => row.classification === 'A6'), false);
});

test('category action tokens safely encode apostrophes used inside inline handlers', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory("O'Reilly boards");

  assert.equal(api.actionToken("O'Reilly boards").includes("'"), false);
  assert.match(api.renderRates(), /openScrapboardCategoryEditor\('O%27Reilly%20boards'\)/);
});

test('stable category keys win over renamed labels when resolving item groups', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.editCategory('Whole boards', { label: 'Main boards', active: true });
  await api.editCategory('IC chips · A series', { label: 'Whole boards', active: true });

  assert.equal(api.catalog(true).find(item => item.key === 'TABLET').group, 'Main boards');
  assert.equal(api.catalog(true).find(item => item.key === 'A6').group, 'Whole boards');
});

test('Quick Add submits stable category keys when display labels overlap old keys', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.editCategory('Whole boards', { label: 'Main boards', active: true });
  await api.editCategory('IC chips · A series', { label: 'Whole boards', active: true });

  const html = api.renderRates();
  assert.match(html, /<option value="IC chips · A series">Whole boards<\/option>/);
  assert.match(html, /<option value="Whole boards">Main boards<\/option>/);
  assert.equal(await api.addItem('IC chips · A series', 'Stable Key Chip', 'pc', 25), true);
  assert.equal(api.catalog(true).find(item => item.label === 'Stable Key Chip').group, 'Whole boards');
});

test('Quick Add rejects duplicates of inactive category keys and labels', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.editCategory('Whole boards', { label: 'Retired boards', active: false });

  assert.equal(await api.addCategory(' whole   boards '), false);
  assert.equal(await api.addCategory(' retired boards '), false);
});

test('item editor preserves the item enabled state while its category is inactive', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.editCategory('IC chips · A series', { label: 'IC chips · A series', active: false });
  const hidden = api.catalog(true).find(item => item.key === 'A6');
  assert.equal(hidden.active, false);
  assert.equal(hidden.ownActive, true);

  await api.editItem('A6', { label: 'Renamed A6', group: 'IC chips · A series', unit: 'kg', active: hidden.ownActive });
  await api.editCategory('IC chips · A series', { label: 'IC chips · A series', active: true });
  const restored = api.catalog(true).find(item => item.key === 'A6');
  assert.equal(restored.active, true);
  assert.equal(restored.label, 'Renamed A6');
});

test('failed overlapping catalog save cannot roll back a later successful edit', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  const resolveFirst = api.queueSave();
  const resolveSecond = api.queueSave();
  const first = api.editItem('A6', { label: 'First edit', group: 'IC chips · A series', unit: 'kg', active: true });
  const second = api.editItem('A5', { label: 'Second edit', group: 'IC chips · A series', unit: 'kg', active: true });

  resolveSecond(true);
  resolveFirst(false);
  assert.deepEqual(await Promise.all([first, second]), [false, true]);
  assert.equal(api.catalog(true).find(item => item.key === 'A5').label, 'Second edit');
  assert.equal(api.catalog(true).find(item => item.key === 'A6').label, 'A6');
});

test('Buying falls back to the first active item when the saved selection is inactive', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.editCategory('IC chips · A series', { label: 'IC chips · A series', active: false });

  const html = api.renderBuying();
  assert.match(html, /<option value="NC512" selected>NC 512/);
  assert.match(html, /id="b_rate"[^>]*value="1370"/);
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

test('site palette matches the original cream charcoal and brass software style', async () => {
  const source = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const finalRoot = [...source.matchAll(/:root\{([^}]*)\}/g)].at(-1)?.[1] || '';
  assert.match(finalRoot, /--paper:#F6F1E4/);
  assert.match(finalRoot, /--paper-2:#EEE6D2/);
  assert.match(finalRoot, /--brass:#A9791E/);
  assert.match(finalRoot, /--brass-bright:#C9911F/);
  assert.match(finalRoot, /--ink:#1C1B19/);
});

test('custom item appears under its category on the Buying page', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Laptop IC');
  await api.addItem('Laptop IC', 'EC Controller', 'pc', 75);

  const custom = api.customItems()[0];
  const html = api.renderBuying();
  assert.match(html, /<optgroup label="Laptop IC">/);
  assert.match(html, new RegExp(`<option value="${custom.key}"[^>]*>EC Controller — PHP 75\\/pc<`));
  assert.deepEqual(api.lookup(custom.key), custom);
  assert.equal(api.label(custom.key), 'EC Controller');
  assert.deepEqual(JSON.parse(JSON.stringify(api.activeRate(custom.key))), { rate: 75, effectiveDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), unit: 'pc' });
});

test('daily-rate export rows include custom items', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Special Boards');
  await api.addItem('Special Boards', 'Router Board', 'kg', 240);

  assert.equal(api.exportRowsAvailable(), true);
  assert.equal(api.exportRows().some(row => row.category === 'Special Boards' && row.classification === 'Router Board' && row.unit === 'kg' && row.rate === 240), true);
});

test('reserved object-property category names render safely', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('constructor');
  await api.addItem('constructor', 'Safe Chip', 'pc', 25);
  assert.doesNotThrow(() => api.renderRates());
  assert.doesNotThrow(() => api.renderBuying());
  assert.match(api.renderRates(), /<h3>constructor<\/h3>/);
});

test('empty custom category appears in Daily Rates before it has items', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Future Items');
  assert.match(api.renderRates(), /<h3>Future Items<\/h3>/);
});

test('whole-peso catalog rejects fractional starting rates', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  await api.addCategory('Fraction Check');
  assert.equal(await api.addItem('Fraction Check', 'Fractional Chip', 'pc', 0.1), false);
  assert.equal(api.customItems().length, 0);
});

test('serialized category saves keep a later successful addition after an earlier failure', async () => {
  const api = await loadCustomItemApi();
  api.setAdmin();
  const resolveFirst = api.queueSave();
  const resolveSecond = api.queueSave();
  const first = api.addCategory('First Pending');
  const second = api.addCategory('Second Saved');
  resolveSecond(true);
  resolveFirst(false);
  assert.deepEqual(await Promise.all([first, second]), [false, true]);
  assert.deepEqual([...api.categories()], ['Second Saved']);
});
