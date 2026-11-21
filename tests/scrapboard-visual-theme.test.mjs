import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('theme palette keeps app surfaces readable without the legacy gold palette', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(html, /--theme-accent:#5F776D/);
  assert.match(html, /--theme-accent-strong:#456358/);
  assert.match(html, /--theme-accent-soft:#E0EBE6/);
  assert.match(html, /--theme-accent:#9AB8AA/);
  assert.match(html, /--theme-accent-strong:#B3CEC0/);
  assert.match(html, /--theme-accent-soft:#3B5149/);
  assert.match(html, /padding-inline:clamp\(14px,2vw,28px\)/);
  assert.match(html, /padding-block:clamp\(12px,1\.5vw,22px\)/);
  assert.match(html, /\.scrapboard-app \.summary-grand\{background:var\(--theme-surface-2\);color:var\(--theme-text\);/);
  assert.match(html, /\.scrapboard-app \.summary-grand span,\.scrapboard-app \.summary-grand strong/);
  assert.match(html, /--ink:var\(--theme-panel\)/);
  assert.match(html, /\.scrapboard-app \.scrap-category-choice\.is-active/);
  assert.match(html, /\.scrapboard-app \.liquidation-batch-buyer strong\{color:var\(--theme-text\);/);
  assert.match(html, /html\[data-theme="dark"\] \.scrapboard-app \.liquidation-batch-buyer strong\{color:var\(--theme-panel-text\);/);
});
