// ─── CONSUMER #33 CANNOT GET THIS WRONG BY ACCIDENT ─────────────────────────
//
// SPRINT 0.5 DECISION 1, the enforcement half.
//
// Sprint 0's answer to "what stops the next consumer treating an estimate as
// confirmed attendance?" was, in effect, *nothing* — it classified 29 raw
// readers, found them individually defensible, and left the field open. Then
// Sprint 0.5 found one that was NOT defensible
// (`vendorAccountability/conflicts.js`, which offered to write an app-invented
// count onto a contracted caterer). A classification that lives in a document
// cannot stop #33; a gate can.
//
// ── WHAT THIS IS NOT ───────────────────────────────────────────────────────
//
// Not a ban on raw reads. Reading the raw field is CORRECT in most of the
// entries below, and mass-migrating for architectural neatness was explicitly
// ruled out. This gate asks one thing of a new raw reader: say which semantic
// question you are asking, and why the raw field answers it. A reader that
// cannot answer that is a reader that has not thought about provenance.
//
// ── THE CANONICAL READERS, NAMED HERE SO A FAILURE POINTS SOMEWHERE ────────
//
//   attendanceBand(event)          THE canonical planning reader. Returns
//                                  confirmed / planning / low / high / basis /
//                                  band / because, and since Sprint 0.5 also
//                                  countSource + countFromHost. HostShellV2:3887
//                                  calls it "the canonical reader"; :4040 says
//                                  it "owns the question".
//   guestCountFor(event)           The number and WHOSE it is. Cheap, leaf,
//                                  no playbook load. Use for "is there a count
//                                  at all" (`known`) and "may I say it out
//                                  loud" (`fromHost`).
//   guestCountIsConfirmed(event)   The outward gate. Twin of
//                                  startTimeIsConfirmed.
//   confirmedCovers(event)         PLATES, not people — catering and seating.
//   headsFor(event)                Who is in the number, for per-head division.
//
// ── THE RATCHET ────────────────────────────────────────────────────────────
//
// LOWER THIS, NEVER RAISE IT. A new file reading the raw headcount must be
// added here with a semantic category and a reason, or must use a canonical
// reader. Removing a reader means deleting its entry — a stale entry is the
// list lying, so that fails too.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

// Semantic categories, from the Sprint 0.5 brief. Named so an entry has to
// pick one rather than hand-wave.
const NEED = {
  AUTHORITY: 'canonical authority — this file IS a reader other code should use',
  APPLICABILITY: 'applicability only — "is there a count at all", never the value as truth',
  PLANNING: 'planning estimate — sizing a preview before RSVPs are in; this is the product',
  RAW_INTAKE: 'raw intake specifically required — comparing what was planned vs what happened',
  DISPLAY: 'display-only — shown to the host about her own event, already hedged',
  SIZING: 'sizing/calculation — a labeled estimate, never presented as settled',
  GATED: 'outward or money, and already provenance-gated in this file',
};

// file → { need, why }. The classification IS the gate.
const READERS = Object.freeze({
  // ── Canonical authorities. Raw by definition; they are the floor. ─────────
  'src/lib/guestCountFor.js': { need: NEED.AUTHORITY, why: 'the resolution order itself: guestCount || guestEstimate || roster, plus whose it is' },
  'src/lib/playbooks/index.js': { need: NEED.AUTHORITY, why: 'holds attendanceBand, guestCountOf and the food/supply sizing the rest of the app reads' },
  'src/lib/confirmedCovers.js': { need: NEED.AUTHORITY, why: 'the ONE plates reader; its headcount-mode fallback is the host’s own number' },
  'src/lib/perHead.js': { need: NEED.AUTHORITY, why: 'the ONE per-head divider; carries its own hostCounts provenance and refuses to guess' },

  // ── Applicability. The value is never used as truth. ─────────────────────
  'src/lib/phaseProgress.js': { need: NEED.APPLICABILITY, why: 'decides whether the guests plan-part counts at all' },
  'src/lib/taskEngine.js': { need: NEED.APPLICABILITY, why: 'hasGuests gate on whether guest tasks apply' },
  'src/lib/returnNarration.js': { need: NEED.APPLICABILITY, why: 'countSet flag for what changed since last visit' },
  'src/lib/disclosure.js': { need: NEED.APPLICABILITY, why: 'whether a guest-count disclosure is owed' },
  'src/lib/appetite.js': { need: NEED.APPLICABILITY, why: 'reads roster presence, not a count' },
  'src/lib/intelEval.js': { need: NEED.APPLICABILITY, why: 'evaluation harness over fixture events' },

  // ── Planning. Sizing before RSVPs land is the product, not a leak. ───────
  'src/lib/lodgingIntel.js': { need: NEED.PLANNING, why: 'sizes the house search; the access count is separately provenance-gated via accessNeedsFor' },
  'src/lib/knowledge/lodgingBasisLadder.js': { need: NEED.PLANNING, why: 'which basis the lodging number rests on' },
  'src/lib/crabPlan.js': { need: NEED.PLANNING, why: 'coverage advice only — cost is qty × host-entered pricePerUnit, never count-derived' },
  'src/lib/cvbIntel.js': { need: NEED.PLANNING, why: 'gates whether the room-block ask appears; the number is never printed into it' },
  'src/lib/placeIntelligence.js': { need: NEED.PLANNING, why: 'a >=50 threshold for venue advice' },
  'src/lib/assembleRevealEngines.js': { need: NEED.PLANNING, why: 'reveal-stage sizing preview' },

  // ── Raw intake, specifically. ────────────────────────────────────────────
  'src/lib/hostIntel.js': { need: NEED.RAW_INTAKE, why: 'compares what was PLANNED against what happened on past events — the planned number is the subject' },
  'src/lib/analyticsReader.js': { need: NEED.RAW_INTAKE, why: 'reads historical events as recorded' },

  // ── Sizing / money, labeled. ─────────────────────────────────────────────
  'src/lib/vendorPlan.js': { need: NEED.SIZING, why: 'vendor cost ESTIMATES, labeled as estimates; no commitment is written from them' },

  // ── Outward or money, gated in-file. ─────────────────────────────────────
  'src/lib/doItForMe.js': { need: NEED.GATED, why: 'outwardHeadCount() withholds an unconfirmed count from vendor outreach (2026-09-18)' },
  'src/lib/budgetRecovery.js': { need: NEED.GATED, why: 'hasRealCount = guestCountIsConfirmed gates the money path (Sprint 0 P0-2)' },
  'src/lib/vendorAccountability/conflicts.js': { need: NEED.GATED, why: 'the estimate term is gated on guestCountFor().fromHost so an invented count cannot be written onto a caterer (Sprint 0.5)' },

  // ── The shell. ───────────────────────────────────────────────────────────
  'hostv2/src/HostShellV2.jsx': { need: NEED.DISPLAY, why: 'a guestNumber display helper, a "Confirmed at N" chip reading the host-written guestCount, and a host-facing vendor pricing hint' },
  'hostv2/src/LodgingCockpit.jsx': { need: NEED.DISPLAY, why: 'per-head display fallback; renders perHeadOf’s own basis beside it' },
});

