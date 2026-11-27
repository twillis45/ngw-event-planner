// ─── EVERY SCREEN SAYS THE SAME THING (cross-screen agreement harness) ───────
//
// Owner rule, verbatim: "Single sources not duplicative sources."
//
// The Wanda audit (11/22/2026) found the same fact printed differently on two
// screens fifteen times. Each was fixed by giving the fact ONE reader
// (plusOneCount, vendorCounts, dietCountsFor, menuChoicesTally, budgetFor,
// catererPriceOf, guestCountFor, hostNameFor, formatVenueAddress, eventDates).
// A reader only helps if every surface calls it, so this file asks each fact
// the way EACH surface asks it — by calling the same function that surface
// calls — over every sample event the app ships (hostv2/src/eventPool.js
// ALL_SAMPLES, built from src/data/) plus ~20 generated variants, and asserts
// the answers agree.
//
// HOW TO READ A FAILURE
//   A `failing` row (test.failing semantics) is a KNOWN disagreement: the comment above its KNOWN
//   map names the finding (D-xx, written up in the lane-D audit report). The
//   suite stays green while the disagreement exists and turns RED the day it
//   is fixed — then delete the KNOWN entry. Never "fix" a red row by editing
//   the assertion: a new red row is a new disagreement.
//   AUDIT_RAW=1 ignores the KNOWN maps, so every disagreement prints its two
//   values as an ordinary failure.
//
// WHAT THIS DOES NOT COVER
//   Some surfaces compute their number inline in JSX with no callable function
//   (the guest sheet's "N heads", the vendor fold's `vendorSettled`, the
//   Command Center budget row in the frozen CRA shell). Those are listed in the
//   audit report as "untestable without extraction" rather than copied here —
//   a copy of the logic would test the copy.
//
// Run under several time zones (dates are where a TZ slip shows):
//   TZ=UTC / TZ=Pacific/Kiritimati (+14) / TZ=Pacific/Midway (−11)

// ── The host shell's event pool, loaded the way the shell loads it ──────────
// eventPool.js imports through the hostv2 `@app` alias; root jest has no such
// mapping, so each alias is mapped to the same file it resolves to in vite.
jest.mock('@app/lib/failureTelemetry', () => require('../failureTelemetry'), { virtual: true });
jest.mock('@app/lib/playbooks', () => require('../playbooks'), { virtual: true });
jest.mock('@app/lib/artworkMarks', () => require('../artworkMarks'), { virtual: true });
jest.mock('@app/lib/welcomeGate', () => require('../welcomeGate'), { virtual: true });
jest.mock('@app/lib/eventDates', () => require('../eventDates'), { virtual: true });
jest.mock('@app/lib/customEventStore', () => require('../customEventStore'), { virtual: true });
jest.mock('@app/lib/eventIds', () => require('../eventIds'), { virtual: true });
jest.mock('@app/lib/inviteTone', () => require('../inviteTone'), { virtual: true });
jest.mock('@app/theme/palette', () => require('../../theme/palette'), { virtual: true });
jest.mock('@app/data/sampleEventsExtra', () => require('../../data/sampleEventsExtra'), { virtual: true });
jest.mock('@app/data/sampleEventsDMV', () => require('../../data/sampleEventsDMV'), { virtual: true });
jest.mock('@app/data/wandaGoldEvent', () => require('../../data/wandaGoldEvent'), { virtual: true });
jest.mock('@app/data/repastSampleEvent', () => require('../../data/repastSampleEvent'), { virtual: true });

const { ALL_SAMPLES } = require('../../../hostv2/src/eventPool.js');

const pb = require('../playbooks');
const { eventPlan } = require('../../CommandCenter');
const { buildExperienceContext } = require('../experienceContext');
const { plusOneCount } = require('../plusOneCount');
const { guestCountFor } = require('../guestCountFor');
const { confirmedRsvpCovers } = require('../confirmedCovers');
const { buildSeatingPlan, confirmedGuests } = require('../seatingPlan');
const { kidsCountAfterRoster } = require('../kidsCountAfterRoster');
const { kidCount, vegCount } = require('../appetite');
const { buildBudgetRecoveryPlan } = require('../budgetRecovery');
const { budgetFor } = require('../budgetFor');
const { hostSpending } = require('../hostSpending');
const { budgetHeroCopy, planHeadroomLine } = require('../budgetCopy');
const { deriveEventPhaseProgress } = require('../phaseProgress');
const { vendorCounts, hiredVendors, isVendorSettled, buildVendorReadinessRollup } = require('../workstreams');
const { eventSpanLabel } = require('../eventDates');
const { spanNights, spanEnd, daysUntil, localISO } = require('../dates');
const { eventStartLabel } = require('../eventWhen');
const { draftInvite, placePhrase, fmtLongDate } = require('../doItForMe');
const { inviteCardModel } = require('../inviteCard');
const { tripIsMultiDay, tripDays } = require('../tripMeals');
const { venueFor, formatVenueAddress } = require('../venueFor');
const { derivePlaceIntelligence } = require('../placeIntelligence');
const { guestDietCounts } = require('../dietRows');
const { deriveHelperResponsibilities } = require('../helperResponsibility');
const { hostNameFor, isHostName } = require('../hostNameFor');
const { chosenCatererUnbooked } = require('../vendorPlan');

