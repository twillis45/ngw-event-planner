// ─── SEASONAL LEFTOVERS (11/20/2026) ─────────────────────────────────────────
// Six accuracy defects the seasonal-accuracy pass (seasonalPlanAccuracy.test.js)
// found while writing the Thanksgiving, Friendsgiving, holiday party and New
// Year's Eve guides, and left out of its scope. One test per defect; each was
// watched failing on 145d08fc before its fix.
import { ALL_PLAYBOOKS, playbookFoodPlan, playbookRisks, playbookDayOfChecklist } from '../playbooks';
import { notIncludedFor, notIncludedSummary } from '../budgetEstimator';
import { budgetFamilyForType } from '../budgetEstimator/confidence';
import { resolveCanonicalType } from '../eventTaxonomyAdapter';
import { COST_SOURCES } from '../knowledge/costProvenance';
import { FIRE_SAFETY_SOURCES } from '../knowledge/fireSafetyContext';
import { checklistRouteFor } from '../taskRoute';

const ev = (type, date, n, extra = {}) => ({
  id: 'x', type, date, guestMode: 'count', guestEstimate: n, guestCountSource: 'host',
  budget: [], vendors: [], guests: [], timeline: [], ...extra,
});
const TG = () => ev('Thanksgiving Hosting', '2026-11-26', 12);
const FG = (extra) => ev('Friendsgiving', '2026-11-26', 15, extra);
const HP = (extra) => ev('Holiday Party', '2026-12-12', 25, extra);
const line = (plan, id) => plan.list.find((l) => l.id === id);
const pb = (type) => ALL_PLAYBOOKS.find((p) => p.type === type);

// ── 1 ──────────────────────────────────────────────────────────────────────
test('1 · a holiday party\'s "leaves out" line is true for a party at home', () => {
  // Classed with the other hosted holidays, not with conferences.
  for (const type of ['Thanksgiving Hosting', 'Friendsgiving', "New Year's Eve Party", 'Holiday Party']) {
    expect(budgetFamilyForType(type)).toBe('home_hosted');
  }
  const lines = notIncludedFor('Holiday Party');
  expect(lines.join(' ')).not.toMatch(/employee|per diem|speaker|talent|swag|\bAV\b|overtime/i);
  expect(notIncludedSummary(lines)).not.toMatch(/employee|speaker|talent/i);
  // The playbook says the same family the taxonomy does.
  expect(pb('Holiday Party').family).toBe('home_hosted');
  // THE TYPE CANNOT TELL AN OFFICE PARTY FROM A HOME ONE: "office party" and
  // "company party" resolve to this same type, so the list it gets has to be
  // true for both — and no line on it is about a home only.
  expect(resolveCanonicalType('office party')).toBe('Holiday Party');
  expect(resolveCanonicalType('company party')).toBe('Holiday Party');
  expect(lines.join(' ')).not.toMatch(/\byour home\b|\bat home\b|\bhouse\b/i);
  // Real corporate types keep the corporate list.
  for (const type of ['Board Meeting', 'Conference', 'Product Launch']) {
    expect(notIncludedFor(type).join(' ')).toMatch(/Employee travel/);
  }
});

// ── 2 ──────────────────────────────────────────────────────────────────────
test('2 · a holiday party has its own day-of list: the bar and the rides home', () => {
  const list = playbookDayOfChecklist(HP());
  expect(list.isDefault).toBe(false);
  const ids = list.items.map((i) => i.id);
  expect(ids).toEqual(expect.arrayContaining(['bar', 'rides']));
  expect(list.count).toBeGreaterThanOrEqual(3);
  expect(list.count).toBeLessThanOrEqual(5);
  // No statistic rides in on a day-of row: no row carries a source, so no row
  // carries a number.
  for (const i of list.items) expect(`${i.label} ${i.detail}`).not.toMatch(/\d/);
  // A dry party has no bar to watch and no one impaired to drive home.
  const dry = playbookDayOfChecklist(HP({ foodChoices: { alcohol_service: 'Zero-proof / dry' } }));
  expect(dry.items.map((i) => i.id)).not.toEqual(expect.arrayContaining(['bar']));
  expect(dry.items.map((i) => i.id)).not.toContain('rides');
  expect(dry.count).toBeGreaterThanOrEqual(1);
});

