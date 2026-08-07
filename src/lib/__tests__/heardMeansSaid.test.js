// ─── "HEARD" MEANS SHE SAID IT (2026-08-06, board, copy seat) ──────────────
//
// Driven live: a host typed a date range and never used the word "overnight".
// The chip read "Staying overnight · heard" — the app claiming she said
// something she did not. smartParseEvent has carried `overnightBasis`
// ('said-so' vs 'multi-day-span') the whole time, with a comment saying it was
// built FOR that chip, and the shell read it zero times.
//
// Same defect class as everything else this session: a provenance label that
// means something other than what it says.
import { parseSmartEventText } from '../smartParseEvent';

const parse = (s) => parseSmartEventText(s);

describe('overnight provenance names its real source', () => {
  test('a date SPAN with no overnight word is derived, not heard', () => {
    const p = parse('Birthday in Santa Fe June 20 to June 24 2027, 5 of us');
    expect(p.overnight).toBe(true);
    expect(p.overnightBasis).toBe('multi-day-span');
  });

  test('the word itself is heard', () => {
    const p = parse('Birthday in Santa Fe on June 20 2027, staying overnight, 5 of us');
    expect(p.overnight).toBe(true);
    expect(p.overnightBasis).toBe('said-so');
  });

  test('SAID beats DERIVED when both are true', () => {
    // This is the case that was wrong: a host who wrote the word AND gave a span
    // was recorded as having it inferred from her dates — the app forgetting
    // something she actually told it.
    const p = parse('Birthday in Santa Fe June 20 to June 24 2027, staying overnight');
    expect(p.overnightBasis).toBe('said-so');
  });

  test('a single-day event with no signal claims nothing', () => {
    const p = parse('Birthday party on June 20 2027, 12 people');
    expect(p.overnight).toBeNull();
    expect(p.overnightBasis).toBeNull();
  });

  test('a lodging word counts as saying it', () => {
    expect(parse('Reunion in Tulum, we booked an airbnb').overnightBasis).toBe('said-so');
  });
});
