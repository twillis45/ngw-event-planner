// RE-AUDIT F5 + F6 + F7 (fresh-eyes, 2026-07-14) — the merge gets a spine.
//
// F5 — CALM FILLER BESIDE REAL WORK. The ladder ALWAYS returns something; its calm
//   tiers ('neutral', 'calendar', 'heart') exist to fill an EMPTY list, not to compete
//   in a full one. Merged ahead of real items they produced the live absurdity:
//   "2 things need you · first: Event on track. Nothing urgent right now."
//   The rule these tests pin: a filler's entire claim is that nothing else is open —
//   so the moment anything else IS open, every filler leaves. When ONLY fillers
//   exist, exactly one survives (the calm state, said once).
//
// F6 — SEVERITY WAS SPLICE POSITION, NOT A COMPUTED ORDER. Registry criticals were
//   hand-spliced ahead, but nothing guaranteed a critical from ANY producer beats a
//   non-critical from ANY other. The list is now banded — critical (0) → real work
//   (1) → calm (2) — with a stable sort, so each producer's internal ranking
//   survives within a band.
//
// F7 — THE DEAD SNOOZE CAP. lib/snooze.js proposedSnoozeDays caps a snooze at the
//   item's own lead window (opts.leadDays) — and the top action NEVER carried a real
//   leadDays, so the cap never bound where it matters most. The overdue-decision
//   tier now threads taskLeadDays through the projection and the topAction rebuild.

import { eventPlan } from '../../CommandCenter';
import { playbookFoodPlan, playbookRisks } from '../playbooks';

const CALM = new Set(['neutral', 'calendar', 'heart']);

// LOCAL date, not UTC — same helper discipline as lifecycleVerdictAgreement.test.js
// (toISOString drifts a day every evening after UTC midnight).
const iso = (n) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// All four foundations set (date, guests, budget, food) — but an open phase item:
// an outdoor crab feast with NO rain plan. The oneAttentionLedger fixture shape.
const feastNoRain = (over = {}) => ({
  id: 'band-1', type: 'Crab Feast', name: 'My Crab Feast',
  date: iso(21), venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  guestMode: 'count', guestCount: 18, guestEstimate: 18,
  totalBudget: 1500,
  foodChoices: {
    steam_vs_order: 'Order steamed for pickup',
    crab_size: 'Large Males ($72–98/dz)',
    where_buy: 'Local crab house',
    dietary: 'Shellfish',
  },
  rainPlan: '',
  vendors: [], guests: [],
  ...over,
});

// Two overdue tasks, mild one listed first — the attentionRanksAndLands shape.
// 'bad' (leadDays -60) must win the critical tier AND carry its lead through.
const evOverdueDecisions = () => ({
  id: 'band-2', type: 'Crab Feast', name: 'Feast', date: iso(2),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1200,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  vendors: [], guests: [],
  timeline: [
    { id: 'mild', task: 'Buy the Old Bay', leadDays: -3, done: false },
    { id: 'bad', task: 'Pre-order the crabs', leadDays: -60, done: false },
  ],
});

// A retirement party where every planning ESSENTIAL is handled — date, start time,
// venue, rain, headcount, budget, menu decided, vendor confirmed with a contract file
// on record — and a must-have moment is captured but unscheduled. This is the fixture
// that makes the ladder demonstrably fall to the 'heart' filler (pp.nextCue is null):
// the calm-alone test below proves it by settling the registry too and finding the
// heart action as the ONLY survivor. `settled: true` additionally dismisses the
// playbook's high risks, so the surface registry raises nothing.
const quietRetirement = ({ settled = false } = {}) => {
  const base = {
    id: 'band-3', recordKind: 'host_event', type: 'Retirement Party', name: 'Ret',
    date: iso(40), startTime: '14:00',
    venueKind: 'venue', venue: 'The Ironwood Room', venueCity: 'Annapolis', venueState: 'MD',
    rainPlan: 'Indoors — the Ironwood Room is covered.',
    guestMode: 'count', guestCount: 40, totalBudget: 8000, dietaryNoted: true,
    must_have_moment: 'The toast from her old unit.',
    budget: [{ id: 'b1', category: 'Venue', budgeted: 3000, actual: 3000 }],
    timeline: [], guests: [],
    vendors: [{
      id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Confirmed',
      contractSigned: true, contractFileName: 'contract.pdf',
    }],
  };
  // Same discipline as lifecycleVerdictAgreement's readyButOverdue: the Food essential
  // means the menu is DECIDED, so a genuinely calm event has made its picks.
  const fp = playbookFoodPlan(base);
  const foodChoices = {};
  (fp && fp.choices ? fp.choices : []).forEach((c) => { foodChoices[c.id] = c.chosen != null ? c.chosen : (c.options && c.options[0]); });
  const riskStatus = {};
  if (settled) {
    (((playbookRisks(base) || {}).items) || []).forEach((r) => { riskStatus[r.id] = 'dismissed'; });
  }
  return { ...base, foodChoices, riskStatus };
};

