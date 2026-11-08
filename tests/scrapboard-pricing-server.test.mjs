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

test('pricing revision guard rejects stale writes', () => {
  const result = serverPricingProbe(`
    let message = '';
    try { server.assertPricingRevision(7, 8); } catch (error) { message = error.message; }
    process.stdout.write(JSON.stringify({ message }));
  `);
  assert.match(result.message, /changed in another session/i);
});
