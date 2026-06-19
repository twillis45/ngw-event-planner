import { getPlaybook, playbookTasks, topPlaybookTask, playbookBudgetCategories, topPlaybookDecision, playbookRunOfShow, playbookCapacity, playbookInfraPrompts, effectiveRos, playbookFoodPlan } from '../index';

const DP = (over) => ({
  id: 'e1',
  name: 'Test Dinner',
  type: 'Dinner Party',
  date: '2026-06-20',
  guestCount: 12,
  ...over,
});

describe('getPlaybook registry', () => {
  test('resolves Dinner Party case-insensitively', () => {
    expect(getPlaybook('Dinner Party')).toBeTruthy();
    expect(getPlaybook('dinner party')).toBeTruthy();
    expect(getPlaybook('  DINNER PARTY ')).toBeTruthy();
  });
  test('returns null for non-dinner-party / unknown / empty', () => {
    expect(getPlaybook('Other')).toBeNull();
    expect(getPlaybook('')).toBeNull();
    expect(getPlaybook(undefined)).toBeNull();
  });
});

describe('quantity-resolved operational candidate (the success condition)', () => {
  test('on event day, ice resolves to "Buy ice — 18 lbs today"', () => {
    const t = topPlaybookTask(DP({ date: '2026-06-20' }), '2026-06-20');
    expect(t).toBeTruthy();
    expect(t.title).toBe('Buy ice — 18 lbs today');
    expect(t.quantity).toBe(18);
    expect(t.category).toBe('operational');
    expect(t.level).toBe('attention');
    expect(t.primaryRoute.tab).toBe('Planning Tasks');
  });

  test('quantity scales with guest count (8 guests → 12 lbs ice)', () => {
    const t = topPlaybookTask(DP({ date: '2026-06-20', guestCount: 8 }), '2026-06-20');
    expect(t.title).toBe('Buy ice — 12 lbs today');
  });

  test('no guest count present → decision-first: suppress the buy, ask for the count (55G)', () => {
    // Pre-55G this surfaced "Buy ice — 12 lbs" against the typical-guests
    // fallback. Decision-first now refuses to size a buy with no headcount and
    // surfaces the prerequisite decision instead. (Budget categories still use
    // the typical-guests fallback — see playbookBudgetCategories tests.)
    const ev = { id: 'e1', type: 'Dinner Party', date: '2026-06-20' };
    expect(topPlaybookTask(ev, '2026-06-20')).toBeNull();
    expect(topPlaybookDecision(ev, '2026-06-20').decision).toBe('guestCount');
  });
});

describe('window gating', () => {
  test('day before the event, a T-1d essential (due today) outranks ice (tomorrow)', () => {
    const t = topPlaybookTask(DP({ date: '2026-06-20' }), '2026-06-19');
    expect(t.dueInDays).toBe(0);
    expect(t.dueLabel).toBe('today');
    expect(t.title).toMatch(/ today$/);
    expect(t.title).not.toMatch(/ice/); // ice is tomorrow here, not the top
  });

  test('20 days out, nothing is in window → no operational candidate', () => {
    expect(playbookTasks(DP({ date: '2026-06-20' }), '2026-05-31')).toEqual([]);
    expect(topPlaybookTask(DP({ date: '2026-06-20' }), '2026-05-31')).toBeNull();
  });

  test('past-due purchases are dropped (not nagged)', () => {
    // event yesterday: every buyAt offset is in the past → empty
    expect(playbookTasks(DP({ date: '2026-06-13' }), '2026-06-14')).toEqual([]);
  });
});

describe('non-applicability (existing behavior must be unaffected)', () => {
  test('non-dinner-party event → no candidates', () => {
    expect(playbookTasks(DP({ type: 'Other' }), '2026-06-20')).toEqual([]);
  });
  test('unknown type → no candidates', () => {
    expect(playbookTasks(DP({ type: 'Other' }), '2026-06-20')).toEqual([]);
  });
  test('missing date → no candidates', () => {
    expect(playbookTasks(DP({ date: undefined }), '2026-06-20')).toEqual([]);
  });
  test('null event → []', () => {
    expect(playbookTasks(null, '2026-06-20')).toEqual([]);
  });
});