// ── Dates the variants use: LOCAL calendar days, never toISOString ──────────
const dayOut = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return localISO(d); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const WANDA = ALL_SAMPLES.find((e) => e && e.id === 'ev-x-wanda');

// ── ~20 generated variants: the shapes the samples under-cover ──────────────
// Built on Wanda (a rows-only budget, a quoted caterer, informal helpers, a
// count-mode event with plus-one rows) and on a plain Birthday.
const BDAY = {
  type: 'Birthday', name: 'Variant Birthday', date: dayOut(60), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Loft', venueKind: 'venue', venueCity: 'Bowie, MD',
  guestMode: 'count', guestCount: 30, guests: [], vendors: [], budget: [], timeline: [],
};
const ROSTER_GUESTS = [
  { id: 'r1', name: 'Denise Carter', rsvp: 'Yes', plusOne: '+3 (Nia + 2 boys)', kids: 2, meal: 'Vegetarian' },
  { id: 'r2', name: 'Ray Okafor', rsvp: 'Yes', plusOne: 'Jordan Lee', needs: 'Gluten-free' },
  { id: 'r3', name: 'Marcus Bell', rsvp: 'Maybe', plusOne: '+1', kids: 1 },
  { id: 'r4', name: 'Aunt Cee', rsvp: 'No', kids: 3 },                // declined, with kids
  { id: 'r5', name: 'Cousin Jerome', rsvp: 'Pending' },
  { id: 'r6', name: 'Vida Haynes', rsvp: 'Yes', needs: 'Vegetarian' },  // veg recorded in needs only
];
const v = (id, base, patch) => ({ ...clone(base), id, rsvpCode: id, name: `Variant ${id}`, ...patch });

