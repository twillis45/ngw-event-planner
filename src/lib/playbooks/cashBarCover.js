// ─── WITH A CASH BAR, WHAT DOES THE HOST STILL COVER? (owner, 11/21/2026) ────
//
// A cash or limited bar priced EVERY drink line: Engagement's "Cash/limited
// bar" cost exactly what its "Full open bar" did. The owner's ruling: "Host
// will need options." After a cash/limited-bar pick, one follow-up call
// (`bar_cover`, engine-injected like the cook lever) asks what the host still
// puts out, and the drink lines the plan buys become exactly that answer's
// lines. So the budget's drinks line moves on the pick.
//
// THE OPTIONS ARE BUILT ONLY FROM THE PLAYBOOK'S REAL DRINK LINES. The three
// playbooks the owner approved carry the approved sets (design batch S,
// bar.json): no "Bartender only" (it named no drink line and priced the same
// as "Nothing"), and glassware is not here at all — it stays in Rentals. Any
// other playbook with a cash-bar pick gets sets built from its own lines.
//
// WHICH CALL IS THE DRINKS CALL is the one the playbook names `drinksCall:
// true` (A1, the pricing rewrite; playbookContract holds it to one per type),
// the same decision playbookFoodPlan reads: never "the first decision whose
// blocks name a beverage", and never a second guess of its own. The follow-up
// is the ONLY cash-bar rule; the engine has no separate bare-"Cash bar" tier.

export const BAR_COVER_ID = 'bar_cover';
export const NOTHING = 'Nothing — the bar is fully cash';

const CASH_PICK = /\bcash\b[^,;]*\bbar\b|\bbar\b[^,;]*\bcash\b/i;
// Part hosted, then cash: "Two drink tickets, then cash" (Gala) is a cash bar
// once the tickets are spent, so it raises the same follow-up (#220 Open,
// 11/22/2026). "Drink tickets / cash bar" already read as a cash bar.
const TICKETS_THEN_CASH = /\bdrink tickets?\b[^;]*\bcash\b/i;
const isCashPick = (o) => CASH_PICK.test(String(o)) || TICKETS_THEN_CASH.test(String(o));

// The approved sets (owner, 11/21/2026), by playbook type. Each line id must
// exist in that playbook's purchases (cashBarCover.test.js holds them to it).
const APPROVED = {
  'Engagement Party': [
    ['Ice and the zero-proof drinks', ['p_nonalc', 'p_ice']],
    ['The champagne toast, plus ice and zero-proof', ['p_champagne', 'p_nonalc', 'p_ice']],
    ['The signature cocktail, plus ice and zero-proof', ['p_signature', 'p_nonalc', 'p_ice']],
    [NOTHING, []],
  ],
  'Retirement Party': [
    ['Ice, coffee and the zero-proof drinks', ['p_nonalc', 'p_coffee', 'p_ice']],
    ['The champagne toast, plus ice, coffee and zero-proof', ['p_champagne', 'p_nonalc', 'p_coffee', 'p_ice']],
    ['The honoree’s favorite drink and the toast', ['p_champagne', 'p_fav_drink', 'p_nonalc', 'p_coffee', 'p_ice']],
    [NOTHING, []],
  ],
  'Holiday Party': [
    ['Mixers, ice, water and zero-proof', ['p_mixers', 'p_nonalc', 'p_water', 'p_ice']],
    ['A first round: the signature cocktail, plus mixers, ice and water', ['p_signature', 'p_mixers', 'p_nonalc', 'p_water', 'p_ice']],
    ['Water and coffee only', ['p_water', 'p_coffee']],
    [NOTHING, []],
  ],
};

const ALCOHOL = /\b(beer|wine|spirits?|liquor|whiskey|bourbon|vodka|rum|tequila|gin|champagne|prosecco|bubbly|cocktails?|mixers?|seltzer|alcohol|bar)\b/i;
const TOAST = /\b(champagne|sparkling|prosecco|toast)\b/i;

