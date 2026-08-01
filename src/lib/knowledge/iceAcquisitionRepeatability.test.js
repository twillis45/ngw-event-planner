// ─── Phase 5F.3 — acquisition repeatability + failure gates ──────────────────
//
// Step 4 of the ice repeatability proof. The corrections themselves are driven
// through the real Admin workflow in the browser; this file pins the FAILURE
// behaviour, which is the half that cannot be demonstrated by a happy path.
//
// Every assertion here is about something that must NOT be publishable.
import { openAuthoredGovernance } from './correctionWorkflow';
import { publishKCR } from './knowledgeChange';
import { validateSourcesFor, wouldGround, approvedSourcesFor } from './sourceAuthority';
import { fieldOwnership } from './governedOwnership';
import { getPlaybook, playbookFoodPlan } from '../playbooks/index';
import { buildSnapshot } from './publishedSnapshotBuild.mjs';
import { __setSnapshotForTests, __resetSnapshotForTests } from './publishedSnapshot';

const AT = '2026-08-01T20:00:00.000Z';
const approved = (k) => ({
  ...k, status: 'approved',
  review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
});

describe('FAILURE — an incompatible source is rejected', () => {
  test('a COST source cannot ground a purchase quantity claim', () => {
    const r = validateSourcesFor('p_ice.provenance', ['usda-meat-2026']);
    expect(r.ok).toBe(false);
    expect(r.wrongAxis[0].belongsTo).toBe('cost');
    expect(wouldGround('p_ice.provenance', { tier: 'researched', sources: ['usda-meat-2026'] })).toBe(false);
  });

  test('an unregistered id cannot ground, however plausible it looks', () => {
    for (const bogus of ['reddy-ice-2027', 'https://www.reddyice.com/', 'icecalculator-2026']) {
      expect(validateSourcesFor('p_ice.provenance', [bogus]).ok).toBe(false);
      expect(wouldGround('p_ice.provenance', { tier: 'researched', sources: [bogus] })).toBe(false);
    }
  });

  test('the picker cannot offer a source that would not ground', () => {
    // The invariant that keeps the UI honest across future registry edits.
    for (const s of approvedSourcesFor('p_ice.provenance')) {
      expect(wouldGround('p_ice.provenance', { tier: 'researched', sources: [s.id] })).toBe(true);
    }
  });
});

describe('FAILURE — a missing rationale is blocked', () => {
  test('no reason, no correction', () => {
    for (const bad of ['', '   ', null, undefined]) {
      expect(() => openAuthoredGovernance(
        { assetId: 'Low Country Boil', fieldPath: 'p_ice.qtyPerGuest', authoredValue: 1.5 },
        { newValue: 2, reason: bad, asOf: AT },
      )).toThrow(/must state its reason/);
    }
  });
});

describe('FAILURE — an ungrounded correction cannot reach the host as sourced', () => {
  test('a provenance citing an unapproved source is BLOCKED at publish', () => {
    // PREMISE INVERTED, Phase 5F.4. This previously asserted such a record PUBLISHES
    // and merely failed to ground - the host was not fooled, but the corpus acquired a
    // record listing sources that could never ground. ~8 raw URLs are in the corpus
    // exactly that way. The grounding-honesty gate now refuses it at publish, which is
    // the earlier and better place: the host was never the thing at risk, the corpus was.
    const k = openAuthoredGovernance(
      { assetId: 'Low Country Boil', fieldPath: 'p_ice.provenance', authoredValue: null },
      {
        newValue: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched',
          sources: ['not-a-registered-source'], note: 'looks real, resolves nowhere' },
        reason: 'demonstrating the silent-ungrounding path', asOf: AT,
      },
    );
    expect(() => publishKCR(approved(k), { versionId: 'v1', asOf: AT }))
      .toThrow(/is not an approved source/);
  });

  test('an APPROVED source on the same field does ground and would render', () => {
    const k = openAuthoredGovernance(
      { assetId: 'Low Country Boil', fieldPath: 'p_ice.provenance', authoredValue: null },
      {
        newValue: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched',
          sources: ['reddy-ice-2026'], note: 'Outdoor boil; Reddy Ice outdoor worked example ~2.1 lb/guest.' },
        reason: 'grounding an outdoor boil', asOf: AT,
      },
    );
    const { kcr } = publishKCR(approved(k), { versionId: 'v1', asOf: AT });
    __setSnapshotForTests(buildSnapshot([kcr]).snapshot);
    try {
      const row = (playbookFoodPlan({ id: 'x', type: 'Low Country Boil', date: '2026-09-01', guestCount: 18 }, {}).list || [])
        .find((i) => i.id === 'p_ice');
      expect(row.qtyGrounded).toBe(true);
      expect(!!(row.qtyGrounded && row.provenance && row.provenance.note)).toBe(true);
    } finally { __resetSnapshotForTests(); }
  });
});

