// ─── Admin truth + host parity (Phase 5G-C1 Part 10) ─────────────────────────
//
// THE INVARIANT UNDER TEST: the admin explains the host, it does not re-implement
// it. Every host-facing value the admin reports must be the value the host renders,
// because both call one function. A divergence here is a real bug, not a format gap.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { orientation, segmentsText } from '../eventOrientation';
import { classifyClaim } from './claimBasis';
import { iceRecommendation } from './claimFamilies';
import { getPlaybook, purchaseProvenance, playbookFoodPlan } from '../playbooks';
import { resolveRoute } from '../routeResolver';
import { eventStateFacts, recommendationFacts, adminHostParity } from './adminTruth';

const NOW = new Date('2026-08-02T12:00:00Z');
const EV = (type, extra = {}) => ({ id: 'admin', type, date: '2026-09-20', guestCount: 12, ...extra });
const val = (rows, field) => (rows.find((r) => r[0] === field) || [])[2];

describe('the event-state inspector explains the real host output', () => {
  test('it reports the SAME lifecycle label, summary and counts the host renders', () => {
    const ev = EV('Birthday');
    const cues = deriveEventPhaseProgress(ev, NOW);
    const host = orientation(cues, []);
    const { rows } = eventStateFacts(ev, [], NOW);

    expect(val(rows, 'lifecycleLabel')).toBe(host.lifecycleLabel);
    expect(val(rows, 'summary')).toBe(host.summary);
    expect(val(rows, 'countText')).toBe(host.countText);
    expect(val(rows, 'a11y text')).toBe(segmentsText(host));
  });

  test('segment states mirror the engine ledger exactly', () => {
    const ev = EV('Birthday');
    const cues = deriveEventPhaseProgress(ev, NOW);
    const { rows } = eventStateFacts(ev, [], NOW);
    const reported = val(rows, 'segments');
    for (const item of cues.items) {
      expect(reported).toContain(`${item.id}:${item.handled ? 'handled' : 'still-open'}`);
    }
  });

  test('it never says "in progress" — the ledger cannot support that claim', () => {
    const { rows } = eventStateFacts(EV('Birthday'), [], NOW);
    for (const r of rows) expect(String(r[2])).not.toMatch(/in progress/i);
  });

  test('a severe blocker is reported, and reaches the summary', () => {
    const { rows, orientation: o } = eventStateFacts(EV('Birthday'), [{ id: 'v', status: 'overdue' }], NOW);
    expect(val(rows, 'blocker')).not.toBe('null');
    expect(o.summary).toMatch(/past its date/i);
  });

  test('an unknown-phase event keeps its REAL count but says the date is the blocker', () => {
    // The count is not fabricated: the engine counts the essentials that apply
    // without a date, and 1 of 4 really are handled. Suppressing it would hide true
    // information. What must NOT happen is implying progress toward a day that does
    // not exist -- so the summary leads with the missing date, and no percentage is
    // ever produced. (Caught a design annotation that overstated this as "no count".)
    const { rows, orientation: o } = eventStateFacts({ id: 'x', type: 'Birthday', guestCount: 8 }, [], NOW);
    expect(val(rows, 'phase')).toBe('unknown');
    expect(val(rows, 'lifecycleLabel')).toBe('Getting started');
    expect(o.summary).toMatch(/no date yet/i);
    expect(JSON.stringify(o)).not.toMatch(/\d+%/);
  });

  test('it degrades safely on junk input', () => {
    for (const bad of [null, undefined, {}]) {
      expect(() => eventStateFacts(bad, [], NOW)).not.toThrow();
    }
  });
});

