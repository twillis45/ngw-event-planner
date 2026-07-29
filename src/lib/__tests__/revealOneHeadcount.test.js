// ─── ONE HEADCOUNT ON THE REVEAL (host ruling "single points of truth") ─────
//
// Driven 2026-07-29: creating "Graduation cookout for Andre, June 6, 45 people"
// produced a reveal reading "6 items for 47 guests" three lines above Guest
// Planning's "45 guests" — two headcounts on one screen, on the screen whose
// closing line promises "All of this came straight from your answers — nothing
// made up."
//
// Neither number was wrong. The 47 is the food plan's internal planned-for
// figure (buy to the high end of likely attendance so the host doesn't run
// short); the 45 is what the host said. Having BOTH on one screen is the
// defect, and it happened because this file resolved the headcount in three
// separate places and one of them reached for a different field entirely.
//
// This gate holds the rule: every stage that states a headcount states the SAME
// one, and it comes from the single resolver.
const { buildAssembleRevealStages, resolveGuestCount } = require('../assembleRevealEngines');

const evt = (over) => ({
  id: 'ev-headcount-test',
  name: 'Andre’s Graduation',
  type: 'Graduation',
  date: '2027-06-06',
  venue: 'Backyard',
  // guestMode 'count' is what the create flow writes, and it is what makes
  // attendanceBand applicable — without it the band collapses to the explicit
  // number and this fixture cannot reproduce the split it exists to police.
  guestMode: 'count',
  guestEstimate: 45,
  budget: [], vendors: [], guests: [],
  ...over,
});

describe('the reveal states one headcount', () => {
  it('resolves in the app’s order: locked count, then estimate, then roster', () => {
    expect(resolveGuestCount({ guestCount: 30, guestEstimate: 45 })).toBe(30);
    expect(resolveGuestCount({ guestEstimate: 45 })).toBe(45);
    expect(resolveGuestCount({ guests: [{}, {}, {}] })).toBe(3);
    expect(resolveGuestCount({})).toBe(0);
    expect(resolveGuestCount(null)).toBe(0);
  });

  it('never prints two different guest numbers across the stages', () => {
    const stages = buildAssembleRevealStages(evt(), null, null, {}) || [];
    expect(stages.length).toBeGreaterThan(0);

    // Every "<n> guests" the host can read, from every stage's own words.
    const nums = new Set();
    for (const st of stages) {
      for (const field of [st && st.what, st && st.why]) {
        const re = /(\d+)\s+guests?\b/g;
        let m;
        while ((m = re.exec(String(field || '')))) nums.add(Number(m[1]));
      }
    }
    // Zero is fine (a stage set may not state one); two DIFFERENT ones never are.
    expect([...nums].length).toBeLessThanOrEqual(1);
    if (nums.size === 1) expect([...nums][0]).toBe(resolveGuestCount(evt()));
  });

  // Host ruling, 2026-07-29: "keep the derivation for the overage, just be
  // consistent with information to host so they understand what is an estimate."
  // So the overage is NOT hidden — it is named, in its own words, as an estimate.
  // Deleting it to make the first two tests pass would be the wrong fix.
  it('keeps the overage and marks it as an estimate', () => {
    const stages = buildAssembleRevealStages(evt(), null, null, {}) || [];
    const food = stages.find(s => s && s.key === 'food');
    expect(food).toBeTruthy();
    const planFor = require('../playbooks').sizingGuests(evt());
    expect(planFor).toBeGreaterThan(resolveGuestCount(evt())); // fixture must actually plan up
    expect(food.why).toMatch(/estimate/i);
    expect(food.why).toMatch(new RegExp('\\b' + planFor + '\\b'));
    // …and the overage is never phrased as a second headcount.
    expect(food.why).not.toMatch(new RegExp(planFor + '\\s+guests'));
  });

  it('marks estimated shopping prices as estimated', () => {
    const stages = buildAssembleRevealStages(evt(), null, null, {}) || [];
    const shop = stages.find(s => s && s.key === 'shopping');
    expect(shop).toBeTruthy();
    expect(shop.why).toMatch(/estimated price/i);
  });

  it('states the host’s own number, not the food plan’s planned-for figure', () => {
    const stages = buildAssembleRevealStages(evt(), null, null, {}) || [];
    const food = stages.find(s => s && s.key === 'food');
    // NOT `if (!food) return` — that is how this gate first passed vacuously.
    // foodPP was being passed as null, which throws inside playbookFoodPlan; the
    // builder's try/catch swallowed it, no food stage was built, and the check
    // skipped itself. The food stage MUST exist for this fixture.
    expect(food).toBeTruthy();
    expect(food.what).toMatch(/\b45 guests\b/);
  });
});
