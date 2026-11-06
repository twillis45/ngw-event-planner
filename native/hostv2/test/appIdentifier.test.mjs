import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// One app identifier across iOS, Android and the auth callback (owner
// decision, November 6, 2026). A file left on another ID ships a build whose
// sign-in callback never returns to the app.
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ID = 'com.noguessworksystems.events';

test('capacitor carries the owner app identifier', () => {
  assert.equal(JSON.parse(read('capacitor.config.json')).appId, ID);
});

test('every platform file and the auth callback default use the same identifier', () => {
  const sites = {
    'android/app/build.gradle': [`namespace = "${ID}"`, `applicationId "${ID}"`],
    'android/app/src/main/AndroidManifest.xml': [`android:scheme="${ID}"`],
    'android/app/src/main/res/values/strings.xml': [`<string name="package_name">${ID}</string>`, `<string name="custom_url_scheme">${ID}</string>`],
    'ios/App/App/Info.plist': [`<string>${ID}</string>`],
    'runtime/bootstrap.js': [`'${ID}://auth-callback'`],
    'vite.config.mjs': [`'${ID}://auth-callback'`],
  };
  for (const [file, needles] of Object.entries(sites)) {
    const text = read(file);
    for (const n of needles) assert.ok(text.includes(n), `${file} is missing ${n}`);
  }
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj').match(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g) || [];
  assert.ok(pbx.length >= 2);
  for (const line of pbx) assert.equal(line, `PRODUCT_BUNDLE_IDENTIFIER = ${ID};`);
});

test('the Android sources live in the package the identifier names', () => {
  const dir = 'android/app/src/main/java/' + ID.split('.').join('/') + '/';
  for (const f of ['MainActivity.java', 'SecureAuthStoragePlugin.java']) {
    assert.ok(existsSync(new URL('../' + dir + f, import.meta.url)), dir + f);
    assert.ok(read(dir + f).startsWith(`package ${ID};`), f);
  }
});
