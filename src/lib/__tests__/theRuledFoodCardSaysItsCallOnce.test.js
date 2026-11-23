// ─── THE RULED FOOD CARD SAYS ITS CALL ONCE (polish, 11/22/2026) ─────────────
//
// The food card whose record line names the call beside its count (owner's
// iPad ruling, 11/21/2026: "Who cooks what? · 2 open") was headlined either
// "Decide the menu." (Dinner Party's cook/cater/potluck call, Cookout's grill
// master: not a menu) or, after #233, by the very question the record line
// already prints, so the host read it twice. Measured on the built bundle,
// Friendsgiving: "Who cooks what?" over "Who cooks what? · 2 open".
//
// The headline is now the food calls themselves, true for any of them, and the
// record line keeps naming the one being asked.
import { foodCallsAsk } from '../heroAsk';

test('one call or several', () => {
  expect(foodCallsAsk(1)).toBe('Make the food call.');
  expect(foodCallsAsk(2)).toBe('Make the food calls.');
  expect(foodCallsAsk(5)).toBe('Make the food calls.');
});

test('it never says menu, and never repeats a question', () => {
  for (const n of [1, 2, 3]) {
    expect(foodCallsAsk(n)).not.toMatch(/menu/i);
    expect(foodCallsAsk(n)).not.toMatch(/\?/);
  }
});

// The render (the headline on the ruled card, never the question twice) is
// pinned on the built bundle: theFoodAskSaysItOnce.spec.mjs.
