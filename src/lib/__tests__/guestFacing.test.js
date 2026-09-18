// ─── THE INVITE MAY NOT SHOW A GUEST OUR PLACEHOLDER ─────────────────────────
//
// Found live 2026-09-18. `draftParkingInstructions` brackets what the app does
// not know — correct, and the Unknown Rule working. The frozen CRA shell writes
// that template straight into `event.parkingNotes` with one tap and no review
// (App.js ~41406), and InviteV2.jsx:1320 — the invite guests actually read —
// prints the field verbatim. A guest can receive:
//
//   Parking: Guests can park [street / driveway / nearby lot — pick what fits].
//
// The generator is not the defect. The missing gate is.
import { unfilledBlanks, hasUnfilledBlanks, guestSafeText, blanksNotice } from '../guestFacing';
import { draftParkingInstructions } from '../doItForMe';

describe('our blanks are recognised', () => {
  test('the real parking template is caught — at home', () => {
    const body = draftParkingInstructions({ venueKind: 'home', venueCity: 'Decatur' });
    const text = typeof body === 'string' ? body : String((body && body.body) || '');
    expect(hasUnfilledBlanks(text)).toBe(true);
    expect(guestSafeText(text)).toBe('');
  });

  test('the real parking template is caught — a named venue', () => {
    const body = draftParkingInstructions({ venue: 'The Ironwood Room', venueCity: 'Santa Fe', venueState: 'NM' });
    const text = typeof body === 'string' ? body : String((body && body.body) || '');
    expect(hasUnfilledBlanks(text)).toBe(true);
  });

  test('a host who filled it in is shown to guests untouched', () => {
    const real = 'Park on Elm or in the driveway. Come round the side gate.';
    expect(hasUnfilledBlanks(real)).toBe(false);
    expect(guestSafeText(real)).toBe(real);
  });

  test('every blank is reported, in order', () => {
    const t = 'Park [here or there]. Enter via [the side gate].';
    expect(unfilledBlanks(t)).toEqual(['[here or there]', '[the side gate]']);
  });
});

describe('it does not fire on ordinary host prose', () => {
  // A gate that flags the host's own writing gets turned off, and then the real
  // leak comes back with it.
  test.each([
    ['plain text', 'Street parking is fine after 6pm.'],
    ['a short bracket', 'Ring unit [4] twice.'],
    ['brackets across lines', 'Park on Elm.\nCome to the [\nside gate.'],
    ['empty', ''],
    ['null', null],
  ])('%s', (_label, text) => {
    expect(hasUnfilledBlanks(text)).toBe(false);
  });

  test('a bracket longer than any of ours is left alone', () => {
    const long = '[' + 'x'.repeat(120) + ']';
    expect(hasUnfilledBlanks(long)).toBe(false);
  });
});

describe('it withholds rather than repairs', () => {
  // Stripping the brackets would leave "Guests can park ." — a sentence that
  // says something different and still wrong. Withholding says nothing.
  test('an unsafe string returns empty, never a cleaned version', () => {
    const t = 'Guests can park [street / driveway].';
    const out = guestSafeText(t);
    expect(out).toBe('');
    expect(out).not.toContain('Guests can park');
  });

  test('repeated calls agree — no lastIndex carryover from the /g regex', () => {
    // A /g regex carries lastIndex between .match/.test calls, which made an
    // earlier scanner in this repo alternate true/false down an assertion list.
    const t = 'Park [here].';
    for (let i = 0; i < 4; i += 1) expect(hasUnfilledBlanks(t)).toBe(true);
  });
});

describe('the host is told why their guests were not shown it', () => {
  // Silently dropping the line would leave the host believing guests were told.
  test('one blank is named', () => {
    const n = blanksNotice('Park [here or there].', 'parking note');
    expect(n).toContain('[here or there]');
    expect(n).toContain('parking note');
    expect(n).toContain('not being shown');
  });

  test('several are counted', () => {
    const n = blanksNotice('Park [a or b]. Enter [c or d].', 'parking note');
    expect(n).toContain('2 blanks');
  });

  test('clean text needs no notice', () => {
    expect(blanksNotice('Park on Elm.', 'parking note')).toBe(null);
  });
});

// ─── THE RATCHET: NO GUEST SURFACE PRINTS A RAW NOTE FIELD ───────────────────
// Four readers carried event.parkingNotes outward, and every one of them read
// it raw. A gate three of them use and the fourth does not is the shape this
// repo has hit all day — the venue verdict had eight copies.
describe('no guest-facing surface reads a note field raw', () => {
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.join(__dirname, '..', '..', '..');
  const strip = (f) => fs.readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  // The raw-read shape: the field coerced and trimmed straight into use.
  const RAW = /String\(\s*(ev|event)\.parkingNotes[^)]*\)\s*\.trim\(\)/;

  test.each([
    ['src/lib/doItForMe.js'],
    ['src/lib/weather.js'],
    ['src/lib/placeIntelligence.js'],
    ['hostv2/src/InviteV2.jsx'],
  ])('%s goes through the gate', (rel) => {
    const src = strip(path.join(ROOT, rel));
    expect(src).toMatch(/guestSafeText/);
    expect(src).not.toMatch(RAW);
  });

  test('canary: the scanner bites the shape it is meant to catch', () => {
    expect(RAW.test("const parking = String(ev.parkingNotes || '').trim();")).toBe(true);
    expect(RAW.test('const parking = guestSafeText(ev.parkingNotes);')).toBe(false);
  });

  test('a drafted-but-blank note is NOT reported handled', () => {
    const { derivePlaceIntelligence } = require('../placeIntelligence');
    const withTemplate = { venueKind: 'home', venueCity: 'Decatur',
      parkingNotes: 'Guests can park [street / driveway / nearby lot — pick what fits].' };
    const sec = (derivePlaceIntelligence(withTemplate).sections || []).find((x) => x.key === 'parking');
    expect(sec).toBeTruthy();
    expect(String(sec.state).toLowerCase()).not.toBe('handled');
  });

  test('a real host note IS reported handled', () => {
    const { derivePlaceIntelligence } = require('../placeIntelligence');
    const real = { venueKind: 'home', venueCity: 'Decatur', parkingNotes: 'Park on Elm, come to the side gate.' };
    const sec = (derivePlaceIntelligence(real).sections || []).find((x) => x.key === 'parking');
    expect(String(sec.state).toLowerCase()).toBe('handled');
  });
});