// ── 3 ──────────────────────────────────────────────────────────────────────
test('3 · Friendsgiving lists a dessert, and a friend brings it', () => {
  const plan = playbookFoodPlan(FG());
  const d = line(plan, 'p_dessert');
  expect(d).toBeTruthy();
  expect(d.group).toBe('Dessert');
  expect(d.friendBrings).toBe(true);
  expect(d.broughtByLabel).toBe('Your friends');
  expect([d.low, d.high]).toEqual([0, 0]);
  // Not the host's to buy, so the "N left" count does not move (11 before).
  expect(plan.shoppingCount).toBe(11);
  // "Host cooks most of it — friends bring drinks and dessert" says so itself.
  const hostCooks = playbookFoodPlan(FG({ foodChoices: { hosting_model: 'Host cooks most of it — friends bring drinks and dessert' } }));
  expect(line(hostCooks, 'p_dessert').friendBrings).toBe(true);
  // Ordered in: the caterer path, no dishes arrive — the same as the sides.
  const ordered = playbookFoodPlan(FG({ foodChoices: { hosting_model: 'Ordered in — a restaurant or caterer cooks, the group splits the bill' } }));
  expect(line(ordered, 'p_dessert')).toBeUndefined();
  // Thanksgiving keeps its one pie line and gains no second dessert.
  const tg = playbookFoodPlan(TG());
  expect(tg.list.filter((l) => l.group === 'Dessert').map((l) => l.id)).toEqual(['p_pies']);
});

// ── 4 ──────────────────────────────────────────────────────────────────────
test('4 · a source\'s name says what is at its URL', () => {
  // wine-statewide-2026: the URL is Today's Homeowner's state-by-state page
  // (fetched 11/20/2026). The Tablas Creek rebuttal and the $56.78 figure are
  // not on it, and neither are a ~$14 national average or category bands.
  const wine = COST_SOURCES['wine-statewide-2026'];
  expect(wine.url).toMatch(/todayshomeowner\.com/);
  expect(`${wine.org} ${wine.claim}`).not.toMatch(/Tablas|56\.78|around \$14|jug/i);
  expect(wine.claim).toMatch(/\$10\.97/);
  expect(wine.claim).toMatch(/\$15\.51/);
  // bbq-perpound-2026: the URL is Q Southern BBQ's by-the-pound page. A second
  // publisher named in the title needs its own URL; Jim 'N Nick's had none.
  const bbq = COST_SOURCES['bbq-perpound-2026'];
  expect(bbq.url).toMatch(/qsouthernbbq\.com/);
  expect(bbq.org).toMatch(/^Q Southern/);
  expect(bbq.org).not.toMatch(/both fetched/i);
  expect(!!bbq.corroboratingUrl || !/Jim 'N Nick/.test(bbq.org)).toBe(true);
});

// ── 5 ──────────────────────────────────────────────────────────────────────
test('5 · the candle risk cites NFPA, and every number in it is in the source', () => {
  const raw = pb('Holiday Party').risks.find((r) => r.id === 'r_candles');
  expect(raw.sources).toEqual(['nfpa-candles-2026']);
  const src = FIRE_SAFETY_SOURCES['nfpa-candles-2026'];
  expect(src.url).toMatch(/^https:\/\/www\.nfpa\.org\//);
  const shown = playbookRisks(HP()).items.find((r) => r.id === 'r_candles').mitigation;
  const nums = shown.match(/\d[\d,]*/g) || [];
  for (const n of nums) expect(src.claim).toContain(n);
});

// ── 6 ──────────────────────────────────────────────────────────────────────
test('6 · building a playlist has nowhere in the app to go, so it gets no button', () => {
  const hp = HP();
  expect(checklistRouteFor('Build a 4-hour festive playlist (arrival → peak → wind-down) or brief the DJ', { category: 'planning' }, hp)).toBeNull();
  expect(checklistRouteFor('Build a playlist celebrating Black artists (blues, soul, funk)', { category: 'planning' }, hp)).toBeNull();
  // A row that leads with booking or briefing the DJ is still vendor work.
  const vendor = (t) => (checklistRouteFor(t, { category: 'planning' }, hp) || {}).route;
  expect(vendor('Book the DJ or build the playlist (old-school R&B, line dances)')).toEqual(expect.objectContaining({ tab: 'Vendors' }));
  expect(vendor('Brief DJ on theme, must-play/do-not-play list, MC duties')).toEqual(expect.objectContaining({ tab: 'Vendors' }));
});
