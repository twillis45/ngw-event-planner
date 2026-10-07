// ─── THE WRAPPER THE RENAME COULD NOT REACH ─────────────────────────────────
//
// The 2026-09-23 rename swept 17 files and 121 occurrences and gave the name an
// owner — lib/brand.js. Everything React renders has been correct ever since.
//
// And on 2026-10-03, ten days later, production still introduced itself as the
// competitor:
//
//   /            <title>NGW Event Boss</title>
//   /            apple-mobile-web-app-title "Event Boss"
//   /hostv2/     <title>Event Boss — Host Shell V2 (wired prototype)</title>
//   manifest     "name": "NGW Event Boss", "short_name": "Event Boss"
//   landing.html the SALES page, five times, wordmark and hero copy included
//
// None of it was an oversight of judgement. `brand.js` is a JS module, and a
// JS module cannot reach a <title> tag in static HTML or a string in a JSON
// manifest. The rename was complete everywhere its instrument could see, and
// the instrument could not see the wrapper — which is the half a BUYER sees
// first: the browser tab, the Google result, the link preview, and the name
// under the icon when somebody saves it to their phone.
//
// This test is the instrument for that half. It reads the shipped static files
// as text, because that is the only way to check them.
//
// NOT COVERED HERE, DELIBERATELY: the one string that must keep the old name is
// `RSVP_METHODS`'s frozen stored value in App.js — see
// theBrandStringThatIsAlsoAStoredValue.test.js for why renaming it would eat
// real client answers. It is not a static asset, so it is out of scope by
// construction rather than by an exception list that could grow.
import fs from 'fs';
import path from 'path';
import { BRAND } from '../brand';

const ROOT = path.resolve(__dirname, '../../..');
const RETIRED = /Event Boss/i;

// ─── THE OTHER NAME ON THE PAGE ─────────────────────────────────────────────
// The 2026-10-03 sweep above fixed the PRODUCT name in all six shipped files
// and passed. The sales page kept crediting the wrong COMPANY for four more
// days — "No Guesswork Events — a New Ground Works build" — in the footer,
// which is the line a buyer reads when they go looking for who they would be
// paying. The sweep could not have caught it: it searched for the retired
// product name, and this is a different string naming a different thing.
//
// `BRAND.company` already existed when this was found and had NO CONSUMER
// anywhere in the tree — the fact had an owner and nobody read it, which is
// the same class as the wordmark and the diet vocabulary before it. Static
// HTML cannot import the module, so the binding has to be a test; that is what
// the two assertions below are.
const RETIRED_COMPANY = /New Ground Works/i;

// Every static file a visitor can be served. A new one added here without the
// name is the next instance of this bug.
const SHIPPED = [
  'public/index.html',
  'public/landing.html',
  'public/manifest.json',
  'public/hostv2-manifest.json',
  'public/concepts/host-shell.html',
  'hostv2/index.html',
];

describe('the name outside the app', () => {
  test.each(SHIPPED)('%s never ships the retired name', (rel) => {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) throw new Error(`${rel} is listed as shipped but does not exist`);
    const text = fs.readFileSync(p, 'utf8');
    const hits = text.split('\n')
      .map((l, i) => (RETIRED.test(l) ? `${i + 1}: ${l.trim().slice(0, 90)}` : null))
      .filter(Boolean);
    expect(hits).toEqual([]);
  });

  // Absence is half a test. A file could pass the check above by naming nobody
  // at all, which is how a <title> ends up reading "index" in a search result.
  test.each(SHIPPED)('%s actually carries the brand', (rel) => {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    expect(text.includes(BRAND.full) || text.includes(BRAND.short)).toBe(true);
  });

  // The home-screen label is the one place the FULL name does not fit — iOS
  // truncates it under the icon — which is why brand.js carries `short`.
  test('the home-screen label uses the short form', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
    const m = html.match(/apple-mobile-web-app-title"\s+content="([^"]*)"/);
    expect(m).toBeTruthy();
    expect(m[1]).toBe(BRAND.short);
  });

  test.each(SHIPPED)('%s never credits the retired company', (rel) => {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const hits = text.split('\n')
      .map((l, i) => (RETIRED_COMPANY.test(l) ? `${i + 1}: ${l.trim().slice(0, 90)}` : null))
      .filter(Boolean);
    expect(hits).toEqual([]);
  });

  // Absence again proves only absence. The footer is the one shipped place that
  // names the seller at all, so it is checked for the CURRENT entity by value —
  // which also gives `BRAND.company` its first reader.
  test('the sales page credits the company brand.js names', () => {
    expect(BRAND.company).not.toMatch(RETIRED_COMPANY);
    const html = fs.readFileSync(path.join(ROOT, 'public/landing.html'), 'utf8');
    const footer = (html.match(/<footer>([\s\S]*?)<\/footer>/) || [])[1] || '';
    expect(footer).toContain(BRAND.company);
  });

  // "wired prototype" was shipping in a title tag — the string a bookmark keeps.
  test('no internal build language reaches a title tag', () => {
    for (const rel of SHIPPED.filter((f) => f.endsWith('.html'))) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const title = (text.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      expect(title).not.toMatch(/prototype|wired|Shell V\d|TODO|WIP/i);
    }
  });
});
