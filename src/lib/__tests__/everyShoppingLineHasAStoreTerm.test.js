// ─── EVERY SHOPPING LINE HAS A STORE SEARCH TERM, OR A REASON IT CANNOT ──────
//
// Owner, 11/23/2026, Thanksgiving at a Harris Teeter: "9 of 12 found". The
// store lookup (lib/storePrices → POST /api/shopping/kroger/search-list) sends
// each line's curated term from knowledge/storeUnitMap, else the line's whole
// sentence, and the backend takes Kroger's first product for it. Probed live at
// Harris Teeter The Yards (DC) the same day: every Thanksgiving line WITH a term
// matched; every line without one missed except "Dinner rolls & butter". The
// turkey line had a term in Friendsgiving's wording ("or a breast") and none in
// Thanksgiving's ("or breast"): an exact-text key, one word of drift.
//
// WHAT THE SHELL SENDS (HostShellV2, the store picker): `foodPlan.list`, minus
// skipped lines and dishes someone else brings, as `{ name: it.item, id }`.
// `playbookFoodPlan` builds that list from a playbook's food and beverage
// purchases (gated by the host's picks and the region) plus its essential
// supplies, cleanup and logistics lines. So the census walks every playbook at
// its default picks and at each single pick of each decision, and adds the
// region-gated food lines (Juneteenth's DC half-smokes) the default misses.
// Host-added dishes are the host's own words and are not ours to curate.
import { playbookFoodPlan, ALL_PLAYBOOKS } from '../playbooks';
import { storeSearchTerm, noStoreTermReason, NO_STORE_TERM, TERM_BY_ID } from '../knowledge/storeUnitMap';

const corpusLines = () => {
  const seen = new Map();
  const add = (type, l) => {
    if (!l || !l.id || !l.item || l.added) return;
    const k = `${l.id}\u0000${String(l.item).trim()}`;
    if (!seen.has(k)) seen.set(k, { id: l.id, item: String(l.item).trim(), types: new Set() });
    seen.get(k).types.add(type);
  };
  for (const pb of ALL_PLAYBOOKS) {
    const base = { id: 'x', type: pb.type, date: '2026-11-26', guestMode: 'count', guestCount: 20, guests: [], dietCounts: { Vegetarian: 2 } };
    const plans = [playbookFoodPlan(base)];
    for (const d of (pb.decisions || [])) {
      for (const o of (d.options || [])) {
        const pick = typeof o === 'string' ? o : (o && (o.label || o.value));
        if (pick) plans.push(playbookFoodPlan({ ...base, foodChoices: { [d.id]: pick } }));
      }
    }
    for (const fp of plans) for (const l of ((fp && fp.list) || [])) add(pb.type, l);
    for (const p of (pb.purchases || [])) if (p && (p.category === 'food' || p.category === 'beverage')) add(pb.type, p);
  }
  return [...seen.values()];
};
const LINES = corpusLines();

test('(premise) the census reaches the corpus, the vegetarian main and the region-gated lines', () => {
  expect(LINES.length).toBeGreaterThan(500);
  expect(LINES.some((l) => l.id === 'p_turkey' && l.types.has('Thanksgiving Hosting'))).toBe(true);
  expect(LINES.some((l) => l.id === 'p_halfsmokes')).toBe(true);
  expect(LINES.some((l) => l.id === 'diet-veg')).toBe(true);
});

test('EVERY line the store lookup sends has a curated term, or a written reason it has none', () => {
  // Fails with the worklist: each line by playbook, id and text.
  const missing = LINES
    .filter((l) => !storeSearchTerm(l) && !noStoreTermReason(l))
    .map((l) => `${[...l.types].join(', ')} · ${l.id} · ${l.item}`);
  expect(missing).toEqual([]);
});

test('a line is never both: an exclusion means no term, and the reason is a sentence', () => {
  const both = LINES.filter((l) => storeSearchTerm(l) && noStoreTermReason(l)).map((l) => `${l.id} · ${l.item}`);
  expect(both).toEqual([]);
  for (const [k, why] of Object.entries(NO_STORE_TERM)) expect(`${k}: ${why}`).toMatch(/: .{12,}/);
});

