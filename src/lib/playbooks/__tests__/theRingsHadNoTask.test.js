// ─── ONE PURCHASE, TWO ACTS, AND ONLY ONE OF THEM HAD A DATE ────────────────
//
// `p_rings` has said "Order/size rings weeks ahead" since it was written, and
// nothing covered it. Its `buyAt: 'T-3d'` is a PACK-IT date — the row's own note
// is explicit that the day-of job is packing them — so on the only dated surface
// a host reads, a $100-$2,000 essential with a six-week production queue looked
// like a three-day errand. An elopement is usually travelled to, which makes it
// worse: the rings have to be in hand before the trip, not before the ceremony.
//
// ── WHAT THE SWEEP ACTUALLY FOUND, WHICH IS NOT WHAT WAS EXPECTED ───────────
// Eight purchase rows across all 45 playbooks name a second, earlier act. The
// finding inverts on measurement:
//
//   FIVE need nothing. Birthday, Graduation, Anniversary, Retirement and Vow
//   Renewal all put `buyAt` AT the stated lead ("Order 3-5 days ahead", buyAt
//   T-4d), so the one date is the one act.
//
//   TWO ARE ALREADY COVERED, at exactly the right leads, by checklist tasks the
//   playbooks already author — Quinceañera's `t_vendor_book` at T-180d ("...and
//   baker") and `t_florist` at T-90d, matching p_cake's authored "6 months out"
//   and p_florals' "3 months out". Asserted below so nobody builds a second
//   mechanism for a gap that is not there.
//
//   ONE was genuinely uncovered and is fixed here: Elopement's rings.
//
//   ONE stays uncovered on purpose: Wedding's `p_favors` says "Order well ahead
//   IF CUSTOM" — a conditional lead, on a non-essential row, with no researched
//   number. A date invented for it would be indistinguishable on screen from one
//   the corpus researched.
import { playbookChecklist, ALL_PLAYBOOKS } from '..';
import { resolveTimingProvenance, timingConflict, TIMING_SOURCES } from '../../knowledge/timingProvenance';

const TODAY = '2026-09-23';
const dateIn = (days) => new Date(Date.parse(`${TODAY}T12:00:00Z`) + days * 864e5)
  .toISOString().slice(0, 10);
const checklist = (type, days, extra = {}) => playbookChecklist({
  id: 'e', type, date: dateIn(days),
  guestMode: 'count', guestCount: 40, guests: [], budget: [], vendors: [], ...extra,
}, TODAY) || [];
const purchase = (type, id) => (ALL_PLAYBOOKS.find((p) => p.type === type).purchases || [])
  .find((p) => p.id === id);

describe('(premise) the rings row really does describe two acts', () => {
  test('the purchase is a three-day PACK, and the note says the order is separate', () => {
    // Without this the task below could be covering a row that only ever had
    // one act, which would make it noise rather than a fix.
    const r = purchase('Elopement', 'p_rings');
    expect(r.buyAt).toBe('T-3d');
    expect(r.essential).toBe(true);
    expect(r.unitCostRange).toEqual([100, 2000]);
    expect(r.note).toMatch(/PACK-IT date/);
    expect(r.note).toMatch(/eight weeks out/);
  });
});

describe('the order act is now a task, on the surface the shell renders', () => {
  const rings = (days) => checklist('Elopement', days).filter((r) => /Order and size the rings/.test(r.task));

  test('it exists, at eight weeks, and says why it takes that long', () => {
    const [t] = rings(70);
    expect(t).toBeTruthy();
    expect(t.leadDays).toBe(-56);
    expect(t.task).toMatch(/allow 6–8 weeks for making, engraving and any resize/);
  });

  test('it is SEQUENCED, not appended — after travel, before attire', () => {
    // A lead that does not sit in the right place in the runway is a date with
    // no meaning. Travel is T-60d and attire T-30d; the rings belong between.
    const order = checklist('Elopement', 200).map((r) => r.leadDays);
    const at = checklist('Elopement', 200).findIndex((r) => /Order and size the rings/.test(r.task));
    expect(at).toBeGreaterThan(-1);
    expect(order[at - 1]).toBeLessThanOrEqual(-56);
    expect(order[at + 1]).toBeGreaterThanOrEqual(-56);
  });

  test('an elopement close in still shows it rather than hiding the miss', () => {
    const [t] = rings(20);
    expect(t).toBeTruthy();
    expect(t.dueInDays).toBeLessThan(0);
  });
});

