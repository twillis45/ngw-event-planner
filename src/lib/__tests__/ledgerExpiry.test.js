// THE DENOMINATOR MOVES, so a completion claim needs an expiry date.
//
// Shopping is not an essential until the final week, which means "5 of 5 handled"
// at 43 days silently becomes "5 of 6" on day 7. Every surface that says "settled"
// without saying "until when" is making a claim with a fuse. `nextLedgerChange` is
// that fuse, named and derived — board finding 2026-08-03.
import { deriveEventPhaseProgress } from '../phaseProgress';

const NOW = new Date('2026-08-03T12:00:00Z');
const iso = (daysFromNow) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

// An event with food + a headcount is the case where shopping WILL join the ledger.
const withFood = (daysOut) => ({
  id: 'e', type: 'Birthday', date: iso(daysOut), guestCount: 12,
});

describe('nextLedgerChange — the completion claim carries its own expiry', () => {
  test('far out, it names the date the shopping axis joins', () => {
    const cues = deriveEventPhaseProgress(withFood(43), NOW);
    expect(cues.nextLedgerChange).not.toBeNull();
    expect(cues.nextLedgerChange.date).toBe(iso(36)); // event date minus 7
    expect(cues.nextLedgerChange.days).toBe(36);
    expect(cues.nextLedgerChange.what).toMatch(/shopping/i);
  });

  test('the expiry is exactly 7 days before the event, never a guess', () => {
    const cues = deriveEventPhaseProgress(withFood(30), NOW);
    expect(cues.nextLedgerChange).not.toBeNull();
    const evDate = new Date(iso(30) + 'T00:00:00');
    const expiry = new Date(cues.nextLedgerChange.date + 'T00:00:00');
    expect(Math.round((evDate - expiry) / 86400000)).toBe(7);
  });

  test('INSIDE the final week there is nothing pending — the axis already counted', () => {
    expect(deriveEventPhaseProgress(withFood(3), NOW).nextLedgerChange).toBeNull();
  });

  test('no date means no derivable expiry — never invented', () => {
    const cues = deriveEventPhaseProgress({ id: 'x', type: 'Birthday', guestCount: 8 }, NOW);
    expect(cues.nextLedgerChange).toBeNull();
  });

  test('the field always exists on the contract, so a reader cannot miss it', () => {
    const cues = deriveEventPhaseProgress(withFood(43), NOW);
    expect('nextLedgerChange' in cues).toBe(true);
  });

  test('it never claims a change that already happened', () => {
    const c = deriveEventPhaseProgress(withFood(43), NOW).nextLedgerChange;
    expect(c).not.toBeNull();
    expect(c.days).toBeGreaterThan(0);
  });
});

describe('the finding this field exists to fix', () => {
  test('the ledger really does grow — 4 axes far out, shopping joins in the final week', () => {
    const far = deriveEventPhaseProgress(withFood(43), NOW);
    const near = deriveEventPhaseProgress(withFood(3), NOW);
    expect(far.items.map((i) => i.id)).not.toContain('shopping');
    expect(near.items.map((i) => i.id)).toContain('shopping');
    // Same host, same event, same effort — a bigger denominator.
    expect(near.totalCount).toBeGreaterThan(far.totalCount);
    // And far-out, the ledger now says WHEN that will happen.
    expect(far.nextLedgerChange.date).toBe(iso(36));
  });
});