describe('FAILURE — a dead governance field cannot pass', () => {
  test('an engine-delegated field is refused at publish', () => {
    const k = openAuthoredGovernance(
      { assetId: 'Crab Feast', fieldPath: 'p_crabs.qtyPerGuest', authoredValue: 0.33 },
      { newValue: 0.5, reason: 'r', asOf: AT },
    );
    expect(() => publishKCR(approved(k), { versionId: 'v1', asOf: AT })).toThrow(/not governable/);
  });

  test('a field with no runtime consumer is refused at publish', () => {
    const k = openAuthoredGovernance(
      { assetId: 'Crab Feast', fieldPath: 'p_ice.buyingUnits', authoredValue: null },
      { newValue: { note: 'x' }, reason: 'r', asOf: AT },
    );
    expect(() => publishKCR(approved(k), { versionId: 'v1', asOf: AT })).toThrow(/not governable/);
  });

  test('the picker never offers a dead field in the first place', () => {
    expect(fieldOwnership('Crab Feast', 'p_crabs.qtyPerGuest').drivesRuntime).toBe(false);
    expect(fieldOwnership('Crab Feast', 'p_ice.buyingUnits').drivesRuntime).toBe(false);
    expect(fieldOwnership('Low Country Boil', 'p_ice.qtyPerGuest').drivesRuntime).toBe(true);
  });
});

describe('the model is respected — cases that must NOT be auto-corrected', () => {
  // ICE_PURCHASE_MODEL.md section 2.4. These are recorded as tests so a later
  // "let's just finish the backfill" pass has to argue with something.
  test('the dry-event cases are still ungrounded, deliberately', () => {
    for (const type of ['Repast', 'Game Night']) {
      const p = getPlaybook(type).purchases.find((x) => x.id === 'p_ice');
      expect(p.qtyPerGuest).toBeLessThanOrEqual(1);
      // bar-provision-2026 states its ice figure inside a BAR provisioning claim.
      // If a future change grounds these to it, this fails - which is the point.
      const prov = p.provenance;
      const citesBar = !!(prov && Array.isArray(prov.sources) && prov.sources.includes('bar-provision-2026'));
      expect(citesBar).toBe(false);
    }
  });

  test('Crawfish Boil 2.5 exceeds every registered source and stays ungrounded', () => {
    const p = getPlaybook('Crawfish Boil').purchases.find((x) => x.id === 'p_ice');
    expect(p.qtyPerGuest).toBe(2.5);
    expect(wouldGround('p_ice.provenance', p.provenance)).toBe(false);
  });

  test('the two 1.25 hedges are unchanged', () => {
    // 1.25 is the midpoint of a range someone wrote as "1-1.5". Publishing it as
    // researched would convert a hedge into a fact.
    for (const type of ['Sweet 16', 'Housewarming']) {
      expect(getPlaybook(type).purchases.find((x) => x.id === 'p_ice').qtyPerGuest).toBe(1.25);
    }
  });
});

describe('authored corpus is never edited by the workflow', () => {
  test('the playbook files still hold the ORIGINAL ice values', () => {
    // The whole point of governance: corrections live in the snapshot, not the corpus.
    const expected = {
      'Low Country Boil': 1.5, 'Fish Fry': 1.5, 'The Cookout': 2, 'Crab Feast': 2,
      'Dinner Party': 1.5, 'Quinceañera': 1.5, Repast: 1, 'Crawfish Boil': 2.5,
    };
    for (const [type, v] of Object.entries(expected)) {
      const pb = getPlaybook(type);
      if (!pb) continue;
      expect(pb.purchases.find((x) => x.id === 'p_ice').qtyPerGuest).toBe(v);
    }
  });
});

describe('THE TIER DEFECT (found by repeating the loop, Phase 5F.3)', () => {
  // `GOVERNED_FIELD_TYPES.provenance.format()` carries the AUTHORED tier forward.
  // `isGroundedItemQty` requires tier === 'researched'. So a correction on a purchase
  // already sitting at `norm` or `trade-heuristic` could cite an APPROVED source,
  // publish cleanly, and never ground - while the composer said "Will ground",
  // because the verdict only validated sources.
  //
  // Measured live: The Cookout (trade-heuristic) and Quinceanera (norm) both published
  // with sources=["reddy-ice-2026"] / ["bar-provision-2026"] and qtyGrounded=false.
  //
  // Repeating the loop is what exposed it. The first four corrections all happened to
  // be on purchases with NO authored provenance, where format() defaults to
  // 'researched' - so the bug was invisible until a fifth case had one.
  test('an approved source on a NON-researched tier does not ground', () => {
    expect(wouldGround('p_ice.provenance', {
      tier: 'trade-heuristic', sources: ['reddy-ice-2026'],
    })).toBe(false);
    expect(wouldGround('p_ice.provenance', {
      tier: 'norm', sources: ['bar-provision-2026'],
    })).toBe(false);
  });

  test('source validation ALONE is not sufficient to promise grounding', () => {
    // validateSourcesFor says the source is fine; only the predicate knows the truth.
    // Any UI verdict must run wouldGround, not validateSourcesFor.
    const prov = { tier: 'norm', sources: ['bar-provision-2026'] };
    expect(validateSourcesFor('p_ice.provenance', prov.sources).ok).toBe(true);
    expect(wouldGround('p_ice.provenance', prov)).toBe(false);
  });

  test('the same source on researched DOES ground', () => {
    expect(wouldGround('p_ice.provenance', {
      tier: 'researched', sources: ['bar-provision-2026'],
    })).toBe(true);
  });
});
