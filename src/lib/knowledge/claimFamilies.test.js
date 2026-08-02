// ─── The canonical ice family (Phase 5G-C1) ──────────────────────────────────
//
// THE INVARIANT UNDER TEST: the family is a MAPPING, not a rewrite. It must not move
// a single authored value, must not normalize the variants toward each other, and
// must not compute an adjustment from a pattern no board has confirmed.
import { ALL_PLAYBOOKS, getPlaybook, playbookFoodPlan, purchaseProvenance } from '../playbooks/index';
import { classifyClaim, HOST_LABELS } from './claimBasis';
import { isGroundedItemQty } from './quantityProvenance';
import {
  ICE_FAMILY, ICE_MEMBERS, ICE_RECOVERED_LOGIC, ICE_CHANGE_FACTORS, RECOMMENDATION_STATES,
  CONDITION_EVIDENCE, familyFor, iceRecommendation,
} from './claimFamilies';

const iceLines = () => ALL_PLAYBOOKS
  .map((pb) => ({ pb, p: (pb.purchases || []).find((x) => x.id === 'p_ice') }))
  .filter((r) => r.p);

describe('the family is complete and semantically coherent', () => {
  test('every p_ice line in the corpus is a member — none silently omitted', () => {
    const corpus = iceLines().map((r) => r.pb.type).sort();
    const members = ICE_MEMBERS.map((m) => m.assetId).sort();
    expect(members).toEqual(corpus);
    expect(members.length).toBe(29);
  });

  test('all 29 share unit, category, essentiality and buy timing', () => {
    // The audit that justified one family rather than several. Measured, not assumed.
    for (const { p } of iceLines()) {
      expect(p.unit).toBe('lb');
      expect(p.category).toBe('beverage');
      expect(p.essential).toBe(true);
      expect(p.buyAt).toBe('T0');
      expect(p.qtyFlat == null).toBe(true);   // strictly per-guest, no flat quantity
    }
  });

  test('no member is a hidden subtype — the boil playbooks say DRINKS in their own words', () => {
    // The one real risk to grouping: seafood/crawfish HOLDING ice would be a different
    // procurement concept wearing the same field name.
    const note = (type) => (getPlaybook(type).purchases || []).find((p) => p.id === 'p_ice').note;
    expect(note('Crawfish Boil')).toMatch(/cold drinks/i);
    expect(note('Low Country Boil')).toMatch(/beer and tea cold/i);
    for (const t of ['Crawfish Boil', 'Low Country Boil', 'Crab Feast', 'Fish Fry']) {
      expect(note(t)).not.toMatch(/holding|display|packing the catch/i);
    }
  });
});

describe('authored values are preserved exactly', () => {
  test('every member value EQUALS the authored qtyPerGuest', () => {
    // If the mapping layer ever drifts from the playbook, this fails. It is the
    // single most important property here.
    for (const m of ICE_MEMBERS) {
      const p = (getPlaybook(m.assetId).purchases || []).find((x) => x.id === 'p_ice');
      expect(p.qtyPerGuest).toBe(m.value);
    }
  });

  test('the variants are NOT normalized — all five survive', () => {
    const distinct = [...new Set(ICE_MEMBERS.map((m) => m.value))].sort((a, b) => a - b);
    expect(distinct).toEqual([1, 1.25, 1.5, 2, 2.5]);
    expect(ICE_FAMILY.baselineVariants).toEqual(distinct);
    // and the family does not carry a single canonical number to collapse toward
    expect(ICE_FAMILY).not.toHaveProperty('value');
    expect(ICE_FAMILY).not.toHaveProperty('canonicalValue');
  });

  test('the recommendation returns the AUTHORED per-guest figure, never an adjusted one', () => {
    for (const m of ICE_MEMBERS) {
      const rec = iceRecommendation(m.assetId, 'p_ice', { guestCount: 20 });
      expect(rec.perGuest).toBe(m.value);
      expect(rec.total).toBe(Math.round(m.value * 20 * 100) / 100);
    }
  });

  test('no adjustment function is exported — explain, never compute', () => {
    const api = require('./claimFamilies');
    for (const k of Object.keys(api)) {
      expect(k).not.toMatch(/adjust|apply|bump|scale|recompute|correct/i);
    }
  });
});

