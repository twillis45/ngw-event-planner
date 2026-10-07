// ─── THE FLAG FINALLY HAS A READER ──────────────────────────────────────────
//
// `belowLodgingFloor` was computed 2026-09-22, asserted seven times in
// `theRoomsCostMoreThanTheEvent.test.js`, and read by NO UI for fifteen days.
// A review seat scored the product down for it three sittings running, and the
// complaint was exact: the app computes the contradiction between a real
// published price and its own invented band, and tells the host nothing.
//
// The numbers here are the host's own — the six Santa Fe listings this app
// actually showed her, at their captured prices. Same fixtures as the engine
// test, deliberately, so copy and engine can never diverge on the figures.
import { estimateTotalRange } from '../budgetEstimator/totalEstimate';
import { stayOnTopOfTheRangeNote } from '../budgetCopy';

const est = (over = {}) => estimateTotalRange({
  type: 'Birthday', guestCount: 10, date: '2027-06-17', isDestination: true, nights: 4, ...over,
});
const CHEAPEST = { rung: 'cheapest', name: 'Private backyard with BBQ near the Plaza' };
const PICKED = { rung: 'picked', name: 'Rooftop jacuzzi with panoramic mountain views' };

describe('the rooms reach the host', () => {
  test('(premise) the range and the flag are what the engine test says', () => {
    // If these drift, every string below is measuring the wrong event.
    const r = est({ lodgingFloor: 2180 });
    expect([r.lowTotal, r.highTotal]).toEqual([2000, 6000]);
    expect(r.belowLodgingFloor).toBe(false);
    expect(est({ lodgingFloor: 9040 }).belowLodgingFloor).toBe(true);
  });

  test('THE CHEAPEST STAY ON HER SHORTLIST GETS A SENTENCE, flag or no flag', () => {
    // $2,180 does NOT trip `belowLodgingFloor` — 6,000 > 2,180 — and this is
    // the case that matters most, because it is the DEFAULT one. Wiring only
    // the boolean would have left the real Santa Fe shortlist silent.
    const note = stayOnTopOfTheRangeNote(est({ lodgingFloor: 2180 }), CHEAPEST);
    expect(note).toBeTruthy();
    expect(note).toMatch(/\$2,180/);
    expect(note).toMatch(/Private backyard with BBQ near the Plaza/);
    expect(note).toMatch(/least expensive place on your shortlist/);
    // It must say what the range covers, or the two numbers sit next to each
    // other with no stated relationship — which is the defect, not the fix.
    expect(note).toMatch(/this range covers the party/i);
    expect(note).toMatch(/not the stay, the flights, or travel insurance/i);
    // and it must NOT claim the rooms outrun the range, because they do not.
    expect(note).not.toMatch(/more than the/i);
  });

  test('THE FLAG EARNS ITS OWN CLAUSE when the rooms outrun the whole band', () => {
    const note = stayOnTopOfTheRangeNote(est({ lodgingFloor: 9040 }), PICKED);
    expect(note).toMatch(/\$9,040/);
    expect(note).toMatch(/the place you chose/i);
    expect(note).toMatch(/more than the \$6,000 top of this range/);
  });

  test('IT MINTS NO NEW BAND — only the two figures already disclosed', () => {
    // Stating "plan on $11,000-$15,000 all in" would re-author a host-facing
    // number, which totalEstimate refuses to do for this very field. The host
    // does the addition; it is their money and they can add.
    for (const [floor, stay] of [[2180, CHEAPEST], [9040, PICKED]]) {
      const note = stayOnTopOfTheRangeNote(est({ lodgingFloor: floor }), stay);
      const dollars = (note.match(/\$[\d,]+/g) || []).sort();
      const allowed = floor === 9040 ? ['$6,000', '$9,040'] : ['$2,180'];
      expect(dollars).toEqual(allowed.sort());
    }
  });

  test('NEGATIVE CONTROL: no shortlist, no sentence', () => {
    expect(stayOnTopOfTheRangeNote(est(), CHEAPEST)).toBeNull();
    expect(stayOnTopOfTheRangeNote(est({ lodgingFloor: 0 }), CHEAPEST)).toBeNull();
    expect(stayOnTopOfTheRangeNote(null, CHEAPEST)).toBeNull();
    expect(stayOnTopOfTheRangeNote(undefined, undefined)).toBeNull();
  });

  test('an unnamed stay still gets the sentence — the dollars carry it', () => {
    // Own evidence without a label: still the host's shortlist, so the claim
    // holds and only the name is missing.
    const note = stayOnTopOfTheRangeNote(est({ lodgingFloor: 2180 }), { rung: 'cheapest' });
    expect(note).toMatch(/\$2,180/);
    expect(note).toMatch(/least expensive place on your shortlist/i);
    // No empty slot where a name should have been.
    expect(note).not.toMatch(/\s,|,\s,|undefined|null/);
  });

  // ── THE REFUSAL, WHICH RED-PROOFING IS WHAT FOUND ───────────────────────
  // With the ladder's own guard removed, this function rendered "The least
  // expensive place on your shortlist showed $167 for the stay" — $167 being a
  // rung-3 Inside Airbnb PER-NIGHT asking figure for a host with no shortlist.
  // Two falsehoods in one sentence, because `rung` fell through to the else
  // branch for every value it did not recognise. It refuses by itself now, so
  // the sentence cannot be made false by a caller's mistake.
  test('IT REFUSES ANY BASIS THAT IS NOT THE HOST\'S OWN EVIDENCE', () => {
    const e = est({ lodgingFloor: 2180 });
    for (const bad of [
      { rung: 'listings', unit: 'place-night', name: 'Santa Fe' },
      { rung: 'federal', unit: 'room-night' },
      { rung: 'something-new-next-year' },
      null,
      undefined,
    ]) {
      expect(stayOnTopOfTheRangeNote(e, bad)).toBeNull();
    }
    // …and the positive control, so this is not passing because the note is
    // simply broken for everyone.
    expect(stayOnTopOfTheRangeNote(e, { rung: 'cheapest' })).toBeTruthy();
  });
});
