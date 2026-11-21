// ─── WHAT SHE SAID AT CREATION IS WRITTEN DOWN (owner, 11/21/2026) ───────────
//
// "Don't keep asking host for the same information." The creation sentence's
// facts that a call asked again — items 5, 9, 10, 12 and BYOB of the audit at
// 0bc6e20f. lib/heardFacts.js reads them; heardClauses no longer reports them
// as dropped. e2e twin: hostv2/e2e/nothingKnownIsAskedAgain.spec.mjs.
import {
  heardPotluck, potluckPickFor, byobPickFor, heardKidsCount, heardAllergyCounts, heardOvernightCount,
} from '../heardFacts';
import { clausesNotUsed } from '../heardClauses';
import { parseSmartEventText } from '../smartParseEvent';
import { getPlaybook } from '../playbooks';

const decisions = (type) => getPlaybook(type).decisions;
const THANKSGIVING = 'Potluck Thanksgiving dinner at 4pm on Thursday November 25, 2027 for 14 guests, one guest has a nut allergy and 3 staying overnight';

describe('5 — "potluck" is her answer to who cooks', () => {
  test('Thanksgiving: the full potluck', () => {
    expect(potluckPickFor(decisions('Thanksgiving Hosting'), THANKSGIVING))
      .toEqual({ id: 'hosting_model', pick: 'Full potluck — Friendsgiving style, host assigns dishes' });
  });
  test('Friendsgiving: the plain potluck', () => {
    expect(potluckPickFor(decisions('Friendsgiving'), 'Potluck Friendsgiving for 10').pick)
      .toBe('Potluck — host makes the main, friends each bring an assigned dish');
  });
  test('control: "no potluck" is not one', () => {
    expect(heardPotluck('Thanksgiving for 12, no potluck this year')).toBeNull();
    expect(potluckPickFor(decisions('Thanksgiving Hosting'), 'Thanksgiving dinner for 12')).toBeNull();
  });
});

describe('BYOB is her answer to the drinks call', () => {
  test('Housewarming and Birthday', () => {
    expect(byobPickFor(decisions('Housewarming'), 'Housewarming for 25 guests, BYOB'))
      .toEqual({ id: 'drinks', pick: 'BYOB + host provides mixers/soda' });
    expect(byobPickFor(decisions('Birthday Party'), 'Birthday for 30, BYOB').pick).toBe('BYOB');
  });
  test('control: a drinks call with no BYOB option claims none', () => {
    expect(byobPickFor(decisions('Wedding'), 'Wedding for 100, BYOB')).toBeNull();
  });
});

describe('9, 10 and 8 — the counts she said', () => {
  test('one guest has a nut allergy', () => {
    expect(heardAllergyCounts(THANKSGIVING)).toEqual({ 'Nut allergy': 1 });
    expect(heardAllergyCounts('two kids have a peanut allergy')).toEqual({ 'Nut allergy': 2 });
    expect(heardAllergyCounts('dinner for 12')).toBeNull();
  });
  test('including 8 kids', () => {
    expect(heardKidsCount('Sweet 16 for 60 guests including 8 kids')).toBe(8);
    expect(heardKidsCount('a party for 60 guests')).toBeNull();
  });
  test('3 staying overnight', () => {
    expect(heardOvernightCount(THANKSGIVING)).toBe(3);
    expect(heardOvernightCount('dinner for 14')).toBeNull();
  });
  test('the clauses they read are no longer reported as dropped', () => {
    const dropped = clausesNotUsed(THANKSGIVING).join(' | ');
    expect(dropped).not.toMatch(/nut allergy/i);
    expect(dropped).not.toMatch(/staying overnight/i);
  });
});

describe('12 — the theme is only the theme words', () => {
  const theme = (s) => parseSmartEventText(s).theme;
  test('"…including 8 kids with a neon glow theme" is "neon glow"', () => {
    expect(theme('Ava’s Sweet 16 at The Loft on Saturday June 5, 2027 for 60 guests including 8 kids with a neon glow theme')).toBe('neon glow');
  });
  test('"…budget and a neon glow theme" and "party with a Great Gatsby theme"', () => {
    expect(theme('Sweet 16 at The Loft for 60 on a $5,000 budget and a neon glow theme')).toBe('neon glow');
    expect(theme('Birthday party at home with a Great Gatsby theme')).toMatch(/^great gatsby$/i);
  });
  test('control: a colour pair keeps its "and"', () => {
    expect(theme('Graduation party, black and gold theme')).toBe('black and gold');
  });
});

describe('6 — a vendor she says is booked is stored booked', () => {
  // eslint-disable-next-line global-require
  const { heardVendorIntents } = require('../heardClauses');
  test('"we already booked a DJ and a photographer"', () => {
    expect(heardVendorIntents('Wedding for 120 guests, we already booked a DJ and a photographer').map((v) => [v.category, v.status]))
      .toEqual([['DJ', 'Booked'], ['Photography', 'Booked']]);
  });
  test('control: "looking for a DJ" is interest', () => {
    expect(heardVendorIntents('Birthday for 40, looking for a DJ').map((v) => v.status)).toEqual(['Considering']);
    expect(heardVendorIntents('booked the hall, want a DJ').map((v) => v.status)).toEqual(['Considering']);
  });
});
