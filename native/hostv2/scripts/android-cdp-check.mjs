import assert from 'node:assert/strict';
import fs from 'node:fs';
const pages = await (await fetch('http://127.0.0.1:5299/json/list')).json();
const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0;
const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (!m.id) return; const cb = pending.get(m.id); pending.delete(m.id); m.error ? cb.reject(m.error) : cb.resolve(m.result); };
const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
assert.equal(await evaluate("document.body.innerText.includes('Start my event')"), true);
assert.equal(await evaluate(`(async()=>{const s=Capacitor.Plugins.SecureAuthStorage;await s.set({key:'ngw_test',value:'dummy-native-storage-proof'});return (await s.get({key:'ngw_test'})).value==='dummy-native-storage-proof';})()`), true);
await send('Page.reload');
// Runtime observation, bounded by actual document state rather than a fixed delay.
const deadline = Date.now() + 15000;
let mounted = false;
while (Date.now() < deadline) {
  try { mounted = await evaluate("document.body.innerText.includes('Start my event')"); } catch {}
  if (mounted) break;
  await new Promise(r => setTimeout(r, 100));
}
assert.equal(mounted, true);
assert.equal(await evaluate(`(async()=>{const s=Capacitor.Plugins.SecureAuthStorage;const matches=(await s.get({key:'ngw_test'})).value==='dummy-native-storage-proof';await s.remove({key:'ngw_test'});return matches && (await s.get({key:'ngw_test'})).value===null;})()`), true);
const screenshot = await send('Page.captureScreenshot');
fs.writeFileSync(new URL('../artifacts/android-mounted.png', import.meta.url), Buffer.from(screenshot.data, 'base64'));
console.log('PASS: packaged onboarding, no horizontal overflow, secure storage survives reload and deletes.');
ws.close();
