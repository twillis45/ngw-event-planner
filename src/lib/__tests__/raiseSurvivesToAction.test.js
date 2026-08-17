// ─── A FIELD MUST SURVIVE THE WHOLE TRIP, NOT JUST THE FIRST HOP ────────────
//
// Board ruling, 2026-08-17 (docs/audits/2026-08-17_SPOF_BOARD.md): close the
// silent field-drop class STRUCTURALLY rather than fixing instances. Five were
// found in a single session, all the same shape — one unguarded hop where an
// authored field becomes `undefined`, nothing throws, no test fails, and the
// result renders as silence. In a product designed to stay quiet when it has
// nothing to say, that is indistinguishable from working correctly.
//
// THE CENSUS found exactly two re-projections on the raise→action path:
//
//   1. topAction (CommandCenter ~1887) — ALREADY GATED, and gated in the right
//      shape: topActionCarriesEveryField sweeps Object.entries(top), so a NEW
//      field is caught. It had eaten five fields before that gate existed.
//   2. the registry→action mapping (~2255) — an explicit list, ungated. Its own
//      comments record two deaths (`sourceCategory` 2026-07-22, `ask`
//      2026-07-31: "a consumer with no producer reads as a working feature"),
//      and the census found a live third: `ifDelayed` is absent from the list,
//      so a raise carrying it would die crossing even once a producer exists.
//
// This file is that missing gate. It drives the FULL chain — a surface raises,
// raiseAll normalizes, eventPlan re-projects — because a test at either end
// alone passes while the middle eats the field, which is precisely how these got
// through. The field it drives is invented here and named by no consumer: a gate
// that enumerates fields cannot catch the field nobody thought of.
import { SURFACES } from '../surfaceRegistry';
import { eventPlan } from '../../CommandCenter';

const isoIn = (days) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const EV = {
  id: 'ev-survive', type: 'Birthday Party', date: isoIn(21),
  venue: 'The Hall', guestMode: 'count', guestCount: 24, totalBudget: 3000,
};

const NOVEL = { nested: 'value', n: 42 };

const PROBE = {
  id: '__survive__',
  label: 'Survive probe',
  domain: 'plan',
  route: { tab: 'Planning' },
  raise() {
    return [{
      severity: 'critical',            // critical so ranking cannot bury it
      title: 'Probe survives to the action.',
      why: 'a reason the action should carry',
      route: { tab: 'Planning' },
      key: 'survive-probe',
      // Invented here. No consumer reads these; no other gate names them. If
      // either re-projection reverts to enumerating, these vanish first.
      inventedFieldNobodyHasThoughtOf: NOVEL,
      anotherNovelField: 'survives',
      // The live third instance the census found — a real field with a real
      // consumer (actionReason's RISK branch) that this mapping did not carry.
      ifDelayed: 'The thing the author warned about',
    }];
  },
};

const withProbe = (fn) => {
  SURFACES.push(PROBE);
  try { return fn(); } finally { SURFACES.splice(SURFACES.indexOf(PROBE), 1); }
};

const probeAction = () => {
  const plan = eventPlan(EV) || {};
  const list = plan.nextActions || [];
  return list.find((a) => a && a.title === 'Probe survives to the action.') || null;
};

describe('an authored field survives raise → normalize → action', () => {
  test('PREMISE — the probe really reaches nextActions', () => {
    // Without this every assertion below passes by finding nothing. This is the
    // check that would have caught my own first attempt at a sibling gate.
    const a = withProbe(probeAction);
    expect(a).toBeTruthy();
    expect(a.surface).toBe('__survive__');
    // And it must be gone afterwards, or it leaks into every later test.
    expect(probeAction()).toBeNull();
  });

  test('A NOVEL FIELD SURVIVES THE FULL CHAIN', () => {
    const a = withProbe(probeAction);
    expect(a.inventedFieldNobodyHasThoughtOf).toEqual(NOVEL);
    expect(a.anotherNovelField).toBe('survives');
  });

  test('ifDelayed survives — the live third instance the census found', () => {
    // Named explicitly as well as swept, because it has a real waiting consumer
    // (actionReason's RISK branch) and a documented history of being dropped.
    const a = withProbe(probeAction);
    expect(a.ifDelayed).toBe('The thing the author warned about');
  });

  test('the fields with documented deaths still arrive', () => {
    // sourceCategory and ask each died at this exact site once already. The
    // spread carries them now; asserted by name so a regression says WHICH.
    const withAuthored = { ...PROBE, id: '__survive2__', raise: () => [{
      severity: 'critical', title: 'Probe two.', route: { tab: 'Planning' },
      key: 'p2', sourceCategory: 'decision', ask: 'Seat your guests.',
      why: 'because', dueInDays: 3, priorityScore: 308.5, unlocks: 2, gateHolder: true,
    }] };
    SURFACES.push(withAuthored);
    try {
      const a = (eventPlan(EV).nextActions || []).find((x) => x && x.title === 'Probe two.');
      expect(a).toBeTruthy();
      expect(a.sourceCategory).toBe('decision');
      expect(a.ask).toBe('Seat your guests.');
      expect(a.consequence).toBe('because');     // r.why is renamed to consequence
      expect(a.priorityScore).toBe(308.5);
      expect(a.unlocks).toBe(2);
      expect(a.gateHolder).toBe(true);
    } finally { SURFACES.splice(SURFACES.indexOf(withAuthored), 1); }
  });

  test('and the mapping still owns the fields it renames or sets', () => {
    // The spread runs FIRST so these win; a raise must not be able to relabel
    // its own source or forge a `done`.
    const rogue = { ...PROBE, id: '__survive3__', raise: () => [{
      severity: 'critical', title: 'Probe three.', route: { tab: 'Planning' },
      key: 'p3', source: 'not-mine', done: true, cta: 'Nope',
    }] };
    SURFACES.push(rogue);
    try {
      const a = (eventPlan(EV).nextActions || []).find((x) => x && x.title === 'Probe three.');
      expect(a.source).toBe('surfaceRegistry');
      expect(a.done).toBe(false);
      expect(a.cta).toBe('Go');
    } finally { SURFACES.splice(SURFACES.indexOf(rogue), 1); }
  });
});