test('no stale entry: every exclusion and every id-wide term names a line that exists', () => {
  const ids = new Set(LINES.map((l) => l.id));
  const keys = new Set(LINES.map((l) => `${l.id}\u0000${l.item}`));
  expect(Object.keys(NO_STORE_TERM).filter((k) => !(k.includes('\u0000') ? keys.has(k) : ids.has(k)))).toEqual([]);
  expect(TERM_BY_ID.map((e) => e.id).filter((id) => !ids.has(id))).toEqual([]);
});

// ── A TERM KEYED BY ID MUST STILL FIT THE LINE ────────────────────────────────
// An id-wide term reaches every line under that id, including one added later
// to another playbook under a reused id. So every term must name something its
// line says: a word of the term starts, or is started by, a word of the item
// ("frozen whole turkey" / "Turkey (whole bird…)"). Two lines are waived, each
// because the line names its product without the word.
const WAIVED = {
  'p_wine\u0000A bottle brought for the table (corkage confirmed first)': 'the id and "corkage" make it wine; the line never says the word',
  'p_nonalc\u0000Zero-proof drinks for the reception and the tables': 'names no product; sparkling water is the plainest zero-proof drink',
};
const words = (s) => (String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]+/g) || [])
  .filter((w) => w.length >= 3).map((w) => w.replace(/s$/, ''));
test('every term names something its line says (the guard on an id-wide term)', () => {
  const off = LINES.filter((l) => {
    const t = storeSearchTerm(l);
    if (!t || WAIVED[`${l.id}\u0000${l.item}`]) return false;
    const tw = words(t); const iw = words(l.item);
    return !tw.some((a) => iw.some((b) => a.startsWith(b) || b.startsWith(a)));
  }).map((l) => `${l.id} · ${l.item} → "${storeSearchTerm(l)}"`);
  expect(off).toEqual([]);
});

describe('rewording a line keeps its term (the drift that cost the turkey)', () => {
  test('Thanksgiving Hosting\'s turkey, in its own words, searches for a whole turkey', () => {
    expect(storeSearchTerm({ id: 'p_turkey', item: 'Turkey (whole bird, or breast for a small table)' })).toBe('frozen whole turkey');
    expect(storeSearchTerm({ id: 'p_turkey', item: 'Turkey (whole bird, or a breast for a small table)' })).toBe('frozen whole turkey');
  });

  test('a Thanksgiving or Friendsgiving line whose id carries a term keeps one through an edit to its text', () => {
    // Kept, not necessarily identical: "Corn (frozen or canned kernels…)" has its
    // own exact term (frozen corn) over the id's corn on the cob, and a reworded
    // line falls back to the id's. Ids with no id-wide term (p_potatoes, shared
    // with "Small red potatoes") lose it, and the census above names the line.
    const tg = LINES.filter((l) => l.types.has('Thanksgiving Hosting') || l.types.has('Friendsgiving'));
    const lost = tg.filter((l) => storeSearchTerm(l) && TERM_BY_ID.some((e) => e.id === l.id)
      && !storeSearchTerm({ id: l.id, item: `${l.item} (reworded)` })).map((l) => l.id);
    expect(lost).toEqual([]);
    expect(tg.filter((l) => storeSearchTerm(l) && TERM_BY_ID.some((e) => e.id === l.id)).length).toBeGreaterThan(40);
  });

  test('an id reused for different products keys on the text, so it can never take a neighbor\'s term', () => {
    // p_drinks is sparkling water at Friendsgiving and beer at The Cookout's
    // Get-Together: no id-wide term, so a reworded p_drinks line has none and
    // the census above fails on it instead of searching for the wrong drink.
    expect(TERM_BY_ID.some((e) => e.id === 'p_drinks')).toBe(false);
    expect(storeSearchTerm({ id: 'p_drinks', item: 'Beer, soda & water' })).toBe('beer');
    expect(storeSearchTerm({ id: 'p_drinks', item: 'Sparkling water (the host\'s alcohol-free share)' })).toBe('sparkling water');
    expect(storeSearchTerm({ id: 'p_drinks', item: 'Something new' })).toBe(null);
  });
});