const VARIANTS = [
  // People
  v('var-headcount-plain', BDAY, {}),
  v('var-headcount-rows', BDAY, { guests: clone(ROSTER_GUESTS) }),
  v('var-roster', BDAY, { guestMode: 'roster', guestCount: 0, guestEstimate: 0, guests: clone(ROSTER_GUESTS) }),
  v('var-roster-all-replied', BDAY, { guestMode: 'roster', guestCount: 20, guestEstimate: 0,
    guests: clone(ROSTER_GUESTS).map((g) => ({ ...g, rsvp: g.rsvp === 'No' ? 'No' : 'Yes' })) }),
  // Budget
  v('var-budget-none', BDAY, { totalBudget: '', budget: [] }),
  v('var-budget-total', BDAY, { totalBudget: 2500 }),
  v('var-budget-rows', BDAY, { budget: [{ id: 'b1', category: 'Food', budgeted: 900 }, { id: 'b2', category: 'Venue', budgeted: 600 }] }),
  v('var-budget-over', BDAY, { totalBudget: 500, vendors: [{ id: 'vv1', name: 'Loft Events', category: 'Venue', status: 'Contracted', cost: 1200, depositAmt: 200, depositPaid: true }] }),
  // Caterer
  v('var-caterer-picked', BDAY, { foodChoices: { food_style: 'Drop-off catering' } }),
  v('var-caterer-quoted', BDAY, { foodChoices: { food_style: 'Drop-off catering' },
    vendors: [{ id: 'vc1', name: 'Semper Catering Co.', category: 'Catering', status: 'Quoted', cost: 1500 }] }),
  v('var-caterer-booked', BDAY, { foodChoices: { food_style: 'Drop-off catering' },
    vendors: [{ id: 'vc1', name: 'Semper Catering Co.', category: 'Catering', status: 'Contracted', cost: 1500, depositAmt: 300, depositPaid: true }] }),
  // Vendors
  v('var-informal-vendors', BDAY, { vendors: [
    { id: 'vi1', name: 'Loft Events', category: 'Venue', status: 'Confirmed', cost: 800, depositAmt: 200, depositPaid: true, balancePaid: true, contractSigned: true },
    { id: 'vi2', name: 'Sister Rae (singing)', category: 'Entertainment', status: 'Asked', isInformal: true, coiStatus: 'n/a' },
  ] }),
  // Dates
  v('var-multi-day', BDAY, { endDate: dayOut(62) }),
  v('var-destination', BDAY, { type: 'Birthday', isDestination: true, endDate: dayOut(63), venue: 'Casa del Sol', venueCity: 'Scottsdale, AZ' }),
  v('var-derived-start', BDAY, { startTimeSource: 'derived' }),
  // Venue
  v('var-funeral-home', BDAY, { type: 'Repast', venue: 'Marshall Funeral Home', venueKind: 'venue', venueCity: 'Petersburg, VA' }),
  v('var-backyard-city', BDAY, { venue: 'Backyard', venueKind: 'home', venueCity: 'Bowie, MD' }),
  v('var-home-street', BDAY, { venue: 'Our place', venueKind: 'home', venueStreet: '12 Elm St', venueCity: 'Bowie, MD' }),
  // Diet
  v('var-diets-array', BDAY, { guests: [{ id: 'd1', name: 'Pat Lin', rsvp: 'Yes', diets: ['Vegetarian'] }, { id: 'd2', name: 'Sam Roe', rsvp: 'Yes', allergens: ['Nut allergy'] }] }),
  v('var-plusone-needs', BDAY, { guests: [{ id: 'p1', name: 'Pat Lin', rsvp: 'Yes', plusOne: 'Chris', plusOneNeeds: 'Vegetarian' }] }),
  v('var-veg-and-vegan', BDAY, { guestMode: 'roster', guests: [{ id: 'vv', name: 'Pat Lin', rsvp: 'Yes', needs: 'Vegetarian, Vegan' }] }),
  // Host
  v('var-host-field', BDAY, { host: 'Wanda Mundy' }),
  v('var-wanda-roster', WANDA, { guestMode: 'roster' }),
  v('var-wanda-total', WANDA, { totalBudget: 5000 }),
];

const EVENTS = [...ALL_SAMPLES, ...VARIANTS].filter((e) => e && e.id);
const NOW = new Date();

// ── The harness ─────────────────────────────────────────────────────────────
// `failing` is jest's test.failing (jest ≥ 28), which this repo's jest 27.5
// does not have: green while the body throws, red once it stops throwing.
const failing = (name, fn) => test(name, () => {
  let threw = false;
  try { fn(); } catch (_e) { threw = true; }
  if (!threw) throw new Error(`${name}: the surfaces agree now — the finding is fixed; delete its KNOWN entry.`);
});

// `known` maps an event id to the finding id that explains why the surfaces
// disagree there. A known row runs as `failing`: green while broken, red
// the day it is fixed.
function agree(fact, known, check) {
  describe(fact, () => {
    for (const ev of EVENTS) {
      const finding = process.env.AUDIT_RAW ? null : known[ev.id];
      (finding ? failing : test)(`${ev.id}${finding ? `  [${finding}]` : ''}`, () => check(ev));
    }
  });
  // A stale entry is the list lying: every id must be a real event.
  test(`${fact} — every known id names a real event`, () => {
    expect(Object.keys(known).filter((id) => !EVENTS.some((e) => e.id === id))).toEqual([]);
  });
}

const safe = (f) => { try { return f(); } catch (_e) { return undefined; } };
const plan = (ev) => safe(() => pb.playbookFoodPlan(ev));
const isPre = (ev) => { const d = daysUntil(ev.date); return d != null && d > 0; };
const ppItem = (ev, id) => {
  const pp = safe(() => deriveEventPhaseProgress(ev, NOW));
  return pp && Array.isArray(pp.items) ? pp.items.find((i) => i.id === id) : undefined;
};
const asRoster = (ev) => ({ ...ev, guestMode: 'roster' });
const hasRoster = (ev) => ev.guestMode !== 'count' && Array.isArray(ev.guests) && ev.guests.length > 0;

// ═══ 1 · PEOPLE EXPECTED ════════════════════════════════════════════════════
// Seating ("Seated N of N"), the attendance band and the plates every caterer
// and budget-recovery line is sized against.

agree('people · seating confirmed = attendance band confirmed (people on Yes rows)', {}, (ev) => {
  const seat = buildSeatingPlan(ev);
  const band = pb.attendanceBand(asRoster(ev));
  const bandConfirmed = band && band.basis === 'rsvp' ? band.confirmed : 0;
  expect(seat.totals.confirmed).toBe(bandConfirmed);
});

