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

test.each(Object.keys(surfaces()))('%s shows only the server\'s price', (name) => {
  const text = surfaces()[name];
  const prices = [...text.matchAll(/\$(\d+(?:\.\d{2})?)/g)].map((m) => Math.round(Number(m[1]) * 100));
  expect(prices.length).toBeGreaterThan(0);   // premise: this surface still shows a price
  for (const cents of prices) expect(cents).toBe(serverCents());
});
