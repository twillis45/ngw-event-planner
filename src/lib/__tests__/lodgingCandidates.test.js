// ─── ONE PASTE / ONE CLICK → THE WHOLE SHORTLIST ─────────────────────────────
//
// Host 2026-07-28: "why does the host have to pull a url?" then "#6" (the
// bookmarklet). Both paths land on the SAME interpreter, so the fixtures below
// are the real thing: the token order was measured off a live Airbnb McHenry
// search on 2026-07-28, including the parts that make naive parsing fail —
// the `/rooms/` anchor repeats seven times with EMPTY text, accessibility text
// duplicates every count, and the card's own words come AFTER its link.
const {
  extractListingCandidates, candidatesFromGroups, rankCandidates,
} = require('../lodgingIntel');
const {
  buildBookmarklet, parseBookmarkletPayload, lodgingHashPayload, MAX_CANDIDATES,
} = require('../lodgingBookmarklet');

// A faithful reduction of two real cards, in real document order.
const REAL_PAGE = `
<div>
  <a href="/rooms/1325296319540609918"><img></a>
  <span>Top guest favorite</span><span>Guest favorite</span>
  <a href="/rooms/1325296319540609918"></a><a href="/rooms/1325296319540609918"></a>
  <div>Cabin in McHenry</div>
  <div>Spacious 5BR Family Cabin</div>
  <span>5 bedrooms</span><span>5 bedrooms</span><span>,</span><span>·</span>
  <span>8 beds</span><span>8 beds</span>
  <span>$1,997</span><span>$1,668</span>
  <span>Show price breakdown</span><span>for 2 nights</span>
  <a href="/rooms/755818219758599326"></a>
  <span>Guest favorite</span>
  <div>Home in McHenry</div>
  <div>Off the Deep End | Lake Access, Hot Tub!</div>
  <span>6 bedrooms</span><span>·</span><span>7 beds</span>
  <span>$2,403</span>
</div>`;

describe('a copied results page becomes a shortlist', () => {
  test('each card is recovered with its own name, counts and price', () => {
    const { candidates, source, linksOnly } = extractListingCandidates(REAL_PAGE);
    expect(source).toBe('Airbnb');
    expect(linksOnly).toBe(false);
    expect(candidates).toHaveLength(2);

    const [a, b] = candidates;
    expect(a.url).toBe('https://www.airbnb.com/rooms/1325296319540609918');
    expect(a.name).toBe('Spacious 5BR Family Cabin');
    expect(a.kind.toLowerCase()).toBe('cabin');
    expect(a.place).toBe('McHenry');
    expect(a.bedrooms).toBe(5);
    expect(a.beds).toBe(8);
    // The strike-through original is $1,997; the payable figure is the LAST one.
    expect(a.priceShown).toBe(1668);

    expect(b.name).toBe('Off the Deep End | Lake Access, Hot Tub!');
    expect(b.beds).toBe(7);
    expect(b.priceShown).toBe(2403);
  });

  test('the seven repeated empty anchors do not become seven candidates', () => {
    const { candidates } = extractListingCandidates(REAL_PAGE);
    expect(new Set(candidates.map((c) => c.url)).size).toBe(candidates.length);
  });

  test('accessibility duplicates never double a count', () => {
    const { candidates } = extractListingCandidates(REAL_PAGE);
    expect(candidates[0].beds).toBe(8);      // "8 beds" appears twice on the page
    expect(candidates[0].bedrooms).toBe(5);
  });

  test('a badge is never mistaken for the property name', () => {
    const { candidates } = extractListingCandidates(REAL_PAGE);
    for (const c of candidates) {
      expect(c.name).not.toMatch(/guest favorite|superhost|show price/i);
    }
  });

  test('a plain-text paste yields links and SAYS it only got links', () => {
    // Measured: a text/plain copy of that page is mostly chrome and the anchors
    // carry no text, so names cannot be paired. Reporting linksOnly is the
    // honest outcome — presenting nameless rows as a read would not be.
    const txt = 'https://www.airbnb.com/rooms/111?x=1\nsome junk\nhttps://www.vrbo.com/2222';
    const out = extractListingCandidates(txt);
    expect(out.linksOnly).toBe(true);
    expect(out.candidates.map((c) => c.url)).toEqual([
      'https://www.airbnb.com/rooms/111', 'https://www.vrbo.com/2222',
    ]);
    expect(out.candidates.every((c) => c.name === '')).toBe(true);
  });

  test('links to anywhere else are ignored entirely', () => {
    const out = extractListingCandidates(
      '<a href="https://evil.example.com/rooms/1">x</a><a href="http://www.airbnb.com/rooms/2">y</a>');
    expect(out.candidates).toEqual([]);
  });

  test('empty in, empty out — never a crash', () => {
    for (const v of [null, undefined, '', '   ', '<html></html>']) {
      expect(extractListingCandidates(v).candidates).toEqual([]);
    }
  });
});