// D-01: seating counts chairs for adults and plus-ones but not the kids those
// confirmed rows bring; confirmedRsvpCovers (plates, budget recovery, the
// caterer mismatch) counts the kids. "Seated 5 of 5" beside 6 plates.
const D01 = 'D-01 seating omits confirmed kids';
agree('people · seating confirmed = confirmed covers (plates)', {
  'ev-x-engagement-party': D01, 'ev-x-vow-renewal': D01, 'ev-x-anniversary': D01, 'ev-x-baby-shower': D01,
  'ev-x-birthday': D01, 'ev-x-graduation': D01, 'ev-x-retirement-party': D01, 'ev-x-home-gathering': D01,
  'ev-x-gender-reveal': D01, 'ev-dmv-wedding': D01, 'ev-dmv-home-gathering': D01,
  'test-roster-rsvp': D01, 'test-roster-final-count': D01,
  'var-headcount-rows': D01, 'var-roster': D01, 'var-roster-all-replied': D01,
}, (ev) => {
  expect(buildSeatingPlan(ev).totals.confirmed).toBe(confirmedRsvpCovers(ev));
});

agree('people · seating "Kids N" chip = attendance band confirmed kids', {}, (ev) => {
  const chip = (buildSeatingPlan(ev).dietChips || []).find((c) => /^Kids /.test(c));
  const band = pb.attendanceBand(asRoster(ev));
  const bandKids = band && band.basis === 'rsvp' ? band.low - band.confirmed : 0;
  expect(chip ? Number(chip.slice(5)) : 0).toBe(bandKids);
});

agree('people · budget recovery "Re-size for N" = confirmed covers, never in headcount mode', {}, (ev) => {
  const rec = safe(() => buildBudgetRecoveryPlan(ev));
  const s = rec && (rec.suggestions || []).find((x) => x.id === 'guests-rightsize');
  if (!s) return;
  expect(ev.guestMode).not.toBe('count');
  const m = /Re-size for (\d+) confirmed guests \(plan is sized for (\d+)\)/.exec(s.label);
  expect(m).not.toBeNull();
  expect(Number(m[1])).toBe(confirmedRsvpCovers(ev));
  expect(Number(m[2])).toBe(guestCountFor(ev).count);
});

// D-02: the kids-count store (kidsCountAfterRoster, written on every guest
// edit) sums the kids on EVERY row, a declined row's included; the food
// engine's kids (appetite.kidCount, via the attendance band) skip declined rows.
const D02 = 'D-02 kids store counts a declined row\'s kids';
agree('people · kids store (guest edits) = kids the food plan sizes for', {
  'var-roster': D02,
}, (ev) => {
  if (!hasRoster(ev)) return;
  // Only when the list speaks for the party (not short of the planned count):
  // then kidsCountAfterRoster returns the list's own total.
  const planned = Number(guestCountFor(ev).count) || 0;
  const people = ev.guests.reduce((t, g) => t + 1 + plusOneCount(g) + (Number(g.kids) || 0), 0);
  if (planned > 0 && people < planned) return;
  expect(kidsCountAfterRoster(ev, ev.guests)).toBe(kidCount(ev));
});

// The guest tile's "planning for N" / "likely X–Y" (sizingRange) and the
// Spread's "for N guests" (the food plan) both size to sizingGuests.
agree('people · the Spread\'s guests = sizingGuests = the guest tile\'s top of range', {}, (ev) => {
  const p = plan(ev);
  if (!p || !p.hasRealCount) return;
  expect(p.guests).toBe(pb.sizingGuests(ev));
  const r = safe(() => pb.sizingRange(ev));
  if (r) expect(r.high).toBe(p.guests);
});

// ═══ 2 · BUDGET SET / TOTAL ═════════════════════════════════════════════════
// Board ("Your budget — $N", budgetFor), Your money (hostSpending /
// budgetHeroCopy), its recovery panel, the plan ledger, After.

agree('budget · board total = Your money planned (hostSpending)', {}, (ev) => {
  const b = budgetFor(ev);
  expect(hostSpending(ev).total).toBe(b.isSet ? b.total : 0);
});

agree('budget · board "set" = Your money hero is not "unset"', {}, (ev) => {
  expect(budgetHeroCopy(ev).state !== 'unset').toBe(budgetFor(ev).isSet);
});

