// ─── AN INVENTED HEADCOUNT MAY NOT LEAVE THE APP, OR BECOME MONEY ───────────
//
// THE MEASURED DEFECT (2026-09-18, recorded in lib/guestCountFor.js). A host who
// types eight words — "Cookout on June 12, 2027" — gets a STORED headcount of
// 40, substituted from the playbook's typical by the creation seam. Not a
// preview: `guestEstimate: 40`. `draftVendorOutreach` then told a caterer "for
// about 40 guests". Of everything this app derives, that was the only measured
// case of an invented number leaving the app in the host's name.
//
// `doItForMe` was fixed with `guestCountIsConfirmed` — the twin of
// `startTimeIsConfirmed`. THE GATE WAS NEVER ADOPTED ANYWHERE ELSE. Measured
// 2026-10-18: `guestCountIsConfirmed` has exactly ONE runtime consumer, while 34
// files read the headcount.
//
// THE PROVENANCE IS ALREADY THERE, which is what makes this a gating problem and
// not a data problem. `guestCountSource` is written at all three write sites —
// HostShellV2:7161 and :7325 record 'host', and creation (:8155) records
// 'playbook-typical' exactly when the app substituted a number of its own.
//
// This file pins the two places where using that unconfirmed number is not a
// cosmetic issue:
//   1. OUTWARD — a third party quotes against it.
//   2. MONEY   — hostSpending's own rule says a guess "must NOT become budget
//                money", and an app substitution is a guess.
import { buildEventCreatedPayload } from '../webhookService';
import { hostSpending } from '../hostSpending';
import { buildBudgetRecoveryPlan } from '../budgetRecovery';
import { guestCountFor, guestCountIsConfirmed } from '../guestCountFor';

// The exact shape the creation seam writes when the host gave no count and the
// playbook supplied a typical. HostShellV2:8155.
const invented = (over = {}) => ({
  id: 'cust-invented', type: 'Cookout', date: '2027-06-12',
  guestEstimate: 40, guestCountSource: 'playbook-typical',
  ...over,
});

// The same event where the host actually said 40.
const hostSaid = (over = {}) => ({
  id: 'cust-hostsaid', type: 'Cookout', date: '2027-06-12',
  guestEstimate: 40, guestCountSource: 'host',
  ...over,
});

describe('(premise) the fixtures really differ only in provenance', () => {
  test('both resolve to the same number; only fromHost differs', () => {
    expect(guestCountFor(invented()).count).toBe(40);
    expect(guestCountFor(hostSaid()).count).toBe(40);
    expect(guestCountIsConfirmed(invented())).toBe(false);
    expect(guestCountIsConfirmed(hostSaid())).toBe(true);
  });
});

describe('OUTWARD — the webhook payload is a third party reading our number', () => {
  // buildEventCreatedPayload is fired at a host-configured external URL
  // (App.js:46394 → fireWebhook(profile.webhookUrl, 'event.created', …)).
  // Whatever is in `guests` is read by someone who is not us.
  test('an app-substituted count is NOT sent outward', () => {
    expect(buildEventCreatedPayload(invented()).guests).toBe(null);
  });

  test("a count the host gave IS sent — the gate withholds inventions, not facts", () => {
    expect(buildEventCreatedPayload(hostSaid()).guests).toBe(40);
  });

  test('a locked guestCount is the host by construction and is sent', () => {
    const ev = { id: 'cust-locked', guestCount: 55, guestEstimate: 40, guestCountSource: 'playbook-typical' };
    // guestCountFor: a locked count is SOURCE_HOST regardless of what the
    // estimate's provenance says — the estimate slot is the only one the app
    // ever writes into.
    expect(buildEventCreatedPayload(ev).guests).toBe(55);
  });

  test('a roster is the host entering people one at a time, and is sent', () => {
    const ev = { id: 'cust-roster', guests: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] };
    expect(buildEventCreatedPayload(ev).guests).toBe(3);
  });

  test('no count at all sends null, as before', () => {
    expect(buildEventCreatedPayload({ id: 'cust-empty' }).guests).toBe(null);
  });

  test('the rest of the payload is untouched by this change', () => {
    const p = buildEventCreatedPayload(hostSaid({ name: 'Cookout', status: 'active' }));
    expect(p.id).toBe('cust-hostsaid');
    expect(p.type).toBe('Cookout');
    expect(p.date).toBe('2027-06-12');
    expect(p.status).toBe('active');
  });
});

