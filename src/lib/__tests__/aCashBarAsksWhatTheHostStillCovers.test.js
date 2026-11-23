// ─── A CASH BAR ASKS WHAT THE HOST STILL COVERS (owner, 11/21/2026) ──────────
// After a cash/limited-bar pick, the follow-up `bar_cover` asks what the host
// still puts out; its options are the approved sets, built only from each
// playbook's real drink lines; the drinks the plan buys (and so the budget)
// move on the pick. No "Bartender only"; glassware stays in Rentals.
// Numbers: design-s/work/bar.json (40 guests, national prices).
// e2e twin: hostv2/e2e/aCashBarAsksWhatTheHostStillCovers.spec.mjs.
import { getPlaybook, playbookFoodPlan, playbookDecisionBoard, injectedDecisionsFor } from '../playbooks';
import { cashBarCoverSets, NOTHING, BAR_COVER_ID } from '../playbooks/cashBarCover';

const EXPECT = {
  'Engagement Party': { decision: 'bar', pick: 'Cash/limited bar', full: [535, 1395], after: [
    ['Ice and the zero-proof drinks', 76, 277],
    ['The champagne toast, plus ice and zero-proof', 148, 487],
    ['The signature cocktail, plus ice and zero-proof', 251, 602],
    [NOTHING, 0, 0]] },
  'Retirement Party': { decision: 'bar', pick: 'Limited / cash bar', full: [425, 1178], after: [
    ['Ice, coffee and the zero-proof drinks', 99, 356],
    ['The champagne toast, plus ice, coffee and zero-proof', 171, 536],
    ['The honoree’s favorite drink and the toast', 193, 676],
    [NOTHING, 0, 0]] },
  'Holiday Party': { decision: 'alcohol_service', pick: 'Drink tickets / cash bar', full: [582, 1551], after: [
    ['Mixers, ice, water and zero-proof', 184, 605],
    ['A first round: the signature cocktail, plus mixers, ice and water', 324, 865],
    ['Water and coffee only', 44, 126],
    [NOTHING, 0, 0]] },
};
const ev = (type, picks) => ({ id: 'cb', type, date: '2026-12-12', guestEstimate: 40, guestMode: 'count', guestCountSource: 'host', foodChoices: picks || {} });
const drinks = (fp) => fp.list.filter((l) => l.cat === 'beverage' && !l.skipped);
const band = (fp) => { const d = drinks(fp); return [Math.round(d.reduce((t, l) => t + l.low, 0)), Math.round(d.reduce((t, l) => t + l.high, 0))]; };

describe.each(Object.entries(EXPECT))('%s', (type, x) => {
  const pb = getPlaybook(type);
  test('the follow-up appears only after the cash-bar pick', () => {
    const shown = (picks) => (playbookDecisionBoard(ev(type, picks)).open || []).concat(playbookDecisionBoard(ev(type, picks)).locked || [])
      .some((r) => r && (r.id === BAR_COVER_ID || r.decisionId === BAR_COVER_ID || String(r.key || '').endsWith(BAR_COVER_ID)));
    expect(injectedDecisionsFor(ev(type), pb).some((d) => d.id === BAR_COVER_ID)).toBe(true);
    expect(shown({})).toBe(false);
    expect(shown({ [x.decision]: x.pick })).toBe(true);
  });
  test('the options are the approved sets: no "Bartender only", every line real, no glassware', () => {
    const sets = cashBarCoverSets(pb);
    expect(sets.map(([l]) => l)).toEqual(x.after.map(([l]) => l));
    const ids = new Set((pb.purchases || []).filter((p) => p.category === 'beverage').map((p) => p.id));
    for (const [, lines] of sets) for (const id of lines) expect(ids.has(id)).toBe(true);
  });
  test('the drinks bought move with the answer, at the approved numbers', () => {
    for (const [label, low, high] of x.after) {
      expect(band(playbookFoodPlan(ev(type, { [x.decision]: x.pick, [BAR_COVER_ID]: label })))).toEqual([low, high]);
    }
    // Before the host answers, the plan runs on the first set, never the full bar.
    expect(band(playbookFoodPlan(ev(type, { [x.decision]: x.pick })))).toEqual([x.after[0][1], x.after[0][2]]);
  });
  test('glassware and every non-drink line are untouched by the follow-up', () => {
    const a = playbookFoodPlan(ev(type, { [x.decision]: x.pick, [BAR_COVER_ID]: NOTHING }));
    const b = playbookFoodPlan(ev(type));
    const nonDrink = (fp) => fp.list.filter((l) => l.cat !== 'beverage' && !l.skipped).map((l) => l.id).sort();
    expect(nonDrink(a)).toEqual(nonDrink(b));
  });
});

