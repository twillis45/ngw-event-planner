// ─── "BUY CAKE — 2 CAKES TODAY" OVER "ORDER 3–5 DAYS AHEAD" ──────────────────
//
// A purchase row carries a `buyAt` lead AND an authored `note`. Both reach the
// host on the SAME card: `buyAt` drives the task title, `note` drives the line
// underneath it. MEASURED 2026-09-19 across ALL_PLAYBOOKS — five rows told the
// host to buy a cake on a day their own note says is already too late:
//
//   playbook            buyAt     the note on the same card        gap
//   ─────────────────────────────────────────────────────────────────────
//   Birthday            T-1d      "Order 3–5 days ahead"           2–4 days
//   Graduation          T-1d      "Order 3–5 days ahead"           2–4 days
//   Retirement Party    T-1d      "order it personalized 1 week"   6 days
//   Anniversary         T-1d      "Order ~1-2 weeks ahead"         6–13 days
//   Vow Renewal         T-1d      "Order ~1-2 weeks ahead"         6–13 days
//
// Birthday convicts itself twice: its own `cake` DECISION says "if you are
// already inside the 3 to 5 days a bakery needs — cupcakes are the answer that
// late." The file knew the lead. The purchase row shipped the other number.
//
// TWO DECISION ROWS HAD THE SAME SHAPE:
//
//   Holiday Party venue   T-35d    "the good rooms book out months ahead in December"
//   Wedding music         T-240d   "Bands book a year out"
//
// Wedding compounds it into a sequencing inversion: `t_keyvendors` at T-300d
// tells the host to SIGN the band — sixty days before this decision asks them to
// CHOOSE band-versus-DJ.
//
// EVERY MOVE HERE IS TO THE PLAYBOOK'S OWN AUTHORED PROSE, never to an outside
// source. Four other rows found in the same sweep are NOT touched, because their
// deadline disagrees only with a commercially-interested third party and the
// house rule (timingProvenance.js:314) is that such a source does not move a
// host-facing date by itself — they are recorded in
// scratchpad/deadline-contradictions.md as product calls, not fixed here.
//
// THE ONE CLAIM THAT WAS WRONG EITHER WAY. Halloween's `audience` decision
// authored a `timingProvenance` claiming its six-week start "sits in that window
// at its conservative end". Its own registered source says "start the planning
// timeline at least 8 weeks out" and that "the conservative end of the window
// wins for a date-competitive holiday weekend". Six weeks is the MIDDLE of 4–8,
// and late October is the competitive case the source singles out. Moving that
// deadline is a product call; describing the source correctly is not, so the
// claim changed and the deadline did not.
import { ALL_PLAYBOOKS, getPlaybook } from '../playbooks';

// "T-4d" -> 4. The unit the corpus authors leads in.
const leadDays = (s) => {
  const m = /^T-(\d+)d$/.exec(String(s || '').trim());
  return m ? Number(m[1]) : null;
};
const UNIT = { day: 1, week: 7, month: 30, year: 365 };
// The smallest lead the prose asks for, in days. "3–5 days ahead" -> 3,
// "~1-2 weeks ahead" -> 7, "a year out" -> 365.
const proseLead = (text) => {
  const t = String(text || '');
  let min = null;
  const take = (n) => { if (Number.isFinite(n) && (min == null || n < min)) min = n; };
  for (const m of t.matchAll(/(\d+)\s*(?:[–-]\s*\d+\s*)?(day|week|month|year)s?\s*(?:ahead|out|before|in advance)/gi)) {
    take(Number(m[1]) * UNIT[m[2].toLowerCase()]);
  }
  for (const m of t.matchAll(/\ba\s+(year|month|week|day)\s+(?:ahead|out|before)/gi)) {
    take(UNIT[m[1].toLowerCase()]);
  }
  if (/\bmonths\s+ahead\b/i.test(t)) take(60);
  return min;
};

