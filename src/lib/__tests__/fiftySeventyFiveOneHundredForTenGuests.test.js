// ─── 50 · 75 · 100, NEXT TO A "LOCK 10 IN" BUTTON ────────────────────────────
//
// Screen census of the Santa Fe 80th (host ask: "check the host is only seeing
// what they need on each screen"). The guest-count card offered three
// quick-picks — 50, 75, 100 — to a host planning for ten. They were hardcoded
// `[50, 75, 100]` in HostShellV2 and shown to EVERY event type: one
// wedding-shaped triple for a dinner party, a game night and an 80th alike. The
// cheapest of the three would have quintupled every food, cake and tableware
// quantity on the plan in one tap.
//
// The playbooks already author the real thing — `meta.typicalGuests` — and all
// 45 of them have one, so nothing has to fall back on a guess. It was
// unreachable only because `playbookTypicalGuests` returns `.default` alone.
//
// A SEPARATE ACCESSOR, not a widened return. `playbookTypicalGuests` has live
// callers expecting a number; changing its shape to serve a new reader is how
// the "one metro market written under two field names" defect happened.
import { playbookGuestBand, playbookTypicalGuests, ALL_PLAYBOOKS, getPlaybook } from '../playbooks';

describe('the quick-picks are sized to the event, not to a wedding', () => {
  test('(premise) the old hardcode really was wrong for most types', () => {
    // If most playbooks genuinely sat near 50-100 this was a non-issue. They do
    // not: the median authored default is far below it.
    const defaults = ALL_PLAYBOOKS
      .map((pb) => pb && pb.meta && pb.meta.typicalGuests && Number(pb.meta.typicalGuests.default))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    expect(defaults.length).toBeGreaterThan(40);
    const median = defaults[Math.floor(defaults.length / 2)];
    expect(median).toBeLessThan(50);
  });

  test('THE FIX: the band is the playbook’s own authored one', () => {
    expect(playbookGuestBand('Birthday').picks).toEqual([12, 20, 40]);
    expect(playbookGuestBand('Dinner Party').picks).toEqual([6, 8, 12]);
    // And a type that really is wedding-sized still gets wedding-sized numbers —
    // the old hardcode was not wrong everywhere, it was wrong everywhere ELSE.
    expect(playbookGuestBand('Wedding').picks).toEqual([50, 120, 250]);
  });

  test('every playbook can answer, so no surface has to invent a triple', () => {
    const missing = ALL_PLAYBOOKS
      .filter((pb) => pb && pb.type && !playbookGuestBand(pb.type))
      .map((pb) => pb.type);
    expect(missing).toEqual([]);
  });

  test('a malformed or missing band REFUSES rather than guessing', () => {
    // The whole reason the chips are allowed to disappear. There is no honest
    // fallback triple, so a bad band must produce nothing, never a default.
    expect(playbookGuestBand('NoSuchEventTypeAtAll')).toBe(null);
  });

  test('the band is ordered — a chip row cannot come out backwards', () => {
    for (const pb of ALL_PLAYBOOKS) {
      const b = playbookGuestBand(pb.type);
      if (!b) continue;
      expect(b.low).toBeLessThanOrEqual(b.default);
      expect(b.default).toBeLessThanOrEqual(b.high);
      // Every offered chip is a count the plan can actually be sized to.
      for (const n of b.picks) expect(n).toBeGreaterThan(0);
      expect(b.picks).toEqual([...b.picks].sort((x, y) => x - y));
    }
  });

  test('a REAL authored zero survives in the band and is dropped only as a chip', () => {
    // Elopement authors { low: 0, default: 2, high: 12 } and the zero is
    // correct — an elopement with no guests is the couple. A first cut rejected
    // the whole band over it, throwing away a right figure to avoid a bad
    // button. The band reports it; only the chip row filters it.
    const b = playbookGuestBand('Elopement');
    expect(b.low).toBe(0);
    expect(b.picks).toEqual([2, 12]);
  });

  test('NEGATIVE CONTROL: the existing accessor is untouched', () => {
    // Its callers expect a NUMBER. Widening it in place would have been the
    // easy change and the wrong one.
    expect(playbookTypicalGuests('Birthday')).toBe(20);
    expect(typeof playbookTypicalGuests('Wedding')).toBe('number');
  });

  test('NEGATIVE CONTROL: the band reads the playbook, not a copy of it', () => {
    // If someone edits birthday.js, the accessor must move with it — this fails
    // if the numbers are ever re-hardcoded anywhere in the chain.
    const authored = getPlaybook('Birthday').meta.typicalGuests;
    const b = playbookGuestBand('Birthday');
    expect([b.low, b.default, b.high]).toEqual([authored.low, authored.default, authored.high]);
  });
});