test('another playbook with a cash bar gets sets from its own lines; a pick that is not a cash bar asks nothing', () => {
  const gala = cashBarCoverSets(getPlaybook('Fundraiser / Gala'));
  expect(gala.map(([l]) => l)).toEqual(['The non-alcoholic drinks', 'The drink tickets, plus the non-alcoholic drinks', NOTHING]);
  expect(cashBarCoverSets(getPlaybook('Birthday'))).toBeNull();
});

// ONE CASH-BAR RULE (integration with the line-rule pricing, 11/21/2026). The
// follow-up hangs off the decision tagged `drinksCall` — the one the plan
// prices — and it is the only rule: no drinks tier reads a cash pick. Before
// the host answers, Wedding's bare "Cash bar" keeps the toast and the Gala's
// the zero-proof drinks, exactly what the retired bare-"Cash bar" tier kept.
describe('one cash-bar rule, on the named drinks call', () => {
  const { cashBarParent } = require('../playbooks/cashBarCover');
  const { ALL_PLAYBOOKS, beverageTierFor } = require('../playbooks');
  test('every cash-bar follow-up hangs off the drinks call', () => {
    for (const pb of ALL_PLAYBOOKS) {
      const p = cashBarParent(pb);
      if (p) expect([pb.type, p.decision.drinksCall]).toEqual([pb.type, true]);
    }
  });
  test('no drinks tier reads a cash pick', () => {
    for (const pick of ['cash bar', 'cash/limited bar', 'limited / cash bar', 'drink tickets / cash bar']) expect(beverageTierFor(pick)).toBeNull();
  });
  test.each([
    ['Wedding', 'bar', ['p_toast_champagne']],
    ['Fundraiser / Gala', 'bar', ['p_nonalc']],
  ])('%s: a bare cash bar, unanswered, keeps what the bare rule kept', (type, id, kept) => {
    const ids = playbookFoodPlan(ev(type, { [id]: 'Cash bar' })).list.filter((l) => l.cat === 'beverage' && !l.skipped).map((l) => l.id);
    expect(ids).toEqual(kept);
    expect(playbookFoodPlan(ev(type, { [id]: 'Cash bar', [BAR_COVER_ID]: NOTHING })).list.filter((l) => l.cat === 'beverage' && !l.skipped)).toEqual([]);
  });
});

