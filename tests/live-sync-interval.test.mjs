import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('daily rate setup offers scrapboard pricing without internet or public-site controls', async () => {
  const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/initializeAuth\(\);\s*$/, '');
  const context = vm.createContext({ console });
  vm.runInContext(`${source}\nseedEmptyLedger(); ensureShape(); currentUser={role:'admin'}; globalThis.ratesPage=renderRates;`, context);
  const html = context.ratesPage();
  assert.doesNotMatch(html, /Refresh &amp; apply now|Philippine internet pricing|Last checked:|Market:/);
  assert.match(html, /Daily buying rates/);
  assert.match(html, /A6/);
  assert.match(html, /Save daily rates/);
  assert.doesNotMatch(html, /public website/i);
});

test('daily rate setup has no legacy metal rate-sheet controls', async () => {
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /Save today's rate sheet/);
  assert.doesNotMatch(source, /Save rate sheet/);
  assert.doesNotMatch(source, /savePricingSnapshot/);
  assert.match(source, /SCRAPBOARD BUYING GUIDE/);
});

test('downloaded rate sheets use today’s Manila date instead of the locked rate date', async () => {
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const downloadRateSheet = source.match(/async function downloadRateSheetImage\([\s\S]*?\n\}/)?.[0] || '';

  assert.match(downloadRateSheet, /const rateSheetDate = todayStr\(\);/);
  assert.match(downloadRateSheet, /fmtDate\(rateSheetDate\)\.toUpperCase\(\)/);
  assert.match(downloadRateSheet, /zpp-price-rates-\$\{rateSheetDate\}-\$\{resolvedFormat\}/);
  assert.doesNotMatch(downloadRateSheet, /fmtDate\(db\.pricing\.effectiveDate/);
});

test('buying draft loads only after the Buying page is opened', async () => {
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const loadDatabase = source.match(/async function loadDB\(\) \{([\s\S]*?)\n\}\nfunction isAdmin/)?.[1] || '';
  const switchTab = source.match(/function goTab\(id\) \{([\s\S]*?)\n\}\nfunction render/)?.[1] || '';

  assert.doesNotMatch(loadDatabase, /loadBuyingDraft\(\)/);
  assert.match(switchTab, /if \(id === 'buying'\) \{\s*syncCashflow\(\);\s*loadBuyingDraft\(\);\s*\}/);
});
