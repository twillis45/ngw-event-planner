// ─── THE STREET THE HOST TYPED AT CREATION MUST REACH THE VENUE ──────────────
//
// Host report 2026-09-18, from a live seed: "Address from creation field not
// carrying to venue." Reproduced in the rendered app before any code changed —
// the host typed
//
//   "Watch the big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD.
//    For 5 people."
//
// the creation seam stored venueAddress:'8100 Ryan Way' correctly, and the plan
// STILL asked "Where is the event? Everything depends on venue: vendors,
// timeline, logistics, weather contingency." The fact was on the record and the
// app could not see it.
//
// Cause: venueFor computed `address` and then never consulted it for `isSet`,
// which read `isHome ? (city || name) : name`. A host who gives a street but
// never names a venue — the normal case for a house party — had no venue at all
// as far as every consumer of the one venue reader was concerned.
//
// The same seed carried a SECOND defect, guarded below: "Big game" without the
// article routed to Day Party, because the sports pattern required `the big
// game`. Both are in this file because one host sentence found both, and a
// regression in either one puts the same host back where she started.
import { venueFor } from '../venueFor';
import { parseSmartEventText } from '../smartParseEvent';
import { resolveCanonicalType } from '../eventTaxonomy.mjs';

const SEED = 'Watch the big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people.';

describe('a street address is a location', () => {
  test('the exact event the creation seam writes from the seed reads as SET', () => {
    const p = parseSmartEventText(SEED);
    // Mirrors HostShellV2 ~6400-6430: venue name only if parsed, address always.
    const ev = {
      type: p.type, venue: p.venue || '', venueAddress: p.venueAddress,
      venueCity: p.venueCity, venueState: p.venueState,
    };
    expect(ev.venueAddress).toBe('8100 Ryan Way');
    expect(ev.venue).toBe('');                       // the premise: no venue NAME
    const v = venueFor(ev);
    expect(v.isSet).toBe(true);                      // was false — the defect
    expect(v.address).toBe('8100 Ryan Way');
    expect(v.displayLine).toContain('8100 Ryan Way');
  });

  test('address alone sets a named-venue event', () => {
    const v = venueFor({ venueKind: 'venue', venueAddress: '12 Elm St' });
    expect(v.isSet).toBe(true);
    expect(v.displayLine).toBe('12 Elm St');
  });

  test('address alone sets an at-home event with no city', () => {
    expect(venueFor({ venueKind: 'home', venueAddress: '12 Elm St' }).isSet).toBe(true);
  });

  // THE GUARD THAT KEEPS THE 2026-08-14 BOARD RULING INTACT. A town and an
  // address answer different questions and regress independently; this fix must
  // not quietly promote a town into an address. `address` is street-gated, so a
  // city/state pair can never produce one.
  test('a bare city still does NOT set a named-venue event', () => {
    expect(venueFor({ venueKind: 'venue', venueCity: 'Decatur' }).isSet).toBe(false);
    expect(venueFor({ venueKind: 'venue', venueCity: 'Decatur', venueState: 'GA' }).isSet).toBe(false);
    expect(venueFor({ venueKind: 'venue', venueCity: 'Decatur', venueState: 'GA' }).address).toBe('');
  });

  test('a named venue is unchanged — the name still leads the display line', () => {
    const v = venueFor({ venue: 'VFW Post 3150', venueCity: 'Alexandria', venueState: 'VA' });
    expect(v.isSet).toBe(true);
    expect(v.displayLine).toBe('VFW Post 3150, Alexandria');
  });

  test('at-home with a city is unchanged — still "At home in", not an address', () => {
    expect(venueFor({ venueKind: 'home', venueCity: 'Decatur' }).displayLine).toBe('At home in Decatur');
  });

  test('an empty event is still not set', () => {
    expect(venueFor({}).isSet).toBe(false);
    expect(venueFor({ venueKind: 'venue' }).isSet).toBe(false);
  });
});

describe('"big game" routes to Watch Party with or without the article', () => {
  test.each([
    ['the host seed, no article', 'Big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people.'],
    ['with the article',          'The big game this Sunday for 12'],
    ['mid-sentence',              'Watching the big game Sunday'],
  ])('%s', (_label, text) => {
    expect(parseSmartEventText(text).type).toBe('Watch Party');
  });

  test('big game HUNTING is not a watch party', () => {
    expect(resolveCanonicalType('big game hunting trip')).not.toBe('Watch Party');
  });

  test('the address guard still holds on the no-article seed', () => {
    const p = parseSmartEventText('Big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people.');
    expect(p.venueAddress).toBe('8100 Ryan Way');
    expect(p.startTime).toBe('1:00 PM');
    expect(p.venueCity).toBe('Greenbelt');
  });
});

