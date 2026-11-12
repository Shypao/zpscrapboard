import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const appSource = new URL('../public/app.ts', import.meta.url);
const nativeSource = new URL('../android-bridge/app/src/main/java/com/zpscrapboard/bridge/MainActivity.kt', import.meta.url);
const manifestSource = new URL('../android-bridge/app/src/main/AndroidManifest.xml', import.meta.url);

test('web receipt printing uses the native Bluetooth bridge when embedded on Poco M1', async () => {
  const source = await readFile(appSource, 'utf8');

  assert.match(source, /AndroidBluetoothBridge/);
  assert.match(source, /printEscPos/);
  assert.match(source, /bluetooth/);
  assert.match(source, /RawBT/);
});

test('native bridge sends ESC/POS over Bluetooth Classic SPP and declares Android permissions', async () => {
  const [native, manifest] = await Promise.all([
    readFile(nativeSource, 'utf8'),
    readFile(manifestSource, 'utf8'),
  ]);

  assert.match(native, /00001101-0000-1000-8000-00805F9B34FB/);
  assert.match(native, /createRfcommSocketToServiceRecord/);
  assert.match(native, /it\.write\(bytes\)/);
  assert.match(native, /VOZY|PrinterX/);
  assert.match(manifest, /android\.permission\.BLUETOOTH_CONNECT/);
  assert.match(manifest, /android\.permission\.BLUETOOTH_SCAN/);
});
