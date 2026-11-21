import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readProjectFiles() {
  const [html, source, bundle] = await Promise.all([
    readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/app.ts', import.meta.url), 'utf8'),
    readFile(new URL('../public/app.js', import.meta.url), 'utf8')
  ]);
  return { html, source, bundle };
}

test('Scrapboard exposes persistent light and dark theme controls on login and app shells', async () => {
  const { html, source } = await readProjectFiles();

  assert.match(source, /SCRAPBOARD_THEME_KEY/);
  assert.match(source, /initializeScrapboardTheme/);
  assert.match(source, /applyScrapboardTheme/);
  assert.match(source, /toggleScrapboardTheme/);
  assert.match(html, /data-theme-toggle/);
  assert.ok((html.match(/data-theme-toggle/g) || []).length >= 2);
});

test('theme initialization safely supports saved preference and system fallback', async () => {
  const { source } = await readProjectFiles();

  assert.match(source, /localStorage/);
  assert.match(source, /prefers-color-scheme:\s*dark/);
  assert.match(source, /data-theme/);
  assert.match(source, /light.*dark|dark.*light/s);
});

test('Scrapboard theme tokens cover both themes without targeting thermal paper', async () => {
  const { html } = await readProjectFiles();

  assert.match(html, /html\[data-theme="dark"\]/);
  assert.match(html, /--theme-bg/);
  assert.match(html, /--theme-surface/);
  assert.match(html, /--theme-accent/);
  assert.match(html, /\.scrapboard-app/);
  assert.match(html, /\.thermal-receipt/);
  assert.match(html, /@media\s+print/);
});

test('theme bundle cache version changes with the generated app bundle', async () => {
  const { html, bundle } = await readProjectFiles();

  const match = html.match(/app\.js\?v=([^"']+)/);
  assert.ok(match, 'expected cache-busted app.js script');
  assert.notEqual(match[1], '20261108-scrapboard-trading');
  assert.match(bundle, /toggleScrapboardTheme/);
});