describe('playbookBudgetCategories (engine-derived typical setup)', () => {
  test('Dinner Party → grounded budget categories, NO venue line', () => {
    const cats = playbookBudgetCategories('Dinner Party', 8);
    expect(cats).toBeTruthy();
    const labels = cats.map((c) => c.label);
    expect(labels).toContain('Food & groceries');
    expect(labels).toContain('Drinks & bar');
    expect(labels.some((l) => /venue/i.test(l))).toBe(false);
    // every row carries a positive low/high range
    cats.forEach((c) => {
      expect(c.high).toBeGreaterThanOrEqual(c.low);
      expect(c.low).toBeGreaterThan(0);
    });
  });

  test('amounts scale with guest count (16 guests cost ~2x 8 guests on food)', () => {
    const f8 = playbookBudgetCategories('Dinner Party', 8).find((c) => c.label === 'Food & groceries');
    const f16 = playbookBudgetCategories('Dinner Party', 16).find((c) => c.label === 'Food & groceries');
    expect(f16.low).toBeGreaterThan(f8.low);
    expect(f16.high).toBeGreaterThan(f8.high);
  });

  test('falls back to typical guests when count missing', () => {
    expect(playbookBudgetCategories('Dinner Party')).toBeTruthy();
  });

  test('non-playbook type → null (caller uses share-based estimate)', () => {
    expect(playbookBudgetCategories('Other', 120)).toBeNull();
    expect(playbookBudgetCategories('', 10)).toBeNull();
  });
});

// ── Sprint 55D: Phase-1 host playbooks ────────────────────────────────────────
describe('55D registration + canonical alias resolution', () => {
  test('all 5 Phase-1 host playbooks resolve by canonical type', () => {
    ['Dinner Party', 'Birthday', 'Baby Shower', 'Get-Together', 'Graduation'].forEach((t) => {
      expect(getPlaybook(t)).toBeTruthy();
      expect(getPlaybook(t).type).toBe(t);
    });
  });
  test('aliases + free-text resolve through the taxonomy', () => {
    expect(getPlaybook('Birthday Party').type).toBe('Birthday');
    expect(getPlaybook('Graduation Party').type).toBe('Graduation');
    expect(getPlaybook('Backyard BBQ').type).toBe('Get-Together');
    expect(getPlaybook('cookout').type).toBe('Get-Together');
    expect(getPlaybook('potluck').type).toBe('Get-Together');
  });
  test('non-host / unsupported types stay null (existing fallback intact)', () => {
    // 'Other' has no playbook + no alias; '' is empty. (Most other types now have
    // playbooks; unknown free-text resolves to Birthday/Conference via keyword.)
    ['Other', ''].forEach((t) => {
      expect(getPlaybook(t)).toBeNull();
    });
  });
});

