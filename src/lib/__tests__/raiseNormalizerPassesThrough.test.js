// ─── THE NORMALIZER MAY NOT SILENTLY EAT A FIELD ────────────────────────────
//
// raiseAll's normalizer was an explicit field list, and an explicit field list
// is a silent-drop machine: a raiser authors a field, no consumer ever sees it,
// and NOTHING fails. Its own comments recorded the deaths one at a time —
// `sourceCategory` (called "the fourth and last", 2026-07-22), then
// priorityScore / gateHolder / unlocks / ask (fifth through eighth, 2026-07-31,
// each with a consumer already reading undefined: a decision scored 308.5
// arrived null and ranked 0).
//
// Eight identical bugs in one place is a design verdict. The list was inverted
// on 2026-08-17 — the raise spreads through whole and only genuine coercions are
// named — and THIS file is what stops it reverting to an enumerate-or-lose site.
//
// WHY A SYNTHETIC SURFACE. The earlier fields were each pinned by a test naming
// that field, which is why the ninth could still die. A gate that names fields
// cannot catch the field nobody thought of, so this drives a raiser authoring a
// field this repo has never seen.
import { SURFACES, raiseAll } from '../surfaceRegistry';

const isoIn = (days) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EV = { id: 'ev-norm', type: 'Birthday Party', date: isoIn(30),
  venue: 'The Hall', guestMode: 'count', guestCount: 20, totalBudget: 2000 };

// A surface the registry has never had, authoring a field it has never had.
const PROBE = {
  id: '__probe__', label: 'Probe', domain: 'plan', route: { tab: 'Planning' },
  raise() {
    return [{
      severity: 'attention',
      title: 'Probe raise.',
      why: 'because the normalizer must not eat this',
      route: { tab: 'Planning' },
      // A field invented HERE, for this test, that no consumer reads and no
      // other gate names. If the normalizer goes back to enumerating, this is
      // the first thing to vanish — which is exactly how the previous eight went.
      inventedFieldNobodyHasThoughtOf: { nested: 'value', n: 42 },
      anotherNovelField: 'survives',
    }];
  },
};

const withProbe = (fn) => {
  SURFACES.push(PROBE);
  try { return fn(); } finally { SURFACES.splice(SURFACES.indexOf(PROBE), 1); }
};

describe('a raise arrives whole, including fields added after this line was written', () => {
  test('PREMISE — the probe surface really is reachable through raiseAll', () => {
    // Without this the file passes by finding nothing and asserting nothing.
    const rows = withProbe(() => raiseAll(EV).filter((r) => r.surface === '__probe__'));
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('Probe raise.');
    // And the probe must be gone again, or it leaks into every later test.
    expect(raiseAll(EV).some((r) => r.surface === '__probe__')).toBe(false);
  });

  test('A NOVEL FIELD SURVIVES — the whole point of the inversion', () => {
    const row = withProbe(() => raiseAll(EV).find((r) => r.surface === '__probe__'));
    expect(row.inventedFieldNobodyHasThoughtOf).toEqual({ nested: 'value', n: 42 });
    expect(row.anotherNovelField).toBe('survives');
  });

  test('the registry still owns identity — a raise cannot shadow it', () => {
    // The spread runs BEFORE surface/label/domain for this reason: a raiser
    // authoring `domain: 'vendors'` must not be able to relabel its own surface.
    const rogue = { ...PROBE, id: '__probe2__', raise: () => [{
      severity: 'attention', title: 'Rogue.', route: { tab: 'Planning' },
      surface: 'not-mine', label: 'Not mine', domain: 'vendors',
    }] };
    SURFACES.push(rogue);
    try {
      const row = raiseAll(EV).find((r) => r.title === 'Rogue.');
      expect(row.surface).toBe('__probe2__');
      expect(row.domain).toBe('plan');
    } finally { SURFACES.splice(SURFACES.indexOf(rogue), 1); }
  });

  test('the hand-coded one-offs still coerce', () => {
    // The inversion must not cost the defaults consumers rely on. A spread alone
    // would hand these `undefined`; decisionEvidence pins several of them.
    const bare = { ...PROBE, id: '__probe3__', raise: () => [{ title: 'Bare.' }] };
    SURFACES.push(bare);
    try {
      const row = raiseAll(EV).find((r) => r.title === 'Bare.');
      expect(row.severity).toBe('attention');       // vocabulary default
      expect(row.route).toEqual({ tab: 'Planning' }); // inherited from the surface
      expect(row.why).toBeNull();
      expect(row.key).toBeNull();
      expect(row.dueInDays).toBeNull();
      expect(row.leadDays).toBeNull();
      expect(row.priorityScore).toBeNull();
      expect(row.sourceCategory).toBeNull();
      expect(row.ask).toBeNull();
      expect(row.evidence).toBeNull();
      expect(row.gateHolder).toBe(false);
      expect(row.unlocks).toBe(0);
    } finally { SURFACES.splice(SURFACES.indexOf(bare), 1); }
  });

  test('a non-numeric dueInDays does not reach the ranker as garbage', () => {
    const junk = { ...PROBE, id: '__probe4__', raise: () => [{
      title: 'Junk.', dueInDays: 'soon', unlocks: 'lots', gateHolder: 'yes',
    }] };
    SURFACES.push(junk);
    try {
      const row = raiseAll(EV).find((r) => r.title === 'Junk.');
      expect(row.dueInDays).toBeNull();
      expect(row.unlocks).toBe(0);
      expect(row.gateHolder).toBe(false);   // only literal true counts
    } finally { SURFACES.splice(SURFACES.indexOf(junk), 1); }
  });
});
