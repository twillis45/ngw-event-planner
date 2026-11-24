// ─── SEASONAL PLAN ACCURACY (11/20/2026) ─────────────────────────────────────
// Found while writing the Thanksgiving, Friendsgiving, holiday party and New
// Year's Eve guides from the live app. Hosts are using these plans this week
// (Thanksgiving is 11/26/2026), so each number below was read off the engine
// that prints it. One test per defect; each was watched failing on 3d491f2e
// before its fix.
import { routeByWords } from '../__fixtures__/stepByWords';
import {
  ALL_PLAYBOOKS, playbookFoodPlan, playbookRisks, playbookDecisionBoard, playbookChecklist,
} from '../playbooks';
import { attendanceClass, ATTENDANCE_CLASS_RULES } from '../attendanceModel';
import { OUTDOOR_TYPE } from '../placeIntelligence';
import { parseSmartEventText } from '../smartParseEvent';
import { checklistRouteFor } from '../taskRoute';
import { perUnitBand } from '../perUnitText';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { planHeroCopy } from '../planHeroCopy';
import { notIncludedFor, notIncludedSummary } from '../budgetEstimator';
import { SCHEDULE_WORD, THE_SCHEDULE } from '../scheduleWords';

const ev = (type, date, n, extra = {}) => ({
  id: 'x', type, date, guestMode: 'count', guestEstimate: n, guestCountSource: 'host',
  budget: [], vendors: [], guests: [], timeline: [], ...extra,
});
const TG = () => ev('Thanksgiving Hosting', '2026-11-26', 12);
const FG = () => ev('Friendsgiving', '2026-11-26', 15);
const HP = () => ev('Holiday Party', '2026-12-12', 25);
const NYE = () => ev("New Year's Eve Party", '2026-12-31', 20);
const line = (plan, id) => plan.list.find((l) => l.id === id);
const authored = (type, id) => ALL_PLAYBOOKS.find((p) => p.type === type).purchases.find((p) => p.id === id);

// ── 1 ──────────────────────────────────────────────────────────────────────
test('1 · corn is a side, not a dessert: "corn pudding" is savory', () => {
  for (const make of [TG, FG]) {
    const plan = playbookFoodPlan(make());
    expect(line(plan, 'p_corn').group).toBe('Food');
  }
  // Real desserts stay desserts — including the ones whose NAME is only
  // "Sweets" and whose parenthetical says pound cake and banana pudding.
  expect(line(playbookFoodPlan(TG()), 'p_pies').group).toBe('Dessert');
  for (const [type, id] of [['Card Party', 'p_dessert'], ['Housewarming', 'p_sweet'], ['Gender Reveal', 'p_pinkblue_treats'], ['Halloween Party', 'p_treats']]) {
    expect(line(playbookFoodPlan(ev(type, '2026-12-12', 30)), id).group).toBe('Dessert');
  }
  // Friendsgiving lists no dessert line, so it has no Dessert group at all
  // rather than one holding only corn.
  // MOVED 11/20/2026 (seasonalLeftovers fix 3): Friendsgiving now lists a
  // dessert line, so the Dessert group exists — and holds that line, not corn.
  const fgDessert = playbookFoodPlan(FG()).list.filter((l) => l.group === 'Dessert').map((l) => l.id);
  expect(fgDessert).toEqual(['p_dessert']);
});

// ── 2 ──────────────────────────────────────────────────────────────────────
test('2 · a holiday party is not a "day party": type matchers match whole words only', () => {
  expect(attendanceClass('Holiday Party')).toBe('rsvp_social');
  expect(OUTDOOR_TYPE.test('Holiday Party')).toBe(false);
  // Sized to the rsvp_social ceiling: 25 × 1.05 → 26, not 25 × 1.15 → 29.
  expect(playbookFoodPlan(HP()).guests).toBe(26);
  // The guard for the whole class: every match of every type rule, on every
  // one of the 47 type names, starts and ends on a word boundary.
  const rules = [...ATTENDANCE_CLASS_RULES.map(([re]) => re), OUTDOOR_TYPE];
  const bad = [];
  for (const { type } of ALL_PLAYBOOKS) {
    for (const re of rules) {
      const m = type.match(re);
      if (!m) continue;
      const s = m.index; const e = s + m[0].length;
      const okL = s === 0 || /\W/.test(type[s - 1]);
      const okR = e === type.length || /\W/.test(type[e]);
      if (!okL || !okR) bad.push(`${type} ⊃ "${m[0]}"`);
    }
  }
  expect(bad).toEqual([]);
});

