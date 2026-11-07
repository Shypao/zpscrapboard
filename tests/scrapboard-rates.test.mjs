import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadScrapboardRates() {
  const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/initializeAuth\(\);\s*$/, '');
  const context = vm.createContext({ console, Intl, Date });
  vm.runInContext(`${source}\nseedEmptyLedger(); ensureShape();
    globalThis.scrapboardRateTestApi = {
      items: () => SCRAPBOARD_ITEMS,
      rate: key => activeRate('Scrapboard', key),
      setRate: (key, value) => { db.pricing.scrapboardRates[key] = value; }
    };`, context);
  return context.scrapboardRateTestApi;
}

test('scrapboard catalog exposes the supplied default rates and units', async () => {
  const api = await loadScrapboardRates();
  const items = Array.from(api.items(), item => ({ key: item.key, rate: item.rate, unit: item.unit }));

  assert.deepEqual(items.find(item => item.key === 'A6'), { key: 'A6', rate: 1500, unit: 'kg' });
  assert.deepEqual(items.find(item => item.key === 'NC512'), { key: 'NC512', rate: 1370, unit: 'kg' });
  assert.deepEqual(items.find(item => item.key === '6531E'), { key: '6531E', rate: 25, unit: 'pc' });
  assert.deepEqual(items.find(item => item.key === 'NOKIA_ORIG_BUO'), { key: 'NOKIA_ORIG_BUO', rate: 80, unit: 'pc' });
  assert.equal(items.length, 44);
});

test('buying lookup uses the saved daily scrapboard rate', async () => {
  const api = await loadScrapboardRates();
  api.setRate('CAMERA_A', 5100);

  assert.deepEqual({ ...api.rate('CAMERA_A') }, {
    rate: 5100,
    effectiveDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    unit: 'kg'
  });
});