agree('budget · board "set" = plan ledger does not ask "Set your budget"', {}, (ev) => {
  if (!isPre(ev)) return;
  const item = ppItem(ev, 'budget');
  expect(item).toBeDefined();
  expect(item.cueLabel === 'Set your budget').toBe(!budgetFor(ev).isSet);
});

agree('budget · board "set" = recovery panel has a budget to measure against', {}, (ev) => {
  expect(buildBudgetRecoveryPlan(ev).status !== 'needs_more_data').toBe(budgetFor(ev).isSet);
});

agree('budget · board "set" = After prints a headroom line', {}, (ev) => {
  const s = hostSpending(ev);
  const line = planHeadroomLine({ planned: s.total, expected: s.expected, committed: s.committed, spent: s.spent }, false);
  expect(line != null).toBe(budgetFor(ev).isSet);
});

// ═══ 3 · EXPECTED TOTAL AND OVER / UNDER ════════════════════════════════════

agree('money · Your money hero "over" = plan ledger budget part "over" (both on known costs)', {}, (ev) => {
  if (!isPre(ev) || !budgetFor(ev).isSet) return;
  const item = ppItem(ev, 'budget');
  const ledgerOver = !!(item && /over your budget/.test(String(item.cueLabel || '')));
  expect(ledgerOver).toBe(budgetHeroCopy(ev).state === 'over');
});

// D-03 (fixed; owner ruling 11/22/2026 "Expected spending"): the Your money
// hero and the plan ledger judged over/under on COMMITTED costs while After and
// the recovery panel judged it on EXPECTED costs — "about $N left" beside
// "Expected to run $M over". All four now judge on expected.
agree('money · Your money hero over/under = After over/under', {}, (ev) => {
  const s = hostSpending(ev);
  if (!(s.total > 0)) return;
  const afterOver = /over the/.test(planHeadroomLine({ planned: s.total, expected: s.expected, committed: s.committed }, false));
  expect(afterOver).toBe(budgetHeroCopy(ev).state === 'over');
});

agree('money · the Spread range holds the food + supplies Your money expects', {}, (ev) => {
  const s = hostSpending(ev);
  const p = plan(ev);
  if (!s.hasFood || !p) return;
  const lo = (p.foodLow || 0) + (p.suppliesLow || 0);
  const hi = (p.foodHigh || 0) + (p.suppliesHigh || 0);
  const exp = s.foodEstimate + s.suppliesEstimate;
  expect(exp).toBeGreaterThanOrEqual(lo - 1);
  expect(exp).toBeLessThanOrEqual(hi + 1);
});

agree('money · a quoted or booked caterer is the Spread\'s catering line', {}, (ev) => {
  const q = pb.catererPriceOf(ev);
  const p = plan(ev);
  const line = p && (p.list || []).find((i) => i.id === 'fa-catering');
  if (!q || !line || line.locked != null) return;
  expect([line.low, line.high]).toEqual([q.cost, q.cost]);
});

// ═══ 4 · VENDOR COUNTS ══════════════════════════════════════════════════════
// Board ("N of M booked", the canonical rollup inside eventPlan), the vendor
// sheet hero ("Booked so far", vendorCounts) and the plan ledger's Vendors part.

agree('vendors · sheet hero counts (vendorCounts) = rollup counts', {}, (ev) => {
  const vc = vendorCounts(ev);
  const rc = buildVendorReadinessRollup(ev, null, ev.vendors).counts;
  expect({ total: rc.total, booked: rc.ready, confirmed: rc.confirmed }).toEqual(vc);
});

agree('vendors · board rollup (eventPlan, shell context) = sheet hero counts', {}, (ev) => {
  const ctx = safe(() => buildExperienceContext(ev, null, 1)) || null;
  const p = eventPlan(ev, ctx);
  const rc = (p && p.vendorReadinessRollup && p.vendorReadinessRollup.counts) || { total: 0, ready: 0, confirmed: 0 };
  const vc = vendorCounts(ev);
  expect({ total: rc.total, booked: rc.ready, confirmed: rc.confirmed }).toEqual(vc);
});

// D-04: the plan ledger's Vendors part tests every NAMED vendor with
// isVendorSettled — informal helpers included — while the vendor sheet's
// "Everyone's locked in" and every vendor count read hired vendors only
// (P0-9). A friend who is helping and has not "confirmed" holds the board's
// Vendors part open ("Follow up with Sister Rae") under a sheet that says
// everyone is locked in.
const D04 = 'D-04 ledger Vendors part counts informal helpers';
agree('vendors · ledger Vendors part handled = every hired vendor settled', {
  'var-informal-vendors': D04,
}, (ev) => {
  if (!isPre(ev)) return;
  const item = ppItem(ev, 'vendors');
  if (!item) return;
  const caterer = safe(() => chosenCatererUnbooked(ev));
  if (caterer) return; // the part is then about booking the chosen caterer
  const hired = hiredVendors(ev).filter((x) => String(x.name || '').trim());
  expect(item.handled).toBe(hired.length > 0 && hired.every(isVendorSettled));
});