// ── 3 ──────────────────────────────────────────────────────────────────────
test('3 · drink prices: a zero-proof option does not make a party dry, and the bar tier never reprices water or coffee', () => {
  // NYE's default toast names a zero-proof sparkler AND sparkling wine. Its own
  // authored costFactors give the default no multiplier, so the cited band stands.
  const nye = playbookFoodPlan(NYE());
  const bubbles = line(nye, 'p_bubbles');
  expect([bubbles.perUnitLow, bubbles.perUnitHigh]).toEqual(authored("New Year's Eve Party", 'p_bubbles').unitCostRange);
  expect(line(nye, 'p_bar').perUnitLow).toBe(authored("New Year's Eve Party", 'p_bar').unitCostRange[0]);

  const hp = playbookFoodPlan(HP());
  for (const id of ['p_water', 'p_coffee', 'p_nonalc']) {
    const l = line(hp, id);
    expect([l.perUnitLow, l.perUnitHigh]).toEqual(authored('Holiday Party', id).unitCostRange);
    expect(l.costFactorApplied).toBeNull();
  }
  // A full bar prices the bar lines at their cited bands (owner ruling,
  // 11/21/2026: the ×1.6 had no source); theBarPricesAtItsCitedRanges holds it.
  const wine = line(hp, 'p_wine');
  expect([wine.perUnitLow, wine.perUnitHigh]).toEqual(authored('Holiday Party', 'p_wine').unitCostRange);
  expect(wine.costFactorApplied).toBeNull();

  // No multiplier at all now (11/21/2026, owner ruling "Apply all but leave
  // crab"): The Cookout's full bar was ×1.4 on the grown-folks line; it buys
  // its punch as its own line instead, and the grown-folks line keeps its band.
  const cookPlan = (pick) => playbookFoodPlan(ev('The Cookout', '2026-12-12', 30, pick ? { foodChoices: { drinks: pick } } : {}));
  expect(line(cookPlan(), 'p_grown_folks').perUnitLow).toBe(authored('The Cookout', 'p_grown_folks').unitCostRange[0]);
  expect(line(cookPlan('Full bar + punch'), 'p_grown_folks').perUnitLow).toBe(authored('The Cookout', 'p_grown_folks').unitCostRange[0]);
  expect(line(cookPlan('Full bar + punch'), 'p_punch').costFactorApplied).toBeNull();
  expect(line(cookPlan(), 'p_punch')).toBeUndefined();

  // A party that IS dry buys no bar (owner approval, 11/21/2026: the ×0.6 is
  // gone, and the wine leaves the list the way BYOB's drinks do); its water
  // still prices at the cited band. aDryPartyBuysNoBar holds the rest.
  const dry = playbookFoodPlan(ev('Dinner Party', '2026-12-12', 10, { foodChoices: { alcohol: 'Zero-proof / dry' } }));
  expect(line(dry, 'p_wine')).toBeUndefined();
  expect(line(dry, 'p_water').costFactorApplied).toBeNull();
});

// ── 4 ──────────────────────────────────────────────────────────────────────
test('4 · "New Year\'s Eve party" names a holiday, not an honoree', () => {
  const p = parseSmartEventText("New Year's Eve party December 31 for 20");
  expect(p.type).toBe("New Year's Eve Party");
  expect(p.honoree).toBeNull();
  expect(p.guests).toBe(20);
  // A real person's possessive still lands.
  expect(parseSmartEventText("Steve's New Year's Eve party for 20").honoree).toBe('Steve');
});

