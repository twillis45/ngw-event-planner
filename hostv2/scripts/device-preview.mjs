#!/usr/bin/env node
// ─── device-preview — drive the built shell on a real device profile ─────────
//
//   npm run device                     iPhone 15 Pro, WebKit (default)
//   npm run device -- "Pixel 7"        Android profile, Chromium
//   npm run device -- "iPad (gen 11) landscape"
//   npm run device -- --list           show every profile Playwright knows
//   npm run device -- "iPhone 15 Pro" --chromium
//
// WHY WEBKIT BY DEFAULT. A Chromium window resized to 393px is not an iPhone: it
// gets Blink's scrolling, Blink's `100dvh`, and no safe-area insets. hostv2 leans on
// all three -- `.content` pads with env(safe-area-inset-bottom), `.stagewrap` uses
// 100dvh below 1280px, and the NEXT pill sits in the inset. WebKit is the engine
// Safari actually ships, so those behave as they will on the device.
//
// WHAT THIS IS NOT. It is not the iOS Simulator. It will not show you iOS keyboard
// behaviour, Home-indicator gestures, or real touch latency. For those, install
// Xcode and use `xcrun simctl` (see the note printed at the end of a run).
import { chromium, webkit, devices } from 'playwright';

const argv = process.argv.slice(2);
if (argv.includes('--list')) {
  const names = Object.keys({ ...devices,
    'Galaxy S25': 1, 'Galaxy S25 landscape': 1, 'Galaxy S24+': 1, 'Galaxy S25+': 1,
    'Galaxy S24 Ultra': 1, 'Galaxy S25 Ultra': 1 }).sort();
  console.log(`${names.length} device profiles:\n`);
  for (const n of names) {
    const d = devices[n]; if (!d) { console.log(`  ${n}`); continue; }
    console.log(`  ${n.padEnd(34)} ${d.viewport.width}x${d.viewport.height}  dpr ${d.deviceScaleFactor}  ${d.isMobile ? 'touch' : 'desktop'}`);
  }
  process.exit(0);
}

// Playwright ships "Galaxy S24" (360x780 dpr3) but not the S25 line or the Ultra/+
// bodies. S25 base is the SAME 1080x2340 panel as S24, so at dpr3 it is the identical
// 360x780 CSS viewport -- aliased rather than duplicated so nobody thinks they differ.
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const android = (w, h, dpr) => ({
  userAgent: UA_ANDROID, viewport: { width: w, height: h }, screen: { width: w, height: h },
  deviceScaleFactor: dpr, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium',
});
const EXTRA = {
  'Galaxy S25': devices['Galaxy S24'],                       // same panel as S24
  'Galaxy S25 landscape': devices['Galaxy S24 landscape'],
  'Galaxy S24+': android(384, 832, 3),
  'Galaxy S25+': android(384, 832, 3),
  'Galaxy S24 Ultra': android(412, 892, 3.5),
  'Galaxy S25 Ultra': android(412, 892, 3.5),
};
const ALL = { ...devices, ...EXTRA };

const name = argv.find((a) => !a.startsWith('--')) || 'iPhone 15 Pro';
const profile = ALL[name];
// Android is Blink in the wild (Chrome AND Samsung Internet), so use Chromium there
// unless told otherwise. Forcing WebKit on a Galaxy profile would test an engine that
// device never runs.
const isAndroid = /galaxy|pixel/i.test(name);
const useChromium = argv.includes('--chromium') || (isAndroid && !argv.includes('--webkit'));
if (!profile) {
  console.error(`Unknown device "${name}". Run with --list to see the options.`);
  process.exit(1);
}

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:5233/ngw-event-planner/hostv2/';
const engine = useChromium ? chromium : webkit;

const browser = await engine.launch({ headless: false });
const context = await browser.newContext({ ...profile });
const page = await context.newPage();

console.log(`\n  ${name}`);
console.log(`  engine      ${useChromium ? 'Chromium (Blink)' : 'WebKit — the engine Safari ships'}`);
console.log(`  viewport    ${profile.viewport.width} x ${profile.viewport.height}   (screen ${profile.screen ? profile.screen.width + ' x ' + profile.screen.height : 'n/a'})`);
console.log(`  dpr         ${profile.deviceScaleFactor}`);
console.log(`  touch       ${profile.hasTouch ? 'yes' : 'no'}`);
console.log(`  url         ${URL}\n`);

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
} catch (e) {
  console.error(`  Could not reach ${URL}`);
  console.error('  Start the preview first:  E2E_BASE=1 npx vite preview --port 5233 --strictPort --host 127.0.0.1\n');
  await browser.close();
  process.exit(1);
}

// Report what the shell ACTUALLY computed on this profile, not what we hoped.
await page.waitForTimeout(2500);
const measured = await page.evaluate(() => {
  const st = document.querySelector('.stagewrap');
  const app = document.querySelector('.app');
  const cs = st ? getComputedStyle(st) : null;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  const inset = probe.getBoundingClientRect().height;
  probe.remove();
  return {
    innerWidth: window.innerWidth, innerHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
    stageWidth: st ? Math.round(st.getBoundingClientRect().width) : null,
    stageTransform: cs ? cs.transform : null,
    appWidth: app ? Math.round(app.getBoundingClientRect().width) : null,
    safeAreaBottom: inset,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
console.log('  MEASURED IN THE PAGE');
for (const [k, v] of Object.entries(measured)) console.log(`    ${k.padEnd(20)} ${v}`);
if (measured.horizontalOverflow) console.log('\n  ⚠ horizontal overflow at this size');

console.log('\n  Window is open and interactive. Ctrl-C here to close it.');
console.log('  For true iOS behaviour (keyboard, gestures, latency): install Xcode, then');
console.log(`  xcrun simctl boot "iPhone 15 Pro" && open -a Simulator && xcrun simctl openurl booted "${URL}"\n`);

await new Promise(() => {});   // hold the window open until Ctrl-C