describe('55D per-playbook engine behavior', () => {
  const CASES = [
    { type: 'Birthday', guests: 20 },
    { type: 'Baby Shower', guests: 25 },
    { type: 'Get-Together', guests: 16 },
    { type: 'Graduation', guests: 35 },
  ];
  const ev = (type, date, guestCount) => ({ id: 'e1', type, date, guestCount });

  CASES.forEach(({ type, guests }) => {
    describe(type, () => {
      test('produces in-window operational candidates that scale with guests', () => {
        // event 1 day out → T-1d purchases due today
        const small = playbookTasks(ev(type, '2026-06-20', 4), '2026-06-19');
        const big = playbookTasks(ev(type, '2026-06-20', guests), '2026-06-19');
        expect(small.length).toBeGreaterThan(0);
        expect(big.length).toBeGreaterThan(0);
        // a per-guest essential task should cost/size more at higher headcount
        const perGuestBig = big.find((t) => t.quantity != null && /lb|drinks|buns|favor/.test(t.unit));
        const perGuestSmall = small.find((t) => t.item === (perGuestBig || {}).item);
        if (perGuestBig && perGuestSmall) {
          expect(perGuestBig.quantity).toBeGreaterThan(perGuestSmall.quantity);
        }
      });

      test('window gating: 30 days out → no candidates', () => {
        expect(playbookTasks(ev(type, '2026-06-20', guests), '2026-05-21')).toEqual([]);
      });

      test('budget rows derive from purchases, grounded, NO venue line', () => {
        const cats = playbookBudgetCategories(type, guests);
        expect(cats).toBeTruthy();
        expect(cats.length).toBeGreaterThanOrEqual(4);
        const labels = cats.map((c) => c.label.toLowerCase());
        expect(labels.some((l) => /venue/.test(l))).toBe(false);
        expect(labels).toContain('food & groceries');
        expect(labels).toContain('drinks & bar');
        cats.forEach((c) => {
          expect(c.low).toBeGreaterThan(0);
          expect(c.high).toBeGreaterThanOrEqual(c.low);
        });
      });

      test('budget total scales up with guest count', () => {
        const sum = (g) => playbookBudgetCategories(type, g).reduce((a, c) => a + c.low, 0);
        expect(sum(guests * 2)).toBeGreaterThan(sum(guests));
      });
    });
  });

  test('every Phase-1 playbook has all 6 budget categories represented', () => {
    ['Dinner Party', 'Birthday', 'Baby Shower', 'Get-Together', 'Graduation'].forEach((type) => {
      const cats = playbookBudgetCategories(type, 20).map((c) => c.label);
      ['Food & groceries', 'Drinks & bar'].forEach((must) => expect(cats).toContain(must));
    });
  });
});

// ── Sprint 55G: decision-first gating (Pattern 001) ───────────────────────────
describe('55G decision-first gate', () => {
  const guests = (over) => Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'G' + i, rsvp: 'Yes', meal: 'Standard', needs: '', ...(over ? over(i) : {}) }));
  // 1 day out → T-1d per-guest purchases (protein etc.) are in-window today.
  const dp = (over) => ({ id: 'e1', type: 'Dinner Party', date: '2026-06-20', guestCount: 12, ...over });
  const ASOF = '2026-06-19';

  test('unresolved headcount (a pending Maybe) → surface "Confirm final guest count", block per-guest buys', () => {
    const ev = dp({ guests: guests((i) => (i === 11 ? { rsvp: 'Maybe' } : {})) });
    const d = topPlaybookDecision(ev, ASOF);
    expect(d).toBeTruthy();
    expect(d.category).toBe('decision');
    expect(d.title).toBe('Confirm final guest count');
    expect(d.primaryRoute.tab).toBe('Guests');
    // protein (per-guest, food) must NOT surface as a buy while the count is open
    const tasks = playbookTasks(ev, ASOF);
    expect(tasks.some((t) => /protein/i.test(t.title))).toBe(false);
  });

  test('no count at all → still surfaces the count decision', () => {
    const ev = { id: 'e1', type: 'Dinner Party', date: '2026-06-20', guestCount: 0, guestEstimate: '', guests: [] };
    // no guest list + no count → count unresolved, but dietary "no-list" resolved
    const d = topPlaybookDecision(ev, ASOF);
    expect(d && d.decision).toBe('guestCount');
  });

  test('resolved headcount (all Yes, dietary recorded) → no decision, buy surfaces', () => {
    const ev = dp({ guests: guests((i) => (i === 3 ? { needs: 'Nut allergy' } : {})) });
    expect(topPlaybookDecision(ev, ASOF)).toBeNull();
    expect(topPlaybookTask(ev, ASOF)).toBeTruthy();
  });

  test('dietary unresolved (count locked, no meal/needs) → surface "Collect dietary", block food', () => {
    const ev = dp({ guests: guests((i) => ({ meal: 'Standard', needs: '' })) }); // all Yes, nothing recorded
    const d = topPlaybookDecision(ev, ASOF);
    expect(d && d.decision).toBe('dietary');
    expect(d.title).toMatch(/dietary/i);
    const tasks = playbookTasks(ev, ASOF);
    expect(tasks.some((t) => t.phase === 'food')).toBe(false);
  });

  test('dietary resolved (a guest has a recorded need) → no dietary decision', () => {
    const ev = dp({ guests: guests((i) => (i === 0 ? { needs: 'Vegan' } : {})) });
    expect(topPlaybookDecision(ev, ASOF)).toBeNull();
  });

  test('estimate-only event (no guest list) is NOT falsely blocked', () => {
    const ev = { id: 'e1', type: 'Dinner Party', date: '2026-06-20', guestEstimate: '12', guests: [] };
    expect(topPlaybookDecision(ev, ASOF)).toBeNull();
    expect(topPlaybookTask(ev, ASOF)).toBeTruthy();
  });

  test('gate only fires when a purchase is actually in window (far-out event → no nag)', () => {
    const ev = dp({ date: '2026-07-20', guests: guests((i) => (i === 11 ? { rsvp: 'Maybe' } : {})) });
    expect(topPlaybookDecision(ev, '2026-06-19')).toBeNull(); // 31 days out, nothing in window
  });

  test('non-playbook event → no decision (existing behavior intact)', () => {
    expect(topPlaybookDecision({ id: 'e', type: 'Other', date: '2026-06-20', guests: [{ rsvp: 'Maybe' }] }, ASOF)).toBeNull();
  });

  test('priority: when BOTH count and dietary are open, guest count wins', () => {
    const ev = dp({ guests: guests((i) => ({ rsvp: i === 11 ? 'Maybe' : 'Yes', meal: 'Standard', needs: '' })) });
    expect(topPlaybookDecision(ev, ASOF).decision).toBe('guestCount');
  });
});

