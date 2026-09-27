// ─── A ROSTER ROW IS NOT A PERSON, AND CERTAINLY NOT A PLATE ──────────────
//
// The demo event's hero read, verbatim:
//
//   "The caterer is set for 60, but 5 guests have said yes. Until those
//    match, seating, meal counts, and the day's timing are all working from
//    the wrong number."
//
// The 60 is right. The 5 is wrong. `catererCount` counts PLATES — the
// fixture's own catering note says "Plated dinner for 60 + 2 vegetarian/GF
// counts" — and the 5 was `guests.filter(rsvp === 'Yes').length`, a count of
// ROWS. The canonical reader disagrees: attendanceBand returns
// {confirmed: 5, kids: 2, low: 7}, and the row driving that difference asks
// in its own notes for "Two kids' meals (ages 6, 9)".
//
// ── THIS IS THE FOURTH INSTANCE OF A DOCUMENTED PATTERN ───────────────────
//
// WHERE_WE_ARE records "One field, two meanings, is this repo's recurring
// defect" with three instances from 2026-08-06. The rule was then settled
// twice more, in engines HostShellV2 imports:
//
//   playbooks/index.js  attendanceBand   "a filled plusOne is a real adult
//                                         riding this row's answer"
//   crabPlan.js         rosterHeadcount  "10 adults each bringing 3 kids
//                                         read as 10 heads"
//   seatingPlan.js      seatsFor         the same fix, for chairs
//
// The caterer was the one consumer nobody had applied it to.
//
// ── AND THE WRITE WAS WORSE THAN THE DISPLAY ──────────────────────────────
//
// `countResolutionRows` offered the host a button reading "Match confirmed
// yeses (N)" which PATCHED that row count straight into `catererCount`. A
// host following the app's own suggestion would have told her caterer 5 and
// left two children without a meal. A wrong number on a screen is a bug; a
// wrong number the app writes into the plan is a different thing.
//
// ── WHY THIS IS A SOURCE GATE ─────────────────────────────────────────────
//
// jest cannot execute hostv2 — a standing fact in this repo, and the reason
// three defects reached a commit on 2026-09-25. So this reads the source. It
// is a weaker instrument than a drive and it is the strongest one available
// here; the behaviour itself belongs in e2e.
import fs from 'fs';
import path from 'path';

const SHELL = path.resolve(__dirname, '../../..', 'hostv2/src/HostShellV2.jsx');
const src = fs.readFileSync(SHELL, 'utf8');
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/[^\n]*/g, '$1');
const code = stripComments(src);

