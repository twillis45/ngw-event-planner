// VENUE SOURCE PROOF — host directive 2026-07-27: "all venue fields tokenized
// and reading from same." The one reader is src/lib/venueFor.js; every raw
// `event.venue*` read outside it is a fork waiting to lie (the parking fork
// hid every host's parking note from remote guests; three engines hand-copied
// the at-home rule; phantom fields shipped in the public API).
//
// This is a RATCHET, not a wall (mirrors KNOWN_DEAD_EFFECTS / policyFork
// discipline): the baseline below records today's grandfathered raw-read count
// per file. New raw reads FAIL (the count may only go down); when you migrate
// a file, tighten its number here — that's the point.
//
// Out of scope, documented: src/App.js and the legacy CRA surfaces are frozen
// (A1) — their raw reads retire with the CRA, not by migration. eventGeoQuery,
// cityText, and legacyCopy are SANCTIONED (they ARE gates/one-time healers).
// PART B pins the runtime agreements the fork used to break, PART C pins
// the Python whitelist against the phantom-field class, and PART D ratchets the
// SECOND fork class — surfaces that read venueFor correctly and then recompute
// the verdict from its fields.

import fs from 'fs';
import path from 'path';
import { venueFor } from '../lib/venueFor';
import { derivePlaceIntelligence } from '../lib/placeIntelligence';
import { eventLocationStatus } from '../lib/locationAssist';
import { deriveEventPhaseProgress } from '../lib/phaseProgress';
import { deriveDecisionBlockers } from '../lib/assembleRevealEngines';

const DEMO = path.join(__dirname, '..', '..');
const RAW_READ = /\b(?:event|ev|e)\.(?:venue|venueCity|venueState|venueAddress|venueKind)\b/g;

const SANCTIONED = new Set([
  'src/lib/venueFor.js',      // the accessor owns raw reads
  'src/lib/eventGeoQuery.js', // the geo half (absorb later)
  'src/lib/cityText.js',      // the gates
  'src/lib/legacyCopy.js',    // one-time heal writer
]);

// Grandfathered raw-read counts as of 2026-07-27 (post wave-1/3 migration).
// A file may only SHRINK here. Adding a raw read anywhere fails this test —
// read venueFor(event) instead, or (rare, justified) add a `// venue-exempt:`
// note on the line and explain it in review.
const BASELINE = {
  'src/lib/doItForMe.js': 0,
  'src/lib/weather.js': 0,
  'src/lib/assembleRevealEngines.js': 0,
  'src/lib/startTime.js': 0,
  'src/lib/webhookService.js': 0,
  'src/lib/vendorBrief.js': 0,
  'src/lib/taskEngine.js': 0,
  'src/lib/playbooks/index.js': 0,
  'src/lib/placeIntelligence.js': 0,
  'src/lib/eventSolve.mjs': 0,
  'hostv2/src/HostShellV2.jsx': 0,
  'hostv2/src/InviteV2.jsx': 0,
};

const walk = (dir, out = []) => {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '__tests__' || name.startsWith('.')) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
};

const countRawReads = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const line of src.split('\n')) {
    if (line.includes('venue-exempt:')) continue;
    n += (line.match(RAW_READ) || []).length;
  }
  return n;
};

describe('PART A — raw venue reads may only shrink', () => {
  const files = [...walk(path.join(DEMO, 'src', 'lib')), ...walk(path.join(DEMO, 'hostv2', 'src'))];
  test('no file exceeds its grandfathered count; no new file joins', () => {
    const violations = [];
    for (const f of files) {
      const rel = path.relative(DEMO, f).split(path.sep).join('/');
      if (SANCTIONED.has(rel)) continue;
      const n = countRawReads(f);
      const cap = BASELINE[rel] || 0;
      if (n > cap) violations.push(`${rel}: ${n} raw venue reads (baseline ${cap}) — read venueFor(event) instead`);
    }
    expect(violations).toEqual([]);
  });
  test('canary: the scanner bites a planted raw read and spares the accessor form', () => {
    expect(('x = event.venueCity'.match(RAW_READ) || []).length).toBe(1);
    expect(('x = venueFor(ev).city'.match(RAW_READ) || []).length).toBe(0);
  });
  test('sanctioned modules really contain raw reads (exclusions stay load-bearing)', () => {
    expect(countRawReads(path.join(DEMO, 'src/lib/venueFor.js'))).toBeGreaterThan(0);
    expect(countRawReads(path.join(DEMO, 'src/lib/eventGeoQuery.js'))).toBeGreaterThan(0);
  });
});