describe('families are keyed by meaning, never by field name', () => {
  test('p_tableware gets NO family, despite sharing a field name across 18 lines', () => {
    // The boundary rule. Four different units and Low Country Boil's "2 set" is paper
    // towels and shell buckets — a name-keyed family would have governed all 18.
    expect(familyFor('Birthday', 'p_tableware')).toBeNull();
    expect(familyFor('Low Country Boil', 'p_tableware')).toBeNull();
  });

  test('an unknown playbook gets no family even on the right purchase id', () => {
    expect(familyFor('Not A Real Playbook', 'p_ice')).toBeNull();
    expect(iceRecommendation('Not A Real Playbook', 'p_ice', {})).toBeNull();
  });

  test('a real member resolves', () => {
    const hit = familyFor('Juneteenth Cookout', 'p_ice');
    expect(hit.family.id).toBe('food.ice.event_supply');
    expect(hit.member.value).toBe(2);
  });
});

describe('the recovered logic is recovered, not verified', () => {
  test('it is explicitly pending board confirmation', () => {
    expect(ICE_RECOVERED_LOGIC.basis).toBe('recovered-authored-pattern');
    expect(ICE_RECOVERED_LOGIC.status).toBe('pending-board-confirmation');
  });

  test('it forbids computing a quantity from the pattern', () => {
    expect(ICE_RECOVERED_LOGIC.prohibitedUse).toMatch(/no numeric adjustment is board-confirmed/i);
    expect(ICE_RECOVERED_LOGIC.allowedUse).toMatch(/explain/i);
  });

  test('it claims no verification vocabulary anywhere', () => {
    const blob = JSON.stringify(ICE_RECOVERED_LOGIC) + JSON.stringify(ICE_MEMBERS) + JSON.stringify(ICE_CHANGE_FACTORS);
    expect(blob).not.toMatch(/verified current|corroborat/i);
  });

  test('the cited authored evidence is REAL — each quote traces to a playbook note', () => {
    // Guards against the failure mode of a plausible-sounding rationale nobody wrote.
    const note = (type) => (getPlaybook(type).purchases || []).find((p) => p.id === 'p_ice').note;
    expect(note('Graduation')).toMatch(/Board-corrected/i);
    expect(note('Graduation')).toMatch(/OUTDOOR event/);
    expect(note('Juneteenth Cookout')).toMatch(/outdoor June coolers/i);
    expect(note('Gender Reveal')).toMatch(/2 if hot\/outdoor/i);
    expect(note('Sweet 16')).toMatch(/hot room or outdoor party/i);
  });

  test('every member marked `authored_rule` really does state a rule in its note', () => {
    for (const m of ICE_MEMBERS.filter((x) => x.evidence === 'authored_rule')) {
      const n = (getPlaybook(m.assetId).purchases || []).find((p) => p.id === 'p_ice').note || '';
      expect(n).toMatch(/if hot|bump to|more in heat|more on a hot day|add 15-20%/i);
    }
  });

  test('every evidence level is one of the three declared', () => {
    for (const m of ICE_MEMBERS) expect(Object.keys(CONDITION_EVIDENCE)).toContain(m.evidence);
  });

  test('a line with no recorded condition says so rather than inventing one', () => {
    const repast = ICE_MEMBERS.find((m) => m.assetId === 'Repast');
    expect(repast.evidence).toBe('none');
    expect(repast.condition).toBeNull();
    const rec = iceRecommendation('Repast', 'p_ice', { guestCount: 10 });
    expect(rec.why).toBeNull();
    expect(rec.assumption).toMatch(/no conditions were recorded/i);
  });
});

describe('Crawfish Boil 2.5 is handled honestly (Option A)', () => {
  test('it stays in the family at its authored value', () => {
    const m = ICE_MEMBERS.find((x) => x.assetId === 'Crawfish Boil');
    expect(m.value).toBe(2.5);
    expect(familyFor('Crawfish Boil', 'p_ice')).toBeTruthy();
  });

  test('it is NOT reduced toward the highest registered source', () => {
    const p = (getPlaybook('Crawfish Boil').purchases || []).find((x) => x.id === 'p_ice');
    expect(p.qtyPerGuest).toBe(2.5);
    expect(iceRecommendation('Crawfish Boil', 'p_ice', { guestCount: 12 }).perGuest).toBe(2.5);
  });

  test('and it is not sold as directly sourced, because no source reaches 2.5', () => {
    const pb = getPlaybook('Crawfish Boil');
    const p = (pb.purchases || []).find((x) => x.id === 'p_ice');
    const claim = classifyClaim(purchaseProvenance(pb, p));
    expect(claim.directCitationEligible).toBe(false);
    expect(claim.hostLabel).toBe(HOST_LABELS.PLANNING_BASELINE);
  });
});

