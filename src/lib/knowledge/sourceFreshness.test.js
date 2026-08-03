// ─── Source freshness (Phase 5F.6 W3) ────────────────────────────────────────
//
// The load-bearing tests here are the NEGATIVE ones: freshness must be incapable of
// changing what a host sees. A warning system that can silently withdraw grounding is
// not a warning system, it is an invalidator with a friendly name.
import {
  sourceFreshness, freshnessSummary, needsRecheck, ageInDays, metadataGaps,
  horizonFor, HORIZONS, FRESHNESS_STATES, METADATA_FIELDS,
} from './sourceFreshness';
import { isGroundedItemQty, QTY_SOURCES } from './quantityProvenance';
import { wouldGround } from './sourceAuthority';

const AT = '2026-08-01T00:00:00.000Z';

describe('age arithmetic', () => {
  test('whole days, and unusable input yields null rather than a wrong number', () => {
    expect(ageInDays('2026-07-02', '2026-08-01')).toBe(30);
    expect(ageInDays('2026-08-01', '2026-08-01')).toBe(0);
    expect(ageInDays(null, AT)).toBeNull();
    expect(ageInDays('not-a-date', AT)).toBeNull();
    expect(ageInDays('2026-07-02', null)).toBeNull();
  });

  test('a source fetched in the FUTURE reports a negative age, not a crash', () => {
    expect(ageInDays('2026-09-01', '2026-08-01')).toBeLessThan(0);
  });
});

describe('horizons are declared, differentiated, and pinned', () => {
  test('the axes NGW\'s numbers depend on get the short horizon', () => {
    expect(horizonFor('Cost')).toEqual(HORIZONS.volatile);
    expect(horizonFor('Quantity')).toEqual(HORIZONS.volatile);
  });

  test('standards and cultural practice get the long horizon', () => {
    for (const axis of ['Food safety', 'Legal / COI', 'Cultural / religious', 'Fire & burn safety']) {
      expect(horizonFor(axis)).toEqual(HORIZONS.standard);
    }
  });

  test('the horizons are pinned — a silent loosening would hide staleness', () => {
    expect(HORIZONS.volatile).toEqual({ aging: 60, stale: 90 });
    expect(HORIZONS.standard).toEqual({ aging: 270, stale: 365 });
    expect(HORIZONS.volatile.stale).toBeLessThan(HORIZONS.standard.stale);
  });
});

describe('against the REAL registries', () => {
  const f = sourceFreshness(AT);

  test('every registered source is classified — none is skipped', () => {
    expect(f.total).toBeGreaterThan(100);
    const sum = FRESHNESS_STATES.reduce((a, s) => a + f.counts[s], 0);
    expect(sum).toBe(f.total);
    expect(f.rows.length).toBe(f.total);
  });

  test('the UNDATED class is real and reported, not quietly treated as fresh', () => {
    // 22 sources across 4 axes carry no `fetched` date. Calling those "fresh" would be
    // the single most misleading thing this module could do.
    expect(f.counts.undated).toBeGreaterThan(0);
    for (const r of f.rows.filter((x) => x.state === 'undated')) {
      expect(r.fetched).toBeFalsy();
      expect(r.action).toMatch(/No fetch date recorded/);
    }
  });

  test('every row carries the fields an operator needs to act', () => {
    for (const r of f.rows) {
      expect(FRESHNESS_STATES).toContain(r.state);
      expect(typeof r.action).toBe('string');
      expect(r.action.length).toBeGreaterThan(20);
      expect(r.axis).toBeTruthy();
    }
  });

  test('the worst rows sort first', () => {
    const order = { stale: 3, undated: 2, aging: 1, fresh: 0 };
    for (let i = 1; i < f.rows.length; i += 1) {
      expect(order[f.rows[i - 1].state]).toBeGreaterThanOrEqual(order[f.rows[i].state]);
    }
  });

  test('needsRecheck returns exactly the stale and undated rows', () => {
    expect(needsRecheck(f).length).toBe(f.counts.stale + f.counts.undated);
  });

  test('the summary disclaims the thing an operator would most fear', () => {
    expect(freshnessSummary(f)).toMatch(/no grounding is withdrawn automatically/);
  });
});