// ═══ 5 · DATES, RANGE, START TIME ═══════════════════════════════════════════
// Eyebrow / board / Space (eventSpanLabel), the invite text (draftInvite), the
// invite card (inviteCardModel), Your days (tripDays), the run of show.

const weekdayDay = (s) => {
  const m = /(Sun|Mon|Tue|Wed|Thu|Fri|Sat)[a-z]*,\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/.exec(String(s || ''));
  return m ? `${m[1]} ${m[2]} ${m[3]}` : null;
};

agree('dates · eyebrow day = invite text day = invite card day', {}, (ev) => {
  if (!ev.date) return;
  const eyebrow = spanNights(ev) > 0 ? null : weekdayDay(eventSpanLabel(ev));
  const invite = weekdayDay(fmtLongDate(ev.date));
  const card = weekdayDay((inviteCardModel(ev).facts.find((f) => f.label === 'When') || {}).value);
  expect(invite).not.toBeNull();
  expect(card).toBe(invite);
  if (eyebrow) expect(eyebrow).toBe(invite);
});

// D-05: a multi-day event's invite TEXT prints only its first day ("Sunday,
// December 13") while the eyebrow says "Dec 13–15 (2 nights)" and the invite
// CARD prints the range. Fixed: both read doItForMe.fmtLongSpan.
agree('dates · a multi-day event\'s invite text names its last day', {}, (ev) => {
  if (!(spanNights(ev) > 0)) return;
  const last = fmtLongDate(spanEnd(ev));
  expect(draftInvite(ev, null).body).toContain(last.split(', ')[1]);
});

agree('dates · Your days runs from the first day through spanEnd', {}, (ev) => {
  if (!tripIsMultiDay(ev)) return;
  const days = tripDays(ev);
  expect(days.length).toBe(spanNights(ev) + 1);
  expect(days[0].iso).toBe(String(ev.date).slice(0, 10));
  expect(days[days.length - 1].iso).toBe(spanEnd(ev));
});

agree('dates · invite text and invite card name the same start time', {}, (ev) => {
  const w = eventStartLabel(ev);
  const card = inviteCardModel(ev).facts.find((f) => f.label === 'When');
  const body = draftInvite(ev, null).body;
  if (!w) { if (card) expect(card.sub).toBe(''); return; }
  if (card) expect(card.sub).toBe(w.label);
  if (w.kind === 'exact') expect(body).toContain(w.label);
});

// D-06: run-of-show rows stored with a calendar day ("2026-10-15 11:00") are
// not moved by sampleDateRebase, so the Team Retreat's day sheet runs on
// October 15, 2026 for an event the eyebrow dates February 20, 2027.
const D06 = 'D-06 run-of-show days not rebased';
agree('dates · a run-of-show row\'s calendar day falls inside the event', {
  'ev-x-team-retreat': D06, 'ev-dmv-home-gathering': D06,
}, (ev) => {
  if (!ev.date) return;
  const rows = safe(() => pb.effectiveRos(ev)) || [];
  const start = String(ev.date).slice(0, 10);
  const end = spanEnd(ev);
  // A setup/arrival day before the event is allowed; anything outside
  // [start − 3 days, end + 1 day] is a different event's calendar.
  const lo = new Date(start + 'T12:00:00'); lo.setDate(lo.getDate() - 3);
  const hi = new Date(end + 'T12:00:00'); hi.setDate(hi.getDate() + 1);
  for (const r of rows) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String((r && r.time) || ''));
    if (!m) continue;
    expect(m[1] >= localISO(lo) && m[1] <= localISO(hi)).toBe(true);
  }
});

// D-15 (fixed 11/22/2026, #235): Date & time's "guests arrive" and the invite
// said 6:00 PM; the run of show's arrival beat said 6:05 PM, because 35
// playbooks authored their doors / family-arrives beat at 'T0 +5m'. Those
// beats now sit at 'T0' (theDoorsOpenAtTheStartTime.test.js pins the corpus).
agree('dates · a host start time is on the run of show', {
}, (ev) => {
  const w = eventStartLabel(ev);
  if (!w || w.kind !== 'exact' || !/^\d{1,2}:\d{2}$/.test(String(ev.startTime || ''))) return;
  const rows = safe(() => pb.effectiveRos(ev)) || [];
  if (!rows.some((r) => /^\d{1,2}:\d{2}$/.test(String((r && r.time) || '')))) return; // untimed sheet
  const hhmm = String(ev.startTime).padStart(5, '0');
  expect(rows.some((r) => String((r && r.time) || '').padStart(5, '0') === hhmm)).toBe(true);
});