describe('PART B — the at-home rule agrees everywhere (the fork the audit found)', () => {
  const homeWithCity = { venueKind: 'home', venueCity: 'Decatur' };
  const venueNoCity = { venueKind: 'venue', venue: 'VFW Post 3150' };
  test('home-with-city: set for every reader', () => {
    expect(venueFor(homeWithCity).isSet).toBe(true);
    expect(derivePlaceIntelligence(homeWithCity).sections.find(s => s.key === 'venue').state).not.toBe('needs');
    expect(eventLocationStatus(homeWithCity)).toBe('city_only');
  });
  test('named venue without city: set, and no city demanded', () => {
    expect(venueFor(venueNoCity).isSet).toBe(true);
    expect(venueFor(venueNoCity).needsCityForWeather).toBe(false);
    expect(derivePlaceIntelligence(venueNoCity).sections.find(s => s.key === 'venue').state).not.toBe('needs');
  });
  test('polluted venueCity cannot fake a resolved home venue', () => {
    const polluted = { venueKind: 'home', venueCity: 'VFW Post 3150 — Alexandria, VA' };
    expect(venueFor(polluted).needsCityForWeather).toBe(true);
  });
});

// ─── PART B2 — THE ADDRESS-ONLY EVENT ────────────────────────────────────────
// PART B shipped with three fixtures — home+city, venue+name, polluted city —
// and NO case where the host gave a STREET and never named a venue. That hole
// is why the 2026-09-18 defect got through with every ratchet green: venueFor
// computed `address` and then read `isSet` off name/city alone, so a real seed
// ("Watch the big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD")
// stored the street correctly and the plan still asked "Where is the event?".
//
// A street address with no venue name is the NORMAL shape of a house party, not
// an edge case. These fixtures pin it across every reader at once.
//
// phaseProgress is added as a fourth reader here because it carries the board's
// PRODUCTION layer (`venueaddress`) — the fact the 2026-08-14 ruling split out,
// and the one a permissive address rule would silently satisfy.
describe('PART B2 — an address with no venue name agrees everywhere', () => {
  const ADDR = '8100 Ryan Way';
  const phase = (ev) => {
    const items = (deriveEventPhaseProgress(
      { id: 'e1', type: 'Watch Party', date: '2026-12-01', guestMode: 'count', guestCount: 12, ...ev },
      new Date('2026-09-18'),
    ) || {}).items || [];
    const pick = (id) => (items.find((i) => i.id === id) || {}).handled;
    return { location: pick('location'), venueaddress: pick('venueaddress') };
  };
  const placeState = (ev) => derivePlaceIntelligence(ev).sections.find((s) => s.key === 'venue').state;

  // The three address-only shapes, and what every reader must say about them.
  const CASES = [
    ['address, no name, venue kind', { venueKind: 'venue', venueAddress: ADDR }],
    ['address, no name, home kind', { venueKind: 'home', venueAddress: ADDR }],
    ['address + city', { venueKind: 'venue', venueAddress: ADDR, venueCity: 'Greenbelt', venueState: 'MD' }],
  ];

  test.each(CASES)('%s — every reader calls it set', (_label, ev) => {
    const v = venueFor(ev);
    expect(v.isSet).toBe(true);
    expect(v.address).toBe(ADDR);
    expect(v.name).toBe('');                 // the premise: there is no venue NAME
    expect(v.displayLine).toContain(ADDR);   // the street is the most specific thing known
    expect(v.mapsQuery).toBe(ADDR);          // and it is what a map should be sent
    // The other three readers, asked the same question in their own vocabulary.
    expect(eventLocationStatus(ev)).toBe('full_address');
    expect(placeState(ev)).not.toBe('needs');
    expect(phase(ev)).toEqual({ location: true, venueaddress: true });
  });

  // THE 2026-08-14 BOARD RULING, RE-ASSERTED AGAINST THE NEW FIXTURES.
  // docs/audits/2026-08-14_VENUE_READER_BOARD_RULING.md — a town and an address
  // answer different questions, unlock different layers, and regress
  // independently. Teaching the readers that a street is a location must not
  // promote a TOWN into one. `address` is street-gated inside venueFor, so this
  // is the assertion that keeps that gate load-bearing.
  test('a bare city still satisfies NO address/production reader', () => {
    const city = { venueKind: 'venue', venueCity: 'Greenbelt', venueState: 'MD' };
    expect(venueFor(city).isSet).toBe(false);
    expect(venueFor(city).address).toBe('');
    expect(eventLocationStatus(city)).toBe('city_only');   // NOT full_address
    expect(placeState(city)).toBe('needs');
    // The travel layer opens on a town; the production layer does not.
    expect(phase(city)).toEqual({ location: true, venueaddress: false });
  });

  test('an at-home town is the same ruling: travel layer yes, production layer no', () => {
    const home = { venueKind: 'home', venueCity: 'Decatur' };
    expect(venueFor(home).isSet).toBe(true);               // set — the at-home carve-out
    expect(venueFor(home).address).toBe('');               // but there is still no address
    expect(phase(home)).toEqual({ location: true, venueaddress: false });
  });

  // THE SECOND QUESTION, kept distinct from isSet on purpose: an at-home event
  // can be fully set by its street and STILL owe a city, because there is no
  // reverse geocoder — weather cannot be fetched from a street line alone.
  test('an address does not invent a city for weather', () => {
    expect(venueFor({ venueKind: 'home', venueAddress: ADDR }).needsCityForWeather).toBe(true);
    expect(venueFor({ venueKind: 'home', venueAddress: ADDR, venueCity: 'Greenbelt' }).needsCityForWeather).toBe(false);
  });

  // ── A DISAGREEMENT, RECORDED RATHER THAN QUIETLY FIXED ────────────────────
  // Measured 2026-09-18 while adding the fixtures above. deriveDecisionBlockers
  // gates the venue blocker on `vf.isHome ? !vf.needsCityForWeather : vf.isSet`
  // (assembleRevealEngines.js:141). For an AT-HOME event holding a street and no
  // city, that reads false and raises `venue-selection` — the "Where is the
  // event? Everything depends on venue" ask — over an event whose street is on
  // file and which the other four readers all call resolved.
  //
  // It is not obviously wrong: the home branch is deliberately asking the CITY
  // question (documented at that line), and weather genuinely needs a city.
  // But it routes that ask through a blocker whose copy claims the venue is
  // unknown, which is the same conflation the 2026-08-14 split exists to end.
  // Pinned as MEASURED BEHAVIOUR, not as a blessing — a change here should fail
  // this test and be ruled on, not slip through.
  const blockerTypes = (ev) => (deriveDecisionBlockers(
    { id: 'e1', type: 'Watch Party', date: '2026-12-01', guestMode: 'count', guestCount: 12, ...ev },
    null,
  ) || []).map((b) => b.type);

  test('venue-kind address-only clears the blocker; at-home address-only does NOT (open disagreement)', () => {
    expect(blockerTypes({ venueKind: 'venue', venueAddress: ADDR })).not.toContain('venue-selection');
    // ↓ the disagreement. Every other reader above says this event's venue is set.
    expect(blockerTypes({ venueKind: 'home', venueAddress: ADDR })).toContain('venue-selection');
    // Adding the city settles it, which is what identifies the city — not the
    // address — as what that branch is actually asking for.
    expect(blockerTypes({ venueKind: 'home', venueAddress: ADDR, venueCity: 'Greenbelt' }))
      .not.toContain('venue-selection');
  });
});

