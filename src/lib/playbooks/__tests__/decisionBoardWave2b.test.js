// Wave-2b — two engine changes that make playbookDecisionBoard smart for ALL 39
// playbooks WITHOUT inventing per-playbook data:
//   (1) HORIZON AWARENESS — workflowCompression wired in, so order/partition genuinely
//       changes with the runway (a far-future window on a long-runway event defers to a
//       `deferred` bucket; a near-term window on a short-runway event escalates).
//   (2) DERIVED IMPORTANCE — a decision with no authored `weight` gets an importance
//       signal derived from its OWN structure (blocks / dependsOn / costFactors / text),
//       killing the flat tie that ranked "Pick a theme" above "Confirm guest count".
// Authored playbooks (crabFeast, retirementParty) must be byte-identical to Wave-2a.
import { playbookDecisionBoard } from '../index';

// A fixed clock so day-math is deterministic regardless of when the suite runs.
const ASOF = '2026-06-01';
const dateNDaysOut = (n, asOf = ASOF) => {
  const d = new Date(asOf + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const roster = (yes, no, pending) => ([
  ...Array.from({ length: yes }, (_, i) => ({ name: `Y${i}`, rsvp: 'Yes' })),
  ...Array.from({ length: no }, (_, i) => ({ name: `N${i}`, rsvp: 'No' })),
  ...Array.from({ length: pending }, (_, i) => ({ name: `P${i}`, rsvp: '' })),
]);
const idxOf = (rows, id) => rows.findIndex((r) => r.id === id);

// ── CHANGE 1 · HORIZON AWARENESS ──────────────────────────────────────────────
describe('Wave-2b horizon — same type at 3d vs 90d differs in partition + order', () => {
  const crab3 = playbookDecisionBoard({ id: 'e', type: 'Crab Feast', date: dateNDaysOut(3), guestMode: 'count', guestCount: 20 }, ASOF);
  const crab90 = playbookDecisionBoard({ id: 'e', type: 'Crab Feast', date: dateNDaysOut(90), guestMode: 'count', guestCount: 20 }, ASOF);

  test('the board is no longer horizon-blind: open partition differs 3d vs 90d', () => {
    const open3 = crab3.open.map((r) => r.id);
    const open90 = crab90.open.map((r) => r.id);
    // The whole point: byte-identical order/partition at every horizon is the wave-1 bug.
    expect(open3).not.toEqual(open90);
  });

  test('SHORT runway (3d, rush): every crab decision is ACTIVE — nothing deferred', () => {
    expect(crab3.deferred).toEqual([]);
    // dietary (the allergy gate) leads the active board.
    expect(crab3.open[0].id).toBe('dietary');
    expect(crab3.open.map((r) => r.id)).toEqual(
      expect.arrayContaining(['dietary', 'steam_vs_order', 'crab_size', 'where_buy', 'sides', 'drinks']),
    );
  });

  test('LONG runway (90d, tight): windows that have not opened defer to `deferred`', () => {
    const deferredIds = crab90.deferred.map((r) => r.id);
    // Every crab decision's window (≤ T-10d) is still far out at 90 days → all deferred.
    expect(deferredIds).toEqual(expect.arrayContaining(['dietary', 'steam_vs_order', 'crab_size', 'where_buy', 'sides', 'drinks']));
    // …and therefore NOT surfaced as active/urgent open rows (the required behaviour).
    expect(crab90.open.map((r) => r.id)).not.toContain('dietary');
    expect(crab90.open.map((r) => r.id)).not.toContain('steam_vs_order');
    // Deferred rows are honestly labelled "comes up closer to the date".
    for (const r of crab90.deferred) {
      expect(r.horizon).toBe('later');
      expect(r.rankReason).toBe('Comes up closer to the date.');
    }
  });

  test('SHORT-runway escalation marks a ready, imminent decision time-critical; long-runway does not', () => {
    // Retirement @ 15 days out (rush): the ready tribute (T-14d, daysOut≈1) escalates.
    const retShort = playbookDecisionBoard({ id: 'e', type: 'Retirement Party', date: dateNDaysOut(15), guests: roster(30, 4, 6) }, ASOF);
    const tributeShort = retShort.open.find((r) => r.id === 'tribute');
    expect(tributeShort.status).toBe('ready');
    expect(tributeShort.timeCritical).toBe(true);

    // Retirement @ 90 days out (standard): the SAME tribute window is far out → deferred,
    // never time-critical. Proof the horizon moves authored playbooks too (partition change).
    const retLong = playbookDecisionBoard({ id: 'e', type: 'Retirement Party', date: dateNDaysOut(90), guests: roster(30, 4, 6) }, ASOF);
    expect(retLong.deferred.find((r) => r.id === 'tribute')).toBeTruthy();
    expect(retLong.open.find((r) => r.id === 'tribute')).toBeUndefined();
  });
});

// ── CHANGE 2 · DERIVED IMPORTANCE ─────────────────────────────────────────────
describe('Wave-2b derived importance — Birthday no longer collapses to a due-date tie', () => {
  // 30 days out (compressed → nothing defers, everything ready): a pure due-date sort would
  // put "Pick a theme" (T-21d, soonest) FIRST. The derived signal must sink it below the
  // consequential facts a planner settles first.
  const bd = playbookDecisionBoard({ id: 'e', type: 'Birthday', date: dateNDaysOut(30), guestMode: 'count', guestCount: 30 }, ASOF);

  test('"Confirm guest count" and the allergy/dietary row rank ABOVE "Pick a theme/vibe"', () => {
    expect(idxOf(bd.open, 'headcount')).toBeGreaterThanOrEqual(0);
    expect(idxOf(bd.open, 'dietary')).toBeGreaterThanOrEqual(0);
    expect(idxOf(bd.open, 'theme')).toBeGreaterThanOrEqual(0);
    // A due-date sort ranks theme first (it is soonest-due) — derived importance must not.
    expect(idxOf(bd.open, 'headcount')).toBeLessThan(idxOf(bd.open, 'theme'));
    expect(idxOf(bd.open, 'dietary')).toBeLessThan(idxOf(bd.open, 'theme'));
    // The dietary/allergy safety row leads the whole board.
    expect(bd.open[0].id).toBe('dietary');
  });

  test('derived rows are marked as derived and carry HONEST derived reasons (not authored-sounding)', () => {
    const theme = bd.open.find((r) => r.id === 'theme');
    const headcount = bd.open.find((r) => r.id === 'headcount');
    const dietary = bd.open.find((r) => r.id === 'dietary');
    expect(theme.importanceBasis).toBe('derived');
    expect(headcount.importanceBasis).toBe('derived');
    expect(dietary.importanceBasis).toBe('derived');
    // Aesthetic leaf → the lowest, honestly derived reason.
    expect(theme.rankReason).toBe('A finishing touch — settle it when you like.');
    // Gates downstream / carries safety → derived reasons that read as derived.
    expect(headcount.rankReason).toBe('This decides other choices.');
    expect(dietary.rankReason).toMatch(/allergies gate the menu/);
  });
});

// ── AUTHORED PLAYBOOKS UNCHANGED (Wave-2a behaviour preserved) ─────────────────
describe('Wave-2b — the 2 authored playbooks are byte-identical to Wave-2a', () => {
  test('Crab Feast: dietary leads, authored reasons, steam floats over where_buy/sides', () => {
    // Wave-2a exact scenario: event today (dte=0) — rush, nothing deferred.
    const b = playbookDecisionBoard({ id: 'e', type: 'Crab Feast', date: '2026-01-15', guestMode: 'count', guestCount: 20 }, '2026-01-15');
    expect(b.deferred).toEqual([]);
    expect(idxOf(b.open, 'dietary')).toBe(0);
    // authored, never derived — the flagship keeps its authored weight + rationale.
    expect(b.open.find((r) => r.id === 'dietary').importanceBasis).toBe('authored');
    expect(b.open.find((r) => r.id === 'dietary').rankReason).toMatch(/ER risk/);
    // reversibility axis still participates (Wave-2a assertion).
    expect(idxOf(b.open, 'steam_vs_order')).toBeLessThan(idxOf(b.open, 'where_buy'));
    expect(idxOf(b.open, 'steam_vs_order')).toBeLessThan(idxOf(b.open, 'sides'));
  });

  test('Retirement: the ready tribute floats above LOW/MED overdue admin, below high-weight overdue', () => {
    // Wave-2a scenario: event 15 days out.
    const b = playbookDecisionBoard({ id: 'e', type: 'Retirement Party', date: '2026-02-01', guests: roster(30, 4, 6) }, '2026-01-17');
    const tribute = b.open.find((r) => r.id === 'tribute');
    expect(tribute.status).toBe('ready');
    expect(tribute.deliversHeartMoment).toBe(true);
    expect(tribute.importanceBasis).toBe('authored');
    const ti = idxOf(b.open, 'tribute');
    for (const softId of ['format', 'bar', 'help']) {
      expect(ti).toBeLessThan(idxOf(b.open, softId));
    }
    const highOverdue = b.open.filter((r) => r.status === 'overdue' && r.weight === 'high');
    expect(highOverdue.length).toBeGreaterThan(0);
    for (const r of highOverdue) expect(idxOf(b.open, r.id)).toBeLessThan(ti);
  });
});
