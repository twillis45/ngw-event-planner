// ─── THE SHEET ASKED FOR A STATE IT THEN IGNORED ────────────────────────────
//
// The shopping sheet's pricing-basis line says, in so many words:
//
//     "National average · add your state for local prices"
//
// A host adds the state. The line upgrades to "National average · not yet
// adjusted for the South" — so the app has plainly READ it. And the prices
// never move.
//
// MEASURED 2026-09-27. Two readers, one fact, and they used different fields.
// `geoPlanNote` reads the venue's `state`. The effect that fetches the regional
// factor did not: it parsed a state out of a trailing ", XX" on the venue's
// CITY, and `venueFor` splits exactly that pattern into city + state before any
// reader sees it (venueFor.js, host ruling 2026-08-03). So the regex matched
// almost nothing a real event carries:
//
//   {venueCity:'Austin', venueState:'TX'}  ->  city "Austin"     no match
//   {venue:'Santa Fe, NM'}                 ->  city "Santa Fe"   no match
//   {venueCity:'Austin, TX'}               ->  city "Austin"     no match
//
// The only inputs that ever produced a factor were a ZIP or the host's PROFILE
// state. The one field the copy names was the one field the engine skipped.
//
// ── WHY THIS IS A TEST AND NOT JUST A FIX ──────────────────────────────────
//
// The rule lived inline in a component, where nothing could check it, which is
// how the two readers drifted apart in the first place. It is a named function
// now and this pins the ORDER as well as the answer — because the order is a
// decision, not an accident: the venue is where the EVENT happens and outranks
// the host's profile, which is where the host lives.
import { priceStateFor } from '../geoCostIndex';

describe('the state the price factor asks for', () => {
  test('THE BUG: an ordinary event carries its state in `state`, not in `city`', () => {
    // The shape venueFor hands every reader. This returned null before.
    expect(priceStateFor({ city: 'Austin', state: 'TX' }, null)).toBe('TX');
    expect(priceStateFor({ city: 'Santa Fe', state: 'NM' }, null)).toBe('NM');
    expect(priceStateFor({ city: 'Annapolis', state: 'MD', zip: '21401' }, null)).toBe('MD');
  });

  test('the venue outranks the profile — the event is not where the host lives', () => {
    // A Maryland host throwing a party in Texas gets Texas prices.
    expect(priceStateFor({ city: 'Austin', state: 'TX' }, { state: 'MD' })).toBe('TX');
  });

  test('…and the profile still answers when the venue has no state yet', () => {
    expect(priceStateFor({ city: 'Austin', state: '' }, { state: 'md' })).toBe('MD');
    expect(priceStateFor({}, { state: 'MD' })).toBe('MD');
  });

  test('the legacy city form still resolves, between the two', () => {
    // Kept for any stored shape venueFor does not normalise. It costs nothing,
    // and deleting a fallback while fixing the thing that made it necessary is
    // how the next unnormalised event goes silent.
    expect(priceStateFor({ city: 'Austin, TX' }, null)).toBe('TX');
    expect(priceStateFor({ city: 'Austin, tx' }, null)).toBe('TX');
  });

  test('NEGATIVE CONTROL: it never invents a state', () => {
    // The whole reason the note and the factor are allowed to disagree about
    // CONFIDENCE is that neither may guess. A city is not a state, a country is
    // not a state, and three letters are not a state.
    for (const v of [{}, { city: 'Austin' }, { city: 'Austin', state: 'Texas' },
      { city: 'Paris', state: 'FRA' }, { state: '  ' }, { state: 7 }, null]) {
      expect({ [JSON.stringify(v)]: priceStateFor(v, null) })
        .toEqual({ [JSON.stringify(v)]: null });
    }
  });

  test('and a bad profile value cannot become one either', () => {
    expect(priceStateFor({ city: 'Austin' }, { state: 'Maryland' })).toBeNull();
    expect(priceStateFor({ city: 'Austin' }, {})).toBeNull();
  });
});