// ─── THE GALA'S DRINK TICKETS ASK IT TOO (#220 Open, 11/22/2026) ─────────────
// "Two drink tickets, then cash" is a cash bar after the tickets, but the one
// cash-pick test read only "cash … bar", so the Gala asked the follow-up after
// "Cash bar" and never after the tickets. Every cash pick on the drinks call
// raises the same follow-up, through the same rule.
describe('Fundraiser / Gala: two drink tickets, then cash', () => {
  const TICKETS = 'Two drink tickets, then cash';
  const pb = getPlaybook('Fundraiser / Gala');
  const shown = (picks) => {
    const b = playbookDecisionBoard(ev('Fundraiser / Gala', picks));
    return [...(b.open || []), ...(b.locked || [])].some((r) => r && (r.id === BAR_COVER_ID || r.decisionId === BAR_COVER_ID || String(r.key || '').endsWith(BAR_COVER_ID)));
  };
  test('the tickets pick asks what the host still covers, like the cash bar', () => {
    expect(shown({ bar: 'Cash bar' })).toBe(true);
    expect(shown({ bar: TICKETS })).toBe(true);
    expect(shown({ bar: 'Wine and beer with dinner' })).toBe(false);
    expect(shown({ bar: 'Dry' })).toBe(false);
  });
  test('one follow-up, one rule: the same decision whichever cash pick raised it', () => {
    const fu = injectedDecisionsFor(ev('Fundraiser / Gala'), pb).filter((d) => d.id === BAR_COVER_ID);
    expect(fu).toHaveLength(1);
    expect(fu[0].whenChoice).toEqual({ id: 'bar', in: [TICKETS, 'Cash bar'] });
  });
  test('the answer prices the tickets pick: covering nothing buys no drinks', () => {
    const ids = (picks) => playbookFoodPlan(ev('Fundraiser / Gala', picks)).list.filter((l) => l.cat === 'beverage' && !l.skipped).map((l) => l.id).sort();
    expect(ids({ bar: TICKETS, [BAR_COVER_ID]: NOTHING })).toEqual([]);
    const tickets = cashBarCoverSets(pb).find(([l]) => /ticket/i.test(l));
    expect(tickets).toBeTruthy();
    expect(ids({ bar: TICKETS, [BAR_COVER_ID]: tickets[0] })).toEqual([...tickets[1]].sort());
  });
});

// ─── AN OPTION NAMES ONLY WHAT IT PRICES (#220 Open, 11/22/2026) ─────────────
// The Gala's built set read "The non-alcoholic drinks and ice", and the Gala
// has no ice line: the option named a drink it never bought. Every set, on
// every playbook, names ice only when one of its own lines is ice.
test('no cash-bar option names ice it does not price', () => {
  const { ALL_PLAYBOOKS } = require('../playbooks');
  const bad = [];
  for (const p of ALL_PLAYBOOKS) {
    const sets = cashBarCoverSets(p);
    if (!sets) continue;
    const item = (id) => ((p.purchases || []).find((x) => x.id === id) || {}).item || '';
    for (const [label, lines] of sets) {
      if (/\bice\b/i.test(label) && !lines.some((id) => /\bice\b/i.test(item(id)))) bad.push(`${p.type}: ${label}`);
    }
  }
  expect(bad).toEqual([]);
});