describe('it agrees with what the host already renders', () => {
  test('the basis label comes from the claim classifier, so the two cannot contradict', () => {
    const EVENT = (type) => ({ id: 'c1', type, date: '2026-09-01', guestCount: 18 });
    for (const m of ICE_MEMBERS) {
      const row = ((playbookFoodPlan(EVENT(m.assetId), {}) || {}).list || []).find((r) => r && r.id === 'p_ice');
      expect(row).toBeTruthy();                       // every member reaches a host
      const claim = classifyClaim(row.provenance);
      const rec = iceRecommendation(m.assetId, 'p_ice', { guestCount: 18, claim });
      expect(rec.basisLabel).toBe(claim.hostLabel);
      expect(rec.directCitationEligible).toBe(isGroundedItemQty(row.provenance));
      // the row's own quantity and the family's agree
      expect(rec.perGuest).toBe(m.value);
    }
  });

  test('`Directly sourced` is claimed for no member the predicate rejects', () => {
    for (const m of ICE_MEMBERS) {
      const pb = getPlaybook(m.assetId);
      const p = (pb.purchases || []).find((x) => x.id === 'p_ice');
      const claim = classifyClaim(purchaseProvenance(pb, p));
      const rec = iceRecommendation(m.assetId, 'p_ice', { guestCount: 10, claim });
      if (rec.basisLabel === HOST_LABELS.DIRECTLY_SOURCED) {
        expect(isGroundedItemQty(purchaseProvenance(pb, p))).toBe(true);
      }
    }
  });
});

describe('recommendation state derives from EXPLICIT facts only (Part 5)', () => {
  test('an environment-dependent line with unknown setting asks for confirmation', () => {
    // Juneteenth is authored for outdoor June heat. Not knowing the setting could
    // materially change what a host buys, so it is not quietly assumed.
    const r = iceRecommendation('Juneteenth Cookout', 'p_ice', { guestCount: 20 });
    expect(r.environmentDependent).toBe(true);
    expect(r.recommendationState).toBe('confirm-before-committing');
    expect(r.assumption).toBeTruthy();
    expect(r.nextAction.route).toEqual({ tab: 'Event Details', focusField: 'event-venue' });
  });

  test('once the setting IS known the assumption disappears', () => {
    const r = iceRecommendation('Juneteenth Cookout', 'p_ice', { guestCount: 20, facts: { setting: 'outdoor' } });
    expect(r.recommendationState).toBe('recommended');
    expect(r.assumption).toBeNull();
    expect(r.nextAction).toBeNull();
    // and the quantity is UNCHANGED — knowing the fact confirms, it does not compute
    expect(r.perGuest).toBe(2);
  });

  test('knowing the setting NEVER changes the number, in either direction', () => {
    // The prohibited use, asserted across the whole family.
    for (const m of ICE_MEMBERS) {
      const base = iceRecommendation(m.assetId, 'p_ice', { guestCount: 25 });
      for (const setting of ['outdoor', 'indoor']) {
        const withFact = iceRecommendation(m.assetId, 'p_ice', { guestCount: 25, facts: { setting } });
        expect(withFact.perGuest).toBe(base.perGuest);
        expect(withFact.total).toBe(base.total);
      }
    }
  });

  test('a line with NO recorded condition asks for confirmation, not an assumption', () => {
    const r = iceRecommendation('Repast', 'p_ice', { guestCount: 15 });
    expect(r.recommendationState).toBe('confirm-before-committing');
    expect(r.why).toBeNull();
  });

  test('a non-environment line with unknown facts is still USABLE', () => {
    // The product must lead, not withhold. Bachelorette is authored for a batch
    // cocktail and a water station -- service, not weather.
    const r = iceRecommendation('Bachelorette Party', 'p_ice', { guestCount: 12 });
    expect(r.recommendationState).toBe('recommended-with-assumption');
    expect(r.perGuest).toBe(1.5);
    expect(r.total).toBe(18);
    // No route: the drinks question is answered on this very surface.
    expect(r.nextAction.route).toBeNull();
    expect(r.nextAction.why).toMatch(/on this list/i);
  });

  test('ice NEVER produces needs-professional-confirmation', () => {
    // Reserved for safety/legal/licensed-service. Overusing it teaches hosts to
    // ignore it exactly where it matters.
    for (const m of ICE_MEMBERS) {
      for (const facts of [null, { setting: 'outdoor' }, { setting: 'indoor' }]) {
        const r = iceRecommendation(m.assetId, 'p_ice', { guestCount: 10, facts });
        expect(r.recommendationState).not.toBe('needs-professional-confirmation');
        expect(Object.keys(RECOMMENDATION_STATES)).toContain(r.recommendationState);
      }
    }
  });

  test('every state has a next action unless it is fully Recommended', () => {
    for (const m of ICE_MEMBERS) {
      const r = iceRecommendation(m.assetId, 'p_ice', { guestCount: 10 });
      if (r.recommendationState === 'recommended') expect(r.nextAction).toBeNull();
      else {
        expect(r.nextAction).toBeTruthy();
        expect(r.nextAction.why).toBeTruthy();
        // A label is present only when there is somewhere real to go.
        if (r.nextAction.route) {
          expect(r.nextAction.label).toBeTruthy();
          // CTAs name the act -- no "Do this" / "Take me to it"
          expect(r.nextAction.label).not.toMatch(/do this|handle this|take me/i);
        } else {
          expect(r.nextAction.label).toBeNull();
        }
      }
    }
  });
});

