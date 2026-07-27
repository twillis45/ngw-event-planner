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
// PART B pins the runtime agreements the fork used to break, and PART C pins
// the Python whitelist against the phantom-field class.

import fs from 'fs';
import path from 'path';
import { venueFor } from '../lib/venueFor';
import { derivePlaceIntelligence } from '../lib/placeIntelligence';
import { eventLocationStatus } from '../lib/locationAssist';

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
  'src/lib/doItForMe.js': 7,
  'src/lib/weather.js': 4,
  'src/lib/assembleRevealEngines.js': 3,
  'src/lib/startTime.js': 2,
  'src/lib/webhookService.js': 1,
  'src/lib/vendorBrief.js': 1,
  'src/lib/taskEngine.js': 1,
  'src/lib/playbooks/index.js': 1,
  'src/lib/placeIntelligence.js': 1,
  'src/lib/eventSolve.mjs': 3,
  'hostv2/src/HostShellV2.jsx': 54,
  'hostv2/src/InviteV2.jsx': 10,
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

describe('PART C — Python whitelist parity (the phantom-field class)', () => {
  const py = fs.readFileSync(path.join(DEMO, 'backend', 'app', 'routers', 'rsvp.py'), 'utf8');
  test('parkingNotes (the field hosts write) is whitelisted', () => {
    expect(py).toMatch(/"parkingNotes"/);
  });
  test('endDate is whitelisted (span display remote)', () => {
    expect(py).toMatch(/"endDate"/);
  });
});
