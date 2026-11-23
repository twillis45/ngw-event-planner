// ─── THE RIBBON NAMES THE HERO'S PART (tall-iPad package, owner 11/22/2026) ──
//
// The tall-tablet progress ribbon is the plan-parts ledger (phaseProgress
// items, the same source as the "what's counted" chips and the .eprog strips).
// Exactly one part may read NOW: the part the hero question is about. It is
// derived from the hero item's own fields (its decision id, then its domain),
// never from the headline's prose, and only an OPEN part can be the one the
// hero is asking for. When nothing maps, no part says NOW.
import { heroPartId, planRibbon } from '../eventOrientation';

const items = [
  { id: 'datetime', handled: true }, { id: 'location', handled: true },
  { id: 'venueaddress', handled: true }, { id: 'headcount', handled: true },
  { id: 'food', handled: false }, { id: 'vendors', handled: false }, { id: 'budget', handled: false },
];
const cues = { phase: 'pre_event', completedCount: 4, totalCount: 7, items };

describe('heroPartId', () => {
  test('a food item is about Food', () => {
    expect(heroPartId({ id: 'x', domain: 'food', title: 'Confirm the caterer' }, items)).toBe('food');
  });
  test('the phase decision identity wins over the domain', () => {
    expect(heroPartId({ id: 'y', decisionId: 'phase:budget', domain: 'food' }, items)).toBe('budget');
  });
  test('vendors and budget map to their parts', () => {
    expect(heroPartId({ domain: 'vendors' }, items)).toBe('vendors');
    expect(heroPartId({ domain: 'budget' }, items)).toBe('budget');
  });
  test('a guests item maps to the Guests part only while it is open', () => {
    expect(heroPartId({ domain: 'guests' }, items)).toBe(null);
    const open = items.map((i) => (i.id === 'headcount' ? { ...i, handled: false } : i));
    expect(heroPartId({ domain: 'attendance' }, open)).toBe('headcount');
  });
  test('an item outside the ledger names no part', () => {
    expect(heroPartId({ domain: 'travel' }, items)).toBe(null);
    expect(heroPartId({ id: 'blocker:ceremony', domain: 'decision' }, items)).toBe(null);
    expect(heroPartId(null, items)).toBe(null);
  });
});

describe('planRibbon', () => {
  test('seven parts, the handled set, and one NOW', () => {
    const r = planRibbon(cues, { domain: 'food' });
    expect(r.parts.map((p) => p.id)).toEqual(items.map((i) => i.id));
    expect(r.parts.filter((p) => p.handled).map((p) => p.id)).toEqual(['datetime', 'location', 'venueaddress', 'headcount']);
    expect(r.parts.filter((p) => p.now).map((p) => p.id)).toEqual(['food']);
    expect(r.done).toBe(4);
    expect(r.total).toBe(7);
    expect(r.allHandled).toBe(false);
  });
  test('all handled says so, and nothing is NOW', () => {
    const all = { ...cues, completedCount: 7, items: items.map((i) => ({ ...i, handled: true })) };
    const r = planRibbon(all, { domain: 'food' });
    expect(r.allHandled).toBe(true);
    expect(r.parts.some((p) => p.now)).toBe(false);
  });
  test('no ledger, no ribbon', () => {
    expect(planRibbon(null, null)).toBe(null);
    expect(planRibbon({ items: [] }, null)).toBe(null);
  });
});