// `ev.guestEstimate`, `event.guestCount`, `e.guests.length` — the raw shapes.
// Deliberately NOT matching `guestCountFor(` or `attendanceBand(`: using a
// canonical reader is the thing this gate wants.
const RAW = /\b(?:ev|event|e|g|guest)\s*\.\s*(?:guestEstimate|guestCount)\b|\bevent\.guests\.length\b/;

// Comment lines do not read anything. Both line-comment forms, because the
// repo's comments quote field names constantly and a naive scan reports a
// documentation paragraph as a consumer.
const stripComments = (src) => src.split('\n')
  .map((l) => (/^\s*(?:\/\/|\*|\/\*)/.test(l) ? '' : l.replace(/\/\/.*$/, '')))
  .join('\n');

const SKIP = /node_modules|build|dist|__tests__|__probe__|__dbg__|\/data\/|demoSeed|fixtures|testUtils|eventPool|parity/;

const scan = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) { scan(p, out); continue; }
    if (!/\.(js|jsx)$/.test(e.name) || /\.test\.|\.spec\./.test(e.name)) continue;
    if (RAW.test(stripComments(fs.readFileSync(p, 'utf8')))) out.push(path.relative(ROOT, p));
  }
  return out;
};

const found = () => [
  ...scan(path.join(ROOT, 'src/lib')),
  ...scan(path.join(ROOT, 'hostv2/src')),
].sort();

describe('the raw headcount field has one classified set of readers', () => {
  test('every file reading it has declared WHICH question it is asking', () => {
    const undeclared = found().filter((f) => !READERS[f]);
    // A failure here is not "stop reading the field". It is: pick a canonical
    // reader, or add an entry saying which semantic category you are in.
    //
    //   attendanceBand(event)        planning / confirmed / provenance
    //   guestCountFor(event)         the number and whose it is
    //   guestCountIsConfirmed(event) may I say it outward
    //   confirmedCovers(event)       plates, for catering and seating
    //   headsFor(event)              who is in the number, for division
    //
    // Sprint 0.5 found one reader that had never asked itself the question and
    // was offering to write an app-invented count onto a contracted caterer.
    expect(undeclared).toEqual([]);
  });

  test('and no entry is stale — a list that over-claims is a list that lies', () => {
    const gone = Object.keys(READERS).filter((f) => !found().includes(f));
    expect(gone).toEqual([]);
  });

  test('THE GATE BITES — the scanner really does find raw reads', () => {
    // Guard against a dead ratchet: a regex that silently stopped matching
    // would make the two tests above pass forever while the field went
    // unguarded. The same guard the spacing and parity ratchets carry.
    expect(found().length).toBeGreaterThan(15);
    expect(found()).toContain('src/lib/guestCountFor.js');
  });

  test('every declared need is one of the named categories', () => {
    const names = new Set(Object.values(NEED));
    const bad = Object.entries(READERS).filter(([, v]) => !names.has(v.need)).map(([f]) => f);
    expect(bad).toEqual([]);
  });

  test('every entry gives a reason, not just a category', () => {
    const empty = Object.entries(READERS).filter(([, v]) => !v.why || v.why.length < 20).map(([f]) => f);
    expect(empty).toEqual([]);
  });
});