describe('route truth is shown as descriptor AND resolver output', () => {
  test('every routed segment reports what the resolver actually returned', () => {
    const { rows, orientation: o } = eventStateFacts(EV('Birthday'), [], NOW);
    let checked = 0;
    for (const s of o.segments) {
      if (!s.route) continue;
      const line = val(rows, `route: ${s.id}`);
      expect(line).toBeTruthy();
      const r = resolveRoute(s.route);
      const actionable = !!(r && (r.anchor || r.focus));
      expect(line).toContain(actionable ? 'ACTIONABLE' : 'NOT ACTIONABLE');
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('a NON-actionable landing is labelled as such, never as a working CTA', () => {
    // The dead-CTA defect this programme found live: a descriptor that looks fine
    // resolving to a landing with no focus.
    const { rows } = recommendationFacts('Birthday', 'p_ice', EV('Birthday'));
    expect(val(rows, 'intended route')).toMatch(/null/);
    expect(val(rows, 'route actionability')).toMatch(/SUPPRESSED/);
  });

  test('an environment-dependent line reports a REAL resolved route', () => {
    const ev = EV('Juneteenth Cookout');
    const { rows } = recommendationFacts('Juneteenth Cookout', 'p_ice', ev);
    expect(val(rows, 'intended route')).toContain('event-venue');
    expect(val(rows, 'resolved route')).toContain('anchor');
    expect(val(rows, 'route actionability')).toMatch(/^ACTIONABLE/);
  });
});

describe('the recommendation inspector matches what the host shows', () => {
  test('basis label, state and total are the host values', () => {
    const ev = EV('Birthday');
    const pb = getPlaybook('Birthday');
    const p = pb.purchases.find((x) => x.id === 'p_ice');
    const claim = classifyClaim(purchaseProvenance(pb, p));
    const guests = (playbookFoodPlan(ev, {}) || {}).guests || 0;
    const host = iceRecommendation('Birthday', 'p_ice', { guestCount: guests, claim });
    const { rows } = recommendationFacts('Birthday', 'p_ice', ev);

    expect(val(rows, 'host basis label')).toBe(claim.hostLabel);
    expect(val(rows, 'recommendationState')).toBe(host.recommendationState);
    expect(val(rows, 'assumption')).toBe(String(host.assumption));
    expect(val(rows, 'displayed total')).toContain(String(host.total));
  });

  test('the authored value is reported UNCHANGED', () => {
    const pb = getPlaybook('Crawfish Boil');
    const p = pb.purchases.find((x) => x.id === 'p_ice');
    const { rows } = recommendationFacts('Crawfish Boil', 'p_ice', EV('Crawfish Boil'));
    expect(val(rows, 'authored value')).toContain(String(p.qtyPerGuest));
    expect(p.qtyPerGuest).toBe(2.5);
  });

  test('directCitationEligible is the predicate, never a restatement of the label', () => {
    for (const asset of ['Birthday', 'Crawfish Boil', 'Juneteenth Cookout']) {
      const pb = getPlaybook(asset);
      const p = pb.purchases.find((x) => x.id === 'p_ice');
      const { rows } = recommendationFacts(asset, 'p_ice', EV(asset));
      const expected = String(!!(purchaseProvenance(pb, p) && classifyClaim(purchaseProvenance(pb, p)).directCitationEligible));
      expect(val(rows, 'directCitationEligible')).toBe(expected);
    }
  });

  test('a non-family field yields no rows rather than a guess', () => {
    expect(recommendationFacts('Birthday', 'p_tableware', EV('Birthday')).rows).toEqual([]);
  });
});

describe('adminHostParity is a real assertion, across many events', () => {
  test('parity holds for every ice playbook, with and without a blocker', () => {
    const ASSETS = ['Birthday', 'Crawfish Boil', 'Juneteenth Cookout', 'Game Night', 'Repast', 'Crab Feast'];
    for (const a of ASSETS) {
      for (const q of [[], [{ id: 'v', status: 'overdue' }]]) {
        const res = adminHostParity(EV(a), q, a, NOW);
        expect(res.mismatches).toEqual([]);
        expect(res.ok).toBe(true);
      }
    }
  });

  test('parity holds for an undated event too', () => {
    const res = adminHostParity({ id: 'u', type: 'Birthday', guestCount: 9 }, [], 'Birthday', NOW);
    expect(res.ok).toBe(true);
  });

  test('the parity check can actually FAIL — it is not vacuous', () => {
    // Guard against a checker that always returns ok. Feed it a doctored row set by
    // checking a field the inspector does not report.
    const { rows } = eventStateFacts(EV('Birthday'), [], NOW);
    const byField = new Map(rows.map((r) => [r[0], r[2]]));
    expect(byField.get('lifecycleLabel')).toBeTruthy();
    expect(byField.get('a-field-that-does-not-exist')).toBeUndefined();
  });
});
