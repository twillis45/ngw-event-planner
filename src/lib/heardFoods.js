// ─── Foods the host named ────────────────────────────────────────────────────
// Gold run (GOLD-05, 11/5/2026): "burgers and hot dogs" were reported as
// "didn't make it into the plan" on a cookout whose plan already had them, and
// on any other event a named dish was simply lost. Conservative on purpose: a
// short list of dishes people actually write, each with the words that mean it
// on a plan line. A clause that rules a food out ("no pizza") is skipped.
const FOODS = [
  ['Burgers', /\b(?:ham|cheese)?burgers?\b/i, /burger/i],
  ['Hot dogs', /\bhot\s?dogs?\b|\bfranks\b/i, /hot\s?dog|frank|wiener/i],
  ['Ribs', /\bribs\b/i, /\bribs?\b/i],
  ['Wings', /\bwings\b/i, /\bwings?\b/i],
  ['Brisket', /\bbrisket\b/i, /brisket/i],
  ['Pulled pork', /\bpulled\s+pork\b/i, /pulled pork|pork shoulder/i],
  ['Fried chicken', /\bfried\s+chicken\b/i, /fried chicken/i],
  ['Tacos', /\btacos?\b/i, /taco/i],
  ['Pizza', /\bpizzas?\b/i, /pizza/i],
  ['Chili', /\bchili\b/i, /chili/i],
  ['Crabs', /\bcrabs\b/i, /\bcrabs?\b/i],
  ['Shrimp', /\bshrimp\b/i, /shrimp/i],
  ['Mac and cheese', /\bmac\s*(?:and|&|n['’]?)\s*cheese\b/i, /mac\s*(?:and|&|n)\s*cheese/i],
  ['Potato salad', /\bpotato\s+salad\b/i, /potato salad/i],
  ['Cornbread', /\bcornbread\b/i, /cornbread/i],
  ['Cake', /\bcakes?\b/i, /\bcake/i],
  ['Cupcakes', /\bcupcakes\b/i, /cupcake/i],
  ['Cookies', /\bcookies\b/i, /cookie/i],
  ['Lasagna', /\blasagna\b/i, /lasagna/i],
  // "drinks" (run 2, R2-14): Vida's game night listed it under "didn't make it
  // into the plan" while the plan carried soda, water, beer and wine. Any drink
  // line covers it; a plan with none gets a host-named "Drinks" line.
  ['Drinks', /\b(?:drinks|beverages|refreshments)\b/i, /drink|beverage|soda|water|juice|punch|lemonade|tea\b|coffee|beer|wine|cocktail|mocktail|bar\b/i],
];
const NEGATED = /\b(?:no|without|skip|not|instead of)\b/i;

/** [{ name, onPlan }] in the order she wrote them; each food at most once. */
export function heardFoods(text) {
  const clauses = String(text || '').split(/[,;.]|\binstead\b/i).map((c) => c.trim()).filter(Boolean);
  const out = [];
  for (const clause of clauses) {
    const hits = FOODS
      .map(([name, said, onPlan]) => ({ name, onPlan, at: clause.search(said) }))
      .filter((f) => f.at >= 0)
      .sort((a, b) => a.at - b.at);
    for (const f of hits) {
      if (NEGATED.test(clause.slice(0, f.at))) continue;
      if (!out.some((o) => o.name === f.name)) out.push({ name: f.name, onPlan: f.onPlan });
    }
  }
  return out;
}

/** The heard foods no line of the plan already carries. */
export function uncoveredFoods(heard, planItems) {
  // A playbook line names itself in `item`; a host-added one in `name`.
  const names = (planItems || []).map((it) => String((it && (it.item || it.name || it.label)) || ''));
  return (heard || []).filter((f) => !names.some((n) => f.onPlan.test(n)));
}

/**
 * The plan line a host-added item already looks like (run 2, R2-21: "Ice" was
 * added beside "Ice (coolers + drinks)" with no word). Every word of what she
 * typed must appear as a whole word in the line; null when nothing matches.
 * Flagged, never refused — a second bag of ice can be on purpose.
 */
export function similarPlanLine(name, planItems) {
  const words = String(name || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  if (!words.length || words.join('').length < 3) return null;
  for (const it of planItems || []) {
    const label = String((it && (it.item || it.name || it.label)) || '');
    const low = label.toLowerCase();
    if (words.every((w) => new RegExp('\\b' + w + 's?\\b').test(low))) return label;
  }
  return null;
}