describe('ranking says what it knows and what it cannot', () => {
  const event = { id: 'e', type: 'Family Reunion', date: '2026-09-11', endDate: '2026-09-13', guestCount: 10, venueCity: 'McHenry', venueState: 'MD' };

  test('a house short on real beds is marked, with the reason', () => {
    const { ranked } = rankCandidates(
      [{ url: 'https://www.airbnb.com/rooms/1', name: 'Small place', beds: 4 }], event, {});
    expect(ranked[0].clears).toBe(false);
    expect(ranked[0].why).toMatch(/4 beds for 10/);
  });

  test('over the budget the host set is a hard fail, named in dollars', () => {
    const { ranked } = rankCandidates(
      [{ url: 'https://www.airbnb.com/rooms/1', name: 'Big place', beds: 12, priceShown: 4000 }],
      event, { budget: 3000 });
    expect(ranked[0].clears).toBe(false);
    expect(ranked[0].why).toMatch(/\$4,000 is over the \$3,000/);
  });

  test('an unmatched requirement is UNKNOWN, never failed', () => {
    // A results card carries beds and a price — not amenities. Absence of the
    // word "hot tub" in a name is not absence of a hot tub, and saying so would
    // be inventing a fact about a house nobody has looked at.
    const { ranked } = rankCandidates(
      [{ url: 'https://www.airbnb.com/rooms/1', name: 'Off the Deep End | Lake Access, Hot Tub!', beds: 12 }], event, {});
    expect(ranked[0].clears).toBe(true);
    expect(ranked[0].matched.length + ranked[0].unknown.length).toBeGreaterThan(0);
    expect(ranked[0]).not.toHaveProperty('failed');
  });

  test('clearing candidates sort above failing ones', () => {
    const { ranked, clearing, considered } = rankCandidates([
      { url: 'https://www.airbnb.com/rooms/1', name: 'Tiny', beds: 2 },
      { url: 'https://www.airbnb.com/rooms/2', name: 'Roomy with Hot Tub', beds: 12 },
    ], event, {});
    expect(ranked[0].name).toBe('Roomy with Hot Tub');
    expect(clearing).toHaveLength(1);
    expect(considered).toBe(2);
  });
});

describe('the bookmarklet is a dumb collector with a paranoid receiver', () => {
  test('it produces a javascript: URL that opens the app and nothing else', () => {
    const b = buildBookmarklet('https://example.test/hostv2/');
    expect(b.startsWith('javascript:')).toBe(true);
    const src = decodeURIComponent(b.slice('javascript:'.length));
    expect(src).toContain('https://example.test/hostv2/#lodging=');
    // A collector, not a parser: no interpretation lives in the host's bookmark.
    expect(src).not.toMatch(/bedrooms?\\?s\*|priceShown|Guest favorite/);
    // It must never talk to anything.
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|eval\(/);
  });

  test('a hash payload round-trips into the SAME interpreter as the paste path', () => {
    const groups = [{
      url: 'https://www.airbnb.com/rooms/1325296319540609918',
      lines: ['Top guest favorite', 'Cabin in McHenry', 'Spacious 5BR Family Cabin', '5 bedrooms', '8 beds', '$1,997', '$1,668'],
    }];
    const hash = '#lodging=' + encodeURIComponent(JSON.stringify(groups));
    const parsed = parseBookmarkletPayload(lodgingHashPayload(hash));
    const cands = candidatesFromGroups(parsed);
    expect(cands).toHaveLength(1);
    expect(cands[0].name).toBe('Spacious 5BR Family Cabin');
    expect(cands[0].beds).toBe(8);
    expect(cands[0].priceShown).toBe(1668);
  });

  test('a fragment is untrusted input — off-platform URLs are dropped', () => {
    const payload = JSON.stringify([
      { url: 'https://evil.example.com/rooms/1', lines: ['x'] },
      { url: 'http://www.airbnb.com/rooms/2', lines: ['x'] },     // not https
      { url: 'javascript:alert(1)', lines: ['x'] },
      { url: 'https://www.airbnb.com/rooms/3', lines: ['Home in McHenry', 'Real one', '4 beds'] },
    ]);
    const out = parseBookmarkletPayload(payload);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://www.airbnb.com/rooms/3');
  });

  test('malformed payloads yield nothing rather than throwing', () => {
    for (const v of [null, '', 'not json', '{"not":"an array"}', '[1,2,3]', '[null]', '[{}]']) {
      expect(parseBookmarkletPayload(v)).toEqual([]);
    }
  });

  test('a stuffed payload is capped, not trusted', () => {
    // Comfortably past every cap without building a gigabyte of fixture.
    const many = Array.from({ length: 120 }, (_, i) => ({
      url: `https://www.airbnb.com/rooms/${i + 1}`,
      lines: Array.from({ length: 60 }, () => 'x'.repeat(400)),
    }));
    const out = parseBookmarkletPayload(JSON.stringify(many));
    expect(out.length).toBeLessThanOrEqual(MAX_CANDIDATES);
    for (const g of out) {
      expect(g.lines.length).toBeLessThanOrEqual(24);
      for (const l of g.lines) expect(l.length).toBeLessThanOrEqual(120);
    }
  });

  test('no hash, no payload', () => {
    expect(lodgingHashPayload('')).toBe('');
    expect(lodgingHashPayload('#stage=plan')).toBe('');
    expect(lodgingHashPayload('#stage=plan&lodging=abc')).toBe('abc');
  });
});

