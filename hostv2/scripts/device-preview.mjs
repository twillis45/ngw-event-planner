#!/usr/bin/env node
// ─── device-preview — drive the built shell on a real device profile ─────────
//
//   npm run device -- mobile           iPhone 15 Pro  (393x852, touch, WebKit)
//   npm run device -- tablet           iPad (gen 11)  (820x1180, touch)
//   npm run device -- desktop          1440x900 laptop, no touch, Chromium
//
//   npm run device -- mobile --dev     ...against the DEV server (live source)
//
//   npm run device                     iPhone 15 Pro, WebKit (default)
//   npm run device -- "Pixel 7"        Android profile, Chromium
//   npm run device -- "iPad (gen 11) landscape"
//   npm run device -- --list           show every profile Playwright knows
//   npm run device -- "iPhone 15 Pro" --chromium
//
// WHY THE THREE WORDS EXIST. hostv2 changes SHAPE on window size, not on any demo
// setting: at >=1280x700 `.stagewrap` is a fixed 393x852 phone silhouette, EXCEPT the
// command and food surfaces, which deliberately opt out and become a 1280-wide desktop
// canvas (styles.css ~136 and ~162). So opening the app in a normal laptop window can
// only ever show you the desktop composition — there was no way to demo the phone
// without a device profile, and resizing the window cannot get you there either
// (Chrome will not go below ~614px wide). These three words are that missing switch.
//
// WHY --dev EXISTS. The default URL is the BUILT bundle on :5233, so it shows the last
// `vite build`, not the file you just edited. `--dev` points at the dev server instead,
// which is what you want while actually working on a surface.
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
// A real laptop window: no touch, dpr 2, and WIDE ENOUGH to clear the 1280 breakpoint
// so the command surface takes its desktop composition rather than the phone
// silhouette. This is a viewport, not a device — Playwright ships no desktop profile.
const DESKTOP = {
  viewport: { width: 1440, height: 900 }, screen: { width: 1440, height: 900 },
  deviceScaleFactor: 2, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium',
};
const ALL = { ...devices, ...EXTRA, Desktop: DESKTOP };

// Plain-English device CLASSES. The point of the demo is "show me the phone / the
// tablet / the laptop", not "recall which iPhone Playwright ships".
const CLASSES = {
  mobile: 'iPhone 15 Pro',
  phone: 'iPhone 15 Pro',
  tablet: 'iPad (gen 11)',
  desktop: 'Desktop',
  laptop: 'Desktop',
};

const rawName = argv.find((a) => !a.startsWith('--')) || 'iPhone 15 Pro';
const name = CLASSES[rawName.toLowerCase()] || rawName;
const profile = ALL[name];
// Android is Blink in the wild (Chrome AND Samsung Internet), so use Chromium there
// unless told otherwise. Forcing WebKit on a Galaxy profile would test an engine that
// device never runs.
const isAndroid = /galaxy|pixel/i.test(name);
// Desktop is Blink here for the same reason Android is: nobody demos a laptop on
// WebKit-by-default, and the desktop composition is what Chrome will render.
const useChromium = argv.includes('--chromium')
  || ((isAndroid || name === 'Desktop') && !argv.includes('--webkit'));
if (!profile) {
  console.error(`Unknown device "${rawName}".`);
  console.error('Try one of:  mobile | tablet | desktop      (or --list for every profile)');
  process.exit(1);
}

const DEV_URL = 'http://localhost:5199/';
const BUILT_URL = 'http://127.0.0.1:5233/ngw-event-planner/hostv2/';
const wantDev = argv.includes('--dev');
const URL = process.env.PREVIEW_URL || (wantDev ? DEV_URL : BUILT_URL);
const engine = useChromium ? chromium : webkit;

// WebKit is the better engine for the phone/tablet profiles, but it is a SEPARATE
// download (`npx playwright install webkit`) and a machine that only ever ran the
// Chromium e2e suite will not have it. Failing here is why `npm run device` looked
// broken: the demo died on a missing binary instead of showing the phone. Fall back
// to Chromium — a 393x852 touch viewport is still a real mobile layout — and say
// plainly what is and is not faithful about it.
let engineUsed = useChromium ? 'Chromium (Blink)' : 'WebKit — the engine Safari ships';
let browser;
try {
  browser = await engine.launch({ headless: false });
} catch (err) {
  if (useChromium || !/Executable doesn't exist/i.test(String(err && err.message))) throw err;
  console.log('\n  WebKit is not installed, falling back to Chromium.');
  console.log('  The VIEWPORT and touch flags are still right, so layout and breakpoints are');
  console.log('  faithful. Not faithful: iOS scrolling, 100dvh behaviour and safe-area insets.');
  console.log('  For those:  npx playwright install webkit\n');
  browser = await chromium.launch({ headless: false });
  engineUsed = 'Chromium (Blink) — WebKit not installed';
}
const context = await browser.newContext({ ...profile });
const page = await context.newPage();

console.log(`\n  ${name}`);
console.log(`  engine      ${engineUsed}`);
console.log(`  viewport    ${profile.viewport.width} x ${profile.viewport.height}   (screen ${profile.screen ? profile.screen.width + ' x ' + profile.screen.height : 'n/a'})`);
console.log(`  dpr         ${profile.deviceScaleFactor}`);
console.log(`  touch       ${profile.hasTouch ? 'yes' : 'no'}`);
console.log(`  url         ${URL}\n`);

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
} catch (e) {
  console.error(`  Could not reach ${URL}`);
  if (wantDev) {
    console.error('  Start the dev server first:  npm run dev        (hostv2/, serves live source)\n');
  } else {
    console.error('  Start the preview first:  npm run build && E2E_BASE=1 npx vite preview --port 5233 --strictPort --host 127.0.0.1');
    console.error('  ...or demo the LIVE source instead:  npm run device -- mobile --dev\n');
  }
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
    stageHeight: st ? Math.round(st.getBoundingClientRect().height) : null,
    // WHICH COMPOSITION DID THE SHELL PICK? This is the thing that surprises people:
    // the shape is chosen from the window, so say out loud whether this run is the
    // phone silhouette or the wide desktop canvas rather than leaving it to the eye.
    // The className is present at EVERY size, but the opt-out rules live inside
    // `@media (min-width:1280px) and (min-height:700px)`. Reading the class alone
    // reported "desktop canvas" on a 393px phone. Ask the media query, not the class.
    composition: st ? (() => {
      const wide = window.matchMedia('(min-width:1280px) and (min-height:700px)').matches;
      if (!wide) return 'full-bleed (phone/tablet rules)';
      if (st.className.includes('--responsive-command')) return 'desktop canvas (command opted out of the phone silhouette)';
      if (st.className.includes('--responsive-food')) return 'desktop canvas (food sheet)';
      return 'phone silhouette, letterboxed in a desktop window';
    })() : null,
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