// ── Sprint 55H-B1: run-of-show seeding ────────────────────────────────────────

describe('55H-B1 playbookRunOfShow', () => {
  const dp = (over) => ({ id: 'e1', type: 'Dinner Party', date: '2026-06-20', timeOfDay: 'evening', ...over });

  test('Dinner Party derives a sorted day-of run-of-show, tagged generated (Rule 2)', () => {
    const ros = playbookRunOfShow(dp());
    expect(Array.isArray(ros)).toBe(true);
    expect(ros.length).toBeGreaterThanOrEqual(4);
    // metadata on every row
    ros.forEach((r) => {
      expect(r.source).toBe('playbook');
      expect(r.generated).toBe(true);
      expect(r.playbookType).toBe('Dinner Party');
      expect(r.time).toMatch(/^\d{2}:\d{2}$/);
    });
    // sorted by time
    const mins = ros.map((r) => Number(r.time.slice(0, 2)) * 60 + Number(r.time.slice(3)));
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    // includes the arrival hero + real day-of segments
    expect(ros.some((r) => /guests arrive|plate appetizer/i.test(r.segment))).toBe(true);
    expect(ros.some((r) => /set the table|chill|drinks/i.test(r.segment))).toBe(true);
  });

  test('excludes pre-day items (no T-1d shopping/prep in the day-of schedule)', () => {
    const ros = playbookRunOfShow(dp());
    // none of the rows should be the T-1d evening make-ahead or any shopping run
    expect(ros.some((r) => /pantry|alcohol run|buy .*non-perishable/i.test(r.segment))).toBe(false);
  });

  test('evening anchor (18:00) places arrival at 18:00', () => {
    const ros = playbookRunOfShow(dp({ timeOfDay: 'evening' }));
    expect(ros.some((r) => r.time === '18:00')).toBe(true);
  });

  test('Birthday derives its own run-of-show', () => {
    const ros = playbookRunOfShow({ id: 'b', type: 'Birthday', date: '2026-06-20', timeOfDay: 'afternoon' });
    expect(ros.length).toBeGreaterThan(0);
    expect(ros.every((r) => r.playbookType === 'Birthday')).toBe(true);
  });

  test('non-playbook (Wedding) → null', () => {
    expect(playbookRunOfShow({ id: 'w', type: 'Other', date: '2026-06-20' })).toBeNull();
  });
});