describe('the three metadata fields (Phase 5F.7)', () => {
  const f = sourceFreshness(AT);

  test('capture, verification and ownership are tracked SEPARATELY', () => {
    expect(METADATA_FIELDS).toEqual(['fetched', 'lastVerified', 'steward']);
    expect(f.metadata.captured).toBeGreaterThan(0);
    // Only the sources touched in 5F/5F.7 carry verification + ownership so far. The
    // gap is the finding; a number here that matched `captured` would mean the fields
    // had been back-filled with guesses.
    expect(f.metadata.verified).toBeLessThan(f.metadata.captured);
    expect(f.metadata.complete).toBe(f.metadata.verified);
  });

  test('AGE is measured from verification when there is one, capture otherwise', () => {
    const verified = f.rows.filter((r) => r.lastVerified);
    expect(verified.length).toBeGreaterThan(0);
    for (const r of verified) expect(r.ageBasis).toBe('lastVerified');
    for (const r of f.rows.filter((r2) => !r2.lastVerified && r2.fetched)) {
      expect(r.ageBasis).toBe('fetched');
    }
  });

  test('re-verifying a source keeps it fresh long after capture', () => {
    // The whole reason the two dates are separate. `jollychef-disposables-2026` is
    // captured AND verified on the same day here, so age is 0 either way — the
    // assertion that matters is that a verified row uses the later date as its basis.
    const row = f.rows.find((r) => r.id === 'jollychef-disposables-2026');
    expect(row.ageBasis).toBe('lastVerified');
    expect(row.state).toBe('fresh');
  });

  test('an UNASSIGNED steward is reported as unowned, not as owned', () => {
    const row = f.rows.find((r) => r.id === 'reddy-ice-2026');
    expect(row.steward).toBe('unassigned');
    expect(row.ownershipRecorded).toBe(true);   // recorded, and recorded as nobody
    const noField = f.rows.find((r) => !r.ownershipRecorded);
    expect(noField.steward).toBe('unassigned'); // same display, different meaning
    expect(noField.missingMetadata).toContain('steward');
  });

  test('metadataGaps names every source missing a field, worst first', () => {
    const gaps = metadataGaps(f);
    expect(gaps.length).toBe(f.total - f.metadata.complete);
    for (let i = 1; i < gaps.length; i += 1) {
      expect(gaps[i - 1].missingMetadata.length).toBeGreaterThanOrEqual(gaps[i].missingMetadata.length);
    }
  });

  test('the summary reports verification and ownership, not just age', () => {
    expect(freshnessSummary(f)).toMatch(/re-verified/);
    expect(freshnessSummary(f)).toMatch(/owned/);
  });
});

describe('freshness CANNOT change what a host sees', () => {
  test('an ancient source still grounds — staleness is advisory only', () => {
    // Push the clock far past every horizon and re-assert the predicate.
    const far = sourceFreshness('2099-01-01T00:00:00.000Z');
    expect(far.counts.stale).toBeGreaterThan(0);

    const prov = { tier: 'researched', sources: ['reddy-ice-2026'], note: 'n' };
    expect(isGroundedItemQty(prov)).toBe(true);
    expect(wouldGround('p_ice.provenance', prov)).toBe(true);
  });

  test('computing freshness does not mutate the source registry', () => {
    const before = JSON.stringify(QTY_SOURCES);
    sourceFreshness(AT);
    sourceFreshness('2099-01-01T00:00:00.000Z');
    expect(JSON.stringify(QTY_SOURCES)).toBe(before);
  });

  test('the module exposes no way to invalidate, remove, expire or fetch', () => {
    // eslint-disable-next-line global-require
    const mod = require('./sourceFreshness');
    const names = Object.keys(mod).join(' ').toLowerCase();
    for (const forbidden of ['invalidate', 'expire', 'remove', 'fetch', 'refresh', 'withdraw']) {
      expect(names).not.toContain(forbidden);
    }
  });

  test('no row carries an instruction to delete or downgrade', () => {
    for (const r of sourceFreshness('2099-01-01T00:00:00.000Z').rows) {
      expect(r.action).not.toMatch(/\b(delete|remove|withdraw|downgrade|ungr)/i);
    }
    // and the stale wording says so explicitly
    const stale = sourceFreshness('2099-01-01T00:00:00.000Z').rows.find((r) => r.state === 'stale');
    expect(stale.action).toMatch(/still grounds until a human says otherwise/);
  });
});