// A NOTE THAT DESCRIBES **TWO** ACTS IS NOT A CONTRADICTION — it is a naming
// problem, and a different one. Quinceañera's cake note reads "Order from the
// baker at 6 months out; pick up or confirm delivery the day before": the lead
// is modelling the PICK-UP while the row is titled "Buy". Elopement's rings say
// the same thing about ordering versus packing. Those rows are listed by name
// below so the set cannot grow silently, rather than being swept up here where
// the only available fix would be to move a date that is already right for the
// act it models.
const SPLIT_ACT = /\b(pick (it |them )?up|picked up|deliver(y|ed|s)?|drop[- ]?off|pack|collect (it|them)|the (day|morning) (before|of))\b/i;

const purchaseRows = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const p of (pb.purchases || [])) {
      if (!p || !p.buyAt || !p.note) continue;
      const lead = leadDays(p.buyAt); const need = proseLead(p.note);
      if (lead == null || need == null) continue;
      out.push({ type: pb.type, id: p.id, lead, need, note: p.note, split: SPLIT_ACT.test(p.note) });
    }
  }
  return out;
};
// "about a month out" against T-28d is agreement, not a gap: the prose rounds and
// the field does not. But the slack has to be PROPORTIONAL, not flat — a flat
// three days was tried first and it swallowed the Birthday cake (T-1d against a
// 3-day order lead is a two-day gap, the same magnitude as the shirts' rounding
// and a completely different thing). Rounding error scales with the quantity
// being rounded; a defect at three days does not.
const slack = (needDays) => needDays * 0.1;

