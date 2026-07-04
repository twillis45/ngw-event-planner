// Sprint PC-2 regression test.
// Real continuity bug found during runtime validation: WhatCouldGoWrongPanel
// (the Risks tab/panel) called playbookRisks() (static, type-authored risks)
// but never ctx.activeRisks (deriveTopRisks() — Reveal's compound/weather-aware
// risk deriver). A compound event's "guests will be confused by ceremony vs.
// celebration formality" risk lived ONLY in Assemble Reveal and never reached
// the Risks tab at all. Live-verified fix: merge ctx.activeRisks into the
// panel's displayed list, deduped against the static items by id/trigger.
//
// This test replicates the exact merge/normalize logic added inline in
// WhatCouldGoWrongPanel (App.js) as a pure function, so the dedup behavior is
// covered without needing a full component-render harness (not otherwise used
// in this codebase's test suite).
import { buildExperienceContext } from '../experienceContext';

// Mirrors WhatCouldGoWrongPanel's inline merge logic exactly.
function mergeRisks(staticItems, ctx) {
  const ctxItems = (ctx && ctx.activeRisks ? ctx.activeRisks : []).map(r => ({
    id: r.type,
    trigger: r.description,
    mitigation: r.mitigation,
    severity: r.severity,
    rank: r.severity === 'high' ? 1 : 2,
  }));
  const seenKeys = new Set(staticItems.map(r => (r.id || r.trigger)));
  return [...staticItems, ...ctxItems.filter(r => !seenKeys.has(r.id || r.trigger))];
}

const flagshipEvent = {
  id: 'evt-flagship',
  type: 'Birthday',
  name: '50th Birthday and Military Retirement from the Navy',
  date: '2026-08-15',
  guestCount: 85,
  venue: '',
};

describe('PC-2: Risk merge/dedup (WhatCouldGoWrongPanel + ctx.activeRisks)', () => {
  test('compound event: ctx.activeRisks includes the compound-confusion risk, not present in a typical static set', () => {
    const ctx = buildExperienceContext(flagshipEvent, null, null);
    expect(ctx.activeRisks.some(r => r.type === 'compound-confusion')).toBe(true);
  });

  test('merge adds ctx risks not already present in static items', () => {
    const staticItems = [
      { id: 'static-1', trigger: 'Weather on an outdoor event', mitigation: 'Have a tent on standby.', severity: 'high', rank: 1 },
    ];
    const ctx = buildExperienceContext(flagshipEvent, null, null);
    const merged = mergeRisks(staticItems, ctx);

    expect(merged.length).toBeGreaterThan(staticItems.length);
    expect(merged.some(r => r.id === 'compound-confusion')).toBe(true);
    expect(merged.some(r => r.id === 'static-1')).toBe(true); // static items preserved
  });

  test('merge does NOT duplicate a risk if a static item already uses the same id/trigger as a ctx risk', () => {
    const staticItems = [
      { id: 'compound-confusion', trigger: 'Already covered by an authored playbook risk', mitigation: 'Existing fix text.', severity: 'high', rank: 1 },
    ];
    const ctx = buildExperienceContext(flagshipEvent, null, null);
    const merged = mergeRisks(staticItems, ctx);

    const matches = merged.filter(r => r.id === 'compound-confusion');
    expect(matches.length).toBe(1); // not duplicated
    expect(matches[0].trigger).toBe('Already covered by an authored playbook risk'); // static wins
  });

  test('non-compound event: no compound-confusion risk is injected', () => {
    const simpleEvent = { id: 'evt-simple', type: 'Crab Feast', name: 'My Crab Feast', date: '2026-08-15', guestCount: 30, venue: 'Backyard' };
    const ctx = buildExperienceContext(simpleEvent, null, null);
    const merged = mergeRisks([], ctx);
    expect(merged.some(r => r.id === 'compound-confusion')).toBe(false);
  });

  test('merge is a no-op (returns static items unchanged) when ctx is null', () => {
    const staticItems = [{ id: 's1', trigger: 'A', mitigation: 'B', severity: 'high', rank: 1 }];
    expect(mergeRisks(staticItems, null)).toEqual(staticItems);
  });
});
