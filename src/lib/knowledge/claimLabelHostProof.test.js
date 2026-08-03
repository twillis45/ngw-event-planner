// ─── What a HOST is told about every number (Phase 5G-B) ─────────────────────
//
// The Phase A audit measured the product's largest honesty defect at the render seam:
// 52 food-plan lines rendered "Sourced — …" and 485 rendered nothing at all. Silence
// reads as "we have no view", which was false for lines resting on board judgment,
// trade practice or cultural knowledge that authors HAD recorded.
//
// This asserts the fix against real `playbookFoodPlan` output — the same rows
// HostShellV2 renders — not against the corpus and not against intent.
//
// It also pins the property that makes the change safe: the citation count does not
// move. Relabelling must never promote a line.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks/index';
import { isGroundedItemQty } from './quantityProvenance';
import { classifyClaim, HOST_LABELS } from './claimBasis';

const EVENT = (type) => ({ id: 'lbl', type, date: '2026-09-01', guestCount: 18 });
const rowsFor = (type) => ((playbookFoodPlan(EVENT(type), {}) || {}).list || []).filter(Boolean);
const allRows = () => ALL_PLAYBOOKS.flatMap((pb) => rowsFor(pb.type));

describe('no host-facing row is silent', () => {
  test('EVERY food-plan row across EVERY playbook gets a label', () => {
    const rows = allRows();
    expect(rows.length).toBeGreaterThan(300);
    const silent = rows.filter((r) => !classifyClaim(r.provenance).hostLabel);
    expect(silent).toEqual([]);
  });

  test('only the six approved labels ever reach a host', () => {
    const allowed = new Set(Object.values(HOST_LABELS));
    for (const r of allRows()) expect(allowed.has(classifyClaim(r.provenance).hostLabel)).toBe(true);
  });

  test('more than one label appears — a single bucket would be a relabelled silence', () => {
    const seen = new Set(allRows().map((r) => classifyClaim(r.provenance).hostLabel));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});

describe('relabelling promotes nothing', () => {
  test('`Directly sourced` appears on EXACTLY the rows the predicate passes', () => {
    // The old seam gated on `it.qtyGrounded`. The new label must be that same set —
    // no wider. This is the test that would fail if classification ever upgraded a line.
    for (const r of allRows()) {
      const c = classifyClaim(r.provenance);
      const wasSourced = isGroundedItemQty(r.provenance);
      expect(c.hostLabel === HOST_LABELS.DIRECTLY_SOURCED).toBe(wasSourced);
      expect(c.directCitationEligible).toBe(wasSourced);
    }
  });

  test('the count of directly-sourced rows is unchanged by the rewrite', () => {
    const rows = allRows();
    const byPredicate = rows.filter((r) => isGroundedItemQty(r.provenance)).length;
    const byLabel = rows.filter((r) => classifyClaim(r.provenance).hostLabel === HOST_LABELS.DIRECTLY_SOURCED).length;
    expect(byLabel).toBe(byPredicate);
    expect(byPredicate).toBeGreaterThan(0);
  });

  test('every Wave 0 governed line still reads Directly sourced with its note', () => {
    // The 5F.11 backfill must survive the rewrite intact, caveat and all.
    const ice = rowsFor('Crab Feast').find((r) => r.id === 'p_ice');
    expect(classifyClaim(ice.provenance).hostLabel).toBe(HOST_LABELS.DIRECTLY_SOURCED);
    expect(ice.provenance.note).toMatch(/CAVEAT|ceiling-leaning/);

    const tw = rowsFor('Birthday').find((r) => r.id === 'p_tableware');
    expect(classifyClaim(tw.provenance).hostLabel).toBe(HOST_LABELS.DIRECTLY_SOURCED);
    expect(tw.provenance.note).toMatch(/LIMITATION/);
  });
});

describe('the label names what the number actually rests on', () => {
  test('a cultural playbook shows cultural tradition somewhere', () => {
    // Kwanzaa / Juneteenth carry `cultural-tradition` and `culture-bearer` bases that
    // the old predicate scored identically to a blank line.
    const labels = ['Kwanzaa Gathering', 'Juneteenth Cookout', 'The Cookout']
      .flatMap((t) => rowsFor(t).map((r) => classifyClaim(r.provenance).hostLabel));
    expect(labels).toContain(HOST_LABELS.CULTURAL_TRADITION);
  });

  test('a row with no recorded basis reads Planning baseline, never a source claim', () => {
    const bare = allRows().find((r) => !r.provenance);
    expect(bare).toBeTruthy();
    const c = classifyClaim(bare.provenance);
    expect(c.hostLabel).toBe(HOST_LABELS.PLANNING_BASELINE);
    expect(c.directCitationEligible).toBe(false);
    expect(c.sources).toEqual([]);
  });

  test('the rendered DETAIL is always author-written, never synthesised', () => {
    // The host renders `${label} — ${detail}`, where detail is the authored note or
    // the authored prose rationale. If a label ever carries text nobody wrote, the
    // product is inventing reasoning, which is the failure mode this program exists
    // to prevent.
    for (const r of allRows()) {
      const c = classifyClaim(r.provenance);
      const detail = (r.provenance && typeof r.provenance === 'object' && r.provenance.note)
        ? r.provenance.note : c.rationale;
      if (detail == null) continue;
      const authored = (r.provenance && typeof r.provenance === 'object')
        ? [r.provenance.note].filter(Boolean)
        : [r.provenance];
      expect(authored).toContain(detail);
    }
  });
});

// ─── Part 7 — every ice row, individually ────────────────────────────────────
// Aggregate counts can hide a single silent row. These assert per playbook.
describe('no silent ice row, checked one at a time', () => {
  const { ICE_MEMBERS, iceRecommendation } = require('./claimFamilies');
  const iceRow = (type) => (((playbookFoodPlan(EVENT(type), {}) || {}).list) || [])
    .find((r) => r && r.id === 'p_ice');

  test.each(ICE_MEMBERS.map((m) => [m.assetId, m.value]))(
    '%s ice row renders a basis label and its authored value %p',
    (assetId, value) => {
      const row = iceRow(assetId);
      expect(row).toBeTruthy();                       // reaches a host at all
      const c = classifyClaim(row.provenance);
      expect(c.hostLabel).toBeTruthy();               // never silent
      expect(Object.values(HOST_LABELS)).toContain(c.hostLabel);
      // Directly sourced ONLY where the predicate passes -- no false source claim.
      if (c.hostLabel === HOST_LABELS.DIRECTLY_SOURCED) {
        expect(isGroundedItemQty(row.provenance)).toBe(true);
      } else {
        expect(isGroundedItemQty(row.provenance)).toBe(false);
      }
      // The card and the row cannot disagree about the number or the basis.
      const rec = iceRecommendation(assetId, 'p_ice', { guestCount: 18, claim: c });
      expect(rec.perGuest).toBe(value);
      expect(rec.basisLabel).toBe(c.hostLabel);
      expect(rec.total).toBeCloseTo(value * 18, 5);
    },
  );

  test('the 29 rows span more than one basis label -- not a relabelled silence', () => {
    const labels = new Set(ICE_MEMBERS.map((m) => classifyClaim(iceRow(m.assetId).provenance).hostLabel));
    expect(labels.size).toBeGreaterThanOrEqual(3);
    expect(labels.has(HOST_LABELS.DIRECTLY_SOURCED)).toBe(true);
    expect(labels.has(HOST_LABELS.PLANNING_BASELINE)).toBe(true);
    expect(labels.has(HOST_LABELS.PRACTITIONER_GUIDANCE)).toBe(true);
  });
});