describe('a card must not argue with itself about when to act', () => {
  test('(premise) the corpus really pairs a lead with prose often enough to gate', () => {
    // If the extractor stops matching, every assertion below passes over an
    // empty list — the failure mode this file exists to prevent, arriving from
    // inside the test. Measured 13 at the time of writing; the floor is set
    // below that so an authoring pass does not have to touch this line, and
    // above zero so a broken regex does.
    expect(purchaseRows().length).toBeGreaterThanOrEqual(10);
  });

  test('THE DEFECT: no purchase tells the host to buy later than its own note allows', () => {
    const late = purchaseRows()
      .filter((r) => !r.split && r.lead + slack(r.need) < r.need)
      .map((r) => `${r.type}/${r.id}: buy at T-${r.lead}d, note needs ${r.need}d`);
    expect(late).toEqual([]);
  });

  test('the split-act rows are a CLOSED list, not a silent exemption', () => {
    // These model a later act (pick-up, delivery, packing) under a "Buy" title.
    // The fix is a rename or a second row, not a moved date — recorded as a
    // product call in scratchpad/deadline-contradictions.md. If a new row joins
    // them, that is a new authoring defect and this is where it surfaces.
    const split = purchaseRows().filter((r) => r.split && r.lead < r.need)
      .map((r) => `${r.type}/${r.id}`).sort();
    expect(split).toEqual(['Quinceañera/p_cake', 'Quinceañera/p_florals']);
  });

  test('the five cake rows moved to the lead their own note states', () => {
    // Named explicitly, so a future edit that quietly reverts one is a failure
    // here rather than a silent regression inside the sweep above.
    const cake = (type) => (getPlaybook(type).purchases || []).find((p) => p.id === 'p_cake');
    expect(leadDays(cake('Birthday').buyAt)).toBe(4);
    expect(leadDays(cake('Graduation').buyAt)).toBe(4);
    expect(leadDays(cake('Retirement Party').buyAt)).toBe(7);
    expect(leadDays(cake('Anniversary').buyAt)).toBe(10);
    expect(leadDays(cake('Vow Renewal').buyAt)).toBe(10);
  });

  test('the two decisions moved to their own prose, and the wedding inversion is gone', () => {
    const dec = (type, id) => (getPlaybook(type).decisions || []).find((d) => d.id === id);
    const music = dec('Wedding', 'music');
    expect(leadDays(music.when)).toBe(330);
    expect(String(music.why)).toMatch(/book a year out/i);
    // The host was told to SIGN the band sixty days before being asked to CHOOSE
    // one. Whatever the numbers become, choosing must not come after signing.
    const sign = (getPlaybook('Wedding').tasks || []).find((t) => /sign .*band|band\/DJ/i.test(String(t.what || '')));
    if (sign) expect(leadDays(music.when)).toBeGreaterThanOrEqual(leadDays(sign.when));

    const venue = dec('Holiday Party', 'venue');
    expect(leadDays(venue.when)).toBe(75);
    expect(String(venue.why)).toMatch(/months ahead/i);
  });

  test('NEGATIVE CONTROL: rounding prose is agreement, not a gap', () => {
    // Reunion's shirts say "order once, about a month out" against T-28d. Read
    // strictly that is a two-day shortfall; read honestly it is the same
    // instruction. A gate that fires on rounding gets muted, and a muted gate
    // protects nothing.
    const shirts = purchaseRows().find((r) => r.id === 'p_shirts');
    expect(shirts.lead).toBe(28);
    expect(shirts.need).toBe(30);
    expect(shirts.lead + slack(shirts.need)).toBeGreaterThanOrEqual(shirts.need);
    // …and the same two-day gap on a SHORT lead is still a defect, which is the
    // whole reason the slack is proportional. A flat allowance hid the Birthday
    // cake, and a gate that hides the case it was written for is worse than none.
    expect(1 + slack(3)).toBeLessThan(3);
  });

  test('NEGATIVE CONTROL: the extractor still reads a real order lead', () => {
    // The mirror risk: a tolerance and a split-act skip could between them
    // swallow the defect entirely. These are the exact phrasings the five cake
    // rows used, and they must still produce a number.
    expect(proseLead('Order 3–5 days ahead; ~1 slice/guest.')).toBe(3);
    expect(proseLead('Order ~1-2 weeks ahead.')).toBe(7);
    expect(proseLead('order it personalized 1 week ahead')).toBe(7);
    expect(proseLead('Bands book a year out and cost multiples of a DJ.')).toBe(365);
    expect(proseLead('the good rooms book out months ahead in December')).toBe(60);
    // …and a row whose buyAt is EARLIER than its prose is never flagged.
    expect(purchaseRows().filter((r) => r.lead >= r.need).length).toBeGreaterThan(0);
  });

  test('NEGATIVE CONTROL: nothing was moved on a third party’s say-so', () => {
    // Four rows in the same sweep disagree with a commercial source and NOT with
    // their own prose. The house rule keeps them pinned; if one of these ever
    // moves, it should be a deliberate product decision, not this pass's drift.
    const dec = (type, id) => (getPlaybook(type).decisions || []).find((d) => d.id === id);
    expect(dec('Retirement Party', 'venue').when).toBe('T-35d');
    expect(dec('Day Party', 'venue').when).toBe('T-28d');
    expect(dec('Surprise Proposal', 'photographer_hidden').when).toBe('T-30d');
    expect(dec('Halloween Party', 'audience').when).toBe('T-42d');
  });

  test('the Halloween claim now describes its own source correctly', () => {
    // The deadline stayed; the sentence about the source had to change, because
    // it was false whichever way the deadline went.
    const d = (getPlaybook('Halloween Party').decisions || []).find((x) => x.id === 'audience');
    expect(d.timingProvenance.sources).toContain('partychecklist-timeline-2026');
    // It may only say "conservative end" while DENYING it — the false version
    // asserted it.
    expect(String(d.timingProvenance.claim)).not.toMatch(/sits in that window at its conservative end/i);
    expect(String(d.timingProvenance.claim)).toMatch(/MIDDLE of that window, not at its conservative end/);
    expect(String(d.timingProvenance.rationale)).toMatch(/THE DEADLINE WAS NOT MOVED/);
  });
});