// ─── THE BLOCKER SURFACE MUST READ THE SAME FACT ─────────────────────────────
// Fixing venueFor was necessary and NOT sufficient: assembleRevealEngines kept
// a private `!!vf.name` copy of the rule, so the plan still asked "Where is the
// event?" over an event that had a street on file. This is the regression guard
// for the surface, not just the reader.
describe('the venue blocker respects an address', () => {
  const { deriveDecisionBlockers } = require('../assembleRevealEngines');

  const types = (ev) => (deriveDecisionBlockers(
    { id: 'e1', type: 'Watch Party', date: '2026-12-01', guestMode: 'count', guestCount: 12, ...ev },
    null,
  ) || []).map((b) => b.type);

  test('a street address clears the venue blocker', () => {
    expect(types({ venueKind: 'venue', venueAddress: '8100 Ryan Way', venueCity: 'Greenbelt', venueState: 'MD' }))
      .not.toContain('venue-selection');
  });

  test('nothing on file still raises it', () => {
    expect(types({ venueKind: 'venue' })).toContain('venue-selection');
  });

  test('a bare city still raises it — the 2026-08-14 ruling holds at the surface too', () => {
    expect(types({ venueKind: 'venue', venueCity: 'Greenbelt', venueState: 'MD' }))
      .toContain('venue-selection');
  });

  test('a named venue still clears it, as before', () => {
    expect(types({ venueKind: 'venue', venue: 'VFW Post 3150' })).not.toContain('venue-selection');
  });
});

// ─── NO SURFACE MAY RE-DERIVE THE VERDICT ────────────────────────────────────
// Four private copies of "is the venue set?" were found by one host sentence.
// Three were `!!vf.name`; the fourth (HostShellV2's "Where is it happening?"
// card) was HIDDEN by the third, so fixing the blocker un-suppressed it and the
// host went on being asked over a plan that knew the street.
//
// PART A of venueSourceProof ratchets raw `event.venue*` reads to zero. It
// cannot see this class: these all read THROUGH venueFor and then recomputed
// the rule. This is the ratchet for the verdict.
describe('no surface re-derives "is the venue set?"', () => {
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.join(__dirname, '..', '..', '..');

  // WHICH VARIABLES ACTUALLY HOLD A VENUE, resolved per file rather than
  // guessed from the name. The first version matched any `v.name` and fired on
  // `event.vendors.filter(v => v && v.name ...)` — a VENDOR. A ratchet with a
  // false positive gets weakened or deleted, so it has to be precise about the
  // thing it guards.
  //
  // NO `g` FLAG on the matcher: a /g/ regex carries `lastIndex` between
  // `.test()` calls, so the first canary returned true, false, true, false down
  // the assertion list and "failed" on a line it matches perfectly well.
  const venueVars = (src) => {
    const names = new Set();
    for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*venueFor\s*\(/g)) names.add(m[1]);
    return names;
  };
  // NEGATION ONLY — `!vf.name` / `!!vf.name`. Both real defects took this
  // shape, and it is the shape that means "decide whether the venue is
  // unanswered". The `&&` and `?` forms are deliberately NOT flagged: they are
  // usually legitimate (`vf.name ? ` · ${vf.name}` : ''` is a display
  // fallback; `vf.name && isHomeish(vf.name)` genuinely wants the NAME, not the
  // verdict). A ratchet that fires on correct code gets weakened or deleted, so
  // this one is narrow on purpose and says so rather than pretending to total
  // coverage.
  const boolUse = (v) => new RegExp(`!\\s*!?\\s*\\b${v}\\.name\\b`);

  const FILES = [
    'src/lib/assembleRevealEngines.js',
    'src/lib/taskEngine.js',
    'src/lib/locationAssist.js',
    'hostv2/src/HostShellV2.jsx',
  ];

  test.each(FILES)('%s asks venueFor for the verdict, not its own', (rel) => {
    // Block comments stripped too (JSX `{/* … */}`), space-filled so line
    // numbers survive — otherwise this file's own explanatory comments, which
    // necessarily QUOTE the banned shape, trip the scanner that reads them.
    const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    const vars = [...venueVars(raw)];
    expect(vars.length).toBeGreaterThan(0);           // premise: the file reads venueFor at all
    const res = vars.map(boolUse);
    const hits = src.split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => !l.includes('venue-verdict-exempt:') && res.some((re) => re.test(l)))
      .map(([n, l]) => `${rel}:${n}  ${l.trim().slice(0, 90)}`);
    expect(hits).toEqual([]);
  });

  test('canary: bites the verdict shape, spares vendors and string reads', () => {
    const bite = boolUse('vf');
    expect(bite.test('if (!vf.name && !shown) {')).toBe(true);
    expect(bite.test('const r = vf.isHome ? x : !!vf.name;')).toBe(true);
    expect(bite.test('const r = vf.isHome ? x : vf.isSet;')).toBe(false);
    expect(bite.test("{vf.name ? ` · ${vf.name}` : ''}")).toBe(false);   // display, not verdict
    expect(bite.test('venue: venueFor(e).name,')).toBe(false);       // legitimate string read
    expect(bite.test('vendors.filter(v => v && v.name && x)')).toBe(false);  // a VENDOR, not a venue
    expect([...venueVars('const vf = venueFor(event);')]).toEqual(['vf']);
    expect([...venueVars('const v = venueFor(ev);')]).toEqual(['v']);
    expect([...venueVars('const v = other(ev);')]).toEqual([]);
  });
});
