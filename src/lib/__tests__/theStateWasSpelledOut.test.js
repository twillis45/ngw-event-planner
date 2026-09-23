// ─── SHE SAID THE TOWN AND THE APP ASKED WHICH TOWN ─────────────────────────
//
// Found driving an 80th birthday to Santa Fe, 2026-09-23. The host typed
// "…in Santa Fe New Mexico…" and the parse screen asked "Which town?" — the one
// fact she had been most explicit about.
//
// It was never about Santa Fe. "Austin Texas" and "Baltimore Maryland" failed
// identically: the parser accepted a two-letter abbreviation glued to a town
// (fixed by a live drive on 2026-08-05) and a comma before a spelled-out name,
// and nothing else. People write the state out constantly.
import { parseSmartEventText } from '../smartParseEvent';

const city = (s) => { const p = parseSmartEventText(s); return `${p.venueCity}/${p.venueState}`; };

describe('(premise) the forms that already worked still work', () => {
  test('the comma-and-abbreviation form is untouched', () => {
    expect(city("Mom's 80th in Santa Fe, NM on June 14 2027, 30 people")).toBe('Santa Fe/NM');
  });
  test('the no-comma abbreviation form (2026-08-05 drive) is untouched', () => {
    expect(city('Reunion in Santa Fe NM, 40 people')).toBe('Santa Fe/NM');
  });
});

describe('THE FIX: a spelled-out state, with no comma', () => {
  test('the sentence that found it', () => {
    expect(city("Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
      + 'about 30 people flying in for 3 nights')).toBe('Santa Fe/NM');
  });

  test('…and it was never about Santa Fe', () => {
    expect(city("Mom's 80th birthday in Austin Texas on June 14 2027, 30 people")).toBe('Austin/TX');
    expect(city("Mom's 80th birthday in Baltimore Maryland on June 14 2027, 30 people")).toBe('Baltimore/MD');
  });

  test('A TWO-WORD STATE IS NOT READ AS ITS LAST WORD', () => {
    // Longest-first matching. "New Mexico" read as "Mexico" would be a state
    // that does not exist here; read as "New" it is nothing at all.
    expect(city('Party in Santa Fe New Mexico, 20 people')).toBe('Santa Fe/NM');
    expect(city('Party in Charlotte North Carolina, 20 people')).toBe('Charlotte/NC');
    expect(city('Party in Portsmouth New Hampshire, 20 people')).toBe('Portsmouth/NH');
  });
});

describe('it stays narrow — a state name is an ordinary word', () => {
  test('no locative preposition, no location claim', () => {
    // This is why the spelled-out form requires "in/at/near/around" while the
    // abbreviation form does not: "Georgia" and "Virginia" are names, and
    // "Washington" is three different things.
    const p = parseSmartEventText('Birthday for Georgia, 20 people on June 14 2027');
    expect(p.venueCity).toBe(null);
  });

  test('the home and backyard cases still resolve to no city', () => {
    expect(parseSmartEventText('Cookout at my place for 20 people on July 4').venueCity).toBe(null);
    expect(parseSmartEventText('Birthday in the backyard, 20 people').venueCity).toBe(null);
  });
});