describe('THE LEAD IS RESEARCHED, not chosen', () => {
  test('two independent jewellers are registered, dated, and cited', () => {
    for (const id of ['wongs-rings', 'precision-rings']) {
      const src = TIMING_SOURCES[id];
      expect(src).toBeTruthy();
      expect(src.url).toMatch(/^https:\/\//);
      expect(src.fetched).toBe('2026-09-23');
      expect(src.claim).toMatch(/6-8 weeks|six to eight weeks/i);
    }
  });

  test('the category grounds a rings deadline inside the window and refuses one outside it', () => {
    const inside = { id: 'rings', label: 'Order the wedding rings', when: 'T-56d' };
    const prov = resolveTimingProvenance(inside);
    expect(prov.category).toBe('rings');
    expect(prov.sources).toEqual(['wongs-rings', 'precision-rings']);
    // A three-day ring deadline contradicts the source rather than merely
    // lacking one — which is the distinction timingConflict exists to keep.
    const late = { id: 'rings', label: 'Order the wedding rings', when: 'T-3d' };
    expect(resolveTimingProvenance(late)).toBe(null);
    expect(timingConflict(late).direction).toBe('late');
  });

  test('IT DOES NOT SWALLOW THE DAY-OF STAGING JOBS', () => {
    // "ring bearer", "ring box" and "ring pillow" are day-of staging at T-1d.
    // Matching them would attach a six-week jeweller's lead to a job that takes
    // a minute — a false ground is worse than an honest absence.
    for (const label of ['Brief the ring bearer', 'Pack the ring box', 'Set out the ring pillow']) {
      expect(resolveTimingProvenance({ id: 'x', label, when: 'T-1d' })).toBe(null);
      expect(timingConflict({ id: 'x', label, when: 'T-1d' })).toBe(null);
    }
  });

  test('…and it does not hijack the BAND that plays music', () => {
    // The other "band". Quinceañera authors "DJ/banda"; a music booking is a
    // different category with a different window, and this must not claim it.
    for (const label of ['Book the band and DJ', 'Confirm the banda arrival time', 'Book caterer, photographer + videographer, DJ/banda, and baker; sign contracts and pay deposits']) {
      const prov = resolveTimingProvenance({ id: 'music', label, when: 'T-180d' });
      expect(prov === null || prov.category !== 'rings').toBe(true);
    }
  });
});

describe('AND IT GROUNDED A DECISION THAT HAD NOTHING — the unplanned gain', () => {
  test('Surprise Proposal’s ring-sourcing call now cites two dated jewellers', () => {
    // Registering the category for Elopement's TASK also reached a real
    // DECISION: "Ring: in-stock, custom, or family ring?" at T-45d, which sits
    // inside the jewellers' six-week floor and cited nothing before today.
    // Worth pinning as a claim rather than leaving as a side effect.
    const d = (ALL_PLAYBOOKS.find((p) => p.type === 'Surprise Proposal').decisions || [])
      .find((x) => x.id === 'ring_path');
    const prov = resolveTimingProvenance(d);
    expect(prov.category).toBe('rings');
    expect(prov.tier).toBe('researched');
    expect(prov.sources).toEqual(['wongs-rings', 'precision-rings']);
    // Inside the window, so it is a grounding and NOT a contradiction.
    expect(timingConflict(d)).toBe(null);
  });

  test('THE CEREMONY DECISION IS VETOED, and that is the one that mattered', () => {
    // Vow Renewal's "Lock the ceremony moment (vows, readings, rings/keepsake,
    // processional)" at T-35d mentions rings in passing. Before the veto it
    // matched, and reported a FALSE contradiction against a jeweller's floor —
    // on a decision about what happens during the ceremony. Found by sweeping
    // all 260 decisions, not by imagining the pattern's behaviour.
    const d = (ALL_PLAYBOOKS.find((p) => p.type === 'Vow Renewal').decisions || [])
      .find((x) => x.id === 'ceremony');
    expect(d.label).toMatch(/rings/);
    expect(timingConflict(d)).toBe(null);
    const prov = resolveTimingProvenance(d);
    expect(prov === null || prov.category !== 'rings').toBe(true);
  });
});

describe('the two quinceañera rows were ALREADY covered — no second mechanism', () => {
  test('the baker and the florist are on the checklist at the leads their notes state', () => {
    // This is the test that stopped a `orderAhead` purchase field being built:
    // the acts are covered, at exactly these dates, on the surface hostv2
    // renders. A second emitter would have duplicated both rows.
    const rows = checklist('Quinceañera', 200, { guestCount: 120 });
    const baker = rows.find((r) => /and baker/i.test(r.task));
    const florist = rows.find((r) => /Book florist/i.test(r.task));
    expect(baker.leadDays).toBe(-180);
    expect(florist.leadDays).toBe(-90);
    // …and those are the very leads the purchase rows' prose states.
    expect(purchase('Quinceañera', 'p_cake').note).toMatch(/6 months out/);
    expect(purchase('Quinceañera', 'p_florals').note).toMatch(/3 months out/);
  });
});

describe('the conditional lead stays unauthored', () => {
  test('Wedding favors names a second act, conditionally, and gets no invented date', () => {
    const f = purchase('Wedding', 'p_favors');
    expect(f.note).toMatch(/Order well ahead if custom/);
    expect(f.essential).toBeFalsy();
    // No wedding task claims to order favors. Staging them at T-1d is a
    // different act and is correctly where it is.
    const rows = checklist('Wedding', 400, { guestCount: 100 });
    const staging = rows.find((r) => /favors/i.test(r.task));
    expect(staging.leadDays).toBe(-1);
    expect(rows.filter((r) => /order.{0,20}favors/i.test(r.task))).toEqual([]);
  });
});
