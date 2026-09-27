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
// ── WHAT WAS AN ASSUMPTION AND IS NOW AN OWNER RULING ──────────────────────
//
// The Repast photo table (`p_table`) is a judgment: a repast is the meal after
// a funeral, and the photo of the person who died is what the room is arranged
// around, so it is not decoration. It shipped on 2026-09-27 as a stated
// assumption and the product owner APPROVED it the same day, so the item's note
// now records an owner ruling with a date rather than an unreviewed hunch. The
// reasoning still travels with the flag, where a host-facing reviewer can find
// it. Repast's optional share fell 27.8% -> 17.5%.
//
// The ruling is still overturnable: if families who have hosted a repast say
// otherwise, flip it back. That is the correct outcome, not a regression.
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
// ── THE "FOUR DESSERTS" DEFECT DOES NOT REPRODUCE (measured 2026-09-27) ────
//
// This file previously recorded a DEFECT: Repast's four desserts — sheet cake,
// pound cake, pies, banana pudding — each `qtyPerGuest: 0.25` with no
// `whenChoice`, read as mutually-exclusive alternatives that would bill one
// dessert per guest FOUR TIMES if they all went essential. A pick-one choice
// group was the proposed fix.
//
// That premise is FALSE, and `git log -p` on repast.js says so: the parent was
// ONE row, 'Sheet cake, pound cake, pies, banana pudding' at `qtyPerGuest: 1`,
// split on 2026-09-24 into four rows at 0.25 each so every dish could carry its
// own bringer and its own grocery term. They are a DIVIDED BUNDLE, not
// alternatives. Quantities are summed per line by the engine, so 4 x 0.25 is
// exactly the parent's sourced 1 serving per guest — billed once, not four
// times. A `whenChoice` here would CREATE a defect: it would drop three
// quarters of the dessert table.
//
// So the guard below was inverted rather than deleted. It now pins the
// arithmetic that makes the bundle safe — the sum is one serving per guest, the
// four shares are equal, none is choice-gated, and the `essential` flag moves
// for all four together or not at all. A partial flip is the only way this
// bundle can misprice, and that is what is now fenced.
//
// The four stay OPTIONAL. Unlike the photo table, dessert is the line most
// reliably brought IN by the community, so counting it in the host's up-front
// estimate would overstate the host's own spend. Flipping all four together is
// now safe arithmetic whenever the owner rules a dessert table canonical.
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

  test('the Repast photo table is essential, and records a dated owner ruling', () => {
    const rp = byType('Repast');
    const table = item(rp, 'p_table');
    expect(table).toBeTruthy();
    expect(table.essential).not.toBe(false);
    const note = String(table.note || '');
    // The basis must travel WITH the flag. A flipped flag whose reasoning lives
    // only in a commit message is a claim nobody downstream can audit.
    expect(note).toMatch(/owner ruling/i);
    // Dated, and naming who approved it — a ruling with no date and no owner is
    // indistinguishable from the assumption it replaced.
    expect(note).toMatch(/2026-09-27/);
    expect(note).toMatch(/approved by/i);
    // The hedge is now false: the owner reviewed it. It must not still be there.
    expect(note).not.toMatch(/not yet reviewed/i);
  });

  test('the four Repast desserts are one divided bundle, not four whole desserts', () => {
    const rp = byType('Repast');
    // Named by id, not by display string: a relabelled dish must not drop out.
    const IDS = ['p_dessert', 'p_dessert_poundcake', 'p_dessert_pies', 'p_dessert_pudding'];
    const cakes = IDS.map((id) => item(rp, id));
    expect(cakes.map((c, i) => (c ? IDS[i] : 'NO SUCH ITEM'))).toEqual(IDS);
    // They came from ONE line at qtyPerGuest: 1, split four ways on 2026-09-24.
    // The whole bundle must still bill exactly one dessert serving per guest —
    // this is the assertion that would have caught a real quadruple-count.
    const sum = cakes.reduce((a, c) => a + c.qtyPerGuest, 0);
    expect(sum).toBeCloseTo(1, 10);
    // Equal shares. An uneven split silently reweights the dessert table.
    expect(cakes.map((c) => c.qtyPerGuest)).toEqual([0.25, 0.25, 0.25, 0.25]);
    // NO whenChoice, on purpose. Gating these as pick-one alternatives would
    // drop three quarters of the dessert and break the per-dish bringer.
    for (const c of cakes) expect(c.whenChoice).toBeUndefined();
    // The flag moves for all four together or not at all. A PARTIAL flip is the
    // only way this bundle can misprice — some of a divided serving counted in
    // the estimate and the rest hidden — so that is what is fenced. Whether the
    // bundle is essential is an owner call; whether it is CONSISTENT is not.
    const flags = cakes.map((c) => c.essential !== false);
    expect(new Set(flags).size).toBe(1);
  });
});