// ─── OWNER: "TICKETS COUNT AS 2, MAP OLD PICK" (11/22/2026) ──────────────────
describe('Fundraiser / Gala: the tickets count as the pick says', () => {
  const TICKETS = 'Two drink tickets, then cash';
  const TICKET_SET = 'The drink tickets, plus the non-alcoholic drinks';
  const pb = getPlaybook('Fundraiser / Gala');
  const line = (picks, id) => playbookFoodPlan(ev('Fundraiser / Gala', picks)).list.find((l) => l.id === id && !l.skipped);
  test('the tickets set buys 2 drinks a guest from the wine line, at its own rate', () => {
    const hosted = line({ bar: 'Wine and beer with dinner' }, 'p_wine');
    const tix = line({ bar: TICKETS, [BAR_COVER_ID]: TICKET_SET }, 'p_wine');
    expect(hosted.perGuest).toBe(3);
    expect(tix.perGuest).toBe(2);
    expect(tix.qty).toBe(80);
    // Only the count moved: the per-drink rate is the line's own.
    expect(tix.low / tix.qty).toBeCloseTo(hosted.low / hosted.qty, 5);
    expect(tix.high / tix.qty).toBeCloseTo(hosted.high / hosted.qty, 5);
  });
  test('the count says it comes from the host’s own pick', () => {
    const tix = line({ bar: TICKETS, [BAR_COVER_ID]: TICKET_SET }, 'p_wine');
    expect(tix.provenance.tier).toBe('host-stated');
    expect(tix.provenance.note).toMatch(/your own pick/i);
    expect(tix.provenance.note).toMatch(/not a consumption estimate/i);
    expect(line({ bar: 'Wine and beer with dinner' }, 'p_wine').provenance.tier).not.toBe('host-stated');
  });
  test('unanswered, the tickets pick runs on the tickets set; a bare cash bar still on the zero-proof', () => {
    const fu = (picks) => injectedDecisionsFor(ev('Fundraiser / Gala', picks), pb).find((d) => d.id === BAR_COVER_ID);
    expect(fu({ bar: TICKETS }).default).toBe(TICKET_SET);
    expect(fu({ bar: 'Cash bar' }).default).toBe('The non-alcoholic drinks');
    const ids = (picks) => playbookFoodPlan(ev('Fundraiser / Gala', picks)).list.filter((l) => l.cat === 'beverage' && !l.skipped).map((l) => l.id).sort();
    expect(ids({ bar: TICKETS })).toEqual(['p_nonalc', 'p_wine']);
    expect(line({ bar: TICKETS }, 'p_wine').perGuest).toBe(2);
    expect(ids({ bar: 'Cash bar' })).toEqual(['p_nonalc']);
  });
});

describe('a saved answer under the old wording reads as the new one', () => {
  const OLD = 'The non-alcoholic drinks and ice';
  test('it prices the same, and the board shows it as her pick', () => {
    const ids = (picks) => playbookFoodPlan(ev('Fundraiser / Gala', picks)).list.filter((l) => l.cat === 'beverage' && !l.skipped).map((l) => l.id).sort();
    expect(ids({ bar: 'Cash bar', [BAR_COVER_ID]: OLD })).toEqual(ids({ bar: 'Cash bar', [BAR_COVER_ID]: 'The non-alcoholic drinks' }));
    const { choicePickFor } = require('../playbooks');
    expect(choicePickFor(ev('Fundraiser / Gala', { bar: 'Cash bar', [BAR_COVER_ID]: OLD }), BAR_COVER_ID)).toBe('The non-alcoholic drinks');
    const b = playbookDecisionBoard(ev('Fundraiser / Gala', { bar: 'Cash bar', [BAR_COVER_ID]: OLD }));
    const row = [...(b.open || []), ...(b.locked || [])].find((r) => r && (r.id === BAR_COVER_ID || r.decisionId === BAR_COVER_ID || String(r.key || '').endsWith(BAR_COVER_ID)));
    expect(row).toBeTruthy();
    expect(JSON.stringify(row)).toContain('The non-alcoholic drinks');
    expect(JSON.stringify(row)).not.toContain(OLD);
  });
});

test('the tickets line badge says the count is her pick, not "Needs confirmation"', () => {
  const { classifyClaim, HOST_LABELS } = require('../knowledge/claimBasis');
  const tix = playbookFoodPlan(ev('Fundraiser / Gala', { bar: 'Two drink tickets, then cash' })).list.find((l) => l.id === 'p_wine');
  const c = classifyClaim(tix.provenance, tix.costProvenance);
  expect(c.basisRecorded).toBe(true);
  // 11/23/2026 (batch 10, the price research pass): the Gala's wine-and-beer
  // price is now cited (beer-retail-2026, wine-retail-2026), and a cited price
  // outranks the host-stated count in classifyClaim. The badge still never
  // reads "Needs confirmation"; it names the source the price rests on.
  expect(c.hostLabel).not.toBe(HOST_LABELS.NEEDS_CONFIRMATION);
  expect(c.hostLabel).toBe(HOST_LABELS.PRICE_SOURCED);
  expect(c.directCitationEligible).toBe(true);
});
