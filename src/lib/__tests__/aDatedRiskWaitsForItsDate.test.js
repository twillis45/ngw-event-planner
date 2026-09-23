// ─── A RISK THAT NAMES A DATE WAS SHOWN 261 DAYS EARLY ──────────────────────
//
// Found by driving an 80th birthday from the cold open, 2026-09-23. The plan's
// most prominent warning block — "WORTH HAVING A PLAN FOR" — led with:
//
//     Final headcount still not locked 3 days out
//
// on a screen whose own header said 264 DAYS. The row is not false; it names a
// real risk. Rendered as a present state it is wrong for 261 of those days, and
// it is the first thing a host reads under a heading that says to worry.
//
// ── MEASURED BEFORE THE PATTERN WAS TRUSTED ─────────────────────────────────
//
// 10 of 324 authored risks name a horizon in prose, and all ten are ONE family,
// consistently worded: "Final headcount still not locked/confirmed N days out",
// N in {3,4,5}. That is why a narrow regex is safe here and a broad one would
// not be — 314 risks say nothing about time and must keep showing.
import { _datedRiskNotYetInReach, RISK_REACH_DAYS, eventPlan } from '../../CommandCenter';
import { ALL_PLAYBOOKS } from '../playbooks';

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const R = (title) => ({ surface: 'risks', title });

describe('(premise) the corpus is the shape the gate assumes', () => {
  test('exactly one family of risks names a horizon, and it is small', () => {
    // If a later authoring pass starts writing horizons into many more risks,
    // this gate is suddenly deciding far more than it was measured for — and
    // this test says so before that happens quietly.
    const dated = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const r of (pb.risks || [])) {
        if (/\b\d+\s*days?\s+(out|before|ahead|prior)\b/i.test(String(r.trigger || ''))) {
          dated.push(String(r.trigger));
        }
      }
    }
    expect(dated.length).toBe(10);
    // All one family — every one is about locking a headcount.
    for (const t of dated) expect(t).toMatch(/headcount/i);
  });
});

describe('the gate withholds, and only that', () => {
  test('a dated risk is held while the event is far out', () => {
    expect(_datedRiskNotYetInReach(R('Final headcount still not locked 3 days out'), 264)).toBe(true);
  });

  test('…and shows once the event is in reach', () => {
    expect(_datedRiskNotYetInReach(R('Final headcount still not locked 3 days out'), RISK_REACH_DAYS)).toBe(false);
    expect(_datedRiskNotYetInReach(R('Final headcount still not locked 3 days out'), 7)).toBe(false);
    expect(_datedRiskNotYetInReach(R('Final headcount still not locked 3 days out'), 0)).toBe(false);
  });

  test('AN UNDATED RISK IS NEVER GATED — 314 of 324 depend on this', () => {
    // The gate must not become a general "hide risks on far-out events" rule.
    // "No ice / warm drinks" says nothing about time and is worth knowing early.
    expect(_datedRiskNotYetInReach(R('No ice / warm drinks'), 264)).toBe(false);
    expect(_datedRiskNotYetInReach(R('Cake ordered too late'), 264)).toBe(false);
    expect(_datedRiskNotYetInReach(R('Menu locked before allergies collected'), 900)).toBe(false);
  });

  test('an event with no date is never gated', () => {
    // No date, no horizon to compare against. Withholding here would hide a
    // risk on the very plans that know least about themselves.
    expect(_datedRiskNotYetInReach(R('Final headcount still not locked 3 days out'), null)).toBe(false);
    expect(_datedRiskNotYetInReach(R('Final headcount still not locked 3 days out'), NaN)).toBe(false);
  });

  test('a past event is never gated', () => {
    expect(_datedRiskNotYetInReach(R('Final headcount still not locked 3 days out'), -5)).toBe(false);
  });

  test('IT ONLY EVER APPLIES TO THE RISK SURFACE’S OWN ROWS', () => {
    // The caller checks `surface === 'risks'`; this asserts the predicate is not
    // secretly doing something else with the text it reads.
    expect(_datedRiskNotYetInReach({ title: '' }, 264)).toBe(false);
    expect(_datedRiskNotYetInReach(null, 264)).toBe(false);
  });
});

describe('THE ACTUAL BOARD — the 80th birthday that found this', () => {
  const EV = (days) => ({
    id: 'e', name: "Mom's 80th", type: 'Birthday', date: iso(days),
    guestMode: 'count', guestCount: 45, guests: [], totalBudget: 7000,
    venueCity: 'Baltimore', budget: [], vendors: [],
  });
  const worryTitles = (days) => (eventPlan(EV(days)).worries || []).map((w) => String(w.title || ''));

  test('at 264 days the headcount row is gone', () => {
    expect(worryTitles(264).join(' | ')).not.toMatch(/\d+ days out/);
  });

  test('…and the undated risks on the same plan are untouched', () => {
    // The proof the gate withheld one row rather than emptying a lane. If this
    // ever returns nothing, the gate has become a mute button.
    expect(worryTitles(264).length).toBeGreaterThan(0);
  });

  test('at 14 days out it is back, because now it is the host’s problem', () => {
    // The whole point: this is not deletion, it is timing.
    expect(worryTitles(14).join(' | ')).toMatch(/headcount/i);
  });
});
