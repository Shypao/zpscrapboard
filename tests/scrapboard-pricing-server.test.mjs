import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function serverPricingProbe(scriptBody) {
  const script = `
    import * as server from './src/server.ts';
    ${scriptBody}
  `;
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', script], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: { ...process.env, ZPP_UPSTREAM_URL: 'http://unused.invalid' }
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

const currentPricing = {
  effectiveDate: '2026-11-08', staffRateEditingUnlocked: true,
  gold: { base: 1, overrides: {} }, silver: { base: 1, overrides: {} }, platinum: { base: 1, overrides: {} },
  dailyFormula: { effectiveDate: '2026-11-08', baseRates: {} },
  scrapboardRates: { A6: 1500, CUSTOM_NEW: 25 },
  customScrapboardCategories: ['Custom'],
  customScrapboardItems: [{ key: 'CUSTOM_NEW', label: 'New', group: 'Custom', unit: 'pc', rate: 25 }]
};

test('stale internal pricing snapshot preserves newer custom catalog data', () => {
  const stale = { ...currentPricing, scrapboardRates: { A6: 1600 }, customScrapboardCategories: [], customScrapboardItems: [] };
  const result = serverPricingProbe(`
    const result = server.isolatedPricingUpdate(${JSON.stringify(currentPricing)}, ${JSON.stringify(stale)}, 'internal');
    process.stdout.write(JSON.stringify(result));
  `);
  assert.deepEqual(result.customScrapboardCategories, ['Custom']);
  assert.equal(result.customScrapboardItems[0].key, 'CUSTOM_NEW');
  assert.equal(result.scrapboardRates.CUSTOM_NEW, 25);
  assert.equal(result.scrapboardRates.A6, 1600);
});

test('catalog scope merges additions without deleting current definitions', () => {
  const candidate = { ...currentPricing, customScrapboardCategories: ['Second'], customScrapboardItems: [{ key: 'CUSTOM_SECOND', label: 'Second', group: 'Second', unit: 'kg', rate: 50 }], scrapboardRates: { CUSTOM_SECOND: 50 } };
  const result = serverPricingProbe(`
    const result = server.isolatedPricingUpdate(${JSON.stringify(currentPricing)}, ${JSON.stringify(candidate)}, 'catalog');
    process.stdout.write(JSON.stringify(result));
  `);
  assert.deepEqual(result.customScrapboardCategories.sort(), ['Custom', 'Second']);
  assert.deepEqual(result.customScrapboardItems.map(item => item.key).sort(), ['CUSTOM_NEW', 'CUSTOM_SECOND']);
  assert.equal(result.scrapboardRates.CUSTOM_NEW, 25);
  assert.equal(result.scrapboardRates.CUSTOM_SECOND, 50);
});

test('catalog-management scope applies authoritative edits and deletions without changing unrelated pricing', () => {
  const candidate = structuredClone(currentPricing);
  candidate.customScrapboardCategories = [];
  candidate.customScrapboardItems = [];
  candidate.scrapboardRates = { A6: 1500 };
  candidate.scrapboardCategorySettings = { 'Whole boards': { label: 'Main boards', active: true } };
  candidate.scrapboardItemSettings = { A6: { label: 'Premium A6', group: 'Whole boards', unit: 'pc', active: false } };
  const result = serverPricingProbe(`
    const result = server.isolatedPricingUpdate(${JSON.stringify(currentPricing)}, ${JSON.stringify(candidate)}, 'catalog-management');
    process.stdout.write(JSON.stringify(result));
  `);
  assert.deepEqual(result.customScrapboardCategories, []);
  assert.deepEqual(result.customScrapboardItems, []);
  assert.deepEqual(result.scrapboardCategorySettings, candidate.scrapboardCategorySettings);
  assert.deepEqual(result.scrapboardItemSettings, candidate.scrapboardItemSettings);
  assert.equal(result.scrapboardRates.CUSTOM_NEW, undefined);
  assert.equal(result.scrapboardRates.A6, 1500);
  assert.deepEqual(result.gold, currentPricing.gold);
});

test('staff rate validation accepts persisted custom item keys without catalog changes', () => {
  const candidate = structuredClone(currentPricing);
  candidate.scrapboardRates.CUSTOM_NEW = 30;
  const result = serverPricingProbe(`
    const result = server.staffEditablePricing(${JSON.stringify(currentPricing)}, ${JSON.stringify(candidate)});
    process.stdout.write(JSON.stringify(result));
  `);
  assert.equal(result.scrapboardRates.CUSTOM_NEW, 30);
  assert.deepEqual(result.customScrapboardItems, currentPricing.customScrapboardItems);
});

test('staff rate validation saves normal and bulk buyer rates independently', () => {
  const current = structuredClone(currentPricing);
  current.scrapboardBulkRates = { A6: 1700, CUSTOM_NEW: 30 };
  const candidate = structuredClone(current);
  candidate.scrapboardRates.A6 = 1550;
  candidate.scrapboardBulkRates.A6 = 1850;
  const result = serverPricingProbe(`
    const result = server.staffEditablePricing(${JSON.stringify(current)}, ${JSON.stringify(candidate)});
    process.stdout.write(JSON.stringify(result));
  `);
  assert.equal(result.scrapboardRates.A6, 1550);
  assert.equal(result.scrapboardBulkRates.A6, 1850);
});

test('legacy pricing passes through the internal update pipeline for staff saves', () => {
  const candidate = structuredClone(currentPricing);
  candidate.scrapboardRates.A6 = 1600;
  const result = serverPricingProbe(`
    const current = ${JSON.stringify(currentPricing)};
    const candidate = ${JSON.stringify(candidate)};
    const isolated = server.isolatedPricingUpdate(current, candidate, 'internal');
    let output;
    try { output = { pricing: server.staffEditablePricing(current, isolated) }; }
    catch (error) { output = { error: error.message }; }
    process.stdout.write(JSON.stringify(output));
  `);
  assert.equal(result.error, undefined);
  assert.equal(result.pricing.scrapboardRates.A6, 1600);
});

test('catalog management rejects deletion of a historically referenced custom item', () => {
  const candidate = structuredClone(currentPricing);
  candidate.customScrapboardItems = [];
  candidate.scrapboardRates = { A6: 1500 };
  const result = serverPricingProbe(`
    const state = { pricing: ${JSON.stringify(currentPricing)}, stock: [{ id: 'stock-1', metal: 'Scrapboard', karat: 'CUSTOM_NEW' }] };
    let message = '';
    try { server.validateCatalogManagementCandidate(state, ${JSON.stringify(candidate)}); } catch (error) { message = error.message; }
    process.stdout.write(JSON.stringify({ message }));
  `);
  assert.match(result.message, /used in history/i);
});

test('catalog management rejects duplicate normalized category labels', () => {
  const candidate = structuredClone(currentPricing);
  candidate.customScrapboardCategories = ['Custom', 'Second'];
  candidate.scrapboardCategorySettings = { Custom: { label: 'Same Name', active: true }, Second: { label: ' same   name ', active: true } };
  const result = serverPricingProbe(`
    let message = '';
    try { server.validateCatalogManagementCandidate({ pricing: ${JSON.stringify(currentPricing)} }, ${JSON.stringify(candidate)}); } catch (error) { message = error.message; }
    process.stdout.write(JSON.stringify({ message }));
  `);
  assert.match(result.message, /duplicate category/i);
});

test('server migrates legacy IC category keys before catalog validation', () => {
  const candidate = structuredClone(currentPricing);
  candidate.scrapboardCategorySettings = { 'IC Chips · EMCP': { label: 'EMCP', active: true } };
  candidate.scrapboardItemSettings = { A5: { label: 'A5', group: 'IC Chips · EMCP', unit: 'pc', active: true } };
  const result = serverPricingProbe(`
    const candidate = ${JSON.stringify(candidate)};
    const migrated = server.migrateLegacyCatalogPricing(candidate);
    let message = '';
    try { server.validateCatalogManagementCandidate({ pricing: ${JSON.stringify(currentPricing)} }, migrated); } catch (error) { message = error.message; }
    process.stdout.write(JSON.stringify({ message, categories: migrated.scrapboardCategorySettings, item: migrated.scrapboardItemSettings.A5 }));
  `);
  assert.equal(result.message, '');
  assert.equal(result.categories['IC Chips · EMCP'], undefined);
  assert.equal(result.item.group, 'IC Chips · Coded');
  assert.equal(result.item.unit, 'pc');
});

test('catalog management rejects invalid custom item units and missing groups', () => {
  const candidate = structuredClone(currentPricing);
  candidate.customScrapboardItems = [{ key: 'CUSTOM_NEW', label: 'New', group: 'Missing group', unit: 'box', rate: 25 }];
  const result = serverPricingProbe(`
    let message = '';
    try { server.validateCatalogManagementCandidate({ pricing: ${JSON.stringify(currentPricing)} }, ${JSON.stringify(candidate)}); } catch (error) { message = error.message; }
    process.stdout.write(JSON.stringify({ message }));
  `);
  assert.match(result.message, /unit|category/i);
});

test('catalog management validates persisted drag order values', () => {
  const candidate = structuredClone(currentPricing);
  candidate.scrapboardCategorySettings = { 'Whole boards': { order: -1 } };
  const result = serverPricingProbe(`
    let message = '';
    try { server.validateCatalogManagementCandidate({ pricing: ${JSON.stringify(currentPricing)} }, ${JSON.stringify(candidate)}); } catch (error) { message = error.message; }
    process.stdout.write(JSON.stringify({ message }));
  `);
  assert.match(result.message, /category order/i);
});

test('catalog management allows a built-in category tombstone only after its items move out', () => {
  const blocked = structuredClone(currentPricing);
  blocked.scrapboardCategorySettings = { 'IC Chips · Coded': { active: false, deleted: true } };
  const allowed = structuredClone(blocked);
  allowed.scrapboardItemSettings = Object.fromEntries(['A6','A5','A4','A3','A2','A1'].map(key => [key, { group: 'Whole boards', unit: 'kg', active: true }]));
  const result = serverPricingProbe(`
    const state = { pricing: ${JSON.stringify(currentPricing)} };
    let blockedMessage = '', allowedMessage = '';
    try { server.validateCatalogManagementCandidate(state, ${JSON.stringify(blocked)}); } catch (error) { blockedMessage = error.message; }
    try { server.validateCatalogManagementCandidate(state, ${JSON.stringify(allowed)}); } catch (error) { allowedMessage = error.message; }
    process.stdout.write(JSON.stringify({ blockedMessage, allowedMessage }));
  `);
  assert.match(result.blockedMessage, /still contains items/i);
  assert.equal(result.allowedMessage, '');
});

test('catalog management allows deleting a custom category after its last item moved by override', () => {
  const movedCurrent = structuredClone(currentPricing);
  movedCurrent.scrapboardItemSettings = { CUSTOM_NEW: { label: 'New', group: 'Whole boards', unit: 'pc', active: true } };
  const candidate = structuredClone(movedCurrent);
  candidate.customScrapboardCategories = [];
  const result = serverPricingProbe(`
    let message = '';
    try { server.validateCatalogManagementCandidate({ pricing: ${JSON.stringify(movedCurrent)} }, ${JSON.stringify(candidate)}); } catch (error) { message = error.message; }
    process.stdout.write(JSON.stringify({ message }));
  `);
  assert.equal(result.message, '');
});

test('pricing revision guard rejects stale writes', () => {
  const result = serverPricingProbe(`
    let message = '';
    try { server.assertPricingRevision(7, 8); } catch (error) { message = error.message; }
    process.stdout.write(JSON.stringify({ message }));
  `);
  assert.match(result.message, /changed in another session/i);
});