describe('MONEY — an invented count must not become budget money', () => {
  // hostSpending's own rule, verbatim: "never create a food budget without a
  // real guest count … that guess is fine for a labeled preview, but it must
  // NOT become budget money." An app substitution IS a guess; the existing
  // hasRealCount gate only asked whether a number existed.
  test('food money is withheld when the count was substituted by the app', () => {
    const s = hostSpending(invented());
    expect(s.foodEstimate || 0).toBe(0);
  });

  test('food money is produced when the host gave the count', () => {
    // The paired positive. Without it the test above could pass because food
    // estimation is broken for an unrelated reason.
    const s = hostSpending(hostSaid());
    expect(s.foodEstimate || 0).toBeGreaterThan(0);
  });

  test('a locked count still produces food money', () => {
    const s = hostSpending({
      id: 'cust-locked2', type: 'Cookout', date: '2027-06-12',
      guestCount: 40, guestEstimate: 40, guestCountSource: 'playbook-typical',
    });
    expect(s.foodEstimate || 0).toBeGreaterThan(0);
  });

  test('a roster still produces food money', () => {
    const s = hostSpending({
      id: 'cust-roster2', type: 'Cookout', date: '2027-06-12',
      guests: Array.from({ length: 12 }, (_, i) => ({ name: `G${i}` })),
    });
    expect(s.foodEstimate || 0).toBeGreaterThan(0);
  });
});

describe('MONEY — the over-budget advisor must name the count it does not have', () => {
  // budgetRecovery's own rule, verbatim: "without a real count, quantity math
  // is fiction — say what's missing instead of inventing savings." It carried
  // the SAME route-around hostSpending did: `hasRealCount` was true for any
  // number that existed, and `guestCountResolved(ev).resolved` resolved an
  // estimate-only event to true on top of that. So the one host whose count
  // the app made up was the one host never told the count was missing.
  //
  // Only the missingData line moves. The guest-right-sizing suggestion at :200
  // already requires a live roster, and a roster is the host by construction,
  // so it is unaffected — the pair of tests below pins that.
  // The vendor is CONTRACTED, so the money that puts this event over budget is
  // committed vendor cost — which no guest count feeds. Without that the
  // fixture would be circular: hostSpending now withholds food money for an
  // unconfirmed count, so an event pushed over budget BY food money would drop
  // back under budget in exactly the case under test.
  const overBudget = (over = {}) => ({
    type: 'Cookout', date: '2027-06-12', totalBudget: 200,
    vendors: [{ id: 'v1', name: 'Caterer', cost: 900, status: 'Contracted' }],
    ...over,
  });
  const missingCount = (plan) =>
    (plan.missingData || []).some((m) => /real guest count/i.test(m));

  test('an app-substituted count is reported as a missing count', () => {
    const plan = buildBudgetRecoveryPlan(
      overBudget({ id: 'rec-invented', guestEstimate: 40, guestCountSource: 'playbook-typical' }),
    );
    expect(plan.status).toBe('recovery_available');
    expect(missingCount(plan)).toBe(true);
  });

  test('a count the host gave is NOT reported as missing', () => {
    const plan = buildBudgetRecoveryPlan(
      overBudget({ id: 'rec-hostsaid', guestEstimate: 40, guestCountSource: 'host' }),
    );
    expect(plan.status).toBe('recovery_available');
    expect(missingCount(plan)).toBe(false);
  });

  test('a roster is the host, so nothing is reported missing', () => {
    const plan = buildBudgetRecoveryPlan(
      overBudget({
        id: 'rec-roster',
        guests: Array.from({ length: 12 }, (_, i) => ({ name: `G${i}`, rsvp: 'Yes' })),
      }),
    );
    expect(missingCount(plan)).toBe(false);
  });

  test('no count at all is still reported missing, as before', () => {
    const plan = buildBudgetRecoveryPlan(overBudget({ id: 'rec-empty' }));
    expect(missingCount(plan)).toBe(true);
  });
});
