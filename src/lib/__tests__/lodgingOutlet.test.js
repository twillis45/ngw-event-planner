// ─── THE LODGING OUTLET (review board ruling, 2026-07-28) ────────────────────
//
// The board killed every proposal to add a capture transport and ordered exactly
// one build, on the strength of a grep:
//
//   grep -c "lodgingOptions" src/lib/travelPlan.js      → 0
//                            src/lib/surfaceRegistry.js → 0
//                            src/lib/hostSpending.js    → 0
//                            src/lib/phaseProgress.js   → 0
//
// The shortlist was read by NOTHING. A host could weigh eighteen houses, pick a
// $6,400 one, and read a toast saying "the plan reads it now" while her budget
// stayed at zero. The Scope Executioner: "You are optimizing the intake pipe on
// a tank with no outlet."
//
// These tests are the outlet's contract. They fail if anyone disconnects it.
const { lodgingCommitted, stayFromPick } = require('../lodgingIntel');
const { hostSpending } = require('../hostSpending');
const { SURFACES } = require('../surfaceRegistry');

const NIGHTS = { date: '2026-09-11', endDate: '2026-09-13' };
const ev = (over) => ({
  id: 'outlet', type: 'Family Reunion', guestCount: 10,
  venueCity: 'McHenry', venueState: 'MD', totalBudget: 8000,
  ...NIGHTS, ...over,
});
const opt = (over) => ({
  id: 'o1', label: 'Lake House', url: 'https://www.airbnb.com/rooms/1',
  sleeps: 12, totalPrice: 3000, fees: 400, status: 'option', ...over,
});

describe('a chosen house reaches the money', () => {
  test('nothing chosen commits nothing', () => {
    expect(lodgingCommitted(ev({ lodgingOptions: [opt(), opt({ id: 'o2' })] }))).toBe(0);
  });

  test('the chosen one commits its ALL-IN cost, fees included', () => {
    // $3,000 sticker + $400 fees. A cheaper sticker with a big cleaning fee is
    // not the cheaper house — the recommendation already compares on allIn and
    // the budget must agree with it.
    const e = ev({ lodgingOptions: [opt({ status: 'chosen' })] });
    expect(lodgingCommitted(e)).toBe(3400);
  });

  test('only the CHOSEN option counts — a shortlist is not a commitment', () => {
    const e = ev({ lodgingOptions: [
      opt({ id: 'a', totalPrice: 9000, fees: 0 }),
      opt({ id: 'b', totalPrice: 3000, fees: 400, status: 'chosen' }),
      opt({ id: 'c', totalPrice: 9000, fees: 0 }),
    ] });
    expect(lodgingCommitted(e)).toBe(3400);
  });

  test('a chosen house with no price commits ZERO, never a guess', () => {
    // The shortlist says out loud when it could not weigh a cost. Inventing a
    // number here would contradict that to the penny.
    const e = ev({ lodgingOptions: [opt({ status: 'chosen', totalPrice: undefined, fees: undefined, pricePerNight: undefined })] });
    expect(lodgingCommitted(e)).toBe(0);
  });

  test('hostSpending actually counts it — the wire the board demanded', () => {
    const before = hostSpending(ev({ lodgingOptions: [opt()] }));
    const after = hostSpending(ev({ lodgingOptions: [opt({ status: 'chosen' })] }));
    expect(after.committed - before.committed).toBe(3400);
    // Exposed as its own component so a surface can disclose it rather than
    // silently folding it into a bigger number.
    expect(after.lodgingCommitted).toBe(3400);
    expect(before.lodgingCommitted).toBe(0);
  });

  test('committed money reduces the headroom, so the host sees it', () => {
    const before = hostSpending(ev({ lodgingOptions: [opt()] }));
    const after = hostSpending(ev({ lodgingOptions: [opt({ status: 'chosen' })] }));
    expect(before.uncommitted - after.uncommitted).toBe(3400);
  });

  test('malformed options never throw into the budget', () => {
    for (const bad of [null, undefined, 'nonsense', [null], [{}], [{ status: 'chosen' }]]) {
      expect(() => lodgingCommitted(ev({ lodgingOptions: bad }))).not.toThrow();
      expect(lodgingCommitted(ev({ lodgingOptions: bad }))).toBe(0);
    }
  });
});

describe('a chosen house reaches the plan', () => {
  test('stayFromPick derives the stay the travel plan reads', () => {
    const e = ev({ lodgingOptions: [opt({ status: 'chosen' })] });
    const stay = stayFromPick(e);
    expect(stay.hotelName).toBe('Lake House');
    expect(stay.url).toBe('https://www.airbnb.com/rooms/1');
    // 2 nights, $3,000 total → $1,500/night.
    expect(stay.rate).toBe(1500);
  });

  test('no pick, no derived stay — never a half-filled plan', () => {
    expect(stayFromPick(ev({ lodgingOptions: [opt()] }))).toBeNull();
  });
});

describe('a shortlist with no decision raises a real row', () => {
  const surface = SURFACES.find((s) => s.id === 'lodging');
  const raise = (e) => { try { return surface.raise(e) || []; } catch (_e) { return []; } };

  test('two or more options and none picked is an open decision', () => {
    const rows = raise(ev({ lodgingOptions: [opt(), opt({ id: 'o2' })] }));
    const row = rows.find((r) => r.id === 'lodging-unpicked');
    expect(row).toBeTruthy();
    expect(row.title).toMatch(/2 places on your shortlist/);
    expect(row.why).toMatch(/can’t count what it costs/);
  });

  test('once she picks, the question stops being asked', () => {
    const rows = raise(ev({ lodgingOptions: [opt({ status: 'chosen' }), opt({ id: 'o2' })] }));
    expect(rows.find((r) => r.id === 'lodging-unpicked')).toBeFalsy();
  });

  test('ONE option is not a comparison — nothing is raised', () => {
    const rows = raise(ev({ lodgingOptions: [opt()] }));
    expect(rows.find((r) => r.id === 'lodging-unpicked')).toBeFalsy();
  });

  test('an empty shortlist raises nothing', () => {
    expect(raise(ev({ lodgingOptions: [] })).find((r) => r.id === 'lodging-unpicked')).toBeFalsy();
  });
});

describe('THE GATE: the engines actually reference the shortlist', () => {
  // The board's exact instrument. "Nothing else ships until
  // grep -c lodgingOptions returns non-zero."
  const fs = require('fs');
  const path = require('path');
  const read = (f) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');

  test('hostSpending reads the shortlist (via lodgingCommitted)', () => {
    expect(read('hostSpending.js')).toMatch(/lodgingCommitted/);
  });

  test('surfaceRegistry reads the shortlist directly', () => {
    expect(read('surfaceRegistry.js')).toMatch(/lodgingOptions/);
  });

  test('the shell writes event.lodging when the pick is made', () => {
    const shell = fs.readFileSync(
      path.resolve(__dirname, '../../..', 'hostv2/src/HostShellV2.jsx'), 'utf8');
    // The pick's write helper must patch `lodging`, not only `lodgingOptions`.
    expect(shell).toMatch(/patch\.lodging = \{/);
    expect(shell).toMatch(/stayFromPick\(\{ \.\.\.event, lodgingOptions: opts \}\)/);
  });
});