// D-07 (QA seeds, time-zone): eventPool's mkDate() builds its "today" seeds
// with setHours(12) then toISOString(), a UTC day. East of UTC+12 local noon
// is the previous UTC day, so "Test — Cookout (day of)" is yesterday's event
// in Auckland (summer), Tonga and Kiritimati.
const FAR_EAST = -new Date().getTimezoneOffset() >= 13 * 60;
(FAR_EAST ? failing : test)(`dates · the day-of QA seed is today${FAR_EAST ? '  [D-07 seed dates are UTC days]' : ''}`, () => {
  const ev = ALL_SAMPLES.find((e) => e.id === 'test-day-of');
  expect(daysUntil(ev.date)).toBe(0);
});

// ═══ 6 · VENUE ADDRESS LINE ═════════════════════════════════════════════════
// Board / Space (formatVenueAddress), invite text (placePhrase), invite card
// (inviteCardModel), Space's arrival section (placeIntelligence), the ledger.

// D-08: the invite text decides "is this her home?" with its own regex
// (/\bhome\b/, "our place"), not venueFor's kind. "Backyard" (venueFor: home)
// prints as "Backyard" to guests, and a venue named "Marshall Funeral Home"
// (venueFor: a venue) is printed as "our place". Fixed: placePhrase reads
// venueFor's kind.
agree('venue · invite text says "our place" exactly when venueFor says home', {}, (ev) => {
  const vf = venueFor(ev);
  if (!vf.name) return;
  expect(placePhrase(ev) === 'our place').toBe(!!vf.isHome);
});

agree('venue · invite text place line = the board\'s address line (not at home)', {}, (ev) => {
  const vf = venueFor(ev);
  if (!vf.name || vf.isHome || placePhrase(ev) === 'our place') return;
  expect(placePhrase(ev)).toBe(String(formatVenueAddress(ev)).split(' · ').join(', '));
});

agree('venue · invite card "Where" = the board\'s address line', {}, (ev) => {
  const where = inviteCardModel(ev).facts.find((f) => f.label === 'Where');
  expect(where ? where.value : '').toBe(formatVenueAddress(ev) || '');
});

// D-09 (fixed, 11/23/2026): at home, the ledger counted the address settled
// from a NAME ("Backyard" → venue_only), while Space's Guest arrival asked for
// the street. Both read venueFor's `findable` now; this asks the ledger's own
// part rather than re-deriving its rule.
agree('venue · ledger "address settled" = Space guest-arrival handled', {}, (ev) => {
  const part = ppItem(ev, 'venueaddress');
  if (!part) return;                  // the part applies once there is a town
  const arrival = derivePlaceIntelligence(ev).sections.find((x) => x.key === 'arrival');
  expect(arrival.state === 'handled').toBe(part.handled);
});

// ═══ 7 · DIETARY COUNTS ═════════════════════════════════════════════════════
// The Plan steppers and the estimate (dietCountsFor), the hero's allergy ask
// (plan.dietaryResolved → the ledger's food cue), the seating chips.

// D-10 (fixed): dietaryResolved (the hero's "Who has a food allergy?") read a
// row's `needs` and `meal` only, so a diet in the invite reply's `diets` /
// `allergens` arrays, or on the plus-one (`plusOneNeeds`), was on the Plan
// ("Vegetarian 1") while the hero still asked. It now reads guestDietCounts.
agree('diet · guest rows that name a diet close the allergy ask', {}, (ev) => {
  const counted = Object.values(guestDietCounts(ev)).some((n) => n > 0);
  const p = plan(ev);
  if (!counted || !p) return;
  expect(p.dietaryResolved).toBe(true);
});