describe('F5 — calm fillers never share a list with real work', () => {
  test('THE ABSURDITY: an open phase item (no rain plan) means NO calm action anywhere', () => {
    const actions = eventPlan(feastNoRain()).nextActions;
    // The real item made it in…
    expect(actions.map((a) => String(a.title || '')).join(' | ')).toMatch(/rain/i);
    // …so every filler is gone. "1 thing needs you: nothing urgent" cannot render.
    expect(actions.filter((a) => CALM.has(a.category))).toEqual([]);
  });

  test('a ladder that fell to the heart filler is DROPPED while registry raises stand', () => {
    // Essentials all handled ⇒ the ladder returns 'heart' (proven by the calm-alone
    // test below, which is this fixture plus a settled registry). But the risk surface
    // still raises real "Have a plan for" items — so the filler must vanish, not lead.
    // UPDATED (wave-7 worry lane, 2026-07-15): the risk raises now file as WORRIES —
    // eventPlan's heads-up lane, uncounted — so the raises stand in plan.worries and
    // nextActions is honestly EMPTY: no filler beside a live heads-up, and no worry
    // counted as a chore. (This fixture is now the canonical only-worries event.)
    const plan = eventPlan(quietRetirement());
    expect(plan.worries.length).toBeGreaterThan(0);
    expect(plan.worries.every((a) => a.source === 'surfaceRegistry' && a.surface === 'risks')).toBe(true);
    expect(plan.nextActions).toEqual([]);
    expect(plan.nextActions.filter((a) => CALM.has(a.category))).toEqual([]);
  });

  test('when genuinely nothing is open, the single calm action survives — calm is still reachable', () => {
    // Same event with the registry settled: risks dismissed, contract file on record.
    // Nothing real remains, so ONE calm line renders — the heart tier, said once.
    const actions = eventPlan(quietRetirement({ settled: true })).nextActions;
    expect(actions).toHaveLength(1);
    expect(CALM.has(actions[0].category)).toBe(true);
  });

  test('the filler invariant holds across varied event states: a calm action only ever appears ALONE', () => {
    const fixtures = [feastNoRain(), evOverdueDecisions(), quietRetirement(), quietRetirement({ settled: true })];
    for (const ev of fixtures) {
      const actions = eventPlan(ev).nextActions;
      const ok = actions.every((a) => !CALM.has(a.category)) || actions.length === 1;
      expect({ id: ev.id, settled: !!Object.keys(ev.riskStatus || {}).length, ok })
        .toEqual({ id: ev.id, settled: !!Object.keys(ev.riskStatus || {}).length, ok: true });
    }
  });
});

// UPDATED (wave-5 ranking, 2026-07-15): the overdue-DECISION top is DEMOTED to
// 'attention' — doctrine (surfaceRegistry.js) reserves 'critical' for REACTIVE
// raises (a payment overdue to a real vendor, a no-show, a same-hour conflict);
// an overdue self-authored decision is a late chore, not an emergency. The band
// invariant itself is unchanged and is now pinned on a genuine reactive critical.
describe('F6 — severity is a computed band, not a splice position', () => {
  // A REAL critical: a confirmed vendor whose balance was due 3 days ago (tier-4
  // reactive raise) alongside real attention work (an unconfirmed second vendor,
  // registry raises). Replaces the demoted overdue-decision fixture here.
  const evPaymentCritical = () => ({
    id: 'band-4', type: 'Crab Feast', name: 'Feast', date: iso(6),
    guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1200,
    venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
    guests: [], timeline: [],
    vendors: [
      { id: 'v-pay', name: 'Sable & Sound', category: 'DJ', status: 'Confirmed', contractSigned: true, cost: 500, payDueDate: iso(-3), balancePaid: false },
      { id: 'v-open', name: 'Fork & Flower', category: 'Catering', status: 'Considering' },
    ],
  });

  test('every critical sorts ahead of every non-critical, whatever producer made it', () => {
    const actions = eventPlan(evPaymentCritical()).nextActions;
    expect(actions.length).toBeGreaterThan(1); // a critical AND real follow-up work
    const flags = actions.map((a) => a.level === 'critical');
    const lastCritical = flags.lastIndexOf(true);
    const firstNonCritical = flags.indexOf(false);
    expect(lastCritical).toBeGreaterThanOrEqual(0);
    if (firstNonCritical !== -1) expect(lastCritical).toBeLessThan(firstNonCritical);
  });

  test('the 60-day-overdue decision IS the top action — at ATTENTION, not critical (wave-5 demotion)', () => {
    const top = eventPlan(evOverdueDecisions()).nextActions[0];
    expect(top.level).toBe('attention'); // was 'critical' before 2026-07-15 — a late chore, not an emergency
    expect(String(top.title)).toMatch(/crabs/i);
  });
});

describe('F7 — the top action finally carries its lead, so the snooze cap can bind', () => {
  test("the overdue-decision top action carries the source task's numeric leadDays", () => {
    const top = eventPlan(evOverdueDecisions()).nextActions[0];
    // UPDATED (wave-5, 2026-07-15): 'attention' now — which is exactly what lets the
    // cap matter: at 'critical' canSnooze() short-circuited and leadDays was moot.
    expect(top.level).toBe('attention');
    // -60 is 'bad''s authored lead — proposedSnoozeDays(event, { leadDays: top.leadDays })
    // reads exactly this number; before F7 it was always undefined (dead cap).
    expect(top.leadDays).toBe(-60);
  });
});
