// ─── EVERY PRICE A HOST READS FOR THE PASS IS THE PRICE THE SERVER CHARGES ───
//
// The server charges PASS_AMOUNT_CENTS (backend/app/routers/stripe_payments.py)
// and the browser never sends a price (thePriceIsNotTheBrowsersToSend). But the
// "$39" a host reads is literal copy in a dozen places, and nothing tied it to
// the number Stripe is told to charge. Change one without the other and the app
// advertises one price and bills another. Stage 9 audit, 11/11/2026.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// Comments may mention other prices ("$17–$39 a head"); only code and copy count.
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const serverCents = () => {
  const m = read('backend/app/routers/stripe_payments.py').match(/^PASS_AMOUNT_CENTS\s*=\s*([\d_]+)/m);
  expect(m).not.toBeNull();   // premise: the constant still exists in this form
  return Number(m[1].replace(/_/g, ''));
};

const passSheet = () => {
  const src = read('hostv2/src/HostShellV2.jsx');
  const at = src.indexOf("sheet.kind === 'pass' && (() => {");
  const end = src.indexOf("{sheet.kind === 'help' && (() => {", at);
  expect(at).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(at);
  return src.slice(at, end);
};

// Every place the pass's price is shown to a host.
const surfaces = () => {
  const shell = code(read('hostv2/src/HostShellV2.jsx')).split('\n').filter((l) => /pass/i.test(l) && /\$\d/.test(l)).join('\n');
  const dir = read('src/lib/sectionDirectory.js').split('\n').filter((l) => /k: 'pass'/.test(l)).join('\n');
  return {
    'the pass sheet': code(passSheet()),
    'pass lines in the shell': shell,
    'passGate disclosures': code(read('src/lib/passGate.js')),
    'the section directory row': dir,
    'the refund line': code(read('src/lib/refundRule.js')),
  };
};

test('the server charges a whole-dollar price', () => {
  expect(serverCents() % 100).toBe(0);
});

// ── SINCE THE PRICE TEST (G86, 11/19/2026) THE PRICE IS NOT LITERAL COPY ────
// A device may be charged a test price, so a typed "$39" on any of these
// surfaces would be a price the server might not charge. Every one of them now
// reads the device's price through lib/passPrice (passPriceLabel /
// withPassPrice / devicePassPriceCents), whose control price is the server's
// constant (passPrice.test.js) and whose test price is the server's rule on
// the same key (the shared vectors).
test.each(Object.keys(surfaces()))('%s types no price of its own', (name) => {
  expect(surfaces()[name]).not.toMatch(/\$\d/);
});

test('the shell reads the device\'s price on every pass surface', () => {
  const sheet = code(passSheet());
  expect(sheet).toMatch(/passSheetCopy\(event, devicePassPriceCents\(\)\)/);
  expect(sheet).toMatch(/refundLine\(devicePassPriceCents\(\)\)/);
  expect(sheet).toMatch(/withPassPrice\('Get the pass'\)/);
  expect(sheet).toMatch(/data-pass-price>\{passPriceLabel\(\)/);
  const shell = code(read('hostv2/src/HostShellV2.jsx'));
  expect((shell.match(/withPassPrice\('See the One-Event Pass'\)/g) || []).length).toBeGreaterThanOrEqual(5);
  expect(code(read('hostv2/src/LodgingCockpit.jsx'))).toMatch(/withPassPrice\('See the One-Event Pass'\)/);
  expect(code(read('hostv2/src/LodgingCockpit.jsx'))).not.toMatch(/\$\d/);
});

test('with no test running, the pure libs say the server\'s price', () => {
  const { refundLine } = require('../refundRule');
  const { passSheetCopy } = require('../passGate');
  const { sectionGroups } = require('../sectionDirectory');
  const dollars = '$' + serverCents() / 100;
  expect(refundLine()).toContain('all ' + dollars + ' back');
  expect(passSheetCopy({ id: 'cust-1' }).beforePaying).toContain('Pay ' + dollars + ' once');
  const row = sectionGroups({ event: {} }).flatMap((g) => g.rows).find((r) => r.k === 'pass');
  expect(row.sub).toBe(dollars + ' · one event, no subscription');
});
