// ─── A "BAKE IT" BUTTON FOR A HOST WITH NO OVEN ──────────────────────────────
//
// Screen census of the Santa Fe 80th, room block answered (host ask: "check the
// host is only seeing what they need on each screen"). The Calls-to-make screen
// offered, live and tappable:
//
//   "Cake: bake, order, or cupcakes?"   ->  Order a cake · Bake it · Cupcakes · Both
//   food_style                          ->  Cook/grill yourself · Order pizza/trays · ...
//
// while the food sheet two screens away said "there is no kitchen to cook in",
// the budget had stopped pricing groceries, and The Day tab had stopped asking
// for safe internal temps. A control the host cannot act on is worse than a
// wrong number, because they can tap it — and tapping "Bake it" would then have
// injected the cook lever ("How is the hot food getting cooked?") on top.
//
// THE PRUNE IS NARROW ON PURPOSE. "Order a cake" and "Drop-off catering" involve
// food and heat and are none of this gate's business; only an option whose VERB
// is the HOST cooking qualifies. HOST_COOKS_OPTION_RE matches `\bbake it\b` and
// not `/bake/`, so a bakery option can never be pruned by a word it contains.
//
// AND AN ANSWER OUTRANKS THE GATE, which is the rule playbookDecisionOptions
// already states for its other gates: a host who picked "Bake it" and THEN
// answered "room block" keeps seeing their own pick. Withdrawing it under them
// would silently rewrite a decision they made.
import { playbookDecisionOptions, getPlaybook } from '../playbooks';
import { lodgingKitchen } from '../lodgingIntel';

const base = (extra) => ({
  id: 'k', name: "Mom's 80th", type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'count', guestCount: 10, ...extra,
});
const HOTEL = base({ foodChoices: { dest_lodging: 'A room block I guarantee fills' } });
const RENTAL = base({ foodChoices: { dest_lodging: 'A house we rent for everyone' } });
const UNTOLD = base({});
const opts = (ev, id) => {
  const o = playbookDecisionOptions(ev, id);
  return o ? o.options : null;
};

describe('the app stops offering an action the host cannot take', () => {
  test('(premise) the playbook really authors these cooking options', () => {
    // If the authored list ever loses them, the assertions below start passing
    // for the wrong reason. Read from the playbook, not from the reader.
    const pb = getPlaybook('Birthday');
    const cake = pb.decisions.find((d) => d.id === 'cake');
    const style = pb.decisions.find((d) => d.id === 'food_style');
    expect(cake.options).toContain('Bake it');
    expect(style.options).toContain('Cook/grill yourself');
    expect(lodgingKitchen(HOTEL)).toBe(false);
  });

  test('THE FIX: no room-block host is offered "Bake it" or "Cook/grill yourself"', () => {
    expect(opts(HOTEL, 'cake')).not.toContain('Bake it');
    expect(opts(HOTEL, 'food_style')).not.toContain('Cook/grill yourself');
  });

  test('only the cooking options go — the decision still works', () => {
    // The over-correction: pruning so hard the host loses the decision itself.
    expect(opts(HOTEL, 'cake')).toEqual(['Order a cake', 'Cupcakes', 'Both cake + treats']);
    expect(opts(HOTEL, 'food_style')).toEqual(['Order pizza/trays', 'Drop-off catering', 'Potluck']);
  });

  test('a bakery option is never pruned by a word it happens to contain', () => {
    // Why the regex is `\bbake it\b` and not `/bake/`.
    expect(opts(HOTEL, 'cake')).toContain('Order a cake');
  });

  test('AN ANSWER OUTRANKS THE GATE: the host\'s own pick is never withdrawn', () => {
    // Picked "Bake it", THEN told us it is a room block. Their decision stands —
    // the same rule the reader already applies to its other gates.
    const theirs = base({ foodChoices: { dest_lodging: 'A room block I guarantee fills', cake: 'Bake it' } });
    expect(opts(theirs, 'cake')).toContain('Bake it');
  });

  test('the label cannot drift out of sync with the options it lists', () => {
    // It read "Cake: bake, order, or cupcakes?" — a heading offering a button
    // that is no longer there. A label that enumerates its own options has to be
    // re-edited every time they change, so it stopped enumerating them.
    const cake = getPlaybook('Birthday').decisions.find((d) => d.id === 'cake');
    expect(cake.label).toBe('The cake');
    expect(cake.label).not.toMatch(/bake/i);
    // AND THE QUESTION SURVIVED THE EDIT. This row had no authored `ask` — its
    // question WAS the old label, which ended in a '?'. Shortening the label
    // silently left the host a card with nothing being asked, and
    // authoredAskReachesTheHero caught it. The ask is authored now, and it does
    // not enumerate the options either, so the same drift cannot recur.
    expect(cake.ask).toBe('How are you handling the cake?');
    expect(cake.ask).not.toMatch(/bake/i);
  });

  test('NEGATIVE CONTROL: a rental with a kitchen keeps every option', () => {
    expect(opts(RENTAL, 'cake')).toContain('Bake it');
    expect(opts(RENTAL, 'food_style')).toContain('Cook/grill yourself');
  });

  test('NEGATIVE CONTROL: an UNTOLD kitchen keeps them too', () => {
    // Same asymmetry the food sheet, the budget and The Day tab all draw.
    expect(opts(UNTOLD, 'cake')).toContain('Bake it');
    expect(opts(UNTOLD, 'food_style')).toContain('Cook/grill yourself');
  });

  test('NEGATIVE CONTROL: a LOCAL event keeps them, even holding the answer', () => {
    const local = base({
      isDestination: false, venueCity: 'Silver Spring', state: 'MD',
      foodChoices: { dest_lodging: 'A room block I guarantee fills' },
    });
    expect(opts(local, 'cake')).toContain('Bake it');
  });

  test('NEGATIVE CONTROL: unrelated decisions are untouched', () => {
    // Scope. This gate is about cooking, not about every optioned decision.
    const pb = getPlaybook('Birthday');
    for (const d of pb.decisions) {
      if (!Array.isArray(d.options) || !d.options.length) continue;
      if (d.id === 'cake' || d.id === 'food_style') continue;
      expect(opts(HOTEL, d.id)).toEqual(opts(RENTAL, d.id));
    }
  });
});
