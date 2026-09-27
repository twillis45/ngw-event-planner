// ─── A TRADITION'S OWN ELEMENTS ARE NOT "OPTIONAL" ──────────────────────────
//
// Every purchase carries `essential: true | false`. Essential money is counted
// in the estimate the host sees up front. Optional money goes to a separate
// bucket the host has to go looking for. So the flag is not a label — it
// decides whether a line is VISIBLE.
//
// ── WHAT WAS ACTUALLY WRONG (measured 2026-09-27) ──────────────────────────
//
// Kwanzaa has seven named symbols. SIX of them were `essential: true`:
//
//     true   Mishumaa saba (the seven candles)
//     true   Kinara (candle holder) — if not owned
//     true   Muhindi (ears of corn)
//     true   Mazao (the harvest display)
//     true   Kikombe cha umoja (unity cup) — if not owned
//     true   Libation pour
//     false  Mkeka (the mat)            <-- the odd one out
//     false  Zawadi (the gifts)         <-- the odd one out
//
// This was an INCONSISTENCY INSIDE ONE FILE, not a cultural judgment call. The
// mkeka's own `note` in that file reads "The foundation the other symbols rest
// on" — the data contradicted its own description. And the kinara carries the
// identical "if not owned" caveat while being flagged essential, so the caveat
// does not distinguish them either. Kwanzaa's optional share fell 32.4% -> 8.3%.
//
// ── WHAT IS A STATED ASSUMPTION, AND SHOULD BE READ AS ONE ─────────────────
//
// The Repast photo table (`p_table`) is a judgment: a repast is the meal after
// a funeral, and the photo of the person who died is what the room is arranged
// around, so it is not decoration. That is a claim about how families observe
// it, made by the people who build this app and NOT by families who have
// hosted one. It is written into the item's note so a host-facing reviewer can
// find it. Repast's optional share fell 27.8% -> 17.5%.
//
// If a family says otherwise, flip it back and delete this block. That is the
// correct outcome, not a regression.
//
// ── WHAT THIS TEST DOES NOT CLAIM ──────────────────────────────────────────
//
// It does not claim cultural playbooks hide more money than generic ones. That
// framing was carried into this session as "34.0% vs 15.7%" and DOES NOT
// REPRODUCE: weighting every priced line by mid-range cost gives 9.9% cultural
// against 28.4% generic BEFORE this change. Kwanzaa (32.4%) was above the
// generic average; the aggregate ran the other way because Quinceanera is
// large and only 3.5% optional. The fix above stands on the per-file
// inconsistency, which is checkable, not on the aggregate, which was not.
//
// ── DELIBERATELY NOT FLIPPED ───────────────────────────────────────────────
//
// Repast carries FOUR desserts — sheet cake, pound cake, pies, banana pudding
// — each `qtyPerGuest: 0.25`, each optional, and with NO `whenChoice` binding
// them. They are alternatives written as separate lines. Flipping all four to
// essential would bill one dessert per guest FOUR TIMES. That is a real defect
// in its own right and it is recorded in the last test below rather than
// silently repaired here.
import { ALL_PLAYBOOKS } from '../index';

const byType = (t) => ALL_PLAYBOOKS.find((p) => p.type === t);
const item = (pb, id) => (pb.purchases || []).find((p) => p.id === id);

describe('a tradition’s own elements are counted in the estimate', () => {
  test('all seven Kwanzaa symbols agree with each other', () => {
    const kw = byType('Kwanzaa Gathering');
    expect(kw).toBeTruthy();
    // Named by id so a relabelled item cannot quietly drop out of the check.
    const SYMBOLS = ['p_mkeka', 'p_kinara', 'p_candles', 'p_muhindi', 'p_mazao', 'p_unitycup', 'p_zawadi'];
    const found = {};
    for (const id of SYMBOLS) {
      const p = item(kw, id);
      // A skipped id is how this check goes quietly blind: the first draft
      // named 'p_mishumaa', which does not exist (the candles are 'p_candles'),
      // so it asserted six symbols and passed. Record the miss instead.
      found[id] = p ? (p.essential !== false) : 'NO SUCH ITEM';
    }
    // Every symbol the file actually carries must be essential. Listing the
    // whole map in the assertion means a failure names WHICH one broke.
    expect(found).toEqual({
      p_mkeka: true, p_kinara: true, p_candles: true, p_muhindi: true,
      p_mazao: true, p_unitycup: true, p_zawadi: true,
    });
  });

  test('the Repast photo table is essential, and says out loud that it is an assumption', () => {
    const rp = byType('Repast');
    const table = item(rp, 'p_table');
    expect(table).toBeTruthy();
    expect(table.essential).not.toBe(false);
    // The assumption must travel WITH the flag. A flipped flag whose reasoning
    // lives only in a commit message is a claim nobody downstream can audit.
    expect(String(table.note || '')).toMatch(/assumption/i);
    expect(String(table.note || '')).toMatch(/not yet reviewed/i);
  });

  test('DEFECT ON RECORD: the four Repast desserts are alternatives written as separate lines', () => {
    const rp = byType('Repast');
    const cakes = ['Sheet cake', 'Pound cake', 'Pies', 'Banana pudding']
      .map((n) => (rp.purchases || []).find((p) => p.item === n))
      .filter(Boolean);
    expect(cakes).toHaveLength(4);
    // Each says "a quarter of a dessert per guest". Four of them is one whole
    // dessert per guest, billed four times over, IF they ever become essential
    // together. None carries a whenChoice that would make them exclusive.
    for (const c of cakes) {
      expect(c.qtyPerGuest).toBe(0.25);
      expect(c.whenChoice).toBeUndefined();
    }
    // This is the guard: they may not ALL be essential until a whenChoice
    // binds them. Flipping them without that is the quadruple-count.
    const allEssential = cakes.every((c) => c.essential !== false);
    expect(allEssential).toBe(false);
  });
});