describe('the caterer is told covers, not rows', () => {
  test('THE WRITE: no row count is ever patched into catererCount', () => {
    // The dangerous one. Every catererCount write must carry a value derived
    // from the canonical head count, never a .filter(...).length off guests.
    const writes = [...code.matchAll(/patchEvent\(\{\s*catererCount:\s*([A-Za-z0-9_.]+)/g)]
      .map((m) => m[1]);
    expect(writes.length).toBeGreaterThan(0);          // premise: writes exist
    for (const v of writes) {
      expect({ [v]: /rsvp|filter|length/.test(v) }).toEqual({ [v]: false });
    }
  });

  test('no row count is COMPARED to the caterer', () => {
    // The property, stated precisely. The first version of this asserted that
    // no row-count binding exists anywhere, and it failed on `yesN` — which
    // is paired with `invitedN` and is rows against rows, the case the gate
    // below exists to protect. "No row counts" is the wrong rule; "no row
    // count reaches the caterer" is the right one.
    const rowCounts = [...code.matchAll(
      /const\s+(\w+)\s*=\s*\([^)]*guests[^)]*\)\s*\.filter\([^)]*rsvp[^)]*\)\s*\.length/g,
    )].map((m) => m[1]);
    const guilty = [];
    for (const name of rowCounts) {
      // Any use of that binding within sight of catererCount is the defect.
      const re = new RegExp(`catererCount[\\s\\S]{0,240}?\\b${name}\\b|\\b${name}\\b[\\s\\S]{0,240}?catererCount`);
      if (re.test(code)) guilty.push(name);
    }
    expect(guilty).toEqual([]);
  });

  test('the shell DELEGATES the count rather than deriving one', () => {
    // This test used to assert that confirmedHeads called attendanceBand
    // INLINE, and it broke the moment the derivation moved into
    // lib/confirmedCovers.js — where it belongs, because the same concept had
    // eight implementations across four files.
    //
    // That is the gate having pinned HOW instead of WHAT. The property worth
    // holding is that this shell does not re-derive the count at all; which
    // module owns it is free to change.
    expect(code).toMatch(/const confirmedHeads\s*=\s*confirmedCovers\(event\)/);
    expect(code).toMatch(/import \{ confirmedCovers \} from '@app\/lib\/confirmedCovers'/);
    // …and it does NOT hand-roll the band read any more. Bounded to the
    // STATEMENT, not a character window — a 200-char window ran past this
    // one-liner into the next attendanceBand call below it, which is the
    // third time today a window-scoped assertion read the wrong code.
    const stmt = (code.split('\n').find((l) => l.includes('const confirmedHeads')) || '');
    expect(stmt).not.toMatch(/attendanceBand/);
    expect(stmt).toMatch(/confirmedCovers\(event\)/);
  });

  test('ROWS AGAINST ROWS is still allowed, and still there', () => {
    // The distinction that makes this gate correct rather than merely strict.
    // Two readouts pair "N confirmed" with "M invited" — both rows, both
    // describing the roster. Converting only the first would print "7
    // confirmed · 8 invited" and read as seven of eight people replying.
    // If someone later "fixes" those too, this fails and they must think.
    const pairs = code.match(/confirmed[\s\S]{0,80}?invited/g) || [];
    expect(pairs.length).toBeGreaterThan(0);
  });
});

// ─── AND THE VENDOR-READINESS COPY, WHICH HAD NO GATE AT ALL ──────────────
//
// Five sites in vendorQuestions.js derived `confirmedGuests` by counting
// rows. Red-proofing found that reverting all five to the row count broke
// NOTHING — so they were converted with nothing holding them. That gap is
// this block.
//
// This half is behavioural, not text: vendorQuestions is plain lib code that
// jest can execute, so there is no excuse for a source assertion here.
import { getVendorRequiredQuestions } from '../vendorQuestions';
import { confirmedCovers, confirmedCoversOrZero } from '../confirmedCovers';

// Two confirmed rows, one of them bringing two kids: 2 rows, 4 covers.
const rosterEvent = (over) => ({
  id: 'ev-cov', type: 'Birthday', date: '2027-06-17',
  vendors: [{ id: 'v1', name: 'A Caterer', category: 'Catering', status: 'Booked' }],
  guests: [
    { name: 'Ada', rsvp: 'Yes', kids: 2 },
    { name: 'Bo', rsvp: 'Yes' },
    { name: 'Cy', rsvp: 'No', kids: 3 },
    { name: 'Di', rsvp: 'Pending' },
  ],
  ...over,
});