// Any other playbook: from its own drink lines. The non-alcoholic lines (and
// ice), the toast with them, and nothing. AN OPTION NAMES ONLY WHAT IT PRICES
// (#220 Open, 11/22/2026): the Gala has no ice line, and its set read "The
// non-alcoholic drinks and ice", so "and ice" is said only when an ice line is
// among them. A pick that hosts drink tickets before the cash bar adds one set:
// the tickets, poured from the playbook's own bar lines (not the toast).
function builtFrom(pb, parent) {
  const bev = (pb.purchases || []).filter((p) => p && p.category === 'beverage');
  const isAlcohol = (p) => ALCOHOL.test(`${p.item || ''} ${String(p.id || '').replace(/^p_/, '').replace(/_/g, ' ')}`);
  const plainLines = bev.filter((p) => !isAlcohol(p));
  const plain = plainLines.map((p) => p.id);
  const toast = bev.filter((p) => TOAST.test(`${p.item || ''} ${p.id || ''}`)).map((p) => p.id);
  const bar = bev.filter((p) => isAlcohol(p) && !toast.includes(p.id)).map((p) => p.id);
  const drinks = plainLines.some((p) => /\bice\b/i.test(p.item || '')) ? 'the non-alcoholic drinks and ice' : 'the non-alcoholic drinks';
  const out = [];
  if (plain.length) out.push([`The ${drinks.replace(/^the /, '')}`, plain]);
  if (toast.length) out.push([plain.length ? `The toast, plus ${drinks}` : 'The toast', [...toast, ...plain]]);
  if (bar.length && parent.picks.some((o) => TICKETS_THEN_CASH.test(String(o)))) {
    out.push([plain.length ? `The drink tickets, plus ${drinks}` : 'The drink tickets', [...bar, ...plain]]);
  }
  if (!out.length) return null;
  return [...out, [NOTHING, []]];
}

/**
 * The named drinks call, when it offers a cash/limited bar, and its cash picks
 * (`picks`, in option order; `pick` is the first) — or null.
 */
export function cashBarParent(pb) {
  const d = ((pb && pb.decisions) || []).find((x) => x && x.drinksCall === true);
  const picks = d ? (d.options || []).filter(isCashPick) : [];
  return picks.length ? { decision: d, pick: picks[0], picks } : null;
}

/** The option sets for this playbook: [[label, lineIds], …], or null. */
export function cashBarCoverSets(pb) {
  const parent = cashBarParent(pb);
  if (!parent) return null;
  return APPROVED[pb.type] || builtFrom(pb, parent);
}

/** The injected follow-up, shown only after the cash-bar pick. */
export function cashBarDecisionsFor(pb) {
  const parent = cashBarParent(pb);
  const sets = cashBarCoverSets(pb);
  if (!parent || !sets) return [];
  const options = sets.map(([label]) => label);
  return [{
    id: BAR_COVER_ID,
    ask: 'With a cash bar, what do you still put out?',
    label: 'What you still cover at a cash bar',
    options,
    default: options[0],
    defaultWhy: `${options[0]} is the default: guests buy their own drinks, and you keep something for the people who don’t drink. Change it to cover more, or nothing at all.`,
    when: parent.decision.when, dependsOn: [parent.decision.id],
    whenChoice: { id: parent.decision.id, in: parent.picks },
    blocks: ['beverage_purchases'],
    weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host',
    priorityBasis: { rationale: 'A cash bar moves most of the drinks bill to the guests; what the host still covers is the part of it that stays on the budget.', tier: 'reasoned' },
    why: 'Guests buy their own drinks at a cash bar. Pick what you still put out — the drinks line in your budget moves to match.',
    movesBudget: true,
  }];
}

/**
 * Which beverage lines the host buys under the cash-bar follow-up: a Set of
 * line ids, or null when no cash bar is picked (every line stays as before).
 * `pickOf(id)` is the plan's own pick reader (choicePickFor).
 */
export function cashBarKeeps(pb, pickOf) {
  const parent = cashBarParent(pb);
  const sets = cashBarCoverSets(pb);
  if (!parent || !sets) return null;
  if (!parent.picks.includes(pickOf(parent.decision.id))) return null;
  const chosen = pickOf(BAR_COVER_ID) || sets[0][0];
  const hit = sets.find(([label]) => label === chosen) || sets[0];
  return new Set(hit[1]);
}