// ── 5 ──────────────────────────────────────────────────────────────────────
test('5 · each checklist row opens the surface that does its job', () => {
  const tg = TG();
  const rows = playbookChecklist(tg, '2026-11-20');
  const find = (re) => rows.find((r) => re.test(r.task));
  const route = (r) => routeByWords(r.task, { taskId: r.id, week: r.week, category: r.category }, tg);

  const turkey = route(find(/^Order the turkey/));
  expect(turkey.route).toEqual({ tab: 'Planning', focusField: 'food-plan' });
  const invite = route(find(/^Invite everyone/));
  expect(invite.route).toEqual({ focusField: 'guests-invites' });

  // The rule, across every playbook: a planning row is never sent to the
  // day-of schedule, and "vegetable" is not a table.
  const offenders = [];
  for (const pb of ALL_PLAYBOOKS) {
    const e = ev(pb.type, '2026-12-31', 20);
    for (const r of playbookChecklist(e, '2026-10-01')) {
      const hit = routeByWords(r.task, { taskId: r.id, week: r.week, category: r.category }, e);
      if (r.category === 'planning' && hit && hit.route && hit.route.tab === 'Event Day Schedule' && !new RegExp(`${THE_SCHEDULE}|${SCHEDULE_WORD}|order of events|oven map|agenda|daily flow|vows?|readings?`, 'i').test(r.task)) {
        offenders.push(`${pb.type}: ${r.task.slice(0, 60)}`);
      }
    }
  }
  expect(offenders).toEqual([]);
  expect(routeByWords('Simmer the carcass with the vegetable ends into stock', { category: 'planning' }, tg)).toBeNull();
});

// ── 6 ──────────────────────────────────────────────────────────────────────
test('6 · shopping list wording: units pluralize as units, countable things are whole', () => {
  const tg = playbookFoodPlan(TG());
  expect(line(tg, 'p_stuffing').unit).toBe('cups cooked');
  expect(line(tg, 'p_mac').unit).toBe('lbs dry pasta');
  expect(line(tg, 'p_rolls').qty).toBe(20);            // 1.5 × 13 = 19.5 → 20 rolls
  expect(line(tg, 'p_turkey').qty).toBe(19.5);         // a weight stays a weight
  // Was 39 bites: the grazing line is now one cheese tray, with its crackers,
  // nuts and crudité as their own lines (owner ruling 11/23/2026, split lines).
  expect(line(tg, 'p_appetizers').qty).toBe(1);
  expect(line(tg, 'p_appetizers_nuts').qty).toBe(6.5);  // a weight: 0.5 oz × 13
  const nye = playbookFoodPlan(NYE());
  expect(line(nye, 'p_flutes').qty).toBe(26);           // 1.2 × 21 = 25.2 → 26 flutes
  const hp = playbookFoodPlan(HP());
  expect(line(hp, 'p_beer').qty).toBe(42);              // 1.6 × 26 = 41.6 → 42 cans
  expect(line(hp, 'fa-catering').unit).toBe('guests');
  // The per-unit rate names ONE unit.
  expect(perUnitBand(0.3, 0.8, 'rolls')).toBe('$0.30–$0.80/roll');
  expect(perUnitBand(0.75, 2, 'cups')).toBe('$0.75–$2/cup');
  expect(perUnitBand(6, 20, 'pie per 6 guests')).toBe('$6–$20/pie');
  expect(perUnitBand(13, 40, 'bottle per 4 guests')).toBe('$13–$40/bottle');
  expect(perUnitBand(0.2, 0.4, 'lb')).toBe('$0.20–$0.40/lb');
  expect(perUnitBand(0.2, 0.4, 'glass')).toBe('$0.20–$0.40/glass');
});