describe('the one reader, and the vendor copy that reads it', () => {
  test('PREMISE: rows and covers really do differ on this fixture', () => {
    const ev = rosterEvent();
    const rows = ev.guests.filter((g) => g.rsvp === 'Yes').length;
    expect(rows).toBe(2);
    expect(confirmedCovers(ev)).toBe(4);   // 2 rows + 2 kids they bring
  });

  test('a declined row’s kids are not fed', () => {
    // Cy said no and brings three. Counting them would oversize the order,
    // which is the same class of error as undersizing it.
    expect(confirmedCovers(rosterEvent())).toBe(4);
  });

  test('a filled plusOne is a real adult', () => {
    const ev = rosterEvent({
      guests: [{ name: 'Ada', rsvp: 'Yes', plusOne: 'Sam' }, { name: 'Bo', rsvp: 'Yes' }],
    });
    expect(ev.guests.filter((g) => g.rsvp === 'Yes').length).toBe(2);
    expect(confirmedCovers(ev)).toBe(3);
  });

  test('headcount mode answers with the host’s own number', () => {
    expect(confirmedCovers({ guestMode: 'count', guestCount: 40, guests: [] })).toBe(40);
  });

  test('NULL IS NOT ZERO when nothing has been told to us', () => {
    // A mismatch claimed against an absent count is the other way to be
    // wrong. Callers must handle null rather than defaulting it.
    expect(confirmedCovers({ id: 'x' })).toBeNull();
    expect(confirmedCoversOrZero({ id: 'x' })).toBe(0);
  });

  test('THE GAP THAT HAD NO GATE: the caterer question states COVERS', () => {
    // Reverting vendorQuestions to a row count must fail HERE. Before this
    // block, it failed nowhere.
    const ev = rosterEvent({ catererCount: 4 });
    const qs = getVendorRequiredQuestions(ev.vendors[0], ev);
    const blob = JSON.stringify(qs);
    expect(blob).toMatch(/\b4\b/);       // the cover count
    expect(blob).not.toMatch(/"2 confirmed"|\b2 confirmed\b/);
  });

  test('…and a caterer set to the ROW count is reported as a mismatch', () => {
    // The host who followed the old "Match confirmed yeses" button landed
    // exactly here: catererCount 2, covers 4, two children unfed.
    const ev = rosterEvent({ catererCount: 2 });
    const qs = getVendorRequiredQuestions(ev.vendors[0], ev);
    const q = qs.find((x) => x && x.key === 'finalGuestCount');
    expect(q).toBeTruthy();
    expect(JSON.stringify(q)).not.toMatch(/matches|confirmed count is set/i);
  });
});

// ─── AND NO SURFACE ANYWHERE WRITES A ROW COUNT INTO THE CATERER ──────────
//
// Red-proofing found a SECOND ungated site: reverting
// VendorPlanningWorkspace's CatererDriftBanner to a row count broke nothing
// either. Its "Update to N" button writes N into event.catererCount, so that
// is a write, not a label.
//
// This is a cross-file property — "no surface does X" — and reading the files
// is direct evidence of it rather than a proxy for behaviour. That is the
// same reasoning textGateRatchet.test.js gives for its own existence. A
// behaviour test reaches the surfaces it renders; there are four here, behind
// different modes and drift states, and the 2026-09-18 precedent in that file
// records a behaviour test reaching one of six.
describe('no surface writes a row count into the caterer', () => {
  const FILES = [
    'src/plan/VendorPlanningWorkspace.jsx',
    'src/CommandCenter.jsx',
    'hostv2/src/HostShellV2.jsx',
    'src/lib/vendorQuestions.js',
  ];

  test('every catererCount source is a cover count, in all four files', () => {
    const guilty = [];
    for (const rel of FILES) {
      const body = stripComments(fs.readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8'));
      // Any binding whose value is a rsvp row count…
      const rowBindings = [...body.matchAll(
        /(?:const|let)\s+(\w+)\s*=[^;\n]*\.filter\([^)]*rsvp[^)]*\)\s*\.length/g,
      )].map((m) => m[1]);
      // …must not appear as, or beside, a catererCount value.
      for (const name of rowBindings) {
        const re = new RegExp(`catererCount[\\s\\S]{0,200}?\\b${name}\\b|\\b${name}\\b[\\s\\S]{0,200}?catererCount`);
        if (re.test(body)) guilty.push(`${rel}: ${name}`);
      }
      // And no inline row count may be written directly.
      if (/catererCount:\s*[^,}\n]*\.filter\([^)]*rsvp/.test(body)) guilty.push(`${rel}: inline write`);
    }
    expect(guilty).toEqual([]);
  });

  test('PREMISE: these files really do mention catererCount', () => {
    // Without this the assertion above passes on four files that stopped
    // having the thing it polices.
    const mentions = FILES.filter((rel) => fs
      .readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8')
      .includes('catererCount'));
    expect(mentions).toEqual(FILES);
  });
});