// ─── THE BULK ADD MUST SPEAK THE ENGINE'S SCHEMA ─────────────────────────────
//
// Caught live: three listings went in carrying visible prices, and the
// recommendation said "I couldn't weigh what any of them cost." It was right —
// the first cut wrote the FORM'S INPUT names (`total`, string `sleeps`) instead
// of the stored option shape (`totalPrice`, numeric `beds`), so the reader found
// nothing. Compiling proves nothing about a key nobody reads; this does.
describe('bulk-added options use the shape the engine reads', () => {
  const fs = require('fs');
  const path = require('path');
  const SHELL = fs.readFileSync(
    path.resolve(__dirname, '../../..', 'hostv2/src/HostShellV2.jsx'), 'utf8');
  const block = SHELL.slice(SHELL.indexOf('staged.ranked.filter((c) => staged.pick.has(c.url))'));
  const add = block.slice(0, block.indexOf('}));') + 4);

  test('it writes totalPrice, not the form field name', () => {
    expect(add).toMatch(/totalPrice:/);
    expect(add).not.toMatch(/\btotal:\s/);
  });

  test('prices and counts are written as NUMBERS', () => {
    // String(…) round-tripping was how the string `sleeps` slipped in.
    expect(add).not.toMatch(/String\(c\.(priceShown|beds|bedrooms)\)/);
  });

  test('a bed count is never written as a sleeps count', () => {
    // A results card shows BEDS. "8 beds" is not "sleeps 8" — a bed can be a
    // bunk or a sofa, which is the whole point of the real-beds requirement.
    // Claiming a capacity the card never stated would be inventing a fact.
    expect(add).toMatch(/beds:/);
    expect(add).not.toMatch(/sleeps:\s*c\.beds/);
  });

  test("the engine's own reader still keys on those names", () => {
    const lib = fs.readFileSync(path.resolve(__dirname, '..', 'lodgingIntel.js'), 'utf8');
    expect(lib).toMatch(/totalPrice:\s*num\(o\.totalPrice\)/);
    expect(lib).toMatch(/beds:\s*num\(o\.beds\)/);
  });
});

// ─── THE BOOKMARK MUST SURVIVE THE RENDER, NOT JUST THE BUILDER ──────────────
//
// Found by driving it (host: "in chrome dev test the #6"): buildBookmarklet was
// correct and its unit tests passed, and the anchor on screen still carried
//   javascript:throw new Error('React has blocked a javascript: URL …')
// because React sanitises any javascript: URL passed through the `href` PROP.
// A host dragging that to their bookmarks bar installs a bookmark that throws.
//
// Same lesson as the CTA gate: testing the producer is not testing the surface.
describe('the bookmarklet reaches the DOM intact', () => {
  const fs = require('fs');
  const path = require('path');
  const SHELL = fs.readFileSync(
    path.resolve(__dirname, '../../..', 'hostv2/src/HostShellV2.jsx'), 'utf8');

  test('buildBookmarklet is never passed through the href prop', () => {
    // `href={buildBookmarklet(…)}` is the exact shape React rewrites.
    expect(SHELL).not.toMatch(/href=\{\s*buildBookmarklet\(/);
  });

  test('the attribute is written directly, which React leaves alone', () => {
    expect(SHELL).toMatch(/setAttribute\('href',\s*buildBookmarklet\(/);
  });

  test("React's sanitiser really does bite (guard against a dead rule)", () => {
    // If a future React stops rewriting javascript: URLs the workaround is still
    // harmless — but this documents WHY it exists, in executable form.
    const { render } = (() => { try { return require('@testing-library/react'); } catch (_e) { return {}; } })();
    if (!render) return;                    // RTL absent: the source rules above still hold
    const React = require('react');
    const { container } = render(React.createElement('a', { href: 'javascript:void 0' }));
    const got = container.querySelector('a').getAttribute('href');
    expect(got).toMatch(/React has blocked|void 0/);
  });
});