// D-11: the seating chip "Veg N" has its own dietary reader (seatingPlan
// dietChipsFor): it reads meal / diets / the plus-one's plate, but not the
// guest's own `needs`, so a Yes row with needs "Vegetarian" is on the Plan and
// in the estimate's vegetarian main and not on the seating chip. It counts a
// "Vegetarian, Vegan" row once where vegCount counts it twice (HANDOFF open).
const D11 = 'D-11 seating chip has its own diet reader';
agree('diet · seating "Veg N" chip = the estimate\'s vegetarian count (Yes rows)', {
  'var-headcount-rows': D11, 'var-roster': D11, 'var-roster-all-replied': D11, 'var-veg-and-vegan': D11,
}, (ev) => {
  const yes = confirmedGuests(ev.guests);
  if (!yes.length) return;
  const chip = (buildSeatingPlan(ev).dietChips || []).find((c) => /^Veg /.test(c));
  const est = vegCount({ ...ev, guests: yes, dietCounts: undefined });
  expect(chip ? Number(chip.slice(4)) : 0).toBe(est);
});

// ═══ 8 · OPEN MENU CALLS ════════════════════════════════════════════════════
// The hero ("Decide what you're serving · N open", the ledger food cue), the
// Plan tab (menuChoicesTally), the board's "Your calls" (decision board), and
// the board's below-fold row ("the menu · N to decide").

agree('menu · hero "N open" = menuChoicesTally openNow', {}, (ev) => {
  if (!isPre(ev)) return;
  const p = plan(ev);
  const item = ppItem(ev, 'food');
  if (!p || !item) return;
  const m = /· (\d+) open/.exec(String(item.cueLabel || ''));
  const tally = pb.menuChoicesTally(ev, p, NOW);
  if (!m) { expect(tally.openNow.length === 0 || item.handled === false).toBe(true); return; }
  expect(Number(m[1])).toBe(tally.openNow.length);
});

// D-12 (fixed): the board's below-fold row "The spread & shopping — the menu ·
// N to decide" counted openFoodChoices (every open call, parked ones too)
// while the hero above it counted the calls due now (menuChoicesTally.openNow).
// Wanda: hero "1 open", row "3 to decide". The row's words now come from
// menuBoardRowSub, which reads the hero's tally; parked calls say "later".
agree('menu · board row "the menu · N to decide" = hero "N open"', {}, (ev) => {
  if (!isPre(ev)) return;
  const p = plan(ev);
  if (!p) return;
  const sub = pb.menuBoardRowSub(ev, p, NOW);
  const m = /(\d+) to decide/.exec(sub);
  expect(m ? Number(m[1]) : 0).toBe(pb.menuChoicesTally(ev, p, NOW).openNow.length);
});

agree('menu · decision board calls = hero openNow', {}, (ev) => {
  if (!isPre(ev)) return;
  const p = plan(ev);
  if (!p) return;
  const ids = new Set((p.choices || []).map((c) => c && c.id));
  const tally = pb.menuChoicesTally(ev, p, NOW);
  const board = pb.playbookDecisionBoard(ev, NOW) || { open: [] };
  const calls = (board.open || []).filter((r) => r && ids.has(r.id)).map((r) => r.id).sort();
  expect(calls).toEqual(tally.openNow.map((c) => c.id).sort());
});

// ═══ 9 · HELPERS AND THE HOST ═══════════════════════════════════════════════

agree('helpers · namedHelperCount = the Helpers panel\'s helpers', {}, (ev) => {
  expect(pb.namedHelperCount(ev)).toBe(deriveHelperResponsibilities(ev).helpers.length);
});

agree('helpers · the host is never listed as her own helper', {}, (ev) => {
  expect(deriveHelperResponsibilities(ev).helpers.filter((h) => isHostName(h.name, ev))).toEqual([]);
});

// D-13: the invite card's "Hosted by" reads hostName || hostNames and skips
// `host`, the field Wanda's event (and any parse that stores `host`) carries;
// hostNameFor, which every other screen reads, includes it. Fixed: the card
// reads hostNameFor.
agree('host · invite card "Hosted by" = hostNameFor', {}, (ev) => {
  const daysEnd = daysUntil(spanEnd(ev));
  if (daysEnd != null && daysEnd < 0) return; // a past card drops the line by design
  const card = inviteCardModel(ev).facts.find((f) => f.label === 'Hosted by');
  expect(card ? card.value : '').toBe(hostNameFor(ev, null));
});

// D-14: the invite TEXT signs with the signed-in profile's name only
// (doItForMe hostName(profile)); with no profile it is unsigned even when the
// event names its host, and with a profile it signs as the account holder,
// not the host every other screen shows. Fixed: draftInvite signs with
// hostNameFor(event, profile).
agree('host · invite text is signed by hostNameFor', {}, (ev) => {
  const host = hostNameFor(ev, null);
  if (!host) return;
  expect(draftInvite(ev, null).body).toContain(`— ${host}`);
});