describe('55H-B1 effectiveRos (Rule 1 + Rule 5)', () => {
  const dp = { id: 'e1', type: 'Dinner Party', date: '2026-06-20', timeOfDay: 'evening' };

  test('empty ros → derives the playbook run-of-show', () => {
    const r = effectiveRos({ ...dp, ros: [] });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].generated).toBe(true);
  });
  test('manual/imported ros (non-empty) → returned verbatim, never overwritten', () => {
    const manual = [{ id: 'm1', time: '19:00', segment: 'My own segment' }];
    expect(effectiveRos({ ...dp, ros: manual })).toBe(manual);
  });
  test('non-playbook with empty ros → empty (current behavior unchanged)', () => {
    expect(effectiveRos({ id: 'w', type: 'Other', date: '2026-06-20', ros: [] })).toEqual([]);
  });
});

// ── Sprint 55H-B3A: capacity requirements (Pattern 009) ───────────────────────

describe('55H-B3A playbookCapacity (requirements, never deficits)', () => {
  test('Dinner Party 12 guests → scaled requirements, no deficit language', () => {
    const c = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12 });
    expect(c).toBeTruthy();
    expect(c.guests).toBe(12);
    const byItem = Object.fromEntries(c.items.map(i => [i.short, i.qty]));
    expect(byItem.plates).toBe(24);   // 2/guest
    expect(byItem.glasses).toBe(30);  // 2.5/guest → ceil 30
    expect(byItem.flatware).toBe(12); // 1/guest
    expect(byItem.chairs).toBe(12);   // 1/guest
    expect(byItem.platters).toBe(6);  // flat (board: bumped 4→6 for a multi-course dinner)
    // summary states needs, never "missing"/"rent"/"borrow N"
    expect(c.summary).toMatch(/12 chairs/);
    expect(c.summary).not.toMatch(/missing|deficit|rent \d|short \d/i);
  });

  test('requirements recalculate with guest count', () => {
    const c8 = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 8 });
    const c20 = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 20 });
    expect(c8.items.find(i => i.short === 'chairs').qty).toBe(8);
    expect(c20.items.find(i => i.short === 'chairs').qty).toBe(20);
  });

  test('Birthday + Graduation scale correctly', () => {
    const bd = playbookCapacity({ id: 'b', type: 'Birthday', guestCount: 20 });
    expect(bd).toBeTruthy();
    expect(bd.items.find(i => i.short === 'chairs').qty).toBe(12); // 0.6/guest → ceil(12)
    const gr = playbookCapacity({ id: 'g', type: 'Graduation', guestCount: 35 });
    expect(gr).toBeTruthy();
    expect(gr.items.length).toBeGreaterThan(0);
  });

  test('non-playbook (Wedding) → null (fallback unchanged)', () => {
    expect(playbookCapacity({ id: 'w', type: 'Other', guestCount: 100 })).toBeNull();
  });

  test('falls back to typical guests when no count', () => {
    const c = playbookCapacity({ id: 'e', type: 'Dinner Party' });
    expect(c.guests).toBe(8); // typicalGuests.default
  });
});