describe('PART C — Python whitelist parity (the phantom-field class)', () => {
  const py = fs.readFileSync(path.join(DEMO, 'backend', 'app', 'routers', 'rsvp.py'), 'utf8');
  test('parkingNotes (the field hosts write) is whitelisted', () => {
    expect(py).toMatch(/"parkingNotes"/);
  });
  test('endDate is whitelisted (span display remote)', () => {
    expect(py).toMatch(/"endDate"/);
  });
});

// ─── PART D — NO SURFACE MAY RE-DERIVE THE VERDICT ───────────────────────────
//
// PART A drives raw `event.venue*` reads to zero. It CANNOT see this class, and
// on 2026-09-18 that gap shipped a bug with the whole ratchet green: one host
// sentence exposed SIX places that each kept a private copy of "is the venue
// set?". Five of them read THROUGH venueFor correctly — and then recomputed the
// rule as `!!vf.name` / `!vf.name`. Zero raw reads. Fixing venueFor reached one
// of them; a host with venueAddress "8100 Ryan Way" and no venue NAME went on
// being told "Add the location".
//
// A narrower version of this lived in src/lib/__tests__/creationAddressCarries
// over a hand-listed set of four files. It is here now, over the whole tree, so
// the venue rules live in ONE file and a new surface cannot join unnoticed.
//
// WHAT IT SCANS: every .js/.jsx/.mjs under src/lib and hostv2/src (the same walk
// PART A uses — __tests__, node_modules, dist and *.test.* excluded).
//
// WHAT IT DELIBERATELY DOES NOT DO, and why each line is a choice:
//  · NEGATION SHAPES ONLY. `vf.name ?` and `vf.name &&` are NOT flagged: they
//    are usually correct (`vf.name ? ` · ${vf.name}` : ''` is a display
//    fallback; `vf.name && isHomeish(vf.name)` genuinely wants the NAME, not the
//    verdict). A ratchet that fires on correct code gets weakened or deleted, so
//    this one is narrow on purpose and says so instead of claiming total cover.
//  · IT DOES NOT GUESS which variables hold a venue. It resolves them per file
//    from actual `= venueFor(` bindings. The first draft matched any `v.name`
//    and fired on `event.vendors.filter(v => v && v.name …)` — a VENDOR.
//  · IT DOES NOT SEE cross-file or cross-function laundering (a verdict
//    recomputed from a venueFor result passed in as a parameter, or stashed on
//    an object field). Single-assignment, same-file only.
//  · IT DOES NOT READ App.js or any CRA surface — frozen under A1, same as
//    PART A's scope.
describe('PART D — the venue VERDICT has one source too', () => {
  // Files whose verdict re-derivations are GRANDFATHERED, with the count and the
  // reason. Same contract as PART A's BASELINE: a number may only SHRINK, and a
  // file not listed here must be at zero. `// venue-verdict-exempt:` on a single
  // line is the per-line escape, and owes an explanation in review.
  const VERDICT_BASELINE = {
    // `!(v.address || v.name)` — the lodging spend guard. It is asking the
    // board's ADDRESS question ("is the address unsigned?"), not the isSet
    // question, and venueFor exposes no `addressSettled` for it to read. Correct
    // by intent, still a private copy: recorded so it cannot multiply, and so
    // the day venueFor grows that field this number goes to zero.
    'hostv2/src/LodgingCockpit.jsx': 1,
  };

  // Files that MUST still yield a resolved venue variable. Not the scan scope —
  // the walk above is — but a liveness check on the resolver: if the binding
  // regex ever regresses, every file silently resolves to zero variables, every
  // file "passes", and this ratchet becomes decoration. These fail loudly first.
  const MUST_RESOLVE = {
    'src/lib/assembleRevealEngines.js': 'vf',
    'src/lib/placeIntelligence.js': 'vf',
    'src/lib/locationAssist.js': 'v',
    'src/lib/taskEngine.js': 'v',
    'hostv2/src/HostShellV2.jsx': 'vf',
    'hostv2/src/LodgingCockpit.jsx': 'vf',   // `let vf = {}; try { vf = venueFor(event) …`
  };

  // COMMENTS ARE STRIPPED BEFORE SCANNING. Block comments (including JSX
  // `{/* … */}`) are space-filled so line numbers survive; line comments are
  // truncated. Without this the scanner trips over the repo's own explanatory
  // prose, which necessarily QUOTES the banned shape — including the comment
  // you are reading, if this file were ever in scope.
  const strip = (raw) => raw
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  // WHICH LOCALS ACTUALLY HOLD A venueFor() RESULT, resolved per file. Covers
  // `const/let/var x = venueFor(` AND bare reassignment (`let vf = {}; try { vf =
  // venueFor(event) || {}; }` — LodgingCockpit's real shape, which a
  // declaration-only regex misses).
  //
  // matchAll is used rather than `.test()` in a loop: matchAll works on a fresh
  // internal clone, so no `lastIndex` carries between calls. A /g regex driven
  // by `.test()` alternates true/false down a list of lines that all match —
  // that already bit this ratchet once.
  const BIND = /(?:^|[;{}(,=&|?:]|\b(?:const|let|var)\b)\s*([A-Za-z_$][\w$]*)\s*=\s*venueFor\s*\(/gm;
  const venueVars = (src) => {
    const names = new Set();
    for (const m of src.matchAll(BIND)) {
      const name = m[1];
      const from = src.lastIndexOf('\n', m.index) + 1;
      const to = src.indexOf('\n', m.index);
      const line = src.slice(from, to < 0 ? src.length : to);
      // `const v = venueFor(event).name;` binds a STRING, not a venue. Excluded,
      // or a later unrelated `!v.name` in the same file would be a false hit.
      if (new RegExp(`\\b${name}\\s*=\\s*venueFor\\s*\\([^)]*\\)\\s*\\.`).test(line)) continue;
      names.add(name);
    }
    return names;
  };

  // The banned shapes, built per resolved variable. Non-global on purpose (see
  // above). Two forms, both real:
  //   `!vf.name` / `!!vf.name`            — the five copies found on 2026-09-18
  //   `!(vf.name || vf.address)`          — the same verdict, spelled out
  const shapesFor = (v) => [
    new RegExp(`!\\s*!?\\s*\\b${v}\\.name\\b`),
    new RegExp(`!\\s*\\(\\s*\\b${v}\\.(?:name|address)\\b\\s*\\|\\|\\s*\\b${v}\\.(?:name|address)\\b\\s*\\)`),
  ];
  // The same verdict without a local at all: `!venueFor(ev).name`.
  const INLINE = /!\s*!?\s*\(?\s*venueFor\s*\([^)]*\)\s*\)?\s*\.name\b/;

  const scan = (file) => {
    const src = strip(fs.readFileSync(file, 'utf8'));
    const vars = [...venueVars(src)];
    const res = vars.flatMap(shapesFor).concat([INLINE]);
    const hits = [];
    src.split('\n').forEach((line, i) => {
      if (line.includes('venue-verdict-exempt:')) return;
      if (res.some((re) => re.test(line))) hits.push(`${i + 1}  ${line.trim().slice(0, 100)}`);
    });
    return { vars, hits };
  };

  // Same scope as PART A, and only files that touch venueFor at all.
  const scanned = [...walk(path.join(DEMO, 'src', 'lib')), ...walk(path.join(DEMO, 'hostv2', 'src'))]
    .map((f) => [path.relative(DEMO, f).split(path.sep).join('/'), f])
    .filter(([, f]) => /venueFor\s*\(/.test(fs.readFileSync(f, 'utf8')));

  test('every venueFor consumer asks it for the verdict, not its own', () => {
    const violations = [];
    for (const [rel, f] of scanned) {
      const { hits } = scan(f);
      const cap = VERDICT_BASELINE[rel] || 0;
      if (hits.length > cap) {
        violations.push(`${rel}: ${hits.length} re-derived venue verdicts (baseline ${cap}) — `
          + `read vf.isSet instead\n    ${hits.join('\n    ')}`);
      }
    }
    expect(violations).toEqual([]);
  });

  test('the scan reaches the surfaces that carried the six copies', () => {
    const rels = scanned.map(([rel]) => rel);
    for (const rel of Object.keys(MUST_RESOLVE)) expect(rels).toContain(rel);
    // Plus everything the baseline names — a baseline entry for a file that is
    // no longer scanned is a hole that reads as a pass.
    for (const rel of Object.keys(VERDICT_BASELINE)) expect(rels).toContain(rel);
  });

  test('the variable resolver still resolves (a dead regex would pass everything)', () => {
    for (const [rel, expected] of Object.entries(MUST_RESOLVE)) {
      const { vars } = scan(path.join(DEMO, rel));
      expect([rel, vars]).toEqual([rel, expect.arrayContaining([expected])]);
    }
  });

  test('every baselined file really still contains its re-derivation', () => {
    for (const [rel, cap] of Object.entries(VERDICT_BASELINE)) {
      expect([rel, scan(path.join(DEMO, rel)).hits.length]).toEqual([rel, cap]);
    }
  });

  test('canary: bites the verdict shapes, spares display reads and vendors', () => {
    const bites = (line, v = 'vf') => shapesFor(v).some((re) => re.test(line)) || INLINE.test(line);
    // BITES — the shapes that mean "decide whether the venue is unanswered".
    expect(bites('if (!vf.name && !shown) {')).toBe(true);
    expect(bites('const r = vf.isHome ? x : !!vf.name;')).toBe(true);
    expect(bites('return !(vf.address || vf.name);')).toBe(true);
    expect(bites('return !(vf.name || vf.address);')).toBe(true);
    expect(bites('if (!venueFor(event).name) ask();')).toBe(true);
    // SPARES — correct code. Every one of these ships today.
    expect(bites('const r = vf.isHome ? x : vf.isSet;')).toBe(false);
    expect(bites("{vf.name ? ` · ${vf.name}` : ''}")).toBe(false);       // display fallback
    expect(bites('vf.name && isHomeish(vf.name)')).toBe(false);          // wants the NAME
    expect(bites('venue: venueFor(e).name,')).toBe(false);               // string read
    expect(bites('vendors.filter(v => v && v.name && x)', 'vf')).toBe(false); // a VENDOR
    expect(bites('if (!vf.needsCityForWeather) {')).toBe(false);         // the other question
    // The resolver: declarations, bare reassignment, and what is NOT a venue.
    expect([...venueVars('const vf = venueFor(event);')]).toEqual(['vf']);
    expect([...venueVars('const v = venueFor(ev);')]).toEqual(['v']);
    expect([...venueVars('let vf = {}; try { vf = venueFor(event) || {}; } catch {}')]).toEqual(['vf']);
    expect([...venueVars('const v = other(ev);')]).toEqual([]);
    expect([...venueVars('const v = venueFor(event).name;')]).toEqual([]); // a string, not a venue
    // Comment stripping — the repo's own prose quotes the banned shape.
    expect(strip('/* !vf.name */ ok').includes('!vf.name')).toBe(false);
    expect(strip('ok // !vf.name').includes('!vf.name')).toBe(false);
    expect(strip('/* a\nb */').split('\n').length).toBe(2);               // line numbers survive
  });
});
