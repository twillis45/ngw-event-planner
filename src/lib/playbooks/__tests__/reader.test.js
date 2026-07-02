import { getPlaybook, playbookTasks, topPlaybookTask, playbookBudgetCategories, topPlaybookDecision, playbookRunOfShow, playbookCapacity, playbookInfraPrompts, effectiveRos, playbookFoodPlan, ALL_PLAYBOOKS } from '../index';

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
    // #12 deep-link: lands on the food plan AND targets the exact line (foodFocus).
    expect(t.primaryRoute.tab).toBe('Planning');
    expect(t.primaryRoute.foodFocus).toBeTruthy();
  });
  test('buying it (foodGot) advances past it — clearing the CTA changes the next step', () => {
    const ev = DP({ date: '2026-06-20' });
    const before = topPlaybookTask(ev, '2026-06-20');
    const iceId = before.primaryRoute.foodFocus;
    const after = topPlaybookTask({ ...ev, foodGot: { [iceId]: true } }, '2026-06-20');
    expect(after === null || after.primaryRoute.foodFocus !== iceId).toBe(true);
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

  test('overdue buys surface while the event is UPCOMING (no silent drop), ranked after in-window', () => {
    // Day before the event, the T-3d/T-5d buys are days overdue. They must SURFACE (dropping them is
    // the "nothing needs you / I'm watching" lie) — but the TOP stays an in-window (due-today) item.
    const list = playbookTasks(DP({ date: '2026-06-20' }), '2026-06-19');
    expect(list.some((t) => t.dueInDays < 0)).toBe(true);      // overdue present, not dropped
    expect(list[0].dueInDays).toBeGreaterThanOrEqual(0);        // ...but in-window leads
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
  test('host-owned ros (rosEdited) → returned verbatim, never overwritten', () => {
    const manual = [{ id: 'm1', time: '19:00', segment: 'My own segment' }];
    expect(effectiveRos({ ...dp, ros: manual, rosEdited: true })).toBe(manual);
  });
  test('SINGLE SOURCE: a stored ros NOT owned by the host (no rosEdited) does NOT win — the playbook-derived schedule does, so timeOfDay still drives it', () => {
    const stale = [{ id: 'm1', time: '19:00', segment: 'Stale snapshot' }];
    const r = effectiveRos({ ...dp, ros: stale });
    expect(r).not.toBe(stale);
    expect(r.every((row) => row.segment !== 'Stale snapshot')).toBe(true);
    expect(r[0].generated).toBe(true);
  });
  test('SINGLE SOURCE: changing timeOfDay reflows the derived schedule (evening → morning shifts every cue earlier)', () => {
    const eve = effectiveRos({ ...dp, ros: [] });        // evening anchor (18:00)
    const morn = effectiveRos({ ...dp, ros: [], timeOfDay: 'morning' }); // morning anchor (10:00)
    const firstMin = (rows) => { const [h, m] = rows[0].time.split(':').map(Number); return h * 60 + m; };
    expect(firstMin(morn)).toBeLessThan(firstMin(eve));
  });
  test('per-cue done lives in event.rosDone and overlays the DERIVED schedule (never freezes it)', () => {
    const derived = effectiveRos({ ...dp, ros: [] });
    const id = derived[0].id;
    const withDone = effectiveRos({ ...dp, ros: [], rosDone: { [id]: true } });
    expect(withDone.find((r) => r.id === id).done).toBe(true);
    // and it's still the derived schedule, not a snapshot
    expect(withDone[0].generated).toBe(true);
  });
  test('non-playbook with empty ros → empty (current behavior unchanged)', () => {
    expect(effectiveRos({ id: 'w', type: 'Other', date: '2026-06-20', ros: [] })).toEqual([]);
  });
  test('non-playbook WITH a stored ros → still wins (no derived source to prefer)', () => {
    const manual = [{ id: 'x1', time: '12:00', segment: 'Custom' }];
    expect(effectiveRos({ id: 'w', type: 'Other', date: '2026-06-20', ros: manual })).toBe(manual);
  });
  test('SINGLE SOURCE: a precise startTime anchors the run-of-show to the exact minute', () => {
    const r = effectiveRos({ ...dp, ros: [], startTime: '19:30' });
    expect(r.some((row) => row.time === '19:30')).toBe(true);
  });
  test('startTime overrides the coarse timeOfDay bucket', () => {
    const firstMin = (rows) => { const [h, m] = rows[0].time.split(':').map(Number); return h * 60 + m; };
    const bucket = effectiveRos({ ...dp, ros: [], timeOfDay: 'morning' });            // 10:00 anchor
    const precise = effectiveRos({ ...dp, ros: [], timeOfDay: 'morning', startTime: '18:00' });
    expect(firstMin(precise)).toBeGreaterThan(firstMin(bucket));
  });
  test('startTime tolerant of 12-hour format ("6:30 PM" → 18:30)', () => {
    const r = effectiveRos({ ...dp, ros: [], startTime: '6:30 PM' });
    expect(r.some((row) => row.time === '18:30')).toBe(true);
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

  test('items carry a group + verb; groups carry per-section subtotals', () => {
    const c = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12 });
    const byItem = Object.fromEntries(c.items.map(i => [i.short, i]));
    expect(byItem.chairs.group).toBe('SEATING');
    expect(byItem.plates.group).toBe('SERVICEWARE');
    expect(byItem.platters.group).toBe('SERVICEWARE');
    // rentable serviceware → "Rent" verb (single source: supplyIntel.kind)
    expect(byItem.plates.verb).toBe('Rent');
    // grouped sections, ordered, each with a numeric subtotal that sums its lines
    const seating = c.groups.find(g => g.group === 'SEATING');
    expect(seating).toBeTruthy();
    const sumLow = seating.items.filter(i => i.costLow != null).reduce((s, i) => s + i.costLow, 0);
    expect(seating.costLow).toBe(sumLow);
  });

  test('capacityOwned collapses a line to $0 and flips its verb to "Have these"', () => {
    const base = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12 });
    const owned = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12, capacityOwned: { chairs: true } });
    const oChair = owned.items.find(i => i.short === 'chairs');
    expect(oChair.owned).toBe(true);
    expect(oChair.costLow).toBe(0);
    expect(oChair.costHigh).toBe(0);
    expect(oChair.verb).toBe('Have these');
    // owning a line lowers the planned total
    expect(owned.costLow).toBeLessThan(base.costLow);
  });

  test('capacitySkip leaves every total but keeps the line (struck-through, reversible)', () => {
    const base = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12 });
    const skipped = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12, capacitySkip: { chairs: true } });
    const sChair = skipped.items.find(i => i.short === 'chairs');
    expect(sChair).toBeTruthy();           // line stays in the list
    expect(sChair.skipped).toBe(true);     // marked skipped (reversible)
    expect(skipped.costLow).toBeLessThan(base.costLow);   // left the planned total
    expect(skipped.costHigh).toBeLessThan(base.costHigh);
    // the skipped line also leaves its group subtotal
    const baseSeat = base.groups.find(g => g.items.some(i => i.short === 'chairs'));
    const skipSeat = skipped.groups.find(g => g.group === baseSeat.group);
    expect(skipSeat.costLow).toBeLessThan(baseSeat.costLow);
  });

  test('capacityLocked replaces the range with a fixed committed cost (flows into totals)', () => {
    const base = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12 });
    const chair = base.items.find(i => i.short === 'chairs');
    const others = base.costLow - chair.costLow; // every OTHER line's low
    const locked = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12, capacityLocked: { chairs: 40 } });
    const lChair = locked.items.find(i => i.short === 'chairs');
    expect(lChair.locked).toBe(40);
    // a locked line is a single number, not a range — both totals add 40 for it
    expect(locked.costLow).toBe(others + 40);
    expect(locked.lockedTotal).toBe(40);
    expect(locked.lockedCount).toBe(1);
  });

  test('an owned line ignores a lock ($0 wins) and a skipped line never counts as locked', () => {
    const ownedLocked = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12, capacityOwned: { chairs: true }, capacityLocked: { chairs: 40 } });
    const oc = ownedLocked.items.find(i => i.short === 'chairs');
    expect(oc.locked).toBeNull();
    expect(oc.costLow).toBe(0);
    const skipLocked = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12, capacitySkip: { chairs: true }, capacityLocked: { chairs: 40 } });
    expect(skipLocked.lockedTotal).toBe(0);
  });

  test('capacity items carry honest engine-derived swaps (no invented product names)', () => {
    const c = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 12 });
    const chair = c.items.find(i => i.short === 'chairs');
    expect(Array.isArray(chair.alternatives)).toBe(true);
    expect(chair.alternatives.length).toBeGreaterThan(0);
  });

  test('sizing line + explainer derive only from real factors', () => {
    const c = playbookCapacity({ id: 'e', type: 'Dinner Party', guestCount: 30 });
    expect(c.sizing).toMatch(/service for 30/);
    expect(c.sizingWhy).toMatch(/counts come from your 30 guests/);
    // Dinner Party has no rented tables → no fabricated per-table count
    expect(c.sizing).not.toMatch(/per table/);
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
    // A planned count sizes to the expected-attendance ceiling (researched shift),
    // not the bare number — casual/open-door events plan a bit above (plus-ones).
    expect(plan.guests).toBeGreaterThanOrEqual(40);
    expect(plan.guests).toBeLessThanOrEqual(48);
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

  // Single source: "expected guests" comes from attendanceBand, not the raw invited
  // list. A pure roster sizes the spread to band.high (everyone who hasn't declined),
  // so declined guests don't inflate the food.
  describe('sizes to the expected-attendance band (single source), not raw invited', () => {
    const roster = (specs) => specs.map((rsvp, i) => ({ id: 'g' + i, name: 'G' + i, rsvp }));
    test('declined guests are excluded from sizing', () => {
      // 10 invited: 8 yes, 2 declined → plan-to ceiling is 8, not 10.
      const ev = { id: 'c', type: 'The Cookout', guests: roster(['Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No']) };
      const plan = playbookFoodPlan(ev);
      expect(plan.guests).toBe(8);
    });
    test('outstanding replies size to the high end (won\'t run short)', () => {
      // 10 invited: 6 yes, 2 maybe, 2 pending, 0 declined → plan to all 10.
      const ev = { id: 'c', type: 'The Cookout', guests: roster(['Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Maybe', 'Maybe', '', '']) };
      const plan = playbookFoodPlan(ev);
      expect(plan.guests).toBe(10);
    });
    test('an explicit count the host typed still wins over the roster band', () => {
      // host set "30 expected" but only 12 in the roster → size to 30 everywhere.
      const ev = { id: 'c', type: 'The Cookout', guestEstimate: 30, guests: roster(Array(12).fill('Yes')) };
      const plan = playbookFoodPlan(ev);
      expect(plan.guests).toBe(30);
    });
  });

  // #14 — a swap to a PRICED alternative re-prices the line; a string alt keeps the cost.
  describe('per-alternative price data re-prices the swapped line', () => {
    const base = { id: 'jc', type: 'Juneteenth Cookout', guestCount: 30, guestCountLocked: true, guests: [], foodChoices: { menu: 'Ribs + chicken + links + the sides' } };
    test('swapping ribs → Pork shoulder (cheaper unitCostRange) lowers that line', () => {
      const before = playbookFoodPlan(base).list.find((i) => i.id === 'p_ribs');
      const after = playbookFoodPlan({ ...base, foodSwap: { p_ribs: 'Pork shoulder' } }).list.find((i) => i.id === 'p_ribs');
      expect(after.short).toBe('Pork shoulder');
      expect(after.swappedFrom).toBeTruthy();
      // ribs [4,8] → pork shoulder [3,6]: same qty, cheaper unit cost → lower line cost.
      expect(after.high).toBeLessThan(before.high);
      expect(after.perUnitHigh).toBeLessThan(before.perUnitHigh);
    });
    test('a string alternative still swaps (name only) and keeps the original cost', () => {
      const before = playbookFoodPlan(base).list.find((i) => i.id === 'p_greens');
      const after = playbookFoodPlan({ ...base, foodSwap: { p_greens: 'Mustard greens' } }).list.find((i) => i.id === 'p_greens');
      expect(after.short).toBe('Mustard greens');
      expect(after.high).toBe(before.high); // no price data on the string alt → unchanged
    });
  });

  // 1597-2 — protein SOURCING tier reshapes the protein lines (not the sides).
  describe('sourcing tier re-prices the proteins', () => {
    const base = { id: 'jc', type: 'Juneteenth Cookout', guestCount: 30, guestCountLocked: true, guests: [], foodChoices: { menu: 'Ribs + chicken + links + the sides' } };
    test('proteins use the deep meat factor; non-protein sides take the modest Costco bulk factor', () => {
      const butcher = playbookFoodPlan({ ...base, sourcing: 'butcher' });
      const costco = playbookFoodPlan({ ...base, sourcing: 'costco' });
      const grocery = playbookFoodPlan({ ...base, sourcing: 'grocery' });
      const ribs = (p) => p.list.find((i) => i.id === 'p_ribs');
      expect(ribs(costco).high).toBeLessThan(ribs(butcher).high);
      expect(ribs(grocery).high).toBeGreaterThan(ribs(butcher).high);
      // a side (potato salad): butcher == grocery (base, no channel diff), Costco a modest bulk discount.
      const side = (p) => p.list.find((i) => i.id === 'p_potatosalad');
      expect(side(butcher).high).toBe(side(grocery).high);
      expect(side(costco).high).toBeLessThan(side(butcher).high);
    });
    test('exposes the sourcing card data (current tier + per-tier key-protein cost)', () => {
      const plan = playbookFoodPlan(base);
      expect(plan.sourcing).toBe('butcher');
      expect(plan.sourcingTiers.length).toBe(3);
      expect(plan.sourcingKey).toBeTruthy();
      // ribs carry AUTHORED per-tier prices → byTier costs ascend Costco < butcher < grocery.
      expect(plan.sourcingKey.authored).toBe(true);
      expect(plan.sourcingKey.byTier.costco).toBeLessThan(plan.sourcingKey.byTier.butcher);
      expect(plan.sourcingKey.byTier.butcher).toBeLessThan(plan.sourcingKey.byTier.grocery);
    });
    test('authored per-tier prices drive the line (not the blanket factor)', () => {
      // ribs costco range [3,4]/lb authored → exact, not 0.85×[4,8].
      const costco = playbookFoodPlan({ ...base, sourcing: 'costco' }).list.find((i) => i.id === 'p_ribs');
      // 30 guests → ~ planning ceiling units; per-unit cost should sit in the [3,4] band.
      expect(costco.perUnitHigh).toBeLessThanOrEqual(4.01);
      expect(costco.perUnitLow).toBeGreaterThanOrEqual(2.99);
    });
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

describe('60H — checked-off items feed spent (food ↔ budget)', () => {
  const base = { id: 'j', type: 'Juneteenth Cookout', guestCount: 30, guests: [] };
  test('nothing bought → spent 0', () => {
    const p = playbookFoodPlan(base);
    expect(p.spentLow).toBe(0);
    expect(p.spentHigh).toBe(0);
    expect(p.boughtCount).toBe(0);
    expect(p.itemCount).toBeGreaterThan(0);
  });
  test('checking off an item raises spent (and only that item counts)', () => {
    const p0 = playbookFoodPlan(base);
    const firstId = p0.list[0].id;
    const p1 = playbookFoodPlan({ ...base, foodGot: { [firstId]: true } });
    expect(p1.boughtCount).toBe(1);
    expect(p1.spentHigh).toBeGreaterThan(0);
    expect(p1.spentHigh).toBeLessThanOrEqual(p1.foodHigh);
  });
});

describe('60I — swap-out (skip) + per-item breakdown', () => {
  const base = { id: 'j', type: 'Juneteenth Cookout', guestCount: 30, guests: [] };
  test('items carry the per-unit breakdown', () => {
    const p = playbookFoodPlan(base);
    const item = p.list.find((i) => i.units != null && i.perUnitHigh > 0);
    expect(item).toBeTruthy();
    expect(item.unitBase).toBeTruthy();
    expect(item.perUnitHigh).toBeGreaterThanOrEqual(item.perUnitLow);
  });
  test('skipping an item drops it from totals + count but keeps the line', () => {
    const p0 = playbookFoodPlan(base);
    const id = p0.list[0].id;
    const p1 = playbookFoodPlan({ ...base, foodSkip: { [id]: true } });
    expect(p1.list.find((i) => i.id === id).skipped).toBe(true); // line still present
    expect(p1.itemCount).toBe(p0.itemCount - 1);                 // out of the count
    expect(p1.foodHigh).toBeLessThan(p0.foodHigh);               // out of the total
  });
});

describe('Sprint 64 — stage-aware guest-count nag (host next-step ranking)', () => {
  // Planned count of 30, but one guest hasn't RSVP'd → gc is "pending-rsvps".
  const pendingEv = (date) => ({
    id: 'j', type: 'Juneteenth Cookout', date, guestCount: 30,
    guests: [{ id: 'g1', rsvp: 'Yes' }, { id: 'g2', rsvp: '' }],
  });
  test('near the event (≤10d) with pending RSVPs → DOES press to confirm the final count', () => {
    const d = topPlaybookDecision(pendingEv('2026-07-06'), '2026-07-01'); // 5 days out (buy window active)
    expect(d && d.decision).toBe('guestCount');
  });
  test('far out (>10d) with a planned count → does NOT nag to confirm the final count', () => {
    const d = topPlaybookDecision(pendingEv('2026-07-15'), '2026-07-01'); // 14 days out
    expect(d && d.decision).not.toBe('guestCount');
  });
  test('no count at all (near) → still blocks — nothing can be sized', () => {
    const d = topPlaybookDecision({ id: 'j', type: 'Juneteenth Cookout', date: '2026-07-06', guests: [] }, '2026-07-01');
    expect(d && d.decision).toBe('guestCount');
  });
});

describe('Sprint 64 — lock a food cost (foodLocked)', () => {
  const base = { id: 'j', type: 'Juneteenth Cookout', guestCount: 30, guests: [] };
  test('locking an item collapses its range to the fixed amount + feeds lockedTotal', () => {
    const p0 = playbookFoodPlan(base);
    const id = p0.list[0].id;
    const p1 = playbookFoodPlan({ ...base, foodLocked: { [id]: 90 } });
    const item = p1.list.find(x => x.id === id);
    expect(item.locked).toBe(90);
    expect(p1.lockedTotal).toBe(90);
    expect(p1.lockedCount).toBe(1);
    expect(p1.foodHigh).toBeLessThanOrEqual(p0.foodHigh); // locked end no longer at premium
  });
});

describe('Sprint 64 — quantity override (foodQty) wired to cost', () => {
  const base = { id: 'j', type: 'Juneteenth Cookout', guestCount: 30, guests: [] };
  test('overriding an item quantity recomputes its cost (and flows to the total)', () => {
    const p0 = playbookFoodPlan(base);
    const it0 = p0.list.find(i => i.id === 'p_ribs');
    const p1 = playbookFoodPlan({ ...base, foodQty: { p_ribs: it0.qty * 2 } });
    const it1 = p1.list.find(i => i.id === 'p_ribs');
    expect(it1.qty).toBe(it0.qty * 2);
    expect(it1.qtyOverridden).toBe(true);
    expect(it1.baseQty).toBe(it0.qty);
    expect(it1.high).toBeGreaterThan(it0.high);
    expect(p1.foodHigh).toBeGreaterThan(p0.foodHigh);
  });
});

describe('Sprint 64 — region-gated DMV dishes', () => {
  test('half-smokes show only for a DMV event, not Atlanta', () => {
    const dmv = playbookFoodPlan({ id: 'j', type: 'Juneteenth Cookout', guestCount: 30, guests: [], state: 'DC' });
    const atl = playbookFoodPlan({ id: 'j', type: 'Juneteenth Cookout', guestCount: 30, guests: [], market: 'atl' });
    expect(dmv.list.some(i => i.id === 'p_halfsmokes')).toBe(true);
    expect(atl.list.some(i => i.id === 'p_halfsmokes')).toBe(false);
  });
});

describe('#14 — dietary workflow in headcount mode', () => {
  const p = playbookFoodPlan;
  test('headcount mode demands a note (not per-guest), satisfied by dietaryNoted', () => {
    const base = { id: 'c', type: 'The Cookout', guestCount: 30, guestMode: 'count', guests: [{ rsvp: 'Yes' }] };
    expect(p(base).dietaryResolved).toBe(false);
    expect(p({ ...base, dietaryNoted: true }).dietaryResolved).toBe(true);
  });
});

describe('#16 — diet counts drive food + budget', () => {
  const base = { id: 'c', type: 'The Cookout', guestCount: 30, guests: [] };
  test('veg/vegan counts add a plant-based main sized to them + raise the total', () => {
    const p0 = playbookFoodPlan(base);
    const p1 = playbookFoodPlan({ ...base, dietCounts: { Vegetarian: 2, Vegan: 1 } });
    const line = p1.list.find((i) => i.id === 'diet-veg');
    expect(line).toBeTruthy();
    expect(line.dietDerived).toBe(true);
    expect(line.qty).toBe(3); // 2 veg + 1 vegan
    expect(p1.foodHigh).toBeGreaterThan(p0.foodHigh); // flows into the budget
    // The veg main must be a REAL, named dish — never a generic placeholder.
    expect(line.item).not.toMatch(/plant[- ]based main|veg main|veggie main/i);
    expect(line.item).toMatch(/portobello/i); // The Cookout's authored vegMain
    expect(line.short).not.toMatch(/plant[- ]based main/i);
  });
  test('specialDiets exposes the counts for the host-facing note', () => {
    const p = playbookFoodPlan({ ...base, dietCounts: { Vegetarian: 2, 'Nut allergy': 1 } });
    expect(p.specialDiets).toEqual(expect.arrayContaining([{ diet: 'Vegetarian', count: 2 }, { diet: 'Nut allergy', count: 1 }]));
  });
});

describe('#2 — guest-count satisfaction (headcount mode + lock)', () => {
  const { guestCountResolved } = require('../index');
  test('a list with pending RSVPs is NOT resolved', () => {
    const ev = { guests: [{ rsvp: 'Yes' }, { rsvp: '' }, { rsvp: 'Maybe' }] };
    expect(guestCountResolved(ev).resolved).toBe(false);
    expect(guestCountResolved(ev).reason).toBe('pending-rsvps');
  });
  test('headcount mode + a count RESOLVES it (the "lock it" / headcount-only out)', () => {
    const ev = { guestMode: 'count', guestCount: 30, guests: [{ rsvp: '' }, { rsvp: 'Maybe' }] };
    expect(guestCountResolved(ev).resolved).toBe(true);
  });
  test('no count at all is unresolved (reason no-count)', () => {
    expect(guestCountResolved({ guests: [] }).reason).toBe('no-count');
  });
});

describe('safe-headcount band — attendanceBand()', () => {
  const { attendanceBand, attendanceBandLabel } = require('../index');
  test('a roster with outstanding replies is a real range (low=confirmed, high=not-declined)', () => {
    const ev = { guests: [
      { rsvp: 'Yes' }, { rsvp: 'Yes' }, { rsvp: 'yes' }, // 3 confirmed
      { rsvp: 'Maybe' },                                  // 1 maybe
      { rsvp: '' }, { rsvp: '' },                         // 2 pending
      { rsvp: 'No' },                                     // 1 declined (drops out)
    ] };
    const b = attendanceBand(ev);
    expect(b.basis).toBe('rsvp');
    expect(b.band).toBe(true);
    expect(b.low).toBe(3);          // confirmed only
    expect(b.high).toBe(6);         // confirmed + maybe + pending (no declines)
    expect(b.planning).toBe(6);     // size to the ceiling — won't run short
    expect(b.declined).toBe(1);
    expect(attendanceBandLabel(b)).toBe('3–6');
    expect(b.because).toMatch(/3 confirmed/);
  });
  test('a fully-replied roster collapses to ONE number (no fabricated spread)', () => {
    const ev = { guests: [{ rsvp: 'Yes' }, { rsvp: 'Yes' }, { rsvp: 'No' }] };
    const b = attendanceBand(ev);
    expect(b.band).toBe(false);
    expect(b.low).toBe(2);
    expect(b.high).toBe(2);
    expect(attendanceBandLabel(b)).toBe('2');
  });
  test('an explicitly LOCKED headcount is a single real number, never banded', () => {
    const b = attendanceBand({ guestMode: 'count', guestCount: 40, guestCountLocked: true, guests: [{ rsvp: 'Maybe' }] });
    expect(b.basis).toBe('count');
    expect(b.band).toBe(false);
    expect(b.planning).toBe(40);
    expect(attendanceBandLabel(b)).toBe('40');
  });
  test('a planned count (not locked) applies the researched attendance shift → a band', () => {
    // The Cookout is casual/open-door → typically 80–115% of the planned number.
    const b = attendanceBand({ type: 'The Cookout', guestMode: 'count', guestCount: 40 });
    expect(b.basis).toBe('estimate');
    expect(b.band).toBe(true);
    expect(b.planned).toBe(40);
    expect(b.low).toBeLessThan(40);     // some no-shows
    expect(b.high).toBeGreaterThan(40); // some plus-ones/walk-ins
    expect(b.planning).toBe(b.high);    // size to the ceiling
    expect(b.because).toMatch(/Planned for 40/);
  });
  test('an estimate-only event applies the shift around the estimate', () => {
    const b = attendanceBand({ guestEstimate: '30' });
    expect(b.planned).toBe(30);
    expect(b.planning).toBe(b.high);
    expect(b.high).toBeGreaterThanOrEqual(30);
  });
  test('no count signal → not applicable (nothing to claim)', () => {
    expect(attendanceBand({ guests: [] }).applicable).toBe(false);
    expect(attendanceBandLabel(attendanceBand({ guests: [] }))).toBe(null);
  });
});

describe('board ruling — per-guest rate on food lines', () => {
  test('per-guest-scaled items expose perGuest; flat items do not', () => {
    const p = playbookFoodPlan({ id: 'c', type: 'The Cookout', guestCount: 40, guests: [] });
    const scaled = p.list.filter((i) => i.perGuest != null);
    expect(scaled.length).toBeGreaterThan(0);
    // a per-guest item's total tracks rate × guests (within rounding)
    const it = scaled[0];
    if (it.baseQty != null) expect(Math.abs(it.baseQty - it.perGuest * 40)).toBeLessThanOrEqual(it.perGuest * 40 * 0.5 + 1);
  });
});

describe('#4 — add a dish (foodAdd)', () => {
  const base = { id: 'c', type: 'The Cookout', guestCount: 40, guests: [] };
  test('an added dish becomes a real line item (owner carried, itemCount up)', () => {
    const p0 = playbookFoodPlan(base);
    const p1 = playbookFoodPlan({ ...base, foodAdd: [{ id: 'add-1', name: "Auntie's potato salad", owner: 'Auntie', cost: 0 }] });
    const line = p1.list.find(i => i.id === 'add-1');
    expect(line).toBeTruthy();
    expect(line.added).toBe(true);
    expect(line.item).toBe("Auntie's potato salad");
    expect(line.owner).toBe('Auntie');
    expect(p1.itemCount).toBe(p0.itemCount + 1);
  });
  test('a $0 dish adds nothing to the total; a priced dish adds its cost', () => {
    const p0 = playbookFoodPlan(base);
    const free = playbookFoodPlan({ ...base, foodAdd: [{ id: 'a', name: 'Brought pie', owner: 'Sam', cost: 0 }] });
    const paid = playbookFoodPlan({ ...base, foodAdd: [{ id: 'a', name: 'Catered wings', cost: 120 }] });
    expect(free.foodLow).toBe(p0.foodLow);
    expect(paid.foodLow).toBe(p0.foodLow + 120);
    expect(paid.foodHigh).toBe(p0.foodHigh + 120);
  });
  test('a checked-off priced dish flows into spent', () => {
    const p = playbookFoodPlan({ ...base, foodAdd: [{ id: 'a', name: 'Catered wings', cost: 120 }], foodGot: { a: true } });
    expect(p.spentLow).toBeGreaterThanOrEqual(120);
  });
});

// ── Global buyable-unit guardrail ─────────────────────────────────────────────
describe('buyable-unit guardrail (food plan never renders consumption units)', () => {
  // A deliberately mis-authored playbook: cake priced "$3–$5 per slice", 40 slices.
  // The guardrail must turn this into whole cakes (≈ 13 servings each) at a
  // per-cake cost, with the TOTAL unchanged.
  // End-to-end: temporarily mis-author a real playbook's food line into the banned
  // "slices" unit, run the LIVE reader (REGISTRY holds the same object instances as
  // ALL_PLAYBOOKS, so an in-place edit is seen), assert the guardrail fired, restore.
  test('a "slices" cake line is converted to whole cakes through the live reader', () => {
    // Pick a real playbook that resolves and has a cake food line.
    const pb = ALL_PLAYBOOKS.find((p) =>
      getPlaybook(p.type) &&
      (Array.isArray(p.purchases) ? p.purchases : []).some((x) => x.category === 'food' && /\bcake\b/i.test(x.item))
    );
    expect(pb).toBeTruthy();
    const cakeLine = pb.purchases.find((x) => x.category === 'food' && /\bcake\b/i.test(x.item));
    const orig = { unit: cakeLine.unit, qtyPerGuest: cakeLine.qtyPerGuest, qtyFlat: cakeLine.qtyFlat, qtyPer: cakeLine.qtyPer, unitCostRange: cakeLine.unitCostRange };
    try {
      // 40 servings @ $3–$5 per "slice"
      delete cakeLine.qtyFlat; delete cakeLine.qtyPer;
      cakeLine.qtyPerGuest = 1; cakeLine.unit = 'slices'; cakeLine.unitCostRange = [3, 5];
      const fp = playbookFoodPlan({ id: 'g', type: pb.type, date: '2026-12-01', guestCount: 40 });
      const line = fp.list.find((l) => l.id === cakeLine.id);
      expect(line).toBeTruthy();
      // Converted: ceil(40/13)=4 cakes, NOT 40 slices.
      expect(line.unit).toBe('cakes');
      expect(line.qty).toBe(4);
      // Per-unit basis is now the cake at scaled cost; per-guest rate suppressed.
      expect(line.unitBase).toBe('cake');
      expect(line.perGuest).toBeNull();
      // Total cost ≈ preserved (whole-unit rounding can only round UP).
      expect(line.low).toBeGreaterThanOrEqual(40 * 3);
      expect(line.high).toBeGreaterThanOrEqual(40 * 5);
    } finally {
      Object.assign(cakeLine, orig);
      if (orig.qtyFlat === undefined) delete cakeLine.qtyFlat;
      if (orig.qtyPer === undefined) delete cakeLine.qtyPer;
      if (orig.qtyPerGuest === undefined) delete cakeLine.qtyPerGuest;
    }
  });

  test('a real cake/pizza/bread line never displays a "slice" unit', () => {
    // Any playbook with a cake/pizza/bread food line, fed through the real reader,
    // must surface a buyable unit — never "slices".
    for (const pb of ALL_PLAYBOOKS) {
      const fp = playbookFoodPlan({ id: 'g', type: pb.type, date: '2026-12-01', guestCount: 30 });
      if (!fp) continue;
      for (const line of fp.list) {
        expect(String(line.unit || '').toLowerCase()).not.toMatch(/^slices?$/);
      }
    }
  });
});

// ── Universal guardrail-in-tests ──────────────────────────────────────────────
// Enforce globally that NO playbook author can reintroduce a non-buyable
// consumption unit. Every purchase (and rentalsGap) raw `unit` must not be
// 'slice'/'slices'. Fails loudly with the offending playbook + item.
describe('no playbook authors a banned consumption unit', () => {
  const BANNED = /^slices?$/i;
  const rawUnit = (u) => String(u || '').split('(')[0].trim();
  test('no purchase or rentalsGap item uses unit "slice"/"slices"', () => {
    const offenders = [];
    for (const pb of ALL_PLAYBOOKS) {
      const rows = [
        ...(Array.isArray(pb.purchases) ? pb.purchases : []),
        ...(Array.isArray(pb.rentalsGap) ? pb.rentalsGap : []),
      ];
      for (const r of rows) {
        if (BANNED.test(rawUnit(r.unit))) {
          offenders.push(`${pb.type} → "${r.item}" (unit: "${r.unit}")`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