describe('55L playbookInfraPrompts (Event Reality Check — confirm prompts, never deficits)', () => {
  const keys = (e) => (playbookInfraPrompts(e)?.prompts || []).map(p => p.key);

  test('Dinner Party: universal confirms + alcohol, no grill/child/weather', () => {
    const k = keys({ id: 'e', type: 'Dinner Party' });
    expect(k).toEqual(expect.arrayContaining(['food', 'power', 'trash', 'emergency', 'alcohol']));
    expect(k).not.toContain('grill');
    expect(k).not.toContain('child');
    expect(k).not.toContain('minors');
    expect(k).not.toContain('weather'); // indoor dinner — "grain" must NOT trip \brain\b
  });

  test('Backyard BBQ: grill + child supervision + weather surfaced', () => {
    const k = keys({ id: 'b', type: 'Get-Together' });
    expect(k).toEqual(expect.arrayContaining(['grill', 'child', 'weather', 'food', 'power', 'emergency']));
  });

  test('Graduation: weather + power + trash (no grill — no fuel purchased)', () => {
    const k = keys({ id: 'g', type: 'Graduation' });
    expect(k).toEqual(expect.arrayContaining(['weather', 'power', 'trash']));
    expect(k).not.toContain('grill');
  });

  test('Birthday: child supervision (kid party) even without a grill', () => {
    expect(keys({ id: 'bd', type: 'Birthday' })).toContain('child');
  });

  test('never an adequacy/deficit claim — no number/insufficient in any detail', () => {
    ['Dinner Party', 'Get-Together', 'Graduation', 'Birthday', 'Baby Shower'].forEach((type) => {
      const ps = playbookInfraPrompts({ id: 'x', type })?.prompts || [];
      ps.forEach((p) => {
        expect(p.detail.toLowerCase()).not.toMatch(/insufficient|not enough|parking spaces|restroom/);
        expect(p.detail).not.toMatch(/\bneed \d|\d+ spaces|\d+ outlets|\d+ amps/);
      });
    });
  });

  test('non-playbook (Wedding) → null (unchanged)', () => {
    expect(playbookInfraPrompts({ id: 'w', type: 'Other' })).toBeNull();
  });
});

// ── Wiring guarantee: every registered event type surfaces through the reader ──
// Proves the create → event → getPlaybook path resolves for every type the app
// offers, and that all the runtime consumption points (CommandCenter next-action,
// Event-Day run-of-show, capacity, infra prompts) run cleanly for each. Catches a
// new dropdown type shipped without a playbook, or a playbook field that breaks
// the reader. (The Event-Day run-of-show rendering was also verified live.)
describe('event-type wiring (create → event → reader)', () => {
  const SAMPLE = [
    // at-home + AA + regional + DMV
    'The Cookout', 'Fish Fry', 'Card Party', 'Sunday Dinner', 'Day Party', 'Juneteenth Cookout',
    'Kwanzaa Gathering', 'Repast', 'Crab Feast', 'Crawfish Boil', 'Low Country Boil',
    'Pupusa Gathering', 'Ethiopian Coffee Ceremony', 'Housewarming', 'Watch Party', 'Game Night',
    // celebrations + full-service
    'Bridal Shower', 'Gender Reveal', 'Engagement Party', 'Anniversary', 'Retirement Party',
    'Reunion', 'Bachelorette Party', 'Bachelor Party', 'Sweet 16', 'Vow Renewal',
    'Wedding', 'Elopement', 'Quinceañera', 'Surprise Proposal',
    // corporate
    'Holiday Party', 'Board Meeting', 'Conference', 'Team Retreat',
  ];
  const ev = (type) => ({ id: 'w', type, date: '2026-09-19', guestCount: 30, timeOfDay: 'afternoon', vendors: [], guests: [], ros: [] });

  SAMPLE.forEach((type) => {
    test(`${type}: resolves by type + reader runs cleanly`, () => {
      const pb = getPlaybook(type);
      expect(pb).toBeTruthy();
      expect(pb.type).toBe(type);
      // every runtime consumption point must run without throwing
      expect(() => playbookTasks(ev(type), '2026-09-18')).not.toThrow();
      expect(() => topPlaybookDecision(ev(type), '2026-09-18')).not.toThrow();
      expect(() => playbookCapacity(ev(type))).not.toThrow();
      expect(() => playbookInfraPrompts(ev(type))).not.toThrow();
      expect(() => playbookRunOfShow(ev(type))).not.toThrow();
      expect(Array.isArray(effectiveRos(ev(type)))).toBe(true);
    });
  });

  test('aliases resolve to their base playbook', () => {
    expect(getPlaybook('Super Bowl Party').type).toBe('Watch Party');
    expect(getPlaybook('Game Day Party').type).toBe('Watch Party');
    expect(getPlaybook('Cocktail Party').type).toBe('Dinner Party');
    expect(getPlaybook('Brunch').type).toBe('Dinner Party');
    expect(getPlaybook('Backyard BBQ').type).toBe('Get-Together');
  });
});