describe('next-action routes are REAL, resolvable landings (Part 11)', () => {
  test('every emitted route resolves through the production resolver', () => {
    // A CTA that routes nowhere is worse than no CTA. Run the real resolver, not a
    // string comparison -- resolveRoute fall-throughs silently mis-land bare routes.
    // eslint-disable-next-line global-require
    const { resolveRoute } = require('../routeResolver');
    const seen = new Set();
    for (const m of ICE_MEMBERS) {
      const r = iceRecommendation(m.assetId, 'p_ice', { guestCount: 10 });
      if (!r.nextAction) continue;
      if (!r.nextAction.route) continue;
      const resolved = resolveRoute(r.nextAction.route);
      expect(resolved).toBeTruthy();
      // AND it must land on an actual control. `{tab:'Planning',focusField:'food-plan'}`
      // resolved to `{kind:'food', focus:null}` -- it reopened the surface the card is
      // already on and focused nothing. The earlier version of this test asserted the
      // DESCRIPTOR I wrote rather than what the resolver returns, so it passed while
      // the button did nothing on screen. Assert the resolver's output.
      expect(resolved.anchor || resolved.focus).toBeTruthy();
      seen.add(JSON.stringify(r.nextAction.route));
    }
    expect(seen.size).toBeGreaterThanOrEqual(1);
  });

  test('a CTA is rendered ONLY when it genuinely navigates', () => {
    // The glyph/CTA rule: an in-place settle earns no navigation affordance.
    for (const m of ICE_MEMBERS) {
      const r = iceRecommendation(m.assetId, 'p_ice', { guestCount: 10 });
      if (!r.nextAction) continue;
      expect(!!r.nextAction.label).toBe(!!r.nextAction.route);
    }
  });
});

describe('the card cannot contradict the row (found live)', () => {
  test('the total keeps the row\'s precision — no rounding disagreement', () => {
    // Live defect: the card printed "17 lb" directly above a size stepper reading
    // "16.5 lbs". Two surfaces, same number, different answers.
    const r = iceRecommendation('Birthday', 'p_ice', { guestCount: 11 });
    expect(r.total).toBe(16.5);
    // and it is exactly perGuest x guests, never re-derived
    for (const m of ICE_MEMBERS) {
      for (const g of [7, 11, 18, 25, 33]) {
        const rec = iceRecommendation(m.assetId, 'p_ice', { guestCount: g });
        expect(rec.total).toBeCloseTo(m.value * g, 5);
      }
    }
  });

  test('the state label and assumption read as ONE sentence', () => {
    const r = iceRecommendation('Birthday', 'p_ice', { guestCount: 11 });
    const line = `${r.recommendationStateLabel} — ${r.assumption}`;
    expect(line).toBe('Recommended with assumption — those conditions are unconfirmed for your event.');
    expect(line).not.toMatch(/—.*—/);        // no double em-dash
  });
});
