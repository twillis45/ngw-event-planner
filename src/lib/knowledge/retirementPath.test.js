// ─── RETIRING PUBLISHED KNOWLEDGE (Phase 5F.8) ───────────────────────────────
//
// THE GAP. The console could publish a record and then never retire it. For a
// `published` KCR the only control was "Move to monitoring", and neither `monitoring`
// nor `revision` offered anything but "Open a revision" / "Re-research". Seven
// browser-only records could therefore be neither promoted to the corpus nor withdrawn
// through the UI — the reconciliation in 5F.7 had no way to execute its own decisions.
//
// The transition already existed in `KCR_TRANSITIONS`; nothing surfaced it. This pins
// the legal path so the new control cannot drift into an illegal shortcut.
//
// AND A HISTORICAL NOTE THAT MATTERS: two records archived in 5F.4 carry a DIRECT
// `published -> archived` audit entry, which the table below forbids. They were written
// outside `advanceKCR`. Harmless (the bake refuses archived records either way) but it
// means the lifecycle was bypassed once, by me, and the test below is why that is now
// visible rather than folklore.
import { advanceKCR, KCR_TRANSITIONS } from './knowledgeChange';

const published = () => ({
  id: 'k1', status: 'published', assetId: 'Fish Fry', fieldPath: 'p_ice.provenance',
  proposal: { newValue: { tier: 'researched', sources: ['reddy-ice-2026'] } },
  evidence: [], review: {}, audit: [], publishedVersion: 'k1-v1',
});

describe('the legal retirement path', () => {
  test('published -> archived is ILLEGAL and stays illegal', () => {
    // Published knowledge is not deleted; it is retired through a state that records
    // why. A direct jump would erase that step.
    expect(KCR_TRANSITIONS.published).not.toContain('archived');
    expect(() => advanceKCR(published(), 'archived', { by: 'admin' }))
      .toThrow(/illegal transition published → archived/);
  });

  test('published -> monitoring -> archived IS legal', () => {
    const m = advanceKCR(published(), 'monitoring', { by: 'admin' });
    expect(m.status).toBe('monitoring');
    const a = advanceKCR(m, 'archived', { by: 'admin', note: 'no evidence attached; redo through the composer' });
    expect(a.status).toBe('archived');
  });

  test('published -> revision -> archived IS legal', () => {
    const r = advanceKCR(published(), 'revision', { by: 'admin' });
    const a = advanceKCR(r, 'archived', { by: 'admin', note: 'superseded by a corrected record' });
    expect(a.status).toBe('archived');
  });

  test('archived is TERMINAL — nothing comes back', () => {
    expect(KCR_TRANSITIONS.archived).toEqual([]);
    const m = advanceKCR(published(), 'monitoring', { by: 'admin' });
    const a = advanceKCR(m, 'archived', { by: 'admin', note: 'retired' });
    for (const to of ['published', 'monitoring', 'revision', 'researching', 'draft']) {
      expect(() => advanceKCR(a, to, { by: 'admin' })).toThrow(/illegal transition/);
    }
  });
});

describe('a retirement is auditable', () => {
  test('the reason is stamped into the audit trail', () => {
    const m = advanceKCR(published(), 'monitoring', { by: 'admin' });
    const a = advanceKCR(m, 'archived', { by: 'todd', note: 'no evidence attached' });
    const last = a.audit[a.audit.length - 1];
    expect(last.action).toBe('advanced:archived');
    expect(last.by).toBe('todd');
    expect(last.note).toBe('no evidence attached');
  });

  test('the intermediate step is recorded too — retirement is not one silent hop', () => {
    const m = advanceKCR(published(), 'monitoring', { by: 'admin' });
    const a = advanceKCR(m, 'archived', { by: 'admin', note: 'retired' });
    expect(a.audit.map((x) => x.action)).toEqual(['advanced:monitoring', 'advanced:archived']);
  });
});