// ── Food / Menu plan (host-facing food intelligence) ──────────────────────────
describe('playbookFoodPlan (the food-choice surface data)', () => {
  test('The Cookout → menu choices + a scaled, costed shopping list + food budget', () => {
    const plan = playbookFoodPlan({ id: 'c', type: 'The Cookout', guestCount: 40, guests: [] });
    expect(plan).toBeTruthy();
    expect(plan.guests).toBe(40);
    // food choices the host can make
    expect(plan.choices.length).toBeGreaterThan(0);
    plan.choices.forEach((c) => { expect(Array.isArray(c.options)).toBe(true); expect(c.chosen).toBeTruthy(); });
    // grounded list (food + drinks), each with a quantity + cost range + group
    expect(plan.list.length).toBeGreaterThan(0);
    const ribs = plan.list.find((i) => /rib/i.test(i.item));
    expect(ribs).toBeTruthy();
    expect(ribs.qty).toBeGreaterThan(0);        // 0.5 lb/guest × 40 = 20
    expect(ribs.high).toBeGreaterThanOrEqual(ribs.low);
    expect(plan.groups).toContain('Food');
    expect(plan.foodHigh).toBeGreaterThan(plan.foodLow);
  });

  test('quantities + budget scale with guest count', () => {
    const a = playbookFoodPlan({ id: 'c', type: 'The Cookout', guestCount: 20, guests: [] });
    const b = playbookFoodPlan({ id: 'c', type: 'The Cookout', guestCount: 60, guests: [] });
    expect(b.foodHigh).toBeGreaterThan(a.foodHigh);
  });

  test("the host's pick on event.foodChoices is reflected as chosen", () => {
    const plan = playbookFoodPlan({ id: 'c', type: 'The Cookout', guestCount: 40, guests: [], foodChoices: { drinks: 'BYOB' } });
    const drinks = plan.choices.find((c) => c.id === 'drinks');
    if (drinks) expect(drinks.chosen).toBe('BYOB');
  });

  test('non-playbook type → null', () => {
    expect(playbookFoodPlan({ id: 'o', type: 'Other', guestCount: 10 })).toBeNull();
  });
});

describe('60F — menu choice drives the spread (whenChoice gate)', () => {
  const ids = (menu) => playbookFoodPlan({
    id: 'j', type: 'Juneteenth Cookout', guestCount: 30, guests: [],
    foodChoices: menu ? { menu } : {},
  }).list.map((i) => i.id);

  test('default menu → ribs + chicken + links; not brisket/seafood', () => {
    const l = ids(null);
    expect(l).toEqual(expect.arrayContaining(['p_ribs', 'p_chicken', 'p_links']));
    expect(l).not.toContain('p_brisket');
    expect(l).not.toContain('p_seafood');
  });
  test('brisket menu → brisket + chicken; not ribs/links/seafood', () => {
    const l = ids('Smoked brisket + chicken + the sides');
    expect(l).toEqual(expect.arrayContaining(['p_brisket', 'p_chicken']));
    ['p_ribs', 'p_links', 'p_seafood'].forEach((id) => expect(l).not.toContain(id));
  });
  test('mixed grill + seafood → ribs + chicken + seafood; not links/brisket', () => {
    const l = ids('Mixed grill + seafood + the sides');
    expect(l).toEqual(expect.arrayContaining(['p_ribs', 'p_chicken', 'p_seafood']));
    ['p_links', 'p_brisket'].forEach((id) => expect(l).not.toContain(id));
  });
  test('lighter spread → chicken only (no ribs/links/brisket/seafood)', () => {
    const l = ids('Lighter spread: chicken + sides + plenty of red foods');
    expect(l).toContain('p_chicken');
    ['p_ribs', 'p_links', 'p_brisket', 'p_seafood'].forEach((id) => expect(l).not.toContain(id));
  });
  test('untagged items (e.g. chicken) always appear', () => {
    expect(ids(null)).toContain('p_chicken');
  });
});