// ── 7 ──────────────────────────────────────────────────────────────────────
test('7 · Thanksgiving\'s default split puts the sides and pies on the guests, at $0 to the host', () => {
  const plan = playbookFoodPlan(TG());
  const guestsBring = ['p_potatoes', 'p_cranberry', 'p_green_beans', 'p_sweet_potatoes', 'p_mac', 'p_corn', 'p_roast_veg', 'p_pies'];
  for (const id of guestsBring) {
    const l = line(plan, id);
    expect(l.broughtByCommunity).toBe(true);
    expect(l.broughtByLabel).toBe('Your guests');
    expect([l.low, l.high]).toEqual([0, 0]);
  }
  // The decision's own words: "keeps turkey, gravy, and stuffing with you".
  for (const id of ['p_turkey', 'p_gravy', 'p_stuffing']) expect(line(plan, id).high).toBeGreaterThan(0);
  const sum = (k) => plan.list.filter((l) => l.group !== 'Supplies' && !l.excludeFromFoodTotal).reduce((s, l) => s + l[k], 0);
  expect(plan.foodHigh).toBe(Math.max(0, Math.round(sum('high') / 5) * 5));
  // Cooking it all still prices every dish to the host.
  const all = playbookFoodPlan({ ...TG(), foodChoices: { hosting_model: 'Host cooks the whole meal' } });
  expect(line(all, 'p_pies').high).toBeGreaterThan(0);
});

// ── 8 ──────────────────────────────────────────────────────────────────────
test('8 · the board\'s "N left" counts the list the host actually shops', () => {
  const e = FG();
  const plan = playbookFoodPlan(e);
  const shopping = deriveEventPhaseProgress(e, new Date('2026-11-20T15:00:00Z')).items.find((i) => i.id === 'shopping');
  expect(shopping.cueLabel).toBe(`Buy the remaining items · ${plan.shoppingCount} left`);
  // 11 until 11/23/2026, when the owner's ruling split the combined lines one
  // line per product: gravy 1→3, rolls 1→2, snacks 1→3, drinks 1→2, labels
  // 1→2, plates-cups-napkins-spoons 1→4, cleanup 1→3. Each is its own buy.
  expect(plan.shoppingCount).toBe(23);
});

// ── 9 ──────────────────────────────────────────────────────────────────────
test('9 · the turkey-fryer risk shows only when the turkey is fried', () => {
  const ids = (e) => ((playbookRisks(e) || {}).items || []).map((r) => r.id);
  expect(ids(TG())).not.toContain('r_fryer');
  expect(ids({ ...TG(), foodChoices: { turkey_method: 'Deep-fried outside' } })).toContain('r_fryer');
  // General kitchen-fire risk content stays: the frozen-bird risk is unconditional.
  expect(ids(TG())).toContain('r_frozen');
});

// ── 10 ─────────────────────────────────────────────────────────────────────
test('10 · the budget\'s "leaves out" line names only things on that type\'s own list', () => {
  for (const { type } of ALL_PLAYBOOKS) {
    for (const isDestination of [false, true]) {
      const lines = notIncludedFor(type, { isDestination });
      const s = notIncludedSummary(lines);
      if (!lines.length) { expect(s).toBeNull(); continue; }
      const named = (s.match(/— (.+) among them$/) || [])[1];
      expect(named).toBeTruthy();
      for (const part of named.split(' and ')) {
        expect(lines.some((l) => l.toLowerCase().startsWith(part.toLowerCase()))).toBe(true);
      }
    }
  }
  expect(notIncludedSummary(notIncludedFor('Board Meeting'))).not.toMatch(/gift|cake/i);
});

// ── 12 ─────────────────────────────────────────────────────────────────────
test('12 · a decision authored as a question keeps its question mark', () => {
  const board = playbookDecisionBoard(TG(), '2026-11-20');
  const row = [...board.open, ...board.locked].find((r) => r.id === 'hosting_model');
  expect(row.title).toBe('Are you cooking the whole meal, or is it a potluck?');
  // And the hero's "Settle: …" keeps the author's mark instead of a period.
  // (Six days out from today, so the T-21 calls are overdue whenever this runs.)
  const d = new Date(); d.setDate(d.getDate() + 6);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hero = planHeroCopy({ ...TG(), date: iso });
  expect(hero.title).toBe('Settle: Are you cooking the whole meal, or is it a potluck?');
});
