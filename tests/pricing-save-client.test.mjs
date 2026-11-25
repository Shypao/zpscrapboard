import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadPricingClient(fetchImpl) {
  const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8'))
    .replace(/initializeAuth\(\);\s*$/, '');
  const context = vm.createContext({
    console,
    Intl,
    Date,
    Math,
    JSON,
    setTimeout,
    fetch: fetchImpl,
    location: { protocol: 'https:' },
    document: {
      getElementById: () => null,
      addEventListener: () => {},
      createElement: () => ({ className: '', textContent: '', remove: () => {} }),
      body: { appendChild: () => {} },
    },
    testToasts: [],
    toast: message => context.testToasts.push(message),
  });
  vm.runInContext(`${source}
    seedEmptyLedger();
    ensureShape();
    db._revision = 3;
    globalThis.pricingClient = {
      save: () => savePricingDB(false, 'internal'),
      revision: () => db._revision,
      toasts: () => [...testToasts],
    };`, context);
  return context.pricingClient;
}

test('pricing save refreshes the revision and retries after a stale-session conflict', async () => {
  const requests = [];
  const client = await loadPricingClient(async (url, options) => {
    options ||= {};
    const method = options.method || 'GET';
    requests.push({ url, options: { ...options, method } });
    if (method === 'PUT' && requests.filter(request => request.options.method === 'PUT').length === 1) {
      return new Response(JSON.stringify({ error: 'The ledger changed in another session.' }), { status: 409 });
    }
    if (method === 'GET') {
      return new Response(JSON.stringify({ pricing: {}, revision: 4 }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, revision: 5 }), { status: 200 });
  });

  assert.equal(await client.save(), true);
  assert.deepEqual(requests.map(request => `${request.options.method} ${request.url}`), [
    'PUT /api/pricing',
    'GET /api/pricing',
    'PUT /api/pricing',
  ]);
  assert.equal(JSON.parse(requests[2].options.body).revision, 4);
  assert.equal(client.revision(), 5);
  assert.deepEqual(Array.from(client.toasts()), []);
});
